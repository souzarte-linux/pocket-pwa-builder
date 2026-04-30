import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RequireAuth } from "@/components/RequireAuth";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Painel from "./pages/Painel";
import Apps from "./pages/Apps";
import Historico from "./pages/Historico";
import NovaRota from "./pages/NovaRota";
import TotalDia from "./pages/TotalDia";
import Despesa from "./pages/Despesa";
import Plataforma from "./pages/Plataforma";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/painel" element={<RequireAuth><Painel /></RequireAuth>} />
          <Route path="/apps" element={<RequireAuth><Apps /></RequireAuth>} />
          <Route path="/historico" element={<RequireAuth><Historico /></RequireAuth>} />
          <Route path="/rota/nova" element={<RequireAuth><NovaRota /></RequireAuth>} />
          <Route path="/total-dia" element={<RequireAuth><TotalDia /></RequireAuth>} />
          <Route path="/despesa/:categoria" element={<RequireAuth><Despesa /></RequireAuth>} />
          <Route path="/plataforma/:id" element={<RequireAuth><Plataforma /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
