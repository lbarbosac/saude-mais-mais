// Datas como texto "AAAA-MM-DD" no horário LOCAL do aparelho.
// Evita o erro de usar toISOString(), que está em UTC: às 21h em Brasília o
// "hoje" em UTC já é amanhã.

function formatar(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Hoje, no horário local. */
export function todayISO(): string {
  return formatar(new Date());
}

/** Data local de um objeto Date. */
export function dataLocalISO(d: Date): string {
  return formatar(d);
}

/** Soma (ou subtrai) dias a uma data "AAAA-MM-DD". */
export function somarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return formatar(new Date(y, m - 1, d + dias));
}

/** Converte "AAAA-MM-DD" em Date à meia-noite local (sem deslocamento de fuso). */
export function deISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Semente determinística a partir de data e usuário.
 * FNV-1a com mistura final: mudar um único caractere (o dia) embaralha o
 * resultado inteiro. O hash linear anterior só deslocava todos os valores pela
 * mesma constante, e a ordem dos empates ficava igual todo dia.
 */
export function getDailySeed(dateStr: string, userId: string): number {
  const raw = `${dateStr}|${userId}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  return hash >>> 0;
}

/** Saudação conforme a hora local. */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
