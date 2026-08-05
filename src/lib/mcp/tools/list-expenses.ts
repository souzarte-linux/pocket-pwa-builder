import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_expenses",
  title: "Listar despesas",
  description:
    "Lista as despesas do motorista autenticado (combustível, manutenção, alimentação) em um intervalo de datas.",
  inputSchema: {
    category: z
      .enum(["combustivel", "manutencao", "alimentacao"])
      .optional()
      .describe("Filtra por categoria de despesa."),
    since: z.string().optional().describe("Data inicial ISO. Padrão: últimos 30 dias."),
    until: z.string().optional().describe("Data final ISO."),
    limit: z.number().int().optional().describe("Máximo de registros (padrão 50, teto 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, since, until, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const start = since ?? new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const max = Math.min(Math.max(limit ?? 50, 1), 200);
    let query = supabase
      .from("expenses")
      .select(
        "id, occurred_at, title, category, amount, liters, price_per_liter, is_full_tank, odometer_km, vendor, payment_method, installment_number, installment_total",
      )
      .gte("occurred_at", start)
      .order("occurred_at", { ascending: false })
      .limit(max);
    if (category) query = query.eq("category", category);
    if (until) query = query.lte("occurred_at", until);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { expenses: data ?? [] },
    };
  },
});
