"""
Reasoning Agent — Stage 2
Takes Stage 1's raw findings and produces a differential diagnosis with
explicit reasoning, severity rating, named abnormalities, and ICD-10 codes.
No image is passed here — this agent reasons over text only, like a second opinion.
"""

import json
from google.genai import types
from app_config import client, MODEL_NAME
from schemas import VisionOutput, ReasoningOutput

CANDIDATE_MODELS = [
    MODEL_NAME,
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
]

_PROMPT_TEMPLATE = """You are a radiologist forming a differential diagnosis from these
raw imaging observations (recorded by a colleague, no diagnosis yet):

{findings_json}

Based ONLY on these observations:
1. List differentials: condition, likelihood ("high"/"moderate"/"low"), and reasoning
   (why these specific findings support or rule out each condition).
2. Assign an overall severity: exactly one of normal, mild, moderate, severe.
3. List 3-6 abnormalities as short strings (empty list if normal).
4. Suggest 2-4 relevant ICD-10 codes as {{"code": "...", "description": "..."}} objects
   (empty list if normal).

Ground every claim in the observations given — do not invent findings that weren't reported."""


def run_reasoning_agent(vision_output: VisionOutput) -> ReasoningOutput:
    """Stage 2: differential diagnosis + severity + ICD-10 with multi-model failover."""
    findings_json = vision_output.model_dump_json(indent=2)
    prompt = _PROMPT_TEMPLATE.format(findings_json=findings_json)

    models_to_try = []
    for m in CANDIDATE_MODELS:
        if m and m not in models_to_try:
            models_to_try.append(m)

    if client:
        for model in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=[prompt],
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        response_mime_type="application/json",
                        response_schema=ReasoningOutput,
                    ),
                )
                if response.parsed:
                    return response.parsed
            except Exception as e:
                print(f"[reasoning_agent] Model {model} failed ({e}), trying next candidate...")
                continue

    # Fallback reasoning output
    return ReasoningOutput(
        differentials=[],
    )
