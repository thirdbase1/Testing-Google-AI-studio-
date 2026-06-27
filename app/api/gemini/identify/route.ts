import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { Type } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    // Parse base64 string and mimeType
    let mimeType = "image/jpeg";
    let base64Data = image;

    if (image.includes(";base64,")) {
      const parts = image.split(";base64,");
      mimeType = parts[0].replace("data:", "");
      base64Data = parts[1];
    }

    const ai = getGeminiClient();

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: "Identify the city landmark in this photo. Be as precise as possible. If there is no specific landmark, identify the general city square, street, or architectural style visible. Provide approximate 2D coordinates (x, y as percentages from 0 to 100) for visual elements or key features to display as AR hotspots on the image. Generate exactly 3 relevant search queries for deep historical context grounding.",
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            landmarkName: {
              type: Type.STRING,
              description: "The name of the identified landmark, e.g., 'Big Ben' or 'Eiffel Tower'.",
            },
            city: {
              type: Type.STRING,
              description: "The city where it is located.",
            },
            country: {
              type: Type.STRING,
              description: "The country where it is located.",
            },
            coordinates: {
              type: Type.STRING,
              description: "Exact coordinates (latitude, longitude) of the landmark, e.g., '51.5007° N, 0.1246° W'.",
            },
            shortDescription: {
              type: Type.STRING,
              description: "A brief, highly engaging 2-sentence description of the landmark.",
            },
            keyFeatures: {
              type: Type.ARRAY,
              description: "Key architectural or visible features of the landmark with x/y coordinate placements (0-100% of the image) for AR overlays.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the feature, e.g., 'Elizabeth Tower Dial', 'Gothic Pinnacles'." },
                  description: { type: Type.STRING, description: "One-sentence fascinating architectural detail about this feature." },
                  x: { type: Type.NUMBER, description: "Horizontal percentage (0-100) from the left edge of the image where this feature is located." },
                  y: { type: Type.NUMBER, description: "Vertical percentage (0-100) from the top edge of the image where this feature is located." },
                },
                required: ["name", "description", "x", "y"],
              },
            },
            searchQueries: {
              type: Type.ARRAY,
              description: "3 precise search queries used to fetch historical detail, e.g., ['history of Big Ben bell casting', 'Elizabeth Tower architecture', 'Palace of Westminster reconstruction'].",
              items: { type: Type.STRING },
            },
          },
          required: ["landmarkName", "city", "country", "coordinates", "shortDescription", "keyFeatures", "searchQueries"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response text returned from Gemini API");
    }

    const data = JSON.parse(resultText);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in identify API:", error);
    return NextResponse.json({ error: error.message || "Failed to identify landmark" }, { status: 500 });
  }
}
