import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { Modality } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { script } = await req.json();

    if (!script) {
      return NextResponse.json({ error: "Missing script content for TTS" }, { status: 400 });
    }

    const ai = getGeminiClient();

    // Use gemini-3.1-flash-tts-preview to convert text to speech
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say in an expressive, cheerful, clear, and professional tour-guide voice: ${script}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // 'Puck' (male, friendly), 'Charon' (deep, authoritative), 'Kore' (female, clear/warm), 'Fenrir', 'Zephyr'
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini TTS model");
    }

    return NextResponse.json({
      audio: base64Audio,
    });
  } catch (error: any) {
    console.error("Error in TTS API:", error);
    return NextResponse.json({ error: error.message || "Failed to generate text-to-speech audio" }, { status: 500 });
  }
}
