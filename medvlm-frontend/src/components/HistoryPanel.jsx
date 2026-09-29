import { useState, useMemo } from "react";
import {
  Clock,
  Search,
  Trash2,
  Calendar,
  X,
  ChevronRight,
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";

const sevConfig = {
  normal: { color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)" },
  mild: { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)" },
  moderate: { color: "#f97316", bg: "rgba(249, 115, 22, 0.14)", border: "rgba(249, 115, 22, 0.35)" },
  severe: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.14)", border: "rgba(239, 68, 68, 0.35)" },
};

function getDateGroup(timestamp) {
  if (!timestamp) return "RECENT";
  const d = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entry = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today - entry) / 86400000);
  if (diff === 0) return "TODAY";
  if (diff === 1) return "YESTERDAY";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

export default function HistoryPanel({
  history,
  onSelectReport,
  onDeleteReport,
  onClearHistory,
  isOpen,
  onClose,
}) {
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter(
      (e) =>
        (e.imageName || "").toLowerCase().includes(q) ||
        (e.severity || "").toLowerCase().includes(q) ||
        (e.date || "").toLowerCase().includes(q) ||
        (e.id || "").toLowerCase().includes(q) ||
        (e.brief || "").toLowerCase().includes(q)
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

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9990,
        background: "rgba(5, 8, 16, 0.7)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div className="mvlm-drawer">
        {/* Drawer Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Clock size={18} color="var(--color-cyan)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", margin: 0 }}>
              Studies Archive
            </h3>
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                background: "rgba(6, 182, 212, 0.12)",
                color: "var(--color-cyan)",
                padding: "2px 7px",
                borderRadius: "10px",
              }}
            >
              {history.length}
            </span>
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

        {/* Search & Actions Bar */}
        <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(148, 163, 184, 0.15)",
              borderRadius: "8px",
              padding: "8px 12px",
            }}
          >
            <Search size={14} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="Search by ID, severity, or pathology..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "#f8fafc",
                fontSize: 12,
                outline: "none",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {history.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {confirmClear ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "#fca5a5" }}>Delete all studies?</span>
                  <button
                    onClick={() => {
                      onClearHistory();
                      setConfirmClear(false);
                    }}
                    className="mvlm-btn-secondary"
                    style={{ padding: "3px 8px", fontSize: 11, color: "#ef4444", borderColor: "#ef4444" }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="mvlm-btn-secondary"
                    style={{ padding: "3px 8px", fontSize: 11 }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-dim)",
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Trash2 size={12} />
                  <span>Clear Archive</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Study Cards List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
          {history.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                color: "var(--text-dim)",
              }}
            >
              <FolderOpen size={36} strokeWidth={1.5} />
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No studies in archive yet</div>
              <span style={{ fontSize: 11.5, maxWidth: 220, lineHeight: 1.5 }}>
                Analyzed radiographs and reports are automatically recorded here.
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
              No matches found for "{search}"
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-dim)",
                    marginBottom: 8,
                    letterSpacing: "0.06em",
                  }}
                >
                  {group.label}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {group.entries.map((entry) => {
                    const sev = sevConfig[entry.severity?.toLowerCase()] || sevConfig.normal;
                    return (
                      <div
                        key={entry.id}
                        onClick={() => onSelectReport(entry)}
                        style={{
                          background: "rgba(15, 23, 42, 0.7)",
                          border: "1px solid rgba(148, 163, 184, 0.12)",
                          borderRadius: "10px",
                          padding: "10px 12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-cyan)";
                          e.currentTarget.style.background = "rgba(15, 23, 42, 0.95)";
                          e.currentTarget.style.transform = "translateX(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.12)";
                          e.currentTarget.style.background = "rgba(15, 23, 42, 0.7)";
                          e.currentTarget.style.transform = "translateX(0)";
                        }}
                      >
                        {/* Thumbnail / Emblem */}
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "6px",
                            background: "#050810",
                            border: "1px solid rgba(148, 163, 184, 0.15)",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {entry.imageThumbnail || entry.preview ? (
                            <img
                              src={entry.imageThumbnail || entry.preview}
                              alt="Thumbnail"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <FileText size={18} color="var(--text-dim)" />
                          )}
                        </div>

                        {/* Study Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                fontFamily: "var(--font-mono)",
                                color: "#f8fafc",
                              }}
                            >
                              {entry.id || "Study"}
                            </span>
                            <span
                              style={{
                                fontSize: 9.5,
                                fontWeight: 700,
                                fontFamily: "var(--font-mono)",
                                color: sev.color,
                                background: sev.bg,
                                padding: "1px 5px",
                                borderRadius: "3px",
                              }}
                            >
                              {entry.severity?.toUpperCase() || "NORMAL"}
                            </span>
                          </div>

                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {entry.brief || entry.impression || entry.imageName || "Radiology study"}
                          </div>

                          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
                            {entry.date ? new Date(entry.date).toLocaleDateString() : ""}
                          </span>
                        </div>

                        {/* Delete Single Action */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteReport(entry.id);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-dim)",
                            cursor: "pointer",
                            padding: 6,
                            borderRadius: "4px",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
