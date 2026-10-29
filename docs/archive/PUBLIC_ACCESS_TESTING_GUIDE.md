# Testing Guide: Public Access to Content

This guide will help you test the changes we've made to allow users to view Urbindex content without logging in.

## Prerequisites

1. Make sure Firebase is properly configured with the updated security rules
2. The app is running with the latest changes (including public-access.js)
3. Access to both a logged-in and logged-out state for comparison testing

## Testing Procedure

### 1. Test Firebase Security Rules

#### Firestore Rules Testing

1. **Open browser developer tools** (F12 or Right-click → Inspect)
2. **Clear all local storage and cookies** to ensure a fresh unauthenticated state
    - In Chrome: Application tab → Storage → Clear site data
3. **Refresh the page** to ensure you're in a logged-out state
4. **Open the Console tab** in developer tools to monitor for permission errors
5. **Navigate to the Locations page** by clicking on the "Locations" tab
    - You should see locations load without permission errors
    - If you see "Permission denied" errors in the console, the Firestore rules are not properly applied

#### Storage Rules Testing

1. While still logged out, look for pages showing images (like profile photos or location images)
2. Check if images load properly without authentication errors
3. Monitor the Console for any Storage permission errors
    - Look for messages like "Firebase Storage: User does not have permission to access..."

### 2. Test UI Modifications

#### Map View

1. When logged out, the map should:
   - Load properly and display location markers
   - Allow clicking on markers to view location details
   - Show a login prompt when trying to add a new location

#### Social Feed

1. Navigate to the Social tab when logged out
2. Verify:
   - Social posts are visible without requiring login
   - A login prompt appears but doesn't block viewing content
   - Interactive features (like, comment, post) properly prompt for login

#### Locations View

1. Navigate to the Locations tab when logged out
2. Verify:
   - Location listings appear and are browsable
   - Location details can be viewed
   - Adding locations prompts for login

#### Profile View

1. Navigate to the Profile tab when logged out
2. Verify:
   - A guest view appears with information about signing in
   - No sensitive user data appears
   - Login options are prominently displayed

#### Missions View

1. Navigate to the Missions tab when logged out
2. Verify:
   - Available missions are visible
   - Mission details can be viewed
   - Starting or tracking missions prompts for login

### 3. Interactive Feature Testing

Test that these actions properly prompt for login when unauthenticated:

1. Adding a new location
2. Posting to the social feed
3. Liking or commenting
4. Starting a mission
5. Creating a route
6. Accessing settings

### 4. Compare Authenticated vs. Unauthenticated Experience

1. Log in to the app
2. Verify that all features work as expected when authenticated
3. Log out and verify the differences align with expectations:
   - Content is visible
   - Interactive features prompt for login
   - No permission errors appear

### 5. Edge Cases to Check

1. **Session Expiration**: If a user's session expires mid-use, ensure content remains visible
2. **Deep Linking**: Test direct links to content pages to ensure they work for unauthenticated users
3. **Refresh Behavior**: Make sure page refreshes maintain the correct public/private access behavior

## Reporting Issues

If you encounter any problems during testing:

1. Check the browser console for specific error messages
2. Note which page or feature has the issue
3. Document the steps to reproduce the problem
4. Check if the issue occurs when authenticated, unauthenticated, or both

## Expected Results

When properly implemented, a user should be able to:

- View the map and its markers
- Browse locations and their details
- View social feed posts
- See available missions
- View public profiles

But they will be prompted to sign in for interactive features like:

- Adding content
- Liking/commenting
- Tracking mission progress
- Creating routes
- Editing profiles