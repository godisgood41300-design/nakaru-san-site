# Changelog

## Clean corrected public build

- Packaged only the corrected Nakaru-San Render app files.
- Confirmed root/public duplicates in the workspace matched, then excluded `public/` from this ZIP to avoid duplicate-file confusion.
- Excluded historical packages and stale deployment folders.
- Kept Supabase schema and policy SQL for database setup/reference.
- Updated Render plan guidance for public always-on hosting.
- Included deployment notes for custom-domain setup and cache-cleared redeploys.
