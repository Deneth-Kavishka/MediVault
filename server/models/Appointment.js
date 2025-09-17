const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    // Appointment Identification
    appointmentId: {
      type: String,
      unique: true,
      required: true,
    },

    // Parties Involved
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

    // Appointment Details
    appointmentDate: {
      type: Date,
      required: [true, "Appointment date is required"],
      validate: {
        validator: function (date) {
          return date > new Date();
        },
        message: "Appointment date must be in the future",
      },
    },
    appointmentTime: {
      type: String,
      required: [true, "Appointment time is required"],
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please provide valid time format (HH:MM)",
      ],
    },
    duration: {
      type: Number, // in minutes
      default: 30,
      min: [15, "Minimum appointment duration is 15 minutes"],
      max: [240, "Maximum appointment duration is 4 hours"],
    },

    // Appointment Type and Purpose
    type: {
      type: String,
      required: [true, "Appointment type is required"],
      enum: [
        "Consultation",
        "Follow-up",
        "Check-up",
        "Emergency",
        "Surgery",
        "Procedure",
        "Vaccination",
        "Screening",
        "Counseling",
        "Therapy",
      ],
    },
    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Urgent", "Emergency"],
      default: "Normal",
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      enum: [
        "General Medicine",
        "Cardiology",
        "Neurology",
        "Orthopedics",
        "Pediatrics",
        "Gynecology",
        "Dermatology",
        "Psychiatry",
        "Ophthalmology",
        "ENT",
        "Surgery",
        "Emergency",
        "Radiology",
        "Laboratory",
      ],
    },

    // Reason and Symptoms
    reasonForVisit: {
      type: String,
      required: [true, "Reason for visit is required"],
      trim: true,
      maxlength: [500, "Reason cannot be more than 500 characters"],
    },
    symptoms: [
      {
        symptom: {
          type: String,
          required: true,
          trim: true,
        },
        duration: String,
        severity: {
          type: String,
          enum: ["Mild", "Moderate", "Severe"],
        },
        description: String,
      },
    ],

    // Status and Progress
    status: {
      type: String,
      enum: [
        "Scheduled",
        "Confirmed",
        "In-Progress",
        "Completed",
        "Cancelled",
        "No-Show",
        "Rescheduled",
      ],
      default: "Scheduled",
    },

    // Booking Information
    bookedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    bookingMethod: {
      type: String,
      enum: ["Online", "Phone", "Walk-in", "Referral"],
      default: "Online",
    },

    // Visit Information
    checkInTime: Date,
    checkOutTime: Date,
    actualStartTime: Date,
    actualEndTime: Date,
    waitingTime: Number, // in minutes

    // Medical Information
    vitalSigns: {
      bloodPressure: {
        systolic: Number,
        diastolic: Number,
      },
      heartRate: Number,
      temperature: Number,
      weight: Number,
      height: Number,
      respiratoryRate: Number,
      oxygenSaturation: Number,
      recordedBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      recordedAt: Date,
    },

    // Clinical Notes
    chiefComplaint: {
      type: String,
      trim: true,
      maxlength: [1000, "Chief complaint cannot be more than 1000 characters"],
    },
    presentIllness: {
      type: String,
      trim: true,
      maxlength: [2000, "Present illness cannot be more than 2000 characters"],
    },
    physicalExamination: {
      type: String,
      trim: true,
      maxlength: [
        2000,
        "Physical examination cannot be more than 2000 characters",
      ],
    },
    diagnosis: [
      {
        condition: {
          type: String,
          required: true,
          trim: true,
        },
        type: {
          type: String,
          enum: ["Primary", "Secondary", "Differential", "Rule-out"],
          default: "Primary",
        },
        icdCode: String,
        severity: {
          type: String,
          enum: ["Mild", "Moderate", "Severe"],
        },
        confidence: {
          type: String,
          enum: ["Confirmed", "Probable", "Possible"],
        },
      },
    ],

    // Treatment and Recommendations
    treatmentPlan: {
      type: String,
      trim: true,
      maxlength: [2000, "Treatment plan cannot be more than 2000 characters"],
    },
    medications: [
      {
        name: String,
        dosage: String,
        frequency: String,
        duration: String,
        instructions: String,
      },
    ],
    recommendations: [
      {
        type: String,
        trim: true,
      },
    ],

    // Follow-up and Referrals
    followUp: {
      required: {
        type: Boolean,
        default: false,
      },
      period: String, // e.g., "2 weeks", "1 month"
      instructions: String,
      scheduledDate: Date,
    },
    referrals: [
      {
        department: String,
        doctor: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        reason: String,
        urgency: {
          type: String,
          enum: ["Routine", "Urgent", "Emergency"],
        },
        notes: String,
      },
    ],

    // Tests and Procedures
    orderedTests: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "LabTest",
      },
    ],
    procedures: [
      {
        name: String,
        description: String,
        performedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        performedAt: Date,
        results: String,
        complications: String,
      },
    ],

    // Financial Information
    estimatedCost: {
      type: Number,
      min: [0, "Cost cannot be negative"],
    },
    actualCost: {
      type: Number,
      min: [0, "Cost cannot be negative"],
    },
    bill: {
      type: mongoose.Schema.ObjectId,
      ref: "Bill",
    },

    // Room and Resources
    room: {
      number: String,
      type: {
        type: String,
        enum: [
          "Consultation",
          "Examination",
          "Procedure",
          "Surgery",
          "Emergency",
        ],
      },
      floor: String,
      building: String,
    },

    // Communication and Notifications
    notifications: [
      {
        type: {
          type: String,
          enum: [
            "Reminder",
            "Confirmation",
            "Reschedule",
            "Cancellation",
            "Follow-up",
          ],
        },
        method: {
          type: String,
          enum: ["Email", "SMS", "Phone", "App"],
        },
        sentAt: Date,
        status: {
          type: String,
          enum: ["Pending", "Sent", "Delivered", "Failed"],
        },
        message: String,
      },
    ],

    // Notes and Comments
    notes: [
      {
        note: {
          type: String,
          required: true,
          trim: true,
        },
        addedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        type: {
          type: String,
          enum: ["General", "Medical", "Administrative", "Billing"],
          default: "General",
        },
      },
    ],

    // Cancellation Information
    cancellation: {
      reason: String,
      cancelledBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      cancelledAt: Date,
      refundAmount: Number,
      refundStatus: {
        type: String,
        enum: ["Pending", "Processed", "Completed", "Failed"],
      },
    },

    // Quality and Feedback
    patientFeedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comments: String,
      submittedAt: Date,
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
appointmentSchema.index({ patient: 1, appointmentDate: 1 });
appointmentSchema.index({ doctor: 1, appointmentDate: 1 });
appointmentSchema.index({ appointmentId: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ department: 1 });
appointmentSchema.index({ appointmentDate: 1, appointmentTime: 1 });
appointmentSchema.index({ priority: 1 });
appointmentSchema.index({ type: 1 });

