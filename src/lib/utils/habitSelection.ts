import { getDailySeed } from "@/lib/utils/date";

/**
 * Seleção inteligente de hábitos diários
 *
 * Algoritmo:
 *   1. Agrupa hábitos por categoria
 *   2. Calcula um "peso de prioridade" para cada hábito baseado em:
 *      - Dias desde a última exibição (nunca exibido = máxima prioridade)
 *      - Taxa de conclusão histórica (hábitos nunca concluídos ganham mais chances)
 *   3. Seleciona hábitos garantindo cobertura de categorias diversas
 *   4. Preenche slots restantes pelos de maior prioridade
 */

export interface HabitoParaSelecao {
  id: string;
  nome_habito: string;
  descricao: string | null;
  icone: string;
  categoria: string;
  ultima_exibicao: string | null;   // ISO date ou null
  concluido_hoje: boolean;
  vezes_concluido: number;          // total histórico
  vezes_exibido: number;            // total histórico
}

export interface HabitoSelecionado {
  id: string;
  nome_habito: string;
  descricao: string | null;
  icone: string;
  categoria: string;
  concluido_hoje: boolean;
}

// Categorias e quantos slots cada uma deve ter no dia (total = 6)
const CATEGORIA_SLOTS: Record<string, number> = {
  movimento:          1,
  agua_alimentacao:   1,
  sono_descanso:      1,
  respiracao:         1,
  social_gratidao:    1,
  foco_aprendizado:   0, // entra no pool geral
  humor_emocao:       0, // entra no pool geral
  geral:              0,
};

const HABITOS_POR_DIA = 6;

/**
 * Calcula o peso de prioridade de um hábito.
 * Quanto maior o peso, maior a chance de ser selecionado hoje.
 */
function calcularPeso(h: HabitoParaSelecao, hoje: Date): number {
  let peso = 10; // base

  // Bônus por não ter sido exibido recentemente
  if (h.ultima_exibicao === null) {
    peso += 50; // nunca exibido — prioridade máxima
  } else {
    // Parse YYYY-MM-DD safely without timezone shift
    const [y, mo, d] = h.ultima_exibicao.split("-").map(Number);
    const exibicaoDate = new Date(y, mo - 1, d);
    const diasDesdeExibicao = Math.floor(
      (hoje.getTime() - exibicaoDate.getTime()) / 86_400_000
    );
    peso += Math.min(diasDesdeExibicao * 8, 40); // máximo +40 por antiguidade
  }

  // Bônus para hábitos que o usuário raramente conclui (precisa de mais exposição)
  const taxaConclusao = h.vezes_exibido > 0
    ? h.vezes_concluido / h.vezes_exibido
    : 0;

  if (taxaConclusao < 0.2) peso += 15;       // raramente conclui → aparece mais
  else if (taxaConclusao > 0.8) peso -= 5;   // sempre conclui → dá espaço para novos

  return Math.max(peso, 1);
}

/**
 * Seleciona HABITOS_POR_DIA hábitos com cobertura de categorias e prioridade por peso.
 */
export function selecionarHabitosDodia(
  habitos: HabitoParaSelecao[],
  userId = "",
  today = ""
): HabitoSelecionado[] {
  if (habitos.length === 0) return [];
  if (habitos.length <= HABITOS_POR_DIA) {
    return habitos.map(toSelecionado);
  }

  const hoje = new Date();
  const selecionados = new Set<string>();
  const resultado: HabitoSelecionado[] = [];

  // Agrupa por categoria com peso calculado
  const porCategoria = new Map<string, HabitoParaSelecao[]>();
  for (const h of habitos) {
    const cat = h.categoria ?? "geral";
    if (!porCategoria.has(cat)) porCategoria.set(cat, []);
    porCategoria.get(cat)!.push(h);
  }

  // Ordena cada grupo por peso (maior primeiro)
  // Usa seed como desempate para garantir seleção determinística no mesmo dia
  const seed = userId && today ? getDailySeed(today, userId) : 0;
  for (const grupo of porCategoria.values()) {
    grupo.sort((a, b) => {
      const diff = calcularPeso(b, hoje) - calcularPeso(a, hoje);
      if (diff !== 0) return diff;
      // Desempate determinístico baseado no id + seed do dia
      const seedA = getDailySeed(today + a.id, userId) % 1000;
      const seedB = getDailySeed(today + b.id, userId) % 1000;
      return seedA - seedB;
    });
  }
  void seed; // usado indiretamente no sort

  // Passo 1: garante pelo menos 1 hábito das categorias com slot fixo
  for (const [cat, slots] of Object.entries(CATEGORIA_SLOTS)) {
    if (slots === 0) continue;
    const grupo = porCategoria.get(cat);
    if (!grupo) continue;

    for (const h of grupo) {
      if (selecionados.has(h.id)) continue;
      selecionados.add(h.id);
      resultado.push(toSelecionado(h));
      break; // apenas 1 por categoria neste passo
    }

    if (resultado.length >= HABITOS_POR_DIA) break;
  }

  // Passo 2: preenche slots restantes com os de maior peso geral
  if (resultado.length < HABITOS_POR_DIA) {
    const pool = habitos
      .filter((h) => !selecionados.has(h.id))
      .sort((a, b) => {
        const diff = calcularPeso(b, hoje) - calcularPeso(a, hoje);
        if (diff !== 0) return diff;
        const seedA = getDailySeed(today + a.id, userId) % 1000;
        const seedB = getDailySeed(today + b.id, userId) % 1000;
        return seedA - seedB;
      });

    for (const h of pool) {
      if (resultado.length >= HABITOS_POR_DIA) break;
      selecionados.add(h.id);
      resultado.push(toSelecionado(h));
    }
  }

  return resultado;
}

function toSelecionado(h: HabitoParaSelecao): HabitoSelecionado {
  return {
    id:             h.id,
    nome_habito:    h.nome_habito,
    descricao:      h.descricao,
    icone:          h.icone,
    categoria:      h.categoria,
    concluido_hoje: h.concluido_hoje,
  };
}
