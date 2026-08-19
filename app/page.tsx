"use client";

import { useState } from "react";

type Result = {
  issue: string;
  severity_label: string;
  impact_label: string;
  urgency_label: string;

  visual_severity: number;
  safety_risk: number;
  public_impact: number;
  urgency: number;

  priority_score: number;
  priority_level: string;
  confidence: number;

  visual_observations: string[];
  reported_facts: string[];

  reasoning: string;
  recommendation: string;
};

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleImage(file: File | undefined) {
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function analyze() {
    if (!image) {
      setError("Upload foto terlebih dahulu.");
      return;
    }

    if (!description.trim()) {
      setError("Masukkan deskripsi masalah.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      formData.append("image", image);
      formData.append("description", description);
      formData.append("location", location);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analisis gagal.");
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: 20,
        fontFamily: "Arial",
      }}
    >
      <h1>CivicAI</h1>

      <p>
        AI-powered public problem prioritization.
      </p>

      <hr />

      <h2>Laporkan Masalah</h2>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => handleImage(e.target.files?.[0])}
      />

      {preview && (
        <div style={{ marginTop: 20 }}>
          <img
            src={preview}
            alt="Preview"
            style={{
              width: "100%",
              maxWidth: 500,
              borderRadius: 12,
            }}
          />
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <label>Deskripsi</label>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Contoh: Jalan ini rusak parah dan sudah menyebabkan kecelakaan. Minggu lalu terdapat korban jiwa..."
          style={{
            width: "100%",
            minHeight: 130,
            marginTop: 8,
            padding: 12,
          }}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <label>Lokasi</label>

        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Contoh: Jalan Melati, Depok"
          style={{
            width: "100%",
            padding: 12,
            marginTop: 8,
          }}
        />
      </div>

      <button
        onClick={analyze}
        disabled={loading}
        style={{
          marginTop: 20,
          padding: "14px 24px",
          cursor: "pointer",
        }}
      >
        {loading
          ? "AI sedang menganalisis..."
          : "Analisis dengan CivicAI"}
      </button>

      {error && (
        <div
          style={{
            marginTop: 20,
            padding: 15,
            background: "#fee",
            color: "#900",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <section style={{ marginTop: 40 }}>
          <h2>AI Assessment</h2>

          <h3>{result.issue}</h3>

          <h1>
            {result.priority_score}/100
          </h1>

          <strong>
            {result.priority_level}
          </strong>

          <hr />

          <h3>AI Factors</h3>

          <p>
            Visual Severity:{" "}
            <strong>{result.visual_severity}</strong>
          </p>

          <p>
            Safety Risk:{" "}
            <strong>{result.safety_risk}</strong>
          </p>

          <p>
            Public Impact:{" "}
            <strong>{result.public_impact}</strong>
          </p>

          <p>
            Urgency:{" "}
            <strong>{result.urgency}</strong>
          </p>

          <p>
            Confidence:{" "}
            <strong>{Math.round(result.confidence * 100)}%</strong>
          </p>

          <hr />

          <h3>Yang Terlihat di Foto</h3>

          <ul>
            {result.visual_observations.map(
              (item, index) => (
                <li key={index}>{item}</li>
              )
            )}
          </ul>

          <h3>Fakta dari Laporan</h3>

          <ul>
            {result.reported_facts.map(
              (item, index) => (
                <li key={index}>{item}</li>
              )
            )}
          </ul>

          <h3>Alasan</h3>

          <p>{result.reasoning}</p>

          <h3>Rekomendasi</h3>

          <p>{result.recommendation}</p>
        </section>
      )}
    </main>
  );
}