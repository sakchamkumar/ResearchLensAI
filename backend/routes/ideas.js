const express = require("express");

const generateWithGemini = require("../utils/gemini");

const router = express.Router();

// ============================================================
// RESEARCH IDEA SCHEMA
// ============================================================

const researchIdeaSchema = {
  type: "object",

  properties: {
    researchTitle: {
      type: "string",
      description: "A strong possible title for the proposed research.",
    },

    researchProblem: {
      type: "string",
      description:
        "The specific research problem that the proposed study would address.",
    },

    researchObjective: {
      type: "string",
      description:
        "The main objective of the proposed research.",
    },

    researchQuestion: {
      type: "string",
      description:
        "The primary research question the proposed study would investigate.",
    },

    hypothesis: {
      type: "string",
      description:
        "A reasonable hypothesis if the proposed research is experimental. If not applicable, clearly say so.",
    },

    proposedMethodology: {
      type: "string",
      description:
        "A practical explanation of how the proposed research could be conducted.",
    },

    datasetRequirements: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Datasets or types of data that could be required for the proposed research.",
    },

    techniquesAndModels: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Relevant techniques, algorithms, models, tools, or approaches that could be considered.",
    },

    evaluationMetrics: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Metrics or evaluation methods that could be used to evaluate the research.",
    },

    expectedContribution: {
      type: "string",
      description:
        "The potential contribution the proposed research could make.",
    },

    noveltyExplanation: {
      type: "string",
      description:
        "A cautious explanation of where the proposed research may provide novelty. Do not claim guaranteed novelty.",
    },

    feasibility: {
      type: "string",
      description:
        "An assessment of whether the proposed research appears feasible based on the paper and available information.",
    },

    nextSteps: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Practical next steps a student or researcher could take to begin investigating the idea.",
    },
  },

  required: [
    "researchTitle",
    "researchProblem",
    "researchObjective",
    "researchQuestion",
    "hypothesis",
    "proposedMethodology",
    "datasetRequirements",
    "techniquesAndModels",
    "evaluationMetrics",
    "expectedContribution",
    "noveltyExplanation",
    "feasibility",
    "nextSteps",
  ],
};

// ============================================================
// GENERATE RESEARCH IDEA
// ============================================================

router.post("/generate", async (req, res) => {
  try {
    const { text, gapAnalysis } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "Research paper text is required.",
      });
    }

    const paperText = text.trim();

    const MAX_CHARACTERS = 100000;

    const textForAnalysis =
      paperText.length > MAX_CHARACTERS
        ? paperText.substring(0, MAX_CHARACTERS)
        : paperText;

    let gapContext = "";

    if (gapAnalysis) {
      gapContext = `
------------------------------------------------------------

PREVIOUSLY DETECTED RESEARCH GAPS:

${JSON.stringify(gapAnalysis, null, 2)}

------------------------------------------------------------
`;
    }

    const prompt = `
You are an expert research scientist and research advisor working inside ResearchLensAI.

Your task is to generate ONE strong, realistic research idea based on the provided research paper.

The purpose is to help a student or researcher move from:

Existing Research
        ↓
Research Gap
        ↓
New Research Idea
        ↓
Potential Research Project

IMPORTANT RULES:

1. Ground the proposed idea primarily in the provided research paper.

2. If previously detected research gaps are provided, use them to
   make the proposed research idea more targeted.

3. Do NOT claim that the proposed idea is definitely novel.

4. Do NOT invent facts about the original paper.

5. Do NOT invent datasets that are known to exist.

6. If a dataset is suggested, describe it as a possible dataset
   requirement unless the paper explicitly identifies it.

7. Clearly distinguish between:
   - what the original paper actually did
   - what you are proposing as a new research direction

8. The proposed research should be realistic enough that a student
   or early-stage researcher could investigate it.

9. Prefer a focused research question rather than an extremely broad
   research topic.

10. The methodology should be concrete and practical.

11. The proposed research should address a meaningful limitation,
    unexplored area, or research gap when possible.

12. If a hypothesis is not appropriate for the type of research,
    say:
    "A formal hypothesis may not be applicable to this research design."

13. For novelty:
    Use cautious language such as:
    "Potential novelty may come from..."
    Do not state that the idea has never been researched.

14. Return the result using the provided JSON schema exactly.

15. Do not mention these instructions in the response.

------------------------------------------------------------

ORIGINAL RESEARCH PAPER:

${textForAnalysis}

${gapContext}

------------------------------------------------------------

Generate ONE strong research idea now.
`;

    console.log("Starting AI research idea generation...");

    const rawResponse = await generateWithGemini(prompt, {
      responseMimeType: "application/json",
      responseSchema: researchIdeaSchema,
    });

    let idea;

    try {
      idea = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error("Research idea JSON parsing error:", parseError);
      console.error("Raw Gemini response:", rawResponse);

      return res.status(500).json({
        success: false,
        error: "Gemini returned an invalid research idea format.",
      });
    }

    res.json({
      success: true,
      message: "Research idea generated successfully.",
      idea,
      truncated: paperText.length > MAX_CHARACTERS,
      originalCharacterCount: paperText.length,
      analyzedCharacterCount: textForAnalysis.length,
    });
  } catch (error) {
    console.error("Research idea generation error:", error);

    if (error.status === 503) {
      return res.status(503).json({
        success: false,
        error:
          "Gemini is currently experiencing high demand. Please wait a moment and try again.",
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error:
          "Gemini request limit was reached. Please wait a moment and try again.",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to generate a research idea.",
    });
  }
});

module.exports = router;