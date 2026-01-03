import nodemailer from "nodemailer";

type PatientApprovalEmail = {
  to: string;
  fullName: string;
  username: string;
  temporaryPassword: string;
  nic: string;
  healthId?: string | null;
  rfid?: string | null;
};

type UserCreatedEmail = {
  to: string;
  fullName?: string | null;
  username: string;
  temporaryPassword: string;
  role: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  // Gmail “App passwords” are displayed with spaces (xxxx xxxx xxxx xxxx).
  // Accept either format by stripping whitespace.
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !portRaw || !user || !pass || !from) {
    return null;
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port)) return null;

  return { host, port, user, pass, from };
}

export async function sendPatientApprovalEmail(payload: PatientApprovalEmail) {
  const smtp = getSmtpConfig();
  if (!smtp) {
    console.warn(
      "SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM to enable approval emails."
    );
    return { sent: false, error: "SMTP not configured" };
  }

  const debugEmail =
    process.env.DEBUG_EMAIL?.trim().toLowerCase() === "true" ||
    process.env.DEBUG?.trim().toLowerCase() === "true";
  if (debugEmail) {
    console.log(
      `[email] host=${smtp.host} port=${smtp.port} user=${smtp.user} from=${smtp.from} to=${payload.to}`
    );
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const subject = "MediVault Registration Approved";

  const lines = [
    `Hello ${payload.fullName},`,
    "",
    "Your MediVault patient registration has been approved.",
    "",
    `Username: ${payload.username}`,
    `Temporary Password: ${payload.temporaryPassword}`,
    payload.healthId ? `Health ID: ${payload.healthId}` : undefined,
    payload.rfid ? `RFID: ${payload.rfid}` : undefined,
    `NIC: ${payload.nic}`,
    "",
    "Security notice: You will be required to change your password on your first login.",
    "",
    "Login: http://localhost:5173/login",
    "",
    "Thank you,",
    "MediVault Admin",
  ].filter(Boolean);

  const text = lines.join("\n");

  try {
    await transporter.sendMail({
      from: smtp.from,
      to: payload.to,
      subject,
      text,
    });
    return { sent: true };
  } catch (err: any) {
    const message = err?.response || err?.message || String(err);
    console.error("Approval email send failed:", message);
    return { sent: false, error: message };
  }
}

export async function sendUserCreatedEmail(payload: UserCreatedEmail) {
  const smtp = getSmtpConfig();
  if (!smtp) {
    console.warn(
      "SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM to enable emails."
    );
    return { sent: false, error: "SMTP not configured" };
  }

  const debugEmail =
    process.env.DEBUG_EMAIL?.trim().toLowerCase() === "true" ||
    process.env.DEBUG?.trim().toLowerCase() === "true";
  if (debugEmail) {
    console.log(
      `[email] host=${smtp.host} port=${smtp.port} user=${smtp.user} from=${smtp.from} to=${payload.to}`
    );
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const subject = "MediVault Account Created";

  const hello = payload.fullName?.trim()
    ? `Hello ${payload.fullName.trim()},`
    : "Hello,";

  const lines = [
    hello,
    "",
    "An administrator has created a MediVault account for you.",
    "",
    `Role: ${payload.role}`,
    `Username: ${payload.username}`,
    `Temporary Password: ${payload.temporaryPassword}`,
    "",
    "Security notice: You will be required to change your password on your first login.",
    "",
    "Login: http://localhost:5173/login",
    "",
    "Thank you,",
    "MediVault Admin",
  ];

  const text = lines.join("\n");

  try {
    await transporter.sendMail({
      from: smtp.from,
      to: payload.to,
      subject,
      text,
    });
    return { sent: true };
  } catch (err: any) {
    const message = err?.response || err?.message || String(err);
    console.error("User-created email send failed:", message);
    return { sent: false, error: message };
  }
}
