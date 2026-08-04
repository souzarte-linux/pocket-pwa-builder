import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_routes",
  title: "Listar rotas",
  description:
    "Lista as rotas/corridas do motorista autenticado em um intervalo de datas, com valor, distância e pacotes.",
  inputSchema: {
    since: z.string().optional().describe("Data inicial ISO (ex.: 2026-08-01). Padrão: últimos 30 dias."),
    until: z.string().optional().describe("Data final ISO (ex.: 2026-08-31)."),
    limit: z.number().int().optional().describe("Máximo de registros (padrão 50, teto 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ since, until, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const start = since ?? new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const max = Math.min(Math.max(limit ?? 50, 1), 200);
    let query = supabase
      .from("routes")
      .select(
        "id, occurred_at, amount, tip, distance_km, package_count, product_type, origin, destination, platform_id, started_at, ended_at, break_minutes",
      )
      .gte("occurred_at", start)
      .order("occurred_at", { ascending: false })
      .limit(max);
    if (until) query = query.lte("occurred_at", until);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { routes: data ?? [] },
    };
  },
});
