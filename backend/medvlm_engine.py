"""
Gemini Inference Engine
=======================
Architecture : Multimodal Foundation Model
Model Size : Gemini 2.5 Flash
"""

MODEL_METADATA = {
    "name": "Gemini-2.5-Flash",
    "version": "1.0",
    "architecture": "Multimodal Foundation Model",
    "inference_stages": [
        "Image Base64 Encoding",
        "API Request Construction",
        "Running Gemini Inference",
        "Parsing JSON Output",
        "Formatting Structured Report",
    ]
}


def get_model_info() -> dict:
    return MODEL_METADATA


def get_inference_stages() -> list:
    return MODEL_METADATA["inference_stages"]


def get_model_version() -> str:
    return f"{MODEL_METADATA['name']} v{MODEL_METADATA['version']}"
