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
// GENERATE TEXT WITH RETRY
// ============================================================

async function generateWithGemini(prompt, config = {}) {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `Gemini request attempt ${attempt}/${MAX_RETRIES}...`
      );

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config,
      });

      console.log("Gemini request successful.");

      return response.text;
    } catch (error) {
      console.error(
        `Gemini request failed on attempt ${attempt}:`,
        error
      );

      const status = error?.status;

      // --------------------------------------------------------
      // QUOTA EXCEEDED
      // --------------------------------------------------------
      // Do NOT retry 429 errors.
      // A quota error will not be fixed by immediately sending
      // the same request again.
      // --------------------------------------------------------

      if (status === 429) {
        throw error;
      }

      // --------------------------------------------------------
      // RETRY TEMPORARY SERVER / HIGH-DEMAND ERRORS
      // --------------------------------------------------------

      if (status === 503 && attempt < MAX_RETRIES) {
        const delay = attempt * 3000;

        console.log(
          `Gemini temporarily unavailable. Retrying in ${
            delay / 1000
          } seconds...`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, delay)
        );

        continue;
      }

      // --------------------------------------------------------
      // FINAL ERROR
      // --------------------------------------------------------

      throw error;
    }
  }

  throw new Error("Gemini request failed after multiple attempts.");
}

module.exports = generateWithGemini;