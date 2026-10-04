import { describe, expect, it } from "vitest";
import { calculateBodyFat } from "@/lib/bodyFat";

// Referência: fórmula métrica equivalente de Hodgdon e Beckett (Marinha dos EUA).
const metricoHomem = (c: number, p: number, a: number) =>
  495 / (1.0324 - 0.19077 * Math.log10(c - p) + 0.15456 * Math.log10(a)) - 450;
const metricoMulher = (c: number, q: number, p: number, a: number) =>
  495 / (1.29579 - 0.35004 * Math.log10(c + q - p) + 0.221 * Math.log10(a)) - 450;

describe("calculateBodyFat", () => {
  it("homem: bate com a versão métrica da fórmula", () => {
    const r = calculateBodyFat({ sexo: "masculino", alturaCm: 178, pescocoCm: 38, cinturaCm: 90 });
    expect(r).toBeCloseTo(metricoHomem(90, 38, 178), 0);
    expect(r).toBeGreaterThan(19);
    expect(r).toBeLessThan(22);
  });

  it("mulher: bate com a versão métrica da fórmula", () => {
    const r = calculateBodyFat({ sexo: "feminino", alturaCm: 165, pescocoCm: 33, cinturaCm: 75, quadrilCm: 100 });
    expect(r).toBeCloseTo(metricoMulher(75, 100, 33, 165), 0);
  });

  it("recusa medidas incompletas ou impossíveis", () => {
    expect(calculateBodyFat({ sexo: "masculino", alturaCm: 178, pescocoCm: 40, cinturaCm: 38 })).toBeNull();
    expect(calculateBodyFat({ sexo: "feminino", alturaCm: 165, pescocoCm: 33, cinturaCm: 75 })).toBeNull();
    expect(calculateBodyFat({ sexo: "masculino", alturaCm: 0, pescocoCm: 38, cinturaCm: 90 })).toBeNull();
  });
});
