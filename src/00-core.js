/* -------------------------------------------------------------------------
 * Aurora Studio · core
 * Constants, tiny utilities, color math and the preset catalogues shared by
 * every other fragment. This file is concatenated into the client-module
 * factory scope (see build.mjs), so declarations are plain top-level symbols.
 * ---------------------------------------------------------------------- */

const PLUGIN_ID = '@local/aurora-studio'
const STORAGE_KEY = 'aurora-studio:settings:v1'
const WALLPAPER_ANIMATION = 'aurora-studio-wallpaper-pan'

/* ---------------------------------------------------------------- basics */

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function clampNumber(value, min, max, fallback) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

/** Deep-merge `patch` into a copy of `base`; arrays are replaced, not merged. */
function deepMerge(base, patch) {
  const output = Array.isArray(base) ? base.slice() : Object.assign({}, base)
  if (!isPlainObject(patch)) return output
  for (const key of Object.keys(patch)) {
    const value = patch[key]
    if (value === undefined) continue
    if (isPlainObject(value) && isPlainObject(output[key])) output[key] = deepMerge(output[key], value)
    else if (Array.isArray(value)) output[key] = value.slice()
    else output[key] = value
  }
  return output
}

/* ------------------------------------------------------------- color math */

const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

function isHexColor(value) {
  return typeof value === 'string' && HEX_COLOR_RE.test(value.trim())
}

function normalizeHex(value, fallback) {
  if (!isHexColor(value)) return fallback
  let hex = value.trim().toLowerCase()
  if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
  return hex
}

function hexToRgb(hex) {
  const value = normalizeHex(hex, '#000000')
  return {
    r: parseInt(value.slice(1, 3), 16),
    g: parseInt(value.slice(3, 5), 16),
    b: parseInt(value.slice(5, 7), 16),
  }
}

function channelToHex(channel) {
  const value = Math.round(Math.min(255, Math.max(0, channel)))
  return value.toString(16).padStart(2, '0')
}

function rgbToHex(rgb) {
  return '#' + channelToHex(rgb.r) + channelToHex(rgb.g) + channelToHex(rgb.b)
}

/** Mix `b` into `a` by ratio `t` (0 = a, 1 = b). */
function mixColor(a, b, t) {
  const from = hexToRgb(a)
  const to = hexToRgb(b)
  const ratio = clampNumber(t, 0, 1, 0)
  return rgbToHex({
    r: from.r + (to.r - from.r) * ratio,
    g: from.g + (to.g - from.g) * ratio,
    b: from.b + (to.b - from.b) * ratio,
  })
}

function withAlpha(hex, alpha) {
  const rgb = hexToRgb(hex)
  const value = Math.round(clampNumber(alpha, 0, 1, 1) * 1000) / 1000
  return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + value + ')'
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex)
  const linear = (channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b)
}

/** Keep the accent usable as a text/icon color on the current scheme. */
function ensureAccentContrast(accent, mode) {
  let color = accent
  if (mode === 'light') {
    if (relativeLuminance(color) > 0.5) color = mixColor(color, '#000000', 0.34)
    /* Slightly deepen every mid/light accent so white text on primary fills
       reaches a usable contrast ratio in the light theme. */
    if (relativeLuminance(color) > 0.16) color = mixColor(color, '#000000', 0.12)
    if (relativeLuminance(color) < 0.05) color = mixColor(color, '#ffffff', 0.2)
  } else {
    if (relativeLuminance(color) < 0.2) color = mixColor(color, '#ffffff', 0.34)
    if (relativeLuminance(color) > 0.86) color = mixColor(color, '#000000', 0.18)
  }
  return color
}

/* ---------------------------------------------------------- theme presets */

