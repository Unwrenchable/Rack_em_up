/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_URL?: string;
  /** Public site origin for share cards / canonical URLs. */
  readonly VITE_PUBLIC_ORIGIN?: string;
  /** Show Mode / Live API chrome on Profile + Settings (local only). */
  readonly VITE_SHOW_DEV_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.md?raw' {
  const src: string;
  export default src;
}
