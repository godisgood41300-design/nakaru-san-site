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
Example: https://nakaru-san.com

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
