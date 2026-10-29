/* -------------------------------------------------------------------------
 * Aurora Studio · pet account bubble
 * A small wallet button under the pet; clicking it opens a speech-bubble style
 * card with the DeepSeek wallet balances, current-conversation token usage,
 * and the Platform usage/top-up links. Balance data comes from the Client
 * Remote namespace `remote.account`; token usage comes from the token-meter
 * session projections through AuroraUsageObserver.
 *
 * Top-level symbol (shared factory scope): PetAccountChip
 * ---------------------------------------------------------------------- */

function PetAccountChip(props) {
  const options = props || {}
  const settings = useSettings()
  const locale = useAuroraLocale()
  const usageState = useAuroraUsage()
  const pet = isPlainObject(settings.pet) ? settings.pet : {}
  const enabled = pet.enabled !== false && pet.account !== false
  const align = options.align === 'left' || options.align === 'right' ? options.align : 'center'
  const petSize = Math.round(clampNumber(options.size, 24, 512, 96))

  const text = locale === 'zh'
    ? {
        button: '余额与用量',
        chip: '余额',
        title: '余额与用量',
        close: '关闭',
        signedOut: '未登录 DeepSeek 账号',
        signedOutHint: '在「设置 → 账户」登录后即可查看余额与用量。',
        balance: '余额',
        bonus: '赠金',
        usage: '查看用量',
        topUp: '充值',
        refresh: '刷新',
        refreshing: '刷新中…',
        loading: '读取中…',
        updated: '更新于',
        failed: '读取失败',
        failedHint: '可点「刷新」重试；若一直失败，请在「设置 → 账户」确认已登录且网络正常。',
        unavailable: '账户接口暂不可用',
        retry: '重试',
        noWallet: '暂无余额数据',
        signIn: '登录',
        tokensTitle: '本会话 tokens',
        tokensInput: '输入',
        tokensOutput: '输出',
        tokensCache: '缓存',
        tokensTotal: '合计',
        tokensContext: '上下文',
        tokensNone: '暂无 token 记录（当前没有打开的会话）',
      }
    : {
        button: 'Balance & usage',
        chip: 'Balance',
        title: 'Balance & usage',
        close: 'Close',
        signedOut: 'Not signed in to DeepSeek',
        signedOutHint: 'Sign in under Settings → Account to see balance and usage.',
        balance: 'Balance',
        bonus: 'Bonus',
        usage: 'Usage',
        topUp: 'Top up',
        refresh: 'Refresh',
        refreshing: 'Refreshing…',
        loading: 'Loading…',
        updated: 'Updated',
        failed: 'Could not load',
        failedHint: 'Try Refresh; if it keeps failing, check Settings → Account and your network.',
        unavailable: 'Account API unavailable',
        retry: 'Retry',
        noWallet: 'No wallet data',
        signIn: 'Sign in',
        tokensTitle: 'Session tokens',
        tokensInput: 'Input',
        tokensOutput: 'Output',
        tokensCache: 'Cache',
        tokensTotal: 'Total',
        tokensContext: 'Context',
        tokensNone: 'No token records yet (no conversation open)',
      }

  const [open, setOpen] = React.useState(false)
  const [snapshot, setSnapshot] = React.useState({ status: 'loading' })
  const [refreshing, setRefreshing] = React.useState(false)
  const aliveRef = React.useRef(true)
  const loadingRef = React.useRef(false)

  React.useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false }
  }, [])

  const load = React.useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    if (aliveRef.current) setRefreshing(true)
    let next
    try {
      next = await fetchAuroraAccountSummary()
    } catch (error) {
      next = { status: 'error', error: String((error && error.message) || error || 'account read failed') }
    }
    loadingRef.current = false
    if (!aliveRef.current) return
    setSnapshot(next)
    setRefreshing(false)
  }, [])

  React.useEffect(() => {
    if (!enabled) {
      setOpen(false)
      return undefined
    }
    load()
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      load()
    }, 300000)
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') load()
    }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, load])

  /* The Remote namespace can mount a moment after this plugin; keep probing. */
  React.useEffect(() => {
    if (!enabled) return undefined
    if (snapshot.status !== 'unavailable') return undefined
    const timer = setInterval(load, 10000)
    return () => clearInterval(timer)
  }, [enabled, snapshot.status, load])

  if (!enabled) return null

  const wallets = Array.isArray(snapshot.wallets) ? snapshot.wallets : []
  const bonusWallets = Array.isArray(snapshot.bonusWallets) ? snapshot.bonusWallets : []
  const links = snapshot.links && typeof snapshot.links === 'object' ? snapshot.links : {}
  const hasUsageLink = typeof links.usageUrl === 'string' && links.usageUrl
  const hasTopUpLink = typeof links.topUpUrl === 'string' && links.topUpUrl
  const updatedAt = snapshot.updatedAt
    ? new Date(snapshot.updatedAt).toLocaleTimeString(locale === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : ''
  const statusDot = snapshot.status === 'ready' ? 'ready' : snapshot.status === 'error' ? 'error' : 'idle'

  const usage = usageState && usageState.usage ? usageState.usage : null
  const pressure = usageState && usageState.pressure ? usageState.pressure : null
  let tokenRows = null
  if (usage) {
    const inputTokens = (usage.uncachedInputTokens || 0) + (usage.cacheReadTokens || 0) + (usage.cacheWriteTokens || 0)
    const outputTokens = usage.outputTokens || 0
    const row = (label, value, key) => h('div', { key, className: 'aurora-pet-account-token-row' },
      h('span', { className: 'aurora-pet-account-row-label' }, label),
      h('span', { className: 'aurora-pet-account-row-value aurora-pet-account-token-value' }, formatAuroraTokens(value) + ' tokens')
    )
    tokenRows = [
      row(text.tokensInput, inputTokens, 'in'),
      row(text.tokensOutput, outputTokens, 'out'),
      (usage.cacheReadTokens || 0) > 0 ? row(text.tokensCache, usage.cacheReadTokens, 'cache') : null,
      row(text.tokensTotal, inputTokens + outputTokens, 'total'),
    ]
    if (pressure && (pressure.pressureTokens || pressure.projectedTokens)) {
      const current = pressure.projectedTokens || pressure.pressureTokens || 0
      const windowSize = pressure.contextWindow || 0
      tokenRows.push(h('div', { key: 'ctx', className: 'aurora-pet-account-token-row' },
        h('span', { className: 'aurora-pet-account-row-label' }, text.tokensContext),
        h('span', { className: 'aurora-pet-account-row-value aurora-pet-account-token-value' },
          formatAuroraTokens(current) + (windowSize ? ' / ' + formatAuroraTokens(windowSize) : '') + ' tokens')
      ))
    }
  }

  const walletRows = []
  for (const wallet of wallets) {
    walletRows.push(h('div', { key: 'w-' + wallet.currency, className: 'aurora-pet-account-row' },
      h('span', { className: 'aurora-pet-account-row-label' }, text.balance + ' · ' + wallet.currency),
      h('span', { className: 'aurora-pet-account-row-value' }, formatAuroraWallet(wallet))
    ))
  }
  for (const wallet of bonusWallets) {
    walletRows.push(h('div', { key: 'b-' + wallet.currency, className: 'aurora-pet-account-row aurora-pet-account-row-bonus' },
      h('span', { className: 'aurora-pet-account-row-label' }, text.bonus + ' · ' + wallet.currency),
      h('span', { className: 'aurora-pet-account-row-value' }, formatAuroraWallet(wallet))
    ))
  }

  const bubble = open
    ? h('div', {
        className: 'aurora-pet-account-panel',
        'data-align': align,
        role: 'dialog',
        'aria-label': text.title,
        onClick: (event) => event.stopPropagation(),
        onPointerDown: (event) => event.stopPropagation(),
        onDoubleClick: (event) => event.stopPropagation(),
      },
      h('div', { className: 'aurora-pet-account-ink', 'aria-hidden': 'true' }),
      h('div', { className: 'aurora-pet-account-content' },
      h('div', { className: 'aurora-pet-account-head' },
        h('span', { className: 'aurora-pet-account-title' }, text.title),
        h('button', {
          type: 'button',
          className: 'aurora-pet-account-close',
          'aria-label': text.close,
          onClick: (event) => { event.stopPropagation(); setOpen(false) },
        }, '×')
      ),
      h('div', { className: 'aurora-pet-account-section' },
        h('div', { className: 'aurora-pet-account-section-title' }, text.balance),
        snapshot.status === 'ready'
          ? (walletRows.length > 0 ? walletRows : h('p', { className: 'aurora-pet-account-hint' }, text.noWallet))
          : snapshot.status === 'signed-out'
            ? h('div', null,
                h('p', { className: 'aurora-pet-account-status' }, text.signedOut),
                h('p', { className: 'aurora-pet-account-hint' }, text.signedOutHint)
              )
            : snapshot.status === 'error'
              ? h('div', null,
                  h('p', { className: 'aurora-pet-account-status aurora-pet-account-error' }, text.failed + (snapshot.error ? ': ' + snapshot.error : '')),
                  h('p', { className: 'aurora-pet-account-hint' }, text.failedHint),
                  h('button', {
                    type: 'button',
                    className: 'aurora-pet-account-btn',
                    onClick: (event) => { event.stopPropagation(); load() },
                  }, text.retry)
                )
              : snapshot.status === 'unavailable'
                ? h('p', { className: 'aurora-pet-account-hint' }, text.unavailable)
                : h('p', { className: 'aurora-pet-account-hint' }, text.loading)
      ),
      h('div', { className: 'aurora-pet-account-section aurora-pet-account-section-tokens' },
        h('div', { className: 'aurora-pet-account-section-title' }, text.tokensTitle),
        usage ? tokenRows.filter(Boolean) : h('p', { className: 'aurora-pet-account-hint' }, text.tokensNone)
      ),
      (hasUsageLink || hasTopUpLink)
        ? h('div', { className: 'aurora-pet-account-links' },
            hasUsageLink ? h('a', {
              className: 'aurora-pet-account-link',
              href: links.usageUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
              onClick: (event) => event.stopPropagation(),
            }, text.usage) : null,
            hasTopUpLink ? h('a', {
              className: 'aurora-pet-account-link aurora-pet-account-link-primary',
              href: links.topUpUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
              onClick: (event) => event.stopPropagation(),
            }, text.topUp) : null
          )
        : null,
      h('div', { className: 'aurora-pet-account-foot' },
        h('button', {
          type: 'button',
          className: 'aurora-pet-account-btn',
          disabled: refreshing,
          onClick: (event) => { event.stopPropagation(); load() },
        }, refreshing ? text.refreshing : text.refresh),
        updatedAt ? h('span', { className: 'aurora-pet-account-updated' }, text.updated + ' ' + updatedAt) : null
      )
      ),
      h('div', { className: 'aurora-pet-account-sticker', 'aria-hidden': 'true' }, '¥'),
      h('svg', { className: 'aurora-pet-account-filterdef', 'aria-hidden': 'true' },
        h('filter', { id: 'aurora-pet-ink-wobble', x: '-12%', y: '-12%', width: '124%', height: '124%' },
          h('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.016', numOctaves: '2', seed: '7', result: 'noise' }),
          h('feDisplacementMap', {
            in: 'SourceGraphic',
            in2: 'noise',
            scale: '2.4',
            xChannelSelector: 'R',
            yChannelSelector: 'G',
          })
        )
      )
    )
    : null

  return h('div', {
    className: 'aurora-pet-account',
    'data-align': align,
    style: { '--aurora-account-lift': Math.max(0, petSize - 8) + 'px' },
    onClick: (event) => event.stopPropagation(),
    onPointerDown: (event) => event.stopPropagation(),
  },
  h('button', {
    type: 'button',
    className: 'aurora-pet-account-chip',
    title: text.button,
    'aria-label': text.button,
    'aria-expanded': open ? 'true' : 'false',
    onClick: (event) => {
      event.stopPropagation()
      const next = !open
      setOpen(next)
      if (next) load()
    },
  },
  h('svg', { className: 'aurora-pet-account-icon', viewBox: '0 0 16 16', width: 11, height: 11, 'aria-hidden': 'true' },
    h('path', {
      d: 'M2 4.5C2 3.7 2.7 3 3.5 3h8C12.3 3 13 3.7 13 4.5v7c0 .8-.7 1.5-1.5 1.5h-8C2.7 13 2 12.3 2 11.5v-7Z',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.2,
    }),
    h('path', { d: 'M2 6h11', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }),
    h('circle', { cx: 10.5, cy: 9.5, r: 1, fill: 'currentColor' })
  ),
  h('span', { className: 'aurora-pet-account-label' }, text.chip),
  h('span', { className: 'aurora-pet-account-dot', 'data-status': statusDot, 'aria-hidden': 'true' })
  ),
  bubble
  )
}

PetAccountChip.displayName = 'AuroraPetAccountChip'
