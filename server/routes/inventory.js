const express = require("express");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

// Placeholder for inventory management routes
router.get("/", authorize("Pharmacist", "Admin"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Inventory management routes - Under development",
    data: [],
  });
});

module.exports = router;
