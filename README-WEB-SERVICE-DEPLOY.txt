NAKARU-SAN RENDER WEB SERVICE DEPLOYMENT

Use this package for Render Web Service hosting.

Render settings:
1. Service type: Web Service
2. Root Directory: leave blank if package.json is at the top of your GitHub repo
3. Runtime: Node
4. Build Command: npm run build
5. Start Command: npm start
6. Publish Directory: leave blank

Environment variables:
VITE_SUPABASE_URL=https://rawpuvxrexgfsrgjtcep.supabase.co
VITE_SUPABASE_ANON_KEY=your Supabase publishable/anon key
VITE_APP_URL=https://nakaru-san-site-1.onrender.com
VITE_INSTAGRAM_AUTH_URL=
VITE_SOCIAL_AUTH_PROVIDERS=

Important:
- Upload the unzipped files to the root of the GitHub repository.
- Do not upload the zip file itself as the only repository file.
- For the existing Render service at https://nakaru-san-site-1.onrender.com/, connect the new GitHub repo or update the existing repo files.
- In Render, use Manual Deploy -> Clear build cache & deploy after changing files.
- The Start Command must be npm start. If Render asks for a Publish Directory, you are in Static Site mode instead of Web Service mode.

Supabase:
- Run supabase/schema.sql in the Supabase SQL Editor after deploying this package.
- The live database already has profiles/posts/direct_messages, but it was missing room_messages and had older column names.
- The updated SQL adds/fixes banner_url, post_type, room_messages, and direct message sender/recipient columns.
- Email/password signup, login, and logout use Supabase Auth only. The frontend does not save passwords or create local-only fake accounts.
- Social login buttons stay hidden unless VITE_SOCIAL_AUTH_PROVIDERS is set, for example google,facebook, and those providers are fully enabled in Supabase Auth.
- For email verification and social login, add these Redirect URLs in Supabase Auth:
  https://nakaru-san-site-1.onrender.com/
  https://nakaru-san.nakaru-san.com/
  https://nakaru-san.com/
