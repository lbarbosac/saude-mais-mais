import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { User, Dumbbell, Brain, Target, ArrowRight, X } from "lucide-react";

interface CompleteProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    icon: Dumbbell,
    color: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    title: "Dados Físicos",
    description: "Peso, altura e nível de atividade para personalizar seus treinos.",
  },
  {
    icon: Brain,
    color: "bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
    title: "Saúde Mental",
    description: "Nível de estresse e qualidade do sono para hábitos mais equilibrados.",
  },
  {
    icon: Target,
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    title: "Objetivos",
    description: "O que você quer alcançar com o app? Isso guia tudo.",
  },
];

export function CompleteProfileModal({ open, onClose }: CompleteProfileModalProps) {
  const navigate = useNavigate();

  function goToProfile() {
    onClose();
    navigate("/perfil");
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="profile-modal-title"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed left-1/2 top-1/2 z-[51] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-card p-6 shadow-elevated"
          >
            {/* Fechar */}
            <button onClick={onClose} aria-label="Fechar"
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" aria-hidden />
            </button>

            {/* Header */}
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-hero shadow-soft">
              <User className="h-7 w-7 text-primary-foreground" aria-hidden />
            </div>
            <h2 id="profile-modal-title" className="mb-1 text-lg font-bold text-foreground">
              Complete seu perfil
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Quanto mais você nos conta, mais personalizados ficam seus hábitos, treinos e sugestões.
            </p>

            {/* Sections */}
            <div className="mb-5 flex flex-col gap-2">
              {SECTIONS.map(({ icon: Icon, color, title, description }) => (
                <div key={title} className="flex items-start gap-3 rounded-2xl border border-border p-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button onClick={goToProfile} className="btn-primary w-full justify-center">
                <ArrowRight className="h-4 w-4" aria-hidden />
                Preencher agora
              </button>
              <button onClick={onClose} className="btn-secondary w-full justify-center text-sm">
                Fazer depois
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
