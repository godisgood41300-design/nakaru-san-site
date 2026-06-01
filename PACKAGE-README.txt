Nakaru-San package: notifications, reactions, comments, sharing, dragon polish

This clean package contains the current working Nakaru-San web app files for Render/GitHub deployment.

What changed in this package:
- More realistic purple/black/gold animated dragon background.
- Slightly brighter dark anime UI with a subtle rotating blue starfield.
- Sharp gold NAKARU word rain and separate purple SAN word rain mixed into the kanji rain.
- Pink cherry blossom rain layered softly with the kanji and starfield.
- Direct messages are separated per friend conversation using a stable conversation key.
- Live Feed and Profile pages can now post text, images, and videos from the user's device.
- Original low-volume procedural flute-style ambience can be toggled on by the user; no copyrighted music asset is included.
- In-app notification tray and topbar badge for friend requests, messages, incoming audio calls, incoming video calls, accepted calls, and live room invites.
- Browser/PWA notification permission support plus service-worker push/click handling.
- Like, comment, and share buttons now have real click handlers.
- Supabase schema adds post likes, comment count refresh, and push subscription storage.

Important:
- Run supabase/schema.sql in Supabase SQL Editor before expecting likes, persistent comment counts, and push subscription storage to work.
- True notifications while the app is completely closed require a server-side Web Push sender and VAPID keys. This package stores subscriptions and supports service-worker push, but a static frontend cannot wake a closed device by itself.

Render Static Site:
- Build Command: npm run build
- Publish Directory: dist
- Start Command: leave blank

Render Web Service:
- Build Command: npm run build
- Start Command: npm start

Environment variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_APP_URL
- VITE_VAPID_PUBLIC_KEY optional, only after Web Push server/VAPID setup
