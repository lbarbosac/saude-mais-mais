import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { ChatAssistant } from "@/components/features/chat/ChatAssistant";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AppLayout() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <main className="mx-auto max-w-2xl px-4 py-6">
          <Outlet />
        </main>
        <BottomNav />
        <ChatAssistant />
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
      </div>
    </SidebarProvider>
  );
}
