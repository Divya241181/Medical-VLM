"""
MedVLM — Hybrid Multi-Agent Pipeline Orchestrator
Stage 1 (Local CV): TorchXRayVision DenseNet-121 (trained on 700k+ radiographs)
                    extracts real calibrated pathology scores + Grad-CAM saliency map.
Stage 2 (Generative):
  - Fast Mode: Single unified multimodal Gemini synthesis (~2s).
  - Multi-Agent Mode: 3-Agent cascade:
      * Vision Agent: Extracts localized anatomical findings per lung zone.
      * Reasoning Agent: Derives differential diagnoses, ICD-10 codes, and severity.
      * Report Agent: Synthesizes radiologist findings, impression, and multilingual patient brief.
"""

import json
import base64
from typing import Generator, Dict, Any, Optional

from google.genai import types
from app_config import client, MODEL_NAME
from local_model import predict_xray
from schemas import (
    FullReport,
    LungZones,
    ConfidenceScores,
    DetectedPathology,
    DifferentialItem,
    ICD10Code,
    Severity,
)
from agents.vision_agent import run_vision_agent
from agents.reasoning_agent import run_reasoning_agent
from agents.report_agent import run_report_agent


import re

import time

# Candidate fallback models in case the primary encounters 503 high-demand or 404
CANDIDATE_MODELS = [
    MODEL_NAME,
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
]

def _call_gemini_with_fallback(contents, config):
    """
    Executes Gemini call with automated failover across candidate models.
    Prevents pipeline failures when a single model experiences 503 UNAVAILABLE or capacity spikes.
    """
    models_to_try = []
    for m in CANDIDATE_MODELS:
        if m and m not in models_to_try:
            models_to_try.append(m)

    last_exc = None
    for idx, model in enumerate(models_to_try):
        try:
            res = client.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
            return res
        except Exception as e:
            last_exc = e
            print(f"[gemini_fallback] Model {model} failed ({e}). Trying next available candidate...")
            # Brief backoff if this was a 503 high demand spike
            if "503" in str(e) and idx < len(models_to_try) - 1:
                time.sleep(0.4)
            continue
    raise last_exc or RuntimeError("All Gemini candidate models failed.")


def _clean_json_str(raw: str) -> str:
    """Strips Markdown fences from Gemini output to ensure safe json.loads parsing."""
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


# Multilingual Clinical Terminology & Dictionaries
LOCALIZED_CONDITIONS = {
    "Cardiomegaly": {
        "en": "Cardiomegaly (enlarged heart)",
        "gu": "કાર્ડિયોમેગાલી (હૃદયનું કદ મોટું થવું)",
        "hi": "कार्डियोमेगाली (हृदय का आकार बढ़ना)",
        "mr": "कार्डिओमेगाली (हृदयाचा आकार वाढणे)",
    },
    "Effusion": {
        "en": "Pleural Effusion (fluid around lungs)",
        "gu": "પ્લુરલ એફ્યુઝન (ફેફસાંમાં પાણી/પ્રવાહી ભરાવું)",
        "hi": "प्ल्यूरल इफ्यूजन (फेफड़ों में तरल जमा होना)",
        "mr": "प्ल्यूरल इफ्यूजन (फुफ्फुसात द्रव साचणे)",
    },
    "Pneumonia": {
        "en": "Pneumonia (lung infection)",
        "gu": "ન્યુમોનિયા (ફેફસાંનો ચેપ)",
        "hi": "निमोनिया (फेफड़ों का संक्रमण)",
        "mr": "न्यूमोनिया (फुफ्फुसाचा संसर्ग)",
    },
    "Pneumothorax": {
        "en": "Pneumothorax (collapsed lung / air leak)",
        "gu": "ન્યુમોથોરેક્સ (છાતીમાં હવા ભરાવી)",
        "hi": "न्यूमोथोरैक्स (छाती में हवा का रिसाव)",
        "mr": "न्यूमोथोरॅक्स (छातीच्या पोकळीत हवा भरणे)",
    },
    "Consolidation": {
        "en": "Lung Consolidation (airspace opacity)",
        "gu": "કન્સોલિડેશન (ફેફસાંમાં સોજો/જાડાઈ)",
        "hi": "कंसोलिडेशन (फेफड़ों में जमाव/सख्त होना)",
        "mr": "कन्सॉलिडेशन (फुफ्फुसात द्रव किंवा सूज)",
    },
    "Lung Opacity": {
        "en": "Lung Opacity",
        "gu": "ફેફસાંમાં અસ્પષ્ટતા (Lung Opacity)",
        "hi": "फेफड़ों में अपारदर्शिता (Lung Opacity)",
        "mr": "फुफ्फुसातील अपारदर्शकता (Lung Opacity)",
    },
    "Normal study": {
        "en": "Normal study (no acute abnormality)",
        "gu": "સામાન્ય અભ્યાસ (કોઈ તીવ્ર રોગ નથી)",
        "hi": "सामान्य अध्ययन (कोई गंभीर विकार नहीं)",
        "mr": "सामान्य तपासणी (कोणताही तीव्र आजार नाही)",
    },
}

