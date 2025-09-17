const Patient = require("../models/Patient");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const MedicalRecord = require("../models/MedicalRecord");
const Prescription = require("../models/Prescription");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private (Doctor, Nurse, Receptionist, Admin)
exports.getPatients = async (req, res, next) => {
  try {
    // Build query
    let query = {};

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      const users = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { nic: searchRegex },
        ],
        role: "Patient",
      }).select("_id");

      const userIds = users.map((user) => user._id);
      query.user = { $in: userIds };
    }

    // Filter by blood type
    if (req.query.bloodType) {
      query.bloodType = req.query.bloodType;
    }

    // Filter by insurance provider
    if (req.query.insuranceProvider) {
      query["insurance.provider"] = new RegExp(
        req.query.insuranceProvider,
        "i"
      );
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Patient.countDocuments(query);

    // Execute query with population
    const patients = await Patient.find(query)
      .populate({
        path: "user",
        select:
          "firstName lastName email nic phone dateOfBirth gender address emergencyContact status",
      })
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 })
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
      count: patients.length,
      pagination,
      data: patients,
    });
  } catch (error) {
    console.error("Get patients error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving patients",
    });
  }
};

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Private (Doctor, Nurse, Receptionist, Admin, Patient - own only)
exports.getPatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate({
        path: "user",
        select:
          "firstName lastName email nic phone dateOfBirth gender address emergencyContact status",
      })
      .populate("createdBy", "firstName lastName")
      .populate("updatedBy", "firstName lastName");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Check if user can access this patient
    if (
      req.user.role === "Patient" &&
      patient.user._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this patient",
      });
    }

    // Get recent medical activity
    const recentAppointments = await Appointment.find({ patient: patient._id })
      .populate("doctor", "firstName lastName")
      .sort({ appointmentDate: -1 })
      .limit(5);

    const recentRecords = await MedicalRecord.find({ patient: patient._id })
      .populate("doctor", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(5);

    const activePrescriptions = await Prescription.find({
      patient: patient._id,
      status: "Active",
    })
      .populate("doctor", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        patient,
        recentActivity: {
          appointments: recentAppointments,
          medicalRecords: recentRecords,
          prescriptions: activePrescriptions,
        },
      },
    });
  } catch (error) {
    console.error("Get patient error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving patient",
    });
  }
};

