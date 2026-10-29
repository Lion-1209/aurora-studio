# Aurora Studio — independent pre-install integration review

Reviewer: api-scout (task-4, independent). Date: 2026-10-29. Read-only review — no plugin file was edited.
Verification artifacts: `research/_review-harness.mjs` (61 runtime checks, run with `node research/_review-harness.mjs`).

**Reviewed snapshot** (files were still being edited until 10:22:17; this review covers the tree below. The tree
moved twice mid-review — `icon.svg` appeared at 10:18:05 and `src/40-pet-art.js` changed again at 10:22:17 — and
after each change the build/check/verify gate and the 61-check harness were re-run from scratch. Hashes below are
the final reviewed state; `client.js` is the artifact rebuilt from exactly these fragments):

| file | bytes | sha256 (first 16) |
|---|---|---|
| `client.js` (rebuilt by this review) | 185962 | `E08E33B81132D7AC` |
| `src/00-core.js` | 10738 | `F6334DBABF5A933A` |
| `src/10-store.js` | 11126 | `4268BBFC32254530` |
| `src/20-theme.js` | 3753 | `6EAB756CC77F2E06` |
| `src/25-background.js` | 3847 | `624D7AB7293BAC35` |
| `src/40-pet-art.js` | 39678 | `C211B9C238B38D77` |
| `src/45-pet.js` | 17816 | `4E42D5C5FC559FDD` |
| `src/50-settings-view.js` | 70983 | `31E5F6E8453DDE76` |
| `src/55-settings-css.js` | 23776 | `155C1B378B9D687C` |
| `src/90-apply.js` | 6045 | `B39F01161CD14DEB` |
| `icon.svg` | 3045 | `341DFFBCA97FB6F1` |

If anything above changes before install, re-run §1 and the harness. The 10:22:17 `40-pet-art.js` delta is artwork
polish only (PetArt/PET_CSS structure unchanged; `node --check` + `verify` + harness pass).

---

## 1. Build / check / verify gate — PASS

Commands run from `C:\Users\SINORAD\Desktop\test\aurora-studio`:

```
node build.mjs      -> build: wrote client.js (185962 bytes, 5389 lines)               [exit 0]
node --check client.js -> (no output)                                                 [exit 0]
node verify.mjs     -> note: icon.svg: 3045 bytes
                       note: client.js: 185962 bytes, 5389 lines
                       note: studio CSS classes: 148, pet CSS classes: 88
                       verify: all static checks passed                               [exit 0]
node research/_review-harness.mjs -> harness: all 61 checks passed                    [exit 0]
```

`verify.mjs` previously failed only with `FAIL: missing file: icon.svg`; that is now resolved (icon present and
passing the size/SVG-root/script/handler checks). Install prerequisites from the plugin-dev checklist are met:
`dsh.bundle.patch` (`package.json:21`), `dsh.client` web + `immediately` (`:22-30`), `exports ./client`,
`./locale/*.json`, `./icon` (`:7-12`), `files` includes all shipped runtime files (`:13-19`), both locale files
carry `meta.title`/`meta.description`, `cordis.patch.yml` row is correct, Host `index.js` exports `apply`.
Icon *rendering* is unverified (valid path/bytes only).

---

## 2. Verdict

- **Blockers: none found.** The one hard blocker class from my earlier notes (overlay layer swallowing every
  click) is **confirmed fixed** — inline style is present (`src/45-pet.js:438-445`) and the harness proves the
  full apply/sync/dispose lifecycle runs without throwing.
- **Should-fix: 12** (visual/behaviour defects and policy violations; none prevents activation).
- **Nitpicks: 7.**
- Not testable without browser control: see §7.

---

## 3. Blockers

None. Two previously flagged risks are resolved / downgraded:

1. **Overlay hit testing — RESOLVED.** `PetOverlay` root now carries `style: { pointerEvents: 'none' }` inline
   (`45-pet.js:438-445`), which beats the host's `.overlayLayer > * { pointer-events:auto }` regardless of
   stylesheet order. The anchor re-enables `pointer-events:auto` in PET_CSS (`40-pet-art.js:620-623`).
