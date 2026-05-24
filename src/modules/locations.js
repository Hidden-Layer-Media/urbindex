export const locationsMethods = {
  showAddLocationModal() {
    if (!this.currentUser) {
      this.showToast('Sign in required to add locations', 'warning');
      this.handleAuth();
      return;
    }
    document.getElementById('location-modal-overlay')?.classList.add('active');
  },

  hideModal() {
    const modal = document.getElementById('location-modal-overlay');
    if (modal) modal.classList.remove('active');
    const form = document.getElementById('location-form');
    if (form) {
      form.reset();
      delete form.dataset.editId;
      delete form.dataset.originalCoordinates;
    }
    const title = document.querySelector('#location-modal-overlay .modal-titlebar-text');
    if (title) title.textContent = 'URBINDEX :: LOG LOCATION';
    const btn = document.querySelector('#location-form button[type="submit"]');
    if (btn) btn.innerHTML = '<i class="fas fa-save"></i> Save Location';
    this.selectedLatLng = null;
    const coordsDisplay = document.getElementById('coordinates-display');
    if (coordsDisplay) {
      coordsDisplay.textContent = 'Click on map or use address to set location';
      coordsDisplay.classList.add('active');
    }
    const addrEl = document.getElementById('location-address');
    if (addrEl) addrEl.value = '';
    const photosEl = document.getElementById('location-photos');
    if (photosEl) photosEl.value = '';
    const photosPreview = document.getElementById('location-photos-preview');
    if (photosPreview) photosPreview.innerHTML = '';
    if (this.tempMarker && this.map) { this.map.removeLayer(this.tempMarker); this.tempMarker = null; }
    this.clearTags();
  },

  async handleLocationSubmit(e) {
    e.preventDefault();
    const opKey = 'location-submit';
    if (this.activeOperations.has(opKey)) return;
    if (!this.currentUser) { this.showToast('Please sign in to manage locations', 'warning'); return; }

    const name = document.getElementById('location-name').value.trim();
    const description = document.getElementById('location-description').value.trim();
    const errs = [];
    if (!name) errs.push('Location name is required');
    if (!description) errs.push('Description is required');
    if (name && name.length < 3) errs.push('Location name must be at least 3 characters');
    if (name && name.length > 100) errs.push('Location name must be less than 100 characters');
    if (description && description.length < 10) errs.push('Description must be at least 10 characters');
    if (description && description.length > 1000) errs.push('Description must be less than 1000 characters');
    if (name && !/^[a-zA-Z0-9\s\-_.,!?()[\]]+$/.test(name)) errs.push('Location name contains invalid characters');

    const existingCoords = (() => { try { const r = e.target.dataset.originalCoordinates; return r ? JSON.parse(r) : null; } catch { return null; } })();
    const coords = this.selectedLatLng ? [this.selectedLatLng.lat, this.selectedLatLng.lng] : existingCoords;
    if (!coords) errs.push('Please select a location on the map');
    if (coords) {
      const [lat, lng] = coords;
      if (isNaN(lat) || isNaN(lng)) errs.push('Invalid coordinates');
      else if (lat < -90 || lat > 90) errs.push('Latitude must be between -90 and 90');
      else if (lng < -180 || lng > 180) errs.push('Longitude must be between -180 and 180');
    }
    const tags = this.getSelectedTags();
    if (tags.length > 10) errs.push('Maximum 10 tags allowed');
    for (const t of tags) { if (t.length > 25) { errs.push('Each tag must be less than 25 characters'); break; } }

    const photos = (document.getElementById('location-photos')?.value || '')
      .split(/\n+/).map(u => u.trim()).filter(u => /^https?:\/\/.+/i.test(u)).slice(0, 10);

    if (errs.length) { this.showToast(errs.join('. '), 'warning'); return; }

    this.activeOperations.add(opKey);
    const btn = e.target.querySelector('button[type="submit"]');
    this.setButtonLoading(btn, true, 'Saving...');

    const payload = {
      name: this.sanitizeInput(name),
      description: this.sanitizeInput(description),
      category: document.getElementById('location-category').value,
      riskLevel: document.getElementById('location-risk').value,
      address: this.sanitizeInput(document.getElementById('location-address').value.trim()),
      tags,
      photos,
      coordinates: coords,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
      const editId = e.target.dataset.editId;
      if (editId) {
        await this.db.collection('locations').doc(editId).update(payload);
        this.showToast('Location updated successfully!', 'success');
      } else {
        payload.createdBy = this.currentUser.uid;
        payload.createdByName = this.currentUser.displayName || 'Explorer';
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        payload.status = 'active';
        payload.visibility = this._locationVisibility || 'public';
        await this.db.collection('locations').add(payload);
        this.showToast('Location added successfully!', 'success');
        await this.updateUserBadges(this.currentUser.uid, 'add_location');
        this.updateUserXP(this.currentUser.uid, 'add_location');
      }
      this.hideModal();
      this.loadStats();
      if (document.getElementById('locations-view')?.classList.contains('active')) this.loadUserLocations();
    } catch (err) {
      const msgs = { 'permission-denied': 'You do not have permission to modify this location', 'not-found': 'Location not found' };
      this.showToast(msgs[err.code] || 'Failed to save location', 'error');
    } finally { this.setButtonLoading(btn, false); this.activeOperations.delete(opKey); }
  },

  async deleteLocation(id, btn) {
    if (btn && !btn.dataset.confirm) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Confirm?';
      btn.dataset.confirm = '1';
      btn.classList.add('btn-confirm-pending');
      const reset = () => { btn.innerHTML = orig; delete btn.dataset.confirm; btn.classList.remove('btn-confirm-pending'); };
      btn._confirmTimer = setTimeout(reset, 3000);
      return;
    }
    if (btn?._confirmTimer) clearTimeout(btn._confirmTimer);

    const opKey = `delete-${id}`;
    if (this.activeOperations.has(opKey)) return;
    this.activeOperations.add(opKey);
    try {
      await this.db.collection('locations').doc(id).update({ status: 'deleted', deletedAt: firebase.firestore.FieldValue.serverTimestamp() });
      this.loadUserLocations(); this.loadStats();
      this.showToast('Location deleted successfully', 'success');
    } catch { this.showToast('Failed to delete location. Please try again.', 'error'); }
    finally { this.activeOperations.delete(opKey); }
  },

  async editLocation(id) {
    try {
      const doc = await this.db.collection('locations').doc(id).get();
      if (!doc.exists) { this.showToast('Location not found', 'error'); return; }
      const data = doc.data();
      if (data.createdBy !== this.currentUser.uid) { this.showToast('You can only edit your own locations', 'error'); return; }

      document.getElementById('location-name').value = data.name || '';
      document.getElementById('location-description').value = data.description || '';
      document.getElementById('location-category').value = data.category || 'other';
      document.getElementById('location-risk').value = data.riskLevel || 'medium';
      if (data.address) document.getElementById('location-address').value = data.address;
      if (data.coordinates?.length === 2) {
        this.selectedLatLng = { lat: data.coordinates[0], lng: data.coordinates[1] };
        const cd = document.getElementById('coordinates-display');
        if (cd) cd.textContent = `${data.coordinates[0].toFixed(6)}, ${data.coordinates[1].toFixed(6)}`;
      }
      const photosEl = document.getElementById('location-photos');
      if (photosEl) photosEl.value = (data.photos || []).join('\n');
      this.loadTagsForLocation(data);
      const titleEl = document.querySelector('#location-modal-overlay .modal-titlebar-text');
      if (titleEl) titleEl.textContent = 'URBINDEX :: EDIT LOCATION';
      const submitBtn = document.querySelector('#location-form button[type="submit"]');
      if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Location';
      document.getElementById('location-form').dataset.editId = id;
      document.getElementById('location-form').dataset.originalCoordinates = JSON.stringify(data.coordinates || null);
      this.showAddLocationModal();
    } catch { this.showToast('Failed to load location for editing', 'error'); }
  },

  async loadUserLocations() {
    const grid = document.getElementById('locations-grid');
    if (!grid) return;
    if (!this.currentUser) {
      grid.innerHTML = `
        <div class="sign-in-prompt">
          <i class="fas fa-lock"></i>
          <h3>// SIGN IN REQUIRED</h3>
          <p class="text-muted mb-20">Create an account to start tracking your urban exploration locations</p>
          <button class="btn btn-primary" onclick="app.handleAuth()"><i class="fas fa-sign-in-alt"></i> Sign In Now</button>
        </div>`;
      return;
    }
    grid.innerHTML = '<div class="loading">Loading your locations...</div>';
    try {
      const snap = await this.db.collection('locations').where('createdBy', '==', this.currentUser.uid).where('status', '==', 'active').orderBy('createdAt', 'desc').get();
      if (snap.empty) { grid.innerHTML = '<div class="empty-state"><i class="fas fa-map-marker-alt"></i><p>No locations yet — drop your first spot from the map.</p></div>'; return; }
      this.allUserLocations = [];
      snap.forEach(doc => this.allUserLocations.push({ id: doc.id, data: doc.data() }));
      this.renderFilteredLocations();
      this.setupSearchAndFilters();
    } catch { grid.innerHTML = '<div class="error">Failed to load locations</div>'; }
  },

  setupSearchAndFilters() {
    const searchInput = document.getElementById('location-search');
    const categoryFilter = document.getElementById('category-filter');
    const riskFilter = document.getElementById('risk-filter');
    const sortFilter = document.getElementById('sort-filter');
    if (searchInput) {
      let t; searchInput.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => this.renderFilteredLocations(), 300); });
    }
    categoryFilter?.addEventListener('change', () => this.renderFilteredLocations());
    riskFilter?.addEventListener('change', () => this.renderFilteredLocations());
    sortFilter?.addEventListener('change', () => this.renderFilteredLocations());
  },

  renderFilteredLocations() {
    if (!this.allUserLocations) return;
    const search = document.getElementById('location-search')?.value.trim() || '';
    const cat = document.getElementById('category-filter')?.value || '';
    const risk = document.getElementById('risk-filter')?.value || '';
    const sort = document.getElementById('sort-filter')?.value || 'recent';

    let filtered = this.allUserLocations.filter(({ data }) => {
      const matchSearch = !search || this.fuzzyMatch([data.name, data.description, data.category, ...(data.tags || [])].join(' '), search);
      return matchSearch && (!cat || data.category === cat) && (!risk || data.riskLevel === risk);
    });
    filtered = this.sortLocations(filtered, sort);

    const grid = document.getElementById('locations-grid');
    if (!grid) return;
    if (!filtered.length) { grid.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No locations match your filters.</p></div>'; return; }

    grid.innerHTML = '';
    grid.className = 'locations-grid';
    const countEl = document.getElementById('locations-result-count');
    if (countEl) countEl.textContent = `${filtered.length} location${filtered.length !== 1 ? 's' : ''}`;
    filtered.forEach(({ id, data }) => {
      const card = document.createElement('div');
      card.className = `location-card lc-risk-${data.riskLevel || 'unknown'}`;
      const score = this.getLocationScore(data);
      const desc = data.description || '';
      const truncDesc = desc.length > 120 ? desc.substring(0, 120) + '...' : desc;
      const catIcons = { abandoned:'fa-building', industrial:'fa-industry', infrastructure:'fa-project-diagram', nature:'fa-tree', underground:'fa-level-down-alt', rooftop:'fa-city', historical:'fa-landmark', other:'fa-tag' };
      const catIcon = catIcons[data.category] || 'fa-tag';
      card.innerHTML = `
        <div class="location-header">
          <span class="lc-cat-icon lc-cat-${data.category || 'other'}"><i class="fas ${catIcon}"></i></span>
          <h4 class="lc-name">${this.escapeHtml(data.name)}</h4>
          <span class="risk risk-${data.riskLevel || 'unknown'}">${data.riskLevel || 'unknown'}</span>
        </div>
        <p class="location-card-desc">${this.escapeHtml(truncDesc)}</p>
        <div class="location-card-meta">
          <i class="fas fa-tag"></i> ${this.escapeHtml(data.category)}
          ${data.tags?.length ? ` &nbsp;<i class="fas fa-hashtag"></i> ${data.tags.slice(0,3).map(t => `<span class="card-tag">${this.escapeHtml(t)}</span>`).join('')}` : ''}
        </div>
        ${data.coordinates ? `<div class="location-card-coords"><i class="fas fa-crosshairs"></i> ${data.coordinates[0].toFixed(4)}, ${data.coordinates[1].toFixed(4)}</div>` : ''}
        <div class="location-card-score">
          <button class="rating-btn" onclick="app.rateLocation('${id}',1)" title="Upvote"><i class="fas fa-thumbs-up"></i></button>
          <span class="cz-text">Score: <span id="rating-score-${id}">${score.toFixed(1)}</span></span>
          <button class="rating-btn" onclick="app.rateLocation('${id}',-1)" title="Downvote"><i class="fas fa-thumbs-down"></i></button>
        </div>
        <div class="location-actions">
          <button class="btn btn-sm" onclick="app.showLocationDetailModal('${id}')"><i class="fas fa-eye"></i> View</button>
          <button class="btn btn-sm" onclick="app.editLocation('${id}')"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-sm btn-danger" onclick="app.deleteLocation('${id}',this)"><i class="fas fa-trash"></i></button>
          ${data.coordinates ? `<button class="btn btn-sm" onclick="app.focusMapOnLocation(${data.coordinates[0]},${data.coordinates[1]})"><i class="fas fa-map"></i> Map</button>` : ''}
        </div>`;
      grid.appendChild(card);
      this.loadLocationRating(id);
    });
  },

  getLocationScore(data) { return (data.likesCount || 0) + (data.visitCount || 0) * 0.5 + (data.commentCount || 0) * 0.3; },

  sortLocations(locs, by) {
    return [...locs].sort((a, b) => {
      switch (by) {
        case 'name': return (a.data.name || '').localeCompare(b.data.name || '');
        case 'risk': { const o = { safe:0, low:1, medium:2, high:3, extreme:4 }; return (o[b.data.riskLevel]||0) - (o[a.data.riskLevel]||0); }
        case 'score': return this.getLocationScore(b.data) - this.getLocationScore(a.data);
        default: { const ta = a.data.createdAt?.toDate?.()?.getTime() || 0; const tb = b.data.createdAt?.toDate?.()?.getTime() || 0; return tb - ta; }
      }
    });
  },

  async likeLocation(locationId) {
    if (!this.currentUser) { this.showToast('Sign in to like locations', 'warning'); return; }
    const opKey = `like-${locationId}`;
    if (this.activeOperations.has(opKey)) return;
    this.activeOperations.add(opKey);
    try {
      const ref = this.db.collection('location_likes').doc(`${this.currentUser.uid}_${locationId}`);
      await ref.set({ userId: this.currentUser.uid, locationId, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      await this.db.collection('locations').doc(locationId).update({ likesCount: firebase.firestore.FieldValue.increment(1) });
      this.showToast('Location liked!', 'success');
    } catch { this.showToast('Failed to like location', 'error'); }
    finally { this.activeOperations.delete(opKey); }
  },

  async unlikeLocation(locationId) {
    if (!this.currentUser) return;
    const opKey = `unlike-${locationId}`;
    if (this.activeOperations.has(opKey)) return;
    this.activeOperations.add(opKey);
    try {
      await this.db.collection('location_likes').doc(`${this.currentUser.uid}_${locationId}`).delete();
      await this.db.collection('locations').doc(locationId).update({ likesCount: firebase.firestore.FieldValue.increment(-1) });
    } catch { this.showToast('Failed to unlike location', 'error'); }
    finally { this.activeOperations.delete(opKey); }
  },

  async rateLocation(locationId, value) {
    if (!this.currentUser) { this.showToast('Sign in to rate locations', 'warning'); return; }
    try {
      const ratingRef = this.db.collection('ratings').doc(`${this.currentUser.uid}_${locationId}`);
      const locationRef = this.db.collection('locations').doc(locationId);

      await this.db.runTransaction(async (transaction) => {
        const ratingDoc = await transaction.get(ratingRef);
        const oldValue = ratingDoc.exists ? (ratingDoc.data().value || 0) : 0;
        const delta = value - oldValue;

        transaction.set(ratingRef, {
          userId: this.currentUser.uid,
          locationId,
          value,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (delta !== 0) {
          transaction.update(locationRef, {
            likesCount: firebase.firestore.FieldValue.increment(delta)
          });
        }
      });
      
      this.loadLocationRating(locationId);
      this.showToast(value > 0 ? 'Upvoted!' : 'Downvoted', 'success');
    } catch { this.showToast('Failed to rate location', 'error'); }
  },

  async loadLocationRating(locationId) {
    try {
      const snap = await this.db.collection('ratings').where('locationId', '==', locationId).get();
      let total = 0; snap.forEach(doc => { total += doc.data().value || 0; });
      const el = document.getElementById(`rating-score-${locationId}`);
      if (el) el.textContent = total.toFixed(1);
    } catch {}
  },

  async addComment(locationId, text) {
    if (!this.currentUser) { this.showToast('Sign in to comment', 'warning'); return; }
    if (!text?.trim()) { this.showToast('Comment cannot be empty', 'warning'); return; }
    try {
      await this.db.collection('location_comments').add({
        locationId, text: this.sanitizeInput(text.trim()),
        userId: this.currentUser.uid,
        displayName: this.currentUser.displayName || 'Explorer',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await this.db.collection('locations').doc(locationId).update({
        commentCount: firebase.firestore.FieldValue.increment(1)
      });
      this.updateUserXP(this.currentUser.uid, 'add_comment');
      this.loadLocationComments(locationId);
    } catch { this.showToast('Failed to add comment', 'error'); }
  },

  async loadLocationComments(locationId) {
    try {
      const snap = await this.db.collection('location_comments').where('locationId', '==', locationId).orderBy('createdAt', 'desc').limit(20).get();
      const container = document.getElementById(`comments-${locationId}`);
      if (!container) return;
      if (snap.empty) { container.innerHTML = '<div class="text-muted">No comments yet.</div>'; return; }
      container.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data();
        const el = document.createElement('div');
        el.className = 'comment';
        el.innerHTML = `<span class="comment-user">${this.escapeHtml(d.displayName)}</span><span class="comment-time">${this.timeAgo(d.createdAt?.toDate?.())}</span><p>${this.escapeHtml(d.text)}</p>`;
        container.appendChild(el);
      });
    } catch {}
  },

  async checkInLocation(locationId) {
    if (!this.currentUser) { this.showToast('Sign in to check in', 'warning'); this.handleAuth(); return; }
    const opKey = `checkin-${locationId}`;
    if (this.activeOperations.has(opKey)) return;
    this.activeOperations.add(opKey);
    try {
      const locationRef = this.db.collection('locations').doc(locationId);
      const visitRef = this.db.collection('location_visits').doc();

      await this.db.runTransaction(async (transaction) => {
        transaction.set(visitRef, {
          locationId, userId: this.currentUser.uid,
          displayName: this.currentUser.displayName || 'Explorer',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        transaction.update(locationRef, { visitCount: firebase.firestore.FieldValue.increment(1) });
      });

      await this.updateUserBadges(this.currentUser.uid, 'check_in');
      this.updateUserXP(this.currentUser.uid, 'check_in');
      this.showToast('Checked in!', 'success');
    } catch { this.showToast('Failed to check in', 'error'); }
    finally { this.activeOperations.delete(opKey); }
  },

  showLocationDetailModal(locationId) {
    this.db.collection('locations').doc(locationId).get().then(doc => {
      if (!doc.exists) return;
      const data = doc.data();
      const modal = document.getElementById('location-detail-modal');
      const content = document.getElementById('location-detail-content');
      if (!modal || !content) return;
      const photosHtml = data.photos?.length
        ? `<div class="detail-photos-strip">${data.photos.slice(0, 6).map((p, i) => `<img src="${this.escapeHtml(p)}" class="detail-photo-thumb" alt="photo" onclick="app.showLocationPhotoModal('${locationId}',${i})">`).join('')}</div>`
        : '';
      const tagsHtml = data.tags?.length
        ? `<div class="detail-tags">${data.tags.map(t => `<span class="card-tag">${this.escapeHtml(t)}</span>`).join('')}</div>`
        : '';
      const date = data.createdAt ? new Date(data.createdAt.toDate?.() ?? data.createdAt).toLocaleDateString() : '';
      const coords = data.coordinates?.length === 2 ? `${data.coordinates[0].toFixed(5)}, ${data.coordinates[1].toFixed(5)}` : '';
      content.innerHTML = `
        <div class="modal-header location-detail-modal-header">
          <div>
            <h3 class="location-detail-title">${this.escapeHtml(data.name || 'Location')}</h3>
            <div class="location-detail-meta">
              <span class="risk risk-${data.riskLevel || 'unknown'}">${data.riskLevel || 'unknown'}</span>
              <span class="detail-cat-chip">${this.escapeHtml(data.category || 'other')}</span>
              ${date ? `<span class="detail-date"><i class="fas fa-calendar-alt"></i> ${date}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="modal-body">
          ${photosHtml}
          <p class="location-detail-desc">${this.escapeHtml(data.description || '')}</p>
          ${tagsHtml}
          <div class="detail-stats-row">
            <span class="detail-stat"><i class="fas fa-eye"></i> ${data.visitCount || 0} visits</span>
            <span class="detail-stat"><i class="fas fa-heart"></i> ${data.likesCount || 0} likes</span>
            ${coords ? `<span class="detail-stat detail-coords"><i class="fas fa-map-pin"></i> ${coords}</span>` : ''}
          </div>
          ${this.currentUser ? `<div class="flex gap-8 location-detail-actions">
            <button class="btn btn-primary" onclick="app.checkInLocation('${locationId}')"><i class="fas fa-map-marker-alt"></i> Check In</button>
            <button class="btn" onclick="app.likeLocation('${locationId}')"><i class="fas fa-heart"></i> Like</button>
          </div>` : '<p class="text-muted small">Sign in for more actions.</p>'}
          <div class="detail-comments-section">
            <div class="detail-section-label">// COMMENTS</div>
            <div id="comments-${locationId}" class="location-detail-comments"></div>
            ${this.currentUser ? `<div class="flex gap-8 location-detail-comment-form mt-8">
              <input class="input" id="comment-input-${locationId}" placeholder="Add a comment...">
              <button class="btn btn-primary" onclick="app.addComment('${locationId}',document.getElementById('comment-input-${locationId}').value)"><i class="fas fa-paper-plane"></i></button>
            </div>` : ''}
          </div>
        </div>`;
      modal.classList.add('active');
      modal.onclick = e => { if (e.target === modal) modal.classList.remove('active'); };
      this.loadLocationComments(locationId);
    }).catch(() => this.showToast('Failed to load location details', 'error'));
  },

  initTagSystem() {
    this.selectedTags = new Set();
    this.predefinedTags = ['historic','architecture','nature','underground','hidden','photo-worthy','challenging','accessible','urban','industrial','abandoned','safe','dangerous','family-friendly','night-time','day-time','rooftop','basement','warehouse','bridge','tunnel','park','waterfront'];
    this.setupTagInput();
    this.followers = new Map(); this.following = new Map(); this.likes = new Map();
    this.ratings = new Map(); this.comments = new Map(); this.profilePosts = new Map();
    this.notifications = []; this.visits = new Map(); this.badges = new Map();
    this.routes = new Map(); this.groups = new Map(); this.missions = new Map();
    this.unreadNotifications = 0;
  },

  setupTagInput() {
    const input = document.getElementById('tag-input');
    const list = document.getElementById('predefined-tags-list');
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const t = input.value.trim(); if (t) { this.addTag(t); input.value = ''; } }
      });
      input.addEventListener('blur', () => { const t = input.value.trim(); if (t) { this.addTag(t); input.value = ''; } });
    }
    if (list) {
      list.innerHTML = '';
      this.predefinedTags.forEach(tag => {
        const el = document.createElement('span');
        el.className = 'predefined-tag'; el.textContent = tag;
        el.addEventListener('click', () => this.togglePredefinedTag(tag, el));
        list.appendChild(el);
      });
    }
  },

  addTag(tag) {
    const clean = this.sanitizeInput(tag).toLowerCase();
    if (clean.length < 2 || clean.length > 20) { this.showToast('Tags must be 2-20 characters long', 'warning'); return; }
    if (this.selectedTags.has(clean)) { this.showToast('Tag already added', 'info'); return; }
    if (this.selectedTags.size >= 10) { this.showToast('Maximum 10 tags allowed', 'warning'); return; }
    this.selectedTags.add(clean); this.renderSelectedTags();
  },

  removeTag(tag) {
    this.selectedTags.delete(tag); this.renderSelectedTags();
    document.querySelectorAll('.predefined-tag').forEach(el => { if (el.textContent === tag) el.classList.remove('selected'); });
  },

  togglePredefinedTag(tag, el) {
    if (this.selectedTags.has(tag)) { this.removeTag(tag); el.classList.remove('selected'); }
    else { this.addTag(tag); el.classList.add('selected'); }
  },

  renderSelectedTags() {
    const container = document.getElementById('selected-tags');
    if (!container) return;
    container.innerHTML = '';
    this.selectedTags.forEach(tag => {
      const el = document.createElement('span');
      el.className = 'tag remove';
      el.innerHTML = `${tag} <i class="fas fa-times"></i>`;
      el.addEventListener('click', () => this.removeTag(tag));
      container.appendChild(el);
    });
  },

  getSelectedTags() { return Array.from(this.selectedTags); },

  clearTags() {
    this.selectedTags.clear(); this.renderSelectedTags();
    document.querySelectorAll('.predefined-tag').forEach(el => el.classList.remove('selected'));
  },

  loadTagsForLocation(data) {
    this.clearTags();
    if (Array.isArray(data.tags)) { data.tags.forEach(t => this.selectedTags.add(t)); this.renderSelectedTags(); }
  },

  announceFormErrors(errors) {
    if (errors.length) this.announceToScreenReader(`Form validation errors: ${errors.map(e => e.message).join(', ')}`, 'assertive');
  },

};
