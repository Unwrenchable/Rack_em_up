/** Dev-only chrome (demo vs live switcher). Hidden on production builds. */
export function showDevModeChrome(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_SHOW_DEV_MODE === '1';
}
