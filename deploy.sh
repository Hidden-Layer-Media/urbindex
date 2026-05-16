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
# Use environment variable if set, otherwise use default from .firebaserc
PROJECT_ID=${FIREBASE_PROJECT:-$(firebase target:list 2>/dev/null | grep -o 'urbindex-[a-z0-9]*' | head -1)}

# If still not found, just use the command without flag (uses .firebaserc default)
if [ -z "$PROJECT_ID" ]; then
    echo "Deploying to default project..."
    firebase deploy --only hosting
else
    echo "Deploying to project: $PROJECT_ID"
    firebase deploy --only hosting --project "$PROJECT_ID"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "  ✅ Deployment Successful!"
    echo "========================================="
    echo ""
    echo "Your site is now live at:"
    echo "🌐 https://urbindex-d69e1.web.app/"
    echo "🌐 https://urbindex-d69e1.firebaseapp.com/"
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
