import { useState, useEffect } from "react";
import ImageDropzone from "./components/ImageDropzone";
import ClinicalReportView from "./components/ClinicalReportView";
import ReferralModal from "./components/ReferralModal";
import DoctorSignoffModal from "./components/DoctorSignoffModal";
import {
  FileText,
  AlertCircle,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Layers,
  HelpCircle,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function XRayAnalyzer({ onReportSaved, selectedReport, onClearSelectedReport }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState("English");
  const [pipelineMode, setPipelineMode] = useState("fast");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("");

  // Grad-CAM State
  const [heatmapUrl, setHeatmapUrl] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState("Cardiomegaly");
  const [camLoading, setCamLoading] = useState(false);

  // Modals & PDF State
  const [referralOpen, setReferralOpen] = useState(false);
  const [signoffOpen, setSignoffOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [currentStage, setCurrentStage] = useState(null);
  const [translatingLang, setTranslatingLang] = useState(null);

  // Load report when selected from history
  useEffect(() => {
    if (selectedReport) {
      setReport(selectedReport);
      const sampleMap = {
        "sample_normal.jpg": "/samples/sample_normal.jpg",
        "sample_cardiomegaly.jpg": "/samples/sample_cardiomegaly.jpg",
        "sample_pneumonia.jpg": "/samples/sample_pneumonia.jpg",
        "normal.jpg": "/samples/sample_normal.jpg",
        "cardiomegaly.jpg": "/samples/sample_cardiomegaly.jpg",
        "pneumonia.jpg": "/samples/sample_pneumonia.jpg",
      };

      // Resolve authentic base radiograph (never use the Grad-CAM heatmap as the base image)
      const basePreview =
        selectedReport.image_preview_url ||
        selectedReport.preview ||
        sampleMap[selectedReport.filename] ||
        sampleMap[selectedReport.imageName] ||
        (selectedReport.imageThumbnail &&
         selectedReport.imageThumbnail !== selectedReport.heatmap_data_url
          ? selectedReport.imageThumbnail
          : null);

      setPreview(basePreview);
      setHeatmapUrl(selectedReport.heatmap_data_url || null);
      if (selectedReport.detected_pathologies?.[0]?.condition) {
        setSelectedCondition(selectedReport.detected_pathologies[0].condition);
      }
      if (selectedReport.language) setLanguage(selectedReport.language);
      setFile(null);
      setLoading(false);
      setError(null);
    }
  }, [selectedReport]);

  // Handle on-the-fly report translation
  const handleTranslateReport = async (targetLanguage) => {
    if (!report || translatingLang) return;
    if (report.language?.toLowerCase() === targetLanguage.toLowerCase()) return;

    setTranslatingLang(targetLanguage);
    setError(null);

    try {
      // Strip out huge image payloads before sending to translation endpoint (reduces payload from ~3MB to ~1.5KB)
      const sanitizedReport = {
        ...report,
        heatmap_data_url: null,
        image_preview_url: null,
      };

      const res = await fetch(`${API}/translate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report: sanitizedReport,
          target_language: targetLanguage,
        }),
      });

      if (!res.ok) {
        throw new Error(`Translation failed with HTTP ${res.status}: ${res.statusText}`);
      }

      const updatedReport = await res.json();
      // Restore authentic images on the translated report
      updatedReport.heatmap_data_url = report.heatmap_data_url;
      updatedReport.image_preview_url = report.image_preview_url;

      setReport(updatedReport);
      setLanguage(targetLanguage);
      if (onReportSaved) {
        onReportSaved(updatedReport, file);
      }
    } catch (err) {
      console.error("[Translation error]", err);
      if (err.message.includes("Failed to fetch") || err.name === "TypeError") {
        setError(`Cannot connect to backend server at ${API}. Please ensure the backend server is running via run.bat or 'python -m uvicorn main:app --port 8000'.`);
      } else {
        setError("Failed to translate report: " + err.message);
      }
    } finally {
      setTranslatingLang(null);
    }
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (report && report.language?.toLowerCase() !== newLang.toLowerCase()) {
      handleTranslateReport(newLang);
    }
  };

  // Handle local file selection
  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setError(null);
    if (selectedFile.name.toLowerCase().endsWith(".dcm")) {
      setPreview(null);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  // Handle sample selection
  const handleSampleSelect = async (samplePath, filename) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(samplePath);
      const blob = await res.blob();
      const sampleFile = new File([blob], filename, { type: blob.type || "image/jpeg" });
      setFile(sampleFile);
      setPreview(samplePath);
    } catch (err) {
      setError("Failed to load sample image: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset workspace
  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setReport(null);
    setHeatmapUrl(null);
    setError(null);
    setCurrentStage(null);
    if (onClearSelectedReport) onClearSelectedReport();
  };

  // Execute Analysis Pipeline (Streaming SSE with fallback to sync POST)
  const handleAnalyze = async () => {
    if (!file && !preview) {
      setError("Please select or upload a chest radiograph first.");
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);
    setCurrentStage("Initializing clinical pipeline...");

    let imageFile = file;
    try {
      if (!imageFile && preview) {
        const res = await fetch(preview);
        const blob = await res.blob();
        imageFile = new File([blob], "study.jpg", { type: blob.type || "image/jpeg" });
      }

      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("language", language);
      formData.append("mode", pipelineMode);
      if (patientAge) formData.append("patient_age", patientAge);
      if (patientGender) formData.append("patient_gender", patientGender);

      // Attempt SSE streaming
      const response = await fetch(`${API}/analyze-stream`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errDetail = "";
        try {
          const errData = await response.json();
          errDetail = errData.detail || "";
        } catch {
          errDetail = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errDetail);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const rawJson = line.slice(6).trim();
            if (!rawJson) continue;
            try {
              const event = JSON.parse(rawJson);
              if (event.type === "error") {
                setError(event.message || "Failed to process image.");
                return;
              } else if (event.type === "stage") {
                if (event.stage === "model") setCurrentStage("DenseNet-121 inference & Grad-CAM...");
                else if (event.stage === "vision") setCurrentStage("Vision Agent evaluating 6 lung zones...");
                else if (event.stage === "reasoning") setCurrentStage("Reasoning Agent deducing differentials...");
                else if (event.stage === "report") setCurrentStage("Synthesizing diagnostic report...");
              } else if (event.type === "done" && event.report) {
                const rep = event.report;
                setReport(rep);
                if (rep.heatmap_data_url) setHeatmapUrl(rep.heatmap_data_url);
                if (rep.image_preview_url) setPreview(rep.image_preview_url);
                if (rep.detected_pathologies?.[0]?.condition) {
                  setSelectedCondition(rep.detected_pathologies[0].condition);
                }
                if (onReportSaved) onReportSaved(rep, imageFile);
              }
            } catch (err) {
              console.error("[SSE parse error]", err);
            }
          }
        }
      }
    } catch (err) {
      const isValidationError = err.message && (
        err.message.includes("Invalid Image") ||
        err.message.includes("only analyzes human chest") ||
        err.message.includes("422") ||
        err.message.includes("Unsupported file type")
      );

      if (isValidationError) {
        setError(err.message);
        return;
      }

      console.warn("SSE stream failed, falling back to sync analyze:", err);
      try {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("language", language);
        formData.append("mode", pipelineMode);
        if (patientAge) formData.append("patient_age", patientAge);
        if (patientGender) formData.append("patient_gender", patientGender);

        const syncRes = await fetch(`${API}/analyze`, { method: "POST", body: formData });
        if (!syncRes.ok) {
          let detail = "";
          try {
            const d = await syncRes.json();
            detail = d.detail || "";
          } catch {
            detail = `HTTP ${syncRes.status}: ${syncRes.statusText}`;
          }
          throw new Error(detail);
        }
        const rep = await syncRes.json();
        setReport(rep);
        if (rep.heatmap_data_url) setHeatmapUrl(rep.heatmap_data_url);
        if (rep.image_preview_url) setPreview(rep.image_preview_url);
        if (onReportSaved) onReportSaved(rep, imageFile);
      } catch (syncErr) {
        if (syncErr.message?.includes("Failed to fetch") || syncErr.name === "TypeError") {
          setError(`Cannot connect to MedVLM backend server at ${API}. Please ensure the backend server is running via run.bat or 'python -m uvicorn main:app --port 8000' in the backend directory.`);
        } else {
          setError(syncErr.message || "Failed to analyze radiograph.");
        }
      }
    } finally {
      setLoading(false);
      setCurrentStage(null);
    }
  };

  // Recalculate Grad-CAM heatmap for a target condition
  const handleRecalculateCam = async (targetCond) => {
    if (!file && !preview) return;
    setCamLoading(true);
    try {
      let imageFile = file;
      if (!imageFile && preview) {
        const res = await fetch(preview);
        const blob = await res.blob();
        imageFile = new File([blob], "study.jpg", { type: blob.type || "image/jpeg" });
      }

      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("target_pathology", targetCond);

      const res = await fetch(`${API}/gradcam`, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHeatmapUrl(data.heatmap_data_url);
      setSelectedCondition(targetCond);
    } catch (err) {
      alert("Failed to compute Grad-CAM: " + err.message);
    } finally {
      setCamLoading(false);
    }
  };

  // Download diagnostic PDF report
  const handleDownloadPdf = async () => {
    if (!report) return;
    setDownloadingPdf(true);
    try {
      const studyId = report.id;
      let res;
      if (studyId && !studyId.startsWith("TEST")) {
        res = await fetch(`${API}/studies/${studyId}/pdf`);
      }
      if (!res || !res.ok) {
        res = await fetch(`${API}/generate-pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(report),
        });
      }
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MedVLM_${report.id || "Report"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert("Failed to download PDF: " + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="mvlm-main-container">
      {/* High-Impact Clinical Error Banner */}
      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            color: "#fca5a5",
            padding: "12px 18px",
            borderRadius: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 16px rgba(239, 68, 68, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={18} color="#ef4444" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#fca5a5",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Split-Pane Copilot Workspace */}
      <div className="mvlm-workspace-grid" style={{ flex: 1 }}>
        {/* Left Pane: Clinical PACS Radiology Station (Sticky on desktop) */}
        <div className="mvlm-sticky-pane">
          <ImageDropzone
            file={file}
            preview={preview}
            heatmapUrl={heatmapUrl}
            selectedCondition={selectedCondition}
            setSelectedCondition={setSelectedCondition}
            onRecalculateCam={handleRecalculateCam}
            camLoading={camLoading}
            onFileSelect={handleFileSelect}
            onSampleSelect={handleSampleSelect}
            onReset={handleReset}
            onAnalyze={handleAnalyze}
            loading={loading}
            currentStage={currentStage}
            pipelineMode={pipelineMode}
            setPipelineMode={setPipelineMode}
            language={language}
            setLanguage={handleLanguageChange}
            patientAge={patientAge}
            setPatientAge={setPatientAge}
            patientGender={patientGender}
            setPatientGender={setPatientGender}
          />
        </div>

        {/* Right Pane: Structured Diagnostic Report & Copilot */}
        <div>
          {report ? (
            <ClinicalReportView
              report={report}
              onOpenReferral={() => setReferralOpen(true)}
              onOpenSignoff={() => setSignoffOpen(true)}
              onDownloadPdf={handleDownloadPdf}
              downloadingPdf={downloadingPdf}
              onTranslateReport={handleTranslateReport}
              translatingLang={translatingLang}
            />
          ) : (
            /* Empty State: Standby Clinical Decision Support Station */
            <div
              className="mvlm-glass-panel"
              style={{
                padding: "48px 36px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: 520,
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "18px",
                  background: "rgba(6, 182, 212, 0.08)",
                  border: "1px solid rgba(6, 182, 212, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-cyan)",
                  boxShadow: "0 0 24px rgba(6, 182, 212, 0.15)",
                }}
              >
                <FileText size={32} />
              </div>

              <div>
                <h3
                  style={{
                    fontSize: 18,
                    color: "#f8fafc",
                    fontWeight: 700,
                    fontFamily: "var(--font-display)",
                    marginBottom: 6,
                  }}
                >
                  Diagnostic Copilot Standby
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    maxWidth: 400,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  Select a radiograph or sample study in the left viewport and run analysis. The live multi-agent clinical findings, 6-zone lung metrics, and interactive copilot will appear here.
                </p>
              </div>

              {/* Workflow Highlights */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginTop: 10,
                  width: "100%",
                  maxWidth: 440,
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    borderRadius: "8px",
                    border: "1px solid rgba(148, 163, 184, 0.1)",
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <Activity size={13} color="var(--color-cyan)" />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#f8fafc" }}>DenseNet-121</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    14-pathology multi-label classification
                  </span>
                </div>

                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    borderRadius: "8px",
                    border: "1px solid rgba(148, 163, 184, 0.1)",
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <Layers size={13} color="var(--color-cyan)" />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#f8fafc" }}>6 Lung Zones</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    Vision agent anatomical zone evaluation
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Specialist Referral Modal */}
      <ReferralModal
        isOpen={referralOpen}
        onClose={() => setReferralOpen(false)}
        report={report}
      />

      {/* Reviewing Doctor Sign-off Modal */}
      <DoctorSignoffModal
        isOpen={signoffOpen}
        onClose={() => setSignoffOpen(false)}
        report={report}
        onSignSuccess={(updated) => setReport(updated)}
      />
    </div>
  );
}
