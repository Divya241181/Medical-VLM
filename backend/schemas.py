"""
MedVLM — Pydantic Schemas
Strictly typed schemas for API request/response validation,
Gemini structured outputs, and clinical study management.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


# ── Primitives ────────────────────────────────────────────────────────────────

class Severity(str, Enum):
    normal   = "normal"
    mild     = "mild"
    moderate = "moderate"
    severe   = "severe"


class LungZones(BaseModel):
    """6-zone lung map — explicit fields instead of dict[str, str]."""
    upper_left:   str = "clear"
    upper_right:  str = "clear"
    middle_left:  str = "clear"
    middle_right: str = "clear"
    lower_left:   str = "clear"
    lower_right:  str = "clear"


class ConfidenceScores(BaseModel):
    """Pathology confidence scores — explicit fields instead of dict[str, float]."""
    opacity:       float = 0.0
    cardiomegaly:  float = 0.0
    effusion:      float = 0.0
    pneumothorax:  float = 0.0
    consolidation: float = 0.0


class ICD10Code(BaseModel):
    """Single ICD-10 code entry."""
    code:        str
    description: str


class GroundingSource(BaseModel):
    """A single grounded search result source."""
    title: str = ""
    uri:   str = ""


# ── Agent output schemas (used as response_schema for Gemini) ─────────────────

class Finding(BaseModel):
    """Raw observation from the vision agent."""
    region:      str
    observation: str


class VisionOutput(BaseModel):
    raw_findings:      List[Finding] = Field(default_factory=list)
    lung_zones:        LungZones = Field(default_factory=LungZones)
    confidence_scores: ConfidenceScores = Field(default_factory=ConfidenceScores)


class DifferentialItem(BaseModel):
    condition:  str
    likelihood: str   # "high" | "moderate" | "low"
    reasoning:  str


class ReasoningOutput(BaseModel):
    differentials: List[DifferentialItem] = Field(default_factory=list)
    severity:      Severity = Severity.normal
    abnormalities: List[str] = Field(default_factory=list)
    icd10_codes:   List[ICD10Code] = Field(default_factory=list)


class ReportOutput(BaseModel):
    findings:        str
    impression:      str
    recommendations: str
    brief:           str


class GroundedGuidance(BaseModel):
    summary: str
    sources: List[GroundingSource] = Field(default_factory=list)


class DetectedPathology(BaseModel):
    condition: str
    score: float
    status: str = "normal"


# ── Final assembled report (returned to frontend + used by /generate-pdf) ────

class FullReport(BaseModel):
    id:                   Optional[str]            = None
    created_at:           Optional[str]            = None
    findings:             str
    impression:           str
    recommendations:      str
    brief:                str
    severity:             Severity                 = Severity.normal
    abnormalities:        List[str]                = Field(default_factory=list)
    confidence_scores:    ConfidenceScores         = Field(default_factory=ConfidenceScores)
    lung_zones:           LungZones                = Field(default_factory=LungZones)
    icd10_codes:          List[ICD10Code]          = Field(default_factory=list)
    differentials:        List[DifferentialItem]    = Field(default_factory=list)
    grounded_guidance:    Optional[GroundedGuidance] = None
    language:             str                      = "English"
    heatmap_data_url:     Optional[str]            = None
    detected_pathologies: List[DetectedPathology]  = Field(default_factory=list)
    safety_alerts:        List[str]                = Field(default_factory=list)

    # Clinical Metadata & Doctor Sign-off Fields
    modality:             Optional[str]            = "DX"
    view_position:        Optional[str]            = "PA"
    patient_age:          Optional[str]            = None
    patient_gender:       Optional[str]            = None
    status:               Optional[str]            = "draft"  # draft | reviewed | signed
    doctor_notes:         Optional[str]            = ""
    signed_by:            Optional[str]            = None
    doctor_license:       Optional[str]            = None
    signed_at:            Optional[str]            = None
    signature_hash:       Optional[str]            = None
    image_preview_url:    Optional[str]            = None


# ── API request/response schemas ──────────────────────────────────────────────

class GroundedInsightsRequest(BaseModel):
    conditions: List[str] = Field(default_factory=list)
    severity:   str = "normal"


class GroundedInsightsResponse(BaseModel):
    insights: str
    sources:  List[GroundingSource] = Field(default_factory=list)


class GradcamRequest(BaseModel):
    target_pathology: str = "Cardiomegaly"


class GradcamResponse(BaseModel):
    target_pathology: str
    heatmap_data_url: str


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|model)$")
    text: str


class ChatRequest(BaseModel):
    report_context:       Dict[str, Any]
    conversation_history: List[ChatMessage] = Field(default_factory=list)
    user_message:         str
    language:             Optional[str] = "English"


class ChatResponse(BaseModel):
    reply: str


class ReferralLetterRequest(BaseModel):
    report_context:     Dict[str, Any]
    patient_name:       Optional[str] = "Patient"
    referring_facility: Optional[str] = "MedVLM Clinic"
    target_specialty:   Optional[str] = "Pulmonology & Respiratory Medicine"
    priority:           Optional[str] = "urgent"


class ReferralLetterResponse(BaseModel):
    letter: str


class StudySignRequest(BaseModel):
    doctor_name:    str
    doctor_license: str
    doctor_notes:   Optional[str] = ""


class StudyUpdateRequest(BaseModel):
    doctor_notes:   Optional[str] = None
    status:         Optional[str] = None


class TranslateReportRequest(BaseModel):
    report:          FullReport
    target_language: str = "Hindi"


class SynthesizeSpeechRequest(BaseModel):
    text:            str
    language:        str = "English"


# ── Clinician Authentication Schemas ──────────────────────────────────────────

class UserLoginRequest(BaseModel):
    email:    str
    password: str


class UserRegisterRequest(BaseModel):
    name:         str
    email:        str
    password:     str
    role:         Optional[str] = "Attending Radiologist"
    specialty:    Optional[str] = "Diagnostic Radiology"
    institution:  Optional[str] = "Memorial Health System"
    license:      Optional[str] = None
    npi:          Optional[str] = None
    department:   Optional[str] = None


class UserResponse(BaseModel):
    id:             str
    email:          str
    name:           str
    role:           str
    specialty:      str
    institution:    str
    license:        Optional[str] = None
    npi:            Optional[str] = None
    department:     Optional[str] = None
    avatarInitials: Optional[str] = "MD"
    color:          Optional[str] = "#06b6d4"
    created_at:     Optional[str] = None



