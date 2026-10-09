import { useState, useRef, useEffect } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SYSTEM = `You are the Century Oak Financial AI — a senior market intelligence agent at Century Oak Financial LLC.

Your job: deliver fast, clear, educational market intelligence. You have access to real-time web search — always search before answering any market, stock, or news question. Make responses easy to understand for everyday investors, not just professionals.

Tone: Clear, confident, educational. Explain terms when they come up. No jargon without explanation.

Format every response:
- **Bold headers** for each section
- Bullet points with - for lists
- Brief plain-English explanation of any technical terms used
- End with a **Century Oak Signal** block: one line saying Bullish / Bearish / Neutral and a plain-English reason why
- Under 450 words. Clear and readable.

IMPORTANT: Always remind users this is for educational purposes only and not financial advice.`;

const QUICK = [
  { icon: "📈", label: "Today's Market", sub: "S&P, Nasdaq, Dow", prompt: "Search for today's stock market performance — S&P 500, Nasdaq, and Dow Jones. What's moving markets right now and why? Explain in plain English." },
  { icon: "🔥", label: "Top Movers", sub: "Biggest gains & drops", prompt: "Search for the biggest stock gainers and losers today. What stocks are moving the most and why? Keep it simple." },
  { icon: "💰", label: "Earnings Reports", sub: "Latest company results", prompt: "Search for major company earnings reports today or this week. What companies reported and how did the market react? Explain what earnings mean for everyday investors." },
  { icon: "🌍", label: "Fed & Economy", sub: "Rates, inflation, jobs", prompt: "Search for the latest Federal Reserve news, inflation data, or jobs report. Explain in plain English what it means for regular investors and their money." },
  { icon: "₿", label: "Crypto Update", sub: "Bitcoin, Ethereum & more", prompt: "Search for the latest Bitcoin and major cryptocurrency prices and news. What's driving the moves today? Explain clearly." },
  { icon: "⚡", label: "Breaking News", sub: "Last few hours", prompt: "Search for the most important financial and market breaking news in the last few hours. What do investors need to know right now?" },
];

const EXAMPLES = [
  "Why did Apple stock drop today?",
  "Explain what a P/E ratio means",
  "Is now a good time to invest in AI stocks?",
  "What is the Federal Reserve doing to interest rates?",
  "Analyze Microsoft as an investment",
  "What's happening with oil prices?",
  "Explain what a stock market correction means",
  "Bitcoin price and what's driving it",
];

const MODES = [
  { id: "general", icon: "💬", label: "Ask Anything" },
  { id: "stock",   icon: "📊", label: "Stock Analysis" },
  { id: "news",    icon: "📰", label: "Market News" },
  { id: "learn",   icon: "🎓", label: "Learn Investing" },
  { id: "crypto",  icon: "₿",  label: "Crypto" },
  { id: "macro",   icon: "🌍", label: "Economy & Fed" },
];

const PROMPTS = {
  general: q => q,
  stock:   q => `Search for the latest news, financials, and analyst views on: "${q}". Give a clear educational breakdown suitable for everyday investors. Explain any technical terms.`,
  news:    q => `Search for the latest market news about: "${q}". Summarize what happened, why it matters, and what it means for investors in plain English.`,
  learn:   q => `Explain in clear, plain English for a beginner investor: "${q}". Use simple analogies. Search for any relevant current examples to illustrate.`,
  crypto:  q => `Search for the latest news and data on: "${q}". Give a clear educational breakdown. Explain the key concepts for someone new to crypto.`,
  macro:   q => `Search for the latest data and expert commentary on: "${q}". Explain in plain English what this means for everyday investors and their savings.`,
};

