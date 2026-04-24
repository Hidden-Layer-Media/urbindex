# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Urbindex** — a PWA for urban exploration mapping. Users add geotagged locations to a shared Firestore database, visible as real-time map markers. Stack: vanilla JS ES6 modules, Leaflet + CartoDB Dark tiles, Firebase (Auth + Firestore), Vite build, deployed to Firebase Hosting.

## Commands

```bash
npm run dev        # dev server at localhost:8080
npm run build      # production build → dist/
npm run preview    # preview built output
npm run deploy     # build + firebase deploy (hosting only)
npm run lint       # ESLint on src/**/*.js
npm run test       # Playwright e2e tests
```

Single e2e test file:
```bash
npx playwright test tests/e2e/smoke.spec.js
```

Unit/integration tests use Mocha + Chai:
```bash
npx mocha tests/database_operations_test.js
```

## Architecture

### Module composition

`src/app.js` defines `UrbindexApp` as a class, then uses `Object.assign()` to mix in all feature modules onto the prototype:

```js
Object.assign(UrbindexApp.prototype,
  utilsMethods, firebaseMethods, mapMethods, uiMethods,
  authMethods, locationsMethods, socialMethods, profileMethods,
  dataMethods, settingsMethods
);
```

All modules export a plain object of methods. They share `this` at runtime — any method can call `this.showToast()`, `this.map`, `this.db`, `this.currentUser`, etc. There is one global `app` instance exposed on `window`.

**Init order** (`app.init()`): Firebase → Map → UI → Auth → TagSystem → SessionManagement → RateLimiting → `loadData()`

### Real-time data flow

`dataMethods.loadData()` sets up two persistent `onSnapshot` listeners:

1. **`loadLocations()`** — `locations` collection filtered by `status == 'active'`, ordered by `createdAt desc`. On every snapshot it clears `markerClusterGroup`, rebuilds `this.markers` Map, and re-adds all markers. This is the source of truth for map pins.
2. **`loadActivity()`** — same collection, limit 10, feeds the activity feed sidebar.

`loadStats()` is a one-time fetch.

### Known dual cluster group conflict

`map.js:initializeMap()` creates `this.markerClusterGroup` (maxClusterRadius: 60) and adds it to the map. `data.js:loadLocations()` then overwrites `this.markerClusterGroup` with a new instance (maxClusterRadius: 50, chunkedLoading, spiderfyOnMaxZoom, etc.) and adds *that* to the map — leaving the first one orphaned on the Leaflet instance. Any fix must consolidate cluster creation to one place.

Additionally, `map.js:updateMapMarkers()` (called from `locations.js:renderFilteredLocations()`) calls `markerClusterGroup.clearLayers()` and repopulates with only the current user's filtered locations, wiping the full dataset from `loadLocations()` until the next snapshot fires.

### Firestore collections

| Collection | Purpose |
|---|---|
| `locations` | Main content — coordinates, category, riskLevel, status, createdBy |
| `users` | Profiles — displayName, lastSeen |
| `location_comments` | Comments keyed by locationId |
| `location_likes` | Likes keyed by userId_locationId |
| `location_visits` | Check-ins |
| `user_notifications` | In-app notifications |
| `user_badges` | Earned achievements |
| `routes`, `groups`, `missions` | Gamification, partially stubbed |
| `direct_messages` | Private messaging |

Security rules: locations and users are public read; all writes are gated on `auth.uid`. Location create/update is validated server-side (coordinate bounds, field presence, name pattern). Rate limiting helper in rules limits profile updates.

### Styles

CSS is split into four files imported in order via `src/main.js`:
`variables.css` → `base.css` → `layout.css` → `components.css`

All color, font, and effect tokens live in `variables.css`. The palette is `--yellow` (#FFD000) primary accent, black backgrounds, monospace everywhere, hard corners (`--radius: 0px`). Legacy `--cz-*` aliases exist for inline JS template strings — don't add new ones, use the canonical vars.

Map-specific Leaflet overrides (popup, tooltip, zoom controls, cluster markers, diamond pin markers) live at the bottom of `components.css`.

### Map markers

Location markers are diamond-shaped divIcons (`.ub-pin`) colored by `riskLevel` via CSS classes (`risk-safe` → `risk-extreme`). They have a CSS pulse ring animation. Cluster markers are styled black/yellow squares that scale to amber/red at medium/large counts. All marker and Leaflet UI CSS is in `components.css` under the `LEAFLET MAP THEME` section.

Tile layer: CartoDB DarkMatter (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`), with a CSS filter on `.leaflet-tile-pane` for the amber-noir tint.

### PWA / service worker

Vite PWA plugin auto-generates the service worker. Caching strategy: CacheFirst for OSM/CARTO tiles (200 entries, 7-day TTL), NetworkFirst for Firestore. The manifest theme color is `#FFD000`.
