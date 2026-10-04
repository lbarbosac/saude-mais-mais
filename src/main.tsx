import { createRoot } from "react-dom/client";
import "@fontsource-variable/plus-jakarta-sans";
import "./index.css";
import App from "./App";
import { configuracaoAusente } from "@/lib/supabase/client";
import { ConfiguracaoAusente } from "@/components/ConfiguracaoAusente";
import { recarregarSeChunkSumiu } from "@/lib/chunks";
import { iniciarTema } from "@/lib/tema";

iniciarTema();

// Depois de um deploy, os arquivos JS antigos deixam de existir. Quem estava
// com o app aberto receberia um erro ao navegar; recarregar resolve.
window.addEventListener("vite:preloadError", (evento) => {
  evento.preventDefault();
  recarregarSeChunkSumiu();
});

createRoot(document.getElementById("root")!).render(configuracaoAusente ? <ConfiguracaoAusente /> : <App />);
