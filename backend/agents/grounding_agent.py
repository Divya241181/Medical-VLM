"""
Grounding Agent — Stage 4
Provides clinical guidance and literature citations.
Attempts real Google Search grounding; if the API key does not have
Search Grounding enabled (e.g. Free Tier 429/403), gracefully falls back
to direct clinical synthesis with curated medical literature references
(Radiopaedia, PubMed/NCBI, ACC/AHA, BTS).
"""

from google.genai import types
from app_config import client, MODEL_NAME
from schemas import GroundedGuidance, GroundingSource

_PROMPT_TEMPLATE = """Provide a brief, clinically relevant, patient-friendly summary for
someone with these chest X-ray findings:

Detected conditions: {conditions}
Severity: {severity}

Search for and include:
1. Current standard of care / what to expect next
2. Relevant lifestyle or monitoring advice
3. Red-flag symptoms that need urgent care

Keep it concise. Do not diagnose. Base this on current, real medical guidance."""

_CURATED_SOURCES = {
    "cardiomegaly": [
        GroundingSource(title="ACC/AHA Heart Failure Guidelines", uri="https://www.acc.org/guidelines"),
        GroundingSource(title="Radiopaedia: Cardiomegaly CXR Assessment", uri="https://radiopaedia.org/articles/cardiomegaly"),
        GroundingSource(title="NCBI Bookshelf: Cardiomegaly Evaluation", uri="https://www.ncbi.nlm.nih.gov/books/NBK545196/"),
    ],
    "effusion": [
        GroundingSource(title="BTS Guidelines: Pleural Effusion Management", uri="https://www.brit-thoracic.org.uk/quality-improvement/guidelines/pleural-disease/"),
        GroundingSource(title="Radiopaedia: Pleural Effusion Signs", uri="https://radiopaedia.org/articles/pleural-effusion"),
        GroundingSource(title="NCBI: Pleural Effusion Diagnosis", uri="https://www.ncbi.nlm.nih.gov/books/NBK448189/"),
    ],
    "pneumonia": [
        GroundingSource(title="ATS/IDSA Community-Acquired Pneumonia Guidelines", uri="https://www.thoracic.org/statements/resources/tb-opi/cap-guidelines.pdf"),
        GroundingSource(title="Radiopaedia: Pneumonia Radiographic Patterns", uri="https://radiopaedia.org/articles/pneumonia"),
        GroundingSource(title="PubMed: Pulmonary Opacities & Consolidation", uri="https://pubmed.ncbi.nlm.nih.gov/?term=chest+radiograph+opacity+evaluation"),
    ],
    "pneumothorax": [
        GroundingSource(title="ACCP Consensus: Spontaneous Pneumothorax", uri="https://journal.chestnet.org/article/S0012-3692(15)51860-2/fulltext"),
        GroundingSource(title="Radiopaedia: Pneumothorax Radiographic Findings", uri="https://radiopaedia.org/articles/pneumothorax"),
    ],
    "opacity": [
        GroundingSource(title="Fleischner Society Guidelines for Pulmonary Findings", uri="https://radiopaedia.org/articles/fleischner-society-pulmonary-nodule-recommendations"),
        GroundingSource(title="NCBI: Pulmonary Infiltrates Approach", uri="https://www.ncbi.nlm.nih.gov/books/NBK539916/"),
    ],
    "default": [
        GroundingSource(title="Radiopaedia: Chest Radiograph Interpretation", uri="https://radiopaedia.org/articles/chest-radiograph"),
        GroundingSource(title="PubMed Central: Standardized CXR Reporting", uri="https://pubmed.ncbi.nlm.nih.gov/?term=chest+radiograph+clinical+standards"),
        GroundingSource(title="NCBI Medical Imaging Guidelines", uri="https://www.ncbi.nlm.nih.gov/books/NBK470561/"),
    ],
}


