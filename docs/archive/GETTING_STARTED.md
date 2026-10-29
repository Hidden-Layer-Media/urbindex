# Getting Started with Urbindex

This guide will help you set up and run the Urbindex PWA locally.

## Prerequisites

- Node.js and npm installed on your machine
- A modern web browser (Chrome, Firefox, Safari, or Edge) with geolocation support
- Location services enabled (for full location features)
- Basic knowledge of web development and Firebase

## Step 1: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Add a web app to your project:
   - Click on the web icon (</>) on the project overview page
   - Register your app with a nickname (e.g., "Urbindex Web")
   - Copy the Firebase configuration object

4. Enable Authentication:
   - Go to "Authentication" in the Firebase console
   - Click "Get started"
   - Enable the Google sign-in method
   - Add your domain to the authorized domains list (for local testing, you can use localhost)

5. Create Firestore Database:
   - Go to "Firestore Database" in the Firebase console
   - Click "Create database"
   - Start in test mode (you can update security rules later)

6. Update Firebase Configuration:
   - Open `js/config.js` in the project
   - Replace the placeholder configuration with your Firebase configuration

## Step 2: Install Dependencies

Run the following command in the project directory:

```bash
npm install
```

This will install the required dependencies specified in package.json.

## Step 3: Run the App Locally

Run the following command to start a local development server:

```bash
npm start
```

This will start an HTTP server on port 8080. You can access the app at:

```
http://localhost:8080
```

## Step 4: Test Location Features

1. **Enable Location Services**:
   - **Desktop**: Click the location icon in your browser's address bar and allow location access
   - **Mobile**: Ensure location services are enabled in your device settings

2. **Test Location Detection**:
   - Reload the page - the map should center on your actual location
   - Click the "My Location" button to test location detection
   - Try the "Add Location" modal to test address geocoding

3. **Test Address Geocoding**:
   - Open the "Add Location" modal
   - Enter a known address in the address field
   - Click "Find Location" to test geocoding
   - Verify the map centers on the correct location

## Step 5: Test PWA Features

1. Open Chrome DevTools (F12 or Ctrl+Shift+I)
2. Go to the "Application" tab
3. Check "Service Workers" to ensure the service worker is registered
4. Test offline functionality by:
   - Going to the "Network" tab in DevTools
   - Checking "Offline"
   - Refreshing the page (the app should still work)

## Step 6: Add to Home Screen (Mobile)

To test the "Add to Home Screen" functionality:

### On iOS (Safari):
1. Open the app in Safari
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Confirm by tapping "Add"

### On Android (Chrome):
1. Open the app in Chrome
2. Tap the menu button (three dots)
3. Tap "Add to Home Screen"
4. Confirm by tapping "Add"

## Troubleshooting

### Firebase Authentication Issues
- Make sure your Firebase project has Google Authentication enabled
- Check that your domain is in the authorized domains list
- Look for errors in the browser console

### Map Not Loading
- Ensure you have an internet connection for the initial load
- Check browser console for any errors related to Leaflet.js

### Service Worker Not Registering
- Make sure you're using HTTPS or localhost
- Check browser console for service worker registration errors

### Location Services Issues
- **Location Access Denied**:
  - Click the location icon in your browser's address bar
  - Select "Allow" for location access
  - Refresh the page and try again
- **Location Detection Fails**:
  - Ensure location services are enabled on your device
  - Check that you're using HTTPS or localhost
  - Try clicking the "My Location" button to retry
- **Address Geocoding Fails**:
  - Ensure you have a stable internet connection
  - Try with a more specific address format
  - Wait a few seconds between geocoding requests
  - Check browser console for error messages

### Browser Compatibility
- **Chrome**: Fully supported (recommended)
- **Firefox**: Fully supported
- **Safari**: Fully supported
- **Edge**: Fully supported
- **Mobile**: iOS Safari and Android Chrome fully supported

### Performance Issues
- **Slow Location Detection**: Check GPS signal strength
- **Map Loading Slowly**: Verify internet connection
- **Geocoding Errors**: The Nominatim API has rate limits - wait between requests

## Next Steps

1. Create and add icon files to the `images/icons/` directory
2. Customize the app's appearance in `css/styles.css`
3. Deploy to Firebase Hosting for production use
4. Test location features thoroughly before going live
5. Monitor API usage for geocoding services
6. Consider implementing address autocomplete for better UX
