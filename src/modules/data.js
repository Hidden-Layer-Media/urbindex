export const dataMethods = {
  async loadData() {
    this.loadLocations();
    this.loadStats();
    this.loadActivity();
  },

  loadLocations() {
    if (!this.map) return;
    if (!this.markerClusterGroup) {
      this.markerClusterGroup = L.markerClusterGroup({
        chunkedLoading: true, maxClusterRadius: 50, spiderfyOnMaxZoom: true,
        showCoverageOnHover: false, zoomToBoundsOnClick: true, disableClusteringAtZoom: 16,
        removeOutsideVisibleBounds: true, animate: true, animateAddingMarkers: true,
        iconCreateFunction: cluster => {
          const n = cluster.getChildCount();
          let cls = 'marker-cluster-small';
          if (n > 10) cls = 'marker-cluster-medium';
          if (n > 20) cls = 'marker-cluster-large';
          return new L.DivIcon({ html: `<div><span>${n}</span></div>`, className: `marker-cluster ${cls}`, iconSize: new L.Point(40, 40) });
        },
      });
      this.map.addLayer(this.markerClusterGroup);
    }

    this.unsubLocations?.();
    this.unsubLocations = this.db.collection('locations').where('status', '==', 'active').orderBy('createdAt', 'desc').onSnapshot(snap => {
      this.markerClusterGroup?.clearLayers();
      this.markers.clear();
      const valid = [];
      snap.forEach(doc => {
        try {
          const data = doc.data();
          if (!Array.isArray(data.coordinates) || data.coordinates.length !== 2) return;
          const [lat, lng] = data.coordinates;
          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
          const marker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'ub-pin-wrap',
              html: `<div class="ub-pin risk-${data.riskLevel || 'unknown'}"><span class="ub-pin-ring"></span></div>`,
              iconSize: [24, 24], iconAnchor: [12, 12],
            }),
          }).bindTooltip(this.buildLocationTooltip(data), {
            direction: 'top', offset: [0, -14], className: 'ub-tooltip', sticky: false,
          }).bindPopup(this.createLocationPopup(data, doc.id));
          valid.push(marker);
          this.markers.set(doc.id, marker);
        } catch {}
      });
      valid.forEach(m => this.markerClusterGroup?.addLayer(m));
    }, err => {
      const msgs = { 'permission-denied': 'Please sign in to view locations', 'unavailable': 'Network error. Please check your connection.' };
      this.showToast(msgs[err.code] || 'Failed to load locations', 'error');
    });
  },

  buildLocationTooltip(data) {
    const name = this.escapeHtml(data.name || 'Unnamed');
    const cat = this.escapeHtml(data.category || 'unknown');
    const risk = this.escapeHtml(data.riskLevel || 'unknown');
    const riskColor = this.getRiskColor(data.riskLevel);
    return `<div class="ub-tip">
      <div class="ub-tip-name">${name}</div>
      <div class="ub-tip-meta">// ${cat} &nbsp;<span style="color:${riskColor};">${risk}</span></div>
      <div class="ub-tip-stats"><i class="fas fa-eye"></i> ${data.visitCount || 0} &nbsp;<i class="fas fa-heart"></i> ${data.likesCount || 0}</div>
    </div>`;
  },

  createLocationPopup(data, docId) {
    const riskColor = this.getRiskColor(data.riskLevel);
    const name = this.escapeHtml(data.name || 'Unnamed Location');
    const desc = this.escapeHtml((data.description || 'No description').substring(0, 120));
    const cat = this.escapeHtml(data.category || 'other');
    const date = data.createdAt ? new Date(data.createdAt.toDate?.() ?? data.createdAt).toLocaleDateString() : 'Unknown';
    const photos = data.photos?.length ? `<div style="margin:8px 0;display:flex;gap:4px;flex-wrap:wrap;">${data.photos.slice(0,3).map((p,i) => `<img src="${this.escapeHtml(p)}" alt="photo" style="width:64px;height:64px;object-fit:cover;border:1px solid var(--border);" onclick="app.showLocationPhotoModal('${docId}',${i})">`).join('')}</div>` : '';
    const tags = data.tags?.length ? `<div style="margin:4px 0;">${data.tags.slice(0,4).map(t => `<span style="background:var(--yellow);color:#000;padding:1px 5px;font-size:0.7rem;margin-right:3px;">${this.escapeHtml(t)}</span>`).join('')}</div>` : '';
    const actions = this.currentUser
      ? `<div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;">
          <button onclick="app.editLocation('${docId}')" style="font-size:0.75rem;padding:3px 7px;">Edit</button>
          <button onclick="app.deleteLocation('${docId}')" style="font-size:0.75rem;padding:3px 7px;background:var(--red-alert);color:#000;">Delete</button>
          <button onclick="app.checkInLocation('${docId}')" style="font-size:0.75rem;padding:3px 7px;background:var(--green-term);color:#000;">Check In</button>
        </div>`
      : `<button onclick="app.showView('locations')" style="font-size:0.8rem;padding:3px 7px;background:var(--yellow);color:#000;margin-top:8px;">View All</button>`;
    return `
      <div style="min-width:220px;max-width:360px;font-family:var(--font-mono);">
        <div style="margin-bottom:6px;"><strong style="color:var(--yellow);">${name}</strong></div>
        <div style="margin-bottom:6px;font-size:0.9rem;color:#aaa;">${desc}</div>
        <div style="display:flex;gap:6px;font-size:0.8rem;margin-bottom:6px;">
          <span style="background:var(--black-raised);padding:2px 5px;">${cat}</span>
          <span style="background:${riskColor};color:#000;padding:2px 5px;">${data.riskLevel || 'unknown'}</span>
        </div>
        ${photos}${tags}
        <div style="font-size:0.75rem;color:#666;margin:6px 0;padding-top:4px;border-top:1px solid var(--border);">
          <i class="fas fa-calendar"></i> ${date}
          <i class="fas fa-eye" style="margin-left:8px;"></i> ${data.visitCount || 0}
          <i class="fas fa-heart" style="margin-left:8px;"></i> ${data.likesCount || 0}
        </div>
        ${actions}
      </div>`;
  },

  async loadStats() {
    try {
      const [locSnap, usersSnap] = await Promise.all([
        this.db.collection('locations').where('status', '==', 'active').get(),
        this.db.collection('users').where('lastSeen', '>', new Date(Date.now() - 86400000)).get(),
      ]);
      const lc = locSnap.size; const uc = usersSnap.size;
      const el = id => document.getElementById(id);
      if (el('total-locations')) el('total-locations').textContent = lc;
      if (el('active-users')) el('active-users').textContent = uc;
      if (el('hero-total-locations')) el('hero-total-locations').textContent = lc;
      if (el('hero-active-users')) el('hero-active-users').textContent = uc;
      if (el('hero-activity-index')) el('hero-activity-index').textContent = Math.min(99, Math.max(0, Math.round(lc * 0.7 + uc * 1.3)));
    } catch {}
  },

  loadActivity() {
    this.unsubActivity?.();
    this.unsubActivity = this.db.collection('locations').where('status', '==', 'active').orderBy('createdAt', 'desc').limit(10).onSnapshot(snap => {
      const feed = document.getElementById('activity-feed');
      if (!feed) return;
      if (snap.empty) { feed.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:16px;">No recent activity</div>'; return; }
      feed.innerHTML = '';
      snap.forEach(doc => {
        const data = doc.data();
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
          <div class="activity-icon"><i class="fas fa-map-marker-alt"></i></div>
          <div class="activity-content">
            <div><span class="activity-user">// explorer</span> tagged <strong>${this.escapeHtml(data.name)}</strong></div>
            <div class="activity-time">${this.timeAgo(data.createdAt?.toDate?.())}</div>
          </div>`;
        feed.appendChild(item);
      });
    }, err => {
      const feed = document.getElementById('activity-feed');
      if (feed) feed.innerHTML = err.code === 'permission-denied' ? '' : '<div class="error">Failed to load activity</div>';
    });
  },

  async getUserProfile(userId) {
    try {
      const doc = await this.db.collection('users').doc(userId).get();
      return doc.exists ? doc.data() : {};
    } catch { return {}; }
  },

  async updateUserBadges(userId, action) {
    try {
      const snap = await this.db.collection('user_badges').where('userId', '==', userId).get();
      const badgeIds = snap.docs.map(d => d.data().badgeId);
      const locSnap = await this.db.collection('locations').where('createdBy', '==', userId).where('status', '==', 'active').get();
      const locCount = locSnap.size;

      const toAward = [];
      if (locCount >= 1 && !badgeIds.includes('first_location')) toAward.push('first_location');
      if (locCount >= 10 && !badgeIds.includes('mapper_10')) toAward.push('mapper_10');
      if (locCount >= 50 && !badgeIds.includes('mapper_50')) toAward.push('mapper_50');
      if (action === 'check_in' && !badgeIds.includes('first_visit')) toAward.push('first_visit');

      await Promise.all(toAward.map(b => this.awardBadge(userId, b)));
    } catch {}
  },

  async awardBadge(userId, badgeId) {
    try {
      await this.db.collection('user_badges').add({ userId, badgeId, awardedAt: firebase.firestore.FieldValue.serverTimestamp() });
      await this.createNotification(userId, 'badge', `You earned the "${this.getBadgeName(badgeId)}" badge!`);
    } catch {}
  },

  async createNotification(userId, type, message) {
    try {
      await this.db.collection('user_notifications').add({
        userId, type, message, read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      this.updateNotificationBadge();
    } catch {}
  },

  showNotifications() {
    const view = document.getElementById('notifications-view-content');
    if (!view) return;
    view.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h2>// NOTIFICATIONS</h2>
        <div style="display:flex;gap:12px;">
          <button class="btn" onclick="app.showView('map')"><i class="fas fa-map"></i> Back</button>
          <button class="btn" onclick="app.markAllNotificationsAsRead()"><i class="fas fa-check-double"></i> Mark All Read</button>
        </div>
      </div>
      <div id="notifications-content" class="loading">Loading notifications...</div>`;
    this.loadNotifications();
  },

  async loadNotifications() {
    const container = document.getElementById('notifications-content');
    if (!container) return;
    if (!this.currentUser) { container.innerHTML = '<div style="color:var(--text-muted);">Sign in to view notifications</div>'; return; }
    try {
      const snap = await this.db.collection('user_notifications').where('userId', '==', this.currentUser.uid).orderBy('createdAt', 'desc').limit(30).get();
      if (snap.empty) { container.innerHTML = '<div style="color:var(--text-muted);padding:24px;text-align:center;">[ NO NOTIFICATIONS ]</div>'; return; }
      container.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data();
        const el = document.createElement('div');
        el.className = `notification-item${d.read ? '' : ' unread'}`;
        el.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
            <span>${this.escapeHtml(d.message)}</span>
            <button class="btn" style="font-size:0.75rem;padding:2px 6px;" onclick="app.markNotificationAsRead('${doc.id}')">✓</button>
          </div>
          <div style="color:var(--text-muted);font-size:0.8rem;">${this.timeAgo(d.createdAt?.toDate?.())}</div>`;
        container.appendChild(el);
      });
    } catch { container.innerHTML = '<div class="error">Failed to load notifications</div>'; }
  },

  async markNotificationAsRead(id) {
    try { await this.db.collection('user_notifications').doc(id).update({ read: true }); this.loadNotifications(); this.updateNotificationBadge(); }
    catch {}
  },

  async markAllNotificationsAsRead() {
    if (!this.currentUser) return;
    try {
      const snap = await this.db.collection('user_notifications').where('userId', '==', this.currentUser.uid).where('read', '==', false).get();
      const batch = this.db.batch();
      snap.forEach(doc => batch.update(doc.ref, { read: true }));
      await batch.commit();
      this.unreadNotifications = 0; this.updateNotificationBadge(); this.showNotifications();
      this.showToast('All notifications marked as read', 'success');
    } catch {}
  },

  async updateNotificationBadge() {
    if (!this.currentUser) return;
    try {
      const snap = await this.db.collection('user_notifications').where('userId', '==', this.currentUser.uid).where('read', '==', false).get();
      this.unreadNotifications = snap.size;
      const badge = document.getElementById('notification-badge');
      if (badge) { badge.textContent = snap.size; badge.style.display = snap.size > 0 ? 'block' : 'none'; }
    } catch {}
  },

  showRoutes() {
    const view = document.getElementById('routes-view-content');
    if (!view) return;
    view.innerHTML = `<h2>// ROUTES</h2><div id="routes-list" class="loading">Loading routes...</div>
      ${this.currentUser ? `<button class="btn btn-primary" style="margin-top:16px;" onclick="app.createNewRoute()"><i class="fas fa-plus"></i> Plan Route</button>` : ''}`;
    this.loadRoutes();
  },

  async loadRoutes() {
    const container = document.getElementById('routes-list');
    if (!container) return;
    try {
      const snap = await this.db.collection('routes').orderBy('createdAt', 'desc').limit(20).get();
      if (snap.empty) { container.innerHTML = '<div style="color:var(--text-muted);padding:24px;">No routes yet. Plan one!</div>'; return; }
      container.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data();
        const el = document.createElement('div');
        el.className = 'panel'; el.style.marginBottom = '12px';
        el.innerHTML = `<h4>${this.escapeHtml(d.name || 'Unnamed Route')}</h4><p style="color:var(--text-muted);">${this.escapeHtml(d.description || '')}</p><div style="color:var(--text-muted);font-size:0.85rem;">${d.locations?.length || 0} stops</div>`;
        container.appendChild(el);
      });
    } catch { container.innerHTML = '<div class="error">Failed to load routes</div>'; }
  },

  showGroups() {
    const view = document.getElementById('groups-view-content');
    if (!view) return;
    view.innerHTML = `<h2>// GROUPS</h2><div id="groups-list" class="loading">Loading groups...</div>
      ${this.currentUser ? `<button class="btn btn-primary" style="margin-top:16px;" onclick="app.createNewGroup()"><i class="fas fa-plus"></i> Create Group</button>` : ''}`;
    this.loadGroups();
  },

  async loadGroups() {
    const container = document.getElementById('groups-list');
    if (!container) return;
    try {
      const snap = await this.db.collection('groups').orderBy('createdAt', 'desc').limit(20).get();
      if (snap.empty) { container.innerHTML = '<div style="color:var(--text-muted);padding:24px;">No groups yet. Create one!</div>'; return; }
      container.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data();
        const el = document.createElement('div'); el.className = 'panel'; el.style.marginBottom = '12px';
        el.innerHTML = `<h4>${this.escapeHtml(d.name || 'Unnamed Group')}</h4><p style="color:var(--text-muted);">${this.escapeHtml(d.description || '')}</p><div style="color:var(--text-muted);font-size:0.85rem;">${d.memberCount || 0} members</div>`;
        container.appendChild(el);
      });
    } catch { container.innerHTML = '<div class="error">Failed to load groups</div>'; }
  },

  async createNewRoute() {
    if (!this.currentUser) { this.showToast('Sign in to create routes', 'warning'); this.handleAuth(); return; }
    const name = prompt('Route name:');
    if (!name?.trim()) return;
    const desc = prompt('Description (optional):') || '';
    try {
      await this.db.collection('routes').add({ name: this.sanitizeInput(name.trim()), description: this.sanitizeInput(desc.trim()), createdBy: this.currentUser.uid, locations: [], createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      this.showToast('Route created!', 'success'); this.loadRoutes();
    } catch { this.showToast('Failed to create route', 'error'); }
  },

  async createNewGroup() {
    if (!this.currentUser) { this.showToast('Sign in to create groups', 'warning'); this.handleAuth(); return; }
    const name = prompt('Group name:');
    if (!name?.trim()) return;
    const desc = prompt('Description (optional):') || '';
    try {
      await this.db.collection('groups').add({ name: this.sanitizeInput(name.trim()), description: this.sanitizeInput(desc.trim()), createdBy: this.currentUser.uid, memberCount: 1, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      this.showToast('Group created!', 'success'); this.loadGroups();
    } catch { this.showToast('Failed to create group', 'error'); }
  },

  showMissions() {
    const view = document.getElementById('missions-view-content');
    if (!view) return;
    view.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h2>// MISSIONS</h2>
        <button class="btn" onclick="app.showView('map')"><i class="fas fa-map"></i> Back</button>
      </div>
      <div id="missions-list" class="loading">Loading missions...</div>`;
    this.loadMissions();
  },

  async loadMissions() {
    const container = document.getElementById('missions-list');
    if (!container) return;
    if (!this.currentUser) { container.innerHTML = '<div style="color:var(--text-muted);padding:24px;">Sign in to view missions</div>'; return; }
    const samples = this.getSampleMissions();
    container.innerHTML = '';
    samples.forEach(m => {
      const el = document.createElement('div'); el.className = 'panel'; el.style.marginBottom = '12px';
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><h4>${this.escapeHtml(m.title)}</h4><p style="color:var(--text-muted);">${this.escapeHtml(m.description)}</p></div>
          <span style="background:var(--yellow);color:#000;padding:2px 8px;font-size:0.8rem;white-space:nowrap;">+${m.xp} XP</span>
        </div>
        <button class="btn btn-primary" style="margin-top:8px;" onclick="app.startMission('${m.id}')"><i class="fas fa-play"></i> Start</button>`;
      container.appendChild(el);
    });
  },

  getSampleMissions() {
    return [
      { id: 'm1', title: 'First Scout', description: 'Add your first location to the network.', xp: 50 },
      { id: 'm2', title: 'Social Operator', description: 'Follow 3 other explorers.', xp: 30 },
      { id: 'm3', title: 'Intel Gatherer', description: 'Add detailed notes to 5 locations.', xp: 100 },
      { id: 'm4', title: 'Grid Walker', description: 'Check in at 10 different locations.', xp: 150 },
      { id: 'm5', title: 'Zone Mapper', description: 'Add 5 locations in the same city.', xp: 200 },
    ];
  },

  async startMission(missionId) {
    if (!this.currentUser) { this.showToast('Sign in to start missions', 'warning'); this.handleAuth(); return; }
    this.showToast(`Mission started!`, 'success');
  },

  showLocationPhotos(locationId) {
    this.db.collection('locations').doc(locationId).get().then(doc => {
      if (!doc.exists) return;
      const d = doc.data();
      if (!d.photos?.length) return;
      this.showPhotoModal(d.photos, d.name || 'Location Photos');
    }).catch(() => this.showToast('Failed to load photos', 'error'));
  },

  showLocationPhotoModal(locationId, idx) {
    this.db.collection('locations').doc(locationId).get().then(doc => {
      if (!doc.exists) return;
      const d = doc.data();
      if (!d.photos?.[idx]) return;
      this.showPhotoModal(d.photos, d.name || 'Location Photos', idx);
    }).catch(() => this.showToast('Failed to load photo', 'error'));
  },

  showPhotoModal(photos, title = 'Photos', start = 0) {
    const modal = document.createElement('div');
    modal.className = 'modal location-detail-modal'; modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:90vw;max-height:90vh;width:auto;">
        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        <h3 style="margin-bottom:8px;">${this.escapeHtml(title)}</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-height:70vh;overflow-y:auto;">
          ${photos.map((p, i) => `<img src="${this.escapeHtml(p)}" alt="Photo ${i+1}" style="max-width:200px;max-height:200px;object-fit:cover;border:1px solid var(--border);cursor:pointer;" onclick="window.currentPhotoIndex=${i};window.currentPhotos=${JSON.stringify(photos)};app.showFullScreenPhoto()">`).join('')}
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  },

  showFullScreenPhoto() {
    const photos = window.currentPhotos; const idx = window.currentPhotoIndex;
    if (!photos || idx === undefined) return;
    const modal = document.createElement('div');
    modal.className = 'modal'; modal.style.display = 'flex';
    modal.innerHTML = `
      <div style="position:relative;max-width:95vw;max-height:95vh;">
        <img src="${this.escapeHtml(photos[idx])}" alt="Photo" style="max-width:100%;max-height:100%;object-fit:contain;border:3px solid var(--yellow);">
        <button class="modal-close" onclick="this.closest('.modal').remove()" style="top:8px;right:8px;">&times;</button>
        ${photos.length > 1 ? `<button onclick="window.currentPhotoIndex=(${idx}-1+${photos.length})%${photos.length};app.showFullScreenPhoto()" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.7);color:#fff;border:none;padding:8px 12px;cursor:pointer;"><i class="fas fa-chevron-left"></i></button>
        <button onclick="window.currentPhotoIndex=(${idx}+1)%${photos.length};app.showFullScreenPhoto()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.7);color:#fff;border:none;padding:8px 12px;cursor:pointer;"><i class="fas fa-chevron-right"></i></button>` : ''}
      </div>`;
    document.querySelector('.location-detail-modal')?.remove();
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  },
};
