import { AlertCircle, RefreshCw } from "lucide-react";

/** Estado de erro de uma tela ou seção, com opção de tentar de novo. */
export function ErroCarregamento({ mensagem, onTentar }: { mensagem: string; onTentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
      <AlertCircle className="h-7 w-7 text-destructive" aria-hidden />
      <p className="text-sm font-medium text-foreground">{mensagem}</p>
      {onTentar && (
        <button type="button" onClick={onTentar} className="btn-secondary">
          <RefreshCw className="h-4 w-4" aria-hidden />
          Tentar de novo
        </button>
      )}
    </div>
  );
}
