export const profileMethods = {
  async loadProfile(userId = null) {
    const content = document.getElementById('profile-content');
    if (!content) return;
    const targetId = userId || this.currentUser?.uid;
    const isOwn = targetId === this.currentUser?.uid;

    if (!targetId) {
      content.innerHTML = `
        <div style="text-align:center;padding:80px 20px;">
          <i class="fas fa-user-lock" style="font-size:4rem;color:var(--text-muted);margin-bottom:24px;display:block;"></i>
          <h3>// SIGN IN REQUIRED</h3>
          <p style="color:var(--text-muted);margin-bottom:24px;">Create an account to build your explorer profile and track your locations.</p>
          <button class="btn btn-primary" onclick="app.handleAuth()"><i class="fas fa-sign-in-alt"></i> Sign In / Register</button>
        </div>`;
      return;
    }

    try {
      content.innerHTML = '<div class="loading">Loading profile...</div>';
      const [userDoc, snap] = await Promise.all([
        this.db.collection('users').doc(targetId).get(),
        this.db.collection('locations').where('createdBy', '==', targetId).where('status', '==', 'active').get(),
      ]);
      const ud = userDoc.exists ? userDoc.data() : {};
      const locs = [];
      snap.forEach(doc => locs.push({ id: doc.id, ...doc.data() }));
      const total = locs.length;
      const name = ud.displayName || ud.email || 'Urban Explorer';
      const avatar = ud.photoURL || null;
      const bio = ud.bio || '';
      const joined = ud.createdAt ? new Date(ud.createdAt.toDate()).toLocaleDateString() : 'Recently';

      const bioHtml = bio
        ? `<p class="cz-text" style="color:var(--text-dim);">${this.escapeHtml(bio)}</p>`
        : `<p class="cz-text" style="color:var(--text-muted);font-style:italic;">${isOwn ? 'Add a short field note so others know your style.' : 'No bio shared yet.'}</p>`;

      const highlights = locs.slice(0, 4).map(loc => {
        const desc = typeof loc.description === 'string' ? loc.description : '';
        const risk = loc.riskLevel || 'unknown';
        const coords = Array.isArray(loc.coordinates) ? `<span style="color:var(--text-muted);font-size:0.8rem;"><i class="fas fa-location-arrow"></i> ${loc.coordinates[0].toFixed(4)}, ${loc.coordinates[1].toFixed(4)}</span>` : '';
        return `<div class="profile-highlight">
          <div style="display:flex;justify-content:space-between;gap:8px;">
            <h4 style="margin:0;">${this.escapeHtml(loc.name || 'Untitled')}</h4>
            <span class="risk risk-${risk}">${risk}</span>
          </div>
          <div style="color:var(--text-dim);font-size:0.9rem;">${this.escapeHtml(desc.substring(0, 90))}${desc.length > 90 ? '...' : ''}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:var(--text-muted);font-size:0.85rem;"><i class="fas fa-tag"></i> ${this.escapeHtml(loc.category || 'uncategorized')}</span>
            ${coords}
          </div>
        </div>`;
      }).join('') || `<div class="profile-highlight" style="text-align:center;color:var(--text-muted);">${isOwn ? 'No locations yet. Drop your first spot from the map.' : 'No locations to display yet.'}</div>`;

      const timeline = locs.slice(0, 4).map(loc => {
        const desc = typeof loc.description === 'string' ? loc.description : '';
        const ts = loc.createdAt?.toDate ? this.timeAgo(loc.createdAt.toDate()) : 'Recently';
        return `<li class="timeline-item">
          <div class="timeline-dot"></div>
          <div>
            <div style="font-weight:700;">${this.escapeHtml(loc.name || 'New location')}</div>
            <div style="color:var(--text-dim);font-size:0.9rem;">${this.escapeHtml(desc.substring(0, 80))}${desc.length > 80 ? '...' : ''}</div>
            <div style="color:var(--text-muted);font-size:0.8rem;"><i class="fas fa-clock"></i> ${ts}</div>
          </div>
        </li>`;
      }).join('') || `<li class="timeline-item"><div class="timeline-dot"></div><div style="color:var(--text-muted);">${isOwn ? 'Get your first ping in.' : 'No check-ins yet.'}</div></li>`;

      const links = (Array.isArray(ud.links) ? ud.links.filter(Boolean) : []);
      const linksHtml = links.length ? links.map(l => `<a class="btn" href="${this.escapeHtml(l)}" target="_blank" rel="noopener" style="width:fit-content;"><i class="fas fa-external-link-alt"></i> ${this.escapeHtml(l)}</a>`).join('') : `<div style="color:var(--text-muted);">No links shared.</div>`;

      const gallery = (Array.isArray(ud.gallery) ? ud.gallery.filter(Boolean) : []);
      const galleryHtml = gallery.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">${gallery.map(s => `<div style="border:1px solid var(--border);background:var(--black-panel);padding:4px;"><img src="${this.escapeHtml(s)}" alt="Gallery" style="width:100%;height:120px;object-fit:cover;display:block;"></div>`).join('')}</div>` : `<div style="color:var(--text-muted);">No gallery images yet.</div>`;

      content.innerHTML = `
        <div class="profile-shell">
          <section class="panel profile-hero">
            <div class="profile-avatar">${avatar ? `<img src="${this.escapeHtml(avatar)}" alt="${this.escapeHtml(name)}" style="width:100%;height:100%;object-fit:cover;">` : `<span>${this.escapeHtml(name.charAt(0).toUpperCase())}</span>`}</div>
            <div class="profile-meta">
              <div class="chip live"><i class="fas fa-id-card"></i> Explorer Dossier</div>
              <h2>${this.escapeHtml(name)}</h2>
              ${bioHtml}
              <div class="meta-chips" style="margin-top:10px;">
                <span class="chip"><i class="fas fa-calendar-alt"></i> Joined ${joined}</span>
                <span class="chip"><i class="fas fa-map-pin"></i> ${total} locations</span>
              </div>
            </div>
            <div class="profile-actions">
              ${isOwn ? `
                <button class="btn btn-primary" onclick="app.showEditProfile()"><i class="fas fa-edit"></i> Edit Profile</button>
                <button class="btn" onclick="app.showAddLocationModal()"><i class="fas fa-plus"></i> Add Location</button>
                <button class="btn" onclick="app.viewUserLocations('${targetId}')"><i class="fas fa-map-marked-alt"></i> Locations</button>
              ` : `
                <button class="btn btn-primary" id="follow-btn-${targetId}" onclick="app.toggleFollow('${targetId}')"><i class="fas fa-user-plus"></i> Follow</button>
                <button class="btn" onclick="app.messageUser('${targetId}')"><i class="fas fa-envelope"></i> Message</button>
                <button class="btn" onclick="app.viewUserLocations('${targetId}')"><i class="fas fa-map-marked-alt"></i> Locations</button>
              `}
            </div>
          </section>

          <section class="panel profile-stats">
            <div class="stat-grid">
              <div class="stat-card highlight"><div class="stat-label">Locations</div><div class="stat-value">${total}</div></div>
              <div class="stat-card"><div class="stat-label">Followers</div><div class="stat-value" id="profile-followers-count">--</div></div>
              <div class="stat-card"><div class="stat-label">Following</div><div class="stat-value" id="profile-following-count">--</div></div>
              <div class="stat-card"><div class="stat-label">Likes</div><div class="stat-value" id="profile-likes-count">--</div></div>
              <div class="stat-card"><div class="stat-label">Visits</div><div class="stat-value" id="profile-visits-count">--</div></div>
              <div class="stat-card"><div class="stat-label">Badges</div><div class="stat-value" id="profile-badges-count">--</div></div>
            </div>
          </section>

          <div class="profile-grid">
            <section class="panel profile-card">
              <h3><i class="fas fa-map-marked-alt"></i> Location Highlights</h3>
              <div class="highlight-grid">${highlights}</div>
              ${total > 4 ? `<button class="btn" style="margin-top:10px;" onclick="app.showView('locations')">View all ${total}</button>` : ''}
            </section>
            <section class="panel profile-card">
              <h3><i class="fas fa-stream"></i> Activity Log</h3>
              <ul class="timeline">${timeline}</ul>
            </section>
          </div>

          <div class="profile-grid">
            <section class="panel profile-card"><h3><i class="fas fa-link"></i> Links</h3><div style="display:flex;flex-direction:column;gap:8px;">${linksHtml}</div></section>
            <section class="panel profile-card"><h3><i class="fas fa-images"></i> Gallery</h3>${galleryHtml}</section>
          </div>

          <section class="panel profile-card">
            <h3><i class="fas fa-bullhorn"></i> Posts</h3>
            ${isOwn ? `<div style="margin-bottom:12px;"><textarea class="textarea" id="profile-post-input" rows="3" placeholder="Share an update or drop intel..."></textarea><button class="btn btn-primary" style="margin-top:8px;" onclick="app.submitProfilePost('${targetId}')"><i class="fas fa-paper-plane"></i> Post</button></div>` : ''}
            <div id="profile-posts-list" class="loading">Loading posts...</div>
          </section>

          <section class="panel profile-card">
            <h3><i class="fas fa-comments"></i> Comments</h3>
            ${this.currentUser ? `<div style="margin-bottom:12px;"><textarea class="textarea" id="profile-comment-input" rows="3" placeholder="Leave a note..."></textarea><button class="btn btn-primary" style="margin-top:8px;" onclick="app.submitProfileComment('${targetId}')"><i class="fas fa-comment"></i> Comment</button></div>` : '<div style="color:var(--text-muted);">Sign in to comment.</div>'}
            <div id="profile-comments-list" class="loading">Loading comments...</div>
          </section>

          <section class="panel profile-card">
            <h3><i class="fas fa-award"></i> Badges &amp; Cred</h3>
            <div id="user-badges" class="achievement-grid"></div>
          </section>
        </div>`;

      this.loadUserSocialStats(targetId);
      this.loadProfilePosts(targetId);
      this.loadProfileComments(targetId);
    } catch { content.innerHTML = '<div class="error">FAILED TO LOAD PROFILE</div>'; }
  },

  showEditProfile() {
    if (!this.currentUser) { this.showToast('Please sign in first', 'warning'); return; }
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) return;
    this.db.collection('users').doc(this.currentUser.uid).get().then(doc => {
      const d = doc.exists ? doc.data() : {};
      document.getElementById('profile-display-name').value = d.displayName || '';
      document.getElementById('profile-bio').value = d.bio || '';
      document.getElementById('profile-photo-url').value = d.photoURL || '';
      document.getElementById('profile-links').value = (d.links || []).join('\n');
      document.getElementById('profile-gallery').value = (d.gallery || []).join('\n');
    }).catch(() => {});
    modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => document.getElementById('profile-display-name')?.focus(), 100);
  },

  showEditProfileModal() { return this.showEditProfile(); },

  hideEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) { modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); document.getElementById('edit-profile-form')?.reset(); }
  },

  async handleEditProfile(e) {
    e.preventDefault();
    if (!this.currentUser) { this.showToast('Please sign in first', 'warning'); return; }
    const displayName = document.getElementById('profile-display-name').value.trim();
    const bio = document.getElementById('profile-bio').value.trim();
    const photoURL = document.getElementById('profile-photo-url').value.trim();
    const links = (document.getElementById('profile-links').value || '').split(/\n+/).map(l => this.sanitizeInput(l.trim())).filter(Boolean);
    const gallery = (document.getElementById('profile-gallery').value || '').split(/\n+/).map(l => this.sanitizeInput(l.trim())).filter(Boolean);
    const btn = document.getElementById('profile-submit-btn');
    const orig = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; btn.disabled = true;
    try {
      await this.db.collection('users').doc(this.currentUser.uid).set({ displayName: displayName || null, bio: bio || null, photoURL: photoURL || null, links, gallery, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      if (displayName || photoURL) await this.currentUser.updateProfile({ displayName: displayName || null, photoURL: photoURL || null });
      this.hideEditProfileModal();
      this.showToast('Profile updated successfully!', 'success');
      this.loadProfile();
    } catch { this.showToast('Failed to update profile. Please try again.', 'error'); }
    finally { btn.innerHTML = '<i class="fas fa-save"></i> Save Changes'; btn.disabled = false; }
  },

  async loadUserSocialStats(userId) {
    try {
      const [followers, following, locs] = await Promise.all([
        this.db.collection('user_followers').where('followingId', '==', userId).get(),
        this.db.collection('user_followers').where('followerId', '==', userId).get(),
        this.db.collection('locations').where('createdBy', '==', userId).get(),
      ]);
      const locIds = locs.docs.map(d => d.id);
      let likes = 0, visits = 0;
      if (locIds.length) {
        const [likesSnap, visitsSnap] = await Promise.all([
          this.db.collection('location_likes').where('locationId', 'in', locIds.slice(0, 10)).get(),
          this.db.collection('location_visits').where('locationId', 'in', locIds.slice(0, 10)).get(),
        ]);
        likes = likesSnap.size; visits = visitsSnap.size;
      }
      const badgesSnap = await this.db.collection('user_badges').where('userId', '==', userId).get();
      const set = id => document.getElementById(id);
      if (set('profile-followers-count')) set('profile-followers-count').textContent = followers.size;
      if (set('profile-following-count')) set('profile-following-count').textContent = following.size;
      if (set('profile-likes-count')) set('profile-likes-count').textContent = likes;
      if (set('profile-visits-count')) set('profile-visits-count').textContent = visits;
      if (set('profile-badges-count')) set('profile-badges-count').textContent = badgesSnap.size;
      this.renderUserBadges(badgesSnap.docs.map(d => d.data()));
    } catch {}
  },

  renderUserBadges(badges) {
    const container = document.getElementById('user-badges');
    if (!container) return;
    if (!badges.length) { container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);"><i class="fas fa-trophy" style="font-size:2rem;opacity:0.5;display:block;margin-bottom:8px;"></i><p>No badges yet. Start exploring!</p></div>'; return; }
    container.innerHTML = badges.map(b => `
      <div class="achievement-tag">
        <div class="tag-icon"><i class="fas fa-trophy"></i></div>
        <div class="tag-name">${this.getBadgeName(b.badgeId)}</div>
        <div class="tag-desc">${this.getBadgeDescription(b.badgeId)}</div>
      </div>`).join('');
  },

  getBadgeName(id) {
    return { first_location:'First Explorer', mapper_10:'Mapper', mapper_50:'Master Mapper', first_visit:'First Check-in', explorer_10:'Explorer', explorer_50:'Veteran Explorer', commentator:'Commentator', social_butterfly:'Social Butterfly', photographer:'Photographer' }[id] || id;
  },

  getBadgeDescription(id) {
    return { first_location:'Added your first location', mapper_10:'Added 10 locations', mapper_50:'Added 50 locations', first_visit:'First check-in', explorer_10:'Visited 10 locations', explorer_50:'Visited 50 locations', commentator:'Left 10 comments', social_butterfly:'Followed 10 explorers', photographer:'Uploaded 5 photos' }[id] || 'Achievement unlocked';
  },

  async uploadProfilePhoto() {
    const fileInput = document.getElementById('profile-photo-upload');
    const btn = document.getElementById('upload-photo-btn');
    const progress = document.getElementById('photo-progress');
    const bar = document.getElementById('photo-progress-bar');
    const txt = document.getElementById('photo-progress-text');
    if (!fileInput?.files?.length) { this.showToast('Please select a photo to upload', 'warning'); return; }
    const file = fileInput.files[0];
    try { this.validateImageFile(file); } catch (err) { this.showToast(err.message, 'error'); return; }
    if (!this.currentUser) { this.showToast('Please sign in to upload photos', 'warning'); return; }
    const opKey = 'photo-upload';
    if (this.activeOperations.has(opKey)) return;
    this.activeOperations.add(opKey);
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    if (progress) progress.style.display = 'block';
    try {
      const CLOUD = window.CLOUDINARY_CLOUD_NAME || 'djvremaue';
      const PRESET = window.CLOUDINARY_UPLOAD_PRESET || 'preset_1';
      const fd = new FormData();
      fd.append('file', file); fd.append('upload_preset', PRESET);
      fd.append('folder', `urbindex/profile-photos/${this.currentUser.uid}`);
      fd.append('public_id', `${this.currentUser.uid}_${Date.now()}`);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`);
      xhr.upload.onprogress = e => { if (e.lengthComputable) { const p = Math.round(e.loaded/e.total*100); if (bar) bar.style.width = p+'%'; if (txt) txt.textContent = `Uploading... ${p}%`; } };
      xhr.onload = async () => {
        try {
          if (xhr.status !== 200) throw new Error(`Upload failed: ${xhr.status}`);
          const r = JSON.parse(xhr.responseText);
          const url = r.secure_url;
          await this.db.collection('users').doc(this.currentUser.uid).set({ photoURL: url, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
          try { await this.currentUser.updateProfile({ photoURL: url }); } catch {}
          const urlInput = document.getElementById('profile-photo-url');
          if (urlInput) urlInput.value = url;
          this.showToast('Profile photo updated!', 'success');
          if (document.getElementById('profile-view')?.classList.contains('active')) this.loadProfile();
        } catch { this.showToast('Upload failed — check your Cloudinary config', 'error'); }
        finally { this.activeOperations.delete(opKey); btn.disabled = false; btn.innerHTML = '<i class="fas fa-upload"></i> Upload'; setTimeout(() => { if (progress) progress.style.display = 'none'; if (bar) bar.style.width = '0%'; }, 1500); }
      };
      xhr.onerror = () => { this.showToast('Network error during upload', 'error'); this.activeOperations.delete(opKey); btn.disabled = false; btn.innerHTML = '<i class="fas fa-upload"></i> Upload'; if (progress) progress.style.display = 'none'; };
      xhr.send(fd);
    } catch { this.showToast('Failed to start upload', 'error'); this.activeOperations.delete(opKey); btn.disabled = false; btn.innerHTML = '<i class="fas fa-upload"></i> Upload'; if (progress) progress.style.display = 'none'; }
  },

  validateImageFile(file) {
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) throw new Error('Please select a valid image file (JPG, PNG, WEBP, or GIF)');
    if (file.size > 5 * 1024 * 1024) throw new Error('File size must be less than 5MB');
    if ([/[<>"'&]/, /\.\./, /\/\//].some(p => p.test(file.name))) throw new Error('Invalid file name');
    return true;
  },

  async viewUserLocations(userId) {
    const modal = document.getElementById('user-locations-modal');
    const list = document.getElementById('user-locations-list');
    const title = document.getElementById('user-locations-title');
    if (!modal || !list || !title) return;
    modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false');
    list.innerHTML = '<div class="loading">Loading...</div>'; title.textContent = 'User Locations';
    if (!userId) { list.innerHTML = '<div class="error">No user specified</div>'; return; }
    try {
      const snap = await this.db.collection('locations').where('createdBy', '==', userId).where('status', '==', 'active').get();
      if (snap.empty) { list.innerHTML = '<div style="color:var(--text-muted);padding:16px;">No locations to display.</div>'; return; }
      list.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data();
        const [lat, lng] = Array.isArray(d.coordinates) ? d.coordinates : [null, null];
        const card = document.createElement('div'); card.className = 'location-card';
        card.innerHTML = `
          <div class="location-header"><h4>${this.escapeHtml(d.name || 'Unnamed')}</h4><span class="risk risk-${d.riskLevel || 'unknown'}">${d.riskLevel || 'unknown'}</span></div>
          <p style="color:var(--text-dim);margin-bottom:10px;">${this.escapeHtml(d.description || 'No description')}</p>
          ${lat != null ? `<button class="btn" style="font-size:0.8rem;" onclick="app.focusMapOnLocation(${lat},${lng})"><i class="fas fa-location-arrow"></i> View on Map</button>` : ''}`;
        list.appendChild(card);
      });
    } catch { list.innerHTML = '<div class="error">Failed to load locations</div>'; }
  },

  hideUserLocationsModal() {
    const modal = document.getElementById('user-locations-modal');
    if (modal) { modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); }
  },

  async messageUser(userId) {
    if (!this.currentUser) { this.showToast('Sign in to message explorers', 'warning'); this.handleAuth(); return; }
    if (!userId) { this.showToast('No recipient selected', 'error'); return; }
    const body = this.sanitizeInput(prompt('Send a quick message:') || '');
    if (!body) { this.showToast('Message cannot be empty', 'warning'); return; }
    try {
      await this.db.collection('user_messages').add({ toUserId: userId, fromUserId: this.currentUser.uid, body, createdAt: firebase.firestore.FieldValue.serverTimestamp(), read: false });
      this.showToast('Message sent', 'success');
    } catch { this.showToast('Failed to send message', 'error'); }
  },

  async submitProfilePost(userId) {
    if (!this.currentUser) return;
    const input = document.getElementById('profile-post-input');
    const text = this.sanitizeInput(input?.value?.trim() || '');
    if (!text) { this.showToast('Post cannot be empty', 'warning'); return; }
    try {
      await this.db.collection('forum').add({ body: text, createdBy: this.currentUser.uid, targetUserId: userId, displayName: this.currentUser.displayName || 'Explorer', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      if (input) input.value = '';
      this.showToast('Post added!', 'success'); this.loadProfilePosts(userId);
    } catch { this.showToast('Failed to add post', 'error'); }
  },

  async loadProfilePosts(userId) {
    const container = document.getElementById('profile-posts-list');
    if (!container) return;
    try {
      const snap = await this.db.collection('forum').where('targetUserId', '==', userId).orderBy('createdAt', 'desc').limit(10).get();
      if (snap.empty) { container.innerHTML = '<div style="color:var(--text-muted);">No posts yet.</div>'; return; }
      container.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data(); const el = document.createElement('div'); el.className = 'activity-item';
        el.innerHTML = `<div class="activity-content"><strong>${this.escapeHtml(d.displayName)}</strong><p>${this.escapeHtml(d.body)}</p><div style="color:var(--text-muted);font-size:0.8rem;">${this.timeAgo(d.createdAt?.toDate?.())}</div></div>`;
        container.appendChild(el);
      });
    } catch { container.innerHTML = '<div class="error">Failed to load posts</div>'; }
  },

  async submitProfileComment(userId) {
    if (!this.currentUser) return;
    const input = document.getElementById('profile-comment-input');
    const text = this.sanitizeInput(input?.value?.trim() || '');
    if (!text) { this.showToast('Comment cannot be empty', 'warning'); return; }
    try {
      await this.db.collection('comments').add({ text, createdBy: this.currentUser.uid, targetUserId: userId, displayName: this.currentUser.displayName || 'Explorer', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      if (input) input.value = '';
      this.showToast('Comment added!', 'success'); this.loadProfileComments(userId);
    } catch { this.showToast('Failed to add comment', 'error'); }
  },

  async loadProfileComments(userId) {
    const container = document.getElementById('profile-comments-list');
    if (!container) return;
    try {
      const snap = await this.db.collection('comments').where('targetUserId', '==', userId).orderBy('createdAt', 'desc').limit(10).get();
      if (snap.empty) { container.innerHTML = '<div style="color:var(--text-muted);">No comments yet.</div>'; return; }
      container.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data(); const el = document.createElement('div'); el.className = 'activity-item';
        el.innerHTML = `<div class="activity-content"><strong>${this.escapeHtml(d.displayName)}</strong><p>${this.escapeHtml(d.text)}</p><div style="color:var(--text-muted);font-size:0.8rem;">${this.timeAgo(d.createdAt?.toDate?.())}</div></div>`;
        container.appendChild(el);
      });
    } catch { container.innerHTML = '<div class="error">Failed to load comments</div>'; }
  },
};
