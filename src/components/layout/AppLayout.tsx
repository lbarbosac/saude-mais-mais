import { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TelaCarregando } from "@/components/ui/loading-spinner";
import { ChatAssistant } from "@/components/features/chat/ChatAssistant";
import { OnboardingFlow } from "@/components/features/onboarding/OnboardingFlow";
import { CompleteProfileModal } from "@/components/features/onboarding/CompleteProfileModal";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOnboarding } from "@/hooks/useOnboarding";
import { usePresenca } from "@/hooks/usePresenca";
import { preCarregarTelas } from "@/rotas";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";

function Conteudo() {
  // Suspense aqui dentro mantém a navegação na tela enquanto uma rota carrega.
  return (
    <Suspense fallback={<TelaCarregando cheia={false} />}>
      <Outlet />
    </Suspense>
  );
}

export default function AppLayout() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { needsOnboarding, isError, retry, markComplete } = useOnboarding();
  const [convitePerfil, setConvitePerfil] = useState(false);

  usePresenca(user?.id);

  useEffect(() => {
    if (needsOnboarding === false) preCarregarTelas();
  }, [needsOnboarding]);

  if (isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <p className="font-semibold text-foreground">Não foi possível carregar seu perfil.</p>
          <p className="mt-1 text-sm text-muted-foreground">Verifique sua conexão.</p>
          <button type="button" onClick={() => retry()} className="btn-primary mx-auto mt-4">
            Tentar de novo
          </button>
        </div>
      </main>
    );
  }

  if (needsOnboarding === null) return <TelaCarregando />;

  if (needsOnboarding) {
    return (
      <OnboardingFlow
        onComplete={() => {
          markComplete();
          setConvitePerfil(true);
        }}
      />
    );
  }

  const modais = (
    <>
      <ChatAssistant />
      <CompleteProfileModal open={convitePerfil} onClose={() => setConvitePerfil(false)} />
    </>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <main id="conteudo" className="mx-auto max-w-2xl px-4 py-6">
          <Conteudo />
        </main>
        <BottomNav />
        {modais}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-12 items-center border-b border-border bg-card/80 backdrop-blur-sm">
            <SidebarTrigger
              aria-label="Recolher ou expandir o menu"
              className="ml-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            />
          </header>
          <main id="conteudo" className="flex-1">
            <div className="mx-auto max-w-3xl px-6 py-6">
              <Conteudo />
            </div>
          </main>
        </div>
        {modais}
      </div>
    </SidebarProvider>
  );
}
