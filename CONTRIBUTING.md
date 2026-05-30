# Contributing

Thanks for helping improve **CDO Jeepney Routes**! This is a community reference
map, so accuracy and clarity matter most. The two most useful contributions are
**route-data corrections** and **bug fixes / UX improvements**.

## Getting started

Prerequisites: **Node 20+** (the repo pins **22** via `.nvmrc`) and **pnpm**.

```bash
git clone https://github.com/adam-ctrlc/cdo-jeepney-routes.git
cd cdo-jeepney-routes
pnpm install
pnpm dev          # http://localhost:3000
```

Before opening a PR:

```bash
pnpm format       # apply Prettier
pnpm build        # make sure it builds
```

## Project conventions

- **Vue 3 `<script setup>`** for every component.
- **Atomic Design** — put new components in the right folder
  (`atoms` → `molecules` → `organisms` → `templates`), and only import
  "downward" (an atom must not import a molecule). Components are auto-imported
  by Nuxt; reference them by bare filename.
- **Styling is Tailwind v4 utilities.** Use the design tokens
  (`bg-surface`, `text-muted`, `text-accent`, `border-border`, …) from
  `assets/quarks/tokens.css` so light/dark mode keeps working — avoid hard-coded
  colors where a token exists. The only hand-written CSS is the Leaflet glue in
  `assets/css/tailwind.css`.
- **No business logic in the page.** App state and behaviour live in
  `composables/useRouteExplorer.js`; `pages/index.vue` only wires data into
  components.
- **Geometry / route-finding** lives in `lib/geo/*`. The finder runs in
  `lib/geo/finder.worker.js`; keep it dependency-free of Vue/Nuxt.
- **Formatting** is enforced by Prettier (`.prettierrc.json`). Run `pnpm format`.
- Prefer **reusing** existing pieces (`BaseModal`, `UiButton`, `UiSelect`,
  `EmptyState`, `IconButton`) over new one-offs.

## Updating route data

Route data is **not** hand-edited in `public/data/routes.json` directly. Instead:

1. Add or fix the source files under `route-sources/<district>/`
   (a `route-descriptions.txt` and matching `.kml` files).
2. Preview, then regenerate:

   ```bash
   pnpm import:routes:dry
   pnpm import:routes
   ```

3. Commit both the source change and the regenerated `routes.json`.

Always cite the source of a data change in your PR (e.g. the official CDO LPTRP
listing). Remember this is **reference** data — actual operations may differ.

## Commits & pull requests

- Keep commits focused; write a clear, present-tense summary line.
- One topic per PR. Describe **what** changed and **why**, and include
  before/after screenshots for visual changes.
- Make sure `pnpm build` passes and `pnpm format:check` is clean.
- Be kind and constructive in reviews. 🙂

## Reporting issues

Open a GitHub issue with steps to reproduce, what you expected, what happened,
and your device/browser. For data problems, name the route(s) and link the
source you're checking against.
