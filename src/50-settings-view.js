/**
 * 50-settings-view.js — Aurora Studio settings page (studio-ui).
 *
 * Fragment of the single client module scope: no imports, no exports.
 * Declares `studioNavLabel` and `StudioSettingsView` only; every internal helper,
 * component and constant is studio/Studio-prefixed so it cannot collide with the
 * other fragments concatenated into this factory body.
 *
 * All edits apply immediately through `store.set` (no Save button). Text fields
 * commit on a short debounce / blur so typing never writes storage per keystroke.
 */

/* ------------------------------------------------------------------ */
/* Prefixed React hook aliases (avoids generic top-level names)        */
/* ------------------------------------------------------------------ */
const studioUseState = React.useState
const studioUseEffect = React.useEffect
const studioUseRef = React.useRef

/* ------------------------------------------------------------------ */
/* Copy (zh / en)                                                      */
/* ------------------------------------------------------------------ */
const STUDIO_I18N = {
  navLabel: { zh: '定制工作室', en: 'Studio' },
  pageTitle: { zh: '定制工作室', en: 'Studio' },
  pageSubtitle: {
    zh: '主题、背景、桌宠与高级样式，改动即时生效。',
    en: 'Theme, backdrop, pet, and advanced styling — every change applies live.',
  },
  live: { zh: '即时生效', en: 'Live' },
  tabsLabel: { zh: '工作室分区', en: 'Studio sections' },
  tabTheme: { zh: '主题', en: 'Theme' },
  tabBackground: { zh: '背景', en: 'Background' },
  tabPet: { zh: '桌宠', en: 'Pet' },
  tabAdvanced: { zh: '高级', en: 'Advanced' },
  saveFailed: {
    zh: '设置已应用，但未能写入本地存储（存储空间可能已满）。',
    en: 'Settings applied, but they could not be saved to local storage (storage may be full).',
  },

  themePresetsTitle: { zh: '配色预设', en: 'Palette presets' },
  themePresetsDesc: { zh: '选一套配色，或自定义强调色。', en: 'Pick a palette, or tune the accent yourself.' },
  customBadge: { zh: '自定义', en: 'Custom' },
  accentTitle: { zh: '强调色', en: 'Accent color' },
  accentDesc: { zh: '用于按钮、高亮与桌宠取色。', en: 'Used by buttons, highlights, and the pet.' },
  invalidHex: { zh: '请输入 6 位十六进制色值，如 #7C6CF6。', en: 'Enter a 6-digit hex color, e.g. #7C6CF6.' },
  quickColors: { zh: '快捷色板', en: 'Quick colors' },
  surfaceOpacity: { zh: '界面不透明度', en: 'Surface opacity' },
  surfaceOpacityDesc: { zh: '越低，面板越通透，壁纸越明显。', en: 'Lower values let the wallpaper show through more.' },
  tint: { zh: '面板染色', en: 'Tint surfaces' },
  tintDesc: { zh: '让面板带一点强调色的味道。', en: 'Blend a hint of the accent into surfaces.' },
  appearanceTitle: { zh: '外观模式', en: 'Appearance' },
  appearanceDesc: { zh: '跟随系统时，会随系统深浅色自动切换。', en: 'System follows the OS light/dark setting.' },
  light: { zh: '浅色', en: 'Light' },
  dark: { zh: '深色', en: 'Dark' },
  system: { zh: '跟随系统', en: 'System' },

  bgPresetsTitle: { zh: '渐变壁纸', en: 'Gradient wallpapers' },
  bgPresetsDesc: { zh: '由内置渐变生成的壁纸。', en: 'Wallpapers generated from built-in gradients.' },
  bgEnabled: { zh: '显示背景', en: 'Show wallpaper' },
  bgEnabledDesc: { zh: '关闭后使用纯色面板。', en: 'Turn off to use plain surfaces.' },
  customImageTitle: { zh: '自定义图片', en: 'Custom image' },
  customImageDesc: {
    zh: '上传图片或填写图片地址；上传的图片优先。',
    en: 'Upload an image or paste a URL; an upload takes priority.',
  },
  uploadImage: { zh: '上传图片', en: 'Upload image' },
  replaceImage: { zh: '更换图片', en: 'Replace image' },
  removeImage: { zh: '移除图片', en: 'Remove image' },
  processing: { zh: '处理中…', en: 'Processing…' },
  imageUrl: { zh: '图片地址', en: 'Image URL' },
  imageUrlPlaceholder: { zh: 'https://example.com/wallpaper.jpg', en: 'https://example.com/wallpaper.jpg' },
  invalidUrl: {
    zh: '请输入以 http:// 或 https:// 开头的图片地址。',
    en: 'Enter an image URL starting with http:// or https://.',
  },
  uploadTypeError: { zh: '请选择图片文件。', en: 'Please choose an image file.' },
  uploadDecodeError: { zh: '图片读取失败，请换一张试试。', en: 'Could not read that image; try another file.' },
  uploadTooLarge: {
    zh: '图片过大，压缩后仍超出存储上限，请换一张更小的图片。',
    en: 'That image is still too large after compression; try a smaller one.',
  },
  storageFull: {
    zh: '本地存储空间不足，图片没有保存，已恢复之前的背景。',
    en: 'Not enough local storage for that image; the previous background was restored.',
  },
  uploadedImage: { zh: '本地上传', en: 'Uploaded' },
  remoteImage: { zh: '网络图片', en: 'Remote URL' },
  imageSize: { zh: '约 {n} KB', en: '~{n} KB' },
  noImage: { zh: '尚未选择自定义图片，将使用上方渐变壁纸。', en: 'No custom image yet; gradient wallpapers are used.' },
  adjustTitle: { zh: '显示调整', en: 'Display' },
  adjustDesc: { zh: '控制壁纸的强度与质感。', en: 'Tune how strongly the wallpaper shows.' },
  opacity: { zh: '图片不透明度', en: 'Image opacity' },
  opacityDesc: { zh: '越低，图片越淡。', en: 'Lower values fade the image out.' },
  dim: { zh: '遮罩深度', en: 'Dim overlay' },
  dimDesc: { zh: '加深遮罩以提升前景可读性。', en: 'Deepen the overlay to keep text readable.' },
  blur: { zh: '模糊', en: 'Blur' },
  blurDesc: { zh: '柔化图片细节。', en: 'Soften image detail.' },
  animated: { zh: '动态渐变', en: 'Animate gradients' },
  animatedDesc: {
    zh: '同时需要「高级 → 动画」开启。',
    en: 'Also requires Animations to be on in Advanced.',
  },

  petEnabled: { zh: '显示桌宠', en: 'Show pet' },
  petEnabledDesc: { zh: '在界面右下角显示一只可拖动的伙伴。', en: 'A draggable companion in the bottom-right corner.' },
  petCharacter: { zh: '角色', en: 'Character' },
  petCharacterDesc: { zh: '点击切换角色，预览会立即更新。', en: 'Pick a character; the preview updates instantly.' },
  petName: { zh: '名字', en: 'Name' },
  petNameDesc: { zh: '显示在气泡前缀。', en: 'Shown as the bubble prefix.' },
  petNamePlaceholder: { zh: '大肥鱼', en: 'Chonky' },
  petSize: { zh: '大小', en: 'Size' },
  petSizeDesc: { zh: '40 – 360 像素自由缩放；也可以把鼠标放到桌宠上滚动滚轮。', en: 'Freely 40–360 px; you can also scroll the wheel over the pet.' },
  petMotion: { zh: '运动模式', en: 'Motion' },
  petMotionDesc: {
    zh: '自由运动会让桌宠自己在屏幕上走动；跟随鼠标则会轻轻跟在光标旁边。',
    en: 'Free roam lets the pet wander around on its own; follow keeps it near the cursor.',
  },
  motionStill: { zh: '静止', en: 'Stay' },
  motionRoam: { zh: '自由运动', en: 'Free roam' },
  motionFollow: { zh: '跟随鼠标', en: 'Follow cursor' },
  motionHint: {
    zh: '拖动、悬停或点击时会暂停移动；松开后会自动继续。',
    en: 'Dragging, hovering or clicking pauses the motion; it resumes automatically.',
  },
  roamSpeed: { zh: '运动速度', en: 'Motion speed' },
  roamSpeedDesc: { zh: '像素 / 秒，越大走得越快。', en: 'Pixels per second; higher moves faster.' },
  petOpacity: { zh: '不透明度', en: 'Opacity' },
  petAccount: { zh: '余额与用量', en: 'Balance & usage' },
  petAccountDesc: {
    zh: '在桌宠下方显示余额胶囊；点击可查看 DeepSeek 账户余额、用量页面与充值入口（需要已登录 DeepSeek 账号）。',
    en: 'Shows a wallet pill under the pet; click it for DeepSeek wallet balances, the usage page and top-up link (requires a signed-in DeepSeek account).',
  },
  idleChatter: { zh: '空闲闲聊', en: 'Idle chatter' },
  idleChatterDesc: { zh: '空闲时随机冒出气泡。', en: 'Random bubbles while idle.' },
  chatterInterval: { zh: '闲聊间隔', en: 'Chatter interval' },
  chatterIntervalDesc: { zh: '两次气泡之间至少间隔多久。', en: 'Minimum time between bubbles.' },
  customLines: { zh: '自定义台词', en: 'Custom lines' },
  customLinesDesc: { zh: '每行一句，空行会被忽略。', en: 'One line per bubble; blank lines are ignored.' },
  customLinesPlaceholder: { zh: '今天也要加油哦\n要不要休息一下？', en: 'You got this!\nMaybe take a break?' },
  linesCount: { zh: '共 {n} 句', en: '{n} lines' },
  positionTitle: { zh: '位置与快捷键', en: 'Position & shortcut' },
  resetPosition: { zh: '重置位置', en: 'Reset position' },
  resetPositionDesc: { zh: '把桌宠放回右下角。', en: 'Return the pet to the bottom-right corner.' },
  hotkeyHint: { zh: '按 Ctrl + Shift + A 快速显示或隐藏桌宠。', en: 'Press Ctrl + Shift + A to show or hide the pet.' },

  animationsTitle: { zh: '动画', en: 'Animations' },
  animations: { zh: '界面动画', en: 'Animations' },
  animationsDesc: {
    zh: '关闭后，主题、壁纸与桌宠的动效全部停止。',
    en: 'Turning this off stops theme, wallpaper, and pet motion.',
  },
  customCssTitle: { zh: '自定义 CSS', en: 'Custom CSS' },
  customCssDesc: {
    zh: '全局注入并立即生效；写错可能影响整个界面，请谨慎使用。',
    en: 'Injected globally and applied instantly; invalid rules can affect the whole UI.',
  },
  customCssPlaceholder: { zh: '/* 例如：.dsh-scrollbar-thumb { opacity: .5 } */', en: '/* e.g. .dsh-scrollbar-thumb { opacity: .5 } */' },
  chars: { zh: '{n} 字符', en: '{n} chars' },
  exportTitle: { zh: '导出设置', en: 'Export settings' },
  exportDesc: { zh: '复制 JSON 或下载文件，用于备份当前配置。', en: 'Copy the JSON or download it to back up this configuration.' },
  copy: { zh: '复制', en: 'Copy' },
  copied: { zh: '已复制到剪贴板。', en: 'Copied to clipboard.' },
  copyFailed: {
    zh: '复制失败，已选中文本，请按 Ctrl+C 手动复制。',
    en: 'Copy failed; the text is selected — press Ctrl+C to copy it.',
  },
  download: { zh: '下载 JSON', en: 'Download JSON' },
  downloadFailed: { zh: '下载失败，请改用复制。', en: 'Download failed; use Copy instead.' },
  importTitle: { zh: '导入设置', en: 'Import settings' },
  importDesc: {
    zh: '粘贴此前导出的 JSON，校验通过后覆盖当前配置。',
    en: 'Paste a previously exported JSON; valid settings replace the current ones.',
  },
  importPlaceholder: { zh: '{ "version": 1, "theme": { … } }', en: '{ "version": 1, "theme": { … } }' },
  importApply: { zh: '校验并应用', en: 'Validate & apply' },
  importEmpty: { zh: '请先粘贴设置 JSON。', en: 'Paste a settings JSON first.' },
  importInvalidJson: { zh: 'JSON 解析失败：', en: 'Could not parse JSON: ' },
  importInvalidShape: { zh: '这不是有效的 Aurora Studio 设置文件。', en: 'This is not a valid Aurora Studio settings file.' },
  importInvalidVersion: { zh: '仅支持 version: 1 的设置文件。', en: 'Only settings files with version: 1 are supported.' },
  importNoFields: { zh: '没有可导入的设置项。', en: 'No recognizable settings were found.' },
  importInvalidField: { zh: '字段格式不正确：', en: 'Invalid field: ' },
  importSuccess: { zh: '设置已导入并生效。', en: 'Settings imported and applied.' },
  resetTitle: { zh: '重置全部', en: 'Reset everything' },
  resetDesc: {
    zh: '恢复所有主题、背景、桌宠与高级设置为默认值。',
    en: 'Restore every theme, wallpaper, pet, and advanced setting to its default.',
  },
  resetButton: { zh: '重置全部设置', en: 'Reset all settings' },
  resetConfirm: { zh: '确认重置？', en: 'Reset everything?' },
  resetCancel: { zh: '取消', en: 'Cancel' },
  resetDone: { zh: '已恢复默认设置。', en: 'Defaults restored.' },
  resetFailed: { zh: '重置失败，请稍后重试。', en: 'Reset failed; please try again.' },
}

