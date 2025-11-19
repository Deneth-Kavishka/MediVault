// Local Authentication System with Passport.js
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

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
        // Find user by username
        const userResults = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        const user = userResults[0];

        if (!user) {
          return done(null, false, { message: "Incorrect username." });
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
        return res.json({
          message: "Login successful",
          user: user,
        });
      });
    })(req, res, next);
  });

  // Register endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const {
        username,
        email,
        password,
        firstName,
        lastName,
        role = "patient",
      } = req.body;

      // Validate required fields
      if (!username || !password) {
        return res
          .status(400)
          .json({ message: "Username and password are required" });
      }

      // Check if username already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role,
        })
        .returning();

      const { password: _, ...userWithoutPassword } = newUser[0];

      // Auto-login after registration
      req.logIn(userWithoutPassword, (err) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Registration successful but login failed" });
        }
        res.status(201).json({
          message: "Registration successful",
          user: userWithoutPassword,
        });
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res
        .status(500)
        .json({ message: "Registration failed", error: error.message });
    }
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
