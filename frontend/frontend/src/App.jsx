import React, { useRef, useState } from "react";
import axios from "axios";
import "./index.css";

export default function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pred, setPred] = useState(null);
  const fileRef = useRef();

  // change if backend runs at another host/port
  const API_URL = "http://127.0.0.1:8000/predict";

  function onFilePicked(f) {
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setPred(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) onFilePicked(f);
  }
  function handleDragOver(e) { e.preventDefault(); }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (f) onFilePicked(f);
  }

  // Upload button action: open file picker (does not send to backend)
  function handleUploadClick() {
    if (fileRef.current) fileRef.current.click();
  }

  // Predict: send selected file to backend
  async function handlePredict() {
    if (!file) {
      alert("Please select an audio file first.");
      return;
    }
    setLoading(true);
    setPred(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await axios.post(API_URL, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      setPred(res.data?.prediction ?? JSON.stringify(res.data));
    } catch (err) {
      console.error(err);
      alert("Prediction failed — check backend and CORS. See console.");
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setFile(null);
    setPreviewUrl(null);
    setPred(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="page">
      <div className="card">

        {/* Header */}
        <div className="card-header">
          <button className="back-btn" onClick={() => { /* optional nav */ }}>⟵</button>
          <div className="card-title">Audio Upload</div>
        </div>

        {/* Drop area */}
        <div
          className="drop-area"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileRef.current && fileRef.current.click()}
        >
          <input
            ref={fileRef}
            className="hidden-input"
            type="file"
            accept="audio/*,.wav"
            onChange={handleFileChange}
          />

          <div className="upload-visual">
            <svg width="88" height="88" fill="none" viewBox="0 0 24 24" aria-hidden>
              <path d="M7 8l5-5 5 5" stroke="#2B3440" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M12 3v13" stroke="#2B3440" strokeWidth="1.6" strokeLinecap="round"/>
              <rect x="4" y="13" width="16" height="8" rx="2" stroke="#D1D5DB" strokeWidth="1.2"/>
            </svg>
          </div>

          <div className="upload-text">
            <div className="upload-title">Upload an audio file</div>
            <div className="upload-sub">Drag and drop an audio file or browse</div>
          </div>

          <div className="upload-cta">
            {/* Upload opens file dialog only */}
            <button className="btn-primary" onClick={handleUploadClick}>
              Upload
            </button>
          </div>
        </div>

        {/* preview + predict area */}
        <div className="bottom-area">
          <div className="preview">
            {file ? (
              <>
                <audio controls src={previewUrl} className="audio-player" />
                <div className="meta">
                  <div className="meta-name">{file.name}</div>
                  <div className="meta-size">{(file.size/1024).toFixed(1)} KB</div>
                </div>
              </>
            ) : <div className="meta-empty">No file selected</div>}
          </div>

          <div className="result">
            <div className="result-label">Prediction</div>
            <div className="result-value">{pred ?? "—"}</div>

            <div className="action-row">
              <button
                className="btn-primary"
                onClick={handlePredict}
                disabled={!file || loading}
              >
                {loading ? "Predicting..." : "Predict"}
              </button>

              <button className="btn-secondary" onClick={clearAll}>
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
