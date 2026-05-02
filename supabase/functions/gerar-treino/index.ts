import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));

    // Load treino_perfil from DB if not provided in body
    let treinoPerfil = body.treinoPerfil ?? null;
    if (!treinoPerfil) {
      const { data } = await supabase.from("treino_perfil").select("*").eq("user_id", user.id).maybeSingle();
      treinoPerfil = data;
    }
    if (!treinoPerfil) {
      return new Response(JSON.stringify({ error: "Perfil de treino não encontrado" }), { status: 400, headers: corsHeaders });
    }

    // Load user profile for personalization
    let perfilUsuario = body.perfilUsuario ?? null;
    if (!perfilUsuario) {
      const { data } = await supabase.from("perfil_usuario").select("nome,idade,peso,altura,sexo,nivel_atividade,nivel_estresse,qualidade_sono,humor_geral,objetivo").eq("user_id", user.id).maybeSingle();
      perfilUsuario = data;
    }

    const prompt = buildPrompt(treinoPerfil, perfilUsuario);

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 3000,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Você é um educador físico especializado. Responda SEMPRE com JSON válido no formato exato solicitado. Não adicione texto fora do JSON.`,
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? "{}";

    let treinos: TreinoGerado[];
    try {
      const parsed = JSON.parse(rawContent);
      treinos = parsed.treinos ?? [];
    } catch {
      throw new Error("Resposta inválida da IA");
    }

    if (!treinos.length) throw new Error("IA não retornou treinos");

    // Deactivate old treinos
    await supabase.from("treinos").update({ ativo: false }).eq("user_id", user.id);

    // Insert new treinos
    let count = 0;
    for (const t of treinos) {
      const { data: treinoInserted, error: tErr } = await supabase.from("treinos").insert({
        user_id: user.id,
        nome: String(t.nome ?? "Treino").slice(0, 100),
        divisao: String(t.divisao ?? "").slice(0, 50),
        dia_semana: typeof t.dia_semana === "number" ? t.dia_semana : null,
        ativo: true,
      }).select("id").single();

      if (tErr || !treinoInserted) continue;

      if (Array.isArray(t.exercicios)) {
        const exercicios = t.exercicios.map((e: ExercicioGerado, idx: number) => ({
          treino_id: treinoInserted.id,
          nome: String(e.nome ?? "Exercício").slice(0, 100),
          series: Math.max(1, Math.min(10, Number(e.series) || 3)),
          repeticoes: String(e.repeticoes ?? "10").slice(0, 30),
          descanso_seg: Math.max(0, Math.min(600, Number(e.descanso_seg) || 60)),
          observacao: e.observacao ? String(e.observacao).slice(0, 300) : null,
          ordem: idx + 1,
        }));
        await supabase.from("treino_exercicios").insert(exercicios);
      }
      count++;
    }

    return new Response(JSON.stringify({ count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("gerar-treino error:", err);
    return new Response(
      JSON.stringify({ error: String(err instanceof Error ? err.message : "Erro interno") }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface ExercicioGerado {
  nome: string;
  series: number;
  repeticoes: string;
  descanso_seg: number;
  observacao?: string;
}

interface TreinoGerado {
  nome: string;
  divisao: string;
  dia_semana: number;
  exercicios: ExercicioGerado[];
}

function buildPrompt(tp: Record<string, unknown>, up: Record<string, unknown> | null): string {
  const perfilUsuarioStr = up
    ? `
Perfil do usuário:
- Idade: ${up.idade ?? "não informada"}
- Sexo: ${up.sexo ?? "não informado"}  
- Peso: ${up.peso ? `${up.peso}kg` : "não informado"}
- Altura: ${up.altura ? `${up.altura}m` : "não informada"}
- Nível de atividade atual: ${up.nivel_atividade ?? "não informado"}
- Nível de estresse: ${up.nivel_estresse ?? "não informado"}
- Qualidade do sono: ${up.qualidade_sono ?? "não informada"}
- Humor geral: ${up.humor_geral ?? "não informado"}
- Objetivo de vida: ${up.objetivo ?? "não informado"}
`
    : "";

  return `Crie um plano de treino semanal personalizado e completo.

${perfilUsuarioStr}
Preferências de treino:
- Objetivo: ${tp.objetivo}
- Dias por semana: ${tp.dias_semana}
- Local: ${tp.local_treino}
- Nível: ${tp.nivel}
- Foco muscular: ${tp.grupo_foco}
- Cardio: ${tp.cardio}
- Tempo por sessão: ${tp.tempo_treino} minutos
- Limitações/lesões: ${tp.limitacoes}

Instruções:
1. Crie exatamente ${tp.dias_semana} treinos (um por dia de treino)
2. Considere o nível do usuário, lesões e tempo disponível
3. Para iniciante: priorize movimentos compostos básicos, séries menores, mais descanso
4. Para avançado: inclua técnicas como drop-set, supersets, periodização
5. Se o nível de estresse for alto ou sono ruim: prefira treinos de menor intensidade e mais recuperação
6. Adapte os exercícios ao local (academia: todos os equipamentos; casa: peso corporal/halteres; ar livre: bodyweight/corrida)
7. Inclua cardio conforme preferência do usuário
8. Evite exercícios que sobrecarreguem a região lesionada
9. Dia da semana: 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
10. Cada treino deve ter entre 5-8 exercícios

Retorne APENAS o seguinte JSON (sem texto extra):
{
  "treinos": [
    {
      "nome": "nome do treino (ex: Treino A - Peito e Tríceps)",
      "divisao": "divisão (ex: Push, Pull, Legs, Full Body)",
      "dia_semana": 1,
      "exercicios": [
        {
          "nome": "nome do exercício",
          "series": 3,
          "repeticoes": "10-12",
          "descanso_seg": 60,
          "observacao": "dica técnica ou adaptação opcional"
        }
      ]
    }
  ]
}`;
}
