import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Lazy loading — o bundle inicial fica menor; cada rota só carrega quando acessada
const LoginPage     = lazy(() => import("@/pages/Login"));
const Dashboard     = lazy(() => import("@/pages/Dashboard"));
const Habits        = lazy(() => import("@/pages/Habits"));
const Sounds        = lazy(() => import("@/pages/Sounds"));
const Treinos       = lazy(() => import("@/pages/Treinos"));
const Progress      = lazy(() => import("@/pages/Progress"));
const Profile       = lazy(() => import("@/pages/Profile"));
const Friends       = lazy(() => import("@/pages/Friends"));
const FriendProfile = lazy(() => import("@/pages/FriendProfile"));
const Challenges    = lazy(() => import("@/pages/Challenges"));
const Settings      = lazy(() => import("@/pages/Settings"));
const NotFound      = lazy(() => import("@/pages/NotFound"));

// QueryClient com configurações sensatas para produção
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos
      retry: 1,
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
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Rota pública */}
                <Route path="/login" element={<LoginPage />} />

                {/* Rotas protegidas — ProtectedRoute usa <Outlet /> internamente */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/"               element={<Dashboard />} />
                    <Route path="/habitos"         element={<Habits />} />
                    <Route path="/sons"            element={<Sounds />} />
                    <Route path="/treinos"         element={<Treinos />} />
                    <Route path="/progresso"       element={<Progress />} />
                    <Route path="/perfil"          element={<Profile />} />
                    <Route path="/amigos"          element={<Friends />} />
                    <Route path="/amigo/:userId"   element={<FriendProfile />} />
                    <Route path="/desafios"        element={<Challenges />} />
                    <Route path="/configuracoes"   element={<Settings />} />
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
