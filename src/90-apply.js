/* -------------------------------------------------------------------------
 * Aurora Studio · plugin wiring
 * Installs the runtime facade, keeps the token-override / wallpaper / custom
 * CSS layers in sync with the settings store, and registers the two slot
 * contributions: the settings page and the desktop pet overlay.
 *
 * Bundle plugins have no `ctx.styles` service (that symbol only exists for
 * dynamic dual-half packages), so stylesheets are owned `<style>` tags
 * appended to document.head inside one `ctx.effect`, tagged `data-plugin`
 * for the client module loader's own cleanup/HMR path.
 * ---------------------------------------------------------------------- */

function setAuroraStyleTag(tags, key, css) {
  if (typeof document === 'undefined') return
  const existing = tags.get(key) || null
  if (!css) {
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing)
    tags.delete(key)
    return
  }
  let tag = existing
  if (!tag) {
    tag = document.createElement('style')
    tag.dataset.plugin = PLUGIN_ID
    tag.dataset.pluginCss = PLUGIN_ID + '/' + key
    document.head.appendChild(tag)
    tags.set(key, tag)
  }
  if (tag.textContent !== css) tag.textContent = css
}

function removeAuroraStyleTags(tags) {
  for (const tag of Array.from(tags.values())) {
    if (tag && tag.parentNode) tag.parentNode.removeChild(tag)
  }
  tags.clear()
}

/**
 * Let one broken component blank only its own slot entry instead of the whole
 * surface. The boundary renders nothing on failure and logs the error.
 */
function createAuroraSlotBoundary(Component, label) {
  if (typeof Component !== 'function') return function EmptyAuroraEntry() { return null }
  class AuroraSlotBoundary extends React.Component {
    constructor(props) {
      super(props)
      this.state = { failed: false }
    }
    static getDerivedStateFromError() {
      return { failed: true }
    }
    componentDidCatch(error) {
      try { console.error('[' + PLUGIN_ID + '] ' + label + ' slot entry crashed', error) } catch (ignored) {}
    }
    render() {
      if (this.state.failed) return null
      return h(Component, this.props)
    }
  }
  AuroraSlotBoundary.displayName = 'AuroraSlotBoundary(' + label + ')'
  return AuroraSlotBoundary
}

function apply(ctx) {
  const runtimeParts = createAuroraRuntime(ctx)
  const runtime = runtimeParts.runtime
  RUNTIME = runtime

  const styleTags = new Map()
  const disposers = { theme: null }
  let lastThemeKey = null
  let lastWallpaperKey = null
  let lastCustomCss = null
  let applyingTheme = false

  function disposeThemeLayer() {
    if (disposers.theme) {
      try { disposers.theme() } catch (error) { /* already gone */ }
      disposers.theme = null
    }
  }

  function applyThemeLayer(force) {
    const settings = store.get()
    const theme = settings.theme
    const key = [theme.preset, theme.accent, theme.surfaceOpacity, theme.tint, settings.background.enabled].join('|')
    if (!force && key === lastThemeKey) return
    lastThemeKey = key
    disposeThemeLayer()
    const service = runtime.getThemeService()
    if (!service || typeof service.overrideTokens !== 'function') return
    try {
      applyingTheme = true
      disposers.theme = service.overrideTokens(PLUGIN_ID, computeThemeOverrides(settings))
    } catch (error) {
      try { console.error('[' + PLUGIN_ID + '] theme token override failed', error) } catch (ignored) {}
    } finally {
      applyingTheme = false
    }
  }

  function applyWallpaperLayer() {
    const settings = store.get()
    const background = settings.background
    const key = [
      background.enabled, background.preset, background.imageUrl,
      background.imageData ? background.imageData.length : 0,
      background.imageData ? background.imageData.slice(0, 32) : '',
      background.imageData ? background.imageData.slice(-24) : '',
      background.opacity, background.dim, background.blur, background.animated,
      settings.advanced.animations, runtime.getScheme(),
    ].join('|')
    if (key === lastWallpaperKey) return
    lastWallpaperKey = key
    const css = computeWallpaperCss(settings, runtime.getScheme())
    setAuroraStyleTag(styleTags, 'wallpaper', css)
  }

  function applyCustomCssLayer() {
    const settings = store.get()
    const css = typeof settings.advanced.customCss === 'string' ? settings.advanced.customCss : ''
    if (css === lastCustomCss) return
    lastCustomCss = css
    setAuroraStyleTag(styleTags, 'custom-css', css.trim() ? css : '')
  }

  function syncAll() {
    applyThemeLayer(false)
    applyWallpaperLayer()
    applyCustomCssLayer()
  }

  ctx.effect(() => {
    setAuroraStyleTag(styleTags, 'pet-styles', typeof PET_CSS === 'string' ? PET_CSS : '')
    setAuroraStyleTag(styleTags, 'studio-styles', typeof STUDIO_CSS === 'string' ? STUDIO_CSS : '')
    const offStore = store.subscribe(syncAll)
    syncAll()
    const offThemeEvent = ctx.on('theme/change', () => {
      /* Our own overrideTokens publish must not re-enter the runtime update. */
      if (applyingTheme) return
      if (runtimeParts.refreshTheme()) applyWallpaperLayer()
    })
    const offLocaleEvent = ctx.on('locale/change', () => {
      runtimeParts.refreshLocale()
    })
    /* Persistence is debounced by the store; flush before the page can go away. */
    const flushPersistedSettings = () => store.flush()
    const flushWhenHidden = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') store.flush()
    }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', flushWhenHidden)
    if (typeof window !== 'undefined') window.addEventListener('pagehide', flushPersistedSettings)
    return () => {
      offStore()
      offThemeEvent()
      offLocaleEvent()
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', flushWhenHidden)
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', flushPersistedSettings)
      store.flush()
      disposeThemeLayer()
      removeAuroraStyleTags(styleTags)
      RUNTIME = null
    }
  })

  /* ---- settings page ---- */
  const settingsView = typeof StudioSettingsView === 'function' ? StudioSettingsView : null
  if (settingsView) {
    const SettingsSlot = createAuroraSlotBoundary(settingsView, 'settings.section')
    ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section',
      id: 'aurora-studio',
      order: 25,
      label: () => (typeof studioNavLabel === 'function' ? studioNavLabel() : 'Studio'),
    }, SettingsSlot)))
  }

  /* ---- desktop pet overlay ---- */
  const petOverlay = typeof PetOverlay === 'function' ? PetOverlay : null
  if (petOverlay) {
    const PetSlot = createAuroraSlotBoundary(petOverlay, 'shell.overlay')
    ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
      name: 'shell.overlay',
      id: 'aurora-pet',
      order: 90,
    }, PetSlot)))
  }

  /* ---- renderless token-usage observer for the open conversation ---- */
  const usageObserver = typeof AuroraUsageObserver === 'function' ? AuroraUsageObserver : null
  if (usageObserver) {
    ctx.effect(() => ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
      name: 'conversation.composer.dock',
      id: 'aurora-usage',
      order: 60,
    }, usageObserver)))
  }
}
