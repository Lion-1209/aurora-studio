/* -------------------------------------------------------------------------
 * Aurora Studio · desktop pet overlay
 * A draggable, blinking, cursor-aware companion rendered into `shell.overlay`.
 * The overlay layer itself is click-through; only the pet is a hit target.
 *
 * Top-level symbol (shared factory scope): PetOverlay
 * ---------------------------------------------------------------------- */

function PetOverlay() {
  const settings = useSettings()
  const locale = useAuroraLocale()

  const pet = isPlainObject(settings.pet) ? settings.pet : {}
  const enabled = pet.enabled !== false
  const character = typeof pet.character === 'string' ? pet.character : 'ink'
  const sizeValue = Math.round(clampNumber(pet.size, 40, 360, 96))
  const motionMode = pet.mode === 'follow' ? 'follow' : pet.mode === 'still' ? 'still' : 'roam'
  const roamSpeed = Math.round(clampNumber(pet.roamSpeed, 20, 180, 70))
  const moveToken = typeof pet.moveToken === 'number' ? pet.moveToken : 0
  const opacityValue = clampNumber(pet.opacity, 0.3, 1, 1)
  const accent = normalizeHex(settings.theme && settings.theme.accent, '#7c6cf6')
  const name = typeof pet.name === 'string' ? pet.name.trim() : ''
  const idleChatter = pet.idleChatter !== false
  const chatterSeconds = clampNumber(pet.chatterInterval, 20, 300, 60)
  const animationsOn = !(settings.advanced && settings.advanced.animations === false)
  /* The animations switch is also a reduced-motion switch: freeze wandering. */
  const roamActive = animationsOn && motionMode !== 'still'
  const positionX = typeof pet.x === 'number' && Number.isFinite(pet.x) ? pet.x : null
  const positionY = typeof pet.y === 'number' && Number.isFinite(pet.y) ? pet.y : null
  const hasExplicitPosition = positionX !== null && positionY !== null
  const customLines = Array.isArray(pet.lines) ? pet.lines.filter((line) => typeof line === 'string' && line.trim()).map((line) => line.trim()) : []

  /* ------------------------------------------------------------ localized */
  const strings = locale === 'en'
    ? {
        clickLines: [
          'Hi there!',
          'Let\'s do our best today!',
          'I\'m right here with you.',
          'Head pats? Yes please!',
          'Take a little break, okay?',
          'Hehe, you found me!',
          'I was thinking about you.',
          '*happy wiggle*',
          'What are you working on?',
          'You\'re not alone — I\'m here!',
        ],
        idleLines: [
          '*yawn* Just chilling…',
          'Want a glass of water?',
          'I counted your lines of code. So many!',
          'It\'s so quiet…',
          'Nice light today.',
          '*little stretch*',
          'I\'ll keep an eye on the screen.',
          'Getting a bit sleepy…',
        ],
        happyLines: ['Hehe, yay!', 'Pat me again!', 'Yay——!', 'You\'re the best!'],
        ariaLabel: name ? name + ' — desktop pet' : 'Desktop pet',
        hotkeyHint: 'Drag to move · click to talk · double-click to cheer · Ctrl+Shift+A to hide',
      }
    : {
        clickLines: [
          '你好呀～',
          '今天也要一起加油哦',
          '我一直在这里陪着你',
          '要不要摸摸头？',
          '写代码辛苦了，休息一下嘛',
          '嘿嘿，被你发现啦',
          '我刚刚在想你哦',
          '咕噜咕噜…',
          '让我看看你在忙什么',
          '有我在，不孤单！',
        ],
        idleLines: [
          '唔…发会儿呆',
          '要不要喝杯水呀？',
          '我数了数你的代码，好多行呀',
          '好安静呀…',
          '今天的阳光真好',
          '偷偷伸个懒腰～',
          '我帮你看着屏幕呢',
          '有点点困了…',
        ],
        happyLines: ['嘿嘿，好开心！', '再摸一下嘛！', '耶——！', '最喜欢你啦！'],
        ariaLabel: name ? name + ' · 桌面宠物' : '桌面宠物',
        hotkeyHint: '拖动搬家 · 点一下聊天 · 双击撒欢 · Ctrl+Shift+A 隐藏',
      }

  /* 大肥鱼（鲸鱼娘）专属的「吃白饭」梗台词，叠加在通用台词池上。 */
  if (character === 'deepseek') {
    if (locale === 'en') {
      strings.clickLines = strings.clickLines.concat([
        'I am the big fat fish who eats plain rice!',
        'I\'m not chubby — I\'m buoyant!',
        'Fish-flake, let\'s get through today together!',
        'Mmm… rice smells so good.',
      ])
      strings.idleLines = strings.idleLines.concat([
        'A little hungry… is there any rice left?',
        '*tail fin swish*',
        'I was definitely not sneaking rice.',
      ])
      strings.happyLines = strings.happyLines.concat(['Yay, dinner time!', 'Best fish-flake ever!'])
    } else {
      strings.clickLines = strings.clickLines.concat([
        '我是吃白饭的大肥鱼！',
        '才、才不是胖，是浮力大！',
        '鱼片，今天也要一起加油哦',
        '唔…米饭好香',
      ])
      strings.idleLines = strings.idleLines.concat([
        '有点饿了…还有白饭吗？',
        '尾鳍摇摇～',
        '我没有偷吃米饭，真的。',
      ])
      strings.happyLines = strings.happyLines.concat(['耶！开饭啦！', '鱼片最好了！'])
    }
  }

  /* ---------------------------------------------------------------- state */
  const [mood, setMood] = React.useState('idle')
  const [bubble, setBubble] = React.useState(null)
  const [dragging, setDragging] = React.useState(false)
  const [heart, setHeart] = React.useState(0)
  const [spriteWalking, setSpriteWalking] = React.useState(false)
  const moodRef = React.useRef('idle')

  const anchorRef = React.useRef(null)
  const artWrapRef = React.useRef(null)
  const dragRef = React.useRef(null)
  const gazeRef = React.useRef({ x: 0, y: 0, has: false })
  const cursorRef = React.useRef({ x: 0, y: 0, has: false })
  const hoverRef = React.useRef(false)
  /* Live position/target for the free-motion loop (not persisted every frame). */
  const motionRef = React.useRef({ x: null, y: null, target: null, pauseUntil: 0, facing: 1, lastPersist: 0, walking: false, ramp: 0 })
  const lastMoveTokenRef = React.useRef(moveToken)
  const draggingRef = React.useRef(false)
  const linesRef = React.useRef(customLines)
  const suppressClickUntilRef = React.useRef(0)
  const bubbleSeqRef = React.useRef(0)
  const frameRef = React.useRef(0)
  const moodTimer = React.useRef(null)
  const bubbleTimer = React.useRef(null)
  const clickTimer = React.useRef(null)
  const heartTimer = React.useRef(null)
  const chatterTimer = React.useRef(null)
  linesRef.current = customLines

  const clearTimer = (ref) => {
    if (ref && ref.current !== null) {
      clearTimeout(ref.current)
      ref.current = null
    }
  }

  const pickLine = (pool) => {
    const combined = linesRef.current.length ? linesRef.current.concat(pool) : pool
    if (!combined.length) return ''
    return combined[Math.floor(Math.random() * combined.length)]
  }

  /** Show one speech bubble; optionally flashes a mood while it opens. */
  const showBubble = (text, nextMood, nextMoodMs) => {
    if (typeof text !== 'string' || !text) return
    if (draggingRef.current) return
    clearTimer(bubbleTimer)
    bubbleSeqRef.current += 1
    setBubble({ text, id: bubbleSeqRef.current })
    bubbleTimer.current = setTimeout(() => {
      bubbleTimer.current = null
      setBubble(null)
    }, 4000)
    if (nextMood) {
      setMood(nextMood)
      clearTimer(moodTimer)
      moodTimer.current = setTimeout(() => {
        moodTimer.current = null
        setMood('idle')
      }, nextMoodMs || 1700)
    }
  }

  /* ------------------------------------------------------------- handlers */
  const handleClick = (event) => {
    if (Date.now() < suppressClickUntilRef.current) return
    motionRef.current.pauseUntil = performance.now() + 2200
    clearTimer(clickTimer)
    const detail = event && typeof event.detail === 'number' ? event.detail : 0
    if (detail > 1) return
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null
      showBubble(pickLine(strings.clickLines), 'talk', 1500)
    }, 230)
  }

  const handleDoubleClick = (event) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault()
    clearTimer(clickTimer)
    showBubble(pickLine(strings.happyLines), 'happy', 1800)
    setHeart((value) => (value > 0 ? value + 1 : 1))
    clearTimer(heartTimer)
    heartTimer.current = setTimeout(() => {
      heartTimer.current = null
      setHeart(0)
    }, 1200)
  }

  const handlePetKeyDown = (event) => {
    const key = event.key
    if (key === 'Escape') {
      clearTimer(bubbleTimer)
      setBubble(null)
      return
    }
    if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') return
    event.preventDefault()
    event.stopPropagation()
    showBubble(pickLine(strings.clickLines), 'talk', 1500)
  }

  const handlePointerDown = (event) => {
    if (!enabled) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const node = anchorRef.current
    if (!node) return
    motionRef.current.pauseUntil = performance.now() + 1500
    motionRef.current.target = null
    const rect = node.getBoundingClientRect()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseLeft: rect.left,
      baseTop: rect.top,
      width: rect.width || sizeValue,
      height: rect.height || sizeValue,
      left: rect.left,
      top: rect.top,
      moved: false,
    }
    if (event.currentTarget && typeof event.currentTarget.setPointerCapture === 'function') {
      try { event.currentTarget.setPointerCapture(event.pointerId) } catch (error) { /* capture is best effort */ }
    }
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag) {
      /* Keep her under the cursor while the pointer stays on the pet. */
      if (event.pointerType !== 'touch') motionRef.current.pauseUntil = performance.now() + 900
      return
    }
    if (drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      drag.moved = true
      draggingRef.current = true
      setDragging(true)
      setBubble(null)
      clearTimer(bubbleTimer)
      clearTimer(moodTimer)
      setMood('drag')
    }
    const maxLeft = Math.max(8, window.innerWidth - drag.width - 8)
    const maxTop = Math.max(8, window.innerHeight - drag.height - 8)
    const left = Math.min(maxLeft, Math.max(8, drag.baseLeft + dx))
    const top = Math.min(maxTop, Math.max(8, drag.baseTop + dy))
    drag.left = left
    drag.top = top
    const node = anchorRef.current
    if (node) node.style.transform = 'translate3d(' + (left - drag.baseLeft) + 'px,' + (top - drag.baseTop) + 'px,0)'
  }

  const finishDrag = (event) => {
    const drag = dragRef.current
    if (!drag) return
    if (event && typeof event.pointerId === 'number' && drag.pointerId !== event.pointerId) return
    dragRef.current = null
    draggingRef.current = false
    setDragging(false)
    const node = anchorRef.current
    if (node) node.style.transform = ''
    setMood('idle')
    if (!drag.moved) return
    suppressClickUntilRef.current = Date.now() + 350
    const nextX = Math.round(drag.left)
    const nextY = Math.round(drag.top)
    /* Hand the dropped position to the free-motion loop so it continues from
       exactly here instead of jumping back to the last persisted spot. */
    motionRef.current.x = nextX
    motionRef.current.y = nextY
    motionRef.current.target = null
    motionRef.current.pauseUntil = performance.now() + 1600
    if (node) {
      node.style.left = nextX + 'px'
      node.style.top = nextY + 'px'
    }
    const current = store.get()
    const currentPet = current && current.pet ? current.pet : null
    if (currentPet && currentPet.x === nextX && currentPet.y === nextY) return
    store.set({ pet: { x: nextX, y: nextY } })
  }

  /* -------------------------------------------------------------- effects */
  /* Ctrl+Shift+A toggles the pet; never steal the key while typing. */
  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (!event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey) return
      const key = typeof event.key === 'string' ? event.key.toLowerCase() : ''
      if (key !== 'a' && event.code !== 'KeyA') return
      const target = event.target
      const tagName = target && target.tagName ? String(target.tagName).toUpperCase() : ''
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return
      if (target && target.isContentEditable) return
      event.preventDefault()
      const current = store.get()
      const currentPet = current && current.pet ? current.pet : null
      const nextEnabled = !(currentPet && currentPet.enabled !== false)
      store.set({ pet: { enabled: nextEnabled } })
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  /* Cursor tracking: one rAF-throttled write of --aurora-gaze-x/y per frame. */
  React.useEffect(() => {
    if (!enabled) return undefined
    let pending = 0
    const apply = () => {
      pending = 0
      const node = anchorRef.current
      const gaze = gazeRef.current
      if (!node || !gaze.has) return
      const rect = node.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dx = gaze.x - centerX
      const dy = gaze.y - centerY
      const distance = Math.sqrt(dx * dx + dy * dy) || 1
      const strength = Math.min(1, distance / 130)
      const gazeX = Math.max(-1, Math.min(1, (dx / distance) * strength * 1.3))
      const gazeY = Math.max(-1, Math.min(1, (dy / distance) * strength))
      node.style.setProperty('--aurora-gaze-x', gazeX.toFixed(3))
      node.style.setProperty('--aurora-gaze-y', gazeY.toFixed(3))
    }
    const onPointerMove = (event) => {
      if (event.pointerType === 'touch') return
      gazeRef.current.x = event.clientX
      gazeRef.current.y = event.clientY
      gazeRef.current.has = true
      cursorRef.current.x = event.clientX
      cursorRef.current.y = event.clientY
      cursorRef.current.has = true
      if (pending) return
      pending = 1
      frameRef.current = requestAnimationFrame(apply)
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      if (pending) cancelAnimationFrame(frameRef.current)
    }
  }, [enabled])

  /* Free-motion loop: wander the viewport ("roam") or glide after the cursor
     ("follow") at the configured speed. Position is written straight to the
     anchor's inline styles; the store only receives a coarse position every
     ~2s so the settings page and page reloads remember where she was. */
  React.useLayoutEffect(() => {
    if (!enabled || !roamActive) return undefined
    const node = anchorRef.current
    if (!node) return undefined
    const motion = motionRef.current
    hoverRef.current = false
    if (lastMoveTokenRef.current !== moveToken) {
      /* "Reset position" bumps moveToken: forget the live spot and reseed. */
      lastMoveTokenRef.current = moveToken
      motion.x = null
      motion.y = null
      motion.target = null
    }
    const bounds = () => ({
      maxX: Math.max(8, window.innerWidth - sizeValue - 8),
      maxY: Math.max(8, window.innerHeight - sizeValue - 8),
    })
    if (motion.x === null || motion.y === null) {
      const stored = store.get()
      const storedPet = stored && stored.pet ? stored.pet : null
      motion.x = storedPet && typeof storedPet.x === 'number' ? storedPet.x : window.innerWidth - 32 - sizeValue
      motion.y = storedPet && typeof storedPet.y === 'number' ? storedPet.y : window.innerHeight - 100 - sizeValue
    }
    const startBounds = bounds()
    motion.x = Math.min(startBounds.maxX, Math.max(8, motion.x))
    motion.y = Math.min(startBounds.maxY, Math.max(8, motion.y))
    node.style.left = Math.round(motion.x) + 'px'
    node.style.top = Math.round(motion.y) + 'px'
    node.style.right = ''
    node.style.bottom = ''
    motion.pauseUntil = performance.now() + 700

    const wrap = artWrapRef.current
    let raf = 0
    let last = performance.now()
    let disposed = false

    /* Walk animation only while the position loop is actually translating. */
    const updateWalking = (next) => {
      if (disposed) return
      if (motion.walking === next) return
      motion.walking = next
      setSpriteWalking(next)
    }

    const pickRoamTarget = () => {
      const limit = bounds()
      return {
        x: 8 + Math.random() * Math.max(0, limit.maxX - 8),
        y: 8 + Math.random() * Math.max(0, limit.maxY - 8),
      }
    }

    /* Coarse save points only: the state (including a possibly multi-MB
       wallpaper data URL) must not be re-serialised every frame. */
    const persistPosition = () => {
      const nextX = Math.round(motion.x)
      const nextY = Math.round(motion.y)
      const stored = store.get()
      const storedPet = stored && stored.pet ? stored.pet : null
      if (!storedPet || storedPet.x !== nextX || storedPet.y !== nextY) {
        store.set({ pet: { x: nextX, y: nextY } })
      }
    }
    const persistWhenHidden = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') persistPosition()
    }
    document.addEventListener('visibilitychange', persistWhenHidden)
    window.addEventListener('pagehide', persistPosition)

    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.06, Math.max(0, (now - last) / 1000))
      last = now
      if (draggingRef.current || dragRef.current) { motion.ramp = 0; updateWalking(false); return }
      if (hoverRef.current) { motion.ramp = 0; updateWalking(false); return }
      if (typeof document !== 'undefined' && document.hidden) { motion.ramp = 0; updateWalking(false); return }
      if (now < motion.pauseUntil) { motion.ramp = 0; updateWalking(false); return }
      /* Greeting (wave) and cheering (jump) play in place, then motion resumes. */
      if (moodRef.current === 'talk' || moodRef.current === 'happy') { motion.ramp = 0; updateWalking(false); return }
      const limit = bounds()
      /* A window resize or a bigger size can leave her outside the viewport. */
      motion.x = Math.min(limit.maxX, Math.max(8, motion.x))
      motion.y = Math.min(limit.maxY, Math.max(8, motion.y))
      let target = null
      if (motionMode === 'follow' && cursorRef.current.has) {
        target = {
          x: cursorRef.current.x + sizeValue * 0.7,
          y: cursorRef.current.y + sizeValue * 0.55,
        }
      } else {
        if (!motion.target) motion.target = pickRoamTarget()
        target = motion.target
      }
      const tx = Math.min(limit.maxX, Math.max(8, target.x))
      const ty = Math.min(limit.maxY, Math.max(8, target.y))
      const dx = tx - motion.x
      const dy = ty - motion.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      /* Ease in from a stop and ease out near the target: constant-speed
         start/stop reads as a stutter next to a walking cycle. */
      const decel = Math.min(1, distance / Math.max(26, sizeValue * 0.5))
      motion.ramp = Math.min(1, (motion.ramp || 0) + dt * 2.8)
      const speedNow = roamSpeed * Math.max(0.12, Math.min(1, decel)) * motion.ramp
      const step = Math.max(0.2, speedNow * dt)
      updateWalking(distance > step)
      if (distance <= step) {
        motion.x = tx
        motion.y = ty
        motion.target = null
        motion.ramp = 0
        /* Mostly continuous wandering; occasional longer rests. */
        motion.pauseUntil = now + (motionMode === 'follow'
          ? 250
          : (Math.random() < 0.18 ? 2200 + Math.random() * 1800 : 250 + Math.random() * 900))
      } else {
        motion.x += (dx / distance) * step
        motion.y += (dy / distance) * step
        if (Math.abs(dx) > 1) motion.facing = dx < 0 ? -1 : 1
      }
      node.style.left = Math.round(motion.x) + 'px'
      node.style.top = Math.round(motion.y) + 'px'
      if (wrap) wrap.style.transform = motion.facing < 0 ? 'scaleX(-1)' : ''
      if (now - motion.lastPersist > 20000) {
        motion.lastPersist = now
        persistPosition()
      }
    }

    raf = requestAnimationFrame(tick)
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', persistWhenHidden)
      window.removeEventListener('pagehide', persistPosition)
      persistPosition()
      if (motion.walking) {
        motion.walking = false
        setSpriteWalking(false)
      }
      if (wrap) wrap.style.transform = ''
    }
  }, [enabled, roamActive, motionMode, roamSpeed, sizeValue, moveToken])

  /* Switching back to "still" keeps the spot she walked to (the loop above only
     persists periodically). */
  React.useLayoutEffect(() => {
    if (!enabled || roamActive) return
    const motion = motionRef.current
    if (typeof motion.x !== 'number' || typeof motion.y !== 'number') return
    const nextX = Math.round(motion.x)
    const nextY = Math.round(motion.y)
    const stored = store.get()
    const storedPet = stored && stored.pet ? stored.pet : null
    if (!storedPet || storedPet.x !== nextX || storedPet.y !== nextY) {
      store.set({ pet: { x: nextX, y: nextY } })
    }
  }, [enabled, roamActive])

  /* Scroll on the pet to resize it freely (40–360 px); persists immediately. */
  React.useLayoutEffect(() => {
    if (!enabled) return undefined
    const node = anchorRef.current
    if (!node) return undefined
    const onWheel = (event) => {
      if (event.ctrlKey || event.metaKey) return
      event.preventDefault()
      const direction = event.deltaY > 0 ? -1 : 1
      const stored = store.get()
      const storedPet = stored && stored.pet ? stored.pet : null
      const currentSize = Math.round(clampNumber(storedPet && storedPet.size, 40, 360, 96))
      const nextSize = Math.round(clampNumber(currentSize + direction * 6, 40, 360, currentSize))
      if (nextSize === currentSize) return
      motionRef.current.pauseUntil = performance.now() + 1200
      store.set({ pet: { size: nextSize } })
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [enabled])

  /* Idle chatter on a jittered timer; paused while the tab is hidden. */
  React.useEffect(() => {
    if (!enabled || !idleChatter) return undefined
    let disposed = false
    const intervalMs = chatterSeconds * 1000
    const schedule = () => {
      if (disposed) return
      clearTimer(chatterTimer)
      const jitter = 0.7 + Math.random() * 0.6
      chatterTimer.current = setTimeout(() => {
        chatterTimer.current = null
        if (disposed) return
        if (document.visibilityState === 'visible' && !draggingRef.current && !dragRef.current) {
          showBubble(pickLine(strings.idleLines), 'talk', 1600)
        }
        schedule()
      }, Math.round(intervalMs * jitter))
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        schedule()
      } else {
        clearTimer(chatterTimer)
      }
    }
    schedule()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      disposed = true
      clearTimer(chatterTimer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, idleChatter, chatterSeconds, locale])

  /* Keep a persisted position inside the viewport on mount, resize and size change.
     In free-motion modes the loop already clamps every frame. */
  React.useEffect(() => {
    if (!enabled || roamActive) return undefined
    let frame = 0
    const clampIntoView = () => {
      frame = 0
      const current = store.get()
      const currentPet = current && current.pet ? current.pet : null
      if (!currentPet || currentPet.x === null || currentPet.y === null) return
      const node = anchorRef.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      const width = rect.width || sizeValue
      const height = rect.height || sizeValue
      const maxLeft = Math.max(8, window.innerWidth - width - 8)
      const maxTop = Math.max(8, window.innerHeight - height - 8)
      const left = Math.round(Math.min(maxLeft, Math.max(8, currentPet.x)))
      const top = Math.round(Math.min(maxTop, Math.max(8, currentPet.y)))
      if (left !== currentPet.x || top !== currentPet.y) store.set({ pet: { x: left, y: top } })
    }
    const scheduleClamp = () => {
      if (frame) return
      frame = requestAnimationFrame(clampIntoView)
    }
    scheduleClamp()
    window.addEventListener('resize', scheduleClamp)
    return () => {
      window.removeEventListener('resize', scheduleClamp)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled, roamActive, sizeValue, positionX, positionY])

  /* Killing the pet cleans up every transient UI bit too. */
  React.useEffect(() => {
    if (enabled) return
    clearTimer(bubbleTimer)
    clearTimer(moodTimer)
    clearTimer(clickTimer)
    clearTimer(heartTimer)
    clearTimer(chatterTimer)
    dragRef.current = null
    draggingRef.current = false
    setBubble(null)
    setMood('idle')
    setDragging(false)
    setHeart(0)
  }, [enabled])

  React.useEffect(() => () => {
    clearTimer(bubbleTimer)
    clearTimer(moodTimer)
    clearTimer(clickTimer)
    clearTimer(heartTimer)
    clearTimer(chatterTimer)
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
  }, [])

  /* ---------------------------------------------------------------- render */
  if (!enabled) return null

  moodRef.current = dragging ? 'drag' : mood
  const finalMood = dragging ? 'drag' : mood
  /* 大肥鱼 uses real animation strips: walk while translating, wave when
     talking/greeting, jump when happy, idle otherwise. */
  const spriteAction = finalMood === 'happy'
    ? 'jump'
    : finalMood === 'talk'
      ? 'wave'
      : (spriteWalking && roamActive)
        ? 'walk'
        : 'idle'
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280
  const moving = roamActive
  const liveX = moving && typeof motionRef.current.x === 'number' ? motionRef.current.x : (hasExplicitPosition ? positionX : viewportWidth - 32 - sizeValue)
  const liveY = moving && typeof motionRef.current.y === 'number' ? motionRef.current.y : (hasExplicitPosition ? positionY : null)
  const petCenter = liveX + sizeValue / 2
  const bubbleAlign = petCenter > viewportWidth * 0.62 ? 'right' : petCenter < viewportWidth * 0.38 ? 'left' : 'center'
  const bubbleFlip = liveY !== null && liveY < 140

  const anchorStyle = {
    width: sizeValue + 'px',
    height: sizeValue + 'px',
    ...(moving
      ? (hasExplicitPosition ? {} : { right: '32px', bottom: '100px' })
      : (hasExplicitPosition
        ? { left: Math.round(positionX) + 'px', top: Math.round(positionY) + 'px' }
        : { right: '32px', bottom: '100px' })),
  }

  const bubbleNode = bubble
    ? h('div', {
        key: 'bubble-' + bubble.id,
        className: 'aurora-pet-bubble-anchor',
        'data-align': bubbleAlign,
        'data-flip': bubbleFlip ? 'below' : 'above',
      },
      h('div', { className: 'aurora-pet-bubble', role: 'status', 'aria-live': 'polite' },
        name ? h('span', { className: 'aurora-pet-bubble-name' }, name) : null,
        h('span', { className: 'aurora-pet-bubble-text' }, bubble.text)
      )
    )
    : null

  const heartNode = heart > 0
    ? h('div', { key: 'heart-' + heart, className: 'aurora-pet-heart', 'aria-hidden': 'true' },
      h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': 'true' },
        h('path', {
          d: 'M12 20.6c-.4 0-8-4.8-9.5-9.2C1.3 7.7 3.6 4.4 7 4.4c2 0 3.6 1.2 5 3.1 1.4-1.9 3-3.1 5-3.1 3.4 0 5.7 3.3 4.5 7-1.5 4.4-9.1 9.2-9.5 9.2Z',
          fill: 'currentColor',
        })
      )
    )
    : null

  return h('div', {
    className: 'aurora-pet-layer',
    'data-animations': animationsOn ? 'on' : 'off',
    /* Inline: the host stylesheet forces pointer-events:auto on the slot's direct
       children (`.overlayLayer > *`), which would otherwise make this full-frame
       layer swallow every click. Inline style wins and keeps the layer click-through. */
    style: { pointerEvents: 'none' },
  },
  h('div', {
    ref: anchorRef,
    className: 'aurora-pet-anchor',
    style: anchorStyle,
    role: 'button',
    tabIndex: 0,
    'aria-label': strings.ariaLabel,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: finishDrag,
    onPointerCancel: finishDrag,
    onLostPointerCapture: finishDrag,
    onPointerEnter: () => {
      hoverRef.current = true
      motionRef.current.pauseUntil = performance.now() + 1800
    },
    onPointerLeave: () => {
      hoverRef.current = false
      motionRef.current.pauseUntil = performance.now() + 250
    },
    onClick: handleClick,
    onDoubleClick: handleDoubleClick,
    onKeyDown: handlePetKeyDown,
    title: strings.hotkeyHint + (locale === 'en' ? ' · scroll to resize' : ' · 滚轮缩放大小'),
  },
  bubbleNode,
  heartNode,
  h(PetAccountChip, { align: bubbleAlign, size: sizeValue }),
  /* Opacity belongs to the artwork only: the bubble and heart must stay fully
     readable even when the pet itself is faded. */
  h('div', { ref: artWrapRef, className: 'aurora-pet-art-wrap', style: { opacity: opacityValue } },
    character === 'deepseek' && typeof PetSprite === 'function'
      ? h(PetSprite, { action: spriteAction, mood: finalMood, size: sizeValue, speed: roamSpeed, animated: animationsOn })
      : h(PetArt, { character, mood: finalMood, size: sizeValue, accent, animated: animationsOn })
  )
  )
  )
}

PetOverlay.displayName = 'AuroraPetOverlay'
