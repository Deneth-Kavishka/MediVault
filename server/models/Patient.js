const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    // Reference to User model
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Patient-specific ID
    patientId: {
      type: String,
      unique: true,
      required: true,
    },

    // Medical Information
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: [true, "Blood type is required"],
    },
    height: {
      type: Number, // in cm
      min: [50, "Height must be at least 50cm"],
      max: [300, "Height cannot exceed 300cm"],
    },
    weight: {
      type: Number, // in kg
      min: [1, "Weight must be at least 1kg"],
      max: [500, "Weight cannot exceed 500kg"],
    },

    // Medical History
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
          trim: true,
        },
        severity: {
          type: String,
          enum: ["Mild", "Moderate", "Severe", "Life-threatening"],
          required: true,
        },
        diagnosedDate: Date,
        notes: String,
      },
    ],

    chronicConditions: [
      {
        condition: {
          type: String,
          required: true,
          trim: true,
        },
        diagnosedDate: {
          type: Date,
          required: true,
        },
        status: {
          type: String,
          enum: ["Active", "Managed", "Resolved", "Monitoring"],
          default: "Active",
        },
        notes: String,
      },
    ],

    medications: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        dosage: {
          type: String,
          required: true,
        },
        frequency: {
          type: String,
          required: true,
        },
        startDate: {
          type: Date,
          required: true,
        },
        endDate: Date,
        prescribedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: ["Active", "Completed", "Discontinued", "On-hold"],
          default: "Active",
        },
        notes: String,
      },
    ],

    surgicalHistory: [
      {
        procedure: {
          type: String,
          required: true,
          trim: true,
        },
        date: {
          type: Date,
          required: true,
        },
        surgeon: {
          type: String,
          required: true,
          trim: true,
        },
        hospital: {
          type: String,
          required: true,
          trim: true,
        },
        complications: String,
        notes: String,
      },
    ],

    familyHistory: [
      {
        relationship: {
          type: String,
          required: true,
          enum: [
            "Father",
            "Mother",
            "Brother",
            "Sister",
            "Grandfather",
            "Grandmother",
            "Uncle",
            "Aunt",
            "Cousin",
            "Other",
          ],
        },
        condition: {
          type: String,
          required: true,
          trim: true,
        },
        ageOfOnset: Number,
        notes: String,
      },
    ],

    // Lifestyle Information
    lifestyle: {
      smoking: {
        status: {
          type: String,
          enum: ["Never", "Former", "Current"],
          default: "Never",
        },
        packsPerDay: Number,
        yearsSmoked: Number,
        quitDate: Date,
      },
      alcohol: {
        status: {
          type: String,
          enum: ["Never", "Occasional", "Regular", "Heavy"],
          default: "Never",
        },
        drinksPerWeek: Number,
      },
      exercise: {
        frequency: {
          type: String,
          enum: [
            "Never",
            "Rarely",
            "1-2 times/week",
            "3-4 times/week",
            "5+ times/week",
          ],
          default: "Never",
        },
        type: [String],
        duration: Number, // minutes per session
      },
      diet: {
        type: {
          type: String,
          enum: [
            "Regular",
            "Vegetarian",
            "Vegan",
            "Keto",
            "Diabetic",
            "Low-sodium",
            "Other",
          ],
        },
        restrictions: [String],
        notes: String,
      },
    },

    // Insurance Information
    insurance: {
      provider: String,
      policyNumber: String,
      groupNumber: String,
      subscriberId: String,
      coverageType: {
        type: String,
        enum: ["Basic", "Standard", "Premium", "Government"],
      },
      effectiveDate: Date,
      expiryDate: Date,
      copayAmount: Number,
      deductible: Number,
    },

    // Vital Signs (latest)
    vitals: {
      bloodPressure: {
        systolic: Number,
        diastolic: Number,
        recordedDate: Date,
        recordedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
      },
      heartRate: {
        value: Number,
        recordedDate: Date,
        recordedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
      },
      temperature: {
        value: Number, // in Celsius
        recordedDate: Date,
        recordedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
      },
      respiratoryRate: {
        value: Number,
        recordedDate: Date,
        recordedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
      },
      oxygenSaturation: {
        value: Number,
        recordedDate: Date,
        recordedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
      },
    },

    // Medical Records References
    medicalRecords: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "MedicalRecord",
      },
    ],

    appointments: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Appointment",
      },
    ],

    prescriptions: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Prescription",
      },
    ],

    labTests: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "LabTest",
      },
    ],

    bills: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Bill",
      },
    ],

    // Patient Status
    status: {
      type: String,
      enum: ["Active", "Inactive", "Deceased", "Transferred"],
      default: "Active",
    },

    registrationDate: {
      type: Date,
      default: Date.now,
    },

    lastVisitDate: Date,

    // Preferences
    preferences: {
      preferredLanguage: {
        type: String,
        enum: ["English", "Sinhala", "Tamil"],
        default: "English",
      },
      preferredDoctor: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      communicationPreference: {
        type: String,
        enum: ["Email", "SMS", "Phone", "Mail"],
        default: "Email",
      },
      appointmentReminders: {
        type: Boolean,
        default: true,
      },
      medicalReminders: {
        type: Boolean,
        default: true,
      },
    },

    // Privacy and Consent
    consent: {
      dataProcessing: {
        type: Boolean,
        default: false,
      },
      marketing: {
        type: Boolean,
        default: false,
      },
      research: {
        type: Boolean,
        default: false,
      },
      emergencyContact: {
        type: Boolean,
        default: true,
      },
    },

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
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
patientSchema.index({ user: 1 });
patientSchema.index({ patientId: 1 });
patientSchema.index({ bloodType: 1 });
patientSchema.index({ status: 1 });
patientSchema.index({ registrationDate: 1 });
patientSchema.index({ "allergies.allergen": 1 });
patientSchema.index({ "chronicConditions.condition": 1 });

