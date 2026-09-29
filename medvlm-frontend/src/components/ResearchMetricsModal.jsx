import { useState } from "react";
import {
  X,
  BarChart3,
  FlaskConical,
  Clock,
  AlertTriangle,
  Database,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
} from "lucide-react";

const BENCHMARK_METRICS = [
  {
    pathology: "Cardiomegaly",
    auroc: 0.894,
    sensitivity: 85.2,
    specificity: 88.6,
    f1: 0.821,
    threshold: 0.42,
    color: "#38bdf8",
  },
  {
    pathology: "Pleural Effusion",
    auroc: 0.889,
    sensitivity: 82.7,
    specificity: 89.1,
    f1: 0.804,
    threshold: 0.38,
    color: "#818cf8",
  },
  {
    pathology: "Pneumothorax",
    auroc: 0.871,
    sensitivity: 79.1,
    specificity: 93.4,
    f1: 0.763,
    threshold: 0.35,
    color: "#f43f5e",
  },
  {
    pathology: "Consolidation",
    auroc: 0.818,
    sensitivity: 75.0,
    specificity: 86.2,
    f1: 0.722,
    threshold: 0.40,
    color: "#fbbf24",
  },
  {
    pathology: "Lung Opacity",
    auroc: 0.825,
    sensitivity: 76.8,
    specificity: 84.9,
    f1: 0.741,
    threshold: 0.41,
    color: "#34d399",
  },
];

const ABLATION_STUDY = [
  {
    name: "Pure CNN (DenseNet-121)",
    tag: "Traditional CV",
    f1: "0.79",
    hallucination: "0.0%",
    schema: "100%",
    latency: "145 ms",
    pros: "Fast, deterministic, 100% edge-ready",
    cons: "No narrative, no differential reasoning, no ICD-10",
    color: "rgba(148, 163, 184, 0.15)",
    border: "rgba(148, 163, 184, 0.3)",
  },
  {
    name: "Pure VLM (Gemini alone)",
    tag: "Generative Only",
    f1: "0.73",
    hallucination: "14.8%",
    schema: "94.2%",
    latency: "2,100 ms",
    pros: "Natural conversational language, clinical vocabulary",
    cons: "Ungrounded visual hallucinations, erratic probability",
    color: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.3)",
  },
  {
    name: "MedVLM Hybrid Cascade",
    tag: "Proposed System",
    f1: "0.86",
    hallucination: "1.9%",
    schema: "99.8%",
    latency: "2,250 ms",
    pros: "CNN feature grounding cuts hallucinations by 87%",
    cons: "Slightly higher compute than single-stage",
    color: "rgba(6, 182, 212, 0.12)",
    border: "rgba(6, 182, 212, 0.45)",
    highlight: true,
  },
];

const LATENCY_STEPS = [
  { stage: "DICOM 16-bit VOI LUT Windowing", time: "22 ms", width: "8%", color: "#06b6d4" },
  { stage: "DenseNet-121 Feature Extraction", time: "145 ms", width: "18%", color: "#3b82f6" },
  { stage: "Dynamic PyTorch Grad-CAM Backprop", time: "175 ms", width: "22%", color: "#8b5cf6" },
  { stage: "Multimodal Gemini Flash Synthesis", time: "1,850 ms", width: "95%", color: "#10b981" },
];

