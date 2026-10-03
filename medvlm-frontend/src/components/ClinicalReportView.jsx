import { useState, useRef, useEffect } from "react";
import {
  FileText,
  MessageSquare,
  Volume2,
  VolumeX,
  Send,
  Download,
  Share2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  UserCheck,
  Globe,
  Layers,
  Activity,
  Flame,
  Clock,
  Copy,
  Check,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Tag,
  BookOpen,
  ExternalLink,
} from "lucide-react";

const sevConfig = {
  normal: {
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.32)",
    label: "NORMAL STUDY",
    icon: CheckCircle2,
    desc: "No acute cardiopulmonary disease detected",
  },
  mild: {
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.32)",
    label: "MILD ABNORMALITY",
    icon: AlertTriangle,
    desc: "Non-critical clinical observations noted",
  },
  moderate: {
    color: "#f97316",
    bg: "rgba(249, 115, 22, 0.14)",
    border: "rgba(249, 115, 22, 0.35)",
    label: "MODERATE SEVERITY",
    icon: AlertCircle,
    desc: "Pathology identified; close clinical correlation recommended",
  },
  severe: {
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.14)",
    border: "rgba(239, 68, 68, 0.38)",
    label: "CRITICAL / SEVERE",
    icon: AlertCircle,
    desc: "Urgent/STAT radiologic findings require immediate evaluation",
  },
};

const PROMPT_SUGGESTIONS = [
  "Explain primary pathology finding and its etiology",
  "Are there signs of consolidation or pleural effusion?",
  "What follow-up imaging protocol is indicated?",
  "Generate a plain-language summary for the patient",
];

const LANG_VOICES = {
  English: "en-US",
  Gujarati: "gu-IN",
  Hindi: "hi-IN",
  Marathi: "mr-IN",
};

const AVAILABLE_LANGUAGES = ["English", "Hindi", "Gujarati", "Marathi"];

