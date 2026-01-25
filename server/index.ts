import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { getSession } from "./localAuth";
import { DatabaseStorage } from "./storage";
import { db } from "./db";
import { prescriptions } from "@shared/schema";
import { and, isNotNull, isNull, lt, ne } from "drizzle-orm";

const app = express();

// API endpoints should always return JSON (200/4xx/5xx), not 304.
// 304 responses can break fetch-based clients (res.ok=false) and cause refetch loops.
app.set("etag", false);

// Compress JSON/HTML to speed up responses over slower links.
app.use(
  compression({
    threshold: 1024, // only compress responses > 1KB
  })
);

// Disable caching for API responses.
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
  }
  next();
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

// Session middleware - must be before passport
const sessionMiddleware = getSession();
app.use(sessionMiddleware);
// Store session middleware for WebSocket authentication
app.set("sessionMiddleware", sessionMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  // Avoid expensive JSON.stringify on large responses.
  // Enable response size logging by setting DEBUG_API_LOG_SIZE=true
  const debugLogSize =
    String(process.env.DEBUG_API_LOG_SIZE || "").toLowerCase() === "true";
  const startBytes = debugLogSize
    ? Number(res.getHeader("Content-Length") || 0)
    : 0;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const bytes = debugLogSize
        ? Number(res.getHeader("Content-Length") || startBytes || 0)
        : 0;
      log(
        `${req.method} ${path} ${res.statusCode} in ${duration}ms` +
          (debugLogSize && bytes > 0 ? ` (${bytes} bytes)` : "")
      );
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Add WebSocket health check endpoint
  app.get("/api/ws/health", (_req, res) => {
    res.json({ status: "ok", websocket: "available" });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Setup WebSocket AFTER Vite so our upgrade handler takes precedence
  const { setupScannerWebSocket } = await import("./websocket-scanner");
  setupScannerWebSocket(server);
  console.log("✅ WebSocket scanner service ready");

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);

  server.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      console.error(
        `❌ Port ${port} is already in use. Close the other process using it and try again.`
      );
      console.error(
        "   Tip (PowerShell): Get-NetTCPConnection -LocalPort 5000 -State Listen"
      );
      console.error(
        "   Or run with a different port: $env:PORT=5001; npm run dev"
      );
      process.exit(1);
    }

    console.error("❌ Server error:", err);
    process.exit(1);
  });

  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    }
  );

  // Setup automatic cleanup of cancelled appointments older than 24 hours
  // Run every hour
  const storage = new DatabaseStorage();
  const cleanupInterval = setInterval(async () => {
    try {
      const deletedCount =
        await storage.deleteCancelledAppointmentsOlderThan24Hours();
      if (deletedCount > 0) {
        log(
          `Cleaned up ${deletedCount} cancelled appointment(s) older than 24 hours`
        );
      }
    } catch (error) {
      console.error("Error during appointment cleanup:", error);
    }
  }, 60 * 60 * 1000); // Run every hour

  // Setup automatic prescription expiry persistence
  // Runs on boot and then every hour.
  const autoExpirePrescriptions = async () => {
    try {
      const now = new Date();
      const updated = await db
        .update(prescriptions)
        .set({
          status: "expired",
          updatedAt: now,
        })
        .where(
          and(
            isNotNull(prescriptions.expiryDate),
            lt(prescriptions.expiryDate, now),
            // Never auto-expire prescriptions that were already processed
            isNull(prescriptions.dispensedAt),
            ne(prescriptions.status, "dispensed"),
            ne(prescriptions.status, "cancelled"),
            ne(prescriptions.status, "expired"),
            ne(prescriptions.status, "not_dispensed")
          )
        )
        .returning({ id: prescriptions.id });

      if (updated.length > 0) {
        log(`Auto-expired ${updated.length} prescription(s)`);
      }
    } catch (error) {
      console.error("Error during prescription auto-expiry:", error);
    }
  };

  await autoExpirePrescriptions();
  const autoExpireInterval = setInterval(
    autoExpirePrescriptions,
    60 * 60 * 1000
  );

  // Cleanup on shutdown
  process.on("SIGTERM", () => {
    clearInterval(cleanupInterval);
    clearInterval(autoExpireInterval);
  });
  process.on("SIGINT", () => {
    clearInterval(cleanupInterval);
    clearInterval(autoExpireInterval);
    process.exit(0);
  });
})();
