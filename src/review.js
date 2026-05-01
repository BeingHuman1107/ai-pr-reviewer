import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const diff = fs.readFileSync("diff.txt", "utf-8");

// 🔹 Utility: sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 🔹 Retry wrapper
async function retry(fn, retries = 3) {
  try {
    return await fn();
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      console.log("⚠️ Rate limit hit. Retrying...");
      await sleep(3000);
      return retry(fn, retries - 1);
    }
    console.error("❌ API Error:", error.message);
    return "Error during AI review";
  }
}

// 🔹 ChatGPT Review
async function reviewWithChatGPT() {
  console.log("API KEY:", process.env.OPENAI_API_KEY ? "Loaded ✅" : "Missing ❌");

  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Review this code for bugs, security issues and improvements:\n${diff}`
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    }
  );

  return res.data.choices[0].message.content;
}

// 🔹 Gemini Review
async function reviewWithGemini() {
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [{ text: `Review this code:\n${diff}` }]
        }
      ]
    }
  );

  return JSON.stringify(res.data, null, 2);
}

async function main() {
  console.log("🚀 Starting AI Review...");

  const chatgpt = await retry(reviewWithChatGPT);

  await sleep(2000); // prevent rate limit

  const gemini = await retry(reviewWithGemini);

  const finalReview = `
## 🤖 AI Code Review

### ChatGPT:
${chatgpt}

---

### Gemini:
${gemini}
`;

  fs.writeFileSync("review.txt", finalReview);

  console.log("✅ Review generated successfully");
}

main();