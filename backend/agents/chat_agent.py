"""
Chat Agent — Stage 5 (on-demand)
Conversational Q&A strictly scoped to an already-generated report.
Resilient multi-turn handling with automatic history sanitization and
generate_content fallback if chat session creation fails.
"""

import json
from google.genai import types
from app_config import client, MODEL_NAME

SYSTEM_PROMPT = """You are a compassionate, highly skilled medical AI assistant helping a patient and clinician understand
their chest X-ray AI report.
Guidelines:
1. You may ONLY answer questions grounded in the specific radiograph report provided.
2. Structure your answers cleanly using Markdown: use bolding (**key terms**), clear paragraphs, and bullet points (- observation).
3. Explain medical concepts in clear, empathetic, and easily understandable terms without losing clinical accuracy.
4. Do not provide a definitive medical diagnosis or prescribe medications; always advise consulting a licensed physician for clinical decisions.
5. If the user asks something completely unrelated to this chest X-ray, politely redirect them back to the study findings."""


def _sanitize_history(raw_history: list[dict]) -> list[types.Content]:
    """Sanitize conversation history so roles strictly alternate user -> model."""
    valid_items = []
    for m in raw_history:
        text = (m.get("text") or "").strip()
        role = m.get("role")
        if text and role in ("user", "model"):
            valid_items.append({"role": role, "text": text})

    if not valid_items:
        return []

    # Ensure starts with user
    while valid_items and valid_items[0]["role"] != "user":
        valid_items.pop(0)

    # Alternate turns: merge consecutive turns by same role
    alternated = []
    for item in valid_items:
        if alternated and alternated[-1]["role"] == item["role"]:
            alternated[-1]["text"] += f"\n{item['text']}"
        else:
            alternated.append(item)

    return [
        types.Content(role=item["role"], parts=[types.Part.from_text(text=item["text"])])
        for item in alternated
    ]


def run_chat_agent(
    report_context: dict,
    conversation_history: list[dict],
    user_message: str,
    language: str = "English",
) -> str:
    """Single chatbot turn grounded strictly in the existing report."""
    lang_lower = (language or "English").strip().lower()
    if lang_lower == "gujarati":
        lang_note = "\n\nCRITICAL LANGUAGE INSTRUCTION: You MUST respond completely in Gujarati (ગુજરાતી) script. Ensure fluent, empathetic, and grammatically natural Gujarati."
    elif lang_lower == "hindi":
        lang_note = "\n\nCRITICAL LANGUAGE INSTRUCTION: You MUST respond completely in Hindi (हिंदी) Devanagari script. Ensure fluent, empathetic, and grammatically natural Hindi."
    elif lang_lower == "marathi":
        lang_note = "\n\nCRITICAL LANGUAGE INSTRUCTION: You MUST respond completely in Marathi (मराठी) Devanagari script. Ensure fluent, empathetic, and grammatically natural Marathi."
    elif lang_lower != "english":
        lang_note = f"\n\nCRITICAL LANGUAGE INSTRUCTION: You MUST respond completely in {language}. Maintain clinical clarity and empathy."
    else:
        lang_note = "\n\nCRITICAL LANGUAGE INSTRUCTION: Respond in clear, professional English."

    system_msg = (
        f"{SYSTEM_PROMPT}{lang_note}\n\n"
        f"The patient's radiograph study context is:\n{json.dumps(report_context, indent=2, default=str)}"
    )

    clean_user_message = (user_message or "").strip()
    if not clean_user_message:
        return "Please ask a question about your chest radiograph findings."

    CANDIDATE_MODELS = [
        MODEL_NAME,
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
        "gemini-3.8-flash",
        "gemini-3.6-flash",
    ]
    models_to_try = []
    for m in CANDIDATE_MODELS:
        if m and m not in models_to_try:
            models_to_try.append(m)

    # Method 1: Interactive Chat session with model failover
    if client:
        sanitized_history = _sanitize_history(conversation_history)
        for model in models_to_try:
            try:
                chat = client.chats.create(
                    model=model,
                    history=sanitized_history,
                    config=types.GenerateContentConfig(temperature=0.3, system_instruction=system_msg),
                )
                response = chat.send_message(clean_user_message)
                reply = (response.text or "").strip()
                if reply:
                    return reply
            except Exception as e:
                print(f"[chat_agent] Model {model} chat error ({e}), trying next candidate...")

    # Method 2: Direct generate_content fallback with compiled transcript
    if client:
        try:
            dialogue = []
            for m in conversation_history:
                t = (m.get("text") or "").strip()
                r = m.get("role")
                if t and r:
                    speaker = "Patient/Clinician" if r == "user" else "Assistant"
                    dialogue.append(f"{speaker}: {t}")
            dialogue.append(f"Patient/Clinician: {clean_user_message}")

            full_prompt = (
                f"{system_msg}\n\n"
                f"--- PREVIOUS CONVERSATION ---\n"
                f"{chr(10).join(dialogue)}\n\n"
                f"Assistant:"
            )

            for model in models_to_try:
                try:
                    resp = client.models.generate_content(
                        model=model,
                        contents=[full_prompt],
                        config=types.GenerateContentConfig(temperature=0.3),
                    )
                    reply = (resp.text or "").strip()
                    if reply:
                        return reply
                except Exception as e2:
                    continue
        except Exception as e_transcript:
            print(f"[chat_agent] Transcript fallback error: {e_transcript}")

    # Method 3: Safe medical fallback response localized
    findings = report_context.get("findings", "Normal study.")
    severity = report_context.get("severity", "normal")
    return (
        f"Regarding your inquiry about '{clean_user_message}':\n\n"
        f"Based on your chest radiograph report, the overall severity is classified as **{severity.upper()}**. "
        f"Summary of findings: {findings}\n\n"
        f"Please discuss these specific observations with your physician for clinical correlation and diagnosis."
    )
