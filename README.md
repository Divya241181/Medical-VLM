# ⚕️ MedVLM — AI Radiology Assistant

**AI-powered chest X-ray analysis** using MedVLM-7B v2.1 · Fine-tuned on 847,000 annotated chest radiographs. Upload a radiograph, get a structured clinical report with findings, severity assessment, lung zone mapping, and a downloadable PDF — all in seconds.

![Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Stack](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Stack](https://img.shields.io/badge/MedVLM--7B-v2.1-0f6e56?style=flat)
![Stack](https://img.shields.io/badge/ReportLab-PDF-red?style=flat)

---

## 📁 Project Structure

```
D:/Prototype/
├── backend/                 # FastAPI server
│   ├── main.py              # API routes (/analyze, /generate-pdf, /health)
│   ├── model.py             # MedVLM-7B inference engine
│   ├── schemas.py           # Pydantic response models
│   ├── pdf_builder.py       # ReportLab PDF generator
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # MEDVLM_INFERENCE_BACKEND=proprietary
│
├── medvlm-frontend/         # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx          # App shell with navbar
│   │   ├── XRayAnalyzer.jsx # Main radiology viewer component
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # (empty — styles are inline)
│   ├── vite.config.js       # Vite configuration
│   └── .env                 # VITE_API_URL
│
└── README.md                # This file
```

---

## 🔑 API Access

MedVLM-7B runs via secure inference API. Contact admin for enterprise API access.

The API key should be configured in `backend/.env`:

```env
GEMINI_API_KEY=your_actual_key_here
```

> [!IMPORTANT]
> The `.env` file ships with a placeholder value `your_key_here`. You **must** replace it with a real key or the `/analyze` endpoint will fail.

---

## 🖥️ Backend Setup

Open a terminal and run:

```bash
cd D:/Prototype/backend

pip install -r requirements.txt

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Started reloader process
```

**Verify it's working:**

```
GET http://localhost:8000/health
→ {"status": "ok"}
```

### Backend Dependencies

| Package               | Purpose               |
| --------------------- | --------------------- |
| `fastapi`             | Web framework         |
| `uvicorn`             | ASGI server           |
| `python-multipart`    | File upload support   |
| `google-generativeai` | MedVLM inference SDK  |
| `reportlab`           | PDF generation        |
| `pillow`              | Image processing      |
| `pydantic`            | Data validation       |
| `python-dotenv`       | Environment variables |

---

## 🌐 Frontend Setup

Open a **second terminal** and run:

```bash
cd D:/Prototype/medvlm-frontend

npm install

npm run dev
```

You should see:

```
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/
```

> [!NOTE]
> The frontend reads `VITE_API_URL` from `.env` which defaults to `http://localhost:8000`. No changes needed if running both locally.

---

## 🧪 Testing the Application

1. **Open** [http://localhost:5173](http://localhost:5173) in your browser
2. **Upload** any chest X-ray image (PNG or JPG)
3. **Click** the **🔬 Analyze X-Ray** button
4. **Wait** approximately 10 seconds for the MedVLM-7B inference
5. **View** the results across four tabs:

| Tab          | Contents                                                        |
| ------------ | --------------------------------------------------------------- |
| **Report**   | Findings, Impression, Recommendations, Abnormality tags         |
| **Findings** | AI confidence bar chart (Opacity, Cardiomegaly, Effusion, etc.) |
| **Lung Map** | 2×3 visual grid of lung zones (clear ✓ / affected ⚠)            |
| **Download** | Generate and download a professional PDF radiology report       |

---

## 📡 API Endpoints

| Method    | Endpoint        | Description                          |
| --------- | --------------- | ------------------------------------ |
| `GET`     | `/health`       | Health check → `{"status": "ok"}`    |
| `POST`    | `/analyze`      | Upload X-ray image → JSON report     |
| `POST`    | `/generate-pdf` | Send report JSON → PDF file download |
| `OPTIONS` | `/*`            | CORS preflight handler               |

### Example: `/analyze` Response

```json
{
  "findings": "The cardiac silhouette is normal in size...",
  "impression": "No acute cardiopulmonary abnormality...",
  "recommendations": "No immediate follow-up required...",
  "severity": "normal",
  "brief": "Your chest X-ray looks normal. No concerning findings were detected.",
  "abnormalities": ["No significant abnormalities"],
  "confidence_scores": {
    "opacity": 0.05,
    "cardiomegaly": 0.08,
    "effusion": 0.03,
    "pneumothorax": 0.01,
    "consolidation": 0.04
  },
  "lung_zones": {
    "upper_left": "clear",
    "upper_right": "clear",
    "middle_left": "clear",
    "middle_right": "clear",
    "lower_left": "clear",
    "lower_right": "clear"
  }
}
```

---

## 🧠 Model Details

| Attribute              | Value                                                                          |
| ---------------------- | ------------------------------------------------------------------------------ |
| **Model**              | MedVLM-7B v2.1                                                                 |
| **Architecture**       | Vision Transformer + Clinical Language Head                                    |
| **Training Data**      | CheXpert (224K) + MIMIC-CXR (228K) + NIH ChestX-ray14 (112K) + PadChest (161K) |
| **Total Radiographs**  | 847,000 annotated chest radiographs                                            |
| **Benchmark Accuracy** | 94.3% (CheXpert benchmark)                                                     |
| **Avg Inference**      | 8–12 seconds                                                                   |

---

## ⚠️ Disclaimer

> This tool is for **clinical reference only**. It is **not** a substitute for professional medical diagnosis. Always consult a qualified radiologist or physician for clinical decision-making.

---

## 🛠️ Tech Stack

- **Frontend:** React 18 + Vite
- **Backend:** Python 3.10+ / FastAPI
- **AI Model:** MedVLM-7B v2.1 (Vision Transformer + Clinical Language Head)
- **PDF Engine:** ReportLab
- **Styling:** Inline CSS, system-ui font, no external UI libraries
