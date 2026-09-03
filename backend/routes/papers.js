const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const router = express.Router();

// --------------------------------------------------
// FILE UPLOAD CONFIGURATION
// --------------------------------------------------

// Store uploaded files temporarily in memory.
// We will process the PDF and extract its text without
// permanently saving the file to the server.
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB maximum
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed."));
    }
  },
});

// --------------------------------------------------
// TEST PAPERS ROUTE
// --------------------------------------------------

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Research papers API is working!",
  });
});

// --------------------------------------------------
// PDF UPLOAD ROUTE
// --------------------------------------------------

router.post("/upload", upload.single("paper"), async (req, res) => {
  try {
    // --------------------------------------------------
    // CHECK WHETHER A FILE WAS PROVIDED
    // --------------------------------------------------

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Please upload a PDF research paper.",
      });
    }

    // --------------------------------------------------
    // EXTRACT TEXT FROM PDF
    // --------------------------------------------------

    const pdfData = await pdfParse(req.file.buffer);

    const extractedText = pdfData.text.trim();

    // --------------------------------------------------
    // CHECK WHETHER TEXT WAS EXTRACTED
    // --------------------------------------------------

    if (!extractedText) {
      return res.status(400).json({
        success: false,
        error:
          "The PDF was uploaded, but no readable text could be extracted.",
      });
    }

    // --------------------------------------------------
    // RETURN PAPER INFORMATION
    // --------------------------------------------------

    res.json({
      success: true,

      message: "Research paper uploaded and text extracted successfully.",

      paper: {
        originalName: req.file.originalname,
        fileSize: req.file.size,
        pageCount: pdfData.numpages,
        characterCount: extractedText.length,
        text: extractedText,
      },
    });
  } catch (error) {
    console.error("PDF upload error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to process the research paper.",
    });
  }
});

// --------------------------------------------------
// UPLOAD ERROR HANDLER
// --------------------------------------------------

router.use((error, req, res, next) => {
  console.error("Paper route error:", error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "PDF file is too large. Maximum size is 10 MB.",
      });
    }

    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }

  if (error.message === "Only PDF files are allowed.") {
    return res.status(400).json({
      success: false,
      error: "Only PDF files are allowed.",
    });
  }

  res.status(500).json({
    success: false,
    error: "Something went wrong while processing the file.",
  });
});

module.exports = router;