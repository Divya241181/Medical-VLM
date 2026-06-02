import { useState } from "react";
import XRayAnalyzer from "./XRayAnalyzer";
import useReportHistory from "./hooks/useReportHistory";
import HistoryPanel from "./components/HistoryPanel";

export default function App() {
  const { history, saveReport, deleteReport, clearHistory } = useReportHistory();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  return (
    <>
      {/* Global styles + font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0f1a; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0f1a; }
        ::-webkit-scrollbar-thumb { background: rgba(0,212,170,0.4); border-radius: 2px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#0a0f1a",
        backgroundImage: "linear-gradient(rgba(0,212,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        color: "#f1f5f9",
      }}>
        {/* Navbar */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 32px", height: 56,
          background: "rgba(10, 15, 26, 0.95)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          {/* Left — Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/medvlm-logo.png"
              alt="MedVLM"
              style={{
                width: 34, height: 34, borderRadius: 8, objectFit: "contain",
                filter: "drop-shadow(0 0 6px rgba(0,212,170,0.4))",
              }}
            />
            <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
              MedVLM<sup style={{ fontSize: 10, color: "#00d4aa", fontWeight: 700, marginLeft: 1 }}>7B</sup>
            </span>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />
            <span style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>Radiology AI</span>
          </div>

          {/* Right — Status pills + History button */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 20,
              background: "rgba(46,213,115,0.1)", border: "1px solid rgba(46,213,115,0.25)",
              fontSize: 11, fontWeight: 600, color: "#2ed573", letterSpacing: 0.3,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ed573", animation: "blink 1.5s ease-in-out infinite" }} />
              LIVE
            </div>

            <div style={{
              padding: "5px 12px", borderRadius: 20,
              border: "1px solid rgba(0,212,170,0.3)", background: "transparent",
              fontSize: 11, fontWeight: 600, color: "#00d4aa", letterSpacing: 0.3,
            }}>MedVLM-7B v2.1</div>
            <div style={{
              padding: "5px 12px", borderRadius: 20,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: 0.3,
            }}>94.3% ACC</div>

            {/* Separator */}
            <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.1)", margin: "0 2px" }} />

            {/* History Button — distinct interactive style */}
            <button
              onClick={() => setHistoryOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "6px 16px", borderRadius: 8,
                background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.25)",
                color: "#00d4aa", fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "'Inter', system-ui, sans-serif", transition: "all .2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,212,170,0.15)"; e.currentTarget.style.borderColor = "rgba(0,212,170,0.5)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(0,212,170,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,212,170,0.08)"; e.currentTarget.style.borderColor = "rgba(0,212,170,0.25)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              🕐 History
              {history.length > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#fff", background: "#00d4aa",
                  padding: "1px 7px", borderRadius: 10, minWidth: 18, textAlign: "center",
                }}>{history.length}</span>
              )}
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <XRayAnalyzer
          onReportSaved={saveReport}
          selectedReport={selectedReport}
          onClearSelectedReport={() => setSelectedReport(null)}
        />
      </div>

      {/* History Panel */}
      <HistoryPanel
        history={history}
        onSelectReport={(entry) => { setSelectedReport(entry); setHistoryOpen(false); }}
        onDeleteReport={deleteReport}
        onClearHistory={clearHistory}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
