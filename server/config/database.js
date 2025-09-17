const mongoose = require("mongoose");
const colors = require("colors");

const connectDB = async () => {
  try {
    // MongoDB connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(
      `MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold
    );

    // MongoDB connection event listeners
    mongoose.connection.on("connected", () => {
      console.log("MongoDB connection established".green);
    });

    mongoose.connection.on("error", (err) => {
      console.error(`MongoDB connection error: ${err}`.red);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB connection disconnected".yellow);
    });

    // Handle application termination
    process.on("SIGINT", async () => {
      try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed through app termination".cyan);
        process.exit(0);
      } catch (err) {
        console.error("Error closing MongoDB connection:", err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`.red.bold);
    process.exit(1);
  }
};

module.exports = connectDB;
