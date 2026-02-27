import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 🎤 Deepgram Speech → Text
export async function speechToText(audioBuffer, mimeType) {
  const response = await fetch("https://api.deepgram.com/v1/listen?smart_format=true", {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      "Content-Type": mimeType,
    },
    body: audioBuffer,
  });

  const data = await response.json();
  
  // 🛡️ Robust check for transcription results
  if (!data.results || !data.results.channels[0].alternatives[0]) {
      console.error("Deepgram Error:", JSON.stringify(data, null, 2));
      throw new Error("Deepgram transcription failed.");
  }

  return data.results.channels[0].alternatives[0].transcript;
}

// 🤖 Gemini Text → Task Extraction
export async function extractTaskDetails(text) {
  // 1. 🛡️ Check if key exists
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables");
  }

  // 2. ✅ Initialize SDK inside function scope (Fixes 400 Bad Request)
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // 3. ✅ FIX: Use the latest available model with full path (Fixes 404 Not Found)
  const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

  const prompt = `
    Analyze the following transcript and extract ALL tasks mentioned.
    If multiple tasks/people are mentioned, return an ARRAY of objects.
    Return ONLY valid JSON.
    
    Format:
    [
      {
        "title": "...",
        "assignee": "...",
        "dueDate": "YYYY-MM-DD or empty",
        "priority": "Low | Medium | High"
      }
    ]

    Transcript: "${text}"
  `;

  try {
    console.log("🤖 Calling Gemini API with model: models/gemini-2.5-flash");
    const result = await model.generateContent(prompt);
    console.log("✅ Gemini API Response received");
    
    if (!result || !result.response) {
      throw new Error("No response from Gemini API");
    }
    
    const responseText = result.response.text();
    console.log("📄 Response text length:", responseText.length);
    return responseText;
  } catch (error) {
    console.error("❌ Gemini API Error:", error.message);
    console.error("Full error:", error);
    throw error;
  }
}