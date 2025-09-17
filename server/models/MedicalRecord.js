const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema(
  {
    // Record Identification
    recordId: {
      type: String,
      unique: true,
      required: true,
    },

    // Patient Information
    patient: {
      type: mongoose.Schema.ObjectId,
      ref: "Patient",
      required: [true, "Patient is required"],
    },

    // Medical Record Type
    recordType: {
      type: String,
      required: [true, "Record type is required"],
      enum: [
        "Consultation",
        "Diagnosis",
        "Treatment",
        "Surgery",
        "Emergency",
        "Lab Results",
        "Imaging",
        "Vaccination",
        "Discharge Summary",
        "Referral",
        "Progress Note",
        "Procedure Note",
      ],
    },

    // Visit Information
    visitDate: {
      type: Date,
      required: [true, "Visit date is required"],
    },
    appointment: {
      type: mongoose.Schema.ObjectId,
      ref: "Appointment",
    },

    // Healthcare Provider Information
    doctor: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Doctor is required"],
    },
    department: {
      type: String,
      required: [true, "Department is required"],
    },
    facility: {
      name: {
        type: String,
        required: [true, "Facility name is required"],
      },
      address: String,
      type: {
        type: String,
        enum: [
          "Hospital",
          "Clinic",
          "Emergency Room",
          "Urgent Care",
          "Laboratory",
          "Imaging Center",
        ],
      },
    },

    // Clinical Information
    chiefComplaint: {
      type: String,
      required: [true, "Chief complaint is required"],
      trim: true,
      maxlength: [1000, "Chief complaint cannot be more than 1000 characters"],
    },

    historyOfPresentIllness: {
      type: String,
      trim: true,
      maxlength: [
        3000,
        "History of present illness cannot be more than 3000 characters",
      ],
    },

    reviewOfSystems: {
      constitutional: String,
      cardiovascular: String,
      respiratory: String,
      gastrointestinal: String,
      genitourinary: String,
      musculoskeletal: String,
      neurological: String,
      psychiatric: String,
      endocrine: String,
      hematologic: String,
      allergic: String,
      dermatologic: String,
    },

    pastMedicalHistory: {
      surgicalHistory: [
        {
          procedure: String,
          date: Date,
          surgeon: String,
          complications: String,
        },
      ],
      medicalConditions: [
        {
          condition: String,
          diagnosedDate: Date,
          status: {
            type: String,
            enum: ["Active", "Resolved", "Chronic", "Acute"],
          },
        },
      ],
      hospitalizations: [
        {
          reason: String,
          admissionDate: Date,
          dischargeDate: Date,
          facility: String,
        },
      ],
    },

    familyHistory: [
      {
        relationship: String,
        condition: String,
        ageOfOnset: Number,
        deceased: Boolean,
        causeOfDeath: String,
      },
    ],

    socialHistory: {
      smoking: {
        status: {
          type: String,
          enum: ["Never", "Former", "Current"],
        },
        packsPerDay: Number,
        years: Number,
        quitDate: Date,
      },
      alcohol: {
        status: String,
        drinksPerWeek: Number,
      },
      drugs: {
        status: String,
        substances: [String],
        lastUse: Date,
      },
      occupation: String,
      maritalStatus: {
        type: String,
        enum: ["Single", "Married", "Divorced", "Widowed", "Separated"],
      },
      livingArrangement: String,
      exerciseFrequency: String,
    },

    // Physical Examination
    vitalSigns: {
      bloodPressure: {
        systolic: {
          type: Number,
          min: [60, "Systolic BP must be at least 60"],
          max: [300, "Systolic BP cannot exceed 300"],
        },
        diastolic: {
          type: Number,
          min: [30, "Diastolic BP must be at least 30"],
          max: [200, "Diastolic BP cannot exceed 200"],
        },
      },
      heartRate: {
        type: Number,
        min: [30, "Heart rate must be at least 30"],
        max: [220, "Heart rate cannot exceed 220"],
      },
      respiratoryRate: {
        type: Number,
        min: [8, "Respiratory rate must be at least 8"],
        max: [60, "Respiratory rate cannot exceed 60"],
      },
      temperature: {
        value: {
          type: Number,
          min: [30, "Temperature must be at least 30°C"],
          max: [45, "Temperature cannot exceed 45°C"],
        },
        scale: {
          type: String,
          enum: ["Celsius", "Fahrenheit"],
          default: "Celsius",
        },
      },
      oxygenSaturation: {
        type: Number,
        min: [70, "Oxygen saturation must be at least 70%"],
        max: [100, "Oxygen saturation cannot exceed 100%"],
      },
      height: {
        value: Number,
        unit: {
          type: String,
          enum: ["cm", "ft/in"],
          default: "cm",
        },
      },
      weight: {
        value: Number,
        unit: {
          type: String,
          enum: ["kg", "lbs"],
          default: "kg",
        },
      },
      bmi: Number,
      painScale: {
        type: Number,
        min: [0, "Pain scale must be between 0-10"],
        max: [10, "Pain scale must be between 0-10"],
      },
    },

    physicalExamination: {
      general: String,
      head: String,
      eyes: String,
      ears: String,
      nose: String,
      throat: String,
      neck: String,
      lymphNodes: String,
      cardiovascular: String,
      respiratory: String,
      abdomen: String,
      genitourinary: String,
      musculoskeletal: String,
      neurological: String,
      psychiatric: String,
      skin: String,
      extremities: String,
    },

    // Diagnostic Information
    assessmentAndPlan: {
      type: String,
      required: [true, "Assessment and plan is required"],
      trim: true,
      maxlength: [
        3000,
        "Assessment and plan cannot be more than 3000 characters",
      ],
    },

    diagnoses: [
      {
        condition: {
          type: String,
          required: true,
          trim: true,
        },
        icdCode: String,
        type: {
          type: String,
          enum: ["Primary", "Secondary", "Differential", "Rule-out"],
          default: "Primary",
        },
        severity: {
          type: String,
          enum: ["Mild", "Moderate", "Severe", "Critical"],
        },
        onset: {
          type: String,
          enum: ["Acute", "Chronic", "Subacute"],
        },
        status: {
          type: String,
          enum: ["Active", "Resolved", "Stable", "Worsening", "Improving"],
        },
        confidence: {
          type: String,
          enum: ["Definitive", "Probable", "Possible", "Rule-out"],
        },
      },
    ],

    // Treatment Information
    treatments: [
      {
        type: {
          type: String,
          enum: [
            "Medication",
            "Procedure",
            "Surgery",
            "Therapy",
            "Lifestyle",
            "Monitoring",
          ],
        },
        description: {
          type: String,
          required: true,
        },
        startDate: Date,
        endDate: Date,
        frequency: String,
        dosage: String,
        instructions: String,
        provider: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: [
            "Prescribed",
            "Active",
            "Completed",
            "Discontinued",
            "On-hold",
          ],
          default: "Prescribed",
        },
        response: {
          type: String,
          enum: ["Excellent", "Good", "Fair", "Poor", "No Response", "Adverse"],
        },
        sideEffects: [String],
      },
    ],

    // Medications
    medications: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        genericName: String,
        dosage: {
          type: String,
          required: true,
        },
        strength: String,
        route: {
          type: String,
          enum: [
            "Oral",
            "Injection",
            "Topical",
            "Inhalation",
            "Rectal",
            "Sublingual",
            "Transdermal",
          ],
          default: "Oral",
        },
        frequency: {
          type: String,
          required: true,
        },
        duration: String,
        quantity: Number,
        refills: {
          type: Number,
          default: 0,
        },
        prescribedDate: {
          type: Date,
          default: Date.now,
        },
        startDate: Date,
        endDate: Date,
        indication: String,
        instructions: String,
        precautions: [String],
        sideEffects: [String],
        status: {
          type: String,
          enum: ["Active", "Completed", "Discontinued", "On-hold"],
          default: "Active",
        },
      },
    ],

    // Allergies and Adverse Reactions
    allergies: [
      {
        allergen: {
          type: String,
          required: true,
          trim: true,
        },
        reaction: {
          type: String,
          required: true,
        },
        severity: {
          type: String,
          enum: ["Mild", "Moderate", "Severe", "Life-threatening"],
          required: true,
        },
        onsetDate: Date,
        verificationStatus: {
          type: String,
          enum: ["Confirmed", "Unconfirmed", "Probable", "Unlikely"],
        },
      },
    ],

    // Laboratory and Diagnostic Tests
    labTests: [
      {
        test: {
          type: mongoose.Schema.ObjectId,
          ref: "LabTest",
        },
        name: String,
        orderedDate: Date,
        resultDate: Date,
        status: {
          type: String,
          enum: [
            "Ordered",
            "Collected",
            "In-Progress",
            "Completed",
            "Cancelled",
          ],
        },
        results: String,
        normalRange: String,
        interpretation: String,
        criticalValues: Boolean,
      },
    ],

    imagingStudies: [
      {
        study: String,
        orderedDate: Date,
        performedDate: Date,
        facility: String,
        technique: String,
        findings: String,
        impression: String,
        recommendations: String,
        images: [String], // URLs to image files
      },
    ],

    // Procedures
    procedures: [
      {
        name: {
          type: String,
          required: true,
        },
        cptCode: String,
        date: Date,
        performer: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        assistant: String,
        indication: String,
        technique: String,
        findings: String,
        complications: String,
        postProcedureInstructions: String,
        followUpRequired: Boolean,
        followUpDate: Date,
      },
    ],

    // Care Plan and Follow-up
    carePlan: {
      goals: [String],
      interventions: [String],
      patientEducation: [String],
      followUpInstructions: String,
      nextAppointment: {
        recommendedDate: Date,
        department: String,
        provider: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        reason: String,
        urgency: {
          type: String,
          enum: ["Routine", "Urgent", "Stat"],
        },
      },
      specialInstructions: String,
    },

    // Referrals
    referrals: [
      {
        department: String,
        provider: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        facility: String,
        reason: String,
        urgency: {
          type: String,
          enum: ["Routine", "Urgent", "Stat"],
        },
        referralDate: Date,
        notes: String,
        status: {
          type: String,
          enum: ["Pending", "Scheduled", "Completed", "Cancelled"],
        },
      },
    ],

    // Document Management
    attachments: [
      {
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        uploadedDate: Date,
        uploadedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        description: String,
        category: {
          type: String,
          enum: [
            "Lab Report",
            "Imaging",
            "Prescription",
            "Discharge Summary",
            "Insurance",
            "Other",
          ],
        },
      },
    ],

    // Quality and Safety
    qualityMetrics: {
      appropriateCare: Boolean,
      timelyDiagnosis: Boolean,
      patientSafety: Boolean,
      medicationSafety: Boolean,
      followUpCompliance: Boolean,
    },

    safetyAlerts: [
      {
        type: {
          type: String,
          enum: [
            "Drug Allergy",
            "Drug Interaction",
            "Critical Value",
            "Fall Risk",
            "Infection Risk",
          ],
        },
        description: String,
        severity: {
          type: String,
          enum: ["Low", "Medium", "High", "Critical"],
        },
        active: {
          type: Boolean,
          default: true,
        },
        createdDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Review and Approval
    reviewStatus: {
      type: String,
      enum: ["Draft", "Pending Review", "Reviewed", "Approved", "Amended"],
      default: "Draft",
    },
    reviewedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    reviewDate: Date,
    approvedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    approvalDate: Date,

    // Notes and Comments
    clinicalNotes: [
      {
        note: {
          type: String,
          required: true,
          trim: true,
        },
        noteType: {
          type: String,
          enum: [
            "Progress",
            "Assessment",
            "Plan",
            "Teaching",
            "Discharge",
            "Consultation",
          ],
          default: "Progress",
        },
        addedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
          required: true,
        },
        addedDate: {
          type: Date,
          default: Date.now,
        },
        isConfidential: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Confidentiality and Access
    confidentialityLevel: {
      type: String,
      enum: ["Standard", "Restricted", "Confidential", "Highly Confidential"],
      default: "Standard",
    },
    accessLog: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        accessDate: Date,
        accessType: {
          type: String,
          enum: ["View", "Edit", "Print", "Export"],
        },
        ipAddress: String,
      },
    ],

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    version: {
      type: Number,
      default: 1,
    },
    amendments: [
      {
        date: Date,
        reason: String,
        amendedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        originalText: String,
        amendedText: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
medicalRecordSchema.index({ patient: 1, visitDate: -1 });
medicalRecordSchema.index({ recordId: 1 });
medicalRecordSchema.index({ doctor: 1, visitDate: -1 });
medicalRecordSchema.index({ recordType: 1 });
medicalRecordSchema.index({ department: 1 });
medicalRecordSchema.index({ reviewStatus: 1 });
medicalRecordSchema.index({ "diagnoses.icdCode": 1 });
medicalRecordSchema.index({ visitDate: -1 });

// Virtual for record age
medicalRecordSchema.virtual("recordAge").get(function () {
  const now = new Date();
  const visitDate = new Date(this.visitDate);
  const diffTime = Math.abs(now - visitDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // days
});

// Virtual for primary diagnosis
medicalRecordSchema.virtual("primaryDiagnosis").get(function () {
  return this.diagnoses.find((d) => d.type === "Primary");
});

// Virtual for active medications count
medicalRecordSchema.virtual("activeMedicationsCount").get(function () {
  return this.medications.filter((m) => m.status === "Active").length;
});

// Pre-save middleware to generate record ID
medicalRecordSchema.pre("save", async function (next) {
  if (this.isNew && !this.recordId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    const count = await this.constructor.countDocuments({
      recordId: { $regex: `^MR${year}${month}` },
    });

    this.recordId = `MR${year}${month}${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

// Pre-save middleware to calculate BMI
medicalRecordSchema.pre("save", function (next) {
  if (this.vitalSigns.height && this.vitalSigns.weight) {
    const heightM = this.vitalSigns.height.value / 100; // convert cm to m
    const weightKg = this.vitalSigns.weight.value;
    this.vitalSigns.bmi = parseFloat(
      (weightKg / (heightM * heightM)).toFixed(1)
    );
  }
  next();
});

// Method to add diagnosis
medicalRecordSchema.methods.addDiagnosis = function (diagnosisData) {
  this.diagnoses.push(diagnosisData);
  return this.save();
};

// Method to add medication
medicalRecordSchema.methods.addMedication = function (medicationData) {
  this.medications.push(medicationData);
  return this.save();
};

// Method to add clinical note
medicalRecordSchema.methods.addClinicalNote = function (noteData, addedBy) {
  this.clinicalNotes.push({
    ...noteData,
    addedBy,
  });
  return this.save();
};

// Method to add safety alert
medicalRecordSchema.methods.addSafetyAlert = function (alertData) {
  this.safetyAlerts.push(alertData);
  return this.save();
};

// Method to approve record
medicalRecordSchema.methods.approve = function (approvedBy) {
  this.reviewStatus = "Approved";
  this.approvedBy = approvedBy;
  this.approvalDate = new Date();
  return this.save();
};

// Method to amend record
medicalRecordSchema.methods.amend = function (amendmentData, amendedBy) {
  this.amendments.push({
    ...amendmentData,
    amendedBy,
    date: new Date(),
  });
  this.version += 1;
  return this.save();
};

// Method to log access
medicalRecordSchema.methods.logAccess = function (user, accessType, ipAddress) {
  this.accessLog.push({
    user,
    accessDate: new Date(),
    accessType,
    ipAddress,
  });
  return this.save();
};

// Method to get critical values
medicalRecordSchema.methods.getCriticalValues = function () {
  return this.labTests.filter((test) => test.criticalValues);
};

// Method to get active safety alerts
medicalRecordSchema.methods.getActiveSafetyAlerts = function () {
  return this.safetyAlerts.filter((alert) => alert.active);
};

// Static method to find records by diagnosis
medicalRecordSchema.statics.findByDiagnosis = function (icdCode) {
  return this.find({ "diagnoses.icdCode": icdCode });
};

// Static method to find records requiring follow-up
medicalRecordSchema.statics.findRequiringFollowUp = function () {
  return this.find({
    "carePlan.nextAppointment.recommendedDate": { $lte: new Date() },
    reviewStatus: "Approved",
  });
};

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);
