NAKARU-SAN AUTH EMAIL CONFIRMATION PACKAGE
Created: 20260526-201220

This package keeps the current Nakaru-San design and adds/fixes:
- Supabase email/password signup and login only. No fake local-only accounts.
- Confirm password validation on signup.
- Pending verification email state after signup.
- Resend confirmation email button on the login screen.
- Confirmation links return to https://nakaru-san-site-1.onrender.com/ through Supabase Auth redirect settings.
- Logout clears Supabase browser tokens and old local auth session data.
- Profile fields keep focus while typing and save only when Save Profile is clicked.
- Social login buttons stay hidden unless explicitly enabled and configured.

Security note:
Passwords are never stored by the website or emailed to the user. Supabase securely stores account credentials. The browser/password manager can remember passwords if the user allows it.

Render Web Service settings:
Build Command: npm run build
Start Command: npm start
Publish Directory: leave blank
Root Directory: leave blank if package.json is in the repository root

Required environment variables:
VITE_SUPABASE_URL=https://rawpuvxrexgfsrgjtcep.supabase.co
VITE_SUPABASE_ANON_KEY=your Supabase publishable/anon key
VITE_APP_URL=https://nakaru-san-site-1.onrender.com
VITE_SOCIAL_AUTH_PROVIDERS=

Supabase Auth setting needed:
Authentication > URL Configuration should include https://nakaru-san-site-1.onrender.com/ and https://nakaru-san-site-1.onrender.com/* as allowed redirect URLs.
