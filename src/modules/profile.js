export const profileMethods = {
  switchIntelTab(btn, showId, hideId) {
    document.querySelectorAll('.intel-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(showId)?.classList.remove('hidden');
    document.getElementById(hideId)?.classList.add('hidden');
  },

  switchProfileTab(btn, tabId) {
    document.querySelectorAll('.profile-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.profile-tab-pane').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(tabId)?.classList.remove('hidden');
  },

  async loadProfile(userId = null) {
    const content = document.getElementById('profile-content');
    if (!content) return;
    const targetId = userId || this.currentUser?.uid;
    const isOwn = targetId === this.currentUser?.uid;

    if (!targetId) {
      content.innerHTML = `
        <div class="sign-in-prompt">
          <i class="fas fa-user-lock"></i>
          <h3>// SIGN IN REQUIRED</h3>
          <p class="text-muted mb-24">Create an account to build your explorer profile and track your locations.</p>
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
      const city = ud.city || '';
      const specialty = ud.specialty || '';
      const gear = ud.gear || '';
      const pronouns = ud.pronouns || '';

      // --- Overview tab ---
      const bioHtml = bio
        ? `<p class="cz-text text-dim">${this.escapeHtml(bio)}</p>`
        : `<p class="cz-text text-muted text-italic">${isOwn ? 'Add a short field note so others know your style.' : 'No bio shared yet.'}</p>`;

      const metaFields = [
        city      && `<div class="profile-meta-field"><span class="profile-meta-label"><i class="fas fa-map-marker-alt"></i> City</span><span>${this.escapeHtml(city)}</span></div>`,
        specialty && `<div class="profile-meta-field"><span class="profile-meta-label"><i class="fas fa-crosshairs"></i> Specialty</span><span>${this.escapeHtml(specialty)}</span></div>`,
        gear      && `<div class="profile-meta-field"><span class="profile-meta-label"><i class="fas fa-toolbox"></i> Gear</span><span>${this.escapeHtml(gear)}</span></div>`,
        pronouns  && `<div class="profile-meta-field"><span class="profile-meta-label"><i class="fas fa-user"></i> Pronouns</span><span>${this.escapeHtml(pronouns)}</span></div>`,
      ].filter(Boolean).join('');

      const safeLinks = (Array.isArray(ud.links) ? ud.links.filter(Boolean) : []).filter(l => /^https?:\/\//i.test(l));
      const linksHtml = safeLinks.length
        ? safeLinks.map(l => `<a class="btn w-fit" href="${this.escapeHtml(l)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> ${this.escapeHtml(l.replace(/^https?:\/\//, '').substring(0, 40))}</a>`).join('')
        : `<div class="text-muted text-italic">No links shared.</div>`;

      // --- Spots tab ---
      const highlights = locs.slice(0, 12).map(loc => {
        const desc = typeof loc.description === 'string' ? loc.description : '';
        const risk = loc.riskLevel || 'unknown';
        return `<div class="profile-highlight" onclick="app.showLocationDetailModal('${loc.id}')" title="View details">
          <div class="profile-highlight-header">
            <h4>${this.escapeHtml(loc.name || 'Untitled')}</h4>
            <span class="risk risk-${risk}">${risk}</span>
          </div>
          ${desc ? `<div class="profile-highlight-desc">${this.escapeHtml(desc.substring(0, 80))}${desc.length > 80 ? '...' : ''}</div>` : ''}
          <div class="profile-highlight-footer">
            <span class="profile-highlight-meta"><i class="fas fa-tag"></i> ${this.escapeHtml(loc.category || 'other')}</span>
            <span class="profile-highlight-meta"><i class="fas fa-eye"></i> ${loc.visitCount || 0}</span>
            <span class="profile-highlight-meta"><i class="fas fa-heart"></i> ${loc.likesCount || 0}</span>
          </div>
        </div>`;
      }).join('') || `<div class="empty-state">${isOwn ? 'No locations yet. Drop your first spot from the map.' : 'No locations to display yet.'}</div>`;

      // --- Activity tab ---
      const timelineLimit = 10;
      const timeline = locs.slice(0, timelineLimit).map(loc => {
        const desc = typeof loc.description === 'string' ? loc.description : '';
        const ts = loc.createdAt?.toDate ? this.timeAgo(loc.createdAt.toDate()) : 'Recently';
        return `<li class="timeline-item">
          <div class="timeline-dot"></div>
          <div>
            <div class="timeline-name">${this.escapeHtml(loc.name || 'New location')}</div>
            <div class="timeline-desc">${this.escapeHtml(desc.substring(0, 80))}${desc.length > 80 ? '...' : ''}</div>
            <div class="timeline-time"><i class="fas fa-clock"></i> ${ts}</div>
          </div>
        </li>`;
      }).join('') || `<li class="timeline-item"><div class="timeline-dot"></div><div class="text-muted">${isOwn ? 'Get your first ping in.' : 'No check-ins yet.'}</div></li>`;
      const timelineMore = total > timelineLimit
        ? `<li class="timeline-more"><button class="btn btn-sm" onclick="app.viewUserLocations('${targetId}')"><i class="fas fa-list"></i> +${total - timelineLimit} more</button></li>`
        : '';

      // --- Gallery in Overview ---
      const gallery = (Array.isArray(ud.gallery) ? ud.gallery.filter(Boolean) : []);
      const galleryHtml = gallery.length
        ? `<section class="panel"><div class="panel-header">Gallery</div><div class="panel-body"><div class="gallery-grid">${gallery.map(s => `<div class="gallery-item"><img src="${this.escapeHtml(s)}" alt="Gallery"></div>`).join('')}</div></div></section>`
        : '';

      content.innerHTML = `
        <div class="profile-dashboard">
          <aside class="data-dump">
            <div class="id-card-header">
              <span>[ EXPLORER ID ]</span>
              <span class="id-card-online"><i class="fas fa-circle"></i> ACTIVE</span>
            </div>

            <div class="id-card-avatar-block">
              <div class="profile-avatar-lg">${avatar ? `<img src="${this.escapeHtml(avatar)}" alt="${this.escapeHtml(name)}">` : `<span>${this.escapeHtml(name.charAt(0).toUpperCase())}</span>`}</div>
              <div class="id-card-identity">
                <h2 class="profile-name">${this.escapeHtml(name)}</h2>
                <div class="profile-handle">@${this.escapeHtml(name.toLowerCase().replace(/\s/g, '_'))}</div>
                ${pronouns ? `<div class="profile-pronouns">${this.escapeHtml(pronouns)}</div>` : ''}
                <div class="profile-joined"><i class="fas fa-clock"></i> ${joined}</div>
              </div>
            </div>

            ${isOwn
              ? `<button class="btn btn-primary profile-action-btn" onclick="app.showEditProfile()"><i class="fas fa-edit"></i> Edit Profile</button>`
              : this.currentUser
                ? `<div class="profile-social-btns">
                    <button class="btn btn-primary" id="follow-btn-${targetId}" onclick="app.toggleFollow('${targetId}')"><i class="fas fa-user-plus"></i> Follow</button>
                    <button class="btn btn-icon" onclick="app.messageUser('${targetId}','${this.escapeHtml(name)}')" title="Message"><i class="fas fa-envelope"></i></button>
                  </div>`
                : ''
            }

            <div class="data-dump-title data-dump-title-spaced">FIELD STATS</div>
            <div class="profile-stat-list">
              <div class="profile-stat-row"><span class="profile-stat-num">${total}</span><span class="profile-stat-name">Locations</span></div>
              <div class="profile-stat-row"><span class="profile-stat-num" id="profile-followers-count">--</span><span class="profile-stat-name">Followers</span></div>
              <div class="profile-stat-row"><span class="profile-stat-num" id="profile-following-count">--</span><span class="profile-stat-name">Following</span></div>
              <div class="profile-stat-row"><span class="profile-stat-num" id="profile-likes-count">--</span><span class="profile-stat-name">Likes</span></div>
              <div class="profile-stat-row"><span class="profile-stat-num" id="profile-visits-count">--</span><span class="profile-stat-name">Visits</span></div>
              <div class="profile-stat-row"><span class="profile-stat-num" id="profile-badges-count">--</span><span class="profile-stat-name">Badges</span></div>
            </div>

            <div class="data-dump-title data-dump-title-spaced">BADGES</div>
            <div id="user-badges" class="achievement-grid"></div>
          </aside>

          <main class="flex flex-col gap-0">
            <div class="profile-tabs">
              <button class="profile-tab-btn active" onclick="app.switchProfileTab(this,'ptab-overview')">Overview</button>
              <button class="profile-tab-btn" onclick="app.switchProfileTab(this,'ptab-spots')">Spots <span class="profile-tab-count">${total}</span></button>
              <button class="profile-tab-btn" onclick="app.switchProfileTab(this,'ptab-activity')">Activity</button>
              <button class="profile-tab-btn" onclick="app.switchProfileTab(this,'ptab-intel')">Intel</button>
            </div>

            <div id="ptab-overview" class="profile-tab-pane flex flex-col gap-16">
              <section class="panel">
                <div class="panel-header">Dossier</div>
                <div class="panel-body">
                  ${bioHtml}
                  ${metaFields ? `<div class="profile-meta-grid mt-12">${metaFields}</div>` : ''}
                  ${safeLinks.length ? `<div class="profile-links mt-12">${linksHtml}</div>` : ''}
                </div>
              </section>
              ${galleryHtml}
            </div>

            <div id="ptab-spots" class="profile-tab-pane hidden flex flex-col gap-16">
              <section class="panel">
                <div class="panel-header" style="display:flex;justify-content:space-between;align-items:center;">
                  <span>Locations</span>
                  ${total > 12 ? `<button class="btn btn-sm" onclick="app.viewUserLocations('${targetId}')"><i class="fas fa-list"></i> All ${total}</button>` : ''}
                </div>
                <div class="panel-body profile-highlights-body">${highlights}</div>
              </section>
            </div>

            <div id="ptab-activity" class="profile-tab-pane hidden flex flex-col gap-16">
              <section class="panel">
                <div class="panel-header">Field Log <span style="font-size:0.75em;opacity:0.6;font-weight:normal;">// locations added</span></div>
                <div class="terminal-log"><ul class="timeline-list">${timeline}${timelineMore}</ul></div>
              </section>
            </div>

            <div id="ptab-intel" class="profile-tab-pane hidden flex flex-col gap-16">
              <section class="panel">
                <div class="panel-header">Intel Feed</div>
                <div class="panel-body">
                  <div class="intel-feed-tabs">
                    <button class="intel-tab active" onclick="app.switchIntelTab(this,'intel-posts-pane','intel-wall-pane')">Posts</button>
                    <button class="intel-tab" onclick="app.switchIntelTab(this,'intel-wall-pane','intel-posts-pane')">Wall</button>
                  </div>
                  <div id="intel-posts-pane">
                    ${isOwn ? `<div class="form-group"><textarea class="textarea" id="profile-post-input" rows="2" placeholder="Drop intel..."></textarea><button class="btn btn-primary profile-submit-btn" onclick="app.submitProfilePost('${targetId}')"><i class="fas fa-paper-plane"></i> Post</button></div>` : ''}
                    <div id="profile-posts-list"><div class="loading">Loading posts...</div></div>
                  </div>
                  <div id="intel-wall-pane" class="hidden">
                    ${this.currentUser
                      ? `<div class="form-group">
                          <textarea class="textarea" id="profile-comment-input" rows="2" placeholder="${isOwn ? 'Pin a note to your wall...' : 'Leave a note for this explorer...'}"></textarea>
                          <button class="btn btn-primary profile-submit-btn" onclick="app.submitProfileComment('${targetId}')"><i class="fas fa-thumbtack"></i> Post Note</button>
                        </div>`
                      : `<p class="text-muted mb-12">Sign in to leave a note.</p>`
                    }
                    <div id="profile-comments-list"><div class="loading">Loading...</div></div>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>`;

      this.loadUserSocialStats(targetId, locs);
      this.loadProfilePosts(targetId);
      this.loadProfileComments(targetId);
      if (!isOwn && this.currentUser) this._hydrateFollowButton(targetId);
    } catch { content.innerHTML = '<div class="error">FAILED TO LOAD PROFILE</div>'; }
  },

  showEditProfile() {
    if (!this.currentUser) { this.showToast('Please sign in first', 'warning'); return; }
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) return;
    this._pendingPhotoFile = null;
    this._pendingGalleryFiles = [];
    this.db.collection('users').doc(this.currentUser.uid).get().then(doc => {
      const d = doc.exists ? doc.data() : {};
      document.getElementById('profile-display-name').value = d.displayName || '';
      document.getElementById('profile-bio').value = d.bio || '';
      document.getElementById('profile-city').value = d.city || '';
      document.getElementById('profile-specialty').value = d.specialty || '';
      document.getElementById('profile-gear').value = d.gear || '';
      document.getElementById('profile-pronouns').value = d.pronouns || '';
      document.getElementById('profile-links').value = (d.links || []).join('\n');
      // show current photo preview
      const photoPreview = document.getElementById('profile-photo-preview');
      if (photoPreview) {
        if (d.photoURL) {
          photoPreview.innerHTML = `<img src="${this.escapeHtml(d.photoURL)}" alt="Current photo">`;
        } else {
          photoPreview.innerHTML = '';
        }
      }
      // show current gallery
      this._currentGalleryUrls = Array.isArray(d.gallery) ? d.gallery.filter(Boolean) : [];
      this._renderEditGallery();
    }).catch(() => {});
    // switch to first tab
    const firstTab = modal.querySelector('.edit-tab-btn');
    const firstPane = modal.querySelector('.edit-tab-pane');
    if (firstTab && firstPane) {
      modal.querySelectorAll('.edit-tab-btn').forEach(b => b.classList.remove('active'));
      modal.querySelectorAll('.edit-tab-pane').forEach(p => p.classList.add('hidden'));
      firstTab.classList.add('active');
      firstPane.classList.remove('hidden');
    }
    modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => document.getElementById('profile-display-name')?.focus(), 100);

    // wire up file inputs once
    const photoInput = document.getElementById('profile-photo-file');
    if (photoInput && !photoInput._bound) {
      photoInput._bound = true;
      photoInput.addEventListener('change', e => this._onProfilePhotoSelected(e));
    }
    const galleryInput = document.getElementById('profile-gallery-file');
    if (galleryInput && !galleryInput._bound) {
      galleryInput._bound = true;
      galleryInput.addEventListener('change', e => this._onGalleryFilesSelected(e));
    }
  },

  switchEditTab(btn, tabId) {
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) return;
    modal.querySelectorAll('.edit-tab-btn').forEach(b => b.classList.remove('active'));
    modal.querySelectorAll('.edit-tab-pane').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(tabId)?.classList.remove('hidden');
  },

  _onProfilePhotoSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.showToast('Please select an image file', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { this.showToast('Image must be under 5MB', 'error'); return; }
    this._pendingPhotoFile = file;
    const preview = document.getElementById('profile-photo-preview');
    if (preview) {
      const url = URL.createObjectURL(file);
      preview.innerHTML = `<img src="${url}" alt="New photo"><div class="upload-pending-label">pending upload</div>`;
    }
  },

  _onGalleryFilesSelected(e) {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/')).slice(0, 10);
    if (!files.length) return;
    this._pendingGalleryFiles = (this._pendingGalleryFiles || []).concat(files).slice(0, 10);
    this._renderEditGallery();
  },

  _renderEditGallery() {
    const container = document.getElementById('edit-gallery-preview');
    if (!container) return;
    const existing = (this._currentGalleryUrls || []).map((url, i) =>
      `<div class="edit-gallery-thumb" data-idx="${i}">
        <img src="${this.escapeHtml(url)}" alt="Gallery">
        <button type="button" class="gallery-remove-btn" onclick="app._removeGalleryItem(${i},true)" title="Remove">&times;</button>
      </div>`
    );
    const pending = (this._pendingGalleryFiles || []).map((f, i) => {
      const url = URL.createObjectURL(f);
      return `<div class="edit-gallery-thumb pending">
        <img src="${url}" alt="Pending">
        <button type="button" class="gallery-remove-btn" onclick="app._removeGalleryItem(${i},false)" title="Remove">&times;</button>
        <div class="upload-pending-label">new</div>
      </div>`;
    });
    container.innerHTML = existing.concat(pending).join('') || '<div class="text-muted text-sm">No images yet. Upload some to build your gallery.</div>';
  },

  _removeGalleryItem(idx, isExisting) {
    if (isExisting) {
      this._currentGalleryUrls = (this._currentGalleryUrls || []).filter((_, i) => i !== idx);
    } else {
      this._pendingGalleryFiles = (this._pendingGalleryFiles || []).filter((_, i) => i !== idx);
    }
    this._renderEditGallery();
  },

  async _uploadProfilePhoto(file) {
    const ext = file.name.split('.').pop() || 'jpg';
    const ref = this.storage.ref(`profile_photos/${this.currentUser.uid}.${ext}`);
    const snap = await ref.put(file);
    return snap.ref.getDownloadURL();
  },

  async _uploadGalleryFile(file, idx) {
    const ext = file.name.split('.').pop() || 'jpg';
    const ref = this.storage.ref(`gallery/${this.currentUser.uid}/${Date.now()}_${idx}.${ext}`);
    const snap = await ref.put(file);
    return snap.ref.getDownloadURL();
  },

  showEditProfileModal() { return this.showEditProfile(); },

  hideEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) { modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); document.getElementById('edit-profile-form')?.reset(); }
    this._pendingPhotoFile = null;
    this._pendingGalleryFiles = [];
  },

  async handleEditProfile(e) {
    e.preventDefault();
    if (!this.currentUser) { this.showToast('Please sign in first', 'warning'); return; }
    const displayName = document.getElementById('profile-display-name').value.trim();
    const bio = document.getElementById('profile-bio').value.trim();
    const city = document.getElementById('profile-city').value.trim();
    const specialty = document.getElementById('profile-specialty').value.trim();
    const gear = document.getElementById('profile-gear').value.trim();
    const pronouns = document.getElementById('profile-pronouns').value.trim();
    const links = (document.getElementById('profile-links').value || '').split(/\n+/).map(l => this.sanitizeInput(l.trim())).filter(Boolean);
    const btn = document.getElementById('profile-submit-btn');
    this.setButtonLoading(btn, true, 'Saving...');
    try {
      let photoURL = null;
      // check if there's an existing photo (from the doc we loaded)
      const existingDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
      photoURL = existingDoc.exists ? (existingDoc.data().photoURL || null) : null;

      if (this._pendingPhotoFile) {
        this.setButtonLoading(btn, true, 'Uploading photo...');
        photoURL = await this._uploadProfilePhoto(this._pendingPhotoFile);
      }

      let galleryUrls = [...(this._currentGalleryUrls || [])];
      if (this._pendingGalleryFiles?.length) {
        this.setButtonLoading(btn, true, 'Uploading gallery...');
        const uploaded = await Promise.all(this._pendingGalleryFiles.map((f, i) => this._uploadGalleryFile(f, i)));
        galleryUrls = galleryUrls.concat(uploaded);
      }

      this.setButtonLoading(btn, true, 'Saving...');
      await this.db.collection('users').doc(this.currentUser.uid).set({
        displayName: displayName || null,
        bio: bio || null,
        city: city || null,
        specialty: specialty || null,
        gear: gear || null,
        pronouns: pronouns || null,
        photoURL: photoURL || null,
        links,
        gallery: galleryUrls,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      if (displayName || photoURL) await this.currentUser.updateProfile({ displayName: displayName || null, photoURL: photoURL || null });
      this.hideEditProfileModal();
      this.showToast('Profile updated!', 'success');
      this.loadProfile();
    } catch (err) { this.showToast('Failed to update profile: ' + err.message, 'error'); }
    finally { this.setButtonLoading(btn, false); }
  },

  async loadUserSocialStats(userId, locations = []) {
    try {
      const [followers, following, badgesSnap] = await Promise.all([
        this.db.collection('user_followers').where('followingId', '==', userId).get(),
        this.db.collection('user_followers').where('followerId', '==', userId).get(),
        this.db.collection('user_badges').where('userId', '==', userId).get(),
      ]);

      let likes = 0, visits = 0;
      if (locations.length) {
        locations.forEach(loc => { likes += loc.likesCount || 0; visits += loc.visitCount || 0; });
      } else {
        const locsSnap = await this.db.collection('locations').where('createdBy', '==', userId).where('status', '==', 'active').get();
        locsSnap.forEach(doc => { const d = doc.data(); likes += d.likesCount || 0; visits += d.visitCount || 0; });
      }

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
    if (!badges.length) { container.innerHTML = '<div class="text-muted">NO BADGES YET</div>'; return; }
    const icons = { first_location:'fas fa-map-marker-alt', mapper_10:'fas fa-map', mapper_50:'fas fa-globe', first_visit:'fas fa-check-circle', explorer_10:'fas fa-shoe-prints', explorer_50:'fas fa-trophy', commentator:'fas fa-comment', social_butterfly:'fas fa-users', photographer:'fas fa-camera' };
    container.innerHTML = badges.map(b => {
      const icon = icons[b.badgeId] || 'fas fa-medal';
      const name = this.getBadgeName(b.badgeId);
      const desc = this.getBadgeDescription(b.badgeId);
      return `<div class="achievement-tag" title="${this.escapeHtml(desc)}"><i class="${icon}"></i> ${this.escapeHtml(name)}</div>`;
    }).join('');
  },

  getBadgeName(id) {
    return { first_location:'First Explorer', mapper_10:'Mapper', mapper_50:'Master Mapper', first_visit:'First Check-in', explorer_10:'Explorer', explorer_50:'Veteran Explorer', commentator:'Commentator', social_butterfly:'Social Butterfly', photographer:'Photographer' }[id] || id;
  },

  getBadgeDescription(id) {
    return { first_location:'Added your first location', mapper_10:'Added 10 locations', mapper_50:'Added 50 locations', first_visit:'First check-in', explorer_10:'Visited 10 locations', explorer_50:'Visited 50 locations', commentator:'Left 10 comments', social_butterfly:'Followed 10 explorers', photographer:'Uploaded 5 photos' }[id] || 'Achievement unlocked';
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
      if (snap.empty) { list.innerHTML = '<div class="empty-state">No locations to display.</div>'; return; }
      list.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data();
        const [lat, lng] = Array.isArray(d.coordinates) ? d.coordinates : [null, null];
        const card = document.createElement('div'); card.className = 'location-card';
        card.innerHTML = `
          <div class="location-header"><h4>${this.escapeHtml(d.name || 'Unnamed')}</h4><span class="risk risk-${d.riskLevel || 'unknown'}">${d.riskLevel || 'unknown'}</span></div>
          <p class="location-card-desc">${this.escapeHtml(d.description || 'No description')}</p>
          ${lat != null ? `<button class="btn btn-sm" onclick="app.focusMapOnLocation(${lat},${lng})"><i class="fas fa-location-arrow"></i> View on Map</button>` : ''}`;
        list.appendChild(card);
      });
    } catch { list.innerHTML = '<div class="error">Failed to load locations</div>'; }
  },

  hideUserLocationsModal() {
    const modal = document.getElementById('user-locations-modal');
    if (modal) { modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); }
  },

  messageUser(userId, displayName) {
    if (!this.currentUser) { this.showToast('Sign in to message explorers', 'warning'); this.handleAuth(); return; }
    if (!userId) { this.showToast('No recipient selected', 'error'); return; }
    this.showView('messages');
    this.openThread(userId, displayName || 'Explorer');
  },

  async submitProfilePost(userId) {
    if (!this.currentUser) return;
    const input = document.getElementById('profile-post-input');
    const text = this.sanitizeInput(input?.value?.trim() || '');
    if (!text) { this.showToast('Post cannot be empty', 'warning'); return; }
    try {
      await this.db.collection('profile_posts').add({ body: text, createdBy: this.currentUser.uid, targetUserId: userId, displayName: this.currentUser.displayName || 'Explorer', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      if (input) input.value = '';
      this.showToast('Post added!', 'success'); this.loadProfilePosts(userId);
    } catch { this.showToast('Failed to add post', 'error'); }
  },

  async loadProfilePosts(userId) {
    const container = document.getElementById('profile-posts-list');
    if (!container) return;
    try {
      const snap = await this.db.collection('profile_posts').where('targetUserId', '==', userId).orderBy('createdAt', 'desc').limit(10).get();
      if (snap.empty) { container.innerHTML = '<div class="text-muted">No posts yet.</div>'; return; }
      container.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data(); const el = document.createElement('div'); el.className = 'activity-item';
        el.innerHTML = `<div class="activity-content"><strong>${this.escapeHtml(d.displayName)}</strong><p>${this.escapeHtml(d.body)}</p><div class="activity-time">${this.timeAgo(d.createdAt?.toDate?.())}</div></div>`;
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
      if (snap.empty) { container.innerHTML = '<div class="text-muted">No comments yet.</div>'; return; }
      container.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data(); const el = document.createElement('div'); el.className = 'activity-item';
        el.innerHTML = `<div class="activity-content"><strong>${this.escapeHtml(d.displayName)}</strong><p>${this.escapeHtml(d.text)}</p><div class="activity-time">${this.timeAgo(d.createdAt?.toDate?.())}</div></div>`;
        container.appendChild(el);
      });
    } catch { container.innerHTML = '<div class="error">Failed to load comments</div>'; }
  },

  async _hydrateFollowButton(userId) {
    if (!this.currentUser) return;
    try {
      const snap = await this.db.collection('user_followers').doc(`${this.currentUser.uid}_${userId}`).get();
      this.updateFollowButtons(userId, snap.exists);
    } catch {}
  },
};