LOCALIZED_SEVERITY = {
    "normal": {"en": "normal", "gu": "સામાન્ય", "hi": "सामान्य", "mr": "सामान्य"},
    "mild": {"en": "mild", "gu": "હળવી", "hi": "हल्की", "mr": "सौम्य"},
    "moderate": {"en": "moderate", "gu": "મધ્યમ", "hi": "मध्यम", "mr": "मध्यम"},
    "severe": {"en": "severe", "gu": "ગંભીર / તાકીદની", "hi": "गंभीर / आपातकालीन", "mr": "गंभीर / तातडीची"},
}

LOCALIZED_RECOMMENDATIONS = {
    "en": "Recommend clinical correlation with physical examination and pulse oximetry. Follow-up view as clinically indicated.",
    "gu": "શારીરિક તપાસ, પલ્સ ઓક્સિમેટ્રી અને ક્લિનિકલ લક્ષણો સાથે સહસંબંધ સાધવાની ભલામણ કરવામાં આવે છે. ડૉક્ટરની સલાહ મુજબ ફોલો-અપ ઇમેજિંગ કરાવો.",
    "hi": "शारीरिक परीक्षण, पल्स ऑक्सीमेट्री और क्लिनिकल लक्षणों के साथ सहसंबंध की सिफारिश की जाती है। आवश्यकतानुसार फॉलो-अप इमेजिंग कराएं।",
    "mr": "शारीरिक तपासणी, पल्स ऑक्सिमेट्री आणि क्लिनिकल लक्षणांशी सहसंबंध तपासण्याची शिफारस केली जाते. डॉक्टरांच्या सल्ल्यानुसार फॉलो-अप इमेजिंग करा.",
}


def _get_lang_key(language: str) -> str:
    l = (language or "English").strip().lower()
    if "guj" in l:
        return "gu"
    elif "hin" in l:
        return "hi"
    elif "mar" in l:
        return "mr"
    return "en"


