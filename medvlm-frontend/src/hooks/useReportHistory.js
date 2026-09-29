import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "medvlm_report_history";
const MAX_HISTORY = 50;
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

  /* Load from localStorage on mount & sync with backend studies API */
  useEffect(() => {
    let localData = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) localData = JSON.parse(raw);
      setHistory(localData);
    } catch {}

    // Background sync with database studies
    fetch(`${API}/studies`)
      .then((res) => (res.ok ? res.json() : []))
      .then((studies) => {
        if (Array.isArray(studies) && studies.length > 0) {
          const sampleMap = {
            "sample_normal.jpg": "/samples/sample_normal.jpg",
            "sample_cardiomegaly.jpg": "/samples/sample_cardiomegaly.jpg",
            "sample_pneumonia.jpg": "/samples/sample_pneumonia.jpg",
            "normal.jpg": "/samples/sample_normal.jpg",
            "cardiomegaly.jpg": "/samples/sample_cardiomegaly.jpg",
            "pneumonia.jpg": "/samples/sample_pneumonia.jpg",
          };
          const remoteItems = studies.map((s) => {
            const d = s.created_at ? new Date(s.created_at) : new Date();
            const basePreview = s.image_preview_url || sampleMap[s.filename] || null;
            return {
              id: s.id,
              timestamp: d.toISOString(),
              date: formatDate(d),
              time: formatTime(d),
              imageName: s.filename || "radiograph.png",
              imageThumbnail: basePreview || null,
              image_preview_url: basePreview || null,
              preview: basePreview || null,
              heatmap_data_url: s.heatmap_data_url || null,
              severity: s.severity,
              findings: s.findings,
              impression: s.impression,
              recommendations: s.recommendations,
              brief: s.brief,
              abnormalities: s.abnormalities || [],
              confidence_scores: s.confidence_scores || {},
              lung_zones: s.lung_zones || {},
              differentials: s.differentials || [],
              icd10_codes: s.icd10_codes || [],
              detected_pathologies: s.detected_pathologies || [],
              modality: s.modality,
              view_position: s.view_position,
              patient_age: s.patient_age,
              patient_gender: s.patient_gender,
              status: s.status,
              doctor_notes: s.doctor_notes,
              signed_by: s.signed_by,
              doctor_license: s.doctor_license,
              signed_at: s.signed_at,
            };
          });

          // Merge without duplicates (favoring remote studies)
          setHistory((prev) => {
            const existingIds = new Set(remoteItems.map((r) => r.id));
            const merged = [...remoteItems, ...prev.filter((p) => !existingIds.has(p.id))];
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.slice(0, MAX_HISTORY))); } catch {}
            return merged.slice(0, MAX_HISTORY);
          });
        }
      })
      .catch(() => {});
  }, []);

  /* Save a new report entry */
  const saveReport = useCallback(async (report, imageFile) => {
    const now = new Date();
    let thumbnail = null;
    if (imageFile) {
      try { thumbnail = await createThumbnail(imageFile); }
      catch { thumbnail = null; }
    }

    const sampleMap = {
      "sample_normal.jpg": "/samples/sample_normal.jpg",
      "sample_cardiomegaly.jpg": "/samples/sample_cardiomegaly.jpg",
      "sample_pneumonia.jpg": "/samples/sample_pneumonia.jpg",
      "normal.jpg": "/samples/sample_normal.jpg",
      "cardiomegaly.jpg": "/samples/sample_cardiomegaly.jpg",
      "pneumonia.jpg": "/samples/sample_pneumonia.jpg",
    };
    const basePreview =
      report.image_preview_url ||
      report.preview ||
      thumbnail ||
      sampleMap[report.filename] ||
      sampleMap[imageFile?.name] ||
      null;

    const entry = {
      ...report,
      id: report.id || crypto.randomUUID(),
      timestamp: now.toISOString(),
      date: formatDate(now),
      time: formatTime(now),
      imageName: imageFile?.name || report.filename || "radiograph.png",
      imageSize: imageFile?.size || 0,
      imageThumbnail: thumbnail || basePreview || null,
      image_preview_url: basePreview || null,
      preview: basePreview || null,
      heatmap_data_url: report.heatmap_data_url || null,
    };

    setHistory((prev) => {
      const updated = [entry, ...prev.filter((p) => p.id !== entry.id)].slice(0, MAX_HISTORY);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });

    return entry;
  }, []);

  /* Delete a single report from both local cache and backend DB */
  const deleteReport = useCallback((id) => {
    setHistory((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });

    // Best-effort delete from backend DB
    fetch(`${API}/studies/${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  /* Clear all history */
  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return { history, saveReport, deleteReport, clearHistory };
}