// Virtual for BMI calculation
patientSchema.virtual("bmi").get(function () {
  if (!this.weight || !this.height) return null;
  const heightInMeters = this.height / 100;
  return parseFloat(
    (this.weight / (heightInMeters * heightInMeters)).toFixed(1)
  );
});

// Virtual for BMI category
patientSchema.virtual("bmiCategory").get(function () {
  const bmi = this.bmi;
  if (!bmi) return null;

  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal weight";
  if (bmi < 30) return "Overweight";
  return "Obese";
});

// Virtual for total appointments
patientSchema.virtual("totalAppointments").get(function () {
  return this.appointments ? this.appointments.length : 0;
});

// Pre-save middleware to generate patient ID
patientSchema.pre("save", async function (next) {
  if (this.isNew && !this.patientId) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      patientId: { $regex: `^PAT${year}` },
    });
    this.patientId = `PAT${year}${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

// Method to add allergy
patientSchema.methods.addAllergy = function (allergyData) {
  this.allergies.push(allergyData);
  return this.save();
};

// Method to add chronic condition
patientSchema.methods.addChronicCondition = function (conditionData) {
  this.chronicConditions.push(conditionData);
  return this.save();
};

// Method to update vital signs
patientSchema.methods.updateVitals = function (vitalsData, recordedBy) {
  const recordedDate = new Date();

  Object.keys(vitalsData).forEach((vital) => {
    if (this.vitals[vital] !== undefined) {
      this.vitals[vital] = {
        ...vitalsData[vital],
        recordedDate,
        recordedBy,
      };
    }
  });

  return this.save();
};

// Method to get risk factors
patientSchema.methods.getRiskFactors = function () {
  const risks = [];

  // Age-based risks
  const user = this.populated("user") || this.user;
  if (user && user.age) {
    if (user.age > 65) risks.push("Advanced age");
    if (user.age < 18) risks.push("Pediatric patient");
  }

  // BMI-based risks
  if (this.bmi) {
    if (this.bmi < 18.5) risks.push("Underweight");
    if (this.bmi >= 30) risks.push("Obesity");
  }

  // Lifestyle risks
  if (this.lifestyle.smoking.status === "Current") risks.push("Active smoker");
  if (this.lifestyle.alcohol.status === "Heavy")
    risks.push("Heavy alcohol use");

  // Medical risks
  if (this.allergies.some((a) => a.severity === "Life-threatening")) {
    risks.push("Life-threatening allergies");
  }

  // Chronic conditions
  const activeConditions = this.chronicConditions.filter(
    (c) => c.status === "Active"
  );
  if (activeConditions.length > 0) {
    risks.push(`${activeConditions.length} active chronic condition(s)`);
  }

  return risks;
};

module.exports = mongoose.model("Patient", patientSchema);
