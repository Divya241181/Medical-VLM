"""
MedVLM — Configuration & Gemini Client
Uses google-genai SDK with resilient key validation and fallback mechanisms.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory or current directory
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    load_dotenv(env_path, override=True)
else:
    load_dotenv(override=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()

# Initialize Google GenAI client safely without crashing startup if key is missing
client = None
if GEMINI_API_KEY:
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"[app_config] Warning: Failed to initialize Google GenAI Client: {e}")
        client = None
else:
    print("[app_config] Warning: GEMINI_API_KEY is not set. Generative reporting will operate in fallback mode.")


ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/dicom",
    "application/octet-stream",
    "image/dicom",
}

MAX_FILE_BYTES = 25 * 1024 * 1024  # 25 MB (accommodates high-res DICOM studies)
MIN_FILE_BYTES = 64
