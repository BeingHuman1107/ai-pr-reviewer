import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const diff = fs.readFileSync("diff.txt", "utf-8");

// 🔹 ChatGPT Review
async function reviewWithChatGPT() {
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
  const chatgpt = await reviewWithChatGPT();
  const gemini = await reviewWithGemini();

  const finalReview = `
## 🤖 AI Code Review

### ChatGPT:
${chatgpt}

---

### Gemini:
${gemini}
`;

  fs.writeFileSync("review.txt", finalReview);
}

main();