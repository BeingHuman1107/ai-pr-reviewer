import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const diff = fs.readFileSync("diff.txt", "utf-8");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry(fn, retries = 3) {
  try {
    return await fn();
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      console.log("⚠️ Rate limit hit. Retrying...");
      await sleep(3000);
      return retry(fn, retries - 1);
    }
   console.error("❌ Full Error:", error.response?.data || error.message);
    return "Error during AI review";
  }
}

async function reviewWithGemini() { 

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [{
            text: `
You are a senior code reviewer.

Analyze this code and give:
1. Bugs
2. Security issues
3. Improvements

Code:
${diff}
`
          }]
        }
      ]
    }
  );

  return res.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";
}

async function main() {
  console.log("🚀 Starting Gemini AI Review...");

  const review = await retry(reviewWithGemini);

  fs.writeFileSync("review.txt", `
## 🤖 AI Code Review (Gemini)

${review}
`);

  console.log("✅ Review generated successfully");
}

main();