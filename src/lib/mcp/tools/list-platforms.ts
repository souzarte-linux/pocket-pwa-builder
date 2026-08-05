import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_platforms",
  title: "Listar plataformas",
  description: "Lista as plataformas de entrega cadastradas pelo motorista autenticado.",
  inputSchema: {
    only_active: z.boolean().optional().describe("Se verdadeiro, retorna apenas plataformas ativas."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ only_active }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("platforms")
      .select("id, name, segment, payment_model, cycle, active")
      .order("name");
    if (only_active) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { platforms: data ?? [] },
    };
  },
});
