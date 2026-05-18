import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RequireAuth } from "@/components/RequireAuth";
import Auth from "./pages/Auth";
import CadastroMotorista from "./pages/CadastroMotorista";
import Home from "./pages/Home";
import Painel from "./pages/Painel";
import Relatorios from "./pages/Relatorios";
import Apps from "./pages/Apps";
import Historico from "./pages/Historico";
import NovaRota from "./pages/NovaRota";
import TotalDia from "./pages/TotalDia";
import Despesa from "./pages/Despesa";
import Plataforma from "./pages/Plataforma";
import PerfilMotorista from "./pages/PerfilMotorista";
import MetasFinanceiras from "./pages/MetasFinanceiras";
import CadastroVeiculo from "./pages/CadastroVeiculo";
import Configuracoes from "./pages/Configuracoes";
import TrocasOleo from "./pages/TrocasOleo";
import Faturas from "./pages/Faturas";
import NovaFatura from "./pages/NovaFatura";
import AjusteFinanceiro from "./pages/AjusteFinanceiro";
import NovoPosto from "./pages/NovoPosto";
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
          <Route path="/cadastro" element={<CadastroMotorista />} />
          <Route path="/cadastro-veiculo" element={<RequireAuth><CadastroVeiculo /></RequireAuth>} />
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/painel" element={<RequireAuth><Painel /></RequireAuth>} />
          <Route path="/relatorios" element={<RequireAuth><Relatorios /></RequireAuth>} />
          <Route path="/apps" element={<RequireAuth><Apps /></RequireAuth>} />
          <Route path="/historico" element={<RequireAuth><Historico /></RequireAuth>} />
          <Route path="/rota/nova" element={<RequireAuth><NovaRota /></RequireAuth>} />
          <Route path="/total-dia" element={<RequireAuth><TotalDia /></RequireAuth>} />
          <Route path="/despesa/:categoria" element={<RequireAuth><Despesa /></RequireAuth>} />
          <Route path="/plataforma/:id" element={<RequireAuth><Plataforma /></RequireAuth>} />
          <Route path="/perfil" element={<RequireAuth><PerfilMotorista /></RequireAuth>} />
          <Route path="/metas-financeiras" element={<RequireAuth><MetasFinanceiras /></RequireAuth>} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/trocas-oleo" element={<RequireAuth><TrocasOleo /></RequireAuth>} />
          <Route path="/faturas" element={<RequireAuth><Faturas /></RequireAuth>} />
          <Route path="/fatura/nova" element={<RequireAuth><NovaFatura /></RequireAuth>} />
          <Route path="/ajuste-financeiro" element={<RequireAuth><AjusteFinanceiro /></RequireAuth>} />
          <Route path="/posto/novo" element={<RequireAuth><NovoPosto /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
