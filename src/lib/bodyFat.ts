// Body Fat Calculator - US Navy method
// https://www.fabiotakai.com.br/calculadora-de-gordura-corporal

export interface BodyFatInput {
  sexo: "masculino" | "feminino";
  alturaCm: number;
  pescocoCm: number;
  cinturaCm: number;
  quadrilCm?: number; // required for feminino
}

/**
 * US Navy formula
 * Men: %BF = 86.010 * log10(waist - neck) - 70.041 * log10(height) + 36.76
 * Women: %BF = 163.205 * log10(waist + hip - neck) - 97.684 * log10(height) - 78.387
 */
export function calculateBodyFat(input: BodyFatInput): number | null {
  const { sexo, alturaCm, pescocoCm, cinturaCm, quadrilCm } = input;
  if (!alturaCm || !pescocoCm || !cinturaCm) return null;

  if (sexo === "masculino") {
    const diff = cinturaCm - pescocoCm;
    if (diff <= 0) return null;
    const result = 86.01 * Math.log10(diff) - 70.041 * Math.log10(alturaCm) + 36.76;
    return Math.max(2, Math.min(60, Number(result.toFixed(1))));
  } else {
    if (!quadrilCm) return null;
    const diff = cinturaCm + quadrilCm - pescocoCm;
    if (diff <= 0) return null;
    const result = 163.205 * Math.log10(diff) - 97.684 * Math.log10(alturaCm) - 78.387;
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
