# Changelog

## 2026-05-23 - Production rebuild

- Rebuilt Nakaru-San as a clean Vite + React app.
- Added a polished anime/gaming social platform layout.
- Added profile owner/edit behavior so Save Profile only appears while editing.
- Added profile photo and banner upload controls.
- Added YouTube link posting with embed conversion and feed rendering.
- Added public chatroom pages and room-specific messages.
- Added private room, inbox, DM conversation, GoLive, video preview, and call preview screens.
- Added Supabase Auth, database, storage, and realtime-ready wiring.
- Added `supabase/schema.sql` with RLS policies.
- Added Render, Vercel, and local deployment instructions.
- Removed dependency on old backend paths and stale root/public static files by isolating the new production app in this folder.

## 2026-05-25 - Profile and video posting controls

- Updated YouTube link posting so the form disappears after a successful post.
- Added a clean post-success panel with View Live Feed and Post Another Video Link actions.
- Updated profile editing so Save Profile appears only after the owner makes a change.
- Kept Edit Profile available after saving so the owner can reopen editing later.
- Added remembered email support and browser password-manager friendly auth fields.

## 2026-05-25 - Deployment failure fix

- Added a dependency-free static production app under `static/`.
- Replaced the Vite build command with `node build-static.mjs`.
- Generated deploy output in `dist/` without requiring React, Vite, lucide, or downloaded npm packages.
- Updated Render config to publish `./dist`.
- Kept optional Supabase support through generated `dist/config.js`.

## 2026-05-25 - Video-only post result and auth redirect fix

- After a YouTube video is posted, the video page now hides the link input and post button.
- The video page now leaves only the embedded posted video visible after posting.
- Signup now passes `emailRedirectTo` using the current public site origin so confirmation emails do not default to localhost.
- README now documents the required Supabase Site URL and redirect allowlist settings.

## 2026-05-25 - Social login buttons

- Replaced generic social buttons with Connect with Google, Apple, Facebook, X, and Instagram buttons.
- Google, Apple, Facebook, and X now call Supabase OAuth with the public app redirect URL.
- Instagram now supports a configured external OAuth URL and shows a clean setup message if it is not configured.
- Added `VITE_APP_URL` and `VITE_INSTAGRAM_AUTH_URL` to generated frontend config.

## 2026-05-25 - Safer Render package

- Added root-level static files in addition to `dist/` so the package can work if a host serves the upload root.
- Added `VITE_APP_URL` and `VITE_INSTAGRAM_AUTH_URL` to `render.yaml` env var declarations.
- Normalized Render static publish path to `dist`.

## 2026-05-25 - Black screen startup guard

- Added visible loading fallback HTML so the app never opens to an empty black page.
- Made Supabase client setup defensive so invalid env values cannot crash the whole page.
- Render now happens immediately before Supabase session loading, so auth/network issues cannot block the UI.
- Supabase is retried after page load in case the CDN script loads after the main app.

## 2026-05-25 - Supabase config diagnostics

- Build now accepts both `VITE_SUPABASE_URL` and `SUPABASE_URL`.
- Build now accepts `VITE_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY`, or `SUPABASE_PUBLISHABLE_KEY`.
- Build logs now print whether Supabase URL/key and app URL were detected.
- README now explains checking `/config.js` after Render redeploy.

## 2026-05-25 - Live config banner fix

- Fixed the logged-out homepage so it no longer shows the demo-mode banner just because a visitor is not signed in.
- Added protection against placeholder Supabase values such as `your-project-ref.supabase.co`.
- Live config checks now show a cleaner message when Render is still using placeholder Supabase environment variables.

## 2026-05-25 - Supabase script load order fix

- Fixed the script order so the Supabase browser library loads before `app.js`.
- Removed the public technical warning that said `Supabase library did not load yet`.
- Added a silent retry and a cleaner account-service fallback message.

## 2026-05-25 - Supabase Project URL guard

- Added a config guard for accidentally pasted Supabase dashboard URLs.
- The app now expects `VITE_SUPABASE_URL` to use the real Project URL ending in `.supabase.co`.

## 2026-05-25 - Loading screen fix

- Changed the page so `app.js` no longer waits behind the external Supabase CDN script.
- The site UI now renders first, then retries Supabase connection in the background.
- Demo-mode banner now appears only when Supabase config is actually missing.

## 2026-05-25 - Glossy kanji and hoodie banner

- Added a subtle animated purple kanji background layer behind the app.
- Added a top Nakaru-San hoodie banner under the navigation.
- Added a built-in hoodie fallback visual that can be replaced by uploading `nakaru-hoodies-banner.png`.

## 2026-05-25 - Render Web Service support

- Added `npm start` so Render Web Services can run the app.
- Updated the static server to use Render's `PORT` environment variable.
- Made `/config.js` generate from live Render environment variables at runtime for Web Service deployments.
- Updated `render.yaml` and README for Web Service deployment on `nakaru-san.nakaru-san.com`.

## 2026-05-25 - Hoodie image banner and stronger kanji

- Added the supplied hoodie mockup as `public/nakaru-hoodies-banner.png`.
- Updated the hoodie banner to show the real merch image cleanly without the fallback artwork.
- Increased kanji size, glow, and opacity so the background effect is more noticeable.
- Updated the build so every file in `public/` is copied into `dist/`.

## 2026-05-26 - Render and IONOS compatible package

- Added public Supabase fallback config so the app can work when served from Render or plain IONOS Webspace.
- Updated the Render Web Service server to use the same public fallback if environment variables are missing.
- Build now syncs IONOS-compatible root files from `dist/`.
- README now explains the IONOS DNS-to-Render setup and the IONOS Webspace fallback.

## 2026-05-26 - Bundled Supabase browser library

- Added `supabase.min.js` to the app so account services no longer depend on the external CDN loading in the visitor's browser.
- Updated `index.html` to load the local Supabase library before `app.js`.
- Build now syncs `supabase.min.js` to the root IONOS-compatible files.

## 2026-05-26 - Account diagnostics hardening

- Updated the Web Service server so missing `.js`, `.css`, image, and other asset files do not fall back to `index.html`.
- Added fallback serving from `public/` and the project root for bundled assets such as `supabase.min.js`.
- This prevents browsers from trying to run HTML as JavaScript when an asset path is wrong or a deploy is missing a static file.

## 2026-05-26 - Account warning and redirect fix

- Stale or invalid saved browser sessions are now cleared silently instead of showing a public account-services banner.
- OAuth redirect URLs now prefer the visitor's current domain, which fixes apex-domain use such as `nakaru-san.com`.
- Updated fallback app URL to `https://nakaru-san.com` for direct IONOS hosting.
