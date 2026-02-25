import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { vendedor, objection_type } = req.body;
  if (!vendedor || !objection_type) return res.status(400).json({ error: "Missing fields" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  const { error } = await supabase
    .from("objection_events")
    .insert({ vendedor, objection_type });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
