"""
MedVLM — PDF Report Builder Unit Tests
Verifies ReportLab PDF generation across standard, signed, and edge-case reports.
"""

import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from pdf_builder import build_pdf


def test_build_pdf_basic():
    """Verify standard A4 PDF builds cleanly without errors."""
    report = {
        "id": "MVL-TEST001",
        "severity": "normal",
        "findings": "Clear lung fields bilaterally. Cardiac silhouette within normal limits.",
        "impression": "No acute cardiopulmonary disease.",
        "recommendations": "Routine follow-up as clinically indicated.",
        "brief": "Your chest X-ray appears clear with no acute concerns noted.",
        "differentials": [],
        "icd10_codes": [],
        "modality": "DX",
        "view_position": "PA",
    }
    pdf_bytes = build_pdf(report)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")


def test_build_pdf_with_differentials_and_signoff():
    """Verify PDF builds correctly with differential table, ICD-10, and physician sign-off block."""
    report = {
        "id": "MVL-TEST002",
        "severity": "moderate",
        "findings": "Cardiomegaly with bilateral blunting of costophrenic angles indicative of pleural effusion.",
        "impression": "Cardiomegaly and bilateral pleural effusions, suspicious for congestive heart failure.",
        "recommendations": "Echocardiogram and correlation with BNP levels recommended.",
        "brief": "Enlarged heart shadow and fluid noted. Please discuss treatment with your cardiologist.",
        "differentials": [
            {"condition": "Congestive Heart Failure", "likelihood": "HIGH", "reasoning": "Bilateral effusion and enlarged cardiothoracic ratio > 0.55"},
            {"condition": "Pneumonia with Parapneumonic Effusion", "likelihood": "LOW", "reasoning": "No focal consolidation visible"},
        ],
        "icd10_codes": [
            {"code": "I50.9", "description": "Heart failure, unspecified"},
            {"code": "J90", "description": "Pleural effusion, not elsewhere classified"},
        ],
        "modality": "DX",
        "view_position": "PA",
        "patient_age": "67Y",
        "patient_gender": "M",
        "status": "signed",
        "signed_by": "Dr. Marcus Vance, MD, FACR",
        "doctor_license": "RAD-US-89104",
        "signed_at": "2026-09-27 18:30:00 UTC",
        "doctor_notes": "Immediate cardiology referral requested. Diuretic regimen suggested.",
    }
    pdf_bytes = build_pdf(report)
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")
