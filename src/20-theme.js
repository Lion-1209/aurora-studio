/* -------------------------------------------------------------------------
 * Aurora Studio · theme engine
 * Turns the settings into a token-override layer for the Client theme service
 * (`theme.overrideTokens`). Surfaces/borders/brand are owned here so the
 * wallpaper can show through; label and state colors stay owned by the active
 * theme — except the foreground used on brand-colored controls, which must
 * follow the accent to keep primary buttons readable.
 * ---------------------------------------------------------------------- */

/** Surface colors for one scheme, derived from the palette base + accent. */
function buildSurfacePalette(mode, baseColor, accent, tint) {
  const white = '#ffffff'
  const black = '#000000'
  const accentTint = tint ? (mode === 'light' ? 0.06 : 0.09) : 0
  if (mode === 'light') {
    return {
      base: mixColor(baseColor, accent, tint ? 0.1 : 0),
      layer1: mixColor(mixColor(baseColor, white, 0.78), accent, accentTint),
      layer2: mixColor(mixColor(baseColor, white, 0.52), accent, accentTint),
      overlay: mixColor(mixColor(baseColor, white, 0.88), accent, accentTint * 0.6),
      sidebar: mixColor(baseColor, tint ? accent : black, tint ? 0.1 : 0.03),
    }
  }
  return {
    base: mixColor(baseColor, accent, tint ? 0.12 : 0),
    layer1: mixColor(mixColor(baseColor, white, 0.085), accent, accentTint),
    layer2: mixColor(mixColor(baseColor, white, 0.125), accent, accentTint),
    overlay: mixColor(mixColor(baseColor, white, 0.11), accent, accentTint * 0.6),
    sidebar: mixColor(baseColor, black, 0.16),
  }
}

/**
 * Compute the override layer: token name -> `{ light, dark }`.
 * Returned shape satisfies `ThemeTokenOverrides`.
 *
 * Transparency rules:
 * - `bg-base` and the sidebar follow `surfaceOpacity` so the wallpaper shows
 *   through the canvas layers (the app paints base twice: frame + column).
 * - Cards, popovers and the settings modal are floored near-opaque, otherwise
 *   text over the wallpaper becomes unreadable at low surface opacity.
 * - `--dsw-alias-label-primary-foreground` and the primary button hover are
 *   derived from the accent so accent-filled controls stay legible.
 */
function computeThemeOverrides(settings) {
  const current = settings || DEFAULT_SETTINGS
  const theme = isPlainObject(current.theme) ? current.theme : DEFAULT_SETTINGS.theme
  const background = isPlainObject(current.background) ? current.background : DEFAULT_SETTINGS.background
  const preset = themePresetById(theme.preset)
  const accent = normalizeHex(theme.accent, preset.accent)
  const tint = theme.tint !== false
  const wallpaper = background.enabled !== false
  const surfaceOpacity = clampNumber(theme.surfaceOpacity, 0.55, 1, DEFAULT_SETTINGS.theme.surfaceOpacity)

  const tokens = {}
  const perMode = { light: {}, dark: {} }

  for (const mode of ['light', 'dark']) {
    const palette = buildSurfacePalette(mode, preset.bg[mode], accent, tint)
    const baseAlpha = wallpaper ? surfaceOpacity : 1
    const chromeAlpha = (offset, floor) => (wallpaper ? Math.max(floor, Math.min(1, baseAlpha + offset)) : 1)
    const brand = ensureAccentContrast(accent, mode)
    const onBrand = relativeLuminance(brand) > 0.32 ? '#0f1115' : '#ffffff'
    const borderTint = mode === 'light' ? 0.28 : 0.4

    perMode[mode]['--dsw-alias-bg-base'] = withAlpha(palette.base, baseAlpha)
    perMode[mode]['--dsw-alias-bg-layer-1'] = withAlpha(palette.layer1, chromeAlpha(0.05, 0.88))
    perMode[mode]['--dsw-alias-bg-layer-2'] = withAlpha(palette.layer2, chromeAlpha(0.07, 0.9))
    perMode[mode]['--dsw-alias-bg-layer-3'] = withAlpha(mixColor(palette.layer2, accent, tint ? 0.05 : 0), chromeAlpha(0.08, 0.92))
    perMode[mode]['--dsw-alias-bg-overlay'] = withAlpha(palette.overlay, chromeAlpha(0.1, 0.95))
    perMode[mode]['--dsw-specific-sidebar-fill'] = withAlpha(palette.sidebar, baseAlpha)
    perMode[mode]['--dsw-alias-border-l1'] = withAlpha(mixColor(palette.layer1, accent, borderTint), 0.9)
    perMode[mode]['--dsw-alias-border-l2'] = withAlpha(mixColor(palette.layer2, accent, borderTint + 0.15), 0.95)
    perMode[mode]['--dsw-alias-brand-primary'] = brand
    perMode[mode]['--dsw-alias-label-primary-foreground'] = onBrand
    perMode[mode]['--dsw-alias-button-primary-hover'] = mixColor(brand, mode === 'light' ? '#000000' : '#ffffff', 0.16)
    /* Focus rings, switch "on" state and business accents follow the palette. */
    perMode[mode]['--dsw-alias-state-business-primary'] = brand
    perMode[mode]['--dsw-alias-state-business-tertiary'] = mixColor(palette.layer1, brand, 0.18)
  }

  for (const tokenName of Object.keys(perMode.light)) {
    tokens[tokenName] = { light: perMode.light[tokenName], dark: perMode.dark[tokenName] }
  }
  return tokens
}
