/**
 * Retorna a data de hoje no formato ISO (YYYY-MM-DD).
 */
export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Gera um número de seed determinístico a partir de uma data e userId.
 * Usado para selecionar o subset de hábitos do dia de forma consistente
 * entre Dashboard, Habits e Progress.
 */
export function getDailySeed(dateStr: string, userId: string): number {
  const raw = dateStr + userId;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Embaralha um array deterministicamente usando um seed.
 * Algoritmo: LCG (Linear Congruential Generator) + Fisher-Yates.
 */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Retorna a saudação correta baseada no horário atual.
 */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
