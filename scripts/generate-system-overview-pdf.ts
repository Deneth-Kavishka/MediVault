import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type Section = {
  title: string;
  bullets: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const outDir = path.join(repoRoot, "docs");
const outPdf = path.join(outDir, "medivault-system-overview.pdf");

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildSections(): Section[] {
  return [
    {
      title: "What this system is",
      bullets: [
        "MediVault is a full-stack healthcare management system (EHR-style).",
        "One server serves both: frontend (React SPA) and backend API (/api/*).",
      ],
    },
    {
      title: "Technology stack (high level)",
      bullets: [
        "Frontend: React + TypeScript + Vite + Tailwind + TanStack Query.",
        "Backend: Node.js + Express + TypeScript.",
        "Auth: Passport Local + server-side sessions stored in PostgreSQL.",
        "Database: PostgreSQL + Drizzle ORM.",
        "Realtime: WebSockets (scanner/real-time features).",
        "Email: Nodemailer utilities.",
        "AI (optional): Gemini integration.",
      ],
    },
    {
      title: "Where the backend is (files/folders)",
      bullets: [
        "Backend folder: server/",
        "Backend entry/startup: server/index.ts (creates app, sessions, registerRoutes, starts server)",
        "API routes: server/routes.ts (most /api/* endpoints)",
        "Auth routes + auth middleware: server/localAuth.ts (POST /api/login, isAuthenticated, role guards)",
        "DB connection: server/db.ts (pg Pool + drizzle db)",
        "DB operations layer (DB controllers): server/storage.ts (DatabaseStorage class)",
      ],
    },
    {
      title: "Where DB schema is",
      bullets: [
        "Shared schema: shared/schema.ts (tables + types + Zod insert schemas)",
        "Migrations: drizzle.config.ts + migration_*.sql files",
      ],
    },
    {
      title: "How frontend calls the backend",
      bullets: [
        "Fetch helper: client/src/lib/queryClient.ts",
        "Requests use fetch('/api/...', { credentials: 'include' }) so sessions work.",
        "Pages mostly use TanStack Query queryKey: ['/api/...'].",
      ],
    },
    {
      title: "Main API groups (examples)",
      bullets: [
        "Auth: POST /api/login (and related auth endpoints in server/localAuth.ts)",
        "Profile: GET /api/profile, GET /api/profile/full",
        "Patients: /api/patients, /api/patients/me, /api/patients/:id, /api/patients/nic/:nic",
        "Doctors + availability: /api/doctors, /api/doctor-availability",
        "Appointments: /api/appointments",
        "Medical records/documents: /api/medical-records, /api/medical-documents",
        "Prescriptions: /api/prescriptions, /api/prescriptions/doctor/mine",
        "Lab: /api/lab-tests, /api/lab-facilities",
        "Billing: /api/bills, /api/payments",
        "Notifications: /api/notifications",
        "Messaging: /api/conversations, /api/messages",
        "Admin: /api/admin/* (users, stats, settings, backup/restore, reports)",
      ],
    },
    {
      title: "System flow (simple)",
      bullets: [
        "1) User opens the UI (React) in the browser.",
        "2) UI calls backend endpoints under /api/*.",
        "3) Backend verifies session (cookie) + role guards.",
        "4) Backend reads/writes PostgreSQL via Drizzle using shared/schema.ts.",
        "5) Backend returns JSON; frontend updates UI and caches via TanStack Query.",
        "6) Optional realtime: WebSocket server for scanner/real-time updates.",
      ],
    },
  ];
}

function writePdf() {
  fs.mkdirSync(outDir, { recursive: true });

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("MediVault – System Overview (Tech + Flow)", marginX, 64);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Generated: ${todayIso()}`, marginX, 84);

  doc.setDrawColor(220);
  doc.line(marginX, 96, pageWidth - marginX, 96);

  const sections = buildSections();

  let cursorY = 110;

  for (const section of sections) {
    autoTable(doc, {
      startY: cursorY,
      head: [[section.title]],
      body: section.bullets.map((b) => [b]),
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 10,
        cellPadding: 6,
        valign: "top",
        textColor: 20,
      },
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: 20,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: pageWidth - marginX * 2 },
      },
      margin: { left: marginX, right: marginX },
    });

    const lastY = (doc as any).lastAutoTable?.finalY ?? cursorY;
    cursorY = lastY + 14;

    if (cursorY > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      cursorY = 64;
    }
  }

  doc.save(outPdf);
  // Also write it as a buffer for CI/automation (doc.save writes file in browser; in Node it writes too, but keep safe):
  const pdfBytes = doc.output("arraybuffer");
  fs.writeFileSync(outPdf, Buffer.from(pdfBytes));

  console.log(`✅ PDF generated: ${outPdf}`);
}

writePdf();
