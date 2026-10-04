// Cliente mínimo da Gemini API (REST), sem SDK.
//
// Configuração (Supabase > Edge Functions > Secrets):
//   GEMINI_API_KEY  obrigatório, nunca vai para o frontend
//   GEMINI_MODEL    opcional; padrão abaixo (modelo estável do free tier)
//
// Toda falha vira um ErroIA com um "tipo" que as funções traduzem em
// mensagem amigável e status HTTP. O app nunca recebe o erro cru do Google.

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const MODELO_PADRAO = "gemini-3.5-flash-lite";

export type TipoErroIA =
  | "configuracao" // chave ausente/inválida, modelo inexistente
  | "cota"         // limite do free tier ou rate limit (429)
  | "indisponivel" // 5xx ou falha de rede
  | "tempo"        // timeout
  | "bloqueado"    // filtro de segurança
  | "resposta";    // resposta vazia, cortada ou fora do formato

export class ErroIA extends Error {
  constructor(public tipo: TipoErroIA, mensagem: string) {
    super(mensagem);
    this.name = "ErroIA";
  }
}

export interface Mensagem {
  papel: "user" | "model";
  texto: string;
}

interface Opcoes {
  sistema: string;
  mensagens: Mensagem[];
  temperatura?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export function modeloConfigurado(): string {
  return Deno.env.get("GEMINI_MODEL")?.trim() || MODELO_PADRAO;
}

function chave(): string {
  const valor = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!valor) throw new ErroIA("configuracao", "GEMINI_API_KEY não configurada");
  return valor;
}

/**
 * A API exige alternância user/model começando por user. Mensagens seguidas do
 * mesmo papel (ex.: uma resposta que falhou) são unidas.
 */
export function montarConteudos(mensagens: Mensagem[]) {
  const conteudos: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const m of mensagens) {
    const texto = m.texto.trim();
    if (!texto) continue;
    const ultimo = conteudos[conteudos.length - 1];
    if (ultimo && ultimo.role === m.papel) {
      ultimo.parts[0].text += `\n\n${texto}`;
    } else {
      conteudos.push({ role: m.papel, parts: [{ text: texto }] });
    }
  }
  while (conteudos.length > 0 && conteudos[0].role !== "user") conteudos.shift();
  return conteudos;
}

function corpo(op: Opcoes, extra: Record<string, unknown> = {}) {
  const conteudos = montarConteudos(op.mensagens);
  if (conteudos.length === 0) throw new ErroIA("resposta", "Nenhuma mensagem para enviar");
  return JSON.stringify({
    systemInstruction: { parts: [{ text: op.sistema }] },
    contents: conteudos,
    generationConfig: {
      temperature: op.temperatura ?? 0.7,
      maxOutputTokens: op.maxTokens ?? 1024,
      ...extra,
    },
  });
}

async function erroDaResposta(resp: Response): Promise<ErroIA> {
  const detalhe = (await resp.text().catch(() => "")).slice(0, 500);
  console.error(`[gemini] HTTP ${resp.status}: ${detalhe}`);
  if (resp.status === 429) return new ErroIA("cota", "Limite de uso da IA atingido");
  if (resp.status === 400 || resp.status === 401 || resp.status === 403 || resp.status === 404) {
    return new ErroIA("configuracao", `Requisição recusada (${resp.status})`);
  }
  return new ErroIA("indisponivel", `Serviço indisponível (${resp.status})`);
}

/** Timeout que vale até o corpo da resposta ser lido por completo. */
function prazo(timeoutMs: number) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), timeoutMs);
  return { signal: controle.signal, encerrar: () => clearTimeout(timer) };
}

function traduzirFalha(e: unknown): ErroIA {
  if (e instanceof ErroIA) return e;
  if (e instanceof DOMException && e.name === "AbortError") return new ErroIA("tempo", "A IA demorou demais para responder");
  console.error("[gemini] falha de rede:", e);
  return new ErroIA("indisponivel", "Não foi possível falar com a IA");
}

async function chamar(url: string, body: string, signal: AbortSignal): Promise<Response> {
  // Uma nova tentativa só para falhas transitórias (5xx); 429 não adianta repetir.
  for (let tentativa = 1; ; tentativa++) {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": chave() },
      body,
      signal,
    });
    if (resp.ok) return resp;
    if (resp.status >= 500 && tentativa === 1) {
      await resp.body?.cancel();
      await new Promise((r) => setTimeout(r, 800));
      continue;
    }
    throw await erroDaResposta(resp);
  }
}

interface Candidato {
  content?: { parts?: { text?: string; thought?: boolean }[] };
  finishReason?: string;
}
interface RespostaGemini {
  candidates?: Candidato[];
  promptFeedback?: { blockReason?: string };
}

const MOTIVOS_BLOQUEIO = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION", "IMAGE_SAFETY"]);

