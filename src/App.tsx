import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "./components/AppLayout";
import Schedule from "./pages/Schedule";
import Pomodoro from "./pages/Pomodoro";
import EyeCare from "./pages/EyeCare";
import Tasks from "./pages/Tasks";
import Notes from "./pages/Notes";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function Protected() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;
  return <AppLayout />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<Protected />}>
              <Route path="/" element={<Schedule />} />
              <Route path="/pomodoro" element={<Pomodoro />} />
              <Route path="/eye-care" element={<EyeCare />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/notes" element={<Notes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
