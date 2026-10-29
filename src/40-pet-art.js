/* -------------------------------------------------------------------------
 * Aurora Studio · pet artwork
 * Original SVG mascots (viewBox 0 0 120 120) plus the complete stylesheet for
 * the desktop-pet overlay. Everything here is drawn with plain SVG shapes —
 * no external images, no fonts, no filters.
 *
 * Top-level symbols (shared factory scope — keep this list minimal):
 *   PET_CHARACTERS, petCharacterLabel, PetArt, PET_CSS
 * ---------------------------------------------------------------------- */

/** The six original mascots. `accent: true` means the accent tint carries the body. */
const PET_CHARACTERS = [
  { id: 'deepseek', name: { zh: '大肥鱼', en: 'DeepSeek Whale' }, accent: false },
  { id: 'ink', name: { zh: '墨墨', en: 'Inky' }, accent: false },
  { id: 'cat', name: { zh: '喵呜', en: 'Mochi' }, accent: true },
  { id: 'ghost', name: { zh: '幽幽', en: 'Boo' }, accent: true },
  { id: 'robot', name: { zh: '小机', en: 'Bolt' }, accent: true },
  { id: 'star', name: { zh: '星星', en: 'Twinkle' }, accent: true },
]

/** Localized display name for a character id; unknown ids degrade to the id. */
function petCharacterLabel(id) {
  let locale = 'zh'
  try {
    if (RUNTIME && typeof RUNTIME.getLocale === 'function') locale = RUNTIME.getLocale()
  } catch (error) {
    /* RUNTIME is null before apply(); keep the zh fallback */
  }
  for (let index = 0; index < PET_CHARACTERS.length; index += 1) {
    const character = PET_CHARACTERS[index]
    if (character.id !== id) continue
    return (locale === 'en' ? character.name.en : character.name.zh) || character.name.zh || character.id
  }
  return typeof id === 'string' ? id : ''
}

/**
 * Pure presentational mascot. Props:
 *   character — PET_CHARACTERS id (falls back to `ink`)
 *   mood      — 'idle' | 'happy' | 'talk' | 'sleep' | 'drag'
 *   size      — square pixel size of the canvas
 *   accent    — '#rrggbb' body tint
 *   name      — readable label for `aria-label` / `<title>` (omit to be decorative)
 *   animated  — optional: false freezes every CSS animation for this instance
 *
 * The overlay writes `--aurora-gaze-x` / `--aurora-gaze-y` (-1..1) on an
 * ancestor; PET_CSS translates the pupils from those custom properties.
 */
