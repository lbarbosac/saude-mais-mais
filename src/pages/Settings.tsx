import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, MapPin, Moon, Globe, Shield, LogOut, ChevronRight, Trash2, AlertTriangle, MessageCircle, Loader2, Sun, Eye, EyeOff, Lock, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import BackButton from "@/components/BackButton";

interface LucasSettings {
  lucas_estilo: string;
  lucas_profundidade: string;
  lucas_tom: string;
  lucas_sugestoes: string;
}

const defaultLucasSettings: LucasSettings = {
  lucas_estilo: "equilibrado",
  lucas_profundidade: "moderado",
  lucas_tom: "acolhedor",
  lucas_sugestoes: "moderado",
};

const Settings = () => {
  const { user, signOut, session } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Lucas settings
  const [lucasSettings, setLucasSettings] = useState<LucasSettings>(defaultLucasSettings);
  const [sobreVoce, setSobreVoce] = useState("");
  const [savingLucas, setSavingLucas] = useState(false);
  const [loadingLucas, setLoadingLucas] = useState(true);

  // Preferences state
  const [theme, setTheme] = useState<"claro" | "escuro">("claro");
  const [language, setLanguage] = useState<"pt-BR" | "en">("pt-BR");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);

  // Privacy
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [profilePrivate, setProfilePrivate] = useState(false);
  const [showHabits, setShowHabits] = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const [showStreak, setShowStreak] = useState(true);
  const [showDadosFisicos, setShowDadosFisicos] = useState(true);
  const [showSaudeMental, setShowSaudeMental] = useState(true);
  const [showObjetivos, setShowObjetivos] = useState(true);

  // Modals
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);

  useEffect(() => {
    if (user) {
      loadLucasSettings();
      loadPreferences();
    }
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("saude-theme") as "claro" | "escuro" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "escuro");
    }
    const savedLang = localStorage.getItem("saude-language") as "pt-BR" | "en" | null;
    if (savedLang) setLanguage(savedLang);
  }, [user]);

  const loadPreferences = async () => {
    const [{ data: prefs }, { data: perfil }] = await Promise.all([
      supabase
        .from("preferencias_usuario")
        .select("notificacoes_ativas, localizacao_permitida, tema")
        .eq("user_id", user!.id)
        .single(),
      supabase
        .from("perfil_usuario")
        .select("profile_private, show_habits, show_progress, show_streak, show_dados_fisicos, show_saude_mental, show_objetivos")
        .eq("user_id", user!.id)
        .single(),
    ]);
    if (prefs) {
      setNotificationsEnabled(prefs.notificacoes_ativas ?? true);
      setLocationEnabled(prefs.localizacao_permitida ?? false);
      if (prefs.tema === "escuro") {
        setTheme("escuro");
        document.documentElement.classList.add("dark");
      }
    }
    if (perfil) {
      setProfilePrivate((perfil as any).profile_private ?? false);
      setShowHabits((perfil as any).show_habits ?? true);
      setShowProgress((perfil as any).show_progress ?? true);
      setShowStreak((perfil as any).show_streak ?? true);
      setShowDadosFisicos((perfil as any).show_dados_fisicos ?? true);
      setShowSaudeMental((perfil as any).show_saude_mental ?? true);
      setShowObjetivos((perfil as any).show_objetivos ?? true);
    }
  };

  const savePrivacy = async () => {
    await supabase
      .from("perfil_usuario")
      .update({
        profile_private: profilePrivate,
        show_habits: showHabits,
        show_progress: showProgress,
        show_streak: showStreak,
        show_dados_fisicos: showDadosFisicos,
        show_saude_mental: showSaudeMental,
        show_objetivos: showObjetivos,
      } as any)
      .eq("user_id", user!.id);
    setShowPrivacy(false);
    toast({ title: "Configurações de privacidade salvas" });
  };

  const loadLucasSettings = async () => {
    setLoadingLucas(true);
    const [prefsResult, perfilResult] = await Promise.all([
      supabase.from("preferencias_usuario").select("lucas_estilo, lucas_profundidade, lucas_tom, lucas_sugestoes").eq("user_id", user!.id).single(),
      supabase.from("perfil_usuario").select("sobre_voce").eq("user_id", user!.id).single(),
    ]);
    if (prefsResult.data) {
      setLucasSettings({
        lucas_estilo: (prefsResult.data as any).lucas_estilo || "equilibrado",
        lucas_profundidade: (prefsResult.data as any).lucas_profundidade || "moderado",
        lucas_tom: (prefsResult.data as any).lucas_tom || "acolhedor",
        lucas_sugestoes: (prefsResult.data as any).lucas_sugestoes || "moderado",
      });
    }
    if (perfilResult.data) setSobreVoce((perfilResult.data as any).sobre_voce || "");
    setLoadingLucas(false);
  };

  const saveLucasSettings = async () => {
    setSavingLucas(true);
    await Promise.all([
      supabase.from("preferencias_usuario").update({
        lucas_estilo: lucasSettings.lucas_estilo,
        lucas_profundidade: lucasSettings.lucas_profundidade,
        lucas_tom: lucasSettings.lucas_tom,
        lucas_sugestoes: lucasSettings.lucas_sugestoes,
      } as any).eq("user_id", user!.id),
      supabase.from("perfil_usuario").update({ sobre_voce: sobreVoce.slice(0, 2000) } as any).eq("user_id", user!.id),
    ]);
    toast({ title: "Configuracoes do Lucas salvas!" });
    setSavingLucas(false);
  };

  const handleThemeChange = async (newTheme: "claro" | "escuro") => {
    setTheme(newTheme);
    localStorage.setItem("saude-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "escuro");
    await supabase.from("preferencias_usuario").update({ tema: newTheme } as any).eq("user_id", user!.id);
    toast({ title: newTheme === "escuro" ? "Tema escuro ativado" : "Tema claro ativado" });
  };

  const handleLanguageChange = (lang: "pt-BR" | "en") => {
    setLanguage(lang);
    localStorage.setItem("saude-language", lang);
    toast({ title: lang === "pt-BR" ? "Idioma alterado para Portugues" : "Language changed to English" });
  };

  const handleToggleNotifications = async () => {
    const newVal = !notificationsEnabled;
    setNotificationsEnabled(newVal);
    await supabase.from("preferencias_usuario").update({ notificacoes_ativas: newVal } as any).eq("user_id", user!.id);
    toast({ title: newVal ? "Notificacoes ativadas" : "Notificacoes desativadas" });
  };

  const handleToggleLocation = async () => {
    const newVal = !locationEnabled;
    setLocationEnabled(newVal);
    await supabase.from("preferencias_usuario").update({ localizacao_permitida: newVal } as any).eq("user_id", user!.id);
    toast({ title: newVal ? "Localizacao ativada" : "Localizacao desativada" });
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await signOut();
    navigate("/login");
  };

  const handleDeleteData = async () => {
    if (deleteInput !== "EXCLUIR MEUS DADOS") {
      toast({ title: "Digite exatamente 'EXCLUIR MEUS DADOS' para confirmar", variant: "destructive" });
      return;
    }
    setDeleting(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/excluir-dados`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ confirmacao: "EXCLUIR MEUS DADOS" }),
      });
      if (!resp.ok) throw new Error("Erro ao excluir dados");
      toast({ title: "Dados excluidos com sucesso" });
      await signOut();
      navigate("/login");
    } catch {
      toast({ title: "Erro ao excluir dados", variant: "destructive" });
    }
    setDeleting(false);
  };

  const OptionGroup = ({ label, description, options, value, onChange }: {
    label: string; description: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
  }) => (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button key={opt.value} onClick={() => onChange(opt.value)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${value === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  const Toggle = ({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label: string }) => (
    <button onClick={onToggle} className="flex items-center justify-between w-full py-2">
      <span className="text-sm text-foreground">{label}</span>
      <div className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted-foreground/30"}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
    </button>
  );

  const Modal = ({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode }) => (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <BackButton to="/perfil" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuracoes</h1>
          <p className="text-sm text-muted-foreground">Personalize sua experiencia</p>
        </div>
      </div>

      {/* Lucas Amigo Settings */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lucas Amigo - Saude Mental</p>
        <div className="rounded-2xl border border-border bg-card p-4 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Configurar o Lucas</p>
              <p className="text-xs text-muted-foreground">Personalize como o Lucas conversa com voce</p>
            </div>
          </div>

          {loadingLucas ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <>
              <OptionGroup label="Estilo de Conversa" description="Como o Lucas se comunica com voce"
                options={[{ value: "direto", label: "Mais direto" }, { value: "equilibrado", label: "Equilibrado" }, { value: "detalhado", label: "Mais detalhado" }]}
                value={lucasSettings.lucas_estilo} onChange={(v) => setLucasSettings((s) => ({ ...s, lucas_estilo: v }))} />
              <OptionGroup label="Nivel de Profundidade" description="Quao profundas sao as respostas"
                options={[{ value: "superficial", label: "Superficial" }, { value: "moderado", label: "Moderado" }, { value: "profundo", label: "Profundo" }]}
                value={lucasSettings.lucas_profundidade} onChange={(v) => setLucasSettings((s) => ({ ...s, lucas_profundidade: v }))} />
              <OptionGroup label="Tom Emocional" description="O tom das respostas do Lucas"
                options={[{ value: "acolhedor", label: "Acolhedor" }, { value: "neutro", label: "Neutro" }, { value: "racional", label: "Racional" }]}
                value={lucasSettings.lucas_tom} onChange={(v) => setLucasSettings((s) => ({ ...s, lucas_tom: v }))} />
              <OptionGroup label="Frequencia de Sugestoes" description="Quantas sugestoes praticas o Lucas oferece"
                options={[{ value: "poucas", label: "Poucas" }, { value: "moderado", label: "Moderado" }, { value: "muitas", label: "Muitas" }]}
                value={lucasSettings.lucas_sugestoes} onChange={(v) => setLucasSettings((s) => ({ ...s, lucas_sugestoes: v }))} />
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Conte mais sobre voce</p>
                  <p className="text-xs text-muted-foreground">Compartilhe informacoes pessoais para o Lucas te entender melhor</p>
                </div>
                <textarea value={sobreVoce} onChange={(e) => setSobreVoce(e.target.value.slice(0, 2000))} placeholder="Ex: Sou introvertido, trabalho de casa..." className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 resize-none" rows={4} />
                <p className="text-xs text-muted-foreground text-right">{sobreVoce.length}/2000</p>
              </div>
              <button onClick={saveLucasSettings} disabled={savingLucas} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50">
                {savingLucas ? "Salvando..." : "Salvar configuracoes do Lucas"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Preferencias */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferencias</p>
        <div className="flex flex-col gap-2">
          <button onClick={() => setShowAppearance(true)} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {theme === "escuro" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Aparencia</p>
              <p className="text-xs text-muted-foreground">{theme === "escuro" ? "Tema escuro" : "Tema claro"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button onClick={() => setShowNotifications(true)} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bell className="h-5 w-5" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Notificacoes</p>
              <p className="text-xs text-muted-foreground">{notificationsEnabled ? "Ativadas" : "Desativadas"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button onClick={() => setShowLocation(true)} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Localizacao</p>
              <p className="text-xs text-muted-foreground">{locationEnabled ? "Ativada" : "Desativada"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button onClick={() => setShowLanguage(true)} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Globe className="h-5 w-5" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Idioma</p>
              <p className="text-xs text-muted-foreground">{language === "pt-BR" ? "Portugues (Brasil)" : "English"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Conta */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conta</p>
        <div className="flex flex-col gap-2">
          <button onClick={() => setShowPrivacy(true)} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Shield className="h-5 w-5" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Privacidade</p>
              <p className="text-xs text-muted-foreground">{profilePrivate ? "Perfil privado" : "Perfil publico"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button onClick={() => setShowLogoutModal(true)} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><LogOut className="h-5 w-5" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Sair da conta</p>
              <p className="text-xs text-muted-foreground">Encerrar sessao atual</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* LGPD */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">LGPD - Privacidade</p>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-semibold text-destructive">Excluir todos os meus dados</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Conforme a LGPD, voce tem o direito de solicitar a exclusao de todos os seus dados pessoais.
            Esta acao e irreversivel e removera todas as suas conversas, habitos, check-ins e dados de perfil.
          </p>
          <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/20">
            <Trash2 className="h-4 w-4" />
            Solicitar exclusao
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">Saude++ v1.0.0</p>

      {/* === MODALS === */}

      {/* Appearance Modal */}
      <Modal show={showAppearance} onClose={() => setShowAppearance(false)}>
        <p className="text-lg font-bold text-foreground mb-4">Aparencia</p>
        <div className="flex gap-3">
          <button onClick={() => { handleThemeChange("claro"); setShowAppearance(false); }} className={`flex-1 flex flex-col items-center gap-2 rounded-xl p-4 border-2 transition-all ${theme === "claro" ? "border-primary bg-primary/5" : "border-border"}`}>
            <Sun className="h-6 w-6 text-foreground" />
            <span className="text-sm font-medium text-foreground">Claro</span>
          </button>
          <button onClick={() => { handleThemeChange("escuro"); setShowAppearance(false); }} className={`flex-1 flex flex-col items-center gap-2 rounded-xl p-4 border-2 transition-all ${theme === "escuro" ? "border-primary bg-primary/5" : "border-border"}`}>
            <Moon className="h-6 w-6 text-foreground" />
            <span className="text-sm font-medium text-foreground">Escuro</span>
          </button>
        </div>
      </Modal>

      {/* Notifications Modal */}
      <Modal show={showNotifications} onClose={() => setShowNotifications(false)}>
        <p className="text-lg font-bold text-foreground mb-4">Notificacoes</p>
        <Toggle enabled={notificationsEnabled} onToggle={() => { handleToggleNotifications(); }} label="Ativar notificacoes" />
        <p className="text-xs text-muted-foreground mt-2">Receba lembretes de habitos, check-ins e novidades.</p>
        <button onClick={() => setShowNotifications(false)} className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Fechar</button>
      </Modal>

      {/* Location Modal */}
      <Modal show={showLocation} onClose={() => setShowLocation(false)}>
        <p className="text-lg font-bold text-foreground mb-4">Localizacao</p>
        <Toggle enabled={locationEnabled} onToggle={() => { handleToggleLocation(); }} label="Ativar localizacao" />
        <p className="text-xs text-muted-foreground mt-2">Permite sugestoes personalizadas com base na sua localizacao.</p>
        <button onClick={() => setShowLocation(false)} className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Fechar</button>
      </Modal>

      {/* Language Modal */}
      <Modal show={showLanguage} onClose={() => setShowLanguage(false)}>
        <p className="text-lg font-bold text-foreground mb-4">Idioma</p>
        <div className="flex flex-col gap-2">
          <button onClick={() => { handleLanguageChange("pt-BR"); setShowLanguage(false); }} className={`flex items-center gap-3 rounded-xl p-3 border-2 transition-all ${language === "pt-BR" ? "border-primary bg-primary/5" : "border-border"}`}>
            <span className="text-lg">🇧🇷</span>
            <span className="text-sm font-medium text-foreground">Portugues (Brasil)</span>
          </button>
          <button onClick={() => { handleLanguageChange("en"); setShowLanguage(false); }} className={`flex items-center gap-3 rounded-xl p-3 border-2 transition-all ${language === "en" ? "border-primary bg-primary/5" : "border-border"}`}>
            <span className="text-lg">🇺🇸</span>
            <span className="text-sm font-medium text-foreground">English</span>
          </button>
        </div>
      </Modal>

      {/* Privacy Modal */}
      <Modal show={showPrivacy} onClose={() => setShowPrivacy(false)}>
        <p className="text-lg font-bold text-foreground mb-1">Privacidade</p>
        <p className="text-xs text-muted-foreground mb-4">Controle quem pode ver suas informações</p>
        <div className="space-y-3 max-h-[55vh] overflow-y-auto">
          <Toggle enabled={profilePrivate} onToggle={() => setProfilePrivate(!profilePrivate)} label="Perfil privado (somente amigos)" />
          <div className="border-t border-border pt-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Informações visíveis:</p>
            <Toggle enabled={showDadosFisicos} onToggle={() => setShowDadosFisicos(!showDadosFisicos)} label="Meus dados físicos" />
            <Toggle enabled={showSaudeMental} onToggle={() => setShowSaudeMental(!showSaudeMental)} label="Minha saúde mental" />
            <Toggle enabled={showObjetivos} onToggle={() => setShowObjetivos(!showObjetivos)} label="Meus objetivos" />
            <Toggle enabled={showHabits} onToggle={() => setShowHabits(!showHabits)} label="Meus hábitos" />
            <Toggle enabled={showProgress} onToggle={() => setShowProgress(!showProgress)} label="Meu progresso" />
            <Toggle enabled={showStreak} onToggle={() => setShowStreak(!showStreak)} label="Minha sequência" />
          </div>
          <button
            onClick={() => { setShowPrivacy(false); navigate(`/amigo/${user!.id}`); }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"
          >
            <Eye className="h-4 w-4" />
            Visualizar meu perfil
          </button>
        </div>
        <button onClick={savePrivacy} className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Salvar</button>
      </Modal>

      {/* Logout Modal */}
      <Modal show={showLogoutModal} onClose={() => setShowLogoutModal(false)}>
        <div className="text-center">
          <LogOut className="mx-auto h-10 w-10 text-destructive mb-3" />
          <p className="text-lg font-bold text-foreground mb-2">Deseja sair da conta?</p>
          <p className="text-sm text-muted-foreground mb-4">Voce precisara fazer login novamente para acessar o app.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowLogoutModal(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground">Cancelar</button>
            <button onClick={handleLogout} className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground">Sair</button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal show={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteInput(""); }}>
        <div className="text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" />
          <p className="text-lg font-bold text-foreground mb-2">Tem certeza que deseja excluir sua conta?</p>
          <p className="text-sm text-muted-foreground mb-4">Todas as informacoes serao perdidas permanentemente. Esta acao nao pode ser desfeita.</p>
          <p className="text-xs font-medium text-destructive mb-2 text-left">Digite "EXCLUIR MEUS DADOS" para confirmar:</p>
          <input value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} placeholder="EXCLUIR MEUS DADOS" className="w-full rounded-xl border border-destructive/30 bg-card px-4 py-2.5 text-sm outline-none focus:border-destructive mb-4" />
          <div className="flex gap-3">
            <button onClick={() => { setShowDeleteModal(false); setDeleteInput(""); }} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground">Cancelar</button>
            <button onClick={handleDeleteData} disabled={deleting} className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-50">
              {deleting ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default Settings;
