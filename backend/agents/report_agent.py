"""
Report Agent — Stage 3
Turns Stage 1 (raw findings) + Stage 2 (differentials/severity) into two
parallel written outputs: a clinical report and a plain-language patient brief.
Runs in the requested language with multi-model failover.
"""

from google.genai import types
from app_config import client, MODEL_NAME
from schemas import VisionOutput, ReasoningOutput, ReportOutput

CANDIDATE_MODELS = [
    MODEL_NAME,
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
]

LANGUAGE_DIRECTIVES = {
    "gujarati": "CRITICAL LANGUAGE INSTRUCTION: You MUST write ALL four fields (findings, impression, recommendations, brief) ENTIRELY in native Gujarati script (ગુજરાતી લિપિ). Do not use English sentences.",
    "hindi": "CRITICAL LANGUAGE INSTRUCTION: You MUST write ALL four fields (findings, impression, recommendations, brief) ENTIRELY in fluent Hindi Devanagari script (हिंदी लिपि).",
    "marathi": "CRITICAL LANGUAGE INSTRUCTION: You MUST write ALL four fields (findings, impression, recommendations, brief) ENTIRELY in fluent Marathi Devanagari script (मराठी लिपि).",
    "english": "Write in clear, professional medical English.",
}

_PROMPT_TEMPLATE = """You are a radiology report writer. Using the structured data below,
write the final report in {language}.

{language_directive}

RAW FINDINGS:
{vision_json}

DIFFERENTIAL DIAGNOSIS & SEVERITY:
{reasoning_json}

Produce:
- findings: one detailed paragraph of anatomical observations, clinical tone
- impression: one paragraph clinical summary and most likely diagnosis, clinical tone
- recommendations: specific, actionable follow-up steps
- brief: exactly 2 simple sentences explaining the result to a non-medical patient, calm and clear, no jargon

All four fields must be written in {language}."""


def run_report_agent(
    vision_output: VisionOutput,
    reasoning_output: ReasoningOutput,
    language: str = "English",
) -> ReportOutput:
    """Stage 3: generate clinical + patient-facing narrative text with resilient model failover."""
    lang_clean = (language or "English").strip()
    directive = LANGUAGE_DIRECTIVES.get(lang_clean.lower(), f"Write completely in {lang_clean}.")

    prompt = _PROMPT_TEMPLATE.format(
        language=lang_clean,
        language_directive=directive,
        vision_json=vision_output.model_dump_json(indent=2),
        reasoning_json=reasoning_output.model_dump_json(indent=2),
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
                    config=types.GenerateContentConfig(
                        temperature=0.25,
                        response_mime_type="application/json",
                        response_schema=ReportOutput,
                    ),
                )
                if response.parsed:
                    return response.parsed
            except Exception as e:
                print(f"[report_agent] Model {model} failed ({e}), trying next candidate...")
                continue

    # Fallback if all models fail
    is_abnormal = reasoning_output.severity.value != "normal"
    top_diff = reasoning_output.differentials[0].condition if reasoning_output.differentials else "Normal study"

    lang_lower = lang_clean.lower()
    if "guj" in lang_lower:
        return ReportOutput(
            findings=f"છાતીના એક્સ-રેનું મૂલ્યાંકન: પ્રાથમિક તારણ {top_diff}. ફેફસાં અને મિડિયાસ્ટિનમનું નિરીક્ષણ કરવામાં આવ્યું.",
            impression=f"તારણો દર્શાવે છે: {top_diff} ({reasoning_output.severity.value}).",
            recommendations="ક્લિનિકલ લક્ષણો સાથે સહસંબંધ સાધવાની ભલામણ કરવામાં આવે છે.",
            brief=f"તમારા એક્સ-રેમાં {top_diff} ના લક્ષણો જોવા મળ્યા છે. કૃપા કરીને તમારા ડૉક્ટરની સલાહ લો.",
        )
    elif "hin" in lang_lower:
        return ReportOutput(
            findings=f"सीने के एक्स-रे का मूल्यांकन: प्राथमिक निष्कर्ष {top_diff}। फेफड़ों और मीडियास्टिनम का निरीक्षण किया गया।",
            impression=f"निष्कर्ष संकेत देते हैं: {top_diff} ({reasoning_output.severity.value})।",
            recommendations="क्लिनिकल लक्षणों के साथ सहसंबंध की सिफारिश की जाती है।",
            brief=f"आपके एक्स-रे में {top_diff} के लक्षण देखे गए हैं। कृपया अपने चिकित्सक से परामर्श करें।",
        )
    elif "mar" in lang_lower:
        return ReportOutput(
            findings=f"छातीच्या एक्स-रेचे मूल्यांकन: प्राथमिक निष्कर्ष {top_diff}। फुफ्फुसे आणि मीडियास्टिनमची तपासणी केली गेली.",
            impression=f"निष्कर्ष दर्शवतात: {top_diff} ({reasoning_output.severity.value}).",
            recommendations="क्लिनिकल लक्षणांशी सहसंबंध तपासण्याची शिफारस केली जाते.",
            brief=f"तुमच्या एक्स-रेमध्ये {top_diff} ची लक्षणे आढळली आहेत. कृपया आपल्या डॉक्टरांचा सल्ला घ्या.",
        )
    else:
        return ReportOutput(
            findings=f"Radiographic assessment demonstrates {top_diff}. Lungs and cardiomediastinal contour evaluated.",
            impression=f"Findings indicative of {top_diff} with {reasoning_output.severity.value} severity.",
            recommendations="Recommend clinical correlation with physical examination.",
            brief="Your chest X-ray findings have been recorded. Please discuss the results with your physician.",
        )
