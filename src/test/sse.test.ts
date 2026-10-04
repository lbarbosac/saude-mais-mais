import { describe, expect, it } from "vitest";
import { lerEventosSSE } from "@/lib/sse";

function fluxo(pedacos: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const p of pedacos) c.enqueue(enc.encode(p));
      c.close();
    },
  });
}

async function coletar(pedacos: string[]) {
  const eventos: unknown[] = [];
  for await (const e of lerEventosSSE(fluxo(pedacos))) eventos.push(e);
  return eventos;
}

describe("lerEventosSSE", () => {
  it("lê eventos separados por linha em branco", async () => {
    expect(await coletar(['data: {"tipo":"texto","texto":"Oi"}\n\n', 'data: {"tipo":"fim"}\n\n'])).toEqual([
      { tipo: "texto", texto: "Oi" },
      { tipo: "fim" },
    ]);
  });

  it("remonta uma linha quebrada entre pedaços da rede", async () => {
    expect(await coletar(['data: {"tipo":"tex', 'to","texto":"tudo bem?"}\n\n'])).toEqual([{ tipo: "texto", texto: "tudo bem?" }]);
  });

  it("ignora comentários, linhas vazias e JSON inválido", async () => {
    expect(await coletar([": ping\n\n", "data: {quebrado\n\n", 'data: {"ok":true}'])).toEqual([{ ok: true }]);
  });
});
