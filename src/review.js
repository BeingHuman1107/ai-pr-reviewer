import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// 🔹 Read changed files
let files = [];
try {
  const content = fs.readFileSync("files.txt", "utf-8");
  files = content.split("\n").filter(f => f.endsWith(".js"));
} catch {
  console.log("⚠️ files.txt not found");
}

console.log("📂 Changed files:", files);

// 🔹 Read file contents
let codeBundle = "";

for (const file of files) {
  try {
    const code = fs.readFileSync(file, "utf-8");

    codeBundle += `
FILE: ${file}
--------------------
${code}
--------------------
`;
  } catch {
    console.log(`⚠️ Could not read ${file}`);
  }
}

// fallback
if (!codeBundle) {
  codeBundle = "function test(){ return 1 }";
}

// 🔥 limit size
if (codeBundle.length > 6000) {
  console.log("⚠️ Code too large, truncating...");
  codeBundle = codeBundle.substring(0, 6000);
}

console.log("📄 Code size:", codeBundle.length);

// 🔹 Retry
async function retry(fn, retries = 3) {
  try {
    return await fn();
  } catch (error) {
    if (error.message?.includes("429") && retries > 0) {
      console.log("⚠️ Rate limit, retrying...");
      await new Promise(r => setTimeout(r, 5000));
      return retry(fn, retries - 1);
    }
    console.log("❌ Error:", error.message);
    return "AI review failed";
  }
}

// 🔹 Gemini Review
async function reviewWithGemini() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
You are a senior software engineer reviewing a pull request.

Review ONLY the given files.

Provide:

### 🚨 Critical Issues
### ⚠️ Improvements
### 🔐 Security Issues
### ✅ Summary

Code:
${codeBundle}
`,
  });

  return response.text;
}

// 🔹 Main
async function main() {
  console.log("🚀 Starting AI Review...");

  const review = await retry(reviewWithGemini);

  fs.writeFileSync(
    "review.txt",
    `## 🤖 AI Code Review\n\n${review}`
  );

  console.log("✅ Done");
}

main();