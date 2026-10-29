/* -------------------------------------------------------------------------
 * Aurora Studio · settings store and runtime facade
 * localStorage-backed settings with sanitising, a tiny external store, React
 * hooks, and the optional-service facade the components use for locale and
 * theme state. `RUNTIME` stays null until `apply()` installs it.
 * ---------------------------------------------------------------------- */

const DEFAULT_SETTINGS = {
  version: 1,
  theme: {
    preset: 'aurora',
    accent: THEME_PRESETS[0].accent,
    surfaceOpacity: 0.72,
    tint: true,
  },
  background: {
    enabled: true,
    preset: 'aurora',
    imageUrl: '',
    imageData: '',
    opacity: 0.85,
    dim: 0.45,
    blur: 14,
    animated: true,
  },
  pet: {
    enabled: true,
    character: 'deepseek',
    size: 96,
    opacity: 1,
    x: null,
    y: null,
    mode: 'roam',
    roamSpeed: 70,
    moveToken: 0,
    idleChatter: true,
    chatterInterval: 60,
    lines: [],
    name: '大肥鱼',
    account: true,
  },
  advanced: {
    customCss: '',
    animations: true,
  },
}

const MAX_IMAGE_DATA_LENGTH = 6000000

function sanitizePetLines(value) {
  if (!Array.isArray(value)) return []
  const lines = []
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    const line = entry.trim().slice(0, 160)
    if (line) lines.push(line)
    if (lines.length >= 40) break
  }
  return lines
}

function sanitizePosition(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null
}

/** Build a well-formed settings object from arbitrary stored/imported data. */
function sanitizeSettings(raw) {
  const source = isPlainObject(raw) ? raw : {}
  const themeSource = isPlainObject(source.theme) ? source.theme : {}
  const backgroundSource = isPlainObject(source.background) ? source.background : {}
  const petSource = isPlainObject(source.pet) ? source.pet : {}
  const advancedSource = isPlainObject(source.advanced) ? source.advanced : {}

  let preset = 'custom'
  if (themeSource.preset === 'custom' || THEME_PRESET_IDS.indexOf(themeSource.preset) >= 0) {
    preset = themeSource.preset
  }

  const fallbackAccent = themePresetById(preset).accent
  const backgroundPreset = backgroundSource.preset === 'custom' || BACKGROUND_PRESET_IDS.indexOf(backgroundSource.preset) >= 0
    ? backgroundSource.preset
    : DEFAULT_SETTINGS.background.preset

  const imageData = typeof backgroundSource.imageData === 'string'
    && backgroundSource.imageData.indexOf('data:image/') === 0
    && backgroundSource.imageData.length <= MAX_IMAGE_DATA_LENGTH
    ? backgroundSource.imageData
    : ''

  const character = typeof petSource.character === 'string' && /^[a-z0-9-]{1,32}$/.test(petSource.character)
    ? petSource.character
    : DEFAULT_SETTINGS.pet.character

  const name = typeof petSource.name === 'string' && petSource.name.trim()
    ? petSource.name.trim().slice(0, 32)
    : DEFAULT_SETTINGS.pet.name

  return {
    version: 1,
    theme: {
      preset,
      accent: normalizeHex(themeSource.accent, fallbackAccent),
      surfaceOpacity: clampNumber(themeSource.surfaceOpacity, 0.55, 1, DEFAULT_SETTINGS.theme.surfaceOpacity),
      tint: themeSource.tint !== false,
    },
    background: {
      enabled: backgroundSource.enabled !== false,
      preset: backgroundPreset,
      imageUrl: typeof backgroundSource.imageUrl === 'string' ? backgroundSource.imageUrl.trim().slice(0, 2048) : '',
      imageData,
      opacity: clampNumber(backgroundSource.opacity, 0.2, 1, DEFAULT_SETTINGS.background.opacity),
      dim: clampNumber(backgroundSource.dim, 0, 0.8, DEFAULT_SETTINGS.background.dim),
      blur: clampNumber(backgroundSource.blur, 0, 30, DEFAULT_SETTINGS.background.blur),
      animated: backgroundSource.animated !== false,
    },
    pet: {
      enabled: petSource.enabled !== false,
      character,
      size: Math.round(clampNumber(petSource.size, 40, 360, DEFAULT_SETTINGS.pet.size)),
      opacity: clampNumber(petSource.opacity, 0.3, 1, DEFAULT_SETTINGS.pet.opacity),
      x: sanitizePosition(petSource.x),
      y: sanitizePosition(petSource.y),
      mode: petSource.mode === 'follow' || petSource.mode === 'roam' || petSource.mode === 'still' ? petSource.mode : DEFAULT_SETTINGS.pet.mode,
      roamSpeed: Math.round(clampNumber(petSource.roamSpeed, 20, 180, DEFAULT_SETTINGS.pet.roamSpeed)),
      moveToken: Math.round(clampNumber(petSource.moveToken, 0, 1000000, 0)),
      idleChatter: petSource.idleChatter !== false,
      chatterInterval: Math.round(clampNumber(petSource.chatterInterval, 20, 300, DEFAULT_SETTINGS.pet.chatterInterval)),
      lines: sanitizePetLines(petSource.lines),
      name,
      account: petSource.account !== false,
    },
    advanced: {
      customCss: typeof advancedSource.customCss === 'string' ? advancedSource.customCss.slice(0, 60000) : '',
      animations: advancedSource.animations !== false,
    },
  }
}

