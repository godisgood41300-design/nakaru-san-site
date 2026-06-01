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
VITE_VAPID_PUBLIC_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
SUPABASE_SERVICE_ROLE_KEY=

Important:
- Upload the unzipped files to the root of the GitHub repository.
- Do not upload the zip file itself as the only repository file.
- For the existing Render service at https://nakaru-san-site-1.onrender.com/, connect the new GitHub repo or update the existing repo files.
- In Render, use Manual Deploy -> Clear build cache & deploy after changing files.
- The Start Command must be npm start. If Render asks for a Publish Directory, you are in Static Site mode instead of Web Service mode.
- Nakaru-San is now installable as a phone app/PWA. After deployment, iPhone users install from Safari Share -> Add to Home Screen. Android users install from Chrome menu -> Install app. The sidebar Install App button also helps where browser install prompts are supported.
- The sidebar Enable Notifications button turns on browser/PWA notifications for messages, friend requests, incoming audio/video calls, and live invites. Closed-app push works from Web Service mode after you add the VAPID keys and SUPABASE_SERVICE_ROLE_KEY above.
- Generate VAPID keys with: npm run generate:vapid
- The public QR/app install page is available at /#download-app, and the standalone QR images are nakaru-san-download-qr.png and nakaru-san-download-qr.svg.

Supabase:
- Run supabase/schema.sql in the Supabase SQL Editor after deploying this package.
- The updated SQL adds/fixes profile media, posts, room messages, friend requests, friendships, direct messages, calls, live rooms, live room invites, storage policies, and Realtime publication entries.
- Friend requests, messaging, call notifications, and searchable live rooms depend on the latest supabase/schema.sql policies being installed.
- Audio/video calls use browser WebRTC with Supabase Realtime signaling. They work over Wi-Fi or phone data in supported browsers; some strict networks may still need a TURN or LiveKit/Daily-style relay service for guaranteed production calling.
- Email/password signup, login, and logout use Supabase Auth only. The frontend does not save passwords or create local-only fake accounts.
- Social login buttons stay hidden unless VITE_SOCIAL_AUTH_PROVIDERS is set, for example google,facebook, and those providers are fully enabled in Supabase Auth.
- For email verification and social login, add these Redirect URLs in Supabase Auth:
  https://nakaru-san-site-1.onrender.com/
  https://nakaru-san.nakaru-san.com/
  https://nakaru-san.com/
