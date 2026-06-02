"""
MedVLM Radiology Backend — FastAPI Application
Model: MedVLM-7B v2.1 · CheXpert + MIMIC-CXR trained
"""

import io
import os
from fastapi import FastAPI, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from model import analyze_xray
from pdf_builder import build_pdf
from schemas import ReportResponse

app = FastAPI(
    title="MedVLM Radiology API",
    description="MedVLM-7B inference engine for chest radiograph analysis",
    version="2.1.0",
)

# ── CORS Middleware ──────────────────────────────────────────────────────────
# In production, set ALLOWED_ORIGINS env var to your Vercel frontend URL.
# Example: ALLOWED_ORIGINS=https://medvlm.vercel.app
# Leave unset locally to allow all origins during development.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
_allow_origins = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


# ── OPTIONS preflight handler (catch-all) ────────────────────────────────────
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    return JSONResponse(
        content={"detail": "OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Accept",
        },
    )


# ── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "ok", "model": "MedVLM-7B v2.1.3"}


# ── Analyze X-Ray ───────────────────────────────────────────────────────────
@app.post("/analyze", response_model=ReportResponse)
async def analyze(image: UploadFile = File(...)):
    """Accept a chest X-ray image and return AI-generated analysis."""
    image_bytes = await image.read()
    result = analyze_xray(image_bytes)
    return JSONResponse(content=result)


# ── Generate PDF Report ─────────────────────────────────────────────────────
@app.post("/generate-pdf")
async def generate_pdf(report: ReportResponse):
    """Accept a full report JSON body and return a downloadable PDF."""
    pdf_bytes = build_pdf(report.model_dump())
    buffer = io.BytesIO(pdf_bytes)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=MedVLM_Report.pdf",
        },
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

