NAKARU-SAN CLEAN SOCIAL/LIVE/CALL FIX PACKAGE

What this package contains:
- Current Nakaru-San web-service/static-site files only.
- Updated friend request, messaging, live-room, and WebRTC call code.
- Updated Supabase schema in supabase/schema.sql.
- Render deployment instructions in README-WEB-SERVICE-DEPLOY.txt.

Do not upload old dated folders or old zip files with this package. Upload the files inside this folder to the root of your GitHub repo, then deploy on Render.

Required Render Web Service settings:
Build Command: npm run build
Start Command: npm start

Important Supabase step:
Run supabase/schema.sql in Supabase SQL Editor after deployment so friend requests, friendships, messages, calls, live rooms, invites, storage policies, and realtime publication rules exist.
