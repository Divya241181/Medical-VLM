import { useState, useEffect, useRef } from "react";
import XRayAnalyzer from "./XRayAnalyzer";
import useReportHistory from "./hooks/useReportHistory";
import HistoryPanel from "./components/HistoryPanel";
import DisclaimerModal from "./components/DisclaimerModal";
import ResearchMetricsModal from "./components/ResearchMetricsModal";
import LandingPage from "./components/LandingPage";
import AuthModal from "./components/AuthModal";
import { AuthProvider, useAuth } from "./context/AuthContext";
import medvlmLogo from "./assets/medvlm-logo.png";
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
  UserCheck,
  ChevronDown,
  LogOut,
  UserPlus,
  Home,
  Award,
  Building,
  ShieldCheck,
} from "lucide-react";

function AppContent() {
  const { history, saveReport, deleteReport, clearHistory } = useReportHistory();
  const { user, openAuthModal, logout } = useAuth();

  // Navigation View: "landing" | "studio"
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== "undefined" && window.location.hash === "#studio") {
      return "studio";
    }
    return "landing";
  });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Sync hash changes with view state
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#studio") {
        setCurrentView("studio");
      } else {
        setCurrentView("landing");
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Close doctor menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hide the initial HTML loading screen once React mounts
  useEffect(() => {
    if (typeof window.__hideLoader === "function") {
      window.__hideLoader();
    }
  }, []);

  const navigateTo = (view) => {
    setCurrentView(view);
    window.location.hash = view === "studio" ? "#studio" : "#landing";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Research & Validation Metrics Modal (Capstone Evaluation) */}
      <ResearchMetricsModal isOpen={metricsOpen} onClose={() => setMetricsOpen(false)} />

      {/* Safety & Compliance Modal */}
      <DisclaimerModal forceOpen={disclaimerOpen} onForceClose={() => setDisclaimerOpen(false)} />

      {/* Clinician Authentication Modal (Login / Signup / Personas) */}
      <AuthModal onAuthSuccess={() => navigateTo("studio")} />

      {/* View 1: Clinical Landing Page */}
      {currentView === "landing" ? (
        <LandingPage
          onLaunchStudio={() => navigateTo("studio")}
          onOpenMetrics={() => setMetricsOpen(true)}
        />
      ) : (
        /* View 2: Full Clinical Diagnostic Studio */
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          {/* Clinical Radiologist Masthead */}
          <header className="mvlm-header">
            {/* Left: Brand Identity & Navigation */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                onClick={() => navigateTo("landing")}
                title="Return to Landing Page"
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "10px",
                    background: "#090d16",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 16px rgba(6, 182, 212, 0.4)",
                    border: "1px solid rgba(6, 182, 212, 0.3)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={medvlmLogo}
                    alt="MedVLM Logo"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
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

              {/* Home / Overview Shortcut */}
              <button
                onClick={() => navigateTo("landing")}
                className="mvlm-btn-secondary mvlm-hide-mobile"
                title="Return to Product Overview & Showcase"
                style={{ padding: "6px 12px", fontSize: 12, borderRadius: 20 }}
              >
                <Home size={13} color="var(--color-cyan)" />
                <span>Overview</span>
              </button>

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

            {/* Right: Clinician Identity, Research Metrics, Archive */}
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

              {/* Authenticated Doctor Profile Widget */}
              <div style={{ position: "relative" }} ref={userMenuRef}>
                {user ? (
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="mvlm-btn-secondary"
                    style={{
                      padding: "5px 10px 5px 6px",
                      background: "rgba(15, 23, 42, 0.9)",
                      borderColor: "rgba(6, 182, 212, 0.35)",
                      borderRadius: "24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: user.color || "#06b6d4",
                        color: "#040711",
                        fontSize: 11,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {user.avatarInitials || "MD"}
                    </div>

                    <div style={{ textAlign: "left", lineHeight: 1.15 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#f8fafc",
                          maxWidth: 120,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {user.name}
                      </div>
                      <div
                        className="mvlm-hide-mobile"
                        style={{
                          fontSize: 10,
                          color: "var(--color-cyan)",
                          fontWeight: 600,
                        }}
                      >
                        {user.role}
                      </div>
                    </div>

                    <ChevronDown size={13} color="#94a3b8" />
                  </button>
                ) : (
                  <button
                    onClick={() => openAuthModal("signin")}
                    className="mvlm-btn-primary"
                    style={{ padding: "7px 12px", fontSize: 12 }}
                  >
                    <UserCheck size={14} />
                    <span>Sign In</span>
                  </button>
                )}

                {/* Dropdown Menu */}
                {user && userMenuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      width: 270,
                      background: "#0c1424",
                      border: "1px solid rgba(6, 182, 212, 0.3)",
                      borderRadius: 14,
                      boxShadow: "0 15px 35px rgba(0, 0, 0, 0.65), 0 0 20px rgba(6, 182, 212, 0.15)",
                      padding: "16px",
                      zIndex: 200,
                      animation: "mvlmSlideUp 0.15s ease",
                    }}
                  >
                    {/* Clinician Card Summary */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: user.color || "#06b6d4",
                          color: "#040711",
                          fontSize: 15,
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {user.avatarInitials || "MD"}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f8fafc" }}>
                          {user.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{user.role}</div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "10px",
                        background: "rgba(15, 23, 42, 0.7)",
                        borderRadius: 8,
                        fontSize: 11,
                        color: "#cbd5e1",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        marginBottom: 14,
                        border: "1px solid rgba(148, 163, 184, 0.1)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Building size={12} color="var(--color-cyan)" />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {user.institution || "Stanford Medical Imaging"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Award size={12} color="#10b981" />
                        <span>License: {user.license || "RAD-CA-409182"}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          openAuthModal("personas");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 6,
                          background: "transparent",
                          border: "none",
                          color: "#cbd5e1",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(6, 182, 212, 0.12)";
                          e.currentTarget.style.color = "#06b6d4";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#cbd5e1";
                        }}
                      >
                        <Sparkles size={14} />
                        <span>Switch Clinician Persona</span>
                      </button>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          openAuthModal("signup");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 6,
                          background: "transparent",
                          border: "none",
                          color: "#cbd5e1",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(6, 182, 212, 0.12)";
                          e.currentTarget.style.color = "#06b6d4";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#cbd5e1";
                        }}
                      >
                        <UserPlus size={14} />
                        <span>Register New Doctor</span>
                      </button>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigateTo("landing");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 6,
                          background: "transparent",
                          border: "none",
                          color: "#cbd5e1",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(6, 182, 212, 0.12)";
                          e.currentTarget.style.color = "#06b6d4";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#cbd5e1";
                        }}
                      >
                        <Home size={14} />
                        <span>Product Landing Page</span>
                      </button>

                      <div style={{ height: 1, background: "rgba(148, 163, 184, 0.12)", margin: "4px 0" }} />

                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 6,
                          background: "transparent",
                          border: "none",
                          color: "#f87171",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
      )}

      {/* History Slide-over Drawer */}
      <HistoryPanel
        history={history}
        onSelectReport={(entry) => {
          setSelectedReport(entry);
          setHistoryOpen(false);
          navigateTo("studio");
        }}
        onDeleteReport={deleteReport}
        onClearHistory={clearHistory}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
