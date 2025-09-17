const MedicalRecord = require("../models/MedicalRecord");
const Patient = require("../models/Patient");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all medical records
// @route   GET /api/medical-records
// @access  Private (Doctor, Nurse, Admin)
exports.getMedicalRecords = async (req, res, next) => {
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

    // Filter by record type
    if (req.query.recordType) {
      query.recordType = req.query.recordType;
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.visitDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    // Search in chief complaint, diagnosis, or treatment
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { chiefComplaint: searchRegex },
        { "diagnoses.primaryDiagnosis": searchRegex },
        { "diagnoses.secondaryDiagnoses": searchRegex },
        { "treatment.medications": searchRegex },
        { "treatment.procedures": searchRegex },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await MedicalRecord.countDocuments(query);

    // Execute query
    const medicalRecords = await MedicalRecord.find(query)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select: "firstName lastName email phone nic",
        },
      })
      .populate("doctor", "firstName lastName specialization")
      .populate("createdBy", "firstName lastName role")
      .populate("amendments.amendedBy", "firstName lastName role")
      .sort({ visitDate: -1 })
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
      count: medicalRecords.length,
      pagination,
      data: medicalRecords,
    });
  } catch (error) {
    console.error("Get medical records error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving medical records",
    });
  }
};

// @desc    Get single medical record
// @route   GET /api/medical-records/:id
// @access  Private (Doctor, Nurse, Admin, Patient - own only)
exports.getMedicalRecord = async (req, res, next) => {
  try {
    const medicalRecord = await MedicalRecord.findById(req.params.id)
      .populate({
        path: "patient",
        populate: {
          path: "user",
          select:
            "firstName lastName email phone nic dateOfBirth gender allergies",
        },
      })
      .populate("doctor", "firstName lastName specialization licenseNumber")
      .populate("createdBy", "firstName lastName role")
      .populate("updatedBy", "firstName lastName role")
      .populate("amendments.amendedBy", "firstName lastName role")
      .populate("digitalSignature.signedBy", "firstName lastName role");

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found",
      });
    }

    // Check authorization
    if (req.user.role === "Patient") {
      const patient = await Patient.findOne({ user: req.user.id });
      if (
        !patient ||
        medicalRecord.patient._id.toString() !== patient._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this medical record",
        });
      }
    } else if (
      req.user.role === "Doctor" &&
      medicalRecord.doctor._id.toString() !== req.user.id
    ) {
      // Doctors can view records from other doctors for continuity of care
      // but with limited access based on hospital policy
    }

    res.status(200).json({
      success: true,
      data: medicalRecord,
    });
  } catch (error) {
    console.error("Get medical record error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving medical record",
    });
  }
};

// @desc    Create new medical record
// @route   POST /api/medical-records
// @access  Private (Doctor only)
exports.createMedicalRecord = async (req, res, next) => {
  try {
    const {
      patient: patientId,
      recordType,
      visitDate,
      chiefComplaint,
      historyOfPresentIllness,
      pastMedicalHistory,
      socialHistory,
      familyHistory,
      reviewOfSystems,
      physicalExamination,
      diagnoses,
      treatment,
      labResults,
      imagingResults,
      followUpPlan,
      notes,
      vitals,
    } = req.body;

    // Validate required fields
    if (!patientId || !recordType || !visitDate || !chiefComplaint) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
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

    // Generate record ID
    const recordCount = await MedicalRecord.countDocuments();
    const recordId = `MR${String(recordCount + 1).padStart(8, "0")}`;

    // Create medical record
    const medicalRecord = await MedicalRecord.create({
      recordId,
      patient: patientId,
      doctor: req.user.id,
      recordType,
      visitDate: new Date(visitDate),
      chiefComplaint,
      historyOfPresentIllness,
      pastMedicalHistory,
      socialHistory,
      familyHistory,
      reviewOfSystems,
      physicalExamination,
      diagnoses,
      treatment,
      labResults: labResults || [],
      imagingResults: imagingResults || [],
      followUpPlan,
      notes,
      vitals,
      status: "Draft",
      createdBy: req.user.id,
    });

    // Update patient's medical history if new conditions are diagnosed
    if (diagnoses && diagnoses.primaryDiagnosis) {
      const existingCondition = patient.chronicConditions.find(
        (condition) => condition.condition === diagnoses.primaryDiagnosis
      );

      if (!existingCondition) {
        patient.chronicConditions.push({
          condition: diagnoses.primaryDiagnosis,
          diagnosedDate: new Date(visitDate),
          status: "Active",
        });
        await patient.save();
      }
    }

    // Populate the response
    await medicalRecord.populate([
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
        path: "createdBy",
        select: "firstName lastName role",
      },
    ]);

    res.status(201).json({
      success: true,
      message: "Medical record created successfully",
      data: medicalRecord,
    });
  } catch (error) {
    console.error("Create medical record error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating medical record",
    });
  }
};

