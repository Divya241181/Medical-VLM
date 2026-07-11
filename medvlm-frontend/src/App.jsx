import { useState, useEffect } from "react";
import XRayAnalyzer from "./XRayAnalyzer";
import useReportHistory from "./hooks/useReportHistory";
import HistoryPanel from "./components/HistoryPanel";
import DisclaimerModal from "./components/DisclaimerModal";

export default function App() {
  const { history, saveReport, deleteReport, clearHistory } = useReportHistory();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Hide the HTML loading screen once React has mounted
  useEffect(() => {
    if (typeof window.__hideLoader === "function") window.__hideLoader();
  }, []);

  return (
    <>
      <DisclaimerModal />

      {/* Global styles + responsive CSS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0f1a; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0f1a; }
        ::-webkit-scrollbar-thumb { background: rgba(0,212,170,0.4); border-radius: 2px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        /* ── Mobile responsive overrides ── */
        @media (max-width: 768px) {
          .mvlm-nav-pills { display: none !important; }
          .mvlm-nav-sep  { display: none !important; }
          .mvlm-main-grid { flex-direction: column !important; padding: 12px !important; gap: 14px !important; }
          .mvlm-left-col { flex: unset !important; min-width: unset !important; max-width: 100% !important; width: 100% !important; }
          .mvlm-right-col { min-width: unset !important; width: 100% !important; }
          .mvlm-upload-zone { min-height: 200px !important; }
          .mvlm-tab-btn { font-size: 11px !important; padding: 10px 0 !important; }
          .mvlm-confidence-row { flex-direction: column !important; }
          .mvlm-donut-wrap { flex: unset !important; width: 100% !important; }
          .mvlm-navbar { padding: 0 16px !important; }
          .mvlm-brand-sub { display: none !important; }
        }

        @media (max-width: 480px) {
          .mvlm-navbar { height: 48px !important; }
          .mvlm-hist-btn span:last-child { display: none; }
        }

        /* ── Skeleton shimmer ── */
        @keyframes skeleton-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #1a2235 25%, #1e2d40 50%, #1a2235 75%);
          background-size: 400px 100%;
          animation: skeleton-shimmer 1.4s ease infinite;
          border-radius: 8px;
        }
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
        <nav className="mvlm-navbar" style={{
          position: "sticky", top: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 32px", height: 56,
          background: "rgba(10, 15, 26, 0.95)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          {/* Left — Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/medvlm-logo.png" alt="MedVLM" style={{
              width: 34, height: 34, borderRadius: 8, objectFit: "contain",
              filter: "drop-shadow(0 0 6px rgba(0,212,170,0.4))",
            }} />
            <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
              MedVLM<sup style={{ fontSize: 10, color: "#00d4aa", fontWeight: 700, marginLeft: 1 }}>7B</sup>
            </span>
            <div className="mvlm-brand-sub" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />
              <span style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>Radiology AI</span>
            </div>
          </div>

          {/* Right — Status pills + History */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="mvlm-nav-pills" style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 20,
              background: "rgba(46,213,115,0.1)", border: "1px solid rgba(46,213,115,0.25)",
              fontSize: 11, fontWeight: 600, color: "#2ed573", letterSpacing: 0.3,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2ed573", animation: "blink 1.5s ease-in-out infinite" }} />
              LIVE
            </div>

            <div className="mvlm-nav-pills" style={{
              padding: "5px 12px", borderRadius: 20,
              border: "1px solid rgba(0,212,170,0.3)", background: "transparent",
              fontSize: 11, fontWeight: 600, color: "#00d4aa", letterSpacing: 0.3,
            }}>MedVLM-7B v2.1</div>

            <div className="mvlm-nav-pills" style={{
              padding: "5px 12px", borderRadius: 20,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: 0.3,
            }}>94.3% ACC</div>

            <div className="mvlm-nav-sep" style={{ width: 1, height: 22, background: "rgba(255,255,255,0.1)", margin: "0 2px" }} />

            <button
              className="mvlm-hist-btn"
              onClick={() => setHistoryOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "6px 16px", borderRadius: 8,
                background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.25)",
                color: "#00d4aa", fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "'Inter', system-ui, sans-serif", transition: "all .2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,212,170,0.15)"; e.currentTarget.style.borderColor = "rgba(0,212,170,0.5)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(0,212,170,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,212,170,0.08)"; e.currentTarget.style.borderColor = "rgba(0,212,170,0.25)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              🕐 <span>History</span>
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
        onSelectReport={entry => { setSelectedReport(entry); setHistoryOpen(false); }}
        onDeleteReport={deleteReport}
        onClearHistory={clearHistory}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
