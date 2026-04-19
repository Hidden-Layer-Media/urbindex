import { utilsMethods } from './modules/utils.js';
import { firebaseMethods } from './modules/firebase-init.js';
import { mapMethods } from './modules/map.js';
import { uiMethods } from './modules/ui.js';
import { authMethods } from './modules/auth.js';
import { locationsMethods } from './modules/locations.js';
import { socialMethods } from './modules/social.js';
import { profileMethods } from './modules/profile.js';
import { dataMethods } from './modules/data.js';
import { settingsMethods } from './modules/settings.js';

class UrbindexApp {
  constructor() {
    this.map = null;
    this.markers = new Map();
    this.markerClusterGroup = null;
    this.currentUser = null;
    this.selectedLatLng = null;
    this.tempMarker = null;
    this.allUserLocations = [];
    this.activeOperations = new Set();
    this.socialFeedItems = [];
    this.sessionTimeout = 60 * 60 * 1000;
    this.warningTime = 5 * 60 * 1000;
    this.lastActivity = Date.now();
    this.sessionWarningTimer = null;
    this.sessionCountdownTimer = null;
    this.sessionRefreshTimer = null;
    this.unreadNotifications = 0;
    this.selectedTags = new Set();
    this.predefinedTags = [];
    this.authAttempts = new Map();
    this.maxAttempts = 5;
    this.attemptWindow = 15 * 60 * 1000;
  }

  async init() {
    try {
      await this.initFirebase();
      this.initMap();
      this.initUI();
      this.initAuth();
      this.initTagSystem();
      this.initSessionManagement();
      this.initRateLimiting();
      this.loadData();

      setTimeout(() => {
        const ls = document.getElementById('loading-screen');
        if (ls) { ls.style.opacity = '0'; ls.style.pointerEvents = 'none'; setTimeout(() => ls.classList.add('hidden'), 500); }
      }, 1500);
    } catch (err) {
      this.showError(`Failed to initialize app: ${err.message}`);
      const ls = document.getElementById('loading-screen');
      if (ls) { ls.style.opacity = '0'; ls.style.pointerEvents = 'none'; setTimeout(() => ls.classList.add('hidden'), 500); }
    }
  }
}

Object.assign(UrbindexApp.prototype,
  utilsMethods,
  firebaseMethods,
  mapMethods,
  uiMethods,
  authMethods,
  locationsMethods,
  socialMethods,
  profileMethods,
  dataMethods,
  settingsMethods,
);

export { UrbindexApp };
