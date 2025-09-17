# MediVault - Healthcare Management System

A comprehensive MERN stack healthcare management system designed for hospitals, clinics, and medical practices.

## Features

### ✅ Completed Backend Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Patient, Doctor, Nurse, Pharmacist, LabTechnician, Receptionist, Admin)
  - Email verification and password reset
  - Account security features (login attempts, account locking)

- **Patient Management**
  - Complete patient profiles with medical history
  - Vitals tracking and BMI calculation
  - Allergy and chronic condition management
  - Search and filtering capabilities

- **Appointment System**
  - Appointment scheduling with conflict detection
  - Doctor availability management
  - Status tracking (Scheduled, In Progress, Completed, Cancelled)
  - Appointment statistics and reporting

- **Prescription Management**
  - Electronic prescriptions with QR code generation
  - Drug interaction checking
  - Allergy conflict detection
  - Pharmacy dispensing workflow
  - Prescription verification system

- **Medical Records**
  - Comprehensive medical record keeping
  - Digital signatures for record finalization
  - Amendment system with audit trails
  - Document version control
  - Clinical notes and diagnoses

### 🏗️ Database Schema

- **User Model**: Authentication and user profiles
- **Patient Model**: Patient-specific medical information
- **Appointment Model**: Appointment scheduling and management
- **MedicalRecord Model**: Clinical documentation system
- **Prescription Model**: Electronic prescription management
- **Medicine Model**: Drug database and information
- **Inventory Model**: Pharmacy stock management
- **LabTest Model**: Laboratory test management

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone and Navigate**

   ```bash
   cd "c:\Users\Deneth\Desktop\Programmes\02.HD Finale Project\MediVault"
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   # Copy environment template
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**

   ```bash
   # Make sure MongoDB is running locally
   mongod
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

The server will start on http://localhost:5000

### API Endpoints

#### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgotpassword` - Password reset request
- `PUT /api/auth/resetpassword/:token` - Reset password
- `GET /api/auth/verify-email/:token` - Email verification

#### Patients

- `GET /api/patients` - Get all patients
- `POST /api/patients` - Create new patient
- `GET /api/patients/:id` - Get patient by ID
- `PUT /api/patients/:id` - Update patient
- `GET /api/patients/:id/medical-history` - Get patient medical history
- `PUT /api/patients/:id/vitals` - Update patient vitals

#### Appointments

- `GET /api/appointments` - Get all appointments
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/:id` - Get appointment by ID
- `PUT /api/appointments/:id` - Update appointment
- `PUT /api/appointments/:id/cancel` - Cancel appointment
- `PUT /api/appointments/:id/complete` - Complete appointment

#### Prescriptions

- `GET /api/prescriptions` - Get all prescriptions
- `POST /api/prescriptions` - Create prescription
- `GET /api/prescriptions/:id` - Get prescription by ID
- `PUT /api/prescriptions/:id/dispense` - Dispense prescription
- `POST /api/prescriptions/verify` - Verify prescription QR code

#### Medical Records

- `GET /api/medical-records` - Get all medical records
- `POST /api/medical-records` - Create medical record
- `GET /api/medical-records/:id` - Get medical record by ID
- `PUT /api/medical-records/:id` - Update medical record
- `PUT /api/medical-records/:id/finalize` - Finalize medical record

### Testing with Postman/Insomnia

1. **Import API Collection**
   - Health check: `GET http://localhost:5000/health`
   - API info: `GET http://localhost:5000/api`

2. **Register a Test User**

   ```json
   POST http://localhost:5000/api/auth/register
   {
     "firstName": "Dr. John",
     "lastName": "Smith",
     "email": "doctor@medivault.com",
     "password": "Password123!",
     "confirmPassword": "Password123!",
     "nic": "123456789V",
     "phone": "+94771234567",
     "dateOfBirth": "1980-01-01",
     "gender": "Male",
     "address": "123 Medical Street, Colombo",
     "role": "Doctor"
   }
   ```

3. **Login and Get Token**

   ```json
   POST http://localhost:5000/api/auth/login
   {
     "email": "doctor@medivault.com",
     "password": "Password123!"
   }
   ```

4. **Use JWT Token**
   - Add to headers: `Authorization: Bearer YOUR_JWT_TOKEN`

## Project Structure

```
MediVault/
├── server/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/             # Business logic
│   │   ├── auth.js             # Authentication controllers
│   │   ├── patients.js         # Patient management
│   │   ├── appointments.js     # Appointment system
│   │   ├── prescriptions.js    # Prescription management
│   │   └── medicalRecords.js   # Medical records
│   ├── middleware/             # Custom middleware
│   │   ├── auth.js             # Authentication middleware
│   │   ├── error.js            # Error handling
│   │   └── rateLimiting.js     # Rate limiting
│   ├── models/                 # Mongoose schemas
│   │   ├── User.js             # User/authentication model
│   │   ├── Patient.js          # Patient information model
│   │   ├── Appointment.js      # Appointment model
│   │   ├── MedicalRecord.js    # Medical record model
│   │   ├── Prescription.js     # Prescription model
│   │   ├── Medicine.js         # Medicine database model
│   │   ├── Inventory.js        # Pharmacy inventory model
│   │   └── LabTest.js          # Lab test model
│   ├── routes/                 # API routes
│   │   ├── auth.js             # Authentication routes
│   │   ├── patients.js         # Patient routes
│   │   ├── appointments.js     # Appointment routes
│   │   ├── prescriptions.js    # Prescription routes
│   │   └── medicalRecords.js   # Medical record routes
│   └── utils/                  # Utility functions
│       ├── errorResponse.js    # Error response utility
│       └── sendEmail.js        # Email utility
├── uploads/                    # File upload directory
├── .env                        # Environment variables
├── .env.example               # Environment template
├── package.json               # Dependencies and scripts
└── server.js                  # Main server file
```

## Security Features

- **Authentication**: JWT tokens with expiration
- **Authorization**: Role-based access control
- **Data Validation**: Mongoose schema validation
- **Rate Limiting**: Protect against abuse
- **Data Sanitization**: Prevent NoSQL injection and XSS
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers
- **Password Hashing**: bcryptjs for secure password storage

## Development Status

✅ **Completed (Backend)**

- Project structure and dependencies
- MongoDB schema design (8 models)
- Express server with security middleware
- JWT authentication system
- Patient management API
- Appointment scheduling system
- Prescription management with QR codes
- Medical records system

🏗️ **In Progress**

- Environment setup and testing
- API documentation

📋 **Next Steps**

- Inventory management system
- Lab test management
- Frontend React application
- API testing and validation

## Technologies Used

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **QRCode** - QR code generation
- **Nodemailer** - Email sending
- **Helmet** - Security headers
- **CORS** - Cross-origin requests
- **Rate Limiting** - API protection

### Development Tools

- **Nodemon** - Development server
- **Colors** - Console colors
- **Morgan** - HTTP logging
- **Compression** - Response compression

## Contributing

This is a healthcare management system project. Please ensure all code follows medical data handling best practices and compliance requirements.

## License

This project is for educational and development purposes.
