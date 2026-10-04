import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { track } from "@/lib/analytics";
import { supabase } from "@/lib/supabase/client";
import { somarDias, todayISO } from "@/lib/utils/date";
import { selecionarHabitosDoDia } from "@/lib/utils/habitSelection";
import { toast } from "@/hooks/use-toast";

export interface HabitoDoDia {
  id: string;
  nome_habito: string;
  descricao: string | null;
  icone: string;
  categoria: string;
  concluido: boolean;
}

/** Chave única: Início e Hábitos compartilham o mesmo cache. */
export const habitosQueryKey = (userId: string | undefined, hoje: string) => ["habitos-do-dia", userId, hoje] as const;

/**
 * Lê a lista de hoje. Se ainda não existir, sugere uma (habitSelection.ts) e a
 * grava com definir_habitos_do_dia, que devolve a lista definitiva — mesmo que
 * outra aba ou aparelho tenha gravado antes.
 */
async function buscarHabitosDoDia(userId: string, hoje: string): Promise<HabitoDoDia[]> {
  const [habitosRes, historicoRes] = await Promise.all([
    supabase
      .from("habitos")
      .select("id, nome_habito, descricao, icone, categoria")
      .eq("user_id", userId)
      .eq("ativo", true)
      .order("created_at"),
    supabase
      .from("habito_registro")
      .select("habito_id, data, concluido")
      .eq("user_id", userId)
      .gte("data", somarDias(hoje, -90))
      .lte("data", hoje),
  ]);
  if (habitosRes.error) throw habitosRes.error;
  if (historicoRes.error) throw historicoRes.error;

  const habitos = habitosRes.data;
  if (habitos.length === 0) return [];

  const ativos = new Map(habitos.map((h) => [h.id, h]));
  let doDia = historicoRes.data
    .filter((r) => r.data === hoje && ativos.has(r.habito_id))
    .map((r) => ({ habito_id: r.habito_id, concluido: r.concluido }));

  if (doDia.length === 0) {
    const estatisticas = new Map<string, { exibido: number; concluido: number; ultima: string | null }>();
    for (const r of historicoRes.data) {
      if (r.data >= hoje) continue;
      const e = estatisticas.get(r.habito_id) ?? { exibido: 0, concluido: 0, ultima: null };
      e.exibido++;
      if (r.concluido) e.concluido++;
      if (!e.ultima || r.data > e.ultima) e.ultima = r.data;
      estatisticas.set(r.habito_id, e);
    }

    const sugestao = selecionarHabitosDoDia(
      habitos.map((h) => {
        const e = estatisticas.get(h.id);
        return { id: h.id, categoria: h.categoria, ultima_exibicao: e?.ultima ?? null, vezes_exibido: e?.exibido ?? 0, vezes_concluido: e?.concluido ?? 0 };
      }),
      userId,
      hoje,
    );

    const { data, error } = await supabase.rpc("definir_habitos_do_dia", {
      p_data: hoje,
      p_habitos: sugestao.map((h) => h.id),
    });
    if (error) throw error;
    doDia = data ?? [];
  }

  const ordem = new Map(habitos.map((h, i) => [h.id, i]));
  return doDia
    .filter((r) => ativos.has(r.habito_id))
    .sort((a, b) => ordem.get(a.habito_id)! - ordem.get(b.habito_id)!)
    .map((r) => ({ ...ativos.get(r.habito_id)!, concluido: r.concluido }));
}

/** Hábitos do dia + ação de marcar/desmarcar, usados por Início e Hábitos. */
export function useHabitosDoDia(userId: string | undefined) {
  const queryClient = useQueryClient();
  const hoje = todayISO();
  const queryKey = habitosQueryKey(userId, hoje);

  const query = useQuery({
    queryKey,
    queryFn: () => buscarHabitosDoDia(userId!, hoje),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  const mutacao = useMutation({
    // Toques seguidos são enviados em ordem: sem isso, uma resposta atrasada
    // podia sobrescrever o último estado escolhido.
    scope: { id: "alternar-habito" },
    mutationFn: async ({ id, concluido }: { id: string; concluido: boolean }) => {
      const { error } = await supabase
        .from("habito_registro")
        .upsert({ habito_id: id, user_id: userId!, data: hoje, concluido }, { onConflict: "habito_id,data" });
      if (error) throw error;
    },
    onMutate: async ({ id, concluido }) => {
      await queryClient.cancelQueries({ queryKey });
      const anterior = queryClient.getQueryData<HabitoDoDia[]>(queryKey);
      queryClient.setQueryData<HabitoDoDia[]>(queryKey, (lista = []) =>
        lista.map((h) => (h.id === id ? { ...h, concluido } : h)),
      );
      return { anterior };
    },
    onError: (_erro, _vars, contexto) => {
      queryClient.setQueryData(queryKey, contexto?.anterior);
      toast({ title: "Não foi possível salvar", description: "Verifique sua conexão e tente de novo.", variant: "destructive" });
    },
    onSuccess: (_d, { concluido }) => {
      track("habit_toggled", { concluido });
      queryClient.invalidateQueries({ queryKey: ["progresso"] });
    },
  });

  /** Inverte o estado lendo o cache no momento do toque (não o valor da renderização). */
  const alternar = useCallback(
    (id: string) => {
      const atual = queryClient.getQueryData<HabitoDoDia[]>(queryKey)?.find((h) => h.id === id);
      if (atual) mutacao.mutate({ id, concluido: !atual.concluido });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, userId, hoje, mutacao.mutate],
  );

  return {
    habitos: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    recarregar: query.refetch,
    alternar,
  };
}
