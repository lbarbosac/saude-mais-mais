// Acesso às funções sociais do banco. Perfis de outras pessoas nunca são lidos
// direto da tabela: as funções aplicam as regras de privacidade no servidor.

import { supabase } from "@/lib/supabase/client";

export interface PerfilResumo {
  user_id: string;
  nome: string;
  nickname: string | null;
  avatar_url: string | null;
}

export interface Amigo extends PerfilResumo {
  online: boolean;
}

export interface PedidoAmizade extends PerfilResumo {
  id: string;
}

export type StatusAmizade = "amigos" | "pedido_enviado" | "pedido_recebido" | null;

export interface PerfilPublico extends PerfilResumo {
  eh_proprio: boolean;
  eh_amigo: boolean;
  status_amizade: StatusAmizade;
  restrito: boolean;
  habitos_concluidos_30d?: number;
  sequencia?: number;
  dados_fisicos?: { idade: number | null; peso: number | null; altura: number | null; sexo: string | null; nivel_atividade: string | null };
  saude_mental?: { nivel_estresse: string | null; qualidade_sono: string | null; humor_geral: string | null };
  objetivos?: { objetivo: string | null; rotina: string | null; tempo_livre: string | null };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ehUuid(valor: string | undefined): valor is string {
  return !!valor && UUID.test(valor);
}

export async function listarAmigos(): Promise<Amigo[]> {
  const { data, error } = await supabase.rpc("listar_amigos");
  if (error) throw error;
  return data;
}

export async function listarPedidos(): Promise<PedidoAmizade[]> {
  const { data, error } = await supabase.rpc("listar_pedidos_amizade");
  if (error) throw error;
  return data;
}

export async function buscarPerfis(termo: string): Promise<PerfilResumo[]> {
  const { data, error } = await supabase.rpc("buscar_perfis", { p_termo: termo });
  if (error) throw error;
  return data;
}

export async function perfilPublico(userId: string, comoAmigo = false): Promise<PerfilPublico | null> {
  const { data, error } = await supabase.rpc("perfil_publico", { p_user_id: userId, p_como_amigo: comoAmigo });
  if (error) throw error;
  return (data as unknown as PerfilPublico) ?? null;
}

/** Envia um pedido. Devolve uma mensagem amigável quando já existe vínculo. */
export async function pedirAmizade(meuId: string, amigoId: string): Promise<string | null> {
  const { error } = await supabase.from("amizades").insert({ user_id: meuId, amigo_id: amigoId });
  if (!error) return null;
  if (error.code === "23505") return "Já existe um pedido ou uma amizade com essa pessoa.";
  return "Não foi possível enviar o pedido.";
}

export async function responderPedido(pedidoId: string, aceitar: boolean) {
  const { error } = await supabase.from("amizades").update({ status: aceitar ? "aceito" : "recusado" }).eq("id", pedidoId);
  if (error) throw error;
}

/** Desfaz a amizade ou cancela um pedido, em qualquer direção. */
export async function desfazerAmizade(meuId: string, outroId: string) {
  const { error } = await supabase
    .from("amizades")
    .delete()
    .or(`and(user_id.eq.${meuId},amigo_id.eq.${outroId}),and(user_id.eq.${outroId},amigo_id.eq.${meuId})`);
  if (error) throw error;
}
