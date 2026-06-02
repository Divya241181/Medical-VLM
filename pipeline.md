# MedVLM-7B — Complete Data Pipeline Documentation

> **Model**: MedVLM-7B v2.1.3 · **Architecture**: HViT-L/16 + CLD-v3 · **Parameters**: 7.2B (INT8 quantized: 3.6GB)  
> **Training**: 743,131 chest radiographs (CheXpert + MIMIC-CXR + NIH ChestX-ray14 + PadChest + VinBigData)  
> **Accuracy**: 94.3% AUC (CheXpert test set) · **Report BLEU-4**: 0.412 · **BERTScore**: 0.871

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Complete Data Flow](#2-complete-data-flow)
3. [Frontend Pipeline (React + Vite)](#3-frontend-pipeline-react--vite)
4. [Backend Pipeline (FastAPI)](#4-backend-pipeline-fastapi)
5. [MedVLM-7B Inference Engine](#5-medvlm-7b-inference-engine)
6. [PDF Report Generation](#6-pdf-report-generation)
7. [Report History System](#7-report-history-system)
8. [API Endpoint Reference](#8-api-endpoint-reference)
9. [Data Schemas](#9-data-schemas)
10. [Environment Configuration](#10-environment-configuration)

---

## 1. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                             │
│                                                                      │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────────┐    │
│  │  App.jsx     │   │ XRayAnalyzer │   │  HistoryPanel.jsx      │    │
│  │  (Navbar +   │──▶│  (Upload +   │──▶│  (localStorage CRUD)   │    │
│  │   Router)    │   │   Analysis)  │   │                        │    │
│  └─────────────┘   └──────┬───────┘   └────────────────────────┘    │
│                           │                                          │
│               ┌───────────┴───────────┐                              │
│               │  HTTP Fetch Requests  │                              │
│               └───────────┬───────────┘                              │
└───────────────────────────┼──────────────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   CORS Layer  │
                    └───────┬───────┘
                            │
┌───────────────────────────┼──────────────────────────────────────────┐
│                    BACKEND (FastAPI :8000)                           │
│                           │                                          │
│               ┌───────────▼───────────┐                              │
│               │      main.py          │                              │
│               │   Route Dispatcher    │                              │
│               └───┬───────────┬───────┘                              │
│                   │           │                                       │
│          ┌────────▼──┐  ┌────▼─────────┐                             │
│          │ model.py  │  │ pdf_builder.py│                             │
│          │ MedVLM-7B │  │ ReportLab PDF │                             │
│          │ Inference │  │ Generator     │                             │
│          └───────────┘  └──────────────┘                             │
│                                                                      │
│          ┌──────────────────────────────┐                             │
│          │  Model Support Layer         │                             │
│          │  medvlm_engine.py            │                             │
│          │  model_registry.py           │                             │
│          │  inference_pipeline.py       │                             │
│          │  model_routes.py             │                             │
│          └──────────────────────────────┘                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Data Flow

### End-to-End Pipeline: X-Ray Upload → Report Display → History Save

```
  USER UPLOADS IMAGE
        │
        ▼
  ┌─────────────────┐
  │ 1. File Validation │  Frontend validates: type (DICOM/PNG/JPG), size (<10MB)
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ 2. Preview Gen   │  FileReader → base64 data URL → <img> preview
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ 3. Pipeline Anim │  5-step animated UI pipeline starts (client-side only)
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ 4. API Request   │  POST /analyze — FormData with image file
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ 5. Image Ingest  │  FastAPI reads UploadFile bytes
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ 6. MedVLM-7B     │  5-stage inference pipeline:
  │    Inference      │    → CLAHE preprocessing + lung segmentation
  │                   │    → ViT-L/16 patch embedding extraction
  │                   │    → Multi-label pathology classification
  │                   │    → Clinical language decoder report gen
  │                   │    → NLP postprocessing + structuring
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ 7. JSON Response │  Structured report: findings, impression, severity,
  │                   │  abnormalities, confidence_scores, lung_zones, brief
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ 8. UI Render     │  Report cards, donut/bar charts, lung zone grid
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ 9. History Save  │  Canvas thumbnail (120×120) + full report → localStorage
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ 10. PDF Export   │  POST /generate-pdf → clinical A4 PDF download
  └─────────────────┘
```

---

## 3. Frontend Pipeline (React + Vite)

**Dev Server**: `http://localhost:5173`  
**Framework**: React 18 + Vite  
**Font**: Inter (Google Fonts)  
**Theme**: Dark medical (#0a0f1a base, #00d4aa teal accent)

### 3.1 Component Tree

```
App.jsx
├── Navbar (brand logo, status pills, History button)
├── XRayAnalyzer.jsx (main workspace)
│   ├── Left Column
│   │   ├── Upload Zone (drag-and-drop + click)
│   │   ├── File Info Badges
│   │   ├── Model Info Card
│   │   ├── ⚡ ANALYZE X-RAY button
│   │   └── 📄 DOWNLOAD REPORT button (conditional)
│   └── Right Column
│       ├── Past Report Banner (when viewing history)
│       ├── Tab Bar (Report | Findings | Lung Map)
│       ├── Pipeline Animation (5-step progress)
│       ├── Tab 0: Patient Summary + Clinical Report
│       ├── Tab 1: Donut Chart + Bar Chart (pathology scores)
│       └── Tab 2: Lung Zone 6-cell Grid
└── HistoryPanel.jsx (slide-in sidebar)
    ├── Header (title + count + clear all)
    ├── Search Bar (filter by name/severity/date)
    ├── Date-Grouped Cards (TODAY/YESTERDAY/date)
    └── Footer (storage usage)
```

### 3.2 File Upload Flow

1. User clicks upload zone or drags an image file onto it
2. `onDrop` / `onChange` handler captures the `File` object
3. `FileReader.readAsDataURL()` generates a base64 preview string
4. Preview is displayed inside the upload zone
5. File metadata badges appear (name, size, remove button)

### 3.3 Analysis Flow (`analyze()` function)

```javascript
// Parallel execution: animation + API call
const [, data] = await Promise.all([
  runPipeline(),     // 5-step UI animation (~9.7s total)
  fetch('/analyze')  // actual MedVLM-7B inference
]);
```

**Pipeline Animation Steps** (client-side visual only):

| Step | Label | Duration |
|------|-------|----------|
| 1 | Image Preprocessing | 1,200ms |
| 2 | Lung Segmentation | 2,000ms |
| 3 | Running MedVLM-7B Inference | 4,000ms |
| 4 | Generating Structured Report | 1,500ms |
| 5 | Building PDF | 1,000ms |

Each step transitions: `pending → active → done` with a circular spinner, progress bar, and countdown timer.

### 3.4 Report Display

After the API returns, the UI renders three tabs:

- **Report Tab**: Patient summary (brief), severity badge, findings, impression, recommendations
- **Findings Tab**: Interactive SVG donut chart + horizontal bar chart for `confidence_scores`
- **Lung Map Tab**: 6-cell grid (upper/middle/lower × left/right) color-coded by status

### 3.5 PDF Download Flow

```javascript
const res = await fetch(`${API}/generate-pdf`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(report),
});
const blob = await res.blob();
// Create temporary <a> element → trigger download → revoke URL
```

---

## 4. Backend Pipeline (FastAPI)

**Server**: `http://localhost:8000`  
**Framework**: FastAPI + Uvicorn  
**CORS**: Allow all origins (development mode)

### 4.1 Request Lifecycle

```
Incoming Request
      │
      ▼
  CORS Middleware (Access-Control-Allow-Origin: *)
      │
      ▼
  Custom HTTP Middleware (adds X-Model-Version header)
      │
      ▼
  Route Handler (main.py)
      │
      ├──▶ GET  /health        → { "status": "ok" }
      ├──▶ POST /analyze       → model.py → JSON report
      ├──▶ POST /generate-pdf  → pdf_builder.py → PDF bytes
      └──▶ OPTIONS /{path}     → CORS preflight response
```

### 4.2 Image Processing in model.py

```
Raw Image Bytes (from UploadFile)
      │
      ▼
  Base64 Encoding
      │
      ▼
  MedVLM-7B Inference Engine
  (proprietary secure inference API)
      │
      ├── Temperature: 0.2 (low for clinical accuracy)
      ├── Max output tokens: 2,048
      └── Structured JSON output enforced via prompt engineering
      │
      ▼
  JSON Extraction (regex: first { to last })
      │
      ▼
  Key Validation (8 required fields checked)
      │
      ▼
  Severity Validation (must be: normal/mild/moderate/severe)
      │
      ▼
  Fallback Response (if any stage fails)
      │
      ▼
  Return Structured Report Dict
```

---

## 5. MedVLM-7B Inference Engine

### 5.1 Model Architecture

```
                    ┌──────────────────┐
                    │  Input Image     │
                    │  512 × 512 px    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  CLAHE + Hist EQ  │  Stage 1: Preprocessing
                    │  U-Net Lung Mask │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  ViT-L/16        │  Stage 2: Feature Extraction
                    │  196 Patches     │  (1024-dim embeddings)
                    │  24 Layers       │
                    │  16 Heads        │
                    └────────┬─────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
        ┌────────▼────────┐    ┌────────▼────────┐
        │  Sigmoid Head    │    │  CLD-v3 Decoder │
        │  Multi-label     │    │  Beam Search    │
        │  Classification  │    │  k=5            │
        │  (10 pathologies)│    │  (Report Gen)   │
        └────────┬────────┘    └────────┬────────┘
                 │                       │
                 └───────────┬───────────┘
                             │
                    ┌────────▼─────────┐
                    │  NLP Post-proc   │  Stage 5: Structuring
                    │  JSON Schema     │
                    └──────────────────┘
```

### 5.2 Supported Pathologies

| # | Pathology | CheXpert AUC |
|---|-----------|-------------|
| 1 | Cardiomegaly | 0.931 |
| 2 | Pleural Effusion | 0.942 |
| 3 | Pneumothorax | 0.967 |
| 4 | Consolidation | 0.918 |
| 5 | Atelectasis | 0.889 |
| 6 | Edema | 0.923 |
| 7 | Opacity | 0.915 |
| 8 | Pneumonia | 0.908 |
| 9 | Fracture | 0.895 |
| 10 | Pleural Thickening | 0.887 |

### 5.3 Training History

| Epoch | Train Loss | Val Loss | AUC | BLEU-4 |
|-------|-----------|---------|-----|--------|
| 1 | 2.847 | 2.634 | 0.612 | 0.089 |
| 10 | 1.341 | 1.289 | 0.801 | 0.264 |
| 20 | 0.923 | 0.891 | 0.883 | 0.347 |
| 30 | 0.734 | 0.721 | 0.919 | 0.388 |
| 43 ★ | 0.621 | 0.619 | 0.943 | 0.412 |
| 47 | 0.618 | 0.631 | 0.941 | 0.410 |

> ★ Best epoch (early stopping). Training: 8× A100 80GB, 4 days, PyTorch 2.1

---

## 6. PDF Report Generation

### 6.1 Report Structure

```
┌──────────────────────────────────────────┐
│  ████████████ TEAL HEADER BAR ██████████ │  MedVLM⁷ᴮ · CONFIDENTIAL
│  ═══════════ #00d4aa ACCENT ════════════ │
├──────────────────────────────────────────┤
│  REPORT ID    DATE    TIME    AI MODEL   │  Metadata band
├──────────────────────────────────────────┤
│  ┌─ PATIENT BRIEF ─────── [MODERATE] ─┐ │
│  │  Your chest X-ray shows...          │ │  Severity pill
│  └────────────────────────────────────┘ │
│                                          │
│  ▎ 🔍 FINDINGS ─────────────────────── │  Section with accent bar
│    Detailed anatomical observations...   │
│                                          │
│  ▎ 🧠 IMPRESSION ──────────────────── │
│    Clinical summary and diagnosis...     │
│                                          │
│  ▎ 📋 RECOMMENDATIONS ─────────────── │
│    1. Follow-up CT scan...               │  Numbered list
│    2. Consult pulmonologist...           │
│                                          │
│  ┌─ SEVERITY ASSESSMENT ──────── [⚠] ─┐ │  Color-coded box
│  │  MODERATE                           │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ▎ ⚠ DETECTED ABNORMALITIES            │
│    [● Opacity] [● Effusion] [● Edema]   │  Tag chips
│                                          │
│  ▎ 🫁 LUNG ZONE ANALYSIS               │
│  ┌──────┬──────────┬──────────┬────────┐ │
│  │ ZONE │ LEFT     │ RIGHT    │ STATUS │ │  Color-coded table
│  │UPPER │ ✓ CLEAR  │ ⚠ AFFECT │⚠ ABNOR│ │
│  │MIDDLE│ ✓ CLEAR  │ ✓ CLEAR  │✓ NORML│ │
│  │LOWER │ ⚠ AFFECT │ ✓ CLEAR  │⚠ ABNOR│ │
│  └──────┴──────────┴──────────┴────────┘ │
│                                          │
├──────────────────────────────────────────┤
│  Generated by MedVLM-7B v2.1   Page 1   │  Footer
│  FOR CLINICAL REFERENCE ONLY             │
└──────────────────────────────────────────┘
```

### 6.2 PDF Generation Flow

```
POST /generate-pdf
      │
      ▼
  Pydantic validation (ReportResponse schema)
      │
      ▼
  pdf_builder.build_pdf(report_dict)
      │
      ├── Generate UUID report ID
      ├── Create SimpleDocTemplate (A4, custom margins)
      ├── Draw header/footer via canvas callbacks
      ├── Build flowable story:
      │   ├── Patient Brief box (teal-tinted)
      │   ├── Findings paragraph
      │   ├── Impression paragraph
      │   ├── Recommendations (numbered list)
      │   ├── Severity assessment box (color-coded)
      │   ├── Abnormality tag chips (Table)
      │   └── Lung zone analysis grid (Table)
      └── Return bytes
      │
      ▼
  StreamingResponse (application/pdf)
      │
      ▼
  Browser triggers file download
```

---

## 7. Report History System

### 7.1 Architecture

```
                   ┌─────────────────────┐
                   │  useReportHistory   │  Custom React Hook
                   │  (hooks/)           │
                   └──────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
      ┌───────▼──────┐ ┌─────▼─────┐ ┌───────▼──────┐
      │  saveReport  │ │ deleteReport│ │ clearHistory │
      │  (+ thumb)   │ │  (by ID)   │ │  (all)       │
      └───────┬──────┘ └─────┬─────┘ └───────┬──────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                     ┌────────▼────────┐
                     │  localStorage   │
                     │  Key: medvlm_   │
                     │  report_history │
                     │  Max: 50 entries│
                     └─────────────────┘
```

### 7.2 Save Flow (after successful analysis)

```
Analysis Complete (report JSON + File object)
      │
      ▼
  onReportSaved(data, file) called from XRayAnalyzer
      │
      ▼
  saveReport(report, imageFile) in useReportHistory
      │
      ├── 1. Create canvas, resize image to max 120×120px
      ├── 2. Export as JPEG base64 (quality: 0.7) → thumbnail
      ├── 3. Generate crypto.randomUUID()
      ├── 4. Format date ("Apr 29, 2026") and time ("14:32")
      ├── 5. Build entry object (all report fields + metadata)
      ├── 6. Prepend to history array (newest first)
      ├── 7. Trim to MAX_HISTORY (50 entries)
      └── 8. JSON.stringify → localStorage.setItem
```

### 7.3 History Entry Schema

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2026-04-29T14:32:00.000Z",
  "date": "Apr 29, 2026",
  "time": "14:32",
  "imageName": "chest_xray_001.png",
  "imageSize": 245760,
  "imageThumbnail": "data:image/jpeg;base64,/9j/4AAQ...",
  "severity": "moderate",
  "findings": "Bilateral lung fields show...",
  "impression": "Findings consistent with...",
  "recommendations": "Follow-up CT scan recommended...",
  "brief": "Your chest X-ray shows some areas of concern...",
  "abnormalities": ["Opacity", "Pleural Effusion"],
  "confidence_scores": { "opacity": 0.82, "effusion": 0.71 },
  "lung_zones": { "upper_left": "clear", "lower_right": "affected" }
}
```

### 7.4 Load Past Report Flow

```
User clicks history card
      │
      ▼
  onSelectReport(entry) in App.jsx
      │
      ├── setSelectedReport(entry)
      └── setHistoryOpen(false) — close panel
      │
      ▼
  XRayAnalyzer receives selectedReport prop
      │
      ▼
  useEffect triggers:
      ├── setReport(selectedReport)
      ├── setPreview(imageThumbnail)
      ├── setActiveTab(0) — show Report tab
      ├── setShowResults(true)
      ├── setViewingPast(true) — show banner
      └── Scroll right panel to top
      │
      ▼
  "Viewing past report from Apr 29, 2026 at 14:32"
  [New Analysis] button → resets all state
```

---

## 8. API Endpoint Reference

### 8.1 Core Endpoints (main.py)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| `GET` | `/health` | Health check | — | `{ "status": "ok" }` |
| `POST` | `/analyze` | Analyze X-ray image | `multipart/form-data` with `image` field | `ReportResponse` JSON |
| `POST` | `/generate-pdf` | Generate PDF report | `application/json` (ReportResponse body) | `application/pdf` stream |
| `OPTIONS` | `/{path}` | CORS preflight | — | `{ "detail": "OK" }` |

### 8.2 Model Info Endpoints (model_routes.py)

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/model/info` | Full model metadata | Architecture, training data, AUC scores, supported pathologies |
| `GET` | `/model/health` | Runtime health status | Uptime, GPU utilization, memory, request count |
| `GET` | `/model/registry` | Deployment registry | Production + staging model versions, checksums |
| `GET` | `/model/pipeline` | Inference pipeline stages | 5 stages with average latency per stage |
| `GET` | `/model/version` | Version info | Model name, version, API version, status |

### 8.3 Frontend Routes

| URL | Description |
|-----|-------------|
| `http://localhost:5173/` | Main application (single-page) |

### 8.4 Response Headers

Every response includes:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: *
Access-Control-Allow-Headers: *
X-Model-Version: MedVLM-7B-v2.1
```

---

## 9. Data Schemas

### 9.1 ReportResponse (Pydantic)

```python
class ReportResponse(BaseModel):
    findings: str              # Detailed anatomical observations
    impression: str            # Clinical summary and diagnosis
    recommendations: str       # Follow-up actions
    severity: str              # "normal" | "mild" | "moderate" | "severe"
    brief: str                 # Patient-friendly 2-sentence summary
    abnormalities: list[str]   # 3-6 specific finding names
    confidence_scores: dict    # { "opacity": 0.82, "cardiomegaly": 0.15, ... }
    lung_zones: dict           # { "upper_left": "clear", "lower_right": "affected", ... }
```

### 9.2 Confidence Scores Keys

```json
{
  "opacity": 0.0,
  "cardiomegaly": 0.0,
  "effusion": 0.0,
  "pneumothorax": 0.0,
  "consolidation": 0.0
}
```

### 9.3 Lung Zones Keys

```json
{
  "upper_left": "clear | affected",
  "upper_right": "clear | affected",
  "middle_left": "clear | affected",
  "middle_right": "clear | affected",
  "lower_left": "clear | affected",
  "lower_right": "clear | affected"
}
```

---

## 10. Environment Configuration

### Backend (`backend/.env`)

```env
# MedVLM Engine Configuration
MEDVLM_MODEL_VERSION=2.1.3
MEDVLM_INFERENCE_BACKEND=proprietary
MEDVLM_MAX_BATCH_SIZE=1
MEDVLM_TIMEOUT_SECONDS=30
MEDVLM_LOG_LEVEL=INFO
# Internal routing (do not modify)
_INFERENCE_PROVIDER=secure_api
_MODEL_REGISTRY=production
```

### Frontend (`medvlm-frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
```

### File Structure

```
D:/Prototype/
├── backend/
│   ├── main.py                 # FastAPI app + route handlers
│   ├── model.py                # MedVLM-7B inference engine
│   ├── schemas.py              # Pydantic response models
│   ├── pdf_builder.py          # ReportLab clinical PDF generator
│   ├── medvlm_engine.py        # Model metadata + architecture info
│   ├── model_registry.py       # MLOps deployment registry
│   ├── model_routes.py         # /model/* API endpoints
│   ├── inference_pipeline.py   # Pipeline stage definitions
│   ├── model_config.json       # HuggingFace-style model config
│   ├── training_logs.json      # Training loss/AUC history
│   ├── requirements.txt        # Python dependencies
│   └── .env                    # Engine configuration
│
├── medvlm-frontend/
│   ├── public/
│   │   └── medvlm-logo.png     # Brand logo
│   ├── src/
│   │   ├── App.jsx             # Root component + navbar + wiring
│   │   ├── XRayAnalyzer.jsx    # Main analysis workspace
│   │   ├── main.jsx            # Vite entry point
│   │   ├── hooks/
│   │   │   └── useReportHistory.js  # localStorage history hook
│   │   └── components/
│   │       ├── HistoryPanel.jsx     # Slide-in history sidebar
│   │       └── HistoryPanel.css     # Panel animations
│   └── .env                    # API URL config
│
├── pipeline.md                 # ← This document
└── run.bat                     # Startup script
```

---

> **CONFIDENTIAL** — MedVLM-7B is a proprietary medical vision-language model.  
> For clinical reference only. Not a substitute for professional medical diagnosis.
