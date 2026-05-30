# CDO Jeepney Routes

> **Originally created by [jrequiroso](https://github.com/jrequiroso/cdo-jeepney-routes).**
> Huge thanks to them — they built the original app and turned the city's jeepney
> route data into a map anyone can use. This repository is a fork that builds on
> that work; all credit for the original idea and groundwork goes to jrequiroso.

An unofficial, free reference map of Cagayan de Oro's LPTRP jeepney routes, with a
route browser and a simple trip planner. Built with **Nuxt**, **Vue 3**,
**Tailwind CSS v4**, **Leaflet**, and OpenStreetMap tiles.

> ⚠️ This map shows CDO **Local Public Transport Route Plan reference routes**.
> Actual jeepney operations may still follow existing/status-quo routes, and the
> trip planner gives rough geometry-based estimates only. Always verify with
> jeepney signage, drivers, and current local transport advisories.

All route data comes from the
[CDO Local Public Transport Route Plan website](https://sites.google.com/view/cdo-routes-lptrp/home?authuser=0)
and is loaded from the local JSON file at `public/data/routes.json`. There is no
backend, database, auth, or paid API.

## Features

- Browse every route on the map; tap a card to focus a route, or open its full
  details (areas, landmarks, inbound/outbound street lists).
- Search routes by name, area, or street.
- Trip planner: pick start/destination (place dropdown or tap the map), then get
  suggested direct and single-transfer jeepney routes. The search runs in a Web
  Worker so the UI never freezes.
- Light/dark theme, responsive layout (sidebar collapses to a mobile drawer).

## Tech & structure

- **Nuxt** (statically prerendered), **Vue 3** `<script setup>`, **Tailwind v4**
  (utility classes + design tokens), **Leaflet** for the map.
- Package manager: **pnpm**.
- Components follow **Atomic Design**:

  ```text
  assets/quarks/tokens.css   design tokens (Tailwind @theme + dark overrides)
  components/atoms/          IconButton, UiButton, UiSelect, MenuIcon, …
  components/molecules/      RouteCard, BaseModal, EmptyState, SidebarTabs, …
  components/organisms/      RouteSidebar, RouteFinder, MapView, *Modal, …
  components/templates/      AppShell
  pages/index.vue            the page (presentation only)
  composables/               useRouteExplorer.js  (all app state + behaviour)
  lib/geo/                   geometry + route-finding (incl. finder.worker.js)
  types/                     shared TypeScript types
  ```

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Other scripts:

```bash
pnpm build        # production build (what Vercel runs)
pnpm generate     # static prerender into .output/public
pnpm preview      # preview a build locally
pnpm format       # Prettier (write)
pnpm format:check # Prettier (check)
```

## Fonts

UI text uses a **Helvetica** system stack (no file needed). Headings use the
**Barabara** display font, loaded from `public/fonts/Barabara.woff`. Barabara is
licensed for **personal use** — confirm you have the rights before shipping it
publicly. See `public/fonts/README.md`. If the file is missing, headings fall
back to Helvetica automatically.

## Route data

Seed data lives in `public/data/routes.json`. Each route includes metadata,
stops, transfer points, inbound/outbound street descriptions, and the route
geometry drawn by Leaflet.

To regenerate it from raw sources, place files under
`route-sources/<district>/` — one `route-descriptions.txt` per district plus the
matching `.kml` files — then:

```bash
pnpm import:routes:dry   # preview without writing
pnpm import:routes       # regenerate public/data/routes.json
```

The importer (`scripts/import-routes.js`) tolerates loose formatting in
`route-descriptions.txt`, matches descriptions to KML files by normalized route
title, preserves inbound/outbound geometry, and maps states like
`Not Yet Operational` and `ROUTE STRUCTURE FOR CLARIFICATION` into route
`status` values.

## Deploying to Vercel

The project is zero-config on Vercel:

1. Push to GitHub.
2. On Vercel, **import the repository** — it auto-detects Nuxt + pnpm.
3. Defaults are correct (install `pnpm install`, build `pnpm build`). Deploy.

Node is pinned to **22** (`.nvmrc`). Every push to `main` redeploys.

## Contributing

Contributions are welcome — see **[CONTRIBUTING.md](CONTRIBUTING.md)**. Route
data corrections are especially helpful; please open a pull request describing
the source for any change.

## Limitations

- Route geometry is imported from KML and may still need field verification.
- Trip planning uses geometry-based approximations — no timetable, fare,
  traffic, or service-frequency data.
- Suggested transfers are based on route-geometry proximity and should be
  verified with actual jeepney signage and drivers.

## Credits

- Original app by [jrequiroso](https://github.com/jrequiroso/cdo-jeepney-routes).
- This fork (refreshed design + trip planner) by
  [adam-ctrlc](https://github.com/adam-ctrlc/cdo-jeepney-routes).
- Route data: the CDO LPTRP listings (links below). Map tiles: OpenStreetMap.

## References

- https://sites.google.com/view/cdo-routes-lptrp/home?authuser=0
- https://sites.google.com/view/cdo-routes-lptrp/district-1
- https://www.cagayandeoro.gov.ph/index.php/news-and-article/item/2657-local-public-transport-route-plan-to-take-effect-june-3.html
- https://ph.commutetour.com/travel/transport/jeep/cdo-jeep-routes/
