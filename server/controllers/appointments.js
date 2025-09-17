const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private (Doctor, Nurse, Receptionist, Admin)
exports.getAppointments = async (req, res, next) => {
  try {
    let query = {};

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.appointmentDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    } else if (req.query.date) {
      const date = new Date(req.query.date);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      query.appointmentDate = {
        $gte: date,
        $lt: nextDay,
      };
    }

    // Filter by doctor
    if (req.query.doctor) {
      query.doctor = req.query.doctor;
    }

    // Filter by patient
    if (req.query.patient) {
      query.patient = req.query.patient;
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by appointment type
    if (req.query.type) {
      query.appointmentType = req.query.type;
    }

    // Role-based filtering
    if (req.user.role === "Doctor") {
      query.doctor = req.user.id;
    } else if (req.user.role === "Patient") {
      const patient = await Patient.findOne({ user: req.user.id });
      if (patient) {
        query.patient = patient._id;
      } else {
        return res.status(404).json({
          success: false,
          message: "Patient profile not found",
        });
      }
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Appointment.countDocuments(query);

    // Execute query
    const appointments = await Appointment.find(query)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "firstName lastName email phone nic",
        },
      })
      .populate("doctor", "firstName lastName specialization email phone")
      .populate("createdBy", "firstName lastName role")
      .sort({ appointmentDate: 1 })
      .skip(startIndex)
      .limit(limit);

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: appointments.length,
      pagination,
      data: appointments,
    });
  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving appointments",
    });
  }
};

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private (Doctor, Nurse, Receptionist, Admin, Patient - own only)
exports.getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select:
            "firstName lastName email phone nic dateOfBirth gender address",
        },
      })
      .populate("doctor", "firstName lastName specialization email phone")
      .populate("createdBy", "firstName lastName role")
      .populate("updatedBy", "firstName lastName role");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check authorization
    if (req.user.role === "Patient") {
      const patient = await Patient.findOne({ user: req.user.id });
      if (
        !patient ||
        appointment.patient._id.toString() !== patient._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this appointment",
        });
      }
    } else if (
      req.user.role === "Doctor" &&
      appointment.doctor._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this appointment",
      });
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error("Get appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving appointment",
    });
  }
};

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private (Doctor, Nurse, Receptionist, Admin, Patient)
exports.createAppointment = async (req, res, next) => {
  try {
    const {
      patient: patientId,
      doctor: doctorId,
      appointmentDate,
      appointmentTime,
      appointmentType,
      reason,
      notes,
      priority,
    } = req.body;

    // Validate required fields
    if (
      !patientId ||
      !doctorId ||
      !appointmentDate ||
      !appointmentTime ||
      !appointmentType ||
      !reason
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Combine date and time
    const appointmentDateTime = new Date(
      `${appointmentDate}T${appointmentTime}`
    );

    // Validate appointment is in the future
    if (appointmentDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Appointment must be scheduled for a future date and time",
      });
    }

    // Validate patient exists
    const patient = await Patient.findById(patientId).populate("user");
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Validate doctor exists and has correct role
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "Doctor") {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check if patient can only book their own appointments
    if (req.user.role === "Patient") {
      const userPatient = await Patient.findOne({ user: req.user.id });
      if (!userPatient || userPatient._id.toString() !== patientId) {
        return res.status(403).json({
          success: false,
          message: "Patients can only book appointments for themselves",
        });
      }
    }

    // Check for scheduling conflicts (same doctor, overlapping time)
    const appointmentEndTime = new Date(
      appointmentDateTime.getTime() + 30 * 60000
    ); // 30 minutes default
    const conflictingAppointment = await Appointment.findOne({
      doctor: doctorId,
      status: { $in: ["Scheduled", "In Progress"] },
      appointmentDate: {
        $lt: appointmentEndTime,
        $gte: new Date(appointmentDateTime.getTime() - 30 * 60000),
      },
    });

    if (conflictingAppointment) {
      return res.status(400).json({
        success: false,
        message:
          "Doctor is not available at this time. Please choose a different time slot.",
      });
    }

    // Generate appointment ID
    const appointmentCount = await Appointment.countDocuments();
    const appointmentId = `APT${String(appointmentCount + 1).padStart(6, "0")}`;

    // Create appointment
    const appointment = await Appointment.create({
      appointmentId,
      patient: patientId,
      doctor: doctorId,
      appointmentDate: appointmentDateTime,
      appointmentType,
      reason,
      notes,
      priority: priority || "Medium",
      status: "Scheduled",
      createdBy: req.user.id,
    });

    // Populate the response
    await appointment.populate([
      {
        path: "patient",
        populate: {
          path: "user",
          select: "firstName lastName email phone",
        },
      },
      {
        path: "doctor",
        select: "firstName lastName specialization email",
      },
      {
        path: "createdBy",
        select: "firstName lastName role",
      },
    ]);

    // Send confirmation notification (implement as needed)
    // await sendAppointmentConfirmation(appointment);

    res.status(201).json({
      success: true,
      message: "Appointment scheduled successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating appointment",
    });
  }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private (Doctor, Nurse, Receptionist, Admin)
