# Changelog

## 2026-05-30 - Homepage merch banner sizing

- Reduced the global Nakaru-San hoodie/merch banner height and changed it into a wide rectangular header-style banner across pages.
- Switched the merch image fit to a cleaner cover crop so it no longer appears as a giant square block.

## 2026-05-30 - Clickable member profiles everywhere

- Added a public member profile view that opens from any user photo/name and shows profile info, friend-request status, message action, and that member's posts.
- Messaging rows now separate profile opening from chat selection, so clicking a member's photo/name opens their profile and clicking Chat opens the conversation.
- User cards, post authors, chat message authors, live room hosts, friend requests, call rows, and the signed-in avatar now link to the relevant profile where a user id is available.
- Public profiles include Add Friend, Respond, Request Sent, Message, or Edit Profile actions based on the current relationship.

## 2026-05-30 - Friend request and messaging reliability fix

- Friend request sending now refreshes request/friendship state, detects existing friends, existing pending requests, and retryable declined requests.
- Accepting a friend request now creates both friendship rows with duplicate-safe Supabase upsert behavior.
- Search results now show friend-request status messages directly on the Search Users page.
- Added a Supabase RLS policy that lets a sender retry a previously declined friend request by changing it back to pending.

## 2026-05-30 - Live room, user search, banner, and no-confirmation auth fix

- Fixed user search rendering by replacing a broken `friendStatus()` reference with the existing relationship-status helper.
- Made Search and GoLive pages publicly reachable while keeping friend requests, messages, calls, and room creation protected behind login.
- Live room directory loading no longer requires the whole signed-in social-data bundle to succeed.
- Creating a live room now refreshes the Supabase session first, creates an active searchable room, clears the live-room search filter, and gives a clearer schema/login error if creation fails.
- Updated live-room RLS so active live rooms are searchable/readable by public visitors while creation and updates remain protected.
- Removed visible email-confirmation/resend UI from the site and updated signup copy for immediate email/password login.
- Improved banner fallback handling and added clearer messages when `profiles.banner_url` or Supabase Storage setup is missing.

## 2026-05-27 - Confirmation email and persistent profile media fix

- Improved signup and resend-confirmation messages so users know to check spam/promotions and configure Supabase SMTP if email does not arrive.
- Added a resend-confirmation form that works even if the pending email was not stored in the browser.
- Added session verification before profile save so unconfirmed or expired sessions get a clear "confirm email / log in again" message.
- Profile picture and banner selections now upload to Supabase Storage when available, then save public URLs into the `profiles` table.
- Profile save now returns the saved Supabase row and keeps display name, username, bio, avatar, and banner persistent after logout/login.
- Navigation clicks now scroll smoothly to the active page content, and the logo sidebar About link opens the homepage About section directly.

## 2026-05-26 - Auth logout and remembered account fix

- Removed the old local-only fake signup/login fallback from the active app.
- Email/password signup, login, and logout now rely on Supabase Auth only.
- Logout now clears Supabase auth tokens, old local auth session data, and protected in-memory account state.
- Protected account pages now send logged-out visitors back to the sign-in screen.
- Social login buttons are hidden unless `VITE_SOCIAL_AUTH_PROVIDERS` is set and the provider is configured in Supabase Auth.
- Fixed profile input typing so fields no longer re-render after each keypress.
- Added confirm-password validation to signup.
- Login/signup now creates a missing Supabase profile row for the authenticated user.
- Background profile refreshes no longer overwrite an actively edited dirty profile form.
- Signup now stores the pending verification email and shows a resend-confirmation-email action.
- Confirmation links use the current public site URL so users return to the deployed app after verifying.

## 2026-05-27 - Auth timeout, messaging nav, requests, and top search

- Added request timeouts around login, logout, profile save, account refresh, and call cleanup so buttons cannot stay stuck on loading forever.
- Added top navigation links for Messaging and Requests.
- Added a top search bar for username/member search.
- Added a dedicated search results page with user cards, Add Friend, Respond, and Message actions.
- Added a Requests page that shows incoming friend requests and outgoing pending requests.
- Added user-driven Google Images and YouTube reference-search buttons that open public search results instead of copying external images into the app.
- Added Supabase tables and RLS policies for friend requests, friendships, conversations, messages, calls, live rooms, and live room invites.
- Added searchable Go Live rooms so a user's live room appears in a live directory and can be joined by room search.
- Added live room friend invites, incoming live invite actions, and internet-based audio/video call controls.
- Added image/video attachments from a user's device for public chatrooms, private rooms, and direct messages.
- Removed the public "some account data could not load" banner by treating friend/message/live-room extras as optional social data loads.

