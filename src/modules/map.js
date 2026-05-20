export const mapMethods = {
  initMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl) { this.showError('Map element not found.'); return Promise.resolve(); }
    return this.initializeMapWithLocation();
  },

  async initializeMapWithLocation() {
    this.showLocationIndicator('detecting', 'Detecting location...');
    try {
      const [lat, lng] = await this.getUserLocationWithFallbacks();
      this.initializeMap(lat, lng);
      this.cacheUserLocation(lat, lng);
      this.showLocationIndicator('success', 'Location detected!');
      setTimeout(() => this.hideLocationIndicator(), 2000);
    } catch (err) {
      const fb = this.getLocaleBasedFallback();
      this.initializeMap(fb[0], fb[1]);
      this.showLocationIndicator('fallback', 'Using default location');
      setTimeout(() => this.hideLocationIndicator(), 3000);
    }
  },

  initializeMap(lat, lng) {
    this.map = L.map('map', {
      center: [lat, lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 1.0,
    });

    const savedStyle = localStorage.getItem('urbindex-map-style') || 'dark';
    this._tileLayer = this._makeTileLayer(savedStyle).addTo(this.map);

    this.map.on('click', e => this.handleMapClick(e));
    window.addEventListener('resize', () => { if (this.map) setTimeout(() => this.map.invalidateSize(), 100); });
    setTimeout(() => this.map.invalidateSize(), 200);
  },

  _makeTileLayer(style) {
    const tiles = {
      default: ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }],
      dark:    ['https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 19 }],
      terrain: ['https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 19 }],
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
    const modal = document.getElementById('location-modal-overlay');
    if (!modal?.classList.contains('active')) return;

    const { lat, lng } = e.latlng;
    this.selectedLatLng = { lat, lng };

    const latEl = document.getElementById('location-lat');
    const lngEl = document.getElementById('location-lng');
    if (latEl) latEl.value = lat.toFixed(6);
    if (lngEl) lngEl.value = lng.toFixed(6);

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
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 },
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
    try { sessionStorage.setItem('urbindex_user_location', JSON.stringify({ lat, lng, timestamp: Date.now() })); } catch {}
  },

  getCachedUserLocation() {
    try {
      const d = JSON.parse(sessionStorage.getItem('urbindex_user_location') || 'null');
      if (d && Date.now() - d.timestamp < 300000) return [d.lat, d.lng];
    } catch {}
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
      loading: ['fa-spinner fa-spin', 'Locating...', true],
      success: ['fa-check', 'Found!', false],
      error:   ['fa-exclamation-triangle', 'Failed', false],
      default: ['fa-crosshairs', 'My Location', false],
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

  async geocodeAddress(address) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Urbindex/2.0' } });
    if (!res.ok) throw new Error(res.status === 429 ? 'Geocoding rate limit exceeded. Please try again later.' : 'Geocoding service unavailable. Please check your connection.');
    const data = await res.json();
    if (!data.length) throw new Error('Address not found. Please check spelling.');
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name };
  },

  async reverseGeocode(lat, lng) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { 'User-Agent': 'Urbindex/2.0' } });
      const data = await res.json();
      return data.display_name || 'Current location';
    } catch { return 'Current location'; }
  },

  async setLocationFromCoordinates(lat, lng, address = null) {
    this.selectedLatLng = { lat, lng };
    const latEl = document.getElementById('location-lat');
    const lngEl = document.getElementById('location-lng');
    if (latEl) latEl.value = lat.toFixed(6);
    if (lngEl) lngEl.value = lng.toFixed(6);
    if (address) {
      const addrEl = document.getElementById('location-address');
      if (addrEl) addrEl.value = address;
    }
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

};
