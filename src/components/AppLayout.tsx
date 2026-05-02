import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import ChatAssistant from "./ChatAssistant";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const AppLayout = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <main className="mx-auto max-w-5xl px-4 py-6">
          <Outlet />
        </main>
        <BottomNav />
        <ChatAssistant />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
            <SidebarTrigger className="ml-2" />
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-5xl px-6 py-6">
              <Outlet />
            </div>
          </main>
        </div>
        <ChatAssistant />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
