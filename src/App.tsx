import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Habits from "./pages/Habits";
import Sounds from "./pages/Sounds";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import FriendProfile from "./pages/FriendProfile";
import Friends from "./pages/Friends";
import Challenges from "./pages/Challenges";
import Settings from "./pages/Settings";
import Treinos from "./pages/Treinos";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
});

const AuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/habitos" element={<Habits />} />
              <Route path="/sons" element={<Sounds />} />
              <Route path="/treinos" element={<Treinos />} />
              <Route path="/progresso" element={<Progress />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/amigos" element={<Friends />} />
              <Route path="/amigos/:friendId" element={<FriendProfile />} />
              <Route path="/desafios" element={<Challenges />} />
              <Route path="/configuracoes" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
