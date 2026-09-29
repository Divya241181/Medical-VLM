"""
MedVLM — Local Neural Network Engine (TorchXRayVision DenseNet-121)
Provides real-time clinical pathology inference and Grad-CAM saliency maps.
Trained on CheXpert, MIMIC-CXR, NIH ChestX-ray14, and PadChest datasets.
Includes thread-safe model execution and DICOM input normalization.
"""

import io
import base64
import threading
from typing import Tuple, Dict, Any

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
import cv2
import torchxrayvision as xrv

from dicom_utils import is_dicom_file, process_dicom

_model = None
_model_lock = threading.Lock()
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def get_model():
    """Singleton getter for the pre-trained DenseNet-121 model."""
    global _model
    with _model_lock:
        if _model is None:
            # Load weights (cached in ~/.torchxrayvision/models_data)
            _model = xrv.models.DenseNet(weights="densenet121-res224-all")
            _model.to(_device)
            _model.eval()
    return _model


def preprocess_image(image_bytes: bytes, filename: str = "") -> Tuple[torch.Tensor, Tuple[int, int], bytes, Dict[str, Any]]:
    """
    Checks if input is DICOM or standard image.
    Normalizes to grayscale, resizes to 224x224, and scales to [-1024, 1024]
    as expected by torchxrayvision.
    Returns: (tensor, orig_size, standardized_png_bytes, metadata)
    """
    metadata: Dict[str, Any] = {"is_dicom": False}
    standardized_bytes = image_bytes

    if is_dicom_file(image_bytes, filename):
        standardized_bytes, dcm_meta = process_dicom(image_bytes)
        metadata.update(dcm_meta)

    img = Image.open(io.BytesIO(standardized_bytes)).convert("L")
    orig_size = img.size  # (width, height)
    img_224 = img.resize((224, 224), Image.Resampling.BILINEAR)
    arr = np.array(img_224, dtype=np.float32)

    # Scale to [-1024, 1024]
    norm = (2.0 * (arr / 255.0) - 1.0) * 1024.0
    tensor = torch.from_numpy(norm).unsqueeze(0).unsqueeze(0).float().to(_device)
    return tensor, orig_size, standardized_bytes, metadata


def predict_xray(image_bytes: bytes, filename: str = "") -> Dict[str, Any]:
    """
    Runs DenseNet-121 inference on the uploaded X-ray (PNG/JPG or DICOM).
    Thread-safe execution. Returns calibrated scores, detected pathologies, and initial Grad-CAM.
    """
    model = get_model()
    tensor, orig_size, std_bytes, metadata = preprocess_image(image_bytes, filename)

    with _model_lock:
        with torch.no_grad():
            out = model(tensor)[0].detach().cpu().numpy()

    # Map outputs to all pathologies
    pathology_scores = {}
    detected_list = []
    for name, score in zip(model.pathologies, out):
        val = float(np.clip(score, 0.0, 1.0))
        pathology_scores[name] = round(val, 4)
        detected_list.append({
            "condition": name,
            "score": round(val, 3),
            "status": "abnormal" if val >= 0.40 else "normal",
        })

    # Sort detected list by score descending
    detected_list.sort(key=lambda x: x["score"], reverse=True)

    # Map to schema-specific confidence scores
    conf_scores = {
        "opacity": round(float(pathology_scores.get("Lung Opacity", 0.0)), 2),
        "cardiomegaly": round(float(pathology_scores.get("Cardiomegaly", 0.0)), 2),
        "effusion": round(float(pathology_scores.get("Effusion", 0.0)), 2),
        "pneumothorax": round(float(pathology_scores.get("Pneumothorax", 0.0)), 2),
        "consolidation": round(float(pathology_scores.get("Consolidation", 0.0)), 2),
    }

    # Generate initial Grad-CAM for top abnormal condition or Cardiomegaly
    top_cond = detected_list[0]["condition"] if detected_list else "Cardiomegaly"
    heatmap_b64 = generate_gradcam(std_bytes, target_pathology=top_cond)

    return {
        "confidence_scores": conf_scores,
        "detected_pathologies": detected_list,
        "top_condition": top_cond,
        "heatmap_data_url": heatmap_b64,
        "all_pathologies": pathology_scores,
        "standardized_png_bytes": std_bytes,
        "metadata": metadata,
    }


def generate_gradcam(image_bytes: bytes, target_pathology: str = "Cardiomegaly", filename: str = "") -> str:
    """
    Generates a Grad-CAM saliency heatmap for the specified pathology.
    Thread-safe with explicit lock to prevent concurrent backward pass races.
    Returns a transparent RGBA PNG encoded as a base64 data URL.
    """
    model = get_model()
    tensor, _, _, _ = preprocess_image(image_bytes, filename)
    tensor.requires_grad = True

    with _model_lock:
        # Forward pass up to feature extraction
        features = model.features(tensor)
        features.retain_grad()

        # Continue forward pass through pooling and classification
        pooled = F.relu(features, inplace=False)
        pooled = F.adaptive_avg_pool2d(pooled, (1, 1)).view(features.size(0), -1)
        logits = model.classifier(pooled)
        probs = torch.sigmoid(logits)

        # Resolve target pathology index
        if target_pathology in model.pathologies:
            idx = model.pathologies.index(target_pathology)
        else:
            idx = int(torch.argmax(probs[0]).item())

        # Backward pass for gradients
        model.zero_grad()
        probs[0, idx].backward()

        # Compute weighted activation map
        grad = features.grad
        weights = torch.mean(grad, dim=[2, 3], keepdim=True)
        cam = torch.relu(torch.sum(weights * features, dim=1)).squeeze().detach().cpu().numpy()

        # Clean up model gradients
        model.zero_grad()

    # Normalize CAM to [0, 1]
    cam_min, cam_max = cam.min(), cam.max()
    if cam_max - cam_min > 1e-8:
        cam = (cam - cam_min) / (cam_max - cam_min)
    else:
        cam = np.zeros_like(cam)

    # Resize to standard heatmap resolution (512x512)
    cam_uint8 = np.uint8(255 * cam)
    cam_resized = cv2.resize(cam_uint8, (512, 512), interpolation=cv2.INTER_CUBIC)

    # Apply Jet thermal colormap (blue -> cyan -> yellow -> red)
    colored = cv2.applyColorMap(cam_resized, cv2.COLORMAP_JET)

    # Create transparent RGBA: low intensity (< 0.20) is fully transparent
    b, g, r = cv2.split(colored)
    norm_cam = cam_resized.astype(np.float32) / 255.0
    alpha = np.clip((norm_cam - 0.20) / 0.80, 0.0, 1.0) * 210.0
    alpha = alpha.astype(np.uint8)

    rgba = cv2.merge([r, g, b, alpha])
    pil_rgba = Image.fromarray(rgba, "RGBA")

    # Encode to PNG base64
    buffer = io.BytesIO()
    pil_rgba.save(buffer, format="PNG")
    b64_str = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64_str}"
