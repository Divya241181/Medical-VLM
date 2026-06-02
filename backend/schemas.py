"""
MedVLM Radiology Backend — Pydantic Schemas
"""

from pydantic import BaseModel


class ReportResponse(BaseModel):
    findings: str
    impression: str
    recommendations: str
    severity: str
    brief: str
    abnormalities: list[str]
    confidence_scores: dict
    lung_zones: dict