/** Resolve one copy entry for a locale. */
function studioText(locale, key) {
  const entry = STUDIO_I18N[key]
  if (!entry) return key
  if (locale === 'zh') return entry.zh || entry.en
  return entry.en || entry.zh
}

/** Current locale without assuming RUNTIME exists yet (mirrors the core fallback). */
function studioLocale() {
  try {
    if (RUNTIME && typeof RUNTIME.getLocale === 'function') {
      return RUNTIME.getLocale() === 'zh' ? 'zh' : 'en'
    }
  } catch (error) {
    /* fall through to the browser hint */
  }
  try {
    const hint = typeof navigator !== 'undefined' && navigator && navigator.language ? String(navigator.language) : 'en'
    return hint.toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en'
  } catch (error) {
    return 'en'
  }
}

/** Locale hook kept as a self-contained fallback in case the core hook is absent. */
function studioUseLocaleFallback() {
  const [locale, setLocale] = studioUseState(studioLocale)
  studioUseEffect(() => {
    let unsubscribe = null
    try {
      if (RUNTIME && typeof RUNTIME.subscribeLocale === 'function') {
        unsubscribe = RUNTIME.subscribeLocale(() => setLocale(studioLocale()))
      }
    } catch (error) {
      unsubscribe = null
    }
    setLocale(studioLocale())
    return () => {
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe()
        } catch (error) {
          /* ignore */
        }
      }
    }
  }, [])
  return locale
}

const studioUseLocale = typeof useAuroraLocale === 'function' ? useAuroraLocale : studioUseLocaleFallback

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */
const STUDIO_TABS = [
  { id: 'theme', label: 'tabTheme' },
  { id: 'background', label: 'tabBackground' },
  { id: 'pet', label: 'tabPet' },
  { id: 'advanced', label: 'tabAdvanced' },
]

