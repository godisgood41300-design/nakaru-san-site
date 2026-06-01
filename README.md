# Nakaru-San Production App

Nakaru-San is a dark anime/gaming community platform for profiles, public feeds, YouTube video posts, public chatrooms, private rooms, direct messages, and GoLive/call previews.

This is a clean static rebuild made to avoid old duplicate files, stale deployment confusion, and dependency build failures.

## What is included

- Home page with Nakaru-San branding
- Public live feed
- Public chatrooms: Anime, Gaming, Manga, General, Nakaru-San
- Private chatroom screen scaffold
- User profile page
- Edit profile page with profile photo and banner controls
- Save Profile flow that hides the save button after saving
- YouTube link posting with embedded video previews
- Messaging inbox and DM conversation layout
- GoLive page with browser camera/microphone preview
- Installable phone-app/PWA support for iPhone and Android
- Supabase Auth support
- Supabase database/storage/realtime-ready schema
- Public demo browsing when Supabase env variables are not set. Real accounts require Supabase Auth.

## Features that are fully working in this build

- Static app navigation between all requested sections
- Email signup/sign-in/logout through Supabase Auth when env variables are configured
- Social login buttons are hidden by default unless you explicitly enable configured providers
- Public browsing fallback when Supabase is not configured
- Profile editing and save state
- Avatar/banner file selection
- Text post composer
- YouTube URL validation and embed conversion
- Feed rendering
- Public room message sending
- Messenger-style inbox UI
- Top user search with Google Images and YouTube reference search buttons
- Friend requests, accepted friends, and friend-only direct messages when `supabase/schema.sql` has been run
- Image/video attachments in public rooms, private rooms, and direct messages
- Searchable Go Live rooms with friend invites
- One-to-one audio/video calls over the browser's internet connection through WebRTC
- Camera/microphone permission preview for GoLive/call pages
- Add-to-home-screen installation with app icons, standalone display, and a basic offline screen

## Features scaffolded for the next production step

- True multi-user livestreaming needs a WebRTC provider for production-scale rooms. One-to-one call signaling is scaffolded through Supabase Realtime.
- Private room membership enforcement is represented in UI, but stricter per-room membership policies can be added after invite rules are finalized.
- Likes/comments UI is present; full persistence can be added using the included comments table.
- The top reference search opens public Google Images or YouTube search results. The app does not copy or host those third-party images.

## Environment variables

Create `.env` from `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_APP_URL=https://your-domain.com
VITE_INSTAGRAM_AUTH_URL=
VITE_SOCIAL_AUTH_PROVIDERS=
VITE_VAPID_PUBLIC_KEY=
```

Use the Supabase anon/publishable key only. Never put the service role secret key in frontend env variables.

The build also accepts these alternate names if you already typed them in Render:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
APP_URL=https://your-domain.com
INSTAGRAM_AUTH_URL=
SOCIAL_AUTH_PROVIDERS=
VAPID_PUBLIC_KEY=
```

If you deploy on Render as a Web Service, `/config.js` is generated from Render's live environment variables at runtime. After changing Render environment variables, restart or redeploy the Web Service, then open `/config.js` on your live site.

Important: do not leave the example value `https://your-project-ref.supabase.co` in Render. Replace it with the real Supabase Project URL from Supabase Project Settings > API.

The Supabase URL must look like this:

```text
https://your-project-ref.supabase.co
```

Do not paste a dashboard page such as:

```text
https://supabase.com/dashboard/project/your-project-ref/settings/api-keys/legacy
```

## Supabase setup

1. Open Supabase.
2. Go to SQL Editor.
3. Paste and run `supabase/schema.sql`.
4. Go to Authentication > URL Configuration.
5. Set Site URL to your live domain, for example `https://nakaru-san.nakaru-san.com`.
6. Add redirect URLs for your live domain, for example `https://nakaru-san.nakaru-san.com/*`.
7. If you also use the apex domain, add it too, for example `https://nakaru-san.com/*`.
8. Go to Authentication > Providers > Email and turn off "Confirm email" if you want users to sign up and log in immediately.
9. Email/password auth is the default account system. Enable social OAuth providers only if you have the matching app credentials and redirect URLs set up.

Run `supabase/schema.sql` again after this update if you want the new Requests, Friends, Messaging, Calls, and Live Room Invite tables. The file uses `create table if not exists`, `alter table`, and `drop policy if exists`, so it is safe to rerun against the current project.

This build no longer shows email-confirmation prompts in the website. If Supabase still says "Email not confirmed" during login, confirmation is still enabled in your Supabase dashboard and must be turned off there.

For OAuth:

- Social login buttons are hidden unless `VITE_SOCIAL_AUTH_PROVIDERS` is set.
- Example: `VITE_SOCIAL_AUTH_PROVIDERS=google,facebook`
- Google requires a Google OAuth client id/secret in Supabase.
- Apple requires an Apple Services ID and secret in Supabase.
- Facebook requires a Facebook app id/secret in Supabase.
- X/Twitter requires an X OAuth client id/secret in Supabase.
- Instagram is not a built-in Supabase OAuth provider. If you create a custom Instagram/Meta OAuth endpoint, put its public authorization URL in `VITE_INSTAGRAM_AUTH_URL`. Without that value, the Instagram button shows a setup message instead of failing with "Unknown OAuth provider."

Do not add social providers to `VITE_SOCIAL_AUTH_PROVIDERS` until they are enabled in Supabase Auth. Broken or unconfigured providers should stay hidden.

## Authentication behavior

