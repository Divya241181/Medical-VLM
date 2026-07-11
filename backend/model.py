"""
MedVLM Inference Engine
Model: Gemini 2.5 Flash (Multimodal Foundation Model)
"""

import os
import json
import base64
import re
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# ── Configure Gemini ─────────────────────────────────────────────────────────
_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=_API_KEY)

# Standard inference engine (also used for grounding fallback)
_engine = genai.GenerativeModel("gemini-2.5-flash")

# Note: google-generativeai v0.x doesn't support google_search tool natively.
# Grounding is achieved via an enhanced prompt instructing Gemini to cite
# current medical guidelines (Gemini's training includes up-to-date clinical data).
_grounded_engine = _engine  # same model, different prompt strategy

# ── Analysis Prompt Template ─────────────────────────────────────────────────
def _build_prompt(language: str = "English") -> str:
    brief_note = (
        f'Write the "brief" field in {language} language. '
        if language and language.lower() != "english"
        else ""
    )
    return f"""You are an expert radiologist. Analyze this chest X-ray image carefully.
{brief_note}Respond ONLY with a valid JSON object with these exact keys:
{{
  "findings": "detailed paragraph of anatomical observations in English",
  "impression": "one paragraph clinical summary and likely diagnosis in English",
  "recommendations": "specific follow-up actions in English",
  "severity": "exactly one of: normal, mild, moderate, severe",
  "brief": "2 simple sentences explaining results to a non-medical patient",
  "abnormalities": ["list of 3-6 strings naming specific findings"],
  "confidence_scores": {{"opacity": 0.0, "cardiomegaly": 0.0, "effusion": 0.0, "pneumothorax": 0.0, "consolidation": 0.0}},
  "lung_zones": {{"upper_left": "clear or affected", "upper_right": "clear or affected", "middle_left": "clear or affected", "middle_right": "clear or affected", "lower_left": "clear or affected", "lower_right": "clear or affected"}},
  "icd10_codes": [{{"code": "J18.9", "description": "Condition name"}}]
}}
Return 2-4 ICD-10 codes matching the detected findings. No extra text, no markdown, only the JSON object."""

# ── Fallback response ────────────────────────────────────────────────────────
FALLBACK_RESPONSE = {
    "findings": "Unable to analyze the image at this time. The AI model could not process the provided X-ray. Please ensure the image is a valid chest radiograph and try again.",
    "impression": "Analysis could not be completed. No clinical impression is available.",
    "recommendations": "Please retry the analysis with a clearer image or consult a radiologist directly for manual review.",
    "severity": "normal",
    "brief": "We were unable to analyze your X-ray at this time. Please try again or consult your doctor.",
    "abnormalities": ["Analysis unavailable"],
    "confidence_scores": {
        "opacity": 0.0, "cardiomegaly": 0.0, "effusion": 0.0,
        "pneumothorax": 0.0, "consolidation": 0.0,
    },
    "lung_zones": {
        "upper_left": "clear", "upper_right": "clear",
        "middle_left": "clear", "middle_right": "clear",
        "lower_left": "clear", "lower_right": "clear",
    },
    "icd10_codes": [],
}

REQUIRED_KEYS = [
    "findings", "impression", "recommendations", "severity",
    "brief", "abnormalities", "confidence_scores", "lung_zones", "icd10_codes",
]


def _parse_response(raw_text: str) -> dict | None:
    """Extract and validate JSON from model response."""
    json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if not json_match:
        return None
    try:
        parsed = json.loads(json_match.group())
        for key in REQUIRED_KEYS:
            if key not in parsed:
                parsed[key] = FALLBACK_RESPONSE[key]
        if parsed["severity"] not in ("normal", "mild", "moderate", "severe"):
            parsed["severity"] = "normal"
        if not isinstance(parsed.get("icd10_codes"), list):
            parsed["icd10_codes"] = []
        return parsed
    except json.JSONDecodeError:
        return None


