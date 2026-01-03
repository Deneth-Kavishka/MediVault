import "dotenv/config";
import nodemailer from "nodemailer";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !portRaw || !user || !pass || !from) return null;

  const port = Number(portRaw);
  if (!Number.isFinite(port)) return null;

  return { host, port, user, pass, from };
}

const smtp = getSmtpConfig();
if (!smtp) {
  console.error(
    "SMTP not configured. Ensure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM are set in .env"
  );
  process.exit(1);
}

const toArg = process.argv.find((a) => a.startsWith("--to="));
const to = (toArg ? toArg.slice("--to=".length) : smtp.user).trim();

console.log("SMTP_HOST:", smtp.host);
console.log("SMTP_PORT:", smtp.port);
console.log("SMTP_USER:", smtp.user);
console.log("SMTP_FROM:", smtp.from);
console.log("TO:", to);

const transporter = nodemailer.createTransport({
  host: smtp.host,
  port: smtp.port,
  secure: smtp.port === 465,
  auth: {
    user: smtp.user,
    pass: smtp.pass,
  },
});

try {
  console.log("\n1) Verifying SMTP credentials...");
  await transporter.verify();
  console.log("✅ SMTP verify OK");

  console.log("\n2) Sending test email...");
  const info = await transporter.sendMail({
    from: smtp.from,
    to,
    subject: "MediVault SMTP Test",
    text: "This is a test email from MediVault (SMTP configuration check).",
  });

  console.log("✅ Sent. messageId:", info.messageId);
  console.log("Response:", info.response);
} catch (err) {
  const code = err?.code;
  const response = err?.response;
  const message = err?.message || String(err);

  console.error("\n❌ SMTP test failed.");
  if (code) console.error("code:", code);
  if (response) console.error("response:", response);
  console.error("message:", message);

  // Helpful hint for Gmail failures
  if (
    String(response || message).includes("535") ||
    String(response || message)
      .toLowerCase()
      .includes("badcredentials")
  ) {
    console.error(
      "\nGmail hint: SMTP_PASS must be a Google App Password (16 chars) for the SAME Gmail account as SMTP_USER.\nAlso ensure 2FA is enabled on that account."
    );
  }

  process.exitCode = 1;
}
