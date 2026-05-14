NAKARU-SAN VERCEL UPLOAD SETTINGS

Use this package for Vercel.

In Vercel:
1. Add New Project
2. Import or upload this project
3. Root Directory: leave blank
4. Framework Preset: Other
5. Build Command: leave blank
6. Output Directory: leave blank
7. Install Command: leave blank or npm install

Required Environment Variables:

SUPABASE_URL
Paste your Supabase Project URL here.
Example: https://your-project-ref.supabase.co

SUPABASE_SERVICE_ROLE_KEY
Paste your Supabase secret/service role key here.
Do not put this inside config.js.

Optional Environment Variables:

SUPABASE_BUCKET
Use this only if your upload bucket is not named nakaru-uploads.

GOOGLE_API_KEY
Use this later if you want live Google reference image search.

GOOGLE_CX
Use this later with GOOGLE_API_KEY for Google Custom Search.

APP_BASE_URL
Use your live site URL after deployment.
Use this exact value after the domain is live:
https://nakaru-san.com

Social Login Environment Variables:

Google:
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

Facebook:
FACEBOOK_CLIENT_ID
FACEBOOK_CLIENT_SECRET

Instagram:
INSTAGRAM_CLIENT_ID
INSTAGRAM_CLIENT_SECRET

X/Twitter:
X_CLIENT_ID
X_CLIENT_SECRET

Social login will not work until you create developer apps with those platforms and paste the client IDs/secrets into Vercel.

OAuth callback URLs to add inside each provider:

Google:
https://nakaru-san.com/api/auth/oauth/google/callback

Facebook:
https://nakaru-san.com/api/auth/oauth/facebook/callback

Instagram:
https://nakaru-san.com/api/auth/oauth/instagram/callback

X/Twitter:
https://nakaru-san.com/api/auth/oauth/twitter/callback

Health check:
Open this after deployment:
https://nakaru-san.com/api/status

It will show whether Supabase and social login are configured.

If /api/status says {"error":"Not found"}, Vercel is not using this package.
Create a fresh Vercel project with this ZIP, or make sure the files are at the top level of the project.

After deployment:
Open your Vercel URL.
Test:
- Home feed loads
- Create account
- Add a post
- Paste a YouTube link into a post
- Upload an image
- Open Messages
- Open Calls and allow camera/microphone

If the page says 404, the project was uploaded with the wrong root.
The files index.html, app.js, styles.css, vercel.json, package.json, and the api folder must be at the top level.
