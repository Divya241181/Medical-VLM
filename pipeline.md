# MedVLM — Complete Hybrid Data Pipeline Documentation

> **AI Architecture**: Hybrid 2-Stage Multi-Agent System  
> **Stage 1 (Computer Vision)**: TorchXRayVision DenseNet-121 (Trained on 700K+ chest radiographs across CheXpert, MIMIC-CXR, PadChest, NIH ChestX-ray14)  
> **Stage 2 (Generative Reporting)**: Google Gemini 3.6 Flash via `google-genai` SDK with strict JSON Schema enforcement (`FullReport`)  
> **Saliency & Interpretability**: Real-time PyTorch Grad-CAM layer activation mapping  

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [End-to-End Pipeline Data Flow](#2-end-to-end-pipeline-data-flow)
3. [Stage 1: Local Computer Vision & Grad-CAM](#3-stage-1-local-computer-vision--grad-cam)
4. [Stage 2: Gemini 3.6 Flash Multimodal Synthesis](#4-stage-2-gemini-36-flash-multimodal-synthesis)
5. [Real-Time SSE Streaming Pipeline](#5-real-time-sse-streaming-pipeline)
6. [Specialized Clinical Agents](#6-specialized-clinical-agents)
7. [PDF Report Generation Pipeline](#7-pdf-report-generation-pipeline)
8. [API Endpoint Reference](#8-api-endpoint-reference)
9. [Data Schemas (Pydantic & JSON)](#9-data-schemas-pydantic--json)
10. [Environment & Quota Management](#10-environment--quota-management)

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React 18 + Vite)                        │
│                                                                             │
│  ┌───────────────┐     ┌────────────────┐     ┌────────────────────────┐    │
│  │   App.jsx     │────▶│  XRayAnalyzer  │────▶│   HistoryPanel.jsx     │    │
│  │  (Layout/Nav) │     │  (Workspace)   │     │  (localStorage Cache)  │    │
│  └───────────────┘     └───────┬────────┘     └────────────────────────┘    │
│                                │                                            │
│            ┌───────────────────┼───────────────────┐                        │
│            ▼                   ▼                   ▼                        │
│     [ChatDrawer.jsx]   [ReferralModal.jsx]   [GradCamModal.jsx]             │
└────────────┬───────────────────┬───────────────────┬────────────────────────┘
             │                   │                   │
             └───────────────────┼───────────────────┘
                                 │ HTTP / SSE Requests
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (FastAPI :8000)                            │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         main.py (Router)                            │   │
│   └──────┬──────────────────────┬──────────────────────┬────────────┬───┘   │
│          │                      │                      │            │       │
│          ▼                      ▼                      ▼            ▼       │
│   ┌───────────────┐      ┌─────────────┐       ┌───────────┐ ┌──────────┐   │
│   │  pipeline.py  │      │   agents/   │       │  gradcam  │ │pdf_builder│  │
│   └──────┬────────┘      │(chat/ref/..)│       └───────────┘ └──────────┘   │
│          │               └─────────────┘                                    │
│    ┌─────┴──────────────────────────────┐                                   │
│    │                                    │                                   │
│    ▼                                    ▼                                   │
│ ┌─────────────────────────┐    ┌─────────────────────────────────────────┐  │
│ │ STAGE 1: local_model.py │    │ STAGE 2: app_config.py & Gemini API     │  │
│ │ TorchXRayVision         │    │ google-genai SDK                        │  │
│ │ DenseNet-121 (PyTorch)  │    │ Model: gemini-3.6-flash                 │  │
│ │ • 18 pathology scores   │    │ • Structured FullReport JSON            │  │
│ │ • PyTorch Grad-CAM maps │    │ • Differentials, ICD-10, Brief, Zones   │  │
│ └─────────────────────────┘    └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. End-to-End Pipeline Data Flow

```
   1. USER UPLOADS RADIOGRAPH (PNG / JPG / WEBP)
         │
         ▼
   2. FRONTEND VALIDATION
      • MIME type check (image/png, image/jpeg, image/webp)
      • File size verification (< 10 MB, > 1 KB)
      • FileReader generates base64 preview URL
         │
         ▼
   3. DISPATCH REQUEST
      • Synchronous mode: POST /analyze (multipart/form-data)
      • Real-time SSE mode: POST /analyze-stream (text/event-stream)
         │
         ▼
   4. STAGE 1 — LOCAL TORCHXRAYVISION INFERENCE (~150ms)
      • Reads raw image bytes, converts to grayscale float32 normalized [-1024, 1024]
      • DenseNet-121 model execution across 18 clinical pathologies
      • Grad-CAM backward pass generates saliency heatmap for top pathology
      • Heatmap rendered onto original image and encoded as base64 PNG data URL
         │
         ▼
   5. STAGE 2 — MULTIMODAL GEMINI 3.6 FLASH SYNTHESIS (~2.0s)
      • Combines image bytes + calibrated pathology scores + prompt
      • Enforces strict Pydantic FullReport response schema via genai.Client
      • Generates:
        - 6 lung zones classification (clear / affected)
        - Severity score (normal, mild, moderate, severe)
        - Differential diagnoses with likelihood & clinical rationale
        - ICD-10 codes and descriptions
        - Comprehensive anatomical findings paragraph
        - Concise primary impression
        - Actionable recommendations & 2-sentence patient brief
         │
         ▼
   6. REPORT AGGREGATION & INGESTION
      • Merges PyTorch Grad-CAM data URL & local scores into FullReport
      • Returns unified JSON object to client
         │
         ▼
   7. CLIENT RENDER & DOWNSTREAM EXTENSIONS
      • Renders clinical findings, interactive charts, and lung zone map
      • Interactive follow-up Q&A via POST /chat
      • Dynamic Grad-CAM generation for any condition via POST /gradcam
      • Referral letter drafting via POST /referral-letter
      • Hospital-grade PDF report download via POST /generate-pdf
```

---

## 3. Stage 1: Local Computer Vision & Grad-CAM

Implemented in `backend/local_model.py`.

### 3.1 Model Architecture
- **Architecture**: DenseNet-121 pre-trained on clinical radiograph corpora (`densenet121-res224-all`).
- **Training Corpora**: CheXpert (224K), MIMIC-CXR (228K), PadChest (161K), NIH ChestX-ray14 (112K).
- **Total Weights**: Over 700,000 real clinical radiographs.

### 3.2 Preprocessing & Inference
1. Decodes image with `PIL.Image` and converts to single-channel 8-bit grayscale.
2. Converts image to float32 scaled to `[-1024, 1024]` (TorchXRayVision standard).
3. Resizes to `224 × 224` pixels with bilinear interpolation.
4. Passes tensor through DenseNet-121 under `torch.no_grad()`.
5. Applies sigmoid activation to logit outputs to obtain calibrated probabilities across 18 conditions.

### 3.3 Dynamic Grad-CAM Implementation
- Hooks into the final convolutional layer: `model.features.denseblock4.denselayer16.conv2`.
- Computes gradients of the target pathology output with respect to feature activation maps.
- Performs global average pooling of gradients to weight feature map channels.
- Applies ReLU, normalizes heatmap to `[0, 1]`, and resizes to match original image dimensions.
- Colorizes heatmap with `matplotlib.cm.jet` and blends with the grayscale radiograph (`alpha=0.45`).
- Encodes composite image as base64 PNG data URL (`data:image/png;base64,...`).

---

## 4. Stage 2: Gemini 3.6 Flash Multimodal Synthesis

Implemented in `backend/pipeline.py` and configured in `backend/app_config.py`.

### 4.1 Client & SDK
Uses the official Google GenAI SDK:
```python
from google import genai
from google.genai import types

client = genai.Client(api_key=GEMINI_API_KEY)
```

### 4.2 Structured Output Schema
Gemini 3.6 Flash outputs strictly structured JSON validated against the `FullReport` Pydantic model:
```python
response = client.models.generate_content(
    model=MODEL_NAME,  # "gemini-3.6-flash"
    contents=[prompt, image_part],
    config=types.GenerateContentConfig(
        temperature=0.15,
        response_mime_type="application/json",
        response_schema=FullReport,
    ),
)
report: FullReport = response.parsed
```

### 4.3 Multilingual Support
The prompt template explicitly instructs the model to generate all text fields (`findings`, `impression`, `recommendations`, `brief`) in the user-selected language (e.g., English, Spanish, Hindi, French, German, Mandarin).

---

## 5. Real-Time SSE Streaming Pipeline

Endpoint: `POST /analyze-stream`

Clients consume Server-Sent Events to display visual pipeline progress indicators:

```
event: message
data: {"type": "stage", "stage": "model", "status": "running"}

event: message
data: {"type": "stage", "stage": "model", "status": "done"}

event: message
data: {"type": "stage", "stage": "report", "status": "running"}

event: message
data: {"type": "stage", "stage": "report", "status": "done"}

event: message
data: {"type": "done", "report": { ...FullReport JSON... }}
```

---

## 6. Specialized Clinical Agents

MedVLM includes specialized modules under `backend/agents/`:

### 6.1 Chat Agent (`agents/chat_agent.py`)
- **Route**: `POST /chat`
- **Purpose**: Enables conversational interaction with the generated radiograph report.
- **Context**: Ingests previous report findings, impression, patient brief, and chat conversation history to answer medical follow-up questions accurately while preserving safety guardrails.

### 6.2 Referral Agent (`agents/referral_agent.py`)
- **Route**: `POST /referral-letter`
- **Purpose**: Drafts formal physician-to-physician clinical consultation letters summarizing pathology findings, differentials, urgency, and recommended diagnostic workup.

### 6.3 Grounding Agent (`agents/grounding_agent.py`)
- **Route**: `POST /grounded-insights`
- **Purpose**: Retrieves evidence-based clinical insights and medical journal references matching the identified pathologies.

---

## 7. PDF Report Generation Pipeline

Implemented in `backend/pdf_builder.py` using **ReportLab**.

### 7.1 Features
- Clean institutional A4 diagnostic template with medical color accents.
- Dynamic metadata bar showing Report UUID, Generation Timestamp, and Active Model name (`Gemini (gemini-3.6-flash)`).
- Patient brief highlighted in a calm teal notification banner.
- Color-coded severity badge (`NORMAL` / `MILD` / `MODERATE` / `SEVERE`).
- Two-column abnormality tags and 6-zone lung field matrix table.
- Legal clinical disclaimer header and footer on every page.

---

## 8. API Endpoint Reference

| Method | Route | Request Body | Response |
|---|---|---|---|
| `GET` | `/health` | None | `{"status": "ok", "version": "3.5.0", "engine": "TorchXRayVision DenseNet-121 + Gemini (gemini-3.6-flash)"}` |
| `POST` | `/analyze` | `multipart/form-data`: `image`, `language` | `FullReport` JSON |
| `POST` | `/analyze-stream` | `multipart/form-data`: `image`, `language` | `text/event-stream` SSE events |
| `POST` | `/gradcam` | `{"target_pathology": "Cardiomegaly"}` | `{"target_pathology": "...", "heatmap_data_url": "data:image/png;base64,..."}` |
| `POST` | `/chat` | `ChatRequest` (context, messages, user_message) | `ChatResponse` (`reply`) |
| `POST` | `/referral-letter` | `ReferralLetterRequest` (context, patient_name) | `ReferralLetterResponse` (`letter`) |
| `POST` | `/grounded-insights`| `GroundedInsightsRequest` (conditions, severity) | `GroundedInsightsResponse` (`insights`, `sources`) |
| `POST` | `/generate-pdf` | `FullReport` JSON | `application/pdf` stream |

---

## 9. Data Schemas (Pydantic & JSON)

### 9.1 FullReport Schema
```python
class FullReport(BaseModel):
    findings: str
    impression: str
    recommendations: str
    brief: str
    severity: Severity  # "normal" | "mild" | "moderate" | "severe"
    abnormalities: list[str]
    confidence_scores: ConfidenceScores
    lung_zones: LungZones
    icd10_codes: list[ICD10Code]
    differentials: list[DifferentialItem]
    grounded_guidance: Optional[GroundedGuidance] = None
    language: str = "English"
    heatmap_data_url: Optional[str] = None
    detected_pathologies: list[DetectedPathology]
```

### 9.2 Lung Zones Schema
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

### 9.3 Confidence Scores Schema
```json
{
  "opacity": 0.08,
  "cardiomegaly": 0.04,
  "effusion": 0.02,
  "pneumothorax": 0.01,
  "consolidation": 0.03
}
```

---

## 10. Environment & Quota Management

Configured via `backend/.env`:

```env
# Google AI Studio API Key
GEMINI_API_KEY=your_key_here

# Active Model: gemini-3.6-flash
GEMINI_MODEL=gemini-3.6-flash
```

### Quota and Rate Limit Notes
- **Project-Level Quotas**: Google AI Studio tracks rate limits per Google Cloud Project (`quotaId: GenerateRequestsPerDayPerProjectPerModel`). Generating multiple keys in the same project shares the same quota.
- **Model Selection**: `gemini-3.6-flash` is recommended for active use. It provides fast structured multimodal reasoning with high rate limits, superseding older models that are restricted on new API keys.
- **Server Reloading**: Modifying `.env` requires restarting the backend server or triggering an app reload so Python re-instantiates `genai.Client` with the updated environment variables.
