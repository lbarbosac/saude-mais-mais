import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Home, CheckSquare, Headphones, BarChart3, Dumbbell, Users, Trophy, User, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const mainItems = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/habitos", icon: CheckSquare, label: "Hábitos" },
  { to: "/treinos", icon: Dumbbell, label: "Treinos" },
  { to: "/sons", icon: Headphones, label: "Sons" },
  { to: "/progresso", icon: BarChart3, label: "Progresso" },
];

const socialItems = [
  { to: "/amigos", icon: Users, label: "Amigos" },
  { to: "/desafios", icon: Trophy, label: "Desafios" },
  { to: "/perfil", icon: User, label: "Perfil" },
];

const SocialIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" strokeWidth={1.8} stroke="currentColor">
    <circle cx="9" cy="7" r="3" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M2 20c0-3.31 3.13-6 7-6s7 2.69 7 6" strokeLinecap="round" />
    <path d="M17 13c2.21 0 4 1.57 4 3.5" strokeLinecap="round" />
  </svg>
);

const BottomNav = () => {
  const [socialOpen, setSocialOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isSocialActive = socialItems.some((i) => location.pathname.startsWith(i.to));

  const handleSocialNav = (to: string) => {
    setSocialOpen(false);
    navigate(to);
  };

  return (
    <>
      {/* Social modal overlay */}
      <AnimatePresence>
        {socialOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSocialOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2"
            >
              <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-elevated">
                <p className="px-2 pb-1 text-xs font-semibold text-muted-foreground">Social</p>
                {socialItems.map(({ to, icon: Icon, label }) => {
                  const isActive = location.pathname.startsWith(to);
                  return (
                    <button
                      key={to}
                      onClick={() => handleSocialNav(to)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                        isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg safe-bottom">
        <div className="mx-auto flex max-w-5xl items-center justify-around py-2">
          {mainItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`rounded-xl p-1.5 transition-colors ${isActive ? "bg-primary/10" : ""}`}>
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Social button */}
          <button
            onClick={() => setSocialOpen((v) => !v)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              isSocialActive || socialOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className={`rounded-xl p-1.5 transition-colors ${isSocialActive || socialOpen ? "bg-primary/10" : ""}`}>
              {socialOpen ? <X className="h-5 w-5" strokeWidth={2.2} /> : <SocialIcon />}
            </div>
            <span>Social</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
