import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// 🔹 Read diff safely
let diff = "";
try {
  diff = fs.readFileSync("diff.txt", "utf-8");
} catch {
  console.log("⚠️ diff.txt not found, using fallback");
  diff = "function test(){ return 1 }";
}

// 🔥 LIMIT DIFF SIZE (important for quota)
if (diff.length > 5000) {
  console.log("⚠️ Diff too large, truncating...");
  diff = diff.substring(0, 5000);
}

console.log("📄 Diff length:", diff.length);

// 🔹 Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 🔹 Retry logic (handles 429 quota errors)
async function retry(fn, retries = 3) {
  try {
    return await fn();
  } catch (error) {
    if (error.message?.includes("429") && retries > 0) {
      console.log("⚠️ Rate limit hit. Waiting 5s...");
      await sleep(5000);
      return retry(fn, retries - 1);
    }
    console.log("❌ Error:", error.message);
    return "❌ Error during AI review (quota or API issue)";
  }
}

// 🔹 Gemini Review
async function reviewWithGemini() {
  console.log("🔑 Gemini Key:", process.env.GEMINI_API_KEY ? "Loaded ✅" : "Missing ❌");

  const response = await ai.models.generateContent({
    model: "Gemini 2.5 Flash", // ✅ your working model 
    contents: `
You are a senior code reviewer.

Review the following code and provide:
- Bugs
- Security issues
- Improvements

Code:
${diff}
`,
  });

  return response.text;
}

// 🔹 Main function
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