/** Verify the inlined data URLs byte-match the generated WebP assets. */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const root = new URL('../', import.meta.url)

function chunksOf(source, name) {
  const start = source.indexOf('const ' + name)
  if (start < 0) throw new Error(name + ' not found')
  const next = source.indexOf('const ', start + 10)
  const section = source.slice(start, next > 0 ? next : undefined)
  return [...section.matchAll(/'([A-Za-z0-9+/=]+)'/g)].map((match) => match[1]).join('')
}

function verify(sourceFile, checks) {
  const source = readFileSync(new URL(sourceFile, root), 'utf8')
  let ok = true
  for (const [constant, file] of checks) {
    const data = Buffer.from(chunksOf(source, constant), 'base64')
    const asset = readFileSync(new URL(file, root))
    const hash = createHash('sha256').update(data).digest('hex').slice(0, 16)
    const equal = data.equals(asset)
    console.log(constant, 'bytes=' + data.length, 'asset=' + asset.length, 'equal=' + equal, 'sha=' + hash)
    if (!equal) ok = false
  }
  return ok
}

const imageOk = verify('src/05-pet-image.js', [
  ['PET_IMAGE_DEEPSEEK_OPEN', 'assets/whale-girl-open.webp'],
  ['PET_IMAGE_DEEPSEEK_CLOSED', 'assets/whale-girl-closed.webp'],
])
const spriteOk = verify('src/07-pet-sprites.js', [
  ['PET_SPRITE_IDLE', 'assets/sprite-idle.webp'],
  ['PET_SPRITE_WALK', 'assets/sprite-walk.webp'],
  ['PET_SPRITE_WAVE', 'assets/sprite-wave.webp'],
  ['PET_SPRITE_JUMP', 'assets/sprite-jump.webp'],
])
if (!imageOk || !spriteOk) process.exitCode = 1
