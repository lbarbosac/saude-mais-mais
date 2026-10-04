/**
 * Lê um fluxo Server-Sent Events e entrega cada evento "data:" já convertido
 * de JSON. Linhas quebradas entre pedaços da rede são remontadas; linhas que
 * não são JSON válido são ignoradas.
 */
export async function* lerEventosSSE<T = unknown>(corpo: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const leitor = corpo.getReader();
  const decodificador = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      buffer += decodificador.decode(value, { stream: true });
      let quebra: number;
      while ((quebra = buffer.indexOf("\n")) !== -1) {
        const evento = interpretarLinha(buffer.slice(0, quebra));
        buffer = buffer.slice(quebra + 1);
        if (evento !== undefined) yield evento as T;
      }
    }
    buffer += decodificador.decode();
    const ultimo = interpretarLinha(buffer);
    if (ultimo !== undefined) yield ultimo as T;
  } finally {
    leitor.releaseLock();
  }
}

function interpretarLinha(linha: string): unknown {
  const texto = linha.trim();
  if (!texto.startsWith("data:")) return undefined;
  try {
    return JSON.parse(texto.slice(5).trim());
  } catch {
    return undefined;
  }
}
