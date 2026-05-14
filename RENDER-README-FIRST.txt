RENDER DEPLOYMENT FOR NAKARU-SAN

Use this package for Render.

Render settings:

Service Type: Web Service
Name: nakaru-live
Runtime: Node
Build Command: npm install
Start Command: npm start
Plan: Free

Environment variables:

HOST=0.0.0.0

This package uses:

src/server.mjs

So Render's start command will find the server even if it expects files under /src.

Optional later:

GOOGLE_API_KEY
GOOGLE_CX
FACEBOOK_CLIENT_ID
FACEBOOK_CLIENT_SECRET
X_CLIENT_ID
X_CLIENT_SECRET
INSTAGRAM_CLIENT_ID
INSTAGRAM_CLIENT_SECRET

After Render deploys, open:

https://nakaru-live.onrender.com

Then connect your IONOS domain to Render using Render's Custom Domains settings.
