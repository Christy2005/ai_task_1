import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log("Available Models:");
    console.log("================\n");
    
    data.models.forEach((model) => {
      console.log(`Name: ${model.name}`);
      console.log(`Display Name: ${model.displayName}`);
      console.log(`Supported Methods: ${model.supportedGenerationMethods.join(", ")}`);
      console.log("-".repeat(50));
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
}

listModels();
