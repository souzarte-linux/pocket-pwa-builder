import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPlatformsTool from "./tools/list-platforms";
import listRoutesTool from "./tools/list-routes";
import listExpensesTool from "./tools/list-expenses";
import createExpenseTool from "./tools/create-expense";
import listWorkSessionsTool from "./tools/list-work-sessions";
import earningsSummaryTool from "./tools/earnings-summary";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pocket-pwa-builder",
  title: "Pocket PWA Builder",
  version: "0.1.0",
  instructions:
    "Ferramentas do Driver Hub, app de gestão financeira para motoristas/entregadores. Use `earnings_summary` para receita, despesas, lucro, KM e horas em um período; `list_routes`, `list_expenses` e `list_work_sessions` para registros detalhados; `list_platforms` para as plataformas cadastradas; `create_expense` para registrar uma nova despesa. Valores em reais (BRL), datas em ISO.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    earningsSummaryTool,
    listRoutesTool,
    listExpensesTool,
    createExpenseTool,
    listWorkSessionsTool,
    listPlatformsTool,
  ],
});
