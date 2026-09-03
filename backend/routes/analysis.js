const express = require("express");

const generateWithGemini = require("../utils/gemini");

const router = express.Router();

// ============================================================
// RESEARCH PAPER ANALYSIS SCHEMA
// ============================================================

const researchAnalysisSchema = {
  type: "object",

  properties: {
    paperTitle: {
      type: "string",
      description:
        "The title of the research paper. If unavailable, say Unknown.",
    },

    executiveSummary: {
      type: "string",
      description:
        "A concise but informative summary of the entire research paper.",
    },

    researchQuestion: {
      type: "string",
      description:
        "The main research question, problem, or objective addressed by the paper.",
    },

    methodology: {
      type: "string",
      description:
        "A clear explanation of the methodology, experiments, datasets, models, theoretical approach, or research methods used.",
    },

    keyFindings: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "The most important findings or results reported in the paper.",
    },

    mainContributions: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "The main contributions the paper makes to its field.",
    },

    strengths: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Important strengths of the research.",
    },

    limitations: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Limitations explicitly stated or clearly identifiable from the provided paper text.",
    },

    futureWork: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Future research directions mentioned by the authors.",
    },

    importantConcepts: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Important technical or scientific concepts a reader should understand.",
    },

    simpleExplanation: {
      type: "string",
      description:
        "An easy-to-understand explanation of the paper for a student who understands the general subject but is not an expert.",
    },

    overallAssessment: {
      type: "string",
      description:
        "A balanced overall assessment of the research based only on the provided text.",
    },
  },

  required: [
    "paperTitle",
    "executiveSummary",
    "researchQuestion",
    "methodology",
    "keyFindings",
    "mainContributions",
    "strengths",
    "limitations",
    "futureWork",
    "importantConcepts",
    "simpleExplanation",
    "overallAssessment",
  ],
};

// ============================================================
// RESEARCH GAP SCHEMA
// ============================================================

const researchGapSchema = {
  type: "object",

  properties: {
    overallGap: {
      type: "string",
      description:
        "The most important overall research gap identified from the paper.",
    },

    gaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short title describing the research gap.",
          },

          description: {
            type: "string",
            description:
              "Detailed explanation of what is missing, unexplored, or insufficiently addressed.",
          },

          evidence: {
            type: "string",
            description:
              "Evidence from the paper text supporting why this is a research gap.",
          },

          importance: {
            type: "string",
            description:
              "Why addressing this gap could matter to the research field.",
          },

          researchOpportunity: {
            type: "string",
            description:
              "A practical research opportunity that could address the gap.",
          },
        },

        required: [
          "title",
          "description",
          "evidence",
          "importance",
          "researchOpportunity",
        ],
      },
    },

    potentialResearchQuestions: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Potential research questions derived directly from the identified gaps.",
    },

    suggestedExperiments: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Possible experiments, evaluations, datasets, comparisons, or studies that could investigate the gaps.",
    },

    noveltyOpportunities: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Potential directions where new or improved research could contribute something novel.",
    },
  },

  required: [
    "overallGap",
    "gaps",
    "potentialResearchQuestions",
    "suggestedExperiments",
    "noveltyOpportunities",
  ],
};

// ============================================================
// TEST GEMINI ROUTE
// ============================================================

router.get("/test", async (req, res) => {
  try {
    const response = await generateWithGemini(
      "Say exactly: ResearchLensAI Gemini connection is working!"
    );

    res.json({
      success: true,
      message: response,
    });
  } catch (error) {
    console.error("Gemini test error:", error);

    res.status(500).json({
      success: false,
      error: "Gemini API request failed.",
    });
  }
});

// ============================================================
// RESEARCH PAPER ANALYSIS
// ============================================================

