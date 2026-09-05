import { useState } from "react";
import axios from "axios";
import API_BASE_URL from "./config";

function App() {
  const [file, setFile] = useState(null);
  const [paper, setPaper] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // ============================================================
  // RESEARCH GAP STATE
  // ============================================================

  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [detectingGaps, setDetectingGaps] = useState(false);
  const [gapError, setGapError] = useState("");

  // ============================================================
  // RESEARCH IDEA STATE
  // ============================================================

  const [researchIdea, setResearchIdea] = useState(null);
  const [generatingIdea, setGeneratingIdea] = useState(false);
  const [ideaError, setIdeaError] = useState("");

  // ============================================================
  // PAPER Q&A STATE
  // ============================================================

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);
  const [qaError, setQaError] = useState("");

  // ============================================================
  // RESEARCH PAPER COMPARISON STATE
  // ============================================================

  const [comparisonPaper1, setComparisonPaper1] = useState(null);
  const [comparisonPaper2, setComparisonPaper2] = useState(null);

  const [comparisonFile1, setComparisonFile1] = useState(null);
  const [comparisonFile2, setComparisonFile2] = useState(null);

  const [uploadingComparison1, setUploadingComparison1] = useState(false);
  const [uploadingComparison2, setUploadingComparison2] = useState(false);

  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [comparisonError, setComparisonError] = useState("");

  const [error, setError] = useState("");

  // ============================================================
  // LANDING PAGE / WORKSPACE NAVIGATION
  // ============================================================

  const [showLanding, setShowLanding] = useState(true);
  const [companyPage, setCompanyPage] = useState(null);

  const openCompanyPage = (page) => {
    setCompanyPage(page);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const closeCompanyPage = () => {
    setCompanyPage(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  // ============================================================
  // RESEARCH DASHBOARD STATE
  // ============================================================

  const [dashboardStats, setDashboardStats] = useState(() => {
    try {
      const saved = localStorage.getItem("researchLensDashboardStats");
      return saved
        ? JSON.parse(saved)
        : {
            papersAnalyzed: 0,
            gapsDetected: 0,
            ideasGenerated: 0,
            comparisons: 0,
            questionsAsked: 0,
          };
    } catch {
      return {
        papersAnalyzed: 0,
        gapsDetected: 0,
        ideasGenerated: 0,
        comparisons: 0,
        questionsAsked: 0,
      };
    }
  });

  const [recentActivity, setRecentActivity] = useState(() => {
    try {
      const saved = localStorage.getItem("researchLensRecentActivity");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const recordActivity = (type, title) => {
    const now = new Date();
    const activity = {
      id: Date.now(),
      type,
      title,
      time: now.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    setRecentActivity((previous) => {
      const updated = [activity, ...previous].slice(0, 6);
      localStorage.setItem(
        "researchLensRecentActivity",
        JSON.stringify(updated)
      );
      return updated;
    });
  };

  const incrementDashboardStat = (key, activityType, title) => {
    setDashboardStats((previous) => {
      const updated = {
        ...previous,
        [key]: (previous[key] || 0) + 1,
      };
      localStorage.setItem(
        "researchLensDashboardStats",
        JSON.stringify(updated)
      );
      return updated;
    });

    recordActivity(activityType, title);
  };

  // ============================================================
  // RESEARCH HISTORY STATE
  // ============================================================

  const [researchHistory, setResearchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("researchLensResearchHistory");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeHistoryId, setActiveHistoryId] = useState(null);

  const saveResearchHistory = (entry) => {
    setResearchHistory((previous) => {
      const updated = [entry, ...previous].slice(0, 10);
      localStorage.setItem(
        "researchLensResearchHistory",
        JSON.stringify(updated)
      );
      return updated;
    });
  };

  const updateResearchHistory = (historyId, changes) => {
    setResearchHistory((previous) => {
      const updated = previous.map((item) =>
        item.id === historyId ? { ...item, ...changes } : item
      );

      localStorage.setItem(
        "researchLensResearchHistory",
        JSON.stringify(updated)
      );

      return updated;
    });
  };

  const deleteResearchHistory = (historyId) => {
    setResearchHistory((previous) => {
      const updated = previous.filter((item) => item.id !== historyId);
      localStorage.setItem(
        "researchLensResearchHistory",
        JSON.stringify(updated)
      );
      return updated;
    });

    if (activeHistoryId === historyId) {
      setActiveHistoryId(null);
    }
  };

  const openResearchHistory = (historyItem) => {
    setActiveHistoryId(historyItem.id);
    setFile(null);
    setPaper({
      originalName: historyItem.fileName,
      pageCount: historyItem.pageCount || 0,
      characterCount: historyItem.characterCount || 0,
    });
    setAnalysis(historyItem.analysis || null);
    setGapAnalysis(historyItem.gapAnalysis || null);
    setResearchIdea(historyItem.researchIdea || null);
    setQuestion("");
    setMessages([]);
    setQaError("");
    setError("");

    // Scroll to the restored analysis instead of returning to the top.
    setTimeout(() => {
      document.getElementById("analysis-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  // ============================================================
  // SELECT PDF
  // ============================================================

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
      setFile(null);
      setError("");
      return;
    }

    // Validate PDF format
    if (selectedFile.type !== "application/pdf") {
      setFile(null);
      setError("Please select a PDF research paper.");

      event.target.value = "";
      return;
    }

    // Validate maximum file size: 10 MB
    if (selectedFile.size > 10 * 1024 * 1024) {
      setFile(null);
      setError("PDF file must be smaller than 10 MB.");

      event.target.value = "";
      return;
    }

    setFile(selectedFile);
    setActiveHistoryId(null);
    setPaper(null);
    setAnalysis(null);

    setGapAnalysis(null);
    setGapError("");

    setResearchIdea(null);
    setIdeaError("");

    setQuestion("");
    setMessages([]);
    setQaError("");

    setError("");
  };

  // ============================================================
  // UPLOAD PDF
  // ============================================================

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF research paper first.");
      return;
    }

    setUploading(true);
    setError("");

    setPaper(null);
    setAnalysis(null);

    setGapAnalysis(null);
    setGapError("");

    setResearchIdea(null);
    setIdeaError("");

    setQuestion("");
    setMessages([]);
    setQaError("");

    try {
      const formData = new FormData();
      formData.append("paper", file);

      const response = await axios.post(
        `${API_BASE_URL}/papers/upload`,
        formData
      );

      if (response.data.success) {
        setPaper(response.data.paper);
      } else {
        setError("Failed to upload the research paper.");
      }
    } catch (error) {
      console.error("Upload error:", error);

      setError(
        error.response?.data?.error ||
          "Something went wrong while uploading the PDF."
      );
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // ANALYZE PAPER
  // ============================================================

  const handleAnalyze = async () => {
    if (!paper?.text) {
      setError("Please upload a research paper first.");
      return;
    }

    setAnalyzing(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/analysis/analyze`,
        {
          text: paper.text,
        }
      );

      if (response.data.success) {
        setAnalysis(response.data.analysis);

        const historyEntry = {
          id: Date.now(),
          fileName: paper.originalName || "Research paper",
          pageCount: paper.pageCount || 0,
          characterCount: paper.characterCount || 0,
          analyzedAt: new Date().toISOString(),
          analysis: response.data.analysis,
          gapAnalysis: null,
          researchIdea: null,
        };

        setActiveHistoryId(historyEntry.id);
        saveResearchHistory(historyEntry);

        incrementDashboardStat(
          "papersAnalyzed",
          "analysis",
          paper.originalName || "Research paper analyzed"
        );
      } else {
        setError("Failed to analyze the research paper.");
      }
    } catch (error) {
      console.error("Analysis error:", error);

      setError(
        error.response?.data?.error ||
          "Something went wrong while analyzing the paper."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // ============================================================
  // DETECT RESEARCH GAPS
  // ============================================================

  const handleDetectGaps = async () => {
    if (!paper?.text) {
      setGapError("Please upload a research paper first.");
      return;
    }

    setDetectingGaps(true);
    setGapError("");
    setGapAnalysis(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/analysis/gaps`,
        {
          text: paper.text,
        }
      );

      if (response.data.success) {
        setGapAnalysis(response.data.gaps);

        if (activeHistoryId) {
          updateResearchHistory(activeHistoryId, {
            gapAnalysis: response.data.gaps,
          });
        }

        incrementDashboardStat(
          "gapsDetected",
          "gap",
          paper.originalName || "Research gaps detected"
        );
      } else {
        setGapError(
          response.data.error ||
            "Failed to detect research gaps."
        );
      }
    } catch (error) {
      console.error("Research gap error:", error);

      if (error.response?.status === 503) {
        setGapError(
          "Gemini is currently experiencing high demand. Please wait a moment and try again."
        );
      } else {
        setGapError(
          error.response?.data?.error ||
            "Something went wrong while detecting research gaps."
        );
      }
    } finally {
      setDetectingGaps(false);
    }
  };

  // ============================================================
  // GENERATE RESEARCH IDEA
  // ============================================================

  const handleGenerateResearchIdea = async () => {
    if (!paper?.text) {
      setIdeaError("Please upload a research paper first.");
      return;
    }

    setGeneratingIdea(true);
    setIdeaError("");
    setResearchIdea(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/ideas/generate`,
        {
          text: paper.text,
          gapAnalysis: gapAnalysis,
        }
      );

      if (response.data.success) {
        setResearchIdea(response.data.idea);

        if (activeHistoryId) {
          updateResearchHistory(activeHistoryId, {
            researchIdea: response.data.idea,
          });
        }

        incrementDashboardStat(
          "ideasGenerated",
          "idea",
          response.data.idea?.researchTitle || "Research idea generated"
        );
      } else {
        setIdeaError(
          response.data.error ||
            "Failed to generate a research idea."
        );
      }
    } catch (error) {
      console.error("Research idea error:", error);

      if (error.response?.status === 503) {
        setIdeaError(
          "Gemini is currently experiencing high demand. Please wait a moment and try again."
        );
      } else if (error.response?.status === 429) {
        setIdeaError(
          "Gemini request limit was reached. Please wait a moment and try again."
        );
      } else {
        setIdeaError(
          error.response?.data?.error ||
            "Something went wrong while generating the research idea."
        );
      }
    } finally {
      setGeneratingIdea(false);
    }
  };

  // ============================================================
  // ASK QUESTION ABOUT PAPER
  // ============================================================

  const handleAskQuestion = async () => {
    const trimmedQuestion = question.trim();

    if (!paper?.text) {
      setQaError("Please upload a research paper first.");
      return;
    }

    if (!trimmedQuestion) {
      setQaError("Please enter a question about the research paper.");
      return;
    }

    setAsking(true);
    setQaError("");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/qa/ask`,
        {
          text: paper.text,
          question: trimmedQuestion,
        }
      );

      if (response.data.success) {
        incrementDashboardStat(
          "questionsAsked",
          "qa",
          trimmedQuestion
        );

        setMessages((previousMessages) => [
          ...previousMessages,
          {
            role: "user",
            content: trimmedQuestion,
          },
          {
            role: "assistant",
            content: response.data.answer,
          },
        ]);

        setQuestion("");
      } else {
        setQaError(
          response.data.error ||
            "Failed to get an answer from Gemini."
        );
      }
    } catch (error) {
      console.error("Q&A error:", error);

      if (error.response?.status === 503) {
        setQaError(
          "Gemini is currently experiencing high demand. Please wait a moment and try again."
        );
      } else {
        setQaError(
          error.response?.data?.error ||
            "Something went wrong while answering your question."
        );
      }
    } finally {
      setAsking(false);
    }
  };

  // ============================================================
  // UPLOAD PAPER FOR COMPARISON
  // ============================================================

  const handleComparisonFileUpload = async (selectedFile, paperNumber) => {
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setComparisonError("Please select a PDF research paper.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setComparisonError("PDF file must be smaller than 10 MB.");
      return;
    }

    setComparisonError("");

    if (paperNumber === 1) {
      setUploadingComparison1(true);
    } else {
      setUploadingComparison2(true);
    }

    try {
      const formData = new FormData();
      formData.append("paper", selectedFile);

      const response = await axios.post(
        `${API_BASE_URL}/papers/upload`,
        formData
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.error || "Failed to upload the paper."
        );
      }

      if (paperNumber === 1) {
        setComparisonFile1(selectedFile);
        setComparisonPaper1(response.data.paper);
      } else {
        setComparisonFile2(selectedFile);
        setComparisonPaper2(response.data.paper);
      }
    } catch (error) {
      console.error(
        `Comparison Paper ${paperNumber} upload error:`,
        error
      );

      setComparisonError(
        error.response?.data?.error ||
          error.message ||
          "Failed to upload the research paper."
      );
    } finally {
      if (paperNumber === 1) {
        setUploadingComparison1(false);
      } else {
        setUploadingComparison2(false);
      }
    }
  };

  // ============================================================
  // COMPARE TWO RESEARCH PAPERS
  // ============================================================

  const handleComparePapers = async () => {
    if (!comparisonPaper1?.text) {
      setComparisonError("Please upload Paper 1 first.");
      return;
    }

    if (!comparisonPaper2?.text) {
      setComparisonError("Please upload Paper 2 first.");
      return;
    }

    setComparing(true);
    setComparisonError("");
    setComparison(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/comparison/compare`,
        {
          paper1Text: comparisonPaper1.text,
          paper2Text: comparisonPaper2.text,
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.error || "Failed to compare the papers."
        );
      }

      setComparison(response.data.comparison);
      incrementDashboardStat(
        "comparisons",
        "comparison",
        "Two research papers compared"
      );
    } catch (error) {
      console.error("Research paper comparison error:", error);

      if (error.response?.status === 429) {
        setComparisonError(
          error.response?.data?.error ||
            "Gemini's free-tier quota has been reached. Please wait until the quota resets or enable billing."
        );
      } else if (error.response?.status === 503) {
        setComparisonError(
          "Gemini is currently experiencing high demand. Please wait a moment and try again."
        );
      } else {
        setComparisonError(
          error.response?.data?.error ||
            error.message ||
            "Failed to compare the research papers."
        );
      }
    } finally {
      setComparing(false);
    }
  };

  // ============================================================
  // SUGGESTED QUESTIONS
  // ============================================================

  const suggestedQuestions = [
    "What is the main contribution of this paper?",
    "What methodology did the researchers use?",
    "What are the key findings?",
    "What are the limitations of this research?",
    "What future work do the authors suggest?",
  ];

  const handleSuggestedQuestion = (suggestedQuestion) => {
    setQuestion(suggestedQuestion);
    setQaError("");

    setTimeout(() => {
      document
        .getElementById("paper-question-input")
        ?.focus();
    }, 50);
  };

  // ============================================================
  // ENTER KEY FOR QUESTION
  // ============================================================

  const handleQuestionKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (!asking) {
        handleAskQuestion();
      }
    }
  };

  // ============================================================
  // RESET
  // ============================================================

  const handleReset = () => {
    // Main paper
    setFile(null);
    setActiveHistoryId(null);
    setPaper(null);
    setAnalysis(null);

    // Research gaps
    setGapAnalysis(null);
    setGapError("");

    // Research idea
    setResearchIdea(null);
    setIdeaError("");

    // Q&A
    setQuestion("");
    setMessages([]);
    setQaError("");

    // Comparison workspace
    setComparisonPaper1(null);
    setComparisonPaper2(null);
    setComparisonFile1(null);
    setComparisonFile2(null);
    setUploadingComparison1(false);
    setUploadingComparison2(false);
    setComparison(null);
    setComparing(false);
    setComparisonError("");

    // Main error
    setError("");

    // Clear main paper input
    const input = document.getElementById("paper-upload");

    if (input) {
      input.value = "";
    }

    // Clear comparison inputs
    const comparisonInput1 = document.getElementById(
      "comparison-paper-1"
    );

    if (comparisonInput1) {
      comparisonInput1.value = "";
    }

    const comparisonInput2 = document.getElementById(
      "comparison-paper-2"
    );

    if (comparisonInput2) {
      comparisonInput2.value = "";
    }
  };

  // ============================================================
  // ARRAY HELPER
  // ============================================================

  const renderList = (items, emptyMessage) => {
    if (!Array.isArray(items) || items.length === 0) {
      return (
        <p
          style={{
            margin: 0,
            color: "#6b7280",
            fontStyle: "italic",
          }}
        >
          {emptyMessage || "No information was identified."}
        </p>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "11px",
              padding: "12px 14px",
              background: "#f9fafb",
              borderRadius: "10px",
              border: "1px solid #f0f0f0",
            }}
          >
            <span
              style={{
                flexShrink: 0,
                width: "23px",
                height: "23px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: "#ede9fe",
                color: "#6d28d9",
                fontSize: "12px",
                fontWeight: "800",
              }}
            >
              {index + 1}
            </span>

            <span
              style={{
                lineHeight: "1.65",
                color: "#374151",
              }}
            >
              {item}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // ============================================================
  // TEXT SECTION
  // ============================================================

  const renderTextSection = (title, icon, content) => {
    if (!content) {
      return null;
    }

    return (
      <AnalysisCard title={title} icon={icon}>
        <p
          style={{
            margin: 0,
            color: "#374151",
            lineHeight: "1.8",
            fontSize: "15px",
            whiteSpace: "pre-wrap",
          }}
        >
          {content}
        </p>
      </AnalysisCard>
    );
  };

  // ============================================================
  // LIST SECTION
  // ============================================================

  const renderListSection = (
    title,
    icon,
    items,
    emptyMessage
  ) => {
    return (
      <AnalysisCard title={title} icon={icon}>
        {renderList(items, emptyMessage)}
      </AnalysisCard>
    );
  };

  // ============================================================
  // STRUCTURED ANALYSIS
  // ============================================================

  const renderStructuredAnalysis = (data) => {
    if (!data || typeof data !== "object") {
      return (
        <div
          style={{
            padding: "20px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            color: "#991b1b",
          }}
        >
          Unable to display the AI analysis.
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {data.paperTitle && (
          <div
            style={{
              padding: "24px",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)",
              border: "1px solid #ddd6fe",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "800",
                color: "#6366f1",
                letterSpacing: "0.08em",
                marginBottom: "8px",
              }}
            >
              RESEARCH PAPER
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: "25px",
                lineHeight: "1.35",
                color: "#1e1b4b",
              }}
            >
              {data.paperTitle}
            </h3>
          </div>
        )}

        {renderTextSection(
          "Executive Summary",
          "📝",
          data.executiveSummary
        )}

        {renderTextSection(
          "Research Question",
          "🎯",
          data.researchQuestion
        )}

        {renderTextSection(
          "Methodology",
          "🔬",
          data.methodology
        )}

        {renderListSection(
          "Key Findings",
          "📊",
          data.keyFindings,
          "No key findings were identified in the provided text."
        )}

        {renderListSection(
          "Main Contributions",
          "💡",
          data.mainContributions,
          "No main contributions were identified in the provided text."
        )}

        {renderListSection(
          "Strengths",
          "✅",
          data.strengths,
          "No specific strengths were identified in the provided text."
        )}

        {renderListSection(
          "Limitations",
          "⚠️",
          data.limitations,
          "Limitations were not clearly stated in the provided text."
        )}

        {renderListSection(
          "Future Work",
          "🔮",
          data.futureWork,
          "No specific future work was identified in the provided text."
        )}

        {renderListSection(
          "Important Concepts",
          "🧠",
          data.importantConcepts,
          "No specific concepts were identified in the provided text."
        )}

        {renderTextSection(
          "Simple Explanation",
          "🎓",
          data.simpleExplanation
        )}

        {renderTextSection(
          "Overall Assessment",
          "📋",
          data.overallAssessment
        )}
      </div>
    );
  };

  // ============================================================
  // RESEARCH GAP RESULTS
  // ============================================================

  const renderResearchGapAnalysis = (data) => {
    if (!data || typeof data !== "object") {
      return (
        <div
          style={{
            padding: "20px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            color: "#991b1b",
          }}
        >
          Unable to display the research gap analysis.
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {data.overallGap && (
          <div
            style={{
              padding: "24px",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
              border: "1px solid #ddd6fe",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "800",
                color: "#7c3aed",
                letterSpacing: "0.08em",
                marginBottom: "9px",
              }}
            >
              OVERALL RESEARCH GAP
            </div>

            <p
              style={{
                margin: 0,
                color: "#312e81",
                lineHeight: "1.8",
                fontSize: "16px",
              }}
            >
              {data.overallGap}
            </p>
          </div>
        )}

        {Array.isArray(data.gaps) &&
          data.gaps.map((gap, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "15px",
                padding: "22px",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  marginBottom: "18px",
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#ede9fe",
                    color: "#6d28d9",
                    fontSize: "15px",
                    fontWeight: "800",
                  }}
                >
                  {index + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "800",
                      color: "#7c3aed",
                      letterSpacing: "0.06em",
                      marginBottom: "4px",
                    }}
                  >
                    RESEARCH GAP
                  </div>

                  <h3
                    style={{
                      margin: 0,
                      color: "#1f2937",
                      fontSize: "20px",
                      lineHeight: "1.4",
                    }}
                  >
                    {gap.title}
                  </h3>
                </div>
              </div>

              {gap.description && (
                <div style={{ marginBottom: "17px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    🧩 What is missing?
                  </div>

                  <p
                    style={{
                      margin: 0,
                      color: "#4b5563",
                      lineHeight: "1.7",
                      fontSize: "14px",
                    }}
                  >
                    {gap.description}
                  </p>
                </div>
              )}

              {gap.evidence && (
                <div style={{ marginBottom: "17px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    📌 Evidence from the paper
                  </div>

                  <div
                    style={{
                      padding: "13px 15px",
                      background: "#f9fafb",
                      borderRadius: "10px",
                      border: "1px solid #f0f0f0",
                      color: "#4b5563",
                      lineHeight: "1.7",
                      fontSize: "14px",
                    }}
                  >
                    {gap.evidence}
                  </div>
                </div>
              )}

              {gap.importance && (
                <div style={{ marginBottom: "17px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    ⭐ Why does this matter?
                  </div>

                  <p
                    style={{
                      margin: 0,
                      color: "#4b5563",
                      lineHeight: "1.7",
                      fontSize: "14px",
                    }}
                  >
                    {gap.importance}
                  </p>
                </div>
              )}

              {gap.researchOpportunity && (
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    💡 Research Opportunity
                  </div>

                  <div
                    style={{
                      padding: "14px 16px",
                      background: "#ecfdf5",
                      borderRadius: "10px",
                      border: "1px solid #bbf7d0",
                      color: "#166534",
                      lineHeight: "1.7",
                      fontSize: "14px",
                    }}
                  >
                    {gap.researchOpportunity}
                  </div>
                </div>
              )}
            </div>
          ))}

        {renderListSection(
          "Potential Research Questions",
          "❓",
          data.potentialResearchQuestions,
          "No potential research questions were identified."
        )}

        {renderListSection(
          "Suggested Experiments",
          "🧪",
          data.suggestedExperiments,
          "No specific experiments were identified."
        )}

        {renderListSection(
          "Novelty Opportunities",
          "🚀",
          data.noveltyOpportunities,
          "No specific novelty opportunities were identified."
        )}
      </div>
    );
  };

  // ============================================================
  // RESEARCH IDEA RESULTS
  // ============================================================

  const renderResearchIdea = (data) => {
    if (!data || typeof data !== "object") {
      return (
        <div
          style={{
            padding: "20px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            color: "#991b1b",
          }}
        >
          Unable to display the generated research idea.
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {/* RESEARCH TITLE */}

        {data.researchTitle && (
          <div
            style={{
              padding: "26px",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #ecfdf5 100%)",
              border: "1px solid #ddd6fe",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "800",
                color: "#6366f1",
                letterSpacing: "0.08em",
                marginBottom: "9px",
              }}
            >
              PROPOSED RESEARCH PROJECT
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: "25px",
                lineHeight: "1.4",
                color: "#1e1b4b",
              }}
            >
              {data.researchTitle}
            </h3>
          </div>
        )}

        {renderTextSection(
          "Research Problem",
          "🎯",
          data.researchProblem
        )}

        {renderTextSection(
          "Research Objective",
          "🏁",
          data.researchObjective
        )}

        {renderTextSection(
          "Research Question",
          "❓",
          data.researchQuestion
        )}

        {renderTextSection(
          "Hypothesis",
          "🧠",
          data.hypothesis
        )}

        {renderTextSection(
          "Proposed Methodology",
          "🔬",
          data.proposedMethodology
        )}

        {renderListSection(
          "Dataset Requirements",
          "📊",
          data.datasetRequirements,
          "No specific dataset requirements were identified."
        )}

        {renderListSection(
          "Techniques & Models",
          "🤖",
          data.techniquesAndModels,
          "No specific techniques or models were identified."
        )}

        {renderListSection(
          "Evaluation Metrics",
          "📈",
          data.evaluationMetrics,
          "No specific evaluation metrics were identified."
        )}

        {renderTextSection(
          "Expected Contribution",
          "💡",
          data.expectedContribution
        )}

        {/* NOVELTY */}

        {data.noveltyExplanation && (
          <AnalysisCard
            title="Potential Novelty"
            icon="⭐"
          >
            <div
              style={{
                padding: "15px 16px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "10px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#92400e",
                  lineHeight: "1.75",
                  fontSize: "14px",
                }}
              >
                {data.noveltyExplanation}
              </p>
            </div>
          </AnalysisCard>
        )}

        {/* FEASIBILITY */}

        {data.feasibility && (
          <AnalysisCard
            title="Feasibility"
            icon="✅"
          >
            <div
              style={{
                padding: "15px 16px",
                background: "#ecfdf5",
                border: "1px solid #bbf7d0",
                borderRadius: "10px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#166534",
                  lineHeight: "1.75",
                  fontSize: "14px",
                }}
              >
                {data.feasibility}
              </p>
            </div>
          </AnalysisCard>
        )}

        {renderListSection(
          "Next Steps",
          "🚀",
          data.nextSteps,
          "No specific next steps were identified."
        )}
      </div>
    );
  };

  // ============================================================
  // RESEARCH PAPER COMPARISON RESULTS
  // ============================================================

  const renderComparison = (data) => {
    if (!data || typeof data !== "object") {
      return (
        <div
          style={{
            padding: "20px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            color: "#991b1b",
          }}
        >
          Unable to display the paper comparison.
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {data.comparisonSummary && (
          <div
            style={{
              padding: "24px",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)",
              border: "1px solid #ddd6fe",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "800",
                color: "#6366f1",
                letterSpacing: "0.08em",
                marginBottom: "8px",
              }}
            >
              OVERALL COMPARISON
            </div>

            <p
              style={{
                margin: 0,
                color: "#312e81",
                lineHeight: "1.8",
                fontSize: "16px",
              }}
            >
              {data.comparisonSummary}
            </p>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          {data.paper1Focus && (
            <AnalysisCard title="Paper 1 Focus" icon="📄">
              <p
                style={{
                  margin: 0,
                  color: "#374151",
                  lineHeight: "1.8",
                  fontSize: "15px",
                }}
              >
                {data.paper1Focus}
              </p>
            </AnalysisCard>
          )}

          {data.paper2Focus && (
            <AnalysisCard title="Paper 2 Focus" icon="📑">
              <p
                style={{
                  margin: 0,
                  color: "#374151",
                  lineHeight: "1.8",
                  fontSize: "15px",
                }}
              >
                {data.paper2Focus}
              </p>
            </AnalysisCard>
          )}
        </div>

        {renderListSection(
          "Similarities",
          "🤝",
          data.similarities,
          "No supported similarities were identified."
        )}

        {renderListSection(
          "Differences",
          "⚖️",
          data.differences,
          "No supported differences were identified."
        )}

        {renderTextSection(
          "Methodology Comparison",
          "🧪",
          data.methodologyComparison
        )}

        {renderTextSection(
          "Findings Comparison",
          "📈",
          data.findingsComparison
        )}

        {renderTextSection(
          "Contribution Comparison",
          "💡",
          data.contributionComparison
        )}

        {renderTextSection(
          "Limitations Comparison",
          "⚠️",
          data.limitationComparison
        )}

        {data.strongerResearchDirection && (
          <AnalysisCard
            title="More Promising Research Direction"
            icon="🚀"
          >
            <div
              style={{
                padding: "15px 16px",
                background: "#ecfdf5",
                border: "1px solid #bbf7d0",
                borderRadius: "10px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#166534",
                  lineHeight: "1.75",
                  fontSize: "14px",
                }}
              >
                {data.strongerResearchDirection}
              </p>
            </div>
          </AnalysisCard>
        )}

        {data.combinedResearchOpportunity && (
          <AnalysisCard
            title="Combined Research Opportunity"
            icon="🔬"
          >
            <div
              style={{
                padding: "15px 16px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "10px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#1e40af",
                  lineHeight: "1.75",
                  fontSize: "14px",
                }}
              >
                {data.combinedResearchOpportunity}
              </p>
            </div>
          </AnalysisCard>
        )}

        {renderListSection(
          "Potential Research Questions",
          "❓",
          data.potentialResearchQuestions,
          "No potential research questions were identified."
        )}
      </div>
    );
  };

  // ============================================================
  // UI
  // ============================================================

  return companyPage ? (
    <CompanyPage page={companyPage} onBack={closeCompanyPage} onNavigate={openCompanyPage} />
  ) : showLanding ? (
    <LandingPage onStart={() => setShowLanding(false)} onCompanyNavigate={openCompanyPage} />
  ) : (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "linear-gradient(135deg, #eef2ff 0%, #f8fafc 50%, #eef2ff 100%)",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
        color: "#1f2937",
      }}
    >
      <style>{`
        html, body, #root {
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        body {
          overflow-x: hidden;
        }
      `}</style>

      {/* ====================================================== */}
      {/* TOP NAVBAR */}
      {/* ====================================================== */}

      <header
        style={{
          background: "rgba(255,255,255,0.95)",
          borderBottom: "1px solid #e5e7eb",
          padding: "18px 30px",
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            width: "100%",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "800",
                color: "#312e81",
              }}
            >
              🔬 ResearchLensAI
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginTop: "2px",
              }}
            >
              AI-Powered Research Analysis
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={() => setShowLanding(true)}
              style={{
                border: "1px solid #e0e7ff",
                background: "#f8faff",
                color: "#4338ca",
                padding: "9px 14px",
                borderRadius: "10px",
                fontSize: "12px",
                fontWeight: "800",
                cursor: "pointer",
              }}
            >
              ← Back to Landing Page
            </button>

            <div
              style={{
                padding: "7px 12px",
                borderRadius: "999px",
                background: "#ecfdf5",
                color: "#047857",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              ● AI Ready
            </div>
          </div>
        </div>
      </header>

      <main
        style={{
          width: "100%",
          maxWidth: "none",
          boxSizing: "border-box",
          margin: "0 auto",
          padding: "45px clamp(20px, 5vw, 72px) 70px",
        }}
      >
        {/* ==================================================== */}
        {/* HERO */}
        {/* ==================================================== */}

        <section
          style={{
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "7px 14px",
              borderRadius: "999px",
              background: "#e0e7ff",
              color: "#4338ca",
              fontSize: "13px",
              fontWeight: "700",
              marginBottom: "15px",
            }}
          >
            RESEARCH INTELLIGENCE
          </div>

          <h1
            style={{
              fontSize: "clamp(34px, 6vw, 54px)",
              margin: "0 0 15px",
              lineHeight: "1.1",
              color: "#111827",
              fontWeight: "800",
            }}
          >
            Understand research papers
            <br />
            <span style={{ color: "#6366f1" }}>
              faster with AI.
            </span>
          </h1>

          <p
            style={{
              maxWidth: "680px",
              margin: "0 auto",
              color: "#6b7280",
              fontSize: "17px",
              lineHeight: "1.6",
            }}
          >
            Upload a research paper and ResearchLensAI will
            identify its objectives, methodology, findings,
            contributions, limitations, and future directions.
          </p>
        </section>

        {/* ==================================================== */}
        {/* RESEARCH DASHBOARD */}
        {/* ==================================================== */}

        <section
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "28px",
            boxShadow: "0 12px 40px rgba(31,41,55,0.07)",
            border: "1px solid #e5e7eb",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "20px",
              flexWrap: "wrap",
              marginBottom: "22px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "800",
                  color: "#6366f1",
                  letterSpacing: "0.08em",
                  marginBottom: "6px",
                }}
              >
                RESEARCH DASHBOARD
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "26px",
                  color: "#111827",
                }}
              >
                📊 Your Research Progress
              </h2>
              <p
                style={{
                  margin: "7px 0 0",
                  color: "#6b7280",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                A quick overview of your ResearchLensAI activity.
              </p>
            </div>

            <div
              style={{
                padding: "8px 12px",
                borderRadius: "999px",
                background: "#eef2ff",
                color: "#4338ca",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              Saved in this browser
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "12px",
              marginBottom: "22px",
            }}
          >
            <DashboardStat icon="📄" label="Papers Analyzed" value={dashboardStats.papersAnalyzed} />
            <DashboardStat icon="🔍" label="Gaps Detected" value={dashboardStats.gapsDetected} />
            <DashboardStat icon="💡" label="Ideas Generated" value={dashboardStats.ideasGenerated} />
            <DashboardStat icon="⚖️" label="Comparisons" value={dashboardStats.comparisons} />
            <DashboardStat icon="💬" label="Questions Asked" value={dashboardStats.questionsAsked} />
          </div>

          <div
            style={{
              borderTop: "1px solid #f0f0f0",
              paddingTop: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "17px",
                  color: "#1f2937",
                }}
              >
                🕒 Recent Activity
              </h3>
              <span
                style={{
                  fontSize: "12px",
                  color: "#9ca3af",
                }}
              >
                Latest 6 activities
              </span>
            </div>

            {recentActivity.length === 0 ? (
              <div
                style={{
                  padding: "18px",
                  borderRadius: "12px",
                  background: "#f9fafb",
                  border: "1px solid #f0f0f0",
                  color: "#9ca3af",
                  fontSize: "14px",
                  textAlign: "center",
                }}
              >
                Your research activity will appear here after you use an AI tool.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "11px 13px",
                      borderRadius: "10px",
                      background: "#fafafa",
                      border: "1px solid #f0f0f0",
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>
                      {activity.type === "analysis"
                        ? "🧠"
                        : activity.type === "gap"
                        ? "🔍"
                        : activity.type === "idea"
                        ? "💡"
                        : activity.type === "comparison"
                        ? "⚖️"
                        : "💬"}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          color: "#374151",
                          fontSize: "13px",
                          fontWeight: "600",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {activity.title}
                      </div>
                      <div
                        style={{
                          color: "#9ca3af",
                          fontSize: "11px",
                          marginTop: "2px",
                        }}
                      >
                        {activity.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ==================================================== */}
        {/* RESEARCH HISTORY */}
        {/* ==================================================== */}

        <section
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "28px",
            boxShadow: "0 12px 40px rgba(31,41,55,0.07)",
            border: "1px solid #e5e7eb",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "20px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "800",
                  color: "#7c3aed",
                  letterSpacing: "0.08em",
                  marginBottom: "6px",
                }}
              >
                RESEARCH LIBRARY
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "26px",
                  color: "#111827",
                }}
              >
                📚 Research History
              </h2>
              <p
                style={{
                  margin: "7px 0 0",
                  color: "#6b7280",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                Reopen your recent AI analyses, research gaps, and generated ideas.
              </p>
            </div>

            <div
              style={{
                padding: "8px 12px",
                borderRadius: "999px",
                background: "#f5f3ff",
                color: "#6d28d9",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              {researchHistory.length} / 10 saved
            </div>
          </div>

          {researchHistory.length === 0 ? (
            <div
              style={{
                padding: "22px",
                borderRadius: "14px",
                background: "#f9fafb",
                border: "1px dashed #d1d5db",
                color: "#9ca3af",
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              Your analyzed papers will appear here automatically.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {researchHistory.map((historyItem) => (
                <div
                  key={historyItem.id}
                  style={{
                    padding: "16px",
                    borderRadius: "14px",
                    border:
                      activeHistoryId === historyItem.id
                        ? "1px solid #a5b4fc"
                        : "1px solid #e5e7eb",
                    background:
                      activeHistoryId === historyItem.id
                        ? "#f5f3ff"
                        : "#ffffff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "15px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "9px",
                          marginBottom: "5px",
                        }}
                      >
                        <span style={{ fontSize: "20px" }}>📄</span>
                        <h3
                          style={{
                            margin: 0,
                            color: "#1f2937",
                            fontSize: "16px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {historyItem.fileName}
                        </h3>
                      </div>

                      <div
                        style={{
                          color: "#9ca3af",
                          fontSize: "12px",
                          marginBottom: "10px",
                        }}
                      >
                        {new Date(historyItem.analyzedAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {historyItem.pageCount
                          ? ` • ${historyItem.pageCount} pages`
                          : ""}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "7px",
                          flexWrap: "wrap",
                        }}
                      >
                        {historyItem.analysis && (
                          <span
                            style={{
                              padding: "5px 8px",
                              borderRadius: "999px",
                              background: "#eef2ff",
                              color: "#4338ca",
                              fontSize: "11px",
                              fontWeight: "700",
                            }}
                          >
                            🧠 AI Analysis
                          </span>
                        )}

                        {historyItem.gapAnalysis && (
                          <span
                            style={{
                              padding: "5px 8px",
                              borderRadius: "999px",
                              background: "#f5f3ff",
                              color: "#7c3aed",
                              fontSize: "11px",
                              fontWeight: "700",
                            }}
                          >
                            🔍 Research Gaps
                          </span>
                        )}

                        {historyItem.researchIdea && (
                          <span
                            style={{
                              padding: "5px 8px",
                              borderRadius: "999px",
                              background: "#ecfdf5",
                              color: "#047857",
                              fontSize: "11px",
                              fontWeight: "700",
                            }}
                          >
                            💡 Research Idea
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openResearchHistory(historyItem)}
                        style={{
                          padding: "9px 13px",
                          border: "none",
                          borderRadius: "9px",
                          background: "#4f46e5",
                          color: "white",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "700",
                        }}
                      >
                        👁️ Open
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteResearchHistory(historyItem.id)}
                        style={{
                          padding: "9px 13px",
                          border: "1px solid #fecaca",
                          borderRadius: "9px",
                          background: "#fffafa",
                          color: "#dc2626",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "700",
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ==================================================== */}
        {/* UPLOAD CARD */}
        {/* ==================================================== */}

        <section
          style={{
            background: "white",
            borderRadius: "20px",
            padding: "32px",
            boxShadow: "0 12px 40px rgba(31,41,55,0.08)",
            border: "1px solid #e5e7eb",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
              marginBottom: "22px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "24px",
                  color: "#111827",
                }}
              >
                📄 Upload a Research Paper
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#6b7280",
                  fontSize: "14px",
                }}
              >
                PDF files up to 10 MB
              </p>
            </div>

            <div
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                background: "#f3f4f6",
                color: "#6b7280",
                fontSize: "12px",
              }}
            >
              PDF only
            </div>
          </div>

          <label
            htmlFor="paper-upload"
            style={{
              display: "block",
              border: "2px dashed #c7d2fe",
              borderRadius: "14px",
              padding: "30px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: "#fafaff",
            }}
          >
            <div
              style={{
                fontSize: "40px",
                marginBottom: "10px",
              }}
            >
              📑
            </div>

            <div
              style={{
                fontWeight: "700",
                color: "#374151",
                marginBottom: "5px",
              }}
            >
              {file
                ? file.name
                : "Choose your research paper"}
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "#9ca3af",
              }}
            >
              Click here to browse for a PDF
            </div>
          </label>

          <input
            id="paper-upload"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "20px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{
                flex: 1,
                minWidth: "180px",
                padding: "14px 20px",
                border: "none",
                borderRadius: "10px",
                background:
                  !file || uploading
                    ? "#a5b4fc"
                    : "#4f46e5",
                color: "white",
                cursor:
                  !file || uploading
                    ? "not-allowed"
                    : "pointer",
                fontSize: "15px",
                fontWeight: "700",
              }}
            >
              {uploading
                ? "⏳ Uploading..."
                : "Upload PDF"}
            </button>

            <button
              onClick={handleReset}
              style={{
                padding: "14px 22px",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                background: "white",
                color: "#374151",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
              }}
            >
              Reset
            </button>
          </div>

          {error && (
            <div
              style={{
                marginTop: "18px",
                padding: "14px 16px",
                borderRadius: "10px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: "14px",
              }}
            >
              ⚠️ {error}
            </div>
          )}
        </section>

        {/* ==================================================== */}
        {/* PAPER INFORMATION */}
        {/* ==================================================== */}

        {paper && (
          <section
            style={{
              background: "white",
              borderRadius: "20px",
              padding: "30px",
              boxShadow:
                "0 12px 40px rgba(31,41,55,0.07)",
              border: "1px solid #e5e7eb",
              marginBottom: "25px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                gap: "15px",
                flexWrap: "wrap",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "23px",
                }}
              >
                ✅ Paper Ready
              </h2>

              <span
                style={{
                  padding: "7px 12px",
                  background: "#ecfdf5",
                  color: "#047857",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
              >
                Text extracted
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "14px",
                marginBottom: "22px",
              }}
            >
              <InfoCard
                icon="📄"
                label="File"
                value={paper.originalName}
              />

              <InfoCard
                icon="📑"
                label="Pages"
                value={paper.pageCount}
              />

              <InfoCard
                icon="🔤"
                label="Characters"
                value={paper.characterCount.toLocaleString()}
              />
            </div>

            {/* ANALYZE */}

            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{
                width: "100%",
                padding: "16px",
                border: "none",
                borderRadius: "11px",
                background: analyzing
                  ? "#a5b4fc"
                  : "#7c3aed",
                color: "white",
                cursor: analyzing
                  ? "not-allowed"
                  : "pointer",
                fontSize: "16px",
                fontWeight: "800",
              }}
            >
              {analyzing
                ? "🤖 AI is analyzing your paper..."
                : "🤖 Analyze Research Paper with AI"}
            </button>

            {/* RESEARCH GAPS */}

            <button
              onClick={handleDetectGaps}
              disabled={detectingGaps}
              style={{
                width: "100%",
                padding: "16px",
                marginTop: "12px",
                border: "none",
                borderRadius: "11px",
                background: detectingGaps
                  ? "#c4b5fd"
                  : "#6d28d9",
                color: "white",
                cursor: detectingGaps
                  ? "not-allowed"
                  : "pointer",
                fontSize: "16px",
                fontWeight: "800",
              }}
            >
              {detectingGaps
                ? "🔍 Finding Research Gaps..."
                : "🔍 Detect Research Gaps & Opportunities"}
            </button>

            {/* RESEARCH IDEA */}

            <button
              onClick={handleGenerateResearchIdea}
              disabled={generatingIdea}
              style={{
                width: "100%",
                padding: "16px",
                marginTop: "12px",
                border: "none",
                borderRadius: "11px",
                background: generatingIdea
                  ? "#a7f3d0"
                  : "#059669",
                color: "white",
                cursor: generatingIdea
                  ? "not-allowed"
                  : "pointer",
                fontSize: "16px",
                fontWeight: "800",
              }}
            >
              {generatingIdea
                ? "🚀 Generating Research Idea..."
                : "🚀 Generate Research Idea"}
            </button>

            {analyzing && (
              <div
                style={{
                  marginTop: "15px",
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: "13px",
                }}
              >
                Gemini is reading the extracted research
                text. This may take a moment.
              </div>
            )}

            {detectingGaps && (
              <div
                style={{
                  marginTop: "15px",
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: "13px",
                }}
              >
                Gemini is examining the paper's limitations,
                methodology, findings, and future work to
                identify potential research opportunities.
              </div>
            )}

            {generatingIdea && (
              <div
                style={{
                  marginTop: "15px",
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: "13px",
                }}
              >
                Gemini is turning the paper and its research
                gaps into a focused research project idea.
              </div>
            )}

            {gapError && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  fontSize: "14px",
                }}
              >
                ⚠️ {gapError}
              </div>
            )}

            {ideaError && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  fontSize: "14px",
                }}
              >
                ⚠️ {ideaError}
              </div>
            )}
          </section>
        )}

        {/* ==================================================== */}
        {/* ANALYSIS RESULTS */}
        {/* ==================================================== */}

        {analysis && (
          <section id="analysis-results">
            <div
              style={{
                background: "white",
                borderRadius: "20px",
                padding: "32px",
                boxShadow:
                  "0 12px 40px rgba(31,41,55,0.08)",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "15px",
                  flexWrap: "wrap",
                  marginBottom: "25px",
                  paddingBottom: "18px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#6366f1",
                      letterSpacing: "0.08em",
                    }}
                  >
                    AI ANALYSIS
                  </div>

                  <h2
                    style={{
                      margin: "5px 0 0",
                      fontSize: "28px",
                      color: "#111827",
                    }}
                  >
                    🧠 Research Insights
                  </h2>
                </div>

                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "#f5f3ff",
                    color: "#6d28d9",
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  Powered by Gemini
                </div>
              </div>

              {renderStructuredAnalysis(analysis)}
            </div>
          </section>
        )}

        {/* ==================================================== */}
        {/* RESEARCH GAP RESULTS */}
        {/* ==================================================== */}

        {gapAnalysis && (
          <section
            style={{
              marginTop: "25px",
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: "20px",
                padding: "32px",
                boxShadow:
                  "0 12px 40px rgba(31,41,55,0.08)",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "15px",
                  flexWrap: "wrap",
                  marginBottom: "25px",
                  paddingBottom: "18px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#7c3aed",
                      letterSpacing: "0.08em",
                    }}
                  >
                    RESEARCH GAP DETECTION
                  </div>

                  <h2
                    style={{
                      margin: "5px 0 0",
                      fontSize: "28px",
                      color: "#111827",
                    }}
                  >
                    🔍 Research Gaps & Opportunities
                  </h2>
                </div>

                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "#f5f3ff",
                    color: "#6d28d9",
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  Powered by Gemini
                </div>
              </div>

              {renderResearchGapAnalysis(gapAnalysis)}
            </div>
          </section>
        )}

        {/* ==================================================== */}
        {/* RESEARCH IDEA RESULTS */}
        {/* ==================================================== */}

        {researchIdea && (
          <section
            style={{
              marginTop: "25px",
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: "20px",
                padding: "32px",
                boxShadow:
                  "0 12px 40px rgba(31,41,55,0.08)",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "15px",
                  flexWrap: "wrap",
                  marginBottom: "25px",
                  paddingBottom: "18px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#059669",
                      letterSpacing: "0.08em",
                    }}
                  >
                    AI RESEARCH IDEA GENERATOR
                  </div>

                  <h2
                    style={{
                      margin: "5px 0 0",
                      fontSize: "28px",
                      color: "#111827",
                    }}
                  >
                    🚀 Your Research Project Idea
                  </h2>

                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "#6b7280",
                      fontSize: "14px",
                      lineHeight: "1.6",
                    }}
                  >
                    A focused research direction generated from
                    the uploaded paper and its identified gaps.
                  </p>
                </div>

                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "#ecfdf5",
                    color: "#047857",
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  Powered by Gemini
                </div>
              </div>

              {renderResearchIdea(researchIdea)}
            </div>
          </section>
        )}

        {/* ==================================================== */}
        {/* RESEARCH PAPER COMPARISON */}
        {/* ==================================================== */}

        <section
          style={{
            marginTop: "25px",
            background: "white",
            borderRadius: "20px",
            padding: "32px",
            boxShadow: "0 12px 40px rgba(31,41,55,0.08)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
              marginBottom: "25px",
              paddingBottom: "18px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#2563eb",
                  letterSpacing: "0.08em",
                }}
              >
                ADVANCED RESEARCH ANALYSIS
              </div>

              <h2
                style={{
                  margin: "5px 0 0",
                  fontSize: "28px",
                  color: "#111827",
                }}
              >
                🔬 Compare Two Research Papers
              </h2>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#6b7280",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  maxWidth: "720px",
                }}
              >
                Upload two research papers and let ResearchLensAI
                compare their focus, methodology, findings,
                contributions, limitations, and potential research
                opportunities.
              </p>
            </div>

            <div
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              Powered by Gemini
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {/* PAPER 1 */}

            <div
              style={{
                padding: "22px",
                borderRadius: "16px",
                border: "1px solid #dbeafe",
                background: "#f8fbff",
              }}
            >
              <h3
                style={{
                  margin: "0 0 7px",
                  fontSize: "20px",
                  color: "#1e3a8a",
                }}
              >
                📄 Paper 1
              </h3>

              <p
                style={{
                  margin: "0 0 16px",
                  fontSize: "14px",
                  color: "#6b7280",
                }}
              >
                Upload the first research paper.
              </p>

              <label
                htmlFor="comparison-paper-1"
                style={{
                  display: "block",
                  padding: "20px",
                  border: "2px dashed #93c5fd",
                  borderRadius: "12px",
                  background: "white",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "30px", marginBottom: "8px" }}>
                  📑
                </div>

                <div
                  style={{
                    fontWeight: "700",
                    color: "#374151",
                    wordBreak: "break-word",
                  }}
                >
                  {comparisonFile1
                    ? comparisonFile1.name
                    : "Choose Paper 1 PDF"}
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "12px",
                    color: "#9ca3af",
                  }}
                >
                  PDF up to 10 MB
                </div>
              </label>

              <input
                id="comparison-paper-1"
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: "none" }}
                disabled={uploadingComparison1}
                onChange={(event) => {
                  handleComparisonFileUpload(
                    event.target.files?.[0],
                    1
                  );
                  event.target.value = "";
                }}
              />

              {uploadingComparison1 && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "11px",
                    borderRadius: "9px",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: "13px",
                    textAlign: "center",
                  }}
                >
                  ⏳ Uploading Paper 1...
                </div>
              )}

              {comparisonPaper1 && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "13px",
                    borderRadius: "10px",
                    background: "#ecfdf5",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <div
                    style={{
                      color: "#166534",
                      fontWeight: "700",
                      fontSize: "14px",
                      wordBreak: "break-word",
                    }}
                  >
                    ✓ {comparisonPaper1.originalName}
                  </div>

                  <div
                    style={{
                      marginTop: "5px",
                      color: "#4b5563",
                      fontSize: "12px",
                    }}
                  >
                    {comparisonPaper1.pageCount} pages •{" "}
                    {comparisonPaper1.characterCount.toLocaleString()}{" "}
                    characters
                  </div>
                </div>
              )}
            </div>

            {/* PAPER 2 */}

            <div
              style={{
                padding: "22px",
                borderRadius: "16px",
                border: "1px solid #dbeafe",
                background: "#f8fbff",
              }}
            >
              <h3
                style={{
                  margin: "0 0 7px",
                  fontSize: "20px",
                  color: "#1e3a8a",
                }}
              >
                📑 Paper 2
              </h3>

              <p
                style={{
                  margin: "0 0 16px",
                  fontSize: "14px",
                  color: "#6b7280",
                }}
              >
                Upload the second research paper.
              </p>

              <label
                htmlFor="comparison-paper-2"
                style={{
                  display: "block",
                  padding: "20px",
                  border: "2px dashed #93c5fd",
                  borderRadius: "12px",
                  background: "white",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "30px", marginBottom: "8px" }}>
                  📑
                </div>

                <div
                  style={{
                    fontWeight: "700",
                    color: "#374151",
                    wordBreak: "break-word",
                  }}
                >
                  {comparisonFile2
                    ? comparisonFile2.name
                    : "Choose Paper 2 PDF"}
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "12px",
                    color: "#9ca3af",
                  }}
                >
                  PDF up to 10 MB
                </div>
              </label>

              <input
                id="comparison-paper-2"
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: "none" }}
                disabled={uploadingComparison2}
                onChange={(event) => {
                  handleComparisonFileUpload(
                    event.target.files?.[0],
                    2
                  );
                  event.target.value = "";
                }}
              />

              {uploadingComparison2 && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "11px",
                    borderRadius: "9px",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: "13px",
                    textAlign: "center",
                  }}
                >
                  ⏳ Uploading Paper 2...
                </div>
              )}

              {comparisonPaper2 && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "13px",
                    borderRadius: "10px",
                    background: "#ecfdf5",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <div
                    style={{
                      color: "#166534",
                      fontWeight: "700",
                      fontSize: "14px",
                      wordBreak: "break-word",
                    }}
                  >
                    ✓ {comparisonPaper2.originalName}
                  </div>

                  <div
                    style={{
                      marginTop: "5px",
                      color: "#4b5563",
                      fontSize: "12px",
                    }}
                  >
                    {comparisonPaper2.pageCount} pages •{" "}
                    {comparisonPaper2.characterCount.toLocaleString()}{" "}
                    characters
                  </div>
                </div>
              )}
            </div>
          </div>

          {comparisonError && (
            <div
              style={{
                marginTop: "20px",
                padding: "14px 16px",
                borderRadius: "10px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: "14px",
              }}
            >
              ⚠️ {comparisonError}
            </div>
          )}

          <button
            onClick={handleComparePapers}
            disabled={
              comparing ||
              uploadingComparison1 ||
              uploadingComparison2 ||
              !comparisonPaper1 ||
              !comparisonPaper2
            }
            style={{
              width: "100%",
              marginTop: "20px",
              padding: "16px",
              border: "none",
              borderRadius: "11px",
              background:
                comparing ||
                uploadingComparison1 ||
                uploadingComparison2 ||
                !comparisonPaper1 ||
                !comparisonPaper2
                  ? "#93c5fd"
                  : "#2563eb",
              color: "white",
              cursor:
                comparing ||
                uploadingComparison1 ||
                uploadingComparison2 ||
                !comparisonPaper1 ||
                !comparisonPaper2
                  ? "not-allowed"
                  : "pointer",
              fontSize: "16px",
              fontWeight: "800",
            }}
          >
            {comparing
              ? "🤖 Comparing Research Papers..."
              : "🔬 Compare Research Papers"}
          </button>

          {comparison && (
            <div
              style={{
                marginTop: "30px",
                paddingTop: "25px",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#2563eb",
                      letterSpacing: "0.08em",
                    }}
                  >
                    AI COMPARISON
                  </div>

                  <h3
                    style={{
                      margin: "5px 0 0",
                      fontSize: "24px",
                      color: "#111827",
                    }}
                  >
                    📊 Comparison Results
                  </h3>
                </div>

                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  Based only on uploaded papers
                </div>
              </div>

              {renderComparison(comparison)}
            </div>
          )}
        </section>

        {/* ==================================================== */}
        {/* PAPER Q&A */}
        {/* ==================================================== */}

        {paper && (
          <section
            style={{
              marginTop: "25px",
              background: "white",
              borderRadius: "20px",
              padding: "32px",
              boxShadow:
                "0 12px 40px rgba(31,41,55,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            {/* HEADER */}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "15px",
                flexWrap: "wrap",
                marginBottom: "22px",
                paddingBottom: "18px",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#6366f1",
                    letterSpacing: "0.08em",
                  }}
                >
                  PAPER Q&A
                </div>

                <h2
                  style={{
                    margin: "5px 0 0",
                    fontSize: "28px",
                    color: "#111827",
                  }}
                >
                  💬 Ask Questions About This Paper
                </h2>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#6b7280",
                    fontSize: "14px",
                    lineHeight: "1.5",
                  }}
                >
                  Ask ResearchLensAI anything about the uploaded
                  paper. Answers are based only on the extracted
                  paper text.
                </p>
              </div>

              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "#ecfdf5",
                  color: "#047857",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
              >
                AI Research Assistant
              </div>
            </div>

            {/* SUGGESTED QUESTIONS */}

            <div style={{ marginBottom: "22px" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#374151",
                  marginBottom: "10px",
                }}
              >
                Try asking:
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "9px",
                }}
              >
                {suggestedQuestions.map(
                  (suggestedQuestion, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        handleSuggestedQuestion(
                          suggestedQuestion
                        )
                      }
                      style={{
                        padding: "9px 13px",
                        borderRadius: "999px",
                        border: "1px solid #ddd6fe",
                        background: "#faf5ff",
                        color: "#6d28d9",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      {suggestedQuestion}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* CHAT HISTORY */}

            {messages.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                  marginBottom: "22px",
                  maxHeight: "600px",
                  overflowY: "auto",
                  padding: "5px",
                }}
              >
                {messages.map((message, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent:
                        message.role === "user"
                          ? "flex-end"
                          : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "82%",
                        padding: "15px 17px",
                        borderRadius:
                          message.role === "user"
                            ? "16px 16px 4px 16px"
                            : "16px 16px 16px 4px",
                        background:
                          message.role === "user"
                            ? "#4f46e5"
                            : "#f9fafb",
                        color:
                          message.role === "user"
                            ? "white"
                            : "#374151",
                        border:
                          message.role === "user"
                            ? "none"
                            : "1px solid #e5e7eb",
                        lineHeight: "1.7",
                        fontSize: "14px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "800",
                          marginBottom: "6px",
                          opacity:
                            message.role === "user"
                              ? 0.8
                              : 0.6,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {message.role === "user"
                          ? "You"
                          : "ResearchLensAI"}
                      </div>

                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* QUESTION INPUT */}

            <div>
              <textarea
                id="paper-question-input"
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  setQaError("");
                }}
                onKeyDown={handleQuestionKeyDown}
                placeholder="Ask a question about this research paper..."
                rows={4}
                disabled={asking}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  resize: "vertical",
                  padding: "15px 16px",
                  borderRadius: "12px",
                  border: "1px solid #d1d5db",
                  outline: "none",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  color: "#1f2937",
                  background: asking
                    ? "#f9fafb"
                    : "white",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginTop: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                  }}
                >
                  Press Enter to ask • Shift + Enter for a
                  new line
                </div>

                <button
                  onClick={handleAskQuestion}
                  disabled={asking || !question.trim()}
                  style={{
                    padding: "13px 22px",
                    border: "none",
                    borderRadius: "10px",
                    background:
                      asking || !question.trim()
                        ? "#a5b4fc"
                        : "#4f46e5",
                    color: "white",
                    cursor:
                      asking || !question.trim()
                        ? "not-allowed"
                        : "pointer",
                    fontSize: "14px",
                    fontWeight: "800",
                  }}
                >
                  {asking
                    ? "🤖 Thinking..."
                    : "✨ Ask Gemini"}
                </button>
              </div>

              {qaError && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "13px 15px",
                    borderRadius: "10px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    fontSize: "14px",
                  }}
                >
                  ⚠️ {qaError}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ==================================================== */}
        {/* EMPTY STATE */}
        {/* ==================================================== */}

        {!paper && !analysis && (
          <section
            style={{
              textAlign: "center",
              padding: "35px 20px",
              color: "#9ca3af",
            }}
          >
            <div
              style={{
                fontSize: "35px",
                marginBottom: "8px",
              }}
            >
              🔎
            </div>

            <p style={{ margin: 0 }}>
              Upload a paper to begin your research analysis.
            </p>
          </section>
        )}
      </main>

      <ResearchLensFooter onCompanyNavigate={openCompanyPage} />
    </div>
  );
}

// ============================================================
// LANDING PAGE
// ============================================================

function LandingPage({ onStart, onCompanyNavigate }) {
  const scrollToFeatures = () => {
    document.getElementById("researchlens-features")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const goTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#ffffff",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
        color: "#111827",
      }}
    >
      <style>{`
        html, body, #root {
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        body {
          overflow-x: hidden;
        }
        @media (max-width: 900px) {
          .researchlensai-landing-hero {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .researchlensai-landing-hero {
            gap: 35px !important;
          }
        }
      `}</style>

      {/* LANDING HEADER */}
      <header
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "18px clamp(20px, 5vw, 72px)",
          borderBottom: "1px solid #e5e7eb",
          background: "rgba(255,255,255,0.96)",
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              minWidth: 0,
            }}
          >
            <img
              src="/researchlensai-icon.png"
              alt="ResearchLensAI"
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                objectFit: "cover",
                boxShadow: "0 7px 20px rgba(79,70,229,0.18)",
                flexShrink: 0,
              }}
            />

            <div>
              <div
                style={{
                  fontSize: "23px",
                  fontWeight: "900",
                  color: "#312e81",
                  letterSpacing: "-0.02em",
                }}
              >
                ResearchLensAI
              </div>
              <div
                style={{
                  marginTop: "2px",
                  color: "#6b7280",
                  fontSize: "12px",
                }}
              >
                AI-Powered Research Intelligence
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onStart}
            style={{
              border: "none",
              borderRadius: "12px",
              padding: "12px 20px",
              background: "#4f46e5",
              color: "white",
              fontWeight: "800",
              fontSize: "14px",
              cursor: "pointer",
              boxShadow: "0 8px 22px rgba(79,70,229,0.22)",
            }}
          >
            Open ResearchLensAI →
          </button>
        </div>
      </header>

      {/* HERO */}
      <main style={{ width: "100%" }}>
        <section
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding:
              "clamp(65px, 9vw, 115px) clamp(20px, 7vw, 100px) 85px",
            background:
              "linear-gradient(135deg, #eef2ff 0%, #ffffff 52%, #eef2ff 100%)",
          }}
        >
          <div
            className="researchlensai-landing-hero"
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.08fr) minmax(360px, 0.92fr)",
              alignItems: "center",
              gap: "clamp(35px, 6vw, 90px)",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "8px 15px",
                  borderRadius: "999px",
                  background: "#e0e7ff",
                  color: "#4338ca",
                  fontSize: "12px",
                  fontWeight: "900",
                  letterSpacing: "0.08em",
                  marginBottom: "22px",
                }}
              >
                ✦ RESEARCH INTELLIGENCE
              </div>

              <h1
                style={{
                  margin: 0,
                  maxWidth: "850px",
                  fontSize: "clamp(48px, 6.4vw, 88px)",
                  lineHeight: "0.98",
                  letterSpacing: "-0.055em",
                  fontWeight: "950",
                  color: "#111827",
                }}
              >
                Understand research.
                <br />
                <span style={{ color: "#4f46e5" }}>
                  Discover what's next.
                </span>
              </h1>

              <p
                style={{
                  maxWidth: "760px",
                  margin: "28px 0 0",
                  color: "#4b5563",
                  fontSize: "clamp(16px, 1.5vw, 19px)",
                  lineHeight: "1.75",
                }}
              >
                ResearchLensAI helps you read academic papers faster,
                uncover research gaps, generate new research directions,
                ask questions, and compare studies — all in one
                AI-powered research workspace.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginTop: "30px",
                }}
              >
                <button
                  type="button"
                  onClick={onStart}
                  style={{
                    border: "none",
                    borderRadius: "12px",
                    padding: "15px 22px",
                    background: "#4f46e5",
                    color: "white",
                    fontWeight: "850",
                    fontSize: "15px",
                    cursor: "pointer",
                    boxShadow: "0 10px 25px rgba(79,70,229,0.22)",
                  }}
                >
                  Start Exploring Research →
                </button>

                <button
                  type="button"
                  onClick={scrollToFeatures}
                  style={{
                    border: "1px solid #d1d5db",
                    borderRadius: "12px",
                    padding: "15px 22px",
                    background: "white",
                    color: "#374151",
                    fontWeight: "800",
                    fontSize: "15px",
                    cursor: "pointer",
                  }}
                >
                  Explore Features
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "18px",
                  marginTop: "42px",
                  maxWidth: "760px",
                }}
              >
                {[
                  ["📄", "Analyze papers", "Understand the core of a study."],
                  ["🔍", "Find gaps", "Spot opportunities for new work."],
                  ["💡", "Generate ideas", "Turn insights into directions."],
                ].map(([icon, title, description]) => (
                  <div key={title}>
                    <div
                      style={{
                        fontSize: "20px",
                        marginBottom: "6px",
                      }}
                    >
                      {icon}
                    </div>
                    <div
                      style={{
                        fontWeight: "850",
                        fontSize: "14px",
                        color: "#111827",
                      }}
                    >
                      {title}
                    </div>
                    <div
                      style={{
                        color: "#6b7280",
                        fontSize: "12px",
                        lineHeight: "1.5",
                        marginTop: "3px",
                      }}
                    >
                      {description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* WORKFLOW VISUAL */}
            <div
              style={{
                width: "100%",
                maxWidth: "650px",
                justifySelf: "center",
                border: "1px solid #dbe2ff",
                borderRadius: "28px",
                padding: "clamp(22px, 3vw, 36px)",
                boxSizing: "border-box",
                background:
                  "linear-gradient(145deg, #ffffff 0%, #f8faff 100%)",
                boxShadow: "0 25px 70px rgba(49,46,129,0.12)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "28px",
                }}
              >
                <img
                  src="/researchlensai-icon.png"
                  alt=""
                  style={{
                    width: "128px",
                    height: "128px",
                    borderRadius: "28px",
                    objectFit: "cover",
                    boxShadow: "0 15px 35px rgba(79,70,229,0.2)",
                  }}
                />
              </div>

              <div
                style={{
                  textAlign: "center",
                  color: "#6366f1",
                  fontSize: "11px",
                  fontWeight: "900",
                  letterSpacing: "0.09em",
                  marginBottom: "14px",
                }}
              >
                RESEARCH WORKFLOW
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: "10px",
                }}
              >
                {[
                  ["📄", "Analyze"],
                  ["🔎", "Find gaps"],
                  ["💡", "Generate ideas"],
                  ["💬", "Ask questions"],
                  ["⚖️", "Compare papers"],
                  ["📊", "Track progress"],
                ].map(([icon, label]) => (
                  <div
                    key={label}
                    style={{
                      padding: "18px 12px",
                      borderRadius: "13px",
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#374151",
                    }}
                  >
                    <span style={{ fontSize: "19px" }}>{icon}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section
          id="researchlens-features"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "85px clamp(20px, 7vw, 100px)",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1250px",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: "45px",
              }}
            >
              <div
                style={{
                  color: "#6366f1",
                  fontSize: "12px",
                  fontWeight: "900",
                  letterSpacing: "0.09em",
                  marginBottom: "9px",
                }}
              >
                EVERYTHING IN ONE WORKSPACE
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(32px, 4vw, 52px)",
                  letterSpacing: "-0.035em",
                  color: "#111827",
                }}
              >
                Built for serious research.
              </h2>
              <p
                style={{
                  margin: "14px auto 0",
                  maxWidth: "650px",
                  color: "#6b7280",
                  lineHeight: "1.7",
                  fontSize: "16px",
                }}
              >
                Move from understanding a paper to discovering what
                you could research next without switching between tools.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "16px",
              }}
            >
              {[
                [
                  "🧠",
                  "AI Paper Analysis",
                  "Extract objectives, methodology, findings, contributions, limitations, and future directions.",
                ],
                [
                  "🔍",
                  "Research Gap Detection",
                  "Identify meaningful unanswered questions and potential areas for further investigation.",
                ],
                [
                  "💡",
                  "Research Idea Generator",
                  "Turn paper insights and detected gaps into structured research ideas and next steps.",
                ],
                [
                  "💬",
                  "Ask Your Paper",
                  "Ask questions about the uploaded paper and receive answers grounded in its content.",
                ],
                [
                  "⚖️",
                  "Paper Comparison",
                  "Compare two studies across focus, methodology, findings, contributions, and limitations.",
                ],
                [
                  "📊",
                  "Research Dashboard",
                  "Track papers analyzed, gaps detected, ideas generated, comparisons, and questions asked.",
                ],
              ].map(([icon, title, description]) => (
                <div
                  key={title}
                  style={{
                    padding: "25px",
                    borderRadius: "18px",
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    boxShadow: "0 8px 30px rgba(31,41,55,0.05)",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#eef2ff",
                      fontSize: "22px",
                      marginBottom: "17px",
                    }}
                  >
                    {icon}
                  </div>
                  <h3
                    style={{
                      margin: "0 0 9px",
                      color: "#111827",
                      fontSize: "18px",
                    }}
                  >
                    {title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      color: "#6b7280",
                      fontSize: "14px",
                      lineHeight: "1.65",
                    }}
                  >
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "20px clamp(20px, 7vw, 100px) 85px",
          }}
        >
          <div
            style={{
              width: "100%",
              boxSizing: "border-box",
              borderRadius: "24px",
              padding: "clamp(35px, 5vw, 60px)",
              background: "#111827",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "30px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#a5b4fc",
                  fontSize: "12px",
                  fontWeight: "900",
                  letterSpacing: "0.09em",
                  marginBottom: "9px",
                }}
              >
                START YOUR RESEARCH
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(28px, 4vw, 46px)",
                  letterSpacing: "-0.035em",
                }}
              >
                Start with a research paper.
              </h2>
              <p
                style={{
                  margin: "10px 0 0",
                  color: "#d1d5db",
                  lineHeight: "1.6",
                }}
              >
                Upload it. Understand it. Find what's missing.
                Discover what's next.
              </p>
            </div>

            <button
              type="button"
              onClick={onStart}
              style={{
                border: "none",
                borderRadius: "12px",
                padding: "15px 22px",
                background: "white",
                color: "#312e81",
                fontWeight: "900",
                fontSize: "15px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Open the Workspace →
            </button>
          </div>
        </section>
      </main>

      <ResearchLensFooter onBackToTop={goTop} onCompanyNavigate={onCompanyNavigate} />
    </div>
  );
}

// ============================================================
// COMPANY PAGES
// ============================================================

function CompanyPage({ page, onBack, onNavigate }) {
  const content = {
    about: {
      label: "ABOUT RESEARCHLENSAI",
      title: "Built to make research easier to understand.",
      intro:
        "ResearchLensAI is an AI-powered research workspace designed to help students, researchers, and learners understand academic papers faster and discover what to explore next.",
      sections: [
        [
          "What ResearchLensAI does",
          "Upload a research paper and use AI to understand its objectives, methodology, findings, contributions, limitations, and future directions.",
        ],
        [
          "Why it exists",
          "Academic papers can be difficult to read, especially when you are trying to identify a useful research direction. ResearchLensAI brings analysis, gap detection, idea generation, questions, and paper comparison into one workspace.",
        ],
        [
          "Our goal",
          "Help people spend less time getting lost in a paper and more time thinking about meaningful research questions.",
        ],
      ],
    },
    privacy: {
      label: "PRIVACY POLICY",
      title: "Your research stays under your control.",
      intro:
        "ResearchLensAI is designed to be clear about how research content is used while keeping the current MVP simple and transparent.",
      sections: [
        [
          "Research papers",
          "Papers uploaded for analysis are sent to the ResearchLensAI backend so the requested AI feature can process the paper. Do not upload confidential material unless you are authorized to do so.",
        ],
        [
          "Browser storage",
          "Research history and dashboard activity in the current MVP are stored locally in your browser. Clearing browser storage can remove those saved items.",
        ],
        [
          "AI processing",
          "Text submitted to AI features is processed by the configured AI service to generate the requested result. Avoid submitting information you are not permitted to share with an AI service.",
        ],
      ],
    },
    terms: {
      label: "TERMS OF SERVICE",
      title: "Use ResearchLensAI responsibly.",
      intro:
        "ResearchLensAI is intended for lawful research, learning, and analysis purposes.",
      sections: [
        [
          "Research responsibility",
          "AI-generated analysis, research gaps, ideas, and answers should be reviewed by the user. They are intended to assist research, not replace academic judgment or expert review.",
        ],
        [
          "Uploaded content",
          "You should only upload papers and other material that you have the right to use and process.",
        ],
        [
          "Availability",
          "AI services can experience temporary limits, delays, or outages. ResearchLensAI does not guarantee uninterrupted availability of every AI-powered feature.",
        ],
      ],
    },
    contact: {
      label: "CONTACT RESEARCHLENSAI",
      title: "Have a question or suggestion?",
      intro:
        "We would love to hear feedback about ResearchLensAI and ideas for improving the research workflow.",
      sections: [
        [
          "Email",
          "For questions, feedback, or project-related communication, use the contact email provided with the project.",
        ],
        [
          "Feedback",
          "Tell us which research workflow you use most, which feature could be improved, or what would make ResearchLensAI more useful for your work.",
        ],
      ],
    },
  }[page];

  const links = [
    ["about", "About Us"],
    ["privacy", "Privacy Policy"],
    ["terms", "Terms of Service"],
    ["contact", "Contact Us"],
  ];

  if (!content) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        margin: 0,
        padding: 0,
        background: "#ffffff",
        color: "#111827",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        html, body, #root {
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        body {
          overflow-x: hidden;
          background: #ffffff !important;
        }
        .researchlens-company-title,
        .researchlens-company-title * {
          color: #111827 !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        .researchlens-company-heading,
        .researchlens-company-heading * {
          color: #1f2937 !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
      `}</style>

      <header
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "18px clamp(20px, 5vw, 72px)",
          borderBottom: "1px solid #e5e7eb",
          background: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src="/researchlensai-icon.png"
              alt="ResearchLensAI"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                objectFit: "cover",
              }}
            />
            <div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "900",
                  color: "#111827",
                }}
              >
                ResearchLensAI
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                AI-powered research intelligence
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            style={{
              border: "none",
              borderRadius: "10px",
              background: "#4f46e5",
              color: "#ffffff",
              padding: "12px 20px",
              fontWeight: "800",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ← Back
          </button>
        </div>
      </header>

      <main
        style={{
          width: "100%",
          flex: 1,
          boxSizing: "border-box",
          padding: "72px clamp(20px, 7vw, 110px) 90px",
        }}
      >
        <div style={{ maxWidth: "980px", margin: "0 auto" }}>
          <div
            style={{
              display: "inline-block",
              padding: "9px 15px",
              borderRadius: "999px",
              background: "#eef2ff",
              color: "#4f46e5",
              fontSize: "12px",
              fontWeight: "900",
              letterSpacing: "0.08em",
              marginBottom: "24px",
            }}
          >
            {content.label}
          </div>

          <h1
            className="researchlens-company-title"
            style={{
              margin: "0 0 24px",
              color: "#111827",
              fontSize: "clamp(40px, 6vw, 68px)",
              lineHeight: "1.05",
              letterSpacing: "-0.045em",
              fontWeight: 900,
              opacity: 1,
            }}
          >
            {content.title}
          </h1>

          <p
            style={{
              margin: "0 0 48px",
              maxWidth: "850px",
              color: "#475569",
              fontSize: "18px",
              lineHeight: "1.8",
              opacity: 1,
            }}
          >
            {content.intro}
          </p>

          <div style={{ display: "grid", gap: "18px" }}>
            {content.sections.map(([heading, body]) => (
              <section
                key={heading}
                style={{
                  padding: "28px 30px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "18px",
                  background: "#f8fafc",
                  boxSizing: "border-box",
                }}
              >
                <h2
                  className="researchlens-company-heading"
                  style={{
                    margin: "0 0 10px",
                    color: "#1f2937",
                    fontSize: "20px",
                    lineHeight: "1.3",
                    fontWeight: 900,
                    opacity: 1,
                  }}
                >
                  {heading}
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: "#475569",
                    lineHeight: "1.75",
                    fontSize: "15px",
                    opacity: 1,
                  }}
                >
                  {body}
                </p>
              </section>
            ))}
          </div>

          <div
            style={{
              marginTop: "52px",
              paddingTop: "28px",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: "900",
                color: "#6b7280",
                marginBottom: "15px",
                letterSpacing: "0.05em",
              }}
            >
              COMPANY
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {links.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onNavigate(key)}
                  style={{
                    border: "1px solid #dbe1ea",
                    background: "#ffffff",
                    color: "#4f46e5",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontWeight: "800",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <ResearchLensFooter onCompanyNavigate={onNavigate} />
    </div>
  );
}

// ============================================================
// RESEARCHLENSAI FOOTER
// ============================================================

function ResearchLensFooter({ onBackToTop, onCompanyNavigate }) {
  const goTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      <style>{`
        .researchlens-footer-grid {
          width: 100%;
          max-width: 1250px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.35fr 0.8fr 0.8fr 1fr;
          gap: 45px;
          text-align: left;
        }
        @media (max-width: 900px) {
          .researchlens-footer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 34px;
          }
        }
        @media (max-width: 560px) {
          .researchlens-footer-grid {
            grid-template-columns: 1fr;
            gap: 30px;
          }
        }
      `}</style>
    <footer
      style={{
        width: "100%",
        boxSizing: "border-box",
        background: "#050505",
        color: "#ffffff",
        padding: "68px clamp(20px, 5vw, 72px) 30px",
      }}
    >
      <div
        className="researchlens-footer-grid"
        style={{
          width: "100%",
          maxWidth: "1250px",
          margin: "0 auto",
          textAlign: "left",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <img
              src="/researchlensai-icon.png"
              alt="ResearchLensAI"
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                objectFit: "cover",
              }}
            />
            <div
              style={{
                fontSize: "24px",
                fontWeight: "900",
              }}
            >
              ResearchLensAI
            </div>
          </div>

          <p
            style={{
              margin: 0,
              maxWidth: "330px",
              color: "#a7a7a7",
              fontSize: "15px",
              lineHeight: "1.9",
            }}
          >
            AI-powered research intelligence helping you understand
            academic papers, discover research gaps, and find what's
            next.
          </p>
        </div>

        <div>
          <h3
            style={{
              margin: "0 0 20px",
              fontSize: "18px",
              fontWeight: "850",
            }}
          >
            Features
          </h3>

          {[
            "AI Paper Analysis",
            "Research Gap Detection",
            "Research Idea Generator",
            "Ask Your Paper",
            "Paper Comparison",
            "Research Dashboard",
          ].map((item) => (
            <div
              key={item}
              style={{
                color: "#a7a7a7",
                fontSize: "14px",
                lineHeight: "2.05",
              }}
            >
              {item}
            </div>
          ))}
        </div>

        <div>
          <h3
            style={{
              margin: "0 0 20px",
              fontSize: "18px",
              fontWeight: "850",
            }}
          >
            Company
          </h3>

          {[
            ["about", "About Us"],
            ["privacy", "Privacy Policy"],
            ["terms", "Terms of Service"],
            ["contact", "Contact Us"],
          ].map(([page, label]) => (
            <button
              key={page}
              type="button"
              onClick={() => onCompanyNavigate?.(page)}
              style={{
                display: "block",
                width: "fit-content",
                padding: "0",
                margin: "0",
                border: "none",
                background: "transparent",
                color: "#a7a7a7",
                fontSize: "14px",
                lineHeight: "2.05",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          <h3
            style={{
              margin: "0 0 20px",
              fontSize: "18px",
              fontWeight: "850",
            }}
          >
            Connect
          </h3>

          <div
            style={{
              color: "#a7a7a7",
              fontSize: "14px",
              marginBottom: "18px",
              lineHeight: "1.7",
            }}
          >
            🔬 ResearchLensAI
          </div>

          <a
            href="https://github.com/sakchamkumar/ResearchLensAI"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              textDecoration: "none",
              borderRadius: "12px",
              background: "#111111",
              color: "white",
              padding: "11px 17px",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            GitHub
          </a>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "1250px",
          margin: "55px auto 0",
          paddingTop: "25px",
          borderTop: "1px solid #242424",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            color: "#9ca3af",
            fontSize: "14px",
          }}
        >
          © 2026 ResearchLensAI. All rights reserved.
        </div>

        <button
          type="button"
          onClick={onBackToTop || goTop}
          style={{
            border: "none",
            borderRadius: "999px",
            background: "#111111",
            color: "white",
            padding: "12px 18px",
            fontWeight: "800",
            cursor: "pointer",
          }}
        >
          ↑ Back to Top
        </button>
      </div>
    </footer>
    </>
  );
}

// ============================================================
// DASHBOARD STAT
// ============================================================

function DashboardStat({ icon, label, value }) {
  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "13px",
        background: "#f9fafb",
        border: "1px solid #f0f0f0",
      }}
    >
      <div style={{ fontSize: "20px", marginBottom: "8px" }}>{icon}</div>
      <div
        style={{
          fontSize: "25px",
          lineHeight: 1,
          fontWeight: "800",
          color: "#111827",
          marginBottom: "6px",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "#6b7280",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ============================================================
// ANALYSIS CARD
// ============================================================

function AnalysisCard({ title, icon, children }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "15px",
        padding: "22px",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "15px",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f5f3ff",
            fontSize: "19px",
          }}
        >
          {icon}
        </div>

        <h3
          style={{
            margin: 0,
            color: "#1f2937",
            fontSize: "19px",
          }}
        >
          {title}
        </h3>
      </div>

      {children}
    </div>
  );
}

// ============================================================
// INFO CARD
// ============================================================

function InfoCard({ icon, label, value }) {
  return (
    <div
      style={{
        padding: "17px",
        borderRadius: "12px",
        background: "#f9fafb",
        border: "1px solid #f0f0f0",
      }}
    >
      <div
        style={{
          fontSize: "20px",
          marginBottom: "7px",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: "12px",
          color: "#9ca3af",
          marginBottom: "4px",
          textTransform: "uppercase",
          fontWeight: "700",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "14px",
          color: "#374151",
          fontWeight: "600",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default App;