const STUDIO_QUICK_ACCENTS = ['#7c6cf6', '#4f8cff', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6']

/** localStorage is per-origin and shared with the host; stay well below quota. */
const STUDIO_MAX_IMAGE_CHARS = 2400000

const STUDIO_DEFAULT_ACCENT = '#7c6cf6'

function studioIsRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function studioClamp(value, min, max) {
  const number = typeof value === 'number' && isFinite(value) ? value : min
  return Math.min(max, Math.max(min, number))
}

function studioNormalizeHex(value) {
  if (typeof value !== 'string') return ''
  let text = value.trim()
  if (text.charAt(0) === '#') text = text.slice(1)
  if (/^[0-9a-fA-F]{3}$/.test(text)) {
    text = text.charAt(0) + text.charAt(0) + text.charAt(1) + text.charAt(1) + text.charAt(2) + text.charAt(2)
  }
  if (!/^[0-9a-fA-F]{6}$/.test(text)) return ''
  return '#' + text.toLowerCase()
}

function studioShorten(value, max) {
  const text = String(value === undefined || value === null ? '' : value)
  if (text.length <= max) return text
  return text.slice(0, Math.max(1, max - 1)) + '…'
}

/** Safe inline `url("…")` value for previews (quotes/newlines stripped). */
function studioCssUrl(value) {
  const text = String(value === undefined || value === null ? '' : value).replace(/["\\\r\n]/g, '')
  return 'url("' + text + '")'
}

function studioPresetLabel(preset, locale) {
  if (!preset) return ''
  if (studioIsRecord(preset.name)) {
    return preset.name[locale] || preset.name.en || preset.name.zh || preset.id || ''
  }
  return preset.id || ''
}

function studioThemePresets() {
  return Array.isArray(THEME_PRESETS) ? THEME_PRESETS : []
}

function studioBackgroundPresets() {
  return Array.isArray(BACKGROUND_PRESETS) ? BACKGROUND_PRESETS : []
}

function studioPetCharacters() {
  return Array.isArray(PET_CHARACTERS) ? PET_CHARACTERS : []
}

function studioPetLabel(character, locale) {
  if (!character) return ''
  try {
    if (typeof petCharacterLabel === 'function') {
      const label = petCharacterLabel(character.id)
      if (label) return label
    }
  } catch (error) {
    /* fall through to the static name */
  }
  if (studioIsRecord(character.name)) {
    return character.name[locale] || character.name.en || character.name.zh || character.id || ''
  }
  return character.id || ''
}

/**
 * Inline style for a theme preset swatch: the preset's flat base color plus a
 * soft accent corner glow. Both colors come from preset data (user preview).
 */
function studioThemeSwatchStyle(preset, scheme) {
  const backgrounds = preset && studioIsRecord(preset.bg) ? preset.bg : null
  const base = backgrounds ? backgrounds[scheme] || backgrounds.dark || backgrounds.light : ''
  const accent = studioNormalizeHex(preset && preset.accent) || STUDIO_DEFAULT_ACCENT
  const style = { backgroundImage: 'radial-gradient(120% 120% at 100% 100%, ' + accent + '59, transparent 62%)' }
  if (typeof base === 'string' && base) style.backgroundColor = base
  return style
}

/** Background-image value for a wallpaper preset preview under the active scheme. */
function studioWallpaperBackground(preset, scheme) {
  if (!preset) return 'none'
  const values = studioIsRecord(preset.css) ? preset.css : null
  if (values) {
    const value = values[scheme] || values.dark || values.light
    if (typeof value === 'string' && value) return value
  }
  return 'none'
}

/** store.set wrapper that never throws into the render tree. */
function studioStoreSet(patch) {
  try {
    store.set(patch)
    return null
  } catch (error) {
    return error || new Error('store.set failed')
  }
}

/** store.replace wrapper (import / reset). */
function studioStoreReplace(next) {
  try {
    if (store && typeof store.replace === 'function') {
      store.replace(next)
      return null
    }
    return studioStoreSet(next)
  } catch (error) {
    return error || new Error('store.replace failed')
  }
}

/** Persisted-storage failure reported by the core store (quota, privacy mode…). */
function studioPersistFailure() {
  try {
    if (!store || typeof store.getPersistError !== 'function') return null
    const failure = store.getPersistError()
    if (!failure) return null
    if (typeof failure === 'string') return failure
    if (failure && typeof failure.message === 'string') return failure.message
    return String(failure)
  } catch (error) {
    return null
  }
}

/** Lines textarea ⇄ settings.pet.lines (store keeps at most 40 lines). */
function studioParseLines(text) {
  const lines = String(text === undefined || text === null ? '' : text).split(/\r?\n/)
  const parsed = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (line && parsed.length < 40) parsed.push(line.slice(0, 160))
  }
  return parsed
}

/**
 * Read an uploaded image, downscale it to ≤1920px on the long edge and re-encode
 * as JPEG (quality 0.85). Falls back to the original data URL if canvas is
 * unavailable. Rejects only for unreadable/undecodable files.
 */
function studioImageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('FileReader unavailable'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read failed'))
    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : ''
      if (!raw) {
        reject(new Error('empty image'))
        return
      }
      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        resolve(raw)
        return
      }
      const image = new Image()
      image.onerror = () => reject(new Error('decode failed'))
      image.onload = () => {
        try {
          const naturalWidth = image.naturalWidth || image.width || 0
          const naturalHeight = image.naturalHeight || image.height || 0
          if (!naturalWidth || !naturalHeight) {
            resolve(raw)
            return
          }
          const maxEdge = 1920
          const scale = Math.min(1, maxEdge / Math.max(naturalWidth, naturalHeight))
          const width = Math.max(1, Math.round(naturalWidth * scale))
          const height = Math.max(1, Math.round(naturalHeight * scale))
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const context = canvas.getContext('2d')
          if (!context) {
            resolve(raw)
            return
          }
          /* JPEG has no alpha: paint the active scheme's canvas color first so
             transparent PNG wallpapers do not turn black. */
          let canvasFill = '#151517'
          try {
            if (RUNTIME && typeof RUNTIME.getScheme === 'function' && RUNTIME.getScheme() === 'light') canvasFill = '#f3f3f6'
          } catch (error) {
            /* keep the dark fallback */
          }
          context.fillStyle = canvasFill
          context.fillRect(0, 0, width, height)
          context.drawImage(image, 0, 0, width, height)
          let output = ''
          try {
            output = canvas.toDataURL('image/jpeg', 0.85)
          } catch (error) {
            output = ''
          }
          if (output && output.indexOf('data:image/') === 0) resolve(output)
          else resolve(raw)
        } catch (error) {
          reject(error)
        }
      }
      image.src = raw
    }
    reader.readAsDataURL(file)
  })
}

/** Clipboard write that resolves false instead of throwing. */
async function studioCopyText(text) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (error) {
    /* fall back to execCommand below */
  }
  return false
}

/** Deprecated copy fallback for the currently selected text. */
function studioExecCopy() {
  try {
    if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
      return document.execCommand('copy') === true
    }
  } catch (error) {
    /* ignore */
  }
  return false
}

/**
 * Validate an imported settings document and reduce it to known fields.
 * Returns `{ ok: true, value }` or `{ ok: false, key, detail }` for inline copy.
 */
function studioSanitizeImport(raw) {
  if (!studioIsRecord(raw)) return { ok: false, key: 'importInvalidShape' }
  if (raw.version !== undefined && raw.version !== 1) return { ok: false, key: 'importInvalidVersion' }

  const invalid = (detail) => ({ ok: false, key: 'importInvalidField', detail: detail })
  const next = { version: 1 }
  let recognized = false

  if (raw.theme !== undefined) {
    if (!studioIsRecord(raw.theme)) return invalid('theme')
    const theme = {}
    if (raw.theme.preset !== undefined) {
      if (typeof raw.theme.preset !== 'string' || !raw.theme.preset) return invalid('theme.preset')
      const knownPresets = studioThemePresets()
      let knownPreset = raw.theme.preset === 'custom' || knownPresets.length === 0
      for (let index = 0; index < knownPresets.length; index += 1) {
        if (knownPresets[index] && knownPresets[index].id === raw.theme.preset) knownPreset = true
      }
      if (!knownPreset) return invalid('theme.preset')
      theme.preset = raw.theme.preset
    }
    if (raw.theme.accent !== undefined) {
      const accent = studioNormalizeHex(raw.theme.accent)
      if (!accent) return invalid('theme.accent')
      theme.accent = accent
    }
    if (raw.theme.surfaceOpacity !== undefined) {
      if (typeof raw.theme.surfaceOpacity !== 'number' || !isFinite(raw.theme.surfaceOpacity)) return invalid('theme.surfaceOpacity')
      theme.surfaceOpacity = studioClamp(raw.theme.surfaceOpacity, 0.55, 1)
    }
    if (raw.theme.tint !== undefined) {
      if (typeof raw.theme.tint !== 'boolean') return invalid('theme.tint')
      theme.tint = raw.theme.tint
    }
    if (Object.keys(theme).length > 0) {
      next.theme = theme
      recognized = true
    }
  }

  if (raw.background !== undefined) {
    if (!studioIsRecord(raw.background)) return invalid('background')
    const background = {}
    if (raw.background.enabled !== undefined) {
      if (typeof raw.background.enabled !== 'boolean') return invalid('background.enabled')
      background.enabled = raw.background.enabled
    }
    if (raw.background.preset !== undefined) {
      if (typeof raw.background.preset !== 'string' || !raw.background.preset) return invalid('background.preset')
      const knownPresets = studioBackgroundPresets()
      let knownPreset = raw.background.preset === 'custom' || knownPresets.length === 0
      for (let index = 0; index < knownPresets.length; index += 1) {
        if (knownPresets[index] && knownPresets[index].id === raw.background.preset) knownPreset = true
      }
      if (!knownPreset) return invalid('background.preset')
      background.preset = raw.background.preset
    }
    if (raw.background.imageUrl !== undefined) {
      if (typeof raw.background.imageUrl !== 'string') return invalid('background.imageUrl')
      const imageUrl = raw.background.imageUrl.trim()
      if (imageUrl && !/^https?:\/\//i.test(imageUrl)) return invalid('background.imageUrl')
      background.imageUrl = imageUrl
    }
    if (raw.background.imageData !== undefined) {
      if (typeof raw.background.imageData !== 'string') return invalid('background.imageData')
      const imageData = raw.background.imageData
      if (imageData && imageData.indexOf('data:image/') !== 0) return invalid('background.imageData')
      if (imageData.length > STUDIO_MAX_IMAGE_CHARS) return invalid('background.imageData')
      background.imageData = imageData
    }
    if (raw.background.opacity !== undefined) {
      if (typeof raw.background.opacity !== 'number' || !isFinite(raw.background.opacity)) return invalid('background.opacity')
      background.opacity = studioClamp(raw.background.opacity, 0.2, 1)
    }
    if (raw.background.dim !== undefined) {
      if (typeof raw.background.dim !== 'number' || !isFinite(raw.background.dim)) return invalid('background.dim')
      background.dim = studioClamp(raw.background.dim, 0, 0.8)
    }
    if (raw.background.blur !== undefined) {
      if (typeof raw.background.blur !== 'number' || !isFinite(raw.background.blur)) return invalid('background.blur')
      background.blur = studioClamp(raw.background.blur, 0, 30)
    }
    if (raw.background.animated !== undefined) {
      if (typeof raw.background.animated !== 'boolean') return invalid('background.animated')
      background.animated = raw.background.animated
    }
    if (Object.keys(background).length > 0) {
      next.background = background
      recognized = true
    }
  }

  if (raw.pet !== undefined) {
    if (!studioIsRecord(raw.pet)) return invalid('pet')
    const pet = {}
    const characters = studioPetCharacters()
    if (raw.pet.enabled !== undefined) {
      if (typeof raw.pet.enabled !== 'boolean') return invalid('pet.enabled')
      pet.enabled = raw.pet.enabled
    }
    if (raw.pet.character !== undefined) {
      if (typeof raw.pet.character !== 'string') return invalid('pet.character')
      let known = characters.length === 0
      for (let index = 0; index < characters.length; index += 1) {
        if (characters[index] && characters[index].id === raw.pet.character) known = true
      }
      if (!known) return invalid('pet.character')
      pet.character = raw.pet.character
    }
    if (raw.pet.name !== undefined) {
      if (typeof raw.pet.name !== 'string') return invalid('pet.name')
      pet.name = raw.pet.name.trim().slice(0, 32)
    }
    if (raw.pet.size !== undefined) {
      if (typeof raw.pet.size !== 'number' || !isFinite(raw.pet.size)) return invalid('pet.size')
      pet.size = Math.round(studioClamp(raw.pet.size, 40, 360))
    }
    if (raw.pet.mode !== undefined) {
      if (raw.pet.mode !== 'still' && raw.pet.mode !== 'roam' && raw.pet.mode !== 'follow') return invalid('pet.mode')
      pet.mode = raw.pet.mode
    }
    if (raw.pet.roamSpeed !== undefined) {
      if (typeof raw.pet.roamSpeed !== 'number' || !isFinite(raw.pet.roamSpeed)) return invalid('pet.roamSpeed')
      pet.roamSpeed = Math.round(studioClamp(raw.pet.roamSpeed, 20, 180))
    }
    if (raw.pet.opacity !== undefined) {
      if (typeof raw.pet.opacity !== 'number' || !isFinite(raw.pet.opacity)) return invalid('pet.opacity')
      pet.opacity = studioClamp(raw.pet.opacity, 0.3, 1)
    }
    if (raw.pet.x !== undefined) {
      if (raw.pet.x !== null && (typeof raw.pet.x !== 'number' || !isFinite(raw.pet.x))) return invalid('pet.x')
      pet.x = raw.pet.x === null ? null : Math.round(raw.pet.x)
    }
    if (raw.pet.y !== undefined) {
      if (raw.pet.y !== null && (typeof raw.pet.y !== 'number' || !isFinite(raw.pet.y))) return invalid('pet.y')
      pet.y = raw.pet.y === null ? null : Math.round(raw.pet.y)
    }
    if (raw.pet.idleChatter !== undefined) {
      if (typeof raw.pet.idleChatter !== 'boolean') return invalid('pet.idleChatter')
      pet.idleChatter = raw.pet.idleChatter
    }
    if (raw.pet.account !== undefined) {
      if (typeof raw.pet.account !== 'boolean') return invalid('pet.account')
      pet.account = raw.pet.account
    }
    if (raw.pet.chatterInterval !== undefined) {
      if (typeof raw.pet.chatterInterval !== 'number' || !isFinite(raw.pet.chatterInterval)) return invalid('pet.chatterInterval')
      pet.chatterInterval = Math.round(studioClamp(raw.pet.chatterInterval, 20, 300))
    }
    if (raw.pet.lines !== undefined) {
      if (!Array.isArray(raw.pet.lines)) return invalid('pet.lines')
      const lines = []
      for (let index = 0; index < raw.pet.lines.length; index += 1) {
        const line = raw.pet.lines[index]
        if (typeof line !== 'string') return invalid('pet.lines')
        const trimmed = line.trim()
        if (trimmed && lines.length < 40) lines.push(trimmed.slice(0, 160))
      }
      pet.lines = lines
    }
    if (Object.keys(pet).length > 0) {
      next.pet = pet
      recognized = true
    }
  }

  if (raw.advanced !== undefined) {
    if (!studioIsRecord(raw.advanced)) return invalid('advanced')
    const advanced = {}
    if (raw.advanced.customCss !== undefined) {
      if (typeof raw.advanced.customCss !== 'string') return invalid('advanced.customCss')
      advanced.customCss = raw.advanced.customCss
    }
    if (raw.advanced.animations !== undefined) {
      if (typeof raw.advanced.animations !== 'boolean') return invalid('advanced.animations')
      advanced.animations = raw.advanced.animations
    }
    if (Object.keys(advanced).length > 0) {
      next.advanced = advanced
      recognized = true
    }
  }

  if (!recognized) return { ok: false, key: 'importNoFields' }
  return { ok: true, value: next }
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

/** Read scheme + persisted preference from RUNTIME without throwing. */
function studioReadRuntimeState() {
  let scheme = 'light'
  let preference = 'system'
  try {
    if (RUNTIME) {
      if (typeof RUNTIME.getScheme === 'function') scheme = RUNTIME.getScheme() === 'dark' ? 'dark' : 'light'
      if (typeof RUNTIME.getPreference === 'function') {
        const value = RUNTIME.getPreference()
        if (value === 'light' || value === 'dark' || value === 'system') preference = value
      }
    }
  } catch (error) {
    /* keep defaults */
  }
  return { scheme: scheme, preference: preference }
}

/** Active scheme + appearance preference, kept in sync with the theme service. */
function useStudioRuntimeState() {
  const [runtime, setRuntime] = studioUseState(studioReadRuntimeState)
  studioUseEffect(() => {
    let unsubscribe = null
    try {
      if (RUNTIME && typeof RUNTIME.subscribeTheme === 'function') {
        unsubscribe = RUNTIME.subscribeTheme(() => setRuntime(studioReadRuntimeState()))
      }
    } catch (error) {
      unsubscribe = null
    }
    setRuntime(studioReadRuntimeState())
    return () => {
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe()
        } catch (error) {
          /* ignore */
        }
      }
    }
  }, [])
  const selectPreference = (id) => {
    if (id !== 'light' && id !== 'dark' && id !== 'system') return
    setRuntime((previous) => ({ scheme: previous.scheme, preference: id }))
    try {
      if (RUNTIME && typeof RUNTIME.setPreference === 'function') RUNTIME.setPreference(id)
    } catch (error) {
      /* the theme service may be unavailable */
    }
  }
  return { scheme: runtime.scheme, preference: runtime.preference, selectPreference: selectPreference }
}