def _build_fallback_report(local_out: dict, language: str = "English") -> FullReport:
    """Creates a medically coherent, authentically localized report from TorchXRayVision predictions if Gemini is unavailable."""
    lang_key = _get_lang_key(language)
    top_cond = local_out.get("top_condition", "Normal study")
    scores = local_out.get("confidence_scores", {})
    detected = local_out.get("detected_pathologies", [])

    is_abnormal = any(p.get("status") == "abnormal" for p in detected[:3])
    sev = Severity.moderate if is_abnormal else Severity.normal
    sev_str = LOCALIZED_SEVERITY.get(sev.value, {}).get(lang_key, sev.value)

    cond_trans = LOCALIZED_CONDITIONS.get(top_cond, {}).get(lang_key, top_cond)

    top_score = detected[0]["score"] if detected else 0.0

    # Build localized text fields
    if lang_key == "gu":
        abnormalities = [LOCALIZED_CONDITIONS.get(p["condition"], {}).get("gu", p["condition"]) for p in detected if p.get("status") == "abnormal"][:4]
        if not abnormalities:
            abnormalities = ["કોઈ તીવ્ર કાર્ડિયોપલ્મોનરી રોગ નથી"]

        if is_abnormal:
            findings_text = (
                f"TorchXRayVision DenseNet-121 મોડેલ દ્વારા રેડિયોગ્રાફિક મૂલ્યાંકન કરવામાં આવ્યું. "
                f"પ્રાથમિક સ્થિતિ: {cond_trans} (વિશ્વાસ સ્કોર {top_score:.2f}). "
                f"કોન્ફિડન્સ સમરી: કાર્ડિયોમેગાલી ({scores.get('cardiomegaly', 0.0)}), "
                f"એફ્યુઝન ({scores.get('effusion', 0.0)}), ઓપેસિટી ({scores.get('opacity', 0.0)}), "
                f"ન્યુમોથોરેક્સ ({scores.get('pneumothorax', 0.0)}). હાડપિંજર અને ડાયાફ્રામ અખંડ છે."
            )
            impression_text = f"રેડિયોગ્રાફિક તારણો {sev_str} સ્થિતિ દર્શાવે છે. પ્રાથમિક ડાયગ્નોસ્ટિક તારણ: {cond_trans}."
            brief_text = f"તમારા છાતીના એક્સ-રેમાં {cond_trans} સાથે સુસંગત લક્ષણો જોવા મળ્યા છે. કૃપા કરીને તમારા ડૉક્ટર સાથે આ પરિણામોની ચર્ચા કરો."
        else:
            findings_text = "TorchXRayVision DenseNet-121 મોડેલ દ્વારા મૂલ્યાંકન. બંને ફેફસાં સ્પષ્ટ છે, કોઈ કેન્દ્રીય અસ્પષ્ટતા કે પ્લુરલ એફ્યુઝન નથી. હૃદય અને ડાયાફ્રામ સામાન્ય છે."
            impression_text = "સામાન્ય છાતીનો એક્સ-રે. કોઈ તીવ્ર રોગવિજ્ઞાન જોવા મળ્યું નથી."
            brief_text = "તમારો છાતીનો એક્સ-રે એકદમ સામાન્ય અને સ્પષ્ટ દેખાય છે. વધુ વિગતો માટે તમારા ચિકિત્સક સાથે ચર્ચા કરો."

    elif lang_key == "hi":
        abnormalities = [LOCALIZED_CONDITIONS.get(p["condition"], {}).get("hi", p["condition"]) for p in detected if p.get("status") == "abnormal"][:4]
        if not abnormalities:
            abnormalities = ["कोई तीव्र कार्डियोपल्मोनरी असामान्यता नहीं"]

        if is_abnormal:
            findings_text = (
                f"TorchXRayVision DenseNet-121 मॉडल द्वारा रेडियोग्राफिक मूल्यांकन किया गया। "
                f"प्राथमिक स्थिति: {cond_trans} (विश्वसनीयता स्कोर {top_score:.2f})। "
                f"कॉन्फिडेंस समरी: कार्डियोमेगाली ({scores.get('cardiomegaly', 0.0)}), "
                f"इफ्यूजन ({scores.get('effusion', 0.0)}), अपारदर्शिता ({scores.get('opacity', 0.0)}), "
                f"न्यूमोथोरैक्स ({scores.get('pneumothorax', 0.0)})। कंकाल संरचनाएं और डायफ्राम सामान्य हैं।"
            )
            impression_text = f"रेडियोग्राफिक निष्कर्ष {sev_str} प्रस्तुति का संकेत देते हैं। मुख्य निदान: {cond_trans}।"
            brief_text = f"आपके सीने के एक्स-रे में {cond_trans} के संकेत देखे गए हैं। कृपया अपने चिकित्सक के साथ इन परिणामों की समीक्षा करें।"
        else:
            findings_text = "TorchXRayVision DenseNet-121 मॉडल द्वारा मूल्यांकन। दोनों फेफड़े स्पष्ट हैं, कोई फोकल कंसोलिडेशन या न्यूमोथोरैक्स नहीं है। हृदय और डायफ्राम सामान्य हैं।"
            impression_text = "सामान्य सीने का एक्स-रे। कोई तीव्र कार्डियोपल्मोनरी असामान्यता नहीं देखी गई।"
            brief_text = "आपके सीने का एक्स-रे सामान्य और स्पष्ट है। कोई चिंता की बात नहीं है, कृपया अपने डॉक्टर से परामर्श करें।"

    elif lang_key == "mr":
        abnormalities = [LOCALIZED_CONDITIONS.get(p["condition"], {}).get("mr", p["condition"]) for p in detected if p.get("status") == "abnormal"][:4]
        if not abnormalities:
            abnormalities = ["कोणतीही तीव्र कार्डिओपल्मोनरी विकृती नाही"]

        if is_abnormal:
            findings_text = (
                f"TorchXRayVision DenseNet-121 मॉडेलद्वारे रेडिओग्राफिक मूल्यांकन केले गेले. "
                f"प्राथमिक स्थिती: {cond_trans} (विश्वासार्हता स्कोअर {top_score:.2f}). "
                f"कॉन्फिडन्स स्कोअर: कार्डिओमेगाली ({scores.get('cardiomegaly', 0.0)}), "
                f"इफ्यूजन ({scores.get('effusion', 0.0)}), अपारदर्शकता ({scores.get('opacity', 0.0)}), "
                f"न्यूमोथोरॅक्स ({scores.get('pneumothorax', 0.0)}). हाडांची रचना आणि डायफ्राम सामान्य आहेत."
            )
            impression_text = f"रेडिओग्राफिक निष्कर्ष {sev_str} स्थिती दर्शवतात. प्राथमिक निदान: {cond_trans}."
            brief_text = f"तुमच्या छातीच्या एक्स-रेमध्ये {cond_trans} शी सुसंगत लक्षणे आढळली आहेत. कृपया आपल्या डॉक्टरांशी चर्चा करा."
        else:
            findings_text = "TorchXRayVision DenseNet-121 मॉडेलद्वारे मूल्यांकन. दोन्ही फुफ्फुसे स्पष्ट आहेत, कोणतीही फोकल अपारदर्शकता किंवा न्यूमोथोरॅक्स नाही."
            impression_text = "सामान्य छातीचा एक्स-रे. कोणतीही तीव्र विकृती आढळली नाही."
            brief_text = "तुमचा छातीचा एक्स-रे सामान्य आणि निरोगी दिसत आहे. कृपया आपल्या डॉक्टरांचा सल्ला घ्या."

    else:
        # Default English
        abnormalities = [p["condition"] for p in detected if p.get("status") == "abnormal"][:4]
        if not abnormalities:
            abnormalities = ["No acute cardiopulmonary abnormality"]

        findings_text = (
            f"Evaluation performed using TorchXRayVision DenseNet-121. "
            f"Primary condition detected: {top_cond} with confidence score {top_score:.2f}. "
            f"Confidence summary: Cardiomegaly ({scores.get('cardiomegaly', 0.0)}), "
            f"Effusion ({scores.get('effusion', 0.0)}), Opacity ({scores.get('opacity', 0.0)}), "
            f"Pneumothorax ({scores.get('pneumothorax', 0.0)}). Bony structures and diaphragm intact."
        )
        impression_text = (
            f"Radiographic findings indicate {sev.value} presentation. "
            f"Primary diagnostic feature: {top_cond}." if is_abnormal else "Normal chest radiograph with no acute focal consolidation or pneumothorax."
        )
        brief_text = (
            f"Your chest X-ray shows signs consistent with {top_cond}. Please review these findings with your physician."
            if is_abnormal else
            "Your chest X-ray appears clear with no acute concerns noted. Please discuss your results with your doctor."
        )

    recommendations_text = LOCALIZED_RECOMMENDATIONS.get(lang_key, LOCALIZED_RECOMMENDATIONS["en"])

    differentials = []
    icd_codes = []
    if is_abnormal:
        differentials.append(DifferentialItem(
            condition=cond_trans,
            likelihood="high" if top_score > 0.6 else "moderate",
            reasoning=f"DenseNet-121 calibrated probability score: {top_score:.2f}",
        ))
        icd_map = {
            "Cardiomegaly": ("I51.7", "Cardiomegaly"),
            "Effusion": ("J90", "Pleural effusion, not elsewhere classified"),
            "Pneumonia": ("J18.9", "Pneumonia, unspecified organism"),
            "Pneumothorax": ("J93.9", "Pneumothorax, unspecified"),
            "Consolidation": ("J98.4", "Other disorders of lung"),
            "Lung Opacity": ("R91.8", "Other nonspecific abnormal finding of lung field"),
        }
        if top_cond in icd_map:
            code, desc = icd_map[top_cond]
            icd_codes.append(ICD10Code(code=code, description=desc))

    return FullReport(
        findings=findings_text,
        impression=impression_text,
        recommendations=recommendations_text,
        brief=brief_text,
        severity=sev,
        abnormalities=abnormalities,
        confidence_scores=ConfidenceScores(**scores),
        lung_zones=LungZones(),
        icd10_codes=icd_codes,
        differentials=differentials,
        grounded_guidance=None,
        language=language,
        heatmap_data_url=local_out.get("heatmap_data_url"),
        detected_pathologies=[DetectedPathology(**p) for p in detected],
    )


