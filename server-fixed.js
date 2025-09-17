const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const colors = require("colors");

// Load env vars
dotenv.config();

// Import database connection
const connectDB = require("./server/config/database");

console.log("Starting MediVault server...");

// Connect to database
connectDB();

const app = express();

// Trust proxy
app.set("trust proxy", 1);

// Basic middleware
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Add detailed logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

console.log("Middleware configured...");

// Health check endpoint
app.get("/health", (req, res) => {
  console.log("Health check requested");
  res.status(200).json({
    success: true,
    message: "MediVault API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API Info endpoint
app.get("/api", (req, res) => {
  console.log("API info requested");
  res.status(200).json({
    success: true,
    message: "Welcome to MediVault API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      patients: "/api/patients",
      appointments: "/api/appointments",
      prescriptions: "/api/prescriptions",
      medicines: "/api/medicines",
      inventory: "/api/inventory",
      labTests: "/api/lab-tests",
    },
  });
});

console.log("Basic routes configured...");

// Try loading auth routes carefully
try {
  console.log("Loading auth routes...");
  const authRoutes = require("./server/routes/auth");
  app.use("/api/auth", authRoutes);
  console.log("Auth routes loaded successfully");
} catch (error) {
  console.error("Error loading auth routes:", error.message);
  console.error("Stack:", error.stack);
}

// Try loading other routes one by one
const routesToLoad = [
  { path: "/api/users", file: "./server/routes/users", name: "users" },
  { path: "/api/patients", file: "./server/routes/patients", name: "patients" },
  {
    path: "/api/appointments",
    file: "./server/routes/appointments",
    name: "appointments",
  },
  {
    path: "/api/prescriptions",
    file: "./server/routes/prescriptions",
    name: "prescriptions",
  },
  {
    path: "/api/medical-records",
    file: "./server/routes/medicalRecords",
    name: "medical records",
  },
  {
    path: "/api/medicines",
    file: "./server/routes/medicines",
    name: "medicines",
  },
  {
    path: "/api/inventory",
    file: "./server/routes/inventory",
    name: "inventory",
  },
  {
    path: "/api/lab-tests",
    file: "./server/routes/labTests",
    name: "lab tests",
  },
];

routesToLoad.forEach((route) => {
  try {
    console.log(`Loading ${route.name} routes...`);
    const routeModule = require(route.file);
    app.use(route.path, routeModule);
    console.log(`${route.name} routes loaded successfully`);
  } catch (error) {
    console.error(`Error loading ${route.name} routes:`, error.message);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// Handle undefined routes
app.all("*", (req, res) => {
  console.log(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

const PORT = process.env.PORT || 5000;

console.log("Starting server...");

const server = app.listen(PORT, () => {
  console.log(
    `MediVault server running in ${process.env.NODE_ENV} mode on port ${PORT}`
      .yellow.bold
  );
  console.log("Server is ready to accept connections");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Unhandled Promise Rejection: ${err.message}`.red);
  console.log("Stack:", err.stack);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log(`Uncaught Exception: ${err.message}`.red);
  console.log("Stack:", err.stack);
  process.exit(1);
});

module.exports = app;
