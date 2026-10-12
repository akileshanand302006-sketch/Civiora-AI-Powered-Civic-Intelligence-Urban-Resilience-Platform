/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_MAPBOX_TOKEN: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_DEFAULT_ORG_SLUG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
