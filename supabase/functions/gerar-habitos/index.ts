/**
 * Edge Function: gerar-habitos
 *
 * Gera 36 hábitos personalizados via OpenAI e os salva no banco com categoria.
 * Chamada automaticamente no primeiro acesso e opcionalmente pelo usuário (renovação).
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

// ─── Constantes ───────────────────────────────────────────────────────────────

const RATE_LIMIT    = 5;
const RATE_WINDOW   = 5 * 60 * 1000; // 5 minutos

// Ícones válidos — espelham exatamente o ICON_MAP do frontend
const VALID_ICONS = [
  "book-open", "dumbbell", "brain", "heart", "users", "moon", "droplets",
  "apple", "music", "eye", "check", "sun", "leaf", "smile", "coffee",
  "wind", "star", "shield", "clock", "target", "zap", "flame",
];

// Categorias válidas — usadas para seleção inteligente no frontend
const VALID_CATEGORIES = [
  "movimento",
  "agua_alimentacao",
  "sono_descanso",
  "respiracao",
  "social_gratidao",
  "foco_aprendizado",
  "humor_emocao",
];

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse(req);

  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;
  const { userId, supabase } = auth;

  if (!checkRateLimit(userId, RATE_LIMIT, RATE_WINDOW)) {
    return errorResponse("Muitas requisições. Aguarde 5 minutos.", 429, req);
  }

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    console.error("[gerar-habitos] OPENAI_API_KEY não configurada");
    return errorResponse("Serviço de IA não disponível.", 503, req);
  }

  try {
    // Busca perfil e histórico em paralelo
    const [perfilResult, registrosResult] = await Promise.all([
      supabase
        .from("perfil_usuario")
        .select("nivel_atividade, nivel_estresse, qualidade_sono, objetivo")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("habito_registro")
        .select("concluido")
        .eq("user_id", userId)
        .order("data", { ascending: false })
        .limit(50),
    ]);

    if (!perfilResult.data) {
      return errorResponse("Perfil não encontrado. Complete seu perfil primeiro.", 400, req);
    }

    const perfil    = perfilResult.data;
    const registros = registrosResult.data ?? [];

    const taxaConclusao = registros.length > 0
      ? `${Math.round((registros.filter((r) => r.concluido).length / registros.length) * 100)}%`
      : "sem dados ainda";

    // ── Prompt ────────────────────────────────────────────────────────────────

    const systemPrompt =
      "Você é especialista em saúde e bem-estar. " +
      "Responda APENAS com JSON válido, sem markdown, sem texto adicional.";

    const userPrompt = `Gere exatamente 36 hábitos diários simples e realistas para este usuário.

PERFIL:
- Nível de atividade: ${perfil.nivel_atividade ?? "não informado"}
- Nível de estresse: ${perfil.nivel_estresse ?? "não informado"}
- Qualidade do sono: ${perfil.qualidade_sono ?? "não informado"}
- Objetivo principal: ${perfil.objetivo ?? "não informado"}
- Taxa de conclusão de hábitos: ${taxaConclusao}

REGRAS OBRIGATÓRIAS:
1. Hábitos simples que qualquer pessoa faz hoje, sem comprar nada nem ter equipamentos
2. PROIBIDO: alimentos incomuns (castanhas específicas, superalimentos), suplementos, equipamentos de academia, exercícios longos (>15 min)
3. Nome curto, máximo 7 palavras, linguagem natural em português do Brasil
4. Exemplos BOM: "Beber água ao acordar", "Caminhar 10 minutos", "Respirar fundo 3 vezes", "Deitar 30 minutos mais cedo", "Ligar para alguém querido"
5. Exemplos RUIM: "Comer castanhas do Pará", "Fazer 45 min de HIIT", "Meditar 1 hora", "Tomar whey protein"
6. Distribuição OBRIGATÓRIA por categoria (use exatamente esses nomes de categoria):
   - "movimento": 7 hábitos (exercício leve, alongamento, caminhada)
   - "agua_alimentacao": 6 hábitos (água, frutas, refeições, mastigação)
   - "sono_descanso": 5 hábitos (hora de dormir, pausa, descanso)
   - "respiracao": 5 hábitos (respiração consciente, atenção plena, meditação rápida)
   - "social_gratidao": 5 hábitos (agradecer, conectar, sorrir, elogiar)
   - "foco_aprendizado": 4 hábitos (leitura, organização, aprendizado)
   - "humor_emocao": 4 hábitos (autocuidado, humor, criatividade)
7. Ícones válidos: ${VALID_ICONS.join(", ")}
8. Retorne SOMENTE este JSON:
{"habitos": [{"nome_habito": "...", "descricao": "dica prática em 1 frase curta", "icone": "...", "categoria": "..."}]}`;

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
          { role: "user",   content: userPrompt   },
        ],
        response_format: { type: "json_object" },
        temperature: 0.65,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      console.error("[gerar-habitos] OpenAI error:", aiResponse.status, err);
      if (aiResponse.status === 429) {
        return errorResponse("Limite de IA excedido. Tente em alguns minutos.", 429, req);
      }
      return errorResponse("Erro ao gerar hábitos com IA.", 502, req);
    }

    const aiData  = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da IA");

    const parsed = JSON.parse(content);
    const raw: Record<string, unknown>[] = parsed.habitos ?? [];

    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error("Formato de resposta inválido da IA");
    }

    // Sanitiza cada hábito
    const sanitizedFull = raw.slice(0, 36).map((h) => ({
      user_id:         userId,
      nome_habito:     String(h.nome_habito ?? "").slice(0, 100),
      descricao:       String(h.descricao   ?? "").slice(0, 300),
      icone:           VALID_ICONS.includes(String(h.icone)) ? String(h.icone) : "check",
      categoria:       VALID_CATEGORIES.includes(String(h.categoria)) ? String(h.categoria) : "geral",
      gerado_por_ia:   true,
      ativo:           true,
      ultima_exibicao: null,
    })).filter((h) => h.nome_habito.length >= 3);

    // Versão sem colunas novas — para compatibilidade com banco sem migration
    const sanitizedBasic = sanitizedFull.map(({ categoria, ultima_exibicao, ...rest }) => rest);

    // Remove hábitos gerados por IA anteriores
    await supabase
      .from("habitos")
      .delete()
      .eq("user_id", userId)
      .eq("gerado_por_ia", true);

    // Tenta inserir com todas as colunas primeiro
    let inserted: unknown[] | null = null;
    const { data: d1, error: e1 } = await supabase
      .from("habitos")
      .insert(sanitizedFull)
      .select();

    if (e1) {
      // Coluna 'categoria' ou 'ultima_exibicao' pode não existir no banco ainda
      // Tenta sem as colunas novas
      console.warn("[gerar-habitos] Fallback sem colunas novas:", e1.message);
      const { data: d2, error: e2 } = await supabase
        .from("habitos")
        .insert(sanitizedBasic)
        .select();
      if (e2) throw e2;
      inserted = d2;
    } else {
      inserted = d1;
    }

    return jsonResponse({ habitos: inserted, count: (inserted as unknown[])?.length ?? 0 }, 200, {}, req);
  } catch (err) {
    console.error("[gerar-habitos] Unexpected error:", err);
    return errorResponse("Erro interno ao gerar hábitos.", 500, req);
  }
});
