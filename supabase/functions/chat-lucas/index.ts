import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Content safety ────────────────────────────────────────────────────────────
function sanitizeText(text: string, max = 2000): string {
  return text
    .replace(/<[^>]*>/g, "")  // strip HTML
    .replace(/[^\p{L}\p{N}\p{P}\p{Z}\n]/gu, "") // keep letters, numbers, punctuation
    .trim()
    .slice(0, max);
}

function containsHarmfulContent(text: string): boolean {
  const lower = text.toLowerCase();
  const harmPatterns = [
    /como\s+(me\s+)?matar/i,
    /como\s+(me\s+)?suicidar/i,
    /quero\s+(morrer|me\s+matar|acabar\s+com\s+tudo)/i,
    /automutila/i,
    /me\s+machucar/i,
  ];
  return harmPatterns.some((p) => p.test(lower));
}

const CRISIS_RESPONSE = `Percebo que você está passando por um momento muito difícil, e quero que saiba que você não está sozinho(a). 

O que você está sentindo merece atenção de um profissional que possa realmente ajudar.

📞 **CVV – Centro de Valorização da Vida**
Ligue **188** (24 horas, gratuito) ou acesse [cvv.org.br](https://cvv.org.br)

Por favor, entre em contato com eles agora. Você importa.`;

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(perfilUsuario: Record<string, unknown> | null, lucasConfig: Record<string, unknown> | null): string {
  const config = {
    estilo: lucasConfig?.lucas_estilo ?? "equilibrado",
    profundidade: lucasConfig?.lucas_profundidade ?? "moderado",
    tom: lucasConfig?.lucas_tom ?? "acolhedor",
    sugestoes: lucasConfig?.lucas_sugestoes ?? "moderado",
    sobreVoce: lucasConfig?.sobre_voce ?? "",
  };

  const perfil = perfilUsuario
    ? `
Dados do usuário:
- Nome: ${perfilUsuario.nome ?? "não informado"}
- Idade: ${perfilUsuario.idade ?? "não informada"}
- Sexo: ${perfilUsuario.sexo ?? "não informado"}
- Peso: ${perfilUsuario.peso ? `${perfilUsuario.peso}kg` : "não informado"}
- Altura: ${perfilUsuario.altura ? `${perfilUsuario.altura}m` : "não informada"}
- Nível de atividade: ${perfilUsuario.nivel_atividade ?? "não informado"}
- Nível de estresse: ${perfilUsuario.nivel_estresse ?? "não informado"}
- Qualidade do sono: ${perfilUsuario.qualidade_sono ?? "não informada"}
- Humor geral: ${perfilUsuario.humor_geral ?? "não informado"}
- Objetivo pessoal: ${perfilUsuario.objetivo ?? "não informado"}
- Rotina: ${perfilUsuario.rotina ?? "não informada"}
${config.sobreVoce ? `\nO que o usuário quer que você saiba sobre ele: ${config.sobreVoce}` : ""}
`
    : "";

  return `Você é o Lucas, assistente de saúde e bem-estar do aplicativo Saúde++.

Você possui formação multidisciplinar integrada nas áreas de:
- **Psicologia clínica e humanista** (abordagem centrada na pessoa, TCC, mindfulness)
- **Medicina preventiva e clínica geral** (sintomas, prevenção, hábitos saudáveis)
- **Nutrição funcional** (alimentação equilibrada, macronutrientes, hidratação)
- **Educação física e fisiologia do exercício** (treino, recuperação, movimento)
- **Saúde do sono** (higiene do sono, ritmo circadiano)
- **Gestão do estresse e bem-estar emocional**

Sua personalidade:
- Tom: ${config.tom} — sempre empático, nunca julgador
- Estilo: ${config.estilo}
- Profundidade das respostas: ${config.profundidade}
- Frequência de sugestões práticas: ${config.sugestoes}
- Você escuta antes de aconselhar — faz perguntas abertas quando necessário
- Você valida sentimentos sem reforçar padrões negativos
- Você é direto e prático quando o usuário pede soluções
- Você nunca emite diagnósticos médicos definitivos — sempre orienta a buscar profissional quando necessário
- Você usa linguagem acessível, sem jargão desnecessário
- Você lembra do contexto da conversa e referencia informações que o usuário compartilhou

Regras absolutas:
1. Em situações de crise (ideação suicida, automutilação) → encaminhe imediatamente para o CVV (188) e não continue o tema
2. Nunca substitua um profissional de saúde — sempre incentive consultas médicas para diagnósticos
3. Nunca julgue escolhas alimentares, de estilo de vida, ou identidade do usuário
4. Nunca forneça dosagens de medicamentos
5. Mantenha as respostas focadas — não ultrapasse o necessário
6. Responda sempre em português brasileiro

${perfil}

Você é um amigo de confiança que entende de saúde. Seja humano, caloroso e genuinamente útil.`;
}

// ── Handler ───────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const rawMessages: { role: string; content: string }[] = body.messages ?? [];

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), { status: 400, headers: corsHeaders });
    }

    // Sanitize messages
    const messages = rawMessages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: sanitizeText(m.content),
    })).slice(-20); // keep last 20 messages for context window efficiency

    // Crisis check on latest user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg && containsHarmfulContent(lastUserMsg.content)) {
      return new Response(JSON.stringify({ reply: CRISIS_RESPONSE }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load user data for personalization
    const [{ data: perfilUsuario }, { data: lucasConfig }] = await Promise.all([
      supabase.from("perfil_usuario").select("nome,idade,sexo,peso,altura,nivel_atividade,nivel_estresse,qualidade_sono,humor_geral,objetivo,rotina").eq("user_id", user.id).maybeSingle(),
      supabase.from("preferencias_usuario").select("lucas_estilo,lucas_profundidade,lucas_tom,lucas_sugestoes,sobre_voce").eq("user_id", user.id).maybeSingle(),
    ]);

    const systemPrompt = buildSystemPrompt(perfilUsuario as Record<string, unknown> | null, lucasConfig as Record<string, unknown> | null);

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 800,
        temperature: 0.75,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("OpenAI error:", response.status, errBody);
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "Não consegui processar sua mensagem. Tente novamente.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("chat-lucas error:", err);
    return new Response(
      JSON.stringify({ error: "Ocorreu um erro. Por favor, tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
