export const firebaseMethods = {
  async initFirebase() {
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK failed to load. Please check your internet connection and refresh.');
    }
    const config = window.FIREBASE_CONFIG || window.firebaseConfig;
    if (!config) {
      throw new Error('Firebase configuration is missing.');
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
