import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This is a pre-generated 64x64 PNG favicon with medical teal theme
// Generated from the SVG design
const base64PNG = `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`;

const pngBuffer = Buffer.from(base64PNG, "base64");
const outputPath = path.join(__dirname, "../client/public/favicon.png");

fs.writeFileSync(outputPath, pngBuffer);

console.log("✅ PNG favicon created successfully!");
console.log("📁 Location: client/public/favicon.png");
console.log("📏 Size: 64x64 pixels");
console.log("🎨 Color: Medical teal (#1494B5)");
console.log("💊 Icon: Medicine pill blister pack");
console.log("\n🚀 Your favicon is ready to use!");
