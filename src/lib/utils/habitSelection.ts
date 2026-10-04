import { getDailySeed } from "@/lib/utils/date";

/**
 * Sugestão dos hábitos do dia.
 *
 * Roda só uma vez por dia: o resultado é gravado no banco
 * (definir_habitos_do_dia) e, a partir daí, Início e Hábitos leem a lista
 * gravada. Antes a seleção era recalculada a cada carregamento e mudava ao
 * longo do dia, porque o próprio cálculo alterava os pesos que usava.
 *
 * Critérios:
 *   1. Um hábito de cada categoria com vaga fixa (variedade).
 *   2. As vagas restantes vão para os de maior peso.
 *   3. Peso maior para quem não aparece há mais tempo e para quem a pessoa
 *      raramente conclui; menor para os que ela sempre conclui.
 *   4. Empates resolvidos por uma semente do dia + usuário (determinístico).
 */

export interface HabitoParaSelecao {
  id: string;
  categoria: string;
  /** Última data (antes de hoje) em que o hábito esteve na lista; null = nunca. */
  ultima_exibicao: string | null;
  vezes_exibido: number;
  vezes_concluido: number;
}

export const HABITOS_POR_DIA = 6;

const CATEGORIAS_COM_VAGA = ["movimento", "agua_alimentacao", "sono_descanso", "respiracao", "social_gratidao"];

function diasEntre(deISO: string, ateISO: string): number {
  const [a, b] = [deISO, ateISO].map((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86_400_000);
}

export function calcularPeso(h: HabitoParaSelecao, hoje: string): number {
  let peso = 10;

  if (h.ultima_exibicao === null) peso += 50;
  else peso += Math.min(Math.max(diasEntre(h.ultima_exibicao, hoje), 0) * 8, 40);

  const taxa = h.vezes_exibido > 0 ? h.vezes_concluido / h.vezes_exibido : 0;
  if (taxa < 0.2) peso += 15;
  else if (taxa > 0.8) peso -= 5;

  return Math.max(peso, 1);
}

export function selecionarHabitosDoDia<T extends HabitoParaSelecao>(habitos: T[], userId: string, hoje: string): T[] {
  if (habitos.length <= HABITOS_POR_DIA) return [...habitos];

  const desempate = (h: T) => getDailySeed(hoje + h.id, userId) % 1000;
  const ordenar = (a: T, b: T) => calcularPeso(b, hoje) - calcularPeso(a, hoje) || desempate(a) - desempate(b);

  const escolhidos: T[] = [];
  const usados = new Set<string>();

  for (const categoria of CATEGORIAS_COM_VAGA) {
    const melhor = habitos.filter((h) => h.categoria === categoria).sort(ordenar)[0];
    if (melhor) {
      escolhidos.push(melhor);
      usados.add(melhor.id);
    }
  }

  for (const h of habitos.filter((x) => !usados.has(x.id)).sort(ordenar)) {
    if (escolhidos.length >= HABITOS_POR_DIA) break;
    escolhidos.push(h);
  }

  return escolhidos.slice(0, HABITOS_POR_DIA);
}
