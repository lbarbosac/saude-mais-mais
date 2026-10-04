import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

const INTERVALO_MS = 4 * 60_000;

/**
 * Mantém presenca_online.ultimo_acesso atualizado enquanto o app está visível.
 * Amigos veem a pessoa como online por 5 minutos depois do último sinal.
 */
export function usePresenca(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const sinalizar = () => {
      if (document.visibilityState !== "visible") return;
      supabase
        .from("presenca_online")
        .upsert({ user_id: userId, ultimo_acesso: new Date().toISOString() }, { onConflict: "user_id" })
        .then(({ error }) => {
          if (error) console.debug("[presença] falha ao sinalizar:", error.message);
        });
    };

    sinalizar();
    const timer = window.setInterval(sinalizar, INTERVALO_MS);
    document.addEventListener("visibilitychange", sinalizar);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sinalizar);
    };
  }, [userId]);
}
