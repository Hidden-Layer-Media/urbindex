export const mapMethods = {
  initMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl) { this.showError('Map element not found.'); return; }
    this.initializeMapWithLocation();
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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.markerClusterGroup = L.markerClusterGroup({ maxClusterRadius: 60 });
    this.map.addLayer(this.markerClusterGroup);

    this.map.on('click', e => this.handleMapClick(e));
    window.addEventListener('resize', () => { if (this.map) setTimeout(() => this.map.invalidateSize(), 100); });
    setTimeout(() => this.map.invalidateSize(), 200);
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
        html: '<div style="background:var(--yellow);width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>',
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
          html: '<div style="background:var(--green-term);width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(0,255,65,0.6);"></div>',
          iconSize: [14, 14], iconAnchor: [7, 7],
        }),
      }).addTo(this.map);
      m.bindPopup(`<div style="font-family:var(--font-mono);font-size:11px;color:#000"><strong style="color:var(--black)">// YOUR POSITION</strong><br>${lat.toFixed(6)}, ${lng.toFixed(6)}</div>`).openPopup();
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
    el.style.display = 'flex';
    el.querySelector('span').textContent = message;
  },

  hideLocationIndicator() {
    const el = document.getElementById('location-indicator');
    if (el) el.style.display = 'none';
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
    if (!res.ok) throw new Error(res.status === 429 ? 'rate limit' : 'Geocoding unavailable');
    const data = await res.json();
    if (!data.length) throw new Error('not found');
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
          html: '<div style="background:var(--yellow);width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.5);"></div>',
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
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; }
    try {
      const coords = await this.geocodeAddress(input.value.trim());
      await this.setLocationFromCoordinates(coords.lat, coords.lng, coords.displayName);
      this.showToast(`Found: ${coords.displayName.substring(0, 50)}`, 'success');
    } catch (err) {
      this.showToast(err.message.includes('not found') ? 'Address not found' : 'Geocoding failed', 'error');
    } finally {
      if (btn) { btn.innerHTML = '<i class="fas fa-search"></i>'; btn.disabled = false; }
    }
  },

  async handleMyLocation() {
    const btn = document.getElementById('use-my-location-btn');
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; }
    try {
      const [lat, lng] = await this.getUserLocation();
      const address = await this.reverseGeocode(lat, lng);
      await this.setLocationFromCoordinates(lat, lng, address);
      this.showToast('Location set to your current position', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      if (btn) { btn.innerHTML = '<i class="fas fa-crosshairs"></i>'; btn.disabled = false; }
    }
  },

  createLocationMarker(id, data, lat, lng) {
    const color = this.getRiskColor(data.riskLevel);
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'custom-location-marker',
        html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid var(--black);box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      }),
    })
      .bindTooltip(data.name || 'Unknown', { direction: 'top', offset: [0, -10] })
      .bindPopup(this.createLocationPopup(data, id));
    return marker;
  },

  createLocationPopup(data, id) {
    return `
      <div style="font-family:var(--font-mono);font-size:11px;min-width:180px;background:var(--black);color:var(--text);padding:10px;border:1px solid var(--yellow-dim);">
        <div style="color:var(--yellow);font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">${this.escapeHtml(data.name)}</div>
        <div style="color:var(--text-muted);margin-bottom:8px;">${this.escapeHtml((data.description || '').substring(0, 80))}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
          <span style="color:var(--text-muted);font-size:10px;">// ${this.escapeHtml(data.category || 'unknown')}</span>
          <span style="color:${this.getRiskColor(data.riskLevel)};font-size:10px;">${this.escapeHtml(data.riskLevel || 'unknown')}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-sm btn-primary" onclick="app.showLocationDetailModal('${id}',{id:'${id}',...JSON.parse(document.querySelector('[data-loc-${id}]')?.dataset?.loc||'{}')})" style="font-size:9px;">Detail</button>
          ${this.currentUser ? `<button class="btn btn-sm" onclick="app.checkInLocation('${id}')" style="font-size:9px;">Check In</button>` : ''}
        </div>
      </div>
    `;
  },

  updateMapMarkers(locations) {
    if (!this.map || !this.markerClusterGroup) return;
    this.markerClusterGroup.clearLayers();
    locations.forEach(({ id, data }) => {
      if (data.coordinates?.length === 2) {
        const m = this.createLocationMarker(id, data, data.coordinates[0], data.coordinates[1]);
        if (m) this.markerClusterGroup.addLayer(m);
      }
    });
  },
};
