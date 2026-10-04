// Recuperação de "chunk sumiu": depois de um deploy, os arquivos JS com hash
// antigo não existem mais no servidor e o import dinâmico de uma rota falha
// (no build minificado o erro aparece como "throw t._result").
//
// A saída é recarregar a página uma vez para buscar o index.html novo. A marca
// no sessionStorage evita um loop de recargas se o problema for outro.

const CHAVE = "saude:recarga-chunk";
const JANELA_MS = 30_000;

export function ehErroDeChunk(erro: unknown): boolean {
  const mensagem = erro instanceof Error ? `${erro.name} ${erro.message}` : String(erro);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|ChunkLoadError|Loading chunk .* failed|preload/i.test(
    mensagem,
  );
}

/** Recarrega uma vez; devolve false se já tentou há pouco (aí o erro é mostrado). */
export function recarregarSeChunkSumiu(): boolean {
  try {
    const ultima = Number(sessionStorage.getItem(CHAVE) ?? 0);
    if (Date.now() - ultima < JANELA_MS) return false;
    sessionStorage.setItem(CHAVE, String(Date.now()));
  } catch {
    // sessionStorage indisponível (modo privado restrito): recarrega mesmo assim
  }
  window.location.reload();
  return true;
}
