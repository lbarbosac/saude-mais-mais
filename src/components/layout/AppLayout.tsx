import { Outlet } from "react-router-dom";
import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { ChatAssistant } from "@/components/features/chat/ChatAssistant";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingFlow } from "@/components/features/onboarding/OnboardingFlow";
import { CompleteProfileModal } from "@/components/features/onboarding/CompleteProfileModal";

export default function AppLayout() {
  const isMobile = useIsMobile();
  const { needsOnboarding, markComplete } = useOnboarding();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // null = ainda carregando — spinner mínimo evita tela branca
  if (needsOnboarding === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (needsOnboarding === true) {
    return (
      <OnboardingFlow
        onComplete={() => {
          markComplete();
          // Convida o usuário a completar Dados Físicos, Saúde Mental e Objetivos
          // logo após o onboarding básico — antes este modal nunca era exibido
          // porque nada disparava setShowProfileModal(true).
          setShowProfileModal(true);
        }}
      />
    );
  }

  // O modal de "Complete seu perfil" precisa existir em AMBOS os layouts
  // (mobile e desktop) — antes só existia no branch mobile, então usuários
  // em desktop nunca viam o convite mesmo após terminar o onboarding.
  const profileModal = (
    <CompleteProfileModal open={showProfileModal} onClose={() => setShowProfileModal(false)} />
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <main className="mx-auto max-w-2xl px-4 py-6">
          <Outlet />
        </main>
        <BottomNav />
        <ChatAssistant />
        {profileModal}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-12 items-center border-b border-border bg-card/50 backdrop-blur-sm">
            <SidebarTrigger className="ml-2 text-muted-foreground hover:bg-muted hover:text-foreground" />
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-6">
              <Outlet />
            </div>
          </main>
        </div>
        <ChatAssistant />
        {profileModal}
      </div>
    </SidebarProvider>
  );
}