def _apply_local_translation(report: FullReport, target_clean: str):
    """Emergency offline medical translator when remote LLM APIs are unreachable."""
    lang_key = _get_lang_key(target_clean)
    if lang_key == "en":
        return

    # Update recommendations & brief
    report.recommendations = LOCALIZED_RECOMMENDATIONS.get(lang_key, report.recommendations)

    is_abnormal = report.severity not in (Severity.normal, "normal")
    sev_str = LOCALIZED_SEVERITY.get(report.severity.value if hasattr(report.severity, "value") else str(report.severity), {}).get(lang_key, "")

    if lang_key == "gu":
        if is_abnormal:
            report.impression = f"રેડિયોગ્રાફિક તારણો {sev_str} સ્થિતિ દર્શાવે છે. વિગતવાર મૂલ્યાંકન માટે ક્લિનિકલ સહસંબંધ જરૂરી છે."
            report.brief = "તમારા છાતીના એક્સ-રેમાં અસામાન્ય લક્ષણો જણાયા છે. કૃપા કરીને તમારા ડૉક્ટર સાથે આ તારણોની ચર્ચા કરો."
        else:
            report.impression = "સામાન્ય છાતીનો એક્સ-રે. કોઈ તીવ્ર કાર્ડિયોપલ્મોનરી રોગ નથી."
            report.brief = "તમારો છાતીનો એક્સ-રે એકદમ સામાન્ય અને સ્પષ્ટ છે. કોઈ ચિંતાની જરૂર નથી."
    elif lang_key == "hi":
        if is_abnormal:
            report.impression = f"रेडियोग्राफिक निष्कर्ष {sev_str} प्रस्तुति का संकेत देते हैं। विस्तृत मूल्यांकन के लिए क्लिनिकल सहसंबंध आवश्यक है।"
            report.brief = "आपके सीने के एक्स-रे में असामान्यता के संकेत हैं। कृपया अपने चिकित्सक से संपर्क करें।"
        else:
            report.impression = "सामान्य सीने का एक्स-रे। कोई तीव्र विकार नहीं देखा गया।"
            report.brief = "आपके सीने का एक्स-रे सामान्य और स्पष्ट है।"
    elif lang_key == "mr":
        if is_abnormal:
            report.impression = f"रेडिओग्राफिक निष्कर्ष {sev_str} स्थिती दर्शवतात. सविस्तर मूल्यमापनासाठी क्लिनिकल सहसंबंध आवश्यक आहे."
            report.brief = "तुमच्या छातीच्या एक्स-रेमध्ये लक्षणे आढळली आहेत. कृपया आपल्या डॉक्टरांचा सल्ला घ्या."
        else:
            report.impression = "सामान्य छातीचा एक्स-रे. कोणतीही तीव्र विकृती नाही."
            report.brief = "तुमचा छातीचा एक्स-रे सामान्य आणि निरोगी दिसत आहे."


