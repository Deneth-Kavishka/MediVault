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
  appointments,
  doctorAvailability,
  labTests as labTestsTable,
  prescriptions,
  prescriptionItems,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

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

  // Get current patient profile
  app.get("/api/patients/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient profile:", error);
      res.status(500).json({ message: "Failed to fetch patient profile" });
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

      // Enrich doctors with user information
      const enrichedDoctors = await Promise.all(
        doctors.map(async (doctor: any) => {
          const user = await storage.getUser(doctor.userId);
          return {
            ...doctor,
            firstName: user?.firstName || "Unknown",
            lastName: user?.lastName || "",
            email: user?.email || "",
          };
        })
      );

      res.json(enrichedDoctors);
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
  // DOCTOR AVAILABILITY ROUTES
  // ============================================================================

  // Create doctor availability
  app.post(
    "/api/doctor-availability",
    isDoctorOrAdmin,
    async (req: any, res) => {
      try {
        console.log("📍 Received availability data:", {
          ...req.body,
          availableDate: req.body.availableDate,
        });

        // Convert availableDate string to Date object
        const data = {
          ...req.body,
          availableDate: new Date(req.body.availableDate),
          // Set placeId to null if it's empty string
          placeId: req.body.placeId || null,
        };

        console.log("📍 Processed data for DB:", {
          ...data,
          availableDate: data.availableDate.toISOString(),
        });

        const availability = await storage.createDoctorAvailability(data);
        console.log("✅ Availability created successfully:", availability.id);
        res.status(201).json(availability);
      } catch (error: any) {
        console.error("❌ Error creating availability:", error);
        console.error("❌ Error details:", {
          message: error.message,
          code: error.code,
          detail: error.detail,
        });
        res.status(500).json({
          message: "Failed to create availability",
          error: error.message,
        });
      }
    }
  );

  // Get all doctor availability (admin)
  app.get("/api/doctor-availability", isAuthenticated, async (req, res) => {
    try {
      const availability = await storage.getAllDoctorAvailability();
      res.json(availability);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // Get doctor availability by doctor ID
  app.get(
    "/api/doctor-availability/doctor/:doctorId",
    isAuthenticated,
    async (req, res) => {
      try {
        const availability = await storage.getDoctorAvailabilityByDoctor(
          req.params.doctorId
        );
        res.json(availability);
      } catch (error) {
        console.error("Error fetching doctor availability:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch doctor availability" });
      }
    }
  );

  // Get doctor availability by location (for patient search)
  app.get(
    "/api/doctor-availability/location/:city",
    isAuthenticated,
    async (req, res) => {
      try {
        const availability = await storage.getDoctorAvailabilityByLocation(
          req.params.city
        );
        res.json(availability);
      } catch (error) {
        console.error("Error fetching availability by location:", error);
        res.status(500).json({ message: "Failed to fetch availability" });
      }
    }
  );

  // Search doctors by specialization and location
  app.get(
    "/api/doctor-availability/search",
    isAuthenticated,
    async (req, res) => {
      try {
        const { city, specialization } = req.query;
        let availability = await storage.getAllDoctorAvailability();

        // Filter by city if provided
        if (city) {
          availability = availability.filter((a) =>
            a.locationCity
              .toLowerCase()
              .includes((city as string).toLowerCase())
          );
        }

        // Join with doctor data to filter by specialization
        if (specialization) {
          const availabilityWithDoctors = await Promise.all(
            availability.map(async (avail) => {
              const doctor = await storage.getDoctor(avail.doctorId);
              return { ...avail, doctor };
            })
          );

          availability = availabilityWithDoctors
            .filter((a) =>
              a.doctor?.specialization
                ?.toLowerCase()
                .includes((specialization as string).toLowerCase())
            )
            .map(({ doctor, ...avail }) => avail);
        }

        res.json(availability);
      } catch (error) {
        console.error("Error searching availability:", error);
        res.status(500).json({ message: "Failed to search availability" });
      }
    }
  );

  // Update doctor availability
  app.patch(
    "/api/doctor-availability/:id",
    isDoctorOrAdmin,
    async (req, res) => {
      try {
        // Convert availableDate string to Date object if present
        const data = req.body.availableDate
          ? {
              ...req.body,
              availableDate: new Date(req.body.availableDate),
            }
          : req.body;

        const availability = await storage.updateDoctorAvailability(
          req.params.id,
          data
        );
        if (!availability) {
          return res.status(404).json({ message: "Availability not found" });
        }
        res.json(availability);
      } catch (error) {
        console.error("Error updating availability:", error);
        res.status(500).json({ message: "Failed to update availability" });
      }
    }
  );

  // Toggle doctor availability active/inactive (Admin only)
  app.patch(
    "/api/doctor-availability/:id/toggle",
    isAdmin,
    async (req, res) => {
      try {
        const { isActive } = req.body;

        if (typeof isActive !== "boolean") {
          return res
            .status(400)
            .json({ message: "isActive must be a boolean" });
        }

        const status = isActive ? "active" : "inactive";

        const availability = await storage.updateDoctorAvailability(
          req.params.id,
          {
            isActive,
            status,
            reactivationRequested: false, // Clear any pending reactivation request
            reactivationRequestedAt: null,
            updatedAt: new Date(),
          }
        );

        if (!availability) {
          return res.status(404).json({ message: "Availability not found" });
        }

        // Notify doctor about status change
        const doctor = await storage.getDoctor(availability.doctorId);
        if (doctor) {
          await storage.createNotification({
            recipientId: doctor.userId,
            type: "system",
            title: `Availability ${isActive ? "Activated" : "Deactivated"}`,
            message: `Your availability at ${
              availability.locationName
            } has been ${isActive ? "activated" : "deactivated"} by admin.`,
            relatedEntityId: availability.id,
          });
        }

        res.json(availability);
      } catch (error) {
        console.error("Error toggling availability:", error);
        res
          .status(500)
          .json({ message: "Failed to toggle availability status" });
      }
    }
  );

  // Request reactivation (Doctor only)
  app.patch(
    "/api/doctor-availability/:id/request-reactivation",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        if (user?.role !== "doctor") {
          return res.status(403).json({
            message: "Only doctors can request reactivation",
          });
        }

        const availability = await storage.getDoctorAvailability(req.params.id);
        if (!availability) {
          return res.status(404).json({ message: "Availability not found" });
        }

        // Verify doctor owns this availability
        const doctor = await storage.getDoctorByUserId(userId);
        if (doctor?.id !== availability.doctorId) {
          return res.status(403).json({
            message:
              "You can only request reactivation for your own availability",
          });
        }

        if (availability.isActive) {
          return res.status(400).json({
            message: "This availability is already active",
          });
        }

        const updated = await storage.updateDoctorAvailability(req.params.id, {
          reactivationRequested: true,
          reactivationRequestedAt: new Date(),
          updatedAt: new Date(),
        });

        // Notify admins about reactivation request
        const admins = await storage.getAllUsers();
        const adminUsers = admins.filter((u) => u.role === "admin");

        for (const admin of adminUsers) {
          await storage.createNotification({
            recipientId: admin.id,
            type: "system",
            title: "Availability Reactivation Request",
            message: `Dr. ${user.firstName} ${user.lastName} requested to reactivate availability at ${availability.locationName}`,
            relatedEntityId: updated.id,
          });
        }

        res.json(updated);
      } catch (error) {
        console.error("Error requesting reactivation:", error);
        res.status(500).json({ message: "Failed to request reactivation" });
      }
    }
  );

  // Get availability statistics (appointments details)
  app.get(
    "/api/doctor-availability/:id/stats",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        const availability = await storage.getDoctorAvailability(req.params.id);
        if (!availability) {
          return res.status(404).json({ message: "Availability not found" });
        }

        // Check permissions
        if (user?.role === "doctor") {
          const doctor = await storage.getDoctorByUserId(userId);
          if (doctor?.id !== availability.doctorId) {
            return res.status(403).json({
              message: "You can only view your own availability statistics",
            });
          }
        } else if (user?.role !== "admin") {
          return res.status(403).json({
            message: "Only doctors and admins can view availability statistics",
          });
        }

        // Get all appointments for this availability
        const allAppointments = await storage.getAllAppointments();
        const appointments = allAppointments.filter(
          (apt) => apt.availabilityId === req.params.id
        );

        // Calculate statistics
        const stats = {
          totalBooked: appointments.length,
          completed: appointments.filter((a) => a.status === "completed")
            .length,
          confirmed: appointments.filter((a) => a.status === "confirmed")
            .length,
          pending: appointments.filter((a) => a.status === "pending").length,
          cancelled: appointments.filter((a) => a.status === "cancelled")
            .length,
          cancellationRequested: appointments.filter(
            (a) => a.status === "cancellation_requested"
          ).length,
          maxPatients: availability.maxPatients,
          bookedCount: availability.bookedCount,
          availableSlots: availability.maxPatients - availability.bookedCount,
          appointments: appointments.map((apt) => ({
            id: apt.id,
            patientName: apt.patientName,
            appointmentDate: apt.appointmentDate,
            appointmentTime: apt.appointmentTime,
            status: apt.status,
            reason: apt.reason,
            completedAt: apt.completedAt,
            cancelledAt: apt.cancelledAt,
            cancellationReason: apt.cancellationReason,
            cancelledBy: apt.cancelledBy,
          })),
        };

        res.json(stats);
      } catch (error) {
        console.error("Error fetching availability stats:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch availability statistics" });
      }
    }
  );

  // Delete doctor availability
  app.delete(
    "/api/doctor-availability/:id",
    isDoctorOrAdmin,
    async (req, res) => {
      try {
        await storage.deleteDoctorAvailability(req.params.id);
        res.json({ message: "Availability deleted successfully" });
      } catch (error) {
        console.error("Error deleting availability:", error);
        res.status(500).json({ message: "Failed to delete availability" });
      }
    }
  );

  // ============================================================================
  // APPOINTMENT ROUTES
  // ============================================================================
  app.post("/api/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertAppointmentSchema.parse({
        ...req.body,
        appointmentDate: new Date(req.body.appointmentDate), // Convert string to Date
        status: "pending", // Default status
      });
      const appointment = await storage.createAppointment(validatedData);

      // Get doctor's userId for notification
      const doctor = await storage.getDoctor(req.body.doctorId);

      if (doctor) {
        // Create notification for doctor
        await storage.createNotification({
          recipientId: doctor.userId,
          type: "appointment",
          title: "New Appointment Request",
          message: `New appointment requested for ${new Date(
            req.body.appointmentDate
          ).toLocaleString()}`,
          relatedEntityId: appointment.id,
        });
      }

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
      } else if (user?.role === "admin") {
        // Admin can see all appointments - already enriched from storage
        appointments = await storage.getAllAppointments();
      }

      // Data is already enriched with JOINs in storage methods
      console.log(
        `Fetched ${appointments.length} appointments for ${user?.role}`
      );
      if (appointments.length > 0) {
        console.log(`Sample appointment:`, {
          id: appointments[0].id,
          patientName: appointments[0].patientName,
          doctorName: appointments[0].doctorName,
          specialization: appointments[0].specialization,
          status: appointments[0].status,
        });
      }

      // Prevent caching to ensure fresh data
      res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
        Expires: "0",
      });

      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.patch(
    "/api/appointments/:id/status",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);
        const { status, cancellationReason, cancelledBy } = req.body;

        // Check permissions
        // Admin can update any status
        // Patient can cancel their own appointments
        if (user?.role !== "admin") {
          if (status === "cancelled" && user?.role === "patient") {
            // Allow patient to cancel their own appointment
            const appointment = await storage.getAppointment(req.params.id);
            if (!appointment) {
              return res.status(404).json({ message: "Appointment not found" });
            }
            const patient = await storage.getPatientByUserId(userId);
            if (patient?.id !== appointment.patientId) {
              return res.status(403).json({
                message: "You can only cancel your own appointments",
              });
            }
          } else {
            return res.status(403).json({
              message: "Only admins can update appointment status",
            });
          }
        }

        const currentAppointment = await storage.getAppointment(req.params.id);
        if (!currentAppointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // Update appointment with proper timestamps
        const updateData: any = { status, updatedAt: new Date() };

        // Set timestamps based on status change
        if (
          status === "cancelled" &&
          currentAppointment.status !== "cancelled"
        ) {
          updateData.cancelledAt = new Date();
          if (cancellationReason) {
            updateData.cancellationReason = cancellationReason;
          }
          if (cancelledBy) {
            updateData.cancelledBy = cancelledBy; // 'patient', 'doctor', 'admin'
          }

          // Decrement booked count
          if (currentAppointment.availabilityId) {
            await db
              .update(doctorAvailability)
              .set({
                bookedCount: sql`GREATEST(0, ${doctorAvailability.bookedCount} - 1)`,
                updatedAt: new Date(),
              })
              .where(
                eq(doctorAvailability.id, currentAppointment.availabilityId)
              );
          }
        } else if (
          status === "confirmed" &&
          currentAppointment.status === "pending"
        ) {
          updateData.approvedAt = new Date();
          updateData.approvedBy = userId;
        } else if (
          status === "confirmed" &&
          currentAppointment.status === "cancellation_requested"
        ) {
          // Rejecting cancellation request
          updateData.cancellationReason = null;
          updateData.cancellationRequestedBy = null;
          updateData.cancellationRequestedAt = null;
        }

        const [updated] = await db
          .update(appointments)
          .set(updateData)
          .where(eq(appointments.id, req.params.id))
          .returning();

        // Send notifications
        const patient = await storage.getPatient(updated.patientId);
        const doctor = await storage.getDoctor(updated.doctorId);

        if (status === "cancelled") {
          // Notify patient
          if (patient) {
            const cancelledByText =
              cancelledBy === "patient"
                ? "you"
                : cancelledBy === "doctor"
                ? "the doctor"
                : "admin";

            await storage.createNotification({
              recipientId: patient.userId,
              type: "appointment",
              title: "Appointment Cancelled",
              message: `Your appointment has been cancelled by ${cancelledByText}${
                cancellationReason ? `. Reason: ${cancellationReason}` : ""
              }.`,
              relatedEntityId: updated.id,
            });
          }

          // Notify doctor (unless doctor is the one who cancelled)
          if (doctor && cancelledBy !== "doctor") {
            const cancelledByText =
              cancelledBy === "patient" ? "the patient" : "admin";

            await storage.createNotification({
              recipientId: doctor.userId,
              type: "appointment",
              title: "Appointment Cancelled",
              message: `An appointment has been cancelled by ${cancelledByText}${
                cancellationReason ? `. Reason: ${cancellationReason}` : ""
              }.`,
              relatedEntityId: updated.id,
            });
          }
        } else if (
          status === "confirmed" &&
          currentAppointment.status === "pending"
        ) {
          // Notify patient when appointment is confirmed
          if (patient) {
            await storage.createNotification({
              recipientId: patient.userId,
              type: "appointment",
              title: "Appointment Confirmed",
              message: `Your appointment has been confirmed by ${
                user?.firstName || "admin"
              }.`,
              relatedEntityId: updated.id,
            });
          }
        }

        res.json(updated);
      } catch (error) {
        console.error("Error updating appointment:", error);
        res.status(500).json({ message: "Failed to update appointment" });
      }
    }
  );

  app.patch(
    "/api/appointments/:id/approve",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);
        const { appointmentTime, notes } = req.body;

        // Only doctors and admins can approve
        if (user?.role !== "doctor" && user?.role !== "admin") {
          return res.status(403).json({
            message: "Only doctors and admins can approve appointments",
          });
        }

        // Get the appointment
        const appointment = await storage.getAppointment(req.params.id);
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // If doctor, verify they own this appointment
        if (user?.role === "doctor") {
          const doctor = await storage.getDoctorByUserId(userId);
          if (doctor?.id !== appointment.doctorId) {
            return res.status(403).json({
              message: "You can only approve your own appointments",
            });
          }
        }

        // Validate appointment time is provided
        if (!appointmentTime || !appointmentTime.trim()) {
          return res.status(400).json({
            message: "Appointment time is required",
          });
        }

        // Update appointment with approved status, time, notes, and approver info
        const updateData: any = {
          status: "confirmed",
          appointmentTime: appointmentTime,
          approvedAt: new Date(),
          approvedBy: userId,
          updatedAt: new Date(),
        };

        // Add notes if provided (append to existing notes)
        if (notes && notes.trim()) {
          const approvalNote = `[Approved by ${user.firstName} ${user.lastName}]: ${notes}`;
          updateData.notes = appointment.notes
            ? `${appointment.notes}\n\n${approvalNote}`
            : approvalNote;
        }

        const [updated] = await db
          .update(appointments)
          .set(updateData)
          .where(eq(appointments.id, req.params.id))
          .returning();

        if (!updated) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // Create notification for patient
        const patient = await storage.getPatient(updated.patientId);
        if (patient) {
          const notificationMessage =
            notes && notes.trim()
              ? `Your appointment has been confirmed for ${appointmentTime}. Note: ${notes}`
              : `Your appointment has been confirmed for ${appointmentTime}`;

          await storage.createNotification({
            recipientId: patient.userId,
            type: "appointment",
            title: "Appointment Confirmed",
            message: notificationMessage,
            relatedEntityId: updated.id,
          });
        }

        res.json(updated);
      } catch (error) {
        console.error("Error approving appointment:", error);
        res.status(500).json({ message: "Failed to approve appointment" });
      }
    }
  );

  // Complete appointment (Doctor only)
  app.patch(
    "/api/appointments/:id/complete",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);
        const {
          notes,
          actualTime,
          prescriptionNeeded,
          prescriptionValidity,
          medicines,
          labTestsNeeded,
          labTests,
        } = req.body;

        // Only doctors and admins can complete appointments
        if (user?.role !== "doctor" && user?.role !== "admin") {
          return res.status(403).json({
            message: "Only doctors and admins can complete appointments",
          });
        }

        // Get the appointment
        const appointment = await storage.getAppointment(req.params.id);
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // If doctor, verify they own this appointment
        if (user?.role === "doctor") {
          const doctor = await storage.getDoctorByUserId(userId);
          if (doctor?.id !== appointment.doctorId) {
            return res.status(403).json({
              message: "You can only complete your own appointments",
            });
          }
        }

        // Only confirmed appointments can be completed
        if (appointment.status !== "confirmed") {
          return res.status(400).json({
            message: "Only confirmed appointments can be completed",
          });
        }

        // Validate actual time is provided
        if (!actualTime) {
          return res.status(400).json({
            message: "Actual visit time is required",
          });
        }

        // Update appointment with completed status
        const updateData: any = {
          status: "completed",
          completedAt: new Date(),
          completedBy: userId,
          actualVisitTime: actualTime,
          completionNotes: notes || "",
          prescriptionNeeded: prescriptionNeeded || false,
          labTestsNeeded: labTestsNeeded || false,
          updatedAt: new Date(),
        };

        const [updated] = await db
          .update(appointments)
          .set(updateData)
          .where(eq(appointments.id, req.params.id))
          .returning();

        if (!updated) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // Get doctor
        const doctor = await storage.getDoctorByUserId(userId);
        if (!doctor) {
          return res.status(404).json({ message: "Doctor profile not found" });
        }

        // Create prescription if requested
        let prescriptionId = null;
        if (
          prescriptionNeeded &&
          medicines &&
          Array.isArray(medicines) &&
          medicines.length > 0
        ) {
          // Calculate expiry date based on validity days
          const validityDays = prescriptionValidity || 90;
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + validityDays);

          // Create prescription
          const [prescription] = await db
            .insert(prescriptions)
            .values({
              patientId: appointment.patientId,
              doctorId: doctor.id,
              appointmentId: updated.id,
              dateIssued: new Date(),
              expiryDate: expiryDate,
              validityDays: validityDays,
              status: "active",
              notes: notes || "",
            })
            .returning();

          prescriptionId = prescription.id;

          // Create prescription items for each medicine
          for (const medicine of medicines) {
            if (
              medicine.name &&
              medicine.dosage &&
              medicine.frequency &&
              medicine.duration
            ) {
              await db.insert(prescriptionItems).values({
                prescriptionId: prescription.id,
                medicineName: medicine.name,
                dosage: medicine.dosage,
                frequency: medicine.frequency,
                duration: medicine.duration,
                quantity: 1, // Default quantity
                instructions: medicine.instructions || "",
              });
            }
          }

          // Notify patient about prescription
          const patient = await storage.getPatient(updated.patientId);
          if (patient) {
            await storage.createNotification({
              recipientId: patient.userId,
              type: "prescription",
              title: "New Prescription Available",
              message: `Dr. ${user.firstName} ${
                user.lastName
              } has created a prescription with ${
                medicines.length
              } medicine(s). Valid until ${expiryDate.toLocaleDateString()}`,
              relatedEntityId: prescription.id,
            });
          }
        }

        // Create lab test records if requested
        if (
          labTestsNeeded &&
          labTests &&
          Array.isArray(labTests) &&
          labTests.length > 0
        ) {
          for (const testName of labTests) {
            await db.insert(labTestsTable).values({
              patientId: appointment.patientId,
              doctorId: doctor.id,
              testType: "Laboratory Test",
              testName: testName,
              status: "pending",
              requestDate: new Date(),
              notes: `Requested during appointment completion on ${new Date().toLocaleDateString()}`,
            });
          }

          // Notify patient about required lab tests
          const patient = await storage.getPatient(updated.patientId);
          if (patient) {
            await storage.createNotification({
              recipientId: patient.userId,
              type: "lab_test",
              title: "Lab Tests Required",
              message: `Dr. ${user.firstName} ${user.lastName} has requested ${labTests.length} lab test(s). Please book an appointment with a lab to complete them.`,
              relatedEntityId: updated.id,
            });
          }
        }

        // Create notification for patient about completion
        const patient = await storage.getPatient(updated.patientId);
        if (patient) {
          let notificationMessage =
            "Your appointment has been marked as completed";

          if (prescriptionNeeded) {
            notificationMessage += ". A prescription has been prepared for you";
          }

          if (labTestsNeeded && labTests?.length > 0) {
            notificationMessage += `. ${labTests.length} lab test(s) have been requested`;
          }

          await storage.createNotification({
            recipientId: patient.userId,
            type: "appointment",
            title: "Appointment Completed",
            message: notificationMessage,
            relatedEntityId: updated.id,
          });
        }

        res.json({
          appointment: updated,
          prescriptionCreated: prescriptionNeeded,
          prescriptionId: prescriptionId,
          labTestsCreated: labTestsNeeded ? labTests?.length || 0 : 0,
        });
      } catch (error) {
        console.error("Error completing appointment:", error);
        res.status(500).json({ message: "Failed to complete appointment" });
      }
    }
  );

  // Reschedule appointment (Doctor or Admin)
  app.patch(
    "/api/appointments/:id/reschedule",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);
        const { appointmentDate, appointmentTime, reason } = req.body;

        // Only doctors and admins can reschedule
        if (user?.role !== "doctor" && user?.role !== "admin") {
          return res.status(403).json({
            message: "Only doctors and admins can reschedule appointments",
          });
        }

        // Get the appointment
        const appointment = await storage.getAppointment(req.params.id);
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // If doctor, verify they own this appointment
        if (user?.role === "doctor") {
          const doctor = await storage.getDoctorByUserId(userId);
          if (doctor?.id !== appointment.doctorId) {
            return res.status(403).json({
              message: "You can only reschedule your own appointments",
            });
          }
        }

        // Cannot reschedule completed or cancelled appointments
        if (
          appointment.status === "completed" ||
          appointment.status === "cancelled"
        ) {
          return res.status(400).json({
            message: "Cannot reschedule completed or cancelled appointments",
          });
        }

        // Validate new date and time
        if (!appointmentDate) {
          return res.status(400).json({
            message: "New appointment date is required",
          });
        }

        // Update appointment
        const updateData: any = {
          appointmentDate: new Date(appointmentDate),
          updatedAt: new Date(),
        };

        if (appointmentTime) {
          updateData.appointmentTime = appointmentTime;
        }

        // Add reschedule note
        const rescheduleNote = `[Rescheduled by ${user.firstName} ${
          user.lastName
        }]${reason ? `: ${reason}` : ""}`;
        updateData.notes = appointment.notes
          ? `${appointment.notes}\n\n${rescheduleNote}`
          : rescheduleNote;

        const [updated] = await db
          .update(appointments)
          .set(updateData)
          .where(eq(appointments.id, req.params.id))
          .returning();

        if (!updated) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        const newDateStr = new Date(appointmentDate).toLocaleDateString();
        const timeStr = appointmentTime || appointment.appointmentTime || "TBD";

        // Create notification for patient
        const patient = await storage.getPatient(updated.patientId);
        if (patient) {
          await storage.createNotification({
            recipientId: patient.userId,
            type: "appointment",
            title: "Appointment Rescheduled",
            message: `Your appointment has been rescheduled to ${newDateStr} at ${timeStr}${
              reason ? `. Reason: ${reason}` : ""
            }`,
            relatedEntityId: updated.id,
          });
        }

        // Create notification for doctor (if admin is rescheduling)
        if (user?.role === "admin") {
          const doctor = await storage.getDoctor(updated.doctorId);
          if (doctor) {
            await storage.createNotification({
              recipientId: doctor.userId,
              type: "appointment",
              title: "Appointment Rescheduled",
              message: `Admin has rescheduled an appointment to ${newDateStr} at ${timeStr}${
                reason ? `. Reason: ${reason}` : ""
              }`,
              relatedEntityId: updated.id,
            });
          }
        }

        res.json(updated);
      } catch (error) {
        console.error("Error rescheduling appointment:", error);
        res.status(500).json({ message: "Failed to reschedule appointment" });
      }
    }
  );

  // Request appointment cancellation (Doctor)
  app.patch(
    "/api/appointments/:id/request-cancellation",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);
        const { reason } = req.body;

        // Only doctors can request cancellation
        if (user?.role !== "doctor") {
          return res.status(403).json({
            message: "Only doctors can request appointment cancellation",
          });
        }

        const appointment = await storage.getAppointment(req.params.id);
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // Verify doctor owns this appointment
        const doctor = await storage.getDoctorByUserId(userId);
        if (doctor?.id !== appointment.doctorId) {
          return res.status(403).json({
            message:
              "You can only request cancellation for your own appointments",
          });
        }

        if (!reason || !reason.trim()) {
          return res.status(400).json({
            message: "Cancellation reason is required",
          });
        }

        // Update appointment with cancellation request
        const [updated] = await db
          .update(appointments)
          .set({
            status: "cancellation_requested",
            cancellationReason: reason,
            cancellationRequestedBy: userId,
            cancellationRequestedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(appointments.id, req.params.id))
          .returning();

        // Notify admins about cancellation request
        const admins = await storage.getAllUsers();
        const adminUsers = admins.filter((u) => u.role === "admin");

        for (const admin of adminUsers) {
          await storage.createNotification({
            recipientId: admin.id,
            type: "appointment",
            title: "Cancellation Request",
            message: `Dr. ${user.firstName} ${user.lastName} requested to cancel an appointment. Reason: ${reason}`,
            relatedEntityId: updated.id,
          });
        }

        // Notify patient
        const patient = await storage.getPatient(updated.patientId);
        if (patient) {
          await storage.createNotification({
            recipientId: patient.userId,
            type: "appointment",
            title: "Cancellation Pending",
            message: `Your doctor has requested to cancel the appointment. Awaiting admin approval.`,
            relatedEntityId: updated.id,
          });
        }

        res.json(updated);
      } catch (error) {
        console.error("Error requesting cancellation:", error);
        res.status(500).json({ message: "Failed to request cancellation" });
      }
    }
  );

  // Approve cancellation request (Admin)
  app.patch(
    "/api/appointments/:id/approve-cancellation",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        // Only admins can approve cancellation
        if (user?.role !== "admin") {
          return res.status(403).json({
            message: "Only admins can approve cancellation requests",
          });
        }

        const appointment = await storage.getAppointment(req.params.id);
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        if (appointment.status !== "cancellation_requested") {
          return res.status(400).json({
            message: "No pending cancellation request for this appointment",
          });
        }

        // Update appointment to cancelled
        const [updated] = await db
          .update(appointments)
          .set({
            status: "cancelled",
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(appointments.id, req.params.id))
          .returning();

        // Decrement booked count if applicable
        if (updated.availabilityId) {
          await db
            .update(doctorAvailability)
            .set({
              bookedCount: sql`GREATEST(0, ${doctorAvailability.bookedCount} - 1)`,
              updatedAt: new Date(),
            })
            .where(eq(doctorAvailability.id, updated.availabilityId));
        }

        // Notify patient
        const patient = await storage.getPatient(updated.patientId);
        if (patient) {
          await storage.createNotification({
            recipientId: patient.userId,
            type: "appointment",
            title: "Appointment Cancelled",
            message: `Your appointment has been cancelled by the doctor. Reason: ${
              appointment.cancellationReason || "Not specified"
            }`,
            relatedEntityId: updated.id,
          });
        }

        // Notify doctor
        if (appointment.cancellationRequestedBy) {
          await storage.createNotification({
            recipientId: appointment.cancellationRequestedBy,
            type: "appointment",
            title: "Cancellation Approved",
            message: `Your cancellation request has been approved by admin.`,
            relatedEntityId: updated.id,
          });
        }

        res.json(updated);
      } catch (error) {
        console.error("Error approving cancellation:", error);
        res.status(500).json({ message: "Failed to approve cancellation" });
      }
    }
  );

  // Reject cancellation request (Admin)
  app.patch(
    "/api/appointments/:id/reject-cancellation",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);
        const { reason } = req.body;

        // Only admins can reject cancellation
        if (user?.role !== "admin") {
          return res.status(403).json({
            message: "Only admins can reject cancellation requests",
          });
        }

        const appointment = await storage.getAppointment(req.params.id);
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        if (appointment.status !== "cancellation_requested") {
          return res.status(400).json({
            message: "No pending cancellation request for this appointment",
          });
        }

        if (!reason || !reason.trim()) {
          return res.status(400).json({
            message: "Rejection reason is required",
          });
        }

        // Update appointment back to confirmed status with rejection reason
        const [updated] = await db
          .update(appointments)
          .set({
            status: "confirmed",
            cancellationRejectedReason: reason,
            cancellationReason: null, // Clear the cancellation reason
            cancellationRequestedBy: null,
            cancellationRequestedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(appointments.id, req.params.id))
          .returning();

        // Notify doctor
        if (appointment.cancellationRequestedBy) {
          await storage.createNotification({
            recipientId: appointment.cancellationRequestedBy,
            type: "appointment",
            title: "Cancellation Request Rejected",
            message: `Admin rejected your cancellation request. Reason: ${reason}`,
            relatedEntityId: updated.id,
          });
        }

        // Notify patient
        const patient = await storage.getPatient(updated.patientId);
        if (patient) {
          await storage.createNotification({
            recipientId: patient.userId,
            type: "appointment",
            title: "Appointment Confirmed",
            message: `Your appointment remains scheduled as the cancellation request was not approved.`,
            relatedEntityId: updated.id,
          });
        }

        res.json(updated);
      } catch (error) {
        console.error("Error rejecting cancellation:", error);
        res.status(500).json({ message: "Failed to reject cancellation" });
      }
    }
  );

  app.delete(
    "/api/appointments/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        // Get the appointment to check ownership
        const appointment = await storage.getAppointment(req.params.id);
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // Check if appointment is cancelled and older than 24 hours
        if (appointment.status !== "cancelled" || !appointment.cancelledAt) {
          return res.status(403).json({
            message: "Only cancelled appointments can be deleted",
          });
        }

        const cancelledTime = new Date(appointment.cancelledAt).getTime();
        const now = new Date().getTime();
        const hoursSinceCancelled = (now - cancelledTime) / (1000 * 60 * 60);

        if (hoursSinceCancelled < 24) {
          return res.status(403).json({
            message:
              "Cancelled appointments can only be deleted after 24 hours",
          });
        }

        // Check authorization - ONLY doctor involved or admin can delete
        let authorized = false;

        if (user?.role === "admin") {
          authorized = true;
        } else if (user?.role === "doctor") {
          const doctor = await storage.getDoctorByUserId(userId);
          authorized = doctor?.id === appointment.doctorId;
        }
        // Patients cannot delete appointments

        if (!authorized) {
          return res.status(403).json({
            message: "You don't have permission to delete this appointment",
          });
        }

        const deleted = await storage.deleteAppointment(req.params.id);
        if (!deleted) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        res.json({ message: "Appointment deleted successfully" });
      } catch (error) {
        console.error("Error deleting appointment:", error);
        res.status(500).json({ message: "Failed to delete appointment" });
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

  // Mark all notifications as read for current user
  app.patch(
    "/api/notifications/mark-all-read",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        await storage.markAllNotificationsAsRead(userId);
        res.json({ message: "All notifications marked as read" });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res
          .status(500)
          .json({ message: "Failed to mark all notifications as read" });
      }
    }
  );

  // ============================================================================
  // CHAT MESSAGE ROUTES
  // ============================================================================

  // Get all users for starting new conversations
  app.get("/api/users/available", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const allUsers = await storage.getAllUsers();
      // Filter out current user and return basic info
      const availableUsers = allUsers
        .filter((u) => u.id !== currentUserId)
        .map((u) => ({
          id: u.id,
          name: u.fullName || u.username,
          role: u.role,
          username: u.username,
        }));
      res.json(availableUsers);
    } catch (error) {
      console.error("Error fetching available users:", error);
      res.status(500).json({ message: "Failed to fetch available users" });
    }
  });

  // Get conversation list (users you've chatted with)
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const conversations = await storage.getConversations(currentUserId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  }); // Get messages with a specific user
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

  // Send a new message
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

  // Mark messages as read
  app.patch(
    "/api/messages/:userId/read",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const currentUserId = req.user.id;
        const otherUserId = req.params.userId;
        await storage.markMessagesAsRead(currentUserId, otherUserId);
        res.json({ message: "Messages marked as read" });
      } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ message: "Failed to mark messages as read" });
      }
    }
  );

  // Delete a message
  app.delete(
    "/api/messages/:messageId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const currentUserId = req.user.id;
        const messageId = req.params.messageId;

        // Verify the message belongs to the current user
        const message = await storage.getChatMessageById(messageId);
        if (!message || message.senderId !== currentUserId) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        await storage.deleteChatMessage(messageId);

        // Broadcast delete event via WebSocket
        broadcastToUser(message.senderId, {
          type: "message_deleted",
          data: {
            messageId,
            senderId: message.senderId,
            receiverId: message.receiverId,
          },
        });
        broadcastToUser(message.receiverId, {
          type: "message_deleted",
          data: {
            messageId,
            senderId: message.senderId,
            receiverId: message.receiverId,
          },
        });

        res.json({ message: "Message deleted" });
      } catch (error) {
        console.error("Error deleting message:", error);
        res.status(500).json({ message: "Failed to delete message" });
      }
    }
  );

  // Edit a message
  app.patch(
    "/api/messages/:messageId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const currentUserId = req.user.id;
        const messageId = req.params.messageId;
        const { message } = req.body;

        if (!message || !message.trim()) {
          return res.status(400).json({ message: "Message cannot be empty" });
        }

        // Verify the message belongs to the current user
        const existingMessage = await storage.getChatMessageById(messageId);
        if (!existingMessage || existingMessage.senderId !== currentUserId) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        await storage.updateChatMessage(messageId, message.trim());

        // Broadcast edit event via WebSocket
        broadcastToUser(existingMessage.senderId, {
          type: "message_edited",
          data: {
            messageId,
            message: message.trim(),
            senderId: existingMessage.senderId,
            receiverId: existingMessage.receiverId,
          },
        });
        broadcastToUser(existingMessage.receiverId, {
          type: "message_edited",
          data: {
            messageId,
            message: message.trim(),
            senderId: existingMessage.senderId,
            receiverId: existingMessage.receiverId,
          },
        });

        res.json({ message: "Message updated" });
      } catch (error) {
        console.error("Error updating message:", error);
        res.status(500).json({ message: "Failed to update message" });
      }
    }
  );

  // ============================================================================
  // ADMIN ROUTES
  // ============================================================================

  // Get system statistics
  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching system stats:", error);
      res.status(500).json({ message: "Failed to fetch system statistics" });
    }
  });

  // Create new user (admin only)
  app.post("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const {
        username,
        password,
        email,
        firstName,
        lastName,
        role,
        patientData,
      } = req.body;

      // Validate required fields
      if (!username || !password || !role) {
        return res
          .status(400)
          .json({ message: "Username, password, and role are required" });
      }

      // Hash password
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.upsertUser({
        username,
        password: hashedPassword,
        email,
        firstName,
        lastName,
        role,
      });

      // If role is patient, create patient record with RFID
      if (role === "patient" && patientData) {
        await storage.createPatient({
          userId: user.id,
          nic: patientData.nic,
          rfid: patientData.rfid, // RFID is required for patients
          dateOfBirth: patientData.dateOfBirth
            ? new Date(patientData.dateOfBirth)
            : undefined,
          gender: patientData.gender,
          contactInfo: patientData.contactInfo,
          address: patientData.address,
          bloodType: patientData.bloodType,
          allergies: patientData.allergies,
        });
      }

      // If role is doctor, create doctor record
      if (role === "doctor" && req.body.doctorData) {
        await storage.createDoctor({
          userId: user.id,
          specialization: req.body.doctorData.specialization,
          licenseNumber: req.body.doctorData.licenseNumber,
          qualifications: req.body.doctorData.qualifications,
          experience: req.body.doctorData.experience,
        });
      }

      // If role is pharmacist, create pharmacist record
      if (role === "pharmacist" && req.body.pharmacistData) {
        await storage.createPharmacist({
          userId: user.id,
          licenseNumber: req.body.pharmacistData.licenseNumber,
        });
      }

      // If role is lab_technician, create lab technician record
      if (role === "lab_technician" && req.body.labTechData) {
        await storage.createLabTechnician({
          userId: user.id,
          certificationNumber: req.body.labTechData.certificationNumber,
        });
      }

      res.status(201).json({ ...user, password: undefined });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res
        .status(400)
        .json({ message: error.message || "Failed to create user" });
    }
  });

  // Get all users (with optional role filter)
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const { role } = req.query;
      const users = role
        ? await storage.getUsersByRole(role as string)
        : await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get deactivated users
  app.get("/api/admin/users/deactivated", isAdmin, async (req, res) => {
    try {
      const users = await storage.getDeactivatedUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching deactivated users:", error);
      res.status(500).json({ message: "Failed to fetch deactivated users" });
    }
  });

  // Get specific user by ID
  app.get("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`Fetching user details for: ${user.username} (${user.role})`);

      // Fetch role-specific data
      let roleData = null;
      if (user.role === "patient") {
        roleData = await storage.getPatientByUserId(req.params.id);
        console.log("Patient data fetched:", roleData);
      } else if (user.role === "doctor") {
        roleData = await storage.getDoctorByUserId(req.params.id);
        console.log("Doctor data fetched:", roleData);
      } else if (user.role === "pharmacist") {
        roleData = await storage.getPharmacistByUserId(req.params.id);
        console.log("Pharmacist data fetched:", roleData);
      } else if (user.role === "lab_technician") {
        roleData = await storage.getLabTechnicianByUserId(req.params.id);
        console.log("Lab technician data fetched:", roleData);
      }

      const response = { ...user, roleData };
      console.log("Sending response with roleData:", !!roleData);
      res.json(response);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user
  app.patch("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Prevent updating sensitive fields directly
      delete updateData.password;

      // Extract role-specific data if present
      const patientData = updateData.patientData;
      const doctorData = updateData.doctorData;
      const pharmacistData = updateData.pharmacistData;
      const labTechData = updateData.labTechData;

      // Remove role-specific data from user update
      delete updateData.patientData;
      delete updateData.doctorData;
      delete updateData.pharmacistData;
      delete updateData.labTechData;

      // Update user basic info
      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update role-specific data if provided
      if (patientData && user.role === "patient") {
        const patient = await storage.getPatientByUserId(id);
        if (patient) {
          await storage.updatePatient(patient.id, patientData);
        }
      }

      if (doctorData && user.role === "doctor") {
        const doctor = await storage.getDoctorByUserId(id);
        if (doctor) {
          await storage.updateDoctor(doctor.id, doctorData);
        }
      }

      if (pharmacistData && user.role === "pharmacist") {
        const pharmacist = await storage.getPharmacistByUserId(id);
        if (pharmacist) {
          await storage.updatePharmacist(pharmacist.id, pharmacistData);
        }
      }

      if (labTechData && user.role === "lab_technician") {
        const labTech = await storage.getLabTechnicianByUserId(id);
        if (labTech) {
          await storage.updateLabTechnician(labTech.id, labTechData);
        }
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Deactivate user (soft delete)
  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent deactivating self
      if ((req as any).user.id === id) {
        return res
          .status(400)
          .json({ message: "Cannot deactivate your own account" });
      }

      const user = await storage.deactivateUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deactivated successfully", user });
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ message: "Failed to deactivate user" });
    }
  });

  // Reactivate user
  app.patch("/api/admin/users/:id/reactivate", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.reactivateUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User reactivated successfully", user });
    } catch (error) {
      console.error("Error reactivating user:", error);
      res.status(500).json({ message: "Failed to reactivate user" });
    }
  });

  // ============================================================================
  // ENHANCED ADMIN DASHBOARD ROUTES
  // ============================================================================

  // Activity Timeline (last 10 actions)
  app.get("/api/admin/activity-timeline", isAdmin, async (req, res) => {
    try {
      const logs = await storage.getAuditLogs(10);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity timeline:", error);
      res.status(500).json({ message: "Failed to fetch activity timeline" });
    }
  });

  // System Health Monitor
  app.get("/api/admin/system-health", isAdmin, async (req, res) => {
    try {
      const startTime = process.uptime();
      const uptimeHours = Math.floor(startTime / 3600);
      const uptimeMinutes = Math.floor((startTime % 3600) / 60);

      // Test database connection
      let dbStatus = "healthy";
      try {
        await storage.getAllUsers();
      } catch {
        dbStatus = "error";
      }

      res.json({
        database: dbStatus,
        uptime: `${uptimeHours}h ${uptimeMinutes}m`,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
        status: dbStatus === "healthy" ? "operational" : "degraded",
      });
    } catch (error) {
      console.error("Error fetching system health:", error);
      res.status(500).json({ message: "Failed to fetch system health" });
    }
  });

  // Pending Appointment Approvals
  app.get("/api/admin/pending-appointments", isAdmin, async (req, res) => {
    try {
      const appointments = await storage.getAllAppointments();
      const pending = appointments.filter(
        (apt: any) => apt.status === "pending"
      );
      res.json(pending);
    } catch (error) {
      console.error("Error fetching pending appointments:", error);
      res.status(500).json({ message: "Failed to fetch pending appointments" });
    }
  });

  // Revenue Chart (last 30 days)
  app.get("/api/admin/revenue-chart", isAdmin, async (req, res) => {
    try {
      const payments = await storage.getAllPayments();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Group by date
      const revenueByDate = new Map<string, number>();
      payments
        .filter((p: any) => new Date(p.paymentDate) >= thirtyDaysAgo)
        .forEach((p: any) => {
          const date = new Date(p.paymentDate).toISOString().split("T")[0];
          revenueByDate.set(
            date,
            (revenueByDate.get(date) || 0) + parseFloat(p.amount)
          );
        });

      const chartData = Array.from(revenueByDate.entries()).map(
        ([date, revenue]) => ({
          date,
          revenue: Math.round(revenue * 100) / 100,
        })
      );

      res.json(chartData);
    } catch (error) {
      console.error("Error fetching revenue chart:", error);
      res.status(500).json({ message: "Failed to fetch revenue data" });
    }
  });

  // User Growth Chart (last 12 months)
  app.get("/api/admin/user-growth-chart", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      // Group by month
      const usersByMonth = new Map<string, number>();
      users
        .filter((u: any) => new Date(u.createdAt) >= twelveMonthsAgo)
        .forEach((u: any) => {
          const month = new Date(u.createdAt).toISOString().substring(0, 7);
          usersByMonth.set(month, (usersByMonth.get(month) || 0) + 1);
        });

      const chartData = Array.from(usersByMonth.entries())
        .map(([month, count]) => ({ month, users: count }))
        .sort((a, b) => a.month.localeCompare(b.month));

      res.json(chartData);
    } catch (error) {
      console.error("Error fetching user growth chart:", error);
      res.status(500).json({ message: "Failed to fetch user growth data" });
    }
  });

  // ============================================================================
  // SYSTEM SETTINGS ROUTES
  // ============================================================================

  // Get system settings
  app.get("/api/admin/settings", isAdmin, async (req, res) => {
    try {
      // Return default settings (can be stored in database later)
      const settings = {
        systemName: "MediVault Healthcare",
        systemEmail: "admin@medivault.com",
        systemPhone: "+1-234-567-8900",
        systemAddress: "123 Healthcare Ave, Medical City",
        appointmentDuration: 30,
        appointmentSlotInterval: 15,
        maxAppointmentsPerDay: 20,
        enableEmailNotifications: true,
        enableSmsNotifications: false,
        autoBackupEnabled: true,
        backupFrequency: "daily",
        sessionTimeout: 30,
      };
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update system settings
  app.put("/api/admin/settings", isAdmin, async (req, res) => {
    try {
      // In a real implementation, save to database
      const settings = req.body;
      console.log("Settings updated:", settings);
      res.json({ message: "Settings updated successfully", settings });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Create database backup
  app.post("/api/admin/backup", isAdmin, async (req, res) => {
    try {
      // Use the existing export script
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execPromise = promisify(exec);

      res.setHeader("Content-Type", "application/sql");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="medivault-backup-${
          new Date().toISOString().split("T")[0]
        }.sql"`
      );

      // Simple backup response (in production, use proper pg_dump)
      res.send(
        "-- MediVault Database Backup\\n-- Generated on: " +
          new Date().toISOString()
      );
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ message: "Failed to create backup" });
    }
  });

  // ============================================================================
  // WEBSOCKET FOR REAL-TIME CHAT
  // ============================================================================
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Track online users: Map of userId -> Set of WebSocket connections (for multi-tab support)
  const onlineUsers = new Map<string, Set<WebSocket>>();

  // Helper function to broadcast to specific user
  const broadcastToUser = (userId: string, data: any) => {
    let sent = 0;
    wss.clients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        (client as any).userId === userId
      ) {
        client.send(JSON.stringify(data));
        sent++;
      }
    });
    console.log(`📡 Broadcast to user ${userId}: ${sent} client(s)`);
  };

  // Helper function to broadcast to all authenticated users
  const broadcastToAll = (data: any) => {
    let sent = 0;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && (client as any).userId) {
        client.send(JSON.stringify(data));
        sent++;
      }
    });
    console.log(`📡 Broadcast to all: ${sent} client(s)`);
  };

  // Get list of all online user IDs
  const getOnlineUserIds = (): string[] => {
    return Array.from(onlineUsers.keys());
  };

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

      // Add user to online users tracking
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(ws);
      console.log(
        `👤 User ${userId} is now ONLINE (${
          onlineUsers.get(userId)!.size
        } connection(s))`
      );

      // Broadcast to all users that this user is now online
      broadcastToAll({
        type: "user_online",
        data: { userId, onlineUsers: getOnlineUserIds() },
      });

      ws.on("message", (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          console.log("📤 WebSocket message from user:", userId, data);

          // Add sender information
          data.senderId = userId;
          data.timestamp = new Date().toISOString();

          // Broadcast message to all authenticated clients
          // This includes the recipient and also back to sender for multi-tab support
          let broadcastCount = 0;
          wss.clients.forEach((client) => {
            if (
              client.readyState === WebSocket.OPEN &&
              (client as any).userId // Only send to authenticated clients
            ) {
              const clientUserId = (client as any).userId;

              // Send to the message recipient or back to sender (for multi-tab sync)
              if (data.type === "message" && data.data) {
                const msgData = data.data;
                if (
                  clientUserId === msgData.receiverId ||
                  clientUserId === msgData.senderId
                ) {
                  client.send(JSON.stringify(data));
                  broadcastCount++;
                  console.log(`  ✅ Sent to user: ${clientUserId}`);
                }
              } else {
                // For non-message data, broadcast to everyone except sender
                if (client !== ws) {
                  client.send(JSON.stringify(data));
                  broadcastCount++;
                }
              }
            }
          });
          console.log(`📡 Broadcast to ${broadcastCount} client(s)`);
        } catch (error) {
          console.error("❌ Error processing WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        console.log(`WebSocket connection closed for user: ${userId}`);

        // Remove this connection from online users
        const userConnections = onlineUsers.get(userId);
        if (userConnections) {
          userConnections.delete(ws);

          // If user has no more connections, mark them as offline
          if (userConnections.size === 0) {
            onlineUsers.delete(userId);
            console.log(`👤 User ${userId} is now OFFLINE`);

            // Broadcast to all users that this user is now offline
            broadcastToAll({
              type: "user_offline",
              data: { userId, onlineUsers: getOnlineUserIds() },
            });
          } else {
            console.log(
              `👤 User ${userId} still has ${userConnections.size} connection(s)`
            );
          }
        }
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });
  });

  return httpServer;
}
