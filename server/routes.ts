// MediVault API Routes - Complete backend implementation
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { format } from "date-fns";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import {
  sendPatientApprovalEmail,
  sendUserCreatedEmail,
  sendSensitiveChangeApprovedEmail,
  sendSensitiveChangeRejectedEmail,
  sendAccountDeactivatedEmail,
  sendAccountReactivatedEmail,
  sendAppointmentCancelledEmail,
} from "./email";
import { generatePatientAssistantReply } from "./gemini";
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
  insertPatientRegistrationRequestSchema,
  insertPatientSchema,
  insertDoctorSchema,
  insertPharmacistSchema,
  insertLabTechnicianSchema,
  insertAppointmentSchema,
  insertMedicalRecordSchema,
  insertPrescriptionSchema,
  insertPrescriptionItemSchema,
  insertMedicineSchema,
  insertLabFacilitySchema,
  insertLabTestSchema,
  insertBillSchema,
  insertBillItemSchema,
  insertPaymentSchema,
  insertNotificationSchema,
  insertChatMessageSchema,
  appointments,
  patients,
  patientRegistrationRequests,
  doctorAvailability,
  labTechnicians,
  labFacilities,
  labTests as labTestsTable,
  labTestReports,
  prescriptions,
  prescriptionItems,
  systemSettings,
  insertSystemSettingsSchema,
  medicalRecords,
  doctors,
  pharmacists,
  users,
  profileChangeRequests,
  auditLogs,
} from "@shared/schema";
import { db } from "./db";
import {
  eq,
  sql,
  and,
  or,
  gte,
  lte,
  count,
  ne,
  isNull,
  desc,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

type RateLimitEntry = { windowStartMs: number; count: number };
const patientAiRateLimit = new Map<string, RateLimitEntry>();

function consumePatientAiToken(key: string): boolean {
  // Simple in-memory limiter (per server instance): protect against accidental spam.
  const WINDOW_MS = 60_000;
  const MAX_PER_WINDOW = 8;

  const now = Date.now();
  const current = patientAiRateLimit.get(key);
  if (!current || now - current.windowStartMs > WINDOW_MS) {
    patientAiRateLimit.set(key, { windowStartMs: now, count: 1 });
    return true;
  }

  if (current.count >= MAX_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

function getClientIp(req: any): string | null {
  const xForwardedFor = req.headers?.["x-forwarded-for"];
  const fromHeader = Array.isArray(xForwardedFor)
    ? xForwardedFor[0]
    : typeof xForwardedFor === "string"
    ? xForwardedFor
    : null;

  const ipRaw =
    (fromHeader ? fromHeader.split(",")[0]?.trim() : null) ||
    (typeof req.headers?.["x-real-ip"] === "string"
      ? req.headers["x-real-ip"].trim()
      : null) ||
    (typeof req.ip === "string" ? req.ip : null) ||
    (typeof req.socket?.remoteAddress === "string"
      ? req.socket.remoteAddress
      : null);

  if (!ipRaw) return null;
  const ip = ipRaw.replace(/^::ffff:/, "");
  if (ip === "::1" || ip === "127.0.0.1") return ip;
  return ip;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ============================================================================
  // AUTH SETUP
  // ============================================================================
  setupAuth(app);

  // Note: Login, register, logout, and auth/user endpoints are handled in localAuth.ts

  // ============================================================================
  // PROFILE (ALL AUTHENTICATED USERS)
  // ============================================================================
  app.get("/api/profile", isAuthenticated, async (req: any, res: Response) => {
    const userId = (req as any)?.user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const u = rows[0];
    if (!u) {
      return res.status(404).json({ message: "User not found" });
    }
    const { password: _pw, ...userWithoutPassword } = u as any;
    return res.json({ user: userWithoutPassword });
  });

  app.get(
    "/api/profile/username-available",
    isAuthenticated,
    async (req: any, res: Response) => {
      const raw =
        typeof req.query?.username === "string" ? req.query.username : "";
      const candidate = raw.trim();
      if (!candidate) {
        return res.status(400).json({ message: "username is required" });
      }

      // If unchanged, it's always available.
      const currentUsername = String((req as any)?.user?.username || "");
      if (
        currentUsername &&
        currentUsername.toLowerCase() === candidate.toLowerCase()
      ) {
        return res.json({ available: true });
      }

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, candidate))
        .limit(1);

      return res.json({ available: existing.length === 0 });
    }
  );

  app.patch(
    "/api/profile",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const nextUsernameRaw =
          typeof req.body?.username === "string"
            ? req.body.username
            : undefined;
        const nextEmailRaw =
          typeof req.body?.email === "string" ? req.body.email : undefined;
        const nextFirstNameRaw =
          typeof req.body?.firstName === "string"
            ? req.body.firstName
            : undefined;
        const nextLastNameRaw =
          typeof req.body?.lastName === "string"
            ? req.body.lastName
            : undefined;

        const updateData: any = { updatedAt: new Date() };

        if (nextFirstNameRaw !== undefined) {
          const v = nextFirstNameRaw.trim();
          updateData.firstName = v.length ? v : null;
        }
        if (nextLastNameRaw !== undefined) {
          const v = nextLastNameRaw.trim();
          updateData.lastName = v.length ? v : null;
        }
        if (nextEmailRaw !== undefined) {
          const v = nextEmailRaw.trim();
          updateData.email = v.length ? v : null;
        }

        if (nextUsernameRaw !== undefined) {
          const v = nextUsernameRaw.trim();
          if (v.length < 3 || v.length > 24) {
            return res
              .status(400)
              .json({ message: "Username must be 3-24 characters" });
          }
          if (!/^[a-zA-Z0-9.]+$/.test(v)) {
            return res.status(400).json({
              message: "Username can contain only letters, numbers, and dots",
            });
          }

          // Only check uniqueness if changing.
          const currentUsername = String(req.user?.username || "");
          if (currentUsername.toLowerCase() !== v.toLowerCase()) {
            const existing = await db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.username, v))
              .limit(1);
            if (existing.length > 0) {
              return res
                .status(409)
                .json({ message: "Username is not available" });
            }
          }

          updateData.username = v;
        }

        const updated = await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, userId))
          .returning();

        const updatedUser = updated[0];
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        const { password: _pw, ...userWithoutPassword } = updatedUser as any;
        return res.json({ user: userWithoutPassword });
      } catch (error: any) {
        console.error("Profile update error:", error);
        return res
          .status(500)
          .json({ message: error?.message || "Failed to update profile" });
      }
    }
  );

  // Full profile (base user + role-specific record)
  app.get(
    "/api/profile/full",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = (req as any)?.user?.id as string | undefined;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userRows = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        const u = userRows[0];
        if (!u) {
          return res.status(404).json({ message: "User not found" });
        }

        const role = String((u as any).role || "");
        let roleData: any | null = null;

        if (role === "patient") {
          const rows = await db
            .select()
            .from(patients)
            .where(eq(patients.userId, userId))
            .limit(1);
          roleData = rows[0] || null;

          // Fallback: some older data paths may not have userId linked correctly.
          if (!roleData) {
            const regRows = await db
              .select({ nic: patientRegistrationRequests.nic })
              .from(patientRegistrationRequests)
              .where(eq(patientRegistrationRequests.approvedUserId, userId))
              .limit(1);
            const reg = regRows[0];
            if (reg?.nic) {
              const byNic = await db
                .select()
                .from(patients)
                .where(eq(patients.nic, reg.nic))
                .limit(1);
              roleData = byNic[0] || null;
            }
          }
        } else if (role === "doctor") {
          const rows = await db
            .select()
            .from(doctors)
            .where(eq(doctors.userId, userId))
            .limit(1);
          roleData = rows[0] || null;
        } else if (role === "pharmacist") {
          const rows = await db
            .select()
            .from(pharmacists)
            .where(eq(pharmacists.userId, userId))
            .limit(1);
          roleData = rows[0] || null;
        } else if (role === "lab_technician") {
          const rows = await db
            .select()
            .from(labTechnicians)
            .where(eq(labTechnicians.userId, userId))
            .limit(1);
          roleData = rows[0] || null;
        }

        const { password: _pw, ...userWithoutPassword } = u as any;
        return res.json({ user: userWithoutPassword, roleData });
      } catch (error: any) {
        console.error("Full profile fetch error:", error);
        return res.status(500).json({
          message: error?.message || "Failed to fetch full profile",
        });
      }
    }
  );

  app.patch(
    "/api/profile/full",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = (req as any)?.user?.id as string | undefined;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userRows = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        const existingUser = userRows[0];
        if (!existingUser) {
          return res.status(404).json({ message: "User not found" });
        }

        const nextEmailRaw =
          typeof req.body?.email === "string" ? req.body.email : undefined;
        const nextFirstNameRaw =
          typeof req.body?.firstName === "string"
            ? req.body.firstName
            : undefined;
        const nextLastNameRaw =
          typeof req.body?.lastName === "string"
            ? req.body.lastName
            : undefined;

        const updateUserData: any = { updatedAt: new Date() };

        if (nextFirstNameRaw !== undefined) {
          const v = nextFirstNameRaw.trim();
          updateUserData.firstName = v.length ? v : null;
        }
        if (nextLastNameRaw !== undefined) {
          const v = nextLastNameRaw.trim();
          updateUserData.lastName = v.length ? v : null;
        }
        if (nextEmailRaw !== undefined) {
          const v = nextEmailRaw.trim();
          updateUserData.email = v.length ? v : null;
        }

        const updatedUsers = await db
          .update(users)
          .set(updateUserData)
          .where(eq(users.id, userId))
          .returning();
        const updatedUser = updatedUsers[0];
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        const role = String((existingUser as any).role || "");
        const roleBody = req.body?.roleData;
        let roleData: any | null = null;

        if (role === "patient") {
          const updatePatientData: any = { updatedAt: new Date() };
          if (roleBody && typeof roleBody === "object") {
            if (roleBody.contactInfo !== undefined) {
              const v = String(roleBody.contactInfo || "").trim();
              updatePatientData.contactInfo = v.length ? v : null;
            }
            if (roleBody.address !== undefined) {
              const v = String(roleBody.address || "").trim();
              updatePatientData.address = v.length ? v : null;
            }
          }

          // Primary: update patient linked to this user
          const byUser = await db
            .select({ id: patients.id })
            .from(patients)
            .where(eq(patients.userId, userId))
            .limit(1);

          let patientId: string | null = byUser[0]?.id || null;

          // Fallback: if older data path missed userId link, try the approved registration NIC.
          if (!patientId) {
            const regRows = await db
              .select({ nic: patientRegistrationRequests.nic })
              .from(patientRegistrationRequests)
              .where(eq(patientRegistrationRequests.approvedUserId, userId))
              .limit(1);
            const reg = regRows[0];
            if (reg?.nic) {
              const byNic = await db
                .select({ id: patients.id })
                .from(patients)
                .where(eq(patients.nic, reg.nic))
                .limit(1);
              patientId = byNic[0]?.id || null;
            }
          }

          if (!patientId) {
            return res
              .status(404)
              .json({ message: "Patient profile not found" });
          }

          const updated = await db
            .update(patients)
            .set(updatePatientData)
            .where(eq(patients.id, patientId))
            .returning();
          roleData = updated[0] || null;
        } else if (role === "doctor") {
          const updateDoctorData: any = { updatedAt: new Date() };
          if (roleBody && typeof roleBody === "object") {
            if (roleBody.qualifications !== undefined) {
              const v = String(roleBody.qualifications || "").trim();
              updateDoctorData.qualifications = v.length ? v : null;
            }
            if (roleBody.experience !== undefined) {
              const raw = roleBody.experience;
              if (raw === null || raw === "") {
                updateDoctorData.experience = null;
              } else {
                const n = Number(raw);
                if (Number.isNaN(n) || !Number.isFinite(n) || n < 0) {
                  return res.status(400).json({
                    message: "Experience must be a non-negative number",
                  });
                }
                updateDoctorData.experience = Math.floor(n);
              }
            }
          }

          const updated = await db
            .update(doctors)
            .set(updateDoctorData)
            .where(eq(doctors.userId, userId))
            .returning();
          roleData = updated[0] || null;
          if (!roleData) {
            return res
              .status(404)
              .json({ message: "Doctor profile not found" });
          }
        } else if (role === "lab_technician") {
          const updateLabTechData: any = { updatedAt: new Date() };
          if (roleBody && typeof roleBody === "object") {
            if (roleBody.specialization !== undefined) {
              const v = String(roleBody.specialization || "").trim();
              updateLabTechData.specialization = v.length ? v : null;
            }
          }

          const updated = await db
            .update(labTechnicians)
            .set(updateLabTechData)
            .where(eq(labTechnicians.userId, userId))
            .returning();
          roleData = updated[0] || null;
          if (!roleData) {
            return res
              .status(404)
              .json({ message: "Lab technician profile not found" });
          }
        } else if (role === "pharmacist") {
          const rows = await db
            .select()
            .from(pharmacists)
            .where(eq(pharmacists.userId, userId))
            .limit(1);
          roleData = rows[0] || null;
        } else {
          roleData = null;
        }

        const { password: _pw, ...userWithoutPassword } = updatedUser as any;
        return res.json({ user: userWithoutPassword, roleData });
      } catch (error: any) {
        console.error("Full profile update error:", error);
        return res
          .status(500)
          .json({ message: error?.message || "Failed to update profile" });
      }
    }
  );

  // Sensitive profile field change requests (create by user, review by admin)
  app.post(
    "/api/profile/change-requests",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = (req as any)?.user?.id as string | undefined;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const fieldRaw =
          typeof req.body?.field === "string" ? req.body.field : "";
        const newValueRaw =
          typeof req.body?.newValue === "string" ? req.body.newValue : "";
        const reasonRaw =
          typeof req.body?.reason === "string" ? req.body.reason : undefined;

        const field = fieldRaw.trim();
        const newValue = newValueRaw.trim();
        const reason = reasonRaw?.trim();

        const fieldAllowsEmptyNewValue =
          field === "healthId" || field === "rfid";

        if (!field) {
          return res.status(400).json({ message: "field is required" });
        }
        if (!fieldAllowsEmptyNewValue && !newValue) {
          return res.status(400).json({ message: "newValue is required" });
        }

        const userRows = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        const role = String(userRows[0]?.role || "");
        if (!role) {
          return res.status(404).json({ message: "User not found" });
        }

        const allowed: Record<string, string[]> = {
          patient: [
            "nic",
            "rfid",
            "healthId",
            "gender",
            "dateOfBirth",
            "bloodType",
          ],
          doctor: ["nic", "gender", "licenseNumber"],
          pharmacist: ["licenseNumber"],
          lab_technician: ["licenseNumber"],
          admin: [],
        };

        const baseAllowed = ["username"]; // available to every role
        const allowedForRole = [...baseAllowed, ...(allowed[role] || [])];
        if (!allowedForRole.includes(field)) {
          return res.status(400).json({
            message: `Field '${field}' is not requestable for role '${role}'`,
          });
        }

        // Allow multiple requests (including multiple pending) per field.

        // Load current value (for audit email + admin review).
        let oldValue: string | null = null;

        if (field === "username") {
          const urows = await db
            .select({ username: users.username })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
          const currentUsername = String(urows[0]?.username || "");
          oldValue = currentUsername || null;

          if (!newValue) {
            return res.status(400).json({ message: "newValue is required" });
          }
        } else if (role === "patient") {
          let patientRow: any | null = null;
          const byUser = await db
            .select()
            .from(patients)
            .where(eq(patients.userId, userId))
            .limit(1);
          patientRow = byUser[0] || null;

          if (!patientRow) {
            const regRows = await db
              .select({ nic: patientRegistrationRequests.nic })
              .from(patientRegistrationRequests)
              .where(eq(patientRegistrationRequests.approvedUserId, userId))
              .limit(1);
            const reg = regRows[0];
            if (reg?.nic) {
              const byNic = await db
                .select()
                .from(patients)
                .where(eq(patients.nic, reg.nic))
                .limit(1);
              patientRow = byNic[0] || null;
            }
          }

          if (!patientRow) {
            return res
              .status(404)
              .json({ message: "Patient profile not found" });
          }
          const v = (patientRow as any)[field];
          oldValue = v instanceof Date ? v.toISOString() : v ?? null;
        } else if (role === "doctor") {
          const rows = await db
            .select()
            .from(doctors)
            .where(eq(doctors.userId, userId))
            .limit(1);
          const doctorRow = rows[0];
          if (!doctorRow) {
            return res
              .status(404)
              .json({ message: "Doctor profile not found" });
          }
          oldValue = (doctorRow as any)[field] ?? null;
        } else if (role === "pharmacist") {
          const rows = await db
            .select()
            .from(pharmacists)
            .where(eq(pharmacists.userId, userId))
            .limit(1);
          const pharmacistRow = rows[0];
          if (!pharmacistRow) {
            return res
              .status(404)
              .json({ message: "Pharmacist profile not found" });
          }
          oldValue = (pharmacistRow as any)[field] ?? null;
        } else if (role === "lab_technician") {
          const rows = await db
            .select()
            .from(labTechnicians)
            .where(eq(labTechnicians.userId, userId))
            .limit(1);
          const labTechRow = rows[0];
          if (!labTechRow) {
            return res
              .status(404)
              .json({ message: "Lab technician profile not found" });
          }
          oldValue = (labTechRow as any)[field] ?? null;
        } else {
          return res.status(400).json({ message: "Unsupported role" });
        }

        if (!fieldAllowsEmptyNewValue) {
          if (
            oldValue !== null &&
            typeof oldValue === "string" &&
            oldValue.trim() === newValue
          ) {
            return res
              .status(400)
              .json({ message: "New value is the same as current value" });
          }
        } else {
          // For healthId / rfid requests, allow empty newValue so admin can fill/generate later.
          // If user did provide a value, still prevent submitting the same value.
          if (
            newValue.trim().length > 0 &&
            oldValue !== null &&
            typeof oldValue === "string" &&
            oldValue.trim() === newValue
          ) {
            return res
              .status(400)
              .json({ message: "New value is the same as current value" });
          }
        }

        const inserted = await db
          .insert(profileChangeRequests)
          .values({
            requesterUserId: userId,
            role,
            field,
            oldValue,
            newValue,
            reason: reason && reason.length ? reason : null,
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any)
          .returning();

        return res.json({ request: inserted[0] });
      } catch (error: any) {
        console.error("Create profile change request error:", error);
        return res
          .status(500)
          .json({ message: error?.message || "Failed to create request" });
      }
    }
  );

  // User: list own change requests (history)
  app.get(
    "/api/profile/change-requests",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = (req as any)?.user?.id as string | undefined;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const statusRaw =
          typeof req.query?.status === "string" ? req.query.status : "";
        const status = statusRaw.trim();

        const rows = await db
          .select({
            id: profileChangeRequests.id,
            role: profileChangeRequests.role,
            field: profileChangeRequests.field,
            oldValue: profileChangeRequests.oldValue,
            newValue: profileChangeRequests.newValue,
            reason: profileChangeRequests.reason,
            status: profileChangeRequests.status,
            reviewedAt: profileChangeRequests.reviewedAt,
            adminNotes: profileChangeRequests.adminNotes,
            createdAt: profileChangeRequests.createdAt,
          })
          .from(profileChangeRequests)
          .where(
            status
              ? and(
                  eq(profileChangeRequests.requesterUserId, userId),
                  eq(profileChangeRequests.status, status)
                )
              : eq(profileChangeRequests.requesterUserId, userId)
          )
          .orderBy(desc(profileChangeRequests.createdAt));

        return res.json({ requests: rows });
      } catch (error: any) {
        console.error("User list profile change requests error:", error);
        return res
          .status(500)
          .json({ message: error?.message || "Failed to load requests" });
      }
    }
  );

  app.get(
    "/api/admin/profile/change-requests",
    isAuthenticated,
    isAdmin,
    async (req: any, res: Response) => {
      try {
        const statusRaw =
          typeof req.query?.status === "string" ? req.query.status : "pending";
        const status = statusRaw.trim() || "pending";

        const rows = await db
          .select({
            id: profileChangeRequests.id,
            requesterUserId: profileChangeRequests.requesterUserId,
            role: profileChangeRequests.role,
            field: profileChangeRequests.field,
            oldValue: profileChangeRequests.oldValue,
            newValue: profileChangeRequests.newValue,
            reason: profileChangeRequests.reason,
            status: profileChangeRequests.status,
            reviewedBy: profileChangeRequests.reviewedBy,
            reviewedAt: profileChangeRequests.reviewedAt,
            adminNotes: profileChangeRequests.adminNotes,
            createdAt: profileChangeRequests.createdAt,
            requesterUsername: users.username,
            requesterEmail: users.email,
            requesterFirstName: users.firstName,
            requesterLastName: users.lastName,
          })
          .from(profileChangeRequests)
          .innerJoin(users, eq(users.id, profileChangeRequests.requesterUserId))
          .where(eq(profileChangeRequests.status, status))
          .orderBy(desc(profileChangeRequests.createdAt));

        return res.json({ requests: rows });
      } catch (error: any) {
        console.error("Admin list profile change requests error:", error);
        return res
          .status(500)
          .json({ message: error?.message || "Failed to load requests" });
      }
    }
  );

  app.get(
    "/api/admin/profile/change-requests/count",
    isAuthenticated,
    isAdmin,
    async (req: any, res: Response) => {
      try {
        const statusRaw =
          typeof req.query?.status === "string" ? req.query.status : "pending";
        const status = statusRaw.trim() || "pending";

        const rows = await db
          .select({ count: count() })
          .from(profileChangeRequests)
          .where(eq(profileChangeRequests.status, status));

        const c = Number((rows as any)?.[0]?.count ?? 0);
        return res.json({ count: Number.isFinite(c) ? c : 0 });
      } catch (error: any) {
        console.error("Admin count profile change requests error:", error);
        return res
          .status(500)
          .json({ message: error?.message || "Failed to load count" });
      }
    }
  );

  app.post(
    "/api/admin/profile/change-requests/:id/approve",
    isAuthenticated,
    isAdmin,
    async (req: any, res: Response) => {
      try {
        const adminUserId = (req as any)?.user?.id as string | undefined;
        if (!adminUserId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const id = String(req.params?.id || "").trim();
        if (!id) {
          return res.status(400).json({ message: "id is required" });
        }

        const rows = await db
          .select()
          .from(profileChangeRequests)
          .where(eq(profileChangeRequests.id, id))
          .limit(1);
        const reqRow: any = rows[0];
        if (!reqRow) {
          return res.status(404).json({ message: "Request not found" });
        }
        if (String(reqRow.status || "") !== "pending") {
          return res
            .status(409)
            .json({ message: "Only pending requests can be approved" });
        }

        const role = String(reqRow.role || "");
        const field = String(reqRow.field || "");
        const requestedValue = String(reqRow.newValue || "").trim();

        const overrideValueRaw =
          typeof req.body?.newValue === "string"
            ? req.body.newValue
            : undefined;
        const overrideValue =
          overrideValueRaw !== undefined ? overrideValueRaw.trim() : undefined;
        const generate = req.body?.generate === true;

        const generateUniqueHealthId = async () => {
          for (let i = 0; i < 8; i++) {
            const candidate = `MV-${randomBytes(4).toString("hex")}`;
            const exists = await db
              .select({ id: patients.id })
              .from(patients)
              .where(eq(patients.healthId, candidate))
              .limit(1);
            if (exists.length === 0) return candidate;
          }
          return `MV-${Date.now()}`;
        };

        let appliedValue =
          overrideValue !== undefined ? overrideValue : requestedValue;

        if (field === "healthId" && (generate || !appliedValue)) {
          appliedValue = await generateUniqueHealthId();
        }

        if (field === "rfid" && !appliedValue) {
          return res.status(400).json({
            message: "RFID value must be provided (scan or enter manually)",
          });
        }

        // Base user fields
        if (field === "username") {
          if (!appliedValue) {
            return res.status(400).json({ message: "Username is required" });
          }
          if (appliedValue.length < 3 || appliedValue.length > 24) {
            return res
              .status(400)
              .json({ message: "Username must be 3-24 characters" });
          }
          if (!/^[a-zA-Z0-9.]+$/.test(appliedValue)) {
            return res.status(400).json({
              message: "Username can contain only letters, numbers, and dots",
            });
          }

          const existing = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, appliedValue))
            .limit(1);
          if (
            existing.length > 0 &&
            String(existing[0]?.id) !== String(reqRow.requesterUserId)
          ) {
            return res
              .status(409)
              .json({ message: "Username is not available" });
          }

          await db
            .update(users)
            .set({ username: appliedValue, updatedAt: new Date() } as any)
            .where(eq(users.id, reqRow.requesterUserId));
        } else if (role === "patient") {
          // Resolve patientId (userId linkage fallback)
          const byUser = await db
            .select({ id: patients.id })
            .from(patients)
            .where(eq(patients.userId, reqRow.requesterUserId))
            .limit(1);
          let patientId: string | null = byUser[0]?.id || null;

          if (!patientId) {
            const regRows = await db
              .select({ nic: patientRegistrationRequests.nic })
              .from(patientRegistrationRequests)
              .where(
                eq(
                  patientRegistrationRequests.approvedUserId,
                  reqRow.requesterUserId
                )
              )
              .limit(1);
            const reg = regRows[0];
            if (reg?.nic) {
              const byNic = await db
                .select({ id: patients.id })
                .from(patients)
                .where(eq(patients.nic, reg.nic))
                .limit(1);
              patientId = byNic[0]?.id || null;
            }
          }

          if (!patientId) {
            return res
              .status(404)
              .json({ message: "Patient profile not found" });
          }

          if (field === "rfid") {
            const existingRfid = await db
              .select({ id: patients.id })
              .from(patients)
              .where(eq(patients.rfid, appliedValue))
              .limit(1);
            if (
              existingRfid.length > 0 &&
              String(existingRfid[0]?.id) !== String(patientId)
            ) {
              return res
                .status(409)
                .json({ message: "RFID is already in use" });
            }
          }
          if (field === "healthId") {
            const existingHealthId = await db
              .select({ id: patients.id })
              .from(patients)
              .where(eq(patients.healthId, appliedValue))
              .limit(1);
            if (
              existingHealthId.length > 0 &&
              String(existingHealthId[0]?.id) !== String(patientId)
            ) {
              return res
                .status(409)
                .json({ message: "Health ID is already in use" });
            }
          }
          if (field === "nic") {
            const existingNic = await db
              .select({ id: patients.id })
              .from(patients)
              .where(eq(patients.nic, appliedValue))
              .limit(1);
            if (
              existingNic.length > 0 &&
              String(existingNic[0]?.id) !== String(patientId)
            ) {
              return res.status(409).json({ message: "NIC is already in use" });
            }
          }
          if (field === "gender") {
            const gv = appliedValue.toLowerCase();
            if (gv !== "male" && gv !== "female" && gv !== "other") {
              return res
                .status(400)
                .json({ message: "Gender must be male, female, or other" });
            }
            appliedValue = gv;
          }

          const updatedAt = new Date();
          if (field === "dateOfBirth") {
            const d = new Date(appliedValue);
            if (Number.isNaN(d.getTime())) {
              return res.status(400).json({
                message: "Invalid dateOfBirth value; expected ISO date string",
              });
            }
            await db
              .update(patients)
              .set({ dateOfBirth: d, updatedAt })
              .where(eq(patients.id, patientId));
          } else if (field === "rfid") {
            await db
              .update(patients)
              .set({ rfid: appliedValue, updatedAt })
              .where(eq(patients.id, patientId));
          } else if (field === "healthId") {
            await db
              .update(patients)
              .set({ healthId: appliedValue, updatedAt })
              .where(eq(patients.id, patientId));
          } else if (field === "nic") {
            await db
              .update(patients)
              .set({ nic: appliedValue, updatedAt })
              .where(eq(patients.id, patientId));
          } else if (field === "gender") {
            await db
              .update(patients)
              .set({ gender: appliedValue, updatedAt })
              .where(eq(patients.id, patientId));
          } else if (field === "bloodType") {
            await db
              .update(patients)
              .set({ bloodType: appliedValue, updatedAt })
              .where(eq(patients.id, patientId));
          } else {
            return res
              .status(400)
              .json({ message: `Unsupported patient field '${field}'` });
          }
        } else if (role === "doctor") {
          if (!appliedValue) {
            return res.status(400).json({ message: "Value is required" });
          }
          if (field === "gender") {
            const gv = appliedValue.toLowerCase();
            if (gv !== "male" && gv !== "female" && gv !== "other") {
              return res
                .status(400)
                .json({ message: "Gender must be male, female, or other" });
            }
            appliedValue = gv;
          }
          if (field === "licenseNumber") {
            const existing = await db
              .select({ id: doctors.id })
              .from(doctors)
              .where(eq(doctors.licenseNumber, appliedValue))
              .limit(1);
            if (existing.length > 0) {
              return res
                .status(409)
                .json({ message: "License number is already in use" });
            }
          }
          if (field === "nic") {
            const existing = await db
              .select({ id: doctors.id })
              .from(doctors)
              .where(eq(doctors.nic, appliedValue))
              .limit(1);
            if (existing.length > 0) {
              return res.status(409).json({ message: "NIC is already in use" });
            }
          }

          const updatedAt = new Date();
          let updated: any[] = [];
          if (field === "nic") {
            updated = await db
              .update(doctors)
              .set({ nic: appliedValue, updatedAt })
              .where(eq(doctors.userId, reqRow.requesterUserId))
              .returning();
          } else if (field === "gender") {
            updated = await db
              .update(doctors)
              .set({ gender: appliedValue, updatedAt })
              .where(eq(doctors.userId, reqRow.requesterUserId))
              .returning();
          } else if (field === "licenseNumber") {
            updated = await db
              .update(doctors)
              .set({ licenseNumber: appliedValue, updatedAt })
              .where(eq(doctors.userId, reqRow.requesterUserId))
              .returning();
          } else {
            return res
              .status(400)
              .json({ message: `Unsupported doctor field '${field}'` });
          }
          if (!updated[0]) {
            return res
              .status(404)
              .json({ message: "Doctor profile not found" });
          }
        } else if (role === "pharmacist") {
          if (!appliedValue) {
            return res.status(400).json({ message: "Value is required" });
          }
          if (field === "licenseNumber") {
            const existing = await db
              .select({ id: pharmacists.id })
              .from(pharmacists)
              .where(eq(pharmacists.licenseNumber, appliedValue))
              .limit(1);
            if (existing.length > 0) {
              return res
                .status(409)
                .json({ message: "License number is already in use" });
            }
          }
          const updatedAt = new Date();
          let updated: any[] = [];
          if (field === "licenseNumber") {
            updated = await db
              .update(pharmacists)
              .set({ licenseNumber: appliedValue, updatedAt })
              .where(eq(pharmacists.userId, reqRow.requesterUserId))
              .returning();
          } else {
            return res
              .status(400)
              .json({ message: `Unsupported pharmacist field '${field}'` });
          }
          if (!updated[0]) {
            return res
              .status(404)
              .json({ message: "Pharmacist profile not found" });
          }
        } else if (role === "lab_technician") {
          if (!appliedValue) {
            return res.status(400).json({ message: "Value is required" });
          }
          if (field === "licenseNumber") {
            const existing = await db
              .select({ id: labTechnicians.id })
              .from(labTechnicians)
              .where(eq(labTechnicians.licenseNumber, appliedValue))
              .limit(1);
            if (existing.length > 0) {
              return res
                .status(409)
                .json({ message: "License number is already in use" });
            }
          }
          const updatedAt = new Date();
          let updated: any[] = [];
          if (field === "licenseNumber") {
            updated = await db
              .update(labTechnicians)
              .set({ licenseNumber: appliedValue, updatedAt })
              .where(eq(labTechnicians.userId, reqRow.requesterUserId))
              .returning();
          } else {
            return res
              .status(400)
              .json({ message: `Unsupported lab technician field '${field}'` });
          }
          if (!updated[0]) {
            return res
              .status(404)
              .json({ message: "Lab technician profile not found" });
          }
        } else {
          return res.status(400).json({ message: "Unsupported role" });
        }

        const adminNotesRaw =
          typeof req.body?.adminNotes === "string" ? req.body.adminNotes : "";
        const adminNotes = adminNotesRaw.trim();

        let finalAdminNotes = adminNotes.length ? adminNotes : null;
        if (
          (generate || overrideValue !== undefined) &&
          appliedValue &&
          appliedValue !== requestedValue
        ) {
          const suffix = `Applied value: ${appliedValue}`;
          finalAdminNotes = finalAdminNotes
            ? `${finalAdminNotes}\n${suffix}`
            : suffix;
        }

        const updatedReq = await db
          .update(profileChangeRequests)
          .set({
            status: "approved",
            reviewedBy: adminUserId,
            reviewedAt: new Date(),
            adminNotes: finalAdminNotes,
            newValue: appliedValue,
            updatedAt: new Date(),
          } as any)
          .where(eq(profileChangeRequests.id, id))
          .returning();

        const requester = await db
          .select({
            email: users.email,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(eq(users.id, reqRow.requesterUserId))
          .limit(1);

        const requesterRow = requester[0];
        const to = String(requesterRow?.email || "").trim();
        const fullName = `${String(
          requesterRow?.firstName || ""
        ).trim()} ${String(requesterRow?.lastName || "").trim()}`.trim();

        let emailSent = false;
        let emailError: string | undefined;
        if (to) {
          const emailRes = await sendSensitiveChangeApprovedEmail({
            to,
            fullName: fullName.length ? fullName : null,
            field,
            oldValue: reqRow.oldValue ?? null,
            newValue: appliedValue,
          });
          emailSent = emailRes.sent === true;
          emailError = emailRes.sent === true ? undefined : emailRes.error;
        }

        return res.json({
          request: updatedReq[0],
          emailSent,
          emailError,
          appliedValue,
        });
      } catch (error: any) {
        console.error("Approve profile change request error:", error);
        return res
          .status(500)
          .json({ message: error?.message || "Failed to approve request" });
      }
    }
  );

  app.post(
    "/api/admin/profile/change-requests/:id/reject",
    isAuthenticated,
    isAdmin,
    async (req: any, res: Response) => {
      try {
        const adminUserId = (req as any)?.user?.id as string | undefined;
        if (!adminUserId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const id = String(req.params?.id || "").trim();
        if (!id) {
          return res.status(400).json({ message: "id is required" });
        }

        const rows = await db
          .select()
          .from(profileChangeRequests)
          .where(eq(profileChangeRequests.id, id))
          .limit(1);
        const reqRow: any = rows[0];
        if (!reqRow) {
          return res.status(404).json({ message: "Request not found" });
        }
        if (String(reqRow.status || "") !== "pending") {
          return res
            .status(409)
            .json({ message: "Only pending requests can be rejected" });
        }

        const adminNotesRaw =
          typeof req.body?.adminNotes === "string" ? req.body.adminNotes : "";
        const adminNotes = adminNotesRaw.trim();
        if (!adminNotes) {
          return res.status(400).json({ message: "adminNotes is required" });
        }

        const updatedReq = await db
          .update(profileChangeRequests)
          .set({
            status: "rejected",
            reviewedBy: adminUserId,
            reviewedAt: new Date(),
            adminNotes,
            updatedAt: new Date(),
          } as any)
          .where(eq(profileChangeRequests.id, id))
          .returning();

        const requester = await db
          .select({
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(eq(users.id, reqRow.requesterUserId))
          .limit(1);

        const requesterRow = requester[0];
        const to = String(requesterRow?.email || "").trim();
        const fullName = `${String(
          requesterRow?.firstName || ""
        ).trim()} ${String(requesterRow?.lastName || "").trim()}`.trim();

        let emailSent = false;
        let emailError: string | undefined;
        if (to) {
          const emailRes = await sendSensitiveChangeRejectedEmail({
            to,
            fullName: fullName.length ? fullName : null,
            field: String(reqRow.field || ""),
            requestedValue: String(reqRow.newValue || ""),
            reason: reqRow.reason ?? null,
            adminNotes,
          });
          emailSent = emailRes.sent === true;
          emailError = emailRes.sent === true ? undefined : emailRes.error;
        }

        return res.json({ request: updatedReq[0], emailSent, emailError });
      } catch (error: any) {
        console.error("Reject profile change request error:", error);
        return res
          .status(500)
          .json({ message: error?.message || "Failed to reject request" });
      }
    }
  );

  app.post(
    "/api/profile/avatar",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const multer = await import("multer");
        const path = await import("path");
        const fs = await import("fs");

        const uploadsRoot = path.join(process.cwd(), "uploads", "avatars");
        if (!fs.existsSync(uploadsRoot)) {
          fs.mkdirSync(uploadsRoot, { recursive: true });
        }

        const storageEngine = multer.default.diskStorage({
          destination: (_r: any, _file, cb) => {
            const folder = path.join(uploadsRoot, userId);
            if (!fs.existsSync(folder)) {
              fs.mkdirSync(folder, { recursive: true });
            }
            cb(null, folder);
          },
          filename: (_req, file, cb) => {
            const extByMime: Record<string, string> = {
              "image/png": ".png",
              "image/jpeg": ".jpg",
              "image/webp": ".webp",
            };
            const ext = extByMime[file.mimetype] || ".png";
            cb(null, `avatar-${Date.now()}${ext}`);
          },
        });

        const upload = multer.default({
          storage: storageEngine,
          // Profile pictures can be a bit larger depending on format/metadata.
          // We'll still crop/resize client-side, but allow some headroom.
          limits: { fileSize: 5 * 1024 * 1024 },
          fileFilter: (_req, file, cb) => {
            const ok =
              file.mimetype === "image/png" ||
              file.mimetype === "image/jpeg" ||
              file.mimetype === "image/webp";
            if (!ok) {
              return cb(
                new Error("Invalid image type. Allowed: png, jpg, webp")
              );
            }
            cb(null, true);
          },
        });

        upload.single("file")(req, res, async (err) => {
          if (err) {
            console.error("Avatar upload error:", err);
            const code = (err as any)?.code;
            if (code === "LIMIT_FILE_SIZE") {
              return res.status(413).json({
                message: "File too large. Max allowed size is 5MB.",
              });
            }
            return res
              .status(400)
              .json({ message: err.message || "Upload failed" });
          }

          const file = req.file as any;
          if (!file?.path) {
            return res.status(400).json({ message: "No file provided" });
          }

          // Store relative path so we can safely resolve it later.
          const relativePath = path
            .relative(process.cwd(), file.path)
            .split(path.sep)
            .join(path.posix.sep);

          await db
            .update(users)
            .set({
              profileImageUrl: relativePath,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

          return res.json({ ok: true });
        });
      } catch (error: any) {
        console.error("Avatar upload init error:", error);
        return res
          .status(500)
          .json({ message: error?.message || "Failed to upload avatar" });
      }
    }
  );

  app.get(
    "/api/profile/avatar",
    isAuthenticated,
    async (req: any, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const path = await import("path");
        const fs = await import("fs");

        const rows = await db
          .select({ profileImageUrl: users.profileImageUrl })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        const rel = rows[0]?.profileImageUrl;
        if (!rel) {
          return res.status(404).json({ message: "No avatar" });
        }

        const uploadsRoot = path.resolve(path.join(process.cwd(), "uploads"));
        const absolutePath = path.resolve(path.join(process.cwd(), rel));
        if (!absolutePath.startsWith(uploadsRoot + path.sep)) {
          return res.status(400).json({ message: "Invalid avatar path" });
        }
        if (!fs.existsSync(absolutePath)) {
          return res.status(404).json({ message: "Avatar not found" });
        }

        const ext = path.extname(absolutePath).toLowerCase();
        const contentType =
          ext === ".png"
            ? "image/png"
            : ext === ".webp"
            ? "image/webp"
            : "image/jpeg";

        res.setHeader("Content-Type", contentType);
        return fs.createReadStream(absolutePath).pipe(res);
      } catch (error: any) {
        console.error("Avatar serve error:", error);
        return res
          .status(500)
          .json({ message: error?.message || "Failed to load avatar" });
      }
    }
  );

  // ============================================================================
  // PATIENT SELF-REGISTRATION (REQUESTS)
  // ============================================================================
  // Patients submit a registration request and must wait for admin approval.
  app.post(
    "/api/patient-registrations",
    async (req: Request, res: Response) => {
      try {
        const data = insertPatientRegistrationRequestSchema.parse(req.body);

        // Prevent duplicates against existing accounts/records
        if (data.email) {
          const existingByEmail = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, data.email))
            .limit(1);
          if (existingByEmail.length > 0) {
            return res
              .status(409)
              .json({ message: "An account already exists with this email" });
          }
        }

        const existingByNic = await db
          .select({ id: patients.id })
          .from(patients)
          .where(eq(patients.nic, data.nic))
          .limit(1);
        if (existingByNic.length > 0) {
          return res
            .status(409)
            .json({ message: "A patient already exists with this NIC" });
        }

        const existingRequest = await db
          .select({ id: patientRegistrationRequests.id })
          .from(patientRegistrationRequests)
          .where(
            or(
              eq(patientRegistrationRequests.nic, data.nic),
              eq(patientRegistrationRequests.email, data.email)
            )
          )
          .limit(1);
        if (existingRequest.length > 0) {
          return res.status(409).json({
            message:
              "A registration request already exists for this email/NIC. Please wait for admin approval.",
          });
        }

        const created = await db
          .insert(patientRegistrationRequests)
          .values({
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            nic: data.nic,
            dateOfBirth: data.dateOfBirth ?? undefined,
            gender: data.gender,
            contactInfo: data.contactInfo,
            address: data.address,
            bloodType: data.bloodType,
            allergies: data.allergies,
          })
          .returning();

        return res.status(201).json({
          message:
            "Registration submitted. Please wait for admin approval. You will receive an email with your username and password once approved.",
          request: created[0],
        });
      } catch (error: any) {
        console.error("Error creating patient registration request:", error);
        return res.status(400).json({
          message: error?.message || "Failed to submit registration",
        });
      }
    }
  );

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

  // Get all patients (with RBAC - admin sees limited info)
  app.get("/api/patients", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const patients = await storage.getAllPatients();

      // Enrich with user data
      const enrichedPatients = await Promise.all(
        patients.map(async (patient: any) => {
          const patientUser = await storage.getUser(patient.userId);

          // Admin sees only basic info (NO medical data)
          if (user.role === "admin") {
            return {
              id: patient.id,
              userId: patient.userId,
              firstName: patientUser?.firstName || "Unknown",
              lastName: patientUser?.lastName || "",
              email: patientUser?.email || "",
              nic: patient.nic,
              dateOfBirth: patient.dateOfBirth,
              gender: patient.gender,
              contactInfo: patient.contactInfo,
              address: patient.address,
              rfid: patient.rfid ? `****${patient.rfid.slice(-4)}` : undefined, // Masked RFID
              isActive: patientUser?.isActive ?? true, // Default to true if undefined
              createdAt: patient.createdAt,
              // Explicitly exclude medical data
              bloodType: undefined,
              allergies: undefined,
              healthId: undefined,
            };
          }

          // Doctors and other roles see full info
          return {
            ...patient,
            firstName: patientUser?.firstName || "Unknown",
            lastName: patientUser?.lastName || "",
            email: patientUser?.email || "",
            isActive: patientUser?.isActive ?? true, // Default to true if undefined
          };
        })
      );

      res.json(enrichedPatients);
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

  // ============================================================================
  // AI ASSISTANT (PATIENT)
  // ============================================================================
  app.post(
    "/api/ai/patient-assistant",
    isAuthenticated,
    hasRole("patient"),
    async (req: any, res: Response) => {
      try {
        const userId = String(req.user?.id || "").trim();
        if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        if (!consumePatientAiToken(userId)) {
          return res
            .status(429)
            .send(
              "Too many AI Assistant requests. Please wait a minute and try again."
            );
        }

        const message =
          typeof req.body?.message === "string" ? req.body.message.trim() : "";
        if (!message) {
          return res.status(400).json({ message: "message is required" });
        }

        const allowMedicalRecords = req.body?.allowMedicalRecords === true;

        const patient = await storage.getPatientByUserId(userId);
        if (!patient) {
          return res.status(404).json({ message: "Patient profile not found" });
        }

        let medicalSummaryText: string | null = null;
        if (allowMedicalRecords) {
          const records = await storage.getMedicalRecordsByPatient(patient.id);

          const sorted = [...records].sort((a: any, b: any) => {
            const at = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bt = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bt - at;
          });

          const take = sorted.slice(0, 10);
          const lines: string[] = [];

          if (patient.bloodType)
            lines.push(`Blood group: ${patient.bloodType}`);
          if (patient.allergies) lines.push(`Allergies: ${patient.allergies}`);

          for (const r of take) {
            const d = r?.createdAt ? new Date(r.createdAt).toISOString() : "";
            lines.push(
              [
                d ? `Date: ${d}` : undefined,
                r?.diagnosis ? `Diagnosis: ${r.diagnosis}` : undefined,
                r?.symptoms ? `Symptoms: ${r.symptoms}` : undefined,
                r?.notes ? `Notes: ${r.notes}` : undefined,
                r?.vitalSigns ? `Vital signs: ${r.vitalSigns}` : undefined,
              ]
                .filter(Boolean)
                .join("\n")
            );
            lines.push("---");
          }

          medicalSummaryText = lines.join("\n").trim();
          if (medicalSummaryText.length > 8000) {
            medicalSummaryText = medicalSummaryText.slice(0, 8000);
          }
        }

        // Provide upcoming availability to help the assistant recommend doctors.
        const now = new Date();
        const availabilityRows = await db
          .select({
            availableDate: doctorAvailability.availableDate,
            startTime: doctorAvailability.startTime,
            endTime: doctorAvailability.endTime,
            locationName: doctorAvailability.locationName,
            hospitalType: doctorAvailability.hospitalType,
            consultationFee: doctorAvailability.consultationFee,
            maxPatients: doctorAvailability.maxPatients,
            bookedCount: doctorAvailability.bookedCount,
            doctorId: doctors.id,
            specialization: doctors.specialization,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(doctorAvailability)
          .leftJoin(doctors, eq(doctors.id, doctorAvailability.doctorId))
          .leftJoin(users, eq(users.id, doctors.userId))
          .where(
            and(
              eq(doctorAvailability.isActive, true),
              eq(doctorAvailability.status, "active"),
              gte(doctorAvailability.availableDate, now),
              sql`${doctorAvailability.bookedCount} < ${doctorAvailability.maxPatients}`
            )
          )
          .orderBy(doctorAvailability.availableDate)
          .limit(40);

        const availableDoctorsText = availabilityRows
          .filter((r: any) => r.doctorId)
          .slice(0, 30)
          .map((r: any) => {
            const name = [r.firstName, r.lastName].filter(Boolean).join(" ");
            const dateIso = r.availableDate
              ? new Date(r.availableDate).toISOString()
              : "";
            const fee =
              r.consultationFee !== null && r.consultationFee !== undefined
                ? String(r.consultationFee)
                : null;

            return [
              `Date: ${dateIso}`,
              `Time: ${r.startTime || ""} - ${r.endTime || ""}`.trim(),
              `Doctor: ${name || "(unknown)"}`,
              `Specialization: ${r.specialization || ""}`.trim(),
              `Location: ${r.locationName || ""} (${
                r.hospitalType || ""
              })`.trim(),
              fee ? `Fee: ${fee}` : undefined,
              `Slots: ${Math.max(
                0,
                (r.maxPatients || 0) - (r.bookedCount || 0)
              )} available`,
            ]
              .filter(Boolean)
              .join(" | ");
          })
          .join("\n");

        const answer = await generatePatientAssistantReply({
          userMessage: message,
          allowMedicalRecords,
          medicalSummaryText,
          availableDoctorsText,
        });

        return res.json({ answer });
      } catch (error: any) {
        console.error("AI assistant error:", error);
        const msg = error?.message || "AI assistant failed";
        const status =
          typeof error?.status === "number"
            ? error.status
            : String(msg).includes("429") ||
              String(msg).includes("RESOURCE_EXHAUSTED") ||
              String(msg).includes("Too Many Requests")
            ? 429
            : null;

        if (String(msg).includes("GEMINI_API_KEY")) {
          return res.status(501).send(msg);
        }

        if (status === 429) {
          return res
            .status(429)
            .send(
              "Gemini API quota/rate limit exceeded for this API key. Please wait and try again. If it keeps happening, check your Google AI Studio / Google Cloud quotas or enable billing."
            );
        }

        return res.status(500).send(msg);
      }
    }
  );

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

  // Verify patient by ID, NIC, and RFID (for doctor access to medical records)
  app.post("/api/patients/verify", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const { patientId, nic, rfid } = req.body;

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Only doctors can verify patients for medical record access
      if (user.role !== "doctor") {
        return res
          .status(403)
          .json({ message: "Only doctors can verify patient access" });
      }

      // Validate at least one identifier is provided
      if (!patientId && !nic && !rfid) {
        return res.status(400).json({
          message:
            "At least one identifier (Patient ID, NIC, or RFID) is required",
        });
      }

      // Search for patient by any provided identifier
      let patient;

      if (patientId) {
        // Search by Health ID (the user-facing patient ID)
        const allPatients = await db
          .select()
          .from(patients)
          .where(eq(patients.healthId, patientId));
        patient = allPatients[0];
      } else if (nic) {
        // Search by NIC
        const allPatients = await db
          .select()
          .from(patients)
          .where(eq(patients.nic, nic));
        patient = allPatients[0];
      } else if (rfid) {
        // Search by RFID
        const allPatients = await db
          .select()
          .from(patients)
          .where(eq(patients.rfid, rfid));
        patient = allPatients[0];
      }

      if (!patient) {
        // Log failed search attempt
        await storage.createAccessLog({
          userId,
          userRole: user.role,
          patientId: patientId || "unknown",
          accessType: "view",
          resourceType: "patient_info",
          resourceId: patientId || nic || rfid || "unknown",
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get("user-agent") || undefined,
        });

        return res.status(404).json({
          message: "Patient not found with the provided identifier.",
        });
      }

      // Verification successful - log access
      await storage.createAccessLog({
        userId,
        userRole: user.role,
        patientId: patient.id,
        accessType: "view",
        resourceType: "patient_info",
        resourceId: patient.id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent") || undefined,
      });

      // Get full patient info with user data
      const patientUser = await storage.getUser(patient.userId);

      res.json({
        verified: true,
        patient: {
          ...patient,
          firstName: patientUser?.firstName,
          lastName: patientUser?.lastName,
          email: patientUser?.email,
        },
      });
    } catch (error) {
      console.error("Error verifying patient:", error);
      res.status(500).json({ message: "Failed to verify patient" });
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
            experienceYears: doctor.experience, // Map experience to experienceYears
            user: {
              firstName: user?.firstName || "Unknown",
              lastName: user?.lastName || "",
              email: user?.email || "",
              username: user?.username || "",
            },
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

      // Automatically update finished status for past availabilities
      const now = new Date();
      const updatedAvailability = await Promise.all(
        availability.map(async (avail) => {
          const availDate = new Date(avail.availableDate);
          const [endHour, endMinute] = avail.endTime.split(":").map(Number);
          availDate.setHours(endHour, endMinute, 0, 0);

          // If end time has passed and status is not already finished or deleted
          if (
            availDate < now &&
            avail.status !== "finished" &&
            avail.status !== "deleted" &&
            avail.status !== "deletion_requested"
          ) {
            await storage.updateDoctorAvailability(avail.id, {
              status: "finished",
              updatedAt: new Date(),
            });
            return { ...avail, status: "finished" };
          }
          return avail;
        })
      );

      res.json(updatedAvailability);
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

        // Automatically update finished status for past availabilities
        const now = new Date();
        const updatedAvailability = await Promise.all(
          availability.map(async (avail) => {
            const availDate = new Date(avail.availableDate);
            const [endHour, endMinute] = avail.endTime.split(":").map(Number);
            availDate.setHours(endHour, endMinute, 0, 0);

            // If end time has passed and status is not already finished or deleted
            if (
              availDate < now &&
              avail.status !== "finished" &&
              avail.status !== "deleted" &&
              avail.status !== "deletion_requested"
            ) {
              await storage.updateDoctorAvailability(avail.id, {
                status: "finished",
                updatedAt: new Date(),
              });
              return { ...avail, status: "finished" };
            }
            return avail;
          })
        );

        res.json(updatedAvailability);
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
    async (req: any, res) => {
      try {
        const { isActive } = req.body;
        const userId = req.user.id;

        if (typeof isActive !== "boolean") {
          return res
            .status(400)
            .json({ message: "isActive must be a boolean" });
        }

        const status = isActive ? "active" : "inactive";
        const updateData: any = {
          isActive,
          status,
          reactivationRequested: false, // Clear any pending reactivation request
          reactivationRequestedAt: null,
          updatedAt: new Date(),
        };

        // Track deactivation by admin
        if (!isActive) {
          updateData.deactivatedBy = "admin";
          updateData.deactivatedAt = new Date();
        } else {
          // Clear deactivation tracking when reactivating
          updateData.deactivatedBy = null;
          updateData.deactivatedAt = null;
        }

        const availability = await storage.updateDoctorAvailability(
          req.params.id,
          updateData
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
            } has been ${isActive ? "activated" : "deactivated"} by admin. ${
              !isActive
                ? "You can request reactivation or permanently delete this availability."
                : ""
            }`,
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

        if (!updated) {
          return res
            .status(500)
            .json({ message: "Failed to request reactivation" });
        }

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

  // Request deletion (Doctor only) - requires admin approval
  app.patch(
    "/api/doctor-availability/:id/request-deletion",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        if (user?.role !== "doctor") {
          return res.status(403).json({
            message: "Only doctors can request availability deletion",
          });
        }

        const availability = await storage.getDoctorAvailability(req.params.id);
        if (!availability) {
          return res.status(404).json({ message: "Availability not found" });
        }

        const doctor = await storage.getDoctorByUserId(userId);
        if (doctor?.id !== availability.doctorId) {
          return res.status(403).json({
            message: "You can only request deletion for your own availability",
          });
        }

        // 6-hour rule (same safety constraint as previous delete flow)
        const availabilityDateTime = new Date(
          `${availability.availableDate}T${availability.startTime}`
        );
        const now = new Date();
        const hoursDifference =
          (availabilityDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursDifference < 6) {
          return res.status(400).json({
            message:
              "Cannot request deletion less than 6 hours before scheduled time",
          });
        }

        const updated = await storage.updateDoctorAvailability(req.params.id, {
          isActive: false,
          status: "deletion_requested",
          deactivatedBy: "doctor",
          deactivatedAt: new Date(),
          updatedAt: new Date(),
        });

        if (!updated) {
          return res
            .status(500)
            .json({ message: "Failed to request deletion" });
        }

        // Notify admins
        const admins = await storage.getAllUsers();
        const adminUsers = admins.filter((u) => u.role === "admin");

        for (const admin of adminUsers) {
          await storage.createNotification({
            recipientId: admin.id,
            type: "system",
            title: "Availability Deletion Request",
            message: `Dr. ${user.firstName} ${user.lastName} requested to delete availability at ${availability.locationName}.`,
            relatedEntityId: updated.id,
          });
        }

        return res.json(updated);
      } catch (error) {
        console.error("Error requesting availability deletion:", error);
        return res.status(500).json({ message: "Failed to request deletion" });
      }
    }
  );

  // Reject deletion request (Admin only)
  app.patch(
    "/api/doctor-availability/:id/reject-deletion",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        if (user?.role !== "admin") {
          return res.status(403).json({
            message: "Only admins can reject availability deletion requests",
          });
        }

        const availability = await storage.getDoctorAvailability(req.params.id);
        if (!availability) {
          return res.status(404).json({ message: "Availability not found" });
        }

        if (availability.status !== "deletion_requested") {
          return res.status(400).json({
            message:
              "This availability does not have a pending deletion request",
          });
        }

        const updated = await storage.updateDoctorAvailability(req.params.id, {
          status: "inactive",
          isActive: false,
          updatedAt: new Date(),
        });

        if (!updated) {
          return res
            .status(500)
            .json({ message: "Failed to reject deletion request" });
        }

        // Notify doctor
        const doctor = await storage.getDoctor(availability.doctorId);
        if (doctor?.userId) {
          await storage.createNotification({
            recipientId: doctor.userId,
            type: "system",
            title: "Availability Deletion Rejected",
            message: `Your deletion request for availability at ${availability.locationName} was rejected by an admin.`,
            relatedEntityId: availability.id,
          });
        }

        return res.json(updated);
      } catch (error) {
        console.error("Error rejecting availability deletion:", error);
        return res
          .status(500)
          .json({ message: "Failed to reject deletion request" });
      }
    }
  );

  // Delete doctor availability (soft delete by doctor, hard delete by admin)
  app.delete(
    "/api/doctor-availability/:id",
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
          return res.status(403).json({
            message:
              "Doctors cannot delete availability directly. Please request admin approval.",
          });
        } else if (user?.role === "admin") {
          if (availability.status !== "deletion_requested") {
            return res.status(403).json({
              message:
                "Admin can delete availability only after a doctor requests deletion",
            });
          }

          // Admin can hard delete - but first cancel all associated appointments
          const allAppointments = await storage.getAllAppointments();
          const affectedAppointments = allAppointments.filter(
            (apt) =>
              apt.availabilityId === availability.id &&
              apt.status !== "cancelled" &&
              apt.status !== "completed"
          );

          // Cancel all affected appointments
          for (const appointment of affectedAppointments) {
            await storage.updateAppointmentStatus(appointment.id, "cancelled");
            await db
              .update(appointments)
              .set({
                cancelledBy: "admin",
                cancellationReason:
                  "Appointment cancelled because the doctor availability was deleted",
                cancelledAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(appointments.id, appointment.id));

            // Notify each patient about cancellation
            if (appointment.patientId) {
              const patient = await storage.getPatient(appointment.patientId);
              const patientUser = patient?.userId
                ? await storage.getUser(patient.userId)
                : null;

              const appointmentDateIso = new Date(
                appointment.appointmentDate
              ).toISOString();
              const doctorName =
                (appointment as any)?.doctorName ||
                (appointment as any)?.doctor ||
                null;

              if (patientUser?.id) {
                await storage.createNotification({
                  recipientId: patientUser.id,
                  type: "appointment",
                  title: "Appointment Cancelled",
                  message: `Your appointment on ${new Date(
                    appointment.appointmentDate
                  ).toLocaleDateString()} has been cancelled because the doctor availability was deleted.`,
                  relatedEntityId: appointment.id,
                });
              }

              // Email (best-effort)
              if (patientUser?.email) {
                const fullName = `${patientUser.firstName || ""} ${
                  patientUser.lastName || ""
                }`.trim();
                try {
                  await sendAppointmentCancelledEmail({
                    to: patientUser.email,
                    fullName: fullName || patientUser.username,
                    appointmentDateIso,
                    appointmentTime: (appointment as any)?.appointmentTime,
                    doctorName,
                    reason:
                      "The doctor is no longer available at the selected time.",
                  });
                } catch (e) {
                  console.warn(
                    "Availability delete: appointment-cancel email threw:",
                    e
                  );
                }
              }
            }
          }

          // Now hard delete the availability
          await storage.deleteDoctorAvailability(req.params.id);
          res.json({
            message: "Availability deleted successfully",
            cancelledAppointments: affectedAppointments.length,
          });
        } else {
          return res.status(403).json({
            message: "You don't have permission to delete availability",
          });
        }
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

      let appointmentsList: any[] = [];
      if (user?.role === "patient") {
        const patient = await storage.getPatientByUserId(userId);
        if (patient) {
          appointmentsList = await storage.getAppointmentsByPatient(patient.id);
        }
      } else if (user?.role === "doctor") {
        const doctor = await storage.getDoctorByUserId(userId);
        if (doctor) {
          appointmentsList = await storage.getAppointmentsByDoctor(doctor.id);
        }
      } else if (user?.role === "admin") {
        // Admin can see all appointments - already enriched from storage
        appointmentsList = await storage.getAllAppointments();
      }

      // Check if any appointments are linked to deleted availability and auto-cancel them
      for (const appointment of appointmentsList) {
        if (
          appointment.availabilityId &&
          appointment.status !== "cancelled" &&
          appointment.status !== "completed"
        ) {
          const availability = await storage.getDoctorAvailability(
            appointment.availabilityId
          );
          if (availability && availability.status === "deleted") {
            // Auto-cancel the appointment
            await storage.updateAppointmentStatus(appointment.id, "cancelled");
            await db
              .update(appointments)
              .set({
                cancelledBy: "doctor",
                cancellationReason: "Doctor not available",
                cancelledAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(appointments.id, appointment.id));

            // Update the appointment object to reflect the change
            appointment.status = "cancelled";
            appointment.cancelledBy = "doctor";
            appointment.cancellationReason = "Doctor not available";
            appointment.cancelledAt = new Date();
          }
        }
      }

      // Data is already enriched with JOINs in storage methods
      console.log(
        `Fetched ${appointmentsList.length} appointments for ${user?.role}`
      );
      if (appointmentsList.length > 0) {
        console.log(`Sample appointment:`, {
          id: appointmentsList[0].id,
          patientName: appointmentsList[0].patientName,
          doctorName: appointmentsList[0].doctorName,
          specialization: appointmentsList[0].specialization,
          status: appointmentsList[0].status,
        });
      }

      // Prevent caching to ensure fresh data
      res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
        Expires: "0",
      });

      res.json(appointmentsList);
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

        const currentAppointment = await storage.getAppointment(req.params.id);
        if (!currentAppointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // Check permissions
        // Patient can cancel their own appointments
        if (user?.role !== "admin") {
          if (status === "cancelled" && user?.role === "patient") {
            // Allow patient to cancel their own appointment
            const patient = await storage.getPatientByUserId(userId);
            if (patient?.id !== currentAppointment.patientId) {
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

        // Admin restrictions:
        // - Admin cannot approve pending appointments
        // - Admin can cancel only if doctor requested cancellation
        if (user?.role === "admin") {
          if (
            status === "confirmed" &&
            currentAppointment.status === "pending"
          ) {
            return res.status(403).json({
              message: "Only the doctor can approve appointments",
            });
          }

          if (
            status === "cancelled" &&
            currentAppointment.status !== "cancellation_requested"
          ) {
            return res.status(403).json({
              message:
                "Admin can cancel appointments only when the doctor requests cancellation",
            });
          }
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

        // Only doctors can approve
        if (user?.role !== "doctor") {
          return res.status(403).json({
            message: "Only doctors can approve appointments",
          });
        }

        // Get the appointment
        const appointment = await storage.getAppointment(req.params.id);
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // Verify doctor owns this appointment
        const doctor = await storage.getDoctorByUserId(userId);
        if (doctor?.id !== appointment.doctorId) {
          return res.status(403).json({
            message: "You can only approve your own appointments",
          });
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

        // Ensure a medical record exists for this completed appointment.
        // Without this, the patient Medical Records tab remains empty even after consultations.
        const existingMedicalRecord = await db
          .select({ id: medicalRecords.id })
          .from(medicalRecords)
          .where(eq(medicalRecords.appointmentId, updated.id))
          .limit(1);

        if (!existingMedicalRecord[0]) {
          const diagnosisFromReason = String(appointment.reason || "")
            .trim()
            .slice(0, 500);
          const diagnosis = diagnosisFromReason || "Consultation";

          await db.insert(medicalRecords).values({
            patientId: appointment.patientId,
            doctorId: doctor.id,
            appointmentId: updated.id,
            diagnosis,
            symptoms: null,
            notes:
              typeof notes === "string" && notes.trim().length
                ? notes.trim()
                : null,
            vitalSigns: null,
          });
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
              qrCode: generatePrescriptionQrCode(),
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

        // Admin can only reschedule after doctor approval (confirmed)
        if (user?.role === "admin" && appointment.status !== "confirmed") {
          return res.status(403).json({
            message: "Admin can reschedule only after doctor approval",
          });
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
      let doctorId = (req.body as any)?.doctorId;

      // If a doctor is creating the record, always bind to their doctor profile
      const userId = (req as any)?.user?.id;
      const user = userId ? await storage.getUser(userId) : null;
      if (user?.role === "doctor") {
        const doctor = await storage.getDoctorByUserId(userId);
        if (!doctor) {
          return res.status(404).json({ message: "Doctor profile not found" });
        }
        doctorId = doctor.id;
      }

      const validatedData = insertMedicalRecordSchema.parse({
        ...req.body,
        doctorId,
      });
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
        // Primary: patient profile linked directly to this user
        let patient = await storage.getPatientByUserId(userId);

        // Fallback: older data path may have missed patients.userId link.
        // In that case, resolve patient via the approved registration NIC.
        if (!patient) {
          const regRows = await db
            .select({ nic: patientRegistrationRequests.nic })
            .from(patientRegistrationRequests)
            .where(eq(patientRegistrationRequests.approvedUserId, userId))
            .limit(1);
          const reg = regRows[0];
          if (reg?.nic) {
            const patientRows = await db
              .select()
              .from(patients)
              .where(eq(patients.nic, reg.nic))
              .limit(1);
            patient = patientRows[0];
          }
        }
        if (patient) {
          // Get medical records with doctor information including specialty
          const rawRecords = await db
            .select({
              id: medicalRecords.id,
              patientId: medicalRecords.patientId,
              doctorId: medicalRecords.doctorId,
              appointmentId: medicalRecords.appointmentId,
              diagnosis: medicalRecords.diagnosis,
              symptoms: medicalRecords.symptoms,
              notes: medicalRecords.notes,
              vitalSigns: medicalRecords.vitalSigns,
              createdAt: medicalRecords.createdAt,
              updatedAt: medicalRecords.updatedAt,
              doctorFirstName: users.firstName,
              doctorLastName: users.lastName,
              doctorSpecialty: doctors.specialization,
            })
            .from(medicalRecords)
            .leftJoin(doctors, eq(doctors.id, medicalRecords.doctorId))
            .leftJoin(users, eq(users.id, doctors.userId))
            .where(eq(medicalRecords.patientId, patient.id))
            .orderBy(medicalRecords.createdAt);

          // Map to add computed doctorName
          records = rawRecords.map((record) => ({
            ...record,
            doctorName:
              record.doctorFirstName && record.doctorLastName
                ? `${record.doctorFirstName} ${record.doctorLastName}`
                : null,
            doctorFirstName: undefined,
            doctorLastName: undefined,
          }));
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

  // Get all medical records issued by the current doctor
  app.get(
    "/api/medical-records/doctor/mine",
    isDoctor,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Get doctor record
        const doctor = await storage.getDoctorByUserId(userId);
        if (!doctor) {
          return res.status(404).json({ message: "Doctor profile not found" });
        }

        // Get all medical records created by this doctor with patient info
        const records = await db
          .select({
            id: sql`${db.schema.medicalRecords}.id`,
            patientId: sql`${db.schema.medicalRecords}.patient_id`,
            diagnosis: sql`${db.schema.medicalRecords}.diagnosis`,
            symptoms: sql`${db.schema.medicalRecords}.symptoms`,
            notes: sql`${db.schema.medicalRecords}.notes`,
            vitalSigns: sql`${db.schema.medicalRecords}.vital_signs`,
            createdAt: sql`${db.schema.medicalRecords}.created_at`,
            appointmentId: sql`${db.schema.medicalRecords}.appointment_id`,
            patientName: sql`CONCAT(${db.schema.users}.first_name, ' ', ${db.schema.users}.last_name)`,
            patientHealthId: sql`${db.schema.patients}.health_id`,
          })
          .from(sql`medical_records`)
          .leftJoin(
            sql`patients`,
            sql`patients.id = medical_records.patient_id`
          )
          .leftJoin(sql`users`, sql`users.id = patients.user_id`)
          .where(sql`medical_records.doctor_id = ${doctor.id}`)
          .orderBy(sql`medical_records.created_at DESC`);

        res.json(records);
      } catch (error) {
        console.error("Error fetching doctor medical records:", error);
        res.status(500).json({ message: "Failed to fetch medical records" });
      }
    }
  );

  // ============================================================================
  // MEDICAL DOCUMENTS ROUTES (Lab Reports, Medical Files)
  // ============================================================================

  // Create access log helper function
  const logAccess = async (
    userId: string,
    userRole: string,
    patientId: string,
    accessType: string,
    resourceType: string,
    resourceId: string | null,
    req: any
  ) => {
    try {
      await storage.createAccessLog({
        userId,
        userRole,
        patientId,
        accessType,
        resourceType,
        resourceId: resourceId || undefined,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent") || undefined,
      });
    } catch (error) {
      console.error("Error logging access:", error);
    }
  };

  // Upload medical document
  app.post("/api/medical-documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Validate that only doctors and patients can upload
      if (!["doctor", "patient"].includes(user.role)) {
        return res
          .status(403)
          .json({ message: "Only doctors and patients can upload documents" });
      }

      let doctorId: string | undefined = (req.body as any)?.doctorId;
      if (user.role === "doctor") {
        const doctor = await storage.getDoctorByUserId(userId);
        if (!doctor) {
          return res.status(404).json({ message: "Doctor profile not found" });
        }
        doctorId = doctor.id;
      }

      const documentData = {
        ...req.body,
        doctorId,
        uploadedBy: userId,
        uploadedByRole: user.role,
        isPublic: user.role === "doctor" ? req.body.isPublic ?? true : false, // Doctor uploads are public by default
      };

      const document = await storage.createMedicalDocument(documentData);

      // Log the upload
      await logAccess(
        userId,
        user.role,
        documentData.patientId,
        "upload",
        "document",
        document.id,
        req
      );

      res.status(201).json(document);
    } catch (error: any) {
      console.error("Error uploading medical document:", error);
      res
        .status(400)
        .json({ message: error.message || "Failed to upload document" });
    }
  });

  // Upload medical document file (stores file on disk, returns metadata + relative path)
  app.post(
    "/api/medical-documents/upload-file",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Validate that only doctors and patients can upload
        if (!["doctor", "patient"].includes(user.role)) {
          return res.status(403).json({
            message: "Only doctors and patients can upload documents",
          });
        }

        const multer = await import("multer");
        const path = await import("path");
        const fs = await import("fs");

        const uploadsRoot = path.join(
          process.cwd(),
          "uploads",
          "medical-documents"
        );
        if (!fs.existsSync(uploadsRoot)) {
          fs.mkdirSync(uploadsRoot, { recursive: true });
        }

        const safeName = (name: string) => {
          const base = path.basename(name || "document");
          return base.replace(/[^a-zA-Z0-9._-]+/g, "_");
        };

        const allowedExt = new Set([
          ".pdf",
          ".png",
          ".jpg",
          ".jpeg",
          ".doc",
          ".docx",
        ]);

        const storageEngine = multer.default.diskStorage({
          destination: (r: any, _file, cb) => {
            const patientId = String(r.body?.patientId || "").trim();
            if (!patientId) {
              return cb(new Error("patientId is required"), "");
            }

            const folder = path.join(uploadsRoot, patientId);
            if (!fs.existsSync(folder)) {
              fs.mkdirSync(folder, { recursive: true });
            }
            cb(null, folder);
          },
          filename: (_req, file, cb) => {
            const originalSafe = safeName(file.originalname || "document");
            cb(null, `doc-${Date.now()}-${originalSafe}`);
          },
        });

        const upload = multer.default({
          storage: storageEngine,
          limits: { fileSize: 25 * 1024 * 1024 },
          fileFilter: (_req, file, cb) => {
            const ext = path.extname(file.originalname || "").toLowerCase();
            if (!allowedExt.has(ext)) {
              return cb(
                new Error(
                  "Invalid file type. Allowed: pdf, png, jpg, jpeg, doc, docx"
                )
              );
            }
            cb(null, true);
          },
        });

        upload.single("file")(req, res, async (err) => {
          if (err) {
            console.error("Medical document file upload error:", err);
            return res
              .status(400)
              .json({ message: err.message || "Upload failed" });
          }

          const patientId = String(req.body?.patientId || "").trim();
          if (!patientId) {
            return res.status(400).json({ message: "patientId is required" });
          }

          // If a patient is uploading, they can only upload to their own patient profile.
          if (user.role === "patient") {
            const patient = await storage.getPatientByUserId(userId);
            if (!patient || patient.id !== patientId) {
              return res
                .status(403)
                .json({ message: "Access denied to upload for this patient" });
            }
          }

          const file = req.file as any;
          if (!file?.path) {
            return res.status(400).json({ message: "No file provided" });
          }

          const relativePath = path
            .relative(process.cwd(), file.path)
            .split(path.sep)
            .join(path.posix.sep);

          const ext = path.extname(file.originalname || "").toLowerCase();
          const fileType = ext ? ext.replace(/^\./, "") : "";

          return res.json({
            fileUrl: relativePath,
            fileName: String(file.originalname || file.filename || "document"),
            fileType:
              fileType ||
              String(file.mimetype || "")
                .split("/")
                .pop(),
            fileSize: Number(file.size || 0) || undefined,
          });
        });
      } catch (error: any) {
        console.error("Medical document upload-file init error:", error);
        return res.status(500).json({
          message: error?.message || "Failed to initialize upload",
        });
      }
    }
  );

  // Download a medical document file (secure)
  app.get(
    "/api/medical-documents/:id/file",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);
        const { id } = req.params;

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Admin has no access
        if (user.role === "admin") {
          return res.status(403).json({
            message: "Admins do not have access to medical documents",
          });
        }

        const document = await storage.getMedicalDocument(id);
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }

        // Patient can only access their own documents
        if (user.role === "patient") {
          const patient = await storage.getPatientByUserId(userId);
          if (!patient || patient.id !== document.patientId) {
            return res.status(403).json({ message: "Access denied" });
          }

          // Patients see only public documents (uploaded by doctors) and their own uploads
          if (!document.isPublic && document.uploadedBy !== userId) {
            return res.status(403).json({ message: "Access denied" });
          }
        }

        // If fileUrl is external, redirect.
        const fileUrl = String((document as any).fileUrl || "");
        if (/^https?:\/\//i.test(fileUrl)) {
          return res.redirect(fileUrl);
        }

        const path = await import("path");
        const fs = await import("fs");

        const rel = fileUrl.replace(/\\/g, "/");
        const abs = path.resolve(process.cwd(), rel);
        const uploadsRoot = path.resolve(process.cwd(), "uploads");

        // Prevent path traversal: must stay within uploads folder.
        if (!abs.startsWith(uploadsRoot + path.sep) && abs !== uploadsRoot) {
          return res.status(400).json({ message: "Invalid document path" });
        }

        if (!fs.existsSync(abs)) {
          return res.status(404).json({ message: "File not found" });
        }

        const download = String(req.query?.download || "") === "1";
        if (download) {
          const safeName = String(
            (document as any).fileName || "document"
          ).replace(/[\r\n]/g, " ");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${safeName}"`
          );
        }

        // Log access
        await logAccess(
          userId,
          user.role,
          document.patientId,
          download ? "download" : "view",
          "document",
          document.id,
          req
        );

        return res.sendFile(abs);
      } catch (error) {
        console.error("Error downloading medical document:", error);
        return res.status(500).json({ message: "Failed to download document" });
      }
    }
  );

  // Get medical documents for a patient (with access control)
  app.get(
    "/api/medical-documents/patient/:patientId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);
        const { patientId } = req.params;

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Admin can only see basic patient info, not medical documents
        if (user.role === "admin") {
          return res.status(403).json({
            message: "Admins do not have access to medical documents",
          });
        }

        // Patient can only see their own documents
        if (user.role === "patient") {
          const patient = await storage.getPatientByUserId(userId);
          if (!patient || patient.id !== patientId) {
            return res
              .status(403)
              .json({ message: "Access denied to this patient's documents" });
          }
        }

        // Doctor needs valid verification (we'll implement this in the UI)
        // For now, doctors can access after proper authentication

        const documents = await storage.getMedicalDocumentsByPatient(patientId);

        // Filter documents based on role
        let filteredDocuments = documents;
        if (user.role === "patient") {
          // Patients see only public documents (uploaded by doctors) and their own uploads
          filteredDocuments = documents.filter(
            (doc) => doc.isPublic || doc.uploadedBy === userId
          );
        }

        // Log the access
        await logAccess(
          userId,
          user.role,
          patientId,
          "view",
          "document",
          null,
          req
        );

        res.json(filteredDocuments);
      } catch (error) {
        console.error("Error fetching medical documents:", error);
        res.status(500).json({ message: "Failed to fetch medical documents" });
      }
    }
  );

  // Get medical documents for an appointment
  app.get(
    "/api/medical-documents/appointment/:appointmentId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);
        const { appointmentId } = req.params;

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Get appointment to verify access
        const appointment = await storage.getAppointment(appointmentId);
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }

        // Verify user has access to this appointment
        if (user.role === "patient") {
          const patient = await storage.getPatientByUserId(userId);
          if (!patient || patient.id !== appointment.patientId) {
            return res.status(403).json({ message: "Access denied" });
          }
        } else if (user.role === "doctor") {
          const doctor = await storage.getDoctorByUserId(userId);
          if (!doctor || doctor.id !== appointment.doctorId) {
            return res.status(403).json({ message: "Access denied" });
          }
        } else if (user.role !== "admin") {
          return res.status(403).json({ message: "Access denied" });
        }

        const documents = await storage.getMedicalDocumentsByAppointment(
          appointmentId
        );

        // Log the access
        await logAccess(
          userId,
          user.role,
          appointment.patientId,
          "view",
          "document",
          null,
          req
        );

        res.json(documents);
      } catch (error) {
        console.error("Error fetching appointment documents:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch appointment documents" });
      }
    }
  );

  // Delete medical document
  app.delete(
    "/api/medical-documents/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);
        const { id } = req.params;

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Get the document to check ownership
        const document = await storage.getMedicalDocument(id);
        if (!document) {
          return res.status(404).json({ message: "Document not found" });
        }

        // Only the uploader can delete (or admin with special permission)
        if (document.uploadedBy !== userId && user.role !== "admin") {
          return res
            .status(403)
            .json({ message: "You can only delete your own uploads" });
        }

        await storage.deleteMedicalDocument(id);

        // Log the deletion
        await logAccess(
          userId,
          user.role,
          document.patientId,
          "delete",
          "document",
          id,
          req
        );

        res.json({ message: "Document deleted successfully" });
      } catch (error) {
        console.error("Error deleting medical document:", error);
        res.status(500).json({ message: "Failed to delete document" });
      }
    }
  );

  // Get access logs for a patient (admin and doctors only)
  app.get(
    "/api/access-logs/patient/:patientId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);
        const { patientId } = req.params;

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Only admin and doctors can view access logs
        if (!["admin", "doctor"].includes(user.role)) {
          return res
            .status(403)
            .json({ message: "Access denied to view logs" });
        }

        const logs = await storage.getAccessLogsByPatient(patientId);
        res.json(logs);
      } catch (error) {
        console.error("Error fetching access logs:", error);
        res.status(500).json({ message: "Failed to fetch access logs" });
      }
    }
  );

  // Get all medical documents uploaded by the current doctor
  app.get(
    "/api/medical-documents/doctor/mine",
    isDoctor,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Get doctor record
        const doctor = await storage.getDoctorByUserId(userId);
        if (!doctor) {
          return res.status(404).json({ message: "Doctor profile not found" });
        }

        // Get all documents uploaded by this doctor with patient info
        const documents = await db
          .select({
            id: sql`medical_documents.id`,
            patientId: sql`medical_documents.patient_id`,
            documentType: sql`medical_documents.document_type`,
            title: sql`medical_documents.title`,
            description: sql`medical_documents.description`,
            fileUrl: sql`medical_documents.file_url`,
            fileName: sql`medical_documents.file_name`,
            fileType: sql`medical_documents.file_type`,
            fileSize: sql`medical_documents.file_size`,
            uploadedByRole: sql`medical_documents.uploaded_by_role`,
            createdAt: sql`medical_documents.created_at`,
            patientName: sql`CONCAT(${sql.identifier(
              "users"
            )}.first_name, ' ', ${sql.identifier("users")}.last_name)`,
            patientHealthId: sql`${patients}.health_id`,
          })
          .from(sql`medical_documents`)
          .leftJoin(
            sql`patients`,
            sql`patients.id = medical_documents.patient_id`
          )
          .leftJoin(sql`users`, sql`users.id = patients.user_id`)
          .where(sql`medical_documents.doctor_id = ${doctor.id}`)
          .orderBy(sql`medical_documents.created_at DESC`);

        res.json(documents);
      } catch (error) {
        console.error("Error fetching doctor medical documents:", error);
        res.status(500).json({ message: "Failed to fetch medical documents" });
      }
    }
  );

  // ============================================================================
  // PRESCRIPTION ROUTES
  // ============================================================================
  const generatePrescriptionQrCode = () => {
    // Keep QR payload simple + URL-safe, and avoid collisions.
    // Example: RX-1704067200000-9F3A1C2D4E5F
    return `RX-${Date.now()}-${randomBytes(6).toString("hex").toUpperCase()}`;
  };

  // Helper function to generate custom prescription ID
  const generatePrescriptionId = async () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);
    const dateStr = `${day}/${month}/${year}`;

    // Get count of prescriptions created today
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const todayPrescriptions = await db
      .select()
      .from(prescriptions)
      .where(
        sql`${prescriptions.createdAt} >= ${todayStart.toISOString()} AND ${
          prescriptions.createdAt
        } < ${todayEnd.toISOString()}`
      );

    const sequence = String(todayPrescriptions.length + 1).padStart(3, "0");
    return `MV-PRES-${dateStr}-${sequence}`;
  };

  const getEffectivePrescriptionStatus = (
    status: string | null | undefined,
    expiryDate: unknown,
    dispensedAt: unknown
  ) => {
    const normalizedStatus = (status || "").toLowerCase();

    // If already finalized, do not override
    if (
      normalizedStatus === "dispensed" ||
      normalizedStatus === "cancelled" ||
      normalizedStatus === "expired" ||
      normalizedStatus === "not_dispensed"
    ) {
      return normalizedStatus || "issued";
    }

    // If already dispensed by timestamp, treat as dispensed
    if (dispensedAt) return "dispensed";

    if (!expiryDate) return normalizedStatus || "issued";

    const expiry = new Date(expiryDate as any);
    if (!Number.isFinite(expiry.getTime())) return normalizedStatus || "issued";

    return expiry.getTime() < Date.now()
      ? "expired"
      : normalizedStatus || "issued";
  };

  app.post("/api/prescriptions", isDoctorOrAdmin, async (req, res) => {
    try {
      const { items, ...prescriptionData } = req.body;

      // Bind doctorId to the authenticated doctor's profile (prevents mis-linking to userId)
      const userId = (req as any)?.user?.id;
      const user = userId ? await storage.getUser(userId) : null;
      let doctorId = (prescriptionData as any)?.doctorId;
      if (user?.role === "doctor") {
        const doctor = await storage.getDoctorByUserId(userId);
        if (!doctor) {
          return res.status(404).json({ message: "Doctor profile not found" });
        }
        doctorId = doctor.id;
      }

      // Ensure expiryDate is consistent when validityDays is provided
      const validityDays =
        typeof (prescriptionData as any)?.validityDays === "number"
          ? (prescriptionData as any).validityDays
          : 90;
      const dateIssued = (prescriptionData as any)?.dateIssued
        ? new Date((prescriptionData as any).dateIssued)
        : new Date();

      const expiryDate = (prescriptionData as any)?.expiryDate
        ? new Date((prescriptionData as any).expiryDate)
        : (() => {
            const d = new Date(dateIssued);
            d.setDate(d.getDate() + validityDays);
            return d;
          })();

      // Generate custom prescription ID and QR code
      const customId = await generatePrescriptionId();
      const qrCode = generatePrescriptionQrCode();

      const validatedPrescription = insertPrescriptionSchema.parse({
        ...prescriptionData,
        doctorId,
        id: customId,
        qrCode,
        status: "active",
        dateIssued,
        validityDays,
        expiryDate,
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

  // Fallback: generate QR code for an existing prescription (if missing)
  app.post(
    "/api/prescriptions/:id/generate-qr",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const prescriptionId = req.params.id;

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const [prescription] = await db
          .select({
            id: prescriptions.id,
            patientId: prescriptions.patientId,
            doctorId: prescriptions.doctorId,
            qrCode: prescriptions.qrCode,
          })
          .from(prescriptions)
          .where(eq(prescriptions.id, prescriptionId));

        if (!prescription) {
          return res.status(404).json({ message: "Prescription not found" });
        }

        // Authorization: patient (own), doctor (own), admin
        if (user.role === "patient") {
          const patient = await storage.getPatientByUserId(userId);
          if (!patient || patient.id !== prescription.patientId) {
            return res.status(403).json({ message: "Forbidden" });
          }
        } else if (user.role === "doctor") {
          const doctor = await storage.getDoctorByUserId(userId);
          if (!doctor || doctor.id !== prescription.doctorId) {
            return res.status(403).json({ message: "Forbidden" });
          }
        } else if (user.role !== "admin") {
          return res.status(403).json({ message: "Forbidden" });
        }

        const existingQr = (prescription.qrCode || "").trim();
        if (existingQr) {
          return res.json({ id: prescription.id, qrCode: existingQr });
        }

        const newQrCode = generatePrescriptionQrCode();
        const [updatedPrescription] = await db
          .update(prescriptions)
          .set({ qrCode: newQrCode, updatedAt: new Date() })
          .where(eq(prescriptions.id, prescriptionId))
          .returning({ id: prescriptions.id, qrCode: prescriptions.qrCode });

        res.json(updatedPrescription);
      } catch (error: any) {
        console.error("Error generating prescription QR code:", error);
        res.status(500).json({
          message: error.message || "Failed to generate QR code",
        });
      }
    }
  );

  app.get("/api/prescriptions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      let result: any[] = [];
      if (user?.role === "patient") {
        const patient = await storage.getPatientByUserId(userId);
        if (patient) {
          // Get prescriptions with doctor information including specialty
          const rawPrescriptions = await db
            .select({
              id: prescriptions.id,
              patientId: prescriptions.patientId,
              doctorId: prescriptions.doctorId,
              status: prescriptions.status,
              issuedDate: prescriptions.dateIssued,
              validUntil: prescriptions.expiryDate,
              notes: prescriptions.notes,
              qrCode: prescriptions.qrCode,
              scannedCount: prescriptions.scannedCount,
              lastScannedAt: prescriptions.lastScannedAt,
              dispensedAt: prescriptions.dispensedAt,
              dispensedBy: prescriptions.dispensedBy,
              doctorFirstName: users.firstName,
              doctorLastName: users.lastName,
              doctorSpecialty: doctors.specialization,
            })
            .from(prescriptions)
            .leftJoin(doctors, eq(doctors.id, prescriptions.doctorId))
            .leftJoin(users, eq(users.id, doctors.userId))
            .where(eq(prescriptions.patientId, patient.id))
            .orderBy(prescriptions.dateIssued);

          // Map to add computed doctorName
          const patientPrescriptions = rawPrescriptions.map((record) => ({
            ...record,
            status: getEffectivePrescriptionStatus(
              record.status,
              record.validUntil,
              record.dispensedAt
            ),
            doctorName:
              record.doctorFirstName && record.doctorLastName
                ? `${record.doctorFirstName} ${record.doctorLastName}`
                : null,
            doctorFirstName: undefined,
            doctorLastName: undefined,
          }));

          // Get items for each prescription
          result = await Promise.all(
            patientPrescriptions.map(async (prescription) => {
              const items = await db
                .select()
                .from(prescriptionItems)
                .where(eq(prescriptionItems.prescriptionId, prescription.id));
              return { ...prescription, items };
            })
          );
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
  });

  // Get all prescriptions issued by the current doctor
  app.get("/api/prescriptions/doctor/mine", isDoctor, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get doctor record
      const doctor = await storage.getDoctorByUserId(userId);
      if (!doctor) {
        return res.status(404).json({ message: "Doctor profile not found" });
      }

      // Get all prescriptions issued by this doctor with patient info and items
      const rawDoctorPrescriptions = await db
        .select({
          id: prescriptions.id,
          patientId: prescriptions.patientId,
          doctorId: prescriptions.doctorId,
          status: prescriptions.status,
          issuedDate: prescriptions.dateIssued,
          validUntil: prescriptions.expiryDate,
          notes: prescriptions.notes,
          qrCode: prescriptions.qrCode,
          scannedCount: prescriptions.scannedCount,
          lastScannedAt: prescriptions.lastScannedAt,
          dispensedAt: prescriptions.dispensedAt,
          dispensedBy: prescriptions.dispensedBy,
          patientFirstName: users.firstName,
          patientLastName: users.lastName,
          patientHealthId: patients.healthId,
        })
        .from(prescriptions)
        .leftJoin(patients, eq(patients.id, prescriptions.patientId))
        .leftJoin(users, eq(users.id, patients.userId))
        .where(eq(prescriptions.doctorId, doctor.id))
        .orderBy(desc(prescriptions.dateIssued));

      const doctorPrescriptions = rawDoctorPrescriptions.map((p) => ({
        ...p,
        status: getEffectivePrescriptionStatus(
          p.status,
          p.validUntil,
          p.dispensedAt
        ),
        patientName:
          p.patientFirstName && p.patientLastName
            ? `${p.patientFirstName} ${p.patientLastName}`
            : "Unknown Patient",
        patientFirstName: undefined,
        patientLastName: undefined,
      }));

      // Get items for each prescription
      const prescriptionsWithItems = await Promise.all(
        doctorPrescriptions.map(async (prescription) => {
          const items = await db
            .select()
            .from(prescriptionItems)
            .where(eq(prescriptionItems.prescriptionId, prescription.id));
          return { ...prescription, items };
        })
      );

      res.json(prescriptionsWithItems);
    } catch (error) {
      console.error("Error fetching doctor prescriptions:", error);
      res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
  });

  // Pharmacist scan prescription QR code
  app.post(
    "/api/prescriptions/scan/:qrCode",
    isPharmacist,
    async (req: any, res) => {
      try {
        const { qrCode } = req.params;
        const userId = req.user.id;

        // Get pharmacist ID from user ID (prescriptions.lastScannedBy references pharmacists.id)
        const pharmacistResult = await db
          .select()
          .from(pharmacists)
          .where(eq(pharmacists.userId, userId))
          .limit(1);

        if (!pharmacistResult || pharmacistResult.length === 0) {
          return res
            .status(404)
            .json({ message: "Pharmacist profile not found" });
        }

        const pharmacistId = pharmacistResult[0].id;

        // Find prescription by QR code
        const prescription = await db
          .select()
          .from(prescriptions)
          .where(eq(prescriptions.qrCode, qrCode))
          .limit(1);

        if (!prescription || prescription.length === 0) {
          return res.status(404).json({ message: "Prescription not found" });
        }

        const prescriptionData = prescription[0];

        // Check if prescription is valid
        if (prescriptionData.status === "cancelled") {
          return res
            .status(400)
            .json({ message: "Prescription has been cancelled" });
        }

        // Update prescription with scan tracking
        const currentScanCount = prescriptionData.scannedCount || 0;
        const now = new Date();

        await db
          .update(prescriptions)
          .set({
            scannedCount: currentScanCount + 1,
            lastScannedAt: now,
            lastScannedBy: pharmacistId,
          })
          .where(eq(prescriptions.id, prescriptionData.id));

        // Send notification to patient about prescription scan
        if (prescriptionData.patientId) {
          const patientRecord = await db
            .select()
            .from(patients)
            .where(eq(patients.id, prescriptionData.patientId))
            .limit(1);

          if (patientRecord && patientRecord.length > 0) {
            const patientUserId = patientRecord[0].userId;
            const pharmacistUser = await db
              .select()
              .from(users)
              .where(eq(users.id, userId))
              .limit(1);

            const pharmacistName =
              pharmacistUser.length > 0
                ? `${pharmacistUser[0].firstName} ${pharmacistUser[0].lastName}`
                : "Pharmacist";

            await storage.createNotification({
              recipientId: patientUserId,
              type: "prescription",
              title: "Prescription Scanned",
              message: `Your prescription (${prescriptionData.id}) has been scanned by ${pharmacistName} at the pharmacy.`,
              relatedEntityId: prescriptionData.id,
            });
          }
        }

        // Return the same response shape as the GET scan endpoint
        const patientData = await db
          .select()
          .from(patients)
          .where(eq(patients.id, prescriptionData.patientId))
          .limit(1);

        let patientName = "Unknown Patient";
        if (patientData && patientData.length > 0) {
          const patientUser = await db
            .select()
            .from(users)
            .where(eq(users.id, patientData[0].userId))
            .limit(1);
          if (patientUser && patientUser.length > 0) {
            patientName = `${patientUser[0].firstName || ""} ${
              patientUser[0].lastName || ""
            }`.trim();
          }
        }

        const doctorData = await db
          .select()
          .from(doctors)
          .where(eq(doctors.id, prescriptionData.doctorId))
          .limit(1);

        let doctorName = "Unknown Doctor";
        if (doctorData && doctorData.length > 0) {
          const doctorUser = await db
            .select()
            .from(users)
            .where(eq(users.id, doctorData[0].userId))
            .limit(1);
          if (doctorUser && doctorUser.length > 0) {
            doctorName = `${doctorUser[0].firstName || ""} ${
              doctorUser[0].lastName || ""
            }`.trim();
          }
        }

        const items = await db
          .select()
          .from(prescriptionItems)
          .where(eq(prescriptionItems.prescriptionId, prescriptionData.id));

        const medications = items.map((item: any) => ({
          name: item.medicineName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
        }));

        // Resolve dispensed pharmacist name (if already dispensed)
        let dispensedByName: string | null = null;
        let dispensedByLicenseNumber: string | null = null;
        if (prescriptionData.dispensedBy) {
          const dispPharmacist = await db
            .select()
            .from(pharmacists)
            .where(eq(pharmacists.id, prescriptionData.dispensedBy))
            .limit(1);

          if (dispPharmacist && dispPharmacist.length > 0) {
            dispensedByLicenseNumber = dispPharmacist[0].licenseNumber ?? null;
            const dispUser = await db
              .select()
              .from(users)
              .where(eq(users.id, dispPharmacist[0].userId))
              .limit(1);
            if (dispUser && dispUser.length > 0) {
              dispensedByName = `${dispUser[0].firstName || ""} ${
                dispUser[0].lastName || ""
              }`.trim();
            }
          }
        }

        res.json({
          id: prescriptionData.id,
          qrCode: prescriptionData.qrCode,
          patientName,
          doctorName,
          issuedDate: prescriptionData.dateIssued,
          expiryDate: prescriptionData.expiryDate,
          status: getEffectivePrescriptionStatus(
            prescriptionData.status,
            prescriptionData.expiryDate,
            prescriptionData.dispensedAt
          ),
          diagnosis: prescriptionData.diagnosis,
          specialInstructions: prescriptionData.specialInstructions,
          medications,
          items,
          pharmacistNotes: prescriptionData.pharmacistNotes,
          substitutedMedications: prescriptionData.substitutedMedications,
          counselingNotes: prescriptionData.counselingNotes,
          lastScannedAt: now,
          dispensedAt: prescriptionData.dispensedAt,
          dispensedBy: prescriptionData.dispensedBy,
          dispensedByName,
          dispensedByLicenseNumber,
          message: "Prescription scanned",
        });
      } catch (error) {
        console.error("Error scanning prescription:", error);
        res.status(500).json({ message: "Failed to scan prescription" });
      }
    }
  );

  // Get prescription by QR code (for pharmacist scanning)
  app.get(
    "/api/prescriptions/scan/:qrCode",
    isPharmacist,
    async (req: any, res) => {
      try {
        const { qrCode } = req.params;
        const userId = req.user.id;
        console.log(
          "🔍 NEW CODE RUNNING: Fetching prescription with QR code:",
          qrCode
        );

        // Find prescription by QR code
        const result = await db
          .select()
          .from(prescriptions)
          .where(eq(prescriptions.qrCode, qrCode))
          .limit(1);

        if (!result || result.length === 0) {
          return res.status(404).json({ message: "Prescription not found" });
        }

        const prescriptionData = result[0];

        let updatedLastScannedAt = prescriptionData.lastScannedAt;
        let updatedLastScannedBy = prescriptionData.lastScannedBy;

        console.log("🔍 Looking up pharmacist for user ID:", userId);

        // Get pharmacist ID from user ID
        const pharmacistResult = await db
          .select()
          .from(pharmacists)
          .where(eq(pharmacists.userId, userId))
          .limit(1);

        console.log("📋 Pharmacist lookup result:", {
          found: pharmacistResult && pharmacistResult.length > 0,
          count: pharmacistResult?.length,
          data:
            pharmacistResult && pharmacistResult.length > 0
              ? pharmacistResult[0]
              : null,
        });

        if (pharmacistResult && pharmacistResult.length > 0) {
          const pharmacistId = pharmacistResult[0].id;
          const currentScanCount = prescriptionData.scannedCount || 0;
          const now = new Date();

          console.log("📝 Updating scan tracking:", {
            prescriptionId: prescriptionData.id,
            prescriptionIdType: typeof prescriptionData.id,
            pharmacistId,
            pharmacistIdType: typeof pharmacistId,
            currentScanCount,
            newScanCount: currentScanCount + 1,
          });

          // Update scan tracking using the correct where clause
          const updateResult = await db
            .update(prescriptions)
            .set({
              scannedCount: currentScanCount + 1,
              lastScannedAt: now,
              lastScannedBy: pharmacistId,
            })
            .where(eq(prescriptions.id, prescriptionData.id))
            .returning();

          console.log(
            "✅ Scan tracking updated successfully, rows affected:",
            updateResult.length
          );
          console.log("📋 Updated prescription data:", {
            id: updateResult[0]?.id,
            lastScannedBy: updateResult[0]?.lastScannedBy,
            lastScannedAt: updateResult[0]?.lastScannedAt,
          });

          updatedLastScannedAt = updateResult[0]?.lastScannedAt ?? now;
          updatedLastScannedBy = updateResult[0]?.lastScannedBy ?? pharmacistId;

          // Send notification to patient about prescription scan
          if (prescriptionData.patientId) {
            const patientRecord = await db
              .select()
              .from(patients)
              .where(eq(patients.id, prescriptionData.patientId))
              .limit(1);

            if (patientRecord && patientRecord.length > 0) {
              const patientUserId = patientRecord[0].userId;

              // Get pharmacist name for notification
              const pharmacistUser = await db
                .select()
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

              const pharmacistName =
                pharmacistUser.length > 0
                  ? `${pharmacistUser[0].firstName} ${pharmacistUser[0].lastName}`
                  : "Pharmacist";

              await storage.createNotification({
                recipientId: patientUserId,
                type: "prescription",
                title: "Prescription Scanned",
                message: `Your prescription (${prescriptionData.id}) has been scanned by ${pharmacistName} at the pharmacy.`,
                relatedEntityId: prescriptionData.id,
              });

              console.log("✅ Notification sent to patient:", patientUserId);
            }
          }
        } else {
          console.warn("⚠️ Pharmacist not found for user:", userId);
        }

        // Get patient info
        const patientData = await db
          .select()
          .from(patients)
          .where(eq(patients.id, prescriptionData.patientId))
          .limit(1);

        let patientName = "Unknown Patient";
        if (patientData && patientData.length > 0) {
          const patientUser = await db
            .select()
            .from(users)
            .where(eq(users.id, patientData[0].userId))
            .limit(1);
          if (patientUser && patientUser.length > 0) {
            patientName = `${patientUser[0].firstName || ""} ${
              patientUser[0].lastName || ""
            }`.trim();
          }
        }

        // Get doctor info
        const doctorData = await db
          .select()
          .from(doctors)
          .where(eq(doctors.id, prescriptionData.doctorId))
          .limit(1);

        let doctorName = "Unknown Doctor";
        if (doctorData && doctorData.length > 0) {
          const doctorUser = await db
            .select()
            .from(users)
            .where(eq(users.id, doctorData[0].userId))
            .limit(1);
          if (doctorUser && doctorUser.length > 0) {
            doctorName = `${doctorUser[0].firstName || ""} ${
              doctorUser[0].lastName || ""
            }`.trim();
          }
        }

        // Get prescription items (medications)
        const items = await db
          .select()
          .from(prescriptionItems)
          .where(eq(prescriptionItems.prescriptionId, prescriptionData.id));

        // Format medications
        const medications = items.map((item: any) => ({
          name: item.medicineName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
        }));

        // Resolve dispensed pharmacist name (if already dispensed)
        let dispensedByName: string | null = null;
        let dispensedByLicenseNumber: string | null = null;
        if (prescriptionData.dispensedBy) {
          const dispPharmacist = await db
            .select()
            .from(pharmacists)
            .where(eq(pharmacists.id, prescriptionData.dispensedBy))
            .limit(1);

          if (dispPharmacist && dispPharmacist.length > 0) {
            dispensedByLicenseNumber = dispPharmacist[0].licenseNumber ?? null;
            const dispUser = await db
              .select()
              .from(users)
              .where(eq(users.id, dispPharmacist[0].userId))
              .limit(1);
            if (dispUser && dispUser.length > 0) {
              dispensedByName = `${dispUser[0].firstName || ""} ${
                dispUser[0].lastName || ""
              }`.trim();
            }
          }
        }

        const response = {
          id: prescriptionData.id,
          qrCode: prescriptionData.qrCode,
          patientName: patientName,
          doctorName: doctorName,
          issuedDate: prescriptionData.dateIssued,
          expiryDate: prescriptionData.expiryDate,
          status: prescriptionData.status,
          diagnosis: prescriptionData.diagnosis,
          specialInstructions: prescriptionData.specialInstructions,
          medications,
          items,
          pharmacistNotes: prescriptionData.pharmacistNotes,
          substitutedMedications: prescriptionData.substitutedMedications,
          counselingNotes: prescriptionData.counselingNotes,
          lastScannedAt: updatedLastScannedAt,
          lastScannedBy: updatedLastScannedBy,
          dispensedAt: prescriptionData.dispensedAt,
          dispensedBy: prescriptionData.dispensedBy,
          dispensedByName,
          dispensedByLicenseNumber,
        };

        res.json(response);
      } catch (error) {
        console.error("Error fetching prescription by QR:", error);
        res.status(500).json({ message: "Failed to fetch prescription" });
      }
    }
  );

  // Log prescription scan (update last scanned timestamp)
  app.post(
    "/api/prescriptions/:id/scan-log",
    isPharmacist,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const userId = req.user.id;

        // Get pharmacist record
        const pharmacist = await db
          .select()
          .from(pharmacists)
          .where(eq(pharmacists.userId, userId))
          .limit(1);

        if (!pharmacist || pharmacist.length === 0) {
          return res
            .status(404)
            .json({ message: "Pharmacist profile not found" });
        }

        const pharmacistId = pharmacist[0].id;

        const currentPrescription = await db
          .select()
          .from(prescriptions)
          .where(eq(prescriptions.id, id))
          .limit(1);

        if (!currentPrescription || currentPrescription.length === 0) {
          return res.status(404).json({ message: "Prescription not found" });
        }

        const scannedCount = (currentPrescription[0].scannedCount || 0) + 1;

        await db
          .update(prescriptions)
          .set({
            scannedCount,
            lastScannedAt: new Date(),
            lastScannedBy: pharmacistId,
          })
          .where(eq(prescriptions.id, id));

        res.json({ success: true, scannedCount });
      } catch (error) {
        console.error("Error logging prescription scan:", error);
        res.status(500).json({ message: "Failed to log scan" });
      }
    }
  );

  // Mark dispense status per prescription item, then finalize prescription
  app.patch(
    "/api/prescriptions/:id/dispense-items",
    isPharmacist,
    async (req: any, res) => {
      try {
        const prescriptionId = req.params.id;
        const userId = req.user.id;

        const {
          items,
          pharmacistNotes,
          substitutedMedications,
          counselingNotes,
        } = req.body || {};

        if (!Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ message: "Items are required" });
        }

        // Get pharmacist
        const pharmacistResult = await db
          .select()
          .from(pharmacists)
          .where(eq(pharmacists.userId, userId))
          .limit(1);

        if (!pharmacistResult || pharmacistResult.length === 0) {
          return res
            .status(404)
            .json({ message: "Pharmacist profile not found" });
        }

        const pharmacistId = pharmacistResult[0].id;
        const pharmacistLicenseNumber =
          pharmacistResult[0].licenseNumber ?? null;

        // Load prescription
        const [prescription] = await db
          .select({
            id: prescriptions.id,
            patientId: prescriptions.patientId,
            status: prescriptions.status,
            expiryDate: prescriptions.expiryDate,
          })
          .from(prescriptions)
          .where(eq(prescriptions.id, prescriptionId));

        if (!prescription) {
          return res.status(404).json({ message: "Prescription not found" });
        }

        if (prescription.status === "cancelled") {
          return res
            .status(400)
            .json({ message: "Prescription has been cancelled" });
        }

        // Past-expiry prescriptions must be marked as expired (with notes)
        const effectiveStatus = getEffectivePrescriptionStatus(
          prescription.status,
          prescription.expiryDate,
          null
        );
        if (
          effectiveStatus === "expired" &&
          prescription.status !== "expired"
        ) {
          return res.status(400).json({
            message:
              "Prescription is past its expiry date. Please mark it as expired with notes.",
          });
        }

        const now = new Date();

        // Update each item (only if it belongs to this prescription)
        for (const item of items) {
          if (!item?.id || typeof item.dispensed !== "boolean") continue;

          const isDispensed = item.dispensed === true;

          await db
            .update(prescriptionItems)
            .set({
              dispensed: isDispensed,
              dispensedAt: isDispensed ? now : null,
              dispensedBy: isDispensed ? pharmacistId : null,
            })
            .where(
              and(
                eq(prescriptionItems.id, String(item.id)),
                eq(prescriptionItems.prescriptionId, prescriptionId)
              )
            );
        }

        // Determine final status
        const updatedItems = await db
          .select()
          .from(prescriptionItems)
          .where(eq(prescriptionItems.prescriptionId, prescriptionId));

        const allDispensed =
          updatedItems.length > 0 &&
          updatedItems.every((i: any) => i.dispensed);

        const finalStatus = allDispensed ? "dispensed" : "not_dispensed";

        if (
          finalStatus === "not_dispensed" &&
          !String(pharmacistNotes || "").trim()
        ) {
          return res.status(400).json({
            message:
              "Notes are required when one or more medicines are not dispensed (e.g., out of stock).",
          });
        }

        // Finalize prescription as processed/dispensed
        await db
          .update(prescriptions)
          .set({
            status: finalStatus,
            dispensedAt: now,
            dispensedBy: pharmacistId,
            pharmacistNotes: pharmacistNotes || null,
            substitutedMedications: substitutedMedications || null,
            counselingNotes: counselingNotes || null,
            updatedAt: now,
          })
          .where(eq(prescriptions.id, prescriptionId));

        // Notify patient
        if (prescription.patientId) {
          const patientRecord = await db
            .select()
            .from(patients)
            .where(eq(patients.id, prescription.patientId))
            .limit(1);

          if (patientRecord && patientRecord.length > 0) {
            const patientUserId = patientRecord[0].userId;

            const pharmacistUser = await db
              .select()
              .from(users)
              .where(eq(users.id, userId))
              .limit(1);

            const pharmacistName =
              pharmacistUser.length > 0
                ? `${pharmacistUser[0].firstName} ${pharmacistUser[0].lastName}`
                : "Pharmacist";

            await storage.createNotification({
              recipientId: patientUserId,
              type: "prescription",
              title:
                finalStatus === "dispensed"
                  ? "Prescription Dispensed"
                  : "Prescription Not Dispensed",
              message:
                finalStatus === "dispensed"
                  ? `Your prescription (${prescriptionId}) has been processed by ${pharmacistName}.`
                  : `Your prescription (${prescriptionId}) could not be dispensed by ${pharmacistName}. ${
                      pharmacistNotes ? `Reason: ${pharmacistNotes}` : ""
                    }`,
              relatedEntityId: prescriptionId,
            });
          }
        }

        // Return updated items + dispense info (including pharmacist name)
        const pharmacistUser = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        const dispensedByName =
          pharmacistUser.length > 0
            ? `${pharmacistUser[0].firstName || ""} ${
                pharmacistUser[0].lastName || ""
              }`.trim()
            : null;

        res.json({
          success: true,
          status: finalStatus,
          dispensedAt: now,
          dispensedBy: pharmacistId,
          dispensedByName,
          dispensedByLicenseNumber: pharmacistLicenseNumber,
          items: updatedItems,
        });
      } catch (error) {
        console.error("Error dispensing prescription items:", error);
        res
          .status(500)
          .json({ message: "Failed to dispense prescription items" });
      }
    }
  );

  // Update prescription with dispensing details
  app.patch(
    "/api/prescriptions/:id/dispense",
    isPharmacist,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const {
          status,
          pharmacistNotes,
          substitutedMedications,
          counselingNotes,
          quantityDispensed,
        } = req.body;
        const userId = req.user.id;

        console.log("🔄 Updating prescription:", {
          id,
          status,
          pharmacistNotes,
        });

        // Get pharmacist record
        const pharmacist = await db
          .select()
          .from(pharmacists)
          .where(eq(pharmacists.userId, userId))
          .limit(1);

        if (!pharmacist || pharmacist.length === 0) {
          return res
            .status(404)
            .json({ message: "Pharmacist profile not found" });
        }

        const pharmacistId = pharmacist[0].id;

        const updateData: any = {
          pharmacistNotes,
          status,
        };

        if (status === "dispensed") {
          updateData.dispensedAt = new Date();
          updateData.dispensedBy = pharmacistId;
          updateData.substitutedMedications = substitutedMedications || null;
          updateData.counselingNotes = counselingNotes || null;
          updateData.quantityDispensed = quantityDispensed || null;
        } else if (status === "expired") {
          updateData.dispensedAt = new Date();
          updateData.dispensedBy = pharmacistId;
        } else if (status === "not_dispensed") {
          updateData.dispensedAt = new Date();
          updateData.dispensedBy = pharmacistId;
          updateData.substitutedMedications = substitutedMedications || null;
          updateData.counselingNotes = counselingNotes || null;
          updateData.quantityDispensed = quantityDispensed || null;
        }

        // Handle both numeric ID and string ID (like "MV-PRES-17/12/25-001")
        const whereClause = isNaN(Number(id))
          ? eq(prescriptions.id, id)
          : eq(prescriptions.id, parseInt(id));

        const result = await db
          .update(prescriptions)
          .set(updateData)
          .where(whereClause)
          .returning();

        console.log("✅ Prescription updated successfully");

        // Send notification to patient about prescription status change
        if (result && result.length > 0) {
          const prescription = result[0];

          // Get patient user ID
          const patientRecord = await db
            .select()
            .from(patients)
            .where(eq(patients.id, prescription.patientId))
            .limit(1);

          if (patientRecord && patientRecord.length > 0) {
            const patientUserId = patientRecord[0].userId;

            // Get pharmacist name
            const pharmacistUser = await db
              .select()
              .from(users)
              .where(eq(users.id, userId))
              .limit(1);

            const pharmacistName =
              pharmacistUser.length > 0
                ? `${pharmacistUser[0].firstName} ${pharmacistUser[0].lastName}`
                : "Pharmacist";

            let notificationTitle = "";
            let notificationMessage = "";

            if (status === "dispensed") {
              notificationTitle = "Prescription Dispensed";
              notificationMessage = `Your prescription (${
                prescription.id
              }) has been dispensed by ${pharmacistName}. ${
                pharmacistNotes ? "Note: " + pharmacistNotes : ""
              }`;
            } else if (status === "expired") {
              notificationTitle = "Prescription Status Updated";
              notificationMessage = `Your prescription (${
                prescription.id
              }) has been marked as expired. ${
                pharmacistNotes ? "Reason: " + pharmacistNotes : ""
              }`;
            } else if (status === "not_dispensed") {
              notificationTitle = "Prescription Not Dispensed";
              notificationMessage = `Your prescription (${
                prescription.id
              }) could not be dispensed by ${pharmacistName}. ${
                pharmacistNotes ? "Reason: " + pharmacistNotes : ""
              }`;
            }

            if (notificationTitle) {
              await storage.createNotification({
                recipientId: patientUserId,
                type: "prescription",
                title: notificationTitle,
                message: notificationMessage,
                relatedEntityId: prescription.id,
              });

              console.log("✅ Notification sent to patient:", patientUserId);
            }
          }
        }

        res.json({
          success: true,
          message: "Prescription updated successfully",
        });
      } catch (error) {
        console.error("Error dispensing prescription:", error);
        res.status(500).json({ message: "Failed to dispense prescription" });
      }
    }
  );

  // Get pharmacist statistics
  app.get(
    "/api/prescriptions/pharmacist/stats",
    isPharmacist,
    async (req: any, res) => {
      try {
        const userId = req.user.id;

        // Get pharmacist record
        const pharmacist = await db
          .select()
          .from(pharmacists)
          .where(eq(pharmacists.userId, userId))
          .limit(1);

        if (!pharmacist || pharmacist.length === 0) {
          return res
            .status(404)
            .json({ message: "Pharmacist profile not found" });
        }

        const pharmacistId = pharmacist[0].id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Scanned today - count prescriptions scanned by this pharmacist today
        const scannedTodayResult = await db
          .select({ count: count() })
          .from(prescriptions)
          .where(
            and(
              eq(prescriptions.lastScannedBy, pharmacistId),
              gte(prescriptions.lastScannedAt, today),
              // Exclude scans performed after the prescription was already expired
              sql`(${prescriptions.expiryDate} IS NULL OR ${prescriptions.expiryDate} >= ${prescriptions.lastScannedAt})`
            )
          );
        const scannedToday = Number(scannedTodayResult[0]?.count || 0);

        // Dispensed today - count prescriptions actually dispensed by this pharmacist today
        const dispensedTodayResult = await db
          .select({ count: count() })
          .from(prescriptions)
          .where(
            and(
              eq(prescriptions.dispensedBy, pharmacistId),
              gte(prescriptions.dispensedAt, today),
              eq(prescriptions.status, "dispensed")
            )
          );
        const dispensedToday = Number(dispensedTodayResult[0]?.count || 0);

        // Not dispensed today - completed as not_dispensed by this pharmacist today
        const notDispensedTodayResult = await db
          .select({ count: count() })
          .from(prescriptions)
          .where(
            and(
              eq(prescriptions.dispensedBy, pharmacistId),
              gte(prescriptions.dispensedAt, today),
              eq(prescriptions.status, "not_dispensed")
            )
          );
        const notDispensedToday = Number(
          notDispensedTodayResult[0]?.count || 0
        );

        // Processed today - any completed outcome today (dispensed / expired / not_dispensed)
        const processedTodayResult = await db
          .select({ count: count() })
          .from(prescriptions)
          .where(
            and(
              eq(prescriptions.dispensedBy, pharmacistId),
              gte(prescriptions.dispensedAt, today),
              sql`(${prescriptions.status} IN ('dispensed', 'expired', 'not_dispensed'))`
            )
          );
        const processedToday = Number(processedTodayResult[0]?.count || 0);

        // Pending - scanned by this pharmacist and not finalized yet
        // Note: prescriptions can become expired automatically by date; we still treat them as pending
        // until the pharmacist completes an action (which sets dispensedAt).
        const pendingResult = await db
          .select({ count: count() })
          .from(prescriptions)
          .where(
            and(
              eq(prescriptions.lastScannedBy, pharmacistId),
              isNull(prescriptions.dispensedAt),
              ne(prescriptions.status, "cancelled")
            )
          );
        const pending = Number(pendingResult[0]?.count || 0);

        // Total completed by this pharmacist
        const totalCompletedResult = await db
          .select({ count: count() })
          .from(prescriptions)
          .where(
            and(
              eq(prescriptions.dispensedBy, pharmacistId),
              sql`(${prescriptions.status} IN ('dispensed', 'expired', 'not_dispensed'))`
            )
          );
        const totalCompleted = Number(totalCompletedResult[0]?.count || 0);

        res.json({
          scannedToday,
          dispensedToday,
          notDispensedToday,
          processedToday,
          pending,
          totalCompleted,
        });
      } catch (error) {
        console.error("Error fetching pharmacist stats:", error);
        res.status(500).json({ message: "Failed to fetch statistics" });
      }
    }
  );

  // Get recent prescriptions for pharmacist
  app.get(
    "/api/prescriptions/pharmacist/recent",
    isPharmacist,
    async (req: any, res) => {
      try {
        const userId = req.user.id;

        // Get pharmacist record
        const pharmacist = await db
          .select()
          .from(pharmacists)
          .where(eq(pharmacists.userId, userId))
          .limit(1);

        if (!pharmacist || pharmacist.length === 0) {
          return res
            .status(404)
            .json({ message: "Pharmacist profile not found" });
        }

        const pharmacistId = pharmacist[0].id;

        console.log(
          "📋 Fetching recent prescriptions for pharmacist:",
          pharmacistId
        );

        // First, let's check if there are ANY prescriptions with lastScannedBy set
        const allScannedPrescriptions = await db
          .select({
            id: prescriptions.id,
            lastScannedBy: prescriptions.lastScannedBy,
            lastScannedAt: prescriptions.lastScannedAt,
          })
          .from(prescriptions)
          .where(sql`${prescriptions.lastScannedBy} IS NOT NULL`)
          .limit(5);

        console.log(
          "🔍 All prescriptions with scans:",
          allScannedPrescriptions
        );

        // Get recent scanned prescriptions
        const recentPrescriptions = await db
          .select({
            id: prescriptions.id,
            qrCode: prescriptions.qrCode,
            status: prescriptions.status,
            issuedDate: prescriptions.dateIssued,
            expiryDate: prescriptions.expiryDate,
            scannedCount: prescriptions.scannedCount,
            lastScannedAt: prescriptions.lastScannedAt,
            lastScannedBy: prescriptions.lastScannedBy,
            dispensedAt: prescriptions.dispensedAt,
            dispensedBy: prescriptions.dispensedBy,
            pharmacistNotes: prescriptions.pharmacistNotes,
            substitutedMedications: prescriptions.substitutedMedications,
            counselingNotes: prescriptions.counselingNotes,
            notes: prescriptions.notes,
            patientName: sql<string>`CONCAT(patient_user.first_name, ' ', patient_user.last_name)`,
            doctorName: sql<string>`CONCAT(doctor_user.first_name, ' ', doctor_user.last_name)`,
          })
          .from(prescriptions)
          .leftJoin(patients, eq(patients.id, prescriptions.patientId))
          .leftJoin(
            sql`users as patient_user`,
            sql`patient_user.id = ${patients.userId}`
          )
          .leftJoin(doctors, eq(doctors.id, prescriptions.doctorId))
          .leftJoin(
            sql`users as doctor_user`,
            sql`doctor_user.id = ${doctors.userId}`
          )
          .where(eq(prescriptions.lastScannedBy, pharmacistId))
          .orderBy(sql`${prescriptions.lastScannedAt} DESC`)
          .limit(10);

        console.log(
          "📊 Found prescriptions for this pharmacist:",
          recentPrescriptions.length
        );
        console.log(
          "📝 Sample prescription IDs:",
          recentPrescriptions.slice(0, 3).map((p) => ({
            id: p.id,
            qrCode: p.qrCode,
            lastScannedBy: p.lastScannedBy,
            lastScannedAt: p.lastScannedAt,
          }))
        );

        // Get medications for each prescription
        const prescriptionsWithMeds = await Promise.all(
          recentPrescriptions.map(async (prescription) => {
            const items = await db
              .select()
              .from(prescriptionItems)
              .where(eq(prescriptionItems.prescriptionId, prescription.id));

            const medications = items.map((item: any) => ({
              name: item.medicineName,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
            }));

            let dispensedByName: string | null = null;
            let dispensedByLicenseNumber: string | null = null;
            if ((prescription as any).dispensedBy) {
              const dispPharmacist = await db
                .select()
                .from(pharmacists)
                .where(eq(pharmacists.id, (prescription as any).dispensedBy))
                .limit(1);

              if (dispPharmacist && dispPharmacist.length > 0) {
                dispensedByLicenseNumber =
                  dispPharmacist[0].licenseNumber ?? null;
                const dispUser = await db
                  .select()
                  .from(users)
                  .where(eq(users.id, dispPharmacist[0].userId))
                  .limit(1);

                if (dispUser && dispUser.length > 0) {
                  dispensedByName = `${dispUser[0].firstName || ""} ${
                    dispUser[0].lastName || ""
                  }`.trim();
                }
              }
            }

            return {
              ...prescription,
              status: getEffectivePrescriptionStatus(
                (prescription as any).status,
                (prescription as any).expiryDate,
                (prescription as any).dispensedAt
              ),
              medications,
              dispensedByName,
              dispensedByLicenseNumber,
              items,
            };
          })
        );

        res.json(prescriptionsWithMeds);
      } catch (error) {
        console.error("Error fetching recent prescriptions:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch recent prescriptions" });
      }
    }
  );

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
      // If a doctor is creating the lab test, bind doctorId to their profile
      const userId = (req as any)?.user?.id;
      const user = userId ? await storage.getUser(userId) : null;
      let doctorId = (req.body as any)?.doctorId;
      if (user?.role === "doctor") {
        const doctor = await storage.getDoctorByUserId(userId);
        if (!doctor) {
          return res.status(404).json({ message: "Doctor profile not found" });
        }
        doctorId = doctor.id;
      }

      const validatedData = insertLabTestSchema.parse({
        ...req.body,
        doctorId,
        status: "pending",
      });
      const labTest = await storage.createLabTest(validatedData);

      // Create notification for patient
      const patient = await storage.getPatient(validatedData.patientId);
      if (patient) {
        await storage.createNotification({
          recipientId: patient.userId,
          type: "lab_result",
          title: "Lab Test Ordered",
          message: `A new ${validatedData.testName} has been ordered for you`,
          relatedEntityId: labTest.id,
        });
      }

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
          // Get lab tests with doctor information
          labTests = await db
            .select({
              id: sql`${labTestsTable}.id`,
              patientId: sql`${labTestsTable}.patient_id`,
              doctorId: sql`${labTestsTable}.doctor_id`,
              testType: sql`${labTestsTable}.test_type`,
              testName: sql`${labTestsTable}.test_name`,
              status: sql`${labTestsTable}.status`,
              requestDate: sql`${labTestsTable}.request_date`,
              completionDate: sql`${labTestsTable}.completion_date`,
              results: sql`${labTestsTable}.results`,
              resultFileUrl: sql`${labTestsTable}.result_file_url`,
              isAbnormal: sql`${labTestsTable}.is_abnormal`,
              notes: sql`${labTestsTable}.notes`,
              doctorName: sql`CONCAT(${sql.identifier(
                "users"
              )}.first_name, ' ', ${sql.identifier("users")}.last_name)`,
            })
            .from(labTestsTable)
            .leftJoin(
              sql`doctors`,
              sql`doctors.id = ${labTestsTable}.doctor_id`
            )
            .leftJoin(sql`users`, sql`users.id = doctors.user_id`)
            .where(eq(labTestsTable.patientId, patient.id))
            .orderBy(sql`${labTestsTable}.request_date DESC`);
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

  // Patient selects lab facility for their test
  app.patch(
    "/api/lab-tests/:id/select-lab",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        if (!user || user.role !== "patient") {
          return res
            .status(403)
            .json({ message: "Only patients can select labs" });
        }

        const { labFacilityId } = req.body;
        if (!labFacilityId) {
          return res
            .status(400)
            .json({ message: "Lab facility ID is required" });
        }

        const dayKeyFromDate = (date: Date) => {
          const day = date.getDay();
          switch (day) {
            case 0:
              return "sun";
            case 1:
              return "mon";
            case 2:
              return "tue";
            case 3:
              return "wed";
            case 4:
              return "thu";
            case 5:
              return "fri";
            case 6:
              return "sat";
            default:
              return "mon";
          }
        };

        const isWithinSchedule = (scheduleText: string | null, now: Date) => {
          if (!scheduleText) return true;

          let schedule: any;
          try {
            schedule = JSON.parse(scheduleText);
          } catch {
            return false;
          }

          const todayKey = dayKeyFromDate(now);
          const entry = schedule?.[todayKey];
          if (!entry || entry.enabled === false) return false;

          const start: string | undefined = entry.start;
          const end: string | undefined = entry.end;
          if (!start || !end) return false;

          const toMinutes = (t: string) => {
            const [hh, mm] = t.split(":");
            const h = Number(hh);
            const m = Number(mm);
            if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
            return h * 60 + m;
          };

          const startMin = toMinutes(start);
          const endMin = toMinutes(end);
          if (startMin === null || endMin === null) return false;

          const nowMin = now.getHours() * 60 + now.getMinutes();
          if (endMin === startMin) return false;

          // Support overnight windows (e.g., 22:00 -> 06:00)
          if (endMin < startMin) {
            return nowMin >= startMin || nowMin < endMin;
          }

          return nowMin >= startMin && nowMin < endMin;
        };

        // Ensure the selected facility is currently available to patients
        const facilityForSelection = await db
          .select()
          .from(labFacilities)
          .where(eq(labFacilities.id, labFacilityId))
          .limit(1);

        if (facilityForSelection.length === 0) {
          return res.status(404).json({ message: "Lab facility not found" });
        }

        const facilityRow = facilityForSelection[0];
        if (!facilityRow.isActive) {
          return res
            .status(400)
            .json({ message: "Selected lab facility is not active" });
        }

        if (!facilityRow.isPublished) {
          return res
            .status(400)
            .json({ message: "Selected lab facility is not published" });
        }

        if (!facilityRow.isAvailable) {
          return res
            .status(400)
            .json({ message: "Selected lab facility is not available" });
        }

        if (
          !isWithinSchedule(
            facilityRow.availabilitySchedule ?? null,
            new Date()
          )
        ) {
          return res
            .status(400)
            .json({ message: "Selected lab facility is currently closed" });
        }

        // Get patient record
        const patient = await storage.getPatientByUserId(userId);
        if (!patient) {
          return res.status(404).json({ message: "Patient profile not found" });
        }

        // Verify the test belongs to this patient and is pending
        const test = await db
          .select()
          .from(labTestsTable)
          .where(eq(labTestsTable.id, req.params.id))
          .limit(1);

        if (test.length === 0) {
          return res.status(404).json({ message: "Lab test not found" });
        }

        if (test[0].patientId !== patient.id) {
          return res
            .status(403)
            .json({ message: "This test does not belong to you" });
        }

        if (test[0].status !== "pending") {
          return res
            .status(400)
            .json({ message: "Can only select lab for pending tests" });
        }

        // Update the lab facility
        const updated = await db
          .update(labTestsTable)
          .set({
            labFacilityId: labFacilityId,
            updatedAt: new Date(),
          })
          .where(eq(labTestsTable.id, req.params.id))
          .returning();

        // Notify lab facility (if they have a technician)
        if (facilityRow.labTechnicianId) {
          const labTech = await db
            .select()
            .from(labTechnicians)
            .where(eq(labTechnicians.id, facilityRow.labTechnicianId))
            .limit(1);

          if (labTech.length > 0) {
            await storage.createNotification({
              recipientId: labTech[0].userId,
              type: "lab_result",
              title: "New Lab Test Request",
              message: `A patient has selected your facility for ${test[0].testName}`,
              relatedEntityId: test[0].id,
            });
          }
        }

        res.json(updated[0]);
      } catch (error) {
        console.error("Error selecting lab facility:", error);
        res.status(500).json({ message: "Failed to select lab facility" });
      }
    }
  );

  // Lab technician approves test with appointment date/time
  app.patch(
    "/api/lab-tests/:id/approve",
    isLabTechOrAdmin,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        const { approvedDate, sampleCollectionDate, technicianNotes } =
          req.body;

        if (!approvedDate) {
          return res
            .status(400)
            .json({ message: "Approved date/time is required" });
        }

        // Get lab technician record
        let labTechId = null;
        if (user.role === "lab_technician") {
          const labTech = await db
            .select()
            .from(labTechnicians)
            .where(eq(labTechnicians.userId, userId))
            .limit(1);

          if (labTech.length > 0) {
            labTechId = labTech[0].id;
          }
        }

        // Verify the test is pending or belongs to this lab's facility
        const test = await db
          .select()
          .from(labTestsTable)
          .where(eq(labTestsTable.id, req.params.id))
          .limit(1);

        if (test.length === 0) {
          return res.status(404).json({ message: "Lab test not found" });
        }

        if (test[0].status !== "pending") {
          return res
            .status(400)
            .json({ message: "Can only approve pending tests" });
        }

        // Update the test with approval details
        const updated = await db
          .update(labTestsTable)
          .set({
            status: "approved",
            labTechnicianId: labTechId,
            approvedDate: new Date(approvedDate),
            sampleCollectionDate: sampleCollectionDate
              ? new Date(sampleCollectionDate)
              : null,
            technicianNotes: technicianNotes || null,
            updatedAt: new Date(),
          })
          .where(eq(labTestsTable.id, req.params.id))
          .returning();

        const updatedRow =
          updated[0] ||
          ({
            id: test[0].id,
            status: "approved",
            approvedDate: new Date(approvedDate),
            sampleCollectionDate: sampleCollectionDate
              ? new Date(sampleCollectionDate)
              : null,
            technicianNotes: technicianNotes || null,
          } as any);

        // Notify patient about approval (best-effort; do not fail the approve if notification fails)
        try {
          let messageSuffix = "Please contact the lab for sample collection.";

          if (sampleCollectionDate) {
            try {
              messageSuffix = `Sample collection scheduled for ${format(
                new Date(sampleCollectionDate),
                "MMM dd, yyyy 'at' HH:mm"
              )}`;
            } catch {
              // If date formatting fails (invalid date), still approve; keep a simpler message.
              messageSuffix = "Sample collection has been scheduled.";
            }
          }

          await storage.createNotification({
            recipientId: test[0].patientId,
            type: "lab_result",
            title: "Lab Test Approved",
            message: `Your ${test[0].testName} has been approved. ${messageSuffix}`,
            relatedEntityId: test[0].id,
          });
        } catch (notifyError) {
          console.error(
            "Warning: approved lab test but failed to notify patient:",
            notifyError
          );
        }

        // Always return valid JSON
        res.json(updatedRow);
      } catch (error) {
        console.error("Error approving lab test:", error);
        res.status(500).json({ message: "Failed to approve lab test" });
      }
    }
  );

  // Lab technician starts an approved test (moves to in_progress)
  app.patch(
    "/api/lab-tests/:id/start",
    isLabTechOrAdmin,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        const test = await db
          .select()
          .from(labTestsTable)
          .where(eq(labTestsTable.id, req.params.id))
          .limit(1);

        if (test.length === 0) {
          return res.status(404).json({ message: "Lab test not found" });
        }

        if (test[0].status !== "approved") {
          return res
            .status(400)
            .json({ message: "Can only start approved tests" });
        }

        // For lab technicians, ensure the test belongs to their facility
        if (user.role === "lab_technician") {
          const labTech = await db
            .select()
            .from(labTechnicians)
            .where(eq(labTechnicians.userId, userId))
            .limit(1);

          if (labTech.length === 0) {
            return res
              .status(404)
              .json({ message: "Lab technician profile not found" });
          }

          const facility = await db
            .select()
            .from(labFacilities)
            .where(eq(labFacilities.labTechnicianId, labTech[0].id))
            .limit(1);

          if (facility.length === 0) {
            return res.status(404).json({ message: "Lab facility not found" });
          }

          if (test[0].labFacilityId !== facility[0].id) {
            return res
              .status(403)
              .json({ message: "You can only start tests for your facility" });
          }
        }

        const updated = await db
          .update(labTestsTable)
          .set({
            status: "in_progress",
            testStartDate: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(labTestsTable.id, req.params.id))
          .returning();

        res.json(updated[0]);
      } catch (error) {
        console.error("Error starting lab test:", error);
        res.status(500).json({ message: "Failed to start lab test" });
      }
    }
  );

  const authorizeLabTestReportAccess = async (req: any, labTestRow: any) => {
    const userId = req.user?.id;
    const user = userId ? await storage.getUser(userId) : null;

    if (!userId || !user) {
      return {
        ok: false as const,
        status: 401 as const,
        message: "User not found",
      };
    }

    if (user.role === "patient") {
      const patient = await storage.getPatientByUserId(userId);
      if (!patient || labTestRow.patientId !== patient.id) {
        return {
          ok: false as const,
          status: 403 as const,
          message: "Access denied",
        };
      }
      return { ok: true as const, user };
    }

    if (user.role === "doctor") {
      const doctor = await storage.getDoctorByUserId(userId);
      if (!doctor || labTestRow.doctorId !== doctor.id) {
        return {
          ok: false as const,
          status: 403 as const,
          message: "Access denied",
        };
      }
      return { ok: true as const, user };
    }

    if (user.role === "lab_technician") {
      const labTech = await db
        .select()
        .from(labTechnicians)
        .where(eq(labTechnicians.userId, userId))
        .limit(1);

      if (labTech.length === 0) {
        return {
          ok: false as const,
          status: 404 as const,
          message: "Lab technician profile not found",
        };
      }

      // If the lab test is explicitly assigned to this technician, allow access.
      if (
        labTestRow.labTechnicianId &&
        labTestRow.labTechnicianId === labTech[0].id
      ) {
        return { ok: true as const, user };
      }

      const facility = await db
        .select()
        .from(labFacilities)
        .where(eq(labFacilities.labTechnicianId, labTech[0].id))
        .limit(1);

      if (
        facility.length === 0 ||
        labTestRow.labFacilityId !== facility[0].id
      ) {
        return {
          ok: false as const,
          status: 403 as const,
          message: "Access denied",
        };
      }

      return { ok: true as const, user };
    }

    if (user.role === "admin") {
      return { ok: true as const, user };
    }

    return {
      ok: false as const,
      status: 403 as const,
      message: "Access denied",
    };
  };

  // Lab technician completes a test with a required report upload + details
  app.post(
    "/api/lab-tests/:id/complete",
    isLabTechOrAdmin,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // For lab technicians, ensure the test belongs to their facility
        if (user.role === "lab_technician") {
          const labTech = await db
            .select()
            .from(labTechnicians)
            .where(eq(labTechnicians.userId, userId))
            .limit(1);

          if (labTech.length === 0) {
            return res
              .status(404)
              .json({ message: "Lab technician profile not found" });
          }

          const facility = await db
            .select()
            .from(labFacilities)
            .where(eq(labFacilities.labTechnicianId, labTech[0].id))
            .limit(1);

          if (facility.length === 0) {
            return res.status(404).json({ message: "Lab facility not found" });
          }

          const test = await db
            .select()
            .from(labTestsTable)
            .where(eq(labTestsTable.id, req.params.id))
            .limit(1);

          if (test.length === 0) {
            return res.status(404).json({ message: "Lab test not found" });
          }

          if (test[0].labFacilityId !== facility[0].id) {
            return res.status(403).json({
              message: "You can only complete tests for your facility",
            });
          }
        }

        const multer = await import("multer");
        const path = await import("path");
        const fs = await import("fs");

        const uploadsRoot = path.join(
          process.cwd(),
          "uploads",
          "lab-test-reports"
        );
        if (!fs.existsSync(uploadsRoot)) {
          fs.mkdirSync(uploadsRoot, { recursive: true });
        }

        const safeName = (name: string) => {
          const base = path.basename(name || "report");
          return base.replace(/[^a-zA-Z0-9._-]+/g, "_");
        };

        const allowedExt = new Set([
          ".pdf",
          ".png",
          ".jpg",
          ".jpeg",
          ".doc",
          ".docx",
        ]);

        const storageEngine = multer.default.diskStorage({
          destination: (r: any, _file, cb) => {
            const folder = path.join(uploadsRoot, r.params.id);
            if (!fs.existsSync(folder)) {
              fs.mkdirSync(folder, { recursive: true });
            }
            cb(null, folder);
          },
          filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname || "").toLowerCase();
            const originalSafe = safeName(file.originalname || "report");
            const filename = `labtest-${
              req.params.id
            }-${Date.now()}-${originalSafe}`;
            // Preserve extension if missing in original
            if (!path.extname(filename) && ext) {
              return cb(null, `${filename}${ext}`);
            }
            cb(null, filename);
          },
        });

        const upload = multer.default({
          storage: storageEngine,
          limits: { fileSize: 25 * 1024 * 1024 },
          fileFilter: (_req, file, cb) => {
            const ext = path.extname(file.originalname || "").toLowerCase();
            if (!allowedExt.has(ext)) {
              return cb(
                new Error(
                  "Invalid file type. Allowed: pdf, png, jpg, jpeg, doc, docx"
                )
              );
            }
            cb(null, true);
          },
        });

        // Accept either a single file (legacy `file`) or multiple (`files[]`)
        upload.fields([
          { name: "files", maxCount: 10 },
          { name: "file", maxCount: 1 },
        ])(req, res, async (err) => {
          if (err) {
            console.error("Lab report upload error:", err);
            return res
              .status(400)
              .json({ message: err.message || "Upload failed" });
          }

          const filesObj = req.files as any;
          const files: any[] = [];
          if (filesObj?.file?.length) files.push(...filesObj.file);
          if (filesObj?.files?.length) files.push(...filesObj.files);

          if (files.length === 0) {
            return res
              .status(400)
              .json({ message: "At least one report file is required" });
          }

          const results = (req.body?.results ?? "").toString().trim();
          if (!results) {
            return res
              .status(400)
              .json({ message: "Results details are required" });
          }

          const isAbnormalRaw = (req.body?.isAbnormal ?? "").toString();
          const isAbnormal = ["true", "1", "yes", "on"].includes(
            isAbnormalRaw.toLowerCase()
          );
          const technicianNotes =
            (req.body?.technicianNotes ?? "").toString().trim() || null;

          const test = await db
            .select()
            .from(labTestsTable)
            .where(eq(labTestsTable.id, req.params.id))
            .limit(1);

          if (test.length === 0) {
            return res.status(404).json({ message: "Lab test not found" });
          }

          if (test[0].status !== "in_progress") {
            return res
              .status(400)
              .json({ message: "Can only complete in-progress tests" });
          }

          const toRelative = (p: string) =>
            path.relative(process.cwd(), p).split(path.sep).join("/");

          // Keep the first file in the legacy columns for backward compatibility.
          const primaryFile = files[0];

          let updated: any[] = [];
          try {
            await db.transaction(async (tx) => {
              updated = await tx
                .update(labTestsTable)
                .set({
                  status: "completed",
                  completionDate: new Date(),
                  results,
                  isAbnormal,
                  technicianNotes,
                  resultFileUrl: `/api/lab-tests/${req.params.id}/report`,
                  resultFilePath: toRelative(primaryFile.path),
                  resultFileName: primaryFile.originalname,
                  resultFileMime: primaryFile.mimetype,
                  resultFileSize: primaryFile.size,
                  updatedAt: new Date(),
                })
                .where(eq(labTestsTable.id, req.params.id))
                .returning();

              await tx.insert(labTestReports).values(
                files.map((f) => ({
                  labTestId: req.params.id,
                  filePath: toRelative(f.path),
                  fileName: f.originalname,
                  fileMime: f.mimetype,
                  fileSize: f.size,
                  uploadedByUserId: userId,
                  createdAt: new Date(),
                }))
              );
            });
          } catch (dbError) {
            // Best-effort cleanup of uploaded files if DB write fails
            try {
              for (const f of files) {
                try {
                  fs.unlinkSync(f.path);
                } catch {
                  // ignore
                }
              }
            } catch {
              // ignore
            }
            throw dbError;
          }

          // Notify patient (best-effort)
          try {
            await storage.createNotification({
              recipientId: test[0].patientId,
              type: "lab_result",
              title: "Lab Test Completed",
              message: `Your ${test[0].testName} results are ready.`,
              relatedEntityId: test[0].id,
            });
          } catch (notifyError) {
            console.error(
              "Warning: completed lab test but failed to notify patient:",
              notifyError
            );
          }

          return res.json(updated[0]);
        });
      } catch (error: any) {
        console.error("Error completing lab test:", error);
        res
          .status(500)
          .json({ message: error.message || "Failed to complete lab test" });
      }
    }
  );

  // List all uploaded report documents for a lab test
  app.get(
    "/api/lab-tests/:id/reports",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const test = await db
          .select()
          .from(labTestsTable)
          .where(eq(labTestsTable.id, req.params.id))
          .limit(1);

        if (test.length === 0) {
          return res.status(404).json({ message: "Lab test not found" });
        }

        const auth = await authorizeLabTestReportAccess(req, test[0]);
        if (!auth.ok) {
          return res.status(auth.status).json({ message: auth.message });
        }

        const reports = await db
          .select()
          .from(labTestReports)
          .where(eq(labTestReports.labTestId, req.params.id))
          .orderBy(desc(labTestReports.createdAt));

        res.json(
          reports.map((r: any) => ({
            id: r.id,
            fileName: r.fileName,
            fileMime: r.fileMime,
            fileSize: r.fileSize,
            createdAt: r.createdAt,
            viewUrl: `/api/lab-tests/${req.params.id}/reports/${r.id}`,
            downloadUrl: `/api/lab-tests/${req.params.id}/reports/${r.id}?download=1`,
          }))
        );
      } catch (error) {
        console.error("Error listing lab test reports:", error);
        res.status(500).json({ message: "Failed to fetch reports" });
      }
    }
  );

  // Securely serve a specific uploaded report document
  app.get(
    "/api/lab-tests/:id/reports/:reportId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const path = await import("path");
        const fs = await import("fs");

        const test = await db
          .select()
          .from(labTestsTable)
          .where(eq(labTestsTable.id, req.params.id))
          .limit(1);

        if (test.length === 0) {
          return res.status(404).json({ message: "Lab test not found" });
        }

        const auth = await authorizeLabTestReportAccess(req, test[0]);
        if (!auth.ok) {
          return res.status(auth.status).json({ message: auth.message });
        }

        const report = await db
          .select()
          .from(labTestReports)
          .where(
            and(
              eq(labTestReports.id, req.params.reportId),
              eq(labTestReports.labTestId, req.params.id)
            )
          )
          .limit(1);

        if (report.length === 0) {
          return res.status(404).json({ message: "Report not found" });
        }

        const row: any = report[0];
        const uploadsRoot = path.resolve(path.join(process.cwd(), "uploads"));
        const absolutePath = path.resolve(
          path.join(process.cwd(), row.filePath)
        );

        if (!absolutePath.startsWith(uploadsRoot + path.sep)) {
          return res.status(400).json({ message: "Invalid file path" });
        }

        if (!fs.existsSync(absolutePath)) {
          return res.status(404).json({ message: "Report file not found" });
        }

        const filename = (row.fileName || `lab-report-${row.id}`)
          .toString()
          .replace(/[^a-zA-Z0-9._-]+/g, "_");

        const wantsDownload =
          (req.query?.download ?? "").toString().toLowerCase() === "1" ||
          (req.query?.download ?? "").toString().toLowerCase() === "true";

        res.setHeader(
          "Content-Type",
          row.fileMime || "application/octet-stream"
        );
        res.setHeader(
          "Content-Disposition",
          `${wantsDownload ? "attachment" : "inline"}; filename="${filename}"`
        );
        res.sendFile(absolutePath);
      } catch (error) {
        console.error("Error serving lab report file:", error);
        res.status(500).json({ message: "Failed to fetch report" });
      }
    }
  );

  // Get pending tests for lab technician
  app.get(
    "/api/lab-tests/technician/pending",
    isLabTechOrAdmin,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Get lab technician record
        const labTech = await db
          .select()
          .from(labTechnicians)
          .where(eq(labTechnicians.userId, userId))
          .limit(1);

        if (labTech.length === 0) {
          return res
            .status(404)
            .json({ message: "Lab technician profile not found" });
        }

        // Get lab facility managed by this technician
        const facility = await db
          .select()
          .from(labFacilities)
          .where(eq(labFacilities.labTechnicianId, labTech[0].id))
          .limit(1);

        let labTests: any[] = [];

        if (facility.length > 0) {
          // Create table aliases
          const patientUsers = alias(users, "patient_users");
          const doctorUsers = alias(users, "doctor_users");

          // Get tests assigned to this facility
          labTests = await db
            .select({
              id: labTestsTable.id,
              patientId: labTestsTable.patientId,
              testType: labTestsTable.testType,
              testName: labTestsTable.testName,
              status: labTestsTable.status,
              urgency: sql`COALESCE(${labTestsTable.urgency}, 'normal')`,
              requestDate: labTestsTable.requestDate,
              approvedDate: labTestsTable.approvedDate,
              sampleCollectionDate: labTestsTable.sampleCollectionDate,
              notes: labTestsTable.notes,
              technicianNotes: labTestsTable.technicianNotes,
              patientName: sql<string>`CONCAT(${patientUsers.firstName}, ' ', ${patientUsers.lastName})`,
              patientHealthId: patients.healthId,
              doctorName: sql<string>`CONCAT(${doctorUsers.firstName}, ' ', ${doctorUsers.lastName})`,
              labFacilityName: labFacilities.name,
            })
            .from(labTestsTable)
            .leftJoin(patients, eq(patients.id, labTestsTable.patientId))
            .leftJoin(patientUsers, eq(patientUsers.id, patients.userId))
            .leftJoin(doctors, eq(doctors.id, labTestsTable.doctorId))
            .leftJoin(doctorUsers, eq(doctorUsers.id, doctors.userId))
            .leftJoin(
              labFacilities,
              eq(labFacilities.id, labTestsTable.labFacilityId)
            )
            .where(eq(labTestsTable.labFacilityId, facility[0].id))
            .orderBy(sql`${labTestsTable.requestDate} DESC`);
        }

        res.json(labTests);
      } catch (error) {
        console.error("Error fetching lab technician tests:", error);
        res.status(500).json({ message: "Failed to fetch lab tests" });
      }
    }
  );

  // Get all tests for lab technician's facility (for the Lab Tests tab)
  app.get(
    "/api/lab-tests/technician",
    isLabTechOrAdmin,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Get lab technician record
        const labTech = await db
          .select()
          .from(labTechnicians)
          .where(eq(labTechnicians.userId, userId))
          .limit(1);

        if (user.role === "lab_technician" && labTech.length === 0) {
          return res
            .status(404)
            .json({ message: "Lab technician profile not found" });
        }

        // Get lab facility managed by this technician
        const facility =
          user.role === "lab_technician"
            ? await db
                .select()
                .from(labFacilities)
                .where(eq(labFacilities.labTechnicianId, labTech[0].id))
                .limit(1)
            : [];

        if (user.role === "lab_technician" && facility.length === 0) {
          return res.status(404).json({ message: "Lab facility not found" });
        }

        // Create table aliases
        const patientUsers = alias(users, "patient_users");
        const doctorUsers = alias(users, "doctor_users");

        const labTests = await db
          .select({
            id: labTestsTable.id,
            patientId: labTestsTable.patientId,
            testType: labTestsTable.testType,
            testName: labTestsTable.testName,
            status: labTestsTable.status,
            urgency: sql`COALESCE(${labTestsTable.urgency}, 'normal')`,
            requestDate: labTestsTable.requestDate,
            approvedDate: labTestsTable.approvedDate,
            sampleCollectionDate: labTestsTable.sampleCollectionDate,
            testStartDate: labTestsTable.testStartDate,
            completionDate: labTestsTable.completionDate,
            results: labTestsTable.results,
            resultFileUrl: labTestsTable.resultFileUrl,
            isAbnormal: labTestsTable.isAbnormal,
            notes: labTestsTable.notes,
            technicianNotes: labTestsTable.technicianNotes,
            patientName: sql<string>`CONCAT(${patientUsers.firstName}, ' ', ${patientUsers.lastName})`,
            patientHealthId: patients.healthId,
            doctorName: sql<string>`CONCAT(${doctorUsers.firstName}, ' ', ${doctorUsers.lastName})`,
            labFacilityName: labFacilities.name,
          })
          .from(labTestsTable)
          .leftJoin(patients, eq(patients.id, labTestsTable.patientId))
          .leftJoin(patientUsers, eq(patientUsers.id, patients.userId))
          .leftJoin(doctors, eq(doctors.id, labTestsTable.doctorId))
          .leftJoin(doctorUsers, eq(doctorUsers.id, doctors.userId))
          .leftJoin(
            labFacilities,
            eq(labFacilities.id, labTestsTable.labFacilityId)
          )
          .where(
            user.role === "lab_technician"
              ? eq(labTestsTable.labFacilityId, facility[0].id)
              : sql`TRUE`
          )
          .orderBy(sql`${labTestsTable.requestDate} DESC`);

        res.json(labTests);
      } catch (error) {
        console.error("Error fetching lab technician lab tests:", error);
        res.status(500).json({ message: "Failed to fetch lab tests" });
      }
    }
  );

  // Securely serve the uploaded lab report file
  app.get(
    "/api/lab-tests/:id/report",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const path = await import("path");
        const fs = await import("fs");

        const test = await db
          .select()
          .from(labTestsTable)
          .where(eq(labTestsTable.id, req.params.id))
          .limit(1);

        if (test.length === 0) {
          return res.status(404).json({ message: "Lab test not found" });
        }

        const auth = await authorizeLabTestReportAccess(req, test[0]);
        if (!auth.ok) {
          return res.status(auth.status).json({ message: auth.message });
        }

        // Prefer newest report from lab_test_reports; fallback to legacy single-file columns.
        const latest = await db
          .select()
          .from(labTestReports)
          .where(eq(labTestReports.labTestId, req.params.id))
          .orderBy(desc(labTestReports.createdAt))
          .limit(1);

        const reportRow: any = latest[0] || null;
        const legacyRow: any = test[0];

        const filePath = reportRow?.filePath || legacyRow?.resultFilePath;
        if (!filePath) {
          return res.status(404).json({ message: "No report file available" });
        }

        const uploadsRoot = path.resolve(path.join(process.cwd(), "uploads"));
        const absolutePath = path.resolve(path.join(process.cwd(), filePath));

        if (!absolutePath.startsWith(uploadsRoot + path.sep)) {
          return res.status(400).json({ message: "Invalid file path" });
        }

        if (!fs.existsSync(absolutePath)) {
          return res.status(404).json({ message: "Report file not found" });
        }

        const filename = (
          reportRow?.fileName ||
          legacyRow?.resultFileName ||
          `lab-report-${req.params.id}`
        )
          .toString()
          .replace(/[^a-zA-Z0-9._-]+/g, "_");

        const mimeType =
          reportRow?.fileMime ||
          legacyRow?.resultFileMime ||
          "application/octet-stream";

        const wantsDownload =
          (req.query?.download ?? "").toString().toLowerCase() === "1" ||
          (req.query?.download ?? "").toString().toLowerCase() === "true";

        res.setHeader("Content-Type", mimeType);
        res.setHeader(
          "Content-Disposition",
          `${wantsDownload ? "attachment" : "inline"}; filename="${filename}"`
        );
        res.sendFile(absolutePath);
      } catch (error) {
        console.error("Error serving lab report file:", error);
        res.status(500).json({ message: "Failed to fetch report" });
      }
    }
  );

  // Get all lab tests requested by the current doctor
  app.get("/api/lab-tests/doctor/mine", isDoctor, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get doctor record
      const doctor = await storage.getDoctorByUserId(userId);
      if (!doctor) {
        return res.status(404).json({ message: "Doctor profile not found" });
      }

      // Get all lab tests requested by this doctor with patient info
      const labTests = await db
        .select({
          id: sql`${labTestsTable}.id`,
          patientId: sql`${labTestsTable}.patient_id`,
          testType: sql`${labTestsTable}.test_type`,
          testName: sql`${labTestsTable}.test_name`,
          status: sql`${labTestsTable}.status`,
          requestDate: sql`${labTestsTable}.request_date`,
          completionDate: sql`${labTestsTable}.completion_date`,
          results: sql`${labTestsTable}.results`,
          resultFileUrl: sql`${labTestsTable}.result_file_url`,
          isAbnormal: sql`${labTestsTable}.is_abnormal`,
          notes: sql`${labTestsTable}.notes`,
          patientName: sql`CONCAT(${sql.identifier(
            "users"
          )}.first_name, ' ', ${sql.identifier("users")}.last_name)`,
          patientHealthId: sql`${patients}.health_id`,
        })
        .from(labTestsTable)
        .leftJoin(patients, eq(patients.id, labTestsTable.patientId))
        .leftJoin(
          sql.identifier("users"),
          sql`${sql.identifier("users")}.id = ${patients}.user_id`
        )
        .where(eq(labTestsTable.doctorId, doctor.id))
        .orderBy(sql`${labTestsTable}.request_date DESC`);

      res.json(labTests);
    } catch (error) {
      console.error("Error fetching doctor lab tests:", error);
      res.status(500).json({ message: "Failed to fetch lab tests" });
    }
  });

  // Enhanced patient lab tests endpoint with all details
  app.get("/api/lab-tests/patient", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "patient") {
        return res.status(403).json({ message: "Access denied" });
      }

      const patient = await storage.getPatientByUserId(userId);
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }

      // Create table aliases
      const doctorUsers = alias(users, "doctor_users");
      const techUsers = alias(users, "tech_users");

      // Get lab tests with all related information
      const labTests = await db
        .select({
          id: labTestsTable.id,
          patientId: labTestsTable.patientId,
          doctorId: labTestsTable.doctorId,
          labFacilityId: labTestsTable.labFacilityId,
          labTechnicianId: labTestsTable.labTechnicianId,
          testType: labTestsTable.testType,
          testName: labTestsTable.testName,
          status: labTestsTable.status,
          urgency: sql`COALESCE(${labTestsTable.urgency}, 'normal')`,
          requestDate: labTestsTable.requestDate,
          approvedDate: labTestsTable.approvedDate,
          sampleCollectionDate: labTestsTable.sampleCollectionDate,
          testStartDate: labTestsTable.testStartDate,
          completionDate: labTestsTable.completionDate,
          results: labTestsTable.results,
          resultFileUrl: labTestsTable.resultFileUrl,
          isAbnormal: labTestsTable.isAbnormal,
          notes: labTestsTable.notes,
          technicianNotes: labTestsTable.technicianNotes,
          doctorName: sql<string>`CONCAT(${doctorUsers.firstName}, ' ', ${doctorUsers.lastName})`,
          doctorSpecialization: doctors.specialization,
          labFacilityName: labFacilities.name,
          labFacilityAddress: labFacilities.address,
          labFacilityCity: labFacilities.city,
          labFacilityLatitude: labFacilities.latitude,
          labFacilityLongitude: labFacilities.longitude,
          labFacilityPhone: labFacilities.phone,
          labFacilityEmail: labFacilities.email,
          labTechnicianUserId: labTechnicians.userId,
          labTechnicianName: sql<string>`CONCAT(${techUsers.firstName}, ' ', ${techUsers.lastName})`,
        })
        .from(labTestsTable)
        .leftJoin(doctors, eq(doctors.id, labTestsTable.doctorId))
        .leftJoin(doctorUsers, eq(doctorUsers.id, doctors.userId))
        .leftJoin(
          labFacilities,
          eq(labFacilities.id, labTestsTable.labFacilityId)
        )
        .leftJoin(
          labTechnicians,
          eq(labTechnicians.id, labTestsTable.labTechnicianId)
        )
        .leftJoin(techUsers, eq(techUsers.id, labTechnicians.userId))
        .where(eq(labTestsTable.patientId, patient.id))
        .orderBy(sql`${labTestsTable.requestDate} DESC`);

      res.json(labTests);
    } catch (error) {
      console.error("Error fetching patient lab tests:", error);
      res.status(500).json({ message: "Failed to fetch lab tests" });
    }
  });

  // ============================================================================
  // LAB FACILITIES ROUTES
  // ============================================================================

  // Get the current lab technician's facility (if any)
  app.get("/api/lab-facilities/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== "lab_technician") {
        return res.status(403).json({ message: "Access denied" });
      }

      const labTech = await db
        .select()
        .from(labTechnicians)
        .where(eq(labTechnicians.userId, userId))
        .limit(1);

      if (labTech.length === 0) {
        return res
          .status(404)
          .json({ message: "Lab technician profile not found" });
      }

      const facility = await db
        .select()
        .from(labFacilities)
        .where(eq(labFacilities.labTechnicianId, labTech[0].id))
        .limit(1);

      if (facility.length === 0) {
        return res
          .status(404)
          .json({ message: "No lab facility found for this technician" });
      }

      const f = facility[0];
      res.json({
        id: f.id,
        name: f.name,
        description: f.description,
        address: f.address,
        city: f.city,
        latitude: f.latitude,
        longitude: f.longitude,
        phone: f.phone,
        email: f.email,
        isActive: f.isActive,
        isVerified: f.isVerified,
        isPublished: f.isPublished,
        isAvailable: f.isAvailable,
        availabilitySchedule: f.availabilitySchedule,
      });
    } catch (error) {
      console.error("Error fetching technician lab facility:", error);
      res.status(500).json({ message: "Failed to fetch lab facility" });
    }
  });

  // Update the current lab technician's publish/availability settings
  app.patch(
    "/api/lab-facilities/me/settings",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = await storage.getUser(userId);

        if (!user || user.role !== "lab_technician") {
          return res.status(403).json({ message: "Access denied" });
        }

        const {
          isPublished,
          isAvailable,
          availabilitySchedule,
          name,
          description,
          address,
          city,
          phone,
          email,
          latitude,
          longitude,
        } = req.body;

        if (
          typeof isPublished === "undefined" &&
          typeof isAvailable === "undefined" &&
          typeof availabilitySchedule === "undefined" &&
          typeof name === "undefined" &&
          typeof description === "undefined" &&
          typeof address === "undefined" &&
          typeof city === "undefined" &&
          typeof phone === "undefined" &&
          typeof email === "undefined" &&
          typeof latitude === "undefined" &&
          typeof longitude === "undefined"
        ) {
          return res.status(400).json({ message: "No settings provided" });
        }

        if (
          typeof isPublished !== "undefined" &&
          typeof isPublished !== "boolean"
        ) {
          return res
            .status(400)
            .json({ message: "isPublished must be a boolean" });
        }

        if (
          typeof isAvailable !== "undefined" &&
          typeof isAvailable !== "boolean"
        ) {
          return res
            .status(400)
            .json({ message: "isAvailable must be a boolean" });
        }

        if (typeof name !== "undefined" && typeof name !== "string") {
          return res.status(400).json({ message: "name must be a string" });
        }

        if (
          typeof description !== "undefined" &&
          description !== null &&
          typeof description !== "string"
        ) {
          return res
            .status(400)
            .json({ message: "description must be string|null" });
        }

        if (typeof address !== "undefined" && typeof address !== "string") {
          return res.status(400).json({ message: "address must be a string" });
        }

        if (typeof city !== "undefined" && typeof city !== "string") {
          return res.status(400).json({ message: "city must be a string" });
        }

        if (
          typeof phone !== "undefined" &&
          phone !== null &&
          typeof phone !== "string"
        ) {
          return res.status(400).json({ message: "phone must be string|null" });
        }

        if (
          typeof email !== "undefined" &&
          email !== null &&
          typeof email !== "string"
        ) {
          return res.status(400).json({ message: "email must be string|null" });
        }

        const normalizeDecimal = (value: unknown, field: string) => {
          if (value === null) return null;
          if (typeof value === "number") return value.toString();
          if (typeof value === "string") {
            const trimmed = value.trim();
            if (!trimmed) return null;
            if (!Number.isFinite(Number(trimmed))) {
              throw new Error(`${field} must be a number`);
            }
            return trimmed;
          }
          if (typeof value === "undefined") return undefined;
          throw new Error(`${field} must be string|number|null`);
        };

        let latitudeText: string | null | undefined = undefined;
        let longitudeText: string | null | undefined = undefined;
        try {
          latitudeText = normalizeDecimal(latitude, "latitude");
          longitudeText = normalizeDecimal(longitude, "longitude");
        } catch (e: any) {
          return res
            .status(400)
            .json({ message: e?.message || "Invalid coordinates" });
        }

        let scheduleText: string | null | undefined = undefined;
        if (typeof availabilitySchedule !== "undefined") {
          if (availabilitySchedule === null) {
            scheduleText = null;
          } else if (typeof availabilitySchedule === "object") {
            scheduleText = JSON.stringify(availabilitySchedule);
          } else if (typeof availabilitySchedule === "string") {
            scheduleText = availabilitySchedule;
          } else {
            return res.status(400).json({
              message: "availabilitySchedule must be object|string|null",
            });
          }
        }

        const labTech = await db
          .select()
          .from(labTechnicians)
          .where(eq(labTechnicians.userId, userId))
          .limit(1);

        if (labTech.length === 0) {
          return res
            .status(404)
            .json({ message: "Lab technician profile not found" });
        }

        const facility = await db
          .select()
          .from(labFacilities)
          .where(eq(labFacilities.labTechnicianId, labTech[0].id))
          .limit(1);

        if (facility.length === 0) {
          return res
            .status(404)
            .json({ message: "No lab facility found for this technician" });
        }

        const updates: any = {
          updatedAt: new Date(),
        };
        if (typeof isPublished !== "undefined")
          updates.isPublished = isPublished;
        if (typeof isAvailable !== "undefined")
          updates.isAvailable = isAvailable;
        if (typeof scheduleText !== "undefined")
          updates.availabilitySchedule = scheduleText;
        if (typeof name !== "undefined") updates.name = name;
        if (typeof description !== "undefined")
          updates.description = description;
        if (typeof address !== "undefined") updates.address = address;
        if (typeof city !== "undefined") updates.city = city;
        if (typeof phone !== "undefined") updates.phone = phone;
        if (typeof email !== "undefined") updates.email = email;
        if (typeof latitudeText !== "undefined")
          updates.latitude = latitudeText;
        if (typeof longitudeText !== "undefined")
          updates.longitude = longitudeText;

        const updated = await db
          .update(labFacilities)
          .set(updates)
          .where(eq(labFacilities.id, facility[0].id))
          .returning();

        const f = updated[0];
        res.json({
          id: f.id,
          name: f.name,
          description: f.description,
          address: f.address,
          city: f.city,
          latitude: f.latitude,
          longitude: f.longitude,
          phone: f.phone,
          email: f.email,
          isActive: f.isActive,
          isVerified: f.isVerified,
          isPublished: f.isPublished,
          isAvailable: f.isAvailable,
          availabilitySchedule: f.availabilitySchedule,
        });
      } catch (error) {
        console.error(
          "Error updating technician lab facility settings:",
          error
        );
        res.status(500).json({ message: "Failed to update lab settings" });
      }
    }
  );

  // Get labs that are currently available to patients (published + available + within schedule)
  app.get(
    "/api/lab-facilities/available",
    isAuthenticated,
    async (req, res) => {
      try {
        const dayKeyFromDate = (date: Date) => {
          const day = date.getDay();
          switch (day) {
            case 0:
              return "sun";
            case 1:
              return "mon";
            case 2:
              return "tue";
            case 3:
              return "wed";
            case 4:
              return "thu";
            case 5:
              return "fri";
            case 6:
              return "sat";
            default:
              return "mon";
          }
        };

        const isWithinSchedule = (scheduleText: string | null, now: Date) => {
          if (!scheduleText) return true;
          let schedule: any;
          try {
            schedule = JSON.parse(scheduleText);
          } catch {
            return false;
          }

          const todayKey = dayKeyFromDate(now);
          const entry = schedule?.[todayKey];
          if (!entry || entry.enabled === false) return false;

          const start: string | undefined = entry.start;
          const end: string | undefined = entry.end;
          if (!start || !end) return false;

          const toMinutes = (t: string) => {
            const [hh, mm] = t.split(":");
            const h = Number(hh);
            const m = Number(mm);
            if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
            return h * 60 + m;
          };

          const startMin = toMinutes(start);
          const endMin = toMinutes(end);
          if (startMin === null || endMin === null) return false;

          const nowMin = now.getHours() * 60 + now.getMinutes();
          if (endMin === startMin) return false;

          if (endMin < startMin) {
            return nowMin >= startMin || nowMin < endMin;
          }

          return nowMin >= startMin && nowMin < endMin;
        };

        const now = new Date();
        const facilities = await db
          .select({
            facility: labFacilities,
            labTechnicianUserId: labTechnicians.userId,
          })
          .from(labFacilities)
          .leftJoin(
            labTechnicians,
            eq(labFacilities.labTechnicianId, labTechnicians.id)
          )
          .where(
            and(
              eq(labFacilities.isActive, true),
              eq(labFacilities.isPublished, true),
              eq(labFacilities.isAvailable, true)
            )
          )
          .orderBy(labFacilities.city, labFacilities.name);

        const available = facilities
          .filter((row) =>
            isWithinSchedule(row.facility.availabilitySchedule ?? null, now)
          )
          .map((row) => ({
            id: row.facility.id,
            name: row.facility.name,
            address: row.facility.address,
            city: row.facility.city,
            phone: row.facility.phone,
            email: row.facility.email,
            latitude: row.facility.latitude,
            longitude: row.facility.longitude,
            labTechnicianUserId: row.labTechnicianUserId ?? undefined,
          }));

        res.json(available);
      } catch (error) {
        console.error("Error fetching available lab facilities:", error);
        res.status(500).json({ message: "Failed to fetch lab facilities" });
      }
    }
  );

  // Get all active lab facilities
  app.get("/api/lab-facilities", isAuthenticated, async (req, res) => {
    try {
      const facilities = await db
        .select()
        .from(sql.identifier("lab_facilities"))
        .where(sql`${sql.identifier("lab_facilities")}.is_active = true`)
        .orderBy(
          sql`${sql.identifier("lab_facilities")}.city, ${sql.identifier(
            "lab_facilities"
          )}.name`
        );

      res.json(facilities);
    } catch (error) {
      console.error("Error fetching lab facilities:", error);
      res.status(500).json({ message: "Failed to fetch lab facilities" });
    }
  });

  // Create a new lab facility (admin or lab technician)
  app.post("/api/lab-facilities", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== "admin" && user.role !== "lab_technician")) {
        return res.status(403).json({ message: "Access denied" });
      }

      // If lab technician, set their ID
      let labTechnicianId = req.body.labTechnicianId;
      if (user.role === "lab_technician") {
        const labTechRows = await db
          .select()
          .from(labTechnicians)
          .where(eq(labTechnicians.userId, userId))
          .limit(1);

        let labTech = labTechRows[0];
        if (!labTech) {
          const created = await db
            .insert(labTechnicians)
            .values({ userId })
            .returning();
          labTech = created[0];
        }

        labTechnicianId = labTech.id;
      }

      const validated = insertLabFacilitySchema.parse({
        ...req.body,
        labTechnicianId,
        isVerified: user.role === "admin", // Auto-verify if created by admin
      });

      const facility = await db
        .insert(labFacilities)
        .values(validated)
        .returning();

      res.status(201).json(facility[0]);
    } catch (error: any) {
      console.error("Error creating lab facility:", error);
      res
        .status(400)
        .json({ message: error.message || "Failed to create lab facility" });
    }
  });

  // Update lab facility
  app.patch("/api/lab-facilities/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== "admin" && user.role !== "lab_technician")) {
        return res.status(403).json({ message: "Access denied" });
      }

      const facility = await db
        .update(labFacilities)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(labFacilities.id, req.params.id))
        .returning();

      if (facility.length === 0) {
        return res.status(404).json({ message: "Lab facility not found" });
      }

      res.json(facility[0]);
    } catch (error) {
      console.error("Error updating lab facility:", error);
      res.status(500).json({ message: "Failed to update lab facility" });
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

  // List patient registration requests (admin only)
  app.get("/api/admin/patient-registrations", isAdmin, async (req, res) => {
    try {
      const status =
        typeof req.query.status === "string" ? req.query.status : undefined;

      const rows = await db
        .select()
        .from(patientRegistrationRequests)
        .where(
          status ? eq(patientRegistrationRequests.status, status) : sql`TRUE`
        )
        .orderBy(desc(patientRegistrationRequests.submittedAt));

      res.json(rows);
    } catch (error) {
      console.error("Error fetching patient registration requests:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch registration requests" });
    }
  });

  // Approve a patient registration request (admin only)
  app.post(
    "/api/admin/patient-registrations/:id/approve",
    isAdmin,
    async (req: any, res) => {
      try {
        const requestId = req.params.id;
        const { rfid, healthId } = req.body as {
          rfid?: string;
          healthId?: string;
        };

        if (!rfid || typeof rfid !== "string" || rfid.trim().length < 3) {
          return res
            .status(400)
            .json({ message: "RFID is required to approve a patient" });
        }

        const reqRows = await db
          .select()
          .from(patientRegistrationRequests)
          .where(eq(patientRegistrationRequests.id, requestId))
          .limit(1);

        const reg = reqRows[0];
        if (!reg) {
          return res
            .status(404)
            .json({ message: "Registration request not found" });
        }

        if (reg.status !== "pending") {
          return res
            .status(400)
            .json({ message: `Request is already ${reg.status}` });
        }

        // Ensure NIC/email aren't already used
        const existingPatient = await db
          .select({ id: patients.id })
          .from(patients)
          .where(eq(patients.nic, reg.nic))
          .limit(1);
        if (existingPatient.length > 0) {
          return res
            .status(409)
            .json({ message: "A patient already exists with this NIC" });
        }

        const existingEmail = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, reg.email))
          .limit(1);
        if (existingEmail.length > 0) {
          return res
            .status(409)
            .json({ message: "An account already exists with this email" });
        }

        const existingRfid = await db
          .select({ id: patients.id })
          .from(patients)
          .where(eq(patients.rfid, rfid.trim()))
          .limit(1);
        if (existingRfid.length > 0) {
          return res.status(409).json({ message: "RFID is already in use" });
        }

        const generateTempPassword = () => {
          const raw = randomBytes(12).toString("base64");
          const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "");
          return (cleaned + "A1").slice(0, 12);
        };

        const generateUniqueUsername = async () => {
          const base =
            `${reg.firstName}.${reg.lastName}`
              .toLowerCase()
              .replace(/[^a-z0-9.]/g, "")
              .replace(/\.+/g, ".")
              .replace(/^\.|\.$/g, "")
              .slice(0, 18) || "patient";

          for (let i = 0; i < 8; i++) {
            const suffix = (Math.floor(Math.random() * 9000) + 1000).toString();
            const candidate = `${base}${suffix}`.slice(0, 24);
            const exists = await db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.username, candidate))
              .limit(1);
            if (exists.length === 0) return candidate;
          }
          return `patient${Date.now()}`;
        };

        const generateUniqueHealthId = async () => {
          for (let i = 0; i < 8; i++) {
            const candidate = `MV-${randomBytes(4).toString("hex")}`;
            const exists = await db
              .select({ id: patients.id })
              .from(patients)
              .where(eq(patients.healthId, candidate))
              .limit(1);
            if (exists.length === 0) return candidate;
          }
          return `MV-${Date.now()}`;
        };

        const username = await generateUniqueUsername();
        const temporaryPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
        const assignedHealthId =
          healthId?.trim() || (await generateUniqueHealthId());

        // Create user
        const createdUsers = await db
          .insert(users)
          .values({
            username,
            email: reg.email,
            password: hashedPassword,
            firstName: reg.firstName,
            lastName: reg.lastName,
            role: "patient",
            isActive: true,
            mustChangePassword: true,
          })
          .returning();

        const createdUser = createdUsers[0];

        // Create patient record
        const createdPatients = await db
          .insert(patients)
          .values({
            userId: createdUser.id,
            nic: reg.nic,
            healthId: assignedHealthId,
            rfid: rfid.trim(),
            dateOfBirth: reg.dateOfBirth ?? undefined,
            gender: reg.gender ?? undefined,
            contactInfo: reg.contactInfo ?? undefined,
            address: reg.address ?? undefined,
            bloodType: reg.bloodType ?? undefined,
            allergies: reg.allergies ?? undefined,
          })
          .returning();

        // Update request
        await db
          .update(patientRegistrationRequests)
          .set({
            status: "approved",
            assignedHealthId,
            assignedRfid: rfid.trim(),
            approvedUserId: createdUser.id,
            reviewedBy: req.user.id,
            reviewedAt: new Date(),
          })
          .where(eq(patientRegistrationRequests.id, requestId));

        // Send email (best-effort; do not fail approval if email fails)
        let emailResult: any = { sent: false, error: undefined };
        try {
          emailResult = await sendPatientApprovalEmail({
            to: reg.email,
            fullName: `${reg.firstName} ${reg.lastName}`.trim(),
            username,
            temporaryPassword,
            nic: reg.nic,
            healthId: assignedHealthId,
            rfid: rfid.trim(),
          });
        } catch (err: any) {
          const message = err?.response || err?.message || String(err);
          console.error("Approval email send threw:", message);
          emailResult = { sent: false, error: message };
        }

        const { password: _password, ...userWithoutPassword } =
          createdUser as any;

        res.json({
          message: "Patient approved successfully",
          patient: createdPatients[0],
          user: userWithoutPassword,
          emailSent: emailResult.sent,
          emailError: (emailResult as any).error,
        });
      } catch (error: any) {
        console.error("Error approving patient registration:", error);
        res.status(500).json({
          message: error?.message || "Failed to approve registration",
        });
      }
    }
  );

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
      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }

      // Validate role-specific requirements BEFORE creating the user.
      if (role === "patient") {
        if (!patientData || typeof patientData !== "object") {
          return res.status(400).json({ message: "Patient data is required" });
        }
        const nic = String((patientData as any).nic || "").trim();
        const gender = String((patientData as any).gender || "").trim();
        const rfid = String((patientData as any).rfid || "").trim();
        if (!nic) {
          return res.status(400).json({ message: "Patient NIC is required" });
        }
        if (!gender) {
          return res
            .status(400)
            .json({ message: "Patient gender is required" });
        }
        if (!rfid) {
          return res.status(400).json({ message: "Patient RFID is required" });
        }
      }

      if (role === "doctor") {
        const doctorData = req.body?.doctorData;
        if (!doctorData || typeof doctorData !== "object") {
          return res.status(400).json({ message: "Doctor data is required" });
        }
        const nic = String((doctorData as any).nic || "").trim();
        const gender = String((doctorData as any).gender || "").trim();
        const specialization = String(
          (doctorData as any).specialization || ""
        ).trim();
        const licenseNumber = String(
          (doctorData as any).licenseNumber || ""
        ).trim();
        if (!nic) {
          return res.status(400).json({ message: "Doctor NIC is required" });
        }
        if (!gender) {
          return res.status(400).json({ message: "Doctor gender is required" });
        }
        if (!specialization) {
          return res
            .status(400)
            .json({ message: "Doctor specialization is required" });
        }
        if (!licenseNumber) {
          return res
            .status(400)
            .json({ message: "Doctor license number is required" });
        }
      }

      if (role === "pharmacist") {
        const pharmacistData = req.body?.pharmacistData;
        const licenseNumber = String(
          pharmacistData?.licenseNumber || ""
        ).trim();
        if (!licenseNumber) {
          return res
            .status(400)
            .json({ message: "Pharmacist license number is required" });
        }
      }

      if (role === "lab_technician") {
        const labTechData = req.body?.labTechData;
        const licenseNumber = String(labTechData?.licenseNumber || "").trim();
        if (!licenseNumber) {
          return res
            .status(400)
            .json({ message: "Lab technician license number is required" });
        }
      }

      const generateTempPassword = () => {
        const raw = randomBytes(12).toString("base64");
        const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "");
        return (cleaned + "A1").slice(0, 12);
      };

      const generateUniqueUsernameFromName = async () => {
        const base =
          `${firstName || ""}.${lastName || ""}`
            .toLowerCase()
            .replace(/[^a-z0-9.]/g, "")
            .replace(/\.+/g, ".")
            .replace(/^\.|\.$/g, "")
            .slice(0, 20) || "user";

        const isAvailable = async (candidate: string) => {
          const exists = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, candidate))
            .limit(1);
          return exists.length === 0;
        };

        const trimmedBase = base.slice(0, 24);
        if (await isAvailable(trimmedBase)) return trimmedBase;

        for (let i = 2; i <= 999; i++) {
          const suffix = String(i);
          const candidate = `${base}${suffix}`.slice(0, 24);
          if (await isAvailable(candidate)) return candidate;
        }

        return `${base}${Date.now()}`.slice(0, 24);
      };

      const requestedUsername =
        typeof username === "string" ? username.trim() : "";
      let finalUsername =
        requestedUsername.length > 0
          ? requestedUsername
          : await generateUniqueUsernameFromName();

      const requestedPassword = typeof password === "string" ? password : "";
      const plainTemporaryPassword =
        requestedPassword.trim().length > 0
          ? requestedPassword
          : generateTempPassword();
      const generatedPassword = requestedPassword.trim().length === 0;

      // Hash password
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash(plainTemporaryPassword, 10);

      // Create user
      let user: any;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          user = await storage.upsertUser({
            username: finalUsername,
            password: hashedPassword,
            email,
            firstName,
            lastName,
            role,
            mustChangePassword: true,
          });
          break;
        } catch (err: any) {
          const code = err?.code;
          const constraint = String(err?.constraint || "");
          const message = err?.detail || err?.message || String(err);

          const isUsernameUniqueViolation =
            code === "23505" &&
            (constraint.toLowerCase().includes("username") ||
              message.toLowerCase().includes("username"));

          if (isUsernameUniqueViolation) {
            // If requested username collides, append a numeric suffix.
            const base = (
              requestedUsername.length > 0
                ? requestedUsername
                : `${firstName || ""}.${lastName || ""}`
                    .toLowerCase()
                    .replace(/[^a-z0-9.]/g, "")
                    .replace(/\.+/g, ".")
                    .replace(/^\.|\.$/g, "")
                    .slice(0, 20) || "user"
            ).slice(0, 20);

            const candidate = `${base}${attempt + 2}`.slice(0, 24);
            finalUsername = candidate;
            continue;
          }

          throw err;
        }
      }

      if (!user) {
        return res
          .status(409)
          .json({ message: "Failed to create unique user" });
      }

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
          nic: req.body.doctorData.nic,
          gender: req.body.doctorData.gender,
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
          specialization: req.body.labTechData.specialization,
          licenseNumber: req.body.labTechData.licenseNumber,
        });
      }

      // Send account email (best-effort)
      let emailSent = false;
      let emailError: string | undefined;
      if (email && typeof email === "string" && email.trim().length > 3) {
        try {
          const result = await sendUserCreatedEmail({
            to: email.trim(),
            fullName: `${firstName || ""} ${lastName || ""}`.trim() || null,
            username: finalUsername,
            temporaryPassword: String(plainTemporaryPassword),
            role: String(role),
          });
          emailSent = !!(result as any)?.sent;
          emailError = (result as any)?.error;
        } catch (err: any) {
          const message = err?.response || err?.message || String(err);
          console.error("User-created email send threw:", message);
          emailSent = false;
          emailError = message;
        }
      } else {
        emailSent = false;
        emailError = "No email address provided for user";
      }

      res.status(201).json({
        ...user,
        password: undefined,
        emailSent,
        emailError,
        generatedPassword,
        temporaryPassword:
          generatedPassword || emailSent === false
            ? plainTemporaryPassword
            : undefined,
      });
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

  // Manually resend credentials email (admin only)
  app.post(
    "/api/admin/users/:id/send-credentials",
    isAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const temporaryPassword =
          typeof req.body?.temporaryPassword === "string"
            ? req.body.temporaryPassword
            : "";
        const overrideEmail =
          typeof req.body?.email === "string" ? req.body.email.trim() : "";

        if (!temporaryPassword || temporaryPassword.trim().length === 0) {
          return res
            .status(400)
            .json({ message: "temporaryPassword is required" });
        }

        const user = await storage.getUser(id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const toEmail = overrideEmail || (user as any).email;
        if (!toEmail || String(toEmail).trim().length < 4) {
          return res.status(400).json({ message: "User has no email address" });
        }

        let emailSent = false;
        let emailError: string | undefined;
        try {
          const result = await sendUserCreatedEmail({
            to: String(toEmail).trim(),
            fullName:
              `${(user as any).firstName || ""} ${
                (user as any).lastName || ""
              }`.trim() || null,
            username: (user as any).username,
            temporaryPassword: String(temporaryPassword),
            role: String((user as any).role),
          });
          emailSent = !!(result as any)?.sent;
          emailError = (result as any)?.error;
        } catch (err: any) {
          const message = err?.response || err?.message || String(err);
          console.error("Manual credentials email send threw:", message);
          emailSent = false;
          emailError = message;
        }

        res.json({ emailSent, emailError });
      } catch (error: any) {
        console.error("Error resending credentials:", error);
        res
          .status(500)
          .json({ message: error?.message || "Failed to send credentials" });
      }
    }
  );

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

      // Fetch help-center contact details (best-effort).
      let supportEmail = "admin@medivault.com";
      let supportPhone = "+94 76 914 6080";

      const normalizePhone = (phoneRaw: unknown) => {
        const fallback = "+94 76 914 6080";
        const phone = typeof phoneRaw === "string" ? phoneRaw.trim() : "";
        if (!phone) return fallback;
        if (phone === "+1-234-567-8900") return fallback;
        if (phone === "+1-234-567-0911") return fallback;
        if (/^\+1-234-567-\d{4}$/.test(phone)) return fallback;
        return phone;
      };

      try {
        const settingsRows = await db.select().from(systemSettings).limit(1);
        const s: any = settingsRows?.[0];
        if (s?.systemEmail) supportEmail = String(s.systemEmail);
        if (s?.systemPhone) supportPhone = normalizePhone(s.systemPhone);
      } catch (e) {
        console.warn("Deactivation: failed to load system settings:", e);
      }

      const message =
        "Your account was deactivated due to some issues. " +
        "If you want to reactivate, contact MediVault Help Center. " +
        `Email: ${supportEmail} | Phone: ${supportPhone}`;

      // In-app notification (best-effort)
      try {
        await storage.createNotification({
          recipientId: user.id,
          type: "system",
          title: "Account Deactivated",
          message,
        } as any);
      } catch (e) {
        console.warn("Deactivation: notification create failed:", e);
      }

      // Email (best-effort)
      try {
        const to =
          typeof (user as any)?.email === "string" ? user.email.trim() : "";
        if (to) {
          const fullName =
            [
              typeof (user as any)?.firstName === "string"
                ? user.firstName
                : "",
              typeof (user as any)?.lastName === "string" ? user.lastName : "",
            ]
              .filter(Boolean)
              .join(" ") || null;

          await sendAccountDeactivatedEmail({
            to,
            fullName,
            username: String((user as any)?.username || ""),
            supportEmail,
            supportPhone,
          });
        }
      } catch (e) {
        console.warn("Deactivation: email send failed:", e);
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

      // Fetch help-center contact details (best-effort).
      let supportEmail = "admin@medivault.com";
      let supportPhone = "+94 76 914 6080";

      const normalizePhone = (phoneRaw: unknown) => {
        const fallback = "+94 76 914 6080";
        const phone = typeof phoneRaw === "string" ? phoneRaw.trim() : "";
        if (!phone) return fallback;
        if (phone === "+1-234-567-8900") return fallback;
        if (phone === "+1-234-567-0911") return fallback;
        if (/^\+1-234-567-\d{4}$/.test(phone)) return fallback;
        return phone;
      };

      try {
        const settingsRows = await db.select().from(systemSettings).limit(1);
        const s: any = settingsRows?.[0];
        if (s?.systemEmail) supportEmail = String(s.systemEmail);
        if (s?.systemPhone) supportPhone = normalizePhone(s.systemPhone);
      } catch (e) {
        console.warn("Reactivation: failed to load system settings:", e);
      }

      // Email (best-effort)
      try {
        const to =
          typeof (user as any)?.email === "string" ? user.email.trim() : "";
        if (to) {
          const fullName =
            [
              typeof (user as any)?.firstName === "string"
                ? user.firstName
                : "",
              typeof (user as any)?.lastName === "string" ? user.lastName : "",
            ]
              .filter(Boolean)
              .join(" ") || null;

          await sendAccountReactivatedEmail({
            to,
            fullName,
            username: String((user as any)?.username || ""),
            supportEmail,
            supportPhone,
          });
        }
      } catch (e) {
        console.warn("Reactivation: email send failed:", e);
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
      const rawLimit = Number(req.query?.limit);
      const limit = Number.isFinite(rawLimit)
        ? Math.max(1, Math.min(5000, rawLimit))
        : 10;

      const actionRaw =
        typeof req.query?.action === "string" ? req.query.action.trim() : "";
      const action = actionRaw && actionRaw !== "all" ? actionRaw : null;

      const fromRaw = typeof req.query?.from === "string" ? req.query.from : "";
      const toRaw = typeof req.query?.to === "string" ? req.query.to : "";
      const from = fromRaw ? new Date(fromRaw) : null;
      const to = toRaw ? new Date(toRaw) : null;

      const fromValid = from && !isNaN(from.getTime()) ? from : null;
      const toValid = to && !isNaN(to.getTime()) ? to : null;

      // If no filters, keep existing storage method (minimal behavior change).
      const needsQuery = Boolean(
        action || fromValid || toValid || limit !== 10
      );

      const logs = needsQuery
        ? await (async () => {
            const conditions: any[] = [];
            if (action) conditions.push(eq(auditLogs.action, action));
            if (fromValid) conditions.push(gte(auditLogs.createdAt, fromValid));
            if (toValid) conditions.push(lte(auditLogs.createdAt, toValid));

            const base = db.select().from(auditLogs);
            const filtered = conditions.length
              ? base.where(and(...conditions))
              : base;

            return await filtered
              .orderBy(desc(auditLogs.createdAt))
              .limit(limit);
          })()
        : await storage.getAuditLogs(10);

      // Normalize shape for dashboard widgets (client historically expects `timestamp`).
      res.json(
        (logs || []).map((l: any) => ({
          ...l,
          timestamp: l?.createdAt ?? l?.timestamp ?? null,
        }))
      );
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

  // Record System Traffic event (1 site load = 1 traffic)
  // Accepts both authenticated and unauthenticated visitors.
  app.post("/api/metrics/traffic", async (req: any, res) => {
    try {
      const userId = (req as any)?.user?.id as string | undefined;

      const pathnameRaw =
        typeof req.body?.pathname === "string" ? req.body.pathname : "";
      const pathname = pathnameRaw.trim().slice(0, 512);
      const ip = getClientIp(req);

      await db.insert(auditLogs).values({
        userId: userId ?? null,
        action: "page_view",
        entityType: "traffic",
        details: pathname ? `pathname=${pathname}` : null,
        ipAddress: ip,
      } as any);

      return res.json({ ok: true });
    } catch (error) {
      console.error("Error recording traffic:", error);
      return res.status(500).json({ message: "Failed to record traffic" });
    }
  });

  // Recent Visits (last 24 hours)
  // Includes both registered users and unauthenticated visitors.
  app.get("/api/admin/recent-visits", isAdmin, async (req, res) => {
    try {
      const rawLimit = Number(req.query?.limit);
      const limit = Number.isFinite(rawLimit)
        ? Math.max(1, Math.min(200, rawLimit))
        : 50;

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const rows = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          action: auditLogs.action,
          details: auditLogs.details,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(
          and(
            eq(auditLogs.action, "page_view"),
            gte(auditLogs.createdAt, since)
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      const result = (rows || []).map((r: any) => {
        const details = r?.details ? String(r.details) : "";
        const m = details.match(/pathname=([^\s]+)/);
        const pathname = m?.[1] ? String(m[1]) : null;

        const hasUser = Boolean(r?.userId && (r?.username || r?.email));
        return {
          id: r.id,
          timestamp: r.createdAt ?? null,
          pathname,
          user: hasUser
            ? {
                id: r.userId,
                username: r.username ?? null,
                email: r.email ?? null,
                firstName: r.firstName ?? null,
                lastName: r.lastName ?? null,
                role: r.role ?? null,
              }
            : null,
        };
      });

      return res.json(result);
    } catch (error) {
      console.error("Error fetching recent visits:", error);
      return res.status(500).json({ message: "Failed to fetch recent visits" });
    }
  });

  // System Traffic Chart
  // Definition: how many times users loaded the site (page_view events).
  // Supports period query param: daily | weekly | monthly | yearly (default daily)
  app.get("/api/admin/system-usage-chart", isAdmin, async (req, res) => {
    try {
      const periodRaw = String(req.query.period ?? "daily");
      const allowedPeriods = new Set(["daily", "weekly", "monthly", "yearly"]);
      const period = allowedPeriods.has(periodRaw) ? periodRaw : "daily";

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      // Default lookback per period (kept simple and predictable)
      const dailyDays = 30;
      const weeklyWeeks = 12;
      const monthlyMonths = 12;
      const yearlyYears = 5;

      const start = new Date(end);
      start.setHours(0, 0, 0, 0);
      if (period === "daily") {
        start.setDate(start.getDate() - (dailyDays - 1));
      } else if (period === "weekly") {
        start.setDate(start.getDate() - (weeklyWeeks * 7 - 1));
      } else if (period === "monthly") {
        start.setMonth(start.getMonth() - (monthlyMonths - 1));
        start.setDate(1);
      } else {
        start.setFullYear(start.getFullYear() - (yearlyYears - 1));
        start.setMonth(0);
        start.setDate(1);
      }

      // Pull a reasonably large slice of latest audit logs, then aggregate.
      // (Keeps changes minimal without adding new storage methods.)
      const logs = await storage.getAuditLogs(5000);

      const buckets = new Map<string, number>();

      const ensureBucket = (key: string) => {
        if (!buckets.has(key)) buckets.set(key, 0);
      };

      // Pre-seed buckets so chart has consistent x-axis
      if (period === "daily") {
        for (let i = 0; i < dailyDays; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          ensureBucket(d.toISOString().split("T")[0]);
        }
      } else if (period === "weekly") {
        for (let i = 0; i < weeklyWeeks; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i * 7);
          ensureBucket(d.toISOString().split("T")[0]);
        }
      } else if (period === "monthly") {
        for (let i = 0; i < monthlyMonths; i++) {
          const d = new Date(start);
          d.setMonth(start.getMonth() + i);
          ensureBucket(d.toISOString().slice(0, 7));
        }
      } else {
        for (let i = 0; i < yearlyYears; i++) {
          const year = start.getFullYear() + i;
          ensureBucket(String(year));
        }
      }

      (logs || []).forEach((log: any) => {
        if (!log?.createdAt) return;
        if (log?.action !== "page_view") return;
        const dt = new Date(log.createdAt);
        if (isNaN(dt.getTime())) return;
        if (dt < start || dt > end) return;

        let key: string;
        if (period === "daily") {
          key = dt.toISOString().split("T")[0];
        } else if (period === "weekly") {
          // Bucket by week start (based on start seed + 7-day windows)
          const diffDays = Math.floor(
            (dt.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
          );
          const weekIndex = Math.floor(diffDays / 7);
          const weekStart = new Date(start);
          weekStart.setDate(start.getDate() + weekIndex * 7);
          key = weekStart.toISOString().split("T")[0];
        } else if (period === "monthly") {
          key = dt.toISOString().slice(0, 7);
        } else {
          key = String(dt.getFullYear());
        }

        ensureBucket(key);
        buckets.set(key, (buckets.get(key) || 0) + 1);
      });

      const chartData = Array.from(buckets.entries())
        .map(([bucket, traffic]) => ({ bucket, traffic }))
        .sort((a, b) => a.bucket.localeCompare(b.bucket));

      res.json(chartData);
    } catch (error) {
      console.error("Error fetching system usage chart:", error);
      res.status(500).json({ message: "Failed to fetch system usage data" });
    }
  });

  // ============================================================================
  // SYSTEM SETTINGS ROUTES
  // ============================================================================

  // Get system settings
  app.get("/api/admin/settings", isAdmin, async (req, res) => {
    try {
      // Get settings from database
      const settingsData = await db.select().from(systemSettings).limit(1);

      if (settingsData.length === 0) {
        // No settings exist yet, create default settings
        const defaultSettings = {
          systemName: "MediVault Healthcare",
          systemEmail: "admin@medivault.com",
          systemPhone: "+94 76 914 6080",
          systemAddress: "123 Healthcare Ave, Medical City",
          systemWebsite: "",
          systemDescription:
            "Comprehensive healthcare management system providing quality medical services",
          licenseNumber: "",
          emergencyContact: "",
          faxNumber: "",
          timezone: "UTC",
          currency: "USD",
          language: "en",
          appointmentDuration: 30,
          appointmentSlotInterval: 15,
          maxAppointmentsPerDay: 20,
          workingHoursStart: "09:00",
          workingHoursEnd: "17:00",
          workingDays: "Monday,Tuesday,Wednesday,Thursday,Friday",
          enableEmailNotifications: true,
          enableSmsNotifications: false,
          enableAppointmentReminders: true,
          reminderHoursBefore: 24,
          autoBackupEnabled: true,
          backupFrequency: "daily",
          sessionTimeout: 30,
          maxLoginAttempts: 5,
          enableTwoFactorAuth: false,
          dataRetentionDays: 365,
          passwordExpiryDays: 90,
          facebookUrl: "",
          twitterUrl: "",
          linkedinUrl: "",
          instagramUrl: "",
        };

        await db.insert(systemSettings).values(defaultSettings);
        res.json(defaultSettings);
      } else {
        res.json(settingsData[0]);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update system settings
  app.put("/api/admin/settings", isAdmin, async (req, res) => {
    try {
      const settings = req.body;
      const userId = req.user?.id;

      // Get existing settings
      const existing = await db.select().from(systemSettings).limit(1);

      if (existing.length === 0) {
        // Insert new settings
        await db.insert(systemSettings).values({
          ...settings,
          updatedBy: userId,
        });
      } else {
        // Update existing settings
        await db
          .update(systemSettings)
          .set({
            ...settings,
            updatedAt: new Date(),
            updatedBy: userId,
          })
          .where(eq(systemSettings.id, existing[0].id));
      }

      console.log("Settings updated successfully by user:", userId);
      res.json({ message: "Settings updated successfully", settings });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Create database backup
  app.post("/api/admin/backup", isAdmin, async (req, res) => {
    try {
      // Simple approach: Export data as SQL INSERT statements
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `medivault-backup-${timestamp}.sql`;

      // Generate SQL backup content
      let backupContent = `-- MediVault Database Backup\n`;
      backupContent += `-- Generated on: ${new Date().toISOString()}\n`;
      backupContent += `-- Database: MediVault Healthcare System\n\n`;

      // You would typically use pg_dump here, but for simplicity we'll create a basic export
      // In production, use proper PostgreSQL backup tools

      try {
        // Try to use pg_dump if available
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execPromise = promisify(exec);

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
          throw new Error("DATABASE_URL not configured");
        }

        const url = new URL(dbUrl);
        const dbName = url.pathname.substring(1);
        const host = url.hostname;
        const port = url.port || "5432";
        const user = url.username;
        const password = url.password;

        // Try pg_dump with proper error handling
        const env = { ...process.env, PGPASSWORD: password };
        const command = `pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} --clean --if-exists`;

        const { stdout, stderr } = await execPromise(command, {
          env,
          maxBuffer: 50 * 1024 * 1024,
        });

        if (stdout && stdout.length > 100) {
          backupContent = stdout;
        } else {
          throw new Error("pg_dump produced no output");
        }
      } catch (pgError) {
        console.error(
          "pg_dump not available or failed, using basic export:",
          pgError
        );
        backupContent += `\n-- Note: Full pg_dump not available. This is a basic export.\n`;
        backupContent += `-- For production, ensure PostgreSQL client tools are installed.\n\n`;
      }

      res.setHeader("Content-Type", "application/sql");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.send(backupContent);
    } catch (error) {
      console.error("Error creating backup:", error);
      res
        .status(500)
        .json({ message: "Failed to create backup", error: error.message });
    }
  });

  app.post("/api/admin/restore", isAdmin, async (req, res) => {
    try {
      const multer = await import("multer");
      const upload = multer.default({ storage: multer.memoryStorage() });

      // Use multer middleware to handle file upload
      upload.single("file")(req, res, async (err) => {
        if (err) {
          console.error("File upload error:", err);
          return res.status(400).json({ message: "File upload failed" });
        }

        const file = req.file;
        if (!file) {
          return res.status(400).json({ message: "No file provided" });
        }

        if (!file.originalname.endsWith(".sql")) {
          return res.status(400).json({
            message: "Invalid file type. Only .sql files are allowed",
          });
        }

        try {
          const { exec } = await import("child_process");
          const { promisify } = await import("util");
          const fs = await import("fs");
          const path = await import("path");
          const execPromise = promisify(exec);

          // Get database URL from environment
          const dbUrl = process.env.DATABASE_URL;
          if (!dbUrl) {
            throw new Error("DATABASE_URL not configured");
          }

          // Parse database URL
          const url = new URL(dbUrl);
          const dbName = url.pathname.substring(1);
          const host = url.hostname;
          const port = url.port || "5432";
          const user = url.username;
          const password = url.password;

          // Write uploaded file to temporary location
          const tempDir = path.join(process.cwd(), "temp");
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          const tempFile = path.join(tempDir, `restore-${Date.now()}.sql`);
          fs.writeFileSync(tempFile, file.buffer);

          // Use psql to restore database
          const command = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${dbName} -f "${tempFile}"`;

          const { stdout, stderr } = await execPromise(command);

          // Clean up temp file
          fs.unlinkSync(tempFile);

          if (stderr && !stderr.includes("NOTICE")) {
            console.error("Restore warnings:", stderr);
          }

          res.json({
            message: "Database restored successfully",
            details: "Backup file has been applied to the database",
          });
        } catch (error) {
          console.error("Error restoring database:", error);
          res.status(500).json({ message: "Failed to restore database" });
        }
      });
    } catch (error) {
      console.error("Error in restore endpoint:", error);
      res.status(500).json({ message: "Failed to initialize restore" });
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
