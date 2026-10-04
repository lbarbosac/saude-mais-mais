import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";
import { useState } from "react";
import { usePWA } from "@/hooks/usePWA";

export function PWAInstallBanner() {
  const { installPrompt, isInstalled, install } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Don't show if: already installed, no prompt, or dismissed
  const visible = !!installPrompt && !isInstalled && !dismissed;

  const handleInstall = async () => {
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", damping: 20, stiffness: 260 }}
          className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl border border-border bg-card p-4 shadow-elevated md:bottom-6 md:left-auto md:right-6 md:w-80"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-calm">
              <span className="text-sm font-bold text-white">S+</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Instalar Saúde em Sintonia
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                Acesse rápido pela tela inicial, mesmo sem internet.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="flex items-center gap-1.5 rounded-xl gradient-calm px-4 py-2 text-xs font-semibold text-white shadow-soft disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" />
                  {installing ? "Instalando..." : "Instalar"}
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="rounded-xl bg-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Agora não
                </button>
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Fechar"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
