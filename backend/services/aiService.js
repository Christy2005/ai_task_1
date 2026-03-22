import https from "https";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("aiService");

// ─── Speech → Text ────────────────────────────────────────────────
export async function speechToText(inputBuffer, mimeType) {
  if (!process.env.DEEPGRAM_API_KEY) {
    throw new Error("DEEPGRAM_API_KEY missing");
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.deepgram.com",
      path: "/v1/listen?model=nova-2&smart_format=true",
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": mimeType || "audio/webm",
        "Content-Length": inputBuffer.length,
      },
      timeout: 120000,
    };

    const req = https.request(options, (res) => {
      const chunks = [];

      res.on("data", (chunk) => chunks.push(chunk));

      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");

        if (res.statusCode !== 200) {
          return reject(new Error(body));
        }

        const data = JSON.parse(body);

        const transcript =
          data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;

        if (!transcript) {
          return reject(new Error("No transcript"));
        }

        resolve(transcript);
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout"));
    });

    req.write(inputBuffer);
    req.end();
  });
}

// ─── TASK EXTRACTION (STRICT) ────────────────────────────────────────────────
export async function extractTaskDetails(text) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY missing");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: "models/gemini-2.5-flash",
  });

  const prompt = `
Extract tasks from transcript.

STRICT RULES:
- Title: max 5 words
- No transcript copying
- No long explanations
- Keep output concise

Return ONLY JSON array.

Format:
[
  {
    "title": "short title",
    "assignee": "",
    "dueDate": "",
    "priority": "Low | Medium | High"
  }
]

Transcript:
"${text}"
`;

  const result = await model.generateContent(prompt);

  if (!result?.response) {
    throw new Error("No response from Gemini");
  }

  return result.response.text();
}

// ─── SUMMARY ────────────────────────────────────────────────
export async function generateMeetingSummary(text) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: "models/gemini-2.5-flash",
  });

  const prompt = `
Summarize the meeting into bullet points.

Transcript:
"${text}"
`;

  const result = await model.generateContent(prompt);

  if (!result?.response) {
    throw new Error("No response");
  }

  return result.response.text();
}