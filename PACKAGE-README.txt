Nakaru-San package: closed push, QR app download, louder music, dragon upgrade

This clean package contains the current working Nakaru-San web app files for Render/GitHub deployment.

What changed in this package:
- Fixed live/call room separation so room names no longer overwrite WebRTC room ids.
- Added a join-ready WebRTC handshake retry so remote cameras connect more reliably after another user joins.
- Prevented Join Current from entering the old shared/default room; it now requires a selected live room.
- Added more STUN servers for better browser video/audio call connection over Wi-Fi and phone data.
- Added notification chimes while the app is open, plus browser vibration/default sound hints for push notifications.
- Added more pink cherry blossoms and throttled the dragon canvas animation to reduce phone/browser slowdown.
- More realistic purple/black/gold animated dragon background.
- Slightly brighter dark anime UI with a subtle rotating blue starfield.
- Sharp gold NAKARU word rain and separate purple SAN word rain mixed into the kanji rain.
- Pink cherry blossom rain layered softly with the kanji and starfield.
- Direct messages are separated per friend conversation using a stable conversation key.
- Live Feed and Profile pages can now post text, images, and videos from the user's device.
- Original low-volume procedural flute-style ambience can be toggled on by the user; no copyrighted music asset is included.
- In-app notification tray and topbar badge for friend requests, messages, incoming audio calls, incoming video calls, accepted calls, and live room invites.
- Browser/PWA notification permission support plus service-worker push/click handling.
- Render Web Service route for closed-app push notifications after VAPID and Supabase service-role env vars are added.
- Standalone QR code file and /#download-app page for installing Nakaru-San on a phone.
- Like, comment, and share buttons now have real click handlers.
- Supabase schema adds post likes, comment count refresh, and push subscription storage.
- Original procedural anime ambience is louder while still requiring the user to press Music.

Important:
- Run supabase/schema.sql in Supabase SQL Editor before expecting likes, persistent comment counts, and push subscription storage to work.
- True notifications while the app is completely closed require Render Web Service mode plus VAPID keys and SUPABASE_SERVICE_ROLE_KEY.
- Generate VAPID keys with: npm run generate:vapid
- The QR files are: nakaru-san-download-qr.png and nakaru-san-download-qr.svg

Render Static Site:
- Build Command: npm run build
- Publish Directory: dist
- Start Command: leave blank
- Static Site can show the app and QR page, but cannot send closed-app push.

Render Web Service:
- Build Command: npm run build
- Start Command: npm start

Environment variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_APP_URL
- VITE_VAPID_PUBLIC_KEY
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_SUBJECT
- SUPABASE_SERVICE_ROLE_KEY
