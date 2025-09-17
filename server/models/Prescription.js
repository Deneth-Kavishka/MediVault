const mongoose = require("mongoose");
const QRCode = require("qrcode");

const prescriptionSchema = new mongoose.Schema(
  {
    // Prescription Identification
    prescriptionId: {
      type: String,
      unique: true,
      required: true,
    },

    // QR Code for mobile scanning
    qrCode: {
      type: String, // Base64 encoded QR code
      select: false,
    },
    qrCodeHash: {
      type: String, // Hash for verification
      unique: true,
    },

    // Patient and Doctor Information
    patient: {
      type: mongoose.Schema.ObjectId,
      ref: "Patient",
      required: [true, "Patient is required"],
    },
    doctor: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Doctor is required"],
    },

    // Visit Information
    appointment: {
      type: mongoose.Schema.ObjectId,
      ref: "Appointment",
    },
    medicalRecord: {
      type: mongoose.Schema.ObjectId,
      ref: "MedicalRecord",
    },

    // Prescription Details
    prescriptionDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
      validate: {
        validator: function (date) {
          return date > this.prescriptionDate;
        },
        message: "Valid until date must be after prescription date",
      },
    },

    // Medications
    medications: [
      {
        // Basic Drug Information
        name: {
          type: String,
          required: [true, "Medication name is required"],
          trim: true,
        },
        genericName: String,
        brandName: String,
        strength: {
          type: String,
          required: [true, "Medication strength is required"],
        },
        dosageForm: {
          type: String,
          required: [true, "Dosage form is required"],
          enum: [
            "Tablet",
            "Capsule",
            "Syrup",
            "Injection",
            "Drops",
            "Cream",
            "Ointment",
            "Inhaler",
            "Spray",
            "Suppository",
            "Patch",
            "Gel",
            "Lotion",
            "Solution",
            "Suspension",
          ],
        },

        // Dosage Instructions
        dosage: {
          quantity: {
            type: Number,
            required: [true, "Dosage quantity is required"],
            min: [0.1, "Dosage quantity must be positive"],
          },
          unit: {
            type: String,
            required: [true, "Dosage unit is required"],
            enum: [
              "mg",
              "g",
              "ml",
              "mcg",
              "IU",
              "tablet(s)",
              "capsule(s)",
              "drop(s)",
              "spray(s)",
              "puff(s)",
            ],
          },
        },

        frequency: {
          type: String,
          required: [true, "Frequency is required"],
          enum: [
            "Once daily",
            "Twice daily",
            "Three times daily",
            "Four times daily",
            "Every 4 hours",
            "Every 6 hours",
            "Every 8 hours",
            "Every 12 hours",
            "As needed",
            "Before meals",
            "After meals",
            "At bedtime",
            "In the morning",
            "Custom",
          ],
        },
        customFrequency: String, // Used when frequency is 'Custom'

        // Route of Administration
        route: {
          type: String,
          required: [true, "Route is required"],
          enum: [
            "Oral",
            "Sublingual",
            "Intramuscular",
            "Intravenous",
            "Subcutaneous",
            "Topical",
            "Inhalation",
            "Rectal",
            "Vaginal",
            "Nasal",
            "Ophthalmic",
            "Otic",
            "Transdermal",
          ],
        },

        // Duration and Quantity
        duration: {
          type: String,
          required: [true, "Duration is required"],
        },
        totalQuantity: {
          type: Number,
          required: [true, "Total quantity is required"],
          min: [1, "Total quantity must be at least 1"],
        },
        quantityUnit: {
          type: String,
          required: [true, "Quantity unit is required"],
        },

        // Refills
        refillsAllowed: {
          type: Number,
          default: 0,
          min: [0, "Refills cannot be negative"],
          max: [11, "Maximum 11 refills allowed"],
        },
        refillsRemaining: {
          type: Number,
          default: function () {
            return this.refillsAllowed;
          },
        },

        // Instructions
        instructions: {
          type: String,
          required: [true, "Instructions are required"],
          trim: true,
          maxlength: [500, "Instructions cannot be more than 500 characters"],
        },
        indication: String, // Why the medication is prescribed

        // Timing Instructions
        timingInstructions: {
          beforeMeals: Boolean,
          afterMeals: Boolean,
          withFood: Boolean,
          onEmptyStomach: Boolean,
          atBedtime: Boolean,
          inMorning: Boolean,
          asNeeded: Boolean,
          specificTimes: [String], // e.g., ['08:00', '14:00', '20:00']
        },

        // Safety Information
        warnings: [String],
        contraindications: [String],
        sideEffects: [String],
        interactions: [String],

        // Pharmacy Information
        substitutionAllowed: {
          type: Boolean,
          default: true,
        },
        daw: {
          // Dispense As Written
          type: Boolean,
          default: false,
        },

        // Status
        status: {
          type: String,
          enum: ["Active", "Discontinued", "Completed", "On-hold"],
          default: "Active",
        },

        // Medication Cost
        estimatedCost: Number,

        // Internal medication ID for tracking
        medicationId: {
          type: String,
          default: function () {
            return new mongoose.Types.ObjectId().toString();
          },
        },
      },
    ],

    // Clinical Information
    diagnosis: [
      {
        condition: String,
        icdCode: String,
      },
    ],

    allergies: [
      {
        allergen: String,
        reaction: String,
        severity: {
          type: String,
          enum: ["Mild", "Moderate", "Severe", "Life-threatening"],
        },
      },
    ],

    // Special Instructions
    generalInstructions: {
      type: String,
      trim: true,
      maxlength: [
        1000,
        "General instructions cannot be more than 1000 characters",
      ],
    },

    dietaryInstructions: String,
    activityRestrictions: String,
    followUpInstructions: String,

    // Prescription Status
    status: {
      type: String,
      enum: [
        "Draft",
        "Active",
        "Partially Filled",
        "Completed",
        "Cancelled",
        "Expired",
      ],
      default: "Active",
    },

    priority: {
      type: String,
      enum: ["Routine", "Urgent", "STAT"],
      default: "Routine",
    },

    // Pharmacy Information
    preferredPharmacy: {
      name: String,
      address: String,
      phone: String,
      licenseNumber: String,
    },

    // Dispense Information
    dispenseHistory: [
      {
        pharmacy: {
          name: String,
          address: String,
          phone: String,
          licenseNumber: String,
        },
        pharmacist: {
          name: String,
          licenseNumber: String,
        },
        dispensedDate: {
          type: Date,
          default: Date.now,
        },
        medicationsDispensed: [
          {
            medicationId: String,
            quantityDispensed: Number,
            lotNumber: String,
            expiryDate: Date,
            manufacturer: String,
            ndc: String, // National Drug Code
            cost: Number,
          },
        ],
        totalCost: Number,
        paymentMethod: {
          type: String,
          enum: [
            "Cash",
            "Insurance",
            "Credit Card",
            "Debit Card",
            "Government",
          ],
        },
        insuranceClaim: {
          provider: String,
          claimNumber: String,
          copayAmount: Number,
          coveredAmount: Number,
        },
        dispensedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        verificationCode: String,
        dispensingNotes: String,
      },
    ],

    // Electronic Prescription Information
    ePrescription: {
      transmissionId: String,
      transmissionDate: Date,
      pharmacyId: String,
      acknowledgmentDate: Date,
      errorMessages: [String],
    },

    // Controlled Substance Information
    controlledSubstance: {
      isControlled: {
        type: Boolean,
        default: false,
      },
      schedule: {
        type: String,
        enum: ["I", "II", "III", "IV", "V"],
      },
      deaNumber: String,
      prescriptionPadNumber: String,
    },

    // Clinical Decision Support
    drugInteractions: [
      {
        medications: [String],
        severity: {
          type: String,
          enum: ["Minor", "Moderate", "Major", "Contraindicated"],
        },
        description: String,
        recommendation: String,
      },
    ],

    allergicReactions: [
      {
        medication: String,
        allergen: String,
        severity: String,
        warning: String,
      },
    ],

    dosageAlerts: [
      {
        medication: String,
        alertType: {
          type: String,
          enum: ["High Dose", "Low Dose", "Duplicate Therapy", "Age-related"],
        },
        message: String,
      },
    ],

    // Quality Assurance
    clinicalReview: {
      required: {
        type: Boolean,
        default: false,
      },
      reviewedBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      reviewDate: Date,
      reviewNotes: String,
      approved: Boolean,
    },

    pharmacyReview: {
      reviewedBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      reviewDate: Date,
      clinicalNotes: String,
      interventions: [String],
      contactedPrescriber: Boolean,
    },

    // Communication
    communications: [
      {
        type: {
          type: String,
          enum: [
            "Pharmacy Question",
            "Patient Question",
            "Prior Authorization",
            "Clarification",
          ],
        },
        from: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        to: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        resolved: {
          type: Boolean,
          default: false,
        },
        response: String,
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
    electronicSignature: {
      signed: {
        type: Boolean,
        default: false,
      },
      signedBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      signedAt: Date,
      signatureHash: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
prescriptionSchema.index({ patient: 1, prescriptionDate: -1 });
prescriptionSchema.index({ doctor: 1, prescriptionDate: -1 });
prescriptionSchema.index({ prescriptionId: 1 });
prescriptionSchema.index({ qrCodeHash: 1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ validUntil: 1 });
prescriptionSchema.index({ "medications.name": 1 });
prescriptionSchema.index({ "controlledSubstance.isControlled": 1 });

// Virtual for days until expiry
prescriptionSchema.virtual("daysUntilExpiry").get(function () {
  const now = new Date();
  const validUntil = new Date(this.validUntil);
  const diffTime = validUntil - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for total medications
prescriptionSchema.virtual("totalMedications").get(function () {
  return this.medications.length;
});

// Virtual for active medications
prescriptionSchema.virtual("activeMedications").get(function () {
  return this.medications.filter((med) => med.status === "Active");
});

// Virtual for controlled medications
prescriptionSchema.virtual("hasControlledSubstances").get(function () {
  return this.controlledSubstance.isControlled;
});

// Virtual for total estimated cost
prescriptionSchema.virtual("totalEstimatedCost").get(function () {
  return this.medications.reduce((total, med) => {
    return total + (med.estimatedCost || 0);
  }, 0);
});

// Pre-save middleware to generate prescription ID
prescriptionSchema.pre("save", async function (next) {
  if (this.isNew && !this.prescriptionId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const count = await this.constructor.countDocuments({
      prescriptionId: { $regex: `^RX${year}${month}${day}` },
    });

    this.prescriptionId = `RX${year}${month}${day}${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// Pre-save middleware to generate QR code
prescriptionSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("medications")) {
    try {
      const qrData = {
        prescriptionId: this.prescriptionId,
        patient: this.patient,
        doctor: this.doctor,
        prescriptionDate: this.prescriptionDate,
        validUntil: this.validUntil,
        medications: this.medications.map((med) => ({
          medicationId: med.medicationId,
          name: med.name,
          strength: med.strength,
          dosage: med.dosage,
          frequency: med.frequency,
          totalQuantity: med.totalQuantity,
          refillsRemaining: med.refillsRemaining,
        })),
        timestamp: new Date().toISOString(),
      };

      // Generate QR code hash for security
      const crypto = require("crypto");
      this.qrCodeHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(qrData) + process.env.QR_CODE_SECRET)
        .digest("hex");

      // Add hash to QR data
      qrData.hash = this.qrCodeHash;

      // Generate QR code
      this.qrCode = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: "M",
        type: "image/png",
        quality: 0.92,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
    } catch (error) {
      console.error("QR Code generation failed:", error);
    }
  }
  next();
});

// Pre-save middleware to set refills remaining
prescriptionSchema.pre("save", function (next) {
  this.medications.forEach((med) => {
    if (med.isNew && med.refillsRemaining === undefined) {
      med.refillsRemaining = med.refillsAllowed;
    }
  });
  next();
});

// Method to dispense medication
prescriptionSchema.methods.dispenseMedication = function (dispenseData) {
  // Update refills remaining
  dispenseData.medicationsDispensed.forEach((dispensed) => {
    const medication = this.medications.id(dispensed.medicationId);
    if (medication && medication.refillsRemaining > 0) {
      medication.refillsRemaining -= 1;
    }
  });

  // Add to dispense history
  this.dispenseHistory.push(dispenseData);

  // Update status
  const allMedicationsDispensed = this.medications.every(
    (med) => med.refillsRemaining === 0
  );

  if (allMedicationsDispensed) {
    this.status = "Completed";
  } else {
    this.status = "Partially Filled";
  }

  return this.save();
};

// Method to cancel prescription
prescriptionSchema.methods.cancel = function (reason, cancelledBy) {
  this.status = "Cancelled";
  this.updatedBy = cancelledBy;

  // Add communication record
  this.communications.push({
    type: "Clarification",
    from: cancelledBy,
    message: `Prescription cancelled: ${reason}`,
    resolved: true,
  });

  return this.save();
};

// Method to add drug interaction alert
prescriptionSchema.methods.addDrugInteraction = function (interactionData) {
  this.drugInteractions.push(interactionData);
  return this.save();
};

// Method to sign prescription electronically
prescriptionSchema.methods.signElectronically = function (signedBy) {
  const crypto = require("crypto");

  this.electronicSignature = {
    signed: true,
    signedBy,
    signedAt: new Date(),
    signatureHash: crypto
      .createHash("sha256")
      .update(this.prescriptionId + signedBy + new Date().toISOString())
      .digest("hex"),
  };

  return this.save();
};

// Method to verify QR code
prescriptionSchema.methods.verifyQRCode = function (scannedHash) {
  return this.qrCodeHash === scannedHash;
};

// Method to check if prescription is expired
prescriptionSchema.methods.isExpired = function () {
  return new Date() > this.validUntil;
};

// Method to get refillable medications
prescriptionSchema.methods.getRefillableMedications = function () {
  return this.medications.filter(
    (med) => med.refillsRemaining > 0 && med.status === "Active"
  );
};

// Static method to find expiring prescriptions
prescriptionSchema.statics.findExpiring = function (days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    validUntil: { $lte: futureDate },
    status: { $in: ["Active", "Partially Filled"] },
  });
};

// Static method to find controlled substance prescriptions
prescriptionSchema.statics.findControlledSubstances = function () {
  return this.find({ "controlledSubstance.isControlled": true });
};

module.exports = mongoose.model("Prescription", prescriptionSchema);
