import { useEffect, useState } from "react";
import { ShieldAlert, AlertTriangle, CheckCircle2, X, Activity } from "lucide-react";

const STORAGE_KEY = "medvlm_disclaimer_accepted";

export default function DisclaimerModal({ forceOpen, onForceClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) setVisible(true);
  }, []);

  const isOpen = forceOpen !== undefined ? forceOpen : visible;

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    if (onForceClose) onForceClose();
  };

  if (!isOpen) return null;

  return (
    <div className="mvlm-modal-backdrop">
      <div className="mvlm-glass-panel mvlm-modal-box">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "12px",
                background: "rgba(6, 182, 212, 0.12)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-cyan)",
                boxShadow: "0 0 16px rgba(6, 182, 212, 0.2)",
              }}
            >
              <ShieldAlert size={24} />
            </div>

            <div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#f8fafc",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                Clinical Reference & Safety Notice
              </h3>
              <span
                style={{
                  fontSize: 10.5,
                  color: "var(--color-cyan)",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  display: "block",
                  marginTop: 2,
                }}
              >
                CLINICAL DECISION SUPPORT GOVERNANCE
              </span>
            </div>
          </div>

          {forceOpen && (
            <button
              onClick={onForceClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Warning Callout */}
        <div
          style={{
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "8px",
            padding: "10px 14px",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 12.5, color: "#fcd34d", fontWeight: 500, lineHeight: 1.5 }}>
            This system operates strictly as an <strong>investigational Clinical Decision Support (CDS) aid</strong>.
          </p>
        </div>

        {/* Bullet Points */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "MedVLM combines TorchXRayVision DenseNet-121 neural classifiers with Gemini multimodal reasoning models.",
            "Predictions are algorithmic aids and must never replace clinical judgment by a licensed, certified radiologist.",
            "All findings, differential probabilities, and ICD-10 suggestions require mandatory clinical correlation prior to patient management.",
            "By continuing, you acknowledge active human-in-the-loop validation of all diagnostic assertions.",
          ].map((text, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <CheckCircle2 size={15} color="var(--color-cyan)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {text}
              </p>
            </div>
          ))}
        </div>

        {/* Accept Button */}
        <button
          onClick={accept}
          className="mvlm-btn-primary"
          style={{ width: "100%", height: 46, fontSize: 13.5, marginTop: 4 }}
        >
          <Activity size={16} />
          <span>Acknowledge & Access Clinical Workstation</span>
        </button>

        <p
          style={{
            margin: 0,
            textAlign: "center",
            fontSize: 11,
            color: "var(--text-dim)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Compliance confirmation is recorded locally for this session.
        </p>
      </div>
    </div>
  );
}
