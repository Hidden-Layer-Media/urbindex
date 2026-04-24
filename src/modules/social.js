export const socialMethods = {
  showSocialFeed() {
    const view = document.getElementById('social-view-content');
    if (!view) return;
    view.innerHTML = `
      <section class="panel social-hero">
        <div>
          <div class="cz-label" style="margin-bottom:6px;">Network Ops</div>
          <h2 style="margin-bottom:6px;">// Social Feed</h2>
          <p class="cz-text" style="color:var(--text-dim);max-width:560px;">Field intel, meetups, and location drops from your crew.</p>
          <div class="social-metrics">
            <div class="mini-stat"><div class="mini-label">Posts</div><div class="mini-value" id="social-post-count">--</div></div>
            <div class="mini-stat"><div class="mini-label">Following</div><div class="mini-value" id="social-following-count">--</div></div>
            <div class="mini-stat"><div class="mini-label">Contributors</div><div class="mini-value" id="social-authors-count">--</div></div>
          </div>
        </div>
        <div class="social-hero-actions">
          <div id="social-last-updated" style="color:var(--text-muted);font-size:0.85rem;">Waiting for sync...</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
            <button class="btn btn-primary" onclick="app.createNewPost()"><i class="fas fa-bullhorn"></i> New Post</button>
            <button class="btn" id="social-refresh-btn" onclick="app.loadSocialFeed()"><i class="fas fa-sync"></i> Refresh</button>
            <button class="btn" onclick="app.showView('map')"><i class="fas fa-map"></i> Back to Map</button>
          </div>
        </div>
      </section>

      <div class="social-grid">
        <section class="panel" id="social-compose-panel">
          <div class="cz-label" style="margin-bottom:6px;">Share an update</div>
          <form id="social-post-form">
            <textarea class="textarea" id="social-post-input" rows="3" maxlength="500" placeholder="Drop intel, meetup details, or gear checks..." required></textarea>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
              <span id="social-char-count" style="color:var(--text-muted);font-size:0.85rem;">0/500</span>
              <div style="display:flex;gap:8px;">
                <input class="input" id="social-post-tags" placeholder="tags (comma separated)" style="font-size:0.85rem;width:180px;">
                <button class="btn btn-primary" id="social-post-submit" type="submit"><i class="fas fa-paper-plane"></i> Post</button>
              </div>
            </div>
          </form>
        </section>

        <section class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div class="cz-label">Filter &amp; Sort</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <select class="select" id="social-filter-type" style="width:auto;">
              <option value="all">All Posts</option>
              <option value="following">Following Only</option>
              <option value="locations">Locations</option>
            </select>
            <select class="select" id="social-sort-by" style="width:auto;">
              <option value="recent">Most Recent</option>
              <option value="popular">Most Liked</option>
            </select>
            <input class="input" id="social-search" placeholder="Search posts..." style="flex:1;min-width:120px;" oninput="app.searchSocialFeed()">
          </div>
        </section>
      </div>

      <div id="social-trending-tags" style="margin-bottom:16px;"></div>
      <div id="social-feed-container" class="loading">Loading feed...</div>`;

    this.bindSocialComposer();
    this.loadSocialFeed();
  },

  bindSocialComposer() {
    const form = document.getElementById('social-post-form');
    if (form) form.addEventListener('submit', e => this.handleSocialPostSubmit(e));
    const input = document.getElementById('social-post-input');
    const counter = document.getElementById('social-char-count');
    if (input && counter) input.addEventListener('input', () => { counter.textContent = `${input.value.length}/500`; });
    const sortEl = document.getElementById('social-sort-by');
    const filterEl = document.getElementById('social-filter-type');
    sortEl?.addEventListener('change', () => this.filterSocialFeed());
    filterEl?.addEventListener('change', () => this.filterSocialFeed());
  },

  async loadSocialFeed() {
    const container = document.getElementById('social-feed-container');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading...</div>';
    try {
      const snap = await this.db.collection('forum').orderBy('createdAt', 'desc').limit(50).get();
      const items = [];
      snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      this.socialFeedItems = items;
      this.updateSocialMeta(items);
      this.renderTrendingTags(items);
      const filtered = this.applySocialFilters(items);
      this.renderSocialFeed(filtered);
      this.updateSocialRefreshTime();
      await this.hydrateSocialEngagement(filtered);
    } catch { container.innerHTML = '<div class="error">Failed to load feed</div>'; }
  },

  updateSocialMeta(items) {
    const authors = new Set(items.map(i => i.createdBy).filter(Boolean));
    const el = id => document.getElementById(id);
    if (el('social-post-count')) el('social-post-count').textContent = items.length;
    if (el('social-authors-count')) el('social-authors-count').textContent = authors.size;
  },

  updateSocialRefreshTime() {
    const el = document.getElementById('social-last-updated');
    if (el) el.textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
  },

  renderTrendingTags(items) {
    const container = document.getElementById('social-trending-tags');
    if (!container) return;
    const tagCount = {};
    items.forEach(item => { (item.tags || []).forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }); });
    const sorted = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!sorted.length) { container.innerHTML = ''; return; }
    container.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
      <span style="color:var(--text-muted);font-size:0.85rem;">Trending:</span>
      ${sorted.map(([t, n]) => `<button class="tag" onclick="app.applyTagFilter('${this.escapeHtml(t)}')">#${this.escapeHtml(t)} <span style="color:var(--text-muted);">(${n})</span></button>`).join('')}
    </div>`;
  },

  applyTagFilter(tag) {
    const search = document.getElementById('social-search');
    if (search) { search.value = `#${tag}`; this.filterSocialFeed(); }
  },

  applySocialFilters(items = []) {
    const type = document.getElementById('social-filter-type')?.value || 'all';
    const sort = document.getElementById('social-sort-by')?.value || 'recent';
    const search = (document.getElementById('social-search')?.value || '').toLowerCase().trim();
    let result = [...items];
    if (type === 'locations') result = result.filter(i => i.locationId);
    if (search) {
      const tag = search.startsWith('#') ? search.slice(1) : null;
      result = result.filter(i => tag ? (i.tags || []).some(t => t.toLowerCase().includes(tag)) : (i.body || '').toLowerCase().includes(search) || (i.displayName || '').toLowerCase().includes(search));
    }
    result.sort((a, b) => sort === 'popular' ? (b.likeCount || 0) - (a.likeCount || 0) : (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
    return result;
  },

  filterSocialFeed() {
    if (!this.socialFeedItems) return;
    const filtered = this.applySocialFilters(this.socialFeedItems);
    this.renderSocialFeed(filtered);
  },

  searchSocialFeed() { this.filterSocialFeed(); },

  renderSocialFeed(activities) {
    const container = document.getElementById('social-feed-container');
    if (!container) return;
    if (!activities?.length) {
      container.innerHTML = '<div class="empty-state">No posts match the current filter.</div>';
      return;
    }
    container.innerHTML = '';
    activities.forEach(item => {
      const el = document.createElement('div');
      el.className = 'social-card';
      el.dataset.postId = item.id;
      const ts = item.createdAt?.toDate ? this.timeAgo(item.createdAt.toDate()) : 'Recently';
      const tags = (item.tags || []).map(t => `<span class="tag" onclick="app.applyTagFilter('${this.escapeHtml(t)}')">#${this.escapeHtml(t)}</span>`).join(' ');
      
      el.innerHTML = `
        <div class="social-card-header">
          <div>
            <span class="social-card-user">${this.escapeHtml(item.displayName || 'Explorer')}</span>
            <span class="social-card-time">// ${ts}</span>
          </div>
          ${this.currentUser && item.createdBy !== this.currentUser.uid ? 
            `<button class="btn btn-sm" id="follow-feed-${item.createdBy}" onclick="app.toggleFollowFromFeed('${item.createdBy}')">Follow</button>` : ''}
        </div>
        <div class="social-card-content">${this.escapeHtml(item.body || '')}</div>
        ${tags ? `<div style="margin-bottom:12px; display:flex; flex-wrap:wrap; gap:4px;">${tags}</div>` : ''}
        <div class="social-card-footer">
          <button class="social-action" id="like-btn-${item.id}" onclick="app.togglePostLike('${item.id}')">
            <i class="fas fa-heart"></i> <span id="like-count-${item.id}">${item.likeCount || 0}</span>
          </button>
          <button class="social-action" onclick="app.togglePostComments('${item.id}')">
            <i class="fas fa-comment"></i> Comments
          </button>
          ${item.locationId ? `
            <button class="social-action" onclick="app.viewPostLocation('${item.id}','${item.locationId}')">
              <i class="fas fa-map-marker-alt"></i> Location
            </button>` : ''}
        </div>
        <div id="comments-panel-${item.id}" style="display:none; margin-top:16px; border-top: 1px dashed var(--border-dim); padding-top:12px;">
          <div id="post-comments-${item.id}" class="card-meta">Loading comments...</div>
          ${this.currentUser ? `
            <div style="display:flex; gap:8px; margin-top:12px;">
              <input class="form-control" id="comment-field-${item.id}" placeholder="Add intel..." style="font-size:0.8rem;">
              <button class="btn btn-primary btn-sm" onclick="app.submitPostComment('${item.id}')"><i class="fas fa-paper-plane"></i></button>
            </div>` : ''}
        </div>`;
      container.appendChild(el);
    });
  },

  async hydrateSocialEngagement(items = []) {
    if (!this.currentUser || !items.length) return;
    try {
      const likeSnap = await this.db.collection('post_likes').where('userId', '==', this.currentUser.uid).get();
      const likedIds = new Set(likeSnap.docs.map(d => d.data().postId));
      items.forEach(item => {
        const btn = document.getElementById(`like-btn-${item.id}`);
        if (btn && likedIds.has(item.id)) btn.classList.add('active');
      });
    } catch {}
  },

  async createNewPost() {
    if (!this.currentUser) { this.showToast('Sign in to post updates', 'warning'); this.handleAuth(); return; }
    this.showView('social');
    setTimeout(() => document.getElementById('social-post-input')?.focus(), 150);
  },

  async handleSocialPostSubmit(e) {
    e.preventDefault();
    if (!this.currentUser) { this.showToast('Sign in to post updates', 'warning'); this.handleAuth(); return; }
    const input = document.getElementById('social-post-input');
    const tagsEl = document.getElementById('social-post-tags');
    const btn = document.getElementById('social-post-submit');
    const body = this.sanitizeInput(input?.value || '');
    if (!body) { this.showToast('Post cannot be empty', 'warning'); input?.focus(); return; }
    if (body.length > 500) { this.showToast('Post is over the 500 character limit', 'warning'); return; }
    const tags = (tagsEl?.value || '').split(',').map(t => this.sanitizeInput(t.trim())).filter(Boolean).slice(0, 8);
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    try {
      await this.db.collection('forum').add({
        body, tags, createdBy: this.currentUser.uid,
        displayName: this.currentUser.displayName || 'Explorer',
        photoURL: this.currentUser.photoURL || null,
        likeCount: 0, commentCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      if (input) input.value = '';
      if (tagsEl) tagsEl.value = '';
      const counter = document.getElementById('social-char-count');
      if (counter) counter.textContent = '0/500';
      this.showToast('Post shared!', 'success');
      this.loadSocialFeed();
    } catch { this.showToast('Failed to share post', 'error'); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Post'; } }
  },

  async togglePostLike(postId) {
    if (!this.currentUser) { this.showToast('Sign in to like posts', 'warning'); this.handleAuth(); return; }
    const opKey = `post-like-${postId}`;
    if (this.activeOperations.has(opKey)) return;
    this.activeOperations.add(opKey);
    try {
      const ref = this.db.collection('post_likes').doc(`${this.currentUser.uid}_${postId}`);
      const snap = await ref.get();
      const countEl = document.getElementById(`like-count-${postId}`);
      const btn = document.getElementById(`like-btn-${postId}`);
      if (snap.exists) {
        await ref.delete();
        await this.db.collection('forum').doc(postId).update({ likeCount: firebase.firestore.FieldValue.increment(-1) });
        if (countEl) countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
        if (btn) btn.classList.remove('active');
      } else {
        await ref.set({ userId: this.currentUser.uid, postId, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        await this.db.collection('forum').doc(postId).update({ likeCount: firebase.firestore.FieldValue.increment(1) });
        if (countEl) countEl.textContent = parseInt(countEl.textContent) + 1;
        if (btn) btn.classList.add('active');
      }
    } catch { this.showToast('Failed to update like', 'error'); }
    finally { this.activeOperations.delete(opKey); }
  },

  togglePostComments(postId) {
    const panel = document.getElementById(`comments-panel-${postId}`);
    if (!panel) return;
    const hidden = panel.style.display === 'none';
    panel.style.display = hidden ? 'block' : 'none';
    if (hidden) this.loadPostComments(postId);
  },

  async submitPostComment(postId) {
    if (!this.currentUser) { this.showToast('Sign in to comment', 'warning'); return; }
    const input = document.getElementById(`comment-field-${postId}`);
    const text = this.sanitizeInput(input?.value?.trim() || '');
    if (!text) { this.showToast('Comment cannot be empty', 'warning'); return; }
    try {
      await this.addPostComment(postId, text);
      if (input) input.value = '';
    } catch { this.showToast('Failed to add comment', 'error'); }
  },

  async addPostComment(postId, text) {
    await this.db.collection('post_comments').add({
      postId, text, userId: this.currentUser.uid,
      displayName: this.currentUser.displayName || 'Explorer',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await this.db.collection('forum').doc(postId).update({ commentCount: firebase.firestore.FieldValue.increment(1) });
    this.loadPostComments(postId);
  },

  async loadPostComments(postId) {
    const container = document.getElementById(`post-comments-${postId}`);
    if (!container) return;
    try {
      const snap = await this.db.collection('post_comments').where('postId', '==', postId).orderBy('createdAt', 'desc').limit(10).get();
      if (snap.empty) { container.innerHTML = '<div style="color:var(--text-muted);">No comments yet.</div>'; return; }
      container.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data(); const el = document.createElement('div'); el.style.marginBottom = '8px';
        el.innerHTML = `<strong style="color:var(--yellow);">${this.escapeHtml(d.displayName)}</strong> <span style="color:var(--text-muted);font-size:0.8rem;">${this.timeAgo(d.createdAt?.toDate?.())}</span><p style="margin:2px 0;">${this.escapeHtml(d.text)}</p>`;
        container.appendChild(el);
      });
    } catch { container.innerHTML = '<div class="error">Failed to load comments</div>'; }
  },

  async viewPostLocation(postId, locationId) {
    if (!locationId) return;
    try {
      const doc = await this.db.collection('locations').doc(locationId).get();
      if (!doc.exists) { this.showToast('Location not found', 'error'); return; }
      const d = doc.data();
      if (d.coordinates?.length === 2) this.focusMapOnLocation(d.coordinates[0], d.coordinates[1]);
    } catch {}
  },

  async followUser(userId) {
    if (!this.currentUser) { this.showToast('Sign in to follow users', 'warning'); return; }
    try {
      await this.db.collection('user_followers').doc(`${this.currentUser.uid}_${userId}`).set({ followerId: this.currentUser.uid, followingId: userId, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      await this.createNotification(userId, 'follow', `${this.currentUser.displayName || 'Explorer'} started following you`);
      this.showToast('Following!', 'success');
    } catch { this.showToast('Failed to follow user', 'error'); }
  },

  async unfollowUser(userId) {
    try {
      await this.db.collection('user_followers').doc(`${this.currentUser.uid}_${userId}`).delete();
    } catch { this.showToast('Failed to unfollow user', 'error'); }
  },

  async toggleFollow(userId) {
    if (!this.currentUser) { this.showToast('Sign in to follow users', 'warning'); return; }
    const opKey = `follow-${userId}`;
    if (this.activeOperations.has(opKey)) return;
    this.activeOperations.add(opKey);
    try {
      const btn = document.getElementById(`follow-btn-${userId}`);
      const isFollowing = btn?.textContent.includes('Unfollow') || btn?.textContent.includes('Following');
      if (isFollowing) {
        await this.unfollowUser(userId);
        if (btn) { btn.innerHTML = '<i class="fas fa-user-plus"></i> Follow'; btn.className = 'btn btn-primary'; }
      } else {
        await this.followUser(userId);
        if (btn) { btn.innerHTML = '<i class="fas fa-user-check"></i> Unfollow'; btn.className = 'btn'; }
      }
    } catch { this.showToast('Failed to update follow status', 'error'); }
    finally { this.activeOperations.delete(opKey); }
  },

  async toggleFollowFromFeed(userId) {
    if (!this.currentUser) { this.showToast('Sign in to follow users', 'warning'); this.handleAuth(); return; }
    const opKey = `follow-${userId}`;
    if (this.activeOperations.has(opKey)) return;
    this.activeOperations.add(opKey);
    try {
      const ref = this.db.collection('user_followers').doc(`${this.currentUser.uid}_${userId}`);
      const snap = await ref.get();
      const btn = document.getElementById(`follow-feed-${userId}`);
      if (snap.exists) { await ref.delete(); if (btn) btn.textContent = 'Follow'; }
      else { await ref.set({ followerId: this.currentUser.uid, followingId: userId, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); if (btn) btn.textContent = 'Unfollow'; this.showToast('Following!', 'success'); }
    } catch { this.showToast('Failed to update follow status', 'error'); }
    finally { this.activeOperations.delete(opKey); }
  },

  updateFollowButtons(userId, following) {
    const btn = document.getElementById(`follow-btn-${userId}`);
    if (btn) { btn.innerHTML = following ? '<i class="fas fa-user-check"></i> Unfollow' : '<i class="fas fa-user-plus"></i> Follow'; btn.className = following ? 'btn' : 'btn btn-primary'; }
    const feedBtn = document.getElementById(`follow-feed-${userId}`);
    if (feedBtn) feedBtn.textContent = following ? 'Unfollow' : 'Follow';
  },
};
