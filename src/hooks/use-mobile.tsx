import { useSyncExternalStore } from "react";

const CONSULTA = "(max-width: 767px)";

function assinar(aviso: () => void) {
  const mql = window.matchMedia(CONSULTA);
  mql.addEventListener("change", aviso);
  return () => mql.removeEventListener("change", aviso);
}

/**
 * true abaixo de 768px. Lê o valor já no primeiro render: a versão anterior
 * começava como "desktop" e trocava depois, remontando a página inteira no celular.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(assinar, () => window.matchMedia(CONSULTA).matches, () => false);
}