## 2026-05-23 - Production rebuild

- Rebuilt Nakaru-San as a clean Vite + React app.
- Added a polished anime/gaming social platform layout.
- Added profile owner/edit behavior so Save Profile only appears while editing.
- Added profile photo and banner upload controls.
- Added YouTube link posting with embed conversion and feed rendering.
- Added public chatroom pages and room-specific messages.
- Added private room, inbox, DM conversation, GoLive, video preview, and call preview screens.
- Added Supabase Auth, database, storage, and realtime-ready wiring.
- Added `supabase/schema.sql` with RLS policies.
- Added Render, Vercel, and local deployment instructions.
- Removed dependency on old backend paths and stale root/public static files by isolating the new production app in this folder.

## 2026-05-25 - Profile and video posting controls

- Updated YouTube link posting so the form disappears after a successful post.
- Added a clean post-success panel with View Live Feed and Post Another Video Link actions.
- Updated profile editing so Save Profile appears only after the owner makes a change.
- Kept Edit Profile available after saving so the owner can reopen editing later.
- Added remembered email support and browser password-manager friendly auth fields.

## 2026-05-25 - Deployment failure fix

- Added a dependency-free static production app under `static/`.
- Replaced the Vite build command with `node build-static.mjs`.
- Generated deploy output in `dist/` without requiring React, Vite, lucide, or downloaded npm packages.
- Updated Render config to publish `./dist`.
- Kept optional Supabase support through generated `dist/config.js`.

## 2026-05-25 - Video-only post result and auth redirect fix

- After a YouTube video is posted, the video page now hides the link input and post button.
- The video page now leaves only the embedded posted video visible after posting.
- Signup now passes `emailRedirectTo` using the current public site origin so confirmation emails do not default to localhost.
- README now documents the required Supabase Site URL and redirect allowlist settings.

## 2026-05-25 - Social login buttons

- Replaced generic social buttons with Connect with Google, Apple, Facebook, X, and Instagram buttons.
- Google, Apple, Facebook, and X now call Supabase OAuth with the public app redirect URL.
- Instagram now supports a configured external OAuth URL and shows a clean setup message if it is not configured.
- Added `VITE_APP_URL` and `VITE_INSTAGRAM_AUTH_URL` to generated frontend config.

## 2026-05-25 - Safer Render package

- Added root-level static files in addition to `dist/` so the package can work if a host serves the upload root.
- Added `VITE_APP_URL` and `VITE_INSTAGRAM_AUTH_URL` to `render.yaml` env var declarations.
- Normalized Render static publish path to `dist`.

## 2026-05-25 - Black screen startup guard

- Added visible loading fallback HTML so the app never opens to an empty black page.
- Made Supabase client setup defensive so invalid env values cannot crash the whole page.
- Render now happens immediately before Supabase session loading, so auth/network issues cannot block the UI.
- Supabase is retried after page load in case the CDN script loads after the main app.

## 2026-05-25 - Supabase config diagnostics

- Build now accepts both `VITE_SUPABASE_URL` and `SUPABASE_URL`.
- Build now accepts `VITE_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY`, or `SUPABASE_PUBLISHABLE_KEY`.
- Build logs now print whether Supabase URL/key and app URL were detected.
- README now explains checking `/config.js` after Render redeploy.

## 2026-05-25 - Live config banner fix

- Fixed the logged-out homepage so it no longer shows the demo-mode banner just because a visitor is not signed in.
- Added protection against placeholder Supabase values such as `your-project-ref.supabase.co`.
- Live config checks now show a cleaner message when Render is still using placeholder Supabase environment variables.

## 2026-05-25 - Supabase script load order fix

- Fixed the script order so the Supabase browser library loads before `app.js`.
- Removed the public technical warning that said `Supabase library did not load yet`.
- Added a silent retry and a cleaner account-service fallback message.

## 2026-05-25 - Supabase Project URL guard

- Added a config guard for accidentally pasted Supabase dashboard URLs.
- The app now expects `VITE_SUPABASE_URL` to use the real Project URL ending in `.supabase.co`.

## 2026-05-25 - Loading screen fix

- Changed the page so `app.js` no longer waits behind the external Supabase CDN script.
- The site UI now renders first, then retries Supabase connection in the background.
- Demo-mode banner now appears only when Supabase config is actually missing.

## 2026-05-25 - Glossy kanji and hoodie banner