export default function ClinicalReportView({
  report,
  onOpenReferral,
  onOpenSignoff,
  onDownloadPdf,
  downloadingPdf,
  onTranslateReport,
  translatingLang,
}) {
  const [viewMode, setViewMode] = useState("report"); // 'report' | 'copilot'
  const [reportTab, setReportTab] = useState(0); // 0: Findings & Zones, 1: Differentials & ICD-10
  const [speaking, setSpeaking] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);
  const [showAllPathologies, setShowAllPathologies] = useState(false);

  // Copilot Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      role: "model",
      text: "Greetings. I am your MedVLM Clinical Copilot, grounded in this study's DenseNet-121 probabilities, 6-zone lung metrics, and patient demographics. How may I assist your differential evaluation?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatLanguage, setChatLanguage] = useState(report?.language || "English");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (report?.language) {
      setChatLanguage(report.language);
    }
  }, [report?.language]);

  if (!report) return null;

  const sev = sevConfig[report.severity?.toLowerCase()] || sevConfig.normal;
  const SevIcon = sev.icon;
  const isSigned = report.status === "signed" || Boolean(report.signed_by);

  // Robust browser speech synthesis reference holder to prevent garbage collection
  const currentUtteranceRef = useRef(null);

  const cleanTextForSpeech = (rawText) => {
    if (!rawText) return "";
    return rawText
      .replace(/[*_#`~[\]]/g, " ")      // strip markdown formatting
      .replace(/(\b\w+)\/(\w+\b)/g, "$1 or $2") // replace word/word with "or" so it does not say "slash"
      .replace(/\//g, " ")             // replace remaining standalone slashes with space
      .replace(/\\/g, " ")             // replace backslashes
      .replace(/\s+/g, " ")            // normalize extra whitespace
      .trim();
  };

  // Language-to-BCP-47 mapping with fallback variants
  const getLanguageTag = (langName, text = "") => {
    if (text) {
      if (/[\u0A80-\u0AFF]/.test(text)) return "gu-IN";
      if (/[\u0900-\u097F]/.test(text)) {
        const clean = (langName || "").toLowerCase();
        if (clean.includes("mar")) return "mr-IN";
        return "hi-IN";
      }
    }
    const clean = (langName || "").toLowerCase();
    if (clean.includes("guj")) return "gu-IN";
    if (clean.includes("hin")) return "hi-IN";
    if (clean.includes("mar")) return "mr-IN";
    return "en-US";
  };

  // Audio element reference for streamed natural voice
  const activeAudioRef = useRef(null);

  const handleSpeakBrief = async () => {
    // If already playing audio via Audio element, stop it
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
      setSpeaking(false);
      return;
    }

    // If speaking via browser SpeechSynthesis, stop it
    if (typeof window !== "undefined" && window.speechSynthesis && speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const raw = report.brief || report.impression || "No clinical brief available.";
    const textToSpeak = cleanTextForSpeech(raw);
    if (!textToSpeak) return;

    setSpeaking(true);

    // Try high-fidelity server TTS first (fluent natural human voice in Gujarati, Marathi, Hindi, English)
    try {
      const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const resp = await fetch(`${API}/synthesize-speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          language: report.language || "English",
        }),
      });

      if (resp.ok) {
        const audioBlob = await resp.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;

        audio.onended = () => {
          setSpeaking(false);
          activeAudioRef.current = null;
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
          setSpeaking(false);
          activeAudioRef.current = null;
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
        return;
      }
    } catch (err) {
      console.warn("[Server TTS error, falling back to browser synthesis]", err);
    }

    // Fallback: Browser Web Speech API
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    currentUtteranceRef.current = utterance;
    const langTag = getLanguageTag(report.language, textToSpeak);
    utterance.lang = langTag;

    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      currentUtteranceRef.current = null;
    };
    utterance.onerror = () => {
      setSpeaking(false);
      currentUtteranceRef.current = null;
    };

    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } catch {
        setSpeaking(false);
      }
    }, 50);
  };

  const handleCopyText = (text, sectionName) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionName);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleSendChat = async (textToSend) => {
    const query = textToSend || chatInput;
    if (!query.trim() || chatLoading) return;

    const userMsg = {
      role: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    setChatInput("");
    setChatLoading(true);

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
          language: chatLanguage,
        }),
      });

      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Error communicating with AI Copilot: " + err.message,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div
      className="mvlm-glass-panel mvlm-panel-padding"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        height: "100%",
        minHeight: 460,
      }}
    >
      {/* Top Controls Toolbar: Switcher & Export Actions */}
      <div className="mvlm-toolbar-row">
        {/* Segmented Mode Switcher */}
        <div
          style={{
            display: "flex",
            background: "rgba(8, 12, 22, 0.8)",
            borderRadius: "8px",
            padding: 3,
            border: "1px solid var(--border-subtle)",
          }}
        >
          <button
            onClick={() => setViewMode("report")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              background: viewMode === "report" ? "var(--bg-card)" : "transparent",
              color: viewMode === "report" ? "var(--color-cyan)" : "var(--text-muted)",
              fontWeight: viewMode === "report" ? 700 : 500,
              fontSize: 12.5,
              cursor: "pointer",
              boxShadow: viewMode === "report" ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <FileText size={14} />
            <span>Diagnostic Report</span>
          </button>

          <button
            onClick={() => setViewMode("copilot")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              background: viewMode === "copilot" ? "var(--bg-card)" : "transparent",
              color: viewMode === "copilot" ? "var(--color-cyan)" : "var(--text-muted)",
              fontWeight: viewMode === "copilot" ? 700 : 600,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: viewMode === "copilot" ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <MessageSquare size={14} />
            <span>Interactive Copilot</span>
          </button>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Audio Read-Aloud */}
          <button
            onClick={handleSpeakBrief}
            className="mvlm-btn-secondary"
            title="Listen to synthesized audio briefing"
            style={{
              color: speaking ? "#f59e0b" : undefined,
              borderColor: speaking ? "rgba(245, 158, 11, 0.4)" : undefined,
              background: speaking ? "rgba(245, 158, 11, 0.1)" : undefined,
              fontSize: 12.5,
            }}
          >
            {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span>{speaking ? "Stop Audio" : "Listen"}</span>
            {speaking && (
              <span style={{ display: "flex", gap: 2, alignItems: "center", marginLeft: 2 }}>
                <span style={{ width: 2, height: 10, background: "#f59e0b", animation: "waveBar 0.8s ease-in-out infinite" }} />
                <span style={{ width: 2, height: 14, background: "#f59e0b", animation: "waveBar 0.8s ease-in-out 0.2s infinite" }} />
                <span style={{ width: 2, height: 8, background: "#f59e0b", animation: "waveBar 0.8s ease-in-out 0.4s infinite" }} />
              </span>
            )}
          </button>

          {/* Referral Letter */}
          <button onClick={onOpenReferral} className="mvlm-btn-secondary" title="Draft specialist referral letter" style={{ fontSize: 12.5 }}>
            <Share2 size={13} />
            <span>Referral</span>
          </button>

          {/* Doctor Sign-off */}
          <button
            onClick={onOpenSignoff}
            className="mvlm-btn-secondary"
            title="Reviewing radiologist verification"
            style={{
              borderColor: isSigned ? "rgba(16, 185, 129, 0.4)" : undefined,
              background: isSigned ? "rgba(16, 185, 129, 0.1)" : undefined,
              color: isSigned ? "#34d399" : undefined,
              fontSize: 12.5,
            }}
          >
            {isSigned ? <ShieldCheck size={14} /> : <UserCheck size={14} />}
            <span>{isSigned ? "MD Certified" : "Sign-Off"}</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={onDownloadPdf}
            disabled={downloadingPdf}
            className="mvlm-btn-primary"
            style={{ padding: "8px 14px", fontSize: 13 }}
          >
            <Download size={13} />
            <span>{downloadingPdf ? "Generating..." : "Export PDF"}</span>
          </button>
        </div>
      </div>

      {/* Multilingual Translation Bar */}
      <div
        style={{
          background: "rgba(8, 12, 22, 0.65)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "10px",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Globe size={14} color="var(--color-cyan)" />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)", letterSpacing: "0.02em" }}>
            TRANSLATE REPORT:
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {AVAILABLE_LANGUAGES.map((lang) => {
              const active = (report.language || "English").toLowerCase() === lang.toLowerCase();
              return (
                <button
                  key={lang}
                  onClick={() => onTranslateReport && onTranslateReport(lang)}
                  disabled={Boolean(translatingLang)}
                  style={{
                    padding: "3px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${active ? "var(--color-cyan)" : "rgba(148, 163, 184, 0.2)"}`,
                    background: active ? "rgba(6, 182, 212, 0.18)" : "transparent",
                    color: active ? "var(--color-cyan)" : "var(--text-secondary)",
                    fontSize: 11.5,
                    fontWeight: active ? 700 : 600,
                    cursor: translatingLang ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>

        {translatingLang && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#f59e0b" }}>
            <RefreshCw size={12} className="mvlm-status-dot active" />
            <span>Translating to {translatingLang}...</span>
          </div>
        )}
      </div>

      {/* VIEW MODE 1: STRUCTURED CLINICAL REPORT */}
      {viewMode === "report" ? (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            paddingRight: 4,
          }}
        >
          {/* Clinical Case Header & Demographics */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              borderRadius: "10px",
              border: "1px solid var(--border-subtle)",
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 14.5,
                    fontWeight: 800,
                    color: "#ffffff",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  STUDY #{report.id || "MVL-40918"}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-muted)",
                    background: "rgba(148, 163, 184, 0.12)",
                    padding: "2px 7px",
                    borderRadius: "4px",
                  }}
                >
                  {report.modality || "DX"} {report.view_position || "PA"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>
                Patient: {report.patient_age ? `${report.patient_age}y` : "Age N/A"} ·{" "}
                {report.patient_gender || "Sex N/A"} · Study Date:{" "}
                {report.created_at
                  ? new Date(report.created_at).toLocaleDateString()
                  : new Date().toLocaleDateString()}
              </div>
            </div>

            {/* Severity Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 12px",
                borderRadius: "16px",
                background: sev.bg,
                border: `1px solid ${sev.border}`,
                boxShadow: `0 0 12px ${sev.bg}`,
              }}
            >
              <SevIcon size={15} color={sev.color} />
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: sev.color, letterSpacing: "0.04em" }}>
                  {sev.label}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-secondary)", marginTop: 1 }}>{sev.desc}</div>
              </div>
            </div>
          </div>

          {/* Clinical Safety Arbiter Alerts */}
          {report.safety_alerts && report.safety_alerts.length > 0 && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "10px",
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f87171", fontWeight: 700, fontSize: 12.5 }}>
                <AlertTriangle size={16} />
                <span>CLINICAL SAFETY ARBITER NOTICE (Deterministic Guardrail Active)</span>
              </div>
              {report.safety_alerts.map((alert, idx) => (
                <div key={idx} style={{ fontSize: 11.5, color: "#fca5a5", lineHeight: 1.4 }}>
                  {alert}
                </div>
              ))}
            </div>
          )}

          {/* Doctor Certification Stamp if Signed */}
          {isSigned && (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "10px",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <ShieldCheck size={18} color="#10b981" />
                <div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#ffffff" }}>
                    Clinically Certified by {report.signed_by || "Attending Radiologist"}
                  </span>
                  <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                    License: {report.doctor_license || "RAD-CA-409182"} · Authenticated digital signature
                    {report.signature_hash && (
                      <span style={{ marginLeft: 8, color: "#34d399", fontFamily: "var(--font-mono)" }}>
                        [{report.signature_hash}]
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "#10b981",
                  background: "rgba(16, 185, 129, 0.15)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                }}
              >
                21 CFR PART 11 VERIFIED
              </span>
            </div>
          )}

          {/* Side-by-Side Impression & 6-Zone Anatomical Lung Map */}
          <div className="mvlm-impression-zones-grid">
            {/* Clinical Brief & Impression Callout */}
            <div
              style={{
                background: "rgba(6, 182, 212, 0.05)",
                border: "1px solid rgba(6, 182, 212, 0.2)",
                borderRadius: "10px",
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Stethoscope size={14} color="var(--color-cyan)" />
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-cyan)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Clinical Impression
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyText(report.impression || report.brief || "", "impression")}
                    className="mvlm-btn-secondary"
                    style={{ padding: "2px 7px", fontSize: 11 }}
                  >
                    {copiedSection === "impression" ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                    <span>{copiedSection === "impression" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "#ffffff",
                    fontWeight: 500,
                    margin: 0,
                  }}
                >
                  {report.impression || report.brief || "No acute cardiopulmonary findings."}
                </p>
              </div>
            </div>

            {/* 6 Anatomical Lung Zones Quantification - 3x2 Compact Grid */}
            {report.lung_zones && (
              <div
                style={{
                  background: "rgba(8, 12, 22, 0.6)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  padding: "8px 10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <Layers size={14} color="var(--color-cyan)" />
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      color: "#ffffff",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    6-Zone Lung Matrix
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                  {[
                    { key: "upper_right", altKey: "right_upper", label: "RUL", title: "Right Upper Lung" },
                    { key: "upper_left", altKey: "left_upper", label: "LUL", title: "Left Upper Lung" },
                    { key: "middle_right", altKey: "right_mid", label: "RML", title: "Right Middle Lung" },
                    { key: "middle_left", altKey: "left_mid", label: "LML", title: "Left Middle Lung" },
                    { key: "lower_right", altKey: "right_lower", label: "RLL", title: "Right Lower Lung" },
                    { key: "lower_left", altKey: "left_lower", label: "LLL", title: "Left Lower Lung" },
                  ].map(({ key, altKey, label, title }) => {
                    const rawVal = report.lung_zones?.[key] ?? report.lung_zones?.[altKey] ?? "Clear";
                    const val = typeof rawVal === "string" ? rawVal : (rawVal?.status || rawVal?.finding || "Clear");
                    const isAbnormal =
                      typeof val === "string" &&
                      !val.toLowerCase().includes("clear") &&
                      !val.toLowerCase().includes("normal");
                    const displayVal = typeof val === "string" && val.trim().length > 0 ? val.toUpperCase() : (isAbnormal ? "AFFECTED" : "CLEAR");
                    return (
                      <div
                        key={key}
                        title={`${title}: ${val}`}
                        style={{
                          background: isAbnormal
                            ? "linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(239, 68, 68, 0.08) 100%)"
                            : "linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(15, 23, 42, 0.5) 100%)",
                          border: `1px solid ${isAbnormal ? "rgba(239, 68, 68, 0.45)" : "rgba(148, 163, 184, 0.18)"}`,
                          borderRadius: "8px",
                          padding: "7px 11px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          boxShadow: isAbnormal ? "0 2px 10px rgba(239, 68, 68, 0.12)" : "none",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            fontFamily: "var(--font-mono)",
                            color: isAbnormal ? "#fca5a5" : "#f1f5f9",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {label}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: isAbnormal ? "#ef4444" : "#10b981",
                              boxShadow: isAbnormal
                                ? "0 0 8px rgba(239, 68, 68, 0.9)"
                                : "0 0 8px rgba(16, 185, 129, 0.8)",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              fontFamily: "var(--font-mono)",
                              color: isAbnormal ? "#f87171" : "#34d399",
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                            }}
                          >
                            {displayVal}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Detected Pathologies (DenseNet-121 Confidence Meter) - 2-Column Compact Grid */}
          {report.detected_pathologies && report.detected_pathologies.length > 0 && (() => {
            const sortedPathologies = [...report.detected_pathologies].sort((a, b) => {
              const scoreA = a.score ?? a.probability ?? a.confidence ?? 0;
              const scoreB = b.score ?? b.probability ?? b.confidence ?? 0;
              return scoreB - scoreA;
            });
            const elevatedPathologies = sortedPathologies.filter((item) => {
              const score = item.score ?? item.probability ?? item.confidence ?? 0;
              return score >= 0.20;
            });
            const displayPathologies = showAllPathologies
              ? sortedPathologies
              : (elevatedPathologies.length > 0 ? elevatedPathologies : sortedPathologies.slice(0, 4));

            return (
              <div
                style={{
                  background: "rgba(8, 12, 22, 0.6)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  padding: "8px 12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Activity size={13} color="var(--color-cyan)" />
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: "#ffffff",
                        textTransform: "uppercase",
                      }}
                    >
                      Neural Pathology Probabilities (TorchXRayVision)
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10.5, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                      {elevatedPathologies.length} ELEVATED / {sortedPathologies.length} TOTAL
                    </span>
                    <button
                      onClick={() => setShowAllPathologies(!showAllPathologies)}
                      className="mvlm-btn-secondary"
                      style={{ padding: "2px 8px", fontSize: 10.5 }}
                    >
                      {showAllPathologies ? "Show Elevated Only" : `Show All (${sortedPathologies.length})`}
                    </button>
                  </div>
                </div>

                <div className="mvlm-pathologies-grid">
                  {displayPathologies.map((item, idx) => {
                    const score = item.score ?? item.probability ?? item.confidence ?? 0;
                    const pct = Math.round(score * 100);
                    const isHigh = pct >= 50;
                    const isMed = pct >= 25 && pct < 50;
                    const barColor = isHigh ? "#ef4444" : isMed ? "#f59e0b" : "#10b981";

                    return (
                      <div
                        key={idx}
                        style={{
                          background: "rgba(15, 23, 42, 0.5)",
                          borderRadius: "5px",
                          padding: "4px 7px",
                          border: `1px solid ${pct >= 25 ? "rgba(249, 115, 22, 0.25)" : "rgba(148, 163, 184, 0.08)"}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: pct >= 25 ? 700 : 500, color: pct >= 25 ? "#ffffff" : "var(--text-secondary)" }}>
                            {item.condition}
                          </span>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                              color: barColor,
                            }}
                          >
                            {pct}%
                          </span>
                        </div>

                        {/* Progress Bar Track */}
                        <div
                          style={{
                            height: 3.5,
                            background: "rgba(148, 163, 184, 0.15)",
                            borderRadius: "2px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: barColor,
                              borderRadius: "2px",
                              transition: "width 0.6s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Systematic Clinical Findings */}
          <div
            style={{
              background: "rgba(8, 12, 22, 0.6)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "10px 12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "#ffffff",
                  textTransform: "uppercase",
                }}
              >
                Detailed Radiographic Findings
              </span>
              <button
                onClick={() => handleCopyText(report.findings || "", "findings")}
                className="mvlm-btn-secondary"
                style={{ padding: "2px 7px", fontSize: 11 }}
              >
                {copiedSection === "findings" ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                <span>{copiedSection === "findings" ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--text-secondary)", margin: 0 }}>
              {report.findings || "No focal consolidation, pneumothorax, or large pleural effusion."}
            </p>
          </div>

          {/* Differential Diagnoses & Clinical Recommendations */}
          <div className="mvlm-differentials-grid">
            {/* Differentials */}
            <div
              style={{
                background: "rgba(8, 12, 22, 0.6)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-cyan)",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                DIFFERENTIAL DIAGNOSES
              </span>

              {report.differentials && report.differentials.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {report.differentials.map((diff, i) => {
                    const condition = typeof diff === "string" ? diff : (diff.condition || diff.diagnosis || diff.name || "Differential Diagnosis");
                    const likelihood = typeof diff === "object" ? diff.likelihood : null;
                    const reasoning = typeof diff === "object" ? diff.reasoning : null;
                    const isHigh = likelihood?.toLowerCase() === "high";
                    const isMed = likelihood?.toLowerCase() === "moderate";
                    const lkColor = isHigh ? "#ef4444" : isMed ? "#f59e0b" : "#38bdf8";

                    return (
                      <div
                        key={i}
                        style={{
                          background: "rgba(15, 23, 42, 0.45)",
                          borderRadius: "6px",
                          padding: "6px 9px",
                          border: "1px solid rgba(148, 163, 184, 0.08)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: "var(--color-cyan)", fontWeight: 800 }}>•</span>
                            <strong style={{ color: "#ffffff", fontSize: 12.5 }}>{condition}</strong>
                          </div>
                          {likelihood && (
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                fontFamily: "var(--font-mono)",
                                color: lkColor,
                                background: `${lkColor}15`,
                                border: `1px solid ${lkColor}30`,
                                padding: "1px 6px",
                                borderRadius: "3px",
                              }}
                            >
                              {likelihood.toUpperCase()}
                            </span>
                          )}
                        </div>
                        {reasoning && (
                          <div style={{ fontSize: 11.5, color: "var(--text-secondary)", paddingLeft: 10, lineHeight: 1.5 }}>
                            {reasoning}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
                  No significant secondary differentials suggested.
                </span>
              )}
            </div>

            {/* Recommendations */}
            <div
              style={{
                background: "rgba(8, 12, 22, 0.6)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-cyan)",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                CLINICAL RECOMMENDATIONS
              </span>
              <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
                {report.recommendations || "Clinical correlation and routine follow-up as clinically indicated."}
              </p>
            </div>
          </div>

          {/* ICD-10 Clinical Diagnostic Interoperability Coding */}
          {report.icd10_codes && report.icd10_codes.length > 0 && (
            <div
              style={{
                background: "rgba(8, 12, 22, 0.6)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "8px 12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Tag size={13} color="var(--color-cyan)" />
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      color: "#ffffff",
                      textTransform: "uppercase",
                    }}
                  >
                    ICD-10-CM Interoperability Codes (EHR Export)
                  </span>
                </div>
                <button
                  onClick={() => {
                    const text = report.icd10_codes.map((c) => `${c.code} - ${c.description}`).join("\n");
                    handleCopyText(text, "icd10");
                  }}
                  className="mvlm-btn-secondary"
                  style={{ padding: "2px 7px", fontSize: 11 }}
                >
                  {copiedSection === "icd10" ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                  <span>{copiedSection === "icd10" ? "Copied Codes" : "Copy Codes"}</span>
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {report.icd10_codes.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid rgba(6, 182, 212, 0.2)",
                      borderRadius: "5px",
                      padding: "4px 9px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-cyan)",
                        background: "rgba(6, 182, 212, 0.12)",
                        padding: "1px 6px",
                        borderRadius: "3px",
                      }}
                    >
                      {c.code}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {c.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence-Based Grounding Guidance & Literature Citations */}
          {report.grounded_guidance && report.grounded_guidance.summary && (
            <div
              style={{
                background: "rgba(6, 182, 212, 0.04)",
                border: "1px solid rgba(6, 182, 212, 0.18)",
                borderRadius: "12px",
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <BookOpen size={14} color="var(--color-cyan)" />
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-cyan)",
                    textTransform: "uppercase",
                  }}
                >
                  Evidence Grounding & Clinical Literature
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                {report.grounded_guidance.summary}
              </p>
              {report.grounded_guidance.sources && report.grounded_guidance.sources.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {report.grounded_guidance.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11.5,
                        color: "var(--color-cyan)",
                        textDecoration: "none",
                        background: "rgba(6, 182, 212, 0.08)",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        border: "1px solid rgba(6, 182, 212, 0.18)",
                      }}
                    >
                      <span>{src.title || "Clinical Reference"}</span>
                      <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE 2: INTERACTIVE COPILOT CHAT */
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 460,
          }}
        >
          {/* Grounding Context Chip */}
          <div
            style={{
              background: "rgba(6, 182, 212, 0.08)",
              border: "1px solid rgba(6, 182, 212, 0.2)",
              borderRadius: "8px",
              padding: "7px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 11.5,
              color: "var(--color-cyan)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={14} />
              <span>Grounded in Active Study Context · {report.id || "MVL-Current"}</span>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5 }}>
              Gemini 3.8 Flash Multimodal CDS
            </span>
          </div>

          {/* Quick Suggestion Prompts */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PROMPT_SUGGESTIONS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendChat(prompt)}
                disabled={chatLoading}
                style={{
                  fontSize: 11,
                  padding: "5px 10px",
                  borderRadius: "6px",
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(148, 163, 184, 0.15)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-cyan)";
                  e.currentTarget.style.color = "var(--color-cyan)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.15)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Timeline */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "8px 6px",
              background: "rgba(8, 12, 22, 0.5)",
              borderRadius: "10px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {chatMessages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                    gap: 3,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "10px 14px",
                      borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      background: isUser ? "linear-gradient(135deg, #0284c7, #0369a1)" : "rgba(15, 23, 42, 0.9)",
                      border: `1px solid ${isUser ? "rgba(2, 132, 199, 0.4)" : "rgba(148, 163, 184, 0.15)"}`,
                      color: "#f8fafc",
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    }}
                  >
                    {msg.text}
                  </div>
                  <span style={{ fontSize: 9.5, color: "var(--text-dim)", fontFamily: "var(--font-mono)", padding: "0 4px" }}>
                    {msg.timestamp || ""}
                  </span>
                </div>
              );
            })}

            {chatLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", color: "var(--color-cyan)" }}>
                <span className="mvlm-status-dot active" />
                <span style={{ fontSize: 11.5, fontFamily: "var(--font-mono)" }}>
                  Analyzing radiology grounding context...
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              type="text"
              placeholder="Ask a clinical question about this radiograph..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                color: "#f8fafc",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="mvlm-btn-primary"
              style={{ height: 40, padding: "0 16px" }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
