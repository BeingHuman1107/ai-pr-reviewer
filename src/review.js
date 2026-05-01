import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// 🔹 Read diff safely
let diff = "";
try {
  diff = fs.readFileSync("diff.txt", "utf-8");
} catch (e) {
  console.log("⚠️ No diff file found");
}

// 🔹 Limit size (avoid API errors)
const trimmedDiff = diff.slice(0, 12000);

// 🔹 Gemini Models (fallback system)
const MODELS = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
  "gemini-1.0-pro"
];

// 🔹 Sleep helper (for retry)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 🔹 Call Gemini API
async function callGemini(model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const response = await axios.post(
    url,
    {
      contents: [
        {
          parts: [
            {
              text: `
You are a senior code reviewer.

Analyze this code and provide:

1. 🔴 Bugs
2. 🔐 Security Issues
3. ⚡ Improvements
4. 📊 Code Quality Score (0–10)
5. 📝 Short Summary

Code:
${trimmedDiff}
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

  return response.data.candidates?.[0]?.content?.parts?.[0]?.text;
}

// 🔹 Retry wrapper
async function retry(fn, retries = 2) {
  try {
    return await fn();
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      console.log("⚠️ Rate limit hit, retrying...");
      await sleep(3000);
      return retry(fn, retries - 1);
    }
    throw error;
  }
}

// 🔹 Main logic with fallback
async function runReview() {
  for (let model of MODELS) {
    try {
      console.log(`🚀 Trying model: ${model}`);

      const review = await retry(() => callGemini(model));

      if (review) {
        return {
          model,
          review
        };
      }

    } catch (error) {
      console.log(`❌ ${model} failed`);
      console.log(error.response?.data || error.message);
    }
  }

  return {
    model: "None",
    review: "❌ All Gemini models failed"
  };
}

// 🔹 Main function
async function main() {
  console.log("🚀 Starting AI Review...");

  const result = await runReview();

  const finalOutput = `
## 🤖 AI Code Review (Gemini)

**Model Used:** ${result.model}

---

${result.review}
`;

  fs.writeFileSync("review.txt", finalOutput);

  console.log("✅ Review generated successfully");
}

main();