- Added a subtle animated purple kanji background layer behind the app.
- Added a top Nakaru-San hoodie banner under the navigation.
- Added a built-in hoodie fallback visual that can be replaced by uploading `nakaru-hoodies-banner.png`.

## 2026-05-25 - Render Web Service support

- Added `npm start` so Render Web Services can run the app.
- Updated the static server to use Render's `PORT` environment variable.
- Made `/config.js` generate from live Render environment variables at runtime for Web Service deployments.
- Updated `render.yaml` and README for Web Service deployment on `nakaru-san.nakaru-san.com`.

## 2026-05-25 - Hoodie image banner and stronger kanji

- Added the supplied hoodie mockup as `public/nakaru-hoodies-banner.png`.
- Updated the hoodie banner to show the real merch image cleanly without the fallback artwork.
- Increased kanji size, glow, and opacity so the background effect is more noticeable.
- Updated the build so every file in `public/` is copied into `dist/`.

## 2026-05-26 - Render and IONOS compatible package

- Added public Supabase fallback config so the app can work when served from Render or plain IONOS Webspace.
- Updated the Render Web Service server to use the same public fallback if environment variables are missing.
- Build now syncs IONOS-compatible root files from `dist/`.
- README now explains the IONOS DNS-to-Render setup and the IONOS Webspace fallback.

## 2026-05-26 - Bundled Supabase browser library

- Added `supabase.min.js` to the app so account services no longer depend on the external CDN loading in the visitor's browser.
- Updated `index.html` to load the local Supabase library before `app.js`.
- Build now syncs `supabase.min.js` to the root IONOS-compatible files.

## 2026-05-26 - Account diagnostics hardening

- Updated the Web Service server so missing `.js`, `.css`, image, and other asset files do not fall back to `index.html`.
- Added fallback serving from `public/` and the project root for bundled assets such as `supabase.min.js`.
- This prevents browsers from trying to run HTML as JavaScript when an asset path is wrong or a deploy is missing a static file.

## 2026-05-26 - Account warning and redirect fix

- Stale or invalid saved browser sessions are now cleared silently instead of showing a public account-services banner.
- OAuth redirect URLs now prefer the visitor's current domain, which fixes apex-domain use such as `nakaru-san.com`.
- Updated fallback app URL to `https://nakaru-san.com` for direct IONOS hosting.

## 2026-05-26 - Loading screen cache fix

- Added versioned asset URLs for `styles.css`, `config.js`, `supabase.min.js`, and `app.js`.
- Reduced Web Service asset cache time and made `index.html` no-store.
- This prevents old IONOS/Render cached JavaScript from being mixed with the new loading screen HTML.

## 2026-05-26 - Static site rebuild package

- Added a Render Static Site blueprint as `render-static.yaml`.
- README now gives Static Site deployment as the primary Render setup.
- New repository package can be deployed with Build Command `npm run build` and Publish Directory `dist`.

## 2026-05-26 - Self-contained static build

- `dist/index.html` now inlines the CSS, public config, Supabase browser library, and app JavaScript.
- This prevents Render/IONOS from showing only the loading screen when separate asset paths are cached, stale, or uploaded incorrectly.
- Added a startup guard that shows a readable message if a real browser runtime error occurs.

## 2026-05-26 - Render Static Site final package

- Updated `render.yaml` so Render treats the project as a Static Site and publishes `dist`.
- Fixed the Supabase Project URL checker so `.supabase.co` URLs are accepted correctly.
- Added `README-STATIC-DEPLOY.txt` with the exact Render settings for the new repository.
- Verified the self-contained `dist/index.html` boots locally and does not remain on the loading screen.

## 2026-05-26 - Render Web Service package

- Added `render-web-service.yaml` for Render Web Service deployments.
- Added `README-WEB-SERVICE-DEPLOY.txt` with the exact `npm run build` and `npm start` setup.
- Prepared a separate web-service zip for `https://nakaru-san-site-1.onrender.com/`.

## 2026-05-26 - Live diagnostics fixes

- Patched profile saving to avoid duplicate default usernames and to retry if the live database is missing `banner_url`.
- Updated YouTube/text posting to use the live `posts.post_type` field and avoid inserting missing `author`, `likes`, and `comments_count` columns.
- Added Supabase-backed public chatroom sends/loads using `room_messages`.
- Added Supabase-backed direct-message structure using `direct_messages.sender_id` and `recipient_id`.
- Replaced call preview controls with WebRTC video/audio room controls that use Supabase Realtime signaling.
- Updated `supabase/schema.sql` with the missing chat, direct-message, profile, and post schema fixes.
