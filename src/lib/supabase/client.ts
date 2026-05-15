import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Não lança erro aqui — deixa o React montar para exibir feedback visual.
  // Em dev, o console aponta exatamente o que está faltando.
  console.error(
    "[Supabase] Variáveis de ambiente ausentes.\n" +
    "Crie um arquivo .env na raiz do projeto com:\n" +
    "  VITE_SUPABASE_URL=https://<project>.supabase.co\n" +
    "  VITE_SUPABASE_ANON_KEY=<anon-key>"
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
