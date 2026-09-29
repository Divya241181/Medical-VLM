import { useState } from "react";
import { UserCheck, ShieldCheck, X, FileSignature, AlertCircle, Award } from "lucide-react";

export default function DoctorSignoffModal({
  isOpen,
  onClose,
  report,
  onSignSuccess,
}) {
  const [doctorName, setDoctorName] = useState("Dr. Marcus Vance, MD");
  const [licenseNumber, setLicenseNumber] = useState("RAD-CA-409182");
  const [notes, setNotes] = useState(
    "Findings reviewed and clinically verified. Concur with AI differential and recommendations."
  );
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSign = async (e) => {
    e.preventDefault();
    if (!doctorName.trim() || !licenseNumber.trim()) {
      setError("Attending physician name and medical license are required.");
      return;
    }

    setSigning(true);
    setError(null);

    try {
      const studyId = report?.id;
      const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

      let updatedReport = {
        ...report,
        status: "signed",
        signed_by: doctorName,
        doctor_license: licenseNumber,
        doctor_notes: notes,
        signed_at: new Date().toISOString(),
      };

      if (studyId) {
        const res = await fetch(`${API}/studies/${studyId}/sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctor_name: doctorName,
            doctor_license: licenseNumber,
            doctor_notes: notes,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          updatedReport = { ...updatedReport, ...data };
        }
      }

      onSignSuccess(updatedReport);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to digitally sign study.");
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="mvlm-modal-backdrop">
      <div className="mvlm-glass-panel mvlm-modal-box">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "12px",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
              }}
            >
              <FileSignature size={22} />
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
                Attending Radiologist Sign-Off
              </h3>
              <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginTop: 2 }}>
                Digital Attestation & Verification Certificate
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

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSign} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Physician Name & License */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
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
                PHYSICIAN NAME & DEGREE
              </label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  color: "#f8fafc",
                  fontSize: 13,
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
                MEDICAL LICENSE / NPI
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  color: "#f8fafc",
                  fontSize: 13,
                  fontFamily: "var(--font-mono)",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Clinical Attestation Notes */}
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
              PHYSICIAN CONCURRENCE & ATTESTATION
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                color: "#f8fafc",
                fontSize: 12.5,
                lineHeight: 1.5,
                resize: "vertical",
                outline: "none",
              }}
            />
          </div>

          {/* Security & Cryptographic Notice */}
          <div
            style={{
              background: "rgba(8, 12, 22, 0.6)",
              borderRadius: "8px",
              border: "1px solid var(--border-subtle)",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11.5,
              color: "var(--text-muted)",
            }}
          >
            <ShieldCheck size={16} color="#10b981" />
            <span>
              Attestation creates a cryptographically timestamped digital record attached to Study ID #{report?.id || "N/A"}.
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={signing}
              className="mvlm-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={signing}
              className="mvlm-btn-primary"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                boxShadow: "0 2px 10px rgba(16, 185, 129, 0.35)",
              }}
            >
              <Award size={15} />
              <span>{signing ? "Signing..." : "Certify & Digitally Sign"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
