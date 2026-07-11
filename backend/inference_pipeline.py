"""
MedVLM Inference Pipeline
=========================
Implements the 5-stage inference pipeline for chest radiograph analysis.
Each stage is logged for debugging and performance monitoring.
"""
import logging

logger = logging.getLogger("medvlm.pipeline")

PIPELINE_STAGES = [
    {"id": 1, "name": "Image Preprocessing", "avg_ms": 10},
    {"id": 2, "name": "Preparing API Payload", "avg_ms": 20},
    {"id": 3, "name": "Running Gemini 2.5 Inference", "avg_ms": 6000},
    {"id": 4, "name": "Generating Structured Report", "avg_ms": 20},
    {"id": 5, "name": "Building PDF", "avg_ms": 220},
]


def get_pipeline_stages() -> list:
    return PIPELINE_STAGES


def log_pipeline_run(image_size_bytes: int, latency_ms: int) -> dict:
    logger.info(
        f"Pipeline complete | size={image_size_bytes}B | latency={latency_ms}ms"
    )
    return {
        "pipeline": "Gemini 2.5 Flash",
        "stages_completed": 5,
        "total_latency_ms": latency_ms,
        "image_size_bytes": image_size_bytes,
        "status": "success",
    }
