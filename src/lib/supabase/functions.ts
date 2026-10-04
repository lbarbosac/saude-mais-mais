import { supabase, supabaseKey, supabaseUrl } from "@/lib/supabase/client";

export interface ResultadoFuncao<T> {
  data: T | null;
  error: string | null;
  status: number;
}

const ERRO_REDE = "Sem conexão com o servidor. Verifique sua internet e tente de novo.";

/** Cabeçalhos para chamar uma Edge Function em nome do usuário logado. */
export async function cabecalhosDaFuncao(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    apikey: supabaseKey,
  };
}

export function urlDaFuncao(nome: string): string {
  return `${supabaseUrl}/functions/v1/${nome}`;
}

/**
 * Chama uma Edge Function e normaliza o resultado. Nunca lança: erros de rede,
 * timeout e respostas não-JSON viram uma mensagem pronta para mostrar.
 */
export async function callEdgeFunction<T = unknown>(
  nome: string,
  { body = {}, timeoutMs = 60_000 }: { body?: Record<string, unknown>; timeoutMs?: number } = {},
): Promise<ResultadoFuncao<T>> {
  const headers = await cabecalhosDaFuncao();
  if (!headers) return { data: null, error: "Sua sessão expirou. Entre novamente.", status: 401 };

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), timeoutMs);
  try {
    const resp = await fetch(urlDaFuncao(nome), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controle.signal,
    });
    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
      const mensagem = typeof json?.error === "string" ? json.error : "Algo deu errado. Tente novamente.";
      return { data: null, error: mensagem, status: resp.status };
    }
    return { data: json as T, error: null, status: resp.status };
  } catch (e) {
    const tempo = e instanceof DOMException && e.name === "AbortError";
    return { data: null, error: tempo ? "Demorou demais para responder. Tente novamente." : ERRO_REDE, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}
