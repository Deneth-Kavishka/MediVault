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

type SensitiveChangeApprovedEmail = {
  to: string;
  fullName?: string | null;
  field: string;
  oldValue?: string | null;
  newValue: string;
};

type SensitiveChangeRejectedEmail = {
  to: string;
  fullName?: string | null;
  field: string;
  requestedValue: string;
  reason?: string | null;
  adminNotes?: string | null;
};

type LoginAlertEmail = {
  to: string;
  username: string;
  fullName?: string | null;
  timeIso: string;
  ipAddress?: string | null;
  location?: string | null;
  userAgent?: string | null;
};

type AccountDeactivatedEmail = {
  to: string;
  fullName?: string | null;
  username: string;
  supportEmail: string;
  supportPhone: string;
};

type AccountReactivatedEmail = {
  to: string;
  fullName?: string | null;
  username: string;
  supportEmail: string;
  supportPhone: string;
};

type AppointmentCancelledEmail = {
  to: string;
  fullName?: string | null;
  appointmentDateIso: string;
  appointmentTime?: string | null;
  doctorName?: string | null;
  reason: string;
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

export async function sendAccountDeactivatedEmail(
  payload: AccountDeactivatedEmail
) {
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

  const subject = "MediVault Account Deactivated";

  const hello = payload.fullName?.trim()
    ? `Hello ${payload.fullName.trim()},`
    : "Hello,";

  const lines = [
    hello,
    "",
    "Your MediVault account was deactivated due to some issues.",
    "",
    `Username: ${payload.username}`,
    "",
    "If you want to reactivate your account, contact MediVault Help Center:",
    `Email: ${payload.supportEmail}`,
    `Phone: ${payload.supportPhone}`,
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
    console.error("Account-deactivated email send failed:", message);
    return { sent: false, error: message };
  }
}

export async function sendAccountReactivatedEmail(
  payload: AccountReactivatedEmail
) {
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

  const subject = "MediVault Account Reactivated";

  const hello = payload.fullName?.trim()
    ? `Hello ${payload.fullName.trim()},`
    : "Hello,";

  const lines = [
    hello,
    "",
    "Your MediVault account has been reactivated.",
    "",
    `Username: ${payload.username}`,
    "",
    "You can now log in to MediVault.",
    "",
    "If you have any issues, contact MediVault Help Center:",
    `Email: ${payload.supportEmail}`,
    `Phone: ${payload.supportPhone}`,
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
    console.error("Account-reactivated email send failed:", message);
    return { sent: false, error: message };
  }
}

export async function sendAppointmentCancelledEmail(
  payload: AppointmentCancelledEmail
) {
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

  const subject = "MediVault Appointment Cancelled";

  const hello = payload.fullName?.trim()
    ? `Hello ${payload.fullName.trim()},`
    : "Hello,";

  const dateStr = new Date(payload.appointmentDateIso).toLocaleDateString();

  const lines = [
    hello,
    "",
    "Your MediVault appointment has been cancelled.",
    "",
    `Date: ${dateStr}`,
    payload.appointmentTime ? `Time: ${payload.appointmentTime}` : undefined,
    payload.doctorName ? `Doctor: ${payload.doctorName}` : undefined,
    `Reason: ${payload.reason}`,
    "",
    "If you still need an appointment, please book again in MediVault.",
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
    console.error("Appointment-cancelled email send failed:", message);
    return { sent: false, error: message };
  }
}

export async function sendSensitiveChangeApprovedEmail(
  payload: SensitiveChangeApprovedEmail
) {
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

  const subject = "MediVault Profile Change Approved";

  const hello = payload.fullName?.trim()
    ? `Hello ${payload.fullName.trim()},`
    : "Hello,";

  const lines = [
    hello,
    "",
    "Your request to change a sensitive profile field has been approved.",
    "",
    `Field: ${payload.field}`,
    payload.oldValue ? `Previous: ${payload.oldValue}` : undefined,
    `Updated: ${payload.newValue}`,
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
    console.error("Sensitive-change approved email send failed:", message);
    return { sent: false, error: message };
  }
}

export async function sendSensitiveChangeRejectedEmail(
  payload: SensitiveChangeRejectedEmail
) {
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

  const subject = "MediVault Profile Change Rejected";

  const hello = payload.fullName?.trim()
    ? `Hello ${payload.fullName.trim()},`
    : "Hello,";

  const lines = [
    hello,
    "",
    "Your request to change a sensitive profile field was rejected.",
    "",
    `Field: ${payload.field}`,
    `Requested: ${payload.requestedValue}`,
    payload.reason ? `Reason (you): ${payload.reason}` : undefined,
    payload.adminNotes ? `Admin notes: ${payload.adminNotes}` : undefined,
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
    console.error("Sensitive-change rejected email send failed:", message);
    return { sent: false, error: message };
  }
}

export async function sendLoginAlertEmail(payload: LoginAlertEmail) {
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

  const subject = "MediVault Login Alert";

  const hello = payload.fullName?.trim()
    ? `Hello ${payload.fullName.trim()},`
    : "Hello,";

  const lines = [
    hello,
    "",
    "We noticed a successful login to your MediVault account.",
    "",
    `Username: ${payload.username}`,
    `Date/Time (UTC): ${payload.timeIso}`,
    payload.ipAddress ? `IP Address: ${payload.ipAddress}` : undefined,
    payload.location ? `Approx. Location: ${payload.location}` : undefined,
    payload.userAgent
      ? `Device/Browser (User-Agent): ${payload.userAgent}`
      : undefined,
    "",
    "If this was you, you can ignore this email.",
    "If this wasn't you, please contact an administrator and change your password immediately.",
    "",
    "Thank you,",
    "MediVault Security",
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
    console.error("Login alert email send failed:", message);
    return { sent: false, error: message };
  }
}
