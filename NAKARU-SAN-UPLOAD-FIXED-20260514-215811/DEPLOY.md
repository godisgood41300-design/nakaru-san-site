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
- Free Render services may sleep when unused, so the first visit can take a moment to wake up.

## Social Login Environment Variables

Add these in Render under Environment.

Required app URL:

- `APP_BASE_URL=https://nakaru-live.onrender.com`

Facebook login:

- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- Redirect URI in Meta: `https://nakaru-live.onrender.com/api/auth/oauth/facebook/callback`

X/Twitter login:

- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- Redirect URI in X developer portal: `https://nakaru-live.onrender.com/api/auth/oauth/twitter/callback`

Instagram connection:

- `INSTAGRAM_CLIENT_ID`
- `INSTAGRAM_CLIENT_SECRET`
- Redirect URI in Meta/Instagram: `https://nakaru-live.onrender.com/api/auth/oauth/instagram/callback`

Instagram's public API is usually a profile/media connection flow rather than a full identity login product. Facebook and X are the better true sign-in providers.
