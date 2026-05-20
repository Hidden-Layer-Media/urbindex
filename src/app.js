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
import { forumMethods } from './modules/forum.js';
import { gamificationMethods } from './modules/gamification.js';
import { messageMethods } from './modules/messaging.js';
import { searchMethods } from './modules/search.js';

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
    this.unsubLocations = null;
    this.unsubActivity = null;
    this._photos = [];
  }

  async init() {
    try {
      // Initialize map immediately with cached or default coords — don't wait for GPS
      const defaultCoords = this.getCachedUserLocation() || this.getLocaleBasedFallback();
      this.initializeMap(defaultCoords[0], defaultCoords[1]);

      this.initUI();
      this.initTagSystem();
      this.initRateLimiting();
      this.initGlobalSearch();
      await this.initFirebase();
      this.initAuth();

      // Start loading data right away — map is already ready
      this.loadData();

      // Locate user in the background and pan map when found
      this._locateUserBackground();

      // Hide loading screen as soon as Firebase + map are ready (~800ms)
      const ls = document.getElementById('loading-screen');
      if (ls) { ls.classList.add('loading-fade'); setTimeout(() => ls.classList.add('hidden'), 500); }

      const logoTag = document.querySelector('.logo-tag');
      if (logoTag) this.typeWriter(logoTag, '// urban exploration network', 40);
    } catch (err) {
      this.showError(`Failed to initialize app: ${err.message}`);
      const ls = document.getElementById('loading-screen');
      if (ls) { ls.classList.add('loading-fade'); setTimeout(() => ls.classList.add('hidden'), 500); }
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
  forumMethods,
  gamificationMethods,
  messageMethods,
  searchMethods
);

export { UrbindexApp };
