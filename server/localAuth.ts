// Local Authentication System with Passport.js
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, or, sql } from "drizzle-orm";
import geoip from "geoip-lite";
import { sendLoginAlertEmail } from "./email";

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

function getGeoLocationFromIp(ip: string | null): string | null {
  if (!ip) return null;
  if (ip === "::1" || ip === "127.0.0.1") return "Localhost";
  try {
    const geo = geoip.lookup(ip);
    if (!geo) return null;
    const parts = [geo.city, geo.region, geo.country].filter(Boolean);
    return parts.length ? parts.join(", ") : geo.country || null;
  } catch {
    return null;
  }
}

// Session configuration
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

// Setup Passport Local Strategy
export function setupAuth(app: Express) {
  console.log("✅ Using Local Authentication (Username/Password)");

  // Configure Passport Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const identifier = String(username || "").trim();
        if (!identifier) {
          return done(null, false, {
            message: "Username or email is required.",
          });
        }

        // Find user by username OR email
        const userResults = await db
          .select()
          .from(users)
          .where(
            or(
              eq(users.username, identifier),
              sql`lower(${users.email}) = ${identifier.toLowerCase()}`
            )
          )
          .limit(1);

        const user = userResults[0];

        if (!user) {
          return done(null, false, {
            message: "Incorrect username or email.",
          });
        }

        // Check if user is active
        if (!user.isActive) {
          return done(null, false, {
            message:
              "This account has been deactivated. Please contact an administrator.",
          });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Incorrect password." });
        }

        // Don't send password to client
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const userResults = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      const user = userResults[0];
      if (!user) {
        return done(null, false);
      }

      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      done(error);
    }
  });

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res
          .status(401)
          .json({ message: info?.message || "Login failed" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login error" });
        }

        // Best-effort login alert email (do not block login).
        try {
          const to = typeof user.email === "string" ? user.email.trim() : "";
          if (to) {
            const ip = getClientIp(req);
            const location = getGeoLocationFromIp(ip);
            const userAgent =
              typeof req.headers?.["user-agent"] === "string"
                ? req.headers["user-agent"]
                : null;

            void sendLoginAlertEmail({
              to,
              username: user.username,
              fullName:
                [user.firstName, user.lastName].filter(Boolean).join(" ") ||
                null,
              timeIso: new Date().toISOString(),
              ipAddress: ip,
              location,
              userAgent,
            });
          }
        } catch (emailErr) {
          console.warn("Login alert email failed:", emailErr);
        }

        return res.json({
          message: "Login successful",
          user: user,
        });
      });
    })(req, res, next);
  });

  // Register endpoint
  app.post("/api/register", async (req, res) => {
    return res.status(403).json({
      message:
        "Self registration is disabled. Patients must register via the patient portal and wait for admin approval. Admins create users via the admin panel.",
    });
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout error" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Get current user endpoint
  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Change password (required on first login when mustChangePassword=true)
  app.post("/api/auth/change-password", async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user?.id) {
        return res.status(401).json({ message: "Unauthorized - Please login" });
      }

      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json({ message: "Current password and new password are required" });
      }

      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return res
          .status(400)
          .json({ message: "New password must be at least 8 characters" });
      }

      const userResults = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      const user = userResults[0];
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const ok = await bcrypt.compare(currentPassword, user.password);
      if (!ok) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await db
        .update(users)
        .set({
          password: hashed,
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      console.error("Change password error:", error);
      return res
        .status(500)
        .json({ message: error?.message || "Failed to change password" });
    }
  });
}

// Authentication middleware
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized - Please login" });
};

// Role-based authorization middleware
export const hasRole = (...allowedRoles: string[]): RequestHandler => {
  return (req: any, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized - Please login" });
    }

    const userRole = req.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message:
          "Forbidden - You don't have permission to access this resource",
      });
    }

    next();
  };
};

// Specific role middleware helpers
export const isAdmin: RequestHandler = hasRole("admin");
export const isDoctor: RequestHandler = hasRole("doctor");
export const isPatient: RequestHandler = hasRole("patient");
export const isPharmacist: RequestHandler = hasRole("pharmacist");
export const isLabTechnician: RequestHandler = hasRole("lab_technician");
export const isDoctorOrAdmin: RequestHandler = hasRole("doctor", "admin");
export const isPharmacistOrAdmin: RequestHandler = hasRole(
  "pharmacist",
  "admin"
);
export const isLabTechOrAdmin: RequestHandler = hasRole(
  "lab_technician",
  "admin"
);
