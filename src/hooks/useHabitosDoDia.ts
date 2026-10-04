import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { track } from "@/lib/analytics";
import { supabase } from "@/lib/supabase/client";
import { todayISO } from "@/lib/utils/date";
import { selecionarHabitosDodia, type HabitoParaSelecao, type HabitoSelecionado } from "@/lib/utils/habitSelection";
import { toast } from "@/hooks/use-toast";

/**
 * Chave de query ÚNICA para os hábitos do dia.
 * Tanto Dashboard quanto Habits usam exatamente esta chave — garante que
 * as duas telas leem do MESMO cache e nunca mostram listas diferentes.
 */
export function habitosQueryKey(userId: string | undefined, today: string) {
  return ["habitos-do-dia", userId, today] as const;
}

function ninetyDaysAgoISO(): string {
  const d = new Date(Date.now() - 90 * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Busca, calcula histórico e seleciona os hábitos do dia.
 * Esta é a ÚNICA implementação no projeto — Dashboard e Habits chamam esta
 * mesma função via o mesmo hook, eliminando a divergência de cálculo de peso
 * que antes fazia as duas telas mostrarem hábitos diferentes no mesmo dia.
 */
async function fetchHabitosDoDia(userId: string, today: string): Promise<HabitoSelecionado[]> {
  const [habitosRes, registrosHojeRes, historicoRes] = await Promise.all([
    supabase
      .from("habitos")
      .select("id, nome_habito, descricao, icone")
      .eq("user_id", userId)
      .eq("ativo", true)
      .order("created_at"),

    supabase
      .from("habito_registro")
      .select("habito_id, concluido")
      .eq("user_id", userId)
      .eq("data", today),

    supabase
      .from("habito_registro")
      .select("habito_id, concluido")
      .eq("user_id", userId)
      .gte("data", ninetyDaysAgoISO()),
  ]);

  const allHabitos = habitosRes.data ?? [];
  if (allHabitos.length === 0) return [];

  const hojeMap = new Map(
    (registrosHojeRes.data ?? []).map((r) => [r.habito_id, r.concluido])
  );

  const historicoMap = new Map<string, { exibido: number; concluido: number }>();
  for (const r of historicoRes.data ?? []) {
    const entry = historicoMap.get(r.habito_id) ?? { exibido: 0, concluido: 0 };
    entry.exibido++;
    if (r.concluido) entry.concluido++;
    historicoMap.set(r.habito_id, entry);
  }

  const habitosParaSelecao: HabitoParaSelecao[] = allHabitos.map((h) => {
    const hist = historicoMap.get(h.id) ?? { exibido: 0, concluido: 0 };
    const hAny = h as Record<string, unknown>;
    return {
      id:              h.id,
      nome_habito:     h.nome_habito,
      descricao:       h.descricao ?? null,
      icone:           h.icone,
      categoria:       (typeof hAny.categoria === "string" ? hAny.categoria : null) ?? "geral",
      ultima_exibicao: (typeof hAny.ultima_exibicao === "string" ? hAny.ultima_exibicao : null) ?? null,
      concluido_hoje:  hojeMap.get(h.id) ?? false,
      vezes_concluido: hist.concluido,
      vezes_exibido:   hist.exibido,
    };
  });

  const selecionados = selecionarHabitosDodia(habitosParaSelecao, userId, today);

  // Marca ultima_exibicao em background (fire-and-forget)
  const idsParaAtualizar = selecionados
    .filter((h) => {
      const original = habitosParaSelecao.find((o) => o.id === h.id);
      return original?.ultima_exibicao !== today;
    })
    .map((h) => h.id);

  if (idsParaAtualizar.length > 0) {
    supabase
      .from("habitos")
      .update({ ultima_exibicao: today })
      .in("id", idsParaAtualizar)
      .then(() => {}, () => {}); // fire-and-forget, sem unhandled rejection
  }

  return selecionados;
}

async function toggleHabitoStatus(habito: HabitoSelecionado, userId: string): Promise<void> {
  const today = todayISO();
  const newState = !habito.concluido_hoje;

  const { data: existing } = await supabase
    .from("habito_registro")
    .select("id")
    .eq("habito_id", habito.id)
    .eq("data", today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("habito_registro")
      .update({ concluido: newState })
      .eq("id", existing.id);
  } else {
    await supabase.from("habito_registro").insert({
      habito_id: habito.id,
      user_id:   userId,
      concluido: newState,
      data:      today,
    });
  }
}

/**
 * Hook único para os hábitos do dia — usado por Dashboard.tsx e Habits.tsx.
 * Como ambos consomem a MESMA queryKey, qualquer toggle feito em uma tela
 * atualiza instantaneamente a outra via cache do React Query, sem necessidade
 * de invalidação manual entre páginas.
 */
export function useHabitosDoDia(userId: string | undefined) {
  const queryClient = useQueryClient();
  const today = todayISO();
  const queryKey = habitosQueryKey(userId, today);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchHabitosDoDia(userId!, today),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const toggleMutation = useMutation({
    mutationFn: (h: HabitoSelecionado) => { track("habit_toggled", { concluido: !h.concluido_hoje }); return toggleHabitoStatus(h, userId!); },
    onMutate: async (habito) => {
      await queryClient.cancelQueries({ queryKey });
      const snapshot = queryClient.getQueryData<HabitoSelecionado[]>(queryKey);
      queryClient.setQueryData<HabitoSelecionado[]>(queryKey, (prev = []) =>
        prev.map((h) => (h.id === habito.id ? { ...h, concluido_hoje: !h.concluido_hoje } : h))
      );
      return { snapshot };
    },
    onError: (_err, _h, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.snapshot);
      toast({ title: "Erro ao atualizar hábito", variant: "destructive" });
    },
  });

  return {
    habitos: query.data ?? [],
    isLoading: query.isLoading,
    toggleMutation,
    queryKey,
  };
}
