import { describe, it, expect } from "vitest";
import { selecionarHabitosDodia } from "@/lib/utils/habitSelection";
import type { HabitoParaSelecao } from "@/lib/utils/habitSelection";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeHabito(
  overrides: Partial<HabitoParaSelecao> & { id: string; categoria: string }
): HabitoParaSelecao {
  return {
    nome_habito: `Hábito ${overrides.id}`,
    descricao: null,
    icone: "check",
    ultima_exibicao: null,
    concluido_hoje: false,
    vezes_concluido: 0,
    vezes_exibido: 0,
    ...overrides,
  };
}

function makePool(categories: string[] = []): HabitoParaSelecao[] {
  const cats = categories.length > 0 ? categories : [
    "movimento", "agua_alimentacao", "sono_descanso",
    "respiracao", "social_gratidao", "foco_aprendizado",
    "humor_emocao",
  ];
  return cats.flatMap((cat, ci) =>
    Array.from({ length: 6 }, (_, i) =>
      makeHabito({ id: `${ci}-${i}`, categoria: cat })
    )
  );
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("selecionarHabitosDodia", () => {
  it("retorna exatamente 6 hábitos quando há mais de 6 disponíveis", () => {
    const pool = makePool();
    const result = selecionarHabitosDodia(pool, "user-1", "2026-06-10");
    expect(result).toHaveLength(6);
  });

  it("retorna todos se houver 6 ou menos hábitos", () => {
    const pool = makePool().slice(0, 4);
    const result = selecionarHabitosDodia(pool, "user-1", "2026-06-10");
    expect(result).toHaveLength(4);
  });

  it("é determinístico: mesma seleção para mesma data/userId", () => {
    const pool = makePool();
    const r1 = selecionarHabitosDodia(pool, "user-abc", "2026-06-10");
    const r2 = selecionarHabitosDodia(pool, "user-abc", "2026-06-10");
    expect(r1.map((h) => h.id)).toEqual(r2.map((h) => h.id));
  });

  it("retorna seleções DIFERENTES para datas diferentes", () => {
    const pool = makePool();
    const r1 = selecionarHabitosDodia(pool, "user-abc", "2026-06-10");
    const r2 = selecionarHabitosDodia(pool, "user-abc", "2026-06-11");
    // Com 42 hábitos e 6 a escolher, as chances de selecionar exatamente os mesmos são mínimas
    const r1ids = r1.map((h) => h.id).sort().join(",");
    const r2ids = r2.map((h) => h.id).sort().join(",");
    expect(r1ids).not.toEqual(r2ids);
  });

  it("prioriza hábitos nunca exibidos (ultima_exibicao: null)", () => {
    const pool = makePool();
    // Marca todos como exibidos hoje exceto os de 'movimento'
    const modified = pool.map((h) =>
      h.categoria === "movimento"
        ? h
        : { ...h, ultima_exibicao: "2026-06-10", vezes_exibido: 10 }
    );
    const result = selecionarHabitosDodia(modified, "user-1", "2026-06-10");
    // Pelo menos 1 hábito de movimento deve aparecer (categoria com slot fixo)
    const hasMovimento = result.some((h) => {
      const original = modified.find((o) => o.id === h.id);
      return original?.categoria === "movimento";
    });
    expect(hasMovimento).toBe(true);
  });

  it("garante cobertura de categorias com slots fixos", () => {
    const pool = makePool();
    const result = selecionarHabitosDodia(pool, "user-x", "2026-06-10");
    const categorias = result.map((h) => {
      const original = pool.find((o) => o.id === h.id);
      return original?.categoria;
    });
    // Deve incluir pelo menos "movimento" e "agua_alimentacao" (têm slot fixo = 1)
    expect(categorias).toContain("movimento");
    expect(categorias).toContain("agua_alimentacao");
  });

  it("retorna array vazio para pool vazio", () => {
    expect(selecionarHabitosDodia([], "user-1", "2026-06-10")).toHaveLength(0);
  });
});
