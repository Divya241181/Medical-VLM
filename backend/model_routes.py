"""
MedVLM Model API Routes
=======================
Exposes model metadata, health, registry, and pipeline info endpoints.
These routes are additive — they do not modify any existing API routes.
"""
from fastapi import APIRouter
from medvlm_engine import get_model_info, get_model_version
from model_registry import get_registry_status, get_model_health
from inference_pipeline import get_pipeline_stages

router = APIRouter(prefix="/model", tags=["MedVLM Engine"])


@router.get("/info")
def model_info():
    """Return full model metadata including architecture, training data, and evaluation metrics."""
    return get_model_info()


@router.get("/health")
def model_health():
    """Return current model health status, GPU utilization, and request counters."""
    return get_model_health()


@router.get("/registry")
def model_registry():
    """Return model registry with production and staging deployment info."""
    return get_registry_status()


@router.get("/pipeline")
def pipeline_stages():
    """Return the 5-stage inference pipeline definition with average latencies."""
    return {"stages": get_pipeline_stages(), "model": get_model_version()}


@router.get("/version")
def model_version():
    """Return current model version and deployment status."""
    return {
        "model": "MedVLM-7B",
        "version": "2.1.3",
        "api_version": "v2",
        "status": "production",
    }
