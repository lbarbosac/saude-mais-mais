import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PWAInstallBanner } from "@/components/features/pwa/PWAInstallBanner";
import { AppConquistas } from "@/components/features/conquistas/AppConquistas";

// ── Rotas principais: importação DIRETA (sem lazy) ───────────────────────────
// Lazy loading em rotas navegadas frequentemente causa "throw t._result" no mobile
// quando o usuário navega antes do chunk terminar de carregar.
// Rotas principais ficam no bundle inicial — são pequenas e compensam.
import Dashboard     from "@/pages/Dashboard";
import Habits        from "@/pages/Habits";
import Sounds        from "@/pages/Sounds";
import Treinos       from "@/pages/Treinos";
import Progress      from "@/pages/Progress";
import Profile       from "@/pages/Profile";
import Friends       from "@/pages/Friends";
import FriendProfile from "@/pages/FriendProfile";
import Challenges    from "@/pages/Challenges";
import Settings      from "@/pages/Settings";
import NotFound      from "@/pages/NotFound";

// ── Rotas raramente acessadas: lazy é OK aqui ────────────────────────────────
const LoginPage           = lazy(() => import("@/pages/Login"));
const ResetPassword       = lazy(() => import("@/pages/ResetPassword"));
const TermosDeUso         = lazy(() => import("@/pages/TermosDeUso"));
const PoliticaPrivacidade = lazy(() => import("@/pages/PoliticaPrivacidade"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner size="md" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <PWAInstallBanner />
            <AppConquistas />
            {/* Suspense apenas para as rotas lazy (login/reset/termos) */}
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login"            element={<LoginPage />} />
                <Route path="/redefinir-senha"  element={<ResetPassword />} />
                <Route path="/termos"           element={<TermosDeUso />} />
                <Route path="/privacidade"      element={<PoliticaPrivacidade />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/"              element={<Dashboard />} />
                    <Route path="/habitos"        element={<Habits />} />
                    <Route path="/sons"           element={<Sounds />} />
                    <Route path="/treinos"        element={<Treinos />} />
                    <Route path="/progresso"      element={<Progress />} />
                    <Route path="/perfil"         element={<Profile />} />
                    <Route path="/amigos"         element={<Friends />} />
                    <Route path="/amigo/:userId"  element={<FriendProfile />} />
                    <Route path="/desafios"       element={<Challenges />} />
                    <Route path="/configuracoes"  element={<Settings />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
