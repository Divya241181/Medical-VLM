import { useState } from "react";
import {
  Share2,
  FileText,
  Copy,
  Check,
  Printer,
  X,
  User,
  Building2,
  Sparkles,
  AlertCircle,
} from "lucide-react";

const SPECIALTIES = [
  "Pulmonology & Respiratory Medicine",
  "Cardiology & Cardiovascular Care",
  "Thoracic Surgery",
  "Infectious Disease & Hospital Medicine",
  "Oncology & Thoracic Imaging",
];

const PRIORITIES = [
  { id: "routine", label: "Routine (Next Available)", color: "#10b981" },
  { id: "urgent", label: "Urgent (Within 48h)", color: "#f59e0b" },
  { id: "stat", label: "STAT / Immediate", color: "#ef4444" },
];

export default function ReferralModal({ isOpen, onClose, report }) {
  const [patientName, setPatientName] = useState(
    report?.patient_name || (report?.patient_age ? `Patient (${report.patient_age}y ${report.patient_gender || ""})` : "John Doe")
  );
  const [facility, setFacility] = useState("Metropolitan Diagnostic Radiology Center");
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [priority, setPriority] = useState("urgent");
  const [letter, setLetter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/referral-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_context: report,
          patient_name: patientName,
          referring_facility: facility,
          target_specialty: specialty,
          priority: priority,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLetter(data.letter);
    } catch (err) {
      alert("Failed to generate referral letter: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (letter) {
      navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Specialist Referral — ${patientName}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
            pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
            .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 24px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${facility}</h2>
            <p>Clinical Referral Document · Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <pre>${letter}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="mvlm-modal-backdrop">
      <div
        className="mvlm-glass-panel mvlm-modal-box"
        style={{
          maxWidth: 680,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "10px",
                background: "rgba(6, 182, 212, 0.12)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-cyan)",
              }}
            >
              <Share2 size={20} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: 17,
                  color: "#f8fafc",
                  fontWeight: 700,
                  fontFamily: "var(--font-display)",
                  margin: 0,
                }}
              >
                Specialist Referral Letter
              </h3>
              <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginTop: 2 }}>
                Doctor-to-Doctor Clinical Consultation Letter
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
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
        </div>

        {/* Input Parameters */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: "var(--text-dim)",
                display: "block",
                marginBottom: 5,
              }}
            >
              PATIENT IDENTIFIER / NAME
            </label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                color: "#f8fafc",
                fontSize: 12.5,
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: "var(--text-dim)",
                display: "block",
                marginBottom: 5,
              }}
            >
              REFERRING MEDICAL FACILITY
            </label>
            <input
              type="text"
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                color: "#f8fafc",
                fontSize: 12.5,
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Specialty & Priority Selection */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: "var(--text-dim)",
                display: "block",
                marginBottom: 5,
              }}
            >
              TARGET SPECIALTY
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                color: "#f8fafc",
                fontSize: 12.5,
                outline: "none",
              }}
            >
              {SPECIALTIES.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: "var(--text-dim)",
                display: "block",
                marginBottom: 5,
              }}
            >
              CLINICAL PRIORITY
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                color: "#f8fafc",
                fontSize: 12.5,
                outline: "none",
              }}
            >
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Generate Letter Button */}
        {!letter && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mvlm-btn-primary"
            style={{ width: "100%", height: 44, marginTop: 4 }}
          >
            <Sparkles size={16} />
            <span>{loading ? "Generating Referral Letter..." : "Generate Clinical Referral Letter"}</span>
          </button>
        )}

        {/* Formatted Letter Preview */}
        {letter && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--color-cyan)", fontFamily: "var(--font-mono)" }}>
                REFERRAL LETTER DRAFT
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={handleCopy} className="mvlm-btn-secondary" style={{ padding: "4px 9px", fontSize: 11.5 }}>
                  {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  <span>{copied ? "Copied" : "Copy Text"}</span>
                </button>
                <button onClick={handlePrint} className="mvlm-btn-secondary" style={{ padding: "4px 9px", fontSize: 11.5 }}>
                  <Printer size={12} />
                  <span>Print Letterhead</span>
                </button>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                background: "rgba(8, 12, 22, 0.7)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                padding: "14px 16px",
                fontSize: 12.5,
                lineHeight: 1.6,
                color: "#f8fafc",
                whiteSpace: "pre-wrap",
                fontFamily: "var(--font-sans)",
              }}
            >
              {letter}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
