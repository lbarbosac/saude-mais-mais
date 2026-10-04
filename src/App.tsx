import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TelaCarregando } from "@/components/ui/loading-spinner";
import { PWAInstallBanner } from "@/components/features/pwa/PWAInstallBanner";
import { AppConquistas } from "@/components/features/conquistas/AppConquistas";
import Dashboard from "@/pages/Dashboard";
import Habits from "@/pages/Habits";
import NotFound from "@/pages/NotFound";
import { rotas } from "@/rotas";

// Início e Hábitos são as telas mais usadas e vão no bundle principal. As
// demais carregam sob demanda e são pré-carregadas em segundo plano (ver
// AppLayout), então a navegação continua instantânea.
const Login = lazy(rotas.login);
const ResetPassword = lazy(rotas.redefinirSenha);
const TermosDeUso = lazy(rotas.termos);
const PoliticaPrivacidade = lazy(rotas.privacidade);
const Sounds = lazy(rotas.sons);
const Treinos = lazy(rotas.treinos);
const Progress = lazy(rotas.progresso);
const Profile = lazy(rotas.perfil);
const Friends = lazy(rotas.amigos);
const FriendProfile = lazy(rotas.amigo);
const Challenges = lazy(rotas.desafios);
const Settings = lazy(rotas.configuracoes);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AuthProvider>
              <PWAInstallBanner />
              <AppConquistas />
              <Suspense fallback={<TelaCarregando />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/redefinir-senha" element={<ResetPassword />} />
                  <Route path="/termos" element={<TermosDeUso />} />
                  <Route path="/privacidade" element={<PoliticaPrivacidade />} />

                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/habitos" element={<Habits />} />
                      <Route path="/sons" element={<Sounds />} />
                      <Route path="/treinos" element={<Treinos />} />
                      <Route path="/progresso" element={<Progress />} />
                      <Route path="/perfil" element={<Profile />} />
                      <Route path="/amigos" element={<Friends />} />
                      <Route path="/amigo/:userId" element={<FriendProfile />} />
                      <Route path="/desafios" element={<Challenges />} />
                      <Route path="/configuracoes" element={<Settings />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
