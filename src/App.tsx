import { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RequireAuth } from "@/components/RequireAuth";
import { RouteLoadingFallback } from "@/components/layout/RouteLoadingFallback";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

// Lazy-loaded routes with retry and stale chunk recovery
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const CadastroMotorista = lazyWithRetry(() => import("./pages/CadastroMotorista"));
const CadastroVeiculo = lazyWithRetry(() => import("./pages/CadastroVeiculo"));
const Home = lazyWithRetry(() => import("./pages/Home"));
const Painel = lazyWithRetry(() => import("./pages/Painel"));
const Relatorios = lazyWithRetry(() => import("./pages/Relatorios"));
const Apps = lazyWithRetry(() => import("./pages/Apps"));
const Historico = lazyWithRetry(() => import("./pages/Historico"));
const NovaRota = lazyWithRetry(() => import("./pages/NovaRota"));
const TotalDia = lazyWithRetry(() => import("./pages/TotalDia"));
const Despesa = lazyWithRetry(() => import("./pages/Despesa"));
const Plataforma = lazyWithRetry(() => import("./pages/Plataforma"));
const PerfilMotorista = lazyWithRetry(() => import("./pages/PerfilMotorista"));
const MetasFinanceiras = lazyWithRetry(() => import("./pages/MetasFinanceiras"));
const Configuracoes = lazyWithRetry(() => import("./pages/Configuracoes"));
const TrocasOleo = lazyWithRetry(() => import("./pages/TrocasOleo"));
const Manutencao = lazyWithRetry(() => import("./pages/Manutencao"));
const VidaUtilPecas = lazyWithRetry(() => import("./pages/VidaUtilPecas"));
const Faturas = lazyWithRetry(() => import("./pages/Faturas"));
const NovaFatura = lazyWithRetry(() => import("./pages/NovaFatura"));
const AjusteFinanceiro = lazyWithRetry(() => import("./pages/AjusteFinanceiro"));
const NovoPosto = lazyWithRetry(() => import("./pages/NovoPosto"));
const Empresas = lazyWithRetry(() => import("./pages/Empresas"));
const Bandeiras = lazyWithRetry(() => import("./pages/Bandeiras"));
const Emissores = lazyWithRetry(() => import("./pages/Emissores"), "Emissores");
const OAuthConsent = lazyWithRetry(() => import("./pages/OAuthConsent"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" position="top-center" />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/auth"
            element={
              <Suspense fallback={<RouteLoadingFallback minimal />}>
                <Auth />
              </Suspense>
            }
          />
          <Route
            path="/cadastro"
            element={
              <Suspense fallback={<RouteLoadingFallback minimal />}>
                <CadastroMotorista />
              </Suspense>
            }
          />
          <Route
            path="/.lovable/oauth/consent"
            element={
              <Suspense fallback={<RouteLoadingFallback minimal />}>
                <OAuthConsent />
              </Suspense>
            }
          />
          <Route
            path="*"
            element={
              <Suspense fallback={<RouteLoadingFallback minimal />}>
                <NotFound />
              </Suspense>
            }
          />

          {/* Protected Routes: Router -> RequireAuth -> Suspense -> Lazy Page */}
          <Route
            path="/cadastro-veiculo"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <CadastroVeiculo />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Home />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/painel"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Painel />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/relatorios"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Relatorios />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/apps"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Apps />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/historico"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Historico />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/rota/nova"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <NovaRota />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/total-dia"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <TotalDia />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/despesa/:categoria"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Despesa />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/plataforma/:id"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Plataforma />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/perfil"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <PerfilMotorista />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/metas-financeiras"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <MetasFinanceiras />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Configuracoes />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/trocas-oleo"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <TrocasOleo />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/manutencao"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Manutencao />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/vida-util-pecas"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <VidaUtilPecas />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/faturas"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Faturas />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/fatura/nova"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <NovaFatura />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/ajuste-financeiro"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <AjusteFinanceiro />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/posto/novo"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <NovoPosto />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/empresas"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Empresas />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/bandeiras"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Bandeiras />
                </Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/emissores"
            element={
              <RequireAuth>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Emissores />
                </Suspense>
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
