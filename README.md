# Playzivora — VPS deployment package

This is the complete, portable VPS edition of your game portal: 124 games, the existing design and thumbnails, an owner admin panel, shared branding settings, individual game URLs, sitemap, SEO controls, and configurable AdSense placement.

**Start with DEPLOY-VPS.md.** The website runs with Node.js 24 and a persistent SQLite database. Docker Compose supplies the application and a Caddy HTTPS reverse proxy. There are no npm runtime dependencies.

This package is for a VPS, not Vercel. Its database needs a persistent disk. Do not deploy it to a serverless filesystem. The previous ChatGPT-hosted site remains unchanged; this copy uses its own admin credentials and starts with default settings. Existing browser favorites remain tied to each browser/domain. Hosted admin settings are not exported here.

## Included

- 96 GamePix games, 20 GameMonetize games, and eight original games.
- Password-protected `/admin` and server-side authorization on admin APIs.
- Shared site name, tagline, description, indexing and ad settings in SQLite.
- Site name changes update visible branding, favicon initial and SEO metadata. Domain changes are separate.
- Game pages, category pages, `/sitemap.xml`, `/robots.txt`, and `/ads.txt`.
- Ad code parser saves only publisher and slot IDs, never arbitrary JavaScript.
- Consent-gated browsing-page display ads; no website ad slots on game pages.
- Sandboxed provider iframes loaded after Play now. Provider ads are preserved.
- Favorites, recent games and original-game scores stored on each player's device.

The admin manages global settings, not game imports. Refresh the catalog using the supplied Python scripts, then rebuild the app.

## Source layout

`web/`: frontend, game engines, provider catalogs and artwork.
`server/app.js`: page rendering and settings API.
`server/http.mjs`: standalone HTTP adapter, password authentication and request limits.
`server/database.mjs`: SQLite adapter and versioned migrations.
`migrations/`: schema changes. Keep applied migration files unchanged.
`scripts/build.mjs`: creates `dist/server/index.js` from the frontend and application source.
`scripts/setup.mjs`: generates credentials and `.env` locally on your server.
`scripts/test.mjs`: HTTP and database persistence tests.

Run `npm test` under Node.js 24. No `npm install` is needed. Build with `npm run build`. For a direct Node deployment, configure `.env`, use `npm start`, and put an HTTPS reverse proxy in front of the default loopback listener. Set `TRUST_PROXY=true` only behind a trusted proxy that overwrites `X-Real-IP`; the supplied Docker configuration does this.

## Game and ad configuration

GamePix attribution remains `sid=5005N`. GameMonetize URLs are the supplied public feed links and contain no account-specific revenue identifier. Confirm provider arrangements in your own accounts; no earnings are promised.

In `/admin`, paste your AdSense responsive display unit, select Extract publisher & slot, enter the Google Privacy & messaging CMP script URL, confirm your domain is public and approved, and enable ads. Your publisher's seller record is appended to `/ads.txt`. Existing provider seller records remain.

Ads and indexing are disabled by default. Consent must resolve before the website requests an ad. Google approval, suitable privacy disclosures, and the provider's own consent mechanisms are separate launch requirements. Sandboxing isolates game content; it does not strip advertising.

## Validation

The included tests exercise the real Node HTTP server: admin login, rejection of forged identity headers, request origin checks, conflicting saves, restart persistence, game/category routes, sitemap, ad validation and placement exclusions, and private-file access rejection. The Docker image and public HTTPS certificate flow require validation on your VPS; Docker is not available in the build workspace.

## Reference documentation

- Node.js SQLite: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- Caddy automatic HTTPS: https://caddyserver.com/docs/automatic-https
- Docker Engine installation: https://docs.docker.com/engine/install/
