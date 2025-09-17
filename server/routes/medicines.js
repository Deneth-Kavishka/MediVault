const express = require("express");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

// Placeholder for medicine database routes
router.get("/", authorize("Doctor", "Pharmacist", "Admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Medicine database routes - Under development",
    data: [],
  });
});

module.exports = router;