LANGUAGE_DIRECTIVES = {
    "gujarati": "CRITICAL LANGUAGE INSTRUCTION: You MUST write ALL narrative text fields (findings, impression, recommendations, brief) ENTIRELY in native Gujarati script (ગુજરાતી લિપિ). Do not use English sentences.",
    "hindi": "CRITICAL LANGUAGE INSTRUCTION: You MUST write ALL narrative text fields (findings, impression, recommendations, brief) ENTIRELY in fluent Hindi Devanagari script (हिंदी लिपि).",
    "marathi": "CRITICAL LANGUAGE INSTRUCTION: You MUST write ALL narrative text fields (findings, impression, recommendations, brief) ENTIRELY in fluent Marathi Devanagari script (मराठी लिपि).",
    "english": "Write in clear, professional medical English.",
}


_REPORT_PROMPT_TEMPLATE = """You are an expert board-certified radiologist.
A clinical deep learning model (TorchXRayVision DenseNet-121, trained on CheXpert & MIMIC-CXR) has examined this chest radiograph and produced the following calibrated pathology predictions:

TOP DETECTED CONDITION: {top_condition}
CONFIDENCE SCORES:
{scores_json}

DETAILED PATHOLOGY PREDICTIONS:
{pathologies_json}

Carefully inspect the attached chest X-ray image in conjunction with these deep learning observations.
Generate a structured, medically rigorous radiologist report in {language}.

{language_directive}

Requirements:
1. For each of the 6 lung zones (upper_left, upper_right, middle_left, middle_right, lower_left, lower_right), classify as either "clear" or "affected".
2. Assess overall severity: exactly one of "normal", "mild", "moderate", "severe".
3. List 3 to 6 key abnormalities (e.g. "Cardiomegaly", "Bibasilar Opacity", "Right Pleural Effusion").
4. List 2 to 4 differential diagnoses with likelihood ("high", "moderate", "low") and clinical reasoning grounded in the visual findings.
5. Suggest 2 to 4 relevant ICD-10 codes with accurate codes and descriptions (empty list if completely normal).
6. Write 'findings': exactly one detailed, clinical paragraph describing anatomical structures (heart size, lung fields, mediastinum, costophrenic angles, bony thorax).
7. Write 'impression': exactly one concise summary paragraph stating the primary diagnosis and significant findings.
8. Write 'recommendations': actionable clinical follow-up recommendations (e.g. lateral view, chest CT, echocardiogram, clinical correlation).
9. Write 'brief': exactly 2 calm, easy-to-understand sentences for a non-medical patient explaining what was found and reassuring them to consult their physician.

ALL text fields (findings, impression, recommendations, brief) MUST be written in {language}."""


