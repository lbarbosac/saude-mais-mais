import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { track } from "@/lib/analytics";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Diz se o usuário ainda precisa passar pelo onboarding.
 * needsOnboarding: null enquanto carrega.
 */
export function useOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["onboarding", user?.id];

  const { data, isError, refetch } = useQuery({
    queryKey,
    enabled: !!user,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfil_usuario")
        .select("onboarding_completo, nome")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return !data?.onboarding_completo || !data.nome?.trim();
    },
  });

  const markComplete = useCallback(() => {
    track("onboarding_completed");
    queryClient.setQueryData(queryKey, false);
    // Hábitos foram gerados no fim do onboarding: Início e Hábitos devem buscar de novo.
    queryClient.invalidateQueries({ queryKey: ["habitos-do-dia"] });
    queryClient.invalidateQueries({ queryKey: ["perfil"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, user?.id]);

  return { needsOnboarding: data ?? null, isError, retry: refetch, markComplete };
}
