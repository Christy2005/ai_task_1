import express from "express";
import multer from "multer";
import { speechToText, extractTaskDetails } from "../services/aiService.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["audio/", "video/mp4"];
    if (allowedTypes.some(type => file.mimetype.startsWith(type))) {
      cb(null, true);
    } else {
      cb(new Error("Only audio/video files allowed"));
    }
  },
});

router.post("/analyze-voice", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    console.log(`🚀 Processing: ${req.file.originalname}`);

    // 1. Transcription
    const transcript = await speechToText(req.file.buffer, req.file.mimetype);
    console.log("📝 Transcript:", transcript);

    // 2. Extraction
    try {
      const extractedRaw = await extractTaskDetails(transcript);
      
      let extractedTasks;
      try {
        // 🛠️ Robust JSON parsing (handles markdown blocks)
        const cleaned = extractedRaw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        
        // Ensure we always return an array
        extractedTasks = Array.isArray(parsed) ? parsed : [parsed];
      } catch (err) {
        console.error("JSON Parse Error:", err.message);
        extractedTasks = [{ title: "New Task", assignee: "Unassigned", priority: "Medium" }];
      }

      res.json({ transcript, extracted: extractedTasks });
    } catch (extractError) {
      console.error("❌ Task Extraction Error:", extractError.message);
      console.error("Full extraction error:", extractError);
      throw extractError;
    }

  } catch (error) {
    console.error("❌ Route Error:", error.message);
    console.error("Full route error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;