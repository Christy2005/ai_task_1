import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

// 1. Initialize with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listAllModels() {
  try {
    console.log("Fetching available models...");
    
    // 2. Call the listModels method
    const result = await genAI.listModels();
    
    // 3. Log the model names and supported methods
    result.models.forEach((model) => {
      console.log(`Model Name: ${model.name}`);
      console.log(`Display Name: ${model.displayName}`);
      console.log(`Supported Methods: ${model.supportedGenerationMethods.join(", ")}`);
      console.log("-".repeat(20));
    });
  } catch (error) {
    console.error("Error listing models:", error.message);
  }
}

listAllModels();