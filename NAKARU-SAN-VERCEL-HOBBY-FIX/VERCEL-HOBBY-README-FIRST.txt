NAKARU-SAN VERCEL HOBBY PLAN PACKAGE

This package is made for the Vercel Hobby plan.
It keeps the API folder under the 12 Serverless Function limit.

Upload this ZIP to Vercel:
NAKARU-SAN-VERCEL-HOBBY-FIX.zip

Vercel settings:

Root Directory:
leave blank

Framework Preset:
Other

Build Command:
leave blank

Output Directory:
leave blank

Install Command:
leave blank or npm install

Environment variables:

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
APP_BASE_URL

APP_BASE_URL should be:
https://nakaru-san.com

After deployment, check:
https://nakaru-san.com/api/status

If social login says configured false, that is expected until you add each platform's developer keys.
