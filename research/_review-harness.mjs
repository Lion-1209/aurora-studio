/**
 * Independent review harness (api-scout, task-4). READ-ONLY w.r.t. the plugin:
 * it reads client.js, swaps ONLY the in-memory export line to expose internals,
 * and runs the real factory + apply() against a tiny fake DOM/ctx.
 *
 * Run: node research/_review-harness.mjs
 */
import { readFileSync } from 'node:fs'

const artifact = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const EXPORT_LINE = "return { inject: ['slots', 'theme', 'locale', 'remote', 'remote.account', 'sessions'], apply };"
if (!artifact.includes(EXPORT_LINE)) throw new Error('export line not found — client.js changed?')

const TESTED = [
  'DEFAULT_SETTINGS', 'THEME_PRESETS', 'BACKGROUND_PRESETS', 'PET_CHARACTERS',
  'computeThemeOverrides', 'computeWallpaperCss', 'sanitizeSettings',
  'studioSanitizeImport', 'studioNormalizeHex', 'studioParseLines', 'store', 'studioLocale', 'studioText', 'studioNavLabel',
].join(', ')

const code = artifact.replace(
  EXPORT_LINE,
  "return { inject: ['slots', 'theme', 'locale'], apply, __test: { " + TESTED + ", getRUNTIME: () => RUNTIME } };",
)

/* ------------------------------------------------------------------ fake DOM */
function createFakeDocument() {
  const head = {
    children: [],
    appendChild(el) {
      el.parentNode = head
      head.children.push(el)
      return el
    },
    removeChild(el) {
      const index = head.children.indexOf(el)
      if (index >= 0) head.children.splice(index, 1)
      el.parentNode = null
      return el
    },
  }
  const document = {
    head,
    documentElement: {
      style: { setProperty() {}, removeProperty() {} },
      dataset: {},
      setAttribute() {},
      removeAttribute() {},
      hasAttribute: () => false,
    },
    visibilityState: 'visible',
    addEventListener() {},
    removeEventListener() {},
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement(tag) {
      return {
        tagName: String(tag).toUpperCase(),
        dataset: {},
        textContent: '',
        parentNode: null,
        style: { setProperty() {}, removeProperty() {} },
        setAttribute() {},
        remove() {
          if (this.parentNode) this.parentNode.removeChild(this)
        },
      }
    },
    execCommand: () => false,
  }
  return document
}

function createFakeStorage({ failOnSetAt = Infinity } = {}) {
  let value = null
  let sets = 0
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      sets += 1
      if (sets >= failOnSetAt) throw new Error('QuotaExceededError')
      value = next
    },
    removeItem: () => { value = null },
    get setCount() { return sets },
  }
}

/* ------------------------------------------------------------------ fake ctx */
function createFakeRuntime() {
  const themeSnapshot = {
    preference: 'system',
    fontSizes: { text: 14, code: 11, terminal: 13 },
    fontFamilies: { text: '', code: '', terminal: '' },
    active: { id: 'dark', colorScheme: 'dark', tokens: {} },
    themes: [],
    revision: 1,
  }
  const overrides = []
  const effects = []
  const listeners = new Map()
  const registrations = []
  const emitted = []

  const emit = (event, payload) => {
    emitted.push(event)
    for (const fn of [...(listeners.get(event) || [])]) fn(payload)
  }

  const ctx = {
    theme: {
      getTheme: () => themeSnapshot,
      setTheme(id) { themeSnapshot.preference = id },
      overrideTokens(source, tokens) {
        const layer = { source, tokens, disposed: false }
        overrides.push(layer)
        emit('theme/change', themeSnapshot)
        return () => { layer.disposed = true }
      },
    },
    locale: {
      getLocale: () => ({ active: 'zh', locales: [], revision: 1 }),
      subscribe: () => () => {},
    },
    slots: {
      inject(key, callback) {
        const dispose = callback()
        return dispose || (() => {})
      },
      register(options, component) {
        const entry = { slot: options && options.name, options, component }
        registrations.push(entry)
        return () => { entry.disposed = true }
      },
    },
    effect(fn, label) {
      const cleanup = fn()
      const entry = { label, cleanup: typeof cleanup === 'function' ? cleanup : () => {} }
      effects.push(entry)
      return () => {
        const index = effects.indexOf(entry)
        if (index < 0) return
        effects.splice(index, 1)
        entry.cleanup()
      }
    },
    on(event, fn) {
      const list = listeners.get(event) || []
      list.push(fn)
      listeners.set(event, list)
      return () => {
        const current = listeners.get(event) || []
        const index = current.indexOf(fn)
        if (index >= 0) current.splice(index, 1)
      }
    },
    get(name) {
      return name === 'theme' ? ctx.theme : name === 'locale' ? ctx.locale : name === 'slots' ? ctx.slots : undefined
    },
    reflect: { provide() {} },
  }
  return {
    ctx,
    themeSnapshot,
    overrides,
    effects,
    registrations,
    emitted,
    emit,
    disposeAll() {
      while (effects.length > 0) effects.pop().cleanup()
    },
  }
}

