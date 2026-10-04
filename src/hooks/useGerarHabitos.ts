import { useMutation, useQueryClient } from "@tanstack/react-query";
import { track } from "@/lib/analytics";
import { callEdgeFunction } from "@/lib/supabase/functions";
import { todayISO } from "@/lib/utils/date";
import { toast } from "@/hooks/use-toast";

interface Resposta {
  total: number;
  origem: "ia" | "padrao";
}

/** Gera (ou renova) a lista de hábitos pela Edge Function gerar-habitos. */
export function useGerarHabitos(aoConcluir?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await callEdgeFunction<Resposta>("gerar-habitos", {
        body: { hoje: todayISO() },
        timeoutMs: 60_000,
      });
      if (error || !data) throw new Error(error ?? "Não foi possível gerar seus hábitos.");
      return data;
    },
    onSuccess: (data) => {
      track("habit_generated", { origem: data.origem });
      queryClient.invalidateQueries({ queryKey: ["habitos-do-dia"] });
      queryClient.invalidateQueries({ queryKey: ["progresso"] });
      toast(
        data.origem === "ia"
          ? { title: "Lista renovada", description: "Seus hábitos de hoje já foram escolhidos." }
          : { title: "Hábitos prontos", description: "A IA está indisponível agora, então usamos uma lista inicial." },
      );
      aoConcluir?.();
    },
    onError: (erro: Error) => {
      toast({ title: "Não deu para gerar agora", description: erro.message, variant: "destructive" });
    },
  });
}
