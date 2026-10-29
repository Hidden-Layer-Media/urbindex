# Urbindex Immediate Security Fixes

**CRITICAL:** These fixes must be implemented immediately to secure the deployment.

## 🚨 Priority 1: Fix Exposed Firebase API Key

### Step 1: Generate New Firebase API Key
1. Go to [Firebase Console](https://console.firebase.google.com/project/urbindex-d69e1/settings/general)
2. Navigate to Project Settings > General
3. Scroll to "Your apps" section
4. Click on the web app to view configuration
5. Copy the new API key

### Step 2: Remove Exposed Key from Source Code
**Current vulnerable file:** `firebase-config.js`
- The API key `AIzaSyCifqLPnCuvRVZ9hvHIJVBmHkzB5nJyqtc` must be removed immediately

### Step 3: Implement Environment Variables
Replace the hardcoded config with environment variables:

**New secure firebase-config.js:**
```javascript
// Secure Firebase configuration using environment variables
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "urbindex-d69e1.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "urbindex-d69e1",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "urbindex-d69e1.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || ""
};

// Validation
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "") {
    console.error("Firebase API key not configured!");
}
```

### Step 4: Create Environment Files
Create these environment files (add to .gitignore):

**`.env.production`:**
```
REACT_APP_FIREBASE_API_KEY=YOUR_NEW_API_KEY_HERE
REACT_APP_FIREBASE_AUTH_DOMAIN=urbindex-d69e1.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=urbindex-d69e1
REACT_APP_FIREBASE_STORAGE_BUCKET=urbindex-d69e1.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=889914696327
REACT_APP_FIREBASE_APP_ID=1:889914696327:web:351daa656a4d12fa828e22
```

**`.env.local` (for development):**
```
REACT_APP_FIREBASE_API_KEY=YOUR_DEV_API_KEY_HERE
REACT_APP_FIREBASE_AUTH_DOMAIN=urbindex-d69e1.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=urbindex-d69e1
REACT_APP_FIREBASE_STORAGE_BUCKET=urbindex-d69e1.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=889914696327
REACT_APP_FIREBASE_APP_ID=1:889914696327:web:351daa656a4d12fa828e22
```

## 🚨 Priority 2: Secure Deployment Scripts

### Update Firebase Deploy Commands
Remove hardcoded project references from deployment scripts:

**Updated deploy.sh:**
```bash
#!/bin/bash

echo "========================================="
echo "  URBINDEX - Firebase Deployment Script"
echo "========================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check authentication
echo "Checking Firebase authentication..."
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Not authenticated with Firebase."
    echo "Please run: firebase login"
    echo "Then run this script again."
    exit 1
fi

echo ""
echo "✅ Authenticated with Firebase"
echo ""

# Determine project from .firebaserc
PROJECT_ID=$(firebase use --add 2>/dev/null | grep "Default project:" | awk '{print $3}' || echo "urbindex-d69e1")

echo "Deploying to Firebase Hosting..."
echo ""

# Deploy using configured project (no hardcoded project ID)
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "  ✅ Deployment Successful!"
    echo "========================================="
    echo ""
    echo "Your site is now live at:"
    echo "🌐 https://$PROJECT_ID.web.app/"
    echo "🌐 https://$PROJECT_ID.firebaseapp.com/"
    echo ""
else
    echo ""
    echo "========================================="
    echo "  ❌ Deployment Failed"
    echo "========================================="
    echo ""
    echo "Please check the error messages above."
    exit 1
fi
```

### Update QUICK_DEPLOY.sh:
```bash
# In QUICK_DEPLOY.sh, replace:
firebase deploy --only hosting --project urbindex-d69e1

# With:
firebase deploy --only hosting
```

### Update DEPLOY_AND_VERIFY.sh:
```bash
# In DEPLOY_AND_VERIFY.sh, replace:
firebase deploy --only hosting

# With:
firebase deploy --only hosting
```

## 🚨 Priority 3: Add Security Headers

Update `firebase.json` to include additional security headers:

```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      ".history/**",
      "*.md",
      ".env*"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=3600"
          },
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://fonts.googleapis.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com; font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Permissions-Policy",
            "value": "geolocation=*, microphone=*, camera=*"
          }
        ]
      }
    ],
    "cleanUrls": true,
    "trailingSlash": false
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

## 🚨 Priority 4: Update .gitignore

Ensure sensitive files are not committed:

```
# Environment variables
.env
.env.local
.env.production
.env.staging

# Firebase
.firebase/
firebase-debug.log
firestore-debug.log

# API Keys and Secrets
*.key
*.pem
config/secrets.json

# Build outputs
dist/
build/
```

## 🚨 Priority 5: Revoke Old API Key

1. **Immediately** go to Firebase Console
2. Go to Project Settings > General > Your apps
3. Find the web app with the old API key
4. Delete or regenerate the API key
5. Update any other services using this key

## Verification Steps

After implementing fixes:

1. **Test Firebase Connection**
   ```bash
   firebase projects:list
   firebase use urbindex-d69e1
   ```

2. **Verify Environment Variables**
   - Check that `.env` files are not in git history
   - Confirm `.gitignore` includes environment files

3. **Test Deployment**
   ```bash
   npm run build
   npm run deploy
   ```

4. **Security Scan**
   ```bash
   # Check for exposed secrets
   grep -r "AIzaSyCifqLPnCuvRVZ9hvHIJVBmHkzB5nJyqtc" . || echo "API key not found in code"
   ```

## Emergency Contact

If you need immediate assistance:
1. **DO NOT DEPLOY** until all fixes are applied
2. Contact the security team immediately
3. Monitor Firebase usage for anomalies
4. Be prepared to rotate credentials if compromise is detected

## Timeline

- **Now (0-2 hours):** Implement Priority 1 fixes
- **Today (2-8 hours):** Complete all Priority fixes
- **This Week:** Implement additional monitoring and testing

**Critical:** The exposed API key must be rotated immediately to prevent unauthorized access to Firebase resources.