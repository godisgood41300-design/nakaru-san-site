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
