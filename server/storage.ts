// MediVault Storage Implementation - Database operations
import {
  users,
  patients,
  doctors,
  pharmacists,
  labTechnicians,
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
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Patient operations
  createPatient(patient: InsertPatient): Promise<Patient>;
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByUserId(userId: string): Promise<Patient | undefined>;
  getPatientByNIC(nic: string): Promise<Patient | undefined>;
  getAllPatients(): Promise<Patient[]>;

  // Doctor operations
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  getDoctor(id: string): Promise<Doctor | undefined>;
  getDoctorByUserId(userId: string): Promise<Doctor | undefined>;
  getAllDoctors(): Promise<Doctor[]>;

  // Pharmacist operations
  createPharmacist(pharmacist: InsertPharmacist): Promise<Pharmacist>;
  getPharmacist(id: string): Promise<Pharmacist | undefined>;

  // Lab Technician operations
  createLabTechnician(labTech: InsertLabTechnician): Promise<LabTechnician>;
  getLabTechnician(id: string): Promise<LabTechnician | undefined>;

  // Appointment operations
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByPatient(patientId: string): Promise<Appointment[]>;
  getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]>;
  updateAppointmentStatus(
    id: string,
    status: string
  ): Promise<Appointment | undefined>;

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

  // Chat Message operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(userId1: string, userId2: string): Promise<ChatMessage[]>;
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
    return await db.select().from(patients).orderBy(desc(patients.createdAt));
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
    return await db.select().from(doctors).orderBy(desc(doctors.createdAt));
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
    return appointment;
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    return appointment;
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.appointmentDate));
  }

  async getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.doctorId, doctorId))
      .orderBy(desc(appointments.appointmentDate));
  }

  async updateAppointmentStatus(
    id: string,
    status: string
  ): Promise<Appointment | undefined> {
    const [appointment] = await db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return appointment;
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
    return await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.senderId, userId1),
          eq(chatMessages.receiverId, userId2)
        )
      )
      .orderBy(chatMessages.createdAt);
  }
}

export const storage = new DatabaseStorage();
