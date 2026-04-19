export const locationsMethods = {
  showAddLocationModal() {
    if (!this.currentUser) {
      if (confirm('Sign in required to add locations. Would you like to sign in now?')) this.handleAuth();
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
    const title = document.querySelector('#location-modal-overlay h3');
    if (title) title.textContent = 'Add Location';
    const btn = document.querySelector('#location-form button[type="submit"]');
    if (btn) btn.textContent = 'Save';
    this.selectedLatLng = null;
    const coordsDisplay = document.getElementById('coordinates-display');
    if (coordsDisplay) {
      coordsDisplay.textContent = 'Click on map or use address to set location';
      coordsDisplay.style.color = 'var(--yellow-dim)';
    }
    const addrEl = document.getElementById('location-address');
    if (addrEl) addrEl.value = '';
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
    if (name && !/^[a-zA-Z0-9\s\-_.,!?()\[\]]+$/.test(name)) errs.push('Location name contains invalid characters');

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

    if (errs.length) { this.showToast(errs.join('. '), 'warning'); return; }

    this.activeOperations.add(opKey);
    const btn = e.target.querySelector('button[type="submit"]');
    const orig = btn.textContent; btn.textContent = 'Saving...'; btn.disabled = true;

    const payload = {
      name: this.sanitizeInput(name),
      description: this.sanitizeInput(description),
      category: document.getElementById('location-category').value,
      riskLevel: document.getElementById('location-risk').value,
      address: this.sanitizeInput(document.getElementById('location-address').value.trim()),
      tags,
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
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        payload.status = 'active';
        await this.db.collection('locations').add(payload);
        this.showToast('Location added successfully!', 'success');
        await this.updateUserBadges(this.currentUser.uid, 'add_location');
      }
      this.hideModal();
      this.loadStats();
      if (document.getElementById('locations-view')?.classList.contains('active')) this.loadUserLocations();
    } catch (err) {
      const msgs = { 'permission-denied': 'You do not have permission to modify this location', 'not-found': 'Location not found' };
      this.showToast(msgs[err.code] || 'Failed to save location', 'error');
    } finally { btn.textContent = orig; btn.disabled = false; this.activeOperations.delete(opKey); }
  },

  async deleteLocation(id) {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) return;
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
      document.getElementById('location-risk').value = data.riskLevel || 'moderate';
      if (data.address) document.getElementById('location-address').value = data.address;
      if (data.coordinates?.length === 2) {
        this.selectedLatLng = { lat: data.coordinates[0], lng: data.coordinates[1] };
        const cd = document.getElementById('coordinates-display');
        if (cd) cd.textContent = `${data.coordinates[0].toFixed(6)}, ${data.coordinates[1].toFixed(6)}`;
      }
      this.loadTagsForLocation(data);
      document.querySelector('#location-modal-overlay h3').textContent = 'Edit Location';
      document.querySelector('#location-form button[type="submit"]').textContent = 'Update Location';
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
        <div style="text-align:center;padding:48px;">
          <i class="fas fa-lock" style="font-size:3rem;color:var(--text-muted);margin-bottom:16px;display:block;"></i>
          <h3 style="color:var(--text);margin-bottom:12px;">// SIGN IN REQUIRED</h3>
          <p style="color:var(--text-muted);margin-bottom:20px;">Create an account to start tracking your urban exploration locations</p>
          <button class="btn btn-primary" onclick="app.handleAuth()"><i class="fas fa-sign-in-alt"></i> Sign In Now</button>
        </div>`;
      return;
    }
    grid.innerHTML = '<div class="loading">Loading your locations...</div>';
    try {
      const snap = await this.db.collection('locations').where('createdBy', '==', this.currentUser.uid).where('status', '==', 'active').orderBy('createdAt', 'desc').get();
      if (snap.empty) { grid.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-muted);">[ NO LOCATIONS ] — Add your first location!</div>'; return; }
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
    if (!filtered.length) { grid.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-muted);">[ NO RESULTS ] — No locations match your criteria.</div>'; return; }

    grid.innerHTML = '';
    grid.className = 'locations-grid';
    filtered.forEach(({ id, data }) => {
      const card = document.createElement('div');
      card.className = 'location-card';
      const score = this.getLocationScore(data);
      card.innerHTML = `
        <div class="location-header">
          <h4>${this.escapeHtml(data.name)}</h4>
          <span class="risk risk-${data.riskLevel}">${data.riskLevel}</span>
        </div>
        <p style="color:var(--text-dim);margin-bottom:12px;">${this.escapeHtml(data.description)}</p>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px;">
          <i class="fas fa-tag"></i> ${this.escapeHtml(data.category)}
          ${data.tags?.length ? ` • <i class="fas fa-tags"></i> ${data.tags.slice(0,3).map(t => this.escapeHtml(t)).join(', ')}` : ''}
          ${data.coordinates ? ` • <i class="fas fa-map-marker-alt"></i> ${data.coordinates[0].toFixed(4)}, ${data.coordinates[1].toFixed(4)}` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <button class="rating-btn" onclick="app.rateLocation('${id}',1)" title="Upvote"><i class="fas fa-thumbs-up"></i></button>
          <span class="cz-text">Score: <span id="rating-score-${id}">${score.toFixed(1)}</span></span>
          <button class="rating-btn" onclick="app.rateLocation('${id}',-1)" title="Downvote"><i class="fas fa-thumbs-down"></i></button>
        </div>
        <div class="location-actions">
          <button class="btn" onclick="app.editLocation('${id}')"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn" style="background:var(--red-alert);color:#000;" onclick="app.deleteLocation('${id}')"><i class="fas fa-trash"></i> Delete</button>
          <button class="btn" onclick="app.focusMapOnLocation(${data.coordinates?.[0]||0},${data.coordinates?.[1]||0})"><i class="fas fa-map"></i> Map</button>
        </div>`;
      grid.appendChild(card);
      this.loadLocationRating(id);
    });
    this.updateMapMarkers(filtered);
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
      const ref = this.db.collection('ratings').doc(`${this.currentUser.uid}_${locationId}`);
      await ref.set({ userId: this.currentUser.uid, locationId, value, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      this.loadLocationRating(locationId);
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
      this.loadLocationComments(locationId);
    } catch { this.showToast('Failed to add comment', 'error'); }
  },

  async loadLocationComments(locationId) {
    try {
      const snap = await this.db.collection('location_comments').where('locationId', '==', locationId).orderBy('createdAt', 'desc').limit(20).get();
      const container = document.getElementById(`comments-${locationId}`);
      if (!container) return;
      if (snap.empty) { container.innerHTML = '<div style="color:var(--text-muted);">No comments yet.</div>'; return; }
      container.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data();
        const el = document.createElement('div');
        el.className = 'comment';
        el.innerHTML = `<strong>${this.escapeHtml(d.displayName)}</strong> <span style="color:var(--text-muted);font-size:0.85rem;">${this.timeAgo(d.createdAt?.toDate?.())}</span><p>${this.escapeHtml(d.text)}</p>`;
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
      await this.db.collection('location_visits').add({
        locationId, userId: this.currentUser.uid,
        displayName: this.currentUser.displayName || 'Explorer',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await this.db.collection('locations').doc(locationId).update({ visitCount: firebase.firestore.FieldValue.increment(1) });
      await this.updateUserBadges(this.currentUser.uid, 'check_in');
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
      const riskColor = this.getRiskColor(data.riskLevel);
      content.innerHTML = `
        <div class="modal-header"><h3>${this.escapeHtml(data.name || 'Location')}</h3></div>
        <div style="padding:16px;">
          <div style="margin-bottom:8px;"><span style="background:${riskColor};color:#000;padding:2px 8px;font-size:0.8rem;">${data.riskLevel || 'unknown'}</span> <span style="color:var(--text-muted);font-size:0.85rem;">${this.escapeHtml(data.category || '')}</span></div>
          <p style="margin-bottom:12px;">${this.escapeHtml(data.description || '')}</p>
          ${data.tags?.length ? `<div style="margin-bottom:12px;">${data.tags.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join(' ')}</div>` : ''}
          ${this.currentUser ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
            <button class="btn btn-primary" onclick="app.checkInLocation('${locationId}')"><i class="fas fa-map-marker-alt"></i> Check In</button>
            <button class="btn" onclick="app.likeLocation('${locationId}')"><i class="fas fa-heart"></i> Like</button>
          </div>` : '<p style="color:var(--text-muted);">Sign in for more actions.</p>'}
          <div id="comments-${locationId}" style="margin-top:16px;"></div>
          ${this.currentUser ? `<div style="margin-top:8px;display:flex;gap:8px;">
            <input class="input" id="comment-input-${locationId}" placeholder="Add a comment..." style="flex:1;">
            <button class="btn btn-primary" onclick="app.addComment('${locationId}',document.getElementById('comment-input-${locationId}').value)">Post</button>
          </div>` : ''}
        </div>`;
      modal.classList.add('active');
      this.loadLocationComments(locationId);
    }).catch(() => this.showToast('Failed to load location details', 'error'));
  },

  // Tag system
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

  validateFormField(input, errorId, msg) {
    const el = document.getElementById(errorId);
    if (msg) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', errorId);
      if (el) { el.textContent = msg; el.style.display = 'block'; }
      return false;
    }
    input.setAttribute('aria-invalid', 'false');
    input.removeAttribute('aria-describedby');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
    return true;
  },
};
