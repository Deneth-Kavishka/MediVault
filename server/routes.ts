// MediVault API Routes - Complete backend implementation
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
// Use local authentication
import {
  setupAuth,
  isAuthenticated,
  hasRole,
  isAdmin,
  isDoctor,
  isDoctorOrAdmin,
  isPharmacist,
  isPharmacistOrAdmin,
  isLabTechnician,
  isLabTechOrAdmin,
} from "./localAuth";
import {
  insertPatientSchema,
  insertDoctorSchema,
  insertPharmacistSchema,
  insertLabTechnicianSchema,
  insertAppointmentSchema,
  insertMedicalRecordSchema,
  insertPrescriptionSchema,
  insertPrescriptionItemSchema,
  insertMedicineSchema,
  insertLabTestSchema,
  insertBillSchema,
  insertBillItemSchema,
  insertPaymentSchema,
  insertNotificationSchema,
  insertChatMessageSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // ============================================================================
  // AUTH SETUP
  // ============================================================================
  setupAuth(app);

  // Note: Login, register, logout, and auth/user endpoints are handled in localAuth.ts

  // ============================================================================
  // PATIENT ROUTES
  // ============================================================================
  app.post("/api/patients", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertPatientSchema.parse({ ...req.body, userId });
      const patient = await storage.createPatient(validatedData);
      res.status(201).json(patient);
    } catch (error: any) {
      console.error("Error creating patient:", error);
      res
        .status(400)
        .json({ message: error.message || "Failed to create patient" });
    }
  });

  app.get("/api/patients", isAuthenticated, async (req, res) => {
    try {
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id", isAuthenticated, async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient:", error);
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  app.get("/api/patients/nic/:nic", isAuthenticated, async (req, res) => {
    try {
      const patient = await storage.getPatientByNIC(req.params.nic);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient:", error);
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  // ============================================================================
  // DOCTOR ROUTES
  // ============================================================================
  app.post("/api/doctors", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertDoctorSchema.parse({ ...req.body, userId });
      const doctor = await storage.createDoctor(validatedData);
      res.status(201).json(doctor);
    } catch (error: any) {
      console.error("Error creating doctor:", error);
      res
        .status(400)
        .json({ message: error.message || "Failed to create doctor" });
    }
  });

  app.get("/api/doctors", isAuthenticated, async (req, res) => {
    try {
      const doctors = await storage.getAllDoctors();
      res.json(doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      res.status(500).json({ message: "Failed to fetch doctors" });
    }
  });

  app.get("/api/doctors/:id", isAuthenticated, async (req, res) => {
    try {
      const doctor = await storage.getDoctor(req.params.id);
      if (!doctor) {
        return res.status(404).json({ message: "Doctor not found" });
      }
      res.json(doctor);
    } catch (error) {
      console.error("Error fetching doctor:", error);
      res.status(500).json({ message: "Failed to fetch doctor" });
    }
  });

  // ============================================================================
  // APPOINTMENT ROUTES
  // ============================================================================
  app.post("/api/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertAppointmentSchema.parse({
        ...req.body,
        status: "pending", // Default status
      });
      const appointment = await storage.createAppointment(validatedData);

      // Create notification for doctor
      await storage.createNotification({
        recipientId: req.body.doctorId,
        type: "appointment",
        title: "New Appointment Request",
        message: `New appointment requested for ${new Date(
          req.body.appointmentDate
        ).toLocaleString()}`,
        relatedEntityId: appointment.id,
      });

      res.status(201).json(appointment);
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      res
        .status(400)
        .json({ message: error.message || "Failed to create appointment" });
    }
  });

  app.get("/api/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      let appointments: any[] = [];
      if (user?.role === "patient") {
        const patient = await storage.getPatientByUserId(userId);
        if (patient) {
          appointments = await storage.getAppointmentsByPatient(patient.id);
        }
      } else if (user?.role === "doctor") {
        const doctor = await storage.getDoctorByUserId(userId);
        if (doctor) {
          appointments = await storage.getAppointmentsByDoctor(doctor.id);
        }
      }

      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.patch(
    "/api/appointments/:id/status",
    isAuthenticated,
    async (req, res) => {
      try {
        const { status } = req.body;
        const appointment = await storage.updateAppointmentStatus(
          req.params.id,
          status
        );
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }
        res.json(appointment);
      } catch (error) {
        console.error("Error updating appointment:", error);
        res.status(500).json({ message: "Failed to update appointment" });
      }
    }
  );

  // ============================================================================
  // MEDICAL RECORD ROUTES
  // ============================================================================
  app.post("/api/medical-records", isDoctorOrAdmin, async (req, res) => {
    try {
      const validatedData = insertMedicalRecordSchema.parse(req.body);
      const record = await storage.createMedicalRecord(validatedData);
      res.status(201).json(record);
    } catch (error: any) {
      console.error("Error creating medical record:", error);
      res
        .status(400)
        .json({ message: error.message || "Failed to create medical record" });
    }
  });

  app.get("/api/medical-records", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      let records: any[] = [];
      if (user?.role === "patient") {
        const patient = await storage.getPatientByUserId(userId);
        if (patient) {
          records = await storage.getMedicalRecordsByPatient(patient.id);
        }
      }

      res.json(records);
    } catch (error) {
      console.error("Error fetching medical records:", error);
      res.status(500).json({ message: "Failed to fetch medical records" });
    }
  });

  app.get(
    "/api/medical-records/patient/:patientId",
    isAuthenticated,
    async (req, res) => {
      try {
        const records = await storage.getMedicalRecordsByPatient(
          req.params.patientId
        );
        res.json(records);
      } catch (error) {
        console.error("Error fetching medical records:", error);
        res.status(500).json({ message: "Failed to fetch medical records" });
      }
    }
  );

  // ============================================================================
  // PRESCRIPTION ROUTES
  // ============================================================================
  app.post("/api/prescriptions", isDoctorOrAdmin, async (req, res) => {
    try {
      const { items, ...prescriptionData } = req.body;

      // Create prescription with QR code
      const qrCode = `RX-${Date.now()}`; // Simple QR code generation
      const validatedPrescription = insertPrescriptionSchema.parse({
        ...prescriptionData,
        qrCode,
        status: "active",
      });

      const prescription = await storage.createPrescription(
        validatedPrescription
      );

      // Create prescription items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const validatedItem = insertPrescriptionItemSchema.parse({
            ...item,
            prescriptionId: prescription.id,
          });
          await storage.createPrescriptionItem(validatedItem);
        }
      }

      res.status(201).json(prescription);
    } catch (error: any) {
      console.error("Error creating prescription:", error);
      res
        .status(400)
        .json({ message: error.message || "Failed to create prescription" });
    }
  });

  app.get("/api/prescriptions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      let prescriptions: any[] = [];
      if (user?.role === "patient") {
        const patient = await storage.getPatientByUserId(userId);
        if (patient) {
          prescriptions = await storage.getPrescriptionsByPatient(patient.id);
        }
      }

      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
  });

  // ============================================================================
  // MEDICINE ROUTES (Inventory)
  // ============================================================================
  app.post("/api/medicines", isPharmacistOrAdmin, async (req, res) => {
    try {
      const validatedData = insertMedicineSchema.parse(req.body);
      const medicine = await storage.createMedicine(validatedData);
      res.status(201).json(medicine);
    } catch (error: any) {
      console.error("Error creating medicine:", error);
      res
        .status(400)
        .json({ message: error.message || "Failed to create medicine" });
    }
  });

  app.get("/api/medicines", isAuthenticated, async (req, res) => {
    try {
      const medicines = await storage.getAllMedicines();
      res.json(medicines);
    } catch (error) {
      console.error("Error fetching medicines:", error);
      res.status(500).json({ message: "Failed to fetch medicines" });
    }
  });

  app.patch(
    "/api/medicines/:id/stock",
    isPharmacistOrAdmin,
    async (req, res) => {
      try {
        const { quantity } = req.body;
        const medicine = await storage.updateMedicineStock(
          req.params.id,
          quantity
        );
        if (!medicine) {
          return res.status(404).json({ message: "Medicine not found" });
        }
        res.json(medicine);
      } catch (error) {
        console.error("Error updating medicine stock:", error);
        res.status(500).json({ message: "Failed to update medicine stock" });
      }
    }
  );

  // ============================================================================
  // LAB TEST ROUTES
  // ============================================================================
  app.post("/api/lab-tests", isDoctorOrAdmin, async (req, res) => {
    try {
      const validatedData = insertLabTestSchema.parse({
        ...req.body,
        status: "pending",
      });
      const labTest = await storage.createLabTest(validatedData);

      // Create notification for patient
      await storage.createNotification({
        recipientId: req.body.patientId,
        type: "lab_result",
        title: "Lab Test Ordered",
        message: `A new ${req.body.testName} has been ordered for you`,
        relatedEntityId: labTest.id,
      });

      res.status(201).json(labTest);
    } catch (error: any) {
      console.error("Error creating lab test:", error);
      res
        .status(400)
        .json({ message: error.message || "Failed to create lab test" });
    }
  });

  app.get("/api/lab-tests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      let labTests: any[] = [];
      if (user?.role === "patient") {
        const patient = await storage.getPatientByUserId(userId);
        if (patient) {
          labTests = await storage.getLabTestsByPatient(patient.id);
        }
      }

      res.json(labTests);
    } catch (error) {
      console.error("Error fetching lab tests:", error);
      res.status(500).json({ message: "Failed to fetch lab tests" });
    }
  });

  app.patch("/api/lab-tests/:id", isLabTechOrAdmin, async (req, res) => {
    try {
      const { status, results } = req.body;
      const labTest = await storage.updateLabTestStatus(
        req.params.id,
        status,
        results
      );
      if (!labTest) {
        return res.status(404).json({ message: "Lab test not found" });
      }
      res.json(labTest);
    } catch (error) {
      console.error("Error updating lab test:", error);
      res.status(500).json({ message: "Failed to update lab test" });
    }
  });

  // ============================================================================
  // BILL ROUTES
  // ============================================================================
  app.post("/api/bills", isAuthenticated, async (req, res) => {
    try {
      const { items, ...billData } = req.body;
      const validatedBill = insertBillSchema.parse({
        ...billData,
        status: "pending",
      });

      const bill = await storage.createBill(validatedBill);

      // Create bill items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const validatedItem = insertBillItemSchema.parse({
            ...item,
            billId: bill.id,
          });
          await storage.createBillItem(validatedItem);
        }
      }

      res.status(201).json(bill);
    } catch (error: any) {
      console.error("Error creating bill:", error);
      res
        .status(400)
        .json({ message: error.message || "Failed to create bill" });
    }
  });

  app.get("/api/bills", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      let bills: any[] = [];
      if (user?.role === "patient") {
        const patient = await storage.getPatientByUserId(userId);
        if (patient) {
          bills = await storage.getBillsByPatient(patient.id);
        }
      }

      res.json(bills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      res.status(500).json({ message: "Failed to fetch bills" });
    }
  });

  // ============================================================================
  // PAYMENT ROUTES
  // ============================================================================
  app.post("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse({
        ...req.body,
        status: "completed",
      });
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error: any) {
      console.error("Error creating payment:", error);
      res
        .status(400)
        .json({ message: error.message || "Failed to create payment" });
    }
  });

  // ============================================================================
  // NOTIFICATION ROUTES
  // ============================================================================
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch(
    "/api/notifications/:id/read",
    isAuthenticated,
    async (req, res) => {
      try {
        await storage.markNotificationAsRead(req.params.id);
        res.json({ message: "Notification marked as read" });
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res
          .status(500)
          .json({ message: "Failed to mark notification as read" });
      }
    }
  );

  // ============================================================================
  // CHAT MESSAGE ROUTES
  // ============================================================================
  app.get("/api/messages/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const otherUserId = req.params.userId;
      const messages = await storage.getChatMessages(
        currentUserId,
        otherUserId
      );
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const validatedData = insertChatMessageSchema.parse({
        ...req.body,
        senderId: currentUserId,
      });
      const message = await storage.createChatMessage(validatedData);
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error creating message:", error);
      res
        .status(400)
        .json({ message: error.message || "Failed to create message" });
    }
  });

  // ============================================================================
  // WEBSOCKET FOR REAL-TIME CHAT
  // ============================================================================
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // WebSocket authentication and connection handling
  wss.on("connection", (ws: WebSocket, req: any) => {
    console.log("New WebSocket connection attempt");

    // Parse session from request
    const sessionMiddleware = app.get("sessionMiddleware");
    if (!sessionMiddleware) {
      console.error("Session middleware not found");
      ws.close(1008, "Authentication required");
      return;
    }

    // Verify authentication via session
    sessionMiddleware(req, {} as any, () => {
      if (!req.session?.passport?.user) {
        console.log("WebSocket connection rejected: Not authenticated");
        ws.close(1008, "Authentication required");
        return;
      }

      const userId = req.session.passport.user;
      console.log(`WebSocket authenticated for user: ${userId}`);

      // Store user ID with the WebSocket connection
      (ws as any).userId = userId;

      ws.on("message", (message: string) => {
        try {
          const data = JSON.parse(message.toString());

          // Add sender information
          data.senderId = userId;
          data.timestamp = new Date().toISOString();

          // Broadcast message to all authenticated clients
          wss.clients.forEach((client) => {
            if (
              client !== ws &&
              client.readyState === WebSocket.OPEN &&
              (client as any).userId // Only send to authenticated clients
            ) {
              client.send(JSON.stringify(data));
            }
          });
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        console.log(`WebSocket connection closed for user: ${userId}`);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });
  });

  return httpServer;
}
