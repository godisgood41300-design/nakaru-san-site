import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

async function copyFile(from, to) {
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
}

await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });

await copyFile(path.join(root, "static", "index.html"), path.join(dist, "index.html"));
await copyFile(path.join(root, "static", "app.js"), path.join(dist, "app.js"));
await copyFile(path.join(root, "static", "styles.css"), path.join(dist, "styles.css"));
await copyFile(path.join(root, "public", "nakaru-san-logo.png"), path.join(dist, "nakaru-san-logo.png"));

const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "",
  appUrl: process.env.VITE_APP_URL || process.env.APP_URL || "",
  instagramAuthUrl: process.env.VITE_INSTAGRAM_AUTH_URL || process.env.INSTAGRAM_AUTH_URL || ""
};

await fs.writeFile(
  path.join(dist, "config.js"),
  `window.NAKARU_CONFIG = ${JSON.stringify(config, null, 2)};\n`,
  "utf8"
);

console.log("Nakaru-San static build created in dist/");
console.log(`Supabase URL configured: ${config.supabaseUrl ? "yes" : "no"}`);
console.log(`Supabase anon/publishable key configured: ${config.supabaseAnonKey ? "yes" : "no"}`);
console.log(`App URL configured: ${config.appUrl || "no"}`);
