// supabase/functions/_shared/cors.ts
// Compartilhado entre todas as Edge Functions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Restringe as origens permitidas via variável de ambiente ALLOWED_ORIGINS
// (lista separada por vírgula). Configure em: Supabase > Edge Functions > Secrets
// Ex: ALLOWED_ORIGINS=https://saudeemsintoniaapp.com,https://www.saudeemsintoniaapp.com
// Em desenvolvimento local (sem a env var), libera localhost para não travar o dev.

const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const DEV_FALLBACK_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
];

const ALLOWED_ORIGINS = configuredOrigins.length > 0 ? configuredOrigins : DEV_FALLBACK_ORIGINS;

function resolveOrigin(req: Request): string {
  const origin = req.headers.get("Origin") ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  // Sem env configurada (dev) e origem desconhecida: permite mas avisa nos logs
  if (configuredOrigins.length === 0) return origin || DEV_FALLBACK_ORIGINS[0];
  // Produção configurada e origem não reconhecida: nega de forma segura
  return "null";
}

function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function corsPreflightResponse(req?: Request): Response {
  const headers = req ? buildCorsHeaders(req) : { "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
  return new Response(null, { status: 204, headers });
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
  req?: Request
): Response {
  const corsHeaders = req ? buildCorsHeaders(req) : { "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

export function errorResponse(message: string, status = 400, req?: Request): Response {
  return jsonResponse({ error: message }, status, {}, req);
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
    return { error: errorResponse("Não autorizado", 401, req) };
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
    return { error: errorResponse("Não autorizado", 401, req) };
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
