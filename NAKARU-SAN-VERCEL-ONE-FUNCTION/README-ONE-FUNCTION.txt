NAKARU-SAN ONE-FUNCTION VERCEL PACKAGE

This package has exactly one API file:
api/[...path].js

That means it is under the Vercel Hobby plan limit.

If Vercel still says more than 12 Serverless Functions, it is not deploying this ZIP.
It is deploying an old project, an old ZIP, or your GitHub repository with the older api folder.

Use this ZIP:
NAKARU-SAN-VERCEL-ONE-FUNCTION.zip

Vercel settings:

Framework Preset:
Other

Root Directory:
leave blank

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

APP_BASE_URL:
https://nakaru-san.com

After deployment, open:
https://nakaru-san.com/api/status
