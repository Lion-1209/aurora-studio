/* -------------------------------------------------------------------------
 * Aurora Studio · 大肥鱼 sprite animator
 * Draws the licensed animation strips onto a <canvas> with an rAF frame clock.
 * Canvas drawing avoids the sub-pixel rounding / layer artifacts of animating
 * `background-position`, and no React re-render happens per frame. Only used
 * for the `deepseek` character; the SVG mascots keep their own PetArt renderer.
 *
 * Top-level symbol (shared factory scope): PetSprite
 * ---------------------------------------------------------------------- */

/* Decoded strip elements are reused across action changes so switching from
   idle to walk never re-decodes a large sprite strip. */
const PET_SPRITE_IMAGE_CACHE = {}

function petSpriteImage(source) {
  let image = PET_SPRITE_IMAGE_CACHE[source]
  if (!image) {
    image = new Image()
    image.decoding = 'async'
    image.src = source
    PET_SPRITE_IMAGE_CACHE[source] = image
  }
  return image
}

function PetSprite(props) {
  const options = props || {}
  const mood = typeof options.mood === 'string' ? options.mood : 'idle'
  const requested = typeof options.action === 'string' ? options.action : 'idle'
  const action = PET_SPRITE_ACTIONS[requested] ? requested : 'idle'
  const meta = PET_SPRITE_ACTIONS[action]
  const animated = options.animated !== false
  const size = Math.round(clampNumber(options.size, 24, 512, 96))
  const speed = clampNumber(options.speed, 20, 180, 70)
  const frames = meta.frames
  const duration = action === 'walk'
    ? Math.round(clampNumber(1100 - speed * 3, 700, 1100))
    : meta.duration
  const imageSource = action === 'walk'
    ? PET_SPRITE_WALK
    : action === 'wave'
      ? PET_SPRITE_WAVE
      : action === 'jump'
        ? PET_SPRITE_JUMP
        : PET_SPRITE_IDLE

  const canvasRef = React.useRef(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d')
    if (!context) return undefined
    const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1))
    const pixels = Math.max(1, Math.round(size * dpr))
    canvas.width = pixels
    canvas.height = pixels
    context.imageSmoothingEnabled = true
    try { context.imageSmoothingQuality = 'high' } catch (error) { /* optional */ }

    const image = petSpriteImage(imageSource)
    let disposed = false
    let raf = 0
    let clockStarted = false

    const draw = (index) => {
      if (disposed) return
      context.clearRect(0, 0, pixels, pixels)
      if (!image.complete || image.naturalWidth === 0) return
      context.drawImage(
        image,
        index * PET_SPRITE_FRAME.width, 0, PET_SPRITE_FRAME.width, PET_SPRITE_FRAME.height,
        0, 0, pixels, pixels,
      )
    }

    const runClock = () => {
      if (clockStarted) return
      clockStarted = true
      if (!animated || frames <= 1) {
        draw(0)
        return
      }
      let reduced = false
      try {
        reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
      } catch (error) {
        reduced = false
      }
      if (reduced) {
        draw(0)
        return
      }
      /*
       * Advance one frame every N display refreshes instead of sampling the
       * wall clock: a frame near a timestamp boundary would otherwise be held
       * for 2 refreshes one step and 3 the next, which reads as "one pose
       * flashes past, the next lingers". Measuring the refresh interval first
       * keeps the real gait speed on 60/120/144 Hz displays alike.
       */
      let refreshMs = 1000 / 60
      let ticksPerFrame = Math.max(1, Math.round((duration / frames) / refreshMs))
      let frameIndex = 0
      let tickCount = 0
      const step = () => {
        raf = requestAnimationFrame(step)
        tickCount += 1
        if (tickCount % ticksPerFrame !== 0) return
        frameIndex = (frameIndex + 1) % frames
        draw(frameIndex)
      }
      const samples = []
      let last = 0
      const measure = (now) => {
        if (disposed) return
        if (last > 0) samples.push(now - last)
        last = now
        if (samples.length < 3) {
          raf = requestAnimationFrame(measure)
          return
        }
        const sorted = samples.slice().sort((a, b) => a - b)
        refreshMs = Math.max(4, sorted[Math.floor(sorted.length / 2)] || refreshMs)
        ticksPerFrame = Math.max(1, Math.round((duration / frames) / refreshMs))
        frameIndex = 0
        tickCount = 0
        draw(0)
        raf = requestAnimationFrame(step)
      }
      draw(0)
      raf = requestAnimationFrame(measure)
    }

    image.onload = () => {
      if (disposed) return
      runClock()
    }
    image.onerror = () => { /* keep the canvas empty; the wrapper still has a shadow */ }
    if (image.complete && image.naturalWidth > 0) runClock()

    return () => {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      image.onload = null
      image.onerror = null
    }
  }, [action, animated, frames, duration, size, imageSource])

  return h('div', {
    className: 'aurora-pet-art aurora-pet-char-deepseek aurora-pet-sprite-root aurora-pet-mood-' + mood + (animated ? '' : ' aurora-pet-static'),
    style: { width: size + 'px', height: size + 'px' },
    'aria-hidden': 'true',
  },
  h('div', {
    className: 'aurora-pet-body aurora-pet-sprite-body',
    'data-action': action,
  },
  h('canvas', {
    ref: canvasRef,
    className: 'aurora-pet-sprite-canvas',
    style: { width: size + 'px', height: size + 'px' },
  })
  ))
}

PetSprite.displayName = 'AuroraPetSprite'
