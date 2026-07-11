"""
MedVLM Radiology Backend — Pydantic Schemas
"""

from pydantic import BaseModel
from typing import Optional


class ReportResponse(BaseModel):
    findings: str
    impression: str
    recommendations: str
    severity: str
    brief: str
    abnormalities: list[str]
    confidence_scores: dict
    lung_zones: dict
    icd10_codes: Optional[list[dict]] = []  # [{"code": "J18.9", "description": "..."}]


class ChatMessage(BaseModel):
    role: str   # "user" or "model"
    text: str


class ChatRequest(BaseModel):
    report_context: dict            # the full report JSON
    conversation_history: list[ChatMessage]
    user_message: str
    language: Optional[str] = "English"


class ChatResponse(BaseModel):
    reply: str

