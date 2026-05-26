NAKARU-SAN STATIC SITE DEPLOYMENT

Use this package for a Render Static Site.

Render settings:
1. Service type: Static Site
2. Root Directory: leave blank if package.json is at the top of your GitHub repo
3. Build Command: npm run build
4. Publish Directory: dist
5. Start Command: leave blank

Environment variables:
VITE_SUPABASE_URL=https://rawpuvxrexgfsrgjtcep.supabase.co
VITE_SUPABASE_ANON_KEY=your Supabase publishable/anon key
VITE_APP_URL=https://nakaru-san-official.onrender.com
VITE_SOCIAL_AUTH_PROVIDERS=

If you connect the custom domain, change VITE_APP_URL to the public domain:
VITE_APP_URL=https://nakaru-san.nakaru-san.com

Important:
- Upload the unzipped files to the root of the GitHub repository.
- Do not upload the zip file itself as the only repository file.
- In Render, use Manual Deploy -> Clear build cache & deploy after changing files.
- The deployed /index.html should be about 260 KB. If it is about 898 bytes, Render is still serving the old build.
- Email/password accounts require Supabase Auth. The app no longer creates fake local-only accounts.
- Social login buttons are hidden unless VITE_SOCIAL_AUTH_PROVIDERS is set and the providers are enabled in Supabase Auth.
