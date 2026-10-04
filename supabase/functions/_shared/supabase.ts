// Clientes do Supabase e autenticação das Edge Functions.
//
// Projetos novos expõem as chaves em SUPABASE_PUBLISHABLE_KEYS e
// SUPABASE_SECRET_KEYS (JSON com a chave "default"); projetos antigos usam
// SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY. Os dois formatos funcionam.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { erro } from "./http.ts";

function chaveDoDicionario(nome: string): string | undefined {
  const bruto = Deno.env.get(nome);
  if (!bruto) return undefined;
  try {
    const dicionario = JSON.parse(bruto) as Record<string, string>;
    return dicionario.default ?? Object.values(dicionario)[0];
  } catch {
    return undefined;
  }
}

const URL_SUPABASE = Deno.env.get("SUPABASE_URL") ?? "";
const CHAVE_PUBLICA = chaveDoDicionario("SUPABASE_PUBLISHABLE_KEYS") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const CHAVE_SECRETA = chaveDoDicionario("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const SEM_SESSAO = { auth: { persistSession: false, autoRefreshToken: false } };

/** Cliente com privilégios totais. Usar só para o que o RLS não cobre. */
export function clienteAdmin(): SupabaseClient {
  return createClient(URL_SUPABASE, CHAVE_SECRETA, SEM_SESSAO);
}

export interface Autenticado {
  userId: string;
  /** Cliente que age como o usuário: todas as consultas passam pelo RLS. */
  db: SupabaseClient;
}

/** Valida o token do usuário. Em caso de falha, devolve a resposta 401 pronta. */
export async function autenticar(req: Request): Promise<Autenticado | { resposta: Response }> {
  const cabecalho = req.headers.get("Authorization") ?? "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7).trim() : "";
  if (!token) return { resposta: erro(req, "Faça login para continuar.", 401) };

  const db = createClient(URL_SUPABASE, CHAVE_PUBLICA, {
    ...SEM_SESSAO,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await db.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId || data.claims.role !== "authenticated") {
    return { resposta: erro(req, "Sua sessão expirou. Entre novamente.", 401) };
  }

  return { userId, db };
}

/**
 * Registra um uso de IA e diz se o usuário ainda está dentro do limite.
 * Se o banco falhar, libera (melhor atender do que travar o app por causa do contador).
 */
export async function dentroDaCota(userId: string, recurso: string, limite: number, janelaSegundos: number): Promise<boolean> {
  const { data, error } = await clienteAdmin().rpc("consumir_cota_ia", {
    p_user: userId,
    p_recurso: recurso,
    p_limite: limite,
    p_janela_segundos: janelaSegundos,
  });
  if (error) {
    console.error(`[cota] falha ao registrar uso de ${recurso}:`, error.message);
    return true;
  }
  return data === true;
}
