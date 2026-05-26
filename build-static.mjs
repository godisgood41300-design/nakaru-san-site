import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const fallbackConfig = {
  supabaseUrl: "https://rawpuvxrexgfsrgjtcep.supabase.co",
  supabaseAnonKey: "sb_publishable_iAMpHKfFKawzaFOSzalT9w_yA7_nIR8",
  appUrl: "https://nakaru-san.nakaru-san.com",
  instagramAuthUrl: ""
};

async function copyFile(from, to) {
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
}

async function copyDirectory(from, to) {
  await fs.mkdir(to, { recursive: true });
  for (const item of await fs.readdir(from, { withFileTypes: true })) {
    const source = path.join(from, item.name);
    const target = path.join(to, item.name);
    if (item.isDirectory()) {
      await copyDirectory(source, target);
    } else if (item.isFile()) {
      await copyFile(source, target);
    }
  }
}

await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });

await copyFile(path.join(root, "static", "index.html"), path.join(dist, "index.html"));
await copyFile(path.join(root, "static", "app.js"), path.join(dist, "app.js"));
await copyFile(path.join(root, "static", "styles.css"), path.join(dist, "styles.css"));
await copyDirectory(path.join(root, "public"), dist);

const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || fallbackConfig.supabaseUrl,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || fallbackConfig.supabaseAnonKey,
  appUrl: process.env.VITE_APP_URL || process.env.APP_URL || fallbackConfig.appUrl,
  instagramAuthUrl: process.env.VITE_INSTAGRAM_AUTH_URL || process.env.INSTAGRAM_AUTH_URL || fallbackConfig.instagramAuthUrl
};

await fs.writeFile(
  path.join(dist, "config.js"),
  `window.NAKARU_CONFIG = ${JSON.stringify(config, null, 2)};\n`,
  "utf8"
);

for (const file of ["index.html", "app.js", "styles.css", "config.js", "supabase.min.js", "nakaru-san-logo.png", "nakaru-hoodies-banner.png"]) {
  try {
    await copyFile(path.join(dist, file), path.join(root, file));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

console.log("Nakaru-San static build created in dist/");
console.log("IONOS-compatible root files synced.");
console.log(`Supabase URL configured: ${config.supabaseUrl ? "yes" : "no"}`);
console.log(`Supabase anon/publishable key configured: ${config.supabaseAnonKey ? "yes" : "no"}`);
console.log(`App URL configured: ${config.appUrl || "no"}`);
