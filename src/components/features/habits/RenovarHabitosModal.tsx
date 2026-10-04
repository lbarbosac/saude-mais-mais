import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, X, AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  isGenerating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RenovarHabitosModal({ open, isGenerating, onConfirm, onCancel }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="renovar-titulo"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-card p-6 shadow-elevated"
          >
            <button onClick={onCancel} aria-label="Fechar"
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" aria-hidden />
            </button>

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-hero shadow-soft">
              <Sparkles className="h-7 w-7 text-primary-foreground" aria-hidden />
            </div>

            <h2 id="renovar-titulo" className="mb-2 text-lg font-bold text-foreground">
              Renovar hábitos com IA
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              A IA vai criar <strong className="text-foreground">36 novos hábitos</strong> personalizados
              para você com base no seu perfil e objetivos. Os hábitos mudam automaticamente todo dia,
              mas você pode renovar a lista completa quando quiser.
            </p>

            <div className="mb-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/30">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                Seus hábitos atuais serão <strong>substituídos</strong> por uma lista nova.
                O progresso de hoje é mantido.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={onConfirm} disabled={isGenerating} className="btn-primary w-full justify-center">
                {isGenerating ? (
                  <>
                    <motion.div animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <RefreshCw className="h-4 w-4" aria-hidden />
                    </motion.div>
                    Gerando novos hábitos...
                  </>
                ) : (
                  <><Sparkles className="h-4 w-4" aria-hidden />Sim, renovar meus hábitos</>
                )}
              </button>
              <button onClick={onCancel} disabled={isGenerating} className="btn-secondary w-full justify-center">
                Cancelar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
