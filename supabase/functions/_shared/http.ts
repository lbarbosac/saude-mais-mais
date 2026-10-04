// Respostas HTTP e CORS compartilhados pelas Edge Functions.
//
// Origens permitidas vêm de ALLOWED_ORIGINS (lista separada por vírgula).
// Sem a variável, só os endereços do Vite local são aceitos.

const ORIGENS_DEV = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const origensConfiguradas = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const ORIGENS = origensConfiguradas.length > 0 ? origensConfiguradas : ORIGENS_DEV;

function origemPermitida(req: Request): string | null {
  const origem = req.headers.get("Origin");
  return origem && ORIGENS.includes(origem) ? origem : null;
}

export function cabecalhosCors(req: Request): Record<string, string> {
  const origem = origemPermitida(req);
  return {
    ...(origem ? { "Access-Control-Allow-Origin": origem } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Responde o preflight; devolve null se não for OPTIONS. */
export function preflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { status: origemPermitida(req) ? 204 : 403, headers: cabecalhosCors(req) });
}

export function json(req: Request, corpo: unknown, status = 200, extras: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cabecalhosCors(req), "Content-Type": "application/json; charset=utf-8", ...extras },
  });
}

export function erro(req: Request, mensagem: string, status = 400, extras: Record<string, unknown> = {}): Response {
  return json(req, { error: mensagem, ...extras }, status);
}

/** Lê o corpo JSON; devolve {} se vier vazio e null se for inválido. */
export async function lerCorpo(req: Request): Promise<Record<string, unknown> | null> {
  const texto = await req.text();
  if (!texto.trim()) return {};
  try {
    const valor = JSON.parse(texto);
    return valor && typeof valor === "object" && !Array.isArray(valor) ? valor : null;
  } catch {
    return null;
  }
}

/** Remove caracteres de controle, normaliza espaços nas pontas e corta no limite. */
export function limparTexto(valor: unknown, max: number): string {
  if (typeof valor !== "string") return "";
  // deno-lint-ignore no-control-regex
  return valor.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max); // eslint-disable-line no-control-regex
}

export function dataISOValida(valor: unknown): string | null {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : null;
}
