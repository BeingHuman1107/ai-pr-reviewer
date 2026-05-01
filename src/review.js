import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Read diff
let diff = "";
try {
  diff = fs.readFileSync("diff.txt", "utf-8");
} catch (e) {
  console.log("⚠️ diff.txt not found, using fallback");
  diff = "function test(){ return 1 }";
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry logic
async function retry(fn, retries = 3) {
  try {
    return await fn();
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      console.log("⚠️ Rate limit hit. Retrying...");
      await sleep(3000);
      return retry(fn, retries - 1);
    }

    console.log("❌ Gemini Error:", error.response?.status, error.message);
    return "❌ Error during AI review";
  }
}

// ✅ WORKING Gemini API (latest stable)
async function reviewWithGemini() {
  console.log("🔑 Gemini Key:", process.env.GEMINI_API_KEY ? "Loaded ✅" : "Missing ❌");

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text: `
You are a senior code reviewer.

Analyze this code and provide:
1. Bugs
2. Security issues
3. Improvements

Code:
${diff}
`
            }
          ]
        }
      ]
    },
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  return res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";
}

// Main
async function main() {
  console.log("🚀 Starting Gemini AI Review...");

  console.log("📄 DIFF LENGTH:", diff.length);

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