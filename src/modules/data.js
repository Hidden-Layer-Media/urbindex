export const dataMethods = {
  async loadData() {
    await Promise.all([
      this.loadLocations(),
      this.loadStats(),
      this.loadActivity()
    ]);
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
          if (data.visibility === 'private' && data.createdBy !== this.currentUser?.uid) return;
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
    return `<div class="ub-tip">
      <div class="ub-tip-name">${name}</div>
      <div class="ub-tip-meta">// ${cat} &nbsp;<span class="risk risk-${data.riskLevel || 'unknown'}">${risk}</span></div>
      <div class="ub-tip-stats"><i class="fas fa-eye"></i> ${data.visitCount || 0} &nbsp;<i class="fas fa-heart"></i> ${data.likesCount || 0}</div>
    </div>`;
  },

  createLocationPopup(data, docId) {
    const name = this.escapeHtml(data.name || 'Unnamed Location');
    const desc = this.escapeHtml((data.description || 'No description').substring(0, 120));
    const cat = this.escapeHtml(data.category || 'other');
    const date = data.createdAt ? new Date(data.createdAt.toDate?.() ?? data.createdAt).toLocaleDateString() : 'Unknown';
    const photos = data.photos?.length
      ? `<div class="popup-photos">${data.photos.slice(0,3).map((p,i) => `<img src="${this.escapeHtml(p)}" alt="photo" class="popup-photo" onclick="app.showLocationPhotoModal('${docId}',${i})">`).join('')}</div>`
      : '';
    const tags = data.tags?.length
      ? `<div class="popup-tags">${data.tags.slice(0,4).map(t => `<span class="popup-tag">${this.escapeHtml(t)}</span>`).join('')}</div>`
      : '';
    const isOwner = this.currentUser?.uid === data.createdBy;
    const actions = this.currentUser
      ? `<div class="map-popup-actions">
          ${isOwner
            ? `<button class="btn btn-sm" onclick="app.editLocation('${docId}')">Edit</button>
               <button class="btn btn-sm btn-danger" onclick="app.deleteLocation('${docId}',this)">Delete</button>`
            : ''}
          <button class="btn btn-sm btn-success" onclick="app.checkInLocation('${docId}')">Check In</button>
        </div>`
      : `<div class="map-popup-actions"><button class="btn btn-sm btn-primary" onclick="app.showView('locations')">View All</button></div>`;
    return `
      <div class="map-popup">
        <div class="map-popup-title">${name}</div>
        <div class="map-popup-desc">${desc}</div>
        <div class="map-popup-meta">
          <span class="popup-cat-chip">${cat}</span>
          <span class="risk risk-${data.riskLevel || 'unknown'}">${data.riskLevel || 'unknown'}</span>
        </div>
        ${photos}${tags}
        <div class="popup-stats">
          <span><i class="fas fa-calendar"></i> ${date}</span>
          <span><i class="fas fa-eye"></i> ${data.visitCount || 0}</span>
          <span><i class="fas fa-heart"></i> ${data.likesCount || 0}</span>
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
      if (snap.empty) { feed.innerHTML = '<div class="empty-state"><i class="fas fa-rss"></i><p>No recent activity</p></div>'; return; }
      feed.innerHTML = '';
      snap.forEach(doc => {
        const data = doc.data();
        if (data.visibility === 'private' && data.createdBy !== this.currentUser?.uid) return;
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
          <div class="activity-icon"><i class="fas fa-map-marker-alt"></i></div>
          <div class="activity-content">
            <div><span class="activity-user">// ${this.escapeHtml(data.createdByName || 'explorer')}</span> tagged <strong>${this.escapeHtml(data.name)}</strong></div>
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
      <div class="view-header">
        <h2>// NOTIFICATIONS</h2>
        <div class="flex gap-8">
          <button class="btn" onclick="app.markAllNotificationsAsRead()"><i class="fas fa-check-double"></i> Mark All Read</button>
        </div>
      </div>
      <div id="notifications-content" class="loading">Loading notifications...</div>`;
    this.loadNotifications();
  },

  async loadNotifications() {
    const container = document.getElementById('notifications-content');
    if (!container) return;
    if (!this.currentUser) { container.innerHTML = '<div class="text-muted">Sign in to view notifications</div>'; return; }
    try {
      const snap = await this.db.collection('user_notifications').where('userId', '==', this.currentUser.uid).orderBy('createdAt', 'desc').limit(30).get();
      if (snap.empty) { container.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>'; return; }
      container.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data();
        const el = document.createElement('div');
        el.className = `notification-item${d.read ? '' : ' unread'}`;
        el.innerHTML = `
          <div class="notification-row">
            <span>${this.escapeHtml(d.message)}</span>
            ${!d.read ? `<button class="btn notification-mark-btn" onclick="app.markNotificationAsRead('${doc.id}')"><i class="fas fa-check"></i></button>` : ''}
          </div>
          <div class="notification-time">${this.timeAgo(d.createdAt?.toDate?.())}</div>`;
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
      if (badge) { badge.textContent = snap.size; badge.classList.toggle('hidden', snap.size === 0); }
    } catch {}
  },

  showRoutes() {
    const view = document.getElementById('routes-view-content');
    if (!view) return;
    view.innerHTML = `
      <div class="view-header">
        <h2>// ROUTES</h2>
        ${this.currentUser ? `<button class="btn btn-primary" onclick="app.createNewRoute()"><i class="fas fa-plus"></i> Plan Route</button>` : ''}
      </div>
      <div id="routes-list" class="loading">Loading routes...</div>`;
    this.loadRoutes();
  },

  async loadRoutes() {
    const container = document.getElementById('routes-list');
    if (!container) return;
    try {
      const snap = await this.db.collection('routes').orderBy('createdAt', 'desc').limit(20).get();
      if (snap.empty) { container.innerHTML = '<div class="empty-state"><i class="fas fa-route"></i><p>No routes yet — plan the first one.</p></div>'; return; }
      container.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data();
        const stops = d.locations?.length || 0;
        const ts = d.createdAt?.toDate ? this.timeAgo(d.createdAt.toDate()) : '';
        const el = document.createElement('div');
        el.className = 'panel route-card';
        el.innerHTML = `
          <div class="route-card-info">
            <h4>${this.escapeHtml(d.name || 'Unnamed Route')}</h4>
            ${d.description ? `<p class="route-card-desc">${this.escapeHtml(d.description)}</p>` : ''}
            <div class="route-card-meta">
              <span><i class="fas fa-map-marker-alt"></i> ${stops} stop${stops !== 1 ? 's' : ''}</span>
              ${ts ? `<span><i class="fas fa-clock"></i> ${ts}</span>` : ''}
            </div>
          </div>
          <div class="route-card-actions">
            <button class="btn btn-sm btn-primary" onclick="app.viewRouteOnMap('${doc.id}')"><i class="fas fa-map"></i> Map</button>
          </div>`;
        container.appendChild(el);
      });
    } catch { container.innerHTML = '<div class="error">Failed to load routes</div>'; }
  },

  async viewRouteOnMap(routeId) {
    try {
      const doc = await this.db.collection('routes').doc(routeId).get();
      if (!doc.exists) { this.showToast('Route not found', 'error'); return; }
      const d = doc.data();
      const locationIds = d.locations || [];
      if (!locationIds.length) { this.showToast('No stops in this route yet', 'info'); return; }

      this.showView('map');
      setTimeout(() => {
        const markers = locationIds.map(id => this.markers?.get(id)).filter(Boolean);
        if (!markers.length) { this.showToast('Route locations not found on current map', 'warning'); return; }
        const group = L.featureGroup(markers);
        this.map.fitBounds(group.getBounds().pad(0.25));
        this.showToast(`Viewing: ${d.name}`, 'success');
      }, 250);
    } catch { this.showToast('Failed to load route', 'error'); }
  },

  showGroups() {
    const view = document.getElementById('groups-view-content');
    if (!view) return;
    view.innerHTML = `
      <div class="view-header">
        <h2>// GROUPS</h2>
        ${this.currentUser ? `<button class="btn btn-primary" onclick="app.createNewGroup()"><i class="fas fa-plus"></i> Create Group</button>` : ''}
      </div>
      <div id="groups-list" class="loading">Loading groups...</div>`;
    this.loadGroups();
  },

  async loadGroups() {
    const container = document.getElementById('groups-list');
    if (!container) return;
    try {
      const [groupSnap, memberSnap] = await Promise.all([
        this.db.collection('groups').orderBy('createdAt', 'desc').limit(20).get(),
        this.currentUser
          ? this.db.collection('group_members').where('userId', '==', this.currentUser.uid).get()
          : Promise.resolve({ docs: [] }),
      ]);
      const memberOf = new Set(memberSnap.docs.map(d => d.data().groupId));

      if (groupSnap.empty) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>No groups yet — create the first one.</p></div>`;
        return;
      }
      container.innerHTML = '';
      groupSnap.forEach(doc => {
        const d = doc.data();
        const joined = memberOf.has(doc.id);
        const el = document.createElement('div');
        el.className = 'panel group-card';
        el.innerHTML = `
          <div class="group-card-info" onclick="app.showGroupDetail('${doc.id}')" style="cursor:pointer;">
            <div class="group-card-header">
              <h4>${this.escapeHtml(d.name || 'Unnamed Group')}</h4>
              ${joined ? '<span class="chip live">JOINED</span>' : ''}
            </div>
            ${d.description ? `<p class="group-card-desc">${this.escapeHtml(d.description)}</p>` : ''}
            <div class="group-card-meta">
              <span><i class="fas fa-users"></i> ${d.memberCount || 0} members</span>
            </div>
          </div>
          ${this.currentUser ? `
            <div class="group-card-actions">
              <button class="btn btn-sm" onclick="app.showGroupDetail('${doc.id}')"><i class="fas fa-arrow-right"></i></button>
              <button class="btn btn-sm ${joined ? 'btn-danger' : 'btn-primary'}" id="group-btn-${doc.id}" onclick="event.stopPropagation();app.joinGroup('${doc.id}')">
                <i class="fas fa-${joined ? 'sign-out-alt' : 'sign-in-alt'}"></i> ${joined ? 'Leave' : 'Join'}
              </button>
            </div>` : ''}`;
        container.appendChild(el);
      });
    } catch { container.innerHTML = '<div class="error">Failed to load groups</div>'; }
  },

  async joinGroup(groupId) {
    if (!this.currentUser) { this.showToast('Sign in to join groups', 'warning'); this.handleAuth(); return; }
    const opKey = `join-group-${groupId}`;
    if (this.activeOperations.has(opKey)) return;
    this.activeOperations.add(opKey);
    try {
      const memberRef = this.db.collection('group_members').doc(`${groupId}_${this.currentUser.uid}`);
      const snap = await memberRef.get();
      if (snap.exists) {
        await memberRef.delete();
        await this.db.collection('groups').doc(groupId).update({ memberCount: firebase.firestore.FieldValue.increment(-1) });
        this.showToast('Left group', 'info');
      } else {
        await memberRef.set({ groupId, userId: this.currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        await this.db.collection('groups').doc(groupId).update({ memberCount: firebase.firestore.FieldValue.increment(1) });
        this.showToast('Joined group!', 'success');
      }
      this.loadGroups();
    } catch { this.showToast('Failed to update group membership', 'error'); }
    finally { this.activeOperations.delete(opKey); }
  },

  createNewRoute() {
    if (!this.currentUser) { this.showToast('Sign in to create routes', 'warning'); this.handleAuth(); return; }
    this._showQuickCreateModal('Route', 'route name', 'Create Route', async (name, desc) => {
      await this.db.collection('routes').add({ name, description: desc, createdBy: this.currentUser.uid, locations: [], createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      this.showToast('Route created!', 'success'); this.loadRoutes?.();
    });
  },

  createNewGroup() {
    if (!this.currentUser) { this.showToast('Sign in to create groups', 'warning'); this.handleAuth(); return; }
    this._showQuickCreateModal('Group', 'group name', 'Create Group', async (name, desc) => {
      await this.db.collection('groups').add({ name, description: desc, createdBy: this.currentUser.uid, memberCount: 1, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      this.showToast('Group created!', 'success'); this.loadGroups();
    });
  },

  async showGroupDetail(groupId) {
    const view = document.getElementById('groups-view-content');
    if (!view) return;
    view.innerHTML = `
      <div class="view-header">
        <button class="btn btn-sm" onclick="app.showGroups()"><i class="fas fa-arrow-left"></i> Groups</button>
        <h2 id="group-detail-title">// LOADING...</h2>
        <div id="group-detail-actions"></div>
      </div>
      <div id="group-detail-body" class="loading">Loading group...</div>`;

    try {
      const uid = this.currentUser?.uid;
      const [groupDoc, memberSnap] = await Promise.all([
        this.db.collection('groups').doc(groupId).get(),
        this.db.collection('group_members').where('groupId', '==', groupId).get(),
      ]);

      if (!groupDoc.exists) { view.querySelector('#group-detail-body').innerHTML = '<div class="error">Group not found</div>'; return; }
      const g = groupDoc.data();
      const memberIds = memberSnap.docs.map(d => d.data().userId);
      const joined = memberIds.includes(uid);

      document.getElementById('group-detail-title').textContent = `// ${g.name || 'GROUP'}`;
      const actionsEl = document.getElementById('group-detail-actions');
      if (uid) {
        actionsEl.innerHTML = `<button class="btn btn-sm ${joined ? 'btn-danger' : 'btn-primary'}" onclick="app.joinGroup('${groupId}').then(()=>app.showGroupDetail('${groupId}'))">
          <i class="fas fa-${joined ? 'sign-out-alt' : 'sign-in-alt'}"></i> ${joined ? 'Leave' : 'Join'}
        </button>`;
      }

      // Fetch member user docs (up to 10 at a time for 'in' query)
      const memberUsers = [];
      const chunks = [];
      for (let i = 0; i < memberIds.length; i += 10) chunks.push(memberIds.slice(i, i + 10));
      for (const chunk of chunks) {
        if (!chunk.length) continue;
        const snap = await this.db.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get();
        snap.forEach(d => memberUsers.push({ id: d.id, ...d.data() }));
      }

      // Fetch locations from members (up to first 10 members)
      const locChunk = memberIds.slice(0, 10);
      let locRows = '';
      if (locChunk.length) {
        const locSnap = await this.db.collection('locations').where('createdBy', 'in', locChunk).where('status', '==', 'active').orderBy('createdAt', 'desc').limit(20).get();
        locRows = locSnap.empty
          ? '<div class="empty-state">No locations from group members yet.</div>'
          : [...locSnap.docs].map(doc => {
            const d = doc.data();
            const [lat, lng] = Array.isArray(d.coordinates) ? d.coordinates : [null, null];
            return `<div class="location-card">
              <div class="location-header">
                <h4>${this.escapeHtml(d.name || 'Unnamed')}</h4>
                <span class="risk risk-${d.riskLevel || 'unknown'}">${d.riskLevel || 'unknown'}</span>
              </div>
              <p class="location-card-desc">${this.escapeHtml((d.description || '').substring(0, 80))}${(d.description || '').length > 80 ? '...' : ''}</p>
              <div class="location-card-meta"><i class="fas fa-user"></i> ${this.escapeHtml(d.createdByName || 'Explorer')}</div>
              ${lat != null ? `<div class="location-actions"><button class="btn btn-sm" onclick="app.focusMapOnLocation(${lat},${lng})"><i class="fas fa-map"></i> View on Map</button></div>` : ''}
            </div>`;
          }).join('');
      }

      const memberListHtml = memberUsers.length
        ? memberUsers.map(u => `<div class="group-member-row">
            <div class="group-member-avatar">${(u.displayName || 'E').charAt(0).toUpperCase()}</div>
            <span class="group-member-name" onclick="app.showView('profile','${u.id}')" style="cursor:pointer;">${this.escapeHtml(u.displayName || 'Explorer')}</span>
          </div>`).join('')
        : '<div class="empty-state">No members yet.</div>';

      document.getElementById('group-detail-body').innerHTML = `
        ${g.description ? `<div class="panel"><div class="panel-body">${this.escapeHtml(g.description)}</div></div>` : ''}
        <div class="group-detail-grid">
          <section class="panel group-members-panel">
            <div class="panel-header"><i class="fas fa-users"></i> Members (${memberIds.length})</div>
            <div class="panel-body group-member-list">${memberListHtml}</div>
          </section>
          <section class="panel">
            <div class="panel-header"><i class="fas fa-map-marker-alt"></i> Member Locations</div>
            <div class="locations-grid">${locRows}</div>
          </section>
        </div>`;
    } catch { document.getElementById('group-detail-body').innerHTML = '<div class="error">Failed to load group</div>'; }
  },

  _showQuickCreateModal(type, namePlaceholder, submitLabel, onSubmit) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span>// ${this.escapeHtml(submitLabel.toUpperCase())}</span>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="_quick-create-form">
            <div class="form-group">
              <label class="form-label">Name</label>
              <input class="input" id="_qc-name" type="text" placeholder="${this.escapeHtml(namePlaceholder)}" required maxlength="80" autofocus>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="textarea" id="_qc-desc" placeholder="Optional description..." maxlength="300" rows="2"></textarea>
            </div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="submit" class="btn btn-primary">${this.escapeHtml(submitLabel)}</button>
            </div>
          </form>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#_quick-create-form').addEventListener('submit', async e => {
      e.preventDefault();
      const name = this.sanitizeInput(overlay.querySelector('#_qc-name').value.trim());
      const desc = this.sanitizeInput(overlay.querySelector('#_qc-desc').value.trim());
      if (!name) return;
      const btn = e.target.querySelector('[type="submit"]');
      btn.disabled = true; btn.textContent = 'Saving...';
      try { await onSubmit(name, desc); overlay.remove(); }
      catch { this.showToast(`Failed to create ${type.toLowerCase()}`, 'error'); btn.disabled = false; btn.textContent = submitLabel; }
    });
  },

  showMissions() {
    const view = document.getElementById('missions-view-content');
    if (!view) return;
    view.innerHTML = `
      <div class="view-header">
        <h2>// MISSIONS</h2>
      </div>
      <div id="missions-list" class="loading">Loading missions...</div>`;
    this.loadMissions();
  },

  async loadMissions() {
    const container = document.getElementById('missions-list');
    if (!container) return;
    if (!this.currentUser) { container.innerHTML = '<div class="empty-state">Sign in to view missions</div>'; return; }
    container.innerHTML = '<div class="loading">Querying mission status...</div>';
    try {
      const uid = this.currentUser.uid;
      const [locsSnap, followSnap, visitsSnap] = await Promise.all([
        this.db.collection('locations').where('createdBy', '==', uid).where('status', '==', 'active').get(),
        this.db.collection('user_followers').where('followerId', '==', uid).get(),
        this.db.collection('location_visits').where('userId', '==', uid).get(),
      ]);
      const locCount = locsSnap.size;
      const locWithDesc = locsSnap.docs.filter(d => (d.data().description || '').length >= 30).length;
      const followCount = followSnap.size;
      const visitCount = visitsSnap.size;

      const missions = [
        { id: 'm1', title: 'First Scout', description: 'Add your first location to the network.', xp: 50, progress: Math.min(locCount, 1), goal: 1 },
        { id: 'm2', title: 'Social Operator', description: 'Follow 3 other explorers.', xp: 30, progress: Math.min(followCount, 3), goal: 3 },
        { id: 'm3', title: 'Intel Gatherer', description: 'Add detailed descriptions to 5 locations.', xp: 100, progress: Math.min(locWithDesc, 5), goal: 5 },
        { id: 'm4', title: 'Grid Walker', description: 'Check in at 10 different locations.', xp: 150, progress: Math.min(visitCount, 10), goal: 10 },
        { id: 'm5', title: 'Zone Mapper', description: 'Add 5 locations to the network.', xp: 200, progress: Math.min(locCount, 5), goal: 5 },
      ];

      container.innerHTML = '';
      missions.forEach(m => {
        const pct = Math.round((m.progress / m.goal) * 100);
        const done = m.progress >= m.goal;
        const el = document.createElement('div');
        el.className = 'panel mission-card';
        el.innerHTML = `
          <div class="panel-header${done ? ' mission-done' : ''}">${done ? '<i class="fas fa-check-double"></i> ' : ''}${this.escapeHtml(m.title)} <span class="float-right">+${m.xp} XP</span></div>
          <div class="panel-body">
            <p class="mission-desc">${this.escapeHtml(m.description)}</p>
            <div class="mission-progress-track">
              <div class="mission-progress-fill${done ? ' done' : ''}" style="width:${pct}%;"></div>
            </div>
            <div class="mission-progress-labels">
              <span>${m.progress}/${m.goal} complete</span>
              <span>${pct}%</span>
            </div>
          </div>`;
        container.appendChild(el);
      });
    } catch { container.innerHTML = '<div class="error">Failed to load missions</div>'; }
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
      this.showPhotoModal(d.photos, d.name || 'Location Photos');
    }).catch(() => this.showToast('Failed to load photo', 'error'));
  },

  showPhotoModal(photos, title = 'Photos') {
    this._photos = photos;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active location-detail-modal';
    overlay.innerHTML = `
      <div class="modal modal-wide">
        <div class="modal-header">
          <span>${this.escapeHtml(title)}</span>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="photo-grid">
            ${photos.map((p, i) => `<img src="${this.escapeHtml(p)}" alt="Photo ${i+1}" class="photo-grid-item" onclick="app.showFullScreenPhoto(${i})">`).join('')}
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  },

  showFullScreenPhoto(idx) {
    const photos = this._photos;
    if (!photos || idx === undefined) return;
    const n = photos.length;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="photo-fullscreen-wrap">
        <img src="${this.escapeHtml(photos[idx])}" alt="Photo" class="photo-fullscreen-img">
        <button class="modal-close photo-close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        ${n > 1 ? `
          <button class="photo-nav-btn photo-nav-prev" onclick="this.closest('.modal-overlay').remove();app.showFullScreenPhoto(${(idx - 1 + n) % n})"><i class="fas fa-chevron-left"></i></button>
          <button class="photo-nav-btn photo-nav-next" onclick="this.closest('.modal-overlay').remove();app.showFullScreenPhoto(${(idx + 1) % n})"><i class="fas fa-chevron-right"></i></button>` : ''}
      </div>`;
    document.querySelector('.photo-fullscreen-wrap')?.closest('.modal-overlay')?.remove();
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  },
};
