import { useState, useRef, useEffect, useCallback } from "react";

const VENDEDORES = [
  "Bruno Rodrigues","Enzo Morais","Tiago Franco",
  "Vitor Luiz","Daniela Farias","Felipe Lima","Fernanda Noguti",
];

const OBJECTION_SHORTCUTS = [
  { label: "Produto Esgotado", icon: "📦", prompt: "O cliente quer um produto que está esgotado. O que faço agora?" },
  { label: "Tá caro", icon: "💰", prompt: "O cliente disse que tá caro e achou mais barato no concorrente. Como respondo?" },
  { label: "Urgência / Prazo", icon: "⏱️", prompt: "O cliente precisa com urgência e está preocupado com o prazo. Como agio?" },
  { label: "Frete alto", icon: "🚚", prompt: "O cliente reclamou do valor do frete. Como reverter?" },
  { label: "Não trabalhamos", icon: "🔧", prompt: "O cliente pediu produto que não temos. O que digo para não perdê-lo?" },
  { label: "Cliente sumiu", icon: "👻", prompt: "Enviei o orçamento e o cliente parou de responder. Como reativo?" },
  { label: "Desconfiança", icon: "🤔", prompt: "O cliente parece desconfiado da empresa. Como ganho a confiança dele?" },
  { label: "Condições pgto", icon: "💳", prompt: "O cliente quer melhores condições de pagamento. Como negocio?" },
];

const STATIC_STATS = [
  { label: "Conversão geral", value: "8,7%", sub: "Jan/26 · 4.026 atend." },
  { label: "Chegam ao ORC", value: "19,6%", sub: "Principal gargalo" },
  { label: "ORC → Venda", value: "44,4%", sub: "Após receber proposta" },
  { label: "Reversão Frete", value: "50,9%", sub: "Se você oferece antes" },
  { label: "Reversão Urgência", value: "34,5%", sub: "Com alternativa concreta" },
  { label: "Reversão Desconf.", value: "0%", sub: "Mude toda a abordagem" },
];

