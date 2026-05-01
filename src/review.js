import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Read diff
let diff = "";
try {
  diff = fs.readFileSync("diff.txt", "utf-8");
} catch {
  diff = "function test(){ return 1 }";
}

// Retry helper
async function retry(fn, retries = 3) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.log("⚠️ Retrying...");
      await new Promise(r => setTimeout(r, 2000));
      return retry(fn, retries - 1);
    }
    console.log("❌ Error:", error.message);
    return "Error during AI review";
  }
}

// Gemini Review
async function reviewWithGemini() {
  console.log("🔑 Gemini Key:", process.env.GEMINI_API_KEY ? "Loaded ✅" : "Missing ❌");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
You are a senior code reviewer.

Analyze this code and provide:
1. Bugs
2. Security issues
3. Improvements

Code:
${diff}
`,
  });

  return response.text;
}

// Main
async function main() {
  console.log("🚀 Starting Gemini AI Review...");

  const review = await retry(reviewWithGemini);

  fs.writeFileSync(
    "review.txt",
    `
## 🤖 AI Code Review (Gemini)

${review}
`
  );

  console.log("✅ Review generated successfully");
}

main();