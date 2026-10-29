# Aurora Studio — Client API & host-styling research

Author: api-scout (task-1). Date: 2026-10-29. Status: complete for the 7 questions; two items are
source-verified but **not live-verified** (see §0.3).

Path shorthand used below:

- `ASAR\<pkg>\…` = `C:\Users\SINORAD\AppData\Local\Programs\DeepSeek Harness\resources\app.asar\dsh\node_modules\@deepseek-ai\<pkg>\…`
- `EXTRACT\…` = `aurora-studio\research\_extract\…` — normalized, line-wrapped excerpts I extracted from
  the installed bundles (the asar is not readable by shell/grep; I byte-scanned `app.asar` and wrote the
  exact CSS/JS strings out, no content changes except unescaping `\"` and inserting newlines after `;` `}`).
- Harness version: client packages are `0.2.1-rc.3` (`ASAR\dsh-client-ui-theme\package.json:4`).

---

## 0. TL;DR — what the Lead must change in INTERFACES.md

1. **`styles.insert` does not exist for bundle plugins.** It is a closure symbol handed *only* to dynamic
   dual-half packages (`ASAR\dsh-cordis-client-runner\lib\client.js:152-181`, `DynamicCordisStyles`
   71-105). A bundle's client half gets a normal Cordis `ctx`; there is **no `ctx.styles` service** in this
   profile. Use the `ctx.effect` style-tag helper in §4.3 (identical to what built-in plugins do).
   Affects INTERFACES.md:203-204 ("wallpaper + custom CSS via `styles.insert`", "`PET_CSS` and `STUDIO_CSS`
   are inserted once in apply").
2. **Wallpaper cannot rely on a CSS layer alone.** Both `body` and the shell frame paint
   `background: var(--dsw-alias-bg-base)` (`EXTRACT\theme-design-platform.css:268`;
   `EXTRACT\layout-appframe.css:1`). To make a wallpaper show through, `--dsw-alias-bg-base` (and
   `--dsw-specific-sidebar-fill`) must be overridden with an **alpha** value that tracks
   `background.surfaceOpacity`. Wallpaper layer itself: `html::before` (image/blur) + `html::after` (dim).
3. **`theme.overrideTokens` requires `{ light, dark }` pairs.** A bare string throws a teaching `TypeError`
   (`ASAR\dsh-client-ui-theme\lib\client.js:1931-1943`). Every call needs a per-scheme value.
4. **`--dsw-alias-brand-primary` is neutral** (`#0f1115` in light, `#f9fafb` in dark —
   `EXTRACT\theme-design-platform.css:180,294`). It is *not* an accent. The blue accent-ish token is the
   ugly-but-real `--dsw-alias-brand-primary-new-colorprimary-new-color` (`:4176e6` light / deepseek-450 dark)
   and `--dsw-alias-state-business-primary`. Accent-tinted surfaces must be computed in JS into the surface
   tokens (or emitted in our own CSS), never mapped to `brand-primary`.
5. **Overlay click-through gotcha:** host CSS is `.overlayLayer{pointer-events:none}` **and**
   `.overlayLayer>*{pointer-events:auto}` (`EXTRACT\layout-appframe.css:80-84`). A *class* cannot make our
   root click-through (host rule specificity 0,1,1 beats `.aurora-pet-root` 0,1,0). The pet root **must**
   set `style={{ pointerEvents: 'none' }}` inline; the pet body then sets `auto` itself.
6. **Settings page width:** a section renders inside `.options` of an 800px panel minus a 188px nav minus
   `24px` side padding ⇒ usable width ≈ **564px**, and `.options` already scrolls
   (`EXTRACT\settings-root.css:49-60,62-77,132-135`). INTERFACES.md:190 "max-width e.g. 720px" is dead
   weight; use `width:100%` and an inner max-width ≤ 560px.
7. **`getLocale()` is not a string.** `locale.getLocale()` returns
   `{ active, locales, revision }` (`ASAR\dsh-client-locale\lib\client.js:1232-1234`). The `RUNTIME`
   wrapper must read `.active` and coerce anything not `zh` to `en`. Same class of issue for
   `theme.getTheme()` — see §1.2.
8. **Do not pass our settings store as the slot `store:` option.** That option expects a
   `@deepseek-ai/dsh-client-store` `defineStore` handle (`EXTRACT\ui-slots-slot-registry-snippet.js`,
   `SlotRegistry._register`). Our `useSettings()` hook is the right mechanism; omit `store:`.

### 0.3 Verification limits (explicit, not guessing)

- `cordis_inspect_query` on platform `client` (Theme/Slots/Service/Builtin) timed out on every attempt
  (10 s, "Open or reconnect the Harness page"). So the live token list and live slot catalog were **not**
  cross-checked; findings below come from the installed `lib/client.js` bundles + the shipped CSS token
  sheets, which is exactly what the running page executes.
- The pointer-events conclusion is a CSS-cascade conclusion from the shipped rules, not a click test.
- Visual metrics are read from shipped CSS, not from a screenshot.

---

## 1. Theme service internals

### 1.1 `theme.overrideTokens(source, tokens)` — what it actually does

`ASAR\dsh-client-ui-theme\lib\client.js:1835-1847`:

```js
overrideTokens(source, tokens) {
    const layer = { seq: this.overrideSeq++, tokens: validateOverrides(source, tokens) };
    this.overrides.set(source, layer);          // one layer per source; re-call replaces + restacks on top
    this.publish();                             // bumps revision, rebuilds snapshot, ctx.emit("theme/change")
    return () => { if (this.overrides.get(source) !== layer) return; this.overrides.delete(source); this.publish(); };
}
```

- `validateOverrides` (`:1931-1943`) requires every value to be `{ light: string, dark: string }`; a bare
  string throws `TypeError(... "pass { light: …, dark: … }" …)`. So **keys may be any CSS custom property
  name, but values are always a light/dark pair.**
- It writes **nothing to the DOM itself**. Composition is per active scheme:
  `composeActive` (`:1868-1876`) folds layers in `seq` order, later wins per token, picking
  `modes[active.colorScheme]`; the result lands in `theme.getTheme().active.tokens`.
- Emission: `publish()` (`:1877-1881`) emits **`theme/change`** with the new snapshot on the owning ctx.
  Re-calling with the same `source` replaces that source's whole layer (effect re-registration semantics);
  the old disposer becomes a no-op.
- Dom-free: `ThemeRuntime` has no DOM code at all (docstring `:1631-1641`). Painting is done by
  **ui-layout's `ThemePresenter`**.

### 1.2 `theme.getTheme()` snapshot

`buildSnapshot` (`:1848-1861`) returns a frozen object:

```js
{ preference, fontSizes, fontFamilies,
  active: { id, colorScheme, tokens },   // colorScheme: 'light' | 'dark'
  themes, revision }
```

- `preference` is `'light' | 'dark' | 'system'` **or a registered theme id**. Do not assume only three.
- Active resolved scheme is `snapshot.active.colorScheme` (not `preference`); `system` is resolved through
  `matchMedia("(prefers-color-scheme: dark)")` (`:1666-1680,1849`).
- `active.tokens` already has overrides folded in, values chosen for the current scheme.
- Only write entry points: `setTheme(id)` (`:1712-1718`, rejects unregistered non-`system` ids),
  `setFontSize`, `setFontFamily`. `getTheme()` is the read entry.

### 1.3 Which selectors/variables get painted, and precedence

`ASAR\dsh-client-ui-layout\lib\client.js:528-585` (`ThemePresenter.apply`):

```js
document.documentElement.style.colorScheme = snapshot.active.colorScheme;
document.documentElement.setAttribute("data-ds-theme-source", …);
const body = document.body;
if (scheme === "dark") body.setAttribute("data-ds-dark-theme", ""); else body.removeAttribute(...);
for (const name of this.appliedTokens) body.style.removeProperty(name);
this.appliedTokens = [];
for (const [name, value] of Object.entries(snapshot.active.tokens)) { body.style.setProperty(name, value); … }
this.themeColorMeta.content = getComputedStyle(body).backgroundColor;
```

Conclusions:

- Token variables are written as **inline styles on `document.body`**. Precedence: inline `body.style`
  beats both token sheets (`body{…}` and `body[data-ds-dark-theme]{…}`) — no `!important` needed.
- They cascade to `#root` and everything below (the whole app). They do **not** apply to `html`-scoped
  variables (e.g. `--dsh-frame-*` set on `html[…]`) — a wallpaper layer on `html` cannot use an
  overridden alias token unless it inherits from body, which it doesn't.
- Light/dark pairing happens **upstream**: the presenter only ever applies the pair member for
  `active.colorScheme`. `data-ds-dark-theme` on body is the palette selector.
- The theme sheets' own alias definitions live in `body{}` (light) and `body[data-ds-dark-theme]{}` (dark):
  `EXTRACT\theme-design-platform.css:155-267` (light) / `:269-381` (dark), both ending with
  `background-color:var(--dsw-alias-bg-base)` (`:268`; dark block `:382-383` is a macOS-only menu tweak).
- `body[data-ds-dark-theme]` also re-declares the `--dsw-static-*` palette (`:78-154`); the alias layer is
  what actually switches.

**Wallpaper feasibility.** The paint stack that matters:

| layer | what paints it | evidence |
|---|---|---|
| canvas | `html,body,#root{height:100%;margin:0}` + `body{background-color:var(--dsw-alias-bg-base)}` | `#root{` rule in web boot CSS (asar scan, see §9); `EXTRACT\theme-design-platform.css:268` |
| shell frame | `.frame{background:var(--dsw-alias-bg-base)}` (`overflow:hidden`) | `EXTRACT\layout-appframe.css:1,6` |
| side column | `.sidebarCol{background:var(--dsw-specific-sidebar-fill)}` | `EXTRACT\layout-appframe.css:25` |
| sidebar/center on macOS | `.centerCol{background:var(--dsw-alias-bg-base)}` | `EXTRACT\layout-appframe.css:45` |
| bottom row | `.bottomRow{background:var(--dsw-alias-bg-base)}` | `EXTRACT\layout-appframe.css:75` |

So an `html::before` wallpaper paints **under** body+frame; it is only visible where those are
translucent. Feasible recipe (all values must be per-scheme strings):

```js
// settings.background.enabled === false  -> remove layer, restore opaque tokens
const a = bg.enabled ? clamp(theme.surfaceOpacity, .55, 1) : 1;      // surfaceOpacity 1 = opaque
ctx.theme.overrideTokens(PLUGIN_ID, {
  '--dsw-alias-bg-base':         { light: `rgba(255,255,255,${a})`, dark: `rgba(21,21,23,${a})` },
  '--dsw-alias-bg-layer-1':      { light: `rgba(255,255,255,${a})`, dark: `rgba(35,35,36,${a})` },
  '--dsw-alias-bg-layer-2':      { light: `rgba(255,255,255,${a})`, dark: `rgba(44,44,46,${a})` },
  '--dsw-alias-bg-layer-3':      { light: `rgba(255,255,255,${a})`, dark: `rgba(53,54,56,${a})` },
  '--dsw-specific-sidebar-fill': { light: `rgba(249,250,251,${a})`, dark: `rgba(27,27,28,${a})` },
});
```

(`#fff`/`#151517` = `LIGHT_BACKGROUND`/`DARK_BACKGROUND` from
`ASAR\dsh-client-ui-theme\lib\index.js:134-135`; layer/sidebar RGBs decoded from
`EXTRACT\theme-design-platform.css:159-161,263` and the dark `:273-275,377`.)

Wallpaper CSS (inject once, see §4.3):

```css
html::before{
  content:""; position:fixed; inset:0; z-index:-1; pointer-events:none;
  background-image: var(--aurora-wallpaper, none);
  background-size: cover; background-position: center; background-repeat: no-repeat;
  opacity: var(--aurora-wallpaper-opacity, .85);
  filter: blur(var(--aurora-wallpaper-blur, 0px));
  transform: scale(1.06);            /* hides blur fringe */
}
html::after{ /* dim: above the image, still below body/UI (both z-index:-1, ::after paints later) */
  content:""; position:fixed; inset:0; z-index:-1; pointer-events:none;
  background: var(--aurora-wallpaper-dim, rgba(0,0,0,.45));
}
```

Keep `--aurora-wallpaper*` on `document.documentElement` (`html`), not on `body`, to stay clear of the
host's body-inline token writes; INTERFACES' "never touch document.body" is respected.
`body::before` would work too, but `html::before` is outside the element the theme presenter owns.

Risk: the very same `--dsw-alias-bg-base` also feeds `getComputedStyle(body).backgroundColor` →
`<meta name="theme-color">` (`ui-layout client.js:567`) and Windows titlebar backgrounds
(`[data-windows-titlebar] .frame` uses sidebar-fill, `EXTRACT\layout-appframe.css:9-12`). Alpha values there
are cosmetic, but keep `surfaceOpacity = 1` ⇒ fully opaque tokens to stay closest to stock.

---

## 2. Token inventory beyond the 14 overridable aliases

The 14 "documented overridable" names are `BUILTIN_INSPECT_TOKENS`
(`ASAR\dsh-client-ui-theme\lib\client.js:1531-1630`) and are exactly the aliases a `Theme.listTokens`
inspect query would return as *overridable*: `--dsw-alias-bg-base`, `-bg-layer-1/2`, `-bg-overlay`,
`-border-l1/l2`, `-brand-primary`, `-label-primary/secondary`, `-state-error/idle/success/warn-primary`,
`--dsw-specific-sidebar-fill`. **`overrideTokens` accepts more than these** (see §1.1); anything below can
also be overridden as long as you supply `{light,dark}`.

### 2.1 Radius (`EXTRACT\theme-base.css:10-15`, source `ui-theme/client.js:1407`)

`--dsw-radius-xs:4px` · `--dsw-radius-sm:8px` · `--dsw-radius-md:12px` · `--dsw-radius-lg:16px` ·
`--dsw-radius-xl:20px` · `--dsw-radius-panel:28px`. Scheme-independent.
`--dsw-corner-shape:superellipse(1.5)` under `@supports` (`ui-theme/client.js:1410`).

### 2.2 Alias tokens (light block `EXTRACT\theme-design-platform.css:155-267`, dark `:269-381`)

Scheme-aware (defined in both `body{}` and `body[data-ds-dark-theme]{}`):

- backgrounds: `--dsw-alias-bg-base`, `-bg-layer-1/2/3`, `-bg-overlay`, `-bg-module-platform`,
  `-bg-multi-select`, `-bg-skeleton`, `-bg-mask-1/2/3`, `-bg-mask-photo`, `-bg-mask-drop`,
  `-bg-document-preview`, `-bg-document-selection`
- borders: `--dsw-alias-border-l1/l2/l3/l4`, `-border-l2-darkmode-thin`, `-border-inverted`,
  `-border-inverted2`
- labels/text: `--dsw-alias-label-primary`, `-secondary`, `-tertiary`, `-caption`, `-dimmed`,
  `-primary-dimmed`, `-primary-inverted`, `-primary-foreground`, `-primary-bluish`, `-label-document-preview`
- interaction: `--dsw-alias-interactive-bg-hover`, `-hover-accent`, `-hover-danger`, `-hover-solid`, `-active`
- brand/buttons: `--dsw-alias-brand-primary` (neutral!), `-brand-primary-invert`,
  `--dsw-alias-brand-primary-new-colorprimary-new-color` (blue **#4176e6**), `-brand-text`,
  `-button-primary-fill/hover/dimmed`, `-button-info-fill/hover`, `-button-contrast-fill`,
  `-button-elevated-fill`, `-button-floating-fill/hover`, `-button-ghost-active-*`, `-button-tool-bar-fill*`
- states: `--dsw-alias-state-business-primary/tertiary`, `-state-error-primary/secondary`,
  `-state-success-primary/secondary/tertiary`, `-state-warn-primary/secondary/tertiary/label`,
  `-state-idle-primary`
- misc: `--dsw-alias-switch-thumb`, `-toast-bg`, `-toast-label`, `-tooltip-bg`, `-tooltip-key-bg`,
  `-link`, `-menu-icon`, `-scrollbar-bg-l1/l2`, `-scrollbar-hover-l1/l2`, `-markdown-*`,
  `-turn-trigger-bg`, `-turn-trigger-bg-hover`, `-file-diff-*`, `-code-diff-added/deleted`,
  `-label-deep-diving*`
- `--dsw-specific-*`: `-sidebar-fill`, `-sidebar-nav-item-active`, `-sidebar-nav-item-active-accent`,
  `-sidebar-nav-item-hover`, `-input-major`, `-login-input`, `-selector`, `-menu`, `-bubble`,
  `-bubble-highlight`, `-tip`
- `--dsw-menu-surface-fill`, `--dsw-alias-menu-group-header-fill`
- **`--dsw-alias-settings-card-fill` / `--dsw-alias-settings-card-stroke`** — defined on body in base.css
  (`EXTRACT\theme-base.css:18-19`) as `var(--dsw-alias-bg-layer-2)` / `var(--dsw-alias-border-l4)`;
  these are the host's settings-card surface/stroke. Use them for studio cards.

### 2.3 Static palette (`EXTRACT\theme-design-platform.css:1-77`)

`--dsw-static-neutral-{00,50,100,150,200,250,300,400,500,550,600,700,800,850,900,1000}`,
`--dsw-static-neutral-bluish-{00,50,60,75,100,150,200,300,400,500,600,700,750,800,850,875,900,950,1000}`,
`--dsw-static-blue-{50,50p,75,100,300,400,450,500,600,800,900,950}`,
`--dsw-static-deepseek-{50,100,200,300,400,450,500,600,700-delete,800,900}`,
`--dsw-static-green-{100,400,500,500-a08,500-a12,900}`,
`--dsw-static-amber-{100,400,500,600,900}`, `--dsw-static-red-{50,100,400,400-a12,500,600,600-a08,900}`.
Technically re-declared under dark (`:78-154`) but almost all values are identical; treat as
scheme-independent, prefer aliases for chrome.

### 2.4 Typography (`EXTRACT\theme-gradient-shadow-text.css`, source `ui-theme/client.js:1425`)

- Roles: `--dsw-font-base-16`, `-s-14`, `-xs-13`, `-xxs-12`, `-xxxs-11`, `-m-18`, `-l-20`, `-xl-24` and
  `-strong` variants, each with `-font-family/-font-weight/-font-size/-line-height/-font-style` sub-vars.
- `--dsw-font-markdown-*` (h1-h4, base, small, table, code, code-block variants).
- Families: `--dsw-font-family`, `--ds-font-family-code`, `--dsh-font-family-text/-code/-terminal`
  (body-inline, user setting), defaults in `EXTRACT\theme-base.css:1-5`.
- Sizes: `--dsh-content-font-size` (default 14), `--dsh-code-font-size` (11), `--dsh-terminal-font-size` (13)
  and derived deltas `--dsh-content-font-delta*`, `--dsh-code-font-delta`.

### 2.5 Elevation / motion / misc

- `--dsw-shadow-lv1/lv1-blur/lv2/lv3`; `--dsw-elevation-stroke`, `-elevation-panel`, `-prominent`, `-soft`;
  `--dsw-elevation-stroke-color` (→ border-l4); `--dsw-mask-blur:none`; `--dsw-menu-backdrop-filter:
  blur(40px) saturate(150%)`; `--dsw-linear-gradient-think`, `--dsw-linear-think-select`
  (`EXTRACT\theme-gradient-shadow-text.css:1-16`).
- Motion: `--ds-ease-in-out:cubic-bezier(.4,0,.2,1)`, `--ds-transition-duration:.2s`,
  `-fast:.1s`, `-slow:.3s` (`EXTRACT\theme-base.css:6-9`).
- Focus: `--dsw-focus-ring-width:2px`, `--dsw-focus-ring-color` (`ui-theme/client.js:1416`).
- Frame chrome (root/html-scoped, not overridable via body): `--dsh-frame-top-clearance`,
  `--dsh-frame-chrome-top`, `--dsh-frame-overlay-top`, `--dsh-windows-titlebar-height`
  (`EXTRACT\layout-appframe.css:34-39`).
- Scrollbars: `--dsh-scrollbar-thumb/-hover/-width/-track-margin` set from aliases
  (`ui-theme/client.js:1422`); the settings panel overrides `--dsh-scrollbar-thumb/-hover` locally
  (`EXTRACT\settings-root.css:56-57`).
- Light/dark aware: **all `--dsw-alias-*` and `--dsw-specific-*`**, plus anything derived from
  `--dsw-elevation-stroke-color`. Radii / type / motion / shadows are scheme-independent.

---

## 3. Slot registration for root-scoped `settings.section` and `shell.overlay`

### 3.1 Declarations (who owns the slots)

- `shell.overlay`: declared by ui-layout's `root` registration, `kind: "list", scope: "root"`
  (`ASAR\dsh-client-ui-layout\lib\client.js:623-653`, overlay child at `:643-646`); rendered by
  `<div className=overlayLayer data-shell-overlay>{renderSlot("shell.overlay", {})}</div>`
  (`:313,349-353`).
- `settings.section`: declared by ui-settings-general's `sidebar.settings` registration,
  `kind: "list", scope: "root"` (`ASAR\dsh-client-ui-settings-general\lib\client.js:1239-1274`,
  section child at `:1264-1267`); rendered as
  `renderSlot("settings.section", { close: onClose }, { only: active })` (`:337`) inside
  `.AnXs9G_options` (`:335-339`).

### 3.2 Canonical registration pattern (copy this)

Real registrants, verbatim shape:

```js
// ui-settings-general client.js:1299-1309  (section + nested items)
ctx.slots.inject("settings.section", () => ctx.slots.register({
  name: "settings.section",
  id: "general",
  order: 0,
  label: () => t("general.nav"),          // thunk is supported and expected
  locale: NS,                             // component gets a live `t` prop
  children: { "settings.general.item": { kind: "list", scope: "root" } }
}, GeneralSection));

// ui-settings-general client.js:1319-1324  (shell.overlay, frame-wide)
ctx.slots.inject("shell.overlay", () => ctx.slots.register({
  name: "shell.overlay",
  id: "host-release-change",
  locale: NS,
  inject: releasePromptInjected
}, HostReleasePrompt));
```

A second real section (`ui-agent-preset`, asar scan excerpt):

```js
ctx.slots.inject("settings.section", () => ctx.slots.register({
  name: "settings.section", id: "agent-presets", order: 20,
  label: () => ctx.locale.bind("settings.agentPreset")("nav"),
  locale: "settings.agentPreset", inject: sectionInjected
}, AgentPresetSection));
```

Frequently asked details:

- **`label` can be a thunk.** It is resolved lazily by `resolveSlotLabel(e.options.label)`
  (`ui-settings-general client.js:1155`), on every ledger/locale revision, and used to build the nav rows
  (`:1144-1168`). A plain string also works. Our `() => studioNavLabel()` is correct.
- **`register` returns a disposer.** `SlotRegistry._register` returns an idempotent disposer
  (`EXTRACT\ui-slots-slot-registry-snippet.js`, `_register`); built-ins keep it (`const disposeSlot = …;
  return () => disposeSlot()`); the idiomatic form is `ctx.effect(() => ctx.slots.register(...))` or
  `ctx.slots.inject(slot, () => ctx.slots.register(...))`. `inject` itself returns a disposer and
  **re-runs the callback** whenever the slot declaration collapses/reappears (docstring + implementation,
  `SlotRegistry.inject`), which is why every host plugin wraps registrations in it.
- **`order`** orders `list` slots ascending; the settings nav sorts by it
  (`ui-settings-general client.js:1151-1156`). Known section ids/orders: `general` 0, `agent-presets` 20.
  `aurora-studio` at 25 is safe.
- **Owner props:** `settings.section` entries receive `{ close }`; `shell.overlay` entries receive `{}`
  (plus `t` when `locale` is set, plus anything from `inject`). So `StudioSettingsView({ close })` is
  exactly right.
- **Root scope** means no session binding: both slots resolve the root standard-source binding only.
- Registration validates against the live declaration ledger; that is what `inject` protects us from.
- **Live catalog check not possible**: client inspect timed out, so I could not dump the live
  `settings.section`/`shell.overlay` occupant list. The registrants above are shipped and active.

### 3.3 Overlay pointer events (catalog says "click-through") — confirmed, with a catch

`EXTRACT\layout-appframe.css:80-84`:

```css
.mP3x-q_overlayLayer{ z-index:20; pointer-events:none; position:absolute; inset:0 }
.mP3x-q_overlayLayer>*{ pointer-events:auto }
```

- The layer is click-through, **but every direct child is re-enabled automatically** by the host rule.
- Therefore `PetOverlay`'s full-frame root must set `pointerEvents: "none"` **inline**
  (React `style`), because a class rule (`.aurora-pet-root{pointer-events:none}`) loses to
  `.overlayLayer>*` (specificity 0,1,1 vs 0,1,0). Inline style wins. Then the pet body child sets
  `pointer-events:auto` again (its own class or inline) and is the only hit target — exactly as
  INTERFACES.md:134-136 wants, just make the "inline" part explicit.
- Layer is `position:absolute; inset:0` inside `.frame{overflow:hidden}`, z-index 20. Our root uses
  `position:fixed`, which escapes the frame's overflow clipping (no transform/filter/contain on `.frame`),
  so x/y viewport coordinates in the pet state behave as expected.
- The host settings modal is portaled to `document.body` with z-index 1000
  (`EXTRACT\settings-root.css:39-48`), i.e. above the pet layer. Good: settings stays usable.

---

## 4. Client module loader

### 4.1 `window.__ModuleLoader__.load({ id, factory(require) })`

The boot HTML installs a queue facade: `window.__ModuleLoader__ = { mode:"queue", pendingQueue,
load(registration){…}, create(options){…} }` (asar scan of the web boot bundle, `bootInjections`). Then
`@deepseek-ai/dsh-client-modules` swaps it to live mode and treats each registration as a **lazy CJS
factory** (`ASAR\dsh-client-modules\lib\client.js:1-36` module doc, `register` `:701-714`,
`materialize` `:803-830`):

- `id` must equal the package name; the loader strips a trailing `/client`
  (`stripClientSuffix`, `:98-100`), and duplicate registration throws.
- The factory body (and any CSS injection inside it) runs at **materialization**, not at script execution;
  keep the factory side-effect-free and do all work in `apply(ctx)` (`:14-24`).
- `require` resolution (`makeRequire`, `:832-850`): platform seed word → already materialized module →
  registered factory → throw `client-modules: require("…") missed the module table…`.
- The graph entry is loaded as a Cordis plugin: module `exports` must expose `inject` (string array) and
  `apply(ctx)` (object plugin) — every built-in client bundle does this, e.g.
  `ui-theme client.js:2075-2079`, `ui-layout client.js:713-716`. The template
  (`…\skills\cordis-plugin-development\templates\decoration\client.js`) returns
  `{ inject: ['slots'], apply(ctx) { … } }`. `apply` may be async (locale's is, `locale client.js:1503`).

### 4.2 Available `require` ids

The web boot seed map (asar scan, function `OZ()` in the boot bundle):

```js
{ react, "react/jsx-runtime": …, "react-dom": …, "react-dom/client": …,
  "@deepseek-ai/cordis": …, zod, "@tanstack/react-virtual": …,
  "@deepseek-ai/dsh-client-store": …, "@deepseek-ai/dsh-client-ui-slots": …,
  "@deepseek-ai/dsh-client-ui-primitives": …, "@deepseek-ai/dsh-client-ui-dockkit": … }
```

So `require("react")` and `require("react/jsx-runtime")` are both available. `react/jsx-runtime` is what
built-ins use (`ui-theme client.js:7`). Harness packages are technically requireable but explicitly
discouraged/unstable ("Do not `require('@deepseek-ai/dsh-client-ui-primitives')` …", skill docs asar scan;
`cordis-plugin-development\references\ui-plugin.md:9`). Our plan (React only, `h = React.createElement`)
needs no `dsh.client.external` entries.

### 4.3 Right patterns for a plain-JS bundle plugin

| need | correct pattern | evidence |
|---|---|---|
| lifecycle / cleanup | `ctx.effect(() => { …; return cleanup }, "label")` | used by every client plugin, e.g. `ui-theme client.js:1446-1458` |
| theme | declare `inject: ['theme']`, read `ctx.theme.getTheme()`, `const off = ctx.on('theme/change', fn)` | `ui-layout client.js:589-594,700-710`; `ThemeRuntime.publish` emits `theme/change` |
| locale | `ctx.locale.register(ns, {zh,en})`, `ctx.locale.bind(ns)`, `ctx.locale.subscribe(fn)` | `locale client.js:1387-1422,1443-1455` |
| optional service | `ctx.get('theme')` | used widely, e.g. `ui-layout client.js:615` |
| **styles** | **`document.head` `<style>` inside `ctx.effect`, tagged `data-plugin`** | see below |
| theme token override | `ctx.theme.overrideTokens(PLUGIN_ID, {token:{light,dark}})`; dispose replaces old layer | §1.1 |

**`styles.insert` is not available.** It is a symbol passed to the closure of a *dynamic* package
(`ASAR\dsh-cordis-client-runner\lib\client.js:152-181`; `DynamicCordisStyles.insert` `:84-95` creates
`<style data-dyn=pluginId>` and returns a disposer), and `styles` is listed as a dynamic-package API in the
tool docs (`name: "styles"`, asar scan). No bundle plugin provides/consumes a `styles` service — bundled UI
plugins inject tags directly. Copy ui-theme's helper (this also makes HMR clean-up work):

```js
// ui-theme client.js:1446-1458, adapted
function auroraInstallStyle(ctx, name, css) {
  ctx.effect(() => {
    const tag = document.createElement("style");
    tag.dataset.plugin = PLUGIN_ID;                        // client-modules removeOwnedStyles(id) keys on this
    tag.dataset.pluginCss = `${PLUGIN_ID}/${name}`;
    tag.textContent = css;
    document.head.appendChild(tag);
    return () => tag.remove();
  }, `aurora-studio: ${name} stylesheet`);
}
```

`client-modules` claims untagged tags created during materialization and removes
`style[data-plugin=<id>]` on reload/unload (`ASAR\dsh-client-modules\lib\client.js:312-315,617-631`);
tagging with `PLUGIN_ID` is the supported HMR path. For the *live* custom CSS (Advanced tab), use the same
helper with a stable tag name and replace `tag.textContent` on every settings change instead of
re-registering effects on each keystroke (debounce outside React render).

---

## 5. Locale for the plugin UI

Two workable designs; the host-idiomatic one is `register` + `bind`.

### 5.1 How the service works (`ASAR\dsh-client-locale\lib\client.js`)

- `ctx.locale.getLocale()` → `{ active, locales, revision }` (`:1232-1234`). `active` is the BCP-47 id
  (`'zh' | 'en'` for the shipped catalog; `addLanguage` can extend it, `:1297-1320`).
- `ctx.locale.register(ns, { zh: {...}, en: {...} })` (`:1387-1413`): one flat dictionary **per locale**;
  registering the same locale twice for a namespace throws; returns a disposer; bumps the snapshot
  revision (so mounted outlets re-render) but does **not** emit `locale/change` (only a real switch does,
  `:1443-1449`).
- `ctx.locale.bind(ns)` (`:1414-1422`) returns a **stable, cached** `t(key, params)`.
- Lookup (`translate`/`lookup`, `:1423-1435`): active locale first, then each declared fallback
  (`zh → en`), then the **same key in the `common` namespace**, then the raw key string.
- Keys are **flat strings** — dot namespacing is convention only (`"fontFamily.text.title"`,
  `"appearance.light"`), no nested objects are traversed. Interpolation is `{name}`:
  `t("desktop.update.progress", { percent })`.
- Components rendered through a slot registration with `locale: NS` get a `t` prop bound to that
  namespace, and a **new `t` identity per locale revision** so `React.memo` children refresh
  (`ui-renderer client.js:533-558`). This is the cheapest way to make studio pages/rows bilingual.

### 5.2 Recommendation

- Reading `ctx.locale.getLocale().active` and picking a local `zh`/`en` dict per render **is acceptable**
  and works today (INTERFACES' plan). It does mean you must pass locale through props/context yourself and
  re-render on switch; the `RUNTIME` facade's `getLocale()` must return `snapshot.active` coerced to
  `'zh' | 'en'` (fall back to `'en'`), **not the snapshot object**.
- `register`/`bind` is clearly better for a settings page and the pet:
  1. `ctx.effect(() => ctx.locale.register('aurora-studio', { zh, en }))` once in `apply`;
  2. add `locale: 'aurora-studio'` to both slot registrations and use the `t` prop in components;
  3. outside components (nav label thunk, pet idle lines) use a module-scope
     `const auroraT = (key, p) => RUNTIME…` — simplest: `label: () => ctx.locale.bind('aurora-studio')('nav')`
     exactly like ui-agent-preset.
- Keep `RUNTIME.getLocale()` if the other fragments already depend on it; implement it as
  `ctx.locale.getLocale().active` and subscribe with `ctx.locale.subscribe` (or `ctx.on('locale/change')`).
- Exact key format: flat, no prefix needed beyond your own convention, e.g.
  `{ "nav": "定制工作室"/"Studio", "theme.accent": "强调色"/"Accent" }`; zh may be the key-set source but
  every key should exist in both dicts (host dictionaries are key-complete; missing keys fall through to
  `common` then to the literal key).

---

## 6. `dsh.client.inject` package names

- `@deepseek-ai/dsh-client-ui-settings` and `@deepseek-ai/dsh-client-ui-theme` **exist** in this
  installation (`ASAR\<pkg>\package.json` read successfully; both declare `dsh.client` +
  `platform: "web"`; ui-theme also `immediately: true`). `@deepseek-ai/dsh-client-locale` exists too.
- **Semantics:** `dsh.client.inject` is validated as a string array (`parseDshClient`,
  `dsh-client-modules\lib\client.js:61-75`) and only orders **module arrival** for graph rows:

  ```js
  for (const packageName of row.inject) {
      const dependency = this.graphRows.get(packageName);
      if (dependency !== void 0) await this.arriveDependency(...);   // missing row => silently skipped
  }
  ```

  (`arriveGraphRow`, `:776-794`). It is **not** Cordis service ordering — the plugin's own `inject`
  (`{ inject: ['slots','theme','locale'], apply }`) is what parks activation until services exist.
- **A listed package that is not loaded does not break activation.** Both dependency loops (`external`
  and `inject`) only await a row that exists in the boot graph and silently skip an absent one
  (`:783-792`); the hard failure is only at runtime `require("<id>")` when that id resolves to nothing
  (`:840`). The shipped template even lists `@deepseek-ai/dsh-client-ui-conversation` although a pure
  decoration does not need it (`templates\decoration\package.json:18`).
- Recommendation for `aurora-studio\package.json`:
  `"dsh": { "bundle": { "patch": "./cordis.patch.yml" }, "client": { "platform": "web",
  "immediately": true, "inject": ["@deepseek-ai/dsh-client-ui-renderer",
  "@deepseek-ai/dsh-client-ui-theme", "@deepseek-ai/dsh-client-locale", "@deepseek-ai/dsh-client-modules"] } }`
  — arrival ordering only; correctness still comes from the Cordis `inject` list. (These four are all
  loaded in this profile: theme/locale/renderer are `immediately: true`; modules is the loader itself.)

---

## 7. Settings page visual conventions (so the studio page looks native)

### 7.1 Shell geometry (`EXTRACT\settings-root.css`, source `ui-settings-general client.js:60`)

- overlay: `position:fixed; inset:0; z-index:1000; display:flex; center`
- mask: `background:var(--dsw-alias-bg-mask-1); backdrop-filter:var(--dsw-mask-blur)`
- panel: `width:800px; height:min(800px, calc(100vh - 2*max(24px, var(--dsh-frame-overlay-top,24px))));`
  `border-radius:var(--dsw-radius-panel); background:var(--dsw-alias-bg-layer-2);`
  `box-shadow:var(--dsw-elevation-prominent); display:flex; overflow:hidden`
- nav: `width:188px; flex:none; padding:22px 12px 0; gap:18px; flex-direction:column`
  - title `16px/500`, padding `0 12px`
  - cells: `height:40px; border-radius:var(--dsw-radius-md); padding:9px 16px 9px 12px; font:14px/22px`
  - hover `var(--dsw-specific-sidebar-nav-item-hover)`, active `…-item-active`
- content: `flex:1; min-width:0; flex-direction:column`
  - header: `height:54px; padding:20px 14px 8px 10px`
  - **section body (`.options`): `flex:1; min-height:0; padding:0 24px 24px; overflow-y:auto`**
  - ⇒ usable width ≈ 800 − 188 − 48 = **564px**, and it already scrolls.

### 7.2 Row / control conventions used by host settings

From ui-settings-general / ui-theme / ui-locale rows (all token-only):

- Setting row: `display:flex; align-items:center; gap:24px (or 8px); padding:16px 0;
  border-bottom:.5px solid var(--dsw-alias-border-l2)`; last child `border-bottom:0`
  (e.g. `EXTRACT\settings-root.css` nav pattern; row CSS from
  `ui-theme client.js:1127,1133`, `ui-settings-general client.js:668`).
  Title: `14px/22px; color:var(--dsw-alias-label-primary)`. Description:
  `12px/18px; color:var(--dsw-alias-label-secondary)`.
- Segmented / palette "theme cube" (exact host pattern for our palette cards,
  `ui-theme client.js:27`):

  ```css
  .cube{ box-sizing:border-box; border:.5px solid var(--dsw-alias-border-l4);
         border-radius:var(--dsw-radius-xl); color:var(--dsw-alias-label-primary);
         background:0 0; padding:20px 32px; cursor:pointer; font:14px/22px; }
  .cube:hover:not(.selected){ background:var(--dsw-alias-interactive-bg-hover); }
  .cube.selected{ background:var(--dsw-alias-bg-module-platform);
                  border-color:var(--dsw-static-neutral-bluish-400); }
  ```

- Selector pill (`ui-locale client.js:1027`): `height:36px; border-radius:var(--dsw-radius-md);
  background:var(--dsw-alias-bg-module-platform); padding:0 14px; font:14px/22px;
  color:var(--dsw-alias-label-primary)`; hover `var(--dsw-alias-interactive-bg-hover)`.
- Stepper/number pill (`ui-theme client.js:1133`): `min-width:72px; height:36px;
  border-radius:var(--dsw-radius-md); background:var(--dsw-alias-bg-module-platform);
  font-variant-numeric:tabular-nums`.
- Icon button: `28×28 (or 24×24); border-radius:var(--dsw-radius-sm); background:0 0; border:none;
  hover background:var(--dsw-alias-interactive-bg-hover)`.
- Cards ("settings card"): fill/stroke tokens exist for exactly this:
  `background:var(--dsw-alias-settings-card-fill); border:.5px solid var(--dsw-alias-settings-card-stroke);
  border-radius:var(--dsw-radius-xl)` (tokens from `EXTRACT\theme-base.css:18-19`).
- Toggle (host `Switch`) is a primitive component, not a class contract; INTERFACES already requires
  self-contained controls. Build a `role="switch"` pill: track `36×20; border-radius:999px;
  background:var(--dsw-alias-bg-module-platform)` (off) / `var(--dsw-alias-state-business-primary)` (on),
  thumb `16px; background:var(--dsw-alias-switch-thumb)`. Those token names are real
  (`EXTRACT\theme-design-platform.css:248,228`).
- Range slider: no host class contract; style `accent-color: var(--dsw-alias-state-business-primary)` on
  `<input type="range">` and set `height`/`background` with tokens; acceptable per INTERFACES
  ("self-contained React elements").
- Spacing: host uses 8px grid (4/8/12/16/24). Focus ring: `outline-color:var(--dsw-focus-ring-color,
  var(--dsw-alias-state-business-primary)); outline-width:var(--dsw-focus-ring-width)` (`ui-theme
  client.js:1416`).

---

## 8. Contradictions / risks vs `INTERFACES.md`

| # | INTERFACES claim | reality | action |
|---|---|---|---|
| 1 | `styles.insert` used for wallpaper/custom CSS (`:203-204`) and to insert `PET_CSS`/`STUDIO_CSS` (`:204`) | no `styles` service for bundle plugins; `styles` is a dynamic-package closure symbol only (`cordis-client-runner:152-181`) | replace with `ctx.effect` style-tag helper (§4.3), tag `data-plugin=PLUGIN_ID` |
| 2 | Wallpaper via a plain CSS layer (`:9-10`, `:203`) | body + frame both paint `--dsw-alias-bg-base`; opaque token hides any background layer | override `--dsw-alias-bg-base`/`bg-layer-*`/`--dsw-specific-sidebar-fill` with alpha tied to `surfaceOpacity` (§1.3) |
| 3 | `RUNTIME.getLocale()` → `'zh'|'en'` (`:46`) | raw `locale.getLocale()` returns `{active, locales, revision}`; active can be a non-`zh` BCP-47 id if a language pack is added | wrapper reads `.active`, coerces unknown → `'en'`; subscribe via `locale.subscribe`/`locale/change` |
| 4 | `RUNTIME.getScheme()` / `getThemeService()` implied simple fields (`:48-52`) | snapshot is `{preference, fontSizes, fontFamilies, active:{id,colorScheme,tokens}, themes, revision}`; `preference` may be a registered theme id | use `active.colorScheme`; `preference` only for the 3-way control |
| 5 | "Colors only via `--dsw-alias-*` tokens … brand primary" (`:189-212`) | `--dsw-alias-brand-primary` is neutral black/white; the accent blue is `--dsw-alias-brand-primary-new-colorprimary-new-color` / `--dsw-alias-state-business-primary` | don't map accent → brand-primary; compute tinted surfaces in JS or use the blue tokens |
| 6 | Settings page `max-width: 720px` (`:190`) | section body is ~564px wide inside the 800px modal, and already scrolls/pads 24px | use `width:100%`, inner max-width ≤ 560px |
| 7 | Pet root `pointer-events: none` (`:134-136`) | `.overlayLayer>*{pointer-events:auto}` re-enables every direct child; class rule loses | make it an **inline** style on the root; only the pet body gets `auto` |
| 8 | Pass `store` to slot registration? (implied by `store` API narrative, `:104-110`) | slot `store:` option expects a `dsh-client-store` `defineStore` handle, not our settings store | don't pass it; `useSettings()` hook instead |
| 9 | Theme tab adds light/dark/system control (`:164-166`) | ui-theme already owns a host-persisted Appearance row in Settings → General; preference lives in Host settings (`ui-theme` namespace), not localStorage | keep the control (it writes through `RUNTIME.setPreference`) but label it as the host preference; don't also persist a scheme in our store (shape correctly has none) |
| 10 | `overrideTokens(PLUGIN_ID, ...)` (`:203`) | correct, but every token needs `{light,dark}`; bare string throws; re-call replaces the layer | always pair; keep the disposer and re-register on settings change |
| 11 | export/import via localStorage (`:95-96`, settings shape) | `background.imageData` is a base64 data URL stored in `localStorage`; 5 MB origin quota can be hit by large images | enforce canvas downscale (already planned) + wrap `store.persist` in try/catch, show inline error, don't lose settings silently |

Other risks worth noting (not contradictions):

- `settings.section` `id` must be stable (`aurora-studio`): it is the nav row id and the `{ only: active }`
  selector.
- The pet's `position:fixed` relies on no ancestor transform/filter — true today (`.frame` only has
  `transition` on grid-template-columns and `overflow:hidden`), so it is clipped to the frame but positioned
  in the viewport. Add viewport clamping as planned.
- Overlay z-index 20 vs settings modal 1000 vs toasts in other plugins: pet below settings modal (good),
  `--dsw-elevation-*` tokens available if we need our own popovers.
- HMR: style tags tagged `data-plugin` are removed by `client-modules` on rebuild; untagged tags are claimed
  once, so always tag.
- `ctx.effect` callbacks must be synchronous disposers (the `inject` implementation relies on that,
  `SlotRegistry.inject`); don't `await` inside.

---

## 9. Evidence index

Installed packages (readable only with the file-read tool):

- `ASAR\dsh-client-ui-theme\lib\client.js` — ThemeRuntime (`:1631-1882`), override validation (`:1931-1943`),
  token sheet strings (`:1406-1441`), appearance/font rows (`:26-1296`), styles install (`:1446-1458`).
- `ASAR\dsh-client-ui-theme\lib\index.js` — boot palette `#fff`/`#151517` (`:134-143`), host settings
  schema (`:186-195`), index injections (`:196-215`).
- `ASAR\dsh-client-ui-layout\lib\client.js` — ThemePresenter (`:503-586`), theme presenter effect
  (`:700-710`), root registration with `shell.overlay` (`:623-653`), overlay render (`:313,349-353`).
- `ASAR\dsh-client-ui-settings-general\lib\client.js` — settings modal markup (`:227-498`), `sidebar.settings`
  + children (`:1239-1274`), General section registration with `label` thunk (`:1299-1309`),
  `shell.overlay` registrant (`:1319-1324`), nav rows (`:1144-1168`).
- `ASAR\dsh-client-locale\lib\client.js` — LocaleRuntime (`:1187-1456`), register/bind/translate
  (`:1387-1435`), apply/installLocale (`:1490-1561`).
- `ASAR\dsh-client-modules\lib\client.js` — lazy-CJS contract (`:1-36`), `parseDshClient` (`:61-75`),
  register (`:701-714`), require/import (`:832-892`), `inject` arrival (`:776-794`), styles ownership
  (`:312-315,617-631`).
- `ASAR\dsh-cordis-client-runner\lib\client.js` — dynamic-only `styles` symbol (`:71-105,152-187`),
  guarded slots/theme (`:250-319`).
- `ASAR\dsh-client-ui-renderer\lib\client.js` — locale seat / `t` prop (`:533-558`), slots host usage.
- `…\dsh-agent-preset\skills\cordis-plugin-development\` — `references\ui-plugin.md`, `templates\decoration\`
  (`package.json`, `cordis.patch.yml`, `index.js`, `client.js`): the bundle manifest/client shape we follow.
- `…\dsh-agent-preset\skills\cordis-composition-reference\references\packages.md` — confirms both
  `dsh-client-ui-settings` and `dsh-client-ui-theme` are loadable packages (`:98`, `:118`).

Normalized extracts in this folder (generated by byte-scanning `app.asar`, content unmodified apart from
unescaping/line-wrapping):

- `EXTRACT\theme-design-platform.css` — full light/dark token sheets (383 lines).
- `EXTRACT\theme-base.css` — radii/fonts/body token ids.
- `EXTRACT\theme-gradient-shadow-text.css` — easing/shadow/elevation/type scale.
- `EXTRACT\theme-onboarding.css`, `theme-focus.css`, `theme-scrollbar.css`.
- `EXTRACT\layout-appframe.css` — frame/sidebar/overlay layer CSS.
- `EXTRACT\settings-root.css` — settings modal shell CSS.
- `EXTRACT\settings-general-section.css` — General section wrapper.
- `EXTRACT\ui-slots-slot-registry-snippet.js` — `SlotRegistry` (`inject`, `provideRoot`, `entries`,
  `getVersion`, `_register`) from the web boot bundle.
- `EXTRACT\…` line numbers cited above refer to these normalized files.

Not verifiable here (state explicitly): live `cordis_inspect_query` results for platform `client`
(Theme/Slots/Service/Builtin) — every call timed out (10 s, "Open or reconnect the Harness page").
Recommend the Lead re-run `Theme.listTokens` and `Slots.listSubTree` (roots `settings.section`,
`shell.overlay`) from the open GUI before install acceptance.
