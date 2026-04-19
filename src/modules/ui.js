export const uiMethods = {
  initUI() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchView(btn.dataset.view));
    });

    const form = document.getElementById('location-form');
    if (form) form.addEventListener('submit', e => this.handleLocationSubmit(e));

    document.getElementById('auth-btn')?.addEventListener('click', e => { e.preventDefault(); this.handleAuth(); });
    document.getElementById('password-reset-form')?.addEventListener('submit', e => this.handlePasswordReset(e));
    document.getElementById('edit-profile-form')?.addEventListener('submit', e => this.handleEditProfile(e));

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.hideModal();
        this.hidePasswordResetModal();
        this.hideAuthModal();
        this.hideEditProfileModal();
      }
    });

    this.initGeocoding();
    this.initKeyboardNavigation();
    this.initFocusManagement();
    this.initLiveRegions();

    const fab = document.getElementById('add-location-fab');
    if (fab) fab.addEventListener('click', () => this.showAddLocationModal());
    document.getElementById('recenter-btn')?.addEventListener('click', () => this.recenterToUserLocation());
  },

  showView(viewName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === `${viewName}-view`));

    if (viewName === 'map' && this.map) setTimeout(() => this.map.invalidateSize(), 100);
    else if (viewName === 'locations') this.loadUserLocations();
    else if (viewName === 'profile') this.loadProfile();
    else if (viewName === 'settings') this.showSettings();
    else if (viewName === 'social') this.showSocialFeed();
    else if (viewName === 'missions') this.showMissions();
    else if (viewName === 'routes') this.showRoutes();
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
