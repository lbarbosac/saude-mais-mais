import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

const CHAVE = "saude:pwa-dispensado";
const PAUSA_MS = 30 * 24 * 60 * 60 * 1000; // volta a sugerir depois de 30 dias

function dispensadoRecentemente(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(CHAVE) ?? 0) < PAUSA_MS;
  } catch {
    return false;
  }
}

export function PWAInstallBanner() {
  const { podeInstalar, instalar } = usePWA();
  const [dispensado, setDispensado] = useState(dispensadoRecentemente);
  const [instalando, setInstalando] = useState(false);

  function dispensar() {
    setDispensado(true);
    try {
      localStorage.setItem(CHAVE, String(Date.now()));
    } catch {
      // sem persistência: some só nesta sessão
    }
  }

  return (
    <AnimatePresence>
      {podeInstalar && !dispensado && (
        <motion.aside
          aria-label="Instalar o app"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed bottom-24 left-4 right-4 z-40 rounded-2xl border border-border bg-card p-4 shadow-elevated md:bottom-6 md:left-auto md:right-24 md:w-80"
        >
          <div className="flex items-start gap-3">
            <img src="/icons/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Instalar o Saúde++</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">Abra direto da tela inicial, como um app.</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setInstalando(true);
                    await instalar();
                    setInstalando(false);
                  }}
                  disabled={instalando}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  {instalando ? "Instalando…" : "Instalar"}
                </button>
                <button type="button" onClick={dispensar} className="rounded-xl bg-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                  Agora não
                </button>
              </div>
            </div>
            <button type="button" onClick={dispensar} aria-label="Fechar" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
