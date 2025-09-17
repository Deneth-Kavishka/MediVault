const express = require("express");
const {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  completeAppointment,
  getDoctorSchedule,
  getAppointmentStats,
} = require("../controllers/appointments");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

// Statistics and schedule routes (must be before /:id routes)
router.get(
  "/stats",
  authorize("Doctor", "Nurse", "Receptionist", "Admin"),
  getAppointmentStats
);
router.get(
  "/schedule/:doctorId",
  authorize("Doctor", "Nurse", "Receptionist", "Admin"),
  getDoctorSchedule
);

// Main CRUD routes
router
  .route("/")
  .get(getAppointments) // All authenticated users can view appointments (filtered by role)
  .post(createAppointment); // All authenticated users can create appointments

router
  .route("/:id")
  .get(getAppointment) // All authenticated users can view specific appointments (with authorization checks)
  .put(
    authorize("Doctor", "Nurse", "Receptionist", "Admin"),
    updateAppointment
  );

// Status change routes
router.put("/:id/cancel", cancelAppointment); // Patients can cancel their own, staff can cancel any
router.put("/:id/complete", authorize("Doctor"), completeAppointment);

module.exports = router;
