import { Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  gerando: boolean;
  onConfirmar: () => void;
  onFechar: () => void;
}

export function RenovarHabitosModal({ open, gerando, onConfirmar, onFechar }: Props) {
  return (
    <Dialog open={open} onOpenChange={(aberto) => !aberto && !gerando && onFechar()}>
      <DialogContent
        onEscapeKeyDown={(e) => gerando && e.preventDefault()}
        onPointerDownOutside={(e) => gerando && e.preventDefault()}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-hero shadow-soft">
          <Sparkles className="h-7 w-7 text-primary-foreground" aria-hidden />
        </div>
        <DialogTitle>Renovar hábitos com IA</DialogTitle>
        <DialogDescription className="leading-relaxed">
          O Lucas vai montar uma lista nova de hábitos a partir do seu perfil. A lista atual sai, mas o que você já
          concluiu continua no seu histórico e no progresso de hoje.
        </DialogDescription>
        <div className="flex flex-col gap-2 pt-1">
          <button type="button" onClick={onConfirmar} disabled={gerando} className="btn-primary w-full">
            {gerando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Gerando sua nova lista…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden />
                Renovar meus hábitos
              </>
            )}
          </button>
          <button type="button" onClick={onFechar} disabled={gerando} className="btn-secondary w-full">
            Cancelar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