/**
 * Local draft that follows an external settings value, commits on a debounce and
 * flushes on blur. Keeps textarea/input typing from writing storage per keystroke.
 */
function studioUseDraft(externalValue, commit, delay) {
  const [draft, setDraft] = studioUseState(externalValue)
  const [focused, setFocused] = studioUseState(false)
  const timerRef = studioUseRef(0)
  const draftRef = studioUseRef(externalValue)

  studioUseEffect(() => {
    if (!focused) {
      draftRef.current = externalValue
      setDraft(externalValue)
    }
  }, [externalValue, focused])

  studioUseEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = 0
      }
    }
  }, [])

  const update = (nextValue) => {
    draftRef.current = nextValue
    setDraft(nextValue)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = 0
      commit(draftRef.current)
    }, typeof delay === 'number' ? delay : 360)
  }

  const flush = () => {
    if (!timerRef.current) return
    clearTimeout(timerRef.current)
    timerRef.current = 0
    commit(draftRef.current)
  }

  return {
    value: draft,
    update: update,
    flush: flush,
    focusProps: {
      onFocus: () => setFocused(true),
      onBlur: () => {
        setFocused(false)
        flush()
      },
    },
  }
}

/** Inline ok/error feedback with an auto-dismiss timer that is cleaned up. */
function studioUseFeedback() {
  const [feedback, setFeedback] = studioUseState(null)
  const timerRef = studioUseRef(0)

  studioUseEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = 0
      }
    }
  }, [])

  const show = (kind, text, duration) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = 0
    }
    setFeedback({ kind: kind, text: text })
    timerRef.current = setTimeout(() => {
      timerRef.current = 0
      setFeedback(null)
    }, typeof duration === 'number' ? duration : 4200)
  }

  return { feedback: feedback, show: show }
}

/* ------------------------------------------------------------------ */
/* Presentational components                                           */
/* ------------------------------------------------------------------ */

/** Card section with a title row and an optional aside badge. */
function StudioSection(props) {
  return h(
    'section',
    { className: 'aurora-studio-section' },
    h(
      'div',
      { className: 'aurora-studio-section-head' },
      h(
        'div',
        { className: 'aurora-studio-section-titles' },
        h('h3', { className: 'aurora-studio-section-title' }, props.title),
        props.description ? h('p', { className: 'aurora-studio-section-desc' }, props.description) : null,
      ),
      props.aside || null,
    ),
    h('div', { className: 'aurora-studio-section-body' }, props.children),
  )
}

/** Title + description paired with one control on the right. */
function StudioRow(props) {
  return h(
    'div',
    { className: 'aurora-studio-row' },
    h(
      'div',
      { className: 'aurora-studio-row-text' },
      h('span', { className: 'aurora-studio-row-title' }, props.title),
      props.description ? h('span', { className: 'aurora-studio-row-desc' }, props.description) : null,
    ),
    h('div', { className: 'aurora-studio-row-control' }, props.control),
  )
}

/** Accessible switch: role="switch" + aria-checked. */
function StudioSwitch(props) {
  return h(
    'button',
    {
      type: 'button',
      role: 'switch',
      className: 'aurora-studio-switch',
      'aria-checked': props.checked ? 'true' : 'false',
      'aria-label': props.label,
      disabled: !!props.disabled,
      onClick: () => props.onChange(!props.checked),
    },
    h('span', { className: 'aurora-studio-switch-thumb', 'aria-hidden': 'true' }),
  )
}

/** Labelled range input with a live numeric read-out. */
function StudioSlider(props) {
  const text = props.format ? props.format(props.value) : String(props.value)
  return h(
    'div',
    { className: 'aurora-studio-slider' },
    h(
      'div',
      { className: 'aurora-studio-slider-head' },
      h('label', { className: 'aurora-studio-slider-label', htmlFor: props.id }, props.label),
      h('span', { className: 'aurora-studio-slider-value' }, text),
    ),
    h('input', {
      id: props.id,
      className: 'aurora-studio-range',
      type: 'range',
      min: props.min,
      max: props.max,
      step: props.step,
      value: props.value,
      disabled: !!props.disabled,
      'aria-label': props.label,
      'aria-valuetext': text,
      onChange: (event) => props.onChange(Number(event.target.value)),
    }),
    props.hint ? h('p', { className: 'aurora-studio-hint' }, props.hint) : null,
  )
}

