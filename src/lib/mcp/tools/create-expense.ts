import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_expense",
  title: "Registrar despesa",
  description:
    "Registra uma nova despesa (combustível, manutenção ou alimentação) para o motorista autenticado.",
  inputSchema: {
    title: z.string().describe("Descrição curta da despesa."),
    amount: z.number().describe("Valor em reais."),
    category: z.enum(["combustivel", "manutencao", "alimentacao"]).describe("Categoria da despesa."),
    occurred_at: z.string().optional().describe("Data/hora ISO. Padrão: agora."),
    liters: z.number().optional().describe("Litros abastecidos (combustível)."),
    is_full_tank: z.boolean().optional().describe("Se o abastecimento completou o tanque."),
    odometer_km: z.number().optional().describe("Hodômetro no momento da despesa."),
    vendor: z.string().optional().describe("Empresa/posto onde a despesa ocorreu."),
    payment_method: z.enum(["dinheiro", "pix", "cartao"]).optional().describe("Forma de pagamento."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: ctx.getUserId(),
        title: input.title,
        amount: input.amount,
        category: input.category,
        occurred_at: input.occurred_at ?? new Date().toISOString(),
        liters: input.liters ?? null,
        is_full_tank: input.is_full_tank ?? false,
        odometer_km: input.odometer_km ?? null,
        vendor: input.vendor ?? null,
        payment_method: input.payment_method ?? null,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { expense: data },
    };
  },
});
