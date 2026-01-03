import "dotenv/config";

const present = (k) => Object.prototype.hasOwnProperty.call(process.env, k);
const mask = (v) => (typeof v === "string" && v.length ? "(set)" : "(empty)");

const keys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
for (const k of keys) {
  const v = process.env[k];
  const shown = k === "SMTP_PASS" ? mask(v) : v ?? "(missing)";
  console.log(`${k}: ${present(k) ? shown : "(missing)"}`);
}
