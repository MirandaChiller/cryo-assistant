import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  // Ranking de objeções totais
  const { data: objections } = await supabase
    .from("objection_events")
    .select("objection_type")
    .order("created_at", { ascending: false });

  // Contagem por tipo
  const counts = {};
  (objections || []).forEach(({ objection_type }) => {
    counts[objection_type] = (counts[objection_type] || 0) + 1;
  });

  const ranking = Object.entries(counts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Contagem por vendedor
  const { data: byVendedor } = await supabase
    .from("objection_events")
    .select("vendedor");

  const vendedorCounts = {};
  (byVendedor || []).forEach(({ vendedor }) => {
    vendedorCounts[vendedor] = (vendedorCounts[vendedor] || 0) + 1;
  });

  const vendedorRanking = Object.entries(vendedorCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Total de conversas por vendedor
  const { data: convs } = await supabase
    .from("conversations")
    .select("vendedor");

  const convCounts = {};
  (convs || []).forEach(({ vendedor }) => {
    convCounts[vendedor] = (convCounts[vendedor] || 0) + 1;
  });

  return res.status(200).json({
    objectionRanking: ranking,
    vendedorActivity: vendedorRanking,
    conversationsByVendedor: convCounts,
    totalConversations: convs?.length || 0,
    totalObjectionEvents: objections?.length || 0,
  });
}