/** Curated palettes. `bg` is the flat base color when no wallpaper is shown. */
const THEME_PRESETS = [
  { id: 'aurora', name: { zh: '极光紫', en: 'Aurora Violet' }, accent: '#7c6cf6', bg: { light: '#f5f2ff', dark: '#0c0d19' } },
  { id: 'glacier', name: { zh: '冰川蓝', en: 'Glacier Blue' }, accent: '#2aa9f0', bg: { light: '#f0f8ff', dark: '#081320' } },
  { id: 'sakura', name: { zh: '樱花粉', en: 'Sakura Pink' }, accent: '#f05fa8', bg: { light: '#fff5f9', dark: '#1a1018' } },
  { id: 'forest', name: { zh: '苔原绿', en: 'Moss Forest' }, accent: '#2fbf8f', bg: { light: '#f2fbf6', dark: '#0a1512' } },
  { id: 'sunset', name: { zh: '落日橙', en: 'Sunset Amber' }, accent: '#f58a3c', bg: { light: '#fff7f0', dark: '#1a120d' } },
  { id: 'midnight', name: { zh: '午夜靛', en: 'Midnight Indigo' }, accent: '#6366f1', bg: { light: '#f3f4ff', dark: '#090b1a' } },
  { id: 'graphite', name: { zh: '石墨灰', en: 'Graphite' }, accent: '#6b7280', bg: { light: '#f7f7f8', dark: '#101114' } },
  { id: 'cyber', name: { zh: '赛博霓虹', en: 'Cyber Neon' }, accent: '#e35bf0', bg: { light: '#fdf3ff', dark: '#0c0616' } },
]

const THEME_PRESET_IDS = THEME_PRESETS.map((preset) => preset.id)

function themePresetById(id) {
  return THEME_PRESETS.find((preset) => preset.id === id) || THEME_PRESETS[0]
}

/* ----------------------------------------------------- background presets */

/**
 * Ready-to-use CSS `background-image` values. Both schemes are supplied so the
 * wallpaper can flip with the resolved theme without re-authoring colors.
 * `animated: true` presets may drift slowly (opt-out via settings).
 */
