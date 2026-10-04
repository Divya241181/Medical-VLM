import { useState, useRef } from "react";
import {
  UploadCloud,
  FileCheck,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  Flame,
  Activity,
  User,
  Globe,
  Zap,
  Info,
  ChevronDown,
  Database,
} from "lucide-react";

const SAMPLES = [
  {
    id: "normal",
    label: "Normal",
    fullName: "Normal Study",
    path: "/samples/sample_normal.jpg",
    color: "#10b981",
    desc: "Clear lung fields, normal cardiothoracic ratio, sharp angles",
  },
  {
    id: "cardiomegaly",
    label: "Cardiomegaly",
    fullName: "Cardiomegaly",
    path: "/samples/sample_cardiomegaly.jpg",
    color: "#f59e0b",
    desc: "Markedly enlarged cardiac silhouette (>50% CTR)",
  },
  {
    id: "pneumonia",
    label: "Pneumonia",
    fullName: "Bilateral Pneumonia",
    path: "/samples/sample_pneumonia.jpg",
    color: "#ef4444",
    desc: "Airspace consolidations, patchy lower lobe infiltrates",
  },
];

const PATHOLOGIES = [
  "Cardiomegaly",
  "Effusion",
  "Pneumothorax",
  "Consolidation",
  "Lung Opacity",
  "Pneumonia",
  "Atelectasis",
  "Infiltration",
  "Mass",
  "Nodule",
];

const WINDOW_PRESETS = [
  { id: "default", name: "Standard", contrast: 100, brightness: 100 },
  { id: "lung", name: "Lung Window", contrast: 125, brightness: 112 },
  { id: "bone", name: "Bone Detail", contrast: 145, brightness: 88 },
  { id: "soft", name: "Soft Tissue", contrast: 90, brightness: 105 },
];

