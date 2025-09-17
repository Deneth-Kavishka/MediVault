const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    // Basic Medicine Information
    medicineId: {
      type: String,
      unique: true,
      required: true,
    },

    // Drug Identification
    name: {
      type: String,
      required: [true, "Medicine name is required"],
      trim: true,
      index: true,
    },
    genericName: {
      type: String,
      required: [true, "Generic name is required"],
      trim: true,
      index: true,
    },
    brandName: {
      type: String,
      trim: true,
    },

    // Drug Classification
    drugClass: {
      type: String,
      required: [true, "Drug class is required"],
      enum: [
        "Analgesic",
        "Antibiotic",
        "Antifungal",
        "Antiviral",
        "Antihypertensive",
        "Antidiabetic",
        "Antihistamine",
        "Antacid",
        "Antidepressant",
        "Anticonvulsant",
        "Bronchodilator",
        "Diuretic",
        "Hormone",
        "Immunosuppressant",
        "Steroid",
        "Vitamin",
        "Mineral",
        "Vaccine",
        "Other",
      ],
    },

    therapeuticClass: {
      type: String,
      required: [true, "Therapeutic class is required"],
    },

    // Physical Properties
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
        "Powder",
      ],
    },

    strength: {
      value: {
        type: Number,
        required: [true, "Strength value is required"],
        min: [0, "Strength must be positive"],
      },
      unit: {
        type: String,
        required: [true, "Strength unit is required"],
        enum: ["mg", "g", "ml", "mcg", "IU", "%", "mEq"],
      },
    },

    // Route of Administration
    routeOfAdministration: [
      {
        type: String,
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
    ],

    // Regulatory Information
    fdaApproval: {
      approved: {
        type: Boolean,
        default: false,
      },
      approvalDate: Date,
      fdaNumber: String,
    },

    controlledSubstance: {
      isControlled: {
        type: Boolean,
        default: false,
      },
      schedule: {
        type: String,
        enum: ["I", "II", "III", "IV", "V"],
      },
    },

    // Identification Codes
    ndc: {
      // National Drug Code
      type: String,
      unique: true,
      sparse: true,
    },
    upc: String, // Universal Product Code
    rxcui: String, // RxNorm Concept Unique Identifier

    // Manufacturer Information
    manufacturer: {
      name: {
        type: String,
        required: [true, "Manufacturer name is required"],
      },
      address: String,
      contactInfo: {
        phone: String,
        email: String,
        website: String,
      },
      licenseNumber: String,
    },

    // Packaging Information
    packaging: {
      packageSize: {
        type: Number,
        required: [true, "Package size is required"],
        min: [1, "Package size must be at least 1"],
      },
      packageUnit: {
        type: String,
        required: [true, "Package unit is required"],
        enum: [
          "tablet(s)",
          "capsule(s)",
          "ml",
          "bottle(s)",
          "vial(s)",
          "tube(s)",
          "box(es)",
          "strip(s)",
        ],
      },
      packageType: {
        type: String,
        enum: [
          "Bottle",
          "Blister Pack",
          "Vial",
          "Ampoule",
          "Tube",
          "Box",
          "Strip",
          "Syringe",
        ],
      },
    },

    // Clinical Information
    indications: [
      {
        condition: {
          type: String,
          required: true,
        },
        icdCode: String,
        approved: {
          type: Boolean,
          default: true,
        },
      },
    ],

    contraindications: [
      {
        condition: String,
        severity: {
          type: String,
          enum: ["Absolute", "Relative"],
        },
        description: String,
      },
    ],

    sideEffects: [
      {
        effect: {
          type: String,
          required: true,
        },
        frequency: {
          type: String,
          enum: ["Very Common", "Common", "Uncommon", "Rare", "Very Rare"],
        },
        severity: {
          type: String,
          enum: ["Mild", "Moderate", "Severe", "Life-threatening"],
        },
      },
    ],

    warnings: [String],
    precautions: [String],

    // Drug Interactions
    interactions: [
      {
        interactingDrug: {
          type: String,
          required: true,
        },
        severity: {
          type: String,
          enum: ["Minor", "Moderate", "Major", "Contraindicated"],
          required: true,
        },
        mechanism: String,
        clinicalEffect: String,
        management: String,
      },
    ],

    // Dosage Information
    standardDosage: {
      adult: {
        minimum: Number,
        maximum: Number,
        usual: Number,
        unit: String,
        frequency: String,
      },
      pediatric: {
        weightBased: {
          dose: Number,
          unit: String, // mg/kg, mcg/kg
          frequency: String,
        },
        ageBased: [
          {
            ageRange: String,
            dose: Number,
            unit: String,
            frequency: String,
          },
        ],
      },
      elderly: {
        adjustmentRequired: Boolean,
        adjustmentNote: String,
        dose: Number,
        unit: String,
        frequency: String,
      },
      renalImpairment: {
        adjustmentRequired: Boolean,
        creatinineClearance: [
          {
            range: String, // e.g., ">50", "30-50", "<30"
            adjustment: String,
          },
        ],
      },
      hepaticImpairment: {
        adjustmentRequired: Boolean,
        childPughClass: [
          {
            class: {
              type: String,
              enum: ["A", "B", "C"],
            },
            adjustment: String,
          },
        ],
      },
    },

    // Storage and Handling
    storage: {
      temperature: {
        min: Number, // Celsius
        max: Number, // Celsius
        note: String,
      },
      humidity: {
        max: Number, // percentage
        note: String,
      },
      lightSensitive: {
        type: Boolean,
        default: false,
      },
      refrigerated: {
        type: Boolean,
        default: false,
      },
      controlled: {
        type: Boolean,
        default: false,
      },
      specialInstructions: [String],
    },

    // Stability and Expiry
    shelfLife: {
      duration: Number, // in months
      conditions: String,
    },

    // Cost Information
    pricing: {
      wholesalePrice: {
        type: Number,
        min: [0, "Price cannot be negative"],
      },
      retailPrice: {
        type: Number,
        min: [0, "Price cannot be negative"],
      },
      insurancePrice: {
        type: Number,
        min: [0, "Price cannot be negative"],
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },

    // Availability Status
    status: {
      type: String,
      enum: ["Active", "Discontinued", "Recalled", "Shortage", "Back-ordered"],
      default: "Active",
    },

    availability: {
      available: {
        type: Boolean,
        default: true,
      },
      stockStatus: {
        type: String,
        enum: ["In Stock", "Low Stock", "Out of Stock", "Discontinued"],
      },
      estimatedRestockDate: Date,
      minimumOrderQuantity: Number,
    },

    // Quality Control
    qualityControl: {
      batchTested: {
        type: Boolean,
        default: false,
      },
      testingDate: Date,
      testResults: [
        {
          parameter: String,
          result: String,
          specification: String,
          passed: Boolean,
        },
      ],
      qualityGrade: {
        type: String,
        enum: ["A", "B", "C", "D", "F"],
      },
    },

    // Alternative Medicines
    alternatives: [
      {
        medicine: {
          type: mongoose.Schema.ObjectId,
          ref: "Medicine",
        },
        type: {
          type: String,
          enum: ["Generic", "Brand", "Therapeutic"],
        },
        reason: String,
      },
    ],

    // Patient Information
    patientInformation: {
      leafletUrl: String,
      instructions: String,
      importantInfo: [String],
      howToUse: String,
      missedDose: String,
      overdose: String,
    },

    // Professional Information
    professionalInformation: {
      pharmacology: String,
      pharmacokinetics: {
        absorption: String,
        distribution: String,
        metabolism: String,
        elimination: String,
        halfLife: String,
      },
      clinicalStudies: [
        {
          studyTitle: String,
          studyUrl: String,
          results: String,
        },
      ],
    },

    // Images and Documents
    images: [
      {
        url: String,
        type: {
          type: String,
          enum: ["Product", "Package", "Label", "Insert"],
        },
        description: String,
      },
    ],

    documents: [
      {
        title: String,
        url: String,
        type: {
          type: String,
          enum: [
            "Prescribing Information",
            "Patient Leaflet",
            "Safety Data",
            "Study Report",
          ],
        },
      },
    ],

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    approvalDate: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
medicineSchema.index({ name: "text", genericName: "text", brandName: "text" });
medicineSchema.index({ medicineId: 1 });
medicineSchema.index({ ndc: 1 }, { sparse: true });
medicineSchema.index({ drugClass: 1 });
medicineSchema.index({ therapeuticClass: 1 });
medicineSchema.index({ "manufacturer.name": 1 });
medicineSchema.index({ status: 1 });
medicineSchema.index({ "controlledSubstance.isControlled": 1 });
medicineSchema.index({ "pricing.retailPrice": 1 });

// Virtual for full strength
medicineSchema.virtual("fullStrength").get(function () {
  return `${this.strength.value}${this.strength.unit}`;
});

// Virtual for display name
medicineSchema.virtual("displayName").get(function () {
  return this.brandName
    ? `${this.brandName} (${this.genericName})`
    : this.genericName;
});

// Virtual for package description
medicineSchema.virtual("packageDescription").get(function () {
  return `${this.packaging.packageSize} ${this.packaging.packageUnit}`;
});

// Pre-save middleware to generate medicine ID
medicineSchema.pre("save", async function (next) {
  if (this.isNew && !this.medicineId) {
    const prefix = this.controlledSubstance.isControlled ? "CTL" : "MED";
    const count = await this.constructor.countDocuments({
      medicineId: { $regex: `^${prefix}` },
    });
    this.medicineId = `${prefix}${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

// Method to check drug interaction
medicineSchema.methods.checkInteraction = function (otherMedicineId) {
  return this.interactions.find(
    (interaction) => interaction.interactingDrug === otherMedicineId
  );
};

// Method to get dosage for specific patient
medicineSchema.methods.getDosageForPatient = function (patient) {
  const age = patient.age;
  const weight = patient.weight;

  if (age < 18 && this.standardDosage.pediatric) {
    if (weight && this.standardDosage.pediatric.weightBased) {
      return {
        dose: this.standardDosage.pediatric.weightBased.dose * weight,
        unit: this.standardDosage.pediatric.weightBased.unit,
        frequency: this.standardDosage.pediatric.weightBased.frequency,
      };
    }

    const ageDosage = this.standardDosage.pediatric.ageBased.find((ad) => {
      // Simple age range matching - would need more sophisticated logic
      return true; // Placeholder
    });

    if (ageDosage) return ageDosage;
  }

  if (age >= 65 && this.standardDosage.elderly.adjustmentRequired) {
    return this.standardDosage.elderly;
  }

  return this.standardDosage.adult;
};

// Method to check if medicine is suitable for patient
medicineSchema.methods.isSuitableForPatient = function (patient) {
  const issues = [];

  // Check allergies
  patient.allergies.forEach((allergy) => {
    if (
      allergy.allergen.toLowerCase().includes(this.name.toLowerCase()) ||
      allergy.allergen.toLowerCase().includes(this.genericName.toLowerCase())
    ) {
      issues.push(`Patient allergic to ${allergy.allergen}`);
    }
  });

  // Check contraindications with chronic conditions
  patient.chronicConditions.forEach((condition) => {
    const contraindication = this.contraindications.find((ci) =>
      ci.condition.toLowerCase().includes(condition.condition.toLowerCase())
    );
    if (contraindication) {
      issues.push(`Contraindicated in ${condition.condition}`);
    }
  });

  return {
    suitable: issues.length === 0,
    issues,
  };
};

// Method to get alternative medicines
medicineSchema.methods.getAlternatives = function (type = null) {
  let alternatives = this.alternatives;
  if (type) {
    alternatives = alternatives.filter((alt) => alt.type === type);
  }
  return alternatives;
};

// Static method to search medicines
medicineSchema.statics.searchMedicines = function (query) {
  return this.find({
    $or: [
      { name: { $regex: query, $options: "i" } },
      { genericName: { $regex: query, $options: "i" } },
      { brandName: { $regex: query, $options: "i" } },
      { drugClass: { $regex: query, $options: "i" } },
      { therapeuticClass: { $regex: query, $options: "i" } },
    ],
    status: "Active",
  });
};

// Static method to find controlled substances
medicineSchema.statics.findControlledSubstances = function () {
  return this.find({ "controlledSubstance.isControlled": true });
};

// Static method to find by therapeutic class
medicineSchema.statics.findByTherapeuticClass = function (therapeuticClass) {
  return this.find({ therapeuticClass, status: "Active" });
};

// Static method to find expiring medicines (for inventory)
medicineSchema.statics.findNearExpiry = function (days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    status: "Active",
    // This would typically be checked against inventory records
    // For now, it's a placeholder
  });
};

module.exports = mongoose.model("Medicine", medicineSchema);
