/* -------------------------------------------------------------------------
 * Aurora Studio · DeepSeek account summary
 * Reads the signed-in account's wallet balances through the Client Remote
 * namespace `remote.account` (mounted by @deepseek-ai/dsh-api-remotes).
 * No credential ever reaches this plugin: the Remote returns formatted wallet
 * amounts and the public Platform links only.
 *
 * Top-level symbols: fetchAuroraAccountSummary, formatAuroraWallet
 * ---------------------------------------------------------------------- */

function formatAuroraWallet(wallet) {
  if (!wallet || typeof wallet.balance !== 'string') return ''
  const symbol = wallet.currency === 'USD' ? '$' : '¥'
  return symbol + wallet.balance
}

/** Compact token counts: 1234 -> 1.2k, 1200000 -> 1.2M. */
function formatAuroraTokens(value) {
  const number = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
  if (number >= 1000000) return (number / 1000000).toFixed(number >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M'
  if (number >= 1000) return (number / 1000).toFixed(number >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'k'
  return String(Math.round(number))
}

/* Live token-usage store fed by AuroraUsageObserver (conversation composer),
   read by the pet's account bubble. */
const AURORA_USAGE = { sessionId: null, usage: null, pressure: null, listeners: new Set() }

function publishAuroraUsage(sessionId, usage, pressure) {
  AURORA_USAGE.sessionId = sessionId
  AURORA_USAGE.usage = usage
  AURORA_USAGE.pressure = pressure
  for (const listener of Array.from(AURORA_USAGE.listeners)) {
    try { listener() } catch (error) { /* ignore */ }
  }
}

function useAuroraUsage() {
  const [snapshot, setSnapshot] = React.useState({ sessionId: AURORA_USAGE.sessionId, usage: AURORA_USAGE.usage, pressure: AURORA_USAGE.pressure })
  React.useEffect(() => {
    const sync = () => setSnapshot({ sessionId: AURORA_USAGE.sessionId, usage: AURORA_USAGE.usage, pressure: AURORA_USAGE.pressure })
    AURORA_USAGE.listeners.add(sync)
    sync()
    return () => { AURORA_USAGE.listeners.delete(sync) }
  }, [])
  return snapshot
}

/**
 * Renderless session-scoped observer: reads the token-meter `tokenUsage` and
 * `contextPressure` session projections of the conversation currently mounted
 * in the composer dock, and publishes them for the pet bubble.
 */
function AuroraUsageObserver(props) {
  const sessionId = props && props.sessionId
  React.useEffect(() => {
    if (!sessionId) {
      publishAuroraUsage(null, null, null)
      return undefined
    }
    const sessions = RUNTIME && typeof RUNTIME.getSessions === 'function' ? RUNTIME.getSessions() : null
    if (!sessions) {
      publishAuroraUsage(sessionId, null, null)
      return undefined
    }
    let disposed = false
    let retries = 0
    let timer = 0
    let offUsage = null
    let offPressure = null
    const attach = () => {
      if (disposed) return
      let binding = null
      try { binding = sessions.binding(sessionId) } catch (error) { binding = null }
      const faces = binding && binding.session && binding.session.projections
      if (!faces) {
        if (retries < 20) {
          retries += 1
          try { if (typeof sessions.refreshProjections === 'function') sessions.refreshProjections(sessionId) } catch (error) { /* ignore */ }
          timer = setTimeout(attach, 500)
        } else {
          publishAuroraUsage(sessionId, null, null)
        }
        return
      }
      const read = () => {
        if (disposed) return
        let usage = null
        let pressure = null
        try {
          const usageFace = faces.faceOf('tokenUsage')
          if (usageFace && typeof usageFace.getSnapshot === 'function') usage = usageFace.getSnapshot() || null
        } catch (error) { usage = null }
        try {
          const pressureFace = faces.faceOf('contextPressure')
          if (pressureFace && typeof pressureFace.getSnapshot === 'function') pressure = pressureFace.getSnapshot() || null
        } catch (error) { pressure = null }
        publishAuroraUsage(sessionId, usage, pressure)
      }
      try {
        const usageFace = faces.faceOf('tokenUsage')
        if (usageFace && typeof usageFace.subscribe === 'function') offUsage = usageFace.subscribe(read)
      } catch (error) { offUsage = null }
      try {
        const pressureFace = faces.faceOf('contextPressure')
        if (pressureFace && typeof pressureFace.subscribe === 'function') offPressure = pressureFace.subscribe(read)
      } catch (error) { offPressure = null }
      read()
    }
    attach()
    return () => {
      disposed = true
      if (timer) clearTimeout(timer)
      if (offUsage) offUsage()
      if (offPressure) offPressure()
      publishAuroraUsage(null, null, null)
    }
  }, [sessionId])
  return null
}

function auroraAccountMetadata() {
  const locale = RUNTIME && typeof RUNTIME.getLocale === 'function' ? RUNTIME.getLocale() : 'en'
  return {
    version: '1.4.0',
    /* Platform only needs the primary subtag. */
    locale: locale === 'zh' ? 'zh' : 'en',
    timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
  }
}

function describeAuroraRemoteError(result, fallback) {
  if (result && result.error) {
    const code = result.error.code ? String(result.error.code) : ''
    const message = result.error.message ? String(result.error.message) : ''
    if (code && message) return code + ': ' + message
    if (message) return message
    if (code) return code
  }
  return fallback
}

/**
 * Resolve the current account view + wallet balances.
 * Status: 'ready' | 'signed-out' | 'unavailable' | 'error'.
 *
 * `getState` supplies the signed-in flag and the Platform links. If that call
 * is unavailable for any reason we still try the wallet read and infer the
 * signed-out state from a null outcome, so a state-endpoint hiccup does not
 * hide the balance.
 */
async function fetchAuroraAccountSummary() {
  const remote = RUNTIME && typeof RUNTIME.getRemote === 'function' ? RUNTIME.getRemote() : null
  const account = remote && remote.account
  if (!account || typeof account.getBalance !== 'function') return { status: 'unavailable' }

  const metadata = auroraAccountMetadata()
  let state = null
  let stateError = null
  if (typeof account.getState === 'function') {
    try {
      const stateResult = await account.getState()
      if (stateResult && stateResult.ok === true) state = stateResult.value || {}
      else stateError = describeAuroraRemoteError(stateResult, 'account state failed')
    } catch (error) {
      stateError = String((error && error.message) || error || 'account state failed')
    }
  }
  if (state && state.status !== 'credential-stored') {
    return { status: 'signed-out', links: state.links || {}, updatedAt: Date.now() }
  }

  const [balanceResult, profileResult] = await Promise.all([
    Promise.resolve().then(() => account.getBalance(metadata)).catch((error) => ({ ok: false, error: { message: String((error && error.message) || error) } })),
    Promise.resolve().then(() => account.getProfile(metadata)).catch((error) => ({ ok: false, error: { message: String((error && error.message) || error) } })),
  ])
  const balance = balanceResult && balanceResult.ok === true ? balanceResult.value : null
  const profile = profileResult && profileResult.ok === true ? profileResult.value : null
  const balanceError = balanceResult && balanceResult.ok !== true
    ? describeAuroraRemoteError(balanceResult, 'account balance failed')
    : null
  if (!state && balance === null) {
    if (balanceResult && balanceResult.ok === true) return { status: 'signed-out', links: {}, updatedAt: Date.now() }
    return { status: 'error', error: balanceError || stateError || 'account balance failed', updatedAt: Date.now() }
  }
  if (balance && balance.status === 'failed') {
    return { status: 'error', error: balanceError || 'account balance failed', updatedAt: Date.now() }
  }
  const ready = balance && balance.status === 'ready'
  return {
    status: 'ready',
    links: (state && state.links) || {},
    wallets: ready && Array.isArray(balance.value) ? balance.value.slice() : [],
    bonusWallets: ready && Array.isArray(balance.bonusWallets) ? balance.bonusWallets.slice() : [],
    profile: profile && profile.status === 'ready' ? profile.value : null,
    updatedAt: Date.now(),
  }
}
