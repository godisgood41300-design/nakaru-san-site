# Nakaru-San Clean Corrected Public Build

This ZIP is the clean public-ready Render package for the corrected Nakaru-San website/app.

## What was corrected

- Removed old backup folders, previous ZIPs, game folders, IONOS test folders, logs, and duplicate public/root copies from this package.
- Included only the current root app files that Render serves.
- Profile owner controls are hidden by default and only shown after a signed-in owner session is detected.
- The edit-state profile button says `Update Profile`.
- After profile save, the UI exits edit mode and shows `Profile updated.`
- YouTube posting UI uses the corrected Post Video Link flow in the included app files.
- Asset links use the 20260523-clean-corrected cache-busting version so browsers fetch the newest corrected JS/CSS.
- Render config uses `plan: starter` so the public service can stay awake. Change it to `free` only if you accept Render's wake/loading screen.
- `APP_BASE_URL` should be the exact live custom domain: `https://nakarusan.nakarusan.com` unless your final domain spelling differs.

## Active entrypoints

- Render start command: `npm start`
- Node server: `server.mjs`
- Browser entrypoint: `index.html`
- Frontend assets: `app.js`, `styles.css`, `config.js`, `nakaru-san-logo.png`

## Not included on purpose

- `public/` duplicate copy
- `api/` Vercel serverless routes
- old `NAKARU-SAN-*` backup folders
- old `.zip` files
- `node_modules/`
- log files
- unrelated game folders
- IONOS test files

Use this ZIP for a clean Render upload/import so the build cannot accidentally pick an old folder.