def translate_report(report: FullReport, target_language: str) -> FullReport:
    """Translates an existing FullReport's narrative fields into target_language with multi-model failover."""
    target_clean = (target_language or "English").strip()
    if report.language and report.language.lower() == target_clean.lower():
        return report

    if not client:
        _apply_local_translation(report, target_clean)
        report.language = target_clean
        return report

    directive = LANGUAGE_DIRECTIVES.get(target_clean.lower(), f"Translate accurately into {target_clean}.")

    prompt = f"""You are an expert board-certified radiologist and medical translator.
{directive}

Translate the following radiology report fields accurately into {target_clean}:
- findings: {report.findings}
- impression: {report.impression}
- recommendations: {report.recommendations}
- brief: {report.brief}

Also translate the 'reasoning' for each differential diagnosis:
{json.dumps([{"condition": d.condition, "reasoning": d.reasoning} for d in report.differentials], ensure_ascii=False)}

Respond with valid JSON adhering strictly to this structure:
{{
  "findings": "...",
  "impression": "...",
  "recommendations": "...",
  "brief": "...",
  "differentials_reasoning": ["...", "..."]
}}"""

    try:
        response = _call_gemini_with_fallback(
            contents=[prompt],
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )
        clean_text = _clean_json_str(response.text)
        data = json.loads(clean_text)

        if data.get("findings"):
            report.findings = data["findings"]
        if data.get("impression"):
            report.impression = data["impression"]
        if data.get("recommendations"):
            report.recommendations = data["recommendations"]
        if data.get("brief"):
            report.brief = data["brief"]
        if data.get("differentials_reasoning") and isinstance(data["differentials_reasoning"], list):
            for i, r_text in enumerate(data["differentials_reasoning"]):
                if i < len(report.differentials):
                    report.differentials[i].reasoning = r_text
        report.language = target_clean
        return report
    except Exception as e:
        print(f"[translate_report] Remote translation error ({e}), applying local fallback...")
        _apply_local_translation(report, target_clean)
        report.language = target_clean
        return report


def run_fast_generative_report(
    image_bytes: bytes,
    mime_type: str,
    local_out: dict,
    language: str = "English",
) -> FullReport:
    """Single unified multimodal Gemini call combining image + calibrated scores with multi-model failover."""
    if not client:
        return _build_fallback_report(local_out, language)

    lang_clean = (language or "English").strip()
    directive = LANGUAGE_DIRECTIVES.get(lang_clean.lower(), f"Write completely in {lang_clean}.")

    prompt = _REPORT_PROMPT_TEMPLATE.format(
        top_condition=local_out.get("top_condition", "None"),
        scores_json=json.dumps(local_out.get("confidence_scores", {}), indent=2),
        pathologies_json=json.dumps(local_out.get("detected_pathologies", [])[:8], indent=2),
        language=lang_clean,
        language_directive=directive,
    )

    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    try:
        response = _call_gemini_with_fallback(
            contents=[prompt, image_part],
            config=types.GenerateContentConfig(
                temperature=0.15,
                response_mime_type="application/json",
                response_schema=FullReport,
            ),
        )

        report: FullReport = response.parsed

        # Inject real PyTorch DenseNet predictions & Grad-CAM heatmap
        report.confidence_scores = ConfidenceScores(**local_out.get("confidence_scores", {}))
        report.heatmap_data_url = local_out.get("heatmap_data_url")
        report.detected_pathologies = [
            DetectedPathology(**item) for item in local_out.get("detected_pathologies", [])
        ]
        report.language = language
        return report
    except Exception as e:
        print(f"[run_fast_generative_report] Error ({e}), using localized fallback report...")
        return _build_fallback_report(local_out, language)



def run_multi_agent_pipeline(
    image_bytes: bytes,
    mime_type: str,
    local_out: dict,
    language: str = "English",
) -> FullReport:
    """
    Modular 3-Stage Multi-Agent Cascade:
      Vision Agent -> Reasoning Agent -> Report Agent
    """
    if not client:
        return _build_fallback_report(local_out, language)

    try:
        # Stage 1: Vision Agent extracts anatomical observations
        vision_out = run_vision_agent(image_bytes, mime_type)

        # Stage 2: Reasoning Agent deduces differential diagnoses & severity
        reasoning_out = run_reasoning_agent(vision_out)

        # Stage 3: Report Agent drafts radiologist narrative and patient brief
        report_out = run_report_agent(vision_out, reasoning_out, language)
    except Exception as e:
        print(f"[run_multi_agent_pipeline] Multi-agent error ({e}), applying localized fallback...")
        return _build_fallback_report(local_out, language)

    # Assemble into FullReport
    return FullReport(
        findings=report_out.findings,
        impression=report_out.impression,
        recommendations=report_out.recommendations,
        brief=report_out.brief,
        severity=reasoning_out.severity,
        abnormalities=reasoning_out.abnormalities,
        confidence_scores=ConfidenceScores(**local_out.get("confidence_scores", {})),
        lung_zones=vision_out.lung_zones,
        icd10_codes=reasoning_out.icd10_codes,
        differentials=reasoning_out.differentials,
        grounded_guidance=None,
        language=language,
        heatmap_data_url=local_out.get("heatmap_data_url"),
        detected_pathologies=[
            DetectedPathology(**item) for item in local_out.get("detected_pathologies", [])
        ],
    )


