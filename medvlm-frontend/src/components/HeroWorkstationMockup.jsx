import React, { useState } from "react";
import {
  Activity,
  Layers,
  ShieldCheck,
  Eye,
  EyeOff,
  Cpu,
  BrainCircuit,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MessageSquare,
  ArrowRight,
  Maximize2,
  Sliders,
  Crosshair,
} from "lucide-react";
import "./HeroWorkstationMockup.css";

const MOCKUP_CASES = [
  {
    id: "pneumonia",
    label: "Case 01: RLL Pneumonia",
    shortLabel: "Pneumonia",
    tag: "Urgent",
    tagColor: "#f59e0b",
    image: "/samples/sample_pneumonia.jpg",
    patientId: "MV-98421-PA",
    patientMeta: "62Y • Male • PA Erect",
    exposure: "120 kVp • 4.2 mAs",
    primaryPathology: "Consolidation / Infiltrate",
    heatmapZone: "rll",
    hudLabel: "RLL CONSOLIDATION [p=0.942]",
    hudSub: "Silhouette sign (+) • Air bronchograms",
    hudCoords: { top: "62%", left: "26%", width: "24%", height: "22%" },
    predictions: [
      { name: "Consolidation", prob: 94.2, color: "#ef4444" },
      { name: "Infiltration", prob: 88.5, color: "#f97316" },
      { name: "Pneumonia", prob: 82.1, color: "#f59e0b" },
      { name: "Atelectasis", prob: 31.4, color: "#38bdf8" },
    ],
    findings:
      "Dense airspace consolidation in the right lower lung zone with visible air bronchograms. Right hemidiaphragm contour partially obscured. Left lung fields clear. No pneumothorax.",
    impression:
      "Acute right lower lobe consolidation, highly consistent with community-acquired lobar pneumonia. No cavitary change.",
    zones: [
      { name: "RUL", status: "Clear", alert: false },
      { name: "LUL", status: "Clear", alert: false },
      { name: "RML", status: "Borderline", alert: false },
      { name: "LML", status: "Clear", alert: false },
      { name: "RLL", status: "Consolidation (94%)", alert: true },
      { name: "LLL", status: "Clear", alert: false },
    ],
    copilotQ: "Are there signs of pleural effusion or cavitary necrosis?",
    copilotA:
      "Trace right costophrenic angle blunting noted; no loculated fluid or cavitary necrosis. Findings favor uncomplicated acute lobar pneumonia.",
    recText: "Sputum Gram stain & culture; initiate empiric antibiotic therapy per IDSA/ATS guidelines.",
  },
  {
    id: "cardiomegaly",
    label: "Case 02: Cardiomegaly",
    shortLabel: "Cardiomegaly",
    tag: "High Alert",
    tagColor: "#f97316",
    image: "/samples/sample_cardiomegaly.jpg",
    patientId: "MV-76319-PA",
    patientMeta: "71Y • Female • PA Erect",
    exposure: "115 kVp • 3.8 mAs",
    primaryPathology: "Cardiomegaly / Congestion",
    heatmapZone: "cardiac",
    hudLabel: "CARDIOMEGALY [CTR: 0.59]",
    hudSub: "Bilateral hilar haziness • Cephalization",
    hudCoords: { top: "48%", left: "34%", width: "36%", height: "34%" },
    predictions: [
      { name: "Cardiomegaly", prob: 91.4, color: "#ef4444" },
      { name: "Pulmonary Edema", prob: 79.8, color: "#f97316" },
      { name: "Pleural Effusion", prob: 64.2, color: "#f59e0b" },
      { name: "Consolidation", prob: 14.5, color: "#38bdf8" },
    ],
    findings:
      "Marked enlargement of the cardiac silhouette with cardiothoracic ratio of 0.59. Upper lobe vascular redistribution (cephalization) and bilateral perihilar haziness.",
    impression:
      "Moderate-to-severe cardiomegaly with pulmonary vascular congestion and trace sympathetic effusions, consistent with decompensated heart failure.",
    zones: [
      { name: "RUL", status: "Vascular Congestion", alert: false },
      { name: "LUL", status: "Vascular Congestion", alert: false },
      { name: "RML", status: "Perihilar Haziness", alert: false },
      { name: "LML", status: "Perihilar Haziness", alert: false },
      { name: "RLL", status: "Blunted Sulcus", alert: true },
      { name: "LLL", status: "Enlarged Apex (91%)", alert: true },
    ],
    copilotQ: "What is the measured Cardiothoracic Ratio (CTR)?",
    copilotA:
      "Cardiac transverse width is 17.8 cm against 30.1 cm thoracic diameter, yielding a CTR of 0.59 (exceeds standard 0.50 threshold).",
    recText: "Echocardiogram to assess ejection fraction; review diuretic regimen and serum BNP.",
  },
  {
    id: "normal",
    label: "Case 03: Routine Screening",
    shortLabel: "Clear Normal",
    tag: "Unremarkable",
    tagColor: "#10b981",
    image: "/samples/sample_normal.jpg",
    patientId: "MV-41098-PA",
    patientMeta: "44Y • Male • PA Erect",
    exposure: "120 kVp • 3.2 mAs",
    primaryPathology: "No Acute Thoracic Abnormality",
    heatmapZone: "none",
    hudLabel: "UNREMARKABLE THORAX",
    hudSub: "Clear sulci • Normal mediastinum",
    hudCoords: { top: "35%", left: "25%", width: "50%", height: "50%" },
    predictions: [
      { name: "No Finding (Normal)", prob: 96.2, color: "#10b981" },
      { name: "Atelectasis", prob: 5.1, color: "#64748b" },
      { name: "Cardiomegaly", prob: 4.2, color: "#64748b" },
      { name: "Infiltration", prob: 3.8, color: "#64748b" },
    ],
    findings:
      "Trachea is midline. Both lungs are normally inflated and clear without focal consolidation, pneumothorax, or effusion. Normal cardiac contours and sharp costophrenic angles.",
    impression:
      "Normal chest radiograph. No acute cardiopulmonary pathology or thoracic abnormality identified.",
    zones: [
      { name: "RUL", status: "Clear", alert: false },
      { name: "LUL", status: "Clear", alert: false },
      { name: "RML", status: "Clear", alert: false },
      { name: "LML", status: "Clear", alert: false },
      { name: "RLL", status: "Clear", alert: false },
      { name: "LLL", status: "Clear", alert: false },
    ],
    copilotQ: "Are there occult apical or retrocardiac densities?",
    copilotA:
      "Both apices and retrocardiac spaces exhibit normal radiolucency. No hidden nodular opacities or apical pleural thickening found.",
    recText: "No further diagnostic intervention required. Continue routine preventative health screening.",
  },
];