function loadStoredSettings() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return sanitizeSettings(DEFAULT_SETTINGS)
    return sanitizeSettings(JSON.parse(stored))
  } catch (error) {
    try { console.warn('[' + PLUGIN_ID + '] could not read stored settings', error) } catch (ignored) {}
    return sanitizeSettings(DEFAULT_SETTINGS)
  }
}

let persistError = null

/** True when a settings patch carries a big string (an uploaded wallpaper). */
function containsLargeString(value, depth) {
  const level = typeof depth === 'number' ? depth : 0
  if (level > 4) return false
  if (typeof value === 'string') return value.length > 100000
  if (Array.isArray(value)) return value.some((item) => containsLargeString(item, level + 1))
  if (isPlainObject(value)) return Object.keys(value).some((key) => containsLargeString(value[key], level + 1))
  return false
}

const store = (() => {
  let state = loadStoredSettings()
  const listeners = new Set()
  let persistTimer = null

  function notify() {
    for (const listener of Array.from(listeners)) {
      try { listener() } catch (error) {
        try { console.error('[' + PLUGIN_ID + '] settings listener failed', error) } catch (ignored) {}
      }
    }
  }

  function persistNow() {
    if (persistTimer !== null) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      persistError = null
    } catch (error) {
      const alreadyFailed = persistError !== null
      persistError = error
      try { console.warn('[' + PLUGIN_ID + '] could not persist settings', error) } catch (ignored) {}
      /* Surface a new persistence failure once so the settings page can show
         its inline banner even though the patch was applied successfully. */
      if (!alreadyFailed) notify()
    }
  }

  /* Sliders and pet drags fire many small patches: coalesce them so a large
     wallpaper data URL is not re-serialised on every pixel of movement. A
     patch that itself carries a big string (uploaded image) persists at once,
     which keeps the quota error visible to the upload handler. */
  function persistPatch(patch) {
    if (containsLargeString(patch)) {
      persistNow()
      return
    }
    if (persistTimer !== null) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      persistTimer = null
      persistNow()
    }, 250)
  }

  return {
    get() { return state },
    set(patch) {
      state = sanitizeSettings(deepMerge(state, isPlainObject(patch) ? patch : {}))
      notify()
      persistPatch(patch)
      return state
    },
    replace(next) {
      state = sanitizeSettings(deepMerge(DEFAULT_SETTINGS, isPlainObject(next) ? next : {}))
      notify()
      persistNow()
      return state
    },
    reset() {
      state = sanitizeSettings(DEFAULT_SETTINGS)
      notify()
      persistNow()
      return state
    },
    subscribe(listener) {
      if (typeof listener !== 'function') return function () {}
      listeners.add(listener)
      return function () { listeners.delete(listener) }
    },
    flush() { persistNow() },
    getPersistError() { return persistError },
  }
})()

/** Subscribe the current settings object into a React component. */
function useSettings() {
  if (typeof React.useSyncExternalStore === 'function') {
    return React.useSyncExternalStore(store.subscribe, store.get, store.get)
  }
  const [snapshot, setSnapshot] = React.useState(store.get)
  React.useEffect(() => store.subscribe(() => setSnapshot(store.get())), [])
  return snapshot
}

