import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";

// Chave pública do projeto: a "publishable" nova (sb_publishable_...) ou a anon
// legada. As duas são seguras no navegador porque todo acesso passa pelo RLS.
export const supabaseKey =
  ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined)?.trim() ?? "";

/** true quando o .env não foi preenchido; main.tsx mostra uma tela explicando. */
export const configuracaoAusente = !supabaseUrl || !supabaseKey;

export const supabase = createClient<Database>(
  supabaseUrl || "http://localhost:54321",
  supabaseKey || "chave-ausente",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
