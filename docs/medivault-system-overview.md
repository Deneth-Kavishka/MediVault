# MediVault System Overview (Tech + Flow)

Date: 2026-01-05

## 1) What this system is

- MediVault is a full-stack healthcare management system (EHR-style) for Sri Lanka.
- One server serves both:
  - Frontend (React SPA)
  - Backend API (`/api/*`) + sessions + WebSockets

## 2) Technology stack (high level)

- Frontend: React + TypeScript + Vite + Tailwind + TanStack Query
- Backend: Node.js + Express + TypeScript
- Auth: Passport Local + server-side sessions stored in PostgreSQL
- Database: PostgreSQL + Drizzle ORM
- Realtime: WebSocket server (scanner/real-time features)
- Email: Nodemailer utilities
- AI (optional): Gemini integration

## 3) Where the backend is (files/folders)

- Backend folder: `server/`
- Backend entry/startup: `server/index.ts`
  - Creates Express app
  - Adds JSON parsing + session middleware
  - Calls `registerRoutes(app)`
  - Starts HTTP server
  - Sets up WebSocket scanner service
- API routes: `server/routes.ts`
  - Most REST endpoints are defined here as `app.get/post/patch/...("/api/..." ...)`
- Auth routes + auth middleware: `server/localAuth.ts`
  - Login endpoint: `/api/login`
  - Session setup: Postgres session store (connect-pg-simple)
  - Middleware used by routes: `isAuthenticated`, role guards (admin/doctor/pharmacist/lab)
- DB connection: `server/db.ts`
  - Creates `pg.Pool` and Drizzle `db`
- DB operations layer (“DB controllers”): `server/storage.ts`
  - `DatabaseStorage` class implements most CRUD methods (users, patients, doctors, appointments, prescriptions, lab tests, etc.)

## 4) Where database schema is

- Shared schema folder: `shared/`
- Main schema file: `shared/schema.ts`
  - Defines tables via Drizzle `pgTable(...)`
  - Also exports Zod insert schemas (`createInsertSchema`) used for validation

## 5) Where frontend calls the backend

- Fetch helper: `client/src/lib/queryClient.ts`
  - Uses `fetch("/api/...", { credentials: "include" })` so cookies/sessions work
- Most pages call endpoints using TanStack Query with `queryKey: ["/api/..." ]`

## 6) Main API groups (examples)

(Exact list is large; these are the main groups seen in `server/routes.ts` + auth in `server/localAuth.ts`.)

### Auth

- `POST /api/login` (local username/email + password)
- Other auth endpoints are also defined in `server/localAuth.ts` (logout, auth user, etc.)

### Profile

- `GET /api/profile`
- `GET /api/profile/full`
- `PATCH /api/profile` / `PATCH /api/profile/full` (depending on implementation)

### Password reset

- `POST /api/password-reset/request`

### Patients

- `POST /api/patients`
- `GET /api/patients`
- `GET /api/patients/me`
- `GET /api/patients/:id`
- `GET /api/patients/nic/:nic`
- `POST /api/patients/verify`

### Doctors + Availability

- `POST /api/doctors`
- `GET /api/doctors`
- `GET /api/doctors/:id`
- `GET /api/doctor-availability`

### Appointments

- `POST /api/appointments`
- `GET /api/appointments`

### Medical records + documents

- `POST /api/medical-records`
- `GET /api/medical-records`
- `POST /api/medical-documents`

### Prescriptions

- `POST /api/prescriptions`
- `GET /api/prescriptions`
- `GET /api/prescriptions/doctor/mine`

### Medicines

- `POST /api/medicines`
- `GET /api/medicines`

### Lab

- `POST /api/lab-tests`
- `GET /api/lab-tests`
- `PATCH /api/lab-tests/:id`
- `GET /api/lab-tests/doctor/mine`
- `GET /api/lab-tests/patient`
- Lab facilities: `GET/POST/PATCH /api/lab-facilities...`

### Billing + payments

- `POST /api/bills` / `GET /api/bills`
- `POST /api/payments`

### Notifications

- `GET /api/notifications`

### Messaging

- `GET /api/conversations`
- `GET /api/messages/:userId`
- `POST /api/messages`

### Admin

- `GET /api/admin/stats`
- `GET /api/admin/users` (+ deactivated, by id, update, delete, reactivate)
- `GET /api/admin/activity-timeline`
- `GET /api/admin/system-health`
- `GET /api/admin/settings` + `PUT /api/admin/settings`
- `POST /api/admin/backup` + `POST /api/admin/restore`

## 7) How the system works (end-to-end flow)

### A) User logs in

1. User opens the frontend UI.
2. UI sends `POST /api/login` with credentials.
3. Backend verifies password (bcrypt) and creates a session.
4. Session is stored in PostgreSQL (`sessions` table) and a session cookie is set.
5. Next requests include the cookie automatically (`credentials: include`).

### B) User opens a screen (example: appointments)

1. React page uses TanStack Query to call `GET /api/appointments`.
2. Express checks session using `isAuthenticated`.
3. Route handler loads data using:
   - `DatabaseStorage` methods (in `server/storage.ts`), and/or
   - Direct Drizzle queries through `db`.
4. Backend returns JSON.
5. Frontend renders the response.

### C) Create/update actions (example: doctor creates prescription)

1. Doctor fills a form in UI.
2. UI sends `POST /api/prescriptions` with JSON body.
3. Backend validates role (doctor/admin guard).
4. Backend writes to Postgres using Drizzle + shared schema.
5. Backend returns created record.
6. Frontend invalidates queries and refreshes the UI.

### D) Realtime (if enabled)

- WebSocket server is attached to the same HTTP server.
- Used for scanner/real-time messaging style features.

## 8) Notes (important)

- “DB controllers” are not a separate folder; most DB logic is centralized in `server/storage.ts`.
- `shared/schema.ts` is the single source of truth for DB tables/types used in both backend and frontend.
