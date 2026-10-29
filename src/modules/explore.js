// Map exploration helpers: category pin icons, "near me" list, share links, and reporting spots.

const CATEGORY_ICONS = {
  abandoned: 'fa-house-crack', industrial: 'fa-industry', infrastructure: 'fa-bridge',
  nature: 'fa-tree', underground: 'fa-dungeon', rooftop: 'fa-building', historical: 'fa-landmark',
  storage: 'fa-warehouse', parking: 'fa-square-parking', wifi: 'fa-wifi', charging: 'fa-charging-station',
  bathroom: 'fa-restroom', laundromat: 'fa-shirt', power: 'fa-plug', food: 'fa-utensils',
  overnight: 'fa-bed', tools: 'fa-screwdriver-wrench', other: 'fa-location-dot',
};

const REPORT_REASONS = {
  dangerous: 'Dangerous / unsafe',
  gone: 'Gone, demolished or closed',
  fake: "Fake / doesn't exist",
  wrong_pin: 'Wrong location on map',
  private_property: 'Private home or people living there',
  spam: 'Spam or offensive',
  other: 'Other',
};

export const exploreMethods = {
  categoryIcon(category) {
    return CATEGORY_ICONS[category] || CATEGORY_ICONS.other;
  },

  // ── Near me ──────────────────────────────────────────────
  distanceKm(lat1, lng1, lat2, lng2) {
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  formatDistance(km) {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
  },

  // Lists the closest pins to the GPS fix (or the map center if there's no fix).
  renderNearby(origin) {
    const list = document.getElementById('nearby-list');
    if (!list) return;
    const center = origin || this._lastFix || (this.map && [this.map.getCenter().lat, this.map.getCenter().lng]);
    if (!center) return;
    const [lat, lng] = center;
    const items = [];
    this.markers.forEach((marker, id) => {
      const d = marker._ubData;
      if (!d?.coordinates) return;
      items.push({ id, d, km: this.distanceKm(lat, lng, d.coordinates[0], d.coordinates[1]) });
    });
    items.sort((a, b) => a.km - b.km);
    const top = items.slice(0, 8);
    const label = document.getElementById('nearby-origin');
    if (label) label.textContent = origin || this._lastFix ? 'from your position' : 'from map center';
    if (!top.length) { list.innerHTML = '<div class="nearby-empty">no spots indexed yet</div>'; return; }
    list.innerHTML = top.map(({ id, d, km }) => `
      <button class="nearby-item" onclick="app.openLocationPin('${id}')">
        <i class="fas ${this.categoryIcon(d.category)} nearby-icon risk-${this.escapeHtml(d.riskLevel || 'unknown')}"></i>
        <span class="nearby-name">${this.escapeHtml(d.name || 'Unnamed')}</span>
        <span class="nearby-dist">${this.formatDistance(km)}</span>
      </button>`).join('');
  },

  // Zoom to a pin (expanding its cluster) and open its popup.
  openLocationPin(id) {
    const marker = this.markers.get(id);
    if (!marker || !this.map) return false;
    this.showView?.('map');
    const open = () => marker.openPopup();
    if (this.markerClusterGroup?.hasLayer(marker)) this.markerClusterGroup.zoomToShowLayer(marker, open);
    else { this.map.setView(marker.getLatLng(), 16); open(); }
    return true;
  },

  // ── Share links ──────────────────────────────────────────
  locationShareUrl(id) {
    return `${location.origin}/?loc=${encodeURIComponent(id)}`;
  },

  async shareLocation(id, name = 'Urbindex spot') {
    const url = this.locationShareUrl(id);
    try {
      if (navigator.share) { await navigator.share({ title: name, text: `${name} on Urbindex`, url }); return; }
      await navigator.clipboard.writeText(url);
      this.showToast('Link copied to clipboard', 'success');
    } catch (err) {
      if (err?.name === 'AbortError') return; // user closed the share sheet
      window.prompt('Copy this link:', url);
    }
  },

  // Open ?loc=<id> links once pins have loaded.
  async handleDeepLink() {
    const id = new URLSearchParams(location.search).get('loc');
    if (!id) return;
    for (let i = 0; i < 20 && !this.markers.has(id); i++) await new Promise(r => setTimeout(r, 250));
    if (this.openLocationPin(id)) { this.showLocationDetailModal(id); return; }
    try {
      const { doc } = await this.getLocationRef(id);
      if (doc.exists && doc.data().status === 'active') {
        const [lat, lng] = doc.data().coordinates || [];
        if (lat != null) this.map?.setView([lat, lng], 16);
        this.showLocationDetailModal(id);
      } else this.showToast('That spot is gone or private', 'warning');
    } catch { this.showToast('That spot is gone or private', 'warning'); }
  },

  // ── Reports ──────────────────────────────────────────────
  showReportModal(id) {
    if (!this.currentUser) { this.showToast('Sign in to report a spot', 'warning'); return; }
    document.querySelector('.report-modal')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active report-modal';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span>// REPORT SPOT</span>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form class="report-form" id="report-form">
            <p class="text-muted small">Reports go to the moderators. Each account can report a spot once.</p>
            ${Object.entries(REPORT_REASONS).map(([v, label], i) => `
              <label class="report-reason"><input type="radio" name="reason" value="${v}" ${i === 0 ? 'checked' : ''}> ${label}</label>`).join('')}
            <textarea class="input mt-8" name="note" maxlength="500" rows="3" placeholder="Details (optional)"></textarea>
            <div class="flex gap-8 mt-8">
              <button type="submit" class="btn btn-danger"><i class="fas fa-flag"></i> Send report</button>
              <button type="button" class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            </div>
          </form>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#report-form').addEventListener('submit', async e => {
      e.preventDefault();
      const form = new FormData(e.target);
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        await this.submitLocationReport(id, form.get('reason'), String(form.get('note') || '').trim());
        overlay.remove();
        this.showToast('Report sent. Thanks for keeping the index honest.', 'success');
      } catch (err) {
        btn.disabled = false;
        this.showToast(err.code === 'permission-denied' ? "You've already reported this spot" : 'Failed to send report', 'error');
      }
    });
  },

  async submitLocationReport(locationId, reason, note) {
    const uid = this.currentUser.uid;
    // Doc id = location + reporter, so the rules can enforce one report per person.
    await this.db.collection('location_reports').doc(`${locationId}_${uid}`).set({
      locationId,
      reason: REPORT_REASONS[reason] ? reason : 'other',
      note: note.slice(0, 500),
      reportedBy: uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },
};
