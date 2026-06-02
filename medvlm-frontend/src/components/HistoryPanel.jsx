import { useState, useMemo } from "react";
import "./HistoryPanel.css";

const C = {
  teal: "#00d4aa", tealDim: "rgba(0,212,170,0.15)", tealBorder: "rgba(0,212,170,0.3)",
  red: "#ff4757", green: "#2ed573", orange: "#ffa502",
  bg: "#0d1117", surface: "#111827", border: "rgba(255,255,255,0.08)",
  borderLight: "rgba(255,255,255,0.06)", borderFaint: "rgba(255,255,255,0.04)",
  text: "#f1f5f9", muted: "#94a3b8", mutedDark: "#475569",
};

const font = "'Inter', system-ui, -apple-system, sans-serif";
const mono = "'Courier New', monospace";

const sevColors = { normal: C.green, mild: C.orange, moderate: C.red, severe: C.red };

function getDateGroup(timestamp) {
  const d = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entry = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today - entry) / 86400000);
  if (diff === 0) return "TODAY";
  if (diff === 1) return "YESTERDAY";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

function storageSize() {
  try {
    const raw = localStorage.getItem("medvlm_report_history");
    return raw ? (new Blob([raw]).size / 1024).toFixed(1) : "0";
  } catch { return "0"; }
}

export default function HistoryPanel({ history, onSelectReport, onDeleteReport, onClearHistory, isOpen, onClose }) {
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter((e) =>
      (e.imageName || "").toLowerCase().includes(q) ||
      (e.severity || "").toLowerCase().includes(q) ||
      (e.date || "").toLowerCase().includes(q)
    );
  }, [history, search]);

  const grouped = useMemo(() => {
    const groups = [];
    let currentGroup = null;
    filtered.forEach((entry) => {
      const label = getDateGroup(entry.timestamp);
      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, entries: [] };
        groups.push(currentGroup);
      }
      currentGroup.entries.push(entry);
    });
    return groups;
  }, [filtered]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
          zIndex: 999, transition: "opacity .3s",
        }} />
      )}

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, width: "min(380px, 100vw)", height: "100vh",
        background: C.bg, borderLeft: `1px solid ${C.border}`, zIndex: 1000,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: isOpen ? "-20px 0 60px rgba(0,0,0,0.5)" : "none",
        display: "flex", flexDirection: "column", fontFamily: font,
      }}>

        {/* ── Header ── */}
        <div style={{
          height: 60, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${C.borderLight}`, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🕐</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: C.teal, fontFamily: mono }}>REPORT HISTORY</span>
            <span style={{
              fontSize: 10, fontWeight: 600, color: C.muted, background: "rgba(255,255,255,0.05)",
              padding: "2px 8px", borderRadius: 10, border: `1px solid ${C.border}`, fontFamily: mono,
            }}>{history.length} reports</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {history.length > 0 && (
              <button
                onClick={() => { if (confirmClear) { onClearHistory(); setConfirmClear(false); } else setConfirmClear(true); }}
                onMouseLeave={() => setConfirmClear(false)}
                title="Clear all"
                style={{
                  width: 32, height: 32, borderRadius: 6, border: "none", cursor: "pointer",
                  background: confirmClear ? "rgba(255,71,87,0.15)" : "transparent",
                  color: confirmClear ? C.red : C.mutedDark, fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
                }}
              >{confirmClear ? "✓" : "🗑"}</button>
            )}
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 6, border: "none", cursor: "pointer",
              background: "transparent", color: C.muted, fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center", transition: "color .15s",
            }} onMouseEnter={(e) => e.currentTarget.style.color = C.text}
              onMouseLeave={(e) => e.currentTarget.style.color = C.muted}>✕</button>
          </div>
        </div>

        {/* ── Search ── */}
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.borderFaint}`, flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, pointerEvents: "none" }}>🔍</span>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports..."
              style={{
                width: "100%", padding: "8px 12px 8px 36px", borderRadius: 8,
                background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                color: C.text, fontSize: 13, fontFamily: font, outline: "none", transition: "border-color .2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "rgba(0,212,170,0.4)"}
              onBlur={(e) => e.target.style.borderColor = C.border}
            />
          </div>
        </div>

        {/* ── History List ── */}
        <div className="history-list" style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            /* Empty state */
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <img src="/medvlm-logo.png" alt="" style={{ width: 48, height: 48, opacity: 0.2, marginBottom: 12, filter: "grayscale(0.5)" }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: C.muted }}>
                {search ? "No matching reports" : "No reports yet"}
              </div>
              <div style={{ fontSize: 13, color: C.mutedDark, marginTop: 6 }}>
                {search ? "Try a different search term" : "Analyze an X-ray to see history here"}
              </div>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label}>
                {/* Date group header */}
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: C.teal,
                  fontFamily: mono, padding: "10px 16px 4px", position: "sticky", top: 0,
                  background: C.bg, borderBottom: `1px solid ${C.borderFaint}`, zIndex: 1,
                }}>{group.label}</div>

                {group.entries.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="history-card"
                    onClick={() => onSelectReport(entry)}
                    style={{
                      display: "flex", gap: 12, padding: "12px 16px", cursor: "pointer",
                      borderBottom: `1px solid ${C.borderFaint}`, transition: "background .15s",
                      animationDelay: `${i * 0.04}s`, position: "relative",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Thumbnail */}
                    <div className="history-thumbnail" style={{
                      width: 48, height: 48, borderRadius: 8, flexShrink: 0, overflow: "hidden",
                      border: `1px solid rgba(255,255,255,0.1)`, background: C.surface,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {entry.imageThumbnail ? (
                        <img src={entry.imageThumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <img src="/medvlm-logo.png" alt="" style={{ width: 24, height: 24, opacity: 0.3, filter: "grayscale(0.5)" }} />
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{
                          fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140,
                        }}>{entry.imageName}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                          padding: "2px 7px", borderRadius: 10, whiteSpace: "nowrap",
                          color: sevColors[entry.severity] || C.muted,
                          background: `${sevColors[entry.severity] || C.muted}18`,
                          border: `1px solid ${sevColors[entry.severity] || C.muted}40`,
                        }}>{entry.severity}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.mutedDark, marginBottom: 3 }}>
                        {entry.time}
                        <span style={{ margin: "0 5px", opacity: 0.4 }}>·</span>
                        {(entry.abnormalities || []).length} findings
                      </div>
                      <div style={{
                        fontSize: 12, color: "#64748b", lineHeight: 1.5,
                        overflow: "hidden", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      }}>{entry.brief}</div>
                    </div>

                    {/* Delete action */}
                    <div className="history-actions" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteReport(entry.id); }}
                        style={{
                          width: 24, height: 24, borderRadius: "50%", border: "none", cursor: "pointer",
                          background: "rgba(255,71,87,0.1)", color: C.red, fontSize: 11,
                          display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,71,87,0.25)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,71,87,0.1)"}
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          height: 48, padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderTop: `1px solid ${C.borderLight}`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: C.mutedDark, fontFamily: mono }}>MedVLM-7B · Local Storage</span>
          <span style={{ fontSize: 10, color: C.mutedDark, fontFamily: mono }}>Using {storageSize()} KB</span>
        </div>
      </div>
    </>
  );
}
