# 🚀 Urbindex Deployment Guide

## Quick Deployment (3 Steps)

### Step 1: Authenticate with Firebase
```bash
firebase login
```
This will open your browser. Sign in with the Google account that has access to the `urbindex-d69e1` Firebase project.

### Step 2: Deploy to Hosting
```bash
cd /home/user/urbindex
firebase deploy --only hosting
```

### Step 3: Verify
Visit: https://urbindex-d69e1.web.app/

---

## Alternative: Using Firebase Console

If you prefer to deploy via the Firebase Console:

1. Go to: https://console.firebase.google.com/project/urbindex-d69e1/hosting
2. Click on **"Deploy to Firebase Hosting"**
3. Follow the on-screen instructions

---

## Troubleshooting

### "Not authenticated" error
```bash
firebase logout
firebase login
```

### "Permission denied" error
Make sure you're logged in with the correct Google account that owns the Firebase project.

### Check current authentication
```bash
firebase projects:list
```

### Force re-authentication
```bash
firebase login --reauth
```

---

## What Gets Deployed

When you run `firebase deploy --only hosting`, it will deploy:
- `final.html` (your main app)
- `service-worker.js` (offline support)
- `manifest.json` (PWA configuration)
- All files in the root directory except those listed in `.gitignore`

The `firebase.json` file is configured to serve `final.html` for all routes.

---

## Deployment Time

Typically takes 30-60 seconds. You'll see:
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/urbindex-d69e1/overview
Hosting URL: https://urbindex-d69e1.web.app
```

---

## Post-Deployment

After deployment, your site will be live at:
- Primary: https://urbindex-d69e1.web.app/
- Secondary: https://urbindex-d69e1.firebaseapp.com/

Both URLs serve the same content.
