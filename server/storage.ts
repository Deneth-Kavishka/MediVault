// MediVault Storage Implementation - Database operations
import {
  users,
  patients,
  doctors,
  pharmacists,
  labTechnicians,
  doctorAvailability,
  appointments,
  medicalRecords,
  prescriptions,
  prescriptionItems,
  medicines,
  labTests,
  bills,
  billItems,
  payments,
  notifications,
  chatMessages,
  auditLogs,
  type User,
  type UpsertUser,
  type Patient,
  type InsertPatient,
  type Doctor,
  type InsertDoctor,
  type Pharmacist,
  type InsertPharmacist,
  type LabTechnician,
  type InsertLabTechnician,
  type DoctorAvailability,
  type InsertDoctorAvailability,
  type Appointment,
  type InsertAppointment,
  type MedicalRecord,
  type InsertMedicalRecord,
  type Prescription,
  type InsertPrescription,
  type PrescriptionItem,
  type InsertPrescriptionItem,
  type Medicine,
  type InsertMedicine,
  type LabTest,
  type InsertLabTest,
  type Bill,
  type InsertBill,
  type BillItem,
  type InsertBillItem,
  type Payment,
  type InsertPayment,
  type Notification,
  type InsertNotification,
  type ChatMessage,
  type InsertChatMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, inArray, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getDeactivatedUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  deactivateUser(id: string): Promise<User | undefined>;
  reactivateUser(id: string): Promise<User | undefined>;
  deleteUserPermanently(id: string): Promise<void>;

  // Patient operations
  createPatient(patient: InsertPatient): Promise<Patient>;
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByUserId(userId: string): Promise<Patient | undefined>;
  getPatientByNIC(nic: string): Promise<Patient | undefined>;
  getAllPatients(): Promise<Patient[]>;
  updatePatient(
    id: string,
    data: Partial<InsertPatient>
  ): Promise<Patient | undefined>;

  // Doctor operations
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  getDoctor(id: string): Promise<Doctor | undefined>;
  getDoctorByUserId(userId: string): Promise<Doctor | undefined>;
  getAllDoctors(): Promise<Doctor[]>;
  updateDoctor(
    id: string,
    data: Partial<InsertDoctor>
  ): Promise<Doctor | undefined>;

  // Pharmacist operations
  createPharmacist(pharmacist: InsertPharmacist): Promise<Pharmacist>;
  getPharmacist(id: string): Promise<Pharmacist | undefined>;
  getPharmacistByUserId(userId: string): Promise<Pharmacist | undefined>;
  updatePharmacist(
    id: string,
    data: Partial<InsertPharmacist>
  ): Promise<Pharmacist | undefined>;

  // Lab Technician operations
  createLabTechnician(labTech: InsertLabTechnician): Promise<LabTechnician>;
  getLabTechnician(id: string): Promise<LabTechnician | undefined>;
  getLabTechnicianByUserId(userId: string): Promise<LabTechnician | undefined>;
  updateLabTechnician(
    id: string,
    data: Partial<InsertLabTechnician>
  ): Promise<LabTechnician | undefined>;

  // Doctor Availability operations
  createDoctorAvailability(
    availability: InsertDoctorAvailability
  ): Promise<DoctorAvailability>;
  getDoctorAvailability(id: string): Promise<DoctorAvailability | undefined>;
  getAllDoctorAvailability(): Promise<DoctorAvailability[]>;
  getDoctorAvailabilityByDoctor(
    doctorId: string
  ): Promise<DoctorAvailability[]>;
  getDoctorAvailabilityByLocation(city: string): Promise<DoctorAvailability[]>;
  updateDoctorAvailability(
    id: string,
    data: Partial<InsertDoctorAvailability>
  ): Promise<DoctorAvailability | undefined>;
  deleteDoctorAvailability(id: string): Promise<void>;

  // Appointment operations
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByPatient(patientId: string): Promise<Appointment[]>;
  getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]>;
  updateAppointmentStatus(
    id: string,
    status: string
  ): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;
  deleteCancelledAppointmentsOlderThan24Hours(): Promise<number>;

  // Medical Record operations
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  getMedicalRecord(id: string): Promise<MedicalRecord | undefined>;
  getMedicalRecordsByPatient(patientId: string): Promise<MedicalRecord[]>;

  // Prescription operations
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  getPrescription(id: string): Promise<Prescription | undefined>;
  getPrescriptionsByPatient(patientId: string): Promise<Prescription[]>;
  createPrescriptionItem(
    item: InsertPrescriptionItem
  ): Promise<PrescriptionItem>;

  // Medicine operations
  createMedicine(medicine: InsertMedicine): Promise<Medicine>;
  getMedicine(id: string): Promise<Medicine | undefined>;
  getAllMedicines(): Promise<Medicine[]>;
  updateMedicineStock(
    id: string,
    quantity: number
  ): Promise<Medicine | undefined>;

  // Lab Test operations
  createLabTest(labTest: InsertLabTest): Promise<LabTest>;
  getLabTest(id: string): Promise<LabTest | undefined>;
  getLabTestsByPatient(patientId: string): Promise<LabTest[]>;
  updateLabTestStatus(
    id: string,
    status: string,
    results?: string
  ): Promise<LabTest | undefined>;

  // Bill operations
  createBill(bill: InsertBill): Promise<Bill>;
  getBill(id: string): Promise<Bill | undefined>;
  getBillsByPatient(patientId: string): Promise<Bill[]>;
  createBillItem(item: InsertBillItem): Promise<BillItem>;

  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  // Chat Message operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(userId1: string, userId2: string): Promise<ChatMessage[]>;
  getConversations(userId: string): Promise<any[]>;
  markMessagesAsRead(userId: string, otherUserId: string): Promise<void>;

  // Admin operations
  getSystemStats(): Promise<{
    totalUsers: number;
    activePatients: number;
    totalAppointments: number;
    pendingAppointments: number;
    completedAppointments: number;
    totalDoctors: number;
    totalPharmacists: number;
    totalLabTechs: number;
    recentUsers: User[];
  }>;
  getUsersByRole(role: string): Promise<User[]>;
  getAuditLogs(limit?: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(desc(users.createdAt));
  }

  async getDeactivatedUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.isActive, false))
      .orderBy(desc(users.deactivatedAt));
  }

  async updateUser(
    id: string,
    data: Partial<UpsertUser>
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deactivateUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        isActive: false,
        deactivatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async reactivateUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        isActive: true,
        deactivatedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Keep the hard delete method for future use if needed (admin only)
  async deleteUserPermanently(id: string): Promise<void> {
    // Get patient and doctor records BEFORE deleting them (for cascade deletion)
    const patientRecords = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, id));
    const doctorRecords = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, id));

    // Delete data for patients - following proper foreign key order
    if (patientRecords.length > 0) {
      const patientId = patientRecords[0].id;

      // Get all bills for this patient to delete their dependencies
      const patientBills = await db
        .select()
        .from(bills)
        .where(eq(bills.patientId, patientId));

      // Delete payments and bill items for each bill
      for (const bill of patientBills) {
        // Delete payments for this bill
        await db.delete(payments).where(eq(payments.billId, bill.id));

        // Delete bill items for this bill
        await db.delete(billItems).where(eq(billItems.billId, bill.id));
      }

      // Delete bills for this patient (now safe after payments and bill items deleted)
      await db.delete(bills).where(eq(bills.patientId, patientId));

      // Get all prescriptions for this patient to delete their items
      const patientPrescriptions = await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.patientId, patientId));

      // Delete prescription items for each prescription
      for (const prescription of patientPrescriptions) {
        await db
          .delete(prescriptionItems)
          .where(eq(prescriptionItems.prescriptionId, prescription.id));
      }

      // Delete prescriptions for this patient
      await db
        .delete(prescriptions)
        .where(eq(prescriptions.patientId, patientId));

      // Delete medical records for this patient (now safe after prescriptions deleted)
      await db
        .delete(medicalRecords)
        .where(eq(medicalRecords.patientId, patientId));

      // Delete lab tests for this patient
      await db.delete(labTests).where(eq(labTests.patientId, patientId));

      // Delete appointments for this patient (now safe after bills deleted)
      await db
        .delete(appointments)
        .where(eq(appointments.patientId, patientId));
    }

    // Delete data for doctors - following proper foreign key order
    if (doctorRecords.length > 0) {
      const doctorId = doctorRecords[0].id;

      // Get all appointments with this doctor to delete their bills
      const doctorAppointments = await db
        .select()
        .from(appointments)
        .where(eq(appointments.doctorId, doctorId));

      // Delete bills, payments, and bill items for each appointment
      for (const appointment of doctorAppointments) {
        const appointmentBills = await db
          .select()
          .from(bills)
          .where(eq(bills.appointmentId, appointment.id));

        for (const bill of appointmentBills) {
          // Delete payments for this bill
          await db.delete(payments).where(eq(payments.billId, bill.id));

          // Delete bill items for this bill
          await db.delete(billItems).where(eq(billItems.billId, bill.id));

          // Delete the bill
          await db.delete(bills).where(eq(bills.id, bill.id));
        }
      }

      // Get all prescriptions by this doctor to delete their items
      const doctorPrescriptions = await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.doctorId, doctorId));

      // Delete prescription items for each prescription
      for (const prescription of doctorPrescriptions) {
        await db
          .delete(prescriptionItems)
          .where(eq(prescriptionItems.prescriptionId, prescription.id));
      }

      // Delete prescriptions created by this doctor
      await db
        .delete(prescriptions)
        .where(eq(prescriptions.doctorId, doctorId));

      // Delete medical records created by this doctor (now safe after prescriptions deleted)
      await db
        .delete(medicalRecords)
        .where(eq(medicalRecords.doctorId, doctorId));

      // Delete appointments with this doctor (now safe after bills deleted)
      await db.delete(appointments).where(eq(appointments.doctorId, doctorId));
    }

    // Delete related records
    await db.delete(patients).where(eq(patients.userId, id));
    await db.delete(doctors).where(eq(doctors.userId, id));
    await db.delete(pharmacists).where(eq(pharmacists.userId, id));
    await db.delete(labTechnicians).where(eq(labTechnicians.userId, id));

    // Delete audit logs for this user
    await db.delete(auditLogs).where(eq(auditLogs.userId, id));

    // Delete notifications for this user
    await db.delete(notifications).where(eq(notifications.userId, id));

    // Delete chat messages sent by this user
    await db.delete(chatMessages).where(eq(chatMessages.senderId, id));

    // Delete chat messages received by this user (separate query to avoid SQL syntax error)
    await db.delete(chatMessages).where(eq(chatMessages.receiverId, id));

    // Finally, delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  // ============================================================================
  // PATIENT OPERATIONS
  // ============================================================================

  async createPatient(patientData: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values(patientData).returning();
    return patient;
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id));
    return patient;
  }

  async getPatientByUserId(userId: string): Promise<Patient | undefined> {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId));
    return patient;
  }

  async getPatientByNIC(nic: string): Promise<Patient | undefined> {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.nic, nic));
    return patient;
  }

  async getAllPatients(): Promise<Patient[]> {
    const allPatients = await db
      .select()
      .from(patients)
      .orderBy(desc(patients.createdAt));

    const results = await Promise.all(
      allPatients.map(async (patient) => {
        const [user] = await db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            username: users.username,
          })
          .from(users)
          .where(eq(users.id, patient.userId));

        return {
          ...patient,
          user: user || undefined,
        };
      })
    );

    return results as any;
  }

  async updatePatient(
    id: string,
    data: Partial<InsertPatient>
  ): Promise<Patient | undefined> {
    // Convert dateOfBirth string to Date if present
    const updateData: any = { ...data, updatedAt: new Date() };
    if (updateData.dateOfBirth && typeof updateData.dateOfBirth === "string") {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    const [patient] = await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, id))
      .returning();
    return patient;
  }

  // ============================================================================
  // DOCTOR OPERATIONS
  // ============================================================================

  async createDoctor(doctorData: InsertDoctor): Promise<Doctor> {
    const [doctor] = await db.insert(doctors).values(doctorData).returning();
    return doctor;
  }

  async getDoctor(id: string): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, id));
    return doctor;
  }

  async getDoctorByUserId(userId: string): Promise<Doctor | undefined> {
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, userId));
    return doctor;
  }

  async getAllDoctors(): Promise<Doctor[]> {
    const allDoctors = await db
      .select()
      .from(doctors)
      .orderBy(desc(doctors.createdAt));

    const results = await Promise.all(
      allDoctors.map(async (doctor) => {
        const [user] = await db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            username: users.username,
          })
          .from(users)
          .where(eq(users.id, doctor.userId));

        return {
          ...doctor,
          user: user || undefined,
        };
      })
    );

    return results as any;
  }

  async updateDoctor(
    id: string,
    data: Partial<InsertDoctor>
  ): Promise<Doctor | undefined> {
    const [doctor] = await db
      .update(doctors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(doctors.id, id))
      .returning();
    return doctor;
  }

  // ============================================================================
  // PHARMACIST OPERATIONS
  // ============================================================================

  async createPharmacist(
    pharmacistData: InsertPharmacist
  ): Promise<Pharmacist> {
    const [pharmacist] = await db
      .insert(pharmacists)
      .values(pharmacistData)
      .returning();
    return pharmacist;
  }

  async getPharmacist(id: string): Promise<Pharmacist | undefined> {
    const [pharmacist] = await db
      .select()
      .from(pharmacists)
      .where(eq(pharmacists.id, id));
    return pharmacist;
  }

  async getPharmacistByUserId(userId: string): Promise<Pharmacist | undefined> {
    const [pharmacist] = await db
      .select()
      .from(pharmacists)
      .where(eq(pharmacists.userId, userId));
    return pharmacist;
  }

  async updatePharmacist(
    id: string,
    data: Partial<InsertPharmacist>
  ): Promise<Pharmacist | undefined> {
    const [pharmacist] = await db
      .update(pharmacists)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pharmacists.id, id))
      .returning();
    return pharmacist;
  }

  // ============================================================================
  // LAB TECHNICIAN OPERATIONS
  // ============================================================================

  async createLabTechnician(
    labTechData: InsertLabTechnician
  ): Promise<LabTechnician> {
    const [labTech] = await db
      .insert(labTechnicians)
      .values(labTechData)
      .returning();
    return labTech;
  }

  async getLabTechnician(id: string): Promise<LabTechnician | undefined> {
    const [labTech] = await db
      .select()
      .from(labTechnicians)
      .where(eq(labTechnicians.id, id));
    return labTech;
  }

  async getLabTechnicianByUserId(
    userId: string
  ): Promise<LabTechnician | undefined> {
    const [labTech] = await db
      .select()
      .from(labTechnicians)
      .where(eq(labTechnicians.userId, userId));
    return labTech;
  }

  async updateLabTechnician(
    id: string,
    data: Partial<InsertLabTechnician>
  ): Promise<LabTechnician | undefined> {
    const [labTech] = await db
      .update(labTechnicians)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(labTechnicians.id, id))
      .returning();
    return labTech;
  }

  // ============================================================================
  // DOCTOR AVAILABILITY OPERATIONS
  // ============================================================================

  async createDoctorAvailability(
    availabilityData: InsertDoctorAvailability
  ): Promise<DoctorAvailability> {
    const [availability] = await db
      .insert(doctorAvailability)
      .values(availabilityData)
      .returning();
    return availability;
  }

  async getDoctorAvailability(
    id: string
  ): Promise<DoctorAvailability | undefined> {
    const [availability] = await db
      .select()
      .from(doctorAvailability)
      .where(eq(doctorAvailability.id, id));
    return availability;
  }

  async getAllDoctorAvailability(): Promise<DoctorAvailability[]> {
    return await db
      .select()
      .from(doctorAvailability)
      .orderBy(desc(doctorAvailability.createdAt));
  }

  async getDoctorAvailabilityByDoctor(
    doctorId: string
  ): Promise<DoctorAvailability[]> {
    return await db
      .select()
      .from(doctorAvailability)
      .where(
        and(
          eq(doctorAvailability.doctorId, doctorId),
          eq(doctorAvailability.isActive, true)
        )
      )
      .orderBy(doctorAvailability.availableDate);
  }

  async getDoctorAvailabilityByLocation(
    city: string
  ): Promise<DoctorAvailability[]> {
    return await db
      .select()
      .from(doctorAvailability)
      .where(
        and(
          eq(doctorAvailability.locationCity, city),
          eq(doctorAvailability.isActive, true)
        )
      )
      .orderBy(desc(doctorAvailability.createdAt));
  }

  async updateDoctorAvailability(
    id: string,
    data: Partial<InsertDoctorAvailability>
  ): Promise<DoctorAvailability | undefined> {
    const [availability] = await db
      .update(doctorAvailability)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(doctorAvailability.id, id))
      .returning();
    return availability;
  }

  async deleteDoctorAvailability(id: string): Promise<void> {
    await db.delete(doctorAvailability).where(eq(doctorAvailability.id, id));
  }

  // ============================================================================
  // APPOINTMENT OPERATIONS
  // ============================================================================

  async createAppointment(
    appointmentData: InsertAppointment
  ): Promise<Appointment> {
    const [appointment] = await db
      .insert(appointments)
      .values(appointmentData)
      .returning();

    // Increment booked count if availabilityId is provided
    if (appointmentData.availabilityId) {
      await db
        .update(doctorAvailability)
        .set({
          bookedCount: sql`${doctorAvailability.bookedCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(doctorAvailability.id, appointmentData.availabilityId));
    }

    return appointment;
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    return appointment;
  }

  async getAllAppointments(): Promise<any[]> {
    // Create table aliases for users table (needed twice - for patient and doctor)
    const patientUser = alias(users, "patient_user");
    const doctorUser = alias(users, "doctor_user");

    const results = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        availabilityId: appointments.availabilityId,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        reason: appointments.reason,
        notes: appointments.notes,
        cancelledAt: appointments.cancelledAt,
        cancellationReason: appointments.cancellationReason,
        cancellationRequestedBy: appointments.cancellationRequestedBy,
        cancellationRequestedAt: appointments.cancellationRequestedAt,
        cancellationRejectedReason: appointments.cancellationRejectedReason,
        approvedAt: appointments.approvedAt,
        approvedBy: appointments.approvedBy,
        completedAt: appointments.completedAt,
        completedBy: appointments.completedBy,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        patientFirstName: patientUser.firstName,
        patientLastName: patientUser.lastName,
        patientRfid: patients.rfid,
        doctorFirstName: doctorUser.firstName,
        doctorLastName: doctorUser.lastName,
        doctorSpecialization: doctors.specialization,
        doctorLicenseNumber: doctors.licenseNumber,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(patientUser, eq(patients.userId, patientUser.id))
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .leftJoin(doctorUser, eq(doctors.userId, doctorUser.id))
      .orderBy(desc(appointments.appointmentDate));

    return results.map((row: any) => ({
      id: row.id,
      patientId: row.patientId,
      doctorId: row.doctorId,
      availabilityId: row.availabilityId,
      appointmentDate: row.appointmentDate,
      appointmentTime: row.appointmentTime,
      status: row.status,
      reason: row.reason,
      notes: row.notes,
      cancelledAt: row.cancelledAt,
      cancellationReason: row.cancellationReason,
      cancellationRequestedBy: row.cancellationRequestedBy,
      cancellationRequestedAt: row.cancellationRequestedAt,
      cancellationRejectedReason: row.cancellationRejectedReason,
      approvedAt: row.approvedAt,
      approvedBy: row.approvedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: {
        rfid: row.patientRfid || "",
        user: {
          firstName: row.patientFirstName || "",
          lastName: row.patientLastName || "",
        },
      },
      doctor: {
        licenseNumber: row.doctorLicenseNumber || "",
        specialization: row.doctorSpecialization || "General",
        user: {
          firstName: row.doctorFirstName || "",
          lastName: row.doctorLastName || "",
        },
      },
      // Also include flat fields for backward compatibility
      patientName:
        row.patientFirstName && row.patientLastName
          ? `${row.patientFirstName} ${row.patientLastName}`
          : "Unknown Patient",
      doctorName:
        row.doctorFirstName && row.doctorLastName
          ? `Dr. ${row.doctorFirstName} ${row.doctorLastName}`
          : "Unknown Doctor",
      specialization: row.doctorSpecialization || "General",
      specialty: row.doctorSpecialization || "General",
    }));
  }

  async getAppointmentsByPatient(patientId: string): Promise<any[]> {
    const patientUser = alias(users, "patient_user");
    const doctorUser = alias(users, "doctor_user");

    const results = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        availabilityId: appointments.availabilityId,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        reason: appointments.reason,
        notes: appointments.notes,
        cancelledAt: appointments.cancelledAt,
        cancellationReason: appointments.cancellationReason,
        cancellationRequestedBy: appointments.cancellationRequestedBy,
        cancellationRequestedAt: appointments.cancellationRequestedAt,
        cancellationRejectedReason: appointments.cancellationRejectedReason,
        approvedAt: appointments.approvedAt,
        approvedBy: appointments.approvedBy,
        completedAt: appointments.completedAt,
        completedBy: appointments.completedBy,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        patientFirstName: patientUser.firstName,
        patientLastName: patientUser.lastName,
        patientRfid: patients.rfid,
        doctorFirstName: doctorUser.firstName,
        doctorLastName: doctorUser.lastName,
        doctorSpecialization: doctors.specialization,
        doctorLicenseNumber: doctors.licenseNumber,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(patientUser, eq(patients.userId, patientUser.id))
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .leftJoin(doctorUser, eq(doctors.userId, doctorUser.id))
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.appointmentDate));

    return results.map((row: any) => ({
      id: row.id,
      patientId: row.patientId,
      doctorId: row.doctorId,
      availabilityId: row.availabilityId,
      appointmentDate: row.appointmentDate,
      appointmentTime: row.appointmentTime,
      status: row.status,
      reason: row.reason,
      notes: row.notes,
      cancelledAt: row.cancelledAt,
      cancellationReason: row.cancellationReason,
      cancellationRequestedBy: row.cancellationRequestedBy,
      cancellationRequestedAt: row.cancellationRequestedAt,
      cancellationRejectedReason: row.cancellationRejectedReason,
      approvedAt: row.approvedAt,
      approvedBy: row.approvedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: {
        rfid: row.patientRfid || "",
        user: {
          firstName: row.patientFirstName || "",
          lastName: row.patientLastName || "",
        },
      },
      doctor: {
        licenseNumber: row.doctorLicenseNumber || "",
        specialization: row.doctorSpecialization || "General",
        user: {
          firstName: row.doctorFirstName || "",
          lastName: row.doctorLastName || "",
        },
      },
      // Also include flat fields for backward compatibility
      patientName:
        row.patientFirstName && row.patientLastName
          ? `${row.patientFirstName} ${row.patientLastName}`
          : "Unknown Patient",
      doctorName:
        row.doctorFirstName && row.doctorLastName
          ? `Dr. ${row.doctorFirstName} ${row.doctorLastName}`
          : "Unknown Doctor",
      specialization: row.doctorSpecialization || "General",
      specialty: row.doctorSpecialization || "General",
    }));
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<any[]> {
    const patientUser = alias(users, "patient_user");
    const doctorUser = alias(users, "doctor_user");

    const results = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        availabilityId: appointments.availabilityId,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        reason: appointments.reason,
        notes: appointments.notes,
        cancelledAt: appointments.cancelledAt,
        cancellationReason: appointments.cancellationReason,
        cancellationRequestedBy: appointments.cancellationRequestedBy,
        cancellationRequestedAt: appointments.cancellationRequestedAt,
        cancellationRejectedReason: appointments.cancellationRejectedReason,
        approvedAt: appointments.approvedAt,
        approvedBy: appointments.approvedBy,
        completedAt: appointments.completedAt,
        completedBy: appointments.completedBy,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        patientFirstName: patientUser.firstName,
        patientLastName: patientUser.lastName,
        patientRfid: patients.rfid,
        doctorFirstName: doctorUser.firstName,
        doctorLastName: doctorUser.lastName,
        doctorSpecialization: doctors.specialization,
        doctorLicenseNumber: doctors.licenseNumber,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(patientUser, eq(patients.userId, patientUser.id))
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .leftJoin(doctorUser, eq(doctors.userId, doctorUser.id))
      .where(eq(appointments.doctorId, doctorId))
      .orderBy(desc(appointments.appointmentDate));

    return results.map((row: any) => ({
      id: row.id,
      patientId: row.patientId,
      doctorId: row.doctorId,
      availabilityId: row.availabilityId,
      appointmentDate: row.appointmentDate,
      appointmentTime: row.appointmentTime,
      status: row.status,
      reason: row.reason,
      notes: row.notes,
      cancelledAt: row.cancelledAt,
      cancellationReason: row.cancellationReason,
      cancellationRequestedBy: row.cancellationRequestedBy,
      cancellationRequestedAt: row.cancellationRequestedAt,
      cancellationRejectedReason: row.cancellationRejectedReason,
      approvedAt: row.approvedAt,
      approvedBy: row.approvedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: {
        rfid: row.patientRfid || "",
        user: {
          firstName: row.patientFirstName || "",
          lastName: row.patientLastName || "",
        },
      },
      doctor: {
        licenseNumber: row.doctorLicenseNumber || "",
        specialization: row.doctorSpecialization || "General",
        user: {
          firstName: row.doctorFirstName || "",
          lastName: row.doctorLastName || "",
        },
      },
      // Also include flat fields for backward compatibility
      patientName:
        row.patientFirstName && row.patientLastName
          ? `${row.patientFirstName} ${row.patientLastName}`
          : "Unknown Patient",
      doctorName:
        row.doctorFirstName && row.doctorLastName
          ? `Dr. ${row.doctorFirstName} ${row.doctorLastName}`
          : "Unknown Doctor",
      specialization: row.doctorSpecialization || "General",
      specialty: row.doctorSpecialization || "General",
    }));
  }

  async updateAppointmentStatus(
    id: string,
    status: string
  ): Promise<Appointment | undefined> {
    // Get the current appointment to check previous status
    const [currentAppointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));

    const updateData: any = { status, updatedAt: new Date() };

    // Set cancelledAt timestamp when cancelling
    if (status === "cancelled") {
      updateData.cancelledAt = new Date();
    } else if (
      currentAppointment?.status === "cancelled" &&
      status !== "cancelled"
    ) {
      // Clear cancelledAt when un-cancelling
      updateData.cancelledAt = null;
    }

    const [appointment] = await db
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.id, id))
      .returning();

    // Decrement booked count when appointment is cancelled
    if (currentAppointment && appointment.availabilityId) {
      const wasActive = currentAppointment.status !== "cancelled";
      const nowCancelled = status === "cancelled";

      if (wasActive && nowCancelled) {
        // Decrement count when cancelling
        await db
          .update(doctorAvailability)
          .set({
            bookedCount: sql`GREATEST(0, ${doctorAvailability.bookedCount} - 1)`,
            updatedAt: new Date(),
          })
          .where(eq(doctorAvailability.id, appointment.availabilityId));
      } else if (!wasActive && !nowCancelled) {
        // Increment count when un-cancelling
        await db
          .update(doctorAvailability)
          .set({
            bookedCount: sql`${doctorAvailability.bookedCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(doctorAvailability.id, appointment.availabilityId));
      }
    }

    return appointment;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const [deleted] = await db
      .delete(appointments)
      .where(eq(appointments.id, id))
      .returning();
    return !!deleted;
  }

  async deleteCancelledAppointmentsOlderThan24Hours(): Promise<number> {
    // Calculate timestamp for 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Delete cancelled appointments older than 24 hours
    const deleted = await db
      .delete(appointments)
      .where(
        and(
          eq(appointments.status, "cancelled"),
          lt(appointments.cancelledAt, twentyFourHoursAgo)
        )
      )
      .returning();

    return deleted.length;
  }

  // ============================================================================
  // MEDICAL RECORD OPERATIONS
  // ============================================================================

  async createMedicalRecord(
    recordData: InsertMedicalRecord
  ): Promise<MedicalRecord> {
    const [record] = await db
      .insert(medicalRecords)
      .values(recordData)
      .returning();
    return record;
  }

  async getMedicalRecord(id: string): Promise<MedicalRecord | undefined> {
    const [record] = await db
      .select()
      .from(medicalRecords)
      .where(eq(medicalRecords.id, id));
    return record;
  }

  async getMedicalRecordsByPatient(
    patientId: string
  ): Promise<MedicalRecord[]> {
    return await db
      .select()
      .from(medicalRecords)
      .where(eq(medicalRecords.patientId, patientId))
      .orderBy(desc(medicalRecords.createdAt));
  }

  // ============================================================================
  // PRESCRIPTION OPERATIONS
  // ============================================================================

  async createPrescription(
    prescriptionData: InsertPrescription
  ): Promise<Prescription> {
    const [prescription] = await db
      .insert(prescriptions)
      .values(prescriptionData)
      .returning();
    return prescription;
  }

  async getPrescription(id: string): Promise<Prescription | undefined> {
    const [prescription] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, id));
    return prescription;
  }

  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    return await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.dateIssued));
  }

  async createPrescriptionItem(
    itemData: InsertPrescriptionItem
  ): Promise<PrescriptionItem> {
    const [item] = await db
      .insert(prescriptionItems)
      .values(itemData)
      .returning();
    return item;
  }

  // ============================================================================
  // MEDICINE OPERATIONS
  // ============================================================================

  async createMedicine(medicineData: InsertMedicine): Promise<Medicine> {
    const [medicine] = await db
      .insert(medicines)
      .values(medicineData)
      .returning();
    return medicine;
  }

  async getMedicine(id: string): Promise<Medicine | undefined> {
    const [medicine] = await db
      .select()
      .from(medicines)
      .where(eq(medicines.id, id));
    return medicine;
  }

  async getAllMedicines(): Promise<Medicine[]> {
    return await db.select().from(medicines).orderBy(desc(medicines.createdAt));
  }

  async updateMedicineStock(
    id: string,
    quantity: number
  ): Promise<Medicine | undefined> {
    const [medicine] = await db
      .update(medicines)
      .set({ stockQuantity: quantity, updatedAt: new Date() })
      .where(eq(medicines.id, id))
      .returning();
    return medicine;
  }

  // ============================================================================
  // LAB TEST OPERATIONS
  // ============================================================================

  async createLabTest(labTestData: InsertLabTest): Promise<LabTest> {
    const [labTest] = await db.insert(labTests).values(labTestData).returning();
    return labTest;
  }

  async getLabTest(id: string): Promise<LabTest | undefined> {
    const [labTest] = await db
      .select()
      .from(labTests)
      .where(eq(labTests.id, id));
    return labTest;
  }

  async getLabTestsByPatient(patientId: string): Promise<LabTest[]> {
    return await db
      .select()
      .from(labTests)
      .where(eq(labTests.patientId, patientId))
      .orderBy(desc(labTests.requestDate));
  }

  async updateLabTestStatus(
    id: string,
    status: string,
    results?: string
  ): Promise<LabTest | undefined> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (results) {
      updateData.results = results;
      if (status === "completed") {
        updateData.completionDate = new Date();
      }
    }

    const [labTest] = await db
      .update(labTests)
      .set(updateData)
      .where(eq(labTests.id, id))
      .returning();
    return labTest;
  }

  // ============================================================================
  // BILL OPERATIONS
  // ============================================================================

  async createBill(billData: InsertBill): Promise<Bill> {
    const [bill] = await db.insert(bills).values(billData).returning();
    return bill;
  }

  async getBill(id: string): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill;
  }

  async getBillsByPatient(patientId: string): Promise<Bill[]> {
    return await db
      .select()
      .from(bills)
      .where(eq(bills.patientId, patientId))
      .orderBy(desc(bills.billDate));
  }

  async createBillItem(itemData: InsertBillItem): Promise<BillItem> {
    const [item] = await db.insert(billItems).values(itemData).returning();
    return item;
  }

  // ============================================================================
  // PAYMENT OPERATIONS
  // ============================================================================

  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(paymentData).returning();
    return payment;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, id));
    return payment;
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.paymentDate));
  }

  // ============================================================================
  // NOTIFICATION OPERATIONS
  // ============================================================================

  async createNotification(
    notificationData: InsertNotification
  ): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.recipientId, userId));
  }

  // ============================================================================
  // CHAT MESSAGE OPERATIONS
  // ============================================================================

  async createChatMessage(
    messageData: InsertChatMessage
  ): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(messageData)
      .returning();
    return message;
  }

  async getChatMessages(
    userId1: string,
    userId2: string
  ): Promise<ChatMessage[]> {
    // Fetch messages in BOTH directions
    return await db
      .select()
      .from(chatMessages)
      .where(
        or(
          and(
            eq(chatMessages.senderId, userId1),
            eq(chatMessages.receiverId, userId2)
          ),
          and(
            eq(chatMessages.senderId, userId2),
            eq(chatMessages.receiverId, userId1)
          )
        )
      )
      .orderBy(chatMessages.createdAt);
  }

  async getConversations(userId: string): Promise<any[]> {
    try {
      // Get all messages involving the current user with user details
      const allMessages = await db
        .select({
          id: chatMessages.id,
          senderId: chatMessages.senderId,
          receiverId: chatMessages.receiverId,
          message: chatMessages.message,
          isRead: chatMessages.isRead,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(
          or(
            eq(chatMessages.senderId, userId),
            eq(chatMessages.receiverId, userId)
          )
        )
        .orderBy(desc(chatMessages.createdAt));

      // Get all unique user IDs involved in conversations
      const userIds = new Set<string>();
      allMessages.forEach((msg) => {
        if (msg.senderId !== userId) userIds.add(msg.senderId);
        if (msg.receiverId !== userId) userIds.add(msg.receiverId);
      });

      // If there are no conversation partners, return empty list early
      if (userIds.size === 0) return [];

      // Fetch user details for all conversation partners using inArray
      const userIdsArray = Array.from(userIds);
      console.log("Fetching users for IDs:", userIdsArray);

      const conversationUsers = await db
        .select()
        .from(users)
        .where(inArray(users.id, userIdsArray));

      // Create user lookup map
      const userMap = new Map(conversationUsers.map((u) => [u.id, u]));

      // Build conversation list
      const conversationMap = new Map<string, any>();

      for (const msg of allMessages) {
        const otherUserId =
          msg.senderId === userId ? msg.receiverId : msg.senderId;

        if (!conversationMap.has(otherUserId)) {
          const otherUser = userMap.get(otherUserId);
          if (!otherUser) continue;

          conversationMap.set(otherUserId, {
            id: otherUserId,
            name: otherUser.fullName || otherUser.username,
            role: otherUser.role,
            lastMessage: msg.message,
            timestamp: msg.createdAt,
            unread: 0,
          });
        }

        // Count unread messages (messages sent TO current user that are unread)
        if (msg.receiverId === userId && !msg.isRead) {
          conversationMap.get(otherUserId)!.unread += 1;
        }
      }

      return Array.from(conversationMap.values());
    } catch (err) {
      console.error("getConversations error for userId=", userId, err);
      throw err;
    }
  }

  async markMessagesAsRead(userId: string, otherUserId: string): Promise<void> {
    await db
      .update(chatMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(chatMessages.senderId, otherUserId),
          eq(chatMessages.receiverId, userId),
          eq(chatMessages.isRead, false)
        )
      );
  }

  async getChatMessageById(
    messageId: string
  ): Promise<ChatMessage | undefined> {
    const [message] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);
    return message;
  }

  async deleteChatMessage(messageId: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.id, messageId));
  }

  async updateChatMessage(
    messageId: string,
    newMessage: string
  ): Promise<void> {
    await db
      .update(chatMessages)
      .set({ message: newMessage })
      .where(eq(chatMessages.id, messageId));
  }

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

  async getSystemStats(): Promise<{
    totalUsers: number;
    activePatients: number;
    totalAppointments: number;
    pendingAppointments: number;
    completedAppointments: number;
    totalDoctors: number;
    totalPharmacists: number;
    totalLabTechs: number;
    recentUsers: User[];
  }> {
    // Get all counts in parallel
    const [
      allUsers,
      allPatients,
      allAppointments,
      allDoctors,
      allPharmacists,
      allLabTechs,
      recentUsers,
    ] = await Promise.all([
      db.select().from(users),
      db.select().from(patients),
      db.select().from(appointments),
      db.select().from(doctors),
      db.select().from(pharmacists),
      db.select().from(labTechnicians),
      db.select().from(users).orderBy(desc(users.createdAt)).limit(5),
    ]);

    // Calculate pending and completed appointments
    const pendingAppointments = allAppointments.filter(
      (apt) => apt.status === "scheduled" || apt.status === "pending"
    ).length;
    const completedAppointments = allAppointments.filter(
      (apt) => apt.status === "completed"
    ).length;

    return {
      totalUsers: allUsers.length,
      activePatients: allPatients.length,
      totalAppointments: allAppointments.length,
      pendingAppointments,
      completedAppointments,
      totalDoctors: allDoctors.length,
      totalPharmacists: allPharmacists.length,
      totalLabTechs: allLabTechs.length,
      recentUsers,
    };
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, role))
      .orderBy(desc(users.createdAt));
  }

  async getAuditLogs(limit: number = 10): Promise<any[]> {
    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    return logs;
  }
}

export const storage = new DatabaseStorage();
