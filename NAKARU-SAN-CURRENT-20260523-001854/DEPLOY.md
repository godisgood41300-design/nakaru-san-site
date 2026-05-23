# Deploy Nakaru-san to Render

1. Create a free Render account at https://render.com.
2. Put this project in a GitHub repository.
3. In Render, choose New > Web Service.
4. Connect the GitHub repository.
5. Use these settings:
   - Name: `nakaru-live`
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variable: `HOST=0.0.0.0`
6. Deploy.

Render will give you a free URL like:

`https://nakaru-live.onrender.com`

Notes:
- Camera and microphone require HTTPS. Render provides HTTPS automatically.
- Free Render web services sleep when unused. That is why visitors may briefly see Render's loading page before Nakaru-san opens.
- To avoid the Render loading/wake-up screen, use one of these production options:
  - Upgrade the Render web service to a paid always-on instance.
  - Deploy the frontend as a Render Static Site, Vercel static site, or Netlify static site and keep Supabase as the backend.
- Connect the domain as a real Render Custom Domain/CNAME, not as an iframe or web-forward redirect. A redirect can expose the Render URL or create extra loading.
- For the current custom domain, set `APP_BASE_URL=https://nakarusan.nakarusan.com` in Render. If you use a different final domain, put that exact HTTPS domain in `APP_BASE_URL`.

## Custom Domain Checklist

For a subdomain such as `nakarusan.nakarusan.com`:

1. In Render, open the Nakaru-san service.
2. Go to Settings > Custom Domains.
3. Add `nakarusan.nakarusan.com`.
4. In your DNS provider, create the CNAME value Render gives you, usually pointing to your `*.onrender.com` hostname.
5. Do not use IONOS web forwarding for this subdomain.
6. Wait for Render to show the custom domain as verified and HTTPS ready.
7. Open `https://nakarusan.nakarusan.com/` directly.

## Social Login Environment Variables

Add these in Render under Environment.

Required app URL:

- `APP_BASE_URL=https://nakarusan.nakarusan.com`

Facebook login:

- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- Redirect URI in Meta: `https://nakarusan.nakarusan.com/api/auth/oauth/facebook/callback`

X/Twitter login:

- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- Redirect URI in X developer portal: `https://nakarusan.nakarusan.com/api/auth/oauth/twitter/callback`

Google login:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- Redirect URI in Google Cloud: `https://nakarusan.nakarusan.com/api/auth/oauth/google/callback`

GitHub login:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- Redirect URI in GitHub OAuth App: `https://nakarusan.nakarusan.com/api/auth/oauth/github/callback`