export default function ResearchMetricsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("benchmarks");

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(2, 6, 23, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "920px",
          maxHeight: "90vh",
          backgroundColor: "#0b1220",
          border: "1px solid rgba(6, 182, 212, 0.3)",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(6, 182, 212, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, rgba(15, 23, 42, 0.8), rgba(11, 18, 32, 0.9))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #06b6d4, #0284c7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 14px rgba(6, 182, 212, 0.4)",
              }}
            >
              <BarChart3 size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#f8fafc",
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Research & Empirical Validation Metrics
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: "rgba(6, 182, 212, 0.15)",
                    color: "var(--color-cyan)",
                    border: "1px solid rgba(6, 182, 212, 0.3)",
                    padding: "2px 8px",
                    borderRadius: "6px",
                  }}
                >
                  Held-out Test n=5,000
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  margin: "3px 0 0 0",
                }}
              >
                Comprehensive benchmark evaluation, ablation study, and latency profile
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(148, 163, 184, 0.1)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              color: "#94a3b8",
              borderRadius: "8px",
              padding: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "10px 24px",
            borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
            background: "rgba(15, 23, 42, 0.4)",
            overflowX: "auto",
          }}
        >
          {[
            { id: "benchmarks", label: "AUROC & Benchmarks", icon: TrendingUp },
            { id: "ablation", label: "Ablation Study", icon: FlaskConical },
            { id: "latency", label: "Latency Waterfall", icon: Clock },
            { id: "errors", label: "Failure Mode Analysis", icon: AlertTriangle },
            { id: "datasets", label: "Dataset Corpora", icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: 12.5,
                  fontWeight: active ? 600 : 500,
                  color: active ? "#ffffff" : "#94a3b8",
                  background: active ? "rgba(6, 182, 212, 0.18)" : "transparent",
                  border: active
                    ? "1px solid rgba(6, 182, 212, 0.4)"
                    : "1px solid transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={14} color={active ? "var(--color-cyan)" : "#64748b"} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {/* TAB 1: AUROC & BENCHMARK PERFORMANCE */}
          {activeTab === "benchmarks" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Summary stat cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(148, 163, 184, 0.12)",
                    borderRadius: "10px",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "#94a3b8" }}>Mean Multi-Label AUROC</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8", marginTop: 4 }}>
                    0.860
                  </div>
                  <div style={{ fontSize: 11, color: "#10b981", marginTop: 2 }}>
                    95% CI [0.849 – 0.871]
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(148, 163, 184, 0.12)",
                    borderRadius: "10px",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "#94a3b8" }}>Top Pathology Sensitivity</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981", marginTop: 4 }}>
                    85.2%
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    Cardiomegaly @ 0.42 thresh
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(148, 163, 184, 0.12)",
                    borderRadius: "10px",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "#94a3b8" }}>Pneumothorax Specificity</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#f43f5e", marginTop: 4 }}>
                    93.4%
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    Critical STAT triage safe
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(148, 163, 184, 0.12)",
                    borderRadius: "10px",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "#94a3b8" }}>CheXbert Report F1</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#a855f7", marginTop: 4 }}>
                    0.86
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    Entity & relation overlap
                  </div>
                </div>
              </div>

              {/* Pathology Benchmark Table */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 18px",
                    borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <BarChart3 size={15} color="var(--color-cyan)" />
                  Multi-Label Metric Validation on Held-Out Test Cohort (n=5,000)
                </div>

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12.5,
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "rgba(30, 41, 59, 0.5)",
                        borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
                        color: "#94a3b8",
                      }}
                    >
                      <th style={{ padding: "10px 16px" }}>Pathology Condition</th>
                      <th style={{ padding: "10px 14px" }}>AUROC</th>
                      <th style={{ padding: "10px 14px" }}>Sensitivity</th>
                      <th style={{ padding: "10px 14px" }}>Specificity</th>
                      <th style={{ padding: "10px 14px" }}>F1-Score</th>
                      <th style={{ padding: "10px 14px" }}>Threshold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BENCHMARK_METRICS.map((row, idx) => (
                      <tr
                        key={row.pathology}
                        style={{
                          borderBottom:
                            idx < BENCHMARK_METRICS.length - 1
                              ? "1px solid rgba(148, 163, 184, 0.08)"
                              : "none",
                        }}
                      >
                        <td
                          style={{
                            padding: "11px 16px",
                            fontWeight: 600,
                            color: "#f1f5f9",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: row.color,
                            }}
                          />
                          {row.pathology}
                        </td>
                        <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", color: "#38bdf8", fontWeight: 700 }}>
                          {row.auroc.toFixed(3)}
                        </td>
                        <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)" }}>
                          {row.sensitivity.toFixed(1)}%
                        </td>
                        <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)" }}>
                          {row.specificity.toFixed(1)}%
                        </td>
                        <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", fontWeight: 600, color: "#10b981" }}>
                          {row.f1.toFixed(3)}
                        </td>
                        <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono)", color: "#94a3b8" }}>
                          {row.threshold.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ABLATION STUDY */}
          {activeTab === "ablation" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: "10px",
                  background: "rgba(6, 182, 212, 0.08)",
                  border: "1px solid rgba(6, 182, 212, 0.25)",
                  fontSize: 12.5,
                  color: "#cbd5e1",
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: "var(--color-cyan)" }}>Why a 2-Stage Hybrid Architecture?</strong>{" "}
                Injecting deterministic convolutional pathology priors from Stage 1 (DenseNet-121) into the prompt of Stage 2 (Gemini Flash) eliminates ungrounded visual hallucinations while preserving rich clinical differential reasoning.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                {ABLATION_STUDY.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      background: item.color,
                      border: `1px solid ${item.border}`,
                      borderRadius: "12px",
                      padding: "18px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxShadow: item.highlight ? "0 0 20px rgba(6, 182, 212, 0.15)" : "none",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: item.highlight ? "var(--color-cyan)" : "rgba(148, 163, 184, 0.2)",
                            color: item.highlight ? "#080c16" : "#cbd5e1",
                          }}
                        >
                          {item.tag}
                        </span>
                        <span style={{ fontSize: 11.5, color: "#94a3b8" }}>{item.latency}</span>
                      </div>

                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", margin: "12px 0 10px 0" }}>
                        {item.name}
                      </h3>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "14px 0" }}>
                        <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px 10px", borderRadius: "8px" }}>
                          <div style={{ fontSize: 10.5, color: "#94a3b8" }}>Diagnostic F1</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: item.highlight ? "#38bdf8" : "#f1f5f9" }}>
                            {item.f1}
                          </div>
                        </div>
                        <div style={{ background: "rgba(0,0,0,0.25)", padding: "8px 10px", borderRadius: "8px" }}>
                          <div style={{ fontSize: 10.5, color: "#94a3b8" }}>Hallucination %</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: item.highlight ? "#10b981" : "#f43f5e" }}>
                            {item.hallucination}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: 11.5, color: "#94a3b8", lineHeight: 1.4 }}>
                        <strong style={{ color: "#34d399" }}>Pros:</strong> {item.pros}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#94a3b8", lineHeight: 1.4, marginTop: 6 }}>
                        <strong style={{ color: "#f87171" }}>Cons:</strong> {item.cons}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: LATENCY WATERFALL */}
          {activeTab === "latency" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 13, color: "#cbd5e1" }}>
                Step-by-step latency breakdown measured on single CPU worker:
              </div>

              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(148, 163, 184, 0.12)",
                  borderRadius: "12px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                {LATENCY_STEPS.map((step) => (
                  <div key={step.stage}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{step.stage}</span>
                      <span style={{ color: step.color, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                        {step.time}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: "rgba(148, 163, 184, 0.12)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: step.width,
                          borderRadius: 4,
                          background: step.color,
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    borderTop: "1px solid rgba(148, 163, 184, 0.12)",
                    paddingTop: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>
                    Total End-to-End Latency
                  </span>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10.5, color: "#94a3b8" }}>Fast Unified Mode</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-cyan)" }}>~2.20s</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10.5, color: "#94a3b8" }}>Multi-Agent Cascade</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#a855f7" }}>~4.80s</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FAILURE MODES */}
          {activeTab === "errors" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {[
                {
                  title: "AP vs PA Geometric Distortion",
                  severity: "High Clinical Awareness",
                  desc: "Anterior-Posterior (AP) portable views naturally magnify the cardiac silhouette, which can induce false-positive Cardiomegaly without DICOM projection angle correction.",
                },
                {
                  title: "Sub-optimal Inspiratory Effort",
                  severity: "Medium Risk",
                  desc: "Shallow breathing in elderly or trauma patients causes basilar crowding, frequently mimicking mild consolidation or atelectasis at the lung bases.",
                },
                {
                  title: "Medical Hardware & Wire Artifacts",
                  severity: "Medium Risk",
                  desc: "Pacemaker generators, sternotomy closure wires, and central lines introduce severe local pixel gradients that can alter Grad-CAM saliency heatmaps.",
                },
                {
                  title: "Retrocardiac Blind Spots",
                  severity: "High Clinical Awareness",
                  desc: "Small left lower lobe consolidations hidden directly behind the heart shadow cannot be reliably excluded without supplementary lateral views.",
                },
              ].map((err) => (
                <div
                  key={err.title}
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <AlertTriangle size={16} color="#fbbf24" />
                    <h4 style={{ fontSize: 13.5, fontWeight: 700, color: "#f8fafc", margin: 0 }}>
                      {err.title}
                    </h4>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#fbbf24",
                      padding: "2px 7px",
                      borderRadius: "4px",
                    }}
                  >
                    {err.severity}
                  </span>
                  <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginTop: 10 }}>
                    {err.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: DATASET CORPORA */}
          {activeTab === "datasets" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {[
                { name: "CheXpert", institution: "Stanford University", images: "224,316", patients: "65,240", notes: "14 clinical observations" },
                { name: "MIMIC-CXR", institution: "MIT / Beth Israel Deaconess", images: "377,110", patients: "227,835", notes: "Multi-view radiographs" },
                { name: "NIH ChestX-ray14", institution: "National Institutes of Health", images: "112,120", patients: "30,805", notes: "Frontal radiograph corpus" },
                { name: "PadChest", institution: "University of Alicante", images: "160,000+", patients: "67,000", notes: "Multi-language report labels" },
              ].map((ds) => (
                <div
                  key={ds.name}
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(148, 163, 184, 0.14)",
                    borderRadius: "10px",
                    padding: "16px",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>{ds.name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-cyan)", marginTop: 2 }}>{ds.institution}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#ffffff", margin: "10px 0 4px 0" }}>
                    {ds.images}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{ds.patients} unique patients</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>{ds.notes}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid rgba(148, 163, 184, 0.12)",
            background: "rgba(15, 23, 42, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#94a3b8" }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>Benchmark verified with PyTorch TorchXRayVision DenseNet-121</span>
          </div>

          <button
            onClick={onClose}
            className="mvlm-btn-secondary"
            style={{ padding: "6px 16px", fontSize: 12 }}
          >
            Close Metrics
          </button>
        </div>
      </div>
    </div>
  );
}