router.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body;

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

    const prompt = `
You are an expert research-paper analyst working inside an application called ResearchLensAI.

Analyze the research paper text provided below.

Your analysis must be based ONLY on the provided paper text.

Do not invent:
- facts
- research results
- datasets
- methodologies
- citations
- conclusions
- author claims

If information is not available in the paper text, clearly say that it was not identified.

IMPORTANT:

The output must follow the provided JSON schema exactly.

For arrays:
- Use concise but informative bullet-style strings.
- Do not create empty arrays unless the information truly cannot be identified.
- If limitations are not stated or identifiable, use:
  ["Limitations were not clearly stated in the provided text."]

- If future work is not mentioned, use:
  ["No specific future work was identified in the provided text."]

For the paper title:
- If the title cannot be identified, use:
  "Unknown"

For every section:
- Be factual.
- Preserve important technical terminology.
- Do not hallucinate information.
- Distinguish the authors' reported findings from your own interpretation.

RESEARCH PAPER TEXT:

${textForAnalysis}
`;

    console.log("Starting structured AI analysis...");

    const rawResponse = await generateWithGemini(prompt, {
      responseMimeType: "application/json",
      responseSchema: researchAnalysisSchema,
    });

    let analysis;

    try {
      analysis = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error("Gemini JSON parsing error:", parseError);
      console.error("Raw Gemini response:", rawResponse);

      return res.status(500).json({
        success: false,
        error: "Gemini returned an invalid analysis format.",
      });
    }

    res.json({
      success: true,
      message: "Research paper analyzed successfully.",
      analysis,
      truncated: paperText.length > MAX_CHARACTERS,
      originalCharacterCount: paperText.length,
      analyzedCharacterCount: textForAnalysis.length,
    });
  } catch (error) {
    console.error("Research paper analysis error:", error);

    if (error.status === 503) {
      return res.status(503).json({
        success: false,
        error:
          "Gemini is currently experiencing high demand. Please try again in a moment.",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to analyze the research paper with Gemini.",
    });
  }
});

// ============================================================
// RESEARCH GAP DETECTION
// ============================================================

router.post("/gaps", async (req, res) => {
  try {
    const { text } = req.body;

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

    const prompt = `
You are an expert research scientist and research-gap analyst working inside ResearchLensAI.

Your task is to identify meaningful research gaps and future research opportunities from the provided research paper.

IMPORTANT:

Your analysis MUST be grounded ONLY in the provided research paper text.

Do NOT invent:
- facts
- results
- datasets
- experiments
- citations
- author statements
- limitations
- future work
- research claims

You may identify a research gap through careful reasoning based on what the paper actually reports, but clearly distinguish reasonable inference from something explicitly stated by the authors.

Look carefully at:

1. The research problem
2. Existing approaches discussed in the paper
3. The methodology
4. Dataset characteristics
5. Experimental design
6. Evaluation methods
7. Results
8. Limitations
9. Future work
10. Areas that were explicitly excluded or left unexplored

A strong research gap should describe something that is:

- unexplored
- insufficiently studied
- limited by the current methodology
- limited by the available data
- not evaluated adequately
- applicable only to a narrow setting
- potentially improvable
- explicitly identified as future work

Do NOT label something as a research gap merely because it would be interesting.

For every identified gap:

- Give it a short title.
- Explain exactly what is missing.
- Provide evidence from the paper text.
- Explain why the gap matters.
- Suggest a realistic research opportunity.

Potential research questions should be directly derived from the identified gaps.

Suggested experiments should be realistic and connected to the paper's research area.

Novelty opportunities should be conservative and evidence-based.

If the paper does not provide enough information to identify a particular type of gap, do not invent one.

Return the result using the provided JSON schema exactly.

------------------------------------------------------------

RESEARCH PAPER TEXT:

${textForAnalysis}

------------------------------------------------------------

Analyze the paper now.
`;

    console.log("Starting research gap detection...");

    const rawResponse = await generateWithGemini(prompt, {
      responseMimeType: "application/json",
      responseSchema: researchGapSchema,
    });

    let gaps;

    try {
      gaps = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error("Research gap JSON parsing error:", parseError);
      console.error("Raw Gemini response:", rawResponse);

      return res.status(500).json({
        success: false,
        error: "Gemini returned an invalid research-gap format.",
      });
    }

    res.json({
      success: true,
      message: "Research gaps detected successfully.",
      gaps,
      truncated: paperText.length > MAX_CHARACTERS,
      originalCharacterCount: paperText.length,
      analyzedCharacterCount: textForAnalysis.length,
    });
  } catch (error) {
    console.error("Research gap detection error:", error);

    if (error.status === 503) {
      return res.status(503).json({
        success: false,
        error:
          "Gemini is currently experiencing high demand. Please try again in a moment.",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to detect research gaps.",
    });
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = router;