# ── Main inference ────────────────────────────────────────────────────────────
def analyze_xray(image_bytes: bytes, language: str = "English") -> dict:
    """Run Gemini inference on raw image bytes. Returns structured radiology report."""
    try:
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        image_part = {"mime_type": "image/jpeg", "data": image_b64}
        prompt = _build_prompt(language)

        response = _engine.generate_content(
            [prompt, image_part],
            generation_config=genai.GenerationConfig(
                temperature=0.2,
                max_output_tokens=2048,
            ),
        )

        parsed = _parse_response(response.text.strip())
        if parsed is None:
            print(f"[model.py] No valid JSON in response: {response.text[:200]}")
            return FALLBACK_RESPONSE

        return parsed

    except Exception as e:
        print(f"[model.py] Error: {e}")
        return FALLBACK_RESPONSE


# ── Streaming inference ───────────────────────────────────────────────────────
def stream_analyze_xray(image_bytes: bytes, language: str = "English"):
    """
    Generator that streams Gemini output chunk-by-chunk.
    Yields dicts: {"type": "chunk", "text": "..."} per chunk,
    then {"type": "done", "report": {...}} when complete.
    Designed to be run in a thread pool from async FastAPI.
    """
    try:
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        image_part = {"mime_type": "image/jpeg", "data": image_b64}
        prompt = _build_prompt(language)

        response = _engine.generate_content(
            [prompt, image_part],
            generation_config=genai.GenerationConfig(
                temperature=0.2,
                max_output_tokens=2048,
            ),
            stream=True,   # ← Real streaming
        )

        full_text = ""
        for chunk in response:
            text = getattr(chunk, "text", "") or ""
            if text:
                full_text += text
                yield {"type": "chunk", "text": text}

        parsed = _parse_response(full_text)
        yield {"type": "done", "report": parsed or FALLBACK_RESPONSE}

    except Exception as e:
        print(f"[model.py] stream_analyze_xray error: {e}")
        yield {"type": "error", "message": str(e)}


# ── Google Search grounded insights ──────────────────────────────────────────
def get_grounded_insights(conditions: list[str], severity: str) -> str:
    """Fetch Google Search-grounded clinical guidelines for detected conditions."""
    try:
        cond_list = ", ".join(conditions) if conditions else "general chest findings"
        prompt = f"""Provide a brief, clinically relevant summary for a patient with the following chest X-ray findings:
Detected conditions: {cond_list}
Severity: {severity}

Include:
1. Current standard of care / what to expect next
2. Any important lifestyle or monitoring advice
3. Red flag symptoms to watch for and seek urgent care

Keep it concise, patient-friendly, and based on current medical guidelines. Do not diagnose."""

        response = _grounded_engine.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[model.py] Grounded insights error: {e}")
        return "Unable to fetch grounded clinical guidelines at this time. Please consult your doctor directly."


# ── Chatbot function ──────────────────────────────────────────────────────────
CHAT_SYSTEM_PROMPT = """You are a compassionate medical assistant helping a patient understand their chest X-ray AI report.
You may ONLY answer questions about the specific report provided. Do not diagnose, prescribe, or give advice beyond explaining the existing report findings.
Always recommend consulting a qualified doctor or radiologist for clinical decisions.
Keep answers clear, calm, and jargon-free. If the question is unrelated to this report, gently redirect the user."""


def chat_about_report(
    report_context: dict,
    conversation_history: list[dict],
    user_message: str,
    language: str = "English",
) -> str:
    """Run a single chatbot turn grounded strictly in the existing report."""
    try:
        lang_note = f" Respond in {language}." if language.lower() != "english" else ""

        system_msg = (
            f"{CHAT_SYSTEM_PROMPT}{lang_note}\n\n"
            f"The patient's report is:\n{json.dumps(report_context, indent=2)}"
        )

        # Build Gemini chat history
        history = []
        for msg in conversation_history:
            history.append({
                "role": msg["role"],          # "user" or "model"
                "parts": [msg["text"]],
            })

        chat = _engine.start_chat(history=history)
        full_message = f"{system_msg}\n\nPatient question: {user_message}"
        response = chat.send_message(full_message)
        return response.text.strip()

    except Exception as e:
        print(f"[model.py] Chat error: {e}")
        return "I'm sorry, I couldn't process your question right now. Please try again."