2. **`styles.insert` — RESOLVED.** No reference remains; styles are owned `<style data-plugin>` tags removed in
   `ctx.effect` cleanup (`90-apply.js:13-37,129-148`); harness confirms all tags are removed on dispose and
   `overrideTokens` layers disposed.

---

## 4. Should-fix (ordered by impact)

### S1 — Exporting/rendering settings serialises the full uploaded image (UI stall, multi-MB textarea)
`50-settings-view.js:1606` `const exportText = React.useMemo(() => JSON.stringify(settings, null, 2), [settings])`
and `:1802` binds it to a `<textarea>`. With an uploaded wallpaper (`imageData` up to 3.6M chars,
`50:243`) opening the Advanced tab stringifies/store-renders megabytes, and the memo recomputes on **every**
settings change while that tab is open (e.g. typing custom CSS, pet drags from another surface).
**Fix**: omit the data URL from the exported text and state its size, e.g.
```js
const exportText = React.useMemo(() => {
  const bg = settings.background || {}
  const omitted = typeof bg.imageData === 'string' ? bg.imageData.length : 0
  const copy = { ...settings, background: { ...bg, imageData: '' } }
  if (omitted > 0) copy.background.imageDataOmitted = omitted + ' chars'
  return JSON.stringify(copy, null, 2)
}, [settings])
```
(or compute lazily on Copy/Download click). Import already tolerates a missing `imageData`.

### S2 — Light-mode accent foreground contrast is too low on primary controls (a11y)
`00-core.js:99-109` (`ensureAccentContrast`) only darkens light accents above luma 0.58, then
`20-theme.js:52,63` maps it to `--dsw-alias-brand-primary`; host primary fills become the accent, but
`--dsw-alias-label-primary-foreground` stays `#ffffff` in light mode. Measured contrast (white text on accent):
aurora 3.94 · glacier 2.61 · sakura 3.04 · forest 2.34 · sunset 2.45 · midnight 4.47 · graphite 4.83 ·
cyber 2.99 · quick green 2.28 · amber 2.15 · teal 2.49 — most fail WCAG AA (4.5) and several fail the 3.0 UI
threshold. Also `--dsw-alias-button-primary-hover` keeps the neutral host value (light `#43454a`), so a purple
button hovers to dark grey (`20-theme.js` sets only fill via brand).
**Fix** in `computeThemeOverrides` (both modes):
```js
const brand = ensureAccentContrast(accent, mode)
const onBrand = relativeLuminance(brand) > 0.32 ? '#0f1115' : '#ffffff'
perMode[mode]['--dsw-alias-label-primary-foreground'] = onBrand
perMode[mode]['--dsw-alias-button-primary-hover'] = mixColor(brand, mode === 'light' ? '#000000' : '#ffffff', 0.16)
```
and/or darken light brand harder (mix 0.22 toward `#000000`) so white text reaches ~4.5.

### S3 — `body { background: transparent !important }` global override
`25-background.js:73`. It is the only non-motion `!important` in plugin chrome (policy: INTERFACES:212 "no
`!important` except where unavoidable"; the `prefers-reduced-motion` rules at `25:81-83`, `40:952-968`,
`55:1041-1053` are the allowed ones). It also removes the body tint that the host theme paints from
`--dsw-alias-bg-base` and can change host `theme-color` (computed from body background).
The wallpaper does not need it: `html::before{z-index:-1}` paints above the html background and below body, and
the token override already makes body/frame translucent.
**Fix**: delete the rule (or scope it to `body:has(> #root)` — unnecessary). Keep `html{background-color}` fallback.

### S4 — Hex input commits partial 3-digit values while typing (visible global theme flicker)
`50-settings-view.js:961-970`: `studioNormalizeHex('#ff0')` expands to `#ffff00`, so typing a 6-digit value
commits an intermediate wrong accent (the whole host re-themes for a frame) and marks `theme.preset='custom'`.
**Fix**: commit during typing only for a completed 6-digit value (and never for 3-digit expansion):
```js
const handleHexChange = (event) => {
  const nextValue = event.target.value
  setHexDraft(nextValue)
  if (/^#[0-9a-fA-F]{6}$/.test(nextValue)) { setHexError(''); applyAccent(nextValue) }
  else setHexError('')
}
```
keep 3-digit expansion for blur / the native color input.