- Signup and login use Supabase Auth only.
- Passwords are never stored by the frontend. Supabase securely handles account credentials.
- The "Remember this email" checkbox stores only the email address on that device. It does not store passwords.
- Logout calls Supabase sign-out, clears old local auth fallback data, clears Supabase auth tokens from browser storage, and returns the visitor to the homepage.
- If Supabase email confirmation is disabled, new users can sign up, log in, and stay remembered on the device through Supabase's persisted browser session.
- Profile photo and banner files upload to the public `nakaru-media` Supabase Storage bucket. The saved profile row stores the public image URLs so the avatar, banner, display name, username, and bio reload after logout/login.
- If profile saving says to log in again, the browser does not have an active Supabase session yet. Log in, then save profile again.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

## Build

```bash
npm run build
npm run preview
```

The production files are generated in `dist/`. This build does not require React, Vite, or any downloaded npm package.

## Install as a phone app

Nakaru-San is configured as a Progressive Web App.

On iPhone:

1. Open the live site in Safari.
2. Tap the Share button.
3. Tap Add to Home Screen.
4. Confirm the name Nakaru-San.

On Android:

1. Open the live site in Chrome.
2. Tap the browser menu.
3. Tap Install app or Add to Home screen.

The sidebar also includes an Install App button. On supported Android/Chrome browsers it can open the install prompt directly. On iPhone it shows the Safari install instructions.

## QR download page

The app includes a public install page at `/#download-app`.

A standalone QR image is included as `nakaru-san-download-qr.png`, with an SVG copy at `nakaru-san-download-qr.svg`. Scanning it opens the app download/install page. To regenerate it for another live URL:

```bash
QR_TARGET=https://your-domain.com npm run make:qr
```

## Notifications

- In-app notifications appear for new friend requests, accepted requests, messages, incoming video calls, incoming audio calls, accepted calls, and live room invites while the app is open.
- Browser/PWA notifications can be enabled from the sidebar with Enable Notifications.
- True notifications while the app is fully closed require Render Web Service hosting, not Render Static Site, because the app needs the included `/api/push-notification` sender route.
- Generate VAPID keys with `npm run generate:vapid`.
- Add these Render environment variables for closed push: `VITE_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Users must click Enable Notifications on each device.
- On iPhone, install Nakaru-San to the Home Screen first, open the installed app, then enable notifications.
- Without the VAPID/service-role variables, notifications still work while Nakaru-San is open or running in the browser/PWA background.

## Music and Media

- Live Feed and Profile composers support text posts plus image/video media uploads through the `nakaru-media` Supabase Storage bucket.
- The Music button plays original browser-generated flute-style ambience through Web Audio. It is not a copyrighted song or uploaded music file, and it only starts after the user taps the button.

## Deploy on Render as a Static Site

Use this setup for Render Static Site:

1. Create a new Render Static Site.
2. Connect the GitHub repo containing this folder.
3. If these files are at the top of the repository, leave Root Directory blank. If the whole folder is inside another folder, set Root Directory to that folder.
4. Build Command: `npm run build`
5. Publish Directory: `dist`
6. Do not enter a Start Command.
7. Add the `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_APP_URL` environment variables if you want to override the included public fallback config.
8. Deploy.

For the apex domain, use:

```text
VITE_APP_URL=https://nakaru-san.com
```

For the subdomain, use:

```text
VITE_APP_URL=https://nakaru-san.nakaru-san.com
```

## Deploy on Render as a Web Service

Use this setup if your Render service type is Web Service:

1. Create a new Render Web Service.
2. Connect the GitHub repo containing this folder.
3. Set Root Directory to `nakaru-san-production-app`.
4. Build Command: `npm run build`
5. Start Command: `npm start`
6. Leave Publish Directory blank because Web Services do not use it.
7. Add the `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_APP_URL` environment variables.
8. For closed push notifications, also add `VITE_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `SUPABASE_SERVICE_ROLE_KEY`.
9. Deploy.
10. Add your custom domain in Render and point DNS to Render's Web Service target.

For your domain, use `VITE_APP_URL=https://nakaru-san.nakaru-san.com`.

If you are using the apex domain instead, use:

```text
VITE_APP_URL=https://nakaru-san.com
```

OAuth redirects prefer the visitor's current domain automatically, but your Supabase redirect allowlist should include both domains you use.

## IONOS + Render domain setup

If IONOS only owns the domain and Render hosts the website, do not upload the website to IONOS Webspace. Point the subdomain to Render with DNS:

```text
Type: CNAME
Host/Name: nakaru-san
Value/Target: nakaru-san-site-1.onrender.com
```

If IONOS locks the CNAME because A/AAAA records exist, disconnect `nakaru-san.nakaru-san.com` from IONOS Webspace or Website Builder first.

## IONOS Webspace fallback

This package also includes root-level `index.html`, `app.js`, `styles.css`, `config.js`, `supabase.min.js`, `nakaru-san-logo.png`, and `nakaru-hoodies-banner.png`. If you ever upload directly to IONOS Webspace, upload those root-level files. The included `config.js` uses the public Supabase publishable key, not a secret key.

## Deploy on Vercel

1. Import the GitHub repo in Vercel.
2. Set Root Directory to `nakaru-san-production-app`.
3. Framework Preset: Other.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Add the same `VITE_` environment variables.
7. Deploy.

## Clean deployment note

Deploy only this folder as the root. Do not deploy the older root `index.html`, old `public/index.html`, previous ZIP files, backups, or server files. Those older files are the likely cause of the live site showing stale behavior.
