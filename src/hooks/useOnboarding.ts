import { useEffect, useState, useCallback, useRef } from "react";
import { track } from "@/lib/analytics";
import { supabase } from "@/lib/supabase/client";
import { callEdgeFunction } from "@/lib/supabase/functions";
import { useAuth } from "@/contexts/AuthContext";

export function useOnboarding() {
  const { user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const checkedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setNeedsOnboarding(null);
      checkedUserIdRef.current = null;
      return;
    }

    // Avoid re-fetching if already checked for this user
    if (checkedUserIdRef.current === user.id) return;
    checkedUserIdRef.current = user.id;

    let cancelled = false;

    supabase
      .from("perfil_usuario")
      .select("onboarding_completo, nome")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setNeedsOnboarding(true);
          return;
        }
        setNeedsOnboarding(!data.onboarding_completo || !data.nome?.trim());
      });

    return () => { cancelled = true; };
  }, [user]);

  /**
   * Chamado pelo OnboardingFlow ao finalizar.
   * Gera hábitos automaticamente em background — não bloqueia o usuário.
   */
  const markComplete = useCallback(() => {
    setNeedsOnboarding(false);

    track("onboarding_completed");
    callEdgeFunction("gerar-habitos").then(({ error }) => {
      if (error) {
        console.warn("[useOnboarding] Geração automática de hábitos falhou:", error);
      }
    });
  }, []);

  return { needsOnboarding, markComplete };
}