// ─── OAK ICON ─────────────────────────────────────────────────────────────────
function Oak({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="12.5" y="17" width="3" height="9" rx="1.5" fill="#275e3a"/>
      <path d="M10.5 25.5Q8.5 24.5 6.5 25.5" stroke="#275e3a" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M17.5 25.5Q19.5 24.5 21.5 25.5" stroke="#275e3a" strokeWidth="1.2" strokeLinecap="round"/>
      <ellipse cx="14" cy="15.5" rx="9" ry="6.5" fill="#183d26"/>
      <ellipse cx="14" cy="12.5" rx="7.5" ry="5.5" fill="#275e3a"/>
      <ellipse cx="14" cy="9.5" rx="6" ry="5" fill="#347a4a"/>
      <ellipse cx="14" cy="7" rx="4.5" ry="4" fill="#4a9660"/>
      <ellipse cx="14" cy="5" rx="3" ry="2.8" fill="#58aa72"/>
      <ellipse cx="12.5" cy="5.2" rx="1.4" ry=".9" fill="#80cc98" opacity=".5"/>
    </svg>
  );
}

// ─── MARKDOWN RENDERER ────────────────────────────────────────────────────────
function MdBlock({ text }) {
  const lines = text.split("\n");
  const els = [];
  let verdictLines = [];
  let inVerdict = false;

  const flushVerdict = () => {
    if (!verdictLines.length) return;
    els.push(
      <div key="verd" style={{ marginTop: 16, padding: "13px 15px", background: "linear-gradient(135deg,#091410,#060e0a)", border: "1px solid #1c2e28", borderLeft: "3px solid #b8923a", borderRadius: 10 }}>
        {verdictLines}
      </div>
    );
    verdictLines = [];
    inVerdict = false;
  };

  lines.forEach((line, i) => {
    if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
      const label = line.replace(/\*\*/g, "").trim();
      const isV = /century oak signal/i.test(label);
      if (inVerdict && !isV) flushVerdict();
      const el = (
        <div key={i} style={{ fontFamily: "'Georgia',serif", fontSize: 11, fontWeight: 700, color: "#cfaa50", letterSpacing: ".1em", textTransform: "uppercase", borderBottom: isV ? "none" : "1px solid #131e1a", paddingBottom: isV ? 0 : 5, marginTop: i === 0 ? 0 : 18, marginBottom: 8 }}>
          {label}
        </div>
      );
      if (isV) { inVerdict = true; verdictLines.push(el); }
      else els.push(el);
    } else if (/^[-•]/.test(line.trim())) {
      const content = line.replace(/^[-•]\s*/, "");
      const el = (
        <div key={i} style={{ paddingLeft: 13, borderLeft: "2px solid #275e3a", color: "#9ab8a4", lineHeight: 1.75, marginBottom: 6, fontSize: 13 }}
          dangerouslySetInnerHTML={{ __html: "• " + content.replace(/\*\*(.*?)\*\*/g, "<strong style='color:#d0e8d6'>$1</strong>") }} />
      );
      if (inVerdict) verdictLines.push(el); else els.push(el);
    } else if (!line.trim()) {
      const el = <div key={i} style={{ height: 7 }} />;
      if (inVerdict) verdictLines.push(el); else els.push(el);
    } else {
      const el = (
        <div key={i} style={{ color: "#c0d0c6", lineHeight: 1.82, marginBottom: 3 }}
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong style='color:#d0e8d6'>$1</strong>") }} />
      );
      if (inVerdict) verdictLines.push(el); else els.push(el);
    }
  });
  if (inVerdict) flushVerdict();
  return <>{els}</>;
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [dismissed, setDismissed] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState("general");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const feedRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, loading]);

  async function send(queryOverride) {
    const query = (queryOverride || input).trim();
    if (!query || loading) return;
    setInput("");
    if (!started) setStarted(true);
    setLoading(true);
    setStatus("Searching live data...");

    const userMsg = { role: "user", content: query };
    const history = [...messages, userMsg];
    setMessages(history);

    try {
      // Call our secure Netlify proxy — API key stays server-side
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM,
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); }
      catch { throw new Error("Unexpected server error (" + res.status + "). Please try again."); }

      if (!res.ok || data.error) throw new Error((typeof data.error === "string" ? data.error : data.error?.message) || "Request failed. Please try again.");

      setStatus("Building your brief...");

      const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
      if (!text) throw new Error("No response received. Please try again.");

      setMessages([...history, { role: "assistant", content: text }]);

    } catch (err) {
      setMessages([...history, { role: "assistant", content: err.message, isError: true }]);
    } finally {
      setLoading(false);
      setStatus("");
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const currentMode = MODES.find(m => m.id === mode);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#06090b", color: "#c0d0c6", fontFamily: "'Inter','Helvetica Neue',sans-serif", fontSize: 14 }}>

      {/* ── DISCLAIMER MODAL ── */}
      {disclaimerOpen && (
        <div onClick={() => setDisclaimerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0c1410", border: "1px solid #1c3020", borderRadius: 16, maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,.7)" }}>
            <div style={{ padding: "20px 20px 0", borderBottom: "1px solid #131e1a", marginBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ fontSize: 22 }}>⚖️</div>
                <div>
                  <div style={{ fontFamily: "'Georgia',serif", fontSize: 17, fontWeight: 700, color: "#dceade" }}>Important Disclaimer</div>
                  <div style={{ fontSize: 10, color: "#3a5a34", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 2 }}>Century Oak Financial LLC</div>
                </div>
              </div>
            </div>
            <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                { n: "1", title: "Automated Educational Tool Only", body: "This AI Agent is an automated software program designed solely for general informational, educational, and entertainment purposes. It is not a licensed financial advisor, broker, or accountant. Nothing communicated by this AI Agent constitutes personalized investment, tax, legal, or financial advice." },
                { n: "2", title: "Limitation of Accuracy and Real-Time Data", body: "Financial markets change rapidly. The information provided by this AI Agent may contain technical inaccuracies, typographical errors, or outdated material. Do not base any financial strategies or real-world investments on this output without independent verification." },
                { n: "3", title: "Assumption of Risk and No Liability", body: "You assume total responsibility and risk for your use of this AI Agent. Under no circumstances will this website, its parent company, or its developers be liable for any direct, indirect, incidental, or consequential financial losses, or damages of any kind, resulting from your reliance on the AI's answers." },
              ].map(s => (
                <div key={s.n} style={{ display: "flex", gap: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1d4a2e", border: "1px solid #275e3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#4faa6a", flexShrink: 0, marginTop: 1 }}>{s.n}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#c0d0c6", marginBottom: 5, letterSpacing: ".01em" }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: "#5a7a64", lineHeight: 1.65 }}>{s.body}</div>
                  </div>
                </div>
              ))}
              <div style={{ background: "linear-gradient(135deg,#0a1a10,#080e0a)", border: "1px solid #1c2e18", borderLeft: "3px solid #b8923a", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#cfaa50", marginBottom: 4 }}>⚠ Always Consult a Professional</div>
                <div style={{ fontSize: 11, color: "#6a8a5a", lineHeight: 1.6 }}>Always consult a certified human professional before making significant financial decisions. This AI does not replace licensed financial, legal, or tax counsel.</div>
              </div>
              <button onClick={() => setDisclaimerOpen(false)} style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg,#275e3a,#1d4a2e)", border: "none", borderRadius: 10, color: "#d0ead8", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: ".06em" }}>
                I Understand — Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LEGAL BANNER ── */}
      {!dismissed && (
        <div style={{ background: "#07090b", borderBottom: "1px solid #0e1612", padding: "6px 16px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: "#2e4a34" }}>⚖️ For educational purposes only — not investment advice.</span>
          <button onClick={() => setDisclaimerOpen(true)} style={{ background: "none", border: "none", color: "#3a6a42", fontSize: 10, cursor: "pointer", textDecoration: "underline", padding: 0, fontFamily: "inherit" }}>Disclaimer</button>
          <button onClick={() => setDismissed(true)} style={{ background: "none", border: "none", color: "#1e3020", fontSize: 13, cursor: "pointer", padding: 0, marginLeft: "auto", lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #131e1a", background: "rgba(6,9,11,.98)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Oak size={28} />
          <div>
            <div style={{ fontFamily: "'Georgia',serif", fontSize: 17, fontWeight: 700, color: "#dceade", letterSpacing: ".03em", lineHeight: 1.1 }}>
              Century <span style={{ color: "#cfaa50" }}>Oak</span> Financial
            </div>
            <div style={{ fontSize: 9, color: "#2e4038", letterSpacing: ".14em", textTransform: "uppercase", marginTop: 2 }}>AI Market Intelligence</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 20, border: "1px solid #1c2e28", background: "#0a0f12" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4faa6a", animation: "pulse 2s ease infinite" }} />
          <span style={{ fontSize: 9, color: "#3a8c52", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600 }}>Live</span>
        </div>
      </div>

      {/* ── HERO (shown before first message) ── */}
      {!started && (
        <div style={{ padding: "28px 20px 0", textAlign: "center", background: "linear-gradient(180deg,#080e0a,#06090b)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "#0a1a0e", border: "1px solid #1c2e18", marginBottom: 14 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4faa6a", animation: "pulse 2s ease infinite" }} />
            <span style={{ fontSize: 10, color: "#3a8c52", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600 }}>Free · No Sign-up Required</span>
          </div>
          <div style={{ fontFamily: "'Georgia',serif", fontSize: 26, fontWeight: 700, color: "#dceade", lineHeight: 1.2, marginBottom: 10 }}>
            Your personal<br /><span style={{ color: "#cfaa50" }}>market intelligence</span><br />briefing
          </div>
          <div style={{ fontSize: 13, color: "#4a6a58", lineHeight: 1.7, maxWidth: 340, margin: "0 auto 24px" }}>
            Ask about any stock, market trend, or financial topic. Get clear, plain-English answers backed by live data — in seconds.
          </div>

          {/* Quick action grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 440, margin: "0 auto 20px", textAlign: "left" }}>
            {QUICK.map((q, i) => (
              <button key={i} onClick={() => send(q.prompt)}
                style={{ background: "#0a0f12", border: "1px solid #131e1a", borderRadius: 12, padding: "13px 13px", cursor: "pointer", textAlign: "left", transition: "all .15s" }}>
                <div style={{ fontSize: 20, marginBottom: 5 }}>{q.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#c0d0c6", marginBottom: 2 }}>{q.label}</div>
                <div style={{ fontSize: 10, color: "#3a5045" }}>{q.sub}</div>
              </button>
            ))}
          </div>

          {/* Example questions */}
          <div style={{ textAlign: "left", maxWidth: 440, margin: "0 auto", paddingBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#2a3830", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>Or try asking...</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => send(ex)}
                  style={{ padding: "6px 11px", borderRadius: 20, border: "1px solid #131e1a", background: "transparent", color: "#4a6a58", fontSize: 11, cursor: "pointer", transition: "all .15s" }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODE TABS (shown after first message) ── */}
      {started && (
        <div style={{ display: "flex", borderBottom: "1px solid #131e1a", overflowX: "auto", flexShrink: 0, scrollbarWidth: "none" }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              style={{ padding: "9px 14px", border: "none", background: "transparent", color: mode === m.id ? "#4faa6a" : "#2e4038", fontSize: 11, fontWeight: mode === m.id ? 600 : 400, cursor: "pointer", borderBottom: mode === m.id ? "2px solid #3a8c52" : "2px solid transparent", whiteSpace: "nowrap", transition: "all .15s" }}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      )}

      {/* ── FEED ── */}
      {started && (
        <div ref={feedRef} style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ background: "linear-gradient(135deg,#1d4a2e,#132e1c)", border: "1px solid #275e3a", borderRadius: "14px 14px 4px 14px", padding: "10px 13px", maxWidth: "82%", fontSize: 13, color: "#c8e4d0", lineHeight: 1.5 }}>
                    {msg.content}
                  </div>
                </div>
              );
            }
            return (
              <div key={i} style={{ animation: "fadeUp .3s ease" }}>
                {msg.isError ? (
                  <div style={{ background: "#0c0808", border: "1px solid #2e1414", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 12, color: "#c07070", marginBottom: 6, fontWeight: 600 }}>Something went wrong</div>
                    <div style={{ fontSize: 11, color: "#8a5050", lineHeight: 1.5 }}>{msg.content}</div>
                    <div style={{ fontSize: 10, color: "#5a3030", marginTop: 8 }}>Try rephrasing your question or check your connection.</div>
                  </div>
                ) : (
                  <div style={{ background: "#0a0f12", border: "1px solid #131e1a", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 13px", borderBottom: "1px solid #131e1a", background: "linear-gradient(135deg,#0a140e,#0a0f12)" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#1d4a2e,#0c1a10)", border: "1px solid #275e3a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Oak size={17} />
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Georgia',serif", fontSize: 12, fontWeight: 700, color: "#cfaa50" }}>Century Oak Financial AI</div>
                        <div style={{ fontSize: 9, color: "#2e4038", marginTop: 1 }}>{currentMode.icon} {currentMode.label} · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Live Search</div>
                      </div>
                    </div>
                    <div style={{ padding: "14px", fontSize: 13.5, lineHeight: 1.82 }}>
                      <MdBlock text={msg.content} />
                    </div>
                    <div style={{ padding: "8px 14px 10px", borderTop: "1px solid #0e1810", fontSize: 10, color: "#1e3028" }}>
                      For educational purposes only · Not investment advice · Century Oak Financial LLC
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading */}
          {loading && (
            <div style={{ background: "#0a0f12", border: "1px solid #131e1a", borderRadius: 14, padding: 16, animation: "fadeUp .2s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#1d4a2e,#0c1a10)", border: "1px solid #275e3a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Oak size={17} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Georgia',serif", fontSize: 12, color: "#cfaa50", fontWeight: 700 }}>Century Oak Financial AI</div>
                  <div style={{ fontSize: 10, color: "#3a8c52", marginTop: 1 }}>{status}</div>
                </div>
              </div>
              {[82, 65, 90, 52, 74].map((w, i) => (
                <div key={i} style={{ height: 10, background: "#0e1a14", borderRadius: 4, marginBottom: 9, width: `${w}%`, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,#1a2e20,transparent)", animation: `shimmer 1.6s ease ${i * .18}s infinite` }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INPUT ── */}
      <div style={{ padding: started ? "10px 14px 14px" : "14px 20px 20px", borderTop: started ? "1px solid #131e1a" : "none", flexShrink: 0, background: "rgba(6,9,11,.98)", maxWidth: started ? "100%" : 480, width: "100%", margin: started ? "0" : "0 auto" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            onKeyDown={handleKey}
            placeholder={started ? (currentMode?.ph || "Ask about any stock, market, or financial topic...") : "Ask about any stock, market, or financial topic..."}
            rows={1}
            style={{ flex: 1, background: "#0a0f12", border: "1px solid #1c2e28", borderRadius: 12, padding: "13px 14px", color: "#c0d0c6", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "none", lineHeight: 1.4, maxHeight: 120, overflowY: "auto" }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            style={{ width: 46, height: 46, borderRadius: 12, border: "none", background: (loading || !input.trim()) ? "#0e1a14" : "linear-gradient(135deg,#275e3a,#1d4a2e)", color: "#c8e8d4", fontSize: 18, cursor: (loading || !input.trim()) ? "not-allowed" : "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {loading ? "…" : "→"}
          </button>
        </div>
        {!started && (
          <div style={{ fontSize: 10, color: "#1e3028", textAlign: "center", marginTop: 8 }}>
            Free to use · No account needed · Powered by AI with live web search
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid #0e1410", background: "#060809", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ fontFamily: "'Georgia',serif", fontSize: 11, color: "#1e3028" }}>
          © Century <span style={{ color: "#3a5a2a" }}>Oak</span> Financial LLC
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 9, color: "#1a2818" }}>Educational use only · Not financial advice · All investments carry risk</span>
          <button onClick={() => setDisclaimerOpen(true)} style={{ background: "none", border: "none", color: "#2a4a2a", fontSize: 9, cursor: "pointer", textDecoration: "underline", padding: 0, fontFamily: "inherit", letterSpacing: ".02em" }}>
            Full Disclaimer
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(250%)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: #131e1a; border-radius: 2px; }
        textarea::placeholder { color: #2e4038; }
        button:not(:disabled):hover { opacity: .82; }
        div[style*="scrollbar-width"] { scrollbar-width: none; }
      `}</style>
    </div>
  );
}
