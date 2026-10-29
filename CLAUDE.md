# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Urbindex** — a PWA for urban exploration mapping. Users add geotagged locations to a shared Firestore database, visible as real-time map markers. Stack: vanilla JS ES6 modules, Leaflet + OpenStreetMap tiles (keyless), Firebase (Auth + Firestore), Vite build, deployed to Firebase Hosting.

## Commands

```bash
npm run dev        # dev server at localhost:8080
npm run build      # production build → dist/
npm run preview    # preview built output
npm run deploy     # build + firebase deploy (hosting only)
npm run lint       # ESLint on src/**/*.js (CI fails on errors)
npm run test       # Playwright e2e tests (needs .env with Firebase config, else auth never inits)
```

Deploys: every push to `main` runs `.github/workflows/deploy.yml` (lint → build → `firebase deploy --only hosting,firestore:rules,firestore:indexes`). A separate non-blocking `e2e` job runs Playwright. Auth uses `FIREBASE_SERVICE_ACCOUNT` secret if set, else the deprecated `FIREBASE_TOKEN`. `package-lock.json` must stay committed (`npm ci`).

Firebase SDK is the **compat** build loaded from gstatic in `src/index.html` (currently 12.19.0), not from npm.

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

`dataMethods.loadLocations()` (re-run on every auth state change) subscribes to:
1. `locations` where `status == 'active'` — public pins.
2. `private_locations` where `createdBy == uid` and `status == 'active'` — the signed-in user's own private/followers-only pins.

Both feed `applyLocationChanges()`, which applies `snap.docChanges()` incrementally to the single `markerClusterGroup` (created in `data.js`) and the `this.markers` Map keyed by doc id. `loadActivity()` is a separate limit-10 listener for the sidebar feed.

### Location privacy

Visibility is per-user (`user_settings.locationVisibility`: public / followers / private). **Public docs live in `locations` (world-readable); followers/private docs live in `private_locations` (owner-only in rules).** Use `locationCollection(visibility)`, `getLocationRef(id)` (finds a doc in either collection), `getOwnLocationDocs(uid)` and `setLocationVisibility(doc, v)` (moves docs between collections) in `locations.js` — never query `locations` alone when you mean "my locations". "Followers" is currently treated as owner-only; follower read access isn't implemented.

### Firestore collections

| Collection | Purpose |
|---|---|
| `locations` | Public spots — coordinates, category, riskLevel, status, createdBy |
| `private_locations` | Followers-only / private spots, same schema, owner-only |
| `users` | Profiles — displayName, lastSeen |
| `location_comments` | Comments keyed by locationId |
| `location_likes` | Likes keyed by userId_locationId |
| `location_visits` | Check-ins |
| `user_notifications` | In-app notifications |
| `user_badges` | Earned achievements |
| `routes`, `groups`, `missions` | Gamification, partially stubbed |
| `direct_messages` | Private messaging |

Security rules: `locations` is public read, `private_locations` owner-only; `locations` rejects non-public visibility; all writes are gated on `auth.uid`. Location create/update is validated server-side (coordinate bounds, field presence, name pattern). Rate limiting helper in rules limits profile updates.

### Styles

CSS is split into four files imported in order via `src/main.js`:
`variables.css` → `base.css` → `layout.css` → `components.css`

All color, font, and effect tokens live in `variables.css`. The palette is `--yellow` (#FFD000) primary accent, black backgrounds, monospace everywhere, hard corners (`--radius: 0px`). Legacy `--cz-*` aliases exist for inline JS template strings — don't add new ones, use the canonical vars.

Map-specific Leaflet overrides (popup, tooltip, zoom controls, cluster markers, diamond pin markers) live at the bottom of `components.css`.

### Map markers

Location markers are diamond-shaped divIcons (`.ub-pin`) colored by `riskLevel` via CSS classes (`risk-safe` → `risk-extreme`). They have a CSS pulse ring animation. Cluster markers are styled black/yellow squares that scale to amber/red at medium/large counts. All marker and Leaflet UI CSS is in `components.css` under the `LEAFLET MAP THEME` section.

Tile layers (`map.js:_makeTileLayer`, all keyless): default = OSM, dark = OSM with `.leaflet-layer.tiles-dark` invert filter, terrain = OpenTopoMap. CARTO basemaps now require an API key — don't reintroduce them. OSM tile policy: keep attribution on, no bulk prefetching. A CSS filter on `.leaflet-tile-pane` adds the amber-noir tint.

### PWA / service worker

Vite PWA plugin auto-generates the service worker. Caching strategy: CacheFirst for OSM/OpenTopoMap tiles (500 entries, 7-day TTL), NetworkFirst for Firestore. The manifest theme color is `#FFD000`.

## Current development priorities

### sidelined (do not work on these)
- **gamification** — XP tracking and badge awarding work passively; the missions view, leaderboards, and rewards UI are intentionally deferred. Don't wire up `showMissions()`, don't add nav entries for it.
- **routes / journeys** — the data layer stubs exist; leave them alone. No route editor, no map integration, no nav entry.

### active work: make these functional + polish ui

**photo uploads for locations**
- location schema already has `photos[]` and popup display already renders them
- need: file input in the add/edit location form, client-side resize before storing URL (use Cloudinary or Firebase Storage), populate `data.photos`

**dm inbox**
- firestore layer (`direct_messages`) and message creation exist
- need: inbox view listing conversations, thread view, unread count in nav badge

**groups — fill out the detail view**
- create/join/leave work
- need: group detail page (member list, shared location pins filtered to group, basic group post feed)

**ui polish targets**
- dm / notifications unread badge in the nav
- consistent empty states across all views (locations list, social feed, groups, profile)
- profile gallery: replace the raw URL textarea with a proper file input or URL-per-line input with preview thumbnails
