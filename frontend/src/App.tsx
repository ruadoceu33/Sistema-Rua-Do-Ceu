import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Aniversarios from "./pages/Aniversarios";
import Criancas from "./pages/Criancas";
import Doacoes from "./pages/Doacoes";
import CheckIn from "./pages/CheckIn";
import Locais from "./pages/Locais";
import Colaboradores from "./pages/Colaboradores";
import Relatorios from "./pages/Relatorios";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import AguardandoAprovacao from "./pages/AguardandoAprovacao";
import ResetarSenha from "./pages/ResetarSenha";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const App = () => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Rotas públicas */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/aguardando-aprovacao" element={<AguardandoAprovacao />} />
              <Route path="/resetar-senha" element={<ResetarSenha />} />

              {/* Rotas protegidas */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/aniversarios" element={<Aniversarios />} />
                <Route path="/criancas" element={<Criancas />} />
                <Route path="/doacoes" element={<Doacoes />} />
                <Route path="/checkin" element={<CheckIn />} />
                <Route path="/locais" element={<ProtectedRoute adminOnly><Locais /></ProtectedRoute>} />
                <Route path="/colaboradores" element={<ProtectedRoute adminOnly><Colaboradores /></ProtectedRoute>} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);

export default App;
