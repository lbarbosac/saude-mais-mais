/**
 * Edge Function: gerar-habitos
 *
 * Gera hábitos personalizados via OpenAI baseado no perfil do usuário.
 *
 * Variáveis de ambiente necessárias (Supabase > Edge Functions > Secrets):
 *   OPENAI_API_KEY
 *   SUPABASE_URL         (automático)
 *   SUPABASE_ANON_KEY    (automático)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  authenticateRequest,
  checkRateLimit,
} from "../_shared/cors.ts";

// ─── Constantes ───────────────────────────────────────────────────────────────

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutos

const VALID_ICONS = [
  "book-open", "dumbbell", "brain", "heart", "users", "moon", "droplets",
  "apple", "music", "eye", "check", "sun", "leaf", "smile", "coffee",
  "wind", "star", "shield", "clock", "target", "zap", "flame",
];

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  // Autenticação
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;
  const { userId, supabase } = auth;

  // Rate limiting
  if (!checkRateLimit(userId, RATE_LIMIT, RATE_WINDOW_MS)) {
    return errorResponse("Muitas requisições. Aguarde 5 minutos.", 429);
  }

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    console.error("[gerar-habitos] OPENAI_API_KEY não configurada");
    return errorResponse("Serviço de IA não disponível.", 503);
  }

  try {
    // Busca dados do usuário em paralelo
    const [perfilResult, checkinResult, habitosRegistroResult] = await Promise.all([
      supabase
        .from("perfil_usuario")
        .select("nome, idade, peso, altura, sexo, nivel_atividade, nivel_estresse, qualidade_sono, humor_geral, rotina, objetivo, tempo_livre")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("checkin_diario")
        .select("humor, energia, data")
        .eq("user_id", userId)
        .order("data", { ascending: false })
        .limit(7),
      supabase
        .from("habito_registro")
        .select("concluido")
        .eq("user_id", userId)
        .order("data", { ascending: false })
        .limit(50),
    ]);

    if (!perfilResult.data) {
      return errorResponse("Perfil não encontrado. Complete seu perfil primeiro.", 400);
    }

    const perfil = perfilResult.data;
    const checkins = checkinResult.data ?? [];
    const registros = habitosRegistroResult.data ?? [];

    const taxaConclusao = registros.length > 0
      ? `${Math.round((registros.filter((r) => r.concluido).length / registros.length) * 100)}%`
      : "sem dados";

    const checkinResumo = checkins.length > 0
      ? checkins.map((c) => `${c.data}: humor=${c.humor}, energia=${c.energia}`).join("; ")
      : "sem registros recentes";

    const systemPrompt = `Você é um especialista em saúde e bem-estar. Responda APENAS com JSON válido, sem markdown, sem texto adicional.`;

    const userPrompt = `Gere 36 hábitos diários personalizados e variados para este usuário.

Perfil:
- Idade: ${perfil.idade ?? "não informado"}
- Peso: ${perfil.peso ?? "não informado"} kg
- Altura: ${perfil.altura ?? "não informado"} m
- Sexo: ${perfil.sexo ?? "não informado"}
- Nível de atividade: ${perfil.nivel_atividade ?? "não informado"}
- Nível de estresse: ${perfil.nivel_estresse ?? "não informado"}
- Qualidade do sono: ${perfil.qualidade_sono ?? "não informado"}
- Humor geral: ${perfil.humor_geral ?? "não informado"}
- Rotina: ${perfil.rotina ?? "não informado"}
- Objetivo: ${perfil.objetivo ?? "não informado"}
- Tempo livre diário: ${perfil.tempo_livre ?? "não informado"}

Contexto:
- Check-ins recentes: ${checkinResumo}
- Taxa de conclusão de hábitos: ${taxaConclusao}

Regras:
- Exatamente 36 hábitos ÚNICOS sem repetir ideias
- Distribuição: físico(6), alimentação/hidratação(5), mental/foco(5), emocional(5), social(5), sono/relaxamento(4), criatividade/aprendizado(4), gratidão(2)
- Hábitos práticos com tempo/quantidade (ex: "Caminhar 10 minutos sem celular")
- Ícones válidos: ${VALID_ICONS.join(", ")}
- Retorne JSON: {"habitos": [{"nome_habito": "...", "descricao": "...", "icone": "..."}]}`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[gerar-habitos] OpenAI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) return errorResponse("Limite de IA excedido. Tente novamente em alguns minutos.", 429);
      return errorResponse("Erro ao gerar hábitos com IA.", 502);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da IA");

    const { habitos } = JSON.parse(content);
    if (!Array.isArray(habitos) || habitos.length === 0) {
      throw new Error("Formato de resposta inválido");
    }

    // Sanitiza e valida cada hábito
    const sanitizedHabitos = habitos.slice(0, 36).map((h: Record<string, unknown>) => ({
      user_id: userId,
      nome_habito: String(h.nome_habito ?? "").slice(0, 100),
      descricao: String(h.descricao ?? "").slice(0, 300),
      icone: VALID_ICONS.includes(String(h.icone)) ? String(h.icone) : "check",
      gerado_por_ia: true,
      ativo: true,
    })).filter((h) => h.nome_habito.length > 0);

    // Remove hábitos antigos gerados por IA e insere os novos
    await supabase.from("habitos").delete().eq("user_id", userId).eq("gerado_por_ia", true);
    const { data: inserted, error: insertError } = await supabase
      .from("habitos")
      .insert(sanitizedHabitos)
      .select();

    if (insertError) throw insertError;

    return jsonResponse({ habitos: inserted, count: inserted?.length ?? 0 });
  } catch (err) {
    console.error("[gerar-habitos] Unexpected error:", err);
    return errorResponse("Erro interno ao gerar hábitos.", 500);
  }
});