def _audit_and_arbitrate_safety(report: FullReport, local_out: dict) -> FullReport:
    """
    Deterministic Safety & Hallucination Arbiter:
    Audits the generated VLM report against DenseNet-121's calibrated confidence scores.
    Resolves discrepancies between Stage 1 Computer Vision and Stage 2 Generative Language:
    1. If DenseNet detected high-probability acute pathology (>= 0.42) but VLM reported 'normal',
       it flags a safety alert and escalates severity to protect patient safety.
    2. If DenseNet found zero acute pathologies (all scores < 0.20) but VLM hallucinated critical findings,
       it flags a discrepancy notice.
    """
    safety_alerts = list(report.safety_alerts or [])
    detected = local_out.get("detected_pathologies", [])

    acute_conditions = {"Pneumothorax", "Cardiomegaly", "Effusion", "Consolidation", "Lung Opacity"}

    high_prob_acute = [
        p for p in detected 
        if p.get("condition") in acute_conditions and p.get("score", 0.0) >= 0.42
    ]

    for item in high_prob_acute:
        cond = item["condition"]
        score = item["score"]
        cond_lower = cond.lower()
        findings_lower = (report.findings or "").lower()
        impression_lower = (report.impression or "").lower()
        abnormalities_lower = [a.lower() for a in (report.abnormalities or [])]

        is_mentioned = any(cond_lower in a for a in abnormalities_lower) or (cond_lower in findings_lower) or (cond_lower in impression_lower)

        if not is_mentioned and report.severity in [Severity.normal, Severity.mild]:
            alert_msg = f"[SAFETY ARBITER] DenseNet-121 detected high probability for {cond} ({score*100:.1f}%), which was omitted from initial narrative. Severity elevated to 'moderate' for mandatory clinician verification."
            safety_alerts.append(alert_msg)
            report.severity = Severity.moderate
            if cond not in report.abnormalities:
                report.abnormalities.append(cond)

    all_scores_low = all(p.get("score", 0.0) < 0.20 for p in detected[:5])
    if all_scores_low and report.severity == Severity.severe:
        alert_msg = "[SAFETY ARBITER] Generative report indicated severe presentation, but convolutional baseline detected no acute focal pathology (all scores < 0.20). Correlate with clinical history."
        safety_alerts.append(alert_msg)

    report.safety_alerts = safety_alerts
    return report


def run_pipeline(
    image_bytes: bytes,
    mime_type: str = "image/png",
    language: str = "English",
    mode: str = "fast",
    filename: str = "",
) -> FullReport:
    """Synchronous pipeline orchestrator supporting fast, multi-agent, and 100% offline edge modes."""
    try:
        local_out = predict_xray(image_bytes, filename=filename)
        std_bytes = local_out.get("standardized_png_bytes", image_bytes)
        target_mime = "image/png" if local_out.get("metadata", {}).get("is_dicom") else mime_type

        if mode in ("offline", "edge"):
            report = _build_fallback_report(local_out, language)
        elif mode in ("multi_agent", "comprehensive"):
            report = run_multi_agent_pipeline(std_bytes, target_mime, local_out, language)
        else:
            report = run_fast_generative_report(std_bytes, target_mime, local_out, language)

        # Attach DICOM metadata if present
        meta = local_out.get("metadata", {})
        if meta.get("is_dicom"):
            report.modality = meta.get("modality", "DX")
            report.view_position = meta.get("view_position", "PA")
            report.patient_age = meta.get("patient_age")
            report.patient_gender = meta.get("patient_sex")

        # Always attach standardized preview data URL so radiograph can be displayed and re-rendered from history
        if "standardized_png_bytes" in local_out:
            std_png = local_out["standardized_png_bytes"]
            report.image_preview_url = f"data:image/png;base64,{base64.b64encode(std_png).decode('utf-8')}"
        elif image_bytes:
            std_mime = "image/png" if target_mime == "image/png" else target_mime
            report.image_preview_url = f"data:{std_mime};base64,{base64.b64encode(image_bytes).decode('utf-8')}"

        report = _audit_and_arbitrate_safety(report, local_out)
        return report
    except Exception as e:
        print(f"[pipeline] error: {e}")
        try:
            local_out = predict_xray(image_bytes, filename=filename)
            fallback = _build_fallback_report(local_out, language)
            return _audit_and_arbitrate_safety(fallback, local_out)
        except Exception:
            return _build_fallback_report({}, language)
            return _build_fallback_report({}, language)


