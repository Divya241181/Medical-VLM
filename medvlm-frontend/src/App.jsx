import { useState, useEffect } from "react";
import XRayAnalyzer from "./XRayAnalyzer";
import useReportHistory from "./hooks/useReportHistory";
import HistoryPanel from "./components/HistoryPanel";
import DisclaimerModal from "./components/DisclaimerModal";
import ResearchMetricsModal from "./components/ResearchMetricsModal";
import {
  Activity,
  Clock,
  ShieldAlert,
  Sliders,
  Layers,
  Sparkles,
  HelpCircle,
  Database,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

export default function App() {
  const { history, saveReport, deleteReport, clearHistory } = useReportHistory();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Hide the initial HTML loading screen once React mounts
  useEffect(() => {
    if (typeof window.__hideLoader === "function") {
      window.__hideLoader();
    }
  }, []);

  return (
    <>
      {/* Research & Validation Metrics Modal (Capstone Evaluation) */}
      <ResearchMetricsModal isOpen={metricsOpen} onClose={() => setMetricsOpen(false)} />

      {/* Safety & Compliance Modal */}
      <DisclaimerModal forceOpen={disclaimerOpen} onForceClose={() => setDisclaimerOpen(false)} />

      {/* Main Studio Shell */}
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Clinical Radiologist Masthead */}
        <header className="mvlm-header">
          {/* Left: Brand Identity & Clinical Context */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #06b6d4, #0284c7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 16px rgba(6, 182, 212, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Activity size={22} color="#ffffff" strokeWidth={2.4} />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: "#f8fafc",
                      fontFamily: "var(--font-display)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    MedVLM <span style={{ color: "var(--color-cyan)" }}>Studio</span>
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      background: "rgba(6, 182, 212, 0.12)",
                      color: "var(--color-cyan)",
                      border: "1px solid rgba(6, 182, 212, 0.28)",
                      padding: "2px 7px",
                      borderRadius: "6px",
                    }}
                  >
                    v4.2 CDS
                  </span>
                </div>
                <div
                  className="mvlm-hide-mobile"
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-muted)",
                    fontWeight: 500,
                    letterSpacing: "0.01em",
                  }}
                >
                  Clinical Multi-Agent Radiology Workstation
                </div>
              </div>
            </div>

            <div
              className="mvlm-hide-mobile"
              style={{ width: 1, height: 22, background: "rgba(148, 163, 184, 0.15)", margin: "0 4px" }}
            />

            {/* PACS Integration Indicator */}
            <div
              className="mvlm-hide-mobile"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: "20px",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(148, 163, 184, 0.12)",
                fontSize: 11.5,
                color: "var(--text-muted)",
              }}
            >
              <Database size={13} color="var(--color-cyan)" />
              <span>DICOM / PACS Active</span>
            </div>
          </div>

          {/* Right: AI Engine Status, Safety & Archive Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Live Model Stack Pill */}
            <div
              className="mvlm-hide-mobile"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: "30px",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                fontSize: 12,
                fontWeight: 600,
                color: "#34d399",
              }}
            >
              <span className="mvlm-status-dot active" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
                DenseNet-121 + Gemini 3.8 Flash
              </span>
            </div>

            {/* Research & Validation Metrics Trigger */}
            <button
              onClick={() => setMetricsOpen(true)}
              title="Academic Research, AUROC & Ablation Metrics"
              className="mvlm-btn-secondary"
              style={{
                padding: "7px 11px",
                borderColor: "rgba(6, 182, 212, 0.4)",
                background: "rgba(6, 182, 212, 0.08)",
              }}
            >
              <BarChart3 size={14} color="var(--color-cyan)" />
              <span><span className="mvlm-hide-mobile">Research </span>Metrics</span>
            </button>

            {/* Clinical Safety Notice Trigger */}
            <button
              onClick={() => setDisclaimerOpen(true)}
              title="Clinical Guidelines & Safety Notice"
              className="mvlm-btn-secondary"
              style={{ padding: "7px 11px" }}
            >
              <ShieldAlert size={14} color="var(--color-cyan)" />
              <span className="mvlm-hide-mobile">Safety</span>
            </button>

            {/* Studies History Trigger */}
            <button
              onClick={() => setHistoryOpen(true)}
              className="mvlm-btn-secondary"
              style={{
                borderColor: history.length > 0 ? "rgba(6, 182, 212, 0.3)" : undefined,
                padding: "7px 11px",
              }}
            >
              <Clock size={14} color="var(--color-cyan)" />
              <span><span className="mvlm-hide-mobile">Studies </span>Archive</span>
              {history.length > 0 && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: "#080c16",
                    background: "var(--color-cyan)",
                    padding: "1px 7px",
                    borderRadius: "10px",
                    marginLeft: 2,
                  }}
                >
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Main Clinical Diagnostic Workspace */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <XRayAnalyzer
            onReportSaved={saveReport}
            selectedReport={selectedReport}
            onClearSelectedReport={() => setSelectedReport(null)}
          />
        </main>

        {/* Sleek Clinical Footer */}
        <footer className="mvlm-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span>MedVLM Clinical Decision Support Architecture</span>
            <span style={{ color: "rgba(148, 163, 184, 0.2)" }}>•</span>
            <span>TorchXRayVision DenseNet-121</span>
            <span style={{ color: "rgba(148, 163, 184, 0.2)" }}>•</span>
            <span>Gemini Multimodal Reasoning</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <CheckCircle2 size={12} color="#10b981" />
              Human-in-the-Loop Verification Required
            </span>
          </div>
        </footer>
      </div>

      {/* History Slide-over Drawer */}
      <HistoryPanel
        history={history}
        onSelectReport={(entry) => {
          setSelectedReport(entry);
          setHistoryOpen(false);
        }}
        onDeleteReport={deleteReport}
        onClearHistory={clearHistory}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