exports.updateAppointment = async (req, res, next) => {
  try {
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check authorization
    if (
      req.user.role === "Doctor" &&
      appointment.doctor.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this appointment",
      });
    }

    // Prevent updating completed or cancelled appointments
    if (
      ["Completed", "Cancelled"].includes(appointment.status) &&
      req.body.status !== appointment.status
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify completed or cancelled appointments",
      });
    }

    // If updating appointment time, check for conflicts
    if (req.body.appointmentDate || req.body.appointmentTime) {
      const newDate =
        req.body.appointmentDate ||
        appointment.appointmentDate.toISOString().split("T")[0];
      const newTime =
        req.body.appointmentTime ||
        appointment.appointmentDate
          .toTimeString()
          .split(" ")[0]
          .substring(0, 5);
      const newDateTime = new Date(`${newDate}T${newTime}`);

      if (newDateTime <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "Appointment must be scheduled for a future date and time",
        });
      }

      // Check for conflicts (excluding current appointment)
      const appointmentEndTime = new Date(newDateTime.getTime() + 30 * 60000);
      const conflictingAppointment = await Appointment.findOne({
        _id: { $ne: appointment._id },
        doctor: appointment.doctor,
        status: { $in: ["Scheduled", "In Progress"] },
        appointmentDate: {
          $lt: appointmentEndTime,
          $gte: new Date(newDateTime.getTime() - 30 * 60000),
        },
      });

      if (conflictingAppointment) {
        return res.status(400).json({
          success: false,
          message:
            "Doctor is not available at this time. Please choose a different time slot.",
        });
      }

      req.body.appointmentDate = newDateTime;
    }

    // Add updatedBy field
    req.body.updatedBy = req.user.id;

    // Update appointment
    appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate([
      {
        path: "patient",
        populate: {
          path: "user",
          select: "firstName lastName email phone",
        },
      },
      {
        path: "doctor",
        select: "firstName lastName specialization email",
      },
      {
        path: "updatedBy",
        select: "firstName lastName role",
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Update appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating appointment",
    });
  }
};

// @desc    Cancel appointment
// @route   PUT /api/appointments/:id/cancel
// @access  Private (Doctor, Nurse, Receptionist, Admin, Patient - own only)
exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check authorization
    if (req.user.role === "Patient") {
      const patient = await Patient.findOne({ user: req.user.id });
      if (
        !patient ||
        appointment.patient.toString() !== patient._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to cancel this appointment",
        });
      }
    } else if (
      req.user.role === "Doctor" &&
      appointment.doctor.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this appointment",
      });
    }

    // Check if appointment can be cancelled
    if (["Completed", "Cancelled"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel completed or already cancelled appointments",
      });
    }

    // Update appointment status
    appointment.status = "Cancelled";
    appointment.cancellationReason = req.body.reason || "No reason provided";
    appointment.cancelledBy = req.user.id;
    appointment.cancelledAt = new Date();
    appointment.updatedBy = req.user.id;

    await appointment.save();

    await appointment.populate([
      {
        path: "patient",
        populate: {
          path: "user",
          select: "firstName lastName email phone",
        },
      },
      {
        path: "doctor",
        select: "firstName lastName specialization email",
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error cancelling appointment",
    });
  }
};

