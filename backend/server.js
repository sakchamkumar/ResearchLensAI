const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const papersRouter = require("./routes/papers");
const analysisRouter = require("./routes/analysis");
const qaRouter = require("./routes/qa");
const ideasRouter = require("./routes/ideas");
const comparisonRouter = require("./routes/comparison");

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// CORS
// ============================================================

const allowedOrigin = process.env.FRONTEND_URL;

if (allowedOrigin) {
  app.use(
    cors({
      origin: allowedOrigin,
    })
  );
} else {
  // Local development fallback
  app.use(cors());
}

// ============================================================
// BODY SIZE LIMIT
// ============================================================

app.use(express.json({ limit: "1mb" }));

// ============================================================
// GENERAL API RATE LIMIT
// ============================================================
//
// Protects the backend from excessive requests.
//
// 100 requests per 15 minutes per IP.
//

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    error:
      "Too many requests from this IP. Please wait a few minutes and try again.",
  },
});

// ============================================================
// AI RATE LIMIT
// ============================================================
//
// AI endpoints are more expensive because they call Gemini.
//
// 20 AI requests per 15 minutes per IP.
//

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    error:
      "Too many AI requests. Please wait a few minutes before trying again.",
  },
});

// ============================================================
// BASIC ROUTE
// ============================================================

app.get("/", (req, res) => {
  res.json({
    message: "ResearchLensAI backend is running!",
  });
});

// ============================================================
// GENERAL API PROTECTION
// ============================================================

app.use(generalLimiter);

// ============================================================
// ROUTES
// ============================================================

// PDF upload/extraction
app.use("/papers", papersRouter);

// AI-powered routes
app.use("/analysis", aiLimiter, analysisRouter);
app.use("/qa", aiLimiter, qaRouter);
app.use("/ideas", aiLimiter, ideasRouter);
app.use("/comparison", aiLimiter, comparisonRouter);

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((error, req, res, next) => {
  console.error("Global server error:", error);

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      error:
        "The request is too large. Please use a smaller research paper.",
    });
  }

  res.status(500).json({
    success: false,
    error: "Internal server error.",
  });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `ResearchLensAI backend running on port ${PORT}`
  );
});