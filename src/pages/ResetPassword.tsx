import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Heart, Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { forcaDaSenha } from "@/lib/validacao";

const COR_FORCA: Record<string, string> = { Fraca: "bg-red-400", "Razoável": "bg-yellow-400", Boa: "bg-blue-400", Forte: "bg-green-500" };

const FADE = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
};

export default function ResetPassword() {
  const { user, isLoading } = useAuth();
  const navigate  = useNavigate();

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);

  // Supabase loga automaticamente o usuário ao clicar no link de reset
  // Aguarda o AuthContext resolver antes de redirecionar
  if (!user && !isLoading) {
    return <Navigate to="/login" replace />;
  }
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const strength = forcaDaSenha(password);

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "A senha deve ter pelo menos 8 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      toast({ title: "Não foi possível redefinir a senha", description: /same|different/i.test(error.message) ? "A nova senha precisa ser diferente da anterior." : "O link pode ter expirado. Peça um novo.", variant: "destructive" });
    } else {
      setDone(true);
      // Pequeno delay para o usuário ver a mensagem de sucesso
      setTimeout(() => navigate("/", { replace: true }), 2000);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <motion.div variants={FADE} initial="hidden" animate="show"
        className="flex w-full max-w-sm flex-col gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl gradient-hero shadow-elevated">
            <Heart className="h-8 w-8 text-primary-foreground" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nova senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {done ? "Senha redefinida com sucesso!" : "Escolha uma senha forte para sua conta"}
            </p>
          </div>
        </div>

        {done ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="font-semibold text-foreground">Tudo certo!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua senha foi redefinida. Você será redirecionado em instantes.
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} noValidate className="flex flex-col gap-3">
            {/* Nova senha */}
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input id="nova-senha" name="nova-senha" type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nova senha (mínimo 8 caracteres)"
                  autoComplete="new-password" required maxLength={128}
                  aria-label="Nova senha"
                  className="input-modern-icon pr-12" />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>

              {/* Indicador de força */}
              {password.length > 0 && (
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

            {/* Confirmar senha */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input id="confirmar-senha" name="confirmar-senha" type={showPass ? "text" : "password"} value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirme a nova senha"
                autoComplete="new-password" required maxLength={128}
                aria-label="Confirmar nova senha"
                className={[
                  "input-modern-icon",
                  confirm && confirm !== password
                    ? "!border-red-400 focus:!ring-red-400/20"
                    : "",
                ].join(" ")} />
            </div>
            {confirm && confirm !== password && (
              <p className="px-1 text-xs text-red-500">As senhas não coincidem.</p>
            )}

            <button type="submit" disabled={submitting}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl gradient-calm py-4 font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elevated disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {submitting ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}

        <div className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <p className="text-xs text-muted-foreground">Conexão segura · Dados protegidos</p>
        </div>
      </motion.div>
    </div>
  );
}
