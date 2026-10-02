"""
Referral Agent — on-demand generative feature
Drafts a formal specialist referral letter from an existing report.
This is a genuine generative artifact (not a template fill), which is why it
belongs in a GenAI-framed project rather than a plain classifier demo.
"""

import json
from datetime import datetime
from google.genai import types
from app_config import client, MODEL_NAME

CANDIDATE_MODELS = [
    MODEL_NAME,
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
]

_PROMPT_TEMPLATE = """Draft a formal, professional medical specialist referral letter based on this
chest X-ray report. Use standard clinical referral letter format.

Current Date: {current_date}
Patient name: {patient_name}
Referring facility: {referring_facility}
Target Specialty: {target_specialty}
Clinical Priority: {priority}

Report data:
{report_json}

Formatting Instructions:
- State the date clearly as {current_date}.
- Use clean, professional typography. Do NOT include ASCII art dividing lines (e.g. no '=====' or '-----' lines).
- Keep sections organized and concise so the entire letter fits seamlessly on a single page letterhead.
- Write only the letter text ready to be placed on clinic letterhead. Do not add conversational commentary."""


def _build_fallback_referral_letter(
    report_context: dict,
    patient_name: str,
    referring_facility: str,
    target_specialty: str,
    priority: str,
) -> str:
    """Deterministic, clinically structured fallback referral letter when LLM API is unreachable."""
    current_date = datetime.now().strftime("%B %d, %Y")
    severity = str(report_context.get("severity", "moderate")).upper()
    findings = report_context.get("findings", "Radiographic evaluation completed.")
    impression = report_context.get("impression", "See clinical findings.")
    recommendations = report_context.get("recommendations", "Clinical correlation and follow-up.")
    differentials = report_context.get("differentials", [])
    primary_diff = differentials[0].get("condition", "Underlying cardiopulmonary condition") if differentials else "Cardiopulmonary pathology"

    return f"""CLINICAL SPECIALIST REFERRAL LETTER

Referring Facility: {referring_facility}
Target Specialty  : {target_specialty}
Clinical Priority : {priority.upper()}
Date              : {current_date}

To: Attending Specialist, {target_specialty}
Re: Consultation and Diagnostic Evaluation for {patient_name}

DEAR COLLEAGUE,

I am referring {patient_name} for formal specialist evaluation and clinical management under your care. 

1. CLINICAL BACKGROUND & IMAGING FINDINGS:
A thoracic radiograph examination was conducted at our facility. The study demonstrates findings classified as {severity} severity:
- Findings: {findings}
- Radiographic Impression: {impression}
- Primary Diagnostic Consideration: {primary_diff}

2. REASON FOR REFERRAL:
Given the radiographic presentation and an urgency level of {priority.upper()}, specialist evaluation within {target_specialty} is requested to correlate imaging observations with physical symptoms, evaluate cardiopulmonary reserve, and initiate targeted intervention.

3. RECOMMENDED NEXT STEPS & REQUESTED ACTION:
- {recommendations}
- Comprehensive clinical review and specialized diagnostic workup as clinically indicated.

Thank you for your dedicated care in managing this patient. Please contact our radiology department should you require access to full DICOM series or comparative imaging.

Sincerely,

Attending Radiologist / Referring Physician
{referring_facility}"""


def run_referral_agent(
    report_context: dict,
    patient_name: str = "Patient",
    referring_facility: str = "MedVLM Clinic",
    target_specialty: str = "Pulmonology & Respiratory Medicine",
    priority: str = "urgent",
) -> str:
    """Generates formal specialist referral letter with resilient model failover and offline fallback."""
    current_date = datetime.now().strftime("%B %d, %Y")
    prompt = _PROMPT_TEMPLATE.format(
        current_date=current_date,
        patient_name=patient_name or "Patient",
        referring_facility=referring_facility or "MedVLM Clinic",
        target_specialty=target_specialty or "Specialist Care",
        priority=priority or "Routine",
        report_json=json.dumps(report_context, indent=2),
    )

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
                    config=types.GenerateContentConfig(temperature=0.3),
                )
                text = (response.text or "").strip()
                if text:
                    return text
            except Exception as e:
                print(f"[referral_agent] Model {model} failed ({e}), trying next candidate...")
                continue

    # Fallback letter
    return _build_fallback_referral_letter(
        report_context, patient_name, referring_facility, target_specialty, priority
    )