/* ------------------------------------------------------------------ run */
const checks = []
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail })
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail === undefined ? '' : '  [' + detail + ']'))
}

const document = createFakeDocument()
const storage = createFakeStorage()
const windowStub = {
  __ModuleLoader__: { load: (registration) => { windowStub.__registration = registration } },
  localStorage: storage,
  innerWidth: 1280,
  innerHeight: 800,
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
}
globalThis.window = windowStub
globalThis.document = document
globalThis.requestAnimationFrame = (fn) => { setTimeout(fn, 0); return 1 }
globalThis.cancelAnimationFrame = () => {}

const ReactStub = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: Symbol('Fragment'),
  Component: class { constructor(props) { this.props = props } },
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useRef: (initial) => ({ current: initial }),
  useMemo: (factory) => factory(),
  useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  useId: () => 'react-id-1',
}

new Function('window', 'navigator', 'document', code)(windowStub, { language: 'zh-CN', languages: ['zh-CN'] }, document)
const registration = windowStub.__registration
check('artifact registers one module-loader factory', !!registration && registration.id === '@local/aurora-studio', registration && registration.id)

const module = registration.factory((id) => {
  if (id === 'react') return ReactStub
  throw new Error('unexpected require: ' + id)
})
const T = module.__test
check('factory exports inject/apply', module.inject.join(',') === 'slots,theme,locale' && typeof module.apply === 'function')

/* ---------------------------------------------------- pure-function checks */
const defaults = T.DEFAULT_SETTINGS
check('DEFAULT_SETTINGS top-level keys', ['version', 'theme', 'background', 'pet', 'advanced'].every((key) => key in defaults))
check('sanitize drops unknown top-level/child fields',
  !('theme2' in T.sanitizeSettings({ theme2: {}, pet: { bogus: 1 }, theme: { accent: 'not-a-color' } }).pet) &&
  T.sanitizeSettings({ theme: { accent: 'not-a-color' } }).theme.accent === defaults.theme.accent)
check('sanitize keeps valid accent', T.sanitizeSettings({ theme: { accent: '#ABCDEF' } }).theme.accent === '#abcdef')
check('sanitize clamps surfaceOpacity', T.sanitizeSettings({ theme: { surfaceOpacity: 9 } }).theme.surfaceOpacity === 1)
check('sanitize rejects non-image imageData', T.sanitizeSettings({ background: { imageData: 'javascript:alert(1)' } }).background.imageData === '')
check('sanitize accepts data:image/', T.sanitizeSettings({ background: { imageData: 'data:image/png;base64,AAA' } }).background.imageData === 'data:image/png;base64,AAA')
check('sanitize position accepts null/numbers only',
  T.sanitizeSettings({ pet: { x: 'left', y: 10.4 } }).pet.x === null &&
  T.sanitizeSettings({ pet: { x: 'left', y: 10.4 } }).pet.y === 10)

