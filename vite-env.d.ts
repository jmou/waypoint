/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIVEBLOCKS_PUBLIC_KEY?: string;
  readonly VITE_LIVEBLOCKS_AUTH_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
