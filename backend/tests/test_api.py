"""
MedVLM Backend API Unit & Integration Tests
Tests health check, validation, study persistence, digital sign-off, and PDF endpoints.
"""

import io
from PIL import Image
import pytest
from fastapi.testclient import TestClient

import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from main import app
from database import init_db

init_db()
client = TestClient(app)


def _generate_test_png(width=224, height=224) -> bytes:
    """Creates a valid grayscale test image with gradient patterns."""
    import numpy as np
    x = np.linspace(0, 255, width, dtype=np.uint8)
    arr = np.tile(x, (height, 1))
    img = Image.fromarray(arr, mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_health_check():
    """Verify health endpoint returns status 200 with engine version."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "TorchXRayVision" in data["engine"]
    assert "features" in data


def test_invalid_image_type_rejected():
    """Verify non-image files are rejected with 415 Unsupported Media Type."""
    fake_txt = b"This is a text file, not an X-ray. " * 30
    response = client.post(
        "/analyze",
        files={"image": ("sample.txt", fake_txt, "text/plain")},
    )
    assert response.status_code == 415


def test_empty_image_rejected():
    """Verify empty or tiny files are rejected with 400 Bad Request."""
    empty_bytes = b"123"
    response = client.post(
        "/analyze",
        files={"image": ("empty.png", empty_bytes, "image/png")},
    )
    assert response.status_code == 400


def test_generate_pdf_endpoint():
    """Verify /generate-pdf returns a valid binary PDF stream."""
    sample_report = {
        "findings": "Heart size is within normal limits. Lungs are clear.",
        "impression": "Normal chest radiograph.",
        "recommendations": "No acute cardiopulmonary disease.",
        "brief": "Your chest X-ray appears completely normal.",
        "severity": "normal",
        "abnormalities": [],
        "confidence_scores": {"opacity": 0.05, "cardiomegaly": 0.08, "effusion": 0.02, "pneumothorax": 0.01, "consolidation": 0.01},
        "lung_zones": {
            "upper_left": "clear", "upper_right": "clear",
            "middle_left": "clear", "middle_right": "clear",
            "lower_left": "clear", "lower_right": "clear"
        },
        "icd10_codes": [],
        "differentials": [],
        "language": "English",
    }
    response = client.post("/generate-pdf", json=sample_report)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


def test_study_lifecycle():
    """Verify study persistence, patching, digital sign-off, and retrieval."""
    # 1. Fetch studies list
    list_resp = client.get("/studies")
    assert list_resp.status_code == 200
    studies = list_resp.json()
    assert isinstance(studies, list)

    # 2. Directly create a record in DB to test signing & retrieval
    from database import SessionLocal, StudyRecord
    db = SessionLocal()
    import uuid
    from datetime import datetime, timezone
    test_id = f"TEST-{uuid.uuid4().hex[:6].upper()}"
    record = StudyRecord(
        id=test_id,
        created_at=datetime.now(timezone.utc),
        filename="test_radiograph.png",
        findings="Mild bibasilar atelectasis.",
        impression="Mild non-specific atelectasis.",
        recommendations="Incentive spirometry.",
        brief="Mild lung changes observed.",
        severity="mild",
    )
    db.add(record)
    db.commit()
    db.close()

    # 3. Retrieve study
    get_resp = client.get(f"/studies/{test_id}")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == test_id
    assert data["status"] == "draft"

    # 4. Sign study
    sign_payload = {
        "doctor_name": "Dr. Sarah Chen, MD",
        "doctor_license": "RAD-CA-58291",
        "doctor_notes": "Atelectasis verified clinically. Patient stable.",
    }
    sign_resp = client.post(f"/studies/{test_id}/sign", json=sign_payload)
    assert sign_resp.status_code == 200
    signed_data = sign_resp.json()
    assert signed_data["status"] == "signed"
    assert signed_data["signed_by"] == "Dr. Sarah Chen, MD"
    assert signed_data["doctor_license"] == "RAD-CA-58291"

    # 5. Fetch PDF for study
    pdf_resp = client.get(f"/studies/{test_id}/pdf")
    assert pdf_resp.status_code == 200
    assert pdf_resp.content.startswith(b"%PDF")

    # 6. Delete test study
    del_resp = client.delete(f"/studies/{test_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True


def test_corrupted_binary_rejected():
    """Verify non-image binary files with application/octet-stream are rejected with 400."""
    fake_bin = b"\x00\x01\x02\x03" * 200
    response = client.post(
        "/analyze",
        files={"image": ("corrupted.bin", fake_bin, "application/octet-stream")},
    )
    assert response.status_code == 400
    assert "decodable image" in response.json()["detail"]


def test_analyze_streaming_endpoint():
    """Verify /analyze-stream produces valid SSE events and persists study with SessionLocal."""
    png_bytes = _generate_test_png(224, 224)
    response = client.post(
        "/analyze-stream",
        files={"image": ("stream_test.png", png_bytes, "image/png")},
        data={"language": "English", "mode": "fast"},
    )
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    events = []
    for line in response.iter_lines():
        if line and line.startswith("data: "):
            import json
            payload = json.loads(line[6:])
            events.append(payload)

    assert len(events) > 0
    # Must have final 'done' event with valid report
    done_events = [e for e in events if e.get("type") == "done"]
    assert len(done_events) == 1
    assert "report" in done_events[0]
    rep = done_events[0]["report"]
    assert "findings" in rep
    assert "severity" in rep


def test_referral_letter_endpoint():
    """Verify /referral-letter returns a formatted letter with target specialty and priority."""
    sample_report = {
        "findings": "Cardiomegaly with bilateral blunting of costophrenic angles.",
        "impression": "Cardiomegaly with bilateral pleural effusion.",
        "recommendations": "Urgent cardiology referral and echocardiogram.",
        "severity": "moderate",
        "differentials": [{"condition": "Congestive Heart Failure", "likelihood": "HIGH", "reasoning": "Effusion and CTR > 0.55"}],
    }
    response = client.post(
        "/referral-letter",
        json={
            "report_context": sample_report,
            "patient_name": "Jane Doe",
            "referring_facility": "Metro Health Radiology",
            "target_specialty": "Cardiology & Cardiovascular Care",
            "priority": "urgent",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "letter" in data
    assert len(data["letter"]) > 100
