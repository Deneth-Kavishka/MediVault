const express = require("express");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

// Placeholder for user management routes
router.get("/", authorize("Admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "User management routes - Under development",
    data: [],
  });
});

module.exports = router;
