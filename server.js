const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const path = require("path");
const colors = require("colors");

// Load env vars
dotenv.config();

// Import database connection
const connectDB = require("./server/config/database");

// Import middleware
const errorHandler = require("./server/middleware/error");
const { generalLimiter } = require("./server/middleware/rateLimiting");

// Import route files
const authRoutes = require("./server/routes/auth");
const userRoutes = require("./server/routes/users");
const patientRoutes = require("./server/routes/patients");
const appointmentRoutes = require("./server/routes/appointments");
const prescriptionRoutes = require("./server/routes/prescriptions");
const medicalRecordRoutes = require("./server/routes/medicalRecords");
const medicineRoutes = require("./server/routes/medicines");
const inventoryRoutes = require("./server/routes/inventory");
const labTestRoutes = require("./server/routes/labTests");

// Connect to database
connectDB();

const app = express();

// Trust proxy (important for rate limiting and security)
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS configuration - Allow all origins in development
const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all origins
    if (process.env.NODE_ENV === "development") {
      return callback(null, true);
    }

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.CLIENT_URL,
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("CORS blocked origin:", origin);
      callback(null, true); // Allow all in development
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Add detailed request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  if (req.method === "POST" || req.method === "PUT") {
    console.log("Body received:", req.body);
  }
  next();
});

// Compression middleware
app.use(compression());

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS attacks
app.use(xss());

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Rate limiting - temporarily disabled for debugging
// app.use("/api/", generalLimiter);

// Static file serving
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "MediVault API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API Info endpoint
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to MediVault API",
    version: "1.0.0",
    documentation: "/api/docs",
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

// Mount routers
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/medical-records", medicalRecordRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/lab-tests", labTestRoutes);

// Handle undefined routes
app.all("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `MediVault server running in ${process.env.NODE_ENV} mode on port ${PORT}`
      .yellow.bold
  );
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`.red);
  console.log("Shutting down the server due to uncaught exception");
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

module.exports = app;
