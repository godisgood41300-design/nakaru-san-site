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
- Supabase Auth support
- Supabase database/storage/realtime-ready schema
- Demo mode with local browser storage when Supabase env variables are not set

## Features that are fully working in this build

- Static app navigation between all requested sections
- Email signup/sign-in through Supabase when env variables are configured
- Google/GitHub/Facebook OAuth button wiring through Supabase Auth
- Local demo fallback when Supabase is not configured
- Profile editing and save state
- Avatar/banner file selection
- Text post composer
- YouTube URL validation and embed conversion
- Feed rendering
- Public room message sending
- Messenger-style inbox UI
- Camera/microphone permission preview for GoLive/call pages

## Features scaffolded for the next production step

- True multi-user WebRTC calls and livestreaming need deployed signaling through Supabase Realtime or a WebRTC provider.
- Private room membership enforcement is represented in UI and schema, but needs invite management screens.
- Likes/comments UI is present; full persistence can be added using the included comments table.
- Search UI is present; database-backed search can be added with Supabase queries.

## Environment variables

Create `.env` from `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_APP_URL=https://your-domain.com
VITE_INSTAGRAM_AUTH_URL=
```

Use the Supabase anon/publishable key only. Never put the service role secret key in frontend env variables.

## Supabase setup

1. Open Supabase.
2. Go to SQL Editor.
3. Paste and run `supabase/schema.sql`.
4. Go to Authentication > URL Configuration.
5. Set Site URL to your live domain, for example `https://nakaru-san.nakaru-san.com`.
6. Add redirect URLs for your live domain, for example `https://nakaru-san.nakaru-san.com/*`.
7. If you also use the apex domain, add it too, for example `https://nakaru-san.com/*`.
8. Remove any old localhost-only URL if Supabase keeps sending confirmation links there.
9. Enable any OAuth providers you want to use under Authentication > Providers.

The signup code now sends `emailRedirectTo: window.location.origin`, so new confirmation emails should return to the exact public site the user signed up from. If an old email still points to localhost, sign up again or resend confirmation after updating Supabase URL Configuration.

For OAuth:

- Google requires a Google OAuth client id/secret in Supabase.
- Apple requires an Apple Services ID and secret in Supabase.
- Facebook requires a Facebook app id/secret in Supabase.
- X/Twitter requires an X OAuth client id/secret in Supabase.
- Instagram is not a built-in Supabase OAuth provider. If you create a custom Instagram/Meta OAuth endpoint, put its public authorization URL in `VITE_INSTAGRAM_AUTH_URL`. Without that value, the Instagram button shows a setup message instead of failing with "Unknown OAuth provider."

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

## Deploy on Render as a static site

This is the best Render setup if you want to avoid server sleep/wake delays:

1. Create a new Render Static Site.
2. Connect the GitHub repo containing this folder.
3. Set Root Directory to `nakaru-san-production-app`.
4. Build Command: `npm run build`
5. Publish Directory: `dist`
6. Add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables.
7. Deploy.
8. Add your custom domain in Render and point DNS to Render's static-site target.

If you deploy as a Render Web Service instead of Static Site, the free service can sleep. Static Site avoids that problem.

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
