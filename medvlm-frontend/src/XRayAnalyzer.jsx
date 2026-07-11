import { useState, useRef, useCallback, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://medvlm-backend.onrender.com";

/* ── Color Tokens (Dark Medical Theme) ─────────────────────────────────── */
const C = {
  teal: "#00d4aa", tealDim: "rgba(0,212,170,0.15)", tealGlow: "0 0 20px rgba(0,212,170,0.4)",
  tealBorder: "rgba(0,212,170,0.3)", red: "#ff4757", orange: "#ffa502",
  green: "#2ed573", bg: "#0a0f1a", surface1: "#111827", surface2: "#1a2235",
  surface3: "#1e2d40", border: "rgba(255,255,255,0.08)", text: "#f1f5f9",
  textSec: "#cbd5e1", muted: "#94a3b8", mutedDark: "#475569",
};

const font = "'Inter', system-ui, -apple-system, sans-serif";

/* ── Shared style fragments ────────────────────────────────────────────── */
const card = {
  background: C.surface1, borderRadius: 12, border: `1px solid ${C.border}`,
  boxShadow: "0 2px 8px rgba(0,0,0,.3)", padding: 24,
};
const glassCard = {
  ...card, background: "rgba(17,24,39,0.8)",
  backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
};
const sectionLabel = {
  fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase",
  color: C.teal, marginBottom: 8, fontFamily: "'Courier New', monospace",
};

/* ── Severity helpers ──────────────────────────────────────────────────── */
const sevColor = (s) => ({ normal: C.green, mild: C.orange, moderate: C.red, severe: C.red }[s] || C.muted);
const sevGlow = (s) => ({ normal: "0 0 20px rgba(46,213,115,0.3)", mild: "0 0 20px rgba(255,165,2,0.3)", moderate: "0 0 20px rgba(255,71,87,0.3)", severe: "0 0 20px rgba(255,71,87,0.5)" }[s] || "none");
const barGrad = (v) => v > 0.6 ? "linear-gradient(90deg,#ff4757,#ff6b81)" : v >= 0.3 ? "linear-gradient(90deg,#ffa502,#ffcc02)" : "linear-gradient(90deg,#2ed573,#7bed9f)";
const barGlow = (v) => v > 0.6 ? "0 0 8px rgba(255,71,87,0.4)" : v >= 0.3 ? "0 0 8px rgba(255,165,2,0.4)" : "0 0 8px rgba(46,213,115,0.4)";
const zoneColor = (s) => s === "clear" ? C.green : C.red;

/* ── Pipeline step definitions ─────────────────────────────────────────── */
const PIPELINE_STEPS = [
  { id: 0, label: "Image Preprocessing", duration: 200 },
  { id: 1, label: "Preparing API Payload", duration: 200 },
  { id: 2, label: "Running Gemini Inference", duration: 3000 },
  { id: 3, label: "Parsing JSON Output", duration: 200 },
  { id: 4, label: "Formatting Report", duration: 200 },
];
const TOTAL_DURATION = PIPELINE_STEPS.reduce((s, p) => s + p.duration, 0);

/* ── Component ─────────────────────────────────────────────────────────── */
const LANGS = [
  "English", "Hindi", "Gujarati", "Marathi", "Tamil",
  "Telugu", "Bengali", "Spanish", "French", "Arabic",
];

export default function XRayAnalyzer({ onReportSaved, selectedReport, onClearSelectedReport }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [viewingPast, setViewingPast] = useState(false);
  const [language, setLanguage] = useState("English");
  // Streaming live output
  const [streamedText, setStreamedText] = useState("");
  // Google Search grounding
  const [groundedInsights, setGroundedInsights] = useState(null);
  const [groundedLoading, setGroundedLoading] = useState(false);
  // Chatbot state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef();
  const inputRef = useRef();
  const rightPanelRef = useRef();

  /* ── Load a past report when selectedReport changes ────────────────── */
  useEffect(() => {
    if (selectedReport) {
      setReport(selectedReport);
      setPreview(selectedReport.imageThumbnail || null);
      setFile(null);
      setActiveTab(0);
      setShowResults(true);
      setViewingPast(true);
      setPipelineActive(false);
      setPipelineDone(false);
      setLoading(false);
      setError(null);
      setTimeout(() => rightPanelRef.current?.scrollTo?.({ top: 0, behavior: "smooth" }), 50);
    }
  }, [selectedReport]);

  /* ── Pipeline state ──────────────────────────────────────────────────── */
  const [steps, setSteps] = useState(() => PIPELINE_STEPS.map(s => ({ ...s, state: "pending" })));
  const [pipelineActive, setPipelineActive] = useState(false);
  const [pipelineDone, setPipelineDone] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [countdown, setCountdown] = useState(Math.ceil(TOTAL_DURATION / 1000));
  const timersRef = useRef([]);
  const countdownRef = useRef(null);

  /* ── Cleanup all timers on unmount ───────────────────────────────────── */
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  /* ── Run the animation sequence, returns a Promise ───────────────────── */
  const runPipeline = () => new Promise((resolve) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (countdownRef.current) clearInterval(countdownRef.current);

    const fresh = PIPELINE_STEPS.map(s => ({ ...s, state: "pending" }));
    setSteps(fresh);
    setPipelineActive(true);
    setPipelineDone(false);
    setProgressPct(0);
    setCountdown(Math.ceil(TOTAL_DURATION / 1000));

    /* countdown timer */
    let remaining = Math.ceil(TOTAL_DURATION / 1000);
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining < 0) remaining = 0;
      setCountdown(remaining);
      if (remaining <= 0 && countdownRef.current) clearInterval(countdownRef.current);
    }, 1000);

    /* progress bar — update every 100ms */
    const progStart = Date.now();
    const progTimer = setInterval(() => {
      const elapsed = Date.now() - progStart;
      const pct = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
      setProgressPct(pct);
      if (pct >= 100) clearInterval(progTimer);
    }, 100);
    timersRef.current.push(progTimer);

    /* step sequencing */
    let cumulative = 0;
    PIPELINE_STEPS.forEach((step, idx) => {
      /* activate this step */
      const activateId = setTimeout(() => {
        setSteps(prev => prev.map((s, i) => i === idx ? { ...s, state: "active" } : s));
      }, cumulative);
      timersRef.current.push(activateId);

      cumulative += step.duration;

      /* complete this step */
      const completeId = setTimeout(() => {
        setSteps(prev => prev.map((s, i) => i === idx ? { ...s, state: "done" } : s));
        if (idx === PIPELINE_STEPS.length - 1) {
          setProgressPct(100);
          if (countdownRef.current) clearInterval(countdownRef.current);
          setCountdown(0);
          resolve();
        }
      }, cumulative);
      timersRef.current.push(completeId);
    });
  });

  /* ── File handling ───────────────────────────────────────────────────── */
  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f); setError(null); setReport(null); setActiveTab(0);
    setShowResults(false); setPipelineActive(false); setPipelineDone(false);
    const r = new FileReader();
    r.onload = (e) => setPreview(e.target.result);
    r.readAsDataURL(f);
  }, []);

  const onDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }, [handleFile]);

  /* ── Analyze — SSE streaming + pipeline animation ───────────────── */
  const analyze = async () => {
    if (!file) return;
    setLoading(true); setError(null); setReport(null);
    setShowResults(false); setChatMessages([]); setStreamedText(""); setGroundedInsights(null);

    const animationPromise = runPipeline();

    // SSE streaming fetch — reads Gemini output in real-time
    const fetchPromise = (async () => {
      const fd = new FormData(); fd.append("image", file);
      const url = `${API}/analyze-stream?language=${encodeURIComponent(language)}`;
      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(part.slice(6));
            if (payload.type === "chunk") {
              // show last 280 chars of live Gemini output
              setStreamedText(prev => (prev + payload.text).slice(-280));
            } else if (payload.type === "done") {
              result = payload.report;
            } else if (payload.type === "error") {
              throw new Error(payload.message);
            }
          } catch (parseErr) {
            if (parseErr.message && !parseErr.message.startsWith("JSON")) throw parseErr;
          }
        }
      }
      if (!result) throw new Error("No report received. Please try again.");
      return result;
    })();

    try {
      const [, data] = await Promise.all([animationPromise, fetchPromise]);
      setPipelineDone(true);
      const doneTimer = setTimeout(() => {
        setPipelineActive(false);
        setStreamedText("");
        setReport(data); setActiveTab(0);
        setShowResults(true);
        setLoading(false);
        setViewingPast(false);
        if (onReportSaved) onReportSaved(data, file);
      }, 1500);
      timersRef.current.push(doneTimer);
    } catch (e) {
      setError(e.message || "Analysis failed. Please try again.");
      setStreamedText("");
      setPipelineActive(false); setPipelineDone(false); setLoading(false);
    }
  };

  /* ── Google Search Grounding ────────────────────────────────── */
  const getGroundedInsights = async () => {
    if (!report || groundedLoading) return;
    setGroundedLoading(true); setGroundedInsights(null);
    try {
      const res = await fetch(`${API}/grounded-insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conditions: report.abnormalities || [],
          severity: report.severity || "normal",
        }),
      });
      const data = await res.json();
      setGroundedInsights(data.insights);
    } catch {
      setGroundedInsights("Unable to fetch grounded insights. Please try again.");
    } finally {
      setGroundedLoading(false);
    }
  };

  /* ── Chat ─────────────────────────────────────────────────────────────── */
  const sendChat = async () => {
    if (!chatInput.trim() || !report || chatLoading) return;
    const userMsg = { role: "user", text: chatInput.trim() };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput("");
    setChatLoading(true);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_context: report,
          conversation_history: newHistory.slice(0, -1).map(m => ({ role: m.role, text: m.text })),
          user_message: userMsg.text,
          language,
        }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "model", text: data.reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "model", text: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  /* ── Download PDF ────────────────────────────────────────────────────── */
  const downloadPdf = async () => {
    try {
      const res = await fetch(`${API}/generate-pdf`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "radiology_report.pdf"; a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { setError(e.message); }
  };

  const fmtSize = (b) => b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB";
  const tabs = ["Report", "Findings", "Lung Map", "💬 Chat"];

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: font, color: C.text, minHeight: "calc(100vh - 56px)" }}>
      {/* Main Grid */}
      <div className="mvlm-main-grid" style={{ display: "flex", gap: 24, padding: 24, maxWidth: 1400, margin: "0 auto", flexWrap: "wrap" }}>

        {/* ── LEFT COLUMN ──────────────────────────────────────────── */}
        <div className="mvlm-left-col" style={{ flex: "0 0 38%", minWidth: 320, maxWidth: 520, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Upload Zone */}
          <div
            className="mvlm-upload-zone"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              ...card, cursor: "pointer", position: "relative", minHeight: 280,
              border: `2px dashed ${dragOver ? C.teal : C.tealBorder}`,
              background: dragOver ? "rgba(0,212,170,0.05)" : preview ? C.bg : C.surface1,
              textAlign: "center", padding: preview ? 0 : 40, overflow: "hidden",
              transition: "all .3s", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: dragOver || preview ? C.tealGlow : "none",
            }}
          >
            {/* Corner accents */}
            {[{t:0,l:0},{t:0,r:0},{b:0,l:0},{b:0,r:0}].map((pos,i)=>(
              <div key={i} style={{position:"absolute",...pos,...(pos.t!==undefined?{top:pos.t}:{}), ...(pos.b!==undefined?{bottom:pos.b}:{}), ...(pos.l!==undefined?{left:pos.l}:{}), ...(pos.r!==undefined?{right:pos.r}:{}), width:20,height:20, borderColor:C.teal, borderStyle:"solid", borderWidth:0, ...(i===0?{borderTopWidth:2,borderLeftWidth:2}:i===1?{borderTopWidth:2,borderRightWidth:2}:i===2?{borderBottomWidth:2,borderLeftWidth:2}:{borderBottomWidth:2,borderRightWidth:2}), pointerEvents:"none"}} />
            ))}
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files[0])} />
            {preview ? (
              <img src={preview} alt="X-ray" style={{ width: "100%", height: "100%", objectFit: "contain", maxHeight: 340 }} />
            ) : (
              <div>
                <img src="/medvlm-logo.png" alt="MedVLM" style={{ width: 56, height: 56, marginBottom: 12, opacity: 0.7, filter: "drop-shadow(0 0 8px rgba(0,212,170,0.3))" }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: C.teal, letterSpacing: 1.5, fontFamily: "'Courier New', monospace" }}>DROP X-RAY HERE</div>
                <div style={{ fontSize: 12, color: C.mutedDark, marginTop: 8 }}>PNG · JPG · up to 10MB</div>
              </div>
            )}
          </div>

          {/* File info badges */}
          {file && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, background: C.tealDim, color: C.teal, padding: "4px 10px", borderRadius: 20, fontWeight: 600, border: `1px solid ${C.tealBorder}` }}>{file.name}</span>
              <span style={{ fontSize: 12, background: C.surface2, color: C.muted, padding: "4px 10px", borderRadius: 20, border: `1px solid ${C.border}` }}>{fmtSize(file.size)}</span>
              <button onClick={() => { setFile(null); setPreview(null); setReport(null); setError(null); }} style={{ fontSize: 12, background: "none", border: "none", color: C.red, cursor: "pointer", fontWeight: 600 }}>✕ Remove</button>
            </div>
          )}

          {/* Language Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Courier New', monospace", letterSpacing: 0.5, whiteSpace: "nowrap" }}>🌐 LANGUAGE:</span>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              style={{
                flex: 1, height: 34, borderRadius: 8, border: `1px solid ${C.tealBorder}`,
                background: C.surface2, color: C.teal, fontSize: 12, fontWeight: 600,
                padding: "0 10px", cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif",
                outline: "none",
              }}
            >
              {LANGS.map(l => <option key={l} value={l} style={{ background: C.surface2 }}>{l}</option>)}
            </select>
          </div>

          {/* Model Info Card */}
          <div style={{
            background: C.tealDim, borderRadius: 12, padding: "14px 16px",
            border: `1px solid rgba(0,212,170,0.2)`, fontSize: 12, lineHeight: 2,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: "-100%", width: "200%", height: "100%", background: "linear-gradient(90deg, transparent, rgba(0,212,170,0.06), transparent)", animation: "shimmer 3s ease-in-out infinite", pointerEvents: "none" }} />
            <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4, color: C.teal, letterSpacing: 1.2, fontFamily: "'Courier New', monospace", textTransform: "uppercase" }}>Model Info</div>
            <div style={{ color: C.muted }}>🧠 Model: <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 600, color: C.teal }}>Gemini 2.5 Flash</span></div>
            <div style={{ color: C.muted }}>📊 Type: <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 600, color: C.teal }}>Multimodal Foundation Model</span></div>
            <div style={{ color: C.muted }}>🎯 Domain: <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 600, color: C.teal }}>General Vision</span></div>
            <div style={{ color: C.muted }}>⚡ Avg inference: <span style={{ fontFamily: "'Courier New', monospace", fontWeight: 600, color: C.teal }}>~4 seconds</span></div>
          </div>

          {/* Analyze Button */}
          <button
            onClick={analyze}
            disabled={!file || loading}
            style={{
              width: "100%", height: 52, borderRadius: 10, border: "none",
              fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              background: (!file || loading) ? C.surface3 : "linear-gradient(135deg, #00d4aa, #0099cc)",
              color: (!file || loading) ? C.mutedDark : C.bg,
              cursor: (!file || loading) ? "not-allowed" : "pointer",
              transition: "all .3s", fontFamily: font,
              boxShadow: (!file || loading) ? "none" : C.tealGlow,
              transform: (!file || loading) ? "none" : "scale(1)",
            }}
            onMouseEnter={(e) => { if (file && !loading) { e.target.style.transform = "scale(1.02)"; e.target.style.boxShadow = "0 0 40px rgba(0,212,170,0.5)"; } }}
            onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = C.tealGlow; }}
          >
            {loading ? "⚡ ANALYZING..." : "⚡ Analyze X-Ray"}
          </button>

          {/* Download Report button — only when report is ready */}
          {report && (
            <button
              onClick={downloadPdf}
              style={{
                width: "100%", height: 48, borderRadius: 10,
                border: `2px solid ${C.teal}`, background: "transparent",
                fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                color: C.teal, cursor: "pointer", transition: "all .3s", fontFamily: font,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.tealDim; e.currentTarget.style.boxShadow = C.tealGlow; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.boxShadow = "none"; }}
            >
              📄 Download Report
            </button>
          )}

          {/* Powered by badge */}
          <div style={{ textAlign: "center", fontSize: 10, color: C.mutedDark, fontWeight: 600, letterSpacing: 0.5, fontFamily: "'Courier New', monospace" }}>
            🧠 POWERED BY GEMINI 2.5 FLASH
          </div>

          {/* Error with retry */}
          {error && (
            <div style={{ ...card, borderColor: C.red, background: "rgba(255,71,87,0.08)", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 4, fontFamily: "'Courier New', monospace" }}>⚠ ANALYSIS FAILED</div>
                  <div style={{ fontSize: 13, color: "#ff8a95", lineHeight: 1.5 }}>{error}</div>
                </div>
                <button
                  onClick={analyze}
                  disabled={!file}
                  style={{
                    flexShrink: 0, padding: "7px 14px", borderRadius: 7,
                    border: `1px solid ${C.red}`, background: "rgba(255,71,87,0.12)",
                    color: C.red, fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: font, whiteSpace: "nowrap",
                  }}
                >↺ Retry</button>
              </div>
            </div>
          )}

          {/* Severity + Brief are now inside Tab 0 header */}
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
        {report && showResults && (
          <div className="mvlm-right-col" ref={rightPanelRef} style={{ flex: 1, minWidth: 360, display: "flex", flexDirection: "column", gap: 0, animation: "fadeInUp .5s ease both" }}>

            {/* Past report banner */}
            {viewingPast && selectedReport && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                background: "rgba(0,212,170,0.08)", border: `1px solid rgba(0,212,170,0.2)`,
                borderRadius: 8, padding: "10px 16px", marginBottom: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.teal }}>
                  <span>🕐</span>
                  <span>Viewing past report from <strong>{selectedReport.date}</strong> at <strong>{selectedReport.time}</strong></span>
                </div>
                <button
                  onClick={() => {
                    if (onClearSelectedReport) onClearSelectedReport();
                    setViewingPast(false); setReport(null); setShowResults(false);
                    setPreview(null); setFile(null);
                  }}
                  style={{
                    padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${C.tealBorder}`, background: "transparent",
                    color: C.teal, cursor: "pointer", fontFamily: font, transition: "all .2s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.tealDim; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >New Analysis</button>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", background: C.surface1, borderRadius: "12px 12px 0 0", border: `1px solid ${C.border}`, borderBottom: `1px solid rgba(255,255,255,0.06)`, overflow: "hidden" }}>
              {tabs.map((t, i) => (
                <button className="mvlm-tab-btn" key={t} onClick={() => setActiveTab(i)} style={{
                  flex: 1, padding: "13px 0", border: "none", fontSize: 13, fontWeight: activeTab === i ? 700 : 500,
                  color: activeTab === i ? C.teal : C.mutedDark, background: "transparent",
                  borderBottom: activeTab === i ? `2px solid ${C.teal}` : "2px solid transparent",
                  cursor: "pointer", transition: "all .15s", fontFamily: font,
                  textShadow: activeTab === i ? "0 0 12px rgba(0,212,170,0.5)" : "none",
                }}>{t}</button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ ...card, borderRadius: "0 0 12px 12px", flex: 1, minHeight: 420 }}>

              {/* TAB 0 — Report */}
              {activeTab === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

                  {/* ── Patient Summary ── */}
                  <div style={{
                    background: C.surface2, borderRadius: 10, border: `1px solid ${C.border}`,
                    borderTop: `3px solid ${C.teal}`, padding: 18,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ ...sectionLabel, marginBottom: 0 }}>👤 PATIENT SUMMARY</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.teal, fontFamily: "'Courier New', monospace", letterSpacing: 1, background: C.tealDim, padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.tealBorder}` }}>Rx</span>
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.8, color: C.textSec, margin: "0 0 14px 0" }}>{report.brief || "N/A"}</p>
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, color: C.muted, fontFamily: "'Courier New', monospace", letterSpacing: 0.5 }}>SEVERITY:</span>
                        <span style={{
                          fontSize: 12, fontWeight: 700, fontFamily: "'Courier New', monospace",
                          color: sevColor(report.severity), textTransform: "uppercase",
                          padding: "2px 10px", borderRadius: 4,
                          background: `${sevColor(report.severity)}18`,
                          border: `1px solid ${sevColor(report.severity)}40`,
                          boxShadow: sevGlow(report.severity),
                          animation: (report.severity === "moderate" || report.severity === "severe") ? "glow-pulse 2s ease-in-out infinite" : "none",
                        }}>{report.severity}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, color: C.muted, fontFamily: "'Courier New', monospace", letterSpacing: 0.5 }}>CONFIDENCE:</span>
                        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Courier New', monospace", color: C.teal }}>High</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Divider ── */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                    <span style={{ fontSize: 9, color: C.mutedDark, fontFamily: "'Courier New', monospace", letterSpacing: 1.5, fontWeight: 600 }}>CLINICAL REPORT</span>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                  </div>

                  {/* ── Report Sections ── */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Section icon="🔍" label="FINDINGS" badge="PRIMARY" text={report.findings} />
                    <Section icon="🧠" label="IMPRESSION" badge="CLINICAL" text={report.impression} />
                    <Section icon="📋" label="RECOMMENDATIONS" badge="ACTION REQUIRED" text={report.recommendations} />
                  </div>

                  {/* ── Detected Abnormalities ── */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={sectionLabel}>⚠ DETECTED ABNORMALITIES</div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.red, fontFamily: "'Courier New', monospace", background: "rgba(255,71,87,0.12)", padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(255,71,87,0.3)" }}>
                        {(report.abnormalities || []).length} FINDINGS
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {(report.abnormalities || []).map((a, i) => (
                        <span key={i} style={{
                          fontSize: 12, padding: "6px 14px", borderRadius: 8,
                          background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)",
                          color: "#ff6b7a", fontWeight: 600, whiteSpace: "nowrap",
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.red, flexShrink: 0 }} />
                          {a}
                          <span style={{ color: C.mutedDark, fontSize: 11 }}>→</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* ── Google Search Grounded Guidelines ── */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: groundedInsights ? 10 : 0 }}>
                      <div style={sectionLabel}>🔍 LATEST CLINICAL GUIDELINES</div>
                      <button
                        onClick={getGroundedInsights}
                        disabled={groundedLoading}
                        style={{
                          padding: "5px 14px", borderRadius: 7, border: `1px solid ${C.tealBorder}`,
                          background: groundedLoading ? C.surface3 : C.tealDim,
                          color: groundedLoading ? C.mutedDark : C.teal,
                          fontSize: 11, fontWeight: 700, cursor: groundedLoading ? "not-allowed" : "pointer",
                          fontFamily: font, display: "flex", alignItems: "center", gap: 6, transition: "all .2s",
                        }}
                        onMouseEnter={e => { if (!groundedLoading) e.currentTarget.style.boxShadow = "0 0 10px rgba(0,212,170,0.2)"; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
                      >
                        {groundedLoading ? (
                          <><span style={{ animation: "medvlm-spin 1s linear infinite", display: "inline-block" }}>⟳</span> Searching...</>
                        ) : (
                          <>{groundedInsights ? "↺ Refresh" : "🔍 Get Live Guidelines"}</>
                        )}
                      </button>
                    </div>
                    {!groundedInsights && !groundedLoading && (
                      <div style={{ fontSize: 11, color: C.mutedDark, fontStyle: "italic" }}>
                        Click to fetch Google Search-grounded clinical guidelines for your detected conditions.
                      </div>
                    )}
                    {groundedInsights && (
                      <div style={{
                        background: "rgba(0,212,170,0.04)", border: `1px solid ${C.tealBorder}`,
                        borderLeft: `3px solid ${C.teal}`, borderRadius: 10, padding: "14px 16px",
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: C.teal, fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 8 }}>
                          🌐 GROUNDED WITH GOOGLE SEARCH
                        </div>
                        <p style={{ fontSize: 13, lineHeight: 1.8, color: C.textSec, margin: 0, whiteSpace: "pre-wrap" }}>{groundedInsights}</p>
                      </div>
                    )}
                  </div>

                </div>
              )}


              {/* TAB 1 — Confidence Chart */}
              {activeTab === 1 && (() => {
                const PATHOLOGIES = ["opacity", "cardiomegaly", "effusion", "pneumothorax", "consolidation"];
                const scores = PATHOLOGIES.map(k => ({ key: k, value: report.confidence_scores?.[k] ?? 0 }));
                const avg = scores.reduce((s, d) => s + d.value, 0) / scores.length;
                const avgPct = Math.round(avg * 100);
                const donutColors = ["#ff4757", "#ffa502", "#00d4aa", "#3b82f6", "#a855f7"];
                const r = 72, cx = 90, cy = 90, strokeW = 14;
                const circumference = 2 * Math.PI * r;
                let accum = 0;
                return (
                <div>
                  <div style={sectionLabel}>AI CONFIDENCE SCORES</div>
                  <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 20 }}>Pathology detection confidence · Gemini 2.5 Flash</div>

                  <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {/* ── Donut Chart ── */}
                    <div style={{ flex: "0 0 180px", textAlign: "center" }}>
                      <svg width="180" height="180" viewBox="0 0 180 180">
                        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} />
                        {scores.map((d, i) => {
                          const pct = d.value;
                          const segLen = (pct / (scores.reduce((s, x) => s + x.value, 0) || 1)) * circumference;
                          const offset = circumference - accum;
                          accum += segLen;
                          return <circle key={d.key} cx={cx} cy={cy} r={r} fill="none"
                            stroke={donutColors[i]} strokeWidth={strokeW}
                            strokeDasharray={`${segLen} ${circumference - segLen}`}
                            strokeDashoffset={offset}
                            style={{ filter: `drop-shadow(0 0 4px ${donutColors[i]}60)`, transition: "stroke-dasharray 1s ease-out" }}
                            transform={`rotate(-90 ${cx} ${cy})`} />;
                        })}
                        <text x={cx} y={cy - 6} textAnchor="middle" fill={C.text} fontSize="28" fontWeight="800" fontFamily="'Inter', sans-serif">{avgPct}%</text>
                        <text x={cx} y={cy + 14} textAnchor="middle" fill={C.muted} fontSize="9" fontWeight="600" fontFamily="'Courier New', monospace" letterSpacing="1">AVG RISK</text>
                      </svg>
                      {/* Legend */}
                      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 8 }}>
                        {scores.map((d, i) => (
                          <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: C.muted }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: donutColors[i], flexShrink: 0 }} />
                            <span style={{ textTransform: "capitalize" }}>{d.key}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Vertical Bar Graph ── */}
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 0, height: 200, padding: "0 8px" }}>
                        {scores.map((d, i) => {
                          const pct = Math.round(d.value * 100);
                          const h = Math.max(pct * 1.7, 4);
                          return (
                            <div key={d.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                              {/* Value label */}
                              <span style={{ fontSize: 11, fontWeight: 700, color: donutColors[i], fontFamily: "'Courier New', monospace" }}>{pct}%</span>
                              {/* Bar */}
                              <div style={{ width: "60%", maxWidth: 36, height: h, borderRadius: "6px 6px 2px 2px", background: `linear-gradient(180deg, ${donutColors[i]}, ${donutColors[i]}88)`, transition: "height 1.2s ease-out", boxShadow: `0 0 12px ${donutColors[i]}40`, position: "relative" }}>
                                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", borderRadius: "6px 6px 0 0", background: "linear-gradient(180deg, rgba(255,255,255,0.2), transparent)" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Baseline */}
                      <div style={{ height: 1, background: C.border, margin: "0 8px" }} />
                      {/* X-axis labels */}
                      <div style={{ display: "flex", gap: 0, marginTop: 6, padding: "0 8px" }}>
                        {scores.map((d, i) => (
                          <div key={d.key} style={{ flex: 1, textAlign: "center", fontSize: 9, color: C.muted, fontFamily: "'Courier New', monospace", textTransform: "uppercase", letterSpacing: 0.3, lineHeight: 1.3 }}>
                            {d.key.slice(0, 6)}{d.key.length > 6 ? "." : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: C.mutedDark, marginTop: 16, fontStyle: "italic" }}>Donut shows proportional risk distribution · Bars show individual pathology confidence.</div>
                </div>
                );
              })()}

              {/* TAB 2 — Lung Map */}
              {activeTab === 2 && (
                <div>
                  <div style={sectionLabel}>LUNG ZONE ANALYSIS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 400, margin: "16px auto 0" }}>
                    <div style={{ textAlign: "center", fontWeight: 700, fontSize: 11, color: C.muted, paddingBottom: 4, letterSpacing: 0.5, fontFamily: "'Courier New', monospace" }}>◀ LEFT LUNG</div>
                    <div style={{ textAlign: "center", fontWeight: 700, fontSize: 11, color: C.muted, paddingBottom: 4, letterSpacing: 0.5, fontFamily: "'Courier New', monospace" }}>RIGHT LUNG ▶</div>
                    {["upper", "middle", "lower"].flatMap((row) =>
                      ["left", "right"].map((side) => {
                        const key = `${row}_${side}`;
                        const status = report.lung_zones?.[key] || "clear";
                        const clr = zoneColor(status);
                        const isAffected = status !== "clear";
                        return (
                          <div key={key} style={{
                            padding: "16px 12px", borderRadius: 10,
                            background: `${clr}18`, border: `1.5px solid ${clr}40`,
                            textAlign: "center", transition: "all .3s",
                          }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}>{status === "clear" ? "✓" : "⚠"}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: clr, textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>{status}</div>
                            <div style={{ fontSize: 10, color: C.mutedDark, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{row} {side}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3 — Chatbot */}
              {activeTab === 3 && (
                <div style={{ display: "flex", flexDirection: "column", height: 480 }}>
                  <div style={sectionLabel}>AI REPORT ASSISTANT</div>
                  <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 12 }}>Ask questions about <em>this specific report</em>. Responses are grounded in your X-ray findings only.</div>

                  {/* Messages */}
                  <div style={{
                    flex: 1, overflowY: "auto", display: "flex", flexDirection: "column",
                    gap: 10, padding: "4px 0", marginBottom: 12,
                  }}>
                    {chatMessages.length === 0 && (
                      <div style={{ textAlign: "center", color: C.mutedDark, fontSize: 13, marginTop: 40 }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                        <div>Ask me anything about your X-ray report</div>
                        <div style={{ fontSize: 11, marginTop: 6, color: C.mutedDark }}>
                          e.g. "What does opacity mean?" · "Is this serious?" · "What should I do next?"
                        </div>
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} style={{
                        display: "flex",
                        justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                      }}>
                        <div style={{
                          maxWidth: "82%", padding: "10px 14px", borderRadius: 12,
                          fontSize: 13, lineHeight: 1.6,
                          ...(msg.role === "user"
                            ? { background: "rgba(0,212,170,0.12)", border: `1px solid ${C.tealBorder}`, color: C.text, borderBottomRightRadius: 4 }
                            : { background: C.surface2, border: `1px solid ${C.border}`, color: C.textSec, borderBottomLeftRadius: 4 }
                          ),
                        }}>
                          {msg.role === "model" && (
                            <div style={{ fontSize: 9, fontWeight: 700, color: C.teal, fontFamily: "'Courier New', monospace", marginBottom: 4, letterSpacing: 0.8 }}>MEDVLM AI</div>
                          )}
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div style={{ display: "flex", gap: 5, padding: "10px 14px" }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.teal, animation: `blink 1.2s ease-in-out ${i*0.2}s infinite` }} />
                        ))}
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
                      placeholder="Ask about your report..."
                      disabled={chatLoading}
                      style={{
                        flex: 1, height: 40, borderRadius: 8,
                        border: `1px solid ${C.tealBorder}`,
                        background: C.surface2, color: C.text,
                        padding: "0 14px", fontSize: 13,
                        fontFamily: font, outline: "none",
                      }}
                    />
                    <button
                      onClick={sendChat}
                      disabled={!chatInput.trim() || chatLoading}
                      style={{
                        height: 40, padding: "0 16px", borderRadius: 8, border: "none",
                        background: (!chatInput.trim() || chatLoading) ? C.surface3 : `linear-gradient(135deg, #00d4aa, #0099cc)`,
                        color: (!chatInput.trim() || chatLoading) ? C.mutedDark : C.bg,
                        fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font,
                      }}
                    >Send</button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Right panel: empty state OR pipeline animation */}
        {!report && !showResults && (
          <div style={{ flex: 1, minWidth: 360, display: "flex", alignItems: "center", justifyContent: "center", ...card, minHeight: 400, textAlign: "center", borderStyle: pipelineActive ? "solid" : "dashed", borderColor: pipelineActive ? C.tealBorder : C.border, boxShadow: pipelineActive ? '0 0 20px rgba(0,212,170,0.08)' : card.boxShadow, transition: "all .4s" }}>
            {pipelineActive ? (
              /* ── Pipeline Animation ── */
              <div style={{ width: "100%", maxWidth: 400, textAlign: "left", padding: "8px 16px" }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase",
                  color: pipelineDone ? C.green : C.teal, marginBottom: 20,
                  fontFamily: "'Courier New', monospace",
                }}>
                  {pipelineDone ? "✅ ANALYSIS COMPLETE" : "⚡ GEMINI PIPELINE"}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {steps.map((step, idx) => (
                    <div key={step.id} style={{ display: "flex", alignItems: "stretch", minHeight: 44 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32, flexShrink: 0 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%", display: "flex",
                          alignItems: "center", justifyContent: "center", flexShrink: 0,
                          ...(step.state === "pending" ? { border: `2px solid rgba(255,255,255,0.1)`, background: "transparent" } : {}),
                          ...(step.state === "active" ? { border: `2px solid ${C.teal}`, background: C.tealDim, animation: "medvlm-spin 1s linear infinite" } : {}),
                          ...(step.state === "done" ? { background: C.green, border: "none" } : {}),
                        }}>
                          {step.state === "active" && (
                            <svg width="16" height="16" viewBox="0 0 14 14">
                              <path d="M7 1 A6 6 0 0 1 13 7" stroke={C.teal} strokeWidth="2" fill="none" strokeLinecap="round" />
                            </svg>
                          )}
                          {step.state === "done" && (
                            <svg width="16" height="16" viewBox="0 0 14 14">
                              <path d="M3 7 L6 10 L11 4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        {idx < steps.length - 1 && (
                          <div style={{
                            width: 2, flex: 1, minHeight: 10,
                            background: step.state === "done" ? C.teal : C.border,
                            transition: "background .3s",
                          }} />
                        )}
                      </div>
                      <div style={{
                        flex: 1, display: "flex", alignItems: "center", marginLeft: 14,
                        padding: "4px 10px", borderRadius: 8,
                        opacity: step.state === "pending" ? 0.35 : 1,
                        transition: "opacity .3s, background .3s",
                        ...(step.state === "active" ? { animation: "medvlm-pulse 2s ease-in-out infinite", borderLeft: `2px solid ${C.teal}` } : {}),
                        ...(step.state === "done" ? { borderLeft: `2px solid rgba(46,213,115,0.2)` } : {}),
                      }}>
                        <span style={{
                          fontSize: 15, fontFamily: font,
                          ...(step.state === "pending" ? { color: C.mutedDark } : {}),
                          ...(step.state === "active" ? { color: C.teal, fontWeight: 600 } : {}),
                          ...(step.state === "done" ? { color: C.muted, fontWeight: 500 } : {}),
                        }}>{step.label}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20 }}>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #00d4aa, #0099cc)",
                      width: `${progressPct}%`, transition: "width .15s linear",
                      boxShadow: "0 0 10px rgba(0,212,170,0.5)",
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: C.teal, marginTop: 10, fontFamily: "'Courier New', monospace", letterSpacing: 0.5 }}>
                    EST. REMAINING: {countdown}s
                  </div>
                </div>

                {/* Live Gemini stream output */}
                {streamedText && (
                  <div style={{
                    marginTop: 16, padding: "10px 12px", borderRadius: 8,
                    background: "rgba(0,0,0,0.3)", border: `1px solid ${C.tealBorder}`,
                    maxHeight: 110, overflowY: "hidden", position: "relative",
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.teal, letterSpacing: 1.2, fontFamily: "'Courier New', monospace", marginBottom: 4 }}>⚡ LIVE OUTPUT</div>
                    <div style={{ fontSize: 10, color: "rgba(0,212,170,0.7)", fontFamily: "'Courier New', monospace", lineHeight: 1.6, wordBreak: "break-all" }}>
                      {streamedText}
                      <span style={{ display: "inline-block", width: 7, height: 11, background: C.teal, marginLeft: 2, animation: "blink 0.8s step-end infinite", verticalAlign: "middle" }} />
                    </div>
                    {/* fade mask at bottom */}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 30, background: "linear-gradient(transparent, rgba(10,15,26,0.9))", borderRadius: "0 0 8px 8px" }} />
                  </div>
                )}
              </div>
            ) : loading && !pipelineActive ? (
              /* ── Loading Skeleton ── */
              <div style={{ width: "100%", padding: "16px 0", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.teal, letterSpacing: 1.4, fontFamily: "'Courier New', monospace", marginBottom: 4 }}>⟳ INITIALIZING ANALYSIS...</div>
                <div className="skeleton" style={{ height: 80 }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <div className="skeleton" style={{ height: 20, flex: 2 }} />
                  <div className="skeleton" style={{ height: 20, flex: 1 }} />
                </div>
                <div className="skeleton" style={{ height: 60 }} />
                <div className="skeleton" style={{ height: 60 }} />
                <div className="skeleton" style={{ height: 60 }} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 30, width: 100, borderRadius: 20 }} />)}
                </div>
              </div>
            ) : (
              /* ── Empty State ── */
              <div>
                <img src="/medvlm-logo.png" alt="MedVLM" style={{ width: 64, height: 64, marginBottom: 16, opacity: 0.2, filter: "grayscale(0.5)" }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: C.mutedDark }}>Upload & analyze an X-ray to view results</div>
                <div style={{ fontSize: 12, color: C.mutedDark, marginTop: 8, fontFamily: "'Courier New', monospace" }}>Gemini 2.5 Flash · Multimodal Foundation Model</div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* CSS Animations */}
      <style>{`
        @keyframes medvlm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes medvlm-pulse { 0%, 100% { background-color: rgba(0,212,170,0.04); } 50% { background-color: rgba(0,212,170,0.09); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 8px rgba(255,71,87,0.2); } 50% { box-shadow: 0 0 20px rgba(255,71,87,0.5); } }
        @keyframes shimmer { 0% { transform: translateX(-50%); } 100% { transform: translateX(50%); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>

    </div>
  );
}

/* ── Section helper ──────────────────────────────────────────────────────── */
function Section({ icon, label, badge, text }) {
  return (
    <div style={{
      background: C.surface2, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${C.tealBorder}`, borderRadius: 10,
      padding: "14px 16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ ...sectionLabel, marginBottom: 0 }}>{icon && `${icon} `}{label}</div>
        {badge && <span style={{ fontSize: 9, fontWeight: 700, color: C.teal, fontFamily: "'Courier New', monospace", letterSpacing: 0.8, background: C.tealDim, padding: "2px 7px", borderRadius: 4, border: `1px solid ${C.tealBorder}` }}>{badge}</span>}
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.8, color: C.textSec, margin: 0 }}>{text || "N/A"}</p>
    </div>
  );
}