def _resolve_sources(conditions: list[str]) -> list[GroundingSource]:
    matched = []
    added_titles = set()
    for cond in conditions:
        clow = cond.lower()
        for key, src_list in _CURATED_SOURCES.items():
            if key != "default" and (key in clow or clow in key):
                for s in src_list:
                    if s.title not in added_titles:
                        matched.append(s)
                        added_titles.add(s.title)
    if not matched:
        matched = _CURATED_SOURCES["default"]
    return matched[:4]


def run_grounding_agent(conditions: list[str], severity: str) -> GroundedGuidance:
    """Stage 4: Google Search grounding with resilient direct clinical fallback."""
    cond_str = ", ".join(conditions) if conditions else "general chest findings"

    if not client:
        return GroundedGuidance(
            summary=(
                f"Clinical guidance for {cond_str}: Standard of care recommends clinical correlation "
                f"with patient symptoms and follow-up evaluation with your healthcare provider. "
                f"Seek immediate evaluation if experiencing sudden chest pain or shortness of breath."
            ),
            sources=_resolve_sources(conditions),
        )

    # 1. Attempt live Google Search tool if permitted
    try:
        grounding_tool = types.Tool(google_search=types.GoogleSearch())
        prompt = _PROMPT_TEMPLATE.format(conditions=cond_str, severity=severity)
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[prompt],
            config=types.GenerateContentConfig(
                temperature=0.2,
                tools=[grounding_tool],
            ),
        )
        summary = (response.text or "").strip()
        sources = []
        candidate = response.candidates[0] if response.candidates else None
        gm = getattr(candidate, "grounding_metadata", None) if candidate else None
        chunks = getattr(gm, "grounding_chunks", None) if gm else None
        if chunks:
            for chunk in chunks:
                web = getattr(chunk, "web", None)
                if web:
                    sources.append(GroundingSource(title=web.title or "Web Reference", uri=web.uri or ""))

        if summary and summary != _fallback_text():
            return GroundedGuidance(summary=summary, sources=sources if sources else _resolve_sources(conditions))

    except Exception as e:
        print(f"[grounding_agent] Live search unavailable ({e}). Using direct clinical synthesis...")

    # 2. Resilient Direct Clinical Synthesis Fallback
    try:
        clinical_prompt = (
            f"You are a clinical physician and expert radiologist. Provide a structured, evidence-based "
            f"clinical guidance summary for someone whose chest X-ray findings indicate:\n"
            f"- Conditions: {cond_str}\n"
            f"- Severity: {severity}\n\n"
            f"Please structure your response into 3 concise sections:\n"
            f"1. **Standard of Care & Next Steps**: Typical clinical diagnostic workup (e.g., lateral projection, echocardiogram, thoracic CT, or clinical lab correlation).\n"
            f"2. **Patient Monitoring & Red Flags**: Key symptoms requiring prompt medical attention (e.g., progressive shortness of breath, fever, localized pain).\n"
            f"3. **Clinical Guidance Consensus**: Relevant medical consensus (e.g., ACC/AHA, BTS, Fleischner Society, or ATS).\n\n"
            f"Keep it clear, professional, and patient-appropriate. Do not prescribe specific drug dosages."
        )
        fallback_resp = client.models.generate_content(
            model=MODEL_NAME,
            contents=[clinical_prompt],
            config=types.GenerateContentConfig(temperature=0.2),
        )
        summary = (fallback_resp.text or "").strip()
        return GroundedGuidance(summary=summary or _fallback_text(), sources=_resolve_sources(conditions))

    except Exception as err2:
        print(f"[grounding_agent] Fallback generation error: {err2}")
        return GroundedGuidance(
            summary=(
                f"Clinical guidance for {cond_str}: Standard of care recommends clinical correlation "
                f"with patient symptoms and follow-up evaluation with your healthcare provider. "
                f"Seek immediate evaluation if experiencing sudden chest pain or shortness of breath."
            ),
            sources=_resolve_sources(conditions),
        )


def _fallback_text() -> str:
    return "Clinical standard of care indicates follow-up consultation with your attending physician."
