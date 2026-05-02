import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Mail, Lock, User, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Mode = "welcome" | "login" | "signup" | "forgot";

// Sanitize: strip HTML/script tags, trim, max length
function sanitize(str: string, max = 256): string {
  return str.replace(/<[^>]*>/g, "").trim().slice(0, max);
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(pw: string): { ok: boolean; msg: string } {
  if (pw.length < 8) return { ok: false, msg: "Mínimo 8 caracteres" };
  if (!/[A-Z]/.test(pw)) return { ok: false, msg: "Inclua ao menos uma letra maiúscula" };
  if (!/[0-9]/.test(pw)) return { ok: false, msg: "Inclua ao menos um número" };
  return { ok: true, msg: "" };
}

const PasswordStrength = ({ pw }: { pw: string }) => {
  const checks = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)];
  const score = checks.filter(Boolean).length;
  const colors = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-600"];
  const labels = ["", "Fraca", "Razoável", "Boa", "Forte"];
  if (!pw) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? colors[score] : "bg-muted"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{labels[score]}</p>
    </div>
  );
};

const InputField = ({
  icon: Icon,
  type,
  value,
  onChange,
  placeholder,
  error,
  rightEl,
  autoComplete,
}: {
  icon: React.ElementType;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
  rightEl?: React.ReactNode;
  autoComplete?: string;
}) => (
  <div className="flex flex-col gap-1">
    <div className={`relative flex items-center rounded-2xl border bg-card transition-colors ${error ? "border-red-500" : "border-border focus-within:border-primary"}`}>
      <Icon className="absolute left-4 h-4 w-4 text-muted-foreground" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full bg-transparent py-4 pl-11 pr-11 text-sm outline-none"
      />
      {rightEl && <div className="absolute right-4">{rightEl}</div>}
    </div>
    {error && (
      <p className="flex items-center gap-1 text-xs text-red-500">
        <AlertCircle className="h-3 w-3" /> {error}
      </p>
    )}
  </div>
);

