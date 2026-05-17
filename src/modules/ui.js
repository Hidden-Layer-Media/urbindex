export const uiMethods = {
  initUI() {
    this._cleanupUIListeners();
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchView(btn.dataset.view));
    });

    const form = document.getElementById('location-form');
    if (form) form.addEventListener('submit', e => this.handleLocationSubmit(e));

    this._uiListeners = {
      authBtn: e => { e.preventDefault(); this.handleAuth(); },
      pwReset: e => this.handlePasswordReset(e),
      editProfile: e => this.handleEditProfile(e),
      online: () => this.updateOnlineStatus(true),
      offline: () => this.updateOnlineStatus(false),
      globalKeydown: e => {
        if (e.key === 'Escape') {
          this.hideModal();
          this.hidePasswordResetModal();
          this.hideAuthModal();
          this.hideEditProfileModal();
          this.hideUserLocationsModal();
          document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        }
        // Shortcuts: Ctrl+K: Search, Ctrl+M: Map, Ctrl+P: Profile
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'k') { e.preventDefault(); document.getElementById('search-modal').classList.add('active'); }
          else if (e.key === 'm') { e.preventDefault(); this.showView('map'); }
          else if (e.key === 'p') { e.preventDefault(); this.showView('profile'); }
        }
      }
    };

    document.getElementById('auth-btn')?.addEventListener('click', this._uiListeners.authBtn);
    document.getElementById('password-reset-form')?.addEventListener('submit', this._uiListeners.pwReset);
    document.getElementById('edit-profile-form')?.addEventListener('submit', this._uiListeners.editProfile);
    document.addEventListener('keydown', this._uiListeners.globalKeydown);
    window.addEventListener('online', this._uiListeners.online);
    window.addEventListener('offline', this._uiListeners.offline);

    this.updateOnlineStatus(navigator.onLine);

    this.initGeocoding();
    this.initKeyboardNavigation();
    this.initFocusManagement();
    this.initLiveRegions();

    const fab = document.getElementById('add-location-fab');
    if (fab) fab.addEventListener('click', () => this.showAddLocationModal());
    document.getElementById('recenter-btn')?.addEventListener('click', () => this.recenterToUserLocation());
  },

  _cleanupUIListeners() {
    if (!this._uiListeners) return;
    document.getElementById('auth-btn')?.removeEventListener('click', this._uiListeners.authBtn);
    document.getElementById('password-reset-form')?.removeEventListener('submit', this._uiListeners.pwReset);
    document.getElementById('edit-profile-form')?.removeEventListener('submit', this._uiListeners.editProfile);
    document.removeEventListener('keydown', this._uiListeners.globalKeydown);
    window.removeEventListener('online', this._uiListeners.online);
    window.removeEventListener('offline', this._uiListeners.offline);
  },

  updateOnlineStatus(isOnline) {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (dot) dot.style.background = isOnline ? 'var(--green-term)' : 'var(--red-alert)';
    if (text) text.textContent = isOnline ? 'Online' : 'Offline';
  },

  showView(viewName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === `${viewName}-view`));

    if (viewName === 'map' && this.map) setTimeout(() => this.map.invalidateSize(), 100);
    else if (viewName === 'locations') this.loadUserLocations();
    else if (viewName === 'profile') this.loadProfile();
    else if (viewName === 'settings') this.showSettings();
    else if (viewName === 'social') this.showSocialFeed();
    else if (viewName === 'forum') this.showForum();
    else if (viewName === 'groups') this.showGroups();
    else if (viewName === 'notifications') this.showNotifications();
  },

  switchView(viewName) { this.showView(viewName); },

  initKeyboardNavigation() {
    const map = document.getElementById('map');
    if (map) {
      map.addEventListener('keydown', e => {
        const announce = { ArrowUp:'Moving map up', ArrowDown:'Moving map down', ArrowLeft:'Moving map left', ArrowRight:'Moving map right', Enter:'Map marker selected' };
        if (announce[e.key]) { e.preventDefault(); this.announceToScreenReader(announce[e.key]); }
      });
    }
    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey) {
        const views = { '1':'map', '2':'locations', '3':'profile' };
        if (views[e.key]) { e.preventDefault(); this.switchView(views[e.key]); this.announceToScreenReader(`Switched to ${views[e.key]} view`); }
      }
    });
  },

  initFocusManagement() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.addEventListener('keydown', e => { if (e.key === 'Tab') this.trapFocus(modal, e); });
    });
    const overlays = document.querySelectorAll('.modal-overlay');
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'class' && m.target.classList.contains('modal-overlay')) {
          if (!m.target.classList.contains('active')) {
            const returnFocus = m.target.getAttribute('data-return-focus');
            if (returnFocus) { document.getElementById(returnFocus)?.focus(); m.target.removeAttribute('data-return-focus'); }
          }
        }
      });
    });
    overlays.forEach(m => observer.observe(m, { attributes: true }));
  },

  initLiveRegions() {
    if (!document.getElementById('live-region')) {
      const lr = document.createElement('div');
      lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.className = 'sr-only'; lr.id = 'live-region';
      document.body.appendChild(lr);
    }
    if (!document.getElementById('assertive-live-region')) {
      const alr = document.createElement('div');
      alr.setAttribute('aria-live', 'assertive'); alr.setAttribute('aria-atomic', 'true'); alr.className = 'sr-only'; alr.id = 'assertive-live-region';
      document.body.appendChild(alr);
    }
  },

  initGeocoding() {
    document.getElementById('find-location-btn')?.addEventListener('click', () => this.handleAddressLookup());
    document.getElementById('use-my-location-btn')?.addEventListener('click', () => this.handleMyLocation());
    const addrInput = document.getElementById('location-address');
    if (addrInput) {
      addrInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.handleAddressLookup(); } });
    }
  },

  showLocationModalOverlay() {
    const modal = document.getElementById('location-modal-overlay');
    if (modal) modal.classList.add('active');
  },
};