// @desc    Update medical record
// @route   PUT /api/medical-records/:id
// @access  Private (Doctor - own only, Admin)
exports.updateMedicalRecord = async (req, res, next) => {
  try {
    let medicalRecord = await MedicalRecord.findById(req.params.id);

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found",
      });
    }

    // Check authorization
    if (
      req.user.role === "Doctor" &&
      medicalRecord.doctor.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this medical record",
      });
    }

    // Prevent updating finalized records without amendment
    if (medicalRecord.status === "Finalized" && !req.body.amendment) {
      return res.status(400).json({
        success: false,
        message: "Finalized records can only be modified through amendments",
      });
    }

    // Handle amendments for finalized records
    if (medicalRecord.status === "Finalized" && req.body.amendment) {
      const amendment = {
        amendmentDate: new Date(),
        reason: req.body.amendment.reason,
        changes: req.body.amendment.changes,
        amendedBy: req.user.id,
      };

      medicalRecord.amendments.push(amendment);
      medicalRecord.version += 1;
      medicalRecord.lastAmendedAt = new Date();
      medicalRecord.updatedBy = req.user.id;

      await medicalRecord.save();

      await medicalRecord.populate([
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
          path: "amendments.amendedBy",
          select: "firstName lastName role",
        },
      ]);

      return res.status(200).json({
        success: true,
        message: "Medical record amended successfully",
        data: medicalRecord,
      });
    }

    // Regular update for draft records
    const updateFields = { ...req.body };
    delete updateFields.amendment; // Remove amendment field for regular updates
    updateFields.updatedBy = req.user.id;

    medicalRecord = await MedicalRecord.findByIdAndUpdate(
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
          select: "firstName lastName email phone",
        },
      },
      {
        path: "doctor",
        select: "firstName lastName specialization",
      },
      {
        path: "updatedBy",
        select: "firstName lastName role",
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Medical record updated successfully",
      data: medicalRecord,
    });
  } catch (error) {
    console.error("Update medical record error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating medical record",
    });
  }
};

// @desc    Finalize medical record
// @route   PUT /api/medical-records/:id/finalize
// @access  Private (Doctor - own only)
exports.finalizeMedicalRecord = async (req, res, next) => {
  try {
    const medicalRecord = await MedicalRecord.findById(req.params.id);

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found",
      });
    }

    // Only the creating doctor can finalize
    if (medicalRecord.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the creating doctor can finalize this medical record",
      });
    }

    // Check if record is already finalized
    if (medicalRecord.status === "Finalized") {
      return res.status(400).json({
        success: false,
        message: "Medical record is already finalized",
      });
    }

    // Validate required fields for finalization
    if (
      !medicalRecord.chiefComplaint ||
      !medicalRecord.diagnoses?.primaryDiagnosis
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Chief complaint and primary diagnosis are required for finalization",
      });
    }

    // Create digital signature
    const crypto = require("crypto");
    const signatureData = {
      recordId: medicalRecord.recordId,
      doctorId: req.user.id,
      timestamp: new Date(),
      content: {
        chiefComplaint: medicalRecord.chiefComplaint,
        diagnoses: medicalRecord.diagnoses,
        treatment: medicalRecord.treatment,
      },
    };

    const signature = crypto
      .createHash("sha256")
      .update(JSON.stringify(signatureData) + process.env.SIGNATURE_SECRET)
      .digest("hex");

    // Update record status
    medicalRecord.status = "Finalized";
    medicalRecord.finalizedAt = new Date();
    medicalRecord.digitalSignature = {
      signature,
      signedBy: req.user.id,
      signedAt: new Date(),
      signatureData,
    };
    medicalRecord.updatedBy = req.user.id;

    await medicalRecord.save();

    await medicalRecord.populate([
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
        path: "digitalSignature.signedBy",
        select: "firstName lastName",
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Medical record finalized successfully",
      data: medicalRecord,
    });
  } catch (error) {
    console.error("Finalize medical record error:", error);
    res.status(500).json({
      success: false,
      message: "Server error finalizing medical record",
    });
  }
};

