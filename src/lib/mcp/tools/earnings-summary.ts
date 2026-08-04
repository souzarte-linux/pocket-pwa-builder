import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "earnings_summary",
  title: "Resumo financeiro",
  description:
    "Resumo de receita, despesas, lucro, KM rodados e horas trabalhadas do motorista autenticado em um período.",
  inputSchema: {
    since: z.string().optional().describe("Data inicial ISO. Padrão: últimos 30 dias."),
    until: z.string().optional().describe("Data final ISO. Padrão: hoje."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ since, until }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const start = since ?? new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const end = until ?? new Date().toISOString().slice(0, 10);
    const endBound = `${end}T23:59:59.999Z`;

    const [routes, dailies, expenses, sessions] = await Promise.all([
      supabase.from("routes").select("amount, tip, distance_km").gte("occurred_at", start).lte("occurred_at", endBound),
      supabase.from("daily_totals").select("amount, distance_km").gte("occurred_at", start).lte("occurred_at", endBound),
      supabase.from("expenses").select("amount, category").gte("occurred_at", start).lte("occurred_at", endBound),
      supabase
        .from("work_sessions")
        .select("started_at, ended_at, break_minutes")
        .gte("started_at", start)
        .lte("started_at", endBound),
    ]);

    const firstError = routes.error ?? dailies.error ?? expenses.error ?? sessions.error;
    if (firstError) return { content: [{ type: "text", text: firstError.message }], isError: true };

    const revenue =
      (routes.data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0) + Number(r.tip ?? 0), 0) +
      (dailies.data ?? []).reduce((sum, d) => sum + Number(d.amount ?? 0), 0);
    const distance_km =
      (routes.data ?? []).reduce((sum, r) => sum + Number(r.distance_km ?? 0), 0) +
      (dailies.data ?? []).reduce((sum, d) => sum + Number(d.distance_km ?? 0), 0);
    const byCategory: Record<string, number> = {};
    let expenseTotal = 0;
    for (const e of expenses.data ?? []) {
      const amount = Number(e.amount ?? 0);
      expenseTotal += amount;
      byCategory[e.category] = (byCategory[e.category] ?? 0) + amount;
    }
    const hours = (sessions.data ?? []).reduce((sum, s) => {
      if (!s.ended_at) return sum;
      const minutes =
        (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000 - (s.break_minutes ?? 0);
      return sum + Math.max(0, minutes) / 60;
    }, 0);

    const round = (n: number) => Number(n.toFixed(2));
    const summary = {
      period: { since: start, until: end },
      revenue: round(revenue),
      expenses: round(expenseTotal),
      expenses_by_category: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, round(v)])),
      profit: round(revenue - expenseTotal),
      distance_km: round(distance_km),
      worked_hours: round(hours),
      revenue_per_km: distance_km > 0 ? round(revenue / distance_km) : null,
      revenue_per_hour: hours > 0 ? round(revenue / hours) : null,
      routes_count: (routes.data ?? []).length,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(summary) }],
      structuredContent: summary,
    };
  },
});