/** Segmented control (group of aria-pressed buttons). */
function StudioSegmented(props) {
  return h(
    'div',
    { className: 'aurora-studio-segmented', role: 'group', 'aria-label': props.label },
    props.options.map((option) =>
      h(
        'button',
        {
          key: option.id,
          type: 'button',
          className: 'aurora-studio-segmented-btn',
          'aria-pressed': props.value === option.id,
          onClick: () => props.onChange(option.id),
        },
        option.label,
      ),
    ),
  )
}

/** Inline status line (never a host modal/toast). */
function StudioFeedback(props) {
  const feedback = props.feedback
  if (!feedback) return null
  const isError = feedback.kind === 'error'
  return h(
    'p',
    {
      className: 'aurora-studio-feedback ' + (isError ? 'is-error' : 'is-ok'),
      role: isError ? 'alert' : 'status',
      'aria-live': isError ? 'assertive' : 'polite',
    },
    feedback.text,
  )
}

/** Labelled text field wrapper. */
function StudioField(props) {
  return h(
    'div',
    { className: 'aurora-studio-field' },
    h('label', { className: 'aurora-studio-field-label', htmlFor: props.id }, props.label),
    props.control,
    props.hint ? h('p', { className: 'aurora-studio-hint' }, props.hint) : null,
    props.error ? h('p', { className: 'aurora-studio-error', role: 'alert' }, props.error) : null,
  )
}

/* ------------------------------------------------------------------ */
/* Tab panels                                                          */
/* ------------------------------------------------------------------ */

function StudioThemePanel(props) {
  const settings = props.settings
  const locale = props.locale
  const scheme = props.scheme
  const setPatch = props.setPatch
  const t = props.t
  const theme = studioIsRecord(settings.theme) ? settings.theme : {}
  const accent = studioNormalizeHex(theme.accent) || STUDIO_DEFAULT_ACCENT
  const presets = studioThemePresets()

  const [hexDraft, setHexDraft] = studioUseState(accent)
  const [hexFocused, setHexFocused] = studioUseState(false)
  const [hexError, setHexError] = studioUseState('')

  studioUseEffect(() => {
    if (!hexFocused) setHexDraft(accent)
  }, [accent, hexFocused])

  const applyAccent = (value) => {
    const normalized = studioNormalizeHex(value)
    if (!normalized) return false
    setHexError('')
    setPatch({ theme: { accent: normalized, preset: 'custom' } })
    return true
  }

  const handleHexChange = (event) => {
    const nextValue = event.target.value
    setHexDraft(nextValue)
    /* Commit only completed six-digit values: expanding a 3-digit form while
       typing would re-theme the whole app with a wrong intermediate color. */
    if (/^#[0-9a-fA-F]{6}$/.test(nextValue)) {
      setHexError('')
      applyAccent(nextValue)
    } else {
      setHexError('')
    }
  }

  const handleHexBlur = () => {
    setHexFocused(false)
    const normalized = studioNormalizeHex(hexDraft)
    if (normalized) {
      setHexDraft(normalized)
      applyAccent(normalized)
    } else {
      setHexError(t('invalidHex'))
      setHexDraft(accent)
    }
  }

  const presetCards = presets.map((preset) => {
    if (!preset) return null
    const selected = theme.preset === preset.id
    return h(
      'button',
      {
        key: preset.id,
        type: 'button',
        className: 'aurora-studio-theme-card' + (selected ? ' is-selected' : ''),
        'aria-pressed': selected,
        onClick: () => {
          setHexError('')
          setHexDraft(studioNormalizeHex(preset.accent) || accent)
          setPatch({
            theme: { preset: preset.id, accent: studioNormalizeHex(preset.accent) || accent },
          })
        },
      },
      h(
        'span',
        {
          className: 'aurora-studio-theme-swatch',
          style: studioThemeSwatchStyle(preset, scheme),
          'aria-hidden': 'true',
        },
        h('span', {
          className: 'aurora-studio-theme-accent',
          style: { backgroundColor: studioNormalizeHex(preset.accent) || STUDIO_DEFAULT_ACCENT },
        }),
      ),
      h('span', { className: 'aurora-studio-theme-name' }, studioPresetLabel(preset, locale)),
    )
  })

  const swatches = STUDIO_QUICK_ACCENTS.map((color) =>
    h('button', {
      key: color,
      type: 'button',
      className: 'aurora-studio-swatch',
      style: { backgroundColor: color },
      'aria-pressed': accent === color,
      'aria-label': color,
      title: color,
      onClick: () => {
        setHexDraft(color)
        applyAccent(color)
      },
    }),
  )

  const appearanceOptions = [
    { id: 'light', label: t('light') },
    { id: 'dark', label: t('dark') },
    { id: 'system', label: t('system') },
  ]

  return h(
    React.Fragment,
    null,
    h(
      StudioSection,
      {
        key: 'presets',
        title: t('themePresetsTitle'),
        description: t('themePresetsDesc'),
        aside: theme.preset === 'custom' ? h('span', { className: 'aurora-studio-badge' }, t('customBadge')) : null,
      },
      presets.length > 0
        ? h('div', { className: 'aurora-studio-theme-grid' }, presetCards)
        : h('p', { className: 'aurora-studio-empty' }, t('themePresetsDesc')),
    ),
    h(
      StudioSection,
      { key: 'accent', title: t('accentTitle'), description: t('accentDesc') },
      h(
        'div',
        { className: 'aurora-studio-accent-row' },
        h('input', {
          type: 'color',
          className: 'aurora-studio-color-input',
          value: accent,
          'aria-label': t('accentTitle'),
          onChange: (event) => {
            const normalized = studioNormalizeHex(event.target.value)
            if (!normalized) return
            setHexDraft(normalized)
            applyAccent(normalized)
          },
        }),
        h('input', {
          type: 'text',
          className: 'aurora-studio-input aurora-studio-hex-input',
          value: hexDraft,
          placeholder: '#7C6CF6',
          spellCheck: false,
          autoComplete: 'off',
          maxLength: 7,
          'aria-label': t('accentTitle'),
          'aria-invalid': hexError ? 'true' : 'false',
          onChange: handleHexChange,
          onFocus: () => setHexFocused(true),
          onBlur: handleHexBlur,
        }),
      ),
      h(
        'div',
        { className: 'aurora-studio-swatches', role: 'group', 'aria-label': t('quickColors') },
        swatches,
      ),
      hexError ? h('p', { className: 'aurora-studio-error', role: 'alert' }, hexError) : null,
    ),
    h(
      StudioSection,
      { key: 'surface', title: t('surfaceOpacity'), description: t('surfaceOpacityDesc') },
      h(StudioSlider, {
        id: 'aurora-studio-surface-opacity',
        label: t('surfaceOpacity'),
        value: typeof theme.surfaceOpacity === 'number' ? theme.surfaceOpacity : 0.9,
        min: 0.55,
        max: 1,
        step: 0.01,
        format: (value) => Math.round(value * 100) + '%',
        onChange: (value) => setPatch({ theme: { surfaceOpacity: value } }),
      }),
      h(StudioRow, {
        title: t('tint'),
        description: t('tintDesc'),
        control: h(StudioSwitch, {
          checked: theme.tint !== false,
          label: t('tint'),
          onChange: (next) => setPatch({ theme: { tint: next } }),
        }),
      }),
    ),
    h(
      StudioSection,
      { key: 'appearance', title: t('appearanceTitle'), description: t('appearanceDesc') },
      h(StudioSegmented, {
        label: t('appearanceTitle'),
        options: appearanceOptions,
        value: props.preference,
        onChange: props.selectPreference,
      }),
    ),
  )
}

