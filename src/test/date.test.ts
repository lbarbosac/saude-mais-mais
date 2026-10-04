import { afterEach, describe, expect, it, vi } from "vitest";
import { dataLocalISO, deISO, getDailySeed, somarDias, todayISO } from "@/lib/utils/date";

afterEach(() => vi.useRealTimers());

describe("datas locais", () => {
  it("todayISO usa a data local, não a UTC", () => {
    // 23h30 de 3/out no horário local: em UTC-3 já seria 4/out.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 3, 23, 30));
    expect(todayISO()).toBe("2026-10-03");
  });

  it("somarDias atravessa meses e anos", () => {
    expect(somarDias("2026-10-31", 1)).toBe("2026-11-01");
    expect(somarDias("2026-01-01", -1)).toBe("2025-12-31");
    expect(somarDias("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("deISO e dataLocalISO são inversos", () => {
    expect(dataLocalISO(deISO("2026-03-08"))).toBe("2026-03-08");
  });
});

describe("getDailySeed", () => {
  it("é determinístico e varia por dia e usuário", () => {
    expect(getDailySeed("2026-06-10", "a")).toBe(getDailySeed("2026-06-10", "a"));
    expect(getDailySeed("2026-06-10", "a")).not.toBe(getDailySeed("2026-06-11", "a"));
    expect(getDailySeed("2026-06-10", "a")).not.toBe(getDailySeed("2026-06-10", "b"));
    expect(getDailySeed("2026-06-10", "a")).toBeGreaterThanOrEqual(0);
  });
});
