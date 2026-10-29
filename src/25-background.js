/* -------------------------------------------------------------------------
 * Aurora Studio · wallpaper engine
 * Produces a global CSS layer (`html::before`) that paints the wallpaper
 * behind the whole app. The app surfaces become translucent through the
 * theme-token alpha values computed in 20-theme.js, so the station stays
 * readable and the wallpaper shows through.
 * ---------------------------------------------------------------------- */

/** Quote an arbitrary value for a CSS `url("...")` token. */
function cssUrlValue(value) {
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, '')
  return 'url("' + escaped + '")'
}

function resolveWallpaperImage(background, mode) {
  const data = typeof background.imageData === 'string' ? background.imageData : ''
  if (data.indexOf('data:image/') === 0) return { value: cssUrlValue(data), custom: true, animated: false }
  const url = typeof background.imageUrl === 'string' ? background.imageUrl.trim() : ''
  if (url && /^(https?:|data:image\/)/i.test(url)) return { value: cssUrlValue(url), custom: true, animated: false }
  const preset = backgroundPresetById(background.preset)
  return {
    value: preset.css[mode] || preset.css.dark,
    custom: false,
    animated: preset.animated === true,
  }
}

/**
 * Global CSS for the active wallpaper. Returns an empty string when the
 * feature is disabled (the caller removes the previous layer).
 */
function computeWallpaperCss(settings, scheme) {
  const current = settings || DEFAULT_SETTINGS
  const background = isPlainObject(current.background) ? current.background : DEFAULT_SETTINGS.background
  if (background.enabled === false) return ''

  const advanced = isPlainObject(current.advanced) ? current.advanced : DEFAULT_SETTINGS.advanced
  const mode = scheme === 'light' ? 'light' : 'dark'
  const image = resolveWallpaperImage(background, mode)
  const opacity = clampNumber(background.opacity, 0.2, 1, DEFAULT_SETTINGS.background.opacity)
  const dim = clampNumber(background.dim, 0, 0.8, DEFAULT_SETTINGS.background.dim)
  const blur = clampNumber(background.blur, 0, 30, DEFAULT_SETTINGS.background.blur)
  const animated = image.animated && background.animated !== false && advanced.animations !== false
  const dimColor = mode === 'light' ? '255, 255, 255' : '0, 0, 0'

  const layers = []
  if (dim > 0) layers.push('linear-gradient(rgba(' + dimColor + ', ' + dim + '), rgba(' + dimColor + ', ' + dim + '))')
  layers.push(image.value)

  const inset = Math.round(blur * 2 + 8)
  const fallback = mode === 'light' ? '#f3f3f6' : '#08090e'

  let css = ''
  css += 'html { background-color: ' + fallback + '; }\n'
  css += 'html::before {\n'
  css += '  content: "";\n'
  css += '  position: fixed;\n'
  css += '  inset: -' + inset + 'px;\n'
  css += '  z-index: -1;\n'
  css += '  pointer-events: none;\n'
  css += '  background-image: ' + layers.join(', ') + ';\n'
  css += '  background-size: cover;\n'
  css += '  background-position: center center;\n'
  css += '  background-repeat: no-repeat;\n'
  css += '  opacity: ' + Math.round(opacity * 1000) / 1000 + ';\n'
  css += '  filter: ' + (blur > 0 ? 'blur(' + blur + 'px)' : 'none') + ';\n'
  css += '  transform: translateZ(0);\n'
  if (animated) css += '  animation: ' + WALLPAPER_ANIMATION + ' 42s ease-in-out infinite alternate;\n'
  css += '}\n'
  /*
   * The app paints `background: var(--dsw-alias-bg-base)` on both <body> and
   * the shell frame; two translucent base layers would multiply into an
   * almost opaque wall that hides the wallpaper. Making the body background
   * transparent (only while a wallpaper is active — this whole stylesheet is
   * removed when it is disabled) leaves exactly one translucent base layer
   * between the wallpaper and the UI. `!important` is required because the
   * host declaration comes from the token stylesheet with higher specificity
   * than a plugin rule could otherwise reach.
   */
  css += 'body { background: transparent !important; }\n'

  if (animated) {
    css += '@keyframes ' + WALLPAPER_ANIMATION + ' {\n'
    css += '  from { transform: translate3d(-1.6%, -1%, 0) scale(1.05); }\n'
    css += '  to { transform: translate3d(1.6%, 1%, 0) scale(1.11); }\n'
    css += '}\n'
  }
  css += '@media (prefers-reduced-motion: reduce) {\n'
  css += '  html::before { animation: none !important; }\n'
  css += '}\n'
  return css
}
