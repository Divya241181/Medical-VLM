"""
MedVLM — DICOM Radiology Processing & PHI Sanitization Utility
Handles DICOM (.dcm) files, 16-bit windowing, MONOCHROME inversion,
and clinical metadata extraction while strictly scrubbing Protected Health Information (PHI).
"""

import io
import numpy as np
from PIL import Image
from typing import Tuple, Dict, Any, Optional

try:
    import pydicom
    try:
        from pydicom.pixels import apply_voi_lut
    except ImportError:
        from pydicom.pixel_data_handlers.util import apply_voi_lut
    HAS_PYDICOM = True
except ImportError:
    HAS_PYDICOM = False
    apply_voi_lut = None


def is_dicom_file(image_bytes: bytes, filename: str = "") -> bool:
    """Check if the provided bytes represent a DICOM file."""
    if filename.lower().endswith(".dcm"):
        return True
    if len(image_bytes) > 132 and image_bytes[128:132] == b"DICM":
        return True
    if HAS_PYDICOM:
        try:
            pydicom.dcmread(io.BytesIO(image_bytes), stop_before_pixels=True)
            return True
        except Exception:
            return False
    return False


def process_dicom(image_bytes: bytes) -> Tuple[bytes, Dict[str, Any]]:
    """
    Parses a DICOM file, extracts clinical metadata (non-PHI),
    applies VOI windowing/leveling, handles MONOCHROME1/2,
    and returns standardized (png_bytes, sanitized_metadata).
    """
    if not HAS_PYDICOM:
        raise RuntimeError("pydicom is required for DICOM processing. Please run `pip install pydicom`.")

    dcm = pydicom.dcmread(io.BytesIO(image_bytes))

    # 1. Extract Safe Clinical Metadata (Strictly No PHI)
    metadata = {
        "modality": str(getattr(dcm, "Modality", "DX") or "DX").strip(),
        "view_position": str(getattr(dcm, "ViewPosition", "PA") or "PA").strip().upper(),
        "patient_age": str(getattr(dcm, "PatientAge", "") or "").strip(),
        "patient_sex": str(getattr(dcm, "PatientSex", "") or "").strip().upper(),
        "body_part": str(getattr(dcm, "BodyPartExamined", "CHEST") or "CHEST").strip(),
        "is_dicom": True,
    }

    # 2. Extract and Window Pixel Data
    pixels = dcm.pixel_array.astype(np.float32)
    pixels = np.nan_to_num(pixels, nan=0.0, posinf=255.0, neginf=0.0)

    # Apply Rescale Slope / Intercept if present
    slope = getattr(dcm, "RescaleSlope", 1.0)
    intercept = getattr(dcm, "RescaleIntercept", 0.0)
    if slope != 1.0 or intercept != 0.0:
        pixels = pixels * float(slope) + float(intercept)

    # Apply VOI LUT (Window Center / Width) if available
    try:
        pixels = apply_voi_lut(pixels, dcm)
    except Exception:
        pass

    # Normalize to [0, 255]
    p_min, p_max = pixels.min(), pixels.max()
    if p_max - p_min > 1e-6:
        norm_pixels = ((pixels - p_min) / (p_max - p_min) * 255.0).astype(np.uint8)
    else:
        norm_pixels = np.zeros_like(pixels, dtype=np.uint8)

    # Handle Inverted Photometric Interpretation (MONOCHROME1 means 0 is White)
    photo_interp = str(getattr(dcm, "PhotometricInterpretation", "MONOCHROME2")).strip().upper()
    if photo_interp == "MONOCHROME1":
        norm_pixels = 255 - norm_pixels

    # Convert to PIL Grayscale and encode as PNG bytes
    pil_img = Image.fromarray(norm_pixels, mode="L")
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    return png_bytes, metadata
