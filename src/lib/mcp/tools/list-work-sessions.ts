import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_work_sessions",
  title: "Listar horas trabalhadas",
  description:
    "Lista as sessões de trabalho (horas trabalhadas) do motorista autenticado em um intervalo de datas.",
  inputSchema: {
    since: z.string().optional().describe("Data inicial ISO. Padrão: últimos 30 dias."),
    until: z.string().optional().describe("Data final ISO."),
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
      .from("work_sessions")
      .select("id, started_at, ended_at, break_minutes, start_km, end_km, platform_id, product_type, notes")
      .gte("started_at", start)
      .order("started_at", { ascending: false })
      .limit(max);
    if (until) query = query.lte("started_at", until);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const sessions = (data ?? []).map((s) => {
      const minutes =
        s.ended_at
          ? Math.max(
              0,
              (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000 -
                (s.break_minutes ?? 0),
            )
          : null;
      return { ...s, worked_hours: minutes === null ? null : Number((minutes / 60).toFixed(2)) };
    });

    return {
      content: [{ type: "text", text: JSON.stringify(sessions) }],
      structuredContent: { work_sessions: sessions },
    };
  },
});
