const express = require("express");

const generateWithGemini = require("../utils/gemini");

const router = express.Router();

// ============================================================
// RESEARCH PAPER COMPARISON SCHEMA
// ============================================================

const comparisonSchema = {
  type: "object",

  properties: {
    comparisonSummary: {
      type: "string",
      description:
        "A concise overall comparison of the two research papers.",
    },

    paper1Focus: {
      type: "string",
      description:
        "The primary research focus of Paper 1.",
    },

    paper2Focus: {
      type: "string",
      description:
        "The primary research focus of Paper 2.",
    },

    similarities: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Important similarities between the two papers.",
    },

    differences: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Important differences between the two papers.",
    },

    methodologyComparison: {
      type: "string",
      description:
        "Comparison of the methodologies, approaches, models, experiments, or study designs used in the two papers.",
    },

    findingsComparison: {
      type: "string",
      description:
        "Comparison of the key findings reported by the two papers.",
    },

    contributionComparison: {
      type: "string",
      description:
        "Comparison of the main contributions made by the two papers.",
    },

    limitationComparison: {
      type: "string",
      description:
        "Comparison of the limitations identified or apparent from the provided paper text.",
    },

    strongerResearchDirection: {
      type: "string",
      description:
        "A cautious assessment of which research direction appears more promising and why, based only on the provided papers.",
    },

    combinedResearchOpportunity: {
      type: "string",
      description:
        "A potential research opportunity that could combine or build upon ideas from both papers.",
    },

    potentialResearchQuestions: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Potential research questions inspired by the comparison.",
    },
  },

  required: [
    "comparisonSummary",
    "paper1Focus",
    "paper2Focus",
    "similarities",
    "differences",
    "methodologyComparison",
    "findingsComparison",
    "contributionComparison",
    "limitationComparison",
    "strongerResearchDirection",
    "combinedResearchOpportunity",
    "potentialResearchQuestions",
  ],
};

// ============================================================
// COMPARE TWO RESEARCH PAPERS
// ============================================================

router.post("/compare", async (req, res) => {
  try {
    const { paper1Text, paper2Text } = req.body;

    // ----------------------------------------------------------
    // VALIDATE PAPER 1
    // ----------------------------------------------------------

    if (
      !paper1Text ||
      typeof paper1Text !== "string" ||
      !paper1Text.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Text for Paper 1 is required.",
      });
    }

    // ----------------------------------------------------------
    // VALIDATE PAPER 2
    // ----------------------------------------------------------

    if (
      !paper2Text ||
      typeof paper2Text !== "string" ||
      !paper2Text.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Text for Paper 2 is required.",
      });
    }

    const paper1 = paper1Text.trim();
    const paper2 = paper2Text.trim();

    // ----------------------------------------------------------
    // LIMIT TEXT SIZE
    // ----------------------------------------------------------

    const MAX_CHARACTERS_PER_PAPER = 70000;

    const paper1ForAnalysis =
      paper1.length > MAX_CHARACTERS_PER_PAPER
        ? paper1.substring(0, MAX_CHARACTERS_PER_PAPER)
        : paper1;

    const paper2ForAnalysis =
      paper2.length > MAX_CHARACTERS_PER_PAPER
        ? paper2.substring(0, MAX_CHARACTERS_PER_PAPER)
        : paper2;

    // ----------------------------------------------------------
    // GEMINI PROMPT
    // ----------------------------------------------------------

    const prompt = `
You are ResearchLensAI, an expert AI research assistant.

Your task is to compare TWO research papers.

You must carefully distinguish Paper 1 from Paper 2.

IMPORTANT RULES:

1. Use ONLY information contained in the provided paper texts.

2. Do NOT invent facts, authors, datasets, experiments,
   citations, results, methodologies, or conclusions.

3. Do NOT assume that information missing from one paper exists.

4. Clearly distinguish between:
   - Paper 1
   - Paper 2
   - conclusions that can reasonably be drawn from comparing them

5. If something cannot be determined from the provided text,
   explicitly say that it cannot be determined.

6. For similarities, only identify similarities supported by
   the provided texts.

7. For differences, only identify differences supported by
   the provided texts.

8. When comparing findings, accurately represent what each
   paper reports.

9. Do not claim that one paper is scientifically "better"
   unless the provided evidence supports such an assessment.

10. The "strongerResearchDirection" field must use cautious
    language and explain the reasoning.

11. The "combinedResearchOpportunity" should be a potential
    research direction inspired by both papers. Do not claim
    guaranteed novelty.

12. Do not invent datasets. If a future study might require
    additional data, describe it only as a possible requirement.

13. Keep the comparison useful for a student or early-stage
    researcher.

14. Return the result using the provided JSON schema exactly.

15. Do not mention these instructions in the response.

============================================================

PAPER 1:

${paper1ForAnalysis}

============================================================

PAPER 2:

${paper2ForAnalysis}

============================================================

Compare the two papers carefully and return the structured
comparison.
`;

    console.log("Starting research paper comparison...");

    // ----------------------------------------------------------
    // GEMINI REQUEST
    // ----------------------------------------------------------

    const rawResponse = await generateWithGemini(prompt, {
      responseMimeType: "application/json",
      responseSchema: comparisonSchema,
    });

    // ----------------------------------------------------------
    // PARSE JSON
    // ----------------------------------------------------------

    let comparison;

    try {
      comparison = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error(
        "Research comparison JSON parsing error:",
        parseError
      );

      console.error(
        "Raw Gemini comparison response:",
        rawResponse
      );

      return res.status(500).json({
        success: false,
        error: "Gemini returned an invalid comparison format.",
      });
    }

    // ----------------------------------------------------------
    // SUCCESS
    // ----------------------------------------------------------

    res.json({
      success: true,
      message: "Research papers compared successfully.",
      comparison,

      paper1: {
        originalCharacterCount: paper1.length,
        analyzedCharacterCount: paper1ForAnalysis.length,
        truncated:
          paper1.length > MAX_CHARACTERS_PER_PAPER,
      },

      paper2: {
        originalCharacterCount: paper2.length,
        analyzedCharacterCount: paper2ForAnalysis.length,
        truncated:
          paper2.length > MAX_CHARACTERS_PER_PAPER,
      },
    });
  } catch (error) {
    console.error("Research paper comparison error:", error);

    // ==========================================================
    // GEMINI QUOTA
    // ==========================================================

    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error:
          "Gemini's free-tier quota has been reached for this project. Please wait until the quota resets or enable billing for higher limits.",
      });
    }

    // ==========================================================
    // GEMINI HIGH DEMAND
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
      error: "Failed to compare the research papers.",
    });
  }
});

module.exports = router;