const overridesA = T.computeThemeOverrides(defaults)
const tokenNames = Object.keys(overridesA)
const pairsOk = tokenNames.every((name) => typeof overridesA[name].light === 'string' && typeof overridesA[name].dark === 'string')
check('theme overrides: every token is a {light,dark} string pair', pairsOk, tokenNames.length + ' tokens')
check('theme overrides include all surfaces + bg-layer-3', ['--dsw-alias-bg-base', '--dsw-alias-bg-layer-1', '--dsw-alias-bg-layer-2', '--dsw-alias-bg-layer-3', '--dsw-alias-bg-overlay', '--dsw-specific-sidebar-fill', '--dsw-alias-border-l1', '--dsw-alias-border-l2', '--dsw-alias-brand-primary'].every((name) => name in overridesA))
check('theme overrides never emit a bare string (overrideTokens would throw)', tokenNames.every((name) => typeof overridesA[name] !== 'string'))
const baseLightAlpha = Number(/,\s*([0-9.]+)\)$/.exec(overridesA['--dsw-alias-bg-base'].light)?.[1])
check('wallpaper on -> base surface is translucent at surfaceOpacity', Math.abs(baseLightAlpha - defaults.theme.surfaceOpacity) < 1e-6, String(baseLightAlpha))
const overridesOpaque = T.computeThemeOverrides({ ...defaults, background: { ...defaults.background, enabled: false } })
const baseLightAlpha2 = Number(/,\s*([0-9.]+)\)$/.exec(overridesOpaque['--dsw-alias-bg-base'].light)?.[1])
check('wallpaper off -> base surface stays opaque', baseLightAlpha2 === 1, String(baseLightAlpha2))

const wallpaperOff = T.computeWallpaperCss({ ...defaults, background: { ...defaults.background, enabled: false } }, 'dark')
check('wallpaper disabled -> empty CSS', wallpaperOff === '')
const wallpaperDark = T.computeWallpaperCss(defaults, 'dark')
check('wallpaper CSS defines html::before layer + dim + reduced motion',
  wallpaperDark.includes('html::before') && wallpaperDark.includes('linear-gradient') && wallpaperDark.includes('prefers-reduced-motion'))
check('wallpaper CSS uses fixed layer with pointer-events none',
  /position:\s*fixed/.test(wallpaperDark) && /pointer-events:\s*none/.test(wallpaperDark))
check('wallpaper non-animated when advanced.animations=false',
  !T.computeWallpaperCss({ ...defaults, advanced: { ...defaults.advanced, animations: false } }, 'dark').includes('aurora-studio-wallpaper-pan'))
const malicious = 'https://x.example/a");}html{display:none}/*'
const wallpaperInjected = T.computeWallpaperCss({ ...defaults, background: { ...defaults.background, imageUrl: malicious } }, 'dark')
check('wallpaper url() escapes quotes (no CSS breakout)', wallpaperInjected.includes('url("https://x.example/a\\"') && !/url\("https:\/\/x\.example\/a"\)/.test(wallpaperInjected))
const presetUrlRejected = T.computeWallpaperCss({ ...defaults, background: { ...defaults.background, imageUrl: 'javascript:alert(1)' } }, 'dark')
check('non-http imageUrl falls back to preset gradients', !presetUrlRejected.includes('javascript'))

