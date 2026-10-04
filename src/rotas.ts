// Imports das telas carregadas sob demanda. Ficam juntos para que o App use
// em React.lazy e o AppLayout possa pré-carregá-los quando o navegador estiver ocioso.

export const rotas = {
  login: () => import("@/pages/Login"),
  redefinirSenha: () => import("@/pages/ResetPassword"),
  termos: () => import("@/pages/TermosDeUso"),
  privacidade: () => import("@/pages/PoliticaPrivacidade"),
  sons: () => import("@/pages/Sounds"),
  treinos: () => import("@/pages/Treinos"),
  progresso: () => import("@/pages/Progress"),
  perfil: () => import("@/pages/Profile"),
  amigos: () => import("@/pages/Friends"),
  amigo: () => import("@/pages/FriendProfile"),
  desafios: () => import("@/pages/Challenges"),
  configuracoes: () => import("@/pages/Settings"),
};

/** Telas do app logado, pré-carregadas depois que o Início abre. */
export function preCarregarTelas() {
  const telas = [rotas.sons, rotas.treinos, rotas.progresso, rotas.perfil, rotas.amigos, rotas.desafios, rotas.configuracoes, rotas.amigo];
  const agendar = (f: () => void) =>
    typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(f, { timeout: 4000 }) : window.setTimeout(f, 1500);
  agendar(() => {
    for (const tela of telas) tela().catch(() => {});
  });
}
