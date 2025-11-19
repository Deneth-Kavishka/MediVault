// MediVault Database Seeder - Complete sample data for all roles and entities
import "dotenv/config";
import { db } from "../server/db";
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
} from "../shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Starting database seeding...\n");

  try {
    // ========================================================================
    // 0. CLEAR EXISTING DATA (to avoid duplicate key errors)
    // ========================================================================
    console.log("🧹 Clearing existing data...");

    // Delete in reverse order of dependencies
    await db.delete(auditLogs);
    await db.delete(chatMessages);
    await db.delete(notifications);
    await db.delete(payments);
    await db.delete(billItems);
    await db.delete(bills);
    await db.delete(labTests);
    await db.delete(prescriptionItems);
    await db.delete(prescriptions);
    await db.delete(medicalRecords);
    await db.delete(appointments);
    await db.delete(medicines);
    await db.delete(labTechnicians);
    await db.delete(pharmacists);
    await db.delete(doctors);
    await db.delete(patients);
    await db.delete(users);

    console.log("✅ Existing data cleared\n");

    // ========================================================================
    // 1. CREATE USERS WITH DIFFERENT ROLES
    // ========================================================================
    console.log("👥 Creating users...");

    const hashedPassword = await bcrypt.hash("password123", 10);

    // Admin User
    const [adminUser] = await db
      .insert(users)
      .values({
        username: "admin",
        email: "admin@medivault.com",
        password: hashedPassword,
        firstName: "System",
        lastName: "Administrator",
        role: "admin",
      })
      .returning();
    console.log("✅ Admin user created");

    // Doctor Users
    const [doctor1User] = await db
      .insert(users)
      .values({
        username: "dr.silva",
        email: "dr.silva@medivault.com",
        password: hashedPassword,
        firstName: "Kumara",
        lastName: "Silva",
        role: "doctor",
      })
      .returning();

    const [doctor2User] = await db
      .insert(users)
      .values({
        username: "dr.fernando",
        email: "dr.fernando@medivault.com",
        password: hashedPassword,
        firstName: "Nimal",
        lastName: "Fernando",
        role: "doctor",
      })
      .returning();

    const [doctor3User] = await db
      .insert(users)
      .values({
        username: "dr.perera",
        email: "dr.perera@medivault.com",
        password: hashedPassword,
        firstName: "Anura",
        lastName: "Perera",
        role: "doctor",
      })
      .returning();
    console.log("✅ Doctor users created");

    // Patient Users
    const [patient1User] = await db
      .insert(users)
      .values({
        username: "patient.john",
        email: "john.doe@email.com",
        password: hashedPassword,
        firstName: "John",
        lastName: "Doe",
        role: "patient",
      })
      .returning();

    const [patient2User] = await db
      .insert(users)
      .values({
        username: "patient.jane",
        email: "jane.smith@email.com",
        password: hashedPassword,
        firstName: "Jane",
        lastName: "Smith",
        role: "patient",
      })
      .returning();

    const [patient3User] = await db
      .insert(users)
      .values({
        username: "patient.bob",
        email: "bob.wilson@email.com",
        password: hashedPassword,
        firstName: "Bob",
        lastName: "Wilson",
        role: "patient",
      })
      .returning();

    const [patient4User] = await db
      .insert(users)
      .values({
        username: "patient.alice",
        email: "alice.brown@email.com",
        password: hashedPassword,
        firstName: "Alice",
        lastName: "Brown",
        role: "patient",
      })
      .returning();
    console.log("✅ Patient users created");

    // Pharmacist User
    const [pharmacistUser] = await db
      .insert(users)
      .values({
        username: "pharmacist.kumar",
        email: "kumar@medivault.com",
        password: hashedPassword,
        firstName: "Kumar",
        lastName: "Rajapaksa",
        role: "pharmacist",
      })
      .returning();
    console.log("✅ Pharmacist user created");

    // Lab Technician User
    const [labTechUser] = await db
      .insert(users)
      .values({
        username: "labtech.sarah",
        email: "sarah@medivault.com",
        password: hashedPassword,
        firstName: "Sarah",
        lastName: "Jayawardena",
        role: "lab_technician",
      })
      .returning();
    console.log("✅ Lab technician user created");

    // ========================================================================
    // 2. CREATE ROLE-SPECIFIC PROFILES
    // ========================================================================
    console.log("\n👨‍⚕️ Creating doctor profiles...");

    const [doctor1] = await db
      .insert(doctors)
      .values({
        userId: doctor1User.id,
        specialization: "Cardiology",
        licenseNumber: "LK-DOC-001234",
        qualifications: "MBBS, MD (Cardiology), FRCP",
        experience: 15,
        consultationFee: "5000.00",
        availableDays: JSON.stringify(["Monday", "Wednesday", "Friday"]),
      })
      .returning();

    const [doctor2] = await db
      .insert(doctors)
      .values({
        userId: doctor2User.id,
        specialization: "Pediatrics",
        licenseNumber: "LK-DOC-001235",
        qualifications: "MBBS, DCH, MD (Pediatrics)",
        experience: 10,
        consultationFee: "4000.00",
        availableDays: JSON.stringify(["Tuesday", "Thursday", "Saturday"]),
      })
      .returning();

    const [doctor3] = await db
      .insert(doctors)
      .values({
        userId: doctor3User.id,
        specialization: "General Medicine",
        licenseNumber: "LK-DOC-001236",
        qualifications: "MBBS, MD (General Medicine)",
        experience: 8,
        consultationFee: "3500.00",
        availableDays: JSON.stringify([
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
        ]),
      })
      .returning();
    console.log("✅ Doctor profiles created");

    console.log("\n🏥 Creating patient profiles...");

    const [patient1] = await db
      .insert(patients)
      .values({
        userId: patient1User.id,
        nic: "199012345678",
        healthId: "MV-P-001",
        rfid: "RFID-001",
        dateOfBirth: new Date("1990-05-15"),
        gender: "male",
        contactInfo: "+94771234567",
        address: "123 Galle Road, Colombo 03, Sri Lanka",
        bloodType: "O+",
        allergies: "Penicillin, Peanuts",
      })
      .returning();

    const [patient2] = await db
      .insert(patients)
      .values({
        userId: patient2User.id,
        nic: "198503456789",
        healthId: "MV-P-002",
        rfid: "RFID-002",
        dateOfBirth: new Date("1985-08-22"),
        gender: "female",
        contactInfo: "+94772345678",
        address: "456 Kandy Road, Kandy, Sri Lanka",
        bloodType: "A+",
        allergies: "None",
      })
      .returning();

    const [patient3] = await db
      .insert(patients)
      .values({
        userId: patient3User.id,
        nic: "197801234567",
        healthId: "MV-P-003",
        rfid: "RFID-003",
        dateOfBirth: new Date("1978-03-10"),
        gender: "male",
        contactInfo: "+94773456789",
        address: "789 Main Street, Galle, Sri Lanka",
        bloodType: "B+",
        allergies: "Sulfa drugs",
      })
      .returning();

    const [patient4] = await db
      .insert(patients)
      .values({
        userId: patient4User.id,
        nic: "199506789012",
        healthId: "MV-P-004",
        rfid: "RFID-004",
        dateOfBirth: new Date("1995-11-28"),
        gender: "female",
        contactInfo: "+94774567890",
        address: "321 Beach Road, Negombo, Sri Lanka",
        bloodType: "AB+",
        allergies: "Latex",
      })
      .returning();
    console.log("✅ Patient profiles created");

    const [pharmacist] = await db
      .insert(pharmacists)
      .values({
        userId: pharmacistUser.id,
        licenseNumber: "LK-PHARM-005678",
      })
      .returning();
    console.log("✅ Pharmacist profile created");

    const [labTech] = await db
      .insert(labTechnicians)
      .values({
        userId: labTechUser.id,
        specialization: "Clinical Pathology",
        licenseNumber: "LK-LAB-009876",
      })
      .returning();
    console.log("✅ Lab technician profile created");

    // ========================================================================
    // 3. CREATE MEDICINES (INVENTORY)
    // ========================================================================
    console.log("\n💊 Creating medicine inventory...");

    const medicinesData = [
      {
        name: "Paracetamol",
        genericName: "Acetaminophen",
        manufacturer: "State Pharmaceuticals Corporation",
        category: "Analgesic",
        description: "Pain reliever and fever reducer",
        dosageForm: "tablet",
        strength: "500mg",
        unitPrice: "5.00",
        stockQuantity: 500,
        reorderLevel: 100,
        expiryDate: new Date("2025-12-31"),
        batchNumber: "BATCH-001",
      },
      {
        name: "Amoxicillin",
        genericName: "Amoxicillin",
        manufacturer: "Link Natural Products",
        category: "Antibiotic",
        description: "Broad-spectrum antibiotic",
        dosageForm: "capsule",
        strength: "250mg",
        unitPrice: "15.00",
        stockQuantity: 300,
        reorderLevel: 50,
        expiryDate: new Date("2025-06-30"),
        batchNumber: "BATCH-002",
      },
      {
        name: "Metformin",
        genericName: "Metformin Hydrochloride",
        manufacturer: "Hemas Pharmaceuticals",
        category: "Antidiabetic",
        description: "Type 2 diabetes treatment",
        dosageForm: "tablet",
        strength: "500mg",
        unitPrice: "10.00",
        stockQuantity: 400,
        reorderLevel: 80,
        expiryDate: new Date("2026-03-31"),
        batchNumber: "BATCH-003",
      },
      {
        name: "Atorvastatin",
        genericName: "Atorvastatin Calcium",
        manufacturer: "Astron Limited",
        category: "Statin",
        description: "Cholesterol-lowering medication",
        dosageForm: "tablet",
        strength: "10mg",
        unitPrice: "25.00",
        stockQuantity: 200,
        reorderLevel: 40,
        expiryDate: new Date("2025-09-30"),
        batchNumber: "BATCH-004",
      },
      {
        name: "Omeprazole",
        genericName: "Omeprazole",
        manufacturer: "Brown & Company",
        category: "Proton Pump Inhibitor",
        description: "Treats stomach acid problems",
        dosageForm: "capsule",
        strength: "20mg",
        unitPrice: "12.00",
        stockQuantity: 250,
        reorderLevel: 50,
        expiryDate: new Date("2025-11-30"),
        batchNumber: "BATCH-005",
      },
      {
        name: "Salbutamol Inhaler",
        genericName: "Salbutamol",
        manufacturer: "GlaxoSmithKline",
        category: "Bronchodilator",
        description: "Relieves asthma symptoms",
        dosageForm: "inhaler",
        strength: "100mcg",
        unitPrice: "350.00",
        stockQuantity: 50,
        reorderLevel: 10,
        expiryDate: new Date("2025-08-31"),
        batchNumber: "BATCH-006",
      },
      {
        name: "Cough Syrup",
        genericName: "Dextromethorphan",
        manufacturer: "Link Natural Products",
        category: "Antitussive",
        description: "Relieves cough",
        dosageForm: "syrup",
        strength: "15mg/5ml",
        unitPrice: "150.00",
        stockQuantity: 100,
        reorderLevel: 20,
        expiryDate: new Date("2025-07-31"),
        batchNumber: "BATCH-007",
      },
      {
        name: "Ibuprofen",
        genericName: "Ibuprofen",
        manufacturer: "State Pharmaceuticals Corporation",
        category: "NSAID",
        description: "Anti-inflammatory pain reliever",
        dosageForm: "tablet",
        strength: "400mg",
        unitPrice: "8.00",
        stockQuantity: 450,
        reorderLevel: 90,
        expiryDate: new Date("2026-01-31"),
        batchNumber: "BATCH-008",
      },
    ];

    const createdMedicines = [];
    for (const med of medicinesData) {
      const [medicine] = await db.insert(medicines).values(med).returning();
      createdMedicines.push(medicine);
    }
    console.log(`✅ ${createdMedicines.length} medicines created`);

    // ========================================================================
    // 4. CREATE APPOINTMENTS
    // ========================================================================
    console.log("\n📅 Creating appointments...");

    const appointmentsData = [
      {
        patientId: patient1.id,
        doctorId: doctor1.id,
        appointmentDate: new Date("2024-11-20 10:00:00"),
        status: "completed",
        reason: "Chest pain and breathing difficulty",
        notes: "Patient reports intermittent chest pain for 3 days",
      },
      {
        patientId: patient2.id,
        doctorId: doctor2.id,
        appointmentDate: new Date("2024-11-21 14:00:00"),
        status: "completed",
        reason: "Child vaccination checkup",
        notes: "Regular vaccination schedule",
      },
      {
        patientId: patient3.id,
        doctorId: doctor3.id,
        appointmentDate: new Date("2024-11-22 09:30:00"),
        status: "confirmed",
        reason: "Follow-up for diabetes management",
        notes: "Patient needs blood sugar monitoring",
      },
      {
        patientId: patient4.id,
        doctorId: doctor1.id,
        appointmentDate: new Date("2024-11-23 11:00:00"),
        status: "pending",
        reason: "General health checkup",
        notes: "Annual physical examination",
      },
      {
        patientId: patient1.id,
        doctorId: doctor2.id,
        appointmentDate: new Date("2024-11-25 15:00:00"),
        status: "pending",
        reason: "Persistent cough for 2 weeks",
        notes: "Patient requests examination",
      },
    ];

    const createdAppointments = [];
    for (const apt of appointmentsData) {
      const [appointment] = await db
        .insert(appointments)
        .values(apt)
        .returning();
      createdAppointments.push(appointment);
    }
    console.log(`✅ ${createdAppointments.length} appointments created`);

    // ========================================================================
    // 5. CREATE MEDICAL RECORDS
    // ========================================================================
    console.log("\n📋 Creating medical records...");

    const [medRecord1] = await db
      .insert(medicalRecords)
      .values({
        patientId: patient1.id,
        doctorId: doctor1.id,
        appointmentId: createdAppointments[0].id,
        diagnosis: "Angina Pectoris - Stable",
        symptoms: "Chest pain, shortness of breath, fatigue",
        notes:
          "ECG shows minor abnormalities. Prescribed medication and lifestyle changes. Follow-up in 2 weeks.",
        vitalSigns: JSON.stringify({
          bloodPressure: "140/90",
          heartRate: 85,
          temperature: 36.8,
          oxygenSaturation: 97,
        }),
      })
      .returning();

    const [medRecord2] = await db
      .insert(medicalRecords)
      .values({
        patientId: patient2.id,
        doctorId: doctor2.id,
        appointmentId: createdAppointments[1].id,
        diagnosis: "Routine Vaccination - MMR",
        symptoms: "None - Preventive care",
        notes: "Child is healthy. MMR vaccine administered successfully.",
        vitalSigns: JSON.stringify({
          bloodPressure: "N/A",
          heartRate: 90,
          temperature: 36.5,
          weight: 15,
        }),
      })
      .returning();

    const [medRecord3] = await db
      .insert(medicalRecords)
      .values({
        patientId: patient3.id,
        doctorId: doctor3.id,
        diagnosis: "Type 2 Diabetes Mellitus",
        symptoms: "Increased thirst, frequent urination, fatigue",
        notes:
          "HbA1c: 7.8%. Continue with Metformin. Diet and exercise counseling provided.",
        vitalSigns: JSON.stringify({
          bloodPressure: "135/85",
          heartRate: 78,
          temperature: 36.6,
          bloodSugar: 145,
        }),
      })
      .returning();
    console.log("✅ Medical records created");

    // ========================================================================
    // 6. CREATE PRESCRIPTIONS
    // ========================================================================
    console.log("\n💊 Creating prescriptions...");

    const [prescription1] = await db
      .insert(prescriptions)
      .values({
        patientId: patient1.id,
        doctorId: doctor1.id,
        medicalRecordId: medRecord1.id,
        dateIssued: new Date(),
        expiryDate: new Date("2024-12-20"),
        qrCode: `RX-${Date.now()}-001`,
        status: "active",
        notes: "Take after meals. Avoid heavy exercise.",
      })
      .returning();

    // Add prescription items for prescription 1
    await db.insert(prescriptionItems).values([
      {
        prescriptionId: prescription1.id,
        medicineId: createdMedicines[3].id, // Atorvastatin
        dosage: "10mg",
        frequency: "Once daily",
        duration: "30 days",
        quantity: 30,
        instructions: "Take in the evening after dinner",
      },
      {
        prescriptionId: prescription1.id,
        medicineId: createdMedicines[0].id, // Paracetamol
        dosage: "500mg",
        frequency: "As needed",
        duration: "7 days",
        quantity: 14,
        instructions: "For pain relief, maximum 2 tablets per day",
      },
    ]);

    const [prescription2] = await db
      .insert(prescriptions)
      .values({
        patientId: patient3.id,
        doctorId: doctor3.id,
        medicalRecordId: medRecord3.id,
        dateIssued: new Date(),
        expiryDate: new Date("2024-12-22"),
        qrCode: `RX-${Date.now()}-002`,
        status: "active",
        notes: "Monitor blood sugar levels regularly",
      })
      .returning();

    await db.insert(prescriptionItems).values([
      {
        prescriptionId: prescription2.id,
        medicineId: createdMedicines[2].id, // Metformin
        dosage: "500mg",
        frequency: "Twice daily",
        duration: "60 days",
        quantity: 120,
        instructions: "Take with breakfast and dinner",
      },
    ]);
    console.log("✅ Prescriptions and prescription items created");

    // ========================================================================
    // 7. CREATE LAB TESTS
    // ========================================================================
    console.log("\n🔬 Creating lab tests...");

    const labTestsData = [
      {
        patientId: patient1.id,
        doctorId: doctor1.id,
        labTechnicianId: labTech.id,
        testType: "Blood Test",
        testName: "Lipid Profile",
        status: "completed",
        requestDate: new Date("2024-11-20"),
        completionDate: new Date("2024-11-21"),
        results: JSON.stringify({
          totalCholesterol: 245,
          ldl: 165,
          hdl: 42,
          triglycerides: 190,
        }),
        isAbnormal: true,
        notes: "Elevated LDL and total cholesterol levels",
      },
      {
        patientId: patient3.id,
        doctorId: doctor3.id,
        labTechnicianId: labTech.id,
        testType: "Blood Test",
        testName: "HbA1c Test",
        status: "completed",
        requestDate: new Date("2024-11-22"),
        completionDate: new Date("2024-11-22"),
        results: JSON.stringify({
          hba1c: 7.8,
          unit: "%",
        }),
        isAbnormal: true,
        notes: "Above target range, indicates poor glucose control",
      },
      {
        patientId: patient2.id,
        doctorId: doctor2.id,
        testType: "Blood Test",
        testName: "Complete Blood Count",
        status: "in_progress",
        requestDate: new Date("2024-11-23"),
        notes: "Routine checkup",
      },
      {
        patientId: patient4.id,
        doctorId: doctor3.id,
        testType: "Urine Test",
        testName: "Urinalysis",
        status: "pending",
        requestDate: new Date("2024-11-23"),
        notes: "Annual health screening",
      },
    ];

    for (const test of labTestsData) {
      await db.insert(labTests).values(test);
    }
    console.log(`✅ ${labTestsData.length} lab tests created`);

    // ========================================================================
    // 8. CREATE BILLS AND PAYMENTS
    // ========================================================================
    console.log("\n💰 Creating bills and payments...");

    const [bill1] = await db
      .insert(bills)
      .values({
        patientId: patient1.id,
        appointmentId: createdAppointments[0].id,
        totalAmount: "7500.00",
        discount: "500.00",
        finalAmount: "7000.00",
        status: "paid",
        billDate: new Date("2024-11-20"),
        notes: "Consultation + Lab tests + Medicines",
      })
      .returning();

    await db.insert(billItems).values([
      {
        billId: bill1.id,
        itemType: "consultation",
        description: "Cardiology Consultation - Dr. Silva",
        quantity: 1,
        unitPrice: "5000.00",
        amount: "5000.00",
      },
      {
        billId: bill1.id,
        itemType: "lab_test",
        description: "Lipid Profile Test",
        quantity: 1,
        unitPrice: "2000.00",
        amount: "2000.00",
      },
      {
        billId: bill1.id,
        itemType: "medicine",
        description: "Medicines (Atorvastatin + Paracetamol)",
        quantity: 1,
        unitPrice: "500.00",
        amount: "500.00",
      },
    ]);

    await db.insert(payments).values({
      billId: bill1.id,
      amount: "7000.00",
      paymentMethod: "card",
      transactionId: "TXN-001-2024",
      paymentDate: new Date("2024-11-20"),
      status: "completed",
      notes: "Paid via credit card",
    });

    const [bill2] = await db
      .insert(bills)
      .values({
        patientId: patient3.id,
        totalAmount: "5500.00",
        discount: "0.00",
        finalAmount: "5500.00",
        status: "pending",
        billDate: new Date("2024-11-22"),
        dueDate: new Date("2024-12-22"),
        notes: "Consultation + Lab tests pending payment",
      })
      .returning();

    await db.insert(billItems).values([
      {
        billId: bill2.id,
        itemType: "consultation",
        description: "General Medicine Consultation - Dr. Perera",
        quantity: 1,
        unitPrice: "3500.00",
        amount: "3500.00",
      },
      {
        billId: bill2.id,
        itemType: "lab_test",
        description: "HbA1c Test",
        quantity: 1,
        unitPrice: "2000.00",
        amount: "2000.00",
      },
    ]);
    console.log("✅ Bills and payments created");

    // ========================================================================
    // 9. CREATE NOTIFICATIONS
    // ========================================================================
    console.log("\n🔔 Creating notifications...");

    const notificationsData = [
      {
        recipientId: patient1User.id,
        type: "appointment",
        title: "Appointment Confirmed",
        message: `Your appointment with Dr. Silva on ${createdAppointments[0].appointmentDate.toLocaleDateString()} has been completed`,
        relatedEntityId: createdAppointments[0].id,
        isRead: true,
      },
      {
        recipientId: patient1User.id,
        type: "prescription",
        title: "New Prescription Available",
        message:
          "Dr. Silva has issued a new prescription for you. Please collect from pharmacy.",
        relatedEntityId: prescription1.id,
        isRead: false,
      },
      {
        recipientId: patient1User.id,
        type: "lab_result",
        title: "Lab Results Ready",
        message:
          "Your Lipid Profile test results are ready. Please check your medical records.",
        relatedEntityId: labTestsData[0].patientId,
        isRead: false,
      },
      {
        recipientId: patient3User.id,
        type: "appointment",
        title: "Upcoming Appointment",
        message: `Reminder: Your appointment with Dr. Perera is scheduled for ${createdAppointments[2].appointmentDate.toLocaleDateString()}`,
        relatedEntityId: createdAppointments[2].id,
        isRead: false,
      },
      {
        recipientId: pharmacistUser.id,
        type: "low_stock",
        title: "Low Stock Alert",
        message:
          "Salbutamol Inhaler stock is running low. Current quantity: 50 units",
        isRead: false,
      },
      {
        recipientId: doctor1User.id,
        type: "appointment",
        title: "New Appointment Request",
        message: `New appointment requested by ${patient4User.firstName} ${patient4User.lastName}`,
        relatedEntityId: createdAppointments[3].id,
        isRead: false,
      },
    ];

    for (const notif of notificationsData) {
      await db.insert(notifications).values(notif);
    }
    console.log(`✅ ${notificationsData.length} notifications created`);

    // ========================================================================
    // 10. CREATE AUDIT LOGS
    // ========================================================================
    console.log("\n📝 Creating audit logs...");

    const auditLogsData = [
      {
        userId: doctor1User.id,
        action: "CREATE_PRESCRIPTION",
        entityType: "prescription",
        entityId: prescription1.id,
        details: "Created prescription for patient John Doe",
        ipAddress: "192.168.1.100",
      },
      {
        userId: labTechUser.id,
        action: "UPDATE_LAB_TEST",
        entityType: "lab_test",
        entityId: labTestsData[0].patientId,
        details: "Completed Lipid Profile test and uploaded results",
        ipAddress: "192.168.1.101",
      },
      {
        userId: pharmacistUser.id,
        action: "UPDATE_MEDICINE_STOCK",
        entityType: "medicine",
        entityId: createdMedicines[0].id,
        details: "Updated Paracetamol stock quantity",
        ipAddress: "192.168.1.102",
      },
      {
        userId: adminUser.id,
        action: "CREATE_USER",
        entityType: "user",
        entityId: doctor1User.id,
        details: "Created new doctor user account",
        ipAddress: "192.168.1.1",
      },
    ];

    for (const log of auditLogsData) {
      await db.insert(auditLogs).values(log);
    }
    console.log(`✅ ${auditLogsData.length} audit logs created`);

    // ========================================================================
    // 11. CREATE SAMPLE CHAT MESSAGES
    // ========================================================================
    console.log("\n💬 Creating chat messages...");

    const chatMessagesData = [
      {
        senderId: patient1User.id,
        receiverId: doctor1User.id,
        message: "Hello Dr. Silva, I wanted to ask about my prescription.",
        isRead: true,
      },
      {
        senderId: doctor1User.id,
        receiverId: patient1User.id,
        message:
          "Hello John! Sure, what would you like to know about your prescription?",
        isRead: true,
      },
      {
        senderId: patient1User.id,
        receiverId: doctor1User.id,
        message: "Should I take the Atorvastatin before or after meals?",
        isRead: true,
      },
      {
        senderId: doctor1User.id,
        receiverId: patient1User.id,
        message:
          "Take it in the evening after dinner. It works best when taken at the same time each day.",
        isRead: false,
      },
    ];

    for (const msg of chatMessagesData) {
      await db.insert(chatMessages).values(msg);
    }
    console.log(`✅ ${chatMessagesData.length} chat messages created`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log("\n✨ Database seeding completed successfully!\n");
    console.log("========================================");
    console.log("📊 SEEDING SUMMARY");
    console.log("========================================");
    console.log(
      "👥 Users: 9 (1 admin, 3 doctors, 4 patients, 1 pharmacist, 1 lab tech)"
    );
    console.log("👨‍⚕️ Doctors: 3");
    console.log("🏥 Patients: 4");
    console.log("💊 Medicines: " + createdMedicines.length);
    console.log("📅 Appointments: " + createdAppointments.length);
    console.log("📋 Medical Records: 3");
    console.log("💊 Prescriptions: 2");
    console.log("🔬 Lab Tests: " + labTestsData.length);
    console.log("💰 Bills: 2");
    console.log("🔔 Notifications: " + notificationsData.length);
    console.log("📝 Audit Logs: " + auditLogsData.length);
    console.log("💬 Chat Messages: " + chatMessagesData.length);
    console.log("========================================\n");
    console.log("🔑 SAMPLE LOGIN CREDENTIALS:");
    console.log("========================================");
    console.log("Admin:");
    console.log("  Username: admin");
    console.log("  Password: password123\n");
    console.log("Doctors:");
    console.log("  Username: dr.silva (Cardiology)");
    console.log("  Username: dr.fernando (Pediatrics)");
    console.log("  Username: dr.perera (General Medicine)");
    console.log("  Password: password123\n");
    console.log("Patients:");
    console.log("  Username: patient.john");
    console.log("  Username: patient.jane");
    console.log("  Username: patient.bob");
    console.log("  Username: patient.alice");
    console.log("  Password: password123\n");
    console.log("Pharmacist:");
    console.log("  Username: pharmacist.kumar");
    console.log("  Password: password123\n");
    console.log("Lab Technician:");
    console.log("  Username: labtech.sarah");
    console.log("  Password: password123\n");
    console.log("========================================");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    process.exit(1);
  }
}

seed();
