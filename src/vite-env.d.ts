/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_N8N_WEBHOOK_URL?: string;
  readonly VITE_N8N_FORM_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
