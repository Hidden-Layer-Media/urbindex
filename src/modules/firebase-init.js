export const firebaseMethods = {
  async initFirebase() {
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK failed to load. Please check your internet connection and refresh.');
    }
    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
    if (!config.apiKey) {
      throw new Error('Firebase configuration is missing or incomplete.');
    }
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      this.db      = firebase.firestore();
      this.auth    = firebase.auth();
      this.storage = firebase.storage();
    } catch (error) {
      throw new Error('Failed to initialize Firebase: ' + error.message);
    }
    try {
      await this.db.enablePersistence({ synchronizeTabs: true });
    } catch (err) {
      if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
        console.warn('Persistence error:', err.code);
      }
    }
  },
};
