# CDO Jeepney Routes

Free public MVP for a Cagayan de Oro LPTRP jeepney route reference map built with Vue 3, Vite, Leaflet, and OpenStreetMap tiles.

All route data is taken from the [CDO Local Public Transport Route Plan website](https://sites.google.com/view/cdo-routes-lptrp/home?authuser=0).

This map shows CDO Local Public Transport Route Plan reference routes. Actual jeepney operations may still follow existing/status quo routes. Verify with jeepney signage, drivers, and current local transport advisories.

Route data is loaded only from the local JSON file in `public/data/routes.json`. Updates should be proposed through GitHub pull requests. The current dataset is imported from local KML files and route descriptions based on the public CDO LPTRP listings.

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

Each route includes metadata, stops, transfer points, inbound and outbound street descriptions, and route geometry used by Leaflet. Fetches use `import.meta.env.BASE_URL` so the JSON file works under the GitHub Pages project path.

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

- Route geometry is imported from local KML files and may still need field verification.
- Trip planning uses geometry-based approximations, not timetable, fare, traffic, or service-frequency data.
- Suggested transfers are based on route geometry proximity and should be verified with actual jeepney signage and drivers.
- No backend, database, auth, or paid APIs are used.

## Public Seed References

- https://sites.google.com/view/cdo-routes-lptrp/home?authuser=0
- https://sites.google.com/view/cdo-routes-lptrp/district-1
- https://www.cagayandeoro.gov.ph/index.php/news-and-article/item/2657-local-public-transport-route-plan-to-take-effect-june-3.html
- https://ph.commutetour.com/travel/transport/jeep/cdo-jeep-routes/