/** Subscribe the normalized UI locale ('zh' | 'en') into a React component. */
function useAuroraLocale() {
  const [locale, setLocale] = React.useState(() => (RUNTIME ? RUNTIME.getLocale() : 'zh'))
  React.useEffect(() => {
    if (!RUNTIME) return function () {}
    const sync = () => setLocale(RUNTIME.getLocale())
    sync()
    return RUNTIME.subscribeLocale(sync)
  }, [])
  return locale
}

/* ----------------------------------------------------------- runtime facade */

let RUNTIME = null

function getOptionalService(ctx, name) {
  try {
    if (!ctx || typeof ctx.get !== 'function') return null
    return ctx.get(name) || null
  } catch (error) {
    return null
  }
}

function readResolvedLocale(localeService) {
  try {
    if (localeService && typeof localeService.getLocale === 'function') {
      const snapshot = localeService.getLocale()
      const active = snapshot && snapshot.active
      if (typeof active === 'string' && active) {
        return active.toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en'
      }
    }
  } catch (error) {
    /* fall through to the browser hint */
  }
  const hint = (typeof navigator !== 'undefined' && navigator.language) || 'en'
  return String(hint).toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en'
}

function readResolvedScheme(themeService) {
  try {
    if (themeService && typeof themeService.getTheme === 'function') {
      const snapshot = themeService.getTheme()
      const active = snapshot && snapshot.active
      if (active && active.colorScheme === 'light') return 'light'
      if (active) return 'dark'
    }
  } catch (error) {
    /* fall through to the media query */
  }
  try {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches) return 'light'
  } catch (error) {
    /* ignore */
  }
  return 'dark'
}

/**
 * Build the facade used by the pet and the settings page plus the refresh
 * hooks the plugin wires to `theme/change` and `locale/change`.
 */
function createAuroraRuntime(ctx) {
  /* `inject: ['theme', 'locale']` makes ctx.theme / ctx.locale available; the
     optional get() fallback keeps the plugin usable if a service is replaced. */
  const themeService = (ctx && ctx.theme) || getOptionalService(ctx, 'theme')
  const localeService = (ctx && ctx.locale) || getOptionalService(ctx, 'locale')
  const themeListeners = new Set()
  const localeListeners = new Set()
  let locale = readResolvedLocale(localeService)
  let scheme = readResolvedScheme(themeService)

  function emit(listeners) {
    for (const listener of Array.from(listeners)) {
      try { listener() } catch (error) {
        try { console.error('[' + PLUGIN_ID + '] runtime listener failed', error) } catch (ignored) {}
      }
    }
  }

  const runtime = {
    getLocale() { return locale },
    subscribeLocale(listener) {
      if (typeof listener !== 'function') return function () {}
      localeListeners.add(listener)
      return function () { localeListeners.delete(listener) }
    },
    getScheme() { return scheme },
    subscribeTheme(listener) {
      if (typeof listener !== 'function') return function () {}
      themeListeners.add(listener)
      return function () { themeListeners.delete(listener) }
    },
    getPreference() {
      try {
        const snapshot = themeService && typeof themeService.getTheme === 'function' ? themeService.getTheme() : null
        const preference = snapshot && snapshot.preference
        if (preference === 'light' || preference === 'dark' || preference === 'system') return preference
      } catch (error) {
        /* ignore */
      }
      return 'system'
    },
    setPreference(id) {
      if (id !== 'light' && id !== 'dark' && id !== 'system') return
      try {
        if (themeService && typeof themeService.setTheme === 'function') themeService.setTheme(id)
      } catch (error) {
        try { console.warn('[' + PLUGIN_ID + '] could not switch theme preference', error) } catch (ignored) {}
      }
    },
    getThemeService() { return themeService },
    getRemote() {
      try {
        if (ctx && ctx.remote) return ctx.remote
        if (ctx && typeof ctx.get === 'function') return ctx.get('remote') || null
      } catch (error) {
        /* ignore */
      }
      return null
    },
    getSessions() {
      try {
        if (ctx && ctx.sessions) return ctx.sessions
        if (ctx && typeof ctx.get === 'function') return ctx.get('sessions') || null
      } catch (error) {
        /* ignore */
      }
      return null
    },
  }

  return {
    runtime,
    refreshTheme() {
      const next = readResolvedScheme(themeService)
      const changed = next !== scheme
      scheme = next
      emit(themeListeners)
      return changed
    },
    refreshLocale() {
      const next = readResolvedLocale(localeService)
      const changed = next !== locale
      locale = next
      if (changed) emit(localeListeners)
      return changed
    },
  }
}
