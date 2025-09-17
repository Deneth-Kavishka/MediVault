const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    // Inventory Identification
    inventoryId: {
      type: String,
      unique: true,
      required: true,
    },

    // Medicine Reference
    medicine: {
      type: mongoose.Schema.ObjectId,
      ref: "Medicine",
      required: [true, "Medicine is required"],
    },

    // Batch Information
    batchNumber: {
      type: String,
      required: [true, "Batch number is required"],
      trim: true,
    },
    lotNumber: {
      type: String,
      required: [true, "Lot number is required"],
      trim: true,
    },

    // Supplier Information
    supplier: {
      name: {
        type: String,
        required: [true, "Supplier name is required"],
        trim: true,
      },
      contactPerson: String,
      phone: String,
      email: String,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      licenseNumber: String,
      taxId: String,
    },

    // Purchase Information
    purchaseOrder: {
      poNumber: String,
      orderDate: Date,
      expectedDeliveryDate: Date,
      actualDeliveryDate: Date,
    },

    // Quantity Information
    quantity: {
      received: {
        type: Number,
        required: [true, "Received quantity is required"],
        min: [0, "Received quantity cannot be negative"],
      },
      current: {
        type: Number,
        required: [true, "Current quantity is required"],
        min: [0, "Current quantity cannot be negative"],
      },
      reserved: {
        type: Number,
        default: 0,
        min: [0, "Reserved quantity cannot be negative"],
      },
      available: {
        type: Number,
        default: function () {
          return this.current - this.reserved;
        },
      },
      unit: {
        type: String,
        required: [true, "Unit is required"],
        enum: [
          "tablet(s)",
          "capsule(s)",
          "ml",
          "bottle(s)",
          "vial(s)",
          "tube(s)",
          "box(es)",
          "strip(s)",
          "piece(s)",
        ],
      },
      minimumStock: {
        type: Number,
        required: [true, "Minimum stock level is required"],
        min: [0, "Minimum stock cannot be negative"],
      },
      reorderLevel: {
        type: Number,
        required: [true, "Reorder level is required"],
        min: [0, "Reorder level cannot be negative"],
      },
      maximumStock: {
        type: Number,
        required: [true, "Maximum stock level is required"],
        min: [1, "Maximum stock must be positive"],
      },
    },

    // Date Information
    manufacturingDate: {
      type: Date,
      required: [true, "Manufacturing date is required"],
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
      validate: {
        validator: function (date) {
          return date > this.manufacturingDate;
        },
        message: "Expiry date must be after manufacturing date",
      },
    },

    // Cost Information
    cost: {
      unitCost: {
        type: Number,
        required: [true, "Unit cost is required"],
        min: [0, "Unit cost cannot be negative"],
      },
      totalCost: {
        type: Number,
        required: [true, "Total cost is required"],
        min: [0, "Total cost cannot be negative"],
      },
      sellingPrice: {
        type: Number,
        required: [true, "Selling price is required"],
        min: [0, "Selling price cannot be negative"],
      },
      margin: {
        type: Number,
        default: function () {
          return ((this.sellingPrice - this.unitCost) / this.unitCost) * 100;
        },
      },
      taxRate: {
        type: Number,
        default: 0,
        min: [0, "Tax rate cannot be negative"],
        max: [100, "Tax rate cannot exceed 100%"],
      },
      discount: {
        percentage: {
          type: Number,
          default: 0,
          min: [0, "Discount cannot be negative"],
          max: [100, "Discount cannot exceed 100%"],
        },
        amount: {
          type: Number,
          default: 0,
          min: [0, "Discount amount cannot be negative"],
        },
      },
    },

    // Storage Information
    storage: {
      location: {
        warehouse: String,
        section: String,
        rack: String,
        shelf: String,
        position: String,
      },
      temperature: {
        required: {
          min: Number, // Celsius
          max: Number, // Celsius
        },
        actual: {
          current: Number,
          lastChecked: Date,
        },
      },
      humidity: {
        required: {
          max: Number, // percentage
        },
        actual: {
          current: Number,
          lastChecked: Date,
        },
      },
      specialRequirements: [String],
    },

    // Status Information
    status: {
      type: String,
      enum: [
        "Active",
        "Expired",
        "Damaged",
        "Recalled",
        "Quarantined",
        "Dispensed",
        "Returned",
        "Disposed",
      ],
      default: "Active",
    },

    condition: {
      type: String,
      enum: ["Excellent", "Good", "Fair", "Poor", "Damaged"],
      default: "Good",
    },

    // Quality Control
    qualityCheck: {
      performed: {
        type: Boolean,
        default: false,
      },
      date: Date,
      checkedBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      result: {
        type: String,
        enum: ["Pass", "Fail", "Conditional Pass"],
      },
      notes: String,
      parameters: [
        {
          name: String,
          value: String,
          unit: String,
          specification: String,
          result: {
            type: String,
            enum: ["Pass", "Fail"],
          },
        },
      ],
    },

    // Movement History
    movements: [
      {
        type: {
          type: String,
          enum: [
            "Received",
            "Dispensed",
            "Returned",
            "Adjusted",
            "Transferred",
            "Damaged",
            "Expired",
            "Recalled",
          ],
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        reference: String, // Reference to prescription, return, etc.
        user: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        notes: String,
        fromLocation: String,
        toLocation: String,
      },
    ],

    // Barcode and RFID
    identification: {
      barcode: String,
      rfidTag: String,
      qrCode: String,
    },

    // Alerts and Notifications
    alerts: [
      {
        type: {
          type: String,
          enum: [
            "Low Stock",
            "Expiry Warning",
            "Temperature Alert",
            "Humidity Alert",
            "Quality Issue",
            "Recall Notice",
          ],
        },
        message: String,
        severity: {
          type: String,
          enum: ["Low", "Medium", "High", "Critical"],
        },
        active: {
          type: Boolean,
          default: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        acknowledgedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        acknowledgedAt: Date,
      },
    ],

    // Regulatory Information
    regulatory: {
      gmpCertified: {
        type: Boolean,
        default: false,
      },
      fdaApproved: {
        type: Boolean,
        default: false,
      },
      permits: [
        {
          type: String,
          number: String,
          expiryDate: Date,
        },
      ],
      inspectionDate: Date,
      inspectionResult: String,
    },

    // Insurance and Warranty
    insurance: {
      covered: {
        type: Boolean,
        default: false,
      },
      provider: String,
      policyNumber: String,
      coverageAmount: Number,
      deductible: Number,
    },

    warranty: {
      period: Number, // in months
      provider: String,
      terms: String,
    },

    // Disposal Information
    disposal: {
      method: String,
      date: Date,
      disposedBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      disposalCompany: String,
      certificateNumber: String,
      cost: Number,
      reason: String,
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
    lastMovementDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
inventorySchema.index({ medicine: 1, batchNumber: 1 });
inventorySchema.index({ inventoryId: 1 });
inventorySchema.index({ expiryDate: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ "quantity.current": 1 });
inventorySchema.index({ "quantity.minimumStock": 1 });
inventorySchema.index({ "supplier.name": 1 });
inventorySchema.index({ lotNumber: 1 });

// Virtual for days until expiry
inventorySchema.virtual("daysUntilExpiry").get(function () {
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for stock status
inventorySchema.virtual("stockStatus").get(function () {
  const available = this.quantity.available;
  const minimum = this.quantity.minimumStock;
  const reorder = this.quantity.reorderLevel;

  if (available <= 0) return "Out of Stock";
  if (available <= minimum) return "Critical";
  if (available <= reorder) return "Low";
  return "Normal";
});

// Virtual for expiry status
inventorySchema.virtual("expiryStatus").get(function () {
  const daysUntilExpiry = this.daysUntilExpiry;

  if (daysUntilExpiry <= 0) return "Expired";
  if (daysUntilExpiry <= 30) return "Expiring Soon";
  if (daysUntilExpiry <= 90) return "Monitor";
  return "Good";
});

// Virtual for total value
inventorySchema.virtual("totalValue").get(function () {
  return this.quantity.current * this.cost.unitCost;
});

// Pre-save middleware to generate inventory ID
inventorySchema.pre("save", async function (next) {
  if (this.isNew && !this.inventoryId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    const count = await this.constructor.countDocuments({
      inventoryId: { $regex: `^INV${year}${month}` },
    });

    this.inventoryId = `INV${year}${month}${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

// Pre-save middleware to update available quantity
inventorySchema.pre("save", function (next) {
  this.quantity.available = this.quantity.current - this.quantity.reserved;
  next();
});

// Pre-save middleware to check for alerts
inventorySchema.pre("save", function (next) {
  const now = new Date();

  // Check for low stock
  if (this.quantity.available <= this.quantity.minimumStock) {
    const existingAlert = this.alerts.find(
      (alert) => alert.type === "Low Stock" && alert.active
    );

    if (!existingAlert) {
      this.alerts.push({
        type: "Low Stock",
        message: `Stock level is below minimum threshold (${this.quantity.minimumStock})`,
        severity: this.quantity.available <= 0 ? "Critical" : "High",
      });
    }
  }

  // Check for expiry warning
  const daysUntilExpiry = Math.ceil(
    (this.expiryDate - now) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
    const existingAlert = this.alerts.find(
      (alert) => alert.type === "Expiry Warning" && alert.active
    );

    if (!existingAlert) {
      this.alerts.push({
        type: "Expiry Warning",
        message: `Medicine expires in ${daysUntilExpiry} days`,
        severity: daysUntilExpiry <= 7 ? "Critical" : "Medium",
      });
    }
  }

  next();
});

// Method to dispense quantity
inventorySchema.methods.dispense = function (quantity, user, reference, notes) {
  if (quantity > this.quantity.available) {
    throw new Error("Insufficient stock available");
  }

  this.quantity.current -= quantity;
  this.quantity.available = this.quantity.current - this.quantity.reserved;
  this.lastMovementDate = new Date();

  this.movements.push({
    type: "Dispensed",
    quantity: -quantity,
    user,
    reference,
    notes,
  });

  return this.save();
};

// Method to receive stock
inventorySchema.methods.receiveStock = function (quantity, user, notes) {
  this.quantity.current += quantity;
  this.quantity.available = this.quantity.current - this.quantity.reserved;
  this.lastMovementDate = new Date();

  this.movements.push({
    type: "Received",
    quantity,
    user,
    notes,
  });

  return this.save();
};

// Method to reserve quantity
inventorySchema.methods.reserve = function (quantity) {
  if (quantity > this.quantity.available) {
    throw new Error("Insufficient stock available to reserve");
  }

  this.quantity.reserved += quantity;
  this.quantity.available = this.quantity.current - this.quantity.reserved;

  return this.save();
};

// Method to release reservation
inventorySchema.methods.releaseReservation = function (quantity) {
  const releaseAmount = Math.min(quantity, this.quantity.reserved);
  this.quantity.reserved -= releaseAmount;
  this.quantity.available = this.quantity.current - this.quantity.reserved;

  return this.save();
};

// Method to adjust stock
inventorySchema.methods.adjustStock = function (newQuantity, reason, user) {
  const difference = newQuantity - this.quantity.current;

  this.quantity.current = newQuantity;
  this.quantity.available = this.quantity.current - this.quantity.reserved;
  this.lastMovementDate = new Date();

  this.movements.push({
    type: "Adjusted",
    quantity: difference,
    user,
    notes: reason,
  });

  return this.save();
};

// Method to mark as expired
inventorySchema.methods.markExpired = function (user, notes) {
  this.status = "Expired";
  this.lastMovementDate = new Date();

  this.movements.push({
    type: "Expired",
    quantity: -this.quantity.current,
    user,
    notes,
  });

  this.quantity.current = 0;
  this.quantity.available = 0;

  return this.save();
};

// Method to acknowledge alert
inventorySchema.methods.acknowledgeAlert = function (alertId, user) {
  const alert = this.alerts.id(alertId);
  if (alert) {
    alert.active = false;
    alert.acknowledgedBy = user;
    alert.acknowledgedAt = new Date();
  }
  return this.save();
};

// Static method to find low stock items
inventorySchema.statics.findLowStock = function () {
  return this.find({
    $expr: { $lte: ["$quantity.available", "$quantity.minimumStock"] },
    status: "Active",
  });
};

// Static method to find expiring items
inventorySchema.statics.findExpiring = function (days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    expiryDate: { $lte: futureDate, $gt: new Date() },
    status: "Active",
  });
};

// Static method to find expired items
inventorySchema.statics.findExpired = function () {
  return this.find({
    expiryDate: { $lt: new Date() },
    status: { $ne: "Expired" },
  });
};

// Static method to get inventory by medicine
inventorySchema.statics.findByMedicine = function (medicineId) {
  return this.find({
    medicine: medicineId,
    status: "Active",
    "quantity.available": { $gt: 0 },
  }).sort({ expiryDate: 1 }); // FIFO - First In First Out
};

module.exports = mongoose.model("Inventory", inventorySchema);
