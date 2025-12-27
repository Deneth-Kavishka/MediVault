// MediVault Healthcare Management System - Complete Database Schema

import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// AUTH TABLES
// ============================================================================

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique(),
  password: varchar("password").notNull(), // Hashed password with bcrypt
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull(), // 'patient' | 'doctor' | 'pharmacist' | 'lab_technician' | 'admin'
  isActive: boolean("is_active").default(true).notNull(), // Soft delete - false means deactivated
  deactivatedAt: timestamp("deactivated_at"), // When user was deactivated
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// PATIENT TABLE
// ============================================================================

export const patients = pgTable("patients", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  nic: varchar("nic").unique().notNull(), // National Identity Card
  healthId: varchar("health_id").unique(), // Health ID
  rfid: varchar("rfid").unique(), // RFID for patient identification
  dateOfBirth: timestamp("date_of_birth"),
  gender: varchar("gender"), // 'male' | 'female' | 'other'
  contactInfo: varchar("contact_info"),
  address: text("address"),
  bloodType: varchar("blood_type"),
  allergies: text("allergies"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// DOCTOR TABLE
// ============================================================================

export const doctors = pgTable("doctors", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  specialization: varchar("specialization").notNull(),
  licenseNumber: varchar("license_number").unique().notNull(),
  qualifications: text("qualifications"),
  experience: integer("experience"), // years of experience
  consultationFee: decimal("consultation_fee", { precision: 10, scale: 2 }),
  availableDays: text("available_days"), // JSON string of available days
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// PHARMACIST TABLE
// ============================================================================

export const pharmacists = pgTable("pharmacists", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  licenseNumber: varchar("license_number").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// LAB TECHNICIAN TABLE
// ============================================================================

export const labTechnicians = pgTable("lab_technicians", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  specialization: varchar("specialization"),
  licenseNumber: varchar("license_number").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// DOCTOR AVAILABILITY TABLE
// ============================================================================

export const doctorAvailability = pgTable("doctor_availability", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  doctorId: varchar("doctor_id")
    .notNull()
    .references(() => doctors.id),
  locationName: varchar("location_name").notNull(), // Hospital/Clinic name
  locationAddress: text("location_address").notNull(),
  locationCity: varchar("location_city").notNull(),
  locationLatitude: decimal("location_latitude", { precision: 10, scale: 7 }), // For Google Maps
  locationLongitude: decimal("location_longitude", { precision: 10, scale: 7 }), // For Google Maps
  placeId: varchar("place_id"), // Google Maps Place ID for reference
  availableDate: timestamp("available_date").notNull(), // Specific date doctor is available
  startTime: varchar("start_time").notNull(), // '09:00'
  endTime: varchar("end_time").notNull(), // '17:00'
  maxPatients: integer("max_patients").notNull().default(20), // Daily appointment limit
  bookedCount: integer("booked_count").notNull().default(0), // Number of appointments booked
  hospitalType: varchar("hospital_type").notNull().default("government"), // 'government' | 'private'
  consultationFee: decimal("consultation_fee", {
    precision: 10,
    scale: 2,
  }).default("0.00"), // Fee for private hospitals only
  isActive: boolean("is_active").default(true).notNull(),
  status: varchar("status").notNull().default("active"), // 'active' | 'inactive' | 'finished' | 'deleted'
  reactivationRequested: boolean("reactivation_requested")
    .default(false)
    .notNull(),
  reactivationRequestedAt: timestamp("reactivation_requested_at"),
  deletedAt: timestamp("deleted_at"), // When doctor permanently deleted
  deletedBy: varchar("deleted_by"), // 'doctor' | 'admin' - who deleted it
  deactivatedBy: varchar("deactivated_by"), // 'admin' - who deactivated it
  deactivatedAt: timestamp("deactivated_at"), // When admin deactivated it
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// APPOINTMENT TABLE
// ============================================================================

export const appointments = pgTable("appointments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id")
    .notNull()
    .references(() => patients.id),
  doctorId: varchar("doctor_id")
    .notNull()
    .references(() => doctors.id),
  availabilityId: varchar("availability_id").references(
    () => doctorAvailability.id
  ), // Link to specific availability
  appointmentDate: timestamp("appointment_date").notNull(),
  appointmentTime: varchar("appointment_time"), // Approved time slot (e.g., "10:00 AM")
  status: varchar("status").notNull(), // 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'cancellation_requested'
  reason: text("reason"),
  notes: text("notes"),
  cancelledAt: timestamp("cancelled_at"), // Track when appointment was cancelled
  cancelledBy: varchar("cancelled_by"), // Who cancelled: 'patient', 'doctor', 'admin'
  cancellationReason: text("cancellation_reason"), // Reason for cancellation
  cancellationRequestedBy: varchar("cancellation_requested_by"), // User ID who requested cancellation
  cancellationRequestedAt: timestamp("cancellation_requested_at"), // When cancellation was requested
  cancellationRejectedReason: text("cancellation_rejected_reason"), // Admin's reason for rejecting cancellation
  approvedAt: timestamp("approved_at"), // When appointment was approved
  approvedBy: varchar("approved_by"), // User ID who approved (doctor/admin)
  completedAt: timestamp("completed_at"), // When appointment was marked as completed
  completedBy: varchar("completed_by"), // User ID who marked as completed (doctor/admin)
  actualVisitTime: varchar("actual_visit_time"), // Actual time patient was seen (HH:MM format)
  completionNotes: text("completion_notes"), // Doctor's notes from the visit
  prescriptionNeeded: boolean("prescription_needed").default(false), // Whether prescription is required
  labTestsNeeded: boolean("lab_tests_needed").default(false), // Whether lab tests are required
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// MEDICAL RECORD TABLE
// ============================================================================

export const medicalRecords = pgTable("medical_records", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id")
    .notNull()
    .references(() => patients.id),
  doctorId: varchar("doctor_id")
    .notNull()
    .references(() => doctors.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  diagnosis: text("diagnosis").notNull(),
  symptoms: text("symptoms"),
  notes: text("notes"),
  vitalSigns: text("vital_signs"), // JSON string: BP, temperature, pulse, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// MEDICAL DOCUMENTS TABLE (Lab Reports, Prescriptions, Medical Files)
// ============================================================================

export const medicalDocuments = pgTable("medical_documents", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id")
    .notNull()
    .references(() => patients.id),
  doctorId: varchar("doctor_id").references(() => doctors.id), // Null if uploaded by patient
  appointmentId: varchar("appointment_id").references(() => appointments.id), // Link to appointment if applicable
  medicalRecordId: varchar("medical_record_id").references(
    () => medicalRecords.id
  ), // Link to medical record if applicable
  documentType: varchar("document_type").notNull(), // 'lab_report' | 'prescription' | 'diagnosis' | 'consultation_note' | 'medical_image' | 'other'
  title: varchar("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(), // Storage path/URL to the file
  fileName: varchar("file_name").notNull(),
  fileType: varchar("file_type").notNull(), // 'pdf' | 'jpg' | 'png' | 'doc' | 'docx'
  fileSize: integer("file_size"), // in bytes
  uploadedBy: varchar("uploaded_by").notNull(), // User ID who uploaded
  uploadedByRole: varchar("uploaded_by_role").notNull(), // 'doctor' | 'patient' | 'admin'
  isPublic: boolean("is_public").default(false), // If true, patient can see it
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// MEDICAL ACCESS LOG TABLE (Audit Trail)
// ============================================================================

export const medicalAccessLogs = pgTable("medical_access_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id), // Who accessed
  userRole: varchar("user_role").notNull(), // Role of the user
  patientId: varchar("patient_id")
    .notNull()
    .references(() => patients.id), // Whose data was accessed
  accessType: varchar("access_type").notNull(), // 'view' | 'download' | 'upload' | 'modify' | 'delete'
  resourceType: varchar("resource_type").notNull(), // 'medical_record' | 'document' | 'prescription' | 'lab_report' | 'patient_info'
  resourceId: varchar("resource_id"), // ID of the accessed resource
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  accessedAt: timestamp("accessed_at").defaultNow(),
});

// ============================================================================
// PRESCRIPTION TABLE
// ============================================================================

export const prescriptions = pgTable("prescriptions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id")
    .notNull()
    .references(() => patients.id),
  doctorId: varchar("doctor_id")
    .notNull()
    .references(() => doctors.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id), // Link to appointment
  medicalRecordId: varchar("medical_record_id").references(
    () => medicalRecords.id
  ),
  dateIssued: timestamp("date_issued").defaultNow(),
  expiryDate: timestamp("expiry_date"),
  validityDays: integer("validity_days").default(90), // Number of days prescription is valid
  qrCode: text("qr_code"), // QR code data for verification
  status: varchar("status").notNull(), // 'active' | 'dispensed' | 'expired'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// MEDICINE TABLE (Inventory)
// ============================================================================

export const medicines = pgTable("medicines", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  genericName: varchar("generic_name"),
  manufacturer: varchar("manufacturer"),
  category: varchar("category"),
  description: text("description"),
  dosageForm: varchar("dosage_form"), // 'tablet' | 'capsule' | 'syrup' | 'injection'
  strength: varchar("strength"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  reorderLevel: integer("reorder_level").default(10),
  expiryDate: timestamp("expiry_date"),
  batchNumber: varchar("batch_number"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// PRESCRIPTION ITEM TABLE (Junction table for prescriptions and medicines)
// ============================================================================

export const prescriptionItems = pgTable("prescription_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  prescriptionId: varchar("prescription_id")
    .notNull()
    .references(() => prescriptions.id),
  medicineId: varchar("medicine_id").references(() => medicines.id), // Optional - can link to inventory
  medicineName: varchar("medicine_name").notNull(), // Direct medicine name for prescriptions
  dosage: varchar("dosage").notNull(),
  frequency: varchar("frequency").notNull(),
  duration: varchar("duration").notNull(),
  quantity: integer("quantity").notNull(),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// LAB TEST TABLE
// ============================================================================

export const labTests = pgTable("lab_tests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id")
    .notNull()
    .references(() => patients.id),
  doctorId: varchar("doctor_id")
    .notNull()
    .references(() => doctors.id),
  labTechnicianId: varchar("lab_technician_id").references(
    () => labTechnicians.id
  ),
  testType: varchar("test_type").notNull(),
  testName: varchar("test_name").notNull(),
  status: varchar("status").notNull(), // 'pending' | 'in_progress' | 'completed' | 'cancelled'
  requestDate: timestamp("request_date").defaultNow(),
  completionDate: timestamp("completion_date"),
  results: text("results"),
  resultFileUrl: varchar("result_file_url"),
  isAbnormal: boolean("is_abnormal").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// BILL TABLE
// ============================================================================

export const bills = pgTable("bills", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id")
    .notNull()
    .references(() => patients.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").notNull(), // 'pending' | 'paid' | 'cancelled'
  billDate: timestamp("bill_date").defaultNow(),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// BILL ITEM TABLE
// ============================================================================

export const billItems = pgTable("bill_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  billId: varchar("bill_id")
    .notNull()
    .references(() => bills.id),
  itemType: varchar("item_type").notNull(), // 'consultation' | 'medicine' | 'lab_test' | 'procedure'
  itemId: varchar("item_id"), // Reference to medicine, lab test, etc.
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// PAYMENT TABLE
// ============================================================================

export const payments = pgTable("payments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  billId: varchar("bill_id")
    .notNull()
    .references(() => bills.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method").notNull(), // 'cash' | 'card' | 'insurance' | 'online'
  transactionId: varchar("transaction_id"),
  paymentDate: timestamp("payment_date").defaultNow(),
  status: varchar("status").notNull(), // 'completed' | 'pending' | 'failed'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// NOTIFICATION TABLE
// ============================================================================

export const notifications = pgTable("notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  recipientId: varchar("recipient_id")
    .notNull()
    .references(() => users.id),
  type: varchar("type").notNull(), // 'appointment' | 'prescription' | 'lab_result' | 'low_stock' | 'system'
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  relatedEntityId: varchar("related_entity_id"), // ID of appointment, prescription, etc.
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// AUDIT LOG TABLE
// ============================================================================

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type"), // 'user' | 'patient' | 'appointment' | etc.
  entityId: varchar("entity_id"),
  details: text("details"),
  ipAddress: varchar("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// CHAT MESSAGE TABLE
// ============================================================================

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id")
    .notNull()
    .references(() => users.id),
  receiverId: varchar("receiver_id")
    .notNull()
    .references(() => users.id),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  patient: one(patients, { fields: [users.id], references: [patients.userId] }),
  doctor: one(doctors, { fields: [users.id], references: [doctors.userId] }),
  pharmacist: one(pharmacists, {
    fields: [users.id],
    references: [pharmacists.userId],
  }),
  labTechnician: one(labTechnicians, {
    fields: [users.id],
    references: [labTechnicians.userId],
  }),
  notifications: many(notifications),
  sentMessages: many(chatMessages, { relationName: "sentMessages" }),
  receivedMessages: many(chatMessages, { relationName: "receivedMessages" }),
  auditLogs: many(auditLogs),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, { fields: [patients.userId], references: [users.id] }),
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
  prescriptions: many(prescriptions),
  labTests: many(labTests),
  bills: many(bills),
  medicalDocuments: many(medicalDocuments),
  accessLogs: many(medicalAccessLogs),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, { fields: [doctors.userId], references: [users.id] }),
  appointments: many(appointments),
  medicalRecords: many(medicalRecords),
  prescriptions: many(prescriptions),
  labTests: many(labTests),
  medicalDocuments: many(medicalDocuments),
}));

export const appointmentsRelations = relations(
  appointments,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [appointments.patientId],
      references: [patients.id],
    }),
    doctor: one(doctors, {
      fields: [appointments.doctorId],
      references: [doctors.id],
    }),
    medicalRecords: many(medicalRecords),
    bills: many(bills),
  })
);

export const prescriptionsRelations = relations(
  prescriptions,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [prescriptions.patientId],
      references: [patients.id],
    }),
    doctor: one(doctors, {
      fields: [prescriptions.doctorId],
      references: [doctors.id],
    }),
    medicalRecord: one(medicalRecords, {
      fields: [prescriptions.medicalRecordId],
      references: [medicalRecords.id],
    }),
    items: many(prescriptionItems),
  })
);

export const prescriptionItemsRelations = relations(
  prescriptionItems,
  ({ one }) => ({
    prescription: one(prescriptions, {
      fields: [prescriptionItems.prescriptionId],
      references: [prescriptions.id],
    }),
    medicine: one(medicines, {
      fields: [prescriptionItems.medicineId],
      references: [medicines.id],
    }),
  })
);

export const labTestsRelations = relations(labTests, ({ one }) => ({
  patient: one(patients, {
    fields: [labTests.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [labTests.doctorId],
    references: [doctors.id],
  }),
  labTechnician: one(labTechnicians, {
    fields: [labTests.labTechnicianId],
    references: [labTechnicians.id],
  }),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  patient: one(patients, {
    fields: [bills.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [bills.appointmentId],
    references: [appointments.id],
  }),
  items: many(billItems),
  payments: many(payments),
}));

export const billItemsRelations = relations(billItems, ({ one }) => ({
  bill: one(bills, { fields: [billItems.billId], references: [bills.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  bill: one(bills, { fields: [payments.billId], references: [bills.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  receiver: one(users, {
    fields: [chatMessages.receiverId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
}));

export const medicalDocumentsRelations = relations(
  medicalDocuments,
  ({ one }) => ({
    patient: one(patients, {
      fields: [medicalDocuments.patientId],
      references: [patients.id],
    }),
    doctor: one(doctors, {
      fields: [medicalDocuments.doctorId],
      references: [doctors.id],
    }),
    appointment: one(appointments, {
      fields: [medicalDocuments.appointmentId],
      references: [appointments.id],
    }),
    medicalRecord: one(medicalRecords, {
      fields: [medicalDocuments.medicalRecordId],
      references: [medicalRecords.id],
    }),
    uploadedByUser: one(users, {
      fields: [medicalDocuments.uploadedBy],
      references: [users.id],
    }),
  })
);

export const medicalAccessLogsRelations = relations(
  medicalAccessLogs,
  ({ one }) => ({
    user: one(users, {
      fields: [medicalAccessLogs.userId],
      references: [users.id],
    }),
    patient: one(patients, {
      fields: [medicalAccessLogs.patientId],
      references: [patients.id],
    }),
  })
);

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

// User schemas
export const upsertUserSchema = createInsertSchema(users);
export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertDoctorSchema = createInsertSchema(doctors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPharmacistSchema = createInsertSchema(pharmacists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertLabTechnicianSchema = createInsertSchema(
  labTechnicians
).omit({ id: true, createdAt: true, updatedAt: true });

// Appointment schemas
export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Medical record schemas
export const insertMedicalRecordSchema = createInsertSchema(
  medicalRecords
).omit({ id: true, createdAt: true, updatedAt: true });

// Prescription schemas
export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPrescriptionItemSchema = createInsertSchema(
  prescriptionItems
).omit({ id: true, createdAt: true });

// Medicine schemas
export const insertMedicineSchema = createInsertSchema(medicines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Lab test schemas
export const insertLabTestSchema = createInsertSchema(labTests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Bill schemas
export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertBillItemSchema = createInsertSchema(billItems).omit({
  id: true,
  createdAt: true,
});

// Payment schemas
export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Notification schemas
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Chat message schemas
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

// Medical documents schemas
export const insertMedicalDocumentSchema = createInsertSchema(
  medicalDocuments
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Medical access log schemas
export const insertMedicalAccessLogSchema = createInsertSchema(
  medicalAccessLogs
).omit({
  id: true,
  accessedAt: true,
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctors.$inferSelect;

export type InsertPharmacist = z.infer<typeof insertPharmacistSchema>;
export type Pharmacist = typeof pharmacists.$inferSelect;

export type InsertLabTechnician = z.infer<typeof insertLabTechnicianSchema>;
export type LabTechnician = typeof labTechnicians.$inferSelect;

export type InsertDoctorAvailability = typeof doctorAvailability.$inferInsert;
export type DoctorAvailability = typeof doctorAvailability.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;
export type MedicalRecord = typeof medicalRecords.$inferSelect;

export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptions.$inferSelect;

export type InsertPrescriptionItem = z.infer<
  typeof insertPrescriptionItemSchema
>;
export type PrescriptionItem = typeof prescriptionItems.$inferSelect;

export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Medicine = typeof medicines.$inferSelect;

export type InsertLabTest = z.infer<typeof insertLabTestSchema>;
export type LabTest = typeof labTests.$inferSelect;

export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;

export type InsertBillItem = z.infer<typeof insertBillItemSchema>;
export type BillItem = typeof billItems.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertMedicalDocument = z.infer<typeof insertMedicalDocumentSchema>;
export type MedicalDocument = typeof medicalDocuments.$inferSelect;

export type InsertMedicalAccessLog = z.infer<
  typeof insertMedicalAccessLogSchema
>;
export type MedicalAccessLog = typeof medicalAccessLogs.$inferSelect;

export type AuditLog = typeof auditLogs.$inferSelect;
