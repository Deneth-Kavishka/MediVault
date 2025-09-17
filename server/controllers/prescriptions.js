const QRCode = require("qrcode");
const Prescription = require("../models/Prescription");
const Patient = require("../models/Patient");
const Medicine = require("../models/Medicine");
const User = require("../models/User");
const Inventory = require("../models/Inventory");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all prescriptions
// @route   GET /api/prescriptions
// @access  Private (Doctor, Nurse, Pharmacist, Admin)
exports.getPrescriptions = async (req, res, next) => {
  try {
    let query = {};

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

    // Filter by patient
    if (req.query.patient) {
      query.patient = req.query.patient;
    }

    // Filter by doctor
    if (req.query.doctor) {
      query.doctor = req.query.doctor;
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    // Search by prescription ID
    if (req.query.prescriptionId) {
      query.prescriptionId = new RegExp(req.query.prescriptionId, "i");
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Prescription.countDocuments(query);

    // Execute query
    const prescriptions = await Prescription.find(query)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "firstName lastName email phone nic",
        },
      })
      .populate("doctor", "firstName lastName specialization")
      .populate("medicines.medicine")
      .populate("createdBy", "firstName lastName role")
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
      count: prescriptions.length,
      pagination,
      data: prescriptions,
    });
  } catch (error) {
    console.error("Get prescriptions error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving prescriptions",
    });
  }
};

// @desc    Get single prescription
// @route   GET /api/prescriptions/:id
// @access  Private (Doctor, Nurse, Pharmacist, Admin, Patient - own only)
exports.getPrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "firstName lastName email phone nic dateOfBirth allergies",
        },
      })
      .populate("doctor", "firstName lastName specialization licenseNumber")
      .populate("medicines.medicine")
      .populate("createdBy", "firstName lastName role")
      .populate("dispensedBy", "firstName lastName role")
      .populate("refills.dispensedBy", "firstName lastName role");

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    // Check authorization
    if (req.user.role === "Patient") {
      const patient = await Patient.findOne({ user: req.user.id });
      if (
        !patient ||
        prescription.patient._id.toString() !== patient._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this prescription",
        });
      }
    } else if (
      req.user.role === "Doctor" &&
      prescription.doctor._id.toString() !== req.user.id
    ) {
      // Doctors can only view their own prescriptions unless admin/pharmacist
      if (!["Admin", "Pharmacist"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this prescription",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    console.error("Get prescription error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving prescription",
    });
  }
};

