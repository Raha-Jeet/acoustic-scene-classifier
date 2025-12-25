# backend/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import joblib
import tempfile
import sys
import os

# allow importing feature_extraction from ../ml
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ml"))
try:
    from feature_extraction import extract_features
except Exception as e:
    raise ImportError(f"Could not import feature_extraction from ../ml: {e}")

app = FastAPI(title="ASC - Acoustic Scene Classifier")

# CORS (allow frontend dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load saved pipeline (model, scaler, label encoder)
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "model_ensemble.pkl")
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file not found at {MODEL_PATH}. Please copy model_ensemble.pkl into backend/model/")

pipeline = joblib.load(MODEL_PATH)
# pipeline expected keys: 'model', 'scaler', 'label_encoder'
model = pipeline.get("model")
scaler = pipeline.get("scaler")
label_enc = pipeline.get("label_encoder")

if model is None or scaler is None or label_enc is None:
    raise RuntimeError("Loaded pipeline is missing required keys ('model','scaler','label_encoder').")

@app.get("/")
def root():
    return {"status": "ASC backend running. Use /docs to test the /predict endpoint."}

@app.post("/predict")
async def predict_audio(file: UploadFile = File(...)):
    # basic validation
    if not file.filename.lower().endswith((".wav", ".mp3", ".flac", ".aiff")):
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a WAV/MP3/FLAC/AIFF file.")

    # read and write to a temporary file
    contents = await file.read()
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        # extract features (feature_extraction.extract_features should return 1D array)
        feats = extract_features(tmp_path)
        if feats is None:
            raise HTTPException(status_code=500, detail="Feature extraction failed for uploaded file.")

        feats = np.asarray(feats).reshape(1, -1)

        # scale and predict
        feats_scaled = scaler.transform(feats)
        pred_idx = model.predict(feats_scaled)
        label = label_enc.inverse_transform(pred_idx)[0]

        return {"prediction": label}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error during prediction: {e}")
    finally:
        # cleanup temp file
        try:
            if "tmp_path" in locals() and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass
