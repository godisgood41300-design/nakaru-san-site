import fs from "node:fs/promises";
import path from "node:path";
import { createQrPngBuffer, createQrSvg } from "../qr-code.mjs";

const root = path.resolve(import.meta.dirname, "..");
const rawTarget = String(process.env.QR_TARGET || process.env.VITE_APP_URL || "https://nakaru-san-site-1.onrender.com").trim();
const target = rawTarget.includes("#") ? rawTarget : `${rawTarget.replace(/\/$/, "")}/#download-app`;

const svg = createQrSvg(target, {
  title: "Scan to download Nakaru-San",
  foreground: "#050509",
  background: "#ffffff",
  moduleSize: 12
});
const png = createQrPngBuffer(target, {
  foreground: "#050509",
  background: "#ffffff",
  moduleSize: 14
});

const files = [
  path.join(root, "nakaru-san-download-qr.svg"),
  path.join(root, "public", "nakaru-san-download-qr.svg"),
  path.join(root, "static", "nakaru-san-download-qr.svg")
];

for (const file of files) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, svg, "utf8");
}

const pngFiles = [
  path.join(root, "nakaru-san-download-qr.png"),
  path.join(root, "public", "nakaru-san-download-qr.png"),
  path.join(root, "static", "nakaru-san-download-qr.png")
];

for (const file of pngFiles) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, png);
}

console.log(`QR code created for ${target}`);
console.log(path.join(root, "nakaru-san-download-qr.svg"));
console.log(path.join(root, "nakaru-san-download-qr.png"));
