/// <reference types="vite/client" />

/** Versão do package.json, injetada pelo Vite. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Nome antigo da chave pública; continua aceito. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_CONTATO_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
