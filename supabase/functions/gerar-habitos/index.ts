import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 300_000; // 5 min

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const VALID_ICONS = [
  "book-open", "dumbbell", "brain", "heart", "users", "moon", "droplets",
  "apple", "music", "eye", "check", "sun", "leaf", "smile", "coffee",
  "wind", "star", "shield", "clock", "target", "zap", "flame",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ error: "Muitas requisicoes. Aguarde alguns minutos." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: perfil } = await supabase
      .from("perfil_usuario")
      .select("nome, idade, peso, altura, sexo, nivel_atividade, nivel_estresse, qualidade_sono, humor_geral, rotina, objetivo, tempo_livre")
      .eq("user_id", userId)
      .single();

    if (!perfil) {
      return new Response(JSON.stringify({ error: "Perfil nao encontrado. Complete seu perfil primeiro." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const prompt = `Baseado nos dados deste usuario, gere uma lista de 18 habitos diarios personalizados e variados que ele pode praticar.

Dados do usuario:
- Idade: ${perfil.idade || 'nao informada'}
- Peso: ${perfil.peso || 'nao informado'} kg
- Altura: ${perfil.altura || 'nao informada'} m
- Sexo: ${perfil.sexo || 'nao informado'}
- Nivel de atividade: ${perfil.nivel_atividade || 'nao informado'}
- Nivel de estresse: ${perfil.nivel_estresse || 'nao informado'}
- Qualidade do sono: ${perfil.qualidade_sono || 'nao informada'}
- Humor geral: ${perfil.humor_geral || 'nao informado'}
- Rotina: ${perfil.rotina || 'nao informada'}
- Objetivo: ${perfil.objetivo || 'nao informado'}
- Tempo livre: ${perfil.tempo_livre || 'nao informado'}

Regras:
- Gere 18 habitos bem variados entre si para que possamos rotacionar 6 por dia sem repetir
- Habitos devem ser praticos, simples e acionaveis
- Considere a idade, saude e rotina da pessoa
- Inclua habitos variados: fisicos, mentais, sociais e emocionais
- Para jovens, inclua habitos sociais como "conversar 15 min com sua mae" ou "assistir algo com a familia"
- Para quem tem estresse alto, priorize habitos de relaxamento
- Para sedentarios, inclua exercicios leves
- Use nomes de icones do lucide-react: book-open, dumbbell, brain, heart, users, moon, droplets, apple, music, eye, sun, leaf, smile, coffee, wind, star, shield, clock, target, zap, flame
- Nao use emojis`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Voce e um especialista em saude e bem-estar. Responda APENAS com JSON valido." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_habits",
              description: "Retorna lista de habitos personalizados",
              parameters: {
                type: "object",
                properties: {
                  habitos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome_habito: { type: "string", description: "Nome curto do habito" },
                        descricao: { type: "string", description: "Descricao breve" },
                        icone: { type: "string", description: "Nome do icone lucide-react" },
                      },
                      required: ["nome_habito", "descricao", "icone"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["habitos"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_habits" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisicoes da IA excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Creditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("Erro ao gerar habitos");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Resposta invalida da IA");

    const { habitos } = JSON.parse(toolCall.function.arguments);

    // Validate and sanitize habits
    const sanitizedHabitos = habitos.slice(0, 18).map((h: any) => ({
      user_id: userId,
      nome_habito: String(h.nome_habito || "").slice(0, 100),
      descricao: String(h.descricao || "").slice(0, 300),
      icone: VALID_ICONS.includes(h.icone) ? h.icone : "check",
      gerado_por_ia: true,
      ativo: true,
    }));

    await supabase.from("habitos").delete().eq("user_id", userId).eq("gerado_por_ia", true);

    const { data: inserted, error: insertError } = await supabase
      .from("habitos")
      .insert(sanitizedHabitos)
      .select();

    if (insertError) throw insertError;

    // Audit log
    await supabase.from("audit_log").insert({
      user_id: userId,
      action: "generate_habits",
      resource: "habitos",
      details: { count: sanitizedHabitos.length },
    }).then(() => {});

    return new Response(JSON.stringify({ habitos: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gerar-habitos error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
