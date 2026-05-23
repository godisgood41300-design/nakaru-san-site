# Deploy Nakaru-san to Vercel

Upload this folder to Vercel as a project.

Use:

- Framework Preset: Other
- Build Command: `npm install`
- Output Directory: `public`

The static website is served from the `public/` folder.

The backend has been converted to Vercel serverless functions under `/api`.

## Environment Variables

Add these in Vercel Project Settings > Environment Variables when you have them:

- `APP_BASE_URL=https://your-vercel-url.vercel.app`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY` can be used instead of `SUPABASE_SERVICE_ROLE_KEY` if your Supabase dashboard shows the newer secret key format.
- `SUPABASE_BUCKET=nakaru-uploads`
- `GOOGLE_API_KEY`
- `GOOGLE_CX`
- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `INSTAGRAM_CLIENT_ID`
- `INSTAGRAM_CLIENT_SECRET`

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Paste and run `supabase-schema.sql`.
4. Go to Project Settings > API.
5. Copy the Project URL into `SUPABASE_URL`.
6. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`.
7. Add `SUPABASE_BUCKET=nakaru-uploads`.

The service role key is secret. Only put it in Vercel Environment Variables. Do not paste it into frontend files.

## Important Production Note

When Supabase variables are present, accounts, posts, public messages, DMs, and uploaded post images are persistent. Presence and call signaling still use short-lived serverless memory and should later move to a realtime service such as Supabase Realtime, Ably, Pusher, LiveKit, or a dedicated WebSocket server.
