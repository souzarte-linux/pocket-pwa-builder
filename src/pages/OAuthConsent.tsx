import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck } from "lucide-react";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Requisição inválida: authorization_id ausente.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error: err } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (err) {
        setError(err.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não retornou um redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "o aplicativo";

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-5">
      <div className="w-full max-w-md rounded-2xl border-2 border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-7 text-primary" />
          <h1 className="text-xl font-black uppercase tracking-tight">Autorizar acesso</h1>
        </div>

        {error ? (
          <p className="text-sm text-destructive">Não foi possível carregar esta autorização: {error}</p>
        ) : !details ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-bold text-foreground">{clientName}</span> quer se conectar à sua conta do Driver
              Hub e acessar seus dados (rotas, despesas, horas e resumos) agindo como você.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => decide(true)}
                className="h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase text-sm disabled:opacity-60"
              >
                {busy ? "Processando…" : "Aprovar"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => decide(false)}
                className="h-12 rounded-xl bg-muted text-muted-foreground font-bold uppercase text-sm disabled:opacity-60"
              >
                Negar
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
