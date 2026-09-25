# Deploy on your VPS

## 1. Prepare the VPS and domain

Use a Linux VPS with Docker Engine and the Docker Compose plugin installed. This guide assumes a VPS on which ports 80 and 443 are available. If another website already uses those ports, integrate this app into your existing reverse proxy instead of starting the supplied Caddy container on those ports.

Point the domain's A record to the VPS public IPv4 address. Only add an AAAA record if the VPS has working public IPv6. Allow inbound TCP ports 80 and 443 in the VPS/provider firewall. Keep SSH access available. Do not expose application port 3000 publicly.

Upload and unzip `playzivora-vps.zip`, then enter its folder:

```bash
unzip playzivora-vps.zip
cd playzivora-vps
```

## 2. Generate your admin credentials

Run this from the extracted folder. It uses Docker, so you do not need Node installed on the host:

```bash
docker run --rm -it -v "$PWD:/app" -w /app node:24-bookworm-slim node scripts/setup.mjs
```

Enter your domain when asked, for example `games.example.com`. The setup writes `.env` and displays a randomly generated admin password once. Save it in a password manager. The username is `admin`. A salted password hash is stored in `.env`; the original password is not stored.

Do not share or upload `.env`. The archive contains no live passwords or account secrets. If setup was run using privileged Docker, its `.env` file may be owned by root; use the same privilege level for Compose, or adjust ownership to your deployment user while keeping its permissions restricted.

## 3. Build and start

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=80 app caddy
```

The app applies its schema migration at startup and stores settings in the `site_data` named volume. Caddy requests and renews an HTTPS certificate once DNS points to this VPS and the required ports are reachable.

Visit `https://YOUR-DOMAIN/`, then `https://YOUR-DOMAIN/admin`. Your browser will show a username/password prompt for admin access. Use the credentials from setup. Public visitors can browse and play without logging in.

## 4. Set up the site

In admin:

1. Set the site name, tagline and search description, then save.
2. Check the home page and several games, including one GamePix and one GameMonetize game.
3. Enable indexing when ready to launch. Submit `https://YOUR-DOMAIN/sitemap.xml` in Google Search Console after verifying domain ownership.
4. Configure AdSense only after domain approval and consent setup. Ads remain off until configured.

Check `/robots.txt`, `/sitemap.xml`, and `/ads.txt`. The site name setting does not change your domain. To change domains, update `DOMAIN` and `PUBLIC_ORIGIN` in `.env`, update DNS, and recreate the services with `docker compose up -d`.

## 5. Updates and backups

After editing source or refreshing a feed:

```bash
docker compose up -d --build
```

Settings survive container rebuilds because they are in the named volume. **Do not run `docker compose down -v`** unless you intend to delete the database and certificate volumes.

Back up the complete database directory while the application is stopped:

```bash
mkdir -p backups
docker compose stop app
docker compose cp app:/app/data ./backups/site-data
docker compose start app
```

Use a new backup destination for each snapshot. Also keep an encrypted backup of `.env`, and copy backups off the VPS. To restore, stop the application, restore the complete directory to its data volume, ensure the files are writable by UID/GID 1000, then start the application. Avoid copying a live SQLite database without its associated WAL files.

To rotate a forgotten admin password, securely back up the existing `.env`, remove that local file, and rerun setup with the same domain. Then run `docker compose up -d` to recreate the app with its new credentials. This does not remove the database volume. Browser Basic Authentication credentials may remain cached until you close the browser session; use a private browser window on shared devices.

## Troubleshooting

- **HTTPS does not appear:** verify DNS, firewall rules, and that no other service is occupying ports 80/443. Check Caddy logs.
- **App unhealthy:** check app logs; verify `.env` exists and setup generated a valid hash. Do not use the placeholder hash from `.env.example`.
- **Admin save rejected:** `PUBLIC_ORIGIN` must exactly match your browser's origin, including `https://`, with no trailing slash. Use your configured domain, not the VPS IP.
- **Login temporarily blocked:** after repeated failed attempts the server limits that client for 15 minutes.
- **No website ads:** verify publisher/slot IDs, domain approval, consent message, consent choice, and browser ad blocking. A missing consent result deliberately keeps ads off.
- **Some game embeds fail:** provider availability or domain restrictions may apply. Confirm your new domain with the provider; the portal cannot bypass those restrictions.

## Vercel

This download is intentionally the VPS edition. Vercel needs a separate external database and a serverless adapter; do not upload this SQLite/Docker package to Vercel and expect persistent settings.
