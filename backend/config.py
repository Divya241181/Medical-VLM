"""
MedVLM — Configuration & Gemini Client
Re-exports from app_config to maintain backward compatibility.
"""

from app_config import (
    GEMINI_API_KEY,
    MODEL_NAME,
    client,
    ALLOWED_IMAGE_TYPES,
    MAX_FILE_BYTES,
    MIN_FILE_BYTES,
)