### S5 — Global animations toggle does not stop the studio page's own animations
`50-settings-view.js:1403` gates only the pet preview's `animated` prop; the settings root
(`50:1946`) has no `data-animations` marker, while STUDIO_CSS still animates `.aurora-studio-live-dot`
(`55:88,1031-1034`) and `.aurora-studio-panel` (`55:161,1036-1039`). INTERFACES:96 says the toggle globally
disables our CSS animations.
**Fix**: add `'data-animations': settings.advanced && settings.advanced.animations === false ? 'off' : 'on'`
on the root div (`50:1945-1950`) and append to STUDIO_CSS:
```css
.aurora-studio-root[data-animations="off"] *,
.aurora-studio-root[data-animations="off"] *::before,
.aurora-studio-root[data-animations="off"] *::after {
  animation: none !important;
  transition: none !important;
}
```

### S6 — Image size cap does not match the real localStorage quota; import has no cap at all
- Upload cap is 3.6M **characters** (`50:243`, checked at `50:1192`), but Chromium counts localStorage as UTF-16
  (~5 MB ⇒ ≈2.5M chars). A 2.6–3.6M-char JPEG passes the check, then `store.set` persist throws; the UI does
  recover (restores previous image + shows `storageFull`, `50:1196-1201`), but the designed cap is misleading.
- Import validation (`50:543-547`) accepts **any** `data:image/` length; `sanitizeSettings` silently drops it only
  above 6M chars (`10:44,82`), and `imageUrl`/`customCss` are silently truncated at 2048/60000 chars
  (`10:105,125`) after the import reports success.

**Fix**: cap by encoded size, e.g. `if (JSON.stringify({...}).length > 2_200_000)` / `new Blob([dataUrl]).size`,
and validate lengths in `studioSanitizeImport` for `imageData` (≤ same cap), `imageUrl` (≤2048),
`customCss` (≤60000) with `invalid(...)` instead of silent truncation.

### S7 — localStorage write on every `store.set` (jank with a wallpaper image)
`10-store.js:156-164,168-173` serialises the whole state and writes on every patch. Sliders call `store.set`
on every `input` event (e.g. `50:1106` theme surface opacity; same pattern in the background/pet sliders) and pet
position is written on pointerup; with a ~1MB data URL that is a full-state stringify + sync write per tick.
**Fix**: debounce persistence (e.g. 250 ms trailing) with an immediate flush on `visibilitychange`/unload, or
persist on `change`/pointerup only; the in-memory store can stay synchronous.

### S8 — `refreshTheme` re-renders subscribers on every `theme/change`, including its own override publishes
`10-store.js:323-329` calls `emit(themeListeners)` unconditionally, unlike `refreshLocale` (`:330-336`) which gates
on `changed`. Every slider tick triggers `overrideTokens` → `theme/change` → a settings-page `setState`, on top of
the store-driven render.
**Fix**: `if (changed) emit(themeListeners)`.

### S9 — Surface-opacity also thins popovers, menus and the settings modal itself
`20-theme.js:57-59`: at the minimum `surfaceOpacity` 0.55, `--dsw-alias-bg-overlay` = 0.65 alpha and
`--dsw-alias-bg-layer-2` = 0.62 alpha. Menus/popovers (bg-overlay) and the settings panel (bg-layer-2,
`EXTRACT/settings-root.css:49-60`) then show the wallpaper through text content.
**Fix**: floor the chrome surfaces, e.g.
`bg-overlay = Math.max(0.92, baseAlpha + 0.1)`, `bg-layer-2 = Math.max(0.85, baseAlpha + 0.07)`,
`bg-layer-1 = Math.max(0.88, baseAlpha + 0.05)`; leave `bg-base`/`sidebar` free to go transparent (that is
where the feature reads best).