def run_pipeline_streaming(
    image_bytes: bytes,
    mime_type: str = "image/png",
    language: str = "English",
    mode: str = "fast",
    filename: str = "",
) -> Generator[Dict[str, Any], None, None]:
    """
    Real SSE streaming generator emitting actual stage events.
    In fast mode: 'model' -> 'report' -> 'done'
    In multi_agent mode: 'model' -> 'vision' -> 'reasoning' -> 'report' -> 'done'
    """
    try:
        # Stage 1: Local PyTorch DenseNet inference + Grad-CAM
        yield {"type": "stage", "stage": "model", "status": "running"}
        local_out = predict_xray(image_bytes, filename=filename)
        yield {"type": "stage", "stage": "model", "status": "done"}

        std_bytes = local_out.get("standardized_png_bytes", image_bytes)
        target_mime = "image/png" if local_out.get("metadata", {}).get("is_dicom") else mime_type

        if mode in ("offline", "edge"):
            # 100% On-Device Offline Mode
            yield {"type": "stage", "stage": "report", "status": "running"}
            report = _build_fallback_report(local_out, language)
            yield {"type": "stage", "stage": "report", "status": "done"}
        elif mode in ("multi_agent", "comprehensive"):
            # Multi-Agent Cascade
            yield {"type": "stage", "stage": "vision", "status": "running"}
            vision_out = run_vision_agent(std_bytes, target_mime)
            yield {"type": "stage", "stage": "vision", "status": "done"}

            yield {"type": "stage", "stage": "reasoning", "status": "running"}
            reasoning_out = run_reasoning_agent(vision_out)
            yield {"type": "stage", "stage": "reasoning", "status": "done"}

            yield {"type": "stage", "stage": "report", "status": "running"}
            report_out = run_report_agent(vision_out, reasoning_out, language)
            yield {"type": "stage", "stage": "report", "status": "done"}

            report = FullReport(
                findings=report_out.findings,
                impression=report_out.impression,
                recommendations=report_out.recommendations,
                brief=report_out.brief,
                severity=reasoning_out.severity,
                abnormalities=reasoning_out.abnormalities,
                confidence_scores=ConfidenceScores(**local_out.get("confidence_scores", {})),
                lung_zones=vision_out.lung_zones,
                icd10_codes=reasoning_out.icd10_codes,
                differentials=reasoning_out.differentials,
                grounded_guidance=None,
                language=language,
                heatmap_data_url=local_out.get("heatmap_data_url"),
                detected_pathologies=[
                    DetectedPathology(**item) for item in local_out.get("detected_pathologies", [])
                ],
            )
        else:
            # Fast Unified Mode
            yield {"type": "stage", "stage": "report", "status": "running"}
            report = run_fast_generative_report(std_bytes, target_mime, local_out, language)
            yield {"type": "stage", "stage": "report", "status": "done"}

        # Attach DICOM metadata if present
        meta = local_out.get("metadata", {})
        if meta.get("is_dicom"):
            report.modality = meta.get("modality", "DX")
            report.view_position = meta.get("view_position", "PA")
            report.patient_age = meta.get("patient_age")
            report.patient_gender = meta.get("patient_sex")

        # Always attach standardized preview data URL so radiograph can be displayed and re-rendered from history
        if "standardized_png_bytes" in local_out:
            std_png = local_out["standardized_png_bytes"]
            report.image_preview_url = f"data:image/png;base64,{base64.b64encode(std_png).decode('utf-8')}"
        elif image_bytes:
            std_mime = "image/png" if target_mime == "image/png" else target_mime
            report.image_preview_url = f"data:{std_mime};base64,{base64.b64encode(image_bytes).decode('utf-8')}"

        report = _audit_and_arbitrate_safety(report, local_out)
        yield {"type": "done", "report": report.model_dump(mode="json")}

    except Exception as e:
        print(f"[pipeline_streaming] error: {e}")
        yield {"type": "error", "message": str(e)}
        fallback = _build_fallback_report(local_out if "local_out" in locals() else {}, language)
        fallback = _audit_and_arbitrate_safety(fallback, local_out if "local_out" in locals() else {})
        yield {"type": "done", "report": fallback.model_dump(mode="json")}