function StudioBackgroundPanel(props) {
  const settings = props.settings
  const locale = props.locale
  const scheme = props.scheme
  const setPatch = props.setPatch
  const t = props.t

  const background = studioIsRecord(settings.background) ? settings.background : {}
  const presets = studioBackgroundPresets()
  const imageData = typeof background.imageData === 'string' ? background.imageData : ''
  const imageUrl = typeof background.imageUrl === 'string' ? background.imageUrl : ''
  const hasImage = !!(imageData || imageUrl)
  const selectedPreset = typeof background.preset === 'string' ? background.preset : ''

  const [busy, setBusy] = studioUseState(false)
  const [bgError, setBgError] = studioUseState('')
  const fileRef = studioUseRef(null)
  const urlDraft = studioUseDraft(imageUrl, commitUrl, 420)

  const patchBackground = (patch) => setPatch({ background: patch })

  function commitUrl(value) {
    const text = String(value === undefined || value === null ? '' : value).trim()
    if (!text) {
      setBgError('')
      if (imageUrl) patchBackground({ imageUrl: '' })
      return
    }
    if (!/^https?:\/\//i.test(text)) {
      setBgError(t('invalidUrl'))
      return
    }
    setBgError('')
    patchBackground({ imageUrl: text, imageData: '', preset: 'custom' })
  }

  async function handleFileChange(event) {
    let file = null
    try {
      const input = event.currentTarget
      file = input && input.files ? input.files[0] : null
      if (input) {
        try {
          input.value = ''
        } catch (error) {
          /* some browsers disallow clearing */
        }
      }
    } catch (error) {
      file = null
    }
    if (!file) return
    try {
      if (!/^image\//.test(String(file.type || ''))) {
        setBgError(t('uploadTypeError'))
        return
      }
      setBusy(true)
      setBgError('')
      const dataUrl = await studioImageFileToDataUrl(file)
      if (!dataUrl) throw new Error('empty image')
      if (dataUrl.length > STUDIO_MAX_IMAGE_CHARS) {
        setBgError(t('uploadTooLarge'))
        return
      }
      const previous = imageData
      const failure = studioStoreSet({ background: { imageData: dataUrl, preset: 'custom' } })
      if (failure || studioPersistFailure()) {
        studioStoreSet({ background: { imageData: previous } })
        setBgError(t('storageFull'))
      }
    } catch (error) {
      setBgError(t('uploadDecodeError'))
    } finally {
      setBusy(false)
    }
  }

  const removeImage = () => {
    const patch = { imageData: '', imageUrl: '' }
    if (selectedPreset === 'custom' && presets.length > 0 && presets[0] && presets[0].id) {
      patch.preset = presets[0].id
    }
    setBgError('')
    patchBackground(patch)
  }

  const presetCards = presets.map((preset) => {
    if (!preset) return null
    const selected = selectedPreset === preset.id && !hasImage
    return h(
      'button',
      {
        key: preset.id,
        type: 'button',
        className: 'aurora-studio-bg-card' + (selected ? ' is-selected' : ''),
        'aria-pressed': selected,
        onClick: () => patchBackground({ preset: preset.id, imageUrl: '', imageData: '' }),
      },
      h('span', {
        className: 'aurora-studio-bg-thumb',
        style: { backgroundImage: studioWallpaperBackground(preset, scheme) },
        'aria-hidden': 'true',
      }),
      h('span', { className: 'aurora-studio-bg-name' }, studioPresetLabel(preset, locale)),
    )
  })

  const imagePreview = hasImage
    ? h(
        'div',
        { className: 'aurora-studio-image-row' },
        h('span', {
          className: 'aurora-studio-image-thumb',
          style: { backgroundImage: studioCssUrl(imageData || imageUrl) },
          'aria-hidden': 'true',
        }),
        h(
          'div',
          { className: 'aurora-studio-image-meta' },
          h('span', { className: 'aurora-studio-image-name' }, imageData ? t('uploadedImage') : t('remoteImage')),
          h(
            'span',
            { className: 'aurora-studio-image-sub' },
            imageData
              ? t('imageSize').replace('{n}', String(Math.max(1, Math.round((imageData.length * 0.75) / 1024))))
              : studioShorten(imageUrl, 52),
          ),
        ),
      )
    : h('p', { className: 'aurora-studio-empty' }, t('noImage'))

  return h(
    React.Fragment,
    null,
    h(
      StudioSection,
      { key: 'presets', title: t('bgPresetsTitle'), description: t('bgPresetsDesc') },
      h(StudioRow, {
        title: t('bgEnabled'),
        description: t('bgEnabledDesc'),
        control: h(StudioSwitch, {
          checked: background.enabled !== false,
          label: t('bgEnabled'),
          onChange: (next) => patchBackground({ enabled: next }),
        }),
      }),
      presets.length > 0
        ? h('div', { className: 'aurora-studio-bg-grid' }, presetCards)
        : h('p', { className: 'aurora-studio-empty' }, t('bgPresetsDesc')),
    ),
    h(
      StudioSection,
      { key: 'custom', title: t('customImageTitle'), description: t('customImageDesc') },
      imagePreview,
      h(
        'div',
        { className: 'aurora-studio-btn-bar' },
        h('input', {
          ref: fileRef,
          type: 'file',
          accept: 'image/*',
          className: 'aurora-studio-file-input',
          tabIndex: -1,
          'aria-hidden': 'true',
          onChange: handleFileChange,
        }),
        h(
          'button',
          {
            type: 'button',
            className: 'aurora-studio-btn aurora-studio-btn-primary',
            disabled: busy,
            onClick: () => {
              const node = fileRef.current
              if (node && typeof node.click === 'function') node.click()
            },
          },
          busy ? t('processing') : hasImage ? t('replaceImage') : t('uploadImage'),
        ),
        hasImage
          ? h(
              'button',
              {
                type: 'button',
                className: 'aurora-studio-btn',
                disabled: busy,
                onClick: removeImage,
              },
              t('removeImage'),
            )
          : null,
      ),
      h(StudioField, {
        id: 'aurora-studio-image-url',
        label: t('imageUrl'),
        control: h('input', {
          id: 'aurora-studio-image-url',
          type: 'url',
          className: 'aurora-studio-input',
          value: urlDraft.value,
          placeholder: t('imageUrlPlaceholder'),
          spellCheck: false,
          autoComplete: 'off',
          inputMode: 'url',
          maxLength: 2048,
          onChange: (event) => urlDraft.update(event.target.value),
          onFocus: urlDraft.focusProps.onFocus,
          onBlur: urlDraft.focusProps.onBlur,
        }),
      }),
      bgError ? h('p', { className: 'aurora-studio-error', role: 'alert' }, bgError) : null,
    ),
    h(
      StudioSection,
      { key: 'adjust', title: t('adjustTitle'), description: t('adjustDesc') },
      h(StudioSlider, {
        id: 'aurora-studio-bg-opacity',
        label: t('opacity'),
        hint: t('opacityDesc'),
        value: typeof background.opacity === 'number' ? background.opacity : 0.85,
        min: 0.2,
        max: 1,
        step: 0.01,
        format: (value) => Math.round(value * 100) + '%',
        onChange: (value) => patchBackground({ opacity: value }),
      }),
      h(StudioSlider, {
        id: 'aurora-studio-bg-dim',
        label: t('dim'),
        hint: t('dimDesc'),
        value: typeof background.dim === 'number' ? background.dim : 0.45,
        min: 0,
        max: 0.8,
        step: 0.01,
        format: (value) => Math.round(value * 100) + '%',
        onChange: (value) => patchBackground({ dim: value }),
      }),
      h(StudioSlider, {
        id: 'aurora-studio-bg-blur',
        label: t('blur'),
        hint: t('blurDesc'),
        value: typeof background.blur === 'number' ? background.blur : 14,
        min: 0,
        max: 30,
        step: 1,
        format: (value) => Math.round(value) + 'px',
        onChange: (value) => patchBackground({ blur: value }),
      }),
      h(StudioRow, {
        title: t('animated'),
        description: t('animatedDesc'),
        control: h(StudioSwitch, {
          checked: background.animated !== false,
          label: t('animated'),
          onChange: (next) => patchBackground({ animated: next }),
        }),
      }),
    ),
  )
}

