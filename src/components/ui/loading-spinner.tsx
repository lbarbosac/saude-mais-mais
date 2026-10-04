import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
};

interface LoadingSpinnerProps {
  size?: Size;
  className?: string;
  label?: string;
}

export function LoadingSpinner({ size = "md", className, label = "Carregando" }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("animate-spin rounded-full border-primary border-t-transparent", sizeClasses[size], className)}
    />
  );
}

/** Spinner centralizado para telas inteiras ou áreas de conteúdo. */
export function TelaCarregando({ cheia = true }: { cheia?: boolean }) {
  return (
    <div className={cn("flex items-center justify-center", cheia ? "min-h-screen bg-background" : "min-h-[60vh]")}>
      <LoadingSpinner size="md" />
    </div>
  );
}
