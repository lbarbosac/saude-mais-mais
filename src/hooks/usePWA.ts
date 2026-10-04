import { useEffect, useState } from "react";

interface EventoInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Registra o service worker (só no build de produção: em desenvolvimento ele
 * atrapalharia o recarregamento do Vite) e expõe o convite de instalação.
 */
export function usePWA() {
  const [convite, setConvite] = useState<EventoInstalacao | null>(null);
  const [instalado, setInstalado] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches,
  );

  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((e) => console.error("[PWA] falha ao registrar:", e));
    }

    const aoConvidar = (e: Event) => {
      e.preventDefault();
      setConvite(e as EventoInstalacao);
    };
    const aoInstalar = () => setInstalado(true);
    window.addEventListener("beforeinstallprompt", aoConvidar);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoConvidar);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  async function instalar() {
    if (!convite) return false;
    await convite.prompt();
    const { outcome } = await convite.userChoice;
    setConvite(null);
    if (outcome === "accepted") setInstalado(true);
    return outcome === "accepted";
  }

  return { podeInstalar: !!convite && !instalado, instalar };
}