export default function ImageDropzone({
  file,
  preview,
  heatmapUrl,
  selectedCondition,
  setSelectedCondition,
  onRecalculateCam,
  camLoading,
  onFileSelect,
  onSampleSelect,
  onReset,
  onAnalyze,
  loading,
  currentStage,
  pipelineMode,
  setPipelineMode,
  language,
  setLanguage,
  patientAge,
  setPatientAge,
  patientGender,
  setPatientGender,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState(65);
  const [inverted, setInverted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeWindow, setActiveWindow] = useState("default");
  const [showLungZones, setShowLungZones] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const isDicom = Boolean(
    file?.name?.toLowerCase().endsWith(".dcm") || (file && file.type === "application/dicom")
  );

  const currentWindowConfig = WINDOW_PRESETS.find((w) => w.id === activeWindow) || WINDOW_PRESETS[0];

  const baseRadiographFilter = {
    filter: `contrast(${currentWindowConfig.contrast}%) brightness(${currentWindowConfig.brightness}%) ${
      inverted ? "invert(1)" : ""
    }`,
    transition: "filter 0.2s ease",
  };

  const viewportTransform = {
    transform: `scale(${zoomLevel})`,
    transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
    transformOrigin: "center center",
  };

  return (
    <div
      className="mvlm-glass-panel mvlm-panel-padding"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        height: "100%",
      }}
    >
      {/* Station Masthead */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#f8fafc",
                fontFamily: "var(--font-display)",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Activity size={18} color="var(--color-cyan)" />
              Clinical Imaging Console
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                padding: "2px 8px",
                borderRadius: "5px",
                background: isDicom ? "rgba(2, 132, 199, 0.18)" : "rgba(148, 163, 184, 0.12)",
                color: isDicom ? "#38bdf8" : "var(--text-muted)",
                border: `1px solid ${isDicom ? "rgba(56, 189, 248, 0.3)" : "rgba(148, 163, 184, 0.2)"}`,
              }}
            >
              {isDicom ? "DICOM 16-BIT" : (preview || heatmapUrl) ? "CXR PA/AP" : "STANDBY"}
            </span>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginTop: 2 }}>
            Diagnostic PACS Ingestion · Supports DICOM (.dcm), PNG, JPG, and WEBP
          </span>
        </div>

        {/* Console Action Buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            ref={inputRef}
            type="file"
            accept=".dcm,image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onFileSelect(e.target.files[0]);
              }
            }}
          />

          <button
            onClick={() => inputRef.current?.click()}
            className="mvlm-btn-secondary"
            style={{
              borderColor: "rgba(6, 182, 212, 0.3)",
              color: "var(--color-cyan)",
              background: "rgba(6, 182, 212, 0.08)",
            }}
          >
            <UploadCloud size={14} />
            <span>Select File</span>
          </button>

          {(preview || heatmapUrl) && (
            <button
              onClick={() => {
                onReset();
                setZoomLevel(1);
                setActiveWindow("default");
                setInverted(false);
              }}
              className="mvlm-btn-secondary"
              title="Clear study & reset viewport"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Preset Sample Studies Bar */}
      <div
        style={{
          background: "rgba(8, 12, 22, 0.6)",
          borderRadius: "8px",
          border: "1px solid var(--border-subtle)",
          padding: "6px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Reference Cases
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Load into PACS</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 5 }}>
          {SAMPLES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => {
                setZoomLevel(1);
                onSampleSelect(sample.path, `${sample.id}.jpg`);
              }}
              title={`${sample.fullName}: ${sample.desc}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "6px 8px",
                borderRadius: "6px",
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(148, 163, 184, 0.15)",
                cursor: "pointer",
                minWidth: 0,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = sample.color;
                e.currentTarget.style.background = `${sample.color}18`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.15)";
                e.currentTarget.style.background = "rgba(15, 23, 42, 0.7)";
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: sample.color,
                  boxShadow: `0 0 6px ${sample.color}`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "#ffffff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {sample.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Deep Obsidian PACS Radiology Viewport Canvas - Compact */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          height: 230,
          minHeight: 210,
          maxHeight: 245,
          background: "var(--bg-canvas)",
          border: `1.5px ${(preview || heatmapUrl) ? "solid" : "dashed"} ${
            dragOver ? "var(--color-cyan)" : (preview || heatmapUrl) ? "var(--border-subtle)" : "rgba(148, 163, 184, 0.25)"
          }`,
          borderRadius: "10px",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: (preview || heatmapUrl) ? "inset 0 0 30px rgba(0, 0, 0, 0.8)" : "none",
          transition: "all 0.2s ease",
        }}
      >
        {/* Subtle grid pattern background for PACS aesthetics */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.15,
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.15) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            pointerEvents: "none",
          }}
        />

        {preview || heatmapUrl ? (
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {/* Zoomable Radiological Stage */}
            <div
              style={{
                position: "relative",
                maxWidth: "100%",
                maxHeight: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...viewportTransform,
              }}
            >
              {/* Base Chest Radiograph */}
              {preview ? (
                <img
                  src={preview}
                  alt="Chest Radiograph"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 220,
                    objectFit: "contain",
                    ...baseRadiographFilter,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 220,
                    height: 200,
                    background: "radial-gradient(circle, rgba(15,23,42,0.85) 0%, rgba(8,12,22,0.98) 100%)",
                    borderRadius: "8px",
                    border: "1px dashed rgba(148, 163, 184, 0.2)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 12,
                    textAlign: "center",
                  }}
                >
                  <FileText size={26} color="var(--text-dim)" style={{ marginBottom: 4 }} />
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    HISTORICAL STUDY
                  </span>
                  <span style={{ fontSize: 9.5, color: "var(--text-dim)", marginTop: 2 }}>
                    Base radiograph archived in EHR
                  </span>
                </div>
              )}

              {/* Grad-CAM Explainable AI Overlay (Uncorrupted by Base Invert/Windowing) */}
              {heatmapUrl && showHeatmap && (
                <img
                  src={heatmapUrl}
                  alt="Grad-CAM Activation"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    opacity: heatmapOpacity / 100,
                    mixBlendMode: "screen",
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Optional 6-Zone Anatomical Overlay Grid */}
              {showLungZones && (
                <div
                  style={{
                    position: "absolute",
                    inset: "8%",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gridTemplateRows: "1fr 1fr 1fr",
                    gap: 4,
                    pointerEvents: "none",
                  }}
                >
                  {[
                    { id: "RUL", name: "Right Upper Lung (RUL)" },
                    { id: "LUL", name: "Left Upper Lung (LUL)" },
                    { id: "RML", name: "Right Mid Lung (RML)" },
                    { id: "LML", name: "Left Mid Lung (LML)" },
                    { id: "RLL", name: "Right Lower Lung (RLL)" },
                    { id: "LLL", name: "Left Lower Lung (LLL)" },
                  ].map((zone) => (
                    <div
                      key={zone.id}
                      style={{
                        border: "1px dashed rgba(6, 182, 212, 0.4)",
                        background: "rgba(6, 182, 212, 0.05)",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          color: "var(--color-cyan)",
                          background: "rgba(8, 12, 22, 0.7)",
                          padding: "1px 5px",
                          borderRadius: "3px",
                        }}
                      >
                        {zone.id}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clinical HUD Overlays */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 12,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-cyan)",
                  textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                }}
              >
                PA CHEST · 100 kVp
              </span>
              <span style={{ fontSize: 9.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                W: {currentWindowConfig.name} · MAG: {Math.round(zoomLevel * 100)}%
              </span>
            </div>

            {/* Patient Right / Left Orientation Indicators */}
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 14,
                width: 22,
                height: 22,
                borderRadius: "4px",
                background: "rgba(8, 12, 22, 0.7)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: "#f8fafc",
                pointerEvents: "none",
              }}
            >
              L
            </div>

            <div
              style={{
                position: "absolute",
                top: 10,
                left: "calc(100% - 40px)",
              }}
            />
          </div>
        ) : file && isDicom ? (
          /* Staged DICOM Medical Study Viewport */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 30,
              textAlign: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "16px",
                background: "rgba(2, 132, 199, 0.12)",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#38bdf8",
                boxShadow: "0 0 24px rgba(2, 132, 199, 0.25)",
              }}
            >
              <Database size={32} />
            </div>

            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                DICOM 3.0 Medical Study Staged
              </div>
              <div style={{ fontSize: 12, color: "var(--color-cyan)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6, maxWidth: 360, lineHeight: 1.5 }}>
                16-bit uncompressed Medical Imaging dataset loaded. High-resolution pixel array and DICOM tags will be processed and rendered upon analysis.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "#38bdf8",
                  background: "rgba(2, 132, 199, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                }}
              >
                16-BIT VOI LUT READY
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "#10b981",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                }}
              >
                PHI SANITIZED
              </span>
            </div>
          </div>
        ) : (
          /* Empty Ingestion Dropzone Prompt */
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 14px",
              textAlign: "center",
              cursor: "pointer",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "10px",
                background: "rgba(6, 182, 212, 0.08)",
                border: "1px solid rgba(6, 182, 212, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-cyan)",
              }}
            >
              <UploadCloud size={22} />
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>
                Drop Radiograph or Select Above
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, maxWidth: 280 }}>
                Supports DICOM (.dcm), PNG, JPEG, WEBP.
              </div>
            </div>

            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                color: "var(--color-cyan)",
                background: "rgba(6, 182, 212, 0.12)",
                padding: "2px 8px",
                borderRadius: "4px",
              }}
            >
              DICOM 3.0 Compatible
            </span>
          </div>
        )}
      </div>

      {/* PACS Radiologist Viewer Toolset - Compact */}
      {(preview || heatmapUrl) && (
        <div
          style={{
            background: "rgba(8, 12, 22, 0.75)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {/* Top row: Window Presets, Zoom & Invert */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            {/* Window Presets */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginRight: 2 }}>
                WIN:
              </span>
              {WINDOW_PRESETS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setActiveWindow(w.id)}
                  style={{
                    padding: "3px 7px",
                    borderRadius: "4px",
                    border: `1px solid ${activeWindow === w.id ? "var(--color-cyan)" : "rgba(148, 163, 184, 0.2)"}`,
                    background: activeWindow === w.id ? "rgba(6, 182, 212, 0.15)" : "transparent",
                    color: activeWindow === w.id ? "var(--color-cyan)" : "var(--text-secondary)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {w.name}
                </button>
              ))}
            </div>

            {/* Invert, Zones & Zoom Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={() => setInverted(!inverted)}
                title="Invert grayscale polarity"
                className="mvlm-btn-secondary"
                style={{
                  padding: "3px 7px",
                  fontSize: 11,
                  background: inverted ? "rgba(6, 182, 212, 0.15)" : undefined,
                  borderColor: inverted ? "var(--color-cyan)" : undefined,
                  color: inverted ? "var(--color-cyan)" : undefined,
                }}
              >
                Invert
              </button>

              <button
                onClick={() => setShowLungZones(!showLungZones)}
                title="Toggle anatomical 6-zone lung partition grid"
                className="mvlm-btn-secondary"
                style={{
                  padding: "3px 7px",
                  fontSize: 11,
                  background: showLungZones ? "rgba(6, 182, 212, 0.15)" : undefined,
                  borderColor: showLungZones ? "var(--color-cyan)" : undefined,
                  color: showLungZones ? "var(--color-cyan)" : undefined,
                }}
              >
                <Layers size={12} />
                <span>Zones</span>
              </button>

              <div style={{ width: 1, height: 14, background: "rgba(148, 163, 184, 0.2)", margin: "0 1px" }} />

              <button
                onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                disabled={zoomLevel <= 0.75}
                className="mvlm-btn-secondary"
                style={{ padding: "3px 6px" }}
              >
                <ZoomOut size={12} />
              </button>

              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  minWidth: 32,
                  textAlign: "center",
                }}
              >
                {Math.round(zoomLevel * 100)}%
              </span>

              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                disabled={zoomLevel >= 2.5}
                className="mvlm-btn-secondary"
                style={{ padding: "3px 6px" }}
              >
                <ZoomIn size={12} />
              </button>

              {zoomLevel !== 1 && (
                <button
                  onClick={() => setZoomLevel(1)}
                  className="mvlm-btn-secondary"
                  style={{ padding: "3px 7px", fontSize: 11 }}
                >
                  Fit
                </button>
              )}
            </div>
          </div>

          {/* Grad-CAM Explainability Bar */}
          {heatmapUrl && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 8,
                borderTop: "1px solid rgba(148, 163, 184, 0.08)",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                    style={{ accentColor: "var(--color-cyan)" }}
                  />
                  <Flame size={14} color="#f97316" />
                  <span>Grad-CAM Heatmap</span>
                </label>

                {showHeatmap && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 140 }}>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={heatmapOpacity}
                      onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                      className="mvlm-slider"
                    />
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-muted)",
                        minWidth: 32,
                      }}
                    >
                      {heatmapOpacity}%
                    </span>
                  </div>
                )}
              </div>

              {/* Target Pathology Selector for CAM */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                  FOCUS:
                </span>
                <select
                  value={selectedCondition}
                  onChange={(e) => {
                    setSelectedCondition(e.target.value);
                    onRecalculateCam(e.target.value);
                  }}
                  disabled={camLoading}
                  style={{
                    background: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "6px",
                    color: "#f8fafc",
                    fontSize: 11.5,
                    padding: "3px 8px",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {PATHOLOGIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {camLoading && (
                  <span style={{ fontSize: 11, color: "var(--color-cyan)" }}>
                    Computing...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Patient & Acquisition Parameters */}
      <div className="mvlm-demographics-grid">
        {/* Patient Age */}
        <div>
          <label
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              display: "block",
              marginBottom: 3,
              letterSpacing: "0.03em",
            }}
          >
            AGE
          </label>
          <input
            type="number"
            placeholder="e.g. 58"
            value={patientAge}
            onChange={(e) => setPatientAge(e.target.value)}
            disabled={loading}
            style={{
              width: "100%",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "5px",
              padding: "5px 8px",
              color: "#ffffff",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              outline: "none",
            }}
          />
        </div>

        {/* Patient Gender */}
        <div>
          <label
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              display: "block",
              marginBottom: 3,
              letterSpacing: "0.03em",
            }}
          >
            SEX
          </label>
          <select
            value={patientGender}
            onChange={(e) => setPatientGender(e.target.value)}
            disabled={loading}
            style={{
              width: "100%",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "5px",
              padding: "5px 8px",
              color: "#ffffff",
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value="">Unspecified</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Pipeline Mode */}
        <div>
          <label
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              display: "block",
              marginBottom: 3,
              letterSpacing: "0.03em",
            }}
          >
            MODE
          </label>
          <select
            value={pipelineMode}
            onChange={(e) => setPipelineMode(e.target.value)}
            disabled={loading}
            style={{
              width: "100%",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "5px",
              padding: "5px 8px",
              color: "#ffffff",
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value="fast">Fast CDS (Hybrid)</option>
            <option value="multi_agent">Multi-Agent Cascade</option>
            <option value="offline">Edge Offline (100% On-Device)</option>
          </select>
        </div>
      </div>

      {/* Primary Action Button & Streaming Stage Progress */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          onClick={onAnalyze}
          disabled={loading || (!file && !preview)}
          className="mvlm-btn-primary"
          style={{
            height: 38,
            fontSize: 13,
            letterSpacing: "0.02em",
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 16,
                  height: 16,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#ffffff",
                  borderRadius: "50%",
                  animation: "loaderSpin 0.8s linear infinite",
                }}
              />
              <span>{currentStage || "Analyzing Radiograph..."}</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Run Diagnostic Analysis</span>
            </>
          )}
        </button>

        {/* Active Stage Indicator during SSE Streaming */}
        {loading && (
          <div
            style={{
              background: "rgba(6, 182, 212, 0.08)",
              border: "1px solid rgba(6, 182, 212, 0.25)",
              borderRadius: "8px",
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 11.5,
              color: "var(--color-cyan)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={14} className="mvlm-status-dot active" />
              <span style={{ fontFamily: "var(--font-mono)" }}>
                {currentStage || "Processing pipeline cascade..."}
              </span>
            </div>
            {/* Animated Warm-to-Cyan Streaming Bar */}
            <div
              style={{
                width: "100%",
                height: 4,
                background: "rgba(30, 41, 59, 0.8)",
                borderRadius: 999,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div className="mvlm-streaming-gradient-bar" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