function extrairTexto(dados: RespostaGemini): { texto: string; fim?: string } {
  if (dados.promptFeedback?.blockReason) throw new ErroIA("bloqueado", `Pedido bloqueado: ${dados.promptFeedback.blockReason}`);
  const candidato = dados.candidates?.[0];
  const texto = (candidato?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  if (candidato?.finishReason && MOTIVOS_BLOQUEIO.has(candidato.finishReason)) {
    throw new ErroIA("bloqueado", `Resposta bloqueada: ${candidato.finishReason}`);
  }
  return { texto, fim: candidato?.finishReason };
}

/** Gera uma resposta curta de texto (ex.: título de conversa). */
export async function gerarTexto(op: Opcoes): Promise<string> {
  const p = prazo(op.timeoutMs ?? 20_000);
  try {
    const resp = await chamar(`${API}/${modeloConfigurado()}:generateContent`, corpo(op), p.signal);
    const { texto } = extrairTexto(await resp.json());
    if (!texto.trim()) throw new ErroIA("resposta", "Resposta vazia");
    return texto.trim();
  } catch (e) {
    throw traduzirFalha(e);
  } finally {
    p.encerrar();
  }
}

/**
 * Gera JSON validado por um schema (subconjunto OpenAPI aceito pela Gemini).
 * O resultado ainda deve ser validado por quem chama: o schema reduz, mas não
 * elimina, respostas fora do formato.
 */
export async function gerarJSON<T>(op: Opcoes & { schema: Record<string, unknown> }): Promise<T> {
  const p = prazo(op.timeoutMs ?? 50_000);
  let texto: string;
  let fim: string | undefined;
  try {
    const resp = await chamar(
      `${API}/${modeloConfigurado()}:generateContent`,
      corpo(op, { responseMimeType: "application/json", responseSchema: op.schema }),
      p.signal,
    );
    ({ texto, fim } = extrairTexto(await resp.json()));
  } catch (e) {
    throw traduzirFalha(e);
  } finally {
    p.encerrar();
  }
  if (fim === "MAX_TOKENS") throw new ErroIA("resposta", "Resposta cortada pelo limite de tokens");
  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new ErroIA("resposta", "A IA respondeu fora do formato esperado");
  }
}

/**
 * Streaming via SSE. Entrega os pedaços de texto conforme chegam.
 * O timeout vale para a resposta inteira.
 */
export async function* gerarTextoStream(op: Opcoes): AsyncGenerator<string> {
  const p = prazo(op.timeoutMs ?? 60_000);
  let leitor: ReadableStreamDefaultReader<string> | undefined;
  let recebeuTexto = false;
  try {
    const resp = await chamar(`${API}/${modeloConfigurado()}:streamGenerateContent?alt=sse`, corpo(op), p.signal);
    if (!resp.body) throw new ErroIA("indisponivel", "Resposta sem corpo");
    leitor = resp.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      buffer += value;
      let quebra: number;
      while ((quebra = buffer.indexOf("\n")) !== -1) {
        const linha = buffer.slice(0, quebra).trim();
        buffer = buffer.slice(quebra + 1);
        if (!linha.startsWith("data:")) continue;
        let evento: RespostaGemini;
        try {
          evento = JSON.parse(linha.slice(5).trim());
        } catch {
          continue;
        }
        const { texto } = extrairTexto(evento);
        if (texto) {
          recebeuTexto = true;
          yield texto;
        }
      }
    }
  } catch (e) {
    throw traduzirFalha(e);
  } finally {
    p.encerrar();
    leitor?.cancel().catch(() => {});
  }
  if (!recebeuTexto) throw new ErroIA("resposta", "Resposta vazia");
}

/** Mensagem e status HTTP para cada tipo de falha, já no tom do app. */
export function respostaParaErro(e: unknown): { status: number; mensagem: string; tipo: TipoErroIA | "interno" } {
  if (!(e instanceof ErroIA)) {
    console.error("[ia] erro inesperado:", e);
    return { status: 500, tipo: "interno", mensagem: "Algo deu errado do nosso lado. Tente novamente em instantes." };
  }
  switch (e.tipo) {
    case "cota":
      return { status: 429, tipo: e.tipo, mensagem: "A IA atingiu o limite de uso por agora. Tente de novo em alguns minutos." };
    case "tempo":
      return { status: 504, tipo: e.tipo, mensagem: "A IA demorou demais para responder. Tente novamente." };
    case "bloqueado":
      return { status: 422, tipo: e.tipo, mensagem: "Não consegui responder a isso." };
    case "resposta":
      return { status: 502, tipo: e.tipo, mensagem: "A IA respondeu de um jeito inesperado. Tente novamente." };
    case "configuracao":
      console.error("[ia] configuração:", e.message);
      return { status: 503, tipo: e.tipo, mensagem: "A IA está indisponível no momento." };
    default:
      return { status: 503, tipo: e.tipo, mensagem: "A IA está indisponível no momento. Tente novamente em instantes." };
  }
}
