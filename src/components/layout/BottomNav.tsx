import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, CheckSquare, Headphones, Dumbbell, Users, Trophy, User, X, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type NavItem = {
  to: string;
  icon: React.ElementType;
  label: string;
};

type SocialItem = NavItem & { description: string };

const MAIN_NAV: NavItem[] = [
  { to: "/",        icon: Home,        label: "Início" },
  { to: "/habitos", icon: CheckSquare, label: "Hábitos" },
  { to: "/treinos", icon: Dumbbell,    label: "Treinos" },
  { to: "/sons",    icon: Headphones,  label: "Sons" },
];

const SOCIAL_NAV: SocialItem[] = [
  { to: "/amigos",    icon: Users,    label: "Amigos",    description: "Conecte-se com pessoas" },
  { to: "/desafios",  icon: Trophy,   label: "Desafios",  description: "Competições e metas" },
  { to: "/progresso", icon: BarChart3, label: "Progresso", description: "Sua evolução em gráficos" },
  { to: "/perfil",    icon: User,     label: "Perfil",    description: "Suas informações" },
];

export function BottomNav() {
  const [socialOpen, setSocialOpen] = useState(false);
  const navigate = useNavigate();

  function handleSocialNavigate(to: string) {
    setSocialOpen(false);
    navigate(to);
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg"
        aria-label="Navegação principal"
      >
        <div className="mx-auto flex max-w-2xl items-center justify-around py-2">
          {MAIN_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                [
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                ].join(" ")
              }
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  <div className={["rounded-xl p-1.5 transition-colors", isActive ? "bg-primary/10" : ""].join(" ")}>
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          <button
            onClick={() => setSocialOpen(true)}
            aria-label="Abrir menu social"
            aria-expanded={socialOpen}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <div className="rounded-xl p-1.5">
              <Users className="h-5 w-5" strokeWidth={1.8} aria-hidden />
            </div>
            <span>Social</span>
          </button>
        </div>
      </nav>

      {/* Sheet do menu social */}
      <AnimatePresence>
        {socialOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSocialOpen(false)}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
              aria-hidden
            />
            <motion.div
              role="dialog"
              aria-label="Menu social"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border bg-card p-6 pb-8 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Social</h2>
                <button
                  onClick={() => setSocialOpen(false)}
                  aria-label="Fechar menu social"
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {SOCIAL_NAV.map(({ to, icon: Icon, label, description }) => (
                  <button
                    key={to}
                    onClick={() => handleSocialNavigate(to)}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" aria-hidden />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
