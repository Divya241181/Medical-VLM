import { useState, useRef, useEffect } from "react";

const C = {
  teal: "#00d4aa",
  tealDim: "rgba(0,212,170,0.15)",
  surface1: "#111827",
  surface2: "#1a2235",
  border: "rgba(255,255,255,0.08)",
  text: "#f1f5f9",
  textSec: "#cbd5e1",
  muted: "#94a3b8",
};

const PROMPT_SUGGESTIONS = [
  "Explain the primary pathology finding",
  "Are there signs of pneumonia or consolidation?",
  "What follow-up imaging is recommended?",
  "Explain this in simple terms for the patient",
];

const LANG_VOICES = {
  English: "en-US",
  Gujarati: "gu-IN",
  Hindi: "hi-IN",
  Marathi: "mr-IN",
};

export default function ClinicalChatDrawer({
  isOpen,
  onClose,
  report,
}) {
  const [messages, setMessages] = useState([
    {
      role: "model",
      text: "Hello, I am your MedVLM Clinical Assistant. I can answer questions regarding this radiograph study, pathology scores, or recommended workup. How can I assist you?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("English");
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg = { role: "user", text: query };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput("");
    setLoading(true);

    try {
      const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_context: report || {},
          conversation_history: updatedHistory.slice(1).map((m) => ({
            role: m.role === "model" ? "model" : "user",
            text: m.text,
          })),
          user_message: query,
          language: language,
        }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "model", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "Error communicating with AI service: " + err.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = (text, idx) => {
    if (!window.speechSynthesis) return;
    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = LANG_VOICES[language] || "en-US";
    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)",
      zIndex: 1000,
      display: "flex",
      justifyContent: "flex-end",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 480,
        height: "100%",
        background: C.surface1,
        borderLeft: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-8px 0 30px rgba(0,0,0,0.5)",
      }}>
        {/* Top Bar */}
        <div style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: C.surface2,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>💬</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: C.text, fontWeight: 700 }}>
                Clinical AI Copilot
              </h3>
              <span style={{ fontSize: 11, color: C.teal }}>Grounded in current study report</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                background: C.surface1,
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: 11,
              }}
            >
              <option value="English">English</option>
              <option value="Gujarati">ગુજરાતી</option>
              <option value="Hindi">हिंदी</option>
              <option value="Marathi">मराठी</option>
            </select>

            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: C.muted,
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div
                key={idx}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{
                  padding: "10px 14px",
                  borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: isUser ? C.teal : C.surface2,
                  color: isUser ? "#000" : C.text,
                  fontSize: 13,
                  lineHeight: 1.5,
                  fontWeight: isUser ? 600 : 400,
                  whiteSpace: "pre-wrap",
                  border: isUser ? "none" : `1px solid ${C.border}`,
                }}>
                  {m.text}
                </div>

                {!isUser && (
                  <div style={{ display: "flex", gap: 8, paddingLeft: 4 }}>
                    <button
                      onClick={() => handleSpeak(m.text, idx)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: speakingIdx === idx ? C.teal : C.muted,
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {speakingIdx === idx ? "⏹ Stop Audio" : "🔊 Listen"}
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(m.text)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: C.muted,
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div style={{
              alignSelf: "flex-start",
              padding: "10px 14px",
              borderRadius: "12px 12px 12px 2px",
              background: C.surface2,
              color: C.teal,
              fontSize: 12,
              border: `1px solid ${C.border}`,
            }}>
              Analyzing findings & reasoning...
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Quick Suggested Prompts */}
        <div style={{ padding: "8px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 6, overflowX: "auto" }}>
          {PROMPT_SUGGESTIONS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p)}
              disabled={loading}
              style={{
                whiteSpace: "nowrap",
                fontSize: 10,
                padding: "4px 8px",
                borderRadius: 12,
                background: C.surface2,
                border: `1px solid ${C.border}`,
                color: C.muted,
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div style={{
          padding: 14,
          borderTop: `1px solid ${C.border}`,
          background: C.surface2,
          display: "flex",
          gap: 8,
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question about this radiograph..."
            disabled={loading}
            style={{
              flex: 1,
              padding: "9px 12px",
              borderRadius: 8,
              background: C.surface1,
              border: `1px solid ${C.border}`,
              color: C.text,
              fontSize: 13,
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            style={{
              padding: "9px 16px",
              borderRadius: 8,
              background: C.teal,
              color: "#000",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
