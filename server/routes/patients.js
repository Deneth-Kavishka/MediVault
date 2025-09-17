const express = require("express");
const {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientMedicalHistory,
  updatePatientVitals,
  getPatientStats,
} = require("../controllers/patients");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

// Statistics route (must be before /:id routes)
router.get(
  "/stats",
  authorize("Doctor", "Nurse", "Receptionist", "Admin"),
  getPatientStats
);

// Main CRUD routes
router
  .route("/")
  .get(authorize("Doctor", "Nurse", "Receptionist", "Admin"), getPatients)
  .post(authorize("Doctor", "Nurse", "Receptionist", "Admin"), createPatient);

router
  .route("/:id")
  .get(
    authorize("Doctor", "Nurse", "Receptionist", "Admin", "Patient"),
    getPatient
  )
  .put(
    authorize("Doctor", "Nurse", "Receptionist", "Admin", "Patient"),
    updatePatient
  )
  .delete(authorize("Admin"), deletePatient);

// Medical history and vitals
router.get(
  "/:id/medical-history",
  authorize("Doctor", "Nurse", "Patient"),
  getPatientMedicalHistory
);
router.put("/:id/vitals", authorize("Doctor", "Nurse"), updatePatientVitals);

module.exports = router;
