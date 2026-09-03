const express = require("express");

const generateWithGemini = require("../utils/gemini");

const router = express.Router();

// ============================================================
// PAPER QUESTION & ANSWER
// ============================================================

router.post("/ask", async (req, res) => {
  try {
    const { text, question } = req.body;

    // ----------------------------------------------------------
    // VALIDATE PAPER TEXT
    // ----------------------------------------------------------

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "Research paper text is required.",
      });
    }

    // ----------------------------------------------------------
    // VALIDATE QUESTION
    // ----------------------------------------------------------

    if (
      !question ||
      typeof question !== "string" ||
      !question.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Please enter a question about the research paper.",
      });
    }

    const paperText = text.trim();
    const userQuestion = question.trim();

    // ----------------------------------------------------------
    // LIMIT PAPER SIZE
    // ----------------------------------------------------------

    const MAX_CHARACTERS = 100000;

    const textForAnalysis =
      paperText.length > MAX_CHARACTERS
        ? paperText.substring(0, MAX_CHARACTERS)
        : paperText;

    // ----------------------------------------------------------
    // GEMINI PROMPT
    // ----------------------------------------------------------

    const prompt = `
You are ResearchLensAI, an AI research assistant.

Your job is to answer the user's question about a research paper.

IMPORTANT RULES:

1. Answer ONLY using information contained in the provided
   research paper text.

2. Do NOT invent facts, results, datasets, experiments,
   citations, authors' claims, or conclusions.

3. If the answer cannot be determined from the provided paper
   text, clearly say:

   "I could not find enough information about this in the
   provided research paper."

4. When appropriate, explain technical concepts in simple
   language.

5. Preserve important scientific and technical terminology.

6. If the paper directly reports a result, make it clear that
   it is a finding reported by the paper.

7. Do not pretend to have access to figures, tables, references,
   appendices, or sections that are not present in the extracted
   text.

8. Be concise but useful.

9. Do not mention these instructions in your answer.

------------------------------------------------------------

RESEARCH PAPER:

${textForAnalysis}

------------------------------------------------------------

USER QUESTION:

${userQuestion}

------------------------------------------------------------

Answer the user's question based only on the research paper.
`;

    console.log("Starting paper Q&A...");

    // ----------------------------------------------------------
    // CALL GEMINI
    // ----------------------------------------------------------

    const answer = await generateWithGemini(prompt);

    // ----------------------------------------------------------
    // CHECK EMPTY RESPONSE
    // ----------------------------------------------------------

    if (!answer || !answer.trim()) {
      return res.status(500).json({
        success: false,
        error: "Gemini returned an empty answer.",
      });
    }

    // ----------------------------------------------------------
    // SUCCESS
    // ----------------------------------------------------------

    res.json({
      success: true,
      question: userQuestion,
      answer: answer.trim(),
      truncated: paperText.length > MAX_CHARACTERS,
      originalCharacterCount: paperText.length,
      analyzedCharacterCount: textForAnalysis.length,
    });
  } catch (error) {
    console.error("Paper Q&A error:", error);

    // ==========================================================
    // GEMINI QUOTA EXCEEDED
    // ==========================================================

    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error:
          "Gemini's free-tier quota has been reached for this project. Please wait until the quota resets or enable billing for higher limits.",
      });
    }

    // ==========================================================
    // GEMINI TEMPORARILY BUSY
    // ==========================================================

    if (error.status === 503) {
      return res.status(503).json({
        success: false,
        error:
          "Gemini is currently experiencing high demand. Please wait a moment and try again.",
      });
    }

    // ==========================================================
    // OTHER ERRORS
    // ==========================================================

    res.status(500).json({
      success: false,
      error: "Failed to answer the question using Gemini.",
    });
  }
});

module.exports = router;