// @desc    Create new prescription
// @route   POST /api/prescriptions
// @access  Private (Doctor only)
exports.createPrescription = async (req, res, next) => {
  try {
    const {
      patient: patientId,
      medicines,
      instructions,
      diagnosis,
      notes,
      refillsAllowed,
      validUntil,
    } = req.body;

    // Validate required fields
    if (
      !patientId ||
      !medicines ||
      !Array.isArray(medicines) ||
      medicines.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide patient ID and at least one medicine",
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

    // Validate medicines exist and check for interactions
    const medicineDetails = [];
    const patientAllergies = patient.allergies || [];

    for (const med of medicines) {
      const medicine = await Medicine.findById(med.medicine);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine not found: ${med.medicine}`,
        });
      }

      // Check for allergies
      const allergyConflict = patientAllergies.some((allergy) =>
        medicine.activeIngredients.some((ingredient) =>
          ingredient.toLowerCase().includes(allergy.allergen.toLowerCase())
        )
      );

      if (allergyConflict) {
        return res.status(400).json({
          success: false,
          message: `Patient is allergic to ingredients in ${medicine.name}. Please review patient allergies.`,
        });
      }

      medicineDetails.push(medicine);
    }

    // Check for drug interactions
    const interactions = [];
    for (let i = 0; i < medicineDetails.length; i++) {
      for (let j = i + 1; j < medicineDetails.length; j++) {
        const med1 = medicineDetails[i];
        const med2 = medicineDetails[j];

        // Check if med1 has interactions with med2
        const interaction = med1.interactions.find(
          (inter) => inter.medicine.toString() === med2._id.toString()
        );

        if (interaction && interaction.severity === "Major") {
          interactions.push({
            medicine1: med1.name,
            medicine2: med2.name,
            severity: interaction.severity,
            description: interaction.description,
          });
        }
      }
    }

    if (interactions.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Major drug interactions detected",
        interactions,
      });
    }

    // Generate prescription ID
    const prescriptionCount = await Prescription.countDocuments();
    const prescriptionId = `RX${String(prescriptionCount + 1).padStart(8, "0")}`;

    // Calculate total cost
    let totalCost = 0;
    const processedMedicines = medicines.map((med, index) => {
      const medicine = medicineDetails[index];
      const cost = medicine.unitPrice * med.quantity;
      totalCost += cost;

      return {
        medicine: med.medicine,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        quantity: med.quantity,
        instructions: med.instructions,
        unitPrice: medicine.unitPrice,
        totalPrice: cost,
      };
    });

    // Create prescription
    const prescription = await Prescription.create({
      prescriptionId,
      patient: patientId,
      doctor: req.user.id,
      medicines: processedMedicines,
      instructions,
      diagnosis,
      notes,
      refillsAllowed: refillsAllowed || 0,
      refillsRemaining: refillsAllowed || 0,
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      totalCost,
      status: "Active",
      createdBy: req.user.id,
    });

    // Generate QR code
    const qrData = {
      prescriptionId: prescription.prescriptionId,
      patientId: patient.user.nic,
      doctorId: req.user.nic,
      medicines: processedMedicines.map((m) => ({
        id: m.medicine,
        dosage: m.dosage,
        quantity: m.quantity,
      })),
      issuedAt: prescription.createdAt,
      validUntil: prescription.validUntil,
      hash: prescription.verificationHash,
    };

    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.92,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    prescription.qrCode = qrCodeDataURL;
    await prescription.save();

    // Populate the response
    await prescription.populate([
      {
        path: "patient",
        populate: {
          path: "user",
          select: "firstName lastName email phone nic",
        },
      },
      {
        path: "doctor",
        select: "firstName lastName specialization licenseNumber",
      },
      {
        path: "medicines.medicine",
      },
    ]);

    res.status(201).json({
      success: true,
      message: "Prescription created successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Create prescription error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating prescription",
    });
  }
};

// @desc    Update prescription
// @route   PUT /api/prescriptions/:id
// @access  Private (Doctor - own only, Admin)
exports.updatePrescription = async (req, res, next) => {
  try {
    let prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    // Check authorization
    if (
      req.user.role === "Doctor" &&
      prescription.doctor.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this prescription",
      });
    }

    // Prevent updating dispensed or expired prescriptions
    if (["Dispensed", "Expired", "Cancelled"].includes(prescription.status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot update dispensed, expired, or cancelled prescriptions",
      });
    }

    // Only allow certain fields to be updated
    const allowedFields = ["instructions", "notes", "validUntil", "status"];
    const updateFields = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    updateFields.updatedBy = req.user.id;

    prescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      updateFields,
      {
        new: true,
        runValidators: true,
      }
    ).populate([
      {
        path: "patient",
        populate: {
          path: "user",
          select: "firstName lastName email phone nic",
        },
      },
      {
        path: "doctor",
        select: "firstName lastName specialization",
      },
      {
        path: "medicines.medicine",
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Prescription updated successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Update prescription error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating prescription",
    });
  }
};

// @desc    Cancel prescription
// @route   PUT /api/prescriptions/:id/cancel
// @access  Private (Doctor - own only, Admin)
exports.cancelPrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    // Check authorization
    if (
      req.user.role === "Doctor" &&
      prescription.doctor.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this prescription",
      });
    }

    // Check if prescription can be cancelled
    if (["Dispensed", "Expired", "Cancelled"].includes(prescription.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot cancel dispensed, expired, or already cancelled prescriptions",
      });
    }

    prescription.status = "Cancelled";
    prescription.cancellationReason = req.body.reason || "No reason provided";
    prescription.cancelledBy = req.user.id;
    prescription.cancelledAt = new Date();
    prescription.updatedBy = req.user.id;

    await prescription.save();

    res.status(200).json({
      success: true,
      message: "Prescription cancelled successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Cancel prescription error:", error);
    res.status(500).json({
      success: false,
      message: "Server error cancelling prescription",
    });
  }
};

// @desc    Dispense prescription
// @route   PUT /api/prescriptions/:id/dispense
// @access  Private (Pharmacist only)
exports.dispensePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    // Check if prescription is valid for dispensing
    if (prescription.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Only active prescriptions can be dispensed",
      });
    }

    // Check if prescription is expired
    if (prescription.validUntil < new Date()) {
      prescription.status = "Expired";
      await prescription.save();
      return res.status(400).json({
        success: false,
        message: "Prescription has expired",
      });
    }

    // Check inventory for all medicines
    const unavailableMedicines = [];
    for (const med of prescription.medicines) {
      const inventory = await Inventory.findOne({
        medicine: med.medicine,
        quantityInStock: { $gte: med.quantity },
        expiryDate: { $gt: new Date() },
      });

      if (!inventory) {
        const medicine = await Medicine.findById(med.medicine);
        unavailableMedicines.push(medicine.name);
      }
    }

    if (unavailableMedicines.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock or expired medicines",
        unavailableMedicines,
      });
    }

    // Update inventory (FIFO - First In, First Out)
    for (const med of prescription.medicines) {
      let remainingQuantity = med.quantity;

      while (remainingQuantity > 0) {
        const inventory = await Inventory.findOne({
          medicine: med.medicine,
          quantityInStock: { $gt: 0 },
          expiryDate: { $gt: new Date() },
        }).sort({ expiryDate: 1 }); // Oldest first (FIFO)

        if (!inventory) break;

        const dispensedFromBatch = Math.min(
          remainingQuantity,
          inventory.quantityInStock
        );

        inventory.quantityInStock -= dispensedFromBatch;
        inventory.movements.push({
          type: "Outgoing",
          quantity: dispensedFromBatch,
          reason: "Prescription Dispensed",
          reference: prescription.prescriptionId,
          performedBy: req.user.id,
        });

        await inventory.save();
        remainingQuantity -= dispensedFromBatch;
      }
    }

    // Update prescription status
    prescription.status = "Dispensed";
    prescription.dispensedAt = new Date();
    prescription.dispensedBy = req.user.id;
    prescription.dispensingNotes = req.body.notes;
    prescription.updatedBy = req.user.id;

    await prescription.save();

    await prescription.populate([
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
      {
        path: "medicines.medicine",
      },
      {
        path: "dispensedBy",
        select: "firstName lastName",
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Prescription dispensed successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Dispense prescription error:", error);
    res.status(500).json({
      success: false,
      message: "Server error dispensing prescription",
    });
  }
};

// @desc    Verify prescription by QR code
// @route   POST /api/prescriptions/verify
// @access  Private (Pharmacist, Doctor, Nurse, Admin)
exports.verifyPrescription = async (req, res, next) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: "QR code data is required",
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR code format",
      });
    }

    // Find prescription by ID
    const prescription = await Prescription.findOne({
      prescriptionId: parsedData.prescriptionId,
    })
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "firstName lastName nic",
        },
      })
      .populate("doctor", "firstName lastName nic licenseNumber")
      .populate("medicines.medicine");

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    // Verify prescription data
    const isValid =
      prescription.verificationHash === parsedData.hash &&
      prescription.patient.user.nic === parsedData.patientId &&
      prescription.doctor.nic === parsedData.doctorId;

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message:
          "Prescription verification failed - data integrity compromised",
      });
    }

    // Check if prescription is still valid
    const isExpired = prescription.validUntil < new Date();
    const isActive = prescription.status === "Active";

    res.status(200).json({
      success: true,
      message: "Prescription verified successfully",
      data: {
        prescription,
        verification: {
          isValid: true,
          isExpired,
          isActive,
          canDispense: isActive && !isExpired,
          verifiedAt: new Date(),
        },
      },
    });
  } catch (error) {
    console.error("Verify prescription error:", error);
    res.status(500).json({
      success: false,
      message: "Server error verifying prescription",
    });
  }
};

// @desc    Get prescription statistics
// @route   GET /api/prescriptions/stats
// @access  Private (Doctor, Pharmacist, Admin)
exports.getPrescriptionStats = async (req, res, next) => {
  try {
    const stats = await Prescription.aggregate([
      {
        $facet: {
          totalPrescriptions: [{ $count: "count" }],
          statusDistribution: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          monthlyTrend: [
            {
              $match: {
                createdAt: {
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
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                count: { $sum: 1 },
                totalCost: { $sum: "$totalCost" },
              },
            },
            {
              $sort: { "_id.year": 1, "_id.month": 1 },
            },
          ],
          topMedicines: [
            { $unwind: "$medicines" },
            {
              $lookup: {
                from: "medicines",
                localField: "medicines.medicine",
                foreignField: "_id",
                as: "medicineInfo",
              },
            },
            { $unwind: "$medicineInfo" },
            {
              $group: {
                _id: "$medicineInfo.name",
                prescriptionCount: { $sum: 1 },
                totalQuantity: { $sum: "$medicines.quantity" },
              },
            },
            { $sort: { prescriptionCount: -1 } },
            { $limit: 10 },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: stats[0].totalPrescriptions[0]?.count || 0,
        statusDistribution: stats[0].statusDistribution,
        monthlyTrend: stats[0].monthlyTrend,
        topMedicines: stats[0].topMedicines,
      },
    });
  } catch (error) {
    console.error("Get prescription stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving prescription statistics",
    });
  }
};
