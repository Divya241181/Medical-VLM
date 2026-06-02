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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Explicit CORS headers on every response ─────────────────────────────────
@app.middleware("http")
async def add_cors_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["X-Model-Version"] = "MedVLM-7B-v2.1"
    return response


# ── OPTIONS preflight handler (catch-all) ────────────────────────────────────
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    return JSONResponse(
        content={"detail": "OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )


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
        content=result,
        headers={"Access-Control-Allow-Origin": "*"},
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
            "Content-Disposition": "attachment; filename=MedVLM_Report.pdf",
            "Access-Control-Allow-Origin": "*",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
