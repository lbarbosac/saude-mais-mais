import { supabase } from "@/lib/supabase/client";

interface CallFunctionOptions {
  body?: Record<string, unknown>;
}

interface CallFunctionResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Chama uma Supabase Edge Function autenticada.
 * Centraliza: token de sessão, URL, tratamento de erros HTTP.
 */
export async function callEdgeFunction<T = unknown>(
  functionName: string,
  options: CallFunctionOptions = {}
): Promise<CallFunctionResult<T>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    return { data: null, error: "Sessão expirada. Faça login novamente." };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(options.body ?? {}),
    });

    const json = await response.json();

    if (!response.ok) {
      return { data: null, error: json?.error ?? `Erro ${response.status}` };
    }

    return { data: json as T, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro de rede desconhecido.";
    return { data: null, error: message };
  }
}
