const express = require("express");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

// Placeholder for lab test management routes
router.get("/", authorize("Doctor", "LabTechnician", "Admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Lab test management routes - Under development",
    data: [],
  });
});

module.exports = router;