const BACKGROUND_PRESETS = [
  {
    id: 'aurora',
    name: { zh: '极光流彩', en: 'Aurora Veil' },
    animated: true,
    css: {
      light: 'radial-gradient(1100px 760px at 14% 18%, rgba(124, 108, 246, 0.30), transparent 62%), radial-gradient(900px 700px at 86% 12%, rgba(56, 189, 248, 0.26), transparent 58%), radial-gradient(1100px 900px at 52% 96%, rgba(240, 95, 168, 0.22), transparent 60%), linear-gradient(158deg, #f4f0ff 0%, #eef7ff 48%, #fff3fa 100%)',
      dark: 'radial-gradient(1100px 800px at 18% 22%, rgba(124, 108, 246, 0.42), transparent 64%), radial-gradient(900px 700px at 84% 14%, rgba(34, 211, 238, 0.30), transparent 58%), radial-gradient(1200px 920px at 54% 100%, rgba(232, 121, 249, 0.26), transparent 62%), linear-gradient(160deg, #06070f 0%, #0b0c1c 52%, #08101a 100%)',
    },
  },
  {
    id: 'dusk',
    name: { zh: '暮色晚霞', en: 'Dusk Glow' },
    animated: true,
    css: {
      light: 'radial-gradient(900px 620px at 12% 88%, rgba(251, 146, 60, 0.26), transparent 60%), radial-gradient(1000px 720px at 88% 84%, rgba(244, 114, 182, 0.24), transparent 62%), linear-gradient(200deg, #fff7f2 0%, #fff2f6 55%, #fff8ef 100%)',
      dark: 'radial-gradient(900px 640px at 12% 90%, rgba(251, 146, 60, 0.32), transparent 62%), radial-gradient(1000px 760px at 88% 82%, rgba(244, 114, 182, 0.28), transparent 64%), linear-gradient(200deg, #12090c 0%, #1c0f14 55%, #170d08 100%)',
    },
  },
  {
    id: 'ocean',
    name: { zh: '深海雾', en: 'Deep Ocean' },
    animated: true,
    css: {
      light: 'radial-gradient(1000px 700px at 22% 16%, rgba(45, 212, 191, 0.26), transparent 60%), radial-gradient(900px 680px at 82% 30%, rgba(59, 130, 246, 0.22), transparent 60%), linear-gradient(170deg, #effcfb 0%, #eef6ff 52%, #f2fbff 100%)',
      dark: 'radial-gradient(1000px 720px at 20% 18%, rgba(45, 212, 191, 0.26), transparent 62%), radial-gradient(940px 700px at 84% 28%, rgba(37, 99, 235, 0.34), transparent 62%), linear-gradient(170deg, #04100f 0%, #061423 54%, #04121a 100%)',
    },
  },
  {
    id: 'sakura',
    name: { zh: '樱吹雪', en: 'Sakura Breeze' },
    animated: true,
    css: {
      light: 'radial-gradient(900px 640px at 16% 12%, rgba(244, 114, 182, 0.28), transparent 60%), radial-gradient(1000px 760px at 84% 26%, rgba(251, 191, 36, 0.16), transparent 60%), linear-gradient(165deg, #fff6fa 0%, #fff2f7 52%, #fff8f2 100%)',
      dark: 'radial-gradient(900px 640px at 16% 14%, rgba(219, 39, 119, 0.30), transparent 62%), radial-gradient(1000px 760px at 84% 24%, rgba(124, 58, 237, 0.26), transparent 62%), linear-gradient(165deg, #140810 0%, #1b0b16 54%, #120812 100%)',
    },
  },
  {
    id: 'forest',
    name: { zh: '苔原森林', en: 'Moss Forest' },
    animated: true,
    css: {
      light: 'radial-gradient(980px 700px at 18% 82%, rgba(52, 211, 153, 0.24), transparent 62%), radial-gradient(900px 660px at 86% 20%, rgba(125, 211, 252, 0.18), transparent 58%), linear-gradient(180deg, #f2fcf6 0%, #f6fcf2 55%, #eefaf4 100%)',
      dark: 'radial-gradient(980px 720px at 18% 84%, rgba(16, 185, 129, 0.26), transparent 64%), radial-gradient(900px 660px at 86% 18%, rgba(14, 116, 144, 0.28), transparent 60%), linear-gradient(180deg, #04120d 0%, #071812 56%, #04120e 100%)',
    },
  },
  {
    id: 'graphite',
    name: { zh: '石墨暗纹', en: 'Graphite Mesh' },
    animated: false,
    css: {
      light: 'radial-gradient(900px 640px at 20% 20%, rgba(148, 163, 184, 0.30), transparent 60%), radial-gradient(1000px 720px at 82% 78%, rgba(203, 213, 225, 0.55), transparent 62%), linear-gradient(160deg, #f6f7f9 0%, #eef1f5 100%)',
      dark: 'radial-gradient(900px 680px at 20% 20%, rgba(71, 85, 105, 0.40), transparent 62%), radial-gradient(1000px 760px at 82% 78%, rgba(30, 41, 59, 0.65), transparent 64%), linear-gradient(160deg, #0b0d10 0%, #12151b 100%)',
    },
  },
  {
    id: 'starlight',
    name: { zh: '星野', en: 'Starlit' },
    animated: false,
    css: {
      light: 'radial-gradient(700px 520px at 24% 18%, rgba(99, 102, 241, 0.20), transparent 62%), radial-gradient(800px 600px at 78% 72%, rgba(14, 165, 233, 0.18), transparent 62%), linear-gradient(160deg, #f4f6ff 0%, #eef4ff 60%, #f7f1ff 100%)',
      dark: 'radial-gradient(700px 520px at 24% 18%, rgba(129, 140, 248, 0.34), transparent 62%), radial-gradient(800px 620px at 78% 72%, rgba(14, 165, 233, 0.26), transparent 62%), radial-gradient(2px 2px at 18% 34%, rgba(255, 255, 255, 0.85), transparent 60%), radial-gradient(2px 2px at 72% 22%, rgba(255, 255, 255, 0.7), transparent 60%), radial-gradient(1.5px 1.5px at 44% 74%, rgba(255, 255, 255, 0.6), transparent 60%), linear-gradient(160deg, #05060f 0%, #0a0b1a 58%, #080611 100%)',
    },
  },
]

const BACKGROUND_PRESET_IDS = BACKGROUND_PRESETS.map((preset) => preset.id)

function backgroundPresetById(id) {
  return BACKGROUND_PRESETS.find((preset) => preset.id === id) || BACKGROUND_PRESETS[0]
}

/* ------------------------------------------------------------- i18n glue */

/** Resolve a `{ zh, en }` catalogue pair against the active locale. */
function localizePair(pair) {
  if (!pair) return ''
  const locale = RUNTIME ? RUNTIME.getLocale() : 'zh'
  return pair[locale] || pair.en || pair.zh || ''
}