// Virtual for appointment duration in hours
appointmentSchema.virtual("durationHours").get(function () {
  return this.duration / 60;
});

// Virtual for appointment date and time combined
appointmentSchema.virtual("appointmentDateTime").get(function () {
  if (!this.appointmentDate || !this.appointmentTime) return null;

  const date = new Date(this.appointmentDate);
  const [hours, minutes] = this.appointmentTime.split(":");
  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  return date;
});

// Virtual for time until appointment
appointmentSchema.virtual("timeUntilAppointment").get(function () {
  const appointmentDateTime = this.appointmentDateTime;
  if (!appointmentDateTime) return null;

  const now = new Date();
  const timeDiff = appointmentDateTime - now;

  if (timeDiff < 0) return "Past due";

  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days} day(s), ${hours} hour(s)`;
  if (hours > 0) return `${hours} hour(s), ${minutes} minute(s)`;
  return `${minutes} minute(s)`;
});

// Virtual for actual duration
appointmentSchema.virtual("actualDuration").get(function () {
  if (!this.actualStartTime || !this.actualEndTime) return null;
  return Math.round((this.actualEndTime - this.actualStartTime) / (1000 * 60));
});

// Pre-save middleware to generate appointment ID
appointmentSchema.pre("save", async function (next) {
  if (this.isNew && !this.appointmentId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const count = await this.constructor.countDocuments({
      appointmentId: { $regex: `^APT${year}${month}${day}` },
    });

    this.appointmentId = `APT${year}${month}${day}${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// Pre-save middleware to calculate waiting time
appointmentSchema.pre("save", function (next) {
  if (this.checkInTime && this.actualStartTime) {
    this.waitingTime = Math.round(
      (this.actualStartTime - this.checkInTime) / (1000 * 60)
    );
  }
  next();
});

// Method to check in patient
appointmentSchema.methods.checkIn = function () {
  this.checkInTime = new Date();
  this.status = "Confirmed";
  return this.save();
};

// Method to start appointment
appointmentSchema.methods.startAppointment = function () {
  this.actualStartTime = new Date();
  this.status = "In-Progress";
  return this.save();
};

// Method to complete appointment
appointmentSchema.methods.completeAppointment = function () {
  this.actualEndTime = new Date();
  this.status = "Completed";
  return this.save();
};

// Method to cancel appointment
appointmentSchema.methods.cancelAppointment = function (reason, cancelledBy) {
  this.status = "Cancelled";
  this.cancellation = {
    reason,
    cancelledBy,
    cancelledAt: new Date(),
  };
  return this.save();
};

// Method to reschedule appointment
appointmentSchema.methods.reschedule = function (newDate, newTime) {
  this.appointmentDate = newDate;
  this.appointmentTime = newTime;
  this.status = "Rescheduled";
  return this.save();
};

// Method to add note
appointmentSchema.methods.addNote = function (note, addedBy, type = "General") {
  this.notes.push({
    note,
    addedBy,
    type,
  });
  return this.save();
};

// Method to add diagnosis
appointmentSchema.methods.addDiagnosis = function (diagnosisData) {
  this.diagnosis.push(diagnosisData);
  return this.save();
};

// Method to check if appointment is overdue
appointmentSchema.methods.isOverdue = function () {
  const appointmentDateTime = this.appointmentDateTime;
  if (!appointmentDateTime) return false;

  return new Date() > appointmentDateTime && this.status === "Scheduled";
};

// Method to get appointment conflicts
appointmentSchema.statics.findConflicts = async function (
  doctorId,
  appointmentDate,
  appointmentTime,
  duration,
  excludeId = null
) {
  const startTime = new Date(appointmentDate);
  const [hours, minutes] = appointmentTime.split(":");
  startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  const endTime = new Date(startTime.getTime() + duration * 60000);

  const query = {
    doctor: doctorId,
    status: { $in: ["Scheduled", "Confirmed", "In-Progress"] },
    $or: [
      {
        $and: [
          { appointmentDate: { $lte: startTime } },
          {
            $expr: {
              $gte: [
                {
                  $add: [
                    "$appointmentDate",
                    { $multiply: ["$duration", 60000] },
                  ],
                },
                startTime,
              ],
            },
          },
        ],
      },
      {
        $and: [
          { appointmentDate: { $lt: endTime } },
          { appointmentDate: { $gte: startTime } },
        ],
      },
    ],
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return this.find(query);
};

module.exports = mongoose.model("Appointment", appointmentSchema);
