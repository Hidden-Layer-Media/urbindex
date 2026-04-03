// Environment Variable Loader for Browser
// This script loads environment variables from the .env file into the browser window object
// This is necessary for Firebase configuration to work properly

// Load environment variables into window object
window.FIREBASE_API_KEY = 'AIzaSyCifqLPnCuvRVZ9hvHIJVBmHkzB5nJyqtc';
window.FIREBASE_AUTH_DOMAIN = 'urbindex-d69e1.firebaseapp.com';
window.FIREBASE_PROJECT_ID = 'urbindex-d69e1';
window.FIREBASE_STORAGE_BUCKET = 'urbindex-d69e1.firebasestorage.app';
window.FIREBASE_MESSAGING_SENDER_ID = '123456789';
window.FIREBASE_APP_ID = '1:123456789:web:abcdef123456';

// Cloudinary config — replace with your values from cloudinary.com/console
window.CLOUDINARY_CLOUD_NAME = 'djvremaue';
window.CLOUDINARY_UPLOAD_PRESET = 'preset_1';

console.log('Environment variables loaded successfully');
console.log('Firebase API Key:', window.FIREBASE_API_KEY ? 'Set' : 'Not set');
console.log('Firebase Auth Domain:', window.FIREBASE_AUTH_DOMAIN ? 'Set' : 'Not set');
console.log('Firebase Project ID:', window.FIREBASE_PROJECT_ID ? 'Set' : 'Not set');
console.log('Firebase Storage Bucket:', window.FIREBASE_STORAGE_BUCKET ? 'Set' : 'Not set');
console.log('Firebase Messaging Sender ID:', window.FIREBASE_MESSAGING_SENDER_ID ? 'Set' : 'Not set');
console.log('Firebase App ID:', window.FIREBASE_APP_ID ? 'Set' : 'Not set');