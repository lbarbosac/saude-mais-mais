import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

const BackButton = ({ to, label = "Voltar", className = "" }: BackButtonProps) => {
  const navigate = useNavigate();
  const handle = () => (to ? navigate(to) : navigate(-1));
  return (
    <button
      onClick={handle}
      className={`group inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground ${className}`}
    >
      <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </button>
  );
};

export default BackButton;
