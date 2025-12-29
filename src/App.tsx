import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { SidebarProvider } from "@/components/layout/Sidebar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Prompts from "./pages/Prompts";
import Sources from "./pages/Sources";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Alerts from "./pages/Alerts";
import Industry from "./pages/Industry";
import Topic from "./pages/Topic";
import Model from "./pages/Model";
import WarRoom from "./pages/WarRoom";
import Citations from "./pages/Citations";
import GapAnalysis from "./pages/GapAnalysis";
import LLMTraffic from "./pages/LLMTraffic";
import ContentGen from "./pages/ContentGen";
import Competitors from "./pages/Competitors";
import MVP from "./pages/MVP";
import ClientDashboard from "./pages/ClientDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Force dark mode for FORZEO enterprise design
function DarkModeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-body-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-body-sm">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DarkModeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <Routes>
              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/war-room" element={<ProtectedRoute><WarRoom /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><Prompts /></ProtectedRoute>} />
              <Route path="/inbox" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
              <Route path="/industry" element={<ProtectedRoute><Industry /></ProtectedRoute>} />
              <Route path="/topic" element={<ProtectedRoute><Topic /></ProtectedRoute>} />
              <Route path="/model" element={<ProtectedRoute><Model /></ProtectedRoute>} />
              <Route path="/citation" element={<ProtectedRoute><Citations /></ProtectedRoute>} />
              <Route path="/sources" element={<ProtectedRoute><Sources /></ProtectedRoute>} />
              <Route path="/competitors" element={<ProtectedRoute><Competitors /></ProtectedRoute>} />
              <Route path="/gap-analysis" element={<ProtectedRoute><GapAnalysis /></ProtectedRoute>} />
              <Route path="/llm-traffic" element={<ProtectedRoute><LLMTraffic /></ProtectedRoute>} />
              <Route path="/content-gen" element={<ProtectedRoute><ContentGen /></ProtectedRoute>} />
              <Route path="/mvp" element={<ProtectedRoute><MVP /></ProtectedRoute>} />
              <Route path="/clients" element={<ClientDashboard />} />
              <Route path="/improve" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </DarkModeProvider>
  </QueryClientProvider>
);

export default App;
