// Edge Function: gerar-treino
//
// Monta um plano de treino com a Gemini a partir do perfil de treino e troca o
// plano anterior gerado pela IA de forma atômica (RPC substituir_treinos_ia).
// Treinos criados à mão e o histórico de cargas são preservados.
//
// Entrada: {}   Saída: { total }

import { erro, json, preflight } from "../_shared/http.ts";
import { autenticar, dentroDaCota } from "../_shared/supabase.ts";
import { ErroIA, gerarJSON, respostaParaErro } from "../_shared/gemini.ts";

const SCHEMA = {
  type: "object",
  properties: {
    treinos: {
      type: "array",
      minItems: 1,
      maxItems: 7,
      items: {
        type: "object",
        properties: {
          nome: { type: "string" },
          divisao: { type: "string" },
          dia_semana: { type: "integer", description: "0 = domingo, 1 = segunda ... 6 = sábado" },
          exercicios: {
            type: "array",
            minItems: 3,
            maxItems: 10,
            items: {
              type: "object",
              properties: {
                nome: { type: "string" },
                series: { type: "integer" },
                repeticoes: { type: "string" },
                descanso_seg: { type: "integer" },
                observacao: { type: "string" },
              },
              required: ["nome", "series", "repeticoes", "descanso_seg"],
            },
          },
        },
        required: ["nome", "divisao", "dia_semana", "exercicios"],
      },
    },
  },
  required: ["treinos"],
};

interface TreinoIA {
  nome?: unknown;
  divisao?: unknown;
  dia_semana?: unknown;
  exercicios?: { nome?: unknown; series?: unknown; repeticoes?: unknown; descanso_seg?: unknown; observacao?: unknown }[];
}

const texto = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const inteiro = (v: unknown, min: number, max: number, padrao: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
};

/** Garante limites que o banco também confere; descarta o que não dá para salvar. */
function sanitizarPlano(brutos: unknown, dias: number) {
  if (!Array.isArray(brutos)) return [];
  return (brutos as TreinoIA[])
    .map((t) => ({
      nome: texto(t.nome, 100),
      divisao: texto(t.divisao, 50),
      dia_semana: inteiro(t.dia_semana, 0, 6, 1),
      exercicios: (Array.isArray(t.exercicios) ? t.exercicios : [])
        .map((e) => ({
          nome: texto(e.nome, 100),
          series: inteiro(e.series, 1, 10, 3),
          repeticoes: texto(e.repeticoes, 20) || "10-12",
          descanso_seg: inteiro(e.descanso_seg, 30, 300, 90),
          observacao: texto(e.observacao, 300),
        }))
        .filter((e) => e.nome.length >= 2)
        .slice(0, 10),
    }))
    .filter((t) => t.nome && t.exercicios.length > 0)
    .slice(0, Math.max(1, Math.min(7, dias)));
}

const rotulo = (v: unknown) => (v === null || v === undefined || v === "" ? "não informado" : String(v).slice(0, 80));

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return erro(req, "Método não permitido.", 405);

  const auth = await autenticar(req);
  if ("resposta" in auth) return auth.resposta;
  const { userId, db } = auth;

  if (!(await dentroDaCota(userId, "treino", 5, 3600))) {
    return erro(req, "Você já gerou vários treinos na última hora. Tente mais tarde.", 429);
  }

  const [perfilRes, treinoRes, checkinRes] = await Promise.all([
    db.from("perfil_usuario").select("idade, sexo, peso, altura, nivel_atividade").eq("user_id", userId).maybeSingle(),
    db.from("treino_perfil")
      .select("objetivo, dias_semana, local_treino, nivel, grupo_foco, cardio, tempo_treino, limitacoes, descanso_pref")
      .eq("user_id", userId)
      .maybeSingle(),
    db.from("checkin_diario").select("humor, energia").eq("user_id", userId).order("data", { ascending: false }).limit(1),
  ]);

  const tp = treinoRes.data;
  if (!tp) return erro(req, "Configure seu perfil de treino primeiro.", 400);
  const perfil: Record<string, unknown> = perfilRes.data ?? {};
  const humor = checkinRes.data?.[0];

  const pedido = `Crie um plano de treino semanal personalizado.

PESSOA
- Idade: ${rotulo(perfil.idade)} | Sexo: ${rotulo(perfil.sexo)}
- Peso: ${rotulo(perfil.peso)} kg | Altura: ${rotulo(perfil.altura)} m
- Nível de atividade: ${rotulo(perfil.nivel_atividade)}

PREFERÊNCIAS
- Objetivo: ${rotulo(tp.objetivo)}
- Dias por semana: ${tp.dias_semana}
- Local: ${rotulo(tp.local_treino)}
- Nível: ${rotulo(tp.nivel)}
- Foco: ${rotulo(tp.grupo_foco)}
- Cardio: ${rotulo(tp.cardio)}
- Tempo por treino: ${tp.tempo_treino} min
- Limitações: ${rotulo(tp.limitacoes) === "não informado" ? "nenhuma" : rotulo(tp.limitacoes)}
- Descanso preferido entre séries: ${tp.descanso_pref ? `${tp.descanso_pref}s (use como base, ajustando ±30s por exercício)` : "sem preferência"}

ESTADO RECENTE
- Humor: ${rotulo(humor?.humor)} | Energia: ${rotulo(humor?.energia)}

REGRAS
1. Exatamente ${tp.dias_semana} treinos, um por dia de treino, em dias da semana distribuídos (0 = domingo ... 6 = sábado).
2. Nome claro, como "Treino A — Peito e tríceps".
3. De 5 a 8 exercícios por treino, que caibam em ${tp.tempo_treino} minutos.
4. Descanso: hipertrofia 90–120s em isoladores e 120–180s em compostos; emagrecimento/condicionamento 45–75s; saúde geral 60–90s; iniciante +15–30s.
5. Repetições: força 4–6, hipertrofia 8–12, resistência 12–20.
6. Todos os exercícios precisam ser possíveis no local informado e respeitar as limitações.
7. Se humor ou energia estiverem baixos, reduza o volume, não a técnica.
8. Inclua cardio ao final quando a preferência não for "nao".
9. Em "observacao", uma dica curta de execução quando for útil.`;

  try {
    const resposta = await gerarJSON<{ treinos?: unknown }>({
      sistema: "Você é um personal trainer experiente e cuidadoso. Responda só com o JSON pedido, em português do Brasil.",
      mensagens: [{ papel: "user", texto: pedido }],
      schema: SCHEMA,
      temperatura: 0.6,
      maxTokens: 8192,
    });
    const plano = sanitizarPlano(resposta.treinos, tp.dias_semana);
    if (plano.length === 0) throw new ErroIA("resposta", "Plano vazio");

    const { data: total, error } = await db.rpc("substituir_treinos_ia", { p_treinos: plano });
    if (error) {
      console.error("[gerar-treino] falha ao salvar:", error.message);
      return erro(req, "Não foi possível salvar o treino. Tente novamente.", 500);
    }
    return json(req, { total });
  } catch (e) {
    const { status, mensagem } = respostaParaErro(e);
    return erro(req, `${mensagem} Seu plano atual continua valendo.`, status);
  }
});
