NAKARU-SAN AUTH + PROFILE INPUT FIX PACKAGE
Created: 20260526-191842

This package fixes:
- Profile fields typing one letter at a time.
- Fake/stale signed-in state from old local browser sessions.
- Broken sign out behavior.
- Email/password signup and login using Supabase Auth only.
- Signup now includes confirm password validation.
- Login/signup creates a missing profile row for the authenticated Supabase user.
- Social login buttons stay hidden unless explicitly enabled with VITE_SOCIAL_AUTH_PROVIDERS and configured in Supabase Auth.

Render Web Service settings:
Build Command: npm run build
Start Command: npm start
Publish Directory: leave blank
Root Directory: leave blank if package.json is in the repository root

Render Static Site settings:
Build Command: npm run build
Publish Directory: dist
Start Command: leave blank

Required environment variables:
VITE_SUPABASE_URL=https://rawpuvxrexgfsrgjtcep.supabase.co
VITE_SUPABASE_ANON_KEY=your Supabase publishable/anon key
VITE_APP_URL=https://nakaru-san-site-1.onrender.com
VITE_SOCIAL_AUTH_PROVIDERS=
