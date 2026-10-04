import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, type LucideIcon } from "lucide-react";

export const REPOSITORIO = "https://github.com/lbarbosac/saude-mais-mais";

/** E-mail de contato opcional (VITE_CONTATO_EMAIL); sem ele, o contato é pelo repositório. */
export function Contato() {
  const email = import.meta.env.VITE_CONTATO_EMAIL?.trim();
  return email ? (
    <a href={`mailto:${email}`} className="text-primary underline-offset-4 hover:underline">{email}</a>
  ) : (
    <a href={REPOSITORIO} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
      página do projeto no GitHub
    </a>
  );
}

export function PaginaLegal({ icone: Icone, titulo, versao, children }: { icone: LucideIcon; titulo: string; versao: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 py-8">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar
        </button>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-calm shadow-soft">
            <Icone className="h-6 w-6 text-primary-foreground" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{titulo}</h1>
            <p className="text-sm text-muted-foreground">{versao}</p>
          </div>
        </div>
        <article className="space-y-6 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground sm:p-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:space-y-1">
          {children}
        </article>
      </div>
    </main>
  );
}
