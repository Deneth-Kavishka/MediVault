const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes - Check for valid JWT token
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(" ")[1];
  }
  // Check for token in cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route - No token provided",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route - User not found",
      });
    }

    // Check if user account is active
    if (user.status !== "Active") {
      return res.status(401).json({
        success: false,
        message: "Account is not active. Please contact administrator.",
      });
    }

    // Check if user account is locked
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message:
          "Account is temporarily locked due to multiple failed login attempts",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route - Invalid token",
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

// Check if user can access patient data
exports.canAccessPatient = async (req, res, next) => {
  const { patientId } = req.params;

  try {
    // Admin and doctors can access all patients
    if (["Admin", "Doctor"].includes(req.user.role)) {
      return next();
    }

    // Patients can only access their own data
    if (req.user.role === "Patient") {
      const Patient = require("../models/Patient");
      const patient = await Patient.findOne({ user: req.user._id });

      if (!patient || patient._id.toString() !== patientId) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this patient data",
        });
      }
    }

    // Nurses, pharmacists, and lab technicians can access patients assigned to them
    // This would require additional logic based on assignments

    next();
  } catch (error) {
    console.error("Patient access check error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during authorization check",
    });
  }
};

// Check if user can modify medical records
exports.canModifyMedicalRecord = async (req, res, next) => {
  const { recordId } = req.params;

  try {
    // Only doctors can modify medical records
    if (!["Doctor", "Admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify medical records",
      });
    }

    // Doctors can only modify their own records (unless admin)
    if (req.user.role === "Doctor") {
      const MedicalRecord = require("../models/MedicalRecord");
      const record = await MedicalRecord.findById(recordId);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: "Medical record not found",
        });
      }

      if (record.doctor.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to modify this medical record",
        });
      }
    }

    next();
  } catch (error) {
    console.error("Medical record authorization error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during authorization check",
    });
  }
};

// Rate limiting for sensitive operations
exports.rateLimitSensitive = (req, res, next) => {
  // This would be implemented with redis or memory store
  // For now, just pass through
  next();
};

// Audit log middleware
exports.auditLog = (action) => {
  return async (req, res, next) => {
    try {
      // Log the action for audit purposes
      const auditData = {
        user: req.user._id,
        action,
        resource: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
        details: {
          params: req.params,
          body:
            req.method === "POST" || req.method === "PUT"
              ? req.body
              : undefined,
        },
      };

      // In a real application, you would save this to an audit log collection
      console.log("Audit Log:", JSON.stringify(auditData, null, 2));

      next();
    } catch (error) {
      console.error("Audit logging error:", error);
      next(); // Don't block the request if audit logging fails
    }
  };
};

// Check if prescription belongs to user
exports.canAccessPrescription = async (req, res, next) => {
  const { prescriptionId } = req.params;

  try {
    const Prescription = require("../models/Prescription");
    const prescription =
      await Prescription.findById(prescriptionId).populate("patient");

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    // Doctors can access prescriptions they wrote
    if (
      req.user.role === "Doctor" &&
      prescription.doctor.toString() === req.user._id.toString()
    ) {
      return next();
    }

    // Patients can access their own prescriptions
    if (
      req.user.role === "Patient" &&
      prescription.patient.user.toString() === req.user._id.toString()
    ) {
      return next();
    }

    // Pharmacists can access all prescriptions for dispensing
    if (req.user.role === "Pharmacist") {
      return next();
    }

    // Admins can access all prescriptions
    if (req.user.role === "Admin") {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Not authorized to access this prescription",
    });
  } catch (error) {
    console.error("Prescription access check error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during authorization check",
    });
  }
};

// Check pharmacy access for dispensing
exports.checkPharmacyAccess = (req, res, next) => {
  if (!["Pharmacist", "Admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Pharmacy credentials required.",
    });
  }
  next();
};

// Check lab technician access
exports.checkLabAccess = (req, res, next) => {
  if (!["LabTechnician", "Doctor", "Admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Laboratory credentials required.",
    });
  }
  next();
};
