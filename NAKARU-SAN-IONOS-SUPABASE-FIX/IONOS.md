# Deploy Nakaru-san on IONOS

IONOS Deploy Now/Web Hosting is best for static websites and PHP apps. The Node server is not the easiest fit there, so this package includes a PHP-compatible backend in `ionos-api/`.

## What To Upload

Upload these to your IONOS webspace root:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `nakaru-san-logo.png`
- `ionos-api/`
- `ionos-data/`
- `.htaccess`

The ZIP includes `ionos-htaccess.txt`. Rename it to `.htaccess` after upload if IONOS does not let you upload dotfiles directly.

## IONOS Steps

1. Log into IONOS.
2. Go to Hosting or Webspace.
3. Open File Manager / Webspace Explorer, or connect by SFTP.
4. Upload the files listed above to the domain's document root.
5. Rename `ionos-htaccess.txt` to `.htaccess`.
6. Make sure the `ionos-data` folder is writable.
7. Open your domain.

## Domain

If your domain and hosting are both in the same IONOS account:

1. Go to Domains & SSL.
2. Select your domain.
3. Choose the IONOS hosting/webspace package as the destination.
4. Make sure SSL is enabled.

## Notes

- Public chat and direct messages use Supabase directly from the browser when `config.js` has your Supabase Project URL and publishable key.
- The PHP files remain only as an IONOS-compatible fallback for non-chat API features.
- For a larger public launch, move the JSON storage to IONOS MariaDB to handle more users safely.
- Social sign-in buttons still need OAuth setup with Facebook, X/Twitter, and Instagram developer apps.
