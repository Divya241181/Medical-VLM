# ⚕️ MedVLM — Complete Clinical Radiology AI System

**Hospital-grade chest radiograph analysis** combining local deep learning pathology detection (**TorchXRayVision DenseNet-121**, trained on 700K+ annotated clinical radiographs across CheXpert, MIMIC-CXR, PadChest, and NIH ChestX-ray14) with multimodal generative clinical synthesis via **Google Gemini 2.5 Flash**.

MedVLM accepts 16-bit clinical **DICOM (.dcm)** studies as well as standard images (PNG, JPG, WEBP), generates calibrated pathology probabilities and dynamic Grad-CAM heatmaps, classifies 6 anatomical lung zones, produces differential diagnoses with ICD-10 codes, persists studies in an SQLite database, supports physician digital sign-offs, and exports accredited A4 clinical PDF reports.

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![TorchXRayVision](https://img.shields.io/badge/TorchXRayVision-DenseNet--121-EE4C2C?style=flat&logo=pytorch&logoColor=white)
![Google GenAI](https://img.shields.io/badge/Google%20GenAI-Gemini%202.5%20Flash-4285F4?style=flat&logo=google&logoColor=white)
![DICOM](https://img.shields.io/badge/DICOM-16--bit%20Imaging-blue?style=flat)
![Pytest](https://img.shields.io/badge/Pytest-11%2F11%20Passed-2ea44f?style=flat&logo=pytest)
![Docker](https://img.shields.io/badge/Docker-Compose%20Ready-2496ED?style=flat&logo=docker&logoColor=white)

---

## 🌟 Key Features

* **🏥 Clinical DICOM (.dcm) & PHI Sanitization**:
  * Native 16-bit DICOM parsing via `pydicom`.
  * Automatic VOI LUT window center/width leveling and `MONOCHROME1` inversion.
  * Strict Protected Health Information (PHI) scrubbing: patient names and IDs are redacted before multimodal inference.
* **🔬 Dual-Mode Analysis Pipeline**:
  * **⚡ Fast Unified Mode (~2.0s)**: Pairs local DenseNet-121 pathology scores with a single structured Gemini 2.5 Flash synthesis.
  * **🧠 Multi-Agent Cascade Mode (~5.0s)**: Dispatches a 3-agent cascade:
    1. *Vision Agent*: Extracts localized anatomical observations across 6 lung zones.
    2. *Reasoning Agent*: Formulates differential diagnoses, clinical severity, and ICD-10 codes.
    3. *Report Agent*: Drafts radiologist findings, impression, and multilingual patient brief.
* **🔥 Dynamic Thread-Safe Grad-CAM**:
  * On-demand layer activation saliency mapping for target pathologies (Cardiomegaly, Effusion, Pneumothorax, Consolidation, etc.) with concurrency locks preventing backward pass race conditions.
* **🗄️ SQLite Study Persistence & History API**:
  * Relational database storing radiograph studies, metadata, and findings with full CRUD endpoints (`/studies`).
* **🩺 Physician Verification & Digital Sign-Off**:
  * Licensed radiologist review modal to authenticate reports, record clinical addendum notes, and append digital signature blocks.
* **📄 Hospital-Grade A4 PDF Exporter**:
  * Generates formatted clinical PDFs featuring institutional headers, DICOM metadata, pathology metrics, differential tables, and physician certification badges.
* **💬 Clinical AI Copilot & Specialist Referral Letters**:
  * Multi-turn chat assistant grounded strictly in study findings, featuring audio speech synthesis and one-click specialist referral letters.
* **🧪 100% Automated Pytest Coverage**:
  * Unit and integration test suite covering API routes, DICOM windowing, thread-safety, and PDF generation.

---

## 📁 Repository Structure

```
Med VLM/
├── backend/                        # FastAPI Backend
│   ├── main.py                     # API router, study endpoints, and lifecycle
│   ├── pipeline.py                 # Dual-mode orchestrator (Fast & Multi-Agent)
│   ├── local_model.py              # Thread-safe TorchXRayVision DenseNet-121 & Grad-CAM
│   ├── dicom_utils.py              # 16-bit DICOM parser & PHI de-identification
│   ├── database.py                 # SQLite + SQLAlchemy persistence layer
│   ├── app_config.py               # Google GenAI client configuration & env loader
│   ├── schemas.py                  # Strictly typed Pydantic models
│   ├── pdf_builder.py              # ReportLab clinical PDF generator with sign-off
│   ├── agents/                     # Specialized clinical agent modules
│   │   ├── vision_agent.py         # Stage 1: Anatomical feature extractor
│   │   ├── reasoning_agent.py      # Stage 2: Differential diagnosis & ICD-10 engine
│   │   ├── report_agent.py         # Stage 3: Narrative report writer
│   │   ├── chat_agent.py           # Interactive follow-up Q&A copilot
│   │   ├── referral_agent.py       # Specialist referral letter generator
│   │   └── grounding_agent.py      # Evidence-based literature citations
│   ├── tests/                      # Automated test suite
│   │   ├── test_api.py             # API route, validation, and lifecycle tests
│   │   ├── test_local_model.py     # Torch inference, DICOM, and thread safety tests
│   │   └── test_pdf.py             # PDF builder and sign-off tests
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Template for environment configuration
│
├── medvlm-frontend/                # React 18 + Vite Frontend
│   ├── public/samples/             # Normal, cardiomegaly, pneumonia sample X-rays
│   ├── src/
│   │   ├── App.jsx                 # Application shell & navigation
│   │   ├── XRayAnalyzer.jsx        # Primary radiograph coordinator
│   │   ├── components/             # Modular UI components
│   │   │   ├── ImageDropzone.jsx   # DICOM/PNG dropzone & pipeline selector
│   │   │   ├── GradCamViewer.jsx   # Saliency viewer & opacity controls
│   │   │   ├── ClinicalReportView.jsx # Tabs, 6-zone map & findings
│   │   │   ├── ClinicalChatDrawer.jsx # Slide-out AI copilot drawer
│   │   │   ├── ReferralModal.jsx   # Specialist referral letter generator
│   │   │   ├── DoctorSignoffModal.jsx # Reviewer digital sign-off modal
│   │   │   └── HistoryPanel.jsx    # Past study drawer synced with database
│   │   └── hooks/
│   │       └── useReportHistory.js # History hook with online/offline DB sync
│   └── package.json
│
├── Dockerfile.backend              # Backend container build
├── Dockerfile.frontend             # Frontend Vite + Nginx build
├── docker-compose.yml              # Multi-container orchestration
├── .github/workflows/ci.yml        # Continuous integration pipeline
├── run.bat                         # One-click Windows startup script
└── README.md
```

---

## 🚀 Quick Start

### Option 1: One-Click Windows Script
Double-click or run from terminal:
```cmd
run.bat
```

### Option 2: Docker Compose (Production Ready)
```bash
# 1. Set your Gemini API key in .env or environment
export GEMINI_API_KEY="your_api_key_here"

# 2. Start backend, database, and frontend containers
docker compose up --build
```
* Backend API: [http://localhost:8000](http://localhost:8000) (Docs: [http://localhost:8000/docs](http://localhost:8000/docs))
* Frontend Application: [http://localhost:5173](http://localhost:5173)

### Option 3: Manual Local Development

#### 1. Backend Setup
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run automated tests
pytest tests/ -v

# Start FastAPI server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Frontend Setup
```bash
cd medvlm-frontend

# Install dependencies & run dev server
npm install
npm run dev
```

---

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check, active model, and engine capabilities |
| `POST` | `/analyze` | Synchronous analysis (supports DICOM, PNG, JPG, and pipeline modes) |
| `POST` | `/analyze-stream` | Real-time SSE streaming analysis (`model` → `report` → `done`) |
| `POST` | `/gradcam` | Dynamic Grad-CAM heatmap generation for specified condition |
| `GET` | `/studies` | List recent saved studies from database |
| `GET` | `/studies/{id}` | Retrieve study details by ID |
| `PATCH`| `/studies/{id}` | Update clinical notes or review status |
| `POST` | `/studies/{id}/sign` | Radiologist digital sign-off and approval |
| `DELETE`| `/studies/{id}` | Delete study record from database |
| `GET` | `/studies/{id}/pdf`| Download diagnostic A4 PDF report by study ID |
| `POST` | `/chat` | Grounded clinical dialogue copilot |
| `POST` | `/referral-letter` | Specialist referral letter generator |
| `POST` | `/grounded-insights`| Evidence-based medical literature search |

---

## 🧪 Running Automated Tests

The backend includes a comprehensive test suite covering the entire system:

```bash
cd backend
pytest tests/ -v
```

Output:
```
tests/test_api.py::test_health_check PASSED
tests/test_api.py::test_invalid_image_type_rejected PASSED
tests/test_api.py::test_empty_image_rejected PASSED
tests/test_api.py::test_generate_pdf_endpoint PASSED
tests/test_api.py::test_study_lifecycle PASSED
tests/test_local_model.py::test_png_preprocessing PASSED
tests/test_local_model.py::test_dicom_processing_and_phi_scrubbing PASSED
tests/test_local_model.py::test_gradcam_generation PASSED
tests/test_local_model.py::test_concurrent_gradcam_thread_safety PASSED
tests/test_pdf.py::test_build_pdf_basic PASSED
tests/test_pdf.py::test_build_pdf_with_differentials_and_signoff PASSED

=========== 11 passed in 14.99s ===========
```

---

## ⚠️ Medical Disclaimer

> MedVLM is designed as an **AI-assisted clinical decision support tool**. It is intended to assist medical professionals by providing objective deep learning pathology predictions and structured reporting. It does not replace independent diagnostic evaluation by a licensed radiologist or attending physician.