const importValid = T.studioSanitizeImport(JSON.parse(JSON.stringify(defaults)))
check('import: round-trips our own export', importValid.ok === true)
check('import: rejects wrong version', T.studioSanitizeImport({ version: 2, theme: {} }).ok === false)
check('import: rejects unknown character id', T.studioSanitizeImport({ pet: { character: 'dragon' } }).ok === false)
check('import: rejects non-object', T.studioSanitizeImport([1, 2]).ok === false)
check('import: rejects unsafe imageUrl', T.studioSanitizeImport({ background: { imageUrl: 'javascript:alert(1)' } }).ok === false)
check('import: rejects non-data imageData', T.studioSanitizeImport({ background: { imageData: 'data:text/html,<script>' } }).ok === false)
check('import: 3-digit accent is normalized', T.studioSanitizeImport({ theme: { accent: '#ABC' } }).value.theme.accent === '#aabbcc')
check('import: no recognizable fields -> importNoFields', T.studioSanitizeImport({ version: 1 }).key === 'importNoFields')
check('parse lines: trims, drops blanks, caps 40',
  T.studioParseLines(' a \n\n b \n' + Array.from({ length: 60 }, (_, i) => 'l' + i).join('\n')).length <= 40)

/* ------------------------------------------------------------ apply() run */
const runtime = createFakeRuntime()
const warnings = []
const originalWarn = console.warn
console.warn = (...args) => { warnings.push(args.map(String).join(' ')) }
let applyError = null
try {
  module.apply(runtime.ctx)
} catch (error) {
  applyError = error
}
console.warn = originalWarn
check('apply() runs without throwing', applyError === null, applyError && applyError.message)
check('apply() provides the runtime facade', typeof T.getRUNTIME() === 'object' && T.getRUNTIME() !== null)
check('apply() registers both root-scoped slots',
  runtime.registrations.some((entry) => entry.slot === 'settings.section' && entry.options.id === 'aurora-studio') &&
  runtime.registrations.some((entry) => entry.slot === 'shell.overlay' && entry.options.id === 'aurora-pet'))
check('settings section label is a thunk', typeof runtime.registrations.find((entry) => entry.slot === 'settings.section').options.label === 'function')
const headTags = () => document.head.children
check('style tags installed with data-plugin ownership',
  headTags().length >= 3 && headTags().every((tag) => tag.dataset.plugin === '@local/aurora-studio'))
check('pet + studio styles inserted in apply', headTags().some((tag) => tag.dataset.pluginCss.endsWith('/pet-styles')) && headTags().some((tag) => tag.dataset.pluginCss.endsWith('/studio-styles')))
check('wallpaper style tag present by default', headTags().some((tag) => tag.dataset.pluginCss.endsWith('/wallpaper')))
check('no custom-css tag while empty', !headTags().some((tag) => tag.dataset.pluginCss.endsWith('/custom-css')))
check('first theme override layer installed', runtime.overrides.length === 1 && !runtime.overrides[0].disposed)
check('override layer source is the plugin id', runtime.overrides[0].source === '@local/aurora-studio')

const firstLayer = runtime.overrides[0]
const firstWallpaperTag = headTags().find((tag) => tag.dataset.pluginCss.endsWith('/wallpaper'))
T.store.set({ theme: { accent: '#00ff00' } })
check('store change re-registers the override layer', runtime.overrides.length === 2 && firstLayer.disposed === true)
check('new layer keeps dark/light pairs valid', Object.keys(runtime.overrides[1].tokens).every((name) => typeof runtime.overrides[1].tokens[name].light === 'string' && typeof runtime.overrides[1].tokens[name].dark === 'string'))
check('accent change does not rebuild the wallpaper tag', headTags().find((tag) => tag.dataset.pluginCss.endsWith('/wallpaper')) === firstWallpaperTag)

T.store.set({ background: { enabled: false } })
check('disabling wallpaper removes the wallpaper tag', !headTags().some((tag) => tag.dataset.pluginCss.endsWith('/wallpaper')))
check('disabling wallpaper keeps theme layer opaque', /,\s*1\)$/.test(runtime.overrides[runtime.overrides.length - 1].tokens['--dsw-alias-bg-base'].light))

T.store.set({ advanced: { customCss: 'body { color: red }' } })
check('custom CSS gets its own owned style tag', headTags().some((tag) => tag.dataset.pluginCss.endsWith('/custom-css') && tag.textContent.includes('color: red')))
T.store.set({ advanced: { customCss: '' } })
check('clearing custom CSS removes its tag', !headTags().some((tag) => tag.dataset.pluginCss.endsWith('/custom-css')))

