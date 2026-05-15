// supabase/functions/_shared/cors.ts
// Compartilhado entre todas as Edge Functions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Em produção, substitua "*" pelo domínio real da sua aplicação.
// Ex: "https://seuapp.vercel.app"
// O wildcard é necessário durante desenvolvimento local com supabase start.

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", ...extraHeaders },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ─── Autenticação ─────────────────────────────────────────────────────────────

/**
 * Valida o Bearer token e retorna o userId autenticado.
 * Lança erro (retorna null + Response) se inválido.
 */
export async function authenticateRequest(
  req: Request
): Promise<{ userId: string; supabase: ReturnType<typeof createClient> } | { error: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: errorResponse("Não autorizado", 401) };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );

  if (error || !user) {
    return { error: errorResponse("Não autorizado", 401) };
  }

  return { userId: user.id, supabase };
}

// ─── Rate limiting (in-memory, por instância Deno) ────────────────────────────

const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  userId: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimits.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// ─── Sanitização ──────────────────────────────────────────────────────────────

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above/i,
  /you\s+are\s+now\s+/i,
  /jailbreak/i,
  /bypass\s+(your\s+)?rules/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+if\s+you\s+have\s+no\s+restrictions/i,
];

export function detectPromptInjection(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((p) => p.test(text));
}

export function sanitizeUserInput(text: string, maxLength = 4000): string {
  return text.replace(/<[^>]*>/g, "").slice(0, maxLength).trim();
}

export function sanitizeAIResponse(text: string): string {
  return text
    .replace(/OPENAI_API_KEY[=:]\s*\S+/gi, "[REDACTED]")
    .replace(/SUPABASE_[A-Z_]+[=:]\s*\S+/gi, "[REDACTED]")
    .replace(/Bearer\s+ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED]");
}
