"""
MedVLM Radiology Backend — FastAPI Application
Model: MedVLM-7B v2.1 · CheXpert + MIMIC-CXR trained
"""

import io
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# CORS handlers removed in favor of standard CORSMiddleware


# ── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "ok"}


# ── Analyze X-Ray ───────────────────────────────────────────────────────────
@app.post("/analyze", response_model=ReportResponse)
async def analyze(image: UploadFile = File(...)):
    """Accept a chest X-ray image and return AI-generated analysis."""
    image_bytes = await image.read()
    result = analyze_xray(image_bytes)
    return JSONResponse(
        content=result
    )


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
            "Content-Disposition": "attachment; filename=MedVLM_Report.pdf"
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
