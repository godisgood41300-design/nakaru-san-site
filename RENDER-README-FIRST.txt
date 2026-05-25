RENDER DEPLOYMENT FOR NAKARU-SAN

Use this package for Render.

Render settings:

Service Type: Web Service
Name: nakaru-live
Runtime: Node
Build Command: npm install
Start Command: npm start
Plan: Free for testing, paid/always-on for production

Environment variables:

HOST=0.0.0.0
APP_BASE_URL=https://nakarusan.nakarusan.com

Optional later:

GOOGLE_API_KEY
GOOGLE_CX
FACEBOOK_CLIENT_ID
FACEBOOK_CLIENT_SECRET
X_CLIENT_ID
X_CLIENT_SECRET
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET

After Render deploys, open:

https://nakaru-live.onrender.com

Then connect your IONOS domain to Render using Render's Custom Domains settings.

IMPORTANT DOMAIN NOTE

Free Render web services sleep when unused. During wake-up, visitors can briefly see a Render loading screen. That is Render hosting behavior, not a Nakaru-san frontend bug.

To avoid the Render loading screen on nakarusan.nakarusan.com:

1. Best app-server option: upgrade the Render service to an always-on paid instance.
2. Best static option: deploy the frontend as a Render Static Site, Vercel static site, or Netlify static site, and use Supabase for auth, profiles, posts, and chat.
3. DNS should be a direct CNAME/custom domain connection to Render. Do not use IONOS web forwarding or iframe forwarding.

Custom domain target:

https://nakarusan.nakarusan.com
