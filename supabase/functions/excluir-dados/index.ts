// Edge Function: excluir-dados
//
// Exclui a conta e todos os dados pessoais (direito previsto na LGPD).
// Todas as tabelas apontam para auth.users com ON DELETE CASCADE, então
// apagar o usuário apaga o resto. Antes disso, os arquivos do Storage
// (avatar e provas de desafios) são removidos, porque não têm cascata.
//
// Entrada: { confirmacao: "EXCLUIR MEUS DADOS" }

import { erro, json, lerCorpo, preflight } from "../_shared/http.ts";
import { autenticar, clienteAdmin } from "../_shared/supabase.ts";

const FRASE = "EXCLUIR MEUS DADOS";

async function apagarPasta(admin: ReturnType<typeof clienteAdmin>, bucket: string, pasta: string) {
  const { data: arquivos, error } = await admin.storage.from(bucket).list(pasta, { limit: 1000 });
  if (error) throw new Error(`listar ${bucket}/${pasta}: ${error.message}`);
  if (!arquivos?.length) return;
  const { error: erroRemocao } = await admin.storage.from(bucket).remove(arquivos.map((a) => `${pasta}/${a.name}`));
  if (erroRemocao) throw new Error(`remover ${bucket}/${pasta}: ${erroRemocao.message}`);
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return erro(req, "Método não permitido.", 405);

  const auth = await autenticar(req);
  if ("resposta" in auth) return auth.resposta;
  const { userId, db } = auth;

  const corpo = await lerCorpo(req);
  if (corpo?.confirmacao !== FRASE) {
    return erro(req, `Digite "${FRASE}" para confirmar.`);
  }

  const admin = clienteAdmin();
  try {
    // Desafios em que a pessoa participa somem com ela; as fotos-prova também.
    const { data: desafios } = await db.from("desafios").select("id");
    await apagarPasta(admin, "avatars", userId);
    for (const d of desafios ?? []) await apagarPasta(admin, "provas-desafios", d.id);
  } catch (e) {
    console.error("[excluir-dados] falha ao limpar o Storage:", e);
    return erro(req, "Não foi possível excluir seus arquivos agora. Nada foi apagado; tente novamente.", 500);
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[excluir-dados] falha ao excluir a conta:", error.message);
    return erro(req, "Não foi possível excluir sua conta agora. Tente novamente.", 500);
  }

  console.log(`[excluir-dados] conta excluída: ${userId}`);
  return json(req, { ok: true });
});
