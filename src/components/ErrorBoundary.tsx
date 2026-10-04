import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { ehErroDeChunk, recarregarSeChunkSumiu } from "@/lib/chunks";

interface Props {
  children: ReactNode;
}

interface State {
  erro: Error | null;
}

/**
 * Última barreira contra tela branca. Erro de chunk (deploy novo) recarrega a
 * página sozinho; qualquer outro mostra uma mensagem com opção de recarregar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error): State {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    if (ehErroDeChunk(erro) && recarregarSeChunkSumiu()) return;
    console.error("[ErrorBoundary]", erro, info.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <main role="alert" className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold text-foreground">Algo saiu do lugar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Encontramos um erro inesperado. Recarregar a página costuma resolver.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary mx-auto mt-5"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Recarregar
          </button>
        </div>
      </main>
    );
  }
}
