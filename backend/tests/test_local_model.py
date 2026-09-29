"""
MedVLM — Local Neural Network & DICOM Processing Tests
Verifies TorchXRayVision DenseNet-121 inference, Grad-CAM generation,
DICOM normalization, and thread safety.
"""

import io
import threading
import numpy as np
from PIL import Image
import pytest
import pydicom
from pydicom.dataset import Dataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, SecondaryCaptureImageStorage, generate_uid

import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from local_model import preprocess_image, predict_xray, generate_gradcam
from dicom_utils import is_dicom_file, process_dicom


def _create_synthetic_dicom() -> bytes:
    """Creates a minimal valid synthetic DICOM dataset in memory."""
    meta = FileMetaDataset()
    meta.MediaStorageSOPClassUID = SecondaryCaptureImageStorage
    meta.MediaStorageSOPInstanceUID = generate_uid()
    meta.TransferSyntaxUID = ExplicitVRLittleEndian

    ds = Dataset()
    ds.file_meta = meta
    ds.is_little_endian = True
    ds.is_implicit_VR = False

    ds.SOPClassUID = SecondaryCaptureImageStorage
    ds.SOPInstanceUID = meta.MediaStorageSOPInstanceUID
    ds.Modality = "DX"
    ds.ViewPosition = "PA"
    ds.PatientAge = "048Y"
    ds.PatientSex = "F"
    ds.BodyPartExamined = "CHEST"
    ds.PatientName = "DOE^JANE"  # PHI that MUST be scrubbed

    ds.Rows = 128
    ds.Columns = 128
    ds.BitsAllocated = 16
    ds.BitsStored = 12
    ds.HighBit = 11
    ds.PixelRepresentation = 0
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.SamplesPerPixel = 1

    # Synthetic chest gradient
    arr = (np.random.rand(128, 128) * 2000).astype(np.uint16)
    ds.PixelData = arr.tobytes()

    buf = io.BytesIO()
    pydicom.dcmwrite(buf, ds, write_like_original=False)
    return buf.getvalue()


def test_png_preprocessing():
    """Verify standard PNG bytes are converted into valid 4D TorchXRayVision tensor."""
    img = Image.new("L", (300, 300), color=100)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    tensor, orig_size, std_bytes, meta = preprocess_image(png_bytes)
    assert tensor.shape == (1, 1, 224, 224)
    assert orig_size == (300, 300)
    assert meta.get("is_dicom") is False


def test_dicom_processing_and_phi_scrubbing():
    """Verify synthetic DICOM is detected, converted to PNG, and PHI is scrubbed."""
    dcm_bytes = _create_synthetic_dicom()
    assert is_dicom_file(dcm_bytes, "chest.dcm") is True

    png_bytes, meta = process_dicom(dcm_bytes)
    assert len(png_bytes) > 0
    # Safe metadata preserved
    assert meta["modality"] == "DX"
    assert meta["view_position"] == "PA"
    assert meta["patient_age"] == "048Y"
    assert meta["patient_sex"] == "F"
    # Strict PHI check: ensure patient name is not exposed in metadata
    assert "patient_name" not in meta
    assert "DOE" not in str(meta)


def test_gradcam_generation():
    """Verify Grad-CAM returns a valid PNG data URL for target pathology."""
    img = Image.new("L", (224, 224), color=150)
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    heatmap_url = generate_gradcam(buf.getvalue(), target_pathology="Cardiomegaly")
    assert heatmap_url.startswith("data:image/png;base64,")


def test_concurrent_gradcam_thread_safety():
    """Verify multiple simultaneous Grad-CAM requests do not trigger race conditions."""
    img = Image.new("L", (224, 224), color=120)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    img_bytes = buf.getvalue()

    results = []
    errors = []

    def worker(cond):
        try:
            res = generate_gradcam(img_bytes, target_pathology=cond)
            results.append(res)
        except Exception as e:
            errors.append(e)

    threads = [
        threading.Thread(target=worker, args=(cond,))
        for cond in ["Cardiomegaly", "Effusion", "Pneumothorax", "Consolidation"]
    ]

    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0
    assert len(results) == 4
    for r in results:
        assert r.startswith("data:image/png;base64,")
