# Nakaru-San Static Site Package

This ZIP is rebuilt for a fresh repository and Render Static Site deployment.

## Render Static Site Settings

Build Command:

```text
npm run build
```

Publish Directory:

```text
dist
```

Start Command:

```text
leave blank
```

## Included Fixes

- Nakaru-San social/community UI
- Profile save/edit behavior
- YouTube video posting
- Hoodie merch banner
- Purple animated kanji background
- Bundled Supabase browser library (`supabase.min.js`)
- Public Supabase config fallback
- Cache-busted assets to prevent loading-screen stale files
- IONOS root-file fallback

## IONOS Direct Upload

If uploading directly to IONOS Webspace, upload these root files:

```text
index.html
app.js
styles.css
config.js
supabase.min.js
nakaru-san-logo.png
nakaru-hoodies-banner.png
```

## Supabase

The included config uses the public publishable key only. Do not put a service-role secret key in browser files.
