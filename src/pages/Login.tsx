import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Mail, Lock, User, Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { emailValido, forcaDaSenha, validarCadastro, validarLogin } from "@/lib/validacao";

const VERSAO_TERMOS = "2.0";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type AuthMode = "login" | "signup" | "forgot";
interface FormState { name: string; email: string; password: string; }

// ─── Domínios de e-mail ───────────────────────────────────────────────────────
const EMAIL_DOMAINS = [
  "@gmail.com", "@hotmail.com", "@outlook.com", "@yahoo.com",
  "@icloud.com", "@live.com", "@uol.com.br", "@bol.com.br",
];

function getEmailSuggestions(value: string): string[] {
  if (!value || value.includes("@")) return [];
  return EMAIL_DOMAINS.map((d) => value + d);
}

// ─── Força da senha ───────────────────────────────────────────────────────────
const COR_FORCA: Record<string, string> = { Fraca: "bg-red-400", "Razoável": "bg-yellow-400", Boa: "bg-blue-400", Forte: "bg-green-500" };

// ─── Animação ─────────────────────────────────────────────────────────────────
const FADE = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
};

// ─── Componente ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [mode, setMode]           = useState<AuthMode>("login");
  const [form, setForm]           = useState<FormState>({ name: "", email: "", password: "" });
  const [showPass, setShowPass]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSug, setShowSug]     = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [confirmarEmail, setConfirmarEmail] = useState<string | null>(null);

  if (!authLoading && user) return <Navigate to="/" replace />;

  const isSignup  = mode === "signup";
  const isForgot  = mode === "forgot";
  const strength  = isSignup ? forcaDaSenha(form.password) : null;

  function onFieldChange(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setForm((p) => ({ ...p, [field]: v }));
      if (field === "email") {
        const s = getEmailSuggestions(v);
        setSuggestions(s);
        setShowSug(s.length > 0);
      }
    };
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setForm({ name: "", email: form.email, password: "" });
    setShowSug(false);
    setShowPass(false);
    setResetSent(false);
    setConsentAccepted(false);
  }

  // ── Cadastro ──────────────────────────────────────────────────────────────
  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    if (!consentAccepted) {
      toast({ title: "Aceite os Termos de Uso e a Política de Privacidade para continuar.", variant: "destructive" });
      return;
    }
    const err = validarCadastro({ nome: form.name, email: form.email, senha: form.password });
    if (err) { toast({ title: err, variant: "destructive" }); return; }

    setSubmitting(true);
    const email = form.email.trim().toLowerCase();
    // O aceite dos termos vai nos metadados; o gatilho do banco registra o
    // consentimento junto com a criação da conta.
    const { data, error } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          nome: form.name.trim(),
          versao_termos: VERSAO_TERMOS,
          user_agent: navigator.userAgent.slice(0, 200),
        },
      },
    });
    setSubmitting(false);

    if (error) {
      const msg = /already registered|already exists/i.test(error.message)
        ? "Este e-mail já está cadastrado. Tente entrar."
        : /password/i.test(error.message)
          ? "Escolha uma senha mais forte."
          : "Não foi possível criar a conta agora. Tente de novo.";
      toast({ title: "Erro ao criar conta", description: msg, variant: "destructive" });
      return;
    }

    // Com confirmação de e-mail ligada no Supabase não há sessão ainda:
    // a pessoa precisa clicar no link enviado.
    if (!data.session) setConfirmarEmail(email);
  }

  async function reenviarConfirmacao() {
    if (!confirmarEmail) return;
    const { error } = await supabase.auth.resend({ type: "signup", email: confirmarEmail, options: { emailRedirectTo: `${window.location.origin}/` } });
    toast(error ? { title: "Não foi possível reenviar agora", variant: "destructive" } : { title: "E-mail reenviado" });
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    const err = validarLogin({ email: form.email, senha: form.password });
    if (err) { toast({ title: err, variant: "destructive" }); return; }

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    setSubmitting(false);

    if (error) {
      if (/not confirmed/i.test(error.message)) {
        setConfirmarEmail(form.email.trim().toLowerCase());
        return;
      }
      const errado = /invalid (login )?credentials/i.test(error.message);
      toast({
        title: "Não foi possível entrar",
        description: errado ? "E-mail ou senha incorretos." : "Tente de novo em instantes.",
        variant: "destructive",
      });
    }
  }

  // ── Recuperação de senha ──────────────────────────────────────────────────
  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    if (!emailValido(form.email)) {
      toast({ title: "Informe um e-mail válido.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      form.email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/redefinir-senha` }
    );
    setSubmitting(false);

    if (error) {
      toast({ title: "Não foi possível enviar o e-mail", description: "Tente de novo em alguns minutos.", variant: "destructive" });
    } else {
      setResetSent(true);
    }
  }

  // ── Render: confirmação de e-mail ─────────────────────────────────────────
  if (confirmarEmail) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
        <motion.div variants={FADE} initial="hidden" animate="show" className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl gradient-hero shadow-elevated">
            <Mail className="h-8 w-8 text-primary-foreground" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Confirme seu e-mail</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Enviamos um link para <strong className="text-foreground">{confirmarEmail}</strong>. Abra o e-mail e toque no
              link para ativar sua conta. Confira também a caixa de spam.
            </p>
          </div>
          <button type="button" onClick={reenviarConfirmacao} className="btn-secondary w-full">Reenviar e-mail</button>
          <button type="button" onClick={() => { setConfirmarEmail(null); switchMode("login"); }}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Voltar para o login
          </button>
        </motion.div>
      </main>
    );
  }

  // ── Render: Recuperação de senha ──────────────────────────────────────────
  if (isForgot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
        <motion.div variants={FADE} initial="hidden" animate="show"
          className="flex w-full max-w-sm flex-col gap-6">

          <button onClick={() => switchMode("login")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground self-start">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar
          </button>

          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl gradient-hero shadow-elevated">
              <Heart className="h-8 w-8 text-primary-foreground" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Recuperar senha</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enviaremos um link para você criar uma nova senha
              </p>
            </div>
          </div>

          {resetSent ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="font-semibold text-foreground">E-mail enviado!</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Verifique sua caixa de entrada em <strong>{form.email}</strong> e siga as instruções para redefinir sua senha.
              </p>
              <button onClick={() => switchMode("login")}
                className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline">
                Voltar para o login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgot} noValidate className="flex flex-col gap-3">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  id="email-recuperacao"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onFieldChange("email")}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                  maxLength={254}
                  aria-label="E-mail para recuperação"
                  inputMode="email"
                  className="input-modern-icon"
                />
              </div>
              <button type="submit" disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-calm py-4 font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated disabled:opacity-60">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {submitting ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    );
  }

  // ── Render: Login / Cadastro ──────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <AnimatePresence mode="wait">
        <motion.div key={mode} variants={FADE} initial="hidden" animate="show"
          className="flex w-full max-w-sm flex-col gap-6">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl gradient-hero shadow-elevated">
              <Heart className="h-8 w-8 text-primary-foreground" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isSignup ? "Criar sua conta" : "Bem-vindo de volta"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSignup ? "Preencha seus dados para começar" : "Entre com seu e-mail e senha"}
              </p>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={isSignup ? handleSignUp : handleSignIn} noValidate
            className="flex flex-col gap-3">

            {/* Nome (só no cadastro) */}
            {isSignup && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input id="nome" name="nome" type="text" value={form.name} onChange={onFieldChange("name")}
                  placeholder="Seu nome completo" autoComplete="name"
                  required maxLength={100} aria-label="Nome completo"
                  className="input-modern-icon" />
              </div>
            )}

            {/* E-mail com sugestões */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input id="email" name="email" type="email" value={form.email} onChange={onFieldChange("email")}
                onFocus={() => suggestions.length > 0 && setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                placeholder="seu@email.com" autoComplete="email"
                required maxLength={254} aria-label="E-mail"
                aria-autocomplete="list" aria-expanded={showSug} inputMode="email"
                className="input-modern-icon" />

              <AnimatePresence>
                {showSug && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
                    role="listbox" aria-label="Sugestões de e-mail"
                    className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
                    {suggestions.map((s) => (
                      <button key={s} type="button" role="option" aria-selected={false}
                        onMouseDown={() => { setForm((p) => ({ ...p, email: s })); setShowSug(false); }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="text-foreground">{s}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input id="senha" name="senha" type={showPass ? "text" : "password"} value={form.password}
                  onChange={onFieldChange("password")}
                  placeholder={isSignup ? "Mínimo 8 caracteres" : "Sua senha"}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  required maxLength={128} aria-label="Senha"
                  className="input-modern-icon pr-12" />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground">
                  {showPass ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>

              {/* Força da senha */}
              {isSignup && form.password.length > 0 && strength && (
                <div className="flex flex-col gap-1.5 px-1">
                  <div className="flex h-1.5 gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={[
                        "h-full flex-1 rounded-full transition-all duration-300",
                        strength.pontos >= i ? COR_FORCA[strength.rotulo] : "bg-muted",
                      ].join(" ")} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Senha: <span className="font-medium text-foreground">{strength.rotulo}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Consentimento LGPD (só no cadastro) */}
            {isSignup && (
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="peer h-4 w-4 cursor-pointer rounded border-border accent-primary"
                    aria-required="true"
                  />
                </div>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Li e aceito os{" "}
                  <a href="/termos" target="_blank" rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline font-medium">
                    Termos de Uso
                  </a>{" "}
                  e a{" "}
                  <a href="/privacidade" target="_blank" rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline font-medium">
                    Política de Privacidade
                  </a>
                  , incluindo o tratamento de dados de saúde conforme a LGPD.
                </span>
              </label>
            )}

            {/* Esqueci minha senha (só no login) */}
            {!isSignup && (
              <button type="button" onClick={() => switchMode("forgot")}
                className="self-end text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                Esqueci minha senha
              </button>
            )}

            {/* Botão principal */}
            <button type="submit"
              disabled={submitting || (isSignup && !consentAccepted)}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl gradient-calm py-4 font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated disabled:cursor-not-allowed disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {submitting ? "Aguarde..." : isSignup ? "Criar conta" : "Entrar"}
            </button>
          </form>

          {/* Segurança */}
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <p className="text-xs text-muted-foreground">
              Conexão segura · Dados protegidos ·{" "}
              <a href="/privacidade" target="_blank" rel="noopener noreferrer"
                className="underline-offset-4 hover:underline hover:text-primary">
                Privacidade
              </a>
            </p>
          </div>

          {/* Alternar modo */}
          <p className="text-center text-sm text-muted-foreground">
            {isSignup ? "Já tem uma conta? " : "Ainda não tem conta? "}
            <button type="button" onClick={() => switchMode(isSignup ? "login" : "signup")}
              className="font-medium text-primary underline-offset-4 hover:underline">
              {isSignup ? "Entrar" : "Criar conta"}
            </button>
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
