import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsPreflightResponse,
  jsonResponse,
  errorResponse,
  authenticateRequest,
  checkRateLimit,
} from "../_shared/cors.ts";

/**
 * Exclui permanentemente todos os dados pessoais do usuário (direito LGPD).
 * Requer confirmação explícita digitada pelo usuário.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflightResponse(req);

  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;
  const { userId } = auth;

  // Rate limit baixo — é uma operação destrutiva e rara
  if (!checkRateLimit(userId, 3, 60_000)) {
    return errorResponse("Muitas tentativas. Aguarde um momento.", 429, req);
  }

  let confirmacao: string | undefined;
  try {
    const body = await req.json();
    confirmacao = body?.confirmacao;
  } catch {
    return errorResponse("Corpo da requisição inválido.", 400, req);
  }

  if (confirmacao !== "EXCLUIR MEUS DADOS") {
    return errorResponse(
      "Confirmação inválida. Digite 'EXCLUIR MEUS DADOS' para confirmar.",
      400,
      req
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("[excluir-dados] Variáveis de ambiente de serviço ausentes");
    return errorResponse("Serviço temporariamente indisponível.", 503, req);
  }

  try {
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Ordem respeita dependências de chaves estrangeiras
    const tables = [
      "mensagens_lucas",
      "conversas_lucas",
      "habito_registro",
      "habitos",
      "checkin_diario",
      "treino_exercicios",
      "treinos",
      "treino_perfil",
      "desafios",
      "amizades",
      "preferencias_usuario",
      "presenca_online",
      "consentimento_usuario",
      "consentimento_lgpd",
      "audit_log",
      "perfil_usuario",
    ];

    const results: Record<string, string> = {};
    for (const table of tables) {
      const { error } = await adminClient.from(table).delete().eq("user_id", userId);
      results[table] = error ? `erro: ${error.message}` : "excluído";
    }

    // Relações onde o usuário aparece como contraparte, não como dono direto
    await adminClient.from("desafios").delete().eq("desafiado_id", userId);
    await adminClient.from("amizades").delete().eq("amigo_id", userId);

    // Remove arquivos do Storage (avatar)
    const { data: avatarFiles } = await adminClient.storage.from("avatars").list(userId);
    if (avatarFiles && avatarFiles.length > 0) {
      const paths = avatarFiles.map((f) => `${userId}/${f.name}`);
      await adminClient.storage.from("avatars").remove(paths);
    }

    // Por fim, exclui a conta de autenticação
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error("[excluir-dados] Falha ao excluir conta de autenticação:", authDeleteError);
    }

    console.log(`[LGPD] Exclusão de dados concluída para usuário: ${userId}`);

    return jsonResponse(
      {
        message: "Todos os seus dados foram excluídos com sucesso.",
        detalhes: results,
      },
      200,
      {},
      req
    );
  } catch (e) {
    console.error("[excluir-dados] Erro inesperado:", e);
    return errorResponse("Erro interno ao excluir dados.", 500, req);
  }
});
