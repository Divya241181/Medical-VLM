import { useState, useRef, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "";

/* ── Colour tokens ──────────────────────────────────────────────────────── */
const TEAL = "#0f6e56";
const TEAL_LIGHT = "#e6f5f0";
const BORDER = "#e5e5e5";
const BG_CARD = "#ffffff";
const BG_BODY = "transparent";
const TEXT = "#1a1a1a";
const TEXT_MUTED = "#64748b";
const RED = "#dc2626";
const ORANGE = "#d97706";
const GREEN = "#16a34a";

const SEVERITY_MAP = {
  normal: GREEN,
  mild: ORANGE,
  moderate: RED,
  severe: RED,
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/* ── Animated dots indicator ─────────────────────────────────────────────── */
function LoadingDots() {
  const dotBase = {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: TEAL,
    margin: "0 4px",
    animation: "medvlm-dot 1.4s infinite ease-in-out both",
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem 0" }}>
      <style>{`
        @keyframes medvlm-dot {
          0%, 80%, 100% { transform: scale(0.3); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <span style={{ ...dotBase, animationDelay: "0s" }} />
      <span style={{ ...dotBase, animationDelay: "0.16s" }} />
      <span style={{ ...dotBase, animationDelay: "0.32s" }} />
      <p style={{ marginTop: 12, fontSize: "0.85rem", color: TEXT_MUTED }}>
        Analyzing X-ray — this may take a moment…
      </p>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function XRayAnalyzer() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef(null);

  /* ── File selection ──────────────────────────────────────────────────── */
  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setReport(null);
    setError(null);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer?.files?.[0];
      if (f && f.type.startsWith("image/")) handleFile(f);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onInputChange = useCallback(
    (e) => handleFile(e.target.files?.[0]),
    [handleFile]
  );

  /* ── Analyze ─────────────────────────────────────────────────────────── */
  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API}/analyze`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server responded ${res.status}: ${text}`);
      }

      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError(err.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  /* ── Download PDF ────────────────────────────────────────────────────── */
  const downloadPdf = async () => {
    if (!report) return;
    try {
      const res = await fetch(`${API}/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "radiology_report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "PDF download failed");
    }
  };

  /* ── Styles ──────────────────────────────────────────────────────────── */
  const card = {
    background: BG_CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: "1.5rem",
    marginBottom: "1.25rem",
  };

  const dropZone = {
    ...card,
    border: `2px dashed ${dragOver ? TEAL : BORDER}`,
    background: dragOver ? TEAL_LIGHT : "#fafafa",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.2s ease",
    position: "relative",
    overflow: "hidden",
    minHeight: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const btnBase = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "none",
    borderRadius: 8,
    padding: "0.7rem 1.5rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    fontFamily: "system-ui, sans-serif",
    cursor: "pointer",
    transition: "all 0.2s ease",
  };

  const btnPrimary = {
    ...btnBase,
    background: TEAL,
    color: "#fff",
  };

  const btnPrimaryDisabled = {
    ...btnPrimary,
    opacity: 0.45,
    cursor: "not-allowed",
  };

  const btnOutline = {
    ...btnBase,
    background: "transparent",
    color: TEAL,
    border: `1.5px solid ${TEAL}`,
  };

  const badge = {
    display: "inline-block",
    padding: "0.25rem 0.65rem",
    borderRadius: 6,
    fontSize: "0.78rem",
    fontWeight: 500,
    background: "#f1f5f9",
    color: TEXT_MUTED,
    fontFamily: "system-ui, sans-serif",
  };

  const sectionLabel = {
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: TEXT_MUTED,
    marginBottom: 6,
    fontFamily: "system-ui, sans-serif",
  };

  const sectionBody = {
    fontSize: "0.9rem",
    lineHeight: 1.65,
    color: TEXT,
    fontFamily: "system-ui, sans-serif",
  };

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: TEXT }}>
      {/* ── Upload zone ─────────────────────────────────────────────── */}
      <div
        style={dropZone}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onInputChange}
          style={{ display: "none" }}
        />

        {preview ? (
          <img
            src={preview}
            alt="X-ray preview"
            style={{
              maxWidth: "100%",
              maxHeight: 340,
              borderRadius: 8,
              objectFit: "contain",
            }}
          />
        ) : (
          <div>
            <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🩻</div>
            <p style={{ fontSize: "0.95rem", color: TEXT_MUTED, margin: 0 }}>
              Drag &amp; drop a chest X-ray here, or{" "}
              <span style={{ color: TEAL, fontWeight: 600 }}>browse</span>
            </p>
            <p
              style={{
                fontSize: "0.78rem",
                color: "#94a3b8",
                marginTop: 6,
              }}
            >
              Supports JPEG, PNG, DICOM-converted images
            </p>
          </div>
        )}
      </div>

      {/* ── File metadata ───────────────────────────────────────────── */}
      {file && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: "1.25rem",
          }}
        >
          <span style={badge}>{file.name}</span>
          <span style={badge}>{formatBytes(file.size)}</span>
        </div>
      )}

      {/* ── Analyze button ──────────────────────────────────────────── */}
      <div style={{ marginBottom: "1.25rem" }}>
        <button
          style={!file || loading ? btnPrimaryDisabled : btnPrimary}
          disabled={!file || loading}
          onClick={analyze}
        >
          {loading ? "Analyzing…" : "Analyze X-Ray"}
        </button>
      </div>

      {/* ── Loading dots ────────────────────────────────────────────── */}
      {loading && <LoadingDots />}

      {/* ── Error ───────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            ...card,
            borderColor: "#fecaca",
            background: "#fef2f2",
            color: RED,
            fontSize: "0.88rem",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── Report card ─────────────────────────────────────────────── */}
      {report && (
        <div style={card}>
          <h2
            style={{
              fontSize: "1.05rem",
              fontWeight: 700,
              marginBottom: "1.25rem",
              color: TEAL,
            }}
          >
            Report Summary
          </h2>

          {/* Findings */}
          <div style={{ marginBottom: "1.1rem" }}>
            <div style={sectionLabel}>Findings</div>
            <div style={sectionBody}>{report.findings}</div>
          </div>

          {/* Impression */}
          <div style={{ marginBottom: "1.1rem" }}>
            <div style={sectionLabel}>Impression</div>
            <div style={sectionBody}>{report.impression}</div>
          </div>

          {/* Recommendations */}
          <div style={{ marginBottom: "1.1rem" }}>
            <div style={sectionLabel}>Recommendations</div>
            <div style={sectionBody}>{report.recommendations}</div>
          </div>

          {/* Severity */}
          <div style={{ marginBottom: "0.5rem" }}>
            <div style={sectionLabel}>Severity</div>
            <div
              style={{
                ...sectionBody,
                fontWeight: 700,
                fontSize: "0.95rem",
                color:
                  SEVERITY_MAP[report.severity?.toLowerCase()] || RED,
              }}
            >
              {report.severity?.toUpperCase() || "UNKNOWN"}
            </div>
          </div>
        </div>
      )}

      {/* ── Download PDF button ─────────────────────────────────────── */}
      {report && (
        <button style={btnOutline} onClick={downloadPdf}>
          ⬇ Download PDF Report
        </button>
      )}
    </div>
  );
}
