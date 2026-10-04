/**
 * Edge Function: gerar-treino
 *
 * Gera um plano de treino personalizado via OpenAI e salva no banco.
 *
 * Variáveis de ambiente (Supabase > Edge Functions > Secrets):
 *   OPENAI_API_KEY
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  authenticateRequest,
  checkRateLimit,
} from "../_shared/cors.ts";

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse(req);

  // Autenticação via _shared — resolve o getClaims removido e o corsHeaders indefinido
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;
  const { userId, supabase } = auth;

  // Rate limiting
  if (!checkRateLimit(userId, 5, 60_000)) {
    return errorResponse("Muitas requisições. Aguarde 1 minuto.", 429, req);
  }

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    console.error("[gerar-treino] OPENAI_API_KEY não configurada");
    return errorResponse("Serviço de IA não disponível.", 503, req);
  }

  try {
    // Lê preferência de descanso do body (opcional)
    let descansoPref: number | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.descanso_pref === "number") {
        descansoPref = body.descanso_pref;
      }
    } catch { /* sem body — ok */ }

    // Busca dados do usuário em paralelo
    const [perfilRes, treinoPerfilRes, checkinRes] = await Promise.all([
      supabase
        .from("perfil_usuario")
        .select("idade, sexo, peso, altura, nivel_atividade")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("treino_perfil")
        .select("objetivo, dias_semana, local_treino, nivel, grupo_foco, cardio, tempo_treino, limitacoes")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("checkin_diario")
        .select("humor, energia")
        .eq("user_id", userId)
        .order("data", { ascending: false })
        .limit(3),
    ]);

    if (!treinoPerfilRes.data) {
      return errorResponse("Configure seu perfil de treino primeiro.", 400, req);
    }

    const perfil      = perfilRes.data      ?? {};
    const treinoPerfil = treinoPerfilRes.data;
    const recentMood  = checkinRes.data?.[0];

    // ── Prompt ────────────────────────────────────────────────────────────────

    const prompt = `Você é um personal trainer experiente. Crie um plano de treino completo e personalizado.

PERFIL DO USUÁRIO:
- Idade: ${perfil.idade ?? "não informado"}, Sexo: ${perfil.sexo ?? "não informado"}
- Peso: ${perfil.peso ?? "não informado"} kg, Altura: ${perfil.altura ?? "não informado"} m
- Nível de atividade: ${perfil.nivel_atividade ?? "não informado"}

PREFERÊNCIAS DE TREINO:
- Objetivo: ${treinoPerfil.objetivo}
- Dias por semana: ${treinoPerfil.dias_semana}
- Local: ${treinoPerfil.local_treino}
- Nível: ${treinoPerfil.nivel}
- Foco muscular: ${treinoPerfil.grupo_foco}
- Cardio: ${treinoPerfil.cardio}
- Tempo disponível: ${treinoPerfil.tempo_treino} min
- Limitações físicas: ${treinoPerfil.limitacoes || "nenhuma"}
- Descanso preferido entre séries: ${
  descansoPref
    ? `${descansoPref}s (use como base, ajuste ±30s conforme exercício)`
    : "não informado — use as faixas científicas abaixo"
}

CONTEXTO DO DIA:
- Humor recente: ${recentMood?.humor ?? "não informado"}
- Energia recente: ${recentMood?.energia ?? "não informado"}

REGRAS:
1. Crie exatamente ${treinoPerfil.dias_semana} treinos (1 por dia de treino)
2. Nome do treino claro (ex: "Treino A — Peito e Tríceps")
3. De 5 a 8 exercícios por treino
4. Descanso entre séries (siga a ciência do treino — mínimo 60s):
   - Hipertrofia: 90–120s isoladores, 120–180s compostos
   - Emagrecimento/condicionamento: 45–75s
   - Saúde geral: 60–90s
   - Compostos pesados (agachamento, supino, terra, remada) + nível avançado: 150–180s
   - Iniciante: adicione 15–30s extra para recuperação adequada
5. Repetições: força 4–6, hipertrofia 8–12, resistência 12–20
6. Adapte todos os exercícios ao local: ${treinoPerfil.local_treino}
7. Respeite as limitações: ${treinoPerfil.limitacoes || "nenhuma"}
8. Se humor ou energia baixos, reduza o volume (não a técnica)
9. Inclua cardio ao final se preferência for leve, moderado ou intenso

Responda APENAS via tool call.`;

    // ── Chamada OpenAI com function calling ───────────────────────────────────

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        tools: [
          {
            type: "function",
            function: {
              name: "criar_plano_treino",
              description: "Retorna um plano de treino estruturado em JSON",
              parameters: {
                type: "object",
                properties: {
                  treinos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome:       { type: "string" },
                        divisao:    { type: "string" },
                        dia_semana: { type: "integer", description: "0=domingo, 1=segunda..." },
                        exercicios: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              nome:         { type: "string" },
                              series:       { type: "integer" },
                              repeticoes:   { type: "string" },
                              descanso_seg: { type: "integer" },
                              observacao:   { type: "string" },
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
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "criar_plano_treino" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("[gerar-treino] OpenAI error:", aiResp.status, txt);
      if (aiResp.status === 429) return errorResponse("Limite de IA atingido. Tente em alguns minutos.", 429, req);
      if (aiResp.status === 402) return errorResponse("Créditos de IA esgotados.", 402, req);
      return errorResponse("Erro ao gerar treino com IA.", 502, req);
    }

    const aiData  = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return errorResponse("Resposta inválida da IA.", 500, req);

    const { treinos = [] } = JSON.parse(toolCall.function.arguments);

    // ── Salva no banco ────────────────────────────────────────────────────────

    // Remove treinos gerados por IA anteriores
    const { data: oldTreinos } = await supabase
      .from("treinos")
      .select("id")
      .eq("user_id", userId)
      .eq("gerado_por_ia", true);

    if (oldTreinos && oldTreinos.length > 0) {
      const ids = oldTreinos.map((t: { id: string }) => t.id);
      await supabase.from("treino_exercicios").delete().in("treino_id", ids);
      await supabase.from("treinos").delete().in("id", ids);
    }

    // Insere os novos treinos
    let count = 0;
    for (let i = 0; i < treinos.length; i++) {
      const t = treinos[i];

      const { data: inserted, error: insertErr } = await supabase
        .from("treinos")
        .insert({
          user_id:       userId,
          nome:          t.nome,
          divisao:       t.divisao,
          dia_semana:    t.dia_semana,
          ordem:         i,
          gerado_por_ia: true,
        })
        .select("id")
        .single();

      if (insertErr || !inserted) {
        console.error("[gerar-treino] Insert treino error:", insertErr);
        continue;
      }

      const exercicios = (t.exercicios ?? []).map(
        (e: Record<string, unknown>, idx: number) => ({
          treino_id:    inserted.id,
          user_id:      userId,
          nome:         String(e.nome ?? ""),
          series:       Number(e.series) || 3,
          repeticoes:   String(e.repeticoes ?? "10–12"),
          descanso_seg: Number(e.descanso_seg) || 90,
          observacao:   e.observacao ? String(e.observacao) : null,
          ordem:        idx,
        })
      );

      if (exercicios.length > 0) {
        await supabase.from("treino_exercicios").insert(exercicios);
      }

      count++;
    }

    return jsonResponse({ success: true, count }, 200, {}, req);
  } catch (err) {
    console.error("[gerar-treino] Unexpected error:", err);
    return errorResponse("Erro interno ao gerar treino.", 500, req);
  }
});
