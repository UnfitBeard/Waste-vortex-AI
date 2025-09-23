import io
import math
import numpy as np
from PIL import Image, ImageFilter
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- NEW: Swagger ---
from flasgger import Swagger, swag_from

app = Flask(__name__)
CORS(app)

# --- Swagger config (edit title/description as you like) ---
swagger = Swagger(app, template={
    "swagger": "2.0",
    "info": {
        "title": "Waste Contamination Scoring API",
        "description": "Lightweight, explainable contamination scorer (no training needed).",
        "version": "1.0.0"
    },
    "basePath": "/",
    "schemes": ["http"],
    "consumes": ["multipart/form-data", "application/json"],
    "produces": ["application/json"],
    "tags": [
        {"name": "health", "description": "Service health"},
        {"name": "inference", "description": "Image scoring"}
    ],
    "definitions": {
        "PredictResponse": {
            "type": "object",
            "properties": {
                "label": {"type": "string", "enum": ["clean", "low", "medium", "high"]},
                "score": {"type": "number", "format": "float"},
                "probs": {
                    "type": "object",
                    "additionalProperties": {"type": "number", "format": "float"}
                },
                "features": {
                    "type": "object",
                    "properties": {
                        "sat": {"type": "number"},
                        "brown": {"type": "number"},
                        "dark": {"type": "number"},
                        "entropy": {"type": "number"},
                        "edge": {"type": "number"}
                    }
                }
            },
            "required": ["label", "score", "probs", "features"]
        },
        "HealthResponse": {
            "type": "object",
            "properties": {
                "ok": {"type": "boolean"},
                "classes": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        }
    }
})

CLASSES = ["clean", "low", "medium", "high"]


def to_numpy_rgb(img: Image.Image, size=256) -> np.ndarray:
    img = img.convert("RGB").resize((size, size))
    return np.asarray(img).astype(np.float32) / 255.0  # HxWx3 in [0,1]


def rgb_to_hsv_np(rgb: np.ndarray) -> np.ndarray:
    # rgb: HxWx3 in [0,1]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    cmax = np.max(rgb, axis=-1)
    cmin = np.min(rgb, axis=-1)
    delta = cmax - cmin

    h = np.zeros_like(cmax, dtype=np.float32)

    # avoid division by zero
    nonzero = delta > 1e-6

    r_mask = (cmax == r) & nonzero
    g_mask = (cmax == g) & nonzero
    b_mask = (cmax == b) & nonzero

    h[r_mask] = ((g[r_mask] - b[r_mask]) / delta[r_mask]) % 6.0
    h[g_mask] = ((b[g_mask] - r[g_mask]) / delta[g_mask]) + 2.0
    h[b_mask] = ((r[b_mask] - g[b_mask]) / delta[b_mask]) + 4.0

    h = (h / 6.0) % 1.0  # normalize to [0,1)

    s = np.zeros_like(cmax, dtype=np.float32)
    s[cmax > 0] = delta[cmax > 0] / cmax[cmax > 0]

    v = cmax.astype(np.float32)

    return np.stack([h, s, v], axis=-1)


def image_entropy(gray: np.ndarray) -> float:
    hist, _ = np.histogram((gray*255).astype(np.uint8),
                           bins=256, range=(0, 255), density=True)
    hist = hist[hist > 0]
    return float(-np.sum(hist * np.log2(hist)))


def sobel_edges(gray: np.ndarray) -> np.ndarray:
    # Prefer scipy if available
    try:
        from scipy.signal import convolve2d
        Kx = np.array([[1, 0, -1], [2, 0, -2], [1, 0, -1]], dtype=np.float32)
        Ky = np.array([[1, 2, 1], [0, 0, 0], [-1, -2, -1]], dtype=np.float32)
        gx = convolve2d(gray, Kx, mode='same', boundary='symm')
        gy = convolve2d(gray, Ky, mode='same', boundary='symm')
        return np.sqrt(gx*gx + gy*gy)
    except Exception:
        # Fallback to PIL
        pil = Image.fromarray((gray*255).astype(np.uint8)
                              ).filter(ImageFilter.FIND_EDGES)
        return np.asarray(pil).astype(np.float32)/255.0


def brown_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    cond1 = (r > 0.2) & (g > 0.12) & (b < 0.25)
    rg_close = (r - g) < 0.25
    rb_gap = (r - b) > 0.05
    return cond1 & rg_close & rb_gap


def dark_mask(rgb: np.ndarray, thr=0.18) -> np.ndarray:
    v = np.max(rgb, axis=-1)
    return v < thr


def compute_features(rgb: np.ndarray) -> dict:
    hsv = rgb_to_hsv_np(rgb)
    gray = (0.299*rgb[..., 0] + 0.587*rgb[..., 1] +
            0.114*rgb[..., 2]).astype(np.float32)

    sat = float(np.mean(hsv[..., 1]))
    brown = float(np.mean(brown_mask(rgb)))
    dark = float(np.mean(dark_mask(rgb)))
    ent = image_entropy(gray) / 8.0
    edges = sobel_edges(gray)
    edge_density = float(np.mean(edges > 0.2))

    return {"sat": sat, "brown": brown, "dark": dark, "entropy": ent, "edge": edge_density}


def contamination_score(feat: dict) -> float:
    w_sat, w_brown, w_dark, w_ent, w_edge = 0.22, 0.28, 0.12, 0.22, 0.16
    score = (w_sat*feat["sat"] +
             w_brown*feat["brown"] +
             w_dark*feat["dark"] +
             w_ent*feat["entropy"] +
             w_edge*feat["edge"])
    return float(max(0.0, min(1.0, score)))


def label_from_score(score: float) -> str:
    if score < 0.20:
        return "clean"
    if score < 0.45:
        return "low"
    if score < 0.75:
        return "medium"
    return "high"


@app.get("/health")
@swag_from({
    "tags": ["health"],
    "summary": "Health check",
    "responses": {
        "200": {
            "description": "Service status",
            "schema": {"$ref": "#/definitions/HealthResponse"}
        }
    }
})
def health():
    return jsonify({"ok": True, "classes": CLASSES})


@app.post("/predict")
@swag_from({
    "tags": ["inference"],
    "summary": "Score contamination from an image",
    "consumes": ["multipart/form-data"],
    "parameters": [
        {
            "name": "file",
            "in": "formData",
            "required": True,
            "type": "file",
            "description": "Waste photo (jpg/png)"
        }
    ],
    "responses": {
        "200": {
            "description": "Predicted contamination",
            "schema": {"$ref": "#/definitions/PredictResponse"},
            "examples": {
                "application/json": {
                    "label": "medium",
                    "score": 0.58,
                    "probs": {"clean": 0.05, "low": 0.22, "medium": 0.48, "high": 0.25},
                    "features": {"sat": 0.31, "brown": 0.18, "dark": 0.09, "entropy": 0.54, "edge": 0.27}
                }
            }
        },
        "400": {
            "description": "Bad request"
        }
    }
})
def predict():
    if "file" not in request.files:
        return jsonify({"error": "missing file"}), 400
    f = request.files["file"]
    try:
        rgb = to_numpy_rgb(Image.open(io.BytesIO(f.read())))
    except Exception as e:
        return jsonify({"error": f"bad image: {e}"}), 400

    feat = compute_features(rgb)
    score = contamination_score(feat)
    label = label_from_score(score)

    probs = {
        "clean":  float(max(0.0, 1.0 - 3.0*score)),
        "low":    float(max(0.0, 1.5 - abs(score-0.33)*3.0)),
        "medium": float(max(0.0, 1.5 - abs(score-0.66)*3.0)),
        "high":   float(max(0.0, (score-0.66)*3.0)),
    }
    s = sum(probs.values()) or 1.0
    for k in probs:
        probs[k] = float(probs[k]/s)

    return jsonify({"label": label, "score": score, "probs": probs, "features": feat})


if __name__ == "__main__":
    # Open http://localhost:8001/apidocs for Swagger UI
    app.run(host="0.0.0.0", port=8001)
