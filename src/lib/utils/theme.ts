/**
 * Gerenciamento de tema centralizado.
 * O tema é lido do localStorage uma única vez no boot e aplicado ao <html>.
 * Settings.tsx usa estas funções para alterar o tema globalmente.
 */

const STORAGE_KEY = "saude-theme";

export type Theme = "claro" | "escuro";

/** Lê o tema salvo ou detecta preferência do sistema */
export function getStoredTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (saved === "claro" || saved === "escuro") return saved;
  // Respeita preferência do sistema se não houver preferência salva
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

/** Aplica o tema ao <html> e salva no localStorage */
export function applyTheme(theme: Theme): void {
  const isDark = theme === "escuro";
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem(STORAGE_KEY, theme);
}

/** Inicializa o tema antes do React renderizar (evita flash) */
export function initTheme(): void {
  applyTheme(getStoredTheme());
}
