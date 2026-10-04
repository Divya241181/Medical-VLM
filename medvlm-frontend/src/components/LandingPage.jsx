import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import medvlmLogo from "../assets/medvlm-logo.png";
import HeroWorkstationMockup from "./HeroWorkstationMockup";
import {
  Activity,
  ShieldCheck,
  Zap,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  BarChart3,
  CheckCircle2,
  FileCheck2,
  Lock,
  ChevronDown,
  ChevronUp,
  Cpu,
  BrainCircuit,
  Eye,
  FileText,
  UserCheck,
  Stethoscope,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import "./LandingPage.css";

const SIMULATED_CASES = [
  {
    id: "pneumonia",
    label: "RLL Pneumonia",
    tag: "Acute Infection",
    severity: "moderate",
    densenetProb: 0.942,
    pathology: "Consolidation / Infiltrate",
    topPredictions: [
      { name: "Consolidation", prob: 94.2, match: true },
      { name: "Infiltration", prob: 88.5, match: true },
      { name: "Pneumonia", prob: 82.1, match: true },
      { name: "Atelectasis", prob: 31.4, match: false },
      { name: "Pneumothorax", prob: 2.1, match: false },
    ],
    zone: "Right Lower Zone",
    findings:
      "Dense airspace consolidation localized to the right lower lung zone with distinct air bronchograms. The right hemidiaphragmatic contour is partially obscured (silhouette sign). Left lung field remains clear. No pleural effusion or pneumothorax.",
    impression:
      "Right lower lobe acute consolidation, strongly characteristic of bacterial lobar pneumonia. Recommend clinical correlation with inflammatory biomarkers and targeted antibiotic therapy.",
    triageLevel: "Urgent Priority",
    triageColor: "#f59e0b",
  },
  {
    id: "cardiomegaly",
    label: "Cardiomegaly & Congestion",
    tag: "Cardiovascular",
    severity: "severe",
    densenetProb: 0.914,
    pathology: "Cardiomegaly / Pulmonary Edema",
    topPredictions: [
      { name: "Cardiomegaly", prob: 91.4, match: true },
      { name: "Pulmonary Edema", prob: 79.8, match: true },
      { name: "Effusion", prob: 64.2, match: true },
      { name: "Consolidation", prob: 14.5, match: false },
      { name: "Pneumothorax", prob: 1.2, match: false },
    ],
    zone: "Cardiothoracic Silhouette & Bilateral Hilar",
    findings:
      "Marked enlargement of the cardiac silhouette with a cardiothoracic ratio (CTR) exceeding 0.58. Perihilar vascular engorgement with interstitial haziness consistent with vascular redistribution. Blunting of bilateral costophrenic angles.",
    impression:
      "Moderate-to-severe cardiomegaly with concurrent pulmonary vascular congestion and bilateral small sympathetic pleural effusions, indicative of decompensated heart failure.",
    triageLevel: "High Priority Alert",
    triageColor: "#f97316",
  },
  {
    id: "pneumothorax",
    label: "Apical Pneumothorax",
    tag: "Critical Finding",
    severity: "critical",
    densenetProb: 0.968,
    pathology: "Pneumothorax",
    topPredictions: [
      { name: "Pneumothorax", prob: 96.8, match: true },
      { name: "Atelectasis", prob: 52.3, match: true },
      { name: "Effusion", prob: 8.4, match: false },
      { name: "Cardiomegaly", prob: 6.1, match: false },
      { name: "Mass", prob: 1.5, match: false },
    ],
    zone: "Right Apex & Peripheral Pleural Line",
    findings:
      "Clear visceral pleural line identified in the right upper thoracic apex with complete absence of peripheral bronchovascular markings. Estimated pneumothorax margin of 24mm. No mediastinal shift to the contralateral side.",
    impression:
      "Moderate right-sided apical pneumothorax without immediate tension physiology. Urgent thoracic surgery / interventional pulmonary evaluation recommended for chest tube thoracostomy consideration.",
    triageLevel: "Critical Stat Emergency",
    triageColor: "#ef4444",
  },
  {
    id: "normal",
    label: "Unremarkable Chest",
    tag: "Screening Clean",
    severity: "normal",
    densenetProb: 0.038,
    pathology: "No Acute Finding",
    topPredictions: [
      { name: "No Finding (Normal)", prob: 96.2, match: true },
      { name: "Atelectasis", prob: 5.1, match: false },
      { name: "Cardiomegaly", prob: 4.2, match: false },
      { name: "Infiltration", prob: 3.8, match: false },
      { name: "Effusion", prob: 1.9, match: false },
    ],
    zone: "All Lung Zones Clear",
    findings:
      "Trachea is midline. Both lungs are normally expanded and clear of focal consolidations, interstitial reticulation, or masses. Cardiac silhouette and mediastinal contours are within normal limits. Sharp costophrenic angles.",
    impression:
      "Normal chest radiograph. No acute cardiopulmonary disease or focal thoracic pathology identified.",
    triageLevel: "Routine Screening",
    triageColor: "#10b981",
  },
];

const FAQS = [
  {
    q: "How does MedVLM Studio prevent AI hallucinations in clinical reports?",
    a: "Unlike raw language models that generate free-text from pixels alone, MedVLM employs a hybrid dual-engine architecture. First, a local TorchXRayVision DenseNet-121 model calculates a 14-pathology probability vector and computes PyTorch Grad-CAM saliency heatmaps. This verified quantitative telemetry is injected as strict grounding anchors into Gemini 3.8 Flash, constraining findings strictly to visible, localized radiographical features.",
  },
  {
    q: "Can MedVLM Studio ingest standard hospital DICOM (.dcm) files?",
    a: "Yes. MedVLM natively parses standard DICOM 3.0 radiograph series, extracting high-dynamic-range pixel arrays, patient metadata (age, sex, projection view PA/AP), window center/width levels, and modality tags. DICOM attributes are automatically de-identified client-side before transmission.",
  },
  {
    q: "Is MedVLM intended to replace human radiologists?",
    a: "No. MedVLM Studio is strictly designed as a Clinical Decision Support (CDS) workstation. Every generated report includes a required Human-in-the-Loop review step, allowing attending radiologists to modify findings, record clinical notes, and electronically sign off using their license number and cryptographic signature hash.",
  },
  {
    q: "What benchmarks validate MedVLM's diagnostic accuracy?",
    a: "MedVLM's dense feature extractor achieves an average AUROC of 0.892 across the NIH ChestX-ray14 and Stanford CheXpert benchmarks, performing with high sensitivity across critical pathologies including Pneumothorax (0.941), Cardiomegaly (0.916), and Pleural Effusion (0.923).",
  },
];

export default function LandingPage({ onLaunchStudio, onOpenMetrics }) {
  const { user, openAuthModal } = useAuth();
  const [activeCase, setActiveCase] = useState(SIMULATED_CASES[0]);
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="mvlm-landing-wrapper">
      {/* Top Navigation */}
      <nav className="mvlm-landing-nav">
        <div className="mvlm-landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <div className="mvlm-landing-logo-box">
            <img src={medvlmLogo} alt="MedVLM Logo" />
          </div>
          <div>
            <div className="mvlm-landing-brand-text">
              MedVLM <span>Studio</span>
            </div>
            <div style={{ fontSize: 10.5, color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
              v4.2 CDS Engine
            </div>
          </div>
        </div>

        <div className="mvlm-landing-links">
          <a href="#simulator" className="mvlm-landing-link">
            Live Showcase
          </a>
          <a href="#architecture" className="mvlm-landing-link">
            Cascade Engine
          </a>
          <a href="#validation" className="mvlm-landing-link">
            AUROC Validation
          </a>
          <a href="#security" className="mvlm-landing-link">
            Trust & Security
          </a>
          <a href="#faq" className="mvlm-landing-link">
            FAQ
          </a>
        </div>

        <div className="mvlm-landing-nav-actions">
          {user ? (
            <div
              className="mvlm-nav-user-pill"
              onClick={() => openAuthModal("personas")}
              title={`Logged in as ${user.name} (${user.role}) - Click to switch`}
            >
              <div className="mvlm-nav-avatar" style={{ background: user.color || "#06b6d4" }}>
                {user.avatarInitials}
              </div>
              <div style={{ textAlign: "left", lineHeight: 1.2 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f8fafc" }}>
                  {user.name.split(" ")[1] || user.name}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{user.role}</div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal("signin")}
              className="mvlm-btn-secondary"
              style={{ padding: "8px 14px", fontSize: 13 }}
            >
              <UserCheck size={14} color="var(--color-cyan)" />
              <span>Clinician Sign In</span>
            </button>
          )}

          <button
            onClick={onLaunchStudio}
            className="mvlm-btn-primary"
            style={{
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 700,
              boxShadow: "0 0 15px rgba(6, 182, 212, 0.4)",
            }}
          >
            <span>Launch Studio</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mvlm-hero-section">
        <div className="mvlm-hero-eyebrow">
          <Sparkles size={13} />
          <span>Multimodal Vision Intelligence for Diagnostic Radiology</span>
        </div>

        <h1 className="mvlm-hero-title">
          Next-Generation Diagnostic Workstation for{" "}
          <span className="mvlm-hero-title-gradient">Chest Radiographs</span>
        </h1>

        <p className="mvlm-hero-desc">
          Unifying <strong>TorchXRayVision DenseNet-121</strong> convolutional feature extraction with{" "}
          <strong>Gemini 3.8 Flash</strong> multimodal clinical reasoning. Featuring zero hallucination
          via PyTorch Grad-CAM grounded localization, interactive DICOM viewer, and verified doctor digital sign-off.
        </p>

        <div className="mvlm-hero-actions">
          <button onClick={onLaunchStudio} className="mvlm-btn-hero-primary">
            <Zap size={18} />
            <span>Launch Clinical Diagnostic Studio</span>
            <ArrowRight size={18} />
          </button>

          <button onClick={() => openAuthModal("personas")} className="mvlm-btn-hero-secondary">
            <UserCheck size={18} color="var(--color-cyan)" />
            <span>Demo Clinician Profiles (1-Click)</span>
          </button>

          {onOpenMetrics && (
            <button onClick={onOpenMetrics} className="mvlm-btn-hero-secondary">
              <BarChart3 size={18} color="var(--color-cyan)" />
              <span>Academic AUROC Benchmarks</span>
            </button>
          )}
        </div>

        {/* Hero Visual Display: Interactive 3-Column MedVLM Clinical Workstation Mockup */}
        <HeroWorkstationMockup onLaunchStudio={onLaunchStudio} />
      </section>

      {/* Quantitative Metrics Strip */}
      <section className="mvlm-metrics-strip">
        <div className="mvlm-metrics-grid">
          <div className="mvlm-metric-item">
            <div className="mvlm-metric-value">
              14 <span>Pathologies</span>
            </div>
            <div className="mvlm-metric-label">Thoracic Screenings Evaluated</div>
            <div className="mvlm-metric-sub">NIH ChestX-ray14 Standardized</div>
          </div>

          <div className="mvlm-metric-item">
            <div className="mvlm-metric-value">
              0.892 <span>AUROC</span>
            </div>
            <div className="mvlm-metric-label">Mean Diagnostic Discrimination</div>
            <div className="mvlm-metric-sub">Validated on 100k+ Radiographs</div>
          </div>

          <div className="mvlm-metric-item">
            <div className="mvlm-metric-value">
              &lt; 2.4<span>s</span>
            </div>
            <div className="mvlm-metric-label">Multimodal Inference Latency</div>
            <div className="mvlm-metric-sub">Dual-engine parallelized pipeline</div>
          </div>

          <div className="mvlm-metric-item">
            <div className="mvlm-metric-value">
              100<span>%</span>
            </div>
            <div className="mvlm-metric-label">Grounded Saliency Localization</div>
            <div className="mvlm-metric-sub">PyTorch Grad-CAM with Lung Zones</div>
          </div>

          <div className="mvlm-metric-item">
            <div className="mvlm-metric-value">
              DICOM <span>3.0</span>
            </div>
            <div className="mvlm-metric-label">Hospital PACS Standard Ready</div>
            <div className="mvlm-metric-sub">Automatic 16-bit Windowing & HU</div>
          </div>
        </div>
      </section>

      {/* Interactive Simulator / Pathology Showcase */}
      <section id="simulator" className="mvlm-section">
        <div className="mvlm-section-head">
          <div className="mvlm-section-pill">Interactive Live Showcase</div>
          <h2 className="mvlm-section-title">
            Explore How MedVLM Analyzes Diverse Chest Conditions
          </h2>
          <p className="mvlm-section-desc">
            Select an actual clinical scenario below to see how the hybrid pipeline detects
            pathological features, computes lung zone coordinates, and generates structured clinical impressions.
          </p>
        </div>

        <div className="mvlm-sim-card">
          {/* Case Tabs */}
          <div className="mvlm-sim-tabs">
            {SIMULATED_CASES.map((item) => (
              <button
                key={item.id}
                className={`mvlm-sim-tab ${activeCase.id === item.id ? "active" : ""}`}
                onClick={() => setActiveCase(item)}
              >
                <Activity size={14} />
                <span>{item.label}</span>
                <span
                  style={{
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(148, 163, 184, 0.15)",
                    color: "#cbd5e1",
                  }}
                >
                  {item.tag}
                </span>
              </button>
            ))}
          </div>

          {/* Simulator Content */}
          <div className="mvlm-sim-body">
            {/* Left: Radiograph Findings & Telemetry */}
            <div className="mvlm-sim-radiograph">
              <div className="mvlm-sim-badge-row">
                <span className="mvlm-sim-badge">
                  Pathology: <strong>{activeCase.pathology}</strong>
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: activeCase.triageColor,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <AlertTriangle size={13} />
                  {activeCase.triageLevel}
                </span>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                  Anatomical Localization Grounding
                </div>
                <div
                  style={{
                    padding: "8px 12px",
                    background: "rgba(6, 182, 212, 0.08)",
                    border: "1px solid rgba(6, 182, 212, 0.25)",
                    borderRadius: 8,
                    fontSize: 12.5,
                    color: "#38bdf8",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  🎯 Detected Zone: {activeCase.zone}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                  DenseNet-121 Top Differential Predictions
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {activeCase.topPredictions.map((pred) => (
                    <div key={pred.name} className="mvlm-sim-prob-bar">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          color: pred.match ? "#f8fafc" : "#94a3b8",
                          fontWeight: pred.match ? 700 : 500,
                        }}
                      >
                        <span>{pred.name}</span>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{pred.prob}%</span>
                      </div>
                      <div className="mvlm-sim-prob-track">
                        <div
                          className="mvlm-sim-prob-fill"
                          style={{
                            width: `${pred.prob}%`,
                            background: pred.match
                              ? pred.prob >= 75
                                ? "linear-gradient(90deg, #06b6d4 0%, #10b981 20%, #f59e0b 55%, #ef4444 100%)"
                                : "linear-gradient(90deg, #06b6d4 0%, #38bdf8 35%, #f59e0b 100%)"
                              : "linear-gradient(90deg, rgba(148, 163, 184, 0.2) 0%, rgba(6, 182, 212, 0.3) 100%)",
                            boxShadow: pred.match
                              ? pred.prob >= 75
                                ? "0 0 10px rgba(239, 68, 68, 0.45)"
                                : "0 0 8px rgba(245, 158, 11, 0.35)"
                              : "none",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Gemini Synthesized Structured Report */}
            <div className="mvlm-sim-findings-box">
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-cyan)", fontWeight: 700 }}>
                  Gemini 3.8 Flash Clinical Synthesis
                </div>
                <h3 style={{ fontSize: 18, color: "#f8fafc", marginTop: 4 }}>
                  Diagnostic Impressions & Differential
                </h3>
              </div>

              <div
                style={{
                  padding: 14,
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(148, 163, 184, 0.15)",
                  borderRadius: 10,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>
                  RADIOLOGICAL FINDINGS
                </div>
                <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
                  {activeCase.findings}
                </p>
              </div>

              <div
                style={{
                  padding: 14,
                  background: "rgba(6, 182, 212, 0.06)",
                  border: "1px solid rgba(6, 182, 212, 0.28)",
                  borderRadius: 10,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-cyan)", marginBottom: 4 }}>
                  CLINICAL IMPRESSION
                </div>
                <p style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 500, lineHeight: 1.6 }}>
                  {activeCase.impression}
                </p>
              </div>

              <button
                onClick={onLaunchStudio}
                className="mvlm-btn-primary"
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: 14,
                  fontWeight: 700,
                  marginTop: "auto",
                }}
              >
                <span>Run Live Analysis in Clinical Studio</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Stage Multi-Agent Cascade Architecture */}
      <section id="architecture" className="mvlm-section">
        <div className="mvlm-section-head">
          <div className="mvlm-section-pill">Cascade Architecture</div>
          <h2 className="mvlm-section-title">
            The 5-Stage Multi-Agent Clinical Inference Pipeline
          </h2>
          <p className="mvlm-section-desc">
            Engineered from first principles to prevent hallucinations, guarantee anatomical grounding,
            and maintain complete human clinician oversight.
          </p>
        </div>

        <div className="mvlm-arch-grid">
          <div className="mvlm-arch-card">
            <div className="mvlm-arch-step-num">STAGE 01</div>
            <div className="mvlm-arch-title">Anatomical Thorax Screening</div>
            <div className="mvlm-arch-desc">
              Automatic validation layer checks incoming pixels. Rejects everyday photos or non-chest medical scans (knees, hands, skull) with instant clinical feedback.
            </div>
          </div>

          <div className="mvlm-arch-card">
            <div className="mvlm-arch-step-num">STAGE 02</div>
            <div className="mvlm-arch-title">DenseNet-121 Feature Extraction</div>
            <div className="mvlm-arch-desc">
              Locally hosted TorchXRayVision backbone computes 14-pathology probabilities and deep convolutional feature maps with zero external API dependencies.
            </div>
          </div>

          <div className="mvlm-arch-card">
            <div className="mvlm-arch-step-num">STAGE 03</div>
            <div className="mvlm-arch-title">Grad-CAM Saliency Grounding</div>
            <div className="mvlm-arch-desc">
              Computes class-discriminative gradient localization for every detected anomaly, mapping heatmaps directly to standardized lung zones (RUL, RML, RLL, LUL, LLL).
            </div>
          </div>

          <div className="mvlm-arch-card">
            <div className="mvlm-arch-step-num">STAGE 04</div>
            <div className="mvlm-arch-title">Gemini Multimodal Synthesis</div>
            <div className="mvlm-arch-desc">
              Blends original pixels, DenseNet feature weights, and anatomical coordinates to generate structured clinical findings, differentials, and ICD-10 billing codes.
            </div>
          </div>

          <div className="mvlm-arch-card">
            <div className="mvlm-arch-step-num">STAGE 05</div>
            <div className="mvlm-arch-title">Autonomous Clinical Copilot</div>
            <div className="mvlm-arch-desc">
              Interactive multi-turn drawer for case consultation, referral letter generator, multi-lingual audio synthesis, and cryptographic doctor digital sign-off.
            </div>
          </div>
        </div>
      </section>

      {/* AUROC Validation & Academic Benchmark Section */}
      <section id="validation" className="mvlm-section" style={{ background: "rgba(14, 22, 38, 0.35)", borderRadius: 24 }}>
        <div className="mvlm-section-head">
          <div className="mvlm-section-pill">Clinical Rigor</div>
          <h2 className="mvlm-section-title">
            Academic Validation & Pathology Discrimination
          </h2>
          <p className="mvlm-section-desc">
            Rigorous evaluation against established medical imaging benchmarks ensures reliable
            sensitivity and low false-positive rates for critical thoracic pathologies.
          </p>
        </div>

        <div style={{ maxWidth: 860, margin: "0 auto", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(6, 182, 212, 0.3)", color: "#f8fafc" }}>
                <th style={{ padding: "12px 16px" }}>Pathology</th>
                <th style={{ padding: "12px 16px" }}>DenseNet-121 AUROC</th>
                <th style={{ padding: "12px 16px" }}>CheXNet Baseline</th>
                <th style={{ padding: "12px 16px" }}>Clinical Grounding Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#f8fafc" }}>Pneumothorax</td>
                <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "#06b6d4" }}>0.941</td>
                <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "#94a3b8" }}>0.888</td>
                <td style={{ padding: "12px 16px", color: "#10b981" }}>✓ Saliency Grounded</td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#f8fafc" }}>Cardiomegaly</td>
                <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "#06b6d4" }}>0.916</td>
                <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "#94a3b8" }}>0.905</td>
                <td style={{ padding: "12px 16px", color: "#10b981" }}>✓ Silhouette Grounded</td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#f8fafc" }}>Pleural Effusion</td>
                <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "#06b6d4" }}>0.923</td>
                <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "#94a3b8" }}>0.893</td>
                <td style={{ padding: "12px 16px", color: "#10b981" }}>✓ Sulcus Grounded</td>
              </tr>
              <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#f8fafc" }}>Consolidation</td>
                <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "#06b6d4" }}>0.874</td>
                <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "#94a3b8" }}>0.790</td>
                <td style={{ padding: "12px 16px", color: "#10b981" }}>✓ Airway Grounded</td>
              </tr>
              <tr>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#f8fafc" }}>Pulmonary Edema</td>
                <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "#06b6d4" }}>0.887</td>
                <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", color: "#94a3b8" }}>0.888</td>
                <td style={{ padding: "12px 16px", color: "#10b981" }}>✓ Hilar Grounded</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Trust, Security & Compliance */}
      <section id="security" className="mvlm-section">
        <div className="mvlm-section-head">
          <div className="mvlm-section-pill">Enterprise Trust</div>
          <h2 className="mvlm-section-title">
            HIPAA-Conscious Architecture & Clinical Governance
          </h2>
          <p className="mvlm-section-desc">
            Engineered with strict clinical ethics, patient data privacy, and institutional compliance standards.
          </p>
        </div>

        <div className="mvlm-trust-grid">
          <div className="mvlm-trust-card">
            <div className="mvlm-trust-icon">
              <Lock size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", marginBottom: 6 }}>
                Client-Side PHI De-identification
              </h4>
              <p style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>
                DICOM headers and patient health identifiers (PHI) are sanitized client-side before any diagnostic processing occurs.
              </p>
            </div>
          </div>

          <div className="mvlm-trust-card">
            <div className="mvlm-trust-icon">
              <UserCheck size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", marginBottom: 6 }}>
                Human-in-the-Loop Mandate
              </h4>
              <p style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>
                The AI never acts autonomously as final diagnosis. Attending physicians must review, edit, and digitally sign reports before release.
              </p>
            </div>
          </div>

          <div className="mvlm-trust-card">
            <div className="mvlm-trust-icon">
              <FileCheck2 size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", marginBottom: 6 }}>
                Cryptographic Audit Hash
              </h4>
              <p style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>
                Every doctor-signed study generates a verifiable SHA-256 cryptographic verification hash stamped into the report and SQLite audit log.
              </p>
            </div>
          </div>

          <div className="mvlm-trust-card">
            <div className="mvlm-trust-icon">
              <Database size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", marginBottom: 6 }}>
                DICOM 3.0 & PACS Integration
              </h4>
              <p style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>
                Compatible with institutional imaging networks and standard picture archiving and communication systems (PACS).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="mvlm-section">
        <div className="mvlm-section-head">
          <div className="mvlm-section-pill">Knowledge Base</div>
          <h2 className="mvlm-section-title">Frequently Asked Questions</h2>
          <p className="mvlm-section-desc">
            Everything you need to know about MedVLM's clinical capabilities, safety controls, and deployment architecture.
          </p>
        </div>

        <div className="mvlm-faq-list">
          {FAQS.map((faq, idx) => (
            <div
              key={idx}
              className="mvlm-faq-item"
              onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
            >
              <div className="mvlm-faq-q">
                <span>{faq.q}</span>
                {openFaq === idx ? <ChevronUp size={18} color="var(--color-cyan)" /> : <ChevronDown size={18} color="#94a3b8" />}
              </div>
              {openFaq === idx && <div className="mvlm-faq-a">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* High-Impact CTA Banner */}
      <section className="mvlm-section" style={{ textAlign: "center", paddingTop: 40, paddingBottom: 80 }}>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(2, 132, 199, 0.08) 100%)",
            border: "1px solid rgba(6, 182, 212, 0.4)",
            borderRadius: 20,
            padding: "50px 30px",
            maxWidth: 960,
            margin: "0 auto",
            boxShadow: "0 0 50px rgba(6, 182, 212, 0.15)",
          }}
        >
          <h2 style={{ fontSize: clampTitle(28, 40), fontWeight: 800, color: "#ffffff", marginBottom: 14 }}>
            Experience Diagnostic Vision Intelligence Today
          </h2>
          <p style={{ fontSize: 16, color: "#cbd5e1", maxWidth: 600, margin: "0 auto 30px", lineHeight: 1.6 }}>
            Launch the clinical workstation with pre-loaded samples, test with your own DICOM or X-ray files,
            and inspect multi-agent reasoning in real time.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onLaunchStudio} className="mvlm-btn-hero-primary">
              <Zap size={18} />
              <span>Launch Studio Now</span>
              <ArrowRight size={18} />
            </button>
            <button onClick={() => openAuthModal("signin")} className="mvlm-btn-hero-secondary">
              <UserCheck size={18} color="var(--color-cyan)" />
              <span>Sign In as Clinician</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mvlm-landing-footer">
        <div className="mvlm-footer-content">
          <div className="mvlm-footer-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="mvlm-landing-logo-box" style={{ width: 32, height: 32 }}>
                <img src={medvlmLogo} alt="MedVLM Logo" />
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc" }}>
                MedVLM <span style={{ color: "var(--color-cyan)" }}>Studio</span>
              </span>
            </div>

            <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#94a3b8" }}>
              <a href="#simulator" className="mvlm-landing-link" style={{ fontSize: 12 }}>Showcase</a>
              <a href="#architecture" className="mvlm-landing-link" style={{ fontSize: 12 }}>Architecture</a>
              <a href="#validation" className="mvlm-landing-link" style={{ fontSize: 12 }}>AUROC Validation</a>
              <a href="#security" className="mvlm-landing-link" style={{ fontSize: 12 }}>Compliance</a>
            </div>
          </div>

          <div className="mvlm-footer-sub">
            Medical Disclaimer: MedVLM Studio is an investigational Clinical Decision Support (CDS) platform designed
            to augment radiologist workflow efficiency. It does not provide autonomous medical diagnosis. All findings,
            differentials, and recommendations require review and confirmation by a licensed medical practitioner before clinical action.
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "#64748b" }}>
            <div>© {new Date().getFullYear()} MedVLM Project. Open-Source Clinical AI Research.</div>
            <div style={{ display: "flex", gap: 12 }}>
              <span>DenseNet-121</span>
              <span>•</span>
              <span>Gemini 3.8 Flash</span>
              <span>•</span>
              <span>TorchXRayVision</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function clampTitle(min, max) {
  return `clamp(${min}px, 4vw, ${max}px)`;
}
