import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Heart, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type AuthMode = "welcome" | "login" | "signup";

interface FormState {
  name: string;
  email: string;
  password: string;
}

// ─── Validação simples (sem biblioteca externa) ───────────────────────────────

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateSignupForm(form: FormState): string | null {
  if (!form.name.trim()) return "Informe seu nome.";
  if (!validateEmail(form.email)) return "E-mail inválido.";
  if (form.password.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  return null;
}

function validateLoginForm(form: Pick<FormState, "email" | "password">): string | null {
  if (!validateEmail(form.email)) return "E-mail inválido.";
  if (!form.password) return "Informe sua senha.";
  return null;
}

// ─── Componente ───────────────────────────────────────────────────────────────

const FADE_UP = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function LoginPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>("welcome");
  const [form, setForm] = useState<FormState>({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redireciona se já autenticado
  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  function updateField(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (error) {
      toast({
        title: "Erro ao entrar com Google",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
    // Se OK, o Supabase redireciona — não precisa de setIsSubmitting(false)
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    const validationError = validateSignupForm(form);
    if (validationError) {
      toast({ title: validationError, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { nome: form.name.trim(), full_name: form.name.trim() },
        emailRedirectTo: window.location.origin,
      },
    });
    setIsSubmitting(false);

    if (error) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Conta criada!",
        description: "Verifique seu e-mail para confirmar o cadastro antes de entrar.",
      });
      setMode("login");
    }
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    const validationError = validateLoginForm(form);
    if (validationError) {
      toast({ title: validationError, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    setIsSubmitting(false);

    if (error) {
      const msg = error.message.toLowerCase().includes("email not confirmed")
        ? "E-mail não confirmado. Verifique sua caixa de entrada."
        : error.message.toLowerCase().includes("invalid login")
        ? "E-mail ou senha incorretos."
        : error.message;

      toast({ title: "Erro ao entrar", description: msg, variant: "destructive" });
    }
    // Se OK, o onAuthStateChange cuida do redirecionamento
  }

  // ── Tela de boas-vindas ───────────────────────────────────────────────────

  if (mode === "welcome") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <motion.div
          variants={FADE_UP}
          initial="hidden"
          animate="show"
          className="flex w-full max-w-sm flex-col items-center gap-8"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl gradient-hero shadow-elevated">
              <Heart className="h-10 w-10 text-primary-foreground" aria-hidden />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Saúde<span className="text-primary">++</span>
            </h1>
            <p className="text-muted-foreground">
              Seu caminho para uma vida mais saudável e equilibrada.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              aria-label="Entrar com Google"
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card px-6 py-4 font-medium shadow-card transition-all hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continuar com Google
            </button>

            <button
              onClick={() => setMode("signup")}
              className="w-full rounded-2xl gradient-calm px-6 py-4 font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated"
            >
              Criar conta com e-mail
            </button>

            <button
              onClick={() => setMode("login")}
              className="w-full rounded-2xl border border-border bg-card px-6 py-4 font-medium text-foreground transition-all hover:bg-muted"
            >
              Já tenho conta
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com nossos{" "}
            <a href="/termos" className="underline hover:text-foreground">
              Termos de Uso
            </a>{" "}
            e{" "}
            <a href="/privacidade" className="underline hover:text-foreground">
              Política de Privacidade
            </a>
            .
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Formulários de login/cadastro ─────────────────────────────────────────

  const isSignup = mode === "signup";
  const handleSubmit = isSignup ? handleSignUp : handleSignIn;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <motion.div
        variants={FADE_UP}
        initial="hidden"
        animate="show"
        className="flex w-full max-w-sm flex-col gap-6"
      >
        <button
          onClick={() => setMode("welcome")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar
        </button>

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-hero shadow-soft">
            <Heart className="h-7 w-7 text-primary-foreground" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isSignup ? "Criar conta" : "Bem-vindo de volta"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignup ? "Preencha seus dados para começar" : "Entre com seu e-mail e senha"}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          {isSignup && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="text"
                value={form.name}
                onChange={updateField("name")}
                placeholder="Seu nome"
                autoComplete="name"
                required
                aria-label="Nome"
                className="w-full rounded-2xl border border-border bg-card py-4 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="email"
              value={form.email}
              onChange={updateField("email")}
              placeholder="Seu e-mail"
              autoComplete="email"
              required
              aria-label="E-mail"
              className="w-full rounded-2xl border border-border bg-card py-4 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={updateField("password")}
              placeholder={isSignup ? "Mínimo 8 caracteres" : "Sua senha"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              aria-label="Senha"
              className="w-full rounded-2xl border border-border bg-card py-4 pl-11 pr-11 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-calm py-4 font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Aguarde..." : isSignup ? "Criar conta" : "Entrar"}
          </button>

          {isSignup && (
            <p className="text-center text-xs text-muted-foreground">
              Um e-mail de verificação será enviado para confirmar sua conta.
            </p>
          )}
        </form>

        <button
          type="button"
          onClick={() => setMode(isSignup ? "login" : "signup")}
          className="text-center text-sm text-muted-foreground hover:text-primary"
        >
          {isSignup ? "Já tenho uma conta" : "Criar uma conta"}
        </button>
      </motion.div>
    </div>
  );
}

// ── Ícone do Google isolado para reutilização ─────────────────────────────────

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