function StudioPetPanel(props) {
  const settings = props.settings
  const locale = props.locale
  const setPatch = props.setPatch
  const t = props.t

  const pet = studioIsRecord(settings.pet) ? settings.pet : {}
  const petMotionMode = pet.mode === 'follow' || pet.mode === 'still' ? pet.mode : 'roam'
  const characters = studioPetCharacters()
  const accent = studioNormalizeHex(studioIsRecord(settings.theme) ? settings.theme.accent : '') || STUDIO_DEFAULT_ACCENT
  const lines = Array.isArray(pet.lines) ? pet.lines : []
  const animationsOn = !(studioIsRecord(settings.advanced) && settings.advanced.animations === false)
  const feedback = studioUseFeedback()

  const nameDraft = studioUseDraft(typeof pet.name === 'string' ? pet.name : '', commitName, 380)
  const linesDraft = studioUseDraft(lines.join('\n'), commitLines, 500)
  const draftLineCount = studioParseLines(linesDraft.value).length

  function commitName(value) {
    setPatch({ pet: { name: String(value === undefined || value === null ? '' : value).trim().slice(0, 32) } })
  }

  function commitLines(value) {
    setPatch({ pet: { lines: studioParseLines(value) } })
  }

  const characterCards = characters.map((character) => {
    if (!character || !character.id) return null
    const selected = pet.character === character.id
    return h(
      'button',
      {
        key: character.id,
        type: 'button',
        className: 'aurora-studio-pet-card' + (selected ? ' is-selected' : ''),
        'aria-pressed': selected,
        onClick: () => setPatch({ pet: { character: character.id } }),
      },
      h(
        'span',
        { className: 'aurora-studio-pet-preview', 'aria-hidden': 'true' },
        typeof PetArt === 'function'
          ? h(PetArt, {
              character: character.id,
              mood: 'idle',
              size: 56,
              accent: accent,
              animated: animationsOn,
            })
          : null,
      ),
      h('span', { className: 'aurora-studio-pet-name' }, studioPetLabel(character, locale)),
    )
  })

  return h(
    React.Fragment,
    null,
    h(
      StudioSection,
      { key: 'character', title: t('petCharacter'), description: t('petCharacterDesc') },
      h(StudioRow, {
        title: t('petEnabled'),
        description: t('petEnabledDesc'),
        control: h(StudioSwitch, {
          checked: pet.enabled !== false,
          label: t('petEnabled'),
          onChange: (next) => setPatch({ pet: { enabled: next } }),
        }),
      }),
      characters.length > 0
        ? h('div', { className: 'aurora-studio-pet-grid' }, characterCards)
        : h('p', { className: 'aurora-studio-empty' }, t('petCharacterDesc')),
    ),
    h(
      StudioSection,
      { key: 'tuning', title: t('petSize'), description: t('petSizeDesc') },
      h(StudioField, {
        id: 'aurora-studio-pet-name',
        label: t('petName'),
        hint: t('petNameDesc'),
        control: h('input', {
          id: 'aurora-studio-pet-name',
          type: 'text',
          className: 'aurora-studio-input',
          value: nameDraft.value,
          placeholder: t('petNamePlaceholder'),
          maxLength: 32,
          autoComplete: 'off',
          spellCheck: false,
          onChange: (event) => nameDraft.update(event.target.value),
          onFocus: nameDraft.focusProps.onFocus,
          onBlur: nameDraft.focusProps.onBlur,
        }),
      }),
      h(StudioSlider, {
        id: 'aurora-studio-pet-size',
        label: t('petSize'),
        hint: t('petSizeDesc'),
        value: typeof pet.size === 'number' ? pet.size : 96,
        min: 40,
        max: 360,
        step: 2,
        format: (value) => Math.round(value) + 'px',
        onChange: (value) => setPatch({ pet: { size: Math.round(value) } }),
      }),
      h(StudioSlider, {
        id: 'aurora-studio-pet-opacity',
        label: t('petOpacity'),
        value: typeof pet.opacity === 'number' ? pet.opacity : 1,
        min: 0.3,
        max: 1,
        step: 0.01,
        format: (value) => Math.round(value * 100) + '%',
        onChange: (value) => setPatch({ pet: { opacity: value } }),
      }),
    ),
    h(
      StudioSection,
      { key: 'motion', title: t('petMotion'), description: t('petMotionDesc') },
      h(StudioSegmented, {
        label: t('petMotion'),
        value: petMotionMode,
        options: [
          { id: 'still', label: t('motionStill') },
          { id: 'roam', label: t('motionRoam') },
          { id: 'follow', label: t('motionFollow') },
        ],
        onChange: (next) => setPatch({ pet: { mode: next } }),
      }),
      petMotionMode === 'roam' || petMotionMode === 'follow'
        ? h(StudioSlider, {
            id: 'aurora-studio-pet-motion-speed',
            label: t('roamSpeed'),
            hint: t('roamSpeedDesc'),
            value: typeof pet.roamSpeed === 'number' ? pet.roamSpeed : 70,
            min: 20,
            max: 180,
            step: 2,
            format: (value) => Math.round(value) + ' px/s',
            onChange: (value) => setPatch({ pet: { roamSpeed: Math.round(value) } }),
          })
        : null,
      h('p', { className: 'aurora-studio-hint' }, t('motionHint')),
    ),
    h(
      StudioSection,
      { key: 'account', title: t('petAccount'), description: t('petAccountDesc') },
      h(StudioRow, {
        title: t('petAccount'),
        description: t('petAccountDesc'),
        control: h(StudioSwitch, {
          checked: pet.account !== false,
          label: t('petAccount'),
          onChange: (next) => setPatch({ pet: { account: next } }),
        }),
      }),
    ),
    h(
      StudioSection,
      { key: 'chatter', title: t('idleChatter'), description: t('idleChatterDesc') },
      h(StudioRow, {
        title: t('idleChatter'),
        description: t('idleChatterDesc'),
        control: h(StudioSwitch, {
          checked: pet.idleChatter !== false,
          label: t('idleChatter'),
          onChange: (next) => setPatch({ pet: { idleChatter: next } }),
        }),
      }),
      h(StudioSlider, {
        id: 'aurora-studio-chatter-interval',
        label: t('chatterInterval'),
        hint: t('chatterIntervalDesc'),
        value: typeof pet.chatterInterval === 'number' ? pet.chatterInterval : 60,
        min: 20,
        max: 300,
        step: 5,
        format: (value) => Math.round(value) + 's',
        disabled: pet.idleChatter === false,
        onChange: (value) => setPatch({ pet: { chatterInterval: Math.round(value) } }),
      }),
      h(StudioField, {
        id: 'aurora-studio-pet-lines',
        label: t('customLines'),
        hint: t('customLinesDesc'),
        control: h('textarea', {
          id: 'aurora-studio-pet-lines',
          className: 'aurora-studio-textarea',
          rows: 4,
          value: linesDraft.value,
          placeholder: t('customLinesPlaceholder'),
          spellCheck: false,
          onChange: (event) => linesDraft.update(event.target.value),
          onFocus: linesDraft.focusProps.onFocus,
          onBlur: linesDraft.focusProps.onBlur,
        }),
      }),
      h('p', { className: 'aurora-studio-meta' }, h('span', null, t('linesCount').replace('{n}', String(draftLineCount)))),
    ),
    h(
      StudioSection,
      { key: 'position', title: t('positionTitle'), description: t('resetPositionDesc') },
      h(
        'div',
        { className: 'aurora-studio-btn-bar' },
        h(
          'button',
          {
            type: 'button',
            className: 'aurora-studio-btn',
            onClick: () => {
              const moveToken = typeof pet.moveToken === 'number' ? pet.moveToken + 1 : 1
              setPatch({ pet: { x: null, y: null, moveToken } })
              feedback.show('ok', t('resetPosition') + ' ✓')
            },
          },
          t('resetPosition'),
        ),
      ),
      h(
        'p',
        { className: 'aurora-studio-hint' },
        t('hotkeyHint')
          .replace('Ctrl + Shift + A', '\u0000')
          .split('\u0000')
          .reduce((parts, part, index, all) => {
            if (index === 0) return [part]
            return parts.concat([
              h('kbd', { key: 'kbd-' + index, className: 'aurora-studio-kbd' }, 'Ctrl+Shift+A'),
              part,
            ])
          }, []),
      ),
      h(StudioFeedback, { feedback: feedback.feedback }),
    ),
  )
}

