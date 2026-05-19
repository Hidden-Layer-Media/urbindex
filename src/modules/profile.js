export const profileMethods = {
  switchIntelTab(btn, showId, hideId) {
    document.querySelectorAll('.intel-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(showId)?.classList.remove('hidden');
    document.getElementById(hideId)?.classList.add('hidden');
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

      const bioHtml = bio
        ? `<p class="cz-text text-dim">${this.escapeHtml(bio)}</p>`
        : `<p class="cz-text text-muted text-italic">${isOwn ? 'Add a short field note so others know your style.' : 'No bio shared yet.'}</p>`;

      const highlights = locs.slice(0, 4).map(loc => {
        const desc = typeof loc.description === 'string' ? loc.description : '';
        const risk = loc.riskLevel || 'unknown';
        const coords = Array.isArray(loc.coordinates) ? `<span class="profile-highlight-meta"><i class="fas fa-location-arrow"></i> ${loc.coordinates[0].toFixed(4)}, ${loc.coordinates[1].toFixed(4)}</span>` : '';
        return `<div class="profile-highlight">
          <div class="profile-highlight-header">
            <h4>${this.escapeHtml(loc.name || 'Untitled')}</h4>
            <span class="risk risk-${risk}">${risk}</span>
          </div>
          <div class="profile-highlight-desc">${this.escapeHtml(desc.substring(0, 90))}${desc.length > 90 ? '...' : ''}</div>
          <div class="profile-highlight-footer">
            <span class="profile-highlight-meta"><i class="fas fa-tag"></i> ${this.escapeHtml(loc.category || 'uncategorized')}</span>
            ${coords}
          </div>
        </div>`;
      }).join('') || `<div class="profile-highlight text-muted text-center">${isOwn ? 'No locations yet. Drop your first spot from the map.' : 'No locations to display yet.'}</div>`;

      const timeline = locs.slice(0, 4).map(loc => {
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

      const safeLinks = (Array.isArray(ud.links) ? ud.links.filter(Boolean) : []).filter(l => /^https?:\/\//i.test(l));
      const linksHtml = safeLinks.length
        ? safeLinks.map(l => `<a class="btn w-fit" href="${this.escapeHtml(l)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> ${this.escapeHtml(l.replace(/^https?:\/\//, '').substring(0, 40))}</a>`).join('')
        : `<div class="text-muted text-italic">No links shared.</div>`;

      const gallery = (Array.isArray(ud.gallery) ? ud.gallery.filter(Boolean) : []);
      const galleryHtml = gallery.length ? `<div class="gallery-grid">${gallery.map(s => `<div class="gallery-item"><img src="${this.escapeHtml(s)}" alt="Gallery"></div>`).join('')}</div>` : null;

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

          <main class="flex flex-col gap-16">
            <section class="panel">
              <div class="panel-header">Dossier</div>
              <div class="panel-body">
                ${bioHtml}
                ${safeLinks.length ? `<div class="profile-links">${linksHtml}</div>` : ''}
              </div>
            </section>

            ${total > 0 ? `<section class="panel">
              <div class="panel-header" style="display:flex;justify-content:space-between;align-items:center;">
                <span>Recent Spots</span>
                ${total > 4 ? `<button class="btn btn-sm" onclick="app.viewUserLocations('${targetId}')"><i class="fas fa-list"></i> All ${total}</button>` : ''}
              </div>
              <div class="panel-body profile-highlights-body">${highlights}</div>
            </section>` : ''}

            <section class="panel">
              <div class="panel-header">Activity Log</div>
              <div class="terminal-log"><ul class="timeline-list">${timeline}</ul></div>
            </section>

            ${galleryHtml ? `<section class="panel">
              <div class="panel-header">Gallery</div>
              <div class="panel-body">${galleryHtml}</div>
            </section>` : ''}

            <section class="panel">
              <div class="panel-header">Intel Feed</div>
              <div class="panel-body">
                <div class="intel-feed-tabs">
                  <button class="intel-tab active" onclick="app.switchIntelTab(this,'intel-posts-pane','intel-wall-pane')">Posts</button>
                  <button class="intel-tab" onclick="app.switchIntelTab(this,'intel-wall-pane','intel-posts-pane')">Wall</button>
                </div>
                <div id="intel-posts-pane">
                  ${isOwn ? `<div class="form-group"><textarea class="textarea" id="profile-post-input" rows="2" placeholder="Drop intel..."></textarea><button class="btn btn-primary profile-submit-btn" onclick="app.submitProfilePost('${targetId}')"><i class="fas fa-paper-plane"></i> Post</button></div>` : ''}
                  <div id="profile-posts-list" class="loading">Loading posts...</div>
                </div>
                <div id="intel-wall-pane" class="hidden">
                  ${this.currentUser
                    ? `<div class="form-group">
                        <textarea class="textarea" id="profile-comment-input" rows="2" placeholder="${isOwn ? 'Pin a note to your wall...' : 'Leave a note for this explorer...'}"></textarea>
                        <button class="btn btn-primary profile-submit-btn" onclick="app.submitProfileComment('${targetId}')"><i class="fas fa-thumbtack"></i> Post Note</button>
                      </div>`
                    : `<p class="text-muted mb-12">Sign in to leave a note.</p>`
                  }
                  <div id="profile-comments-list" class="loading">Loading...</div>
                </div>
              </div>
            </section>
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
    const galleryInput = document.getElementById('profile-gallery');
    if (galleryInput && !galleryInput._previewBound) {
      galleryInput._previewBound = true;
      let t;
      galleryInput.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => this._renderGalleryPreview(galleryInput.value), 400);
      });
    }
  },

  _renderGalleryPreview(raw) {
    const preview = document.getElementById('profile-gallery-preview');
    if (!preview) return;
    const urls = raw.split(/\n+/).map(u => u.trim()).filter(u => /^https?:\/\/.+/i.test(u)).slice(0, 12);
    if (!urls.length) { preview.innerHTML = ''; return; }
    preview.innerHTML = urls.map(u => {
      const safe = this.escapeHtml(u);
      return `<img src="${safe}" alt="preview" onerror="this.outerHTML='<div class=\\'photo-preview-err\\'>bad url</div>'">`;
    }).join('');
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
    this.setButtonLoading(btn, true, 'Saving...');
    try {
      await this.db.collection('users').doc(this.currentUser.uid).set({ displayName: displayName || null, bio: bio || null, photoURL: photoURL || null, links, gallery, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      if (displayName || photoURL) await this.currentUser.updateProfile({ displayName: displayName || null, photoURL: photoURL || null });
      this.hideEditProfileModal();
      this.showToast('Profile updated successfully!', 'success');
      this.loadProfile();
    } catch { this.showToast('Failed to update profile. Please try again.', 'error'); }
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
        locations.forEach(loc => {
          likes += loc.likesCount || 0;
          visits += loc.visitCount || 0;
        });
      } else {
        const locsSnap = await this.db.collection('locations').where('createdBy', '==', userId).where('status', '==', 'active').get();
        locsSnap.forEach(doc => {
          const d = doc.data();
          likes += d.likesCount || 0;
          visits += d.visitCount || 0;
        });
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
    if (!badges.length) {
      container.innerHTML = '<div class="activity-time">NO BADGES YET</div>';
      return;
    }
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
