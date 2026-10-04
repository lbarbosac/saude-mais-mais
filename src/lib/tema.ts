// Tema claro/escuro.
//
// A preferência é do aparelho (localStorage), não da conta: antes ela também
// era lida do banco, onde o padrão "claro" sobrescrevia a escolha local toda
// vez que a tela de Configurações abria — o "tema mudando sozinho".
//
// public/tema-inicial.js aplica a mesma regra antes do React carregar, para
// não piscar a tela clara.

import { useSyncExternalStore } from "react";

export type PreferenciaTema = "claro" | "escuro" | "sistema";

const CHAVE = "saude-theme";
const COR_BARRA = { claro: "#fcfcfc", escuro: "#11151c" } as const;

const ouvintes = new Set<() => void>();
const consultaEscuro = () => window.matchMedia("(prefers-color-scheme: dark)");

function ler(): PreferenciaTema {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === "claro" || salvo === "escuro" || salvo === "sistema") return salvo;
  } catch {
    // armazenamento bloqueado: segue o sistema
  }
  return "sistema";
}

function resolver(pref: PreferenciaTema): "claro" | "escuro" {
  if (pref !== "sistema") return pref;
  return consultaEscuro().matches ? "escuro" : "claro";
}

function aplicar(pref: PreferenciaTema) {
  const tema = resolver(pref);
  const raiz = document.documentElement;
  raiz.classList.toggle("dark", tema === "escuro");
  raiz.style.colorScheme = tema === "escuro" ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COR_BARRA[tema]);
}

export function obterPreferenciaTema(): PreferenciaTema {
  return ler();
}

export function definirPreferenciaTema(pref: PreferenciaTema) {
  try {
    localStorage.setItem(CHAVE, pref);
  } catch {
    // sem persistência; aplica só nesta sessão
  }
  aplicar(pref);
  ouvintes.forEach((f) => f());
}

/** Chamado uma vez no boot. Acompanha a troca de tema do sistema quando a preferência é "sistema". */
export function iniciarTema() {
  aplicar(ler());
  consultaEscuro().addEventListener("change", () => {
    if (ler() === "sistema") {
      aplicar("sistema");
      ouvintes.forEach((f) => f());
    }
  });
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** Preferência atual e tema efetivo, reativos. */
export function useTema() {
  const preferencia = useSyncExternalStore(assinar, ler, () => "sistema" as PreferenciaTema);
  return { preferencia, tema: resolver(preferencia), definir: definirPreferenciaTema };
}
