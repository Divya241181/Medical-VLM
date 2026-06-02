import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "medvlm_report_history";
const MAX_HISTORY = 50;

/**
 * Resize an image file to a thumbnail base64 string (max 120x120).
 */
function createThumbnail(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 120;
        let w = img.width, h = img.height;
        if (w > h) { h = Math.round(h * max / w); w = max; }
        else { w = Math.round(w * max / h); h = max; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function useReportHistory() {
  const [history, setHistory] = useState([]);

  /* Load from localStorage on mount */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* silently ignore parse errors */ }
  }, []);

  /* Persist to localStorage whenever history changes */
  const persist = useCallback((updated) => {
    setHistory(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); }
    catch { /* storage full — silently ignore */ }
  }, []);

  /* Save a new report entry */
  const saveReport = useCallback(async (report, imageFile) => {
    const now = new Date();
    let thumbnail = null;
    if (imageFile) {
      try { thumbnail = await createThumbnail(imageFile); }
      catch { thumbnail = null; }
    }

    const entry = {
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      date: formatDate(now),
      time: formatTime(now),
      imageName: imageFile?.name || "unknown.png",
      imageSize: imageFile?.size || 0,
      imageThumbnail: thumbnail,
      severity: report.severity,
      findings: report.findings,
      impression: report.impression,
      recommendations: report.recommendations,
      brief: report.brief,
      abnormalities: report.abnormalities,
      confidence_scores: report.confidence_scores,
      lung_zones: report.lung_zones,
    };

    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, MAX_HISTORY);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });

    return entry;
  }, []);

  /* Delete a single report */
  const deleteReport = useCallback((id) => {
    setHistory((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  /* Clear all history */
  const clearHistory = useCallback(() => {
    persist([]);
  }, [persist]);

  /* Get a single report by ID */
  const getReport = useCallback((id) => {
    return history.find((e) => e.id === id) || null;
  }, [history]);

  return { history, saveReport, deleteReport, clearHistory, getReport };
}