function PetArt(props) {
  const options = props || {}
  const MOODS = ['idle', 'happy', 'talk', 'sleep', 'drag']
  const CHARACTER_IDS = ['deepseek', 'ink', 'cat', 'ghost', 'robot', 'star']

  const requestedCharacter = typeof options.character === 'string' ? options.character : 'ink'
  const artId = CHARACTER_IDS.indexOf(requestedCharacter) >= 0 ? requestedCharacter : 'ink'
  const requestedMood = typeof options.mood === 'string' ? options.mood : 'idle'
  const mood = MOODS.indexOf(requestedMood) >= 0 ? requestedMood : 'idle'
  const requestedSize = Number(options.size)
  const px = Number.isFinite(requestedSize) ? Math.max(24, Math.min(512, requestedSize)) : 72
  const animated = options.animated !== false
  const label = typeof options.name === 'string' && options.name.trim() ? options.name.trim() : ''

  /* ----------------------------------------------------------- colour math */
  const parseColor = (value) => {
    if (typeof value !== 'string') return null
    let text = value.trim()
    if (text.charAt(0) === '#') text = text.slice(1)
    if (text.length === 3) {
      text = text.charAt(0) + text.charAt(0) + text.charAt(1) + text.charAt(1) + text.charAt(2) + text.charAt(2)
    }
    if (!/^[0-9a-fA-F]{6}$/.test(text)) return null
    return {
      r: parseInt(text.slice(0, 2), 16),
      g: parseInt(text.slice(2, 4), 16),
      b: parseInt(text.slice(4, 6), 16),
    }
  }
  const toHex = (color) => {
    const channel = (value) => {
      const number = Math.max(0, Math.min(255, Math.round(value)))
      return (number < 16 ? '0' : '') + number.toString(16)
    }
    return '#' + channel(color.r) + channel(color.g) + channel(color.b)
  }
  const mix = (from, to, ratio) => {
    const a = parseColor(from) || { r: 124, g: 108, b: 246 }
    const b = parseColor(to) || { r: 255, g: 255, b: 255 }
    const t = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0))
    return toHex({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t })
  }
  const luminance = (hex) => {
    const rgb = parseColor(hex) || { r: 124, g: 108, b: 246 }
    const linear = (channel) => {
      const value = channel / 255
      return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b)
  }

  const rawAccent = typeof options.accent === 'string' ? options.accent : ''
  const accent = parseColor(rawAccent) ? toHex(parseColor(rawAccent)) : '#7c6cf6'
  const accentLuma = luminance(accent)
  /* Keep the body readable even for near-white / near-black accents. */
  const bodyBase = accentLuma < 0.14 ? mix(accent, '#ffffff', 0.46) : accentLuma > 0.9 ? mix(accent, '#5b51cf', 0.42) : accent
  const light = mix(bodyBase, '#ffffff', 0.58)
  const deep = mix(bodyBase, '#1b1533', 0.42)
  const outline = mix(bodyBase, '#171126', 0.74)
  const blushColor = mix(accent, '#ff7d9e', 0.66)
  const inkEye = '#2b2440'

  /* Gradient ids must be unique per mounted instance (the studio renders five). */
  const rawUid = React.useId ? React.useId() : 'aurora-pet'
  const uid = String(rawUid).replace(/[^a-zA-Z0-9_-]/g, '') || 'aurora-pet'

  /* ------------------------------------------------------- reusable parts */
  const openEye = (cx, cy, key, eyeOptions) => {
    const extra = eyeOptions || {}
    const rx = extra.rx || 4.6
    const ry = extra.ry || 5.4
    const fill = extra.fill || inkEye
    return h('g', { key, className: 'aurora-pet-eye' },
      h('g', { className: 'aurora-pet-pupil' },
        h('ellipse', { cx, cy, rx, ry, fill }),
        h('circle', { cx: cx - rx * 0.34, cy: cy - ry * 0.42, r: rx * 0.36, fill: '#ffffff', opacity: 0.95 }),
        h('circle', { cx: cx + rx * 0.34, cy: cy + ry * 0.34, r: rx * 0.16, fill: '#ffffff', opacity: 0.6 })
      )
    )
  }

  /* Ink's eyes glow: pale sclera with a dark pupil that follows the cursor. */
  const spiritEye = (cx, cy, key) => h('g', { key, className: 'aurora-pet-eye' },
    h('g', { className: 'aurora-pet-pupil' },
      h('ellipse', { cx, cy, rx: 4.7, ry: 5.5, fill: '#f6f2ff', opacity: 0.96 }),
      h('ellipse', { cx, cy: cy + 0.6, rx: 2.4, ry: 3.1, fill: '#241f3a' }),
      h('circle', { cx: cx - 1.1, cy: cy - 1.2, r: 1.15, fill: '#ffffff' })
    )
  )

  /* Robot screen eyes: two soft LEDs inside the visor. */
  const ledEye = (cx, cy, key) => h('g', { key, className: 'aurora-pet-eye' },
    h('g', { className: 'aurora-pet-pupil' },
      h('ellipse', { cx, cy, rx: 7, ry: 8, fill: '#6fe6ff', opacity: 0.16 }),
      h('ellipse', { cx, cy, rx: 4.3, ry: 5.4, fill: '#c9f7ff' }),
      h('circle', { cx: cx - 1.2, cy: cy - 1.5, r: 1.4, fill: '#ffffff', opacity: 0.95 })
    )
  )

  /* Happy (∪) and sleeping (∩) eye lines. */
  const softEye = (cx, cy, key, happy, color) => {
    const stroke = color || inkEye
    const curve = happy ? cy - 4.6 : cy + 4
    return h('path', {
      key,
      className: 'aurora-pet-eye-soft',
      d: 'M' + (cx - 5) + ' ' + cy + ' Q' + cx + ' ' + curve + ' ' + (cx + 5) + ' ' + cy,
      fill: 'none',
      stroke,
      strokeWidth: 2.6,
      strokeLinecap: 'round',
    })
  }

  const eyesFor = (leftX, rightX, cy, eyeOptions) => {
    const extra = eyeOptions || {}
    if (mood === 'happy') return [softEye(leftX, cy, 'eyeL', true, extra.line), softEye(rightX, cy, 'eyeR', true, extra.line)]
    if (mood === 'sleep') return [softEye(leftX, cy, 'eyeL', false, extra.line), softEye(rightX, cy, 'eyeR', false, extra.line)]
    if (extra.style === 'spirit') return [spiritEye(leftX, cy, 'eyeL'), spiritEye(rightX, cy, 'eyeR')]
    if (extra.style === 'led') return [ledEye(leftX, cy, 'eyeL'), ledEye(rightX, cy, 'eyeR')]
    return [openEye(leftX, cy, 'eyeL', extra), openEye(rightX, cy, 'eyeR', extra)]
  }

  const mouthFor = (cx, cy, mouthOptions) => {
    const extra = mouthOptions || {}
    const fill = extra.fill || inkEye
    const stroke = extra.stroke || fill
    const tongue = extra.tongue || '#ff9fb4'
    if (mood === 'happy') {
      return h('g', { key: 'mouth', className: 'aurora-pet-mouth' },
        h('path', {
          d: 'M' + (cx - 5.4) + ' ' + (cy - 1.4) + ' Q' + cx + ' ' + (cy + 7) + ' ' + (cx + 5.4) + ' ' + (cy - 1.4) + ' Z',
          fill,
          stroke,
          strokeWidth: 1.2,
          strokeLinejoin: 'round',
        }),
        h('ellipse', { cx, cy: cy + 3.4, rx: 2.6, ry: 1.6, fill: tongue, opacity: 0.92 })
      )
    }
    if (mood === 'talk') {
      return h('ellipse', { key: 'mouth', className: 'aurora-pet-mouth aurora-pet-mouth-talk', cx, cy: cy + 1, rx: 3.4, ry: 3.8, fill })
    }
    if (mood === 'sleep') {
      return h('ellipse', { key: 'mouth', className: 'aurora-pet-mouth', cx, cy: cy + 0.5, rx: 2, ry: 2.4, fill, opacity: 0.85 })
    }
    if (mood === 'drag') {
      return h('ellipse', { key: 'mouth', className: 'aurora-pet-mouth', cx, cy: cy + 1.1, rx: 3.1, ry: 2.5, fill })
    }
    return h('path', {
      key: 'mouth',
      className: 'aurora-pet-mouth aurora-pet-mouth-idle',
      d: 'M' + (cx - 3.4) + ' ' + (cy - 0.3) + ' Q' + cx + ' ' + (cy + 2.9) + ' ' + (cx + 3.4) + ' ' + (cy - 0.3),
      fill: 'none',
      stroke,
      strokeWidth: 2.1,
      strokeLinecap: 'round',
    })
  }

  const blushFor = (cx, cy, key) => h('ellipse', {
    key,
    className: 'aurora-pet-blush',
    cx,
    cy,
    rx: 5.2,
    ry: 3.1,
    fill: blushColor,
    opacity: 0.5,
  })

  const sparkleFor = (cx, cy, radius, key, delay) => {
    const r = radius
    const inner = r * 0.24
    return h('path', {
      key,
      className: 'aurora-pet-sparkle',
      style: delay ? { animationDelay: delay } : undefined,
      d: 'M' + cx + ' ' + (cy - r)
        + ' Q' + (cx + inner) + ' ' + (cy - inner) + ' ' + (cx + r) + ' ' + cy
        + ' Q' + (cx + inner) + ' ' + (cy + inner) + ' ' + cx + ' ' + (cy + r)
        + ' Q' + (cx - inner) + ' ' + (cy + inner) + ' ' + (cx - r) + ' ' + cy
        + ' Q' + (cx - inner) + ' ' + (cy - inner) + ' ' + cx + ' ' + (cy - r) + ' Z',
      fill: '#ffffff',
      opacity: 0.9,
      stroke: accent,
      strokeWidth: 1,
    })
  }

  /* Floating “z z” for the sleep mood; drawn only when needed. */
  const zzzFor = (cx, cy) => {
    if (mood !== 'sleep') return null
    return h('g', { key: 'zzz' },
      h('path', {
        className: 'aurora-pet-zzz',
        d: 'M' + cx + ' ' + cy + ' h6 l-6 7 h6',
        fill: 'none',
        stroke: accent,
        strokeWidth: 2.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        opacity: 0.9,
      }),
      h('path', {
        className: 'aurora-pet-zzz',
        style: { animationDelay: '0.8s' },
        d: 'M' + (cx + 9) + ' ' + (cy - 8) + ' h4 l-4 5 h4',
        fill: 'none',
        stroke: accent,
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        opacity: 0.7,
      })
    )
  }

  const shadowFor = (cx, cy, rx, ry) => h('ellipse', {
    key: 'shadow',
    className: 'aurora-pet-shadow',
    cx,
    cy,
    rx,
    ry,
    fill: 'currentColor',
    opacity: 0.16,
  })

  const stroke = (width) => ({ fill: 'none', stroke: outline, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' })

  /* ------------------------------------------------------------ characters */
  let defs = null
  let shadow = null
  let parts = null

  if (artId === 'cat') {
    /* Mochi — chibi cat: big head, tiny paws, a permanently happy tail. */
    const cream = mix('#fff8ef', bodyBase, 0.12)
    const innerEar = mix(bodyBase, '#ffb6c9', 0.62)
    const whisker = (x1, y1, x2, y2, key) => h('path', Object.assign({ key }, stroke(1.5), { d: 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2, opacity: 0.4 }))
    defs = h('defs', { key: 'defs' },
      h('linearGradient', { id: uid + '-fur', x1: '0.15', y1: '0', x2: '0.85', y2: '1' },
        h('stop', { offset: '0', stopColor: light }),
        h('stop', { offset: '0.55', stopColor: bodyBase }),
        h('stop', { offset: '1', stopColor: deep })
      )
    )
    shadow = shadowFor(60, 104, 26, 6)
    const eyes = eyesFor(49, 71, 53)
    parts = [
      /* tail */
      h('path', {
        key: 'tail',
        className: 'aurora-pet-tail',
        d: 'M82 86 C 95 91 106 82 102 72 C 99 65 90 67 91 75',
        fill: 'none',
        stroke: mix(bodyBase, '#3a2b52', 0.35),
        strokeWidth: 7,
        strokeLinecap: 'round',
      }),
      /* ears */
      h('path', { key: 'earL', d: 'M40 36 L34 13 Q33.5 9 38 11.5 L58 27 Z', fill: 'url(#' + uid + '-fur)', stroke: outline, strokeWidth: 2.4, strokeLinejoin: 'round' }),
      h('path', { key: 'earR', d: 'M80 36 L86 13 Q86.5 9 82 11.5 L62 27 Z', fill: 'url(#' + uid + '-fur)', stroke: outline, strokeWidth: 2.4, strokeLinejoin: 'round' }),
      h('path', { key: 'earInnerL', d: 'M42 31 L38.5 18.5 L51.5 27 Z', fill: innerEar, opacity: 0.9 }),
      h('path', { key: 'earInnerR', d: 'M78 31 L81.5 18.5 L68.5 27 Z', fill: innerEar, opacity: 0.9 }),
      /* body */
      h('ellipse', { key: 'torso', cx: 60, cy: 80, rx: 25, ry: 20, fill: 'url(#' + uid + '-fur)', stroke: outline, strokeWidth: 2.4 }),
      h('ellipse', { key: 'belly', cx: 60, cy: 84, rx: 14, ry: 12, fill: cream, opacity: 0.92 }),
      /* paws */
      h('ellipse', { key: 'pawL', cx: 47, cy: 97.5, rx: 9, ry: 5, fill: cream, stroke: outline, strokeWidth: 1.8 }),
      h('ellipse', { key: 'pawR', cx: 73, cy: 97.5, rx: 9, ry: 5, fill: cream, stroke: outline, strokeWidth: 1.8 }),
      /* head */
      h('circle', { key: 'head', cx: 60, cy: 54, r: 28, fill: 'url(#' + uid + '-fur)', stroke: outline, strokeWidth: 2.4 }),
      h('ellipse', { key: 'sheen', cx: 47, cy: 41, rx: 11, ry: 6, fill: '#ffffff', opacity: 0.24, transform: 'rotate(-22 47 41)' }),
      h('ellipse', { key: 'muzzle', cx: 60, cy: 66, rx: 12.5, ry: 8.5, fill: cream, opacity: 0.95 }),
      /* face */
      eyes[0],
      eyes[1],
      blushFor(39.5, 64, 'blushL'),
      blushFor(80.5, 64, 'blushR'),
      h('path', { key: 'nose', d: 'M57.4 61.4 Q60 59.4 62.6 61.4 Q60 64.8 57.4 61.4 Z', fill: '#ff8fa8' }),
      mouthFor(60, 70),
      whisker(31, 61, 17, 57, 'whiskL1'),
      whisker(31, 66, 16, 66, 'whiskL2'),
      whisker(31, 71, 18, 76, 'whiskL3'),
      whisker(89, 61, 103, 57, 'whiskR1'),
      whisker(89, 66, 104, 66, 'whiskR2'),
      whisker(89, 71, 102, 76, 'whiskR3'),
      zzzFor(85, 22),
    ]
  } else if (artId === 'ghost') {
    /* Boo — a soft little sheet ghost with a wavy hem and a bow. */
    const ghostBody = mix('#fbfaff', accent, 0.24)
    const ghostDeep = mix('#e6e0fa', accent, 0.5)
    const ghostOutline = mix(ghostDeep, '#5d4ea8', 0.55)
    const bow = mix(accent, '#ff8fb2', 0.35)
    defs = h('defs', { key: 'defs' },
      h('linearGradient', { id: uid + '-sheet', x1: '0', y1: '0', x2: '0', y2: '1' },
        h('stop', { offset: '0', stopColor: mix('#ffffff', ghostBody, 0.55) }),
        h('stop', { offset: '0.62', stopColor: ghostBody }),
        h('stop', { offset: '1', stopColor: ghostDeep })
      ),
      h('radialGradient', { id: uid + '-aura', cx: '50%', cy: '45%', r: '52%' },
        h('stop', { offset: '0', stopColor: accent, stopOpacity: 0.34 }),
        h('stop', { offset: '1', stopColor: accent, stopOpacity: 0 })
      )
    )
    shadow = shadowFor(60, 104, 20, 4.5)
    const eyes = eyesFor(50, 70, 52)
    parts = [
      h('ellipse', { key: 'aura', cx: 60, cy: 62, rx: 53, ry: 47, fill: 'url(#' + uid + '-aura)', opacity: 0.85 }),
      /* little arms, added before the sheet so they peek out */
      h('ellipse', { key: 'armL', className: 'aurora-pet-arm', cx: 27, cy: 62, rx: 6, ry: 9, fill: 'url(#' + uid + '-sheet)', stroke: ghostOutline, strokeWidth: 2, transform: 'rotate(20 27 62)' }),
      h('ellipse', { key: 'armR', className: 'aurora-pet-arm', cx: 93, cy: 62, rx: 6, ry: 9, fill: 'url(#' + uid + '-sheet)', stroke: ghostOutline, strokeWidth: 2, transform: 'rotate(-20 93 62)' }),
      /* sheet body */
      h('path', {
        key: 'sheet',
        d: 'M30 56 C30 34 43 18 60 18 C77 18 90 34 90 56 L90 80 Q82.5 92 75 80 Q67.5 92 60 80 Q52.5 92 45 80 Q37.5 92 30 80 Z',
        fill: 'url(#' + uid + '-sheet)',
        stroke: ghostOutline,
        strokeWidth: 2.4,
        strokeLinejoin: 'round',
      }),
      h('path', { key: 'sheen', d: 'M40 38 C44 30 52 25 60 25', fill: 'none', stroke: '#ffffff', strokeWidth: 4, strokeLinecap: 'round', opacity: 0.55 }),
      /* face */
      eyes[0],
      eyes[1],
      blushFor(40.5, 62, 'blushL'),
      blushFor(79.5, 62, 'blushR'),
      mouthFor(60, 66),
      /* bow on the top-right of the sheet */
      h('g', { key: 'bow', transform: 'rotate(-14 82 30)' },
        h('path', { d: 'M80 30 L72 24 L72 36 Z', fill: bow }),
        h('path', { d: 'M84 30 L92 24 L92 36 Z', fill: bow }),
        h('circle', { cx: 82, cy: 30, r: 3.2, fill: mix(bow, '#ffffff', 0.35) })
      ),
      h('circle', { key: 'wispA', cx: 54, cy: 96, r: 2.6, fill: accent, opacity: 0.3 }),
      h('circle', { key: 'wispB', cx: 68, cy: 100, r: 2, fill: accent, opacity: 0.22 }),
      zzzFor(86, 22),
    ]
  } else if (artId === 'robot') {
    /* Bolt — a rounded-cube robot with a glowing visor and a wobbling antenna. */
    const shell = mix('#f3f6fc', accent, 0.14)
    const shellShade = mix('#dfe4f2', accent, 0.22)
    const led = '#cdf8ff'
    defs = h('defs', { key: 'defs' },
      h('linearGradient', { id: uid + '-shell', x1: '0', y1: '0', x2: '0.4', y2: '1' },
        h('stop', { offset: '0', stopColor: mix(shell, '#ffffff', 0.5) }),
        h('stop', { offset: '0.6', stopColor: shell }),
        h('stop', { offset: '1', stopColor: shellShade })
      ),
      h('linearGradient', { id: uid + '-visor', x1: '0', y1: '0', x2: '0', y2: '1' },
        h('stop', { offset: '0', stopColor: '#2c3348' }),
        h('stop', { offset: '1', stopColor: '#191e2d' })
      ),
      h('radialGradient', { id: uid + '-ledGlow', cx: '50%', cy: '50%', r: '50%' },
        h('stop', { offset: '0', stopColor: '#7deaff', stopOpacity: 0.55 }),
        h('stop', { offset: '1', stopColor: '#7deaff', stopOpacity: 0 })
      )
    )
    shadow = shadowFor(60, 104, 24, 5.5)
    const screenEyes = eyesFor(50, 70, 47, { style: 'led', line: led })
    parts = [
      /* antenna behind the head */
      h('g', { key: 'antenna', className: 'aurora-pet-antenna' },
        h('path', { d: 'M60 30 L60 14', fill: 'none', stroke: outline, strokeWidth: 2.6, strokeLinecap: 'round' }),
        h('circle', { cx: 60, cy: 11, r: 8, fill: 'url(#' + uid + '-ledGlow)' }),
        h('circle', { cx: 60, cy: 11, r: 4.6, fill: accent, stroke: outline, strokeWidth: 2 })
      ),
      /* head */
      h('rect', { key: 'head', x: 30, y: 26, width: 60, height: 46, rx: 17, fill: 'url(#' + uid + '-shell)', stroke: outline, strokeWidth: 2.4 }),
      h('circle', { key: 'boltL', cx: 27, cy: 48, r: 4.6, fill: accent, stroke: outline, strokeWidth: 1.8 }),
      h('circle', { key: 'boltR', cx: 93, cy: 48, r: 4.6, fill: accent, stroke: outline, strokeWidth: 1.8 }),
      /* visor */
      h('rect', { key: 'visor', x: 39, y: 36, width: 42, height: 28, rx: 12, fill: 'url(#' + uid + '-visor)' }),
      h('path', { key: 'visorSheen', d: 'M44 40 Q50 37 60 37 Q70 37 76 40', fill: 'none', stroke: '#ffffff', strokeWidth: 2.4, strokeLinecap: 'round', opacity: 0.16 }),
      /* screen face */
      screenEyes[0],
      screenEyes[1],
      mouthFor(60, 54, { fill: led, stroke: led }),
      /* shell face + body */
      blushFor(41.5, 68.5, 'blushL'),
      blushFor(78.5, 68.5, 'blushR'),
      h('rect', { key: 'torso', x: 42, y: 72, width: 36, height: 26, rx: 13, fill: 'url(#' + uid + '-shell)', stroke: outline, strokeWidth: 2.4 }),
      h('rect', { key: 'panel', x: 51, y: 77, width: 18, height: 13, rx: 5, fill: accent, stroke: mix(accent, '#101225', 0.4), strokeWidth: 1.4 }),
      h('circle', { key: 'ledDot', className: 'aurora-pet-led', cx: 60, cy: 83.5, r: 2.8, fill: '#ffffff', opacity: 0.9 }),
      /* limbs */
      h('rect', { key: 'armL', x: 31, y: 74, width: 8, height: 19, rx: 4, fill: accent, stroke: outline, strokeWidth: 1.8, transform: 'rotate(16 35 76)' }),
      h('rect', { key: 'armR', x: 81, y: 74, width: 8, height: 19, rx: 4, fill: accent, stroke: outline, strokeWidth: 1.8, transform: 'rotate(-16 85 76)' }),
      h('rect', { key: 'footL', x: 46, y: 95, width: 11, height: 7, rx: 3.5, fill: accent, stroke: outline, strokeWidth: 1.8 }),
      h('rect', { key: 'footR', x: 63, y: 95, width: 11, height: 7, rx: 3.5, fill: accent, stroke: outline, strokeWidth: 1.8 }),
      zzzFor(86, 18),
    ]
  } else if (artId === 'star') {
    /* Twinkle — a rounded five-point star trailing a comet wisp. */
    const starPts = (cx, cy, outer, inner) => {
      let d = ''
      for (let index = 0; index < 10; index += 1) {
        const angle = -Math.PI / 2 + (index * Math.PI) / 5
        const radius = index % 2 === 0 ? outer : inner
        d += (index === 0 ? 'M' : 'L') + (cx + Math.cos(angle) * radius).toFixed(2) + ' ' + (cy + Math.sin(angle) * radius).toFixed(2)
      }
      return d + ' Z'
    }
    defs = h('defs', { key: 'defs' },
      h('linearGradient', { id: uid + '-star', x1: '0.2', y1: '0', x2: '0.8', y2: '1' },
        h('stop', { offset: '0', stopColor: mix(light, '#ffffff', 0.25) }),
        h('stop', { offset: '0.55', stopColor: bodyBase }),
        h('stop', { offset: '1', stopColor: deep })
      )
    )
    shadow = shadowFor(60, 105, 17, 4)
    const eyes = eyesFor(50, 70, 61)
    parts = [
      /* orbit ring + dots */
      h('g', { key: 'orbit', className: 'aurora-pet-orbit' },
        h('ellipse', { cx: 60, cy: 64, rx: 49, ry: 38, fill: 'none', stroke: accent, strokeWidth: 1.6, strokeDasharray: '2 9', opacity: 0.3 }),
        h('circle', { cx: 60, cy: 26, r: 2.8, fill: accent, opacity: 0.8 }),
        h('circle', { cx: 60, cy: 102, r: 2.2, fill: accent, opacity: 0.6 })
      ),
      /* ink swirl tail */
      h('path', {
        key: 'tail',
        className: 'aurora-pet-tail',
        d: 'M38 92 C 24 94 16 102 21 108',
        fill: 'none',
        stroke: mix(accent, '#ffffff', 0.12),
        strokeWidth: 5.5,
        strokeLinecap: 'round',
        opacity: 0.75,
      }),
      h('path', {
        key: 'tail2',
        className: 'aurora-pet-tail',
        d: 'M43 99 C 34 101 28 106 29 110',
        fill: 'none',
        stroke: accent,
        strokeWidth: 3,
        strokeLinecap: 'round',
        opacity: 0.4,
      }),
      /* star body */
      h('path', {
        key: 'star',
        d: starPts(60, 62, 41, 18.5),
        fill: 'url(#' + uid + '-star)',
        stroke: outline,
        strokeWidth: 2.6,
        strokeLinejoin: 'round',
      }),
      h('path', {
        key: 'starSheen',
        d: 'M44 44 Q52 32 62 34',
        fill: 'none',
        stroke: '#ffffff',
        strokeWidth: 3.4,
        strokeLinecap: 'round',
        opacity: 0.35,
      }),
      /* face */
      eyes[0],
      eyes[1],
      h('ellipse', { key: 'blushL', className: 'aurora-pet-blush', cx: 47, cy: 67, rx: 4.4, ry: 2.8, fill: blushColor, opacity: 0.5 }),
      h('ellipse', { key: 'blushR', className: 'aurora-pet-blush', cx: 73, cy: 67, rx: 4.4, ry: 2.8, fill: blushColor, opacity: 0.5 }),
      mouthFor(60, 73),
      sparkleFor(94, 34, 4.5, 'sparkA'),
      sparkleFor(29, 38, 3.4, 'sparkB', '0.7s'),
      sparkleFor(99, 76, 2.8, 'sparkC', '1.3s'),
      zzzFor(88, 22),
    ]
  } else if (artId === 'deepseek') {
    /* 大肥鱼 — the community's DeepSeek whale girl ("鲸鱼娘"). Shows the
       licensed transparent open/closed-eye artwork as-is (see
       assets/ATTRIBUTION.md) with a CSS blink and a sleep override, rather
       than a redrawn approximation. */
    const artHeight = 108
    const artWidth = artHeight * (382 / 520)
    const artX = (120 - artWidth) / 2
    const artY = 113 - artHeight
    const imageProps = {
      x: artX,
      y: artY,
      width: artWidth,
      height: artHeight,
      preserveAspectRatio: 'xMidYMax meet',
    }
    shadow = shadowFor(60, 113, 22, 4.8)
    defs = null
    if (typeof PET_IMAGE_DEEPSEEK_OPEN === 'string' && PET_IMAGE_DEEPSEEK_OPEN) {
      parts = [
        h('g', { key: 'whaleImages', className: 'aurora-pet-ds-images' },
          h('image', Object.assign({ key: 'open', className: 'aurora-pet-ds-open', href: PET_IMAGE_DEEPSEEK_OPEN }, imageProps)),
          h('image', Object.assign({ key: 'closed', className: 'aurora-pet-ds-closed', href: PET_IMAGE_DEEPSEEK_CLOSED }, imageProps))
        ),
        h('circle', { key: 'bubbleA', className: 'aurora-pet-bubble-float', cx: 103, cy: 42, r: 3.2, fill: '#dff1ff', opacity: 0.7 }),
        h('circle', { key: 'bubbleB', className: 'aurora-pet-bubble-float', style: { animationDelay: '1.3s' }, cx: 111, cy: 54, r: 2.2, fill: '#eaf6ff', opacity: 0.55 }),
        sparkleFor(104, 30, 3.6, 'sparkA'),
        zzzFor(88, 18),
      ]
    } else {
      /* Fallback if the generated asset fragment is missing: a plain badge. */
      const fallbackEyes = eyesFor(50, 70, 54, { fill: '#2f52e0', line: '#2f52e0' })
      parts = [
        h('ellipse', { key: 'fallbackBody', cx: 60, cy: 64, rx: 40, ry: 46, fill: '#4d6bfe', stroke: '#23327a', strokeWidth: 2.6 }),
        fallbackEyes[0],
        fallbackEyes[1],
        blushFor(42, 74, 'blushL'),
        blushFor(78, 74, 'blushR'),
        mouthFor(60, 78, { fill: '#1c2559', stroke: '#1c2559' }),
      ]
    }
  } else {
    /* Inky — a drop of living ink with a glowing face and an accent swirl. */
    const inkTop = mix('#3b3552', accent, 0.3)
    const inkBottom = mix('#211d33', accent, 0.1)
    const inkOutline = mix(inkBottom, '#000000', 0.35)
    const scarfEdge = mix(accent, '#101225', 0.42)
    defs = h('defs', { key: 'defs' },
      h('linearGradient', { id: uid + '-ink', x1: '0.25', y1: '0', x2: '0.75', y2: '1' },
        h('stop', { offset: '0', stopColor: inkTop }),
        h('stop', { offset: '0.55', stopColor: mix(inkTop, inkBottom, 0.6) }),
        h('stop', { offset: '1', stopColor: inkBottom })
      )
    )
    shadow = shadowFor(60, 104, 24, 5.5)
    const inkEyes = eyesFor(51, 69, 55, { style: 'spirit', line: '#f2edff' })
    parts = [
      /* ink swirl tail */
      h('path', {
        key: 'tail',
        className: 'aurora-pet-tail',
        d: 'M84 86 C 98 92 108 82 102 71 C 98 64 89 67 91 75',
        fill: 'none',
        stroke: accent,
        strokeWidth: 5.5,
        strokeLinecap: 'round',
      }),
      /* body */
      h('path', {
        key: 'inkBody',
        d: 'M60 17 C63 28 78 34 85 47 C90 56 91 66 88 76 C84 90 73 97 60 97 C47 97 36 90 32 76 C29 66 30 56 35 47 C42 34 57 28 60 17 Z',
        fill: 'url(#' + uid + '-ink)',
        stroke: inkOutline,
        strokeWidth: 2.4,
        strokeLinejoin: 'round',
      }),
      /* ahoge curl */
      h('path', {
        key: 'ahoge',
        className: 'aurora-pet-ahoge',
        d: 'M60 20 C 56 12 62 6 69 10 C 73 13 69 19 64 17',
        fill: 'none',
        stroke: mix(inkTop, '#ffffff', 0.22),
        strokeWidth: 3.4,
        strokeLinecap: 'round',
      }),
      h('ellipse', { key: 'sheen', cx: 48, cy: 43, rx: 14, ry: 10, fill: '#ffffff', opacity: 0.12, transform: 'rotate(-20 48 43)' }),
      h('path', { key: 'rim', d: 'M36 60 C34 72 38 84 46 92', fill: 'none', stroke: accent, strokeWidth: 3, strokeLinecap: 'round', opacity: 0.35 }),
      /* stubby arms + feet */
      h('ellipse', { key: 'armL', cx: 33, cy: 73, rx: 4.4, ry: 6.6, fill: inkBottom, stroke: inkOutline, strokeWidth: 1.8, transform: 'rotate(-18 33 73)' }),
      h('ellipse', { key: 'armR', cx: 87, cy: 73, rx: 4.4, ry: 6.6, fill: inkBottom, stroke: inkOutline, strokeWidth: 1.8, transform: 'rotate(18 87 73)' }),
      h('ellipse', { key: 'footL', cx: 50, cy: 97, rx: 8, ry: 4.5, fill: inkBottom, stroke: inkOutline, strokeWidth: 1.8 }),
      h('ellipse', { key: 'footR', cx: 70, cy: 97, rx: 8, ry: 4.5, fill: inkBottom, stroke: inkOutline, strokeWidth: 1.8 }),
      /* accent scarf */
      h('g', { key: 'scarf' },
        h('path', { d: 'M53 71 L49 87 L58 81 Z', fill: mix(accent, '#121026', 0.18) }),
        h('path', { d: 'M67 71 L71 87 L62 81 Z', fill: mix(accent, '#121026', 0.18) }),
        h('rect', { x: 46, y: 68.5, width: 28, height: 8, rx: 4, fill: accent, stroke: scarfEdge, strokeWidth: 1.6 })
      ),
      /* face */
      inkEyes[0],
      inkEyes[1],
      blushFor(41, 63, 'blushL'),
      blushFor(79, 63, 'blushR'),
      mouthFor(60, 61, { fill: '#f4efff', stroke: '#f4efff', tongue: '#ff9fb4' }),
      sparkleFor(30, 40, 4.2, 'sparkA'),
      sparkleFor(93, 47, 3.2, 'sparkB', '0.9s'),
      sparkleFor(88, 28, 2.4, 'sparkC', '1.6s'),
      zzzFor(85, 24),
    ]
  }

  const className = 'aurora-pet-art aurora-pet-char-' + artId + ' aurora-pet-mood-' + mood + (animated ? '' : ' aurora-pet-static')

  return h('svg', {
    viewBox: '0 0 120 120',
    width: px,
    height: px,
    className,
    xmlns: 'http://www.w3.org/2000/svg',
    role: label ? 'img' : undefined,
    'aria-label': label || undefined,
    'aria-hidden': label ? undefined : 'true',
    focusable: 'false',
    style: { display: 'block', overflow: 'visible' },
  },
  label ? h('title', { key: 'title' }, label) : null,
  defs,
  shadow,
  h('g', { key: 'body', className: 'aurora-pet-body' }, parts)
  )
}

/* -------------------------------------------------------------------------
 * Stylesheet: artwork animation + overlay chrome. Bubble/chrome colors are
 * `--dsw-alias-*` design tokens so the pet follows the active theme; the
 * artwork itself uses its own literal colors (tinted from the accent prop).
 * ---------------------------------------------------------------------- */
const PET_CSS = `
/* ---------- overlay layer ---------- */
.aurora-pet-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  font-family: var(--dsw-font-family, inherit);
  color: var(--dsw-alias-label-primary, #1f1f24);
}
.aurora-pet-layer *,
.aurora-pet-layer *::before,
.aurora-pet-layer *::after {
  box-sizing: border-box;
}
.aurora-pet-anchor {
  position: absolute;
  z-index: 1;
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  will-change: transform;
  transition: opacity 0.2s ease;
}
.aurora-pet-anchor:active { cursor: grabbing; }
.aurora-pet-anchor:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #7c6cf6);
  outline-offset: 4px;
  border-radius: var(--dsw-radius-lg, 16px);
}
.aurora-pet-anchor .aurora-pet-art { pointer-events: none; }
.aurora-pet-art {
  display: block;
  overflow: visible;
}
.aurora-pet-shadow {
  color: var(--dsw-alias-label-primary, #262232);
  transform-box: fill-box;
  transform-origin: center;
  animation: aurora-pet-shadow-breathe 3.4s var(--ds-ease-in-out, cubic-bezier(0.4, 0, 0.2, 1)) infinite;
}
.aurora-pet-body {
  transform-box: fill-box;
  transform-origin: 50% 92%;
  animation: aurora-pet-bob 3.4s var(--ds-ease-in-out, cubic-bezier(0.4, 0, 0.2, 1)) infinite;
}

/* ---------- shared face parts ---------- */
.aurora-pet-eye {
  transform-box: fill-box;
  transform-origin: center;
  animation: aurora-pet-blink 5.6s var(--ds-ease-in-out, cubic-bezier(0.4, 0, 0.2, 1)) infinite;
}
.aurora-pet-pupil {
  transform: translate(
    calc(var(--aurora-gaze-x, 0) * 2.2px),
    calc(var(--aurora-gaze-y, 0) * 1.6px)
  );
  transition: transform 0.18s var(--ds-ease-in-out, ease-out);
  transform-box: fill-box;
  transform-origin: center;
}
.aurora-pet-blush { transition: opacity 0.25s ease; }
.aurora-pet-mouth-talk { transform-box: fill-box; transform-origin: center; }
.aurora-pet-sparkle {
  transform-box: fill-box;
  transform-origin: center;
  animation: aurora-pet-twinkle 2.6s var(--ds-ease-in-out, ease-in-out) infinite;
}
.aurora-pet-tail {
  transform-box: fill-box;
  transform-origin: 6% 94%;
  animation: aurora-pet-tail-sway 2.8s var(--ds-ease-in-out, ease-in-out) infinite;
}
.aurora-pet-ds-images { pointer-events: none; }
.aurora-pet-char-deepseek .aurora-pet-ds-open,
.aurora-pet-char-deepseek .aurora-pet-ds-closed {
  filter: drop-shadow(0 7px 11px rgba(18, 22, 60, 0.26));
}
.aurora-pet-char-deepseek .aurora-pet-ds-closed {
  opacity: 0;
  animation: aurora-pet-ds-blink 6.4s var(--ds-ease-in-out, ease-in-out) infinite;
}
.aurora-pet-char-deepseek.aurora-pet-mood-sleep .aurora-pet-ds-open { opacity: 0; }
.aurora-pet-char-deepseek.aurora-pet-mood-sleep .aurora-pet-ds-closed { opacity: 1; animation: none; }

/* ---------- 大肥鱼 animated sprite (walk / idle / wave / jump strips) ------ */
.aurora-pet-sprite-root {
  display: block;
  position: relative;
}
/* Smooth the left/right mirror flip instead of snapping the whole frame. */
.aurora-pet-art-wrap {
  transition: transform 160ms var(--ds-ease-in-out, ease);
}
.aurora-pet-sprite-root::after {
  content: "";
  position: absolute;
  left: 15%;
  right: 15%;
  bottom: 0;
  height: 5%;
  border-radius: 50%;
  background: rgba(18, 22, 60, 0.24);
  filter: blur(2.6px);
  opacity: 0.34;
  pointer-events: none;
}
.aurora-pet-sprite-body {
  position: relative;
  width: 100%;
  height: 100%;
}
.aurora-pet-sprite-canvas {
  display: block;
}
/* Jump frames already carry the leap: don't add the SVG hop on top of them. */
.aurora-pet-char-deepseek.aurora-pet-art.aurora-pet-mood-happy .aurora-pet-sprite-body[data-action="jump"] {
  animation: none;
}
/* ---------- pet account chip / balance card ---------- */
.aurora-pet-account {
  position: absolute;
  left: 50%;
  top: calc(100% + 6px);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 4;
  pointer-events: none;
}
.aurora-pet-account > * { pointer-events: auto; }
.aurora-pet-account-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(20, 20, 40, 0.16));
  background: var(--dsw-alias-bg-overlay, #ffffff);
  color: var(--dsw-alias-label-secondary, #55556b);
  font: 10px/1 var(--dsw-font-family, inherit);
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--dsw-shadow-lv1, 0 2px 8px rgba(18, 18, 40, 0.14));
  transition: color 0.15s ease, background-color 0.15s ease;
}
.aurora-pet-account-label { font-variant-numeric: tabular-nums; }
.aurora-pet-account-chip:hover {
  color: var(--dsw-alias-label-primary, #1f1f24);
  background: var(--dsw-alias-bg-layer-2, #f7f7fb);
}
.aurora-pet-account-icon { flex: none; }
.aurora-pet-account-dot {
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dsw-alias-state-idle-primary, #9a9aa8);
  box-shadow: 0 0 0 1.5px var(--dsw-alias-bg-overlay, #ffffff);
}
.aurora-pet-account-dot[data-status="ready"] { background: var(--dsw-alias-state-success-primary, #19a974); }
.aurora-pet-account-dot[data-status="error"] { background: var(--dsw-alias-state-error-primary, #d93025); }
.aurora-pet-account-panel {
  position: absolute;
  bottom: calc(100% + var(--aurora-account-lift, 88px));
  left: 50%;
  transform: translateX(-50%);
  width: min(268px, calc(100vw - 40px));
  box-sizing: border-box;
  padding: 12px;
  border-radius: var(--dsw-radius-lg, 16px);
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(20, 20, 40, 0.16));
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  color: var(--dsw-alias-label-primary, #1f1f24);
  box-shadow: var(--dsw-elevation-prominent, 0 16px 44px rgba(15, 15, 35, 0.24));
  font: 12px/1.5 var(--dsw-font-family, inherit);
  text-align: left;
}
/* speech-bubble tail */
.aurora-pet-account-panel::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: 11px;
  height: 11px;
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  border-right: 0.5px solid var(--dsw-alias-border-l2, rgba(20, 20, 40, 0.16));
  border-bottom: 0.5px solid var(--dsw-alias-border-l2, rgba(20, 20, 40, 0.16));
  transform: translateX(-50%) rotate(45deg);
}
.aurora-pet-account-panel[data-align="right"] {
  left: auto;
  right: 0;
  transform: none;
}
.aurora-pet-account-panel[data-align="left"] {
  left: 0;
  right: auto;
  transform: none;
}
.aurora-pet-account-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.aurora-pet-account-section { margin-top: 2px; }
.aurora-pet-account-section + .aurora-pet-account-section {
  margin-top: 10px;
  padding-top: 9px;
  border-top: 0.5px solid var(--dsw-alias-border-l1, rgba(20, 20, 40, 0.08));
}
.aurora-pet-account-section-title {
  color: var(--dsw-alias-label-secondary, #55556b);
  font-size: 10px;
  letter-spacing: 0.03em;
  margin-bottom: 2px;
}
.aurora-pet-account-token-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
}
.aurora-pet-account-token-value {
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.aurora-pet-account-title {
  font-size: 13px;
  font-weight: 500;
}
.aurora-pet-account-close {
  border: 0;
  background: none;
  color: var(--dsw-alias-label-secondary, #55556b);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 2px 4px;
  border-radius: var(--dsw-radius-sm, 8px);
}
.aurora-pet-account-close:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(20, 20, 40, 0.06)); }
.aurora-pet-account-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0;
}
.aurora-pet-account-row-label { color: var(--dsw-alias-label-secondary, #55556b); }
.aurora-pet-account-row-value {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.aurora-pet-account-row-bonus .aurora-pet-account-row-value { color: var(--dsw-alias-state-success-primary, #0f9d58); }
.aurora-pet-account-links {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.aurora-pet-account-link {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  border-radius: var(--dsw-radius-md, 12px);
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(20, 20, 40, 0.16));
  color: var(--dsw-alias-label-primary, #1f1f24);
  text-decoration: none;
  font-size: 12px;
}
.aurora-pet-account-link:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(20, 20, 40, 0.06)); }
.aurora-pet-account-link-primary {
  border-color: transparent;
  background: var(--dsw-alias-brand-primary, #2b2b33);
  color: var(--dsw-alias-label-primary-foreground, #ffffff);
}
.aurora-pet-account-link-primary:hover { opacity: 0.88; background: var(--dsw-alias-button-primary-hover, #2b2b33); }
.aurora-pet-account-status { margin: 2px 0 4px; font-weight: 500; }
.aurora-pet-account-error { color: var(--dsw-alias-state-error-primary, #d93025); }
.aurora-pet-account-hint {
  margin: 4px 0 0;
  color: var(--dsw-alias-label-secondary, #55556b);
  font-size: 11px;
  line-height: 1.55;
}
.aurora-pet-account-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
}
.aurora-pet-account-btn {
  height: 26px;
  padding: 0 10px;
  border-radius: var(--dsw-radius-sm, 8px);
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(20, 20, 40, 0.16));
  background: none;
  color: var(--dsw-alias-label-primary, #1f1f24);
  font: 11px/1 var(--dsw-font-family, inherit);
  cursor: pointer;
}
.aurora-pet-account-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(20, 20, 40, 0.06)); }
.aurora-pet-account-btn:disabled { opacity: 0.55; cursor: default; }
.aurora-pet-account-updated { color: var(--dsw-alias-label-tertiary, #8a8a9a); font-size: 10px; }

/* ---------- comic speech-bubble remap (thick ink outline, hard shadow) ---------- */
.aurora-pet-account-chip {
  border: 1.5px solid var(--dsw-alias-label-primary, #1f1f24);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #1f1f24);
  box-shadow: 2px 2px 0 var(--dsw-alias-border-l4, rgba(20, 20, 40, 0.22));
  font-weight: 600;
  transform: rotate(-1deg);
}
.aurora-pet-account-chip:hover {
  background: var(--dsw-alias-bg-layer-2, #f7f7fb);
  transform: rotate(-1deg) translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--dsw-alias-border-l4, rgba(20, 20, 40, 0.22));
}
.aurora-pet-account-dot { border: 1.2px solid var(--dsw-alias-label-primary, #1f1f24); bottom: 0; right: 0; box-shadow: none; }
.aurora-pet-account-panel {
  padding: 14px;
  border: 2px solid var(--dsw-alias-label-primary, #1f1f24);
  border-radius: 18px 12px 20px 10px;
  background-color: var(--dsw-alias-bg-layer-1, #ffffff);
  background-image: radial-gradient(color-mix(in srgb, var(--dsw-alias-label-primary, #1f1f24) 7%, transparent) 1px, transparent 1.1px);
  background-size: 9px 9px;
  box-shadow: 5px 5px 0 color-mix(in srgb, var(--dsw-alias-label-primary, #1f1f24) 16%, transparent);
  transform: translateX(-50%) rotate(-0.7deg);
}
.aurora-pet-account-panel[data-align="right"] { transform: rotate(-0.7deg); }
.aurora-pet-account-panel[data-align="left"] { transform: rotate(0.7deg); }
/* ink tail: outer triangle + inset paper triangle */
.aurora-pet-account-panel::before,
.aurora-pet-account-panel::after {
  content: "";
  position: absolute;
  left: 50%;
  background: var(--dsw-alias-label-primary, #1f1f24);
  border: 0;
  transform: translateX(-50%);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}
.aurora-pet-account-panel::before {
  bottom: -15px;
  width: 24px;
  height: 16px;
}
.aurora-pet-account-panel::after {
  bottom: -10px;
  width: 15px;
  height: 11px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
}
.aurora-pet-account-panel[data-align="right"]::before,
.aurora-pet-account-panel[data-align="right"]::after {
  left: auto;
  right: 26px;
  transform: none;
}
.aurora-pet-account-panel[data-align="left"]::before,
.aurora-pet-account-panel[data-align="left"]::after {
  left: 26px;
  right: auto;
  transform: none;
}
.aurora-pet-account-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.aurora-pet-account-section + .aurora-pet-account-section {
  border-top: 1.5px dashed var(--dsw-alias-border-l3, rgba(20, 20, 40, 0.18));
}
.aurora-pet-account-section-title {
  color: var(--dsw-alias-label-primary, #1f1f24);
  font-weight: 700;
  letter-spacing: 0.06em;
  font-size: 10px;
}
.aurora-pet-account-close {
  border: 1.5px solid var(--dsw-alias-label-primary, #1f1f24);
  background: var(--dsw-alias-bg-overlay, #ffffff);
  color: var(--dsw-alias-label-primary, #1f1f24);
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  box-shadow: 2px 2px 0 var(--dsw-alias-border-l4, rgba(20, 20, 40, 0.22));
}
.aurora-pet-account-row-value { font-size: 16px; font-weight: 800; }
.aurora-pet-account-link,
.aurora-pet-account-btn {
  border: 1.5px solid var(--dsw-alias-label-primary, #1f1f24);
  border-radius: 9px;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  color: var(--dsw-alias-label-primary, #1f1f24);
  font-weight: 600;
  box-shadow: 2px 2px 0 var(--dsw-alias-border-l4, rgba(20, 20, 40, 0.22));
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.aurora-pet-account-link:hover,
.aurora-pet-account-btn:hover {
  background: var(--dsw-alias-bg-layer-2, #f7f7fb);
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--dsw-alias-border-l4, rgba(20, 20, 40, 0.22));
}
.aurora-pet-account-link-primary {
  border-color: var(--dsw-alias-label-primary, #1f1f24);
  background: var(--dsw-alias-brand-primary, #2b2b33);
  color: var(--dsw-alias-label-primary-foreground, #ffffff);
}
.aurora-pet-account-link-primary:hover {
  background: var(--dsw-alias-button-primary-hover, var(--dsw-alias-brand-primary, #2b2b33));
  color: var(--dsw-alias-label-primary-foreground, #ffffff);
}
.aurora-pet-account-hint { font-size: 11px; }

/* ---------- deeper comic treatment: wobbled ink layer, halftone, sticker ---------- */
.aurora-pet-account-panel {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
  background-image: none;
  box-shadow: none;
  font-family: "Segoe Print", "Comic Sans MS", "KaiTi", "STKaiti", var(--dsw-font-family, inherit);
}
.aurora-pet-account-content {
  position: relative;
  z-index: 2;
  padding: 15px 15px 13px;
}
.aurora-pet-account-ink {
  position: absolute;
  inset: 0;
  border: 3px solid var(--dsw-alias-label-primary, #1f1f24);
  border-radius: 20px 14px 22px 12px;
  background-color: var(--dsw-alias-bg-layer-1, #ffffff);
  background-image:
    radial-gradient(color-mix(in srgb, var(--dsw-alias-label-primary, #1f1f24) 11%, transparent) 1.1px, transparent 1.35px),
    repeating-linear-gradient(-38deg, transparent 0 8px, color-mix(in srgb, var(--dsw-alias-label-primary, #1f1f24) 4%, transparent) 8px 9px);
  background-size: 8px 8px, auto;
  box-shadow:
    4px 4px 0 color-mix(in srgb, var(--dsw-alias-label-primary, #1f1f24) 18%, transparent),
    9px 9px 0 color-mix(in srgb, var(--dsw-alias-label-primary, #1f1f24) 8%, transparent);
  filter: url(#aurora-pet-ink-wobble);
  pointer-events: none;
}
/* old card tail is replaced by the ink-layer tail */
.aurora-pet-account-panel::before,
.aurora-pet-account-panel::after { content: none; }
.aurora-pet-account-ink::before,
.aurora-pet-account-ink::after {
  content: "";
  position: absolute;
  left: 50%;
  background: var(--dsw-alias-label-primary, #1f1f24);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  transform: translateX(-50%);
}
.aurora-pet-account-ink::before {
  bottom: -19px;
  width: 30px;
  height: 20px;
}
.aurora-pet-account-ink::after {
  bottom: -13px;
  width: 19px;
  height: 14px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
}
.aurora-pet-account-panel[data-align="right"] .aurora-pet-account-ink::before,
.aurora-pet-account-panel[data-align="right"] .aurora-pet-account-ink::after {
  left: auto;
  right: 30px;
  transform: none;
}
.aurora-pet-account-panel[data-align="left"] .aurora-pet-account-ink::before,
.aurora-pet-account-panel[data-align="left"] .aurora-pet-account-ink::after {
  left: 30px;
  right: auto;
  transform: none;
}
.aurora-pet-account-sticker {
  position: absolute;
  z-index: 3;
  top: -18px;
  left: 50%;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 3px solid var(--dsw-alias-label-primary, #1f1f24);
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary, #2b2b33);
  color: var(--dsw-alias-label-primary-foreground, #ffffff);
  font-family: "Segoe Print", "Comic Sans MS", var(--dsw-font-family, inherit);
  font-size: 19px;
  font-weight: 800;
  line-height: 1;
  transform: translateX(-50%) rotate(10deg);
  box-shadow: 3px 3px 0 color-mix(in srgb, var(--dsw-alias-label-primary, #1f1f24) 20%, transparent);
  pointer-events: none;
}
.aurora-pet-account-filterdef {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}
.aurora-pet-account-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.02em;
  -webkit-text-stroke: 0.4px var(--dsw-alias-label-primary, #1f1f24);
  text-shadow: 1.5px 1.5px 0 color-mix(in srgb, var(--dsw-alias-label-primary, #1f1f24) 12%, transparent);
}
.aurora-pet-account-row-value { font-weight: 800; }

.aurora-pet-bubble-float {
  transform-box: fill-box;
  transform-origin: center;
  animation: aurora-pet-bubble-rise 4.6s var(--ds-ease-in-out, ease-in-out) infinite;
}
.aurora-pet-ahoge {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: aurora-pet-ahoge-sway 2.4s var(--ds-ease-in-out, ease-in-out) infinite;
}
.aurora-pet-antenna {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: aurora-pet-antenna-wiggle 2.2s var(--ds-ease-in-out, ease-in-out) infinite;
}
.aurora-pet-arm {
  transform-box: fill-box;
  transform-origin: 50% 8%;
  animation: aurora-pet-wave 3.2s var(--ds-ease-in-out, ease-in-out) infinite;
}
.aurora-pet-orbit {
  transform-box: fill-box;
  transform-origin: center;
  animation: aurora-pet-spin 16s linear infinite;
}
.aurora-pet-led {
  transform-box: fill-box;
  transform-origin: center;
  animation: aurora-pet-led-pulse 2.6s var(--ds-ease-in-out, ease-in-out) infinite;
}
.aurora-pet-zzz {
  transform-box: fill-box;
  transform-origin: center;
  animation: aurora-pet-zzz-float 2.8s var(--ds-ease-in-out, ease-in-out) infinite;
}

/* ---------- per-character idle personality ---------- */
.aurora-pet-char-ghost .aurora-pet-body {
  animation: aurora-pet-float 4.2s var(--ds-ease-in-out, ease-in-out) infinite;
}
.aurora-pet-char-star .aurora-pet-body {
  animation: aurora-pet-star-float 4s var(--ds-ease-in-out, ease-in-out) infinite;
}
.aurora-pet-char-ink .aurora-pet-tail { animation-duration: 2.2s; }
.aurora-pet-char-cat .aurora-pet-tail { animation-duration: 3.2s; transform-origin: 10% 92%; }
.aurora-pet-char-deepseek .aurora-pet-body {
  animation: aurora-pet-float 4.6s var(--ds-ease-in-out, ease-in-out) infinite;
}
/* Walking frames already carry the body motion: don't float on top of them. */
.aurora-pet-char-deepseek .aurora-pet-sprite-body[data-action="walk"] {
  animation: none;
}

/* ---------- mood states (more specific than the per-character rules) ---------- */
.aurora-pet-art.aurora-pet-mood-happy .aurora-pet-body {
  animation: aurora-pet-hop 0.62s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
}
.aurora-pet-art.aurora-pet-mood-happy .aurora-pet-shadow {
  animation: aurora-pet-shadow-hop 0.62s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
}
.aurora-pet-art.aurora-pet-mood-happy .aurora-pet-blush { opacity: 0.8; }
.aurora-pet-art.aurora-pet-mood-talk .aurora-pet-body {
  animation: aurora-pet-bob-talk 1.5s var(--ds-ease-in-out, ease-in-out) infinite;
}
.aurora-pet-art.aurora-pet-mood-talk .aurora-pet-mouth-talk {
  animation: aurora-pet-mouth-talk 0.24s ease-in-out infinite;
}
.aurora-pet-art.aurora-pet-mood-drag .aurora-pet-body {
  animation: aurora-pet-wobble 0.5s ease-in-out infinite;
}
.aurora-pet-art.aurora-pet-mood-drag .aurora-pet-shadow {
  animation: aurora-pet-shadow-wobble 0.5s ease-in-out infinite;
}
.aurora-pet-art.aurora-pet-mood-drag .aurora-pet-eye {
  animation: none;
  transform: scale(1.12);
}
.aurora-pet-art.aurora-pet-mood-sleep .aurora-pet-body {
  animation: aurora-pet-breathe 3.8s var(--ds-ease-in-out, ease-in-out) infinite;
}
.aurora-pet-art.aurora-pet-mood-sleep .aurora-pet-shadow {
  animation: aurora-pet-shadow-breathe 3.8s var(--ds-ease-in-out, ease-in-out) infinite;
}

/* ---------- speech bubble ---------- */
.aurora-pet-bubble-anchor {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 14px);
  transform: translateX(-50%);
  width: max-content;
  max-width: min(252px, calc(100vw - 40px));
  pointer-events: none;
  z-index: 2;
}
.aurora-pet-bubble-anchor[data-align="right"] { left: auto; right: 0; transform: none; }
.aurora-pet-bubble-anchor[data-align="left"] { left: 0; transform: none; }
.aurora-pet-bubble-anchor[data-flip="below"] { bottom: auto; top: calc(100% + 14px); }
.aurora-pet-bubble {
  position: relative;
  display: block;
  padding: 9px 13px;
  border-radius: var(--dsw-radius-xl, 16px);
  background: var(--dsw-alias-bg-overlay, #ffffff);
  border: 0.5px solid var(--dsw-alias-border-l2, rgba(24, 20, 40, 0.12));
  box-shadow: var(--dsw-shadow-lv3, 0 10px 28px rgba(20, 16, 40, 0.18));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(18px) saturate(150%));
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(18px) saturate(150%));
  color: var(--dsw-alias-label-primary, #1f1f24);
  font-family: var(--dsw-font-family, inherit);
  font-size: 13px;
  line-height: 1.5;
  letter-spacing: 0.01em;
  text-align: left;
  white-space: normal;
  overflow-wrap: break-word;
  transform-origin: 50% 100%;
  animation: aurora-pet-bubble-pop 0.34s var(--ds-ease-in-out, cubic-bezier(0.4, 0, 0.2, 1)) both;
}
.aurora-pet-bubble-anchor[data-flip="below"] .aurora-pet-bubble { transform-origin: 50% 0%; }
.aurora-pet-bubble::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -5px;
  width: 10px;
  height: 10px;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  border-right: 0.5px solid var(--dsw-alias-border-l2, rgba(24, 20, 40, 0.12));
  border-bottom: 0.5px solid var(--dsw-alias-border-l2, rgba(24, 20, 40, 0.12));
  transform: translateX(-50%) rotate(45deg);
  border-bottom-right-radius: 2px;
}
.aurora-pet-bubble-anchor[data-align="right"] .aurora-pet-bubble::after {
  left: auto;
  right: 16px;
  transform: rotate(45deg);
}
.aurora-pet-bubble-anchor[data-align="left"] .aurora-pet-bubble::after {
  left: 16px;
  transform: rotate(45deg);
}
.aurora-pet-bubble-anchor[data-flip="below"] .aurora-pet-bubble::after {
  bottom: auto;
  top: -5px;
  border-right: 0;
  border-bottom: 0;
  border-left: 0.5px solid var(--dsw-alias-border-l2, rgba(24, 20, 40, 0.12));
  border-top: 0.5px solid var(--dsw-alias-border-l2, rgba(24, 20, 40, 0.12));
  border-bottom-right-radius: 0;
  border-top-left-radius: 2px;
}
.aurora-pet-bubble-name {
  color: var(--dsw-alias-brand-primary, #7c6cf6);
  font-weight: 600;
  margin-right: 5px;
}
.aurora-pet-bubble-text { color: var(--dsw-alias-label-primary, #1f1f24); }

/* ---------- happy heart ---------- */
.aurora-pet-heart {
  position: absolute;
  top: 2px;
  right: -4px;
  width: 18px;
  height: 18px;
  color: #ff6f91;
  pointer-events: none;
  filter: drop-shadow(0 2px 5px rgba(255, 111, 145, 0.35));
  animation: aurora-pet-heart-float 1.15s ease-out both;
  z-index: 2;
}
.aurora-pet-heart svg { display: block; overflow: visible; }

/* ---------- keyframes ---------- */
@keyframes aurora-pet-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2.6px); }
}
@keyframes aurora-pet-bob-talk {
  0%, 100% { transform: translateY(0) rotate(-0.6deg); }
  50% { transform: translateY(-1.6px) rotate(0.6deg); }
}
@keyframes aurora-pet-blink {
  0%, 90%, 94%, 100% { transform: scaleY(1); }
  92%, 96% { transform: scaleY(0.08); }
}
@keyframes aurora-pet-shadow-breathe {
  0%, 100% { transform: scaleX(1); opacity: 0.16; }
  50% { transform: scaleX(0.94); opacity: 0.11; }
}
@keyframes aurora-pet-shadow-hop {
  0%, 100% { transform: scaleX(1); opacity: 0.16; }
  30% { transform: scaleX(0.78); opacity: 0.09; }
  60% { transform: scaleX(1.04); opacity: 0.18; }
}
@keyframes aurora-pet-shadow-wobble {
  0%, 100% { transform: translateX(-2px) scaleX(1); opacity: 0.15; }
  50% { transform: translateX(2px) scaleX(0.94); opacity: 0.12; }
}
@keyframes aurora-pet-hop {
  0%, 100% { transform: translateY(0) rotate(0); }
  32% { transform: translateY(-8px) rotate(-2.5deg); }
  58% { transform: translateY(0) rotate(2deg); }
  74% { transform: translateY(-2px) rotate(0); }
}
@keyframes aurora-pet-wobble {
  0%, 100% { transform: rotate(-3.5deg); }
  50% { transform: rotate(3.5deg); }
}
@keyframes aurora-pet-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.025); }
}
@keyframes aurora-pet-float {
  0%, 100% { transform: translateY(1.5px); }
  50% { transform: translateY(-5px); }
}
@keyframes aurora-pet-star-float {
  0%, 100% { transform: translateY(1.5px) rotate(-2deg); }
  50% { transform: translateY(-4.5px) rotate(2deg); }
}
@keyframes aurora-pet-tail-sway {  0%, 100% { transform: rotate(-6deg); }
  50% { transform: rotate(8deg); }
}
@keyframes aurora-pet-ahoge-sway {
  0%, 100% { transform: rotate(-8deg); }
  50% { transform: rotate(7deg); }
}
@keyframes aurora-pet-antenna-wiggle {
  0%, 100% { transform: rotate(-7deg); }
  50% { transform: rotate(7deg); }
}
@keyframes aurora-pet-wave {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(-14deg); }
}
@keyframes aurora-pet-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes aurora-pet-twinkle {
  0%, 100% { transform: scale(0.7); opacity: 0.35; }
  50% { transform: scale(1.15); opacity: 1; }
}
@keyframes aurora-pet-led-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes aurora-pet-zzz-float {
  0% { transform: translate(0, 0); opacity: 0.15; }
  35% { opacity: 0.85; }
  100% { transform: translate(5px, -9px); opacity: 0; }
}
@keyframes aurora-pet-mouth-talk {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.35); }
}
@keyframes aurora-pet-bubble-pop {
  0% { opacity: 0; transform: scale(0.72) translateY(8px); }
  55% { opacity: 1; transform: scale(1.04) translateY(0); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes aurora-pet-heart-float {
  0% { opacity: 0; transform: translate(0, 5px) scale(0.5); }
  25% { opacity: 1; transform: translate(1px, 0) scale(1); }
  100% { opacity: 0; transform: translate(11px, -18px) scale(1.1); }
}
@keyframes aurora-pet-ds-blink {
  0%, 91%, 100% { opacity: 0; }
  92%, 96% { opacity: 1; }
}
@keyframes aurora-pet-bubble-rise {
  0% { transform: translateY(0) scale(0.9); opacity: 0; }
  30% { opacity: 0.7; }
  100% { transform: translateY(-20px) scale(1.06); opacity: 0; }
}

/* ---------- animation opt-outs ---------- */
.aurora-pet-static,
.aurora-pet-static *,
.aurora-pet-layer[data-animations="off"] *,
[data-aurora-animations="off"] .aurora-pet-art * {
  animation: none !important;
  transition: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .aurora-pet-art,
  .aurora-pet-art *,
  .aurora-pet-bubble,
  .aurora-pet-heart {
    animation: none !important;
    transition: none !important;
  }
}
`
