import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const image = formData.get("image") as File | null;
    const description = String(formData.get("description") || "");
    const location = String(formData.get("location") || "");

    if (!image) {
      return NextResponse.json(
        { error: "Foto belum diberikan." },
        { status: 400 }
      );
    }

    if (!description.trim()) {
      return NextResponse.json(
        { error: "Deskripsi belum diberikan." },
        { status: 400 }
      );
    }

    // Batasi ukuran upload
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran foto maksimal 5 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const base64Image = buffer.toString("base64");

    const prompt = `
Kamu adalah CivicAI, sebuah AI untuk membantu menentukan
prioritas penanganan masalah publik.

Tugas kamu adalah menganalisis:
1. FOTO yang diberikan
2. DESKRIPSI laporan warga
3. LOKASI yang diberikan

PENTING:
- Nilai kondisi FISIK berdasarkan apa yang benar-benar terlihat pada foto.
- Jangan mengarang fakta yang tidak terlihat.
- Informasi seperti kecelakaan, korban jiwa, durasi masalah,
  atau jumlah orang terdampak hanya boleh dianggap berasal dari
  laporan/deskripsi warga.
- Bedakan antara fakta visual dan klaim dari warga.
- Jangan menganggap bahwa foto membuktikan adanya korban jiwa.
- Jika sesuatu tidak dapat dipastikan dari foto, katakan tidak dapat dipastikan.

LAPORAN WARGA:
${description}

LOKASI:
${location || "Tidak diberikan"}

Nilai faktor berikut dari 0 sampai 100:

visual_severity:
Seberapa parah kondisi fisik yang terlihat pada foto.

safety_risk:
Seberapa besar risiko keselamatan publik berdasarkan foto + deskripsi.

public_impact:
Seberapa besar masyarakat dapat terdampak.

urgency:
Seberapa mendesak masalah tersebut untuk ditangani berdasarkan
kondisi, konteks, dan konsekuensi yang dilaporkan.

Kemudian tentukan:
- issue
- severity_label
- impact_label
- urgency_label
- priority_score
- priority_level
- visual_observations
- reported_facts
- reasoning
- recommendation

Priority score harus dihitung berdasarkan:

visual_severity * 0.25
+
safety_risk * 0.35
+
public_impact * 0.20
+
urgency * 0.20

Jangan memberikan skor berdasarkan jumlah kata tertentu.
Gunakan keseluruhan konteks.

Kembalikan HANYA JSON valid dengan struktur:

{
  "issue": "",
  "severity_label": "",
  "impact_label": "",
  "urgency_label": "",
  "visual_severity": 0,
  "safety_risk": 0,
  "public_impact": 0,
  "urgency": 0,
  "priority_score": 0,
  "priority_level": "",
  "confidence": 0,
  "visual_observations": [],
  "reported_facts": [],
  "reasoning": "",
  "recommendation": ""
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: image.type,
                data: base64Image,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    let text = response.text || "";

    // Bersihkan markdown JSON jika model mengembalikannya
    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const result = JSON.parse(text);

    // Validasi sederhana
    const factors = [
      result.visual_severity,
      result.safety_risk,
      result.public_impact,
      result.urgency,
    ];

    if (factors.some((x: unknown) => typeof x !== "number")) {
      throw new Error("AI mengembalikan faktor scoring yang tidak valid.");
    }

    // Score FINAL dihitung oleh aplikasi,
    // bukan mempercayai angka total dari AI.
    const priorityScore = Math.round(
      result.visual_severity * 0.25 +
      result.safety_risk * 0.35 +
      result.public_impact * 0.20 +
      result.urgency * 0.20
    );

    let priorityLevel = "LOW";

    if (priorityScore >= 80) {
      priorityLevel = "CRITICAL";
    } else if (priorityScore >= 60) {
      priorityLevel = "HIGH";
    } else if (priorityScore >= 40) {
      priorityLevel = "MEDIUM";
    }

    return NextResponse.json({
      ...result,
      priority_score: priorityScore,
      priority_level: priorityLevel,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat menganalisis laporan.",
      },
      { status: 500 }
    );
  }
}