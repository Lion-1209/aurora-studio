/**
 * Static acceptance checks for the Aurora Studio bundle.
 *
 * Run after `node build.mjs`:
 *   node verify.mjs
 *
 * It checks the generated artifact's structure, the single-scope declaration
 * contract, forbidden DOM/runtime patterns, display metadata and the manifest.
 * It does not and cannot verify rendering (no browser control).
 */
import { existsSync, readFileSync, statSync } from 'node:fs'

const root = new URL('./', import.meta.url)
const failures = []
const notes = []

function read(relative) {
  return readFileSync(new URL(relative, root), 'utf8')
}

function fail(message) { failures.push(message) }
function note(message) { notes.push(message) }

/* ------------------------------------------------------------- manifest */

const pkg = JSON.parse(read('package.json'))
if (pkg.name !== '@local/aurora-studio') fail('package.json name is ' + pkg.name)
if (!pkg.dsh || !pkg.dsh.bundle || pkg.dsh.bundle.patch !== './cordis.patch.yml') fail('package.json missing dsh.bundle.patch')
if (!pkg.dsh || !pkg.dsh.client || pkg.dsh.client.platform !== 'web') fail('package.json missing web dsh.client')
if (!pkg.dsh.client.immediately) fail('dsh.client.immediately should be true')
if (!pkg.exports || pkg.exports['./client'] !== './client.js') fail('exports missing ./client')
for (const part of ['index.js', 'client.js', 'cordis.patch.yml', 'icon.svg']) {
  if (!existsSync(new URL(part, root))) fail('missing file: ' + part)
}
const patch = read('cordis.patch.yml')
if (!/id:\s*aurora-studio/.test(patch) || !/name:\s*'@local\/aurora-studio'/.test(patch)) fail('cordis.patch.yml row looks wrong')

/* ------------------------------------------------------------- locales */

for (const locale of ['en', 'zh']) {
  const file = 'locale/' + locale + '.json'
  let data
  try { data = JSON.parse(read(file)) } catch (error) { fail(file + ' is not valid JSON: ' + error.message); continue }
  if (!data.meta || !data.meta.title || !data.meta.description) fail(file + ' missing meta.title / meta.description')
}

/* ----------------------------------------------------------------- icon */

if (existsSync(new URL('icon.svg', root))) {
  const size = statSync(new URL('icon.svg', root)).size
  if (size > 256 * 1024) fail('icon.svg exceeds 256 KiB (' + size + ' bytes)')
  const icon = read('icon.svg')
  if (!/^\s*<svg[\s>]/i.test(icon)) fail('icon.svg does not start with an <svg> root')
  if (/<script/i.test(icon)) fail('icon.svg contains a script')
  if (/\son\w+\s*=/i.test(icon)) fail('icon.svg contains inline event handlers')
  note('icon.svg: ' + size + ' bytes')
}

/* ------------------------------------------------------------- artifact */

const artifact = read('client.js')

if (!/window\.__ModuleLoader__\.load\(\{/.test(artifact)) fail('client.js is not a module-loader artifact')
if (!/id:\s*'@local\/aurora-studio'/.test(artifact) && !/id:\s*"@local\/aurora-studio"/.test(artifact)) fail('client.js id does not match package name')
if (!/factory\(require\)/.test(artifact)) fail('client.js factory signature missing')

const DECLARATIONS = [
  'PLUGIN_ID', 'STORAGE_KEY', 'DEFAULT_SETTINGS', 'store', 'useSettings', 'RUNTIME',
  'createAuroraRuntime', 'computeThemeOverrides', 'computeWallpaperCss',
  'PET_CHARACTERS', 'petCharacterLabel', 'PetArt', 'PET_CSS', 'PetOverlay',
  'studioNavLabel', 'StudioSettingsView', 'STUDIO_CSS', 'apply',
]
for (const name of DECLARATIONS) {
  const pattern = new RegExp('^(?:const|let|var|function|class)\\s+' + name + '\\b', 'gm')
  const count = (artifact.match(pattern) || []).length
  if (count !== 1) fail('symbol ' + name + ' should be declared exactly once, found ' + count)
}

/* forbidden patterns */
const FORBIDDEN = [
  [/(^|\n)\s*(?:import|export)\s/m, 'ESM import/export inside a plain-JS client module'],
  [/document\.body/, 'document.body access (overlay/DOM writes are not allowed)'],
  [/customElements\.define/, 'custom elements'],
  [/<script/i, 'inline script string'],
  [/\bfetch\(/, 'network fetch from the plugin'],
  [/@deepseek-ai\/dsh-client-/g, 'Harness Client package import reference'],
]
for (const [pattern, reason] of FORBIDDEN) {
  if (pattern.test(artifact)) fail('forbidden pattern: ' + reason)
}

/* require() must only be the artifact's own react require */
const requires = [...artifact.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)].map((match) => match[1])
const unexpectedRequires = requires.filter((id) => id !== 'react')
if (unexpectedRequires.length > 0) fail('unexpected require() targets: ' + unexpectedRequires.join(', '))

/* CSS class namespacing (rough): every aurora-studio- class should be prefixed */
const studioClasses = [...artifact.matchAll(/\.aurora-studio-([a-zA-Z0-9_-]+)/g)].map((m) => m[1])
if (studioClasses.length === 0) fail('STUDIO_CSS has no .aurora-studio-* classes')
const petClasses = [...artifact.matchAll(/\.aurora-pet-([a-zA-Z0-9_-]+)/g)].map((m) => m[1])
if (petClasses.length === 0) fail('PET_CSS has no .aurora-pet-* classes')

/* token usage sanity: chrome colors should come from --dsw tokens */
if (artifact.indexOf('--dsw-alias-') < 0) fail('artifact never references --dsw-alias-* tokens')

/* sizes */
note('client.js: ' + artifact.length + ' bytes, ' + artifact.split('\n').length + ' lines')

/* --------------------------------------------------------------- report */

note('studio CSS classes: ' + studioClasses.length + ', pet CSS classes: ' + petClasses.length)
for (const line of notes) console.log('note: ' + line)
if (failures.length > 0) {
  for (const line of failures) console.error('FAIL: ' + line)
  console.error('\nverify: ' + failures.length + ' failure(s)')
  process.exit(1)
}
console.log('\nverify: all static checks passed')
