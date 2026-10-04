// Edge Function: gerar-habitos
//
// Gera a lista de hábitos personalizada com a Gemini e troca a lista atual de
// forma atômica (RPC substituir_habitos_ia). Chamada no fim do onboarding e
// pelo botão "Renovar".
//
// Entrada: { hoje: "AAAA-MM-DD" }  (data local do aparelho)
// Saída:   { total, origem: "ia" | "padrao" }
//
// Se a IA falhar e o usuário ainda não tiver hábitos, grava a lista padrão
// para o app nunca ficar vazio. Se já tiver, mantém a lista atual e avisa.

import { dataISOValida, erro, json, lerCorpo, preflight } from "../_shared/http.ts";
import { autenticar, dentroDaCota } from "../_shared/supabase.ts";
import { gerarJSON, respostaParaErro } from "../_shared/gemini.ts";
import { CATEGORIAS, HABITOS_PADRAO, ICONES, sanitizarHabitos } from "../_shared/habitos.ts";

const TOTAL = 36;

const SCHEMA = {
  type: "object",
  properties: {
    habitos: {
      type: "array",
      minItems: 24,
      maxItems: TOTAL,
      items: {
        type: "object",
        properties: {
          nome_habito: { type: "string" },
          descricao: { type: "string" },
          icone: { type: "string", enum: [...ICONES] },
          categoria: { type: "string", enum: [...CATEGORIAS] },
        },
        required: ["nome_habito", "descricao", "icone", "categoria"],
      },
    },
  },
  required: ["habitos"],
};

const SISTEMA =
  "Você é especialista em saúde e bem-estar e cria hábitos diários simples, realistas e gentis, em português do Brasil. Responda só com o JSON pedido.";

const rotulo = (v: unknown) => (v === null || v === undefined || v === "" ? "não informado" : String(v).slice(0, 120));

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return erro(req, "Método não permitido.", 405);

  const auth = await autenticar(req);
  if ("resposta" in auth) return auth.resposta;
  const { userId, db } = auth;

  const corpo = await lerCorpo(req);
  const hoje = dataISOValida(corpo?.hoje);
  if (!hoje) return erro(req, "Requisição inválida.");

  if (!(await dentroDaCota(userId, "habitos", 6, 3600))) {
    return erro(req, "Você já renovou seus hábitos várias vezes na última hora. Tente mais tarde.", 429);
  }

  const [perfilRes, registrosRes, atuaisRes] = await Promise.all([
    db.from("perfil_usuario")
      .select("nivel_atividade, nivel_estresse, qualidade_sono, humor_geral, rotina, tempo_livre, objetivo")
      .eq("user_id", userId)
      .maybeSingle(),
    db.from("habito_registro")
      .select("concluido")
      .eq("user_id", userId)
      .order("data", { ascending: false })
      .limit(90),
    db.from("habitos").select("nome_habito").eq("user_id", userId).eq("ativo", true).limit(40),
  ]);

  const perfil: Record<string, unknown> = perfilRes.data ?? {};
  const registros = registrosRes.data ?? [];
  const atuais = (atuaisRes.data ?? []).map((h) => h.nome_habito);
  const taxa = registros.length
    ? `${Math.round((registros.filter((r) => r.concluido).length / registros.length) * 100)}% dos hábitos exibidos foram feitos`
    : "ainda sem histórico";

  const pedido = `Crie exatamente ${TOTAL} hábitos diários para esta pessoa.

PERFIL
- Atividade física: ${rotulo(perfil.nivel_atividade)}
- Estresse: ${rotulo(perfil.nivel_estresse)}
- Sono: ${rotulo(perfil.qualidade_sono)}
- Humor: ${rotulo(perfil.humor_geral)}
- Rotina: ${rotulo(perfil.rotina)}
- Tempo livre: ${rotulo(perfil.tempo_livre)}
- Objetivo: ${rotulo(perfil.objetivo)}
- Histórico: ${taxa}

REGRAS
1. Coisas que qualquer pessoa consegue fazer hoje, sem comprar nada nem precisar de equipamento.
2. Nada de suplementos, alimentos incomuns ou exercícios de mais de 15 minutos.
3. Nome curto (até 7 palavras), natural. Bons exemplos: "Beber água ao acordar", "Caminhar 10 minutos", "Ligar para alguém querido".
4. Descrição: uma dica prática em uma frase curta.
5. Distribuição por categoria: movimento 7, agua_alimentacao 6, sono_descanso 5, respiracao 5, social_gratidao 5, foco_aprendizado 4, humor_emocao 4.
6. Se o histórico mostrar pouca adesão, prefira hábitos ainda mais fáceis.${
    atuais.length ? `\n7. Varie em relação à lista atual; evite repetir: ${atuais.slice(0, 36).join("; ")}.` : ""
  }`;

  let habitos;
  let origem: "ia" | "padrao" = "ia";
  try {
    const resposta = await gerarJSON<{ habitos?: unknown }>({
      sistema: SISTEMA,
      mensagens: [{ papel: "user", texto: pedido }],
      schema: SCHEMA,
      temperatura: 0.8,
      maxTokens: 8192,
    });
    habitos = sanitizarHabitos(resposta.habitos, TOTAL);
    if (habitos.length < 12) throw new Error(`A IA devolveu só ${habitos.length} hábitos válidos`);
  } catch (e) {
    console.error("[gerar-habitos] falha da IA:", e instanceof Error ? e.message : e);
    if (atuais.length > 0) {
      const { status, mensagem } = respostaParaErro(e);
      return erro(req, `${mensagem} Seus hábitos atuais continuam valendo.`, status);
    }
    habitos = HABITOS_PADRAO;
    origem = "padrao";
  }

  const { data: total, error } = await db.rpc("substituir_habitos_ia", { p_habitos: habitos, p_hoje: hoje });
  if (error) {
    console.error("[gerar-habitos] falha ao salvar:", error.message);
    return erro(req, "Não foi possível salvar seus hábitos. Tente novamente.", 500);
  }

  return json(req, { total, origem });
});
