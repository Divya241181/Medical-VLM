"""
MedVLM Radiology Backend — FastAPI Application
"""

import io
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, UploadFile, File, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from model import analyze_xray, chat_about_report, stream_analyze_xray, get_grounded_insights
from pdf_builder import build_pdf
from schemas import ReportResponse, ChatRequest, ChatResponse

_executor = ThreadPoolExecutor(max_workers=4)

# ── Rate Limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="MedVLM Radiology API",
    description="Gemini-powered chest radiograph analysis",
    version="2.2.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# (Removed redundant and broken custom CORS middlewares)

# ── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.2.0"}


# ── Analyze X-Ray ─────────────────────────────────────────────────────────────
ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


@app.post("/analyze", response_model=ReportResponse)
@limiter.limit("15/minute")
async def analyze(
    request: Request,
    image: UploadFile = File(...),
    language: str = "English",
):
    """Accept a chest X-ray image and return AI-generated radiology analysis."""
    # ── Validate file type ──
    content_type = image.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{content_type}'. Please upload a PNG or JPG image.",
        )

    image_bytes = await image.read()

    # ── Validate file size ──
    if len(image_bytes) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File is too large. Maximum allowed size is 10 MB.",
        )

    if len(image_bytes) < 1024:
        raise HTTPException(
            status_code=400,
            detail="File appears to be empty or corrupt. Please upload a valid X-ray image.",
        )

    result = analyze_xray(image_bytes, language=language)
    return JSONResponse(
        content=result,
    )


# ── Chatbot ───────────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat(request: Request, body: ChatRequest):
    """Conversational Q&A grounded strictly in an existing radiology report."""
    reply = chat_about_report(
        report_context=body.report_context,
        conversation_history=[m.model_dump() for m in body.conversation_history],
        user_message=body.user_message,
        language=body.language or "English",
    )
    return JSONResponse(
        content={"reply": reply},
    )


# ── Generate PDF ──────────────────────────────────────────────────────────────
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


# ── Streaming Analysis ────────────────────────────────────────────────────────
@app.post("/analyze-stream")
@limiter.limit("15/minute")
async def analyze_stream(
    request: Request,
    image: UploadFile = File(...),
    language: str = "English",
):
    """SSE endpoint: streams Gemini output in real-time, sends complete report JSON when done."""
    content_type = image.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type '{content_type}'. Please upload a PNG or JPG image.")

    image_bytes = await image.read()
    if len(image_bytes) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File is too large. Maximum allowed size is 10 MB.")
    if len(image_bytes) < 1024:
        raise HTTPException(status_code=400, detail="File appears to be empty or corrupt.")

    async def generate():
        loop = asyncio.get_event_loop()
        queue: asyncio.Queue = asyncio.Queue()

        def sync_stream():
            try:
                for event in stream_analyze_xray(image_bytes, language):
                    loop.call_soon_threadsafe(queue.put_nowait, event)
            except Exception as e:
                loop.call_soon_threadsafe(queue.put_nowait, {"type": "error", "message": str(e)})
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel

        loop.run_in_executor(_executor, sync_stream)

        while True:
            item = await queue.get()
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Grounded Insights ─────────────────────────────────────────────────────────
from pydantic import BaseModel
class GroundedInsightsRequest(BaseModel):
    conditions: list[str]
    severity: str


@app.post("/grounded-insights")
@limiter.limit("10/minute")
async def grounded_insights(request: Request, body: GroundedInsightsRequest):
    """Google Search-grounded clinical guidelines for detected conditions."""
    insights = get_grounded_insights(body.conditions, body.severity)
    return JSONResponse(
        content={"insights": insights},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
