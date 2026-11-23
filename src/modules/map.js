export const mapMethods = {
  _locateUserBackground() {
    // If we already have a fresh cached location the map was already centered there — skip
    if (this.getCachedUserLocation()) return;
    this.showLocationIndicator('detecting', 'Detecting location...');
    this.getUserLocationWithFallbacks()
      .then(([lat, lng]) => {
        this.cacheUserLocation(lat, lng);
        if (this.map) this.map.setView([lat, lng], 13);
        this.showLocationIndicator('success', 'Location detected!');
        setTimeout(() => this.hideLocationIndicator(), 2000);
      })
      .catch(() => this.hideLocationIndicator());
  },

  initializeMap(lat, lng) {
    this.map = L.map('map', {
      center: [lat, lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 1.0,
    });

    const savedStyle = localStorage.getItem('urbindex-map-style') || 'dark';
    this._tileLayer = this._makeTileLayer(savedStyle).addTo(this.map);

    // The search bar owns the top of the map and the add button sits bottom-right.
    this.map.attributionControl.setPosition('bottomleft');
    this.map.zoomControl.setPosition('bottomleft');

    this.map.on('click', e => this.handleMapClick(e));
    window.addEventListener('resize', () => { if (this.map) setTimeout(() => this.map.invalidateSize(), 100); });
    setTimeout(() => this.map.invalidateSize(), 200);
  },

  _makeTileLayer(style) {
    // All keyless. CARTO basemaps now need an API key, so dark mode is OSM tiles with a CSS invert filter.
    const osm = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    const tiles = {
      default: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: osm, maxZoom: 19 }],
      dark:    ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: osm, maxZoom: 19, className: 'tiles-dark' }],
      terrain: ['https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: osm + ', &copy; <a href="https://opentopomap.org">OpenTopoMap</a>', subdomains: 'abc', maxZoom: 17 }],
    };
    const [url, opts] = tiles[style] || tiles.dark;
    return L.tileLayer(url, opts);
  },

  changeTileLayer(style) {
    if (!this.map) return;
    if (this._tileLayer) this.map.removeLayer(this._tileLayer);
    this._tileLayer = this._makeTileLayer(style).addTo(this.map);
    localStorage.setItem('urbindex-map-style', style);
  },

  handleMapClick(e) {
    this._closeMapSearchResults();
    if (!this._pickingLocation) return;

    const { lat, lng } = e.latlng;
    this._setFormCoords(lat, lng);
    this._endLocationPick();

    if (this.tempMarker) this.map.removeLayer(this.tempMarker);
    this.tempMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'geocoded-marker',
        html: '<div class="geocoded-marker-inner"></div>',
        iconSize: [12, 12], iconAnchor: [6, 6],
      }),
    }).addTo(this.map);

    this.showToast(`Location set: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'success');
  },

  async getUserLocationWithFallbacks() {
    const cached = this.getCachedUserLocation();
    if (cached) return cached;
    if (!navigator.geolocation) throw new Error('Geolocation not supported');
    try {
      return await this.getUserLocation();
    } catch {
      const locale = await this.getLocaleBasedLocation();
      if (locale) return locale;
      throw new Error('Location unavailable');
    }
  },

  getUserLocation() {
    return new Promise((resolve, reject) => {
      this.setRecenterButtonState('loading');
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.setRecenterButtonState('success');
          setTimeout(() => this.setRecenterButtonState('default'), 2000);
          resolve([pos.coords.latitude, pos.coords.longitude]);
        },
        err => {
          this.setRecenterButtonState('error');
          setTimeout(() => this.setRecenterButtonState('default'), 3000);
          const msgs = { 1: 'Location access denied.', 2: 'Location unavailable.', 3: 'Location request timed out.' };
          reject(new Error(msgs[err.code] || 'Unable to get location'));
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
      );
    });
  },

  async getLocaleBasedLocation() {
    const map = {
      'en-US': [39.83, -98.58], 'en-GB': [54.70, -3.28], 'en-CA': [56.13, -106.35],
      'en-AU': [-25.27, 133.78], 'en-NZ': [-40.90, 174.89], 'en-IN': [20.59, 78.96],
    };
    const locale = navigator.language || 'en-US';
    return map[locale] || map[locale.split('-').slice(0, 2).join('-')] || map['en-US'];
  },

  getLocaleBasedFallback() { return [39.83, -98.58]; },

  cacheUserLocation(lat, lng) {
    try { sessionStorage.setItem('urbindex_user_location', JSON.stringify({ lat, lng, timestamp: Date.now() })); } catch { /* storage unavailable (private mode) */ }
  },

  getCachedUserLocation() {
    try {
      const d = JSON.parse(sessionStorage.getItem('urbindex_user_location') || 'null');
      if (d && Date.now() - d.timestamp < 300000) return [d.lat, d.lng];
    } catch { /* storage unavailable (private mode) */ }
    return null;
  },

  async recenterToUserLocation() {
    if (!this.map) { this.showToast('Map not initialized', 'error'); return; }
    try {
      const [lat, lng] = await this.getUserLocation();
      this.map.setView([lat, lng], 15);
      const m = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: '<div class="user-position-dot"></div>',
          iconSize: [14, 14], iconAnchor: [7, 7],
        }),
      }).addTo(this.map);
      m.bindPopup(`<div class="map-popup"><div class="map-popup-title">// YOUR POSITION</div><div class="map-popup-desc">${lat.toFixed(6)}, ${lng.toFixed(6)}</div></div>`).openPopup();
      setTimeout(() => this.map.removeLayer(m), 10000);
      this.cacheUserLocation(lat, lng);
      this._lastFix = [lat, lng];
      this.renderNearby([lat, lng]);
      this.showToast('Map centered on your location', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  setRecenterButtonState(state) {
    const btn = document.getElementById('recenter-btn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    const span = btn.querySelector('span');
    btn.classList.remove('loading');
    const states = {
      loading: ['fa-spinner fa-spin', 'locating...', true],
      success: ['fa-check', 'located', false],
      error:   ['fa-exclamation-triangle', 'location blocked', false],
      default: ['fa-crosshairs', 'my location', false],
    };
    const [ic, tx, dis] = states[state] || states.default;
    if (icon) icon.className = `fas ${ic}`;
    if (span) span.textContent = tx;
    btn.disabled = dis;
  },

  showLocationIndicator(type, message) {
    const el = document.getElementById('location-indicator');
    if (!el) return;
    el.classList.add('active');
    el.querySelector('span').textContent = message;
  },

  hideLocationIndicator() {
    const el = document.getElementById('location-indicator');
    if (el) el.classList.remove('active');
  },

  focusMapOnLocation(lat, lng, zoom = 15) {
    if (!this.map || lat == null || lng == null) return;
    this.showView('map');
    setTimeout(() => this.map.setView([lat, lng], zoom), 150);
    this.showToast('Centered on location', 'success');
  },

  // Nominatim policy: max 1 request/second, no search-as-you-type, cache repeat queries.
  async searchPlaces(query, limit = 5) {
    const key = `${limit}:${query.trim().toLowerCase()}`;
    this._geocodeCache ||= new Map();
    if (this._geocodeCache.has(key)) return this._geocodeCache.get(key);

    const wait = (this._lastGeocodeAt || 0) + 1100 - Date.now();
    this._lastGeocodeAt = Date.now() + Math.max(wait, 0);
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status === 429 ? 'Geocoding rate limit exceeded. Please try again later.' : 'Geocoding service unavailable. Please check your connection.');
    const data = await res.json();
    const places = data.map(p => {
      const [south, north, west, east] = (p.boundingbox || []).map(Number);
      return {
        lat: parseFloat(p.lat),
        lng: parseFloat(p.lon),
        displayName: p.display_name,
        bounds: [south, north, west, east].every(Number.isFinite) ? [[south, west], [north, east]] : null,
      };
    }).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    this._geocodeCache.set(key, places);
    return places;
  },

  async geocodeAddress(address) {
    const [place] = await this.searchPlaces(address, 1);
    if (!place) throw new Error('Address not found. Please check spelling.');
    return place;
  },

  async reverseGeocode(lat, lng) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      return data.display_name || 'Current location';
    } catch { return 'Current location'; }
  },

  async setLocationFromCoordinates(lat, lng, address = null) {
    this._setFormCoords(lat, lng, address);
    if (this.map) {
      this.map.setView([lat, lng], 16);
      if (this.tempMarker) this.map.removeLayer(this.tempMarker);
      this.tempMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'geocoded-marker',
          html: '<div class="geocoded-marker-inner"></div>',
          iconSize: [12, 12], iconAnchor: [6, 6],
        }),
      }).addTo(this.map);
      setTimeout(() => { if (this.tempMarker) { this.map.removeLayer(this.tempMarker); this.tempMarker = null; } }, 5000);
    }
  },

  async handleAddressLookup() {
    const input = document.getElementById('location-address');
    const btn   = document.getElementById('find-location-btn');
    if (!input?.value.trim()) { this.showToast('Enter an address first', 'warning'); return; }
    this.setButtonLoading(btn, true, '');
    try {
      const coords = await this.geocodeAddress(input.value.trim());
      await this.setLocationFromCoordinates(coords.lat, coords.lng, coords.displayName);
      this.showToast(`Found: ${coords.displayName.substring(0, 50)}`, 'success');
    } catch (err) {
      this.showToast(err.message.includes('not found') ? 'Address not found' : 'Geocoding failed', 'error');
    } finally {
      this.setButtonLoading(btn, false);
    }
  },

  async handleMyLocation() {
    const btn = document.getElementById('use-my-location-btn');
    this.setButtonLoading(btn, true, '');
    try {
      const [lat, lng] = await this.getUserLocation();
      const address = await this.reverseGeocode(lat, lng);
      await this.setLocationFromCoordinates(lat, lng, address);
      this.showToast('Location set to your current position', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      this.setButtonLoading(btn, false);
    }
  },

  _setFormCoords(lat, lng, address = null) {
    this.selectedLatLng = { lat, lng };
    const latEl = document.getElementById('location-lat');
    const lngEl = document.getElementById('location-lng');
    if (latEl) latEl.value = lat.toFixed(6);
    if (lngEl) lngEl.value = lng.toFixed(6);
    const display = document.getElementById('coordinates-display');
    if (display) display.textContent = `Pin set: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    if (address) {
      const addrEl = document.getElementById('location-address');
      if (addrEl) addrEl.value = address;
    }
  },

  // ── Pick on map: tucks the form away (keeping what's typed) for one map click ──
  startLocationPick() {
    this.showView('map');
    this._pickingLocation = true;
    document.getElementById('location-modal-overlay')?.classList.add('is-picking');
    document.getElementById('map-pick-banner')?.classList.add('active');
    document.querySelector('.map-container')?.classList.add('is-picking');
    document.querySelector('.map-container')?.scrollIntoView({ block: 'center' });
  },

  _endLocationPick() {
    this._pickingLocation = false;
    document.getElementById('location-modal-overlay')?.classList.remove('is-picking');
    document.getElementById('map-pick-banner')?.classList.remove('active');
    document.querySelector('.map-container')?.classList.remove('is-picking');
  },

  // ── Address search bar ──
  initMapSearch() {
    const form = document.getElementById('map-search');
    const input = document.getElementById('map-search-input');
    const clear = document.getElementById('map-search-clear');
    const results = document.getElementById('map-search-results');
    if (!form || !input || !results) return;

    L.DomEvent.disableClickPropagation(form);
    L.DomEvent.disableScrollPropagation(form);

    form.addEventListener('submit', e => { e.preventDefault(); this.runMapSearch(input.value); });
    input.addEventListener('input', () => clear?.classList.toggle('is-hidden', !input.value));
    clear?.addEventListener('click', () => this.clearMapSearch());
    results.addEventListener('click', e => {
      const btn = e.target.closest('[data-place-index]');
      if (!btn) return;
      this._goToPlace(this._mapSearchPlaces[Number(btn.dataset.placeIndex)]);
      this._closeMapSearchResults();
    });
    form.addEventListener('keydown', e => this._handleMapSearchKeys(e, input, results));
    document.getElementById('map-pick-cancel')?.addEventListener('click', () => this._endLocationPick());
  },

  _handleMapSearchKeys(e, input, results) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (results.classList.contains('is-hidden')) this.clearMapSearch();
      else { this._closeMapSearchResults(); input.focus(); }
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...results.querySelectorAll('[data-place-index]')];
    if (!items.length || results.classList.contains('is-hidden')) return;
    e.preventDefault();
    const at = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? at + 1 : at - 1;
    if (next < 0 || next >= items.length) input.focus();
    else items[next].focus();
  },

  _parseCoordinates(text) {
    const m = text.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    if (!m) return null;
    const [lat, lng] = [Number(m[1]), Number(m[2])];
    return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng, displayName: `${lat}, ${lng}`, bounds: null } : null;
  },

  async runMapSearch(rawQuery) {
    const query = rawQuery.trim();
    if (!query) return;
    const coords = this._parseCoordinates(query);
    if (coords) { this._mapSearchPlaces = [coords]; this._closeMapSearchResults(); this._goToPlace(coords); return; }

    const token = (this._mapSearchToken = (this._mapSearchToken || 0) + 1);
    const submit = document.getElementById('map-search-submit');
    if (submit) submit.disabled = true;
    this._renderMapSearchMessage('Searching...');
    try {
      const places = await this.searchPlaces(query);
      if (token !== this._mapSearchToken) return;
      this._mapSearchPlaces = places;
      if (!places.length) { this._renderMapSearchMessage('No places found. Try adding a city or state.'); return; }
      // On phones the popup and results list would overlap, so wait for a choice.
      this._goToPlace(places[0], places.length === 1 || window.innerWidth > 700);
      if (places.length > 1) this._renderMapSearchResults(places);
      else this._closeMapSearchResults();
    } catch (err) {
      if (token === this._mapSearchToken) this._renderMapSearchMessage(err.message || 'Search failed. Try again.');
    } finally {
      if (token === this._mapSearchToken && submit) submit.disabled = false;
    }
  },

  _renderMapSearchMessage(message) {
    const results = document.getElementById('map-search-results');
    if (!results) return;
    const row = document.createElement('div');
    row.className = 'map-search-message';
    row.textContent = message;
    results.replaceChildren(row);
    results.classList.remove('is-hidden');
    this.announceToScreenReader?.(message);
  },

  _renderMapSearchResults(places) {
    const results = document.getElementById('map-search-results');
    if (!results) return;
    results.replaceChildren(...places.map((place, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `map-search-result${i === 0 ? ' is-current' : ''}`;
      btn.dataset.placeIndex = String(i);
      btn.textContent = place.displayName;
      return btn;
    }));
    results.classList.remove('is-hidden');
  },

  _closeMapSearchResults() {
    document.getElementById('map-search-results')?.classList.add('is-hidden');
  },

  clearMapSearch() {
    this._mapSearchToken = (this._mapSearchToken || 0) + 1;
    const input = document.getElementById('map-search-input');
    const submit = document.getElementById('map-search-submit');
    if (input) { input.value = ''; input.focus(); }
    if (submit) submit.disabled = false;
    document.getElementById('map-search-clear')?.classList.add('is-hidden');
    this._closeMapSearchResults();
    if (this._searchMarker) { this.map.removeLayer(this._searchMarker); this._searchMarker = null; }
    this.renderNearby();
  },

  _goToPlace(place, openPopup = true) {
    if (!this.map || !place) return;
    if (this._searchMarker) this.map.removeLayer(this._searchMarker);

    const popup = document.createElement('div');
    popup.className = 'map-popup';
    const title = document.createElement('div');
    title.className = 'map-popup-desc';
    title.textContent = place.displayName;
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'btn btn-primary btn-sm map-search-add';
    add.textContent = 'Add a spot here';
    add.addEventListener('click', () => {
      this.map.closePopup();
      this.showAddLocationModal();
      if (this.currentUser) this._setFormCoords(place.lat, place.lng, place.displayName);
    });
    popup.append(title, add);

    const marker = L.marker([place.lat, place.lng], {
      icon: L.divIcon({ className: 'geocoded-marker', html: '<div class="geocoded-marker-inner"></div>', iconSize: [12, 12], iconAnchor: [6, 6] }),
    }).bindPopup(popup).addTo(this.map);
    this._searchMarker = marker;
    if (openPopup) this.map.once('moveend', () => { if (this._searchMarker === marker) marker.openPopup(); });

    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const opts = { maxZoom: 17, padding: [40, 40] };
    if (place.bounds && animate) this.map.flyToBounds(place.bounds, { ...opts, duration: 1.2 });
    else if (place.bounds) this.map.fitBounds(place.bounds, { ...opts, animate: false });
    else if (animate) this.map.flyTo([place.lat, place.lng], 16, { duration: 1.2 });
    else this.map.setView([place.lat, place.lng], 16, { animate: false });

    this.renderNearby([place.lat, place.lng], 'from search result');
  },

};
