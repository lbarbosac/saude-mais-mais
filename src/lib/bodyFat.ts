// Percentual de gordura pelo método da Marinha dos EUA (Hodgdon e Beckett).
// As constantes abaixo são da versão em POLEGADAS: as medidas em cm são
// convertidas antes. Usar cm direto superestimava o resultado (cerca de 6
// pontos para homens e mais de 20 para mulheres).

export interface BodyFatInput {
  sexo: "masculino" | "feminino";
  alturaCm: number;
  pescocoCm: number;
  cinturaCm: number;
  quadrilCm?: number; // obrigatório para feminino
}

const POLEGADA_CM = 2.54;

/**
 * Homens:   %G = 86,010 × log10(cintura − pescoço) − 70,041 × log10(altura) + 36,76
 * Mulheres: %G = 163,205 × log10(cintura + quadril − pescoço) − 97,684 × log10(altura) − 78,387
 * (todas as medidas em polegadas)
 */
export function calculateBodyFat(input: BodyFatInput): number | null {
  const emPolegadas = (cm: number | undefined) => (cm ? cm / POLEGADA_CM : 0);
  const altura = emPolegadas(input.alturaCm);
  const pescoco = emPolegadas(input.pescocoCm);
  const cintura = emPolegadas(input.cinturaCm);
  const quadril = emPolegadas(input.quadrilCm);
  const { sexo } = input;
  if (!altura || !pescoco || !cintura) return null;

  if (sexo === "masculino") {
    const diff = cintura - pescoco;
    if (diff <= 0) return null;
    const result = 86.01 * Math.log10(diff) - 70.041 * Math.log10(altura) + 36.76;
    return Math.max(2, Math.min(60, Number(result.toFixed(1))));
  } else {
    if (!quadril) return null;
    const diff = cintura + quadril - pescoco;
    if (diff <= 0) return null;
    const result = 163.205 * Math.log10(diff) - 97.684 * Math.log10(altura) - 78.387;
    return Math.max(2, Math.min(60, Number(result.toFixed(1))));
  }
}

export function classifyBodyFat(percent: number, sexo: "masculino" | "feminino"): { label: string; color: string } {
  if (sexo === "masculino") {
    if (percent < 6) return { label: "Essencial", color: "text-blue-500" };
    if (percent < 14) return { label: "Atlético", color: "text-emerald-500" };
    if (percent < 18) return { label: "Em forma", color: "text-green-500" };
    if (percent < 25) return { label: "Médio", color: "text-yellow-500" };
    return { label: "Acima do recomendado", color: "text-orange-500" };
  } else {
    if (percent < 14) return { label: "Essencial", color: "text-blue-500" };
    if (percent < 21) return { label: "Atlético", color: "text-emerald-500" };
    if (percent < 25) return { label: "Em forma", color: "text-green-500" };
    if (percent < 32) return { label: "Médio", color: "text-yellow-500" };
    return { label: "Acima do recomendado", color: "text-orange-500" };
  }
}
