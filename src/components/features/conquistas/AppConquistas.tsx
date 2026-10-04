import { useStreakConquista } from "@/hooks/useStreakConquista";
import { ConquistaModal } from "./ConquistaModal";

/**
 * Mounted once in App.tsx (inside AuthProvider).
 * Checks streak milestones on mount and shows the celebration modal
 * if the user just hit 7 / 14 / 30 / 60 / 100 days.
 */
export function AppConquistas() {
  const { conquista, dismiss } = useStreakConquista();

  if (!conquista) return null;

  return <ConquistaModal conquista={conquista} onDismiss={dismiss} />;
}