function VendedorSelect({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={s.loginRoot}>
      <div style={s.loginBox}>
        <span style={s.loginSnowflake}>❄</span>
        <div style={s.loginTitle}>CRYO</div>
        <div style={s.loginSub}>Assistente de Vendas · Chiller Peças</div>
        <div style={s.loginPrompt}>Quem está atendendo agora?</div>
        <div style={s.vendedorGrid}>
          {VENDEDORES.map((v) => (
            <button
              key={v}
              style={{ ...s.vendedorBtn, ...(hovered === v ? s.vendedorBtnHover : {}) }}
              onClick={() => onSelect(v)}
              onMouseEnter={() => setHovered(v)}
              onMouseLeave={() => setHovered(null)}
            >
              <span style={s.vendedorInitial}>{v.charAt(0)}</span>
              <span style={s.vendedorName}>{v.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [vendedor, setVendedor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversationId, setConversationId] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (vendedor) {
      const first = vendedor.split(" ")[0];
      setMessages([{
        role: "assistant",
        content: `Fala, ${first}! Sou o CRYO, seu assistente em tempo real.\n\nUse os atalhos de objeção ou me descreva a situação do atendimento.`,
      }]);
    }
  }, [vendedor]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) setAnalytics(await res.json());
    } catch (_) {}
    setAnalyticsLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "analytics") loadAnalytics();
  }, [activeTab, loadAnalytics]);

  const trackObjection = async (type) => {
    if (!vendedor) return;
    try {
      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendedor, objection_type: type }),
      });
    } catch (_) {}
  };

  const sendMessage = async (content) => {
    if (!content.trim() || loading) return;
    const userMsg = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          vendedor,
          conversationId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Erro: ${err.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleShortcut = (item) => {
    trackObjection(item.label);
    sendMessage(item.prompt);
    setActiveTab("chat");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const clearChat = () => {
    const first = vendedor?.split(" ")[0] || "vendedor";
    setMessages([{ role: "assistant", content: `Novo atendimento, ${first}. Me descreva a situação.` }]);
    setConversationId(null);
    setActiveTab("chat");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (!vendedor) return <VendedorSelect onSelect={setVendedor} />;

  return (
    <div style={s.root}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button style={s.menuBtn} onClick={() => setSidebarOpen((v) => !v)}>☰</button>
          <div style={s.logoWrap}>
            <span style={s.logoSnowflake}>❄</span>
            <div>
              <div style={s.logoName}>CRYO</div>
              <div style={s.logoTagline}>Assistente de Vendas · Chiller Peças</div>
            </div>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={s.vendedorTag}>
            <span style={s.vtInitial}>{vendedor.charAt(0)}</span>
            <span style={s.vtName}>{vendedor.split(" ")[0]}</span>
          </div>
          <button style={s.switchBtn} onClick={() => { setVendedor(null); setConversationId(null); }} title="Trocar">⇄</button>
          <span style={s.onlineDot} />
          <span style={s.onlineLabel}>Groq · Online</span>
        </div>
      </header>

      <div style={s.body}>
        {sidebarOpen && (
          <aside style={s.sidebar}>
            <div style={s.sideSection}>
              <div style={s.sideTitle}>ATALHOS DE OBJEÇÃO</div>
              <div style={s.shortcuts}>
                {OBJECTION_SHORTCUTS.map((item) => (
                  <button key={item.label} style={s.shortcutBtn} onClick={() => handleShortcut(item)} disabled={loading}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0ea5c8"; e.currentTarget.style.background = "#0d2236"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#132b3d"; e.currentTarget.style.background = "#0a1d2a"; }}>
                    <span style={s.shortcutEmoji}>{item.icon}</span>
                    <span style={s.shortcutText}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={s.sideSection}>
              <div style={s.sideTitle}>FOCO DO FUNIL</div>
              <div style={s.funnelCard}>
                <div style={s.funnelText}>
                  Apenas <strong style={{ color: "#0ea5c8" }}>19,6%</strong> chegam ao orçamento. Conduza até lá — o fechamento vem sozinho em 44% dos casos.
                </div>
              </div>
            </div>
          </aside>
        )}

        <main style={s.main}>
          <div style={s.tabBar}>
            {[["chat","Assistente"],["dados","Funil"],["analytics","Analytics"]].map(([key, label]) => (
              <button key={key} style={{ ...s.tab, ...(activeTab === key ? s.tabOn : {}) }} onClick={() => setActiveTab(key)}>{label}</button>
            ))}
            <button style={s.newBtn} onClick={clearChat}>+ Novo atendimento</button>
          </div>

          {activeTab === "chat" && (
            <>
              <div style={s.messages}>
                {messages.map((m, i) => (
                  <div key={i} style={{ ...s.msgRow, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    {m.role === "assistant" && <div style={s.avatar}>❄</div>}
                    <div style={{ ...s.bubble, ...(m.role === "user" ? s.bubbleUser : s.bubbleBot) }}>
                      {m.content.split("\n").map((line, j, arr) => (
                        <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ ...s.msgRow, justifyContent: "flex-start" }}>
                    <div style={s.avatar}>❄</div>
                    <div style={{ ...s.bubble, ...s.bubbleBot }}>
                      <span style={s.typingText}>analisando</span>
                      <span style={s.typingDots}>···</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div style={s.inputRow}>
                <textarea ref={inputRef} style={s.textarea} value={input}
                  onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
                  placeholder="Descreva a situação do atendimento... (Enter para enviar)" rows={2} disabled={loading} />
                <button style={{ ...s.sendBtn, opacity: loading || !input.trim() ? 0.4 : 1 }}
                  onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>➤</button>
              </div>
            </>
          )}

          {activeTab === "dados" && (
            <div style={s.scrollView}>
              <div style={s.sectionLabel}>DADOS REAIS DO FUNIL — JANEIRO 2026</div>
              <div style={s.statsGrid}>
                {STATIC_STATS.map((stat) => (
                  <div key={stat.label} style={s.statCard}>
                    <div style={s.statValue}>{stat.value}</div>
                    <div style={s.statLabel}>{stat.label}</div>
                    <div style={s.statSub}>{stat.sub}</div>
                  </div>
                ))}
              </div>
              <div style={s.insightBox}>
                <div style={s.sectionLabel}>INSIGHTS</div>
                {[
                  "Frete tem 50,9% de reversão — mas só quando o vendedor oferece ANTES do cliente reclamar.",
                  "Urgência reverte em 34,5% — padrão: vendedor antecipa com prazo ou alternativa concreta.",
                  "Desconfiança: 0% de reversão. Não argumente — mude completamente a abordagem.",
                  "O gargalo está no início: apenas 19,6% chegam ao orçamento. Foque em conduzir até lá.",
                ].map((text, i) => (
                  <div key={i} style={s.insightRow}><span style={s.bullet}>▸</span><span>{text}</span></div>
                ))}
              </div>
              <div style={s.insightBox}>
                <div style={s.sectionLabel}>FUNIL VISUAL</div>
                {[
                  { label: "Entram em contato", pct: 100, color: "#1e4060" },
                  { label: "Chegam ao orçamento", pct: 19.6, color: "#0e6080" },
                  { label: "Fecham a venda", pct: 8.7, color: "#0ea5c8" },
                ].map((step) => (
                  <div key={step.label} style={s.funnelStep}>
                    <div style={s.funnelStepLabel}>{step.label}</div>
                    <div style={s.funnelBarWrap}>
                      <div style={{ ...s.funnelBar, width: `${step.pct}%`, background: step.color }} />
                    </div>
                    <div style={s.funnelStepPct}>{step.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div style={s.scrollView}>
              <div style={s.sectionLabel}>ANALYTICS EM TEMPO REAL — SUPABASE</div>
              {analyticsLoading && <div style={s.emptyMsg}>Carregando dados...</div>}
              {!analyticsLoading && !analytics && <div style={s.emptyMsg}>Erro ao conectar com o banco. Verifique as variáveis de ambiente.</div>}
              {!analyticsLoading && analytics && (
                <>
                  <div style={s.statsGrid}>
                    {[
                      { label: "Conversas salvas", value: analytics.totalConversations },
                      { label: "Consultas de objeção", value: analytics.totalObjectionEvents },
                      { label: "Vendedores ativos", value: Object.keys(analytics.conversationsByVendedor || {}).length },
                    ].map((c) => (
                      <div key={c.label} style={s.statCard}>
                        <div style={s.statValue}>{c.value}</div>
                        <div style={s.statLabel}>{c.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={s.insightBox}>
                    <div style={s.sectionLabel}>OBJEÇÕES MAIS CONSULTADAS</div>
                    {!analytics.objectionRanking?.length && <div style={s.emptyMsg}>Use os atalhos durante atendimentos para gerar dados aqui.</div>}
                    {analytics.objectionRanking?.map((item) => {
                      const max = analytics.objectionRanking[0]?.count || 1;
                      const pct = Math.round((item.count / max) * 100);
                      return (
                        <div key={item.type} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: "#c8dde8" }}>{item.type}</span>
                            <span style={{ fontSize: 12, color: "#0ea5c8", fontWeight: 700 }}>{item.count}x</span>
                          </div>
                          <div style={{ background: "#061320", borderRadius: 3, height: 6, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "#0ea5c8", borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={s.insightBox}>
                    <div style={s.sectionLabel}>ATIVIDADE POR VENDEDOR</div>
                    {!analytics.vendedorActivity?.length && <div style={s.emptyMsg}>Sem dados ainda.</div>}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                      {analytics.vendedorActivity?.map((v) => (
                        <div key={v.name} style={{ ...s.statCard, textAlign: "left", padding: "10px 14px" }}>
                          <div style={{ fontSize: 13, color: "#c8dde8", fontWeight: 600 }}>{v.name.split(" ")[0]}</div>
                          <div style={{ fontSize: 11, color: "#3a6070", marginTop: 3 }}>{v.count} consultas de objeção</div>
                          <div style={{ fontSize: 11, color: "#3a6070" }}>{analytics.conversationsByVendedor?.[v.name] || 0} conversas</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const s = {
  root: { fontFamily:"'IBM Plex Mono','Courier New',monospace", background:"#050d14", color:"#c8dde8", height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden" },
  loginRoot: { fontFamily:"'IBM Plex Mono','Courier New',monospace", background:"#050d14", height:"100vh", display:"flex", alignItems:"center", justifyContent:"center" },
  loginBox: { background:"#060f18", border:"1px solid #0e2535", borderRadius:12, padding:"40px 36px", textAlign:"center", width:380 },
  loginSnowflake: { fontSize:40, color:"#0ea5c8", display:"block", marginBottom:8 },
  loginTitle: { fontSize:26, fontWeight:700, color:"#0ea5c8", letterSpacing:6 },
  loginSub: { fontSize:10, color:"#3a6070", letterSpacing:2, marginTop:4, marginBottom:28 },
  loginPrompt: { fontSize:12, color:"#7aaabb", marginBottom:16, letterSpacing:1 },
  vendedorGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 },
  vendedorBtn: { display:"flex", alignItems:"center", gap:10, background:"#0a1d2a", border:"1px solid #132b3d", borderRadius:7, padding:"10px 14px", cursor:"pointer", color:"#c8dde8", fontFamily:"inherit", fontSize:13, transition:"all 0.12s", width:"100%" },
  vendedorBtnHover: { background:"#0d2236", borderColor:"#0ea5c8" },
  vendedorInitial: { width:28, height:28, background:"#0ea5c8", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#050d14", fontWeight:700, fontSize:13, flexShrink:0 },
  vendedorName: { fontSize:12 },
  header: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 20px", borderBottom:"1px solid #0e2535", background:"#060f18", flexShrink:0 },
  headerLeft: { display:"flex", alignItems:"center", gap:12 },
  menuBtn: { background:"none", border:"1px solid #1e3a4a", color:"#4a7a90", fontSize:16, width:32, height:32, borderRadius:4, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" },
  logoWrap: { display:"flex", alignItems:"center", gap:10 },
  logoSnowflake: { fontSize:24, color:"#0ea5c8" },
  logoName: { fontSize:17, fontWeight:700, color:"#0ea5c8", letterSpacing:5 },
  logoTagline: { fontSize:9, color:"#3a6070", letterSpacing:2, textTransform:"uppercase" },
  headerRight: { display:"flex", alignItems:"center", gap:10 },
  vendedorTag: { display:"flex", alignItems:"center", gap:7, background:"#0a1d2a", border:"1px solid #1e3a4a", borderRadius:20, padding:"4px 12px 4px 4px" },
  vtInitial: { width:22, height:22, borderRadius:"50%", background:"#0ea5c8", display:"flex", alignItems:"center", justifyContent:"center", color:"#050d14", fontWeight:700, fontSize:11 },
  vtName: { fontSize:11, color:"#c8dde8" },
  switchBtn: { background:"none", border:"1px solid #1e3a4a", color:"#3a6070", fontSize:16, width:28, height:28, borderRadius:4, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" },
  onlineDot: { width:7, height:7, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 8px #22c55e" },
  onlineLabel: { fontSize:10, color:"#3a6070", letterSpacing:1 },
  body: { display:"flex", flex:1, overflow:"hidden" },
  sidebar: { width:220, minWidth:220, background:"#060f18", borderRight:"1px solid #0e2535", overflowY:"auto", padding:"14px 10px", display:"flex", flexDirection:"column" },
  sideSection: { marginBottom:20 },
  sideTitle: { fontSize:8, letterSpacing:3, color:"#0ea5c8", marginBottom:8, textTransform:"uppercase" },
  shortcuts: { display:"flex", flexDirection:"column", gap:5 },
  shortcutBtn: { display:"flex", alignItems:"center", gap:8, background:"#0a1d2a", border:"1px solid #132b3d", borderRadius:5, padding:"7px 9px", cursor:"pointer", color:"#c8dde8", textAlign:"left", transition:"border-color 0.12s,background 0.12s", fontFamily:"inherit", width:"100%" },
  shortcutEmoji: { fontSize:14, flexShrink:0 },
  shortcutText: { fontSize:11 },
  funnelCard: { background:"#0a1d2a", border:"1px solid #0e2535", borderLeft:"3px solid #0ea5c8", borderRadius:4, padding:"10px 12px" },
  funnelText: { fontSize:11, lineHeight:1.8, color:"#7aaabb" },
  main: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  tabBar: { display:"flex", alignItems:"center", gap:4, padding:"8px 16px", borderBottom:"1px solid #0e2535", background:"#060f18", flexShrink:0 },
  tab: { background:"transparent", border:"1px solid transparent", color:"#3a6070", fontSize:10, padding:"5px 14px", borderRadius:4, cursor:"pointer", fontFamily:"inherit", letterSpacing:1, textTransform:"uppercase" },
  tabOn: { background:"#0a1d2a", border:"1px solid #0e2535", color:"#0ea5c8" },
  newBtn: { marginLeft:"auto", background:"transparent", border:"1px solid #1e3a4a", color:"#3a6070", fontSize:10, padding:"5px 12px", borderRadius:4, cursor:"pointer", fontFamily:"inherit", letterSpacing:1 },
  messages: { flex:1, overflowY:"auto", padding:"20px", display:"flex", flexDirection:"column", gap:14 },
  msgRow: { display:"flex", alignItems:"flex-end", gap:8 },
  avatar: { width:28, height:28, borderRadius:"50%", background:"#0a1d2a", border:"1px solid #0ea5c8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#0ea5c8", flexShrink:0 },
  bubble: { maxWidth:"74%", padding:"10px 14px", borderRadius:8, fontSize:13, lineHeight:1.75 },
  bubbleBot: { background:"#0a1d2a", border:"1px solid #0e2535", color:"#c8dde8", borderBottomLeftRadius:2 },
  bubbleUser: { background:"#0d2d42", border:"1px solid #1a4a63", color:"#e4f4fc", borderBottomRightRadius:2 },
  typingText: { color:"#3a6070", fontSize:12, fontStyle:"italic" },
  typingDots: { color:"#0ea5c8", marginLeft:4 },
  inputRow: { display:"flex", gap:10, padding:"12px 16px", borderTop:"1px solid #0e2535", background:"#060f18", alignItems:"flex-end", flexShrink:0 },
  textarea: { flex:1, background:"#0a1d2a", border:"1px solid #1e3a4a", borderRadius:6, color:"#c8dde8", fontFamily:"inherit", fontSize:13, padding:"10px 12px", resize:"none", outline:"none", lineHeight:1.6 },
  sendBtn: { background:"#0ea5c8", border:"none", borderRadius:6, color:"#050d14", fontSize:18, width:44, height:44, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, flexShrink:0 },
  scrollView: { flex:1, overflowY:"auto", padding:"20px 24px", display:"flex", flexDirection:"column", gap:20 },
  sectionLabel: { fontSize:9, letterSpacing:3, color:"#0ea5c8", textTransform:"uppercase", marginBottom:8 },
  statsGrid: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 },
  statCard: { background:"#0a1d2a", border:"1px solid #0e2535", borderRadius:8, padding:"16px", textAlign:"center" },
  statValue: { fontSize:28, fontWeight:700, color:"#0ea5c8" },
  statLabel: { fontSize:11, color:"#c8dde8", marginTop:4 },
  statSub: { fontSize:10, color:"#3a6070", marginTop:3 },
  insightBox: { background:"#0a1d2a", border:"1px solid #0e2535", borderRadius:8, padding:"16px 20px" },
  insightRow: { display:"flex", gap:10, fontSize:12, lineHeight:1.9, color:"#8aaabb", marginBottom:4 },
  bullet: { color:"#0ea5c8", flexShrink:0 },
  funnelStep: { display:"flex", alignItems:"center", gap:12, marginBottom:10 },
  funnelStepLabel: { fontSize:11, color:"#8aaabb", width:180, flexShrink:0 },
  funnelBarWrap: { flex:1, height:20, background:"#061320", borderRadius:3, overflow:"hidden" },
  funnelBar: { height:"100%", borderRadius:3 },
  funnelStepPct: { fontSize:12, color:"#0ea5c8", width:40, textAlign:"right", flexShrink:0 },
  emptyMsg: { fontSize:12, color:"#3a6070", padding:"8px 0" },
};
