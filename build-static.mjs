import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const fallbackConfig = {
  supabaseUrl: "https://rawpuvxrexgfsrgjtcep.supabase.co",
  supabaseAnonKey: "sb_publishable_iAMpHKfFKawzaFOSzalT9w_yA7_nIR8",
  appUrl: "https://nakaru-san.com",
  instagramAuthUrl: "",
  enabledSocialProviders: ""
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

function inlineScript(value) {
  return value.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
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
  instagramAuthUrl: process.env.VITE_INSTAGRAM_AUTH_URL || process.env.INSTAGRAM_AUTH_URL || fallbackConfig.instagramAuthUrl,
  enabledSocialProviders: process.env.VITE_SOCIAL_AUTH_PROVIDERS || process.env.SOCIAL_AUTH_PROVIDERS || fallbackConfig.enabledSocialProviders
};

await fs.writeFile(
  path.join(dist, "config.js"),
  `window.NAKARU_CONFIG = ${JSON.stringify(config, null, 2)};\n`,
  "utf8"
);

const inlineCss = await fs.readFile(path.join(dist, "styles.css"), "utf8");
const inlineSupabase = await fs.readFile(path.join(dist, "supabase.min.js"), "utf8");
const inlineApp = await fs.readFile(path.join(dist, "app.js"), "utf8");
const inlineConfig = `window.NAKARU_CONFIG = ${JSON.stringify(config, null, 2)};`;

const standaloneIndex = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nakaru-San</title>
    <meta name="description" content="Nakaru-San anime and gaming social community." />
    <meta name="theme-color" content="#7c3cff" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Nakaru-San" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="./manifest.webmanifest" />
    <link rel="apple-touch-icon" href="./icons/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="./icons/icon-192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="./icons/icon-512.png" />
    <style>${inlineCss}</style>
    <script>${inlineScript(inlineConfig)}</script>
    <script>${inlineScript(inlineSupabase)}</script>
    <script>
      window.NAKARU_BOOT_RENDERED = false;
      window.addEventListener("error", function (event) {
        console.error("Nakaru-San boot error", event.error || event.message);
        var app = document.getElementById("app");
        if (app && !window.NAKARU_BOOT_RENDERED) {
          app.innerHTML = '<main class="app-shell"><section class="hero panel"><div><span class="eyebrow">Nakaru-San</span><h1>Nakaru-San</h1><p>The site loaded, but the app script hit a browser error. Please refresh once or clear the old site cache.</p></div></section></main>';
        }
      });
    </script>
  </head>
  <body>
    <div id="app">
      <main class="app-shell">
        <section class="hero panel">
          <div>
            <span class="eyebrow">Nakaru-San</span>
            <h1>Nakaru-San</h1>
            <p>Loading the anime and gaming community platform...</p>
          </div>
        </section>
      </main>
    </div>
    <script>${inlineScript(inlineApp)}</script>
    <script>
      setTimeout(function () {
        var app = document.getElementById("app");
        if (app && app.textContent.indexOf("Loading the anime and gaming community platform") !== -1) {
          app.innerHTML = '<main class="app-shell"><section class="hero panel"><div><span class="eyebrow">Nakaru-San</span><h1>Nakaru-San</h1><p>The app is still loading. Refresh once, and if this remains, confirm JavaScript is enabled for this site.</p></div></section></main>';
        }
      }, 3500);
    </script>
  </body>
</html>
`;

await fs.writeFile(path.join(dist, "index.html"), standaloneIndex, "utf8");

for (const file of ["index.html", "app.js", "styles.css", "config.js", "supabase.min.js", "nakaru-san-logo.png", "nakaru-hoodies-banner.png", "manifest.webmanifest", "service-worker.js", "offline.html"]) {
  try {
    await copyFile(path.join(dist, file), path.join(root, file));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

try {
  await copyDirectory(path.join(dist, "icons"), path.join(root, "icons"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

console.log("Nakaru-San static build created in dist/");
console.log("IONOS-compatible root files synced.");
console.log(`Supabase URL configured: ${config.supabaseUrl ? "yes" : "no"}`);
console.log(`Supabase anon/publishable key configured: ${config.supabaseAnonKey ? "yes" : "no"}`);
console.log(`App URL configured: ${config.appUrl || "no"}`);
