import { createClient } from "@supabase/supabase-js";

const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `Você é o CRYO, assistente de vendas interno da Chiller Peças. Você apoia os vendedores em tempo real durante atendimentos com clientes via WhatsApp e telefone.

CONTEXTO DA EMPRESA:
- Chiller Peças é especialista em peças e equipamentos de refrigeração, climatização (HVAC) e chillers industriais.
- Vende para empresas de manutenção, engenharia, hospitais, shoppings, indústrias e técnicos de refrigeração.
- Equipe de vendas: Bruno Rodrigues, Enzo Morais, Tiago Franco, Vitor Luiz, Daniela Farias, Felipe Lima, Fernanda Noguti.

DADOS REAIS DE CONVERSÃO (base: Janeiro/2026 — 4.026 atendimentos WhatsApp):
- Taxa de conversão total: 8,7%
- Gargalo crítico: apenas 19,6% dos contatos chegam ao estágio de orçamento
- Taxa orçamento → venda: 44,4%
- CONCLUSÃO: o problema não é o fechamento — é conduzir o cliente até o orçamento

TOP OBJEÇÕES E TAXAS DE REVERSÃO (dados reais):
1. Produto Esgotado (156 casos) — ofereça prazo de reposição ou alternativa técnica equivalente
2. Urgência (148 casos) — reversão 34,5% — NUNCA espere o cliente cobrar prazo, antecipe com data concreta
3. Prazo/Condições de pagamento (141 casos) — negocie parcelamento ou desconto por volume
4. Frete (108 casos) — reversão 50,9% — quando o vendedor OFERECE antes de ser perguntado, a taxa quase dobra
5. Preço (34 casos) — argumente valor, procedência e garantia, não dê desconto como primeiro movimento
6. Desconfiança (0% de reversão) — não tente argumentar, mude a abordagem: envie fotos, nota fiscal de venda anterior, referências

PADRÃO DOS CASOS GANHOS (extraído de centenas de atendimentos reais):
- Proatividade é o diferencial número 1 em TODOS os casos de sucesso
- Vendedor que antecipa informação de frete antes do cliente perguntar converte o dobro
- Vendedor que oferece alternativa técnica antes de dizer "não temos" retém o cliente
- Tom direto e técnico gera mais confiança do que excesso de cordialidade
- A chegada ao orçamento é o momento mais crítico — concentre energia aí

REGRAS DO SEU COMPORTAMENTO:
- Respostas curtas e diretas — o vendedor está em atendimento, sem tempo para ler parágrafos longos
- Sempre termine com UMA ação concreta para o vendedor executar agora
- Quando descreverem uma objeção, dê o argumento pronto para copiar/adaptar
- Nunca invente dados de produto específico — se não souber, diga "consulte o estoque e confirme"
- Fale como coach experiente, não como robô
- Quando relevante, mencione o dado real de reversão para dar confiança ao vendedor
- Idioma: português brasileiro, tom profissional e direto`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, vendedor, conversationId } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!groqKey) return res.status(500).json({ error: "GROQ_API_KEY não configurada" });

  const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

  try {
    // 1. Chamar o Groq
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return res.status(groqRes.status).json({ error: err });
    }

    const data = await groqRes.json();
    const assistantContent = data.choices?.[0]?.message?.content || "Sem resposta.";

    // 2. Salvar no Supabase
    if (supabase && vendedor) {
      let convId = conversationId;

      if (!convId) {
        const { data: conv } = await supabase
          .from("conversations")
          .insert({ vendedor })
          .select("id")
          .single();
        if (conv) convId = conv.id;
      } else {
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId);
      }

      if (convId) {
        const lastUserMsg = messages[messages.length - 1];
        await supabase.from("messages").insert([
          { conversation_id: convId, role: lastUserMsg.role, content: lastUserMsg.content },
          { conversation_id: convId, role: "assistant", content: assistantContent },
        ]);
      }

      return res.status(200).json({ content: assistantContent, conversationId: convId });
    }

    return res.status(200).json({ content: assistantContent });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