function StudioAdvancedPanel(props) {
  const settings = props.settings
  const setPatch = props.setPatch
  const t = props.t

  const advanced = studioIsRecord(settings.advanced) ? settings.advanced : {}
  const exportFeedback = studioUseFeedback()
  const importFeedback = studioUseFeedback()
  const resetFeedback = studioUseFeedback()
  const exportRef = studioUseRef(null)
  const downloadTimerRef = studioUseRef(0)
  const downloadUrlRef = studioUseRef('')
  const resetTimerRef = studioUseRef(0)

  const cssDraft = studioUseDraft(typeof advanced.customCss === 'string' ? advanced.customCss : '', commitCss, 480)
  const [importText, setImportText] = studioUseState('')
  const [resetArmed, setResetArmed] = studioUseState(false)

  /* Never serialise the uploaded data URL into the export panel: a multi-MB
     string would stall the page and make the textarea unusable. The omitted
     size is recorded instead and the import path tolerates the empty field. */
  const exportText = React.useMemo(() => {
    const background = studioIsRecord(settings.background) ? settings.background : {}
    const omitted = typeof background.imageData === 'string' ? background.imageData.length : 0
    const snapshotBackground = Object.assign({}, background, { imageData: '' })
    if (omitted > 0) snapshotBackground.imageDataOmitted = omitted
    return JSON.stringify({
      version: settings.version,
      theme: settings.theme,
      background: snapshotBackground,
      pet: settings.pet,
      advanced: settings.advanced,
    }, null, 2)
  }, [settings])

  studioUseEffect(() => {
    return () => {
      if (downloadTimerRef.current) {
        clearTimeout(downloadTimerRef.current)
        downloadTimerRef.current = 0
      }
      if (downloadUrlRef.current) {
        try {
          URL.revokeObjectURL(downloadUrlRef.current)
        } catch (error) {
          /* ignore */
        }
        downloadUrlRef.current = ''
      }
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
        resetTimerRef.current = 0
      }
    }
  }, [])

  function commitCss(value) {
    setPatch({ advanced: { customCss: String(value === undefined || value === null ? '' : value) } })
  }

  const copyExport = async () => {
    let copied = false
    try {
      copied = await studioCopyText(exportText)
    } catch (error) {
      copied = false
    }
    if (!copied) {
      const node = exportRef.current
      if (node && typeof node.focus === 'function') {
        try {
          node.focus()
          if (typeof node.select === 'function') node.select()
          copied = studioExecCopy()
        } catch (error) {
          copied = false
        }
      }
    }
    if (copied) exportFeedback.show('ok', t('copied'))
    else exportFeedback.show('error', t('copyFailed'), 6000)
  }

  const downloadExport = () => {
    let url = ''
    try {
      if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function' || typeof document === 'undefined') {
        exportFeedback.show('error', t('downloadFailed'))
        return
      }
      const blob = new Blob([exportText], { type: 'application/json' })
      url = URL.createObjectURL(blob)
      downloadUrlRef.current = url
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'aurora-studio-settings.json'
      anchor.rel = 'noopener'
      anchor.style.display = 'none'
      anchor.click()
      downloadTimerRef.current = setTimeout(() => {
        downloadTimerRef.current = 0
        if (downloadUrlRef.current) {
          try {
            URL.revokeObjectURL(downloadUrlRef.current)
          } catch (error) {
            /* ignore */
          }
          downloadUrlRef.current = ''
        }
      }, 1200)
      exportFeedback.show('ok', t('download'))
    } catch (error) {
      if (url) {
        try {
          URL.revokeObjectURL(url)
        } catch (ignore) {
          /* ignore */
        }
        downloadUrlRef.current = ''
      }
      exportFeedback.show('error', t('downloadFailed'))
    }
  }

  const applyImport = () => {
    const text = importText.trim()
    if (!text) {
      importFeedback.show('error', t('importEmpty'))
      return
    }
    let parsed = null
    try {
      parsed = JSON.parse(text)
    } catch (error) {
      importFeedback.show('error', t('importInvalidJson') + (error && error.message ? String(error.message) : ''), 7000)
      return
    }
    const result = studioSanitizeImport(parsed)
    if (!result.ok) {
      importFeedback.show('error', t(result.key) + (result.detail ? ' (' + result.detail + ')' : ''), 7000)
      return
    }
    const failure = studioStoreReplace(result.value)
    if (failure || studioPersistFailure()) {
      importFeedback.show('error', t('saveFailed'), 7000)
      return
    }
    setImportText('')
    importFeedback.show('ok', t('importSuccess'))
  }

  const handleReset = () => {
    if (!resetArmed) {
      setResetArmed(true)
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(() => {
        resetTimerRef.current = 0
        setResetArmed(false)
      }, 5000)
      return
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = 0
    }
    setResetArmed(false)
    try {
      store.reset()
    } catch (error) {
      resetFeedback.show('error', t('resetFailed'))
      return
    }
    resetFeedback.show('ok', t('resetDone'))
  }

  const cancelReset = () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = 0
    }
    setResetArmed(false)
  }

  return h(
    React.Fragment,
    null,
    h(
      StudioSection,
      { key: 'animations', title: t('animationsTitle'), description: t('animationsDesc') },
      h(StudioRow, {
        title: t('animations'),
        description: t('animationsDesc'),
        control: h(StudioSwitch, {
          checked: advanced.animations !== false,
          label: t('animations'),
          onChange: (next) => setPatch({ advanced: { animations: next } }),
        }),
      }),
    ),
    h(
      StudioSection,
      { key: 'css', title: t('customCssTitle'), description: t('customCssDesc') },
      h('textarea', {
        id: 'aurora-studio-custom-css',
        className: 'aurora-studio-textarea aurora-studio-code',
        rows: 6,
        value: cssDraft.value,
        placeholder: t('customCssPlaceholder'),
        spellCheck: false,
        maxLength: 60000,
        'aria-label': t('customCssTitle'),
        onChange: (event) => cssDraft.update(event.target.value),
        onFocus: cssDraft.focusProps.onFocus,
        onBlur: cssDraft.focusProps.onBlur,
      }),
      h(
        'p',
        { className: 'aurora-studio-meta' },
        h('span', null, t('chars').replace('{n}', String(cssDraft.value.length))),
      ),
    ),
    h(
      StudioSection,
      { key: 'export', title: t('exportTitle'), description: t('exportDesc') },
      h('textarea', {
        ref: exportRef,
        id: 'aurora-studio-export-json',
        className: 'aurora-studio-textarea aurora-studio-code',
        rows: 6,
        value: exportText,
        readOnly: true,
        spellCheck: false,
        'aria-label': t('exportTitle'),
        onFocus: (event) => {
          try {
            event.target.select()
          } catch (error) {
            /* ignore */
          }
        },
      }),
      h(
        'div',
        { className: 'aurora-studio-btn-bar' },
        h('button', { type: 'button', className: 'aurora-studio-btn', onClick: copyExport }, t('copy')),
        h('button', { type: 'button', className: 'aurora-studio-btn', onClick: downloadExport }, t('download')),
      ),
      h(StudioFeedback, { feedback: exportFeedback.feedback }),
    ),
    h(
      StudioSection,
      { key: 'import', title: t('importTitle'), description: t('importDesc') },
      h('textarea', {
        id: 'aurora-studio-import-json',
        className: 'aurora-studio-textarea aurora-studio-code',
        rows: 5,
        value: importText,
        placeholder: t('importPlaceholder'),
        spellCheck: false,
        'aria-label': t('importTitle'),
        onChange: (event) => setImportText(event.target.value),
      }),
      h(
        'div',
        { className: 'aurora-studio-btn-bar' },
        h('button', { type: 'button', className: 'aurora-studio-btn aurora-studio-btn-primary', onClick: applyImport }, t('importApply')),
      ),
      h(StudioFeedback, { feedback: importFeedback.feedback }),
    ),
    h(
      StudioSection,
      { key: 'reset', title: t('resetTitle'), description: t('resetDesc') },
      h(
        'div',
        { className: 'aurora-studio-btn-bar' },
        h(
          'button',
          {
            type: 'button',
            className: 'aurora-studio-btn aurora-studio-btn-danger',
            onClick: handleReset,
            'aria-label': resetArmed ? t('resetConfirm') : t('resetButton'),
          },
          resetArmed ? t('resetConfirm') : t('resetButton'),
        ),
        resetArmed
          ? h('button', { type: 'button', className: 'aurora-studio-btn', onClick: cancelReset }, t('resetCancel'))
          : null,
      ),
      h('p', { className: 'aurora-studio-hint' }, resetArmed ? t('resetConfirm') : t('resetDesc')),
      h(StudioFeedback, { feedback: resetFeedback.feedback }),
    ),
  )
}

/* ------------------------------------------------------------------ */
/* Required exports of this fragment                                   */
/* ------------------------------------------------------------------ */

/** Localized settings-section nav label (zh: 定制工作室, en: Studio). */
function studioNavLabel() {
  return studioText(studioLocale(), 'navLabel')
}

/** Full Aurora Studio settings page, rendered into the host `settings.section` slot. */
function StudioSettingsView(props) {
  const locale = studioUseLocale()
  const runtime = useStudioRuntimeState()
  const settings = useSettings()
  const [tab, setTab] = studioUseState('theme')
  const tabRefs = studioUseRef([])
  const t = (key) => studioText(locale, key)

  const currentTab = STUDIO_TABS.some((item) => item.id === tab) ? tab : 'theme'
  const currentIndex = STUDIO_TABS.findIndex((item) => item.id === currentTab)
  const persistFailure = studioPersistFailure()

  const onTabKeyDown = (event) => {
    const key = event.key
    let nextIndex = -1
    if (key === 'ArrowRight' || key === 'ArrowDown') nextIndex = (currentIndex + 1) % STUDIO_TABS.length
    else if (key === 'ArrowLeft' || key === 'ArrowUp') nextIndex = (currentIndex - 1 + STUDIO_TABS.length) % STUDIO_TABS.length
    else if (key === 'Home') nextIndex = 0
    else if (key === 'End') nextIndex = STUDIO_TABS.length - 1
    if (nextIndex < 0) return
    event.preventDefault()
    setTab(STUDIO_TABS[nextIndex].id)
    const node = tabRefs.current[nextIndex]
    if (node && typeof node.focus === 'function') node.focus()
  }

  const panelProps = {
    key: 'studio-panel-' + currentTab,
    settings: settings,
    locale: locale,
    scheme: runtime.scheme,
    preference: runtime.preference,
    selectPreference: runtime.selectPreference,
    setPatch: studioStoreSet,
    t: t,
  }

  let panel = null
  if (currentTab === 'theme') panel = h(StudioThemePanel, panelProps)
  else if (currentTab === 'background') panel = h(StudioBackgroundPanel, panelProps)
  else if (currentTab === 'pet') panel = h(StudioPetPanel, panelProps)
  else panel = h(StudioAdvancedPanel, panelProps)

  const tabs = STUDIO_TABS.map((item, index) => {
    const selected = item.id === currentTab
    return h(
      'button',
      {
        key: item.id,
        ref: (node) => {
          tabRefs.current[index] = node
        },
        type: 'button',
        role: 'tab',
        id: 'aurora-studio-tab-' + item.id,
        className: 'aurora-studio-tab',
        'aria-selected': selected,
        /* Only the mounted panel has this id; a dangling reference on the
           inactive tabs confuses screen readers. */
        'aria-controls': selected ? 'aurora-studio-panel-' + item.id : undefined,
        tabIndex: selected ? 0 : -1,
        onKeyDown: onTabKeyDown,
        onClick: () => setTab(item.id),
      },
      h('span', { className: 'aurora-studio-tab-label' }, t(item.label)),
    )
  })

  return h(
    'div',
    {
      className: 'aurora-studio-root',
      'data-animations': settings.advanced && settings.advanced.animations === false ? 'off' : 'on',
    },
    h(
      'header',
      { className: 'aurora-studio-head' },
      h(
        'div',
        { className: 'aurora-studio-head-text' },
        h('h2', { className: 'aurora-studio-title' }, t('pageTitle')),
        h('p', { className: 'aurora-studio-subtitle' }, t('pageSubtitle')),
      ),
      h(
        'span',
        { className: 'aurora-studio-live' },
        h('span', { className: 'aurora-studio-live-dot', 'aria-hidden': 'true' }),
        t('live'),
      ),
    ),
    h(
      'div',
      { className: 'aurora-studio-tabbar-wrap' },
      h('div', { className: 'aurora-studio-tabbar', role: 'tablist', 'aria-label': t('tabsLabel') }, tabs),
    ),
    persistFailure ? h('p', { className: 'aurora-studio-banner', role: 'alert' }, t('saveFailed')) : null,
    h(
      'div',
      {
        key: 'panel-wrapper-' + currentTab,
        className: 'aurora-studio-panel',
        role: 'tabpanel',
        id: 'aurora-studio-panel-' + currentTab,
        'aria-labelledby': 'aurora-studio-tab-' + currentTab,
        tabIndex: 0,
      },
      panel,
    ),
  )
}
