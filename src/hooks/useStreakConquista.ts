import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { dataLocalISO } from "@/lib/utils/date";

export type StreakMilestone = 7 | 14 | 30 | 60 | 100;

export interface ConquistaEvent {
  streak: number;
  milestone: StreakMilestone;
  userName: string;
}

const MILESTONES: StreakMilestone[] = [7, 14, 30, 60, 100];

function isMilestone(n: number): n is StreakMilestone {
  return MILESTONES.includes(n as StreakMilestone);
}

// Data local (não UTC): à noite no Brasil o UTC já está no dia seguinte.
const toDateStr = dataLocalISO;

/**
 * Calcula o streak atual a partir de datas únicas de check-in.
 * Aceita como válido tanto "começou hoje" quanto "começou ontem
 * (ainda não fez o de hoje)".
 */
function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const unique = [...new Set(dates)].sort().reverse(); // mais recente primeiro
  const agora = new Date();
  const today     = toDateStr(agora);
  const yesterday = toDateStr(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1));

  // Determina o ponto de partida: hoje ou ontem
  const start = unique[0] === today ? today : unique[0] === yesterday ? yesterday : null;
  if (!start) return 0;

  // Parse start date without timezone shift (YYYY-MM-DD → local midnight)
  const [sy, sm, sd] = start.split("-").map(Number);
  const startDate = new Date(sy, sm - 1, sd);

  let streak = 0;
  for (let i = 0; i < unique.length; i++) {
    const expected = toDateStr(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - i));
    if (unique[i] === expected) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function useStreakConquista() {
  const { user } = useAuth();
  const [conquista, setConquista] = useState<ConquistaEvent | null>(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!user || checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      const [streakRes, perfilRes] = await Promise.all([
        supabase
          .from("checkin_diario")            // ← nome correto da tabela
          .select("data")
          .eq("user_id", user.id)
          .order("data", { ascending: false })
          .limit(150),
        supabase
          .from("perfil_usuario")
          .select("nome")
          .eq("user_id", user.id)
          .single(),
      ]);

      if (streakRes.error || !streakRes.data) return;

      const dates = streakRes.data.map((r) => r.data as string);
      const streak = calcStreak(dates);

      if (!isMilestone(streak)) return;

      const storageKey = `conquista-shown-${user.id}-streak-${streak}`;
      if (localStorage.getItem(storageKey)) return;
      localStorage.setItem(storageKey, "1");

      setConquista({
        streak,
        milestone: streak,
        userName: perfilRes.data?.nome?.split(" ")[0] ?? "",
      });
    })();
  }, [user]);

  const dismiss = () => setConquista(null);

  return { conquista, dismiss };
}