### S10 — Pet opacity also fades the speech bubble and heart (unreadable at low opacity)
`45-pet.js:407` puts `opacity: opacityValue` on `.aurora-pet-anchor`, and the bubble/heart are children of the
anchor (`45:463-466`), so `pet.opacity=0.3` renders the bubble at 0.3.
**Fix**: wrap only `PetArt` (and the anchor's hit area) in the opacity, or set `opacity: 1` on
`.aurora-pet-bubble-anchor`/`.aurora-pet-heart` (they already sit in a separate stacking layer).

### S11 — Tabs advertise panels that are not mounted (a11y)
`50:1931-1935` gives every tab `aria-controls="aurora-studio-panel-<id>"`, but only the active panel exists
(`50:1975`). Screen readers get a dangling reference for 3 of 4 tabs.
**Fix**: render all four panels with `hidden` (and keep the current `role="tabpanel"`), or drop `aria-controls`
and use `aria-selected` + roving tabIndex only.

### S12 — JPEG re-encode turns transparent PNG wallpapers black
`50:421-437` draws onto a default (transparent) canvas and calls `toDataURL('image/jpeg', 0.85)` (`50:435`);
transparency becomes black. Wallpaper users often use alpha PNGs.
**Fix**: fill the canvas with the active scheme's base color before `drawImage`
(`#ffffff` light / `#151517` dark), or keep PNG (`toDataURL('image/png')`) when the file type is `image/png`
and the encoded size is acceptable.

---

## 5. Nitpicks

1. `max-width: 720px` on `.aurora-studio-root` (`55:19`) is dead inside the ~564px settings column (uses
   `width:100%`; no visual harm, but centering logic never triggers). Use `max-width: 560px` or drop it.
2. `--dsw-alias-label-error` (`55:496,985,994`) does not exist in the shipped token sheet; every use has a
   fallback, so it works — but prefer `--dsw-alias-state-error-primary` directly.
3. `45-pet.js:141-150` delays every single click by 230 ms (double-click disambiguation). Acceptable, but the
   first click could show instantly and be replaced on dblclick instead.
4. `90-apply.js:104-105` keys the wallpaper on `imageData.length` + last 24 chars of the data URL;
   two different images of identical length and tail would not refresh. Include `slice(0, 32)` too.
5. Custom CSS is injected globally by design; an imported untrusted JSON can hide/restyle the whole UI (no script
   execution — CSS only). The copy warns about it; fine, but worth stating in the release notes.
6. `50:194-196` `studioLocale()` falls back to `navigator.language`; deterministic but means a zh browser shows the
   zh nav label before any service snapshot — matches the core fallback, harmless.
7. PET_CSS chrome values (bubble, heart frame, name) are tokens with literal fallbacks
   (`40:624,646,785,790,809,835,839`); literal colors are otherwise confined to the SVG artwork and its accent math
   (`40:99-120`). This is allowed (INTERFACES:129-130,212); documenting so it is not "fixed" later.
8. `verify.mjs` cannot check: CSS token existence, `!important` policy, hook rules, icon rendering, rendered layout.
   Treat its green result as a syntax/manifest gate only.

---

## 6. Symbol / shape / React / lifecycle audit (what was actually checked)

**Cross-fragment symbols** — every symbol referenced by the pet/settings fragments exists with the expected shape;
`node --check` + `verify.mjs` (declaration counts) + the harness load confirm no undefined/TDZ use:
`store` (`10:144`), `RUNTIME` (`10:219`), `useSettings` (`10:196`), `useAuroraLocale` (`10:206`),
`clampNumber`/`isPlainObject`/`normalizeHex`/`mixColor`/`withAlpha`/`relativeLuminance` (`00-core`),
`THEME_PRESETS`/`BACKGROUND_PRESETS`/`PET_CHARACTERS`/`petCharacterLabel`/`PetArt` (`00-core`,`40`),
`computeThemeOverrides` (`20:36`), `computeWallpaperCss` (`25:35`), `localizePair` (declared, unused),
`studioNavLabel` (`50:1873`), `StudioSettingsView` (`50:1878`), `STUDIO_CSS` (`55:14`), `PET_CSS` (`40:616`).
`verify.mjs:67-77` confirms each required symbol is declared exactly once; no duplicate top-level declaration
(which would be a syntax error) exists.

**Settings-shape consistency** — every write path in `50-settings-view.js` maps onto `DEFAULT_SETTINGS`
(`10:8-42`) with exact names; nothing is silently dropped by `sanitizeSettings`:
theme → `preset`, `accent`, `surfaceOpacity`, `tint` · background → `enabled`, `preset`, `imageUrl`, `imageData`,
`opacity`, `dim`, `blur`, `animated` · pet → `enabled`, `character`, `name`, `size`, `opacity`, `x`, `y`,
`idleChatter`, `chatterInterval`, `lines` · advanced → `customCss`, `animations`. Import/export round-trips
(harness check), and the pet fragment writes only `pet.x`/`pet.y`/`pet.enabled` (`45:242,260`).

**React correctness** — hooks are called unconditionally at component tops in `PetOverlay`, `PetArt`,
`StudioSettingsView` and the four panels; no hooks inside loops/conditions; no `store.set` during render (all
writes are event handlers/effects; `studioStoreSet` is called from handlers only); every subscription/timer/listener
has a cleanup (`10:198-213`, `45:263,298-301,330-334,363-367,385-392`,
`50:715-760` draft timer, `50:769-780` feedback timer, `50:1608-1637` advanced-panel timers/URL).
`useId` is used for SVG gradient ids so five pet previews cannot collide.

**Apply lifecycle** — harness verifies on the real factory + a fake Cordis fiber:
`apply()` runs clean; both root slots registered (`settings.section` id `aurora-studio` order 25 with a **label
thunk**; `shell.overlay` id `aurora-pet` order 90); 3 owned style tags at boot (pet, studio, wallpaper) with
`data-plugin='@local/aurora-studio'`; `overrideTokens` called once with `{light,dark}` pairs only; accent change
disposes the old layer and registers a new one; disabling wallpaper removes its tag and makes `--dsw-alias-bg-base`
opaque; custom CSS tag added/removed with content; `theme/change` and `locale/change` handlers run without
re-entry/infinite recursion and **do not re-register the theme layer**; dispose removes every tag, disposes the
override layer, clears `RUNTIME`, and the nav label thunk stays safe afterwards. Slot registrations are wrapped in
`ctx.effect(() => ctx.slots.inject(...))` (`90:154-170`) and both components sit behind
`createAuroraSlotBoundary` (`90:43-63,153,165`).

---

## 7. Pet overlay audit

- Root: `position: fixed; inset: 0`, inline `pointerEvents:'none'` (`45:438-445`) — the only host-resilient way to
  keep the layer click-through (host rule `.overlayLayer>*{pointer-events:auto}` has equal specificity, so it would
  otherwise depend on stylesheet order). Anchor is the only hit target (`40:631-634`).
- Drag: pointer capture, 4 px threshold, transform preview, clamp to `innerWidth/Height - size - 8` on move, on
  pointerup persisted `x/y` (`45:177-243`); viewport clamp also on mount/resize/size change (`45:338-367`).
- Timers: mood/bubble/click/heart/chatter all cleared on unmount and when disabled (`45:106-111,369-392`); chatter
  is jittered 0.7–1.3× and paused while the document is hidden (`45:304-335`); gaze listeners are rAF-throttled and
  removed (`45:267-301`); hotkey listener is removed and ignores inputs/textareas/selects/contentEditable
  (`45:247-264`).
- Issues: S10 (bubble opacity). Note the default bottom-right anchor (`right:32px; bottom:100px`) plus `size` up to
  180 px can overlap the composer on small windows — clamp-on-mount only runs for *explicit* positions
  (`45:339-368`), so the default position is never clamped; acceptable, but worth a visual check.
- The pet layer relies on `position:fixed` escaping `.frame{overflow:hidden}`; true in the shipped shell (no
  transform/filter on ancestors) but **browser-unverified**.

---

## 8. CSS audit

- STUDIO_CSS: **zero literal color values** (checked `#[0-9a-fA-F]{3,8}` — none); all chrome uses
  `--dsw-alias-*`, `--dsw-radius-*`, `--dsw-focus-ring-*`, `--ds-ease-in-out`; every selector is prefixed
  `.aurora-studio-*`; only scoped `@media`/`@keyframes` outside class rules (`55:1016-1053`); braces balanced
  (139/139). Issue S5 (`!important` only in reduced-motion there — fine).
- PET_CSS: chrome (bubble, heart frame, name) uses alias tokens with literal fallbacks; literal colors are confined
  to the SVG artwork/accent math (`40:99-120` etc.), allowed by INTERFACES:129-130 and :212.
- Layout widths: theme grid `minmax(132px)` → 4 columns, bg grid `minmax(112px)` → 4, pet grid `minmax(92px)` → 5
  at the ~564 px section width — no overflow. Hex field row 42+120 px, segmented 3 equal buttons, button bars wrap.
- Fixed layers: only the pet layer (`40:618-625`) and the wallpaper pseudo-element (`25:58-72`), both
  `pointer-events:none`; no fixed layer can intercept clicks. The wallpaper `body` rule is S3.
- Token existence spot-check vs installed `ui-theme` sheets: all referenced tokens exist except
  `--dsw-alias-label-error` (fallback-only, see nitpick 2); `--dsw-alias-bg-layer-3`,
  `--dsw-alias-state-business-primary`, `--dsw-alias-switch-thumb`, `--dsw-alias-button-primary-*`,
  `--dsw-label-*-foreground` are real.

---

## 9. Security / robustness

- **CSS injection via wallpaper URL is escaped** — harness feeds
  `https://x.example/a");}html{display:none}/*` through `computeWallpaperCss` and confirms `url("…\"…")`:
  quotes/backslashes escaped, newlines stripped, non-`http(s)`/`data:image` URLs fall back to presets
  (`25:10-29`; test passes).
- **Upload/import data URLs** are prefix-validated (`10:80-84`, `50:543-547`); SVG is allowed but rendered through
  CSS `url()` (image context, scripts disabled).
- **No dynamic code execution**: no `eval`, `new Function`, `innerHTML`, `document.write` anywhere in `src/`
  (grep). Blob/clipboard use is guarded (`50:452-469,1633-1695`); download anchor is never appended to the DOM.
- **localStorage quota never throws out of `store.set`** (harness simulates `QuotaExceededError`: no throw,
  `getPersistError()` set, settings page shows the inline banner `50:1878,1958`).
- Remaining risks: S6 caps; arbitrary imported `advanced.customCss` can restyle/hide the whole app (by design,
  CSS only); remote `imageUrl` causes outbound image loads (privacy) and is blocked on mixed content — acceptable.
- **Unverified**: the served page's CSP/`img-src` policy (could not read the page headers without browser control)
  — if `img-src` forbids `data:`/`https:`, wallpapers would silently not paint even though all logic runs.

---

## 10. What cannot be verified without browser control

1. Any rendering: settings page layout inside the 800×~564 px modal, tab bar stickiness, card look, focus rings.
2. Wallpaper visibility through translucent surfaces (`html::before` painting order, blur/dim/opacity feel,
   `body{background:transparent}` interaction with the Windows titlebar/sidebar variants) and light/dark flipping.
3. Theme contrast in situ (S2) and whether the global token override makes host chrome unpleasant (menus/popovers
   at low surface opacity — S9).
4. Pet overlay: fixed-position escape from `.frame{overflow:hidden}`, drag feel, bubble placement/flip near edges,
   overlay-vs-settings-modal z-order, hotkey not colliding with the host shortcut registry.
5. Slot rendering: the section actually shows in Settings nav (order 25), locale switch re-renders nav+page, and the
   two error boundaries behave (a deliberately thrown error can only be tested in-page).
6. Icon rendering in Plugin Manager/Settings and `meta.title`/`description` display in both locales.
7. Localized UI copy in real width (zh strings longer than en in the segmented control).
8. CSP effect on `data:` wallpapers (see §9).

---

## 11. Recommended order of work before install

1. S1 (export stall) and S6 (caps) — user-visible robustness; then S2/S3/S4/S5 (visual correctness), S7/S8
   (performance), S9 (readability floor), S10/S11/S12 (polish/a11y).
2. After any further edit: `node build.mjs && node --check client.js && node verify.mjs` and re-run
   `node research/_review-harness.mjs` (it uses the current `client.js`, modifies nothing).
3. Do not edit `src/` between the final rebuild and `install_bundle`; compare the hashes in §0 first.
4. Install, then in the browser: switch accent/palette, toggle wallpaper + upload/remove a PNG, drag the pet and
   reload (position persists), toggle hotkey, switch locale, import/export/reset, and confirm Settings nav entry.
