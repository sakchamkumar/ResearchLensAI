const express = require("express");
const cors = require("cors");
require("dotenv").config();

const papersRouter = require("./routes/papers");
const analysisRouter = require("./routes/analysis");
const qaRouter = require("./routes/qa");
const ideasRouter = require("./routes/ideas");
const comparisonRouter = require("./routes/comparison");

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// MIDDLEWARE
// ============================================================

// Allow frontend requests
app.use(cors());

// Research paper text can be large.
// 1 MB gives enough room for the extracted text plus JSON overhead.
app.use(express.json({ limit: "1mb" }));

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
  res.json({
    message: "ResearchLensAI backend is running!",
  });
});

// ============================================================
// API ROUTES
// ============================================================

app.use("/papers", papersRouter);
app.use("/analysis", analysisRouter);
app.use("/qa", qaRouter);
app.use("/ideas", ideasRouter);
app.use("/comparison", comparisonRouter);

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((error, req, res, next) => {
  console.error("Global server error:", error);

  // JSON body too large
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

app.listen(PORT, () => {
  console.log(
    `ResearchLensAI backend running on port ${PORT}`
  );
});