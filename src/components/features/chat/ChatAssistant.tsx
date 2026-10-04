import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import amigoLucas from "@/assets/amigo-lucas.webp";

const ChatPainel = lazy(() => import("./ChatPainel"));

/** Botão flutuante do Amigo Lucas. O painel só é baixado no primeiro clique. */
export function ChatAssistant() {
  const isMobile = useIsMobile();
  const [aberto, setAberto] = useState(false);
  const [jaAbriu, setJaAbriu] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);

  const fechar = useCallback(() => {
    setAberto(false);
    requestAnimationFrame(() => botaoRef.current?.focus());
  }, []);

  return (
    <>
      {!aberto && (
        <motion.button
          ref={botaoRef}
          type="button"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            setJaAbriu(true);
            setAberto(true);
          }}
          aria-label="Conversar com o Lucas"
          className={[
            "fixed z-40 h-14 w-14 overflow-hidden rounded-full bg-card shadow-elevated ring-2 ring-background",
            isMobile ? "bottom-24 right-4" : "bottom-6 right-6",
          ].join(" ")}
        >
          <img src={amigoLucas} alt="" width={56} height={56} className="h-full w-full object-cover" />
        </motion.button>
      )}
      {jaAbriu && (
        <Suspense fallback={null}>
          <ChatPainel aberto={aberto} onFechar={fechar} />
        </Suspense>
      )}
    </>
  );
}
