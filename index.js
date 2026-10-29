/**
 * Host half of the Aurora Studio bundle.
 *
 * Everything the user sees is rendered by the Client module (`client.js`):
 * the theme/background engine, the settings page and the desktop pet. The
 * Host row exists so the bundle is a normal Loader entry; it owns no
 * services, tools or Host state.
 */
export function apply() {}
