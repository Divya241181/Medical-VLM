import { useState } from "react";
import { Flame, Eye, EyeOff, RotateCcw, Activity } from "lucide-react";

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

export default function GradCamViewer({
  preview,
  heatmapUrl,
  selectedCondition,
  setSelectedCondition,
  onRecalculateCam,
  camLoading,
}) {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [opacity, setOpacity] = useState(65);
  const [inverted, setInverted] = useState(false);

  return (
    <div
      className="mvlm-glass-panel"
      style={{
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Title & Controls Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#f8fafc",
              fontFamily: "var(--font-display)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Flame size={16} color="#f97316" />
            Explainable AI — Grad-CAM Heatmap
          </h2>
          <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginTop: 2 }}>
            Visualizes DenseNet-121 layer activation gradients
          </span>
        </div>

        {/* Heatmap Toggle & Invert */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            Show Heatmap
          </label>

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
              checked={inverted}
              onChange={(e) => setInverted(e.target.checked)}
              style={{ accentColor: "var(--color-cyan)" }}
            />
            Invert
          </label>
        </div>
      </div>

      {/* Interactive Display Area */}
      <div
        style={{
          position: "relative",
          borderRadius: "10px",
          overflow: "hidden",
          background: "var(--bg-canvas)",
          minHeight: 340,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {preview ? (
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              maxHeight: 420,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src={preview}
              alt="Chest X-Ray"
              style={{
                maxWidth: "100%",
                maxHeight: 420,
                objectFit: "contain",
                filter: inverted ? "invert(1)" : "none",
              }}
            />

            {heatmapUrl && showHeatmap && (
              <img
                src={heatmapUrl}
                alt="Grad-CAM Activation"
                style={{
                  position: "absolute",
                  maxWidth: "100%",
                  maxHeight: 420,
                  objectFit: "contain",
                  opacity: opacity / 100,
                  mixBlendMode: "screen",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        ) : (
          <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No radiograph selected</div>
        )}
      </div>

      {/* Opacity Slider & Target Condition Selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          paddingTop: 10,
          borderTop: "1px solid rgba(148, 163, 184, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Heatmap Opacity:</span>
          <input
            type="range"
            min={10}
            max={100}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="mvlm-slider"
            style={{ width: 120 }}
          />
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            {opacity}%
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Target Pathology:</span>
          <select
            value={selectedCondition}
            onChange={(e) => {
              setSelectedCondition(e.target.value);
              if (onRecalculateCam) onRecalculateCam(e.target.value);
            }}
            disabled={camLoading}
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "6px",
              padding: "4px 8px",
              color: "#f8fafc",
              fontSize: 11.5,
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
              Recalculating...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
