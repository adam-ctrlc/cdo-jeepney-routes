# CDO Jeepney Routes

Free public MVP for a Cagayan de Oro jeepney route map built with Vue 3, Vite, Leaflet, and OpenStreetMap tiles.

All route data is taken from the [CDO Local Public Transport Route Plan website](https://sites.google.com/view/cdo-routes-lptrp/home?authuser=0).

Route data may be incomplete or outdated. Verify with actual jeepney signage, drivers, and current local transport advisories.

Route data is loaded only from the local JSON file in `public/data/routes.json`. Updates should be proposed through GitHub pull requests. The current seed contains Lumbia R3, Lumbia R4, Baikingon, Balulang R1, Balulang R2, Balulang R3, Bayabas R1, Bayabas R2, Bayabas R3, Bayabas R4, Bayabas R5, Bonbon R1, Bonbon R2, and Bonbon R3 routes from user-provided KML/KMZ files and the public CDO LPTRP District 1 listing.

## Local Development

```bash
npm install
npm run dev
```

## Local Production Build

```bash
npm run build
npm run preview
```

## Edit Route Data

Route seed data lives in `public/data/routes.json`.

Each route includes metadata, stops, transfer points, inbound and outbound street descriptions, and a `path` array used by Leaflet. Fetches use `import.meta.env.BASE_URL` so the JSON file works under the GitHub Pages project path.

The first sample routes are `Lumbia R3 - Gran Europa to Carmen Public Market`, `Lumbia R4 - Gran Europa to Cogon Public Market via Taguanao`, `Baikingon - Carmen Public Market`, `Balulang R1 - Centro to Carmen Public Market`, `Balulang R2 - Villa Verde to Cogon Public Market`, `Balulang R3 - Xavier Heights to Cogon Public Market`, `Bayabas R1 - Bayabas to Cogon Public Market`, `Bayabas R2 - Bayabas to Carmen Public Market`, `Bayabas R3 - Bayabas to Carmen Public Market`, `Bayabas R4 - Bayabas to Carmen Public Market`, `Bayabas R5 - Bayabas to Agora Market City and Terminal`, `Bonbon R1 - Bonbon to Cogon Public Market`, `Bonbon R2 - Bonbon to Carmen Public Market`, and `Bonbon R3 - Bonbon to Agora Market City and Terminal`. Add more routes by appending route objects to the JSON array.

## Import Route Data

Raw source files can be placed under `raw_kml/<district>/` with one `route-descriptions.txt` file per district and matching `.kml` files.

Preview an import without changing `routes.json`:

```bash
npm run import:routes:dry
```

Regenerate `public/data/routes.json` from all raw KML and description files:

```bash
npm run import:routes
```

The importer accepts loose formatting in `route-descriptions.txt`, matches descriptions to KML files by normalized route title, preserves inbound and outbound geometry, and maps route states such as `Not Yet Operational` and `ROUTE STRUCTURE FOR CLARIFICATION` into route `status` values.

## GitHub Pages Deployment

1. Push the project to a GitHub repository named `cdo-jeepney-routes`.
2. Go to repository Settings.
3. Go to Pages.
4. Set Build and deployment source to GitHub Actions.
5. Push to `main`.
6. The workflow will build and deploy automatically.

The app is configured for GitHub Pages project-site deployment with:

```js
base: '/cdo-jeepney-routes/'
```

If the repository name changes, update `base` in `vite.config.js`. If using a custom domain later, `base` may need to be changed to `/`.

Do not commit `dist` unless intentionally using manual deployment. The GitHub Actions workflow builds and deploys `dist` automatically.

## Current Limitations

- Seed route data is approximate and unverified.
- Route finder uses simple text matching, not true trip planning.
- Suggested transfers are based on shared transfer point names only.
- No backend, database, auth, or paid APIs are used.

## Public Seed References

- https://sites.google.com/view/cdo-routes-lptrp/home?authuser=0
- https://sites.google.com/view/cdo-routes-lptrp/district-1
- https://www.cagayandeoro.gov.ph/index.php/news-and-article/item/2657-local-public-transport-route-plan-to-take-effect-june-3.html
- https://ph.commutetour.com/travel/transport/jeep/cdo-jeep-routes/