const Login = () => {
  const [mode, setMode] = useState<Mode>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [forgotSent, setForgotSent] = useState(false);

  const clearErrors = () => setErrors({});

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      toast({ title: "Erro ao entrar com Google", description: error.message, variant: "destructive" });
      setLoading(false);
    }
    // On success browser redirects — no setLoading(false) needed
  };

  const handleSignup = useCallback(async () => {
    const cleanNome = sanitize(nome);
    const cleanEmail = sanitize(email).toLowerCase();
    const errs: Record<string, string> = {};

    if (!cleanNome) errs.nome = "Informe seu nome";
    if (!validateEmail(cleanEmail)) errs.email = "Email inválido";
    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) errs.password = pwCheck.msg;

    if (Object.keys(errs).length) { setErrors(errs); return; }
    clearErrors();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { nome: cleanNome, full_name: cleanNome },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        setErrors({ email: "Este email já está cadastrado" });
      } else {
        toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
      }
      return;
    }

    toast({
      title: "Conta criada!",
      description: "Enviamos um link de confirmação para seu email. Verifique a caixa de entrada (e o spam).",
    });
    setMode("login");
    setPassword("");
  }, [nome, email, password]);

  const handleLogin = useCallback(async () => {
    const cleanEmail = sanitize(email).toLowerCase();
    const errs: Record<string, string> = {};
    if (!validateEmail(cleanEmail)) errs.email = "Email inválido";
    if (!password) errs.password = "Informe a senha";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    clearErrors();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    setLoading(false);

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setErrors({ email: "Email ainda não confirmado — verifique sua caixa de entrada" });
      } else if (error.message.includes("Invalid login credentials")) {
        // Generic message: don't reveal which field is wrong (security)
        setErrors({ email: " ", password: "Email ou senha incorretos" });
      } else {
        toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      }
    }
  }, [email, password]);

  const handleForgot = useCallback(async () => {
    const cleanEmail = sanitize(email).toLowerCase();
    if (!validateEmail(cleanEmail)) { setErrors({ email: "Informe um email válido" }); return; }
    clearErrors();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    // Always show success to avoid email enumeration
    setForgotSent(true);
  }, [email]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    if (mode === "login") handleLogin();
    else if (mode === "signup") handleSignup();
    else if (mode === "forgot") handleForgot();
  };

  // ─── Welcome ───
  if (mode === "welcome") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex w-full max-w-sm flex-col items-center gap-8"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl gradient-hero shadow-elevated">
              <Heart className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Saúde<span className="text-primary">++</span>
            </h1>
            <p className="text-center text-muted-foreground text-sm">
              Cuide da sua saúde mental e física em um só lugar.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card px-6 py-4 font-medium shadow-card transition-all hover:shadow-soft disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar com Google
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              onClick={() => { clearErrors(); setMode("signup"); }}
              className="w-full rounded-2xl gradient-calm px-6 py-4 font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated"
            >
              Criar conta com email
            </button>

            <button
              onClick={() => { clearErrors(); setMode("login"); }}
              className="w-full rounded-2xl border border-border bg-card px-6 py-4 font-medium text-foreground transition-all hover:bg-muted"
            >
              Já tenho conta
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com nossos{" "}
            <span className="underline cursor-pointer">Termos de Uso</span> e{" "}
            <span className="underline cursor-pointer">Política de Privacidade</span>.
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Forgot password ───
  if (mode === "forgot") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full max-w-sm flex-col gap-6"
        >
          <button onClick={() => { setMode("login"); clearErrors(); setForgotSent(false); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>

          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-foreground">Esqueceu a senha?</h1>
            <p className="text-sm text-muted-foreground">Informe seu email e enviaremos um link para redefinir.</p>
          </div>

          <AnimatePresence>
            {forgotSent ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950"
              >
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="font-semibold text-green-700 dark:text-green-300">Email enviado!</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Se esse email estiver cadastrado, você receberá as instruções em breve. Verifique também o spam.
                </p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-3" onKeyDown={handleKeyDown}>
                <InputField
                  icon={Mail} type="email" value={email}
                  onChange={(v) => { setEmail(v); clearErrors(); }}
                  placeholder="Seu email" error={errors.email} autoComplete="email"
                />
                <button
                  onClick={handleForgot} disabled={loading}
                  className="w-full rounded-2xl gradient-calm py-4 font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar link"}
                </button>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  // ─── Login / Signup ───
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-sm flex-col gap-6"
      >
        <button onClick={() => { setMode("welcome"); clearErrors(); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-hero shadow-soft">
            <Heart className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "signup" ? "Criar conta" : "Entrar"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signup" ? "Preencha seus dados para começar" : "Bem-vindo de volta!"}
          </p>
        </div>

        <div className="flex flex-col gap-3" onKeyDown={handleKeyDown}>
          {mode === "signup" && (
            <InputField
              icon={User} type="text" value={nome}
              onChange={(v) => { setNome(v); clearErrors(); }}
              placeholder="Seu nome completo" error={errors.nome} autoComplete="name"
            />
          )}

          <InputField
            icon={Mail} type="email" value={email}
            onChange={(v) => { setEmail(v); clearErrors(); }}
            placeholder="Seu email" error={errors.email} autoComplete="email"
          />

          <InputField
            icon={Lock}
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(v) => { setPassword(v); clearErrors(); }}
            placeholder="Sua senha"
            error={errors.password}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            rightEl={
              <button onClick={() => setShowPw((s) => !s)} className="text-muted-foreground" type="button">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          {mode === "signup" && <PasswordStrength pw={password} />}

          {mode === "signup" && (
            <p className="text-xs text-muted-foreground">
              Mínimo 8 caracteres, 1 maiúscula e 1 número. Um link de confirmação será enviado ao seu email.
            </p>
          )}

          <button
            onClick={mode === "signup" ? handleSignup : handleLogin}
            disabled={loading}
            className="w-full rounded-2xl gradient-calm py-4 font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
          >
            {loading ? "Carregando..." : mode === "signup" ? "Criar conta" : "Entrar"}
          </button>

          {mode === "login" && (
            <button
              onClick={() => { setMode("forgot"); clearErrors(); }}
              className="text-center text-sm text-muted-foreground hover:text-primary"
            >
              Esqueci minha senha
            </button>
          )}
        </div>

        <button
          onClick={() => { setMode(mode === "signup" ? "login" : "signup"); clearErrors(); setPassword(""); }}
          className="text-center text-sm text-muted-foreground hover:text-primary"
        >
          {mode === "signup" ? "Já tenho conta" : "Criar uma conta"}
        </button>
      </motion.div>
    </div>
  );
};

export default Login;
