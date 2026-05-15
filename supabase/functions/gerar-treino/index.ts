
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RATE_LIMIT = new Map<string, number[]>();
const MAX_REQ = 5;
const WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const arr = (RATE_LIMIT.get(userId) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_REQ) return false;
  arr.push(now);
  RATE_LIMIT.set(userId, arr);
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await supabase.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente em 1 minuto." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let descansoPref: number | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.descanso_pref === "number") descansoPref = body.descanso_pref;
    } catch (_) { /* no body */ }

    // Fetch context
    const [perfilRes, treinoPerfilRes, checkinRes, habitosRes] = await Promise.all([
      supabase.from("perfil_usuario").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("treino_perfil").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("checkin_diario").select("humor, energia").order("data", { ascending: false }).limit(7),
      supabase.from("habitos").select("nome_habito").eq("ativo", true).limit(10),
    ]);

    const perfil = perfilRes.data || {};
    const treinoPerfil = treinoPerfilRes.data;

    if (!treinoPerfil) {
      return new Response(JSON.stringify({ error: "Configure seu perfil de treino primeiro." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recentMood = checkinRes.data?.[0];
    const habitNames = (habitosRes.data || []).map((h) => h.nome_habito).join(", ");

    const prompt = `Você é um personal trainer experiente. Crie um plano de treino COMPLETO e personalizado.

PERFIL DO USUÁRIO:
- Idade: ${perfil.idade || "n/d"}, Sexo: ${perfil.sexo || "n/d"}
- Peso: ${perfil.peso || "n/d"}kg, Altura: ${perfil.altura || "n/d"}m
- Nível atividade: ${perfil.nivel_atividade || "n/d"}

PREFERÊNCIAS DE TREINO:
- Objetivo: ${treinoPerfil.objetivo}
- Dias/semana: ${treinoPerfil.dias_semana}
- Local: ${treinoPerfil.local_treino}
- Nível: ${treinoPerfil.nivel}
- Foco: ${treinoPerfil.grupo_foco}
- Cardio: ${treinoPerfil.cardio}
- Tempo: ${treinoPerfil.tempo_treino} min
- Limitações: ${treinoPerfil.limitacoes || "nenhuma"}
- Descanso preferido pelo usuário entre séries: ${descansoPref ? descansoPref + "s (use como base, ajustando ±30s conforme exercício)" : "não informado — siga as faixas científicas abaixo"}

CONTEXTO ATUAL:
- Humor recente: ${recentMood?.humor || "n/d"} / Energia: ${recentMood?.energia || "n/d"}
- Hábitos ativos: ${habitNames || "nenhum"}

REGRAS (siga como personal trainer profissional):
1. Crie ${treinoPerfil.dias_semana} treinos (1 por dia escolhido)
2. Para cada treino: nome (ex "Treino A - Peito/Tríceps"), divisao, lista de 5-8 exercícios
3. Cada exercício: nome, séries (3-5), repetições, descanso_seg, observacao curta de execução
4. DESCANSO entre séries (siga ciência do treino — NUNCA menos que 60s):
   - Objetivo "ganho_massa" / hipertrofia: 90-120s para isoladores, 120-180s para compostos pesados
   - Objetivo "emagrecimento" / "condicionamento": 45-75s (circuitos/metabolic)
   - Objetivo "saude_geral": 60-90s
   - Nível "avancado" + compostos (agachamento, supino, terra, remada): 150-180s
   - Nível "iniciante": adicione 15-30s a mais para recuperação adequada
5. Repetições: hipertrofia 8-12, força 4-6, resistência 12-20, condicionamento 15-20
6. Adapte exercícios ao local: ${treinoPerfil.local_treino}
7. RESPEITE limitações: ${treinoPerfil.limitacoes || "nenhuma"}
8. Se humor/energia baixos, reduza volume (não a técnica)
9. Cardio (${treinoPerfil.cardio}): inclua se Leve/Moderado/Intenso, no fim do treino

Responda APENAS via tool call.`;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
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
              description: "Retorna um plano de treino estruturado",
              parameters: {
                type: "object",
                properties: {
                  treinos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string" },
                        divisao: { type: "string" },
                        dia_semana: { type: "integer", description: "0=domingo, 1=segunda..." },
                        exercicios: {
                          type: "array",
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
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "criar_plano_treino" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI error:", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de IA atingido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro na IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Resposta inválida da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = JSON.parse(toolCall.function.arguments);
    const treinos = args.treinos || [];

    // Delete previous AI-generated treinos
    const { data: oldTreinos } = await supabase
      .from("treinos")
      .select("id")
      .eq("user_id", userId)
      .eq("gerado_por_ia", true);
    if (oldTreinos && oldTreinos.length > 0) {
      const ids = oldTreinos.map((t) => t.id);
      await supabase.from("treino_exercicios").delete().in("treino_id", ids);
      await supabase.from("treinos").delete().in("id", ids);
    }

    // Insert new treinos
    for (let i = 0; i < treinos.length; i++) {
      const t = treinos[i];
      const { data: inserted, error: insertErr } = await supabase
        .from("treinos")
        .insert({
          user_id: userId,
          nome: t.nome,
          divisao: t.divisao,
          dia_semana: t.dia_semana,
          ordem: i,
          gerado_por_ia: true,
        })
        .select("id")
        .single();

      if (insertErr || !inserted) continue;

      const exercicios = (t.exercicios || []).map((e: any, idx: number) => ({
        treino_id: inserted.id,
        user_id: userId,
        nome: e.nome,
        series: e.series || 3,
        repeticoes: e.repeticoes || "10-12",
        descanso_seg: e.descanso_seg || 60,
        observacao: e.observacao || null,
        ordem: idx,
      }));

      if (exercicios.length > 0) {
        await supabase.from("treino_exercicios").insert(exercicios);
      }
    }

    await supabase.from("audit_log").insert({
      user_id: userId,
      action: "gerar_treino",
      resource: "treinos",
      details: { count: treinos.length },
    });

    return new Response(JSON.stringify({ success: true, count: treinos.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
