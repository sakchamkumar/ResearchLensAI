const { GoogleGenAI } = require("@google/genai");

// ============================================================
// GEMINI CLIENT
// ============================================================

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    "GEMINI_API_KEY is missing. Please add it to the backend .env file."
  );
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ============================================================
// HELPER
// ============================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// GENERATE TEXT WITH RETRY
// ============================================================

async function generateWithGemini(prompt, config = {}) {
  const MAX_ATTEMPTS = 5;

  // Exponential backoff:
  // 5s → 10s → 20s → 40s
  const RETRY_DELAYS = [5000, 10000, 20000, 40000];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(
        `Gemini request attempt ${attempt}/${MAX_ATTEMPTS}...`
      );

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config,
      });

      console.log("Gemini request successful.");

      return response.text;
    } catch (error) {
      const status = error?.status;

      console.error(
        `Gemini request failed on attempt ${attempt}:`,
        error
      );

      // ========================================================
      // QUOTA / RATE LIMIT
      // ========================================================

      // Do NOT retry 429 automatically.
      // The route handling the request will return a useful
      // quota message to the user.
      if (status === 429) {
        throw error;
      }

      // ========================================================
      // TEMPORARY SERVER / HIGH DEMAND
      // ========================================================

      if (status === 503 && attempt < MAX_ATTEMPTS) {
        const delay = RETRY_DELAYS[attempt - 1];

        console.log(
          `Gemini is temporarily unavailable. Retrying in ${
            delay / 1000
          } seconds...`
        );

        await sleep(delay);

        continue;
      }

      // ========================================================
      // FINAL ERROR
      // ========================================================

      throw error;
    }
  }

  throw new Error(
    "Gemini request failed after multiple retry attempts."
  );
}

module.exports = generateWithGemini;