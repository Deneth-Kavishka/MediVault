const mongoose = require("mongoose");

const labTestSchema = new mongoose.Schema(
  {
    // Test Identification
    testId: {
      type: String,
      unique: true,
      required: true,
    },

    // Patient and Order Information
    patient: {
      type: mongoose.Schema.ObjectId,
      ref: "Patient",
      required: [true, "Patient is required"],
    },
    orderedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Ordering physician is required"],
    },
    appointment: {
      type: mongoose.Schema.ObjectId,
      ref: "Appointment",
    },

    // Test Categories and Details
    category: {
      type: String,
      required: [true, "Test category is required"],
      enum: [
        "Hematology",
        "Clinical Chemistry",
        "Immunology",
        "Microbiology",
        "Parasitology",
        "Histopathology",
        "Cytology",
        "Molecular Biology",
        "Genetics",
        "Toxicology",
        "Endocrinology",
        "Cardiology",
        "Radiology",
        "Nuclear Medicine",
        "Other",
      ],
    },

    // Individual Tests
    tests: [
      {
        name: {
          type: String,
          required: [true, "Test name is required"],
          trim: true,
        },
        code: {
          type: String,
          required: [true, "Test code is required"],
          trim: true,
        },
        loincCode: String, // LOINC (Logical Observation Identifiers Names and Codes)
        cptCode: String, // CPT (Current Procedural Terminology)

        // Test Specifications
        specimen: {
          type: {
            type: String,
            required: [true, "Specimen type is required"],
            enum: [
              "Blood",
              "Serum",
              "Plasma",
              "Urine",
              "Stool",
              "Sputum",
              "CSF",
              "Tissue",
              "Swab",
              "Saliva",
              "Other",
            ],
          },
          volume: String,
          container: String,
          preservative: String,
          collectionInstructions: String,
        },

        // Test Results
        result: {
          value: mongoose.Schema.Types.Mixed, // Can be number, string, or complex object
          unit: String,
          normalRange: {
            min: mongoose.Schema.Types.Mixed,
            max: mongoose.Schema.Types.Mixed,
            text: String,
          },
          interpretation: {
            type: String,
            enum: [
              "Normal",
              "Abnormal",
              "Critical",
              "High",
              "Low",
              "Positive",
              "Negative",
              "Inconclusive",
            ],
          },
          flag: {
            type: String,
            enum: [
              "Normal",
              "High",
              "Low",
              "Critical High",
              "Critical Low",
              "Abnormal",
            ],
          },
          comments: String,
        },

        // Test Status
        status: {
          type: String,
          enum: [
            "Ordered",
            "Collected",
            "Received",
            "In Progress",
            "Completed",
            "Verified",
            "Reported",
            "Cancelled",
            "Rejected",
          ],
          default: "Ordered",
        },

        // Timing
        orderedDate: {
          type: Date,
          default: Date.now,
        },
        collectedDate: Date,
        receivedDate: Date,
        reportedDate: Date,
        verifiedDate: Date,

        // Quality Control
        qcStatus: {
          type: String,
          enum: ["Pending", "Passed", "Failed", "Repeated"],
        },
        qcComments: String,

        // Technical Information
        method: String,
        analyzer: String,
        reagentLot: String,
        calibrationDate: Date,
        performedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        verifiedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
      },
    ],

    // Clinical Information
    clinicalHistory: {
      type: String,
      trim: true,
      maxlength: [1000, "Clinical history cannot be more than 1000 characters"],
    },

    indication: {
      type: String,
      required: [true, "Test indication is required"],
      trim: true,
    },

    diagnosis: [
      {
        condition: String,
        icdCode: String,
      },
    ],

    medications: [
      {
        name: String,
        dosage: String,
        relevance: String, // How medication might affect test results
      },
    ],

    // Sample Information
    sampleCollection: {
      collectedBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      collectionDate: Date,
      collectionTime: String,
      collectionSite: String,
      collectionMethod: String,
      fastingStatus: {
        type: String,
        enum: ["Fasting", "Non-fasting", "Unknown", "Not Applicable"],
      },
      fastingHours: Number,
      sampleCondition: {
        type: String,
        enum: [
          "Good",
          "Hemolyzed",
          "Lipemic",
          "Icteric",
          "Clotted",
          "Insufficient",
        ],
      },
      transportCondition: String,
      collectionNotes: String,
    },

    // Laboratory Information
    laboratory: {
      name: {
        type: String,
        required: [true, "Laboratory name is required"],
      },
      address: String,
      phone: String,
      email: String,
      licenseNumber: String,
      accreditation: [String], // e.g., CAP, CLIA, ISO
      director: String,
    },

    // Priority and Urgency
    priority: {
      type: String,
      enum: ["Routine", "Urgent", "STAT", "Critical"],
      default: "Routine",
    },

    urgencyReason: String,

    // Report Information
    report: {
      generatedDate: Date,
      generatedBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      reportFormat: {
        type: String,
        enum: ["PDF", "HTML", "XML", "HL7"],
      },
      reportUrl: String,
      reportHash: String, // For integrity verification
      signed: {
        type: Boolean,
        default: false,
      },
      signedBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      signedDate: Date,
      digitalSignature: String,
    },

    // Critical Values
    criticalValues: [
      {
        testName: String,
        value: String,
        notifiedTo: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        notificationDate: Date,
        notificationMethod: {
          type: String,
          enum: ["Phone", "Email", "SMS", "In-person", "Secure Message"],
        },
        acknowledged: {
          type: Boolean,
          default: false,
        },
        acknowledgedDate: Date,
        acknowledgedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
      },
    ],

    // Reference Values
    referenceValues: [
      {
        testName: String,
        ageGroup: String,
        gender: {
          type: String,
          enum: ["Male", "Female", "Both"],
        },
        normalRange: String,
        units: String,
        methodology: String,
      },
    ],

    // Quality Assurance
    qualityControl: {
      controlsRun: [
        {
          level: String,
          value: String,
          acceptableRange: String,
          result: {
            type: String,
            enum: ["In Control", "Out of Control"],
          },
          action: String,
        },
      ],
      calibrationCheck: {
        performed: Boolean,
        date: Date,
        result: String,
      },
      maintenanceRecord: String,
    },

    // Cost Information
    cost: {
      testCost: {
        type: Number,
        min: [0, "Test cost cannot be negative"],
      },
      collectionFee: {
        type: Number,
        min: [0, "Collection fee cannot be negative"],
      },
      rushFee: {
        type: Number,
        default: 0,
        min: [0, "Rush fee cannot be negative"],
      },
      totalCost: {
        type: Number,
        min: [0, "Total cost cannot be negative"],
      },
      insurance: {
        covered: Boolean,
        provider: String,
        authorizationNumber: String,
        copay: Number,
      },
    },

    // Communication
    notifications: [
      {
        type: {
          type: String,
          enum: [
            "Ordered",
            "Collected",
            "Ready",
            "Critical",
            "Abnormal",
            "Completed",
          ],
        },
        recipient: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        method: {
          type: String,
          enum: ["Email", "SMS", "Phone", "Portal", "Fax"],
        },
        sent: Boolean,
        sentDate: Date,
        message: String,
      },
    ],

    // Follow-up Actions
    followUp: {
      required: {
        type: Boolean,
        default: false,
      },
      recommendations: [String],
      repeatTest: {
        required: Boolean,
        interval: String,
        reason: String,
      },
      referral: {
        required: Boolean,
        specialty: String,
        reason: String,
      },
    },

    // Amendments and Corrections
    amendments: [
      {
        date: Date,
        reason: String,
        amendedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        originalValue: String,
        correctedValue: String,
        testName: String,
      },
    ],

    // Audit Trail
    auditLog: [
      {
        action: String,
        user: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: String,
        ipAddress: String,
      },
    ],

    // Overall Status
    overallStatus: {
      type: String,
      enum: [
        "Pending",
        "In Progress",
        "Completed",
        "Reported",
        "Reviewed",
        "Cancelled",
        "Amended",
      ],
      default: "Pending",
    },

    // Cancellation Information
    cancellation: {
      cancelled: {
        type: Boolean,
        default: false,
      },
      reason: String,
      cancelledBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      cancelledDate: Date,
    },

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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
labTestSchema.index({ patient: 1, "tests.orderedDate": -1 });
labTestSchema.index({ orderedBy: 1, "tests.orderedDate": -1 });
labTestSchema.index({ testId: 1 });
labTestSchema.index({ overallStatus: 1 });
labTestSchema.index({ priority: 1 });
labTestSchema.index({ category: 1 });
labTestSchema.index({ "tests.status": 1 });
labTestSchema.index({ "tests.collectedDate": 1 });

// Virtual for pending tests
labTestSchema.virtual("pendingTests").get(function () {
  return this.tests.filter((test) =>
    ["Ordered", "Collected", "Received", "In Progress"].includes(test.status)
  );
});

// Virtual for completed tests
labTestSchema.virtual("completedTests").get(function () {
  return this.tests.filter((test) =>
    ["Completed", "Verified", "Reported"].includes(test.status)
  );
});

// Virtual for critical tests
labTestSchema.virtual("criticalTests").get(function () {
  return this.tests.filter((test) => test.result.interpretation === "Critical");
});

// Virtual for total test count
labTestSchema.virtual("totalTests").get(function () {
  return this.tests.length;
});

// Virtual for turnaround time
labTestSchema.virtual("turnaroundTime").get(function () {
  const orderedDate = this.tests[0]?.orderedDate;
  const reportedDate = this.tests[0]?.reportedDate;

  if (!orderedDate || !reportedDate) return null;

  const diffTime = Math.abs(reportedDate - orderedDate);
  return Math.ceil(diffTime / (1000 * 60 * 60)); // hours
});

// Pre-save middleware to generate test ID
labTestSchema.pre("save", async function (next) {
  if (this.isNew && !this.testId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const count = await this.constructor.countDocuments({
      testId: { $regex: `^LAB${year}${month}${day}` },
    });

    this.testId = `LAB${year}${month}${day}${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// Pre-save middleware to update overall status
labTestSchema.pre("save", function (next) {
  const statuses = this.tests.map((test) => test.status);

  if (statuses.every((status) => status === "Reported")) {
    this.overallStatus = "Reported";
  } else if (statuses.every((status) => status === "Completed")) {
    this.overallStatus = "Completed";
  } else if (
    statuses.some((status) => ["In Progress", "Received"].includes(status))
  ) {
    this.overallStatus = "In Progress";
  } else if (statuses.every((status) => status === "Ordered")) {
    this.overallStatus = "Pending";
  }

  next();
});

// Method to collect sample
labTestSchema.methods.collectSample = function (collectionData, collectedBy) {
  this.sampleCollection = {
    ...collectionData,
    collectedBy,
    collectionDate: new Date(),
  };

  // Update test statuses
  this.tests.forEach((test) => {
    if (test.status === "Ordered") {
      test.status = "Collected";
      test.collectedDate = new Date();
    }
  });

  this.auditLog.push({
    action: "Sample Collected",
    user: collectedBy,
    details: "Sample collected for laboratory testing",
  });

  return this.save();
};

// Method to add test result
labTestSchema.methods.addResult = function (
  testIndex,
  resultData,
  performedBy
) {
  const test = this.tests[testIndex];
  if (!test) {
    throw new Error("Test not found");
  }

  test.result = resultData;
  test.status = "Completed";
  test.reportedDate = new Date();
  test.performedBy = performedBy;

  // Check for critical values
  if (resultData.interpretation === "Critical") {
    this.criticalValues.push({
      testName: test.name,
      value: resultData.value,
      notificationDate: new Date(),
    });
  }

  this.auditLog.push({
    action: "Result Added",
    user: performedBy,
    details: `Result added for ${test.name}: ${resultData.value} ${resultData.unit || ""}`,
  });

  return this.save();
};

// Method to verify results
labTestSchema.methods.verifyResults = function (verifiedBy) {
  this.tests.forEach((test) => {
    if (test.status === "Completed") {
      test.status = "Verified";
      test.verifiedDate = new Date();
      test.verifiedBy = verifiedBy;
    }
  });

  this.auditLog.push({
    action: "Results Verified",
    user: verifiedBy,
    details: "All test results verified",
  });

  return this.save();
};

// Method to generate report
labTestSchema.methods.generateReport = function (generatedBy, format = "PDF") {
  this.report = {
    generatedDate: new Date(),
    generatedBy,
    reportFormat: format,
    signed: false,
  };

  // Update test statuses to reported
  this.tests.forEach((test) => {
    if (test.status === "Verified") {
      test.status = "Reported";
    }
  });

  this.overallStatus = "Reported";

  this.auditLog.push({
    action: "Report Generated",
    user: generatedBy,
    details: `Report generated in ${format} format`,
  });

  return this.save();
};

// Method to cancel test
labTestSchema.methods.cancelTest = function (reason, cancelledBy) {
  this.cancellation = {
    cancelled: true,
    reason,
    cancelledBy,
    cancelledDate: new Date(),
  };

  this.overallStatus = "Cancelled";

  this.tests.forEach((test) => {
    if (!["Completed", "Verified", "Reported"].includes(test.status)) {
      test.status = "Cancelled";
    }
  });

  this.auditLog.push({
    action: "Test Cancelled",
    user: cancelledBy,
    details: `Test cancelled: ${reason}`,
  });

  return this.save();
};

// Method to acknowledge critical value
labTestSchema.methods.acknowledgeCriticalValue = function (
  criticalValueId,
  acknowledgedBy
) {
  const criticalValue = this.criticalValues.id(criticalValueId);
  if (criticalValue) {
    criticalValue.acknowledged = true;
    criticalValue.acknowledgedDate = new Date();
    criticalValue.acknowledgedBy = acknowledgedBy;
  }

  return this.save();
};

// Static method to find pending tests
labTestSchema.statics.findPending = function () {
  return this.find({
    overallStatus: { $in: ["Pending", "In Progress"] },
  });
};

// Static method to find critical results
labTestSchema.statics.findCritical = function () {
  return this.find({
    "criticalValues.acknowledged": false,
  });
};

// Static method to find by date range
labTestSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    "tests.orderedDate": {
      $gte: startDate,
      $lte: endDate,
    },
  });
};

module.exports = mongoose.model("LabTest", labTestSchema);
