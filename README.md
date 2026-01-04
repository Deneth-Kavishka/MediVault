# MediVault - Healthcare Management System

**"All Your Care, One Secure Place"**

A comprehensive, modern healthcare management system for Sri Lanka, featuring electronic health records (EHR), role-based access control, QR-code prescriptions, and secure nationwide patient data management.

![MediVault](attached_assets/generated_images/Medical_team_hero_image_7221c5c5.png)

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup Guide](#detailed-setup-guide)
- [Sample Login Credentials](#sample-login-credentials)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## ✨ Features

### For Patients

- 📅 **Appointment Management** - Book, view, and manage appointments with doctors
- 📋 **Medical Records** - Access complete medical history including diagnoses, vital signs, and notes
- 💊 **Digital Prescriptions** - View and download prescriptions with QR codes
- 🔬 **Lab Results** - Access lab test results with abnormality flags
- 💰 **Billing & Payments** - View bills, payment history, and outstanding balances
- 🔔 **Notifications** - Real-time alerts for appointments, prescriptions, and lab results
- 💬 **Secure Messaging** - Chat with healthcare providers

### For Doctors

- 🔍 **Patient Search** - Quick search by NIC, Health ID, or name
- 📅 **Appointment Calendar** - Manage appointments and schedules
- 📝 **Medical Records** - Create and update patient diagnoses and vital signs
- 💊 **Prescription Management** - Generate prescriptions with QR codes
- 🔬 **Lab Test Orders** - Order lab tests and view results
- 📊 **Patient Dashboard** - Comprehensive view of patient health data
- 👥 **Patient Management** - View all patients and their medical histories

### For Pharmacists

- 📱 **QR Code Scanner** - Verify and dispense prescriptions via QR code
- 💊 **Inventory Management** - Track medicine stock levels
- ⚠️ **Low Stock Alerts** - Automated notifications for reorder levels
- 📜 **Dispensing History** - Complete record of dispensed medications
- 🔄 **Stock Updates** - Real-time inventory updates

### For Lab Technicians

- 🧪 **Test Management** - View assigned lab tests
- 📊 **Result Upload** - Upload and record test results
- ⚠️ **Abnormal Flagging** - Flag abnormal results for doctor attention
- 🔔 **Notifications** - Notify doctors and patients when results are ready
- 📈 **Test History** - Complete laboratory test history

### For Administrators

- 👥 **User Management** - Create and manage all user accounts
- 📊 **System Reports** - Generate comprehensive system reports
- 📝 **Audit Logs** - View all system activities and actions
- 🔐 **Access Control** - Manage role-based permissions
- 💾 **Database Management** - Monitor and maintain system data
- 📈 **Analytics Dashboard** - System-wide statistics and insights

## 🛠 Technology Stack

### Frontend

- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **TanStack Query** - Data fetching and caching
- **Wouter** - Lightweight routing
- **Zod** - Schema validation

### Backend

- **Node.js 20+** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Passport.js** - Authentication
- **bcrypt** - Password hashing
- **WebSockets** - Real-time messaging

### Database

- **PostgreSQL 15+** - Relational database
- **Drizzle ORM** - Type-safe database toolkit
- **pg** - PostgreSQL client

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **tsx** - TypeScript execution
- **Drizzle Kit** - Database migrations

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 20.x or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (version 15 or higher) - [Download](https://www.postgresql.org/download/)
- **npm** (comes with Node.js)
- **Git** (optional, for version control)

### Verify Installation

```bash
node --version   # Should be v20.x or higher
npm --version    # Should be 10.x or higher
psql --version   # Should be PostgreSQL 15 or higher
```

## 🚀 Quick Start

Get MediVault up and running in 5 minutes:

```bash
# 1. Clone the repository (or extract ZIP)
git clone <repository-url>
cd medivault

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# 4. Set up the database
# Create database and user (see Detailed Setup below)
# Then run:
npm run db:push

# 5. Seed sample data
npm run seed

# 6. Start development server
npm run dev

# 7. Open http://localhost:5000
```

## 📖 Detailed Setup Guide

### Step 1: Database Setup

#### Option A: Local PostgreSQL

**Create Database and User:**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE medivault;

# Create user
CREATE USER medivault_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE medivault TO medivault_user;

# Grant schema privileges
\c medivault
GRANT ALL ON SCHEMA public TO medivault_user;

# Exit
\q
```

#### Option B: Using Docker

```bash
docker run --name medivault-postgres \
  -e POSTGRES_DB=medivault \
  -e POSTGRES_USER=medivault_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  -d postgres:15
```

### Step 2: Configure Environment Variables

Create a `.env` file in the project root:

```env
# Database Configuration
DATABASE_URL=postgresql://medivault_user:your_secure_password@localhost:5432/medivault

# Session Configuration (generate with: openssl rand -base64 32)
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Gemini AI (required only if using the Patient AI Assistant)
GEMINI_API_KEY=your-gemini-api-key

# Optional: override Gemini model name if your project only enables certain models
# GEMINI_MODEL=gemini-pro

# Application Configuration
NODE_ENV=development
PORT=5000
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Initialize Database Schema

```bash
# Push schema to database
npm run db:push
```

This creates all necessary tables based on `shared/schema.ts`.

### Step 5: Seed Sample Data

```bash
# Run the database seeder
npm run seed
```

This populates the database with:

- ✅ 9 sample users (admin, doctors, patients, pharmacist, lab technician)
- ✅ 8 medicines with inventory
- ✅ 5 appointments
- ✅ 3 medical records
- ✅ 2 prescriptions
- ✅ 4 lab tests
- ✅ 2 bills with payments
- ✅ Notifications, chat messages, and audit logs

### Step 6: Start Development Server

```bash
npm run dev
```

The application will be available at **http://localhost:5000**

## 🔑 Sample Login Credentials

Use these credentials to test different user roles:

### 👑 Administrator

- **Username:** `admin`
- **Password:** `password123`
- **Access:** Full system access, user management, reports, audit logs

### 👨‍⚕️ Doctors

| Username      | Specialization   | Password      |
| ------------- | ---------------- | ------------- |
| `dr.silva`    | Cardiology       | `password123` |
| `dr.fernando` | Pediatrics       | `password123` |
| `dr.perera`   | General Medicine | `password123` |

### 🏥 Patients

| Username        | Details                     | Password      |
| --------------- | --------------------------- | ------------- |
| `patient.john`  | John Doe, O+ blood type     | `password123` |
| `patient.jane`  | Jane Smith, A+ blood type   | `password123` |
| `patient.bob`   | Bob Wilson, B+ blood type   | `password123` |
| `patient.alice` | Alice Brown, AB+ blood type | `password123` |

### 💊 Pharmacist

- **Username:** `pharmacist.kumar`
- **Password:** `password123`
- **Access:** Prescription verification, inventory management

### 🔬 Lab Technician

- **Username:** `labtech.sarah`
- **Password:** `password123`
- **Access:** Lab test management, result upload

## 📁 Project Structure

```
medivault/
├── client/                    # Frontend React application
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── theme-provider.tsx
│   │   │   └── ...
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and helpers
│   │   ├── pages/           # Page components
│   │   ├── App.tsx          # Main app component
│   │   ├── index.css        # Global styles
│   │   └── main.tsx         # Entry point
│   └── index.html
│
├── server/                   # Backend Express server
│   ├── db.ts               # Database connection
│   ├── index.ts            # Server entry point
│   ├── localAuth.ts        # Authentication setup
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database operations
│   └── vite.ts             # Vite dev server setup
│
├── shared/                  # Shared code
│   └── schema.ts           # Database schema (Drizzle)
│
├── scripts/                 # Utility scripts
│   ├── create-admin.ts     # Admin creation script
│   └── seed-database.ts    # Database seeder
│
├── attached_assets/         # UI assets (images, icons)
├── .env                     # Environment variables (not in git)
├── .env.example            # Environment template
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── README.md               # This file
```

## 📡 API Documentation

### Authentication Endpoints

```http
POST /api/register
POST /api/login
POST /api/logout
GET  /api/auth/user
```

### Patient Endpoints

```http
GET    /api/patients              # Get all patients
GET    /api/patients/:id          # Get patient by ID
GET    /api/patients/nic/:nic     # Get patient by NIC
POST   /api/patients              # Create patient profile
```

### Doctor Endpoints

```http
GET    /api/doctors               # Get all doctors
GET    /api/doctors/:id           # Get doctor by ID
POST   /api/doctors               # Create doctor profile
```

### Appointment Endpoints

```http
GET    /api/appointments          # Get appointments (role-filtered)
POST   /api/appointments          # Create appointment
PATCH  /api/appointments/:id/status  # Update appointment status
```

### Medical Record Endpoints

```http
GET    /api/medical-records                    # Get user's records
GET    /api/medical-records/patient/:patientId # Get patient records
POST   /api/medical-records                    # Create medical record
```

### Prescription Endpoints

```http
GET    /api/prescriptions         # Get prescriptions (role-filtered)
POST   /api/prescriptions         # Create prescription (with QR)
```

### Medicine Endpoints

```http
GET    /api/medicines             # Get all medicines
POST   /api/medicines             # Add medicine (pharmacist/admin)
PATCH  /api/medicines/:id/stock   # Update stock level
```

### Lab Test Endpoints

```http
GET    /api/lab-tests             # Get lab tests (role-filtered)
POST   /api/lab-tests             # Order lab test (doctor/admin)
PATCH  /api/lab-tests/:id         # Update test results (lab tech)
```

### Bill & Payment Endpoints

```http
GET    /api/bills                 # Get bills (role-filtered)
POST   /api/bills                 # Create bill
POST   /api/payments              # Record payment
```

### Notification Endpoints

```http
GET    /api/notifications         # Get user notifications
PATCH  /api/notifications/:id/read  # Mark as read
```

### Chat Endpoints

```http
GET    /api/messages/:userId      # Get chat with user
POST   /api/messages              # Send message
```

### AI Assistant Endpoints

```http
POST   /api/ai/patient-assistant  # Patient AI assistant (Gemini)
```

For complete API documentation, see the Postman collection in `/docs/postman_collection.json`

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Manual Testing Checklist

- [ ] Admin can create users of all roles
- [ ] Patients can book appointments
- [ ] Doctors can create prescriptions with QR codes
- [ ] Pharmacists can scan QR codes
- [ ] Lab technicians can upload test results
- [ ] Notifications are created appropriately
- [ ] Real-time chat works between users
- [ ] Audit logs track all actions

## 🚀 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@prod-host:5432/medivault
SESSION_SECRET=<strong-random-secret>
GEMINI_API_KEY=<your-gemini-api-key>
PORT=5000
```

### Deployment Platforms

#### Recommended Options:

- **Render.com** - Easy deployment with PostgreSQL
- **Railway.app** - Automatic deployment from GitHub
- **DigitalOcean App Platform** - Scalable infrastructure
- **Heroku** - With Heroku Postgres add-on
- **AWS** - EC2 + RDS for full control

### Production Checklist

- [ ] Use strong SESSION_SECRET (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Use environment variables (never commit secrets)
- [ ] Test all user flows in staging
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure database connection pooling

## 🔧 Troubleshooting

### Database Connection Issues

**Problem:** Cannot connect to database

```bash
# Check if PostgreSQL is running
pg_isready

# Test connection
psql -U medivault_user -d medivault

# Check DATABASE_URL in .env
echo $DATABASE_URL
```

**Solution:** Ensure PostgreSQL is running and credentials match `.env`

### Port Already in Use

**Problem:** Port 5000 is already in use

**Solution:** Change `PORT` in `.env` to another port (e.g., 3000, 8080)

### Module Not Found Errors

```bash
# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Database Schema Out of Sync

```bash
# Reset and push schema
npm run db:push
npm run seed
```

### Login Issues

**Problem:** Cannot log in with sample credentials

**Solution:** Ensure database is seeded:

```bash
npm run seed
```

### Hot Reload Not Working

**Problem:** Changes not reflecting in browser

**Solution:**

1. Check if dev server is running
2. Clear browser cache (Ctrl+Shift+R)
3. Restart dev server

## 🔒 Security Considerations

### Authentication & Authorization

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ Session-based authentication with PostgreSQL storage
- ✅ Role-based access control on all endpoints
- ✅ Input validation using Zod schemas
- ✅ SQL injection prevention via Drizzle ORM

### Production Security Recommendations

- [ ] Use HTTPS only (TLS 1.2+)
- [ ] Store SESSION_SECRET in secure environment variables
- [ ] Implement rate limiting on auth endpoints
- [ ] Enable CORS with specific origins
- [ ] Set secure cookie flags
- [ ] Implement API request logging
- [ ] Regular security updates for dependencies
- [ ] Database connection encryption
- [ ] Regular automated backups
- [ ] Penetration testing before launch

### GDPR & Privacy Compliance

- Patient data is encrypted at rest
- Audit logs track all data access
- Role-based access ensures data minimization
- Patients can access their complete data
- Admin can export/delete patient data on request

## 📞 Support

For issues, questions, or contributions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review console logs for error messages
3. Verify all environment variables are set correctly
4. Check that PostgreSQL is running and accessible

## 📄 License

MIT License - See LICENSE file for details

---

**MediVault** - Transforming Healthcare Management in Sri Lanka 🇱🇰

Built with ❤️ using React, Node.js, and PostgreSQL
