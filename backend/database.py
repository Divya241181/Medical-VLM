"""
MedVLM — Database & Persistence Layer (SQLite + SQLAlchemy)
Provides persistent storage for radiology studies, doctor notes, and digital sign-offs.
"""

import os
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

from sqlalchemy import (
    create_engine,
    Column,
    String,
    Text,
    DateTime,
    Float,
    text,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

DB_PATH = Path(__file__).resolve().parent / "medvlm.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

# Ensure SQLite directory exists if file-based database is specified
if "sqlite:///" in DATABASE_URL:
    db_file_str = DATABASE_URL.replace("sqlite:///", "")
    try:
        Path(db_file_str).parent.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class StudyRecord(Base):
    __tablename__ = "studies"

    id = Column(String(64), primary_key=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    filename = Column(String(255), default="radiograph.png")
    modality = Column(String(32), default="DX")
    view_position = Column(String(32), default="PA")
    patient_age = Column(String(32), nullable=True)
    patient_gender = Column(String(32), nullable=True)

    # Clinical Report Fields
    severity = Column(String(32), default="normal")
    findings = Column(Text, default="")
    impression = Column(Text, default="")
    recommendations = Column(Text, default="")
    brief = Column(Text, default="")
    language = Column(String(32), default="English")

    # Structured JSON Fields (stored as JSON strings)
    confidence_scores_json = Column(Text, default="{}")
    lung_zones_json = Column(Text, default="{}")
    abnormalities_json = Column(Text, default="[]")
    differentials_json = Column(Text, default="[]")
    icd10_codes_json = Column(Text, default="[]")
    detected_pathologies_json = Column(Text, default="[]")
    grounded_guidance_json = Column(Text, nullable=True)
    heatmap_data_url = Column(Text, nullable=True)
    image_preview_url = Column(Text, nullable=True)
    safety_alerts_json = Column(Text, default="[]")

    # Doctor Verification & Sign-off Fields
    status = Column(String(32), default="draft")  # draft | reviewed | signed
    doctor_notes = Column(Text, default="")
    signed_by = Column(String(128), nullable=True)
    doctor_license = Column(String(64), nullable=True)
    signed_at = Column(DateTime, nullable=True)
    signature_hash = Column(String(128), nullable=True)

    def to_dict(self) -> Dict[str, Any]:
        """Convert record to dictionary matching FullReport + Study metadata."""
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "filename": self.filename,
            "modality": self.modality,
            "view_position": self.view_position,
            "patient_age": self.patient_age,
            "patient_gender": self.patient_gender,
            "severity": self.severity,
            "findings": self.findings,
            "impression": self.impression,
            "recommendations": self.recommendations,
            "brief": self.brief,
            "language": self.language,
            "confidence_scores": json.loads(self.confidence_scores_json or "{}"),
            "lung_zones": json.loads(self.lung_zones_json or "{}"),
            "abnormalities": json.loads(self.abnormalities_json or "[]"),
            "differentials": json.loads(self.differentials_json or "[]"),
            "icd10_codes": json.loads(self.icd10_codes_json or "[]"),
            "detected_pathologies": json.loads(self.detected_pathologies_json or "[]"),
            "safety_alerts": json.loads(self.safety_alerts_json or "[]"),
            "grounded_guidance": json.loads(self.grounded_guidance_json) if self.grounded_guidance_json else None,
            "heatmap_data_url": self.heatmap_data_url,
            "image_preview_url": self.image_preview_url,
            "status": self.status,
            "doctor_notes": self.doctor_notes,
            "signed_by": self.signed_by,
            "doctor_license": self.doctor_license,
            "signed_at": self.signed_at.isoformat() if self.signed_at else None,
            "signature_hash": self.signature_hash,
        }


class UserRecord(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(128), nullable=False)
    name = Column(String(128), nullable=False)
    role = Column(String(64), default="Attending Radiologist")
    specialty = Column(String(64), default="Diagnostic Radiology")
    institution = Column(String(128), default="Stanford Medical Imaging Network")
    license = Column(String(64), nullable=True)
    npi = Column(String(32), nullable=True)
    department = Column(String(128), nullable=True)
    avatar_initials = Column(String(8), default="MD")
    color = Column(String(32), default="#06b6d4")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "specialty": self.specialty,
            "institution": self.institution,
            "license": self.license,
            "npi": self.npi,
            "department": self.department,
            "avatarInitials": self.avatar_initials,
            "color": self.color,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def init_db():
    """Create database tables if they do not exist and seed default demo clinicians."""
    Base.metadata.create_all(bind=engine)
    # Ensure backward-compatible schema migration for new columns
    with engine.connect() as conn:
        for col_def in [
            "ALTER TABLE studies ADD COLUMN image_preview_url TEXT",
            "ALTER TABLE studies ADD COLUMN safety_alerts_json TEXT DEFAULT '[]'",
            "ALTER TABLE studies ADD COLUMN signature_hash VARCHAR(128)",
        ]:
            try:
                conn.execute(text(col_def))
                conn.commit()
            except Exception:
                pass


def get_db():
    """Dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

