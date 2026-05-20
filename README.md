# Urbindex - Urban Exploration Social Networking Website and Forum (to be!)

WELCOME, YE WHO CAST THY FERVENT GAZE UPON MY EXCREMENT DIGITAL- I INVITE YOU TO PARTAKE IN THIS COMMUNION OF NIGHT-CREATURES AND SHADY BEHAVIORS AND FOLKS WHO LIKE TO 'SNEAK AROUND' OR JUST GENERALLY EXPLORE...
YOU HAVE MANAGED TO FIND YOURSELF IN THE YOUNG AND STILL FORMING WORLD OF -URBINDEX-, MY VERY FIRST (AND FINALLY ALMOST FINISHED,, TOTALLY USABLE AS I AM TYPING THIS !!!) SOCIAL WEBSITE PROJECT. 
I CREATED THIS WEBSITE AS A WAY FOR PEOPLE TO SHARE LOCALLY NEAR AND FAR WITH OTHER PEOPLE WHO ENJOY A GOOD SNEAKING AROUND, ETC ETC, AND TO MAKE A MAIN HUB WHERE INFORMATION CONCERNING URBEX IN ONE'S
LOCALE COULD BE AMALGAMATED, GAZED UPON, LEARNED FROM, UTILIZED, AND KEPT FOREVER AND EVER. 

JUST GIVE IT A SHOT, WHY DON'T YA?

THE WEBSITE IS LIVE, IT IS CURRENTLY HOSTED AT https://urbindex-d69e1.web.app/ 

I DO PLAN TO GET A MORE SUITABLE AND LESS ALPHA-PHASE LADEN URL IN THE NEAR FUTURE, BUT UNTIL THEN....

I TRULY DO HOPE THAT YOU ENJOY THIS SOCIAL MEDIUM

EXPLORATION IS SUCH A JOY

PS 

PLEASE FOLLOW THE "LEAVE NO TRACE" PEROGATIVE, AKA 
(ALWAYS. PICK. UP. YOUR. TRASH.) AND ALSO (DONT MAKE A F*CKING MESS PLEASE!!)
THESE ACTIONS RUIN IT. FOR EVERYONE. INCLUDING FUTURE YOU. 
BE GOOD!! 

## Features

### Core
- **Interactive Map** — real-time geotagged location markers synced via Firebase, CartoDB dark tile layer
- **User Authentication** — email/password + anonymous sign-in
- **Location Management** — add, view, edit, delete locations; categories + risk levels
- **PWA / Offline Support** — installable, service worker with tile + Firestore caching
- **Real-time Updates** — live Firestore snapshot listeners on map + activity feed

### Profile
- **Tabbed profile page** — Overview / Spots / Activity / Intel tabs (no more one giant scrolling wall)
- **Customizable fields** — display name, bio, city/region, explorer specialty, gear list, pronouns, external links
- **Photo upload** — upload a profile photo directly from your device (Firebase Storage); no URL pasting required
- **Gallery upload** — multi-image upload for your gallery; remove individual images; all stored in Firebase Storage
- **Field Stats sidebar** — locations, followers, following, likes, visits, badges at a glance

### Social
- **Activity feed** — real-time log of recent location additions across the network
- **Social graph** — follow/unfollow explorers, follower/following counts
- **Direct messages** — private threads between users
- **Intel feed** — per-profile posts + wall comments
- **Groups** — create and join exploration crews

### Map
- **Fast load** — map initializes instantly from cached or locale-based coords; GPS runs in background
- **Cluster markers** — diamond-shaped pins grouped by zoom level, colored by risk level
- **Address geocoding** — find locations by address via Nominatim
- **Map style toggle** — dark, terrain, default tile layers
- **Recenter** — one-click snap to your GPS position

### Discovery
- **Global search** — search locations and users simultaneously
- **Location filters** — filter by category, risk level, tags
- **Forum** — community discussion boards

## Tech Stack

- **Frontend**: Vanilla JS (ES6 modules), CSS3, HTML5
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Maps**: Leaflet.js + CartoDB Dark tiles
- **Build**: Vite + vite-plugin-pwa
- **Icons**: Font Awesome
- **Hosting**: Firebase Hosting

---

**Status**: production
**Live**: https://urbindex-d69e1.web.app/
**Last Updated**: 2026-05-20