// @desc    Create new patient
// @route   POST /api/patients
// @access  Private (Doctor, Nurse, Receptionist, Admin)
exports.createPatient = async (req, res, next) => {
  try {
    const {
      // User fields
      firstName,
      lastName,
      email,
      nic,
      phone,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      // Patient specific fields
      bloodType,
      height,
      weight,
      medicalHistory,
      allergies,
      chronicConditions,
      insurance,
      patientId,
    } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !nic ||
      !phone ||
      !dateOfBirth ||
      !gender ||
      !address
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { nic }],
    });

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "NIC";
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`,
      });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + "Temp1!";

    // Create user account
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: tempPassword,
      nic,
      phone,
      dateOfBirth,
      gender,
      address,
      role: "Patient",
      emergencyContact,
      status: "Active",
      isEmailVerified: true, // Admin created accounts are auto-verified
      isTemporaryPassword: true,
    });

    // Create patient profile
    const patient = await Patient.create({
      user: user._id,
      bloodType,
      height,
      weight,
      medicalHistory: medicalHistory || [],
      allergies: allergies || [],
      chronicConditions: chronicConditions || [],
      insurance,
      patientId,
      createdBy: req.user.id,
    });

    // Populate the response
    await patient.populate({
      path: "user",
      select:
        "firstName lastName email nic phone dateOfBirth gender address emergencyContact status",
    });

    // Send welcome email with temporary password
    // Note: In production, consider using a more secure method
    try {
      const sendEmail = require("../utils/sendEmail");
      await sendEmail({
        email: user.email,
        subject: "MediVault - Account Created",
        html: `
          <h2>Welcome to MediVault</h2>
          <p>Your patient account has been created by our medical staff.</p>
          <p><strong>Temporary Login Details:</strong></p>
          <p>Email: ${user.email}</p>
          <p>Password: ${tempPassword}</p>
          <p><strong>Important:</strong> Please log in and change your password immediately for security.</p>
          <p>You can log in at: ${req.protocol}://${req.get("host")}/login</p>
        `,
      });
    } catch (emailError) {
      console.error("Welcome email failed:", emailError);
    }

    res.status(201).json({
      success: true,
      message: "Patient created successfully",
      data: patient,
      tempPassword, // Remove this in production for security
    });
  } catch (error) {
    console.error("Create patient error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating patient",
    });
  }
};

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private (Doctor, Nurse, Receptionist, Admin, Patient - own only)
exports.updatePatient = async (req, res, next) => {
  try {
    let patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Check if user can update this patient
    if (
      req.user.role === "Patient" &&
      patient.user.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this patient",
      });
    }

    // Separate user fields and patient fields
    const userFields = {};
    const patientFields = {};

    const userFieldNames = [
      "firstName",
      "lastName",
      "phone",
      "address",
      "emergencyContact",
    ];
    const patientFieldNames = [
      "bloodType",
      "height",
      "weight",
      "medicalHistory",
      "allergies",
      "chronicConditions",
      "insurance",
    ];

    // Categorize fields
    Object.keys(req.body).forEach((key) => {
      if (userFieldNames.includes(key)) {
        userFields[key] = req.body[key];
      } else if (patientFieldNames.includes(key)) {
        patientFields[key] = req.body[key];
      }
    });

    // Update user fields if any
    if (Object.keys(userFields).length > 0) {
      await User.findByIdAndUpdate(patient.user, userFields, {
        new: true,
        runValidators: true,
      });
    }

    // Update patient fields
    patientFields.updatedBy = req.user.id;
    patient = await Patient.findByIdAndUpdate(req.params.id, patientFields, {
      new: true,
      runValidators: true,
    }).populate({
      path: "user",
      select:
        "firstName lastName email nic phone dateOfBirth gender address emergencyContact status",
    });

    res.status(200).json({
      success: true,
      message: "Patient updated successfully",
      data: patient,
    });
  } catch (error) {
    console.error("Update patient error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating patient",
    });
  }
};

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Private (Admin only)
exports.deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Check for existing appointments, medical records, prescriptions
    const appointments = await Appointment.countDocuments({
      patient: patient._id,
    });
    const medicalRecords = await MedicalRecord.countDocuments({
      patient: patient._id,
    });
    const prescriptions = await Prescription.countDocuments({
      patient: patient._id,
    });

    if (appointments > 0 || medicalRecords > 0 || prescriptions > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete patient with existing medical records, appointments, or prescriptions. Consider deactivating the account instead.",
      });
    }

    // Delete patient and associated user account
    await Patient.findByIdAndDelete(req.params.id);
    await User.findByIdAndDelete(patient.user);

    res.status(200).json({
      success: true,
      message: "Patient deleted successfully",
      data: {},
    });
  } catch (error) {
    console.error("Delete patient error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting patient",
    });
  }
};

// @desc    Get patient medical history
// @route   GET /api/patients/:id/medical-history
// @access  Private (Doctor, Nurse, Patient - own only)
exports.getPatientMedicalHistory = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Check access permissions
    if (
      req.user.role === "Patient" &&
      patient.user.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this patient's medical history",
      });
    }

    // Get comprehensive medical history
    const [medicalRecords, prescriptions, appointments] = await Promise.all([
      MedicalRecord.find({ patient: patient._id })
        .populate("doctor", "firstName lastName specialization")
        .sort({ createdAt: -1 }),

      Prescription.find({ patient: patient._id })
        .populate("doctor", "firstName lastName")
        .populate("medicines.medicine")
        .sort({ createdAt: -1 }),

      Appointment.find({ patient: patient._id, status: "Completed" })
        .populate("doctor", "firstName lastName specialization")
        .sort({ appointmentDate: -1 }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        patient: {
          medicalHistory: patient.medicalHistory,
          allergies: patient.allergies,
          chronicConditions: patient.chronicConditions,
          bloodType: patient.bloodType,
          vitals: patient.vitals,
        },
        medicalRecords,
        prescriptions,
        completedAppointments: appointments,
      },
    });
  } catch (error) {
    console.error("Get medical history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving medical history",
    });
  }
};

// @desc    Update patient vitals
// @route   PUT /api/patients/:id/vitals
// @access  Private (Doctor, Nurse)
exports.updatePatientVitals = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const {
      bloodPressure,
      heartRate,
      temperature,
      respiratoryRate,
      oxygenSaturation,
      height,
      weight,
    } = req.body;

    // Create vitals entry
    const vitalEntry = {
      bloodPressure,
      heartRate,
      temperature,
      respiratoryRate,
      oxygenSaturation,
      recordedAt: new Date(),
      recordedBy: req.user.id,
    };

    // Add to vitals array
    patient.vitals.push(vitalEntry);

    // Update current height and weight if provided
    if (height) patient.height = height;
    if (weight) patient.weight = weight;

    // Calculate BMI if both height and weight are available
    if (patient.height && patient.weight) {
      const heightInMeters = patient.height / 100;
      patient.bmi = (
        patient.weight /
        (heightInMeters * heightInMeters)
      ).toFixed(1);
    }

    patient.updatedBy = req.user.id;
    await patient.save();

    await patient.populate({
      path: "vitals.recordedBy",
      select: "firstName lastName role",
    });

    res.status(200).json({
      success: true,
      message: "Patient vitals updated successfully",
      data: patient,
    });
  } catch (error) {
    console.error("Update vitals error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating patient vitals",
    });
  }
};

// @desc    Get patient statistics (for dashboard)
// @route   GET /api/patients/stats
// @access  Private (Doctor, Nurse, Receptionist, Admin)
exports.getPatientStats = async (req, res, next) => {
  try {
    const stats = await Patient.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $group: {
          _id: null,
          totalPatients: { $sum: 1 },
          activePatients: {
            $sum: {
              $cond: [{ $eq: ["$userInfo.status", "Active"] }, 1, 0],
            },
          },
          malePatients: {
            $sum: {
              $cond: [{ $eq: ["$userInfo.gender", "Male"] }, 1, 0],
            },
          },
          femalePatients: {
            $sum: {
              $cond: [{ $eq: ["$userInfo.gender", "Female"] }, 1, 0],
            },
          },
          avgAge: {
            $avg: {
              $divide: [
                { $subtract: [new Date(), "$userInfo.dateOfBirth"] },
                365.25 * 24 * 60 * 60 * 1000,
              ],
            },
          },
        },
      },
    ]);

    const bloodTypeStats = await Patient.aggregate([
      {
        $match: { bloodType: { $exists: true, $ne: null } },
      },
      {
        $group: {
          _id: "$bloodType",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalPatients: 0,
          activePatients: 0,
          malePatients: 0,
          femalePatients: 0,
          avgAge: 0,
        },
        bloodTypeDistribution: bloodTypeStats,
      },
    });
  } catch (error) {
    console.error("Get patient stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving patient statistics",
    });
  }
};