// @desc    Complete appointment
// @route   PUT /api/appointments/:id/complete
// @access  Private (Doctor only)
exports.completeAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Only the assigned doctor can complete the appointment
    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned doctor can complete this appointment",
      });
    }

    // Check if appointment is in progress or scheduled
    if (!["Scheduled", "In Progress"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: "Only scheduled or in-progress appointments can be completed",
      });
    }

    // Update appointment
    appointment.status = "Completed";
    appointment.completedAt = new Date();
    appointment.clinicalNotes =
      req.body.clinicalNotes || appointment.clinicalNotes;
    appointment.diagnosis = req.body.diagnosis || appointment.diagnosis;
    appointment.treatment = req.body.treatment || appointment.treatment;
    appointment.followUpInstructions =
      req.body.followUpInstructions || appointment.followUpInstructions;
    appointment.nextAppointmentDate =
      req.body.nextAppointmentDate || appointment.nextAppointmentDate;
    appointment.updatedBy = req.user.id;

    await appointment.save();

    await appointment.populate([
      {
        path: "patient",
        populate: {
          path: "user",
          select: "firstName lastName email phone",
        },
      },
      {
        path: "doctor",
        select: "firstName lastName specialization",
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Appointment completed successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Complete appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error completing appointment",
    });
  }
};

// @desc    Get doctor's schedule
// @route   GET /api/appointments/schedule/:doctorId
// @access  Private (Doctor, Nurse, Receptionist, Admin)
exports.getDoctorSchedule = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    // Validate doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "Doctor") {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    let query = { doctor: doctorId };

    // Filter by date if provided
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);

      query.appointmentDate = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const appointments = await Appointment.find(query)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "firstName lastName phone",
        },
      })
      .sort({ appointmentDate: 1 });

    res.status(200).json({
      success: true,
      data: {
        doctor: {
          id: doctor._id,
          name: `${doctor.firstName} ${doctor.lastName}`,
          specialization: doctor.specialization,
        },
        appointments,
      },
    });
  } catch (error) {
    console.error("Get doctor schedule error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving doctor schedule",
    });
  }
};

// @desc    Get appointment statistics
// @route   GET /api/appointments/stats
// @access  Private (Doctor, Nurse, Receptionist, Admin)
exports.getAppointmentStats = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const stats = await Appointment.aggregate([
      {
        $facet: {
          totalAppointments: [{ $count: "count" }],
          todayAppointments: [
            {
              $match: {
                appointmentDate: {
                  $gte: startOfDay,
                  $lte: endOfDay,
                },
              },
            },
            { $count: "count" },
          ],
          statusDistribution: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          typeDistribution: [
            {
              $group: {
                _id: "$appointmentType",
                count: { $sum: 1 },
              },
            },
          ],
          monthlyTrend: [
            {
              $match: {
                appointmentDate: {
                  $gte: new Date(
                    new Date().getFullYear(),
                    new Date().getMonth() - 11,
                    1
                  ),
                },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$appointmentDate" },
                  month: { $month: "$appointmentDate" },
                },
                count: { $sum: 1 },
              },
            },
            {
              $sort: { "_id.year": 1, "_id.month": 1 },
            },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: stats[0].totalAppointments[0]?.count || 0,
        today: stats[0].todayAppointments[0]?.count || 0,
        statusDistribution: stats[0].statusDistribution,
        typeDistribution: stats[0].typeDistribution,
        monthlyTrend: stats[0].monthlyTrend,
      },
    });
  } catch (error) {
    console.error("Get appointment stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving appointment statistics",
    });
  }
};