// @desc    Delete medical record
// @route   DELETE /api/medical-records/:id
// @access  Private (Admin only)
exports.deleteMedicalRecord = async (req, res, next) => {
  try {
    const medicalRecord = await MedicalRecord.findById(req.params.id);

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found",
      });
    }

    // Prevent deletion of finalized records
    if (medicalRecord.status === "Finalized") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete finalized medical records for legal compliance",
      });
    }

    await MedicalRecord.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Medical record deleted successfully",
      data: {},
    });
  } catch (error) {
    console.error("Delete medical record error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting medical record",
    });
  }
};

// @desc    Get patient's complete medical history
// @route   GET /api/medical-records/patient/:patientId/history
// @access  Private (Doctor, Nurse, Patient - own only)
exports.getPatientMedicalHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // Check if patient exists
    const patient = await Patient.findById(patientId).populate("user");
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Check authorization
    if (req.user.role === "Patient") {
      const userPatient = await Patient.findOne({ user: req.user.id });
      if (!userPatient || userPatient._id.toString() !== patientId) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this patient's medical history",
        });
      }
    }

    // Get comprehensive medical history
    const medicalRecords = await MedicalRecord.find({ patient: patientId })
      .populate("doctor", "firstName lastName specialization")
      .sort({ visitDate: -1 });

    // Organize by categories
    const history = {
      patient: {
        id: patient._id,
        name: `${patient.user.firstName} ${patient.user.lastName}`,
        nic: patient.user.nic,
        bloodType: patient.bloodType,
        allergies: patient.allergies,
        chronicConditions: patient.chronicConditions,
      },
      summary: {
        totalVisits: medicalRecords.length,
        lastVisit:
          medicalRecords.length > 0 ? medicalRecords[0].visitDate : null,
        commonDiagnoses: {},
        medications: [],
        procedures: [],
      },
      records: medicalRecords,
    };

    // Calculate summary statistics
    medicalRecords.forEach((record) => {
      // Count diagnoses
      if (record.diagnoses?.primaryDiagnosis) {
        const diagnosis = record.diagnoses.primaryDiagnosis;
        history.summary.commonDiagnoses[diagnosis] =
          (history.summary.commonDiagnoses[diagnosis] || 0) + 1;
      }

      // Collect medications
      if (record.treatment?.medications) {
        record.treatment.medications.forEach((med) => {
          if (!history.summary.medications.includes(med)) {
            history.summary.medications.push(med);
          }
        });
      }

      // Collect procedures
      if (record.treatment?.procedures) {
        record.treatment.procedures.forEach((proc) => {
          if (!history.summary.procedures.includes(proc)) {
            history.summary.procedures.push(proc);
          }
        });
      }
    });

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Get patient medical history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving patient medical history",
    });
  }
};

// @desc    Get medical records statistics
// @route   GET /api/medical-records/stats
// @access  Private (Doctor, Admin)
exports.getMedicalRecordsStats = async (req, res, next) => {
  try {
    const stats = await MedicalRecord.aggregate([
      {
        $facet: {
          totalRecords: [{ $count: "count" }],
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
                _id: "$recordType",
                count: { $sum: 1 },
              },
            },
          ],
          monthlyTrend: [
            {
              $match: {
                visitDate: {
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
                  year: { $year: "$visitDate" },
                  month: { $month: "$visitDate" },
                },
                count: { $sum: 1 },
              },
            },
            {
              $sort: { "_id.year": 1, "_id.month": 1 },
            },
          ],
          commonDiagnoses: [
            {
              $match: {
                "diagnoses.primaryDiagnosis": { $exists: true, $ne: null },
              },
            },
            {
              $group: {
                _id: "$diagnoses.primaryDiagnosis",
                count: { $sum: 1 },
              },
            },
            {
              $sort: { count: -1 },
            },
            {
              $limit: 10,
            },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: stats[0].totalRecords[0]?.count || 0,
        statusDistribution: stats[0].statusDistribution,
        typeDistribution: stats[0].typeDistribution,
        monthlyTrend: stats[0].monthlyTrend,
        commonDiagnoses: stats[0].commonDiagnoses,
      },
    });
  } catch (error) {
    console.error("Get medical records stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving medical records statistics",
    });
  }
};
