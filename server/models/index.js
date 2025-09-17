const mongoose = require("mongoose");

// Create a centralized model index file
const User = require("./User");
const Patient = require("./Patient");
const Appointment = require("./Appointment");
const MedicalRecord = require("./MedicalRecord");
const Prescription = require("./Prescription");
const Medicine = require("./Medicine");
const Inventory = require("./Inventory");
const LabTest = require("./LabTest");

module.exports = {
  User,
  Patient,
  Appointment,
  MedicalRecord,
  Prescription,
  Medicine,
  Inventory,
  LabTest,
};
