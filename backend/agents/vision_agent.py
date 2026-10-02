"""
Vision Agent — Stage 1
Reads the chest X-ray and produces raw anatomical observations.
Deliberately does NOT diagnose — that's the reasoning agent's job.
Keeping stages separate is what makes this a pipeline, not a single prompt.
"""

from google.genai import types
from app_config import client, MODEL_NAME
from schemas import VisionOutput

CANDIDATE_MODELS = [
    MODEL_NAME,
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
]

_PROMPT = """You are a radiology imaging specialist. Examine this chest X-ray and report ONLY
raw anatomical observations — do not diagnose or name conditions yet.

For each of the 6 anatomical lung zones, state whether it is "clear" or "affected".
IMPORTANT: Use anatomical side, not image side. The patient's right is on the left side of the image.
- upper_right (Anatomical RUL, image left)
- middle_right (Anatomical RML, image left)
- lower_right (Anatomical RLL, image left)
- upper_left (Anatomical LUL, image right)
- middle_left (Anatomical LML, image right)
- lower_left (Anatomical LLL, image right)

Also estimate confidence scores (0.0-1.0) for these visual patterns being present:
opacity, cardiomegaly, effusion, pneumothorax, consolidation.

List raw_findings as an array of {region, observation} pairs describing exactly what
you see (e.g. region: "right lower lobe", observation: "increased opacity with blurred
costophrenic angle"). Be descriptive, not diagnostic."""


def run_vision_agent(image_bytes: bytes, mime_type: str) -> VisionOutput:
    """Stage 1: extract raw findings + lung zone status + confidence scores with multi-model failover."""
    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    models_to_try = []
    for m in CANDIDATE_MODELS:
        if m and m not in models_to_try:
            models_to_try.append(m)

    if client:
        for model in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=[_PROMPT, image_part],
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        response_mime_type="application/json",
                        response_schema=VisionOutput,
                    ),
                )
                if response.parsed:
                    return response.parsed
            except Exception as e:
                print(f"[vision_agent] Model {model} failed ({e}), trying next candidate...")
                continue

    # Fallback default vision output
    return VisionOutput(
        raw_findings=[],
    )
