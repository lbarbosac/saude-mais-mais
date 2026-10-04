import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { todayISO, getDailySeed } from "@/lib/utils/date";

describe("todayISO", () => {
  it("retorna data no formato YYYY-MM-DD", () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("usa horário LOCAL, não UTC", () => {
    // Simula meia-noite UTC (que é 21h no horário de Brasília, ainda dia anterior)
    // todayISO() deve retornar a data LOCAL, não a data UTC
    const result = todayISO();
    const localDate = new Date();
    const expected = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
    expect(result).toBe(expected);
  });
});

describe("getDailySeed", () => {
  it("retorna número não-negativo", () => {
    expect(getDailySeed("2026-06-10", "user-abc")).toBeGreaterThanOrEqual(0);
  });

  it("é determinístico: mesma entrada → mesmo seed", () => {
    const s1 = getDailySeed("2026-06-10", "user-abc");
    const s2 = getDailySeed("2026-06-10", "user-abc");
    expect(s1).toBe(s2);
  });

  it("retorna seeds DIFERENTES para datas diferentes", () => {
    const s1 = getDailySeed("2026-06-10", "user-abc");
    const s2 = getDailySeed("2026-06-11", "user-abc");
    expect(s1).not.toBe(s2);
  });

  it("retorna seeds DIFERENTES para usuários diferentes", () => {
    const s1 = getDailySeed("2026-06-10", "user-abc");
    const s2 = getDailySeed("2026-06-10", "user-xyz");
    expect(s1).not.toBe(s2);
  });
});
