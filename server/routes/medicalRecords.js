const express = require("express");
const {
  getMedicalRecords,
  getMedicalRecord,
  createMedicalRecord,
  updateMedicalRecord,
  finalizeMedicalRecord,
  deleteMedicalRecord,
  getPatientMedicalHistory,
  getMedicalRecordsStats,
} = require("../controllers/medicalRecords");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

// Statistics and patient history routes (must be before /:id routes)
router.get("/stats", authorize("Doctor", "Admin"), getMedicalRecordsStats);
router.get(
  "/patient/:patientId/history",
  authorize("Doctor", "Nurse", "Patient"),
  getPatientMedicalHistory
);

// Main CRUD routes
router
  .route("/")
  .get(authorize("Doctor", "Nurse", "Admin", "Patient"), getMedicalRecords)
  .post(authorize("Doctor"), createMedicalRecord);

router
  .route("/:id")
  .get(authorize("Doctor", "Nurse", "Admin", "Patient"), getMedicalRecord)
  .put(authorize("Doctor", "Admin"), updateMedicalRecord)
  .delete(authorize("Admin"), deleteMedicalRecord);

// Status change routes
router.put("/:id/finalize", authorize("Doctor"), finalizeMedicalRecord);

module.exports = router;
