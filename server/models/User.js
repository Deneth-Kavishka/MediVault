const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot be more than 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot be more than 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    // Identity Information
    nic: {
      type: String,
      required: [true, "NIC is required"],
      unique: true,
      match: [
        /^([0-9]{9}[vVxX]|[0-9]{12})$/,
        "Please provide a valid Sri Lankan NIC",
      ],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [
        /^(\+94|0)?[0-9]{9}$/,
        "Please provide a valid Sri Lankan phone number",
      ],
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
      validate: {
        validator: function (dob) {
          return dob <= new Date();
        },
        message: "Date of birth cannot be in the future",
      },
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: ["Male", "Female", "Other"],
    },

    // Address Information
    address: {
      street: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      province: { type: String, required: true, trim: true },
      postalCode: {
        type: String,
        required: true,
        match: [/^[0-9]{5}$/, "Please provide a valid postal code"],
      },
    },

    // Role and Status
    role: {
      type: String,
      required: [true, "Role is required"],
      enum: [
        "Patient",
        "Doctor",
        "Nurse",
        "Pharmacist",
        "LabTechnician",
        "Receptionist",
        "Admin",
      ],
      default: "Patient",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended", "Pending"],
      default: "Active",
    },

    // Professional Information (for staff)
    employeeId: {
      type: String,
      sparse: true,
      unique: true,
    },
    department: {
      type: String,
      trim: true,
    },
    specialization: {
      type: String,
      trim: true,
    },
    qualifications: [
      {
        degree: String,
        institution: String,
        year: Number,
      },
    ],
    licenseNumber: {
      type: String,
      sparse: true,
      unique: true,
    },

    // Security and Authentication
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,

    // Profile Information
    avatar: {
      type: String,
      default: "default-avatar.png",
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },

    // Timestamps and Audit
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
userSchema.index({ email: 1, nic: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ employeeId: 1 }, { sparse: true });
userSchema.index({ licenseNumber: 1 }, { sparse: true });

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
userSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const month = today.getMonth() - birthDate.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual for account lock status
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  // Hash password with cost of 12
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Pre-save middleware for employee ID generation
userSchema.pre("save", async function (next) {
  if (
    this.isNew &&
    [
      "Doctor",
      "Nurse",
      "Pharmacist",
      "LabTechnician",
      "Receptionist",
      "Admin",
    ].includes(this.role) &&
    !this.employeeId
  ) {
    const rolePrefix = {
      Doctor: "DOC",
      Nurse: "NUR",
      Pharmacist: "PHR",
      LabTechnician: "LAB",
      Receptionist: "REC",
      Admin: "ADM",
    };

    const count = await this.constructor.countDocuments({ role: this.role });
    this.employeeId = `${rolePrefix[this.role]}${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// Method to check password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get signed JWT token
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      email: this.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Method to generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire time (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Method to generate email verification token
userSchema.methods.getEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(20).toString("hex");

  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  return verificationToken;
};

// Method to handle failed login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // If we're at max attempts and not locked, lock account
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

module.exports = mongoose.model("User", userSchema);
