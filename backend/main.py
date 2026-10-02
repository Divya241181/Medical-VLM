"""
MedVLM — Complete Hybrid Multi-Agent Radiology Backend (FastAPI)
Powered by TorchXRayVision DenseNet-121 + Gemini Multimodal Generative Reporting.
Includes SQLite Study Persistence, DICOM (.dcm) Support, and Radiologist Digital Sign-off.
"""

import io
import json
import uuid
import asyncio
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, Form, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session

from PIL import Image
from app_config import ALLOWED_IMAGE_TYPES, MAX_FILE_BYTES, MIN_FILE_BYTES, MODEL_NAME
from dicom_utils import is_dicom_file
from database import init_db, get_db, StudyRecord, SessionLocal
from pipeline import run_pipeline, run_pipeline_streaming, translate_report
from local_model import get_model, generate_gradcam
from pdf_builder import build_pdf
from schemas import (
    FullReport,
    ChatRequest,
    ChatResponse,
    ReferralLetterRequest,
    ReferralLetterResponse,
    GroundedInsightsRequest,
    GroundedInsightsResponse,
    GradcamResponse,
    StudySignRequest,
    StudyUpdateRequest,
    TranslateReportRequest,
)
from agents.chat_agent import run_chat_agent
from agents.referral_agent import run_referral_agent
from agents.grounding_agent import run_grounding_agent

_executor = ThreadPoolExecutor(max_workers=2)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="MedVLM Clinical Radiology API",
    description=f"TorchXRayVision DenseNet-121 + Gemini ({MODEL_NAME}) multi-agent radiology system",
    version="4.0.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_warmup():
    """Initialize database, auto-seed realistic sample studies, and pre-warm TorchXRayVision DenseNet-121."""
    try:
        init_db()
        print("[startup] SQLite database initialized.")
        try:
            from seed_data import seed_clinical_studies
            seed_clinical_studies()
        except Exception as seed_err:
            print(f"[startup] Notice: Study seeding note ({seed_err})")

        # Non-blocking async background warmup so Render health-check responds immediately
        loop = asyncio.get_running_loop()
        loop.run_in_executor(_executor, get_model)
        print("[startup] TorchXRayVision DenseNet-121 warmup initiated in background.")
    except Exception as e:
        print(f"[startup] Warmup notice: {e}")


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": "4.0.0",
        "engine": f"TorchXRayVision DenseNet-121 + Gemini ({MODEL_NAME})",
        "features": ["DICOM (.dcm)", "Multi-Agent Cascade", "Grad-CAM", "SQLite Persistence", "Doctor Sign-off"],
    }


def _validate_image(content_type: str, image_bytes: bytes, filename: str = ""):
    if len(image_bytes) < MIN_FILE_BYTES:
        raise HTTPException(status_code=400, detail="File appears to be empty or corrupt.")
    if len(image_bytes) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail=f"File exceeds maximum allowed size ({MAX_FILE_BYTES // (1024*1024)} MB).")

    is_dcm = is_dicom_file(image_bytes, filename)
    if is_dcm:
        return

    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{content_type}'. Please upload a PNG, JPG, or DICOM (.dcm) file.",
        )

    # Strictly verify standard image data can be opened and decoded
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            img.verify()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not a valid decodable image or DICOM study.",
        )


