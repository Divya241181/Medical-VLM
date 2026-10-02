"""
MedVLM — Database Seeding Script
Seeds realistic clinical radiology studies for capstone demonstration and testing.
Includes normal studies, moderate cardiomegaly, and signed/reviewed cases with SHA-256 hashes.
"""

import os
import sys
import json
import uuid
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db, SessionLocal, StudyRecord


def seed_clinical_studies():
    init_db()
    db = SessionLocal()

    print(f"[seed_data] Checking curated clinical sample studies...")
    now = datetime.now(timezone.utc)

    sample_studies = [
        {
            "id": "MVL-NORM-01",
            "created_at": now - timedelta(hours=3),
            "filename": "sample_normal.jpg",
            "modality": "DX",
            "view_position": "PA",
            "patient_age": "34Y",
            "patient_gender": "F",
            "severity": "normal",
            "findings": "The cardiac silhouette and mediastinal contours are within normal limits of size and shape. The lungs are well-expanded and clear without focal consolidation, pleural effusion, or pneumothorax. Bony structures and diaphragm appear intact.",
            "impression": "Normal chest radiograph. No acute cardiopulmonary disease.",
            "recommendations": "Routine clinical follow-up as clinically indicated.",
            "brief": "Your chest X-ray appears completely clear and normal. No signs of infection, fluid, or heart enlargement were found.",
            "language": "English",
            "confidence_scores_json": json.dumps({"opacity": 0.05, "cardiomegaly": 0.08, "effusion": 0.03, "pneumothorax": 0.01, "consolidation": 0.04}),
            "lung_zones_json": json.dumps({"upper_left": "clear", "upper_right": "clear", "middle_left": "clear", "middle_right": "clear", "lower_left": "clear", "lower_right": "clear"}),
            "abnormalities_json": json.dumps([]),
            "differentials_json": json.dumps([]),
            "icd10_codes_json": json.dumps([]),
            "detected_pathologies_json": json.dumps([
                {"condition": "Cardiomegaly", "score": 0.08, "status": "normal"},
                {"condition": "Lung Opacity", "score": 0.05, "status": "normal"},
                {"condition": "Consolidation", "score": 0.04, "status": "normal"},
                {"condition": "Effusion", "score": 0.03, "status": "normal"},
                {"condition": "Pneumothorax", "score": 0.01, "status": "normal"},
            ]),
            "safety_alerts_json": json.dumps([]),
            "status": "signed",
            "doctor_notes": "Reviewed and confirmed normal study. Discharged to outpatient care.",
            "signed_by": "Dr. Sarah Jenkins, MD",
            "doctor_license": "RAD-CA-889124",
            "signed_at": now - timedelta(hours=2, minutes=45),
            "signature_hash": "SHA256:4C8F91B2E3D4A051",
            "image_preview_url": "/samples/sample_normal.jpg",
        },
        {
            "id": "MVL-CARD-02",
            "created_at": now - timedelta(hours=8),
            "filename": "sample_cardiomegaly.jpg",
            "modality": "DX",
            "view_position": "PA",
            "patient_age": "67Y",
            "patient_gender": "M",
            "severity": "moderate",
            "findings": "Significant enlargement of the cardiac silhouette is noted with cardiothoracic ratio exceeding 0.58. Mild vascular cephalization with prominence of interstitial markings in the lower lung zones. Costophrenic sulci demonstrate blunting on the right, concerning for small reactive pleural effusion.",
            "impression": "Cardiomegaly with radiographic features suggestive of chronic volume overload / congestive heart failure and small right pleural effusion.",
            "recommendations": "Recommend echocardiogram to assess left ventricular ejection fraction and clinical correlation with serum BNP levels.",
            "brief": "The X-ray indicates an enlarged heart silhouette with mild fluid at the base of the right lung. Please discuss these findings with your cardiologist.",
            "language": "English",
            "confidence_scores_json": json.dumps({"opacity": 0.48, "cardiomegaly": 0.88, "effusion": 0.62, "pneumothorax": 0.02, "consolidation": 0.28}),
            "lung_zones_json": json.dumps({"upper_left": "clear", "upper_right": "clear", "middle_left": "clear", "middle_right": "affected", "lower_left": "clear", "lower_right": "affected"}),
            "abnormalities_json": json.dumps(["Cardiomegaly", "Bibasilar Vascular Cephalization", "Right Pleural Effusion"]),
            "differentials_json": json.dumps([
                {"condition": "Congestive Heart Failure", "likelihood": "high", "reasoning": "Enlarged CTR with bibasilar congestion and effusion."},
                {"condition": "Dilated Cardiomyopathy", "likelihood": "moderate", "reasoning": "Marked transverse cardiac diameter expansion."},
            ]),
            "icd10_codes_json": json.dumps([
                {"code": "I50.9", "description": "Heart failure, unspecified"},
                {"code": "I51.7", "description": "Cardiomegaly"},
                {"code": "J90", "description": "Pleural effusion, not elsewhere classified"},
            ]),
            "detected_pathologies_json": json.dumps([
                {"condition": "Cardiomegaly", "score": 0.88, "status": "abnormal"},
                {"condition": "Effusion", "score": 0.62, "status": "abnormal"},
                {"condition": "Lung Opacity", "score": 0.48, "status": "abnormal"},
                {"condition": "Consolidation", "score": 0.28, "status": "normal"},
                {"condition": "Pneumothorax", "score": 0.02, "status": "normal"},
            ]),
            "safety_alerts_json": json.dumps([]),
            "status": "reviewed",
            "doctor_notes": "Correlated with prior study from 6 months ago. Findings represent progressive cardiomegaly.",
            "signed_by": None,
            "doctor_license": None,
            "signed_at": None,
            "signature_hash": None,
            "image_preview_url": "/samples/sample_cardiomegaly.jpg",
        },
        {
            "id": "MVL-PNEU-03",
            "created_at": now - timedelta(hours=14),
            "filename": "sample_pneumonia.jpg",
            "modality": "DX",
            "view_position": "PA",
            "patient_age": "52Y",
            "patient_gender": "F",
            "severity": "moderate",
            "findings": "Dense focal consolidation with prominent air bronchograms is identified throughout the right lower lung zone. The left lung field remains clear. The cardiac size is normal. No pneumothorax is identified.",
            "impression": "Right lower lobe consolidation consistent with community-acquired pneumonia.",
            "recommendations": "Empiric antibiotic therapy and follow-up repeat chest radiograph in 4 to 6 weeks to confirm resolution.",
            "brief": "Your X-ray shows signs of a localized lung infection (pneumonia) in the lower right lung. Prompt medical treatment with antibiotics is advised.",
            "language": "English",
            "confidence_scores_json": json.dumps({"opacity": 0.82, "cardiomegaly": 0.12, "effusion": 0.31, "pneumothorax": 0.02, "consolidation": 0.79}),
            "lung_zones_json": json.dumps({"upper_left": "clear", "upper_right": "clear", "middle_left": "clear", "middle_right": "affected", "lower_left": "clear", "lower_right": "affected"}),
            "abnormalities_json": json.dumps(["Right Lower Lobe Consolidation", "Air Bronchograms", "Dense Lung Opacity"]),
            "differentials_json": json.dumps([
                {"condition": "Bacterial Lobar Pneumonia", "likelihood": "high", "reasoning": "Dense segmental alveolar filling with air bronchograms."},
                {"condition": "Aspiration Pneumonitis", "likelihood": "low", "reasoning": "Dependent distribution in right lower lobe."},
            ]),
            "icd10_codes_json": json.dumps([
                {"code": "J18.9", "description": "Pneumonia, unspecified organism"},
                {"code": "J98.4", "description": "Other disorders of lung"},
            ]),
            "detected_pathologies_json": json.dumps([
                {"condition": "Lung Opacity", "score": 0.82, "status": "abnormal"},
                {"condition": "Consolidation", "score": 0.79, "status": "abnormal"},
                {"condition": "Effusion", "score": 0.31, "status": "normal"},
                {"condition": "Cardiomegaly", "score": 0.12, "status": "normal"},
                {"condition": "Pneumothorax", "score": 0.02, "status": "normal"},
            ]),
            "safety_alerts_json": json.dumps([]),
            "status": "signed",
            "doctor_notes": "Prescribed oral moxifloxacin. Follow-up clinic appointment booked.",
            "signed_by": "Dr. Robert Chen, MD",
            "doctor_license": "RAD-NY-419082",
            "signed_at": now - timedelta(hours=13, minutes=10),
            "signature_hash": "SHA256:7B12C59A41E8D230",
            "image_preview_url": "/samples/sample_pneumonia.jpg",
        },
    ]

    inserted = 0
    for s in sample_studies:
        existing = db.query(StudyRecord).filter(StudyRecord.id == s["id"]).first()
        if not existing:
            rec = StudyRecord(**s)
            db.add(rec)
            inserted += 1

    db.commit()
    print(f"[seed_data] Done. Inserted {inserted} new curated sample studies.")
    db.close()


if __name__ == "__main__":
    seed_clinical_studies()
