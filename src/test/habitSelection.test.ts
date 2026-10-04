import { describe, expect, it } from "vitest";
import { calcularPeso, HABITOS_POR_DIA, selecionarHabitosDoDia, type HabitoParaSelecao } from "@/lib/utils/habitSelection";

const CATEGORIAS = ["movimento", "agua_alimentacao", "sono_descanso", "respiracao", "social_gratidao", "foco_aprendizado", "humor_emocao"];

function habito(id: string, categoria: string, extra: Partial<HabitoParaSelecao> = {}): HabitoParaSelecao {
  return { id, categoria, ultima_exibicao: null, vezes_exibido: 0, vezes_concluido: 0, ...extra };
}

const pool = () => CATEGORIAS.flatMap((c, ci) => Array.from({ length: 6 }, (_, i) => habito(`${ci}-${i}`, c)));

describe("selecionarHabitosDoDia", () => {
  it("escolhe 6 quando há mais disponíveis", () => {
    expect(selecionarHabitosDoDia(pool(), "u1", "2026-10-04")).toHaveLength(HABITOS_POR_DIA);
  });

  it("devolve todos quando há 6 ou menos", () => {
    expect(selecionarHabitosDoDia(pool().slice(0, 4), "u1", "2026-10-04")).toHaveLength(4);
    expect(selecionarHabitosDoDia([], "u1", "2026-10-04")).toEqual([]);
  });

  it("é determinístico para o mesmo dia e usuário", () => {
    const a = selecionarHabitosDoDia(pool(), "u1", "2026-10-04").map((h) => h.id);
    const b = selecionarHabitosDoDia(pool(), "u1", "2026-10-04").map((h) => h.id);
    expect(a).toEqual(b);
  });

  it("varia entre dias diferentes", () => {
    const a = selecionarHabitosDoDia(pool(), "u1", "2026-10-04").map((h) => h.id).sort().join();
    const b = selecionarHabitosDoDia(pool(), "u1", "2026-10-05").map((h) => h.id).sort().join();
    expect(a).not.toBe(b);
  });

  it("garante uma vaga para cada categoria fixa", () => {
    const categorias = selecionarHabitosDoDia(pool(), "u1", "2026-10-04").map((h) => h.categoria);
    for (const c of ["movimento", "agua_alimentacao", "sono_descanso", "respiracao", "social_gratidao"]) {
      expect(categorias).toContain(c);
    }
  });

  it("não repete hábitos", () => {
    const ids = selecionarHabitosDoDia(pool(), "u1", "2026-10-04").map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prefere quem não aparece há mais tempo", () => {
    const recentes: HabitoParaSelecao[] = pool().map((h) => ({ ...h, ultima_exibicao: "2026-10-03", vezes_exibido: 5, vezes_concluido: 5 }));
    recentes[0] = { ...recentes[0], ultima_exibicao: null, vezes_exibido: 0, vezes_concluido: 0 };
    const ids = selecionarHabitosDoDia(recentes, "u1", "2026-10-04").map((h) => h.id);
    expect(ids).toContain(recentes[0].id);
  });
});

describe("calcularPeso", () => {
  it("dá mais peso a quem nunca apareceu", () => {
    expect(calcularPeso(habito("a", "geral"), "2026-10-04")).toBeGreaterThan(
      calcularPeso(habito("b", "geral", { ultima_exibicao: "2026-10-03" }), "2026-10-04"),
    );
  });

  it("dá mais peso a hábitos raramente concluídos", () => {
    const raro = habito("a", "geral", { ultima_exibicao: "2026-10-01", vezes_exibido: 10, vezes_concluido: 1 });
    const sempre = habito("b", "geral", { ultima_exibicao: "2026-10-01", vezes_exibido: 10, vezes_concluido: 10 });
    expect(calcularPeso(raro, "2026-10-04")).toBeGreaterThan(calcularPeso(sempre, "2026-10-04"));
  });
});
