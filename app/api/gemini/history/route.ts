import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { Type } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { landmarkName, city, country, searchQueries } = await req.json();

    if (!landmarkName || !city || !country) {
      return NextResponse.json({ error: "Missing required landmark parameters" }, { status: 400 });
    }

    const ai = getGeminiClient();

    const queriesString = searchQueries && searchQueries.length > 0 
      ? searchQueries.join(", ") 
      : `${landmarkName} history and facts`;

    const prompt = `Research the deep history, interesting fun facts, and architectural style of the landmark: "${landmarkName}" located in ${city}, ${country}. Use these specific search queries for grounding: ${queriesString}.
    Provide a comprehensive, accurate historical analysis and compile a highly engaging AR audio tour guide narration script (about 120-150 words). The script should be conversational, educational, and invoke a sense of standing right in front of the landmark. Ensure it refers directly to the architectural beauty of the place.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detailedHistory: {
              type: Type.STRING,
              description: "A detailed and engaging history of the landmark, mentioning key historical eras, architects, or events.",
            },
            funFacts: {
              type: Type.ARRAY,
              description: "3 highly interesting, surprising, or lesser-known facts about the landmark.",
              items: { type: Type.STRING },
            },
            narratorScript: {
              type: Type.STRING,
              description: "An immersive, audio-guide narrator script of around 120-150 words. It must be engaging, spoken in the first person of an AR companion, guiding the tourist's eyes and ears.",
            },
          },
          required: ["detailedHistory", "funFacts", "narratorScript"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No text returned from Gemini API");
    }

    const data = JSON.parse(text);

    // Extract Grounding Metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const citations = groundingChunks
      .map((chunk: any) => {
        if (chunk.web) {
          return {
            title: chunk.web.title,
            url: chunk.web.uri,
          };
        }
        return null;
      })
      .filter((c: any) => c !== null);

    // Deduplicate citations by URL
    const uniqueCitations = Array.from(new Map(citations.map((c: any) => [c.url, c])).values());

    return NextResponse.json({
      ...data,
      citations: uniqueCitations,
    });
  } catch (error: any) {
    console.error("Error in history API:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch history" }, { status: 500 });
  }
}