export default function HeroWorkstationMockup({ onLaunchStudio }) {
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(true);

  const activeCase = MOCKUP_CASES[activeCaseIndex];

  return (
    <div className="mvlm-mockup-frame">
      {/* Top Application Bar */}
      <div className="mvlm-mockup-topbar">
        {/* Left: Window Controls & Hospital Badge */}
        <div className="mvlm-mockup-top-left">
          <div className="mvlm-mockup-dots">
            <span className="dot red" />
            <span className="dot amber" />
            <span className="dot green" />
          </div>
          <div className="mvlm-mockup-app-title">
            <span className="bold">MedVLM Studio</span>
            <span className="badge">PACS Gateway v4.2</span>
          </div>
        </div>

        {/* Center: Interactive Study Selector Pills */}
        <div className="mvlm-mockup-tabs">
          {MOCKUP_CASES.map((item, idx) => (
            <button
              key={item.id}
              className={`mvlm-mockup-tab-pill ${activeCaseIndex === idx ? "active" : ""}`}
              onClick={() => setActiveCaseIndex(idx)}
              title={`Switch to ${item.label}`}
            >
              <Activity size={12} />
              <span>{item.shortLabel}</span>
              <span
                className="status-pill"
                style={{
                  color: item.tagColor,
                  borderColor: `${item.tagColor}40`,
                  background: `${item.tagColor}15`,
                }}
              >
                {item.tag}
              </span>
            </button>
          ))}
        </div>

        {/* Right: Live Telemetry Indicator */}
        <div className="mvlm-mockup-top-right">
          <span className="pulse-indicator" />
          <span className="telemetry-text">Dual-Engine Active • 240ms</span>
        </div>
      </div>

      {/* 3-Column Clinical Workstation Body */}
      <div className="mvlm-mockup-grid">
        {/* COLUMN 1: Clinical PACS Radiology Viewport */}
        <div className="mvlm-mockup-col mvlm-col-viewport">
          {/* Viewport Sub-header */}
          <div className="mvlm-viewport-head">
            <div className="viewport-meta">
              <span className="tag-mono">DICOM 3.0 PA</span>
              <span className="dim">•</span>
              <span className="tag-sub">{activeCase.patientId}</span>
            </div>
            <div className="viewport-actions">
              <button
                className={`cam-toggle-btn ${showHeatmap ? "active" : ""}`}
                onClick={() => setShowHeatmap(!showHeatmap)}
                title="Toggle PyTorch Grad-CAM Saliency Heatmap"
              >
                {showHeatmap ? <Eye size={12} /> : <EyeOff size={12} />}
                <span>{showHeatmap ? "Grad-CAM On" : "Original"}</span>
              </button>
            </div>
          </div>

          {/* Radiograph Screen */}
          <div className="mvlm-radiograph-screen">
            <img
              src={activeCase.image}
              alt={activeCase.label}
              className="mvlm-radiograph-img"
            />

            {/* Continuous Laser Scanning Beam */}
            <div className="mvlm-laser-line" />

            {/* Grad-CAM Saliency Heatmap Layer */}
            {showHeatmap && (
              <div
                className={`mvlm-heatmap-layer heatmap-${activeCase.heatmapZone}`}
              />
            )}

            {/* Anatomical Bounding HUD Box (When pathology present) */}
            {activeCase.heatmapZone !== "none" && showHeatmap && (
              <div
                className="mvlm-hud-box"
                style={{
                  top: activeCase.hudCoords.top,
                  left: activeCase.hudCoords.left,
                  width: activeCase.hudCoords.width,
                  height: activeCase.hudCoords.height,
                }}
              >
                <div className="hud-corner top-left" />
                <div className="hud-corner top-right" />
                <div className="hud-corner bottom-left" />
                <div className="hud-corner bottom-right" />
                <div className="hud-target-marker">
                  <Crosshair size={14} color="#06b6d4" />
                </div>
                <div className="hud-label-tag">
                  <div className="hud-title">{activeCase.hudLabel}</div>
                  <div className="hud-sub">{activeCase.hudSub}</div>
                </div>
              </div>
            )}

            {/* Authentic DICOM Corner HUD Overlays */}
            <div className="dicom-corner top-left">
              <div>{activeCase.patientId}</div>
              <div className="dim">{activeCase.patientMeta}</div>
            </div>
            <div className="dicom-corner top-right">
              <div>{activeCase.exposure}</div>
              <div className="dim">16-bit Windowing</div>
            </div>
            <div className="dicom-corner bottom-left">
              <div>WL: 450 WW: 2400</div>
              <div className="dim">LUNG WINDOW</div>
            </div>
            <div className="dicom-corner bottom-right">
              <div className="hud-green">DENSENET S4: PASS</div>
              <div className="dim">ZOOM 100%</div>
            </div>
          </div>

          {/* Viewport Footer Bar */}
          <div className="mvlm-viewport-foot">
            <div className="foot-item">
              <span className="lbl">Modality:</span>
              <span className="val">Digital Radiography (DR)</span>
            </div>
            <div className="foot-item">
              <span className="lbl">Grid:</span>
              <span className="val">Standard 6-Zone Thorax</span>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Dual-Engine Findings & Report */}
        <div className="mvlm-mockup-col mvlm-col-report">
          {/* Header */}
          <div className="mvlm-col-header">
            <div className="header-title-wrap">
              <Cpu size={14} color="#06b6d4" />
              <span>Engine 1: TorchXRayVision DenseNet-121</span>
            </div>
            <span className="header-badge">240ms Latency</span>
          </div>

          {/* 14-Pathology Probability Meters */}
          <div className="mvlm-predictions-card">
            <div className="predictions-header">
              <span>Pathology Screening</span>
              <span>Confidence</span>
            </div>
            <div className="predictions-list">
              {activeCase.predictions.map((p, i) => (
                <div key={i} className="prediction-row">
                  <div className="pred-info">
                    <span className="pred-name">{p.name}</span>
                    <span className="pred-prob" style={{ color: p.color }}>
                      {p.prob.toFixed(1)}%
                    </span>
                  </div>
                  <div className="pred-bar-track">
                    <div
                      className="pred-bar-fill"
                      style={{
                        width: `${p.prob}%`,
                        background:
                          p.prob >= 75
                            ? "linear-gradient(90deg, #06b6d4 0%, #10b981 20%, #f59e0b 55%, #ef4444 100%)"
                            : p.prob >= 35
                            ? "linear-gradient(90deg, #06b6d4 0%, #38bdf8 35%, #f59e0b 100%)"
                            : "linear-gradient(90deg, #10b981 0%, #06b6d4 100%)",
                        boxShadow:
                          p.prob >= 75
                            ? "0 0 10px rgba(239, 68, 68, 0.45)"
                            : p.prob >= 35
                            ? "0 0 8px rgba(245, 158, 11, 0.35)"
                            : "0 0 6px rgba(6, 182, 212, 0.25)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Engine 2: Gemini 3.8 Flash Clinical Reasoning */}
          <div className="mvlm-reasoning-wrap">
            <div className="mvlm-col-header" style={{ marginBottom: 6 }}>
              <div className="header-title-wrap">
                <BrainCircuit size={14} color="#10b981" />
                <span>Engine 2: Gemini 3.8 Flash Multimodal</span>
              </div>
              <span
                className="header-badge"
                style={{
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "#10b981",
                  borderColor: "rgba(16, 185, 129, 0.3)",
                }}
              >
                Grounded
              </span>
            </div>

            {/* Findings Box */}
            <div className="findings-card">
              <div className="card-kicker">RADIOLOGICAL FINDINGS</div>
              <p className="card-body-text">{activeCase.findings}</p>
            </div>

            {/* Impression Box */}
            <div className="impression-card">
              <div className="card-kicker highlight">CLINICAL IMPRESSION</div>
              <p className="card-body-text highlight">{activeCase.impression}</p>
            </div>

            {/* 6-Zone Lung Map Mini Chips */}
            <div className="zone-chips-container">
              <div className="zone-chips-label">Thoracic Saliency Grid:</div>
              <div className="zone-chips-grid">
                {activeCase.zones.map((z, idx) => (
                  <div
                    key={idx}
                    className={`zone-chip ${z.alert ? "alert" : ""}`}
                  >
                    <span className="zone-code">{z.name}:</span>
                    <span className="zone-val">{z.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 3: Clinical AI Co-Pilot & Action Terminal */}
        <div className="mvlm-mockup-col mvlm-col-copilot">
          <div className="mvlm-col-header">
            <div className="header-title-wrap">
              <MessageSquare size={14} color="#06b6d4" />
              <span>Interactive Clinical Co-Pilot</span>
            </div>
            <span
              className="header-badge"
              style={{
                background: "rgba(6, 182, 212, 0.12)",
                color: "#06b6d4",
                borderColor: "rgba(6, 182, 212, 0.3)",
              }}
            >
              Ready
            </span>
          </div>

          {/* Dialogue Feed */}
          <div className="copilot-chat-feed">
            <div className="chat-bubble user">
              <div className="bubble-author">Attending Radiologist</div>
              <p>{activeCase.copilotQ}</p>
            </div>

            <div className="chat-bubble ai">
              <div className="bubble-author">
                <Sparkles size={11} />
                <span>MedVLM Clinical Assistant</span>
              </div>
              <p>{activeCase.copilotA}</p>
            </div>

            {/* Suggested Clinical Next Step */}
            <div className="clinical-action-box">
              <div className="action-kicker">RECOMMENDED CLINICAL ACTION</div>
              <p className="action-text">{activeCase.recText}</p>
            </div>
          </div>

          {/* Hybrid Safety Arbiter Seal */}
          <div className="safety-arbiter-seal">
            <div className="seal-icon">
              <ShieldCheck size={18} color="#10b981" />
            </div>
            <div className="seal-details">
              <div className="seal-title">Hybrid Safety Arbiter Verified</div>
              <div className="seal-sub">
                Dual-engine cross-validation • Zero hallucination risk
              </div>
            </div>
          </div>

          {/* Action Launch Button */}
          <button
            onClick={onLaunchStudio}
            className="mvlm-mockup-launch-btn"
            title="Open Interactive Clinical Studio"
          >
            <span>Launch Clinical Studio</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
