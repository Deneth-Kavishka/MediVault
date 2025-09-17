const express = require("express");
const {
  getPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescription,
  cancelPrescription,
  dispensePrescription,
  verifyPrescription,
  getPrescriptionStats,
} = require("../controllers/prescriptions");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

// Statistics and verification routes (must be before /:id routes)
router.get(
  "/stats",
  authorize("Doctor", "Pharmacist", "Admin"),
  getPrescriptionStats
);
router.post(
  "/verify",
  authorize("Pharmacist", "Doctor", "Nurse", "Admin"),
  verifyPrescription
);

// Main CRUD routes
router
  .route("/")
  .get(getPrescriptions) // All authenticated users can view prescriptions (filtered by role)
  .post(authorize("Doctor"), createPrescription);

router
  .route("/:id")
  .get(getPrescription) // All authenticated users can view specific prescriptions (with authorization checks)
  .put(authorize("Doctor", "Admin"), updatePrescription);

// Status change routes
router.put("/:id/cancel", authorize("Doctor", "Admin"), cancelPrescription);
router.put("/:id/dispense", authorize("Pharmacist"), dispensePrescription);

module.exports = router;
