import { useState } from "react";
import { cn } from "@/lib/utils";

/** Foto do perfil com a inicial do nome como alternativa. */
export function Avatar({ url, nome, className }: { url: string | null | undefined; nome: string; className?: string }) {
  const [falhou, setFalhou] = useState(false);
  const inicial = nome.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted font-bold text-muted-foreground", className)}>
      {url && !falhou ? (
        <img src={url} alt="" loading="lazy" onError={() => setFalhou(true)} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{inicial}</span>
      )}
    </span>
  );
}