/* theme/change + locale/change listeners */
T.store.set({ background: { enabled: true } })
check('re-enabling wallpaper restores the tag', headTags().some((tag) => tag.dataset.pluginCss.endsWith('/wallpaper')))
const layersBefore = runtime.overrides.length
let eventError = null
try {
  runtime.themeSnapshot.active = { id: 'light', colorScheme: 'light', tokens: {} }
  runtime.emit('theme/change', runtime.themeSnapshot)
  runtime.emit('theme/change', runtime.themeSnapshot)
} catch (error) { eventError = error }
check('theme/change handled without throwing (no recursion crash)', eventError === null, eventError && eventError.message)
check('theme/change does not re-register our own override layer', runtime.overrides.length === layersBefore)
check('theme/change re-renders the wallpaper for the new scheme', headTags().some((tag) => tag.dataset.pluginCss.endsWith('/wallpaper') && tag.textContent.includes('f4f0ff')))
const R = T.getRUNTIME()
check('RUNTIME.getScheme follows the theme service', R.getScheme() === 'light')
try {
  runtime.ctx.locale.getLocale = () => ({ active: 'en', locales: [], revision: 2 })
  runtime.emit('locale/change', { active: 'en' })
} catch (error) { eventError = error }
check('locale/change handled without throwing', eventError === null, eventError && eventError.message)
check('RUNTIME.getLocale normalized to en', R.getLocale() === 'en')
const sectionEntry = runtime.registrations.find((entry) => entry.slot === 'settings.section')
let label = null
try { label = sectionEntry.options.label() } catch (error) { label = 'THREW: ' + error.message }
check('nav label thunk resolves a localized string', typeof label === 'string' && label.length > 0 && label !== 'THREW', label)

/* quota path: persist failure must be recorded, not thrown.
   The store debounces small patches (250 ms), so flush explicitly here — a
   real upload patch (large string) persists immediately. */
const originalSetItem = storage.setItem
storage.setItem = () => { throw new Error('QuotaExceededError') }
let quotaError = null
try {
  T.store.set({ pet: { size: 100 } })
  T.store.flush()
} catch (error) { quotaError = error }
storage.setItem = originalSetItem
check('localStorage quota failure never throws out of store.set', quotaError === null, quotaError && quotaError.message)
check('store records persist failure for inline banner', !!T.store.getPersistError())

/* dispose everything the way a fiber unload would */
let disposeError = null
try {
  runtime.disposeAll()
} catch (error) { disposeError = error }
check('effect cleanup runs without throwing', disposeError === null, disposeError && disposeError.message)
check('all owned style tags removed on dispose', headTags().length === 0, headTags().length + ' left')
check('theme override layer disposed on unload', runtime.overrides.every((layer) => layer.disposed === true))
check('RUNTIME cleared after dispose', T.getRUNTIME() === null)
let labelAfter = null
try { labelAfter = sectionEntry.options.label() } catch (error) { labelAfter = 'THREW' }
console.log('DEBUG after-dispose:', JSON.stringify({ runtime: T.getRUNTIME(), locale: (() => { try { return T.studioLocale() } catch (e) { return 'THREW ' + e.message } })(), nav: (() => { try { return T.studioNavLabel() } catch (e) { return 'THREW ' + e.message } })(), en: T.studioText('en','navLabel'), zh: T.studioText('zh','navLabel') }))
check('label thunk still safe after dispose', typeof labelAfter === 'string' && labelAfter !== 'THREW', labelAfter)

const failed = checks.filter((entry) => !entry.ok)
console.log('\n' + (failed.length === 0 ? 'harness: all ' + checks.length + ' checks passed' : 'harness: ' + failed.length + ' of ' + checks.length + ' checks FAILED'))
if (failed.length > 0) process.exit(1)