def _save_study_to_db(report: FullReport, filename: str, db: Session) -> StudyRecord:
    study_id = f"MVL-{uuid.uuid4().hex[:8].upper()}"
    report.id = study_id
    now = datetime.now(timezone.utc)
    report.created_at = now.isoformat()

    record = StudyRecord(
        id=study_id,
        created_at=now,
        filename=filename,
        modality=report.modality or "DX",
        view_position=report.view_position or "PA",
        patient_age=report.patient_age,
        patient_gender=report.patient_gender,
        severity=report.severity.value if hasattr(report.severity, "value") else str(report.severity),
        findings=report.findings,
        impression=report.impression,
        recommendations=report.recommendations,
        brief=report.brief,
        language=report.language,
        confidence_scores_json=json.dumps(report.confidence_scores.model_dump()),
        lung_zones_json=json.dumps(report.lung_zones.model_dump()),
        abnormalities_json=json.dumps(report.abnormalities),
        differentials_json=json.dumps([d.model_dump() for d in report.differentials]),
        icd10_codes_json=json.dumps([c.model_dump() for c in report.icd10_codes]),
        detected_pathologies_json=json.dumps([p.model_dump() for p in report.detected_pathologies]),
        safety_alerts_json=json.dumps(report.safety_alerts or []),
        grounded_guidance_json=json.dumps(report.grounded_guidance.model_dump()) if report.grounded_guidance else None,
        heatmap_data_url=report.heatmap_data_url,
        image_preview_url=report.image_preview_url,
        status="draft",
        doctor_notes="",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ── Analyze (Synchronous Pipeline) ───────────────────────────────────────────
@app.post("/analyze", response_model=FullReport)
@limiter.limit("20/minute")
async def analyze(
    request: Request,
    image: UploadFile = File(...),
    language: str = Form("English"),
    mode: str = Form("fast"),
    patient_age: Optional[str] = Form(None),
    patient_gender: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    filename = image.filename or "radiograph.png"
    content_type = image.content_type or ""
    image_bytes = await image.read()
    _validate_image(content_type, image_bytes, filename=filename)

    loop = asyncio.get_running_loop()
    report: FullReport = await loop.run_in_executor(
        _executor, run_pipeline, image_bytes, content_type, language, mode, filename
    )

    if patient_age:
        report.patient_age = patient_age
    if patient_gender:
        report.patient_gender = patient_gender

    _save_study_to_db(report, filename, db)
    return JSONResponse(content=report.model_dump(mode="json"))


# ── Analyze (Streaming Pipeline via SSE) ──────────────────────────────────────
@app.post("/analyze-stream")
@limiter.limit("20/minute")
async def analyze_stream(
    request: Request,
    image: UploadFile = File(...),
    language: str = Form("English"),
    mode: str = Form("fast"),
    patient_age: Optional[str] = Form(None),
    patient_gender: Optional[str] = Form(None),
):
    filename = image.filename or "radiograph.png"
    content_type = image.content_type or ""
    image_bytes = await image.read()
    _validate_image(content_type, image_bytes, filename=filename)

    async def generate():
        loop = asyncio.get_running_loop()
        queue: asyncio.Queue = asyncio.Queue()

        def sync_stream():
            try:
                for event in run_pipeline_streaming(image_bytes, content_type, language, mode, filename):
                    loop.call_soon_threadsafe(queue.put_nowait, event)
            except Exception as e:
                loop.call_soon_threadsafe(queue.put_nowait, {"type": "error", "message": str(e)})
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)

        loop.run_in_executor(_executor, sync_stream)

        while True:
            item = await queue.get()
            if item is None:
                break
            if item.get("type") == "done" and "report" in item:
                # Save to database safely
                try:
                    db = SessionLocal()
                    try:
                        rep_obj = FullReport(**item["report"])
                        if patient_age:
                            rep_obj.patient_age = patient_age
                        if patient_gender:
                            rep_obj.patient_gender = patient_gender
                        _save_study_to_db(rep_obj, filename, db)
                        item["report"] = rep_obj.model_dump(mode="json")
                    finally:
                        db.close()
                except Exception as save_err:
                    print(f"[analyze_stream] Warning: Could not save study to DB ({save_err})")

            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Study Persistence Endpoints ───────────────────────────────────────────────
@app.get("/studies")
async def list_studies(limit: int = 50, db: Session = Depends(get_db)):
    """List recent studies stored in the database."""
    records = db.query(StudyRecord).order_by(StudyRecord.created_at.desc()).limit(limit).all()
    return JSONResponse(content=[r.to_dict() for r in records])


@app.get("/studies/{study_id}")
async def get_study(study_id: str, db: Session = Depends(get_db)):
    """Retrieve full study details by study ID."""
    record = db.query(StudyRecord).filter(StudyRecord.id == study_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Study not found.")
    return JSONResponse(content=record.to_dict())


@app.patch("/studies/{study_id}")
async def update_study(study_id: str, body: StudyUpdateRequest, db: Session = Depends(get_db)):
    """Update doctor notes or review status of a study."""
    record = db.query(StudyRecord).filter(StudyRecord.id == study_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Study not found.")

    if body.doctor_notes is not None:
        record.doctor_notes = body.doctor_notes
    if body.status is not None:
        record.status = body.status

    db.commit()
    db.refresh(record)
    return JSONResponse(content=record.to_dict())


@app.post("/studies/{study_id}/sign")
async def sign_study(study_id: str, body: StudySignRequest, db: Session = Depends(get_db)):
    """Digitally sign and approve a study as a licensed radiologist with 21 CFR Part 11 SHA-256 audit hash."""
    import hashlib
    record = db.query(StudyRecord).filter(StudyRecord.id == study_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Study not found.")

    now = datetime.now(timezone.utc)
    raw_payload = f"{study_id}:{record.findings}:{record.impression}:{body.doctor_name}:{body.doctor_license}:{now.isoformat()}"
    sig_hash = hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()

    record.status = "signed"
    record.signed_by = body.doctor_name
    record.doctor_license = body.doctor_license
    record.doctor_notes = body.doctor_notes or record.doctor_notes
    record.signed_at = now
    record.signature_hash = f"SHA256:{sig_hash[:16].upper()}"

    db.commit()
    db.refresh(record)
    return JSONResponse(content=record.to_dict())


@app.delete("/studies/{study_id}")
async def delete_study(study_id: str, db: Session = Depends(get_db)):
    """Delete a study record from the database."""
    record = db.query(StudyRecord).filter(StudyRecord.id == study_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Study not found.")
    db.delete(record)
    db.commit()
    return JSONResponse(content={"deleted": True, "id": study_id})


@app.get("/studies/{study_id}/pdf")
async def get_study_pdf(study_id: str, db: Session = Depends(get_db)):
    """Download diagnostic PDF report directly by study ID."""
    record = db.query(StudyRecord).filter(StudyRecord.id == study_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Study not found.")

    pdf_bytes = build_pdf(record.to_dict())
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=MedVLM_{study_id}.pdf"},
    )


# ── Dynamic Grad-CAM Saliency Generation ──────────────────────────────────────
@app.post("/gradcam", response_model=GradcamResponse)
@limiter.limit("30/minute")
async def gradcam(
    request: Request,
    image: UploadFile = File(...),
    target_pathology: str = Form("Cardiomegaly"),
):
    filename = image.filename or "radiograph.png"
    content_type = image.content_type or ""
    image_bytes = await image.read()
    _validate_image(content_type, image_bytes, filename=filename)

    loop = asyncio.get_running_loop()
    heatmap_url = await loop.run_in_executor(
        _executor, generate_gradcam, image_bytes, target_pathology, filename
    )
    return JSONResponse(content={
        "target_pathology": target_pathology,
        "heatmap_data_url": heatmap_url,
    })


# ── On-demand Google Search Grounding ─────────────────────────────────────────
@app.post("/grounded-insights", response_model=GroundedInsightsResponse)
@limiter.limit("15/minute")
async def grounded_insights(request: Request, body: GroundedInsightsRequest):
    loop = asyncio.get_running_loop()
    guidance = await loop.run_in_executor(
        _executor, run_grounding_agent, body.conditions, body.severity
    )
    return JSONResponse(content={
        "insights": guidance.summary,
        "sources": [s.model_dump() for s in guidance.sources],
    })


# ── Chat Copilot ──────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat(request: Request, body: ChatRequest):
    loop = asyncio.get_running_loop()
    reply = await loop.run_in_executor(
        _executor, run_chat_agent, body.report_context,
        [m.model_dump() for m in body.conversation_history], body.user_message, body.language or "English",
    )
    return JSONResponse(content={"reply": reply})


# ── Referral Letter Generator ────────────────────────────────────────────────
@app.post("/referral-letter", response_model=ReferralLetterResponse)
@limiter.limit("10/minute")
async def referral_letter(request: Request, body: ReferralLetterRequest):
    loop = asyncio.get_running_loop()
    letter = await loop.run_in_executor(
        _executor,
        run_referral_agent,
        body.report_context,
        body.patient_name,
        body.referring_facility,
        body.target_specialty,
        body.priority,
    )
    return JSONResponse(content={"letter": letter})


# ── PDF Generation from Request Body ──────────────────────────────────────────
@app.post("/generate-pdf")
async def generate_pdf_post(report: FullReport):
    pdf_bytes = build_pdf(report.model_dump(mode="json"))
    report_id = report.id or "Report"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=MedVLM_{report_id}.pdf"},
    )


# ── Translate Existing Report on-the-fly ─────────────────────────────────────
@app.post("/translate-report", response_model=FullReport)
@limiter.limit("30/minute")
async def translate_report_endpoint(request: Request, body: TranslateReportRequest):
    loop = asyncio.get_running_loop()
    translated = await loop.run_in_executor(
        _executor, translate_report, body.report, body.target_language
    )
    return JSONResponse(content=translated.model_dump(mode="json"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
