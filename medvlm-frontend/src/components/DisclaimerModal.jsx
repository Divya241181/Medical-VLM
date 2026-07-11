import { useEffect, useState } from "react";

const STORAGE_KEY = "medvlm_disclaimer_accepted";

export default function DisclaimerModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.82)",
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.1)",
        borderTop: "3px solid #00d4aa",
        borderRadius: 16,
        padding: "36px 40px",
        maxWidth: 520,
        width: "100%",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(0,212,170,0.08)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {/* Icon + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "rgba(0,212,170,0.12)",
            border: "1px solid rgba(0,212,170,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, flexShrink: 0,
          }}>⚕️</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", letterSpacing: -0.3 }}>
              Medical Disclaimer
            </div>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, marginTop: 2, letterSpacing: 0.5 }}>
              PLEASE READ BEFORE CONTINUING
            </div>
          </div>
        </div>

        {/* Warning badge */}
        <div style={{
          background: "rgba(255,165,2,0.08)",
          border: "1px solid rgba(255,165,2,0.25)",
          borderRadius: 8, padding: "10px 14px",
          marginBottom: 20,
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 13, color: "#fbbf24", fontWeight: 600, lineHeight: 1.5 }}>
            This tool is for <strong>clinical reference and educational purposes only</strong>.
          </p>
        </div>

        {/* Body text */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          {[
            "MedVLM uses AI (Gemini 2.5 Flash) to analyze chest X-rays. Results are AI-generated and may contain errors.",
            "This tool is NOT a substitute for a licensed radiologist or physician. Do not make medical decisions based solely on this output.",
            "Always consult a qualified healthcare professional for diagnosis, treatment, or medical advice.",
            "By continuing, you confirm you understand this is an AI-assisted research tool, not a certified medical device.",
          ].map((text, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: "#00d4aa", fontSize: 14, flexShrink: 0, marginTop: 1 }}>›</span>
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{text}</p>
            </div>
          ))}
        </div>

        {/* Accept button */}
        <button
          onClick={accept}
          style={{
            width: "100%", height: 48, borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #00d4aa, #0099cc)",
            color: "#0a0f1a", fontSize: 14, fontWeight: 700,
            cursor: "pointer", letterSpacing: "0.06em",
            fontFamily: "'Inter', system-ui, sans-serif",
            boxShadow: "0 0 20px rgba(0,212,170,0.3)",
            transition: "all .2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 35px rgba(0,212,170,0.5)"; e.currentTarget.style.transform = "scale(1.01)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 20px rgba(0,212,170,0.3)"; e.currentTarget.style.transform = "scale(1)"; }}
        >
          I Understand — Continue to MedVLM
        </button>

        <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 10, color: "#334155", lineHeight: 1.5 }}>
          This notice is shown once. It will not appear again on this device.
        </p>
      </div>
    </div>
  );
}
