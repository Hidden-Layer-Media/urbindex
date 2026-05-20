export const socialMethods = {
  _socialFilterType: 'all',
  _socialFeedLastDoc: null,
  _socialFeedPageSize: 20,

  showSocialFeed() {
    const view = document.getElementById('social-view-content');
    if (!view) return;
    this._socialFilterType = 'all';

    view.innerHTML = `
      <div class="feed-header">
        <div class="feed-header-left">
          <div class="cz-label">Network Ops</div>
          <h2>// SOCIAL FEED</h2>
        </div>
        <div class="feed-header-stats">
          <div class="feed-stat"><span class="feed-stat-val" id="social-post-count">--</span><span class="feed-stat-lbl">posts</span></div>
          <div class="feed-stat"><span class="feed-stat-val" id="social-following-count">--</span><span class="feed-stat-lbl">following</span></div>
          <div class="feed-stat"><span class="feed-stat-val" id="social-authors-count">--</span><span class="feed-stat-lbl">contributors</span></div>
        </div>
        <div class="feed-header-actions">
          <span id="social-last-updated" class="feed-sync-time">waiting for sync...</span>
          <button class="btn btn-sm" id="social-refresh-btn" onclick="app.loadSocialFeed()" title="Refresh"><i class="fas fa-sync-alt"></i></button>
          <button class="btn btn-sm" onclick="app.showView('map')"><i class="fas fa-map"></i></button>
        </div>
      </div>

      <div class="feed-composer panel" id="feed-composer">
        <div class="feed-composer-prompt">
          <span class="feed-composer-addr">URBINDEX://net/post${this.currentUser && !this.currentUser.isAnonymous ? '@' + (this.currentUser.displayName || 'user').toLowerCase().replace(/\s/g, '_') : ''}</span>
          <span class="feed-composer-blink">_</span>
          <span class="feed-composer-hint">ctrl+enter to post</span>
        </div>
        <form id="social-post-form">
          <div class="feed-composer-input-wrap">
            <span class="feed-composer-gt">&gt;</span>
            <textarea class="feed-composer-textarea" id="social-post-input" rows="3" maxlength="500"
              placeholder="drop intel, meetup details, gear checks..."></textarea>
          </div>
          <div class="feed-composer-footer">
            <div class="feed-composer-charbar-wrap">
              <div class="feed-composer-charbar">
                <div class="feed-composer-charfill" id="social-char-fill"></div>
              </div>
              <span id="social-char-count" class="feed-char-count">0 / 500</span>
            </div>
            <div class="feed-composer-actions">
              <div class="feed-composer-tags-wrap">
                <span class="feed-composer-tag-prefix">#</span>
                <input class="feed-composer-tags-input" id="social-post-tags" placeholder="tags, comma sep">
              </div>
              <button class="btn btn-primary btn-sm" id="social-post-submit" type="submit">
                <i class="fas fa-paper-plane"></i> Post
              </button>
            </div>
          </div>
        </form>
      </div>

      <div class="feed-filter-bar">
        <div class="feed-filter-tabs">
          <button class="feed-filter-tab active" onclick="app._setSocialFilter('all',this)">all</button>
          <button class="feed-filter-tab" onclick="app._setSocialFilter('following',this)">following</button>
          <button class="feed-filter-tab" onclick="app._setSocialFilter('locations',this)">locations</button>
        </div>
        <div class="feed-filter-right">
          <div class="feed-search-wrap">
            <span class="feed-search-icon"><i class="fas fa-search"></i></span>
            <input class="feed-search-input" id="social-search" placeholder="search posts..." oninput="app.searchSocialFeed()">
          </div>
          <select class="input feed-sort-select" id="social-sort-by" onchange="app.filterSocialFeed()">
            <option value="recent">recent</option>
            <option value="popular">popular</option>
          </select>
        </div>
      </div>

      <div id="social-trending-tags" class="feed-trending"></div>
      <div id="social-feed-container"><div class="loading">Loading feed...</div></div>
    `;

    this.bindSocialComposer();
    this.loadSocialFeed();
  },

  _setSocialFilter(type, btn) {
    this._socialFilterType = type;
    document.querySelectorAll('.feed-filter-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.filterSocialFeed();
  },

  bindSocialComposer() {
    const form = document.getElementById('social-post-form');
    if (form) form.addEventListener('submit', e => this.handleSocialPostSubmit(e));

    const input = document.getElementById('social-post-input');
    const counter = document.getElementById('social-char-count');
    const fill = document.getElementById('social-char-fill');
    if (input) {
      input.addEventListener('input', () => {
        const n = input.value.length;
        if (counter) counter.textContent = `${n} / 500`;
        if (fill) {
          const pct = (n / 500) * 100;
          fill.style.width = `${pct}%`;
          fill.className = 'feed-composer-charfill' + (pct >= 90 ? ' danger' : pct >= 70 ? ' warn' : '');
        }
      });
      input.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); form?.requestSubmit(); }
      });
    }
  },

  async loadSocialFeed() {
    const container = document.getElementById('social-feed-container');
    if (!container) return;
    const refreshBtn = document.getElementById('social-refresh-btn');
    if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.querySelector('i')?.classList.add('fa-spin'); }
    container.innerHTML = '<div class="loading">Loading...</div>';
    this._socialFeedLastDoc = null;
    if (this.currentUser) {
      try {
        const snap = await this.db.collection('user_followers').where('followerId', '==', this.currentUser.uid).get();
        this._followingIds = new Set(snap.docs.map(d => d.data().followingId));
      } catch { this._followingIds = new Set(); }
    } else {
      this._followingIds = new Set();
    }
    try {
      const snap = await this.db.collection('forum')
        .orderBy('createdAt', 'desc')
        .limit(this._socialFeedPageSize)
        .get();
      const items = [];
      snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      this._socialFeedLastDoc = snap.docs[snap.docs.length - 1] || null;
      this.socialFeedItems = items;
      this.updateSocialMeta(items);
      this.renderTrendingTags(items);
      const filtered = this.applySocialFilters(items);
      this.renderSocialFeed(filtered, snap.size === this._socialFeedPageSize);
      this.updateSocialRefreshTime();
      await this.hydrateSocialEngagement(filtered);
    } catch { container.innerHTML = '<div class="error">Failed to load feed</div>'; }
    finally {
      if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.querySelector('i')?.classList.remove('fa-spin'); }
    }
  },

  async loadMoreSocialFeed() {
    if (!this._socialFeedLastDoc) return;
    const btn = document.getElementById('social-load-more');
    if (btn) { btn.disabled = true; btn.textContent = 'loading...'; }
    try {
      const snap = await this.db.collection('forum')
        .orderBy('createdAt', 'desc')
        .startAfter(this._socialFeedLastDoc)
        .limit(this._socialFeedPageSize)
        .get();
      if (snap.empty) { this._socialFeedLastDoc = null; if (btn) btn.remove(); return; }
      const newItems = [];
      snap.forEach(doc => newItems.push({ id: doc.id, ...doc.data() }));
      this._socialFeedLastDoc = snap.docs[snap.docs.length - 1];
      this.socialFeedItems = [...(this.socialFeedItems || []), ...newItems];
      const hasMore = snap.size === this._socialFeedPageSize;
      this._appendSocialFeedItems(newItems, hasMore);
      await this.hydrateSocialEngagement(newItems);
    } catch { if (btn) { btn.disabled = false; btn.textContent = 'load more'; } }
  },

  updateSocialMeta(items) {
    const authors = new Set(items.map(i => i.createdBy).filter(Boolean));
    const el = id => document.getElementById(id);
    if (el('social-post-count')) el('social-post-count').textContent = items.length;
    if (el('social-authors-count')) el('social-authors-count').textContent = authors.size;
    if (this.currentUser && el('social-following-count')) {
      el('social-following-count').textContent = this._followingIds?.size ?? '--';
    }
  },

  updateSocialRefreshTime() {
    const el = document.getElementById('social-last-updated');
    if (el) el.textContent = `synced ${new Date().toLocaleTimeString()}`;
  },

  renderTrendingTags(items) {
    const container = document.getElementById('social-trending-tags');
    if (!container) return;
    const tagCount = {};
    items.forEach(item => { (item.tags || []).forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }); });
    const sorted = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!sorted.length) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <div class="feed-trending-inner">
        <span class="feed-trending-label">// trending</span>
        ${sorted.map(([t, n]) => `
          <button class="feed-trending-tag" onclick="app.applyTagFilter('${this.escapeHtml(t)}')">
            #${this.escapeHtml(t)}<span class="feed-trending-count">${n}</span>
          </button>`).join('')}
        <button class="feed-trending-clear" onclick="app.clearSocialFilters()">clear</button>
      </div>`;
  },

  applyTagFilter(tag) {
    const search = document.getElementById('social-search');
    if (search) { search.value = `#${tag}`; this.filterSocialFeed(); }
  },

  clearSocialFilters() {
    const search = document.getElementById('social-search');
    if (search) search.value = '';
    this._setSocialFilter('all', document.querySelector('.feed-filter-tab'));
  },

  applySocialFilters(items = []) {
    const type = this._socialFilterType || 'all';
    const sort = document.getElementById('social-sort-by')?.value || 'recent';
    const search = (document.getElementById('social-search')?.value || '').toLowerCase().trim();
    let result = [...items];
    if (type === 'locations') result = result.filter(i => i.locationId);
    if (type === 'following' && this.currentUser) {
      const ids = this._followingIds || new Set();
      result = result.filter(i => ids.has(i.createdBy));
    }
    if (search) {
      const tag = search.startsWith('#') ? search.slice(1) : null;
      result = result.filter(i => tag
        ? (i.tags || []).some(t => t.toLowerCase().includes(tag))
        : (i.body || '').toLowerCase().includes(search) || (i.displayName || '').toLowerCase().includes(search));
    }
    result.sort((a, b) => sort === 'popular'
      ? (b.likesCount || 0) - (a.likesCount || 0)
      : (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
    return result;
  },

  filterSocialFeed() {
    if (!this.socialFeedItems) return;
    const filtered = this.applySocialFilters(this.socialFeedItems);
    this.renderSocialFeed(filtered);
  },

  searchSocialFeed() { this.filterSocialFeed(); },

  _buildFeedCardHtml(item) {
    const ts = item.createdAt?.toDate ? this.timeAgo(item.createdAt.toDate()) : 'recently';
    const handle = this.escapeHtml(item.displayName || 'Explorer');
    const initials = (item.displayName || 'EX').slice(0, 2).toUpperCase();
    const rawBody = item.body || '';
    const truncated = rawBody.length > 280;
    const body = this.escapeHtml(truncated ? rawBody.substring(0, 280) : rawBody);
    const expandBtn = truncated ? `<button class="feed-expand-btn" onclick="app._expandFeedCard(this,'${item.id}')">// show more</button>` : '';
    const tags = (item.tags || []).filter(Boolean)
      .map(t => `<button class="feed-tag" onclick="app.applyTagFilter('${this.escapeHtml(t)}')">#${this.escapeHtml(t)}</button>`)
      .join('');
    const isOwn = this.currentUser && item.createdBy === this.currentUser.uid;
    const isOther = this.currentUser && !isOwn && item.createdBy;
    const headActions = `
      ${isOther ? `<button class="feed-follow-btn btn btn-sm" id="follow-feed-${item.createdBy}" onclick="app.toggleFollowFromFeed('${item.createdBy}')">Follow</button>` : ''}
      ${isOwn ? `<button class="feed-delete-btn" title="Delete post" onclick="app.deleteOwnPost('${item.id}',this)"><i class="fas fa-trash"></i></button>` : ''}
    `;
    const locationAction = item.locationId
      ? `<button class="feed-action" onclick="app.viewPostLocation('${item.id}','${item.locationId}')" title="View on map"><i class="fas fa-map-marker-alt"></i></button>`
      : '';
    return `
      <div class="feed-card-head">
        <div class="feed-card-avatar">${initials}</div>
        <div class="feed-card-identity">
          <span class="feed-card-handle">${handle}</span>
          <span class="feed-card-time">// ${ts}</span>
        </div>
        <div class="feed-card-head-actions">${headActions}</div>
      </div>
      <div class="feed-card-body" id="feed-body-${item.id}">${body}${expandBtn}</div>
      ${tags ? `<div class="feed-card-tags">${tags}</div>` : ''}
      <div class="feed-card-foot">
        <div class="feed-actions-left">
          <button class="feed-action feed-like-btn" id="like-btn-${item.id}" onclick="app.togglePostLike('${item.id}')" title="Like">
            <i class="fas fa-heart"></i><span id="like-count-${item.id}">${item.likesCount || 0}</span>
          </button>
          <button class="feed-action" onclick="app.togglePostComments('${item.id}')" title="Comments">
            <i class="fas fa-comment-alt"></i><span>${item.commentCount || 0}</span>
          </button>
          ${locationAction}
        </div>
      </div>
      <div id="comments-panel-${item.id}" class="feed-comments hidden">
        <div id="post-comments-${item.id}" class="feed-comments-list"></div>
        ${this.currentUser ? `
          <div class="feed-comment-form">
            <span class="feed-composer-gt">&gt;</span>
            <input class="feed-comment-input" id="comment-field-${item.id}" placeholder="add intel...">
            <button class="btn btn-primary btn-sm" onclick="app.submitPostComment('${item.id}')"><i class="fas fa-paper-plane"></i></button>
          </div>` : ''}
      </div>`;
  },

  renderSocialFeed(activities, hasMore = false) {
    const container = document.getElementById('social-feed-container');
    if (!container) return;
    if (!activities?.length) {
      container.innerHTML = `
        <div class="feed-empty">
          <span class="feed-empty-label">[ NO POSTS ]</span>
          <p>nothing matches the current filter</p>
          <button class="btn btn-sm" onclick="app.clearSocialFilters()">clear filters</button>
        </div>`;
      return;
    }
    container.innerHTML = '';
    activities.forEach(item => {
      const el = document.createElement('div');
      el.className = 'feed-card';
      el.dataset.postId = item.id;
      el.innerHTML = this._buildFeedCardHtml(item);
      container.appendChild(el);
    });
    if (hasMore) {
      const loadMoreBtn = document.createElement('div');
      loadMoreBtn.className = 'feed-load-more';
      loadMoreBtn.innerHTML = `<button class="btn btn-sm" id="social-load-more" onclick="app.loadMoreSocialFeed()">// load more</button>`;
      container.appendChild(loadMoreBtn);
    }
  },

  // kept for reference — was identical to renderSocialFeed item loop; now shares _buildFeedCardHtml
  _appendSocialFeedItems(items, hasMore) {
    const container = document.getElementById('social-feed-container');
    if (!container) return;
    const existing = document.getElementById('social-load-more');
    if (existing) existing.parentElement?.remove();
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'feed-card';
      el.dataset.postId = item.id;
      el.innerHTML = this._buildFeedCardHtml(item);
      container.appendChild(el);
    });
    if (hasMore) {
      const loadMoreBtn = document.createElement('div');
      loadMoreBtn.className = 'feed-load-more';
      loadMoreBtn.innerHTML = `<button class="btn btn-sm" id="social-load-more" onclick="app.loadMoreSocialFeed()">// load more</button>`;
      container.appendChild(loadMoreBtn);
    }
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

  async deleteOwnPost(postId, btn) {
    if (!this.currentUser) return;
    if (!btn.dataset.confirming) {
      btn.dataset.confirming = '1';
      btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
      btn.classList.add('confirming');
      setTimeout(() => {
        if (btn.dataset.confirming) { btn.dataset.confirming = ''; btn.innerHTML = '<i class="fas fa-trash"></i>'; btn.classList.remove('confirming'); }
      }, 3000);
      return;
    }
    btn.disabled = true;
    try {
      await this.db.collection('forum').doc(postId).delete();
      this.socialFeedItems = (this.socialFeedItems || []).filter(i => i.id !== postId);
      const card = document.querySelector(`.feed-card[data-post-id="${postId}"]`);
      if (card) { card.classList.add('feed-card-deleted'); setTimeout(() => card.remove(), 300); }
      this.showToast('Post deleted', 'success');
    } catch { this.showToast('Failed to delete post', 'error'); btn.disabled = false; }
  },

  _expandFeedCard(btn, itemId) {
    const item = this.socialFeedItems?.find(i => i.id === itemId);
    const el = document.getElementById(`feed-body-${itemId}`);
    if (!item || !el) return;
    el.innerHTML = this.escapeHtml(item.body || '');
    btn.remove();
  },

  async createNewPost() {
    if (!this.currentUser) { this.showToast('Sign in to post updates', 'warning'); this.handleAuth(); return; }
    this.showView('social');
    setTimeout(() => document.getElementById('social-post-input')?.focus(), 150);
  },

  async handleSocialPostSubmit(e) {
    e.preventDefault();
    if (!this.currentUser) { this.showToast('Sign in to post', 'warning'); this.handleAuth(); return; }
    const input = document.getElementById('social-post-input');
    const tagsEl = document.getElementById('social-post-tags');
    const btn = document.getElementById('social-post-submit');
    const body = this.sanitizeInput(input?.value || '');
    if (!body) { this.showToast('Post cannot be empty', 'warning'); input?.focus(); return; }
    if (body.length > 500) { this.showToast('Post is over the 500 character limit', 'warning'); return; }
    const tags = (tagsEl?.value || '').split(',').map(t => this.sanitizeInput(t.trim())).filter(Boolean).slice(0, 8);
    this.setButtonLoading(btn, true, '');
    try {
      await this.db.collection('forum').add({
        body, tags,
        createdBy: this.currentUser.uid,
        displayName: this.currentUser.displayName || 'Explorer',
        photoURL: this.currentUser.photoURL || null,
        likesCount: 0, commentCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      if (input) input.value = '';
      if (tagsEl) tagsEl.value = '';
      const counter = document.getElementById('social-char-count');
      if (counter) counter.textContent = '0 / 500';
      const fill = document.getElementById('social-char-fill');
      if (fill) { fill.style.width = '0%'; fill.className = 'feed-composer-charfill'; }
      this.showToast('Post shared!', 'success');
      this.loadSocialFeed();
    } catch { this.showToast('Failed to share post', 'error'); }
    finally { this.setButtonLoading(btn, false); }
  },

  async togglePostLike(postId) {
    if (!this.currentUser) { this.showToast('Sign in to like posts', 'warning'); this.handleAuth(); return; }
    const opKey = `post-like-${postId}`;
    if (this.activeOperations.has(opKey)) return;
    this.activeOperations.add(opKey);
    try {
      const likeRef = this.db.collection('post_likes').doc(`${this.currentUser.uid}_${postId}`);
      const postRef = this.db.collection('forum').doc(postId);
      let isLiked = false;
      await this.db.runTransaction(async (transaction) => {
        const likeDoc = await transaction.get(likeRef);
        isLiked = likeDoc.exists;
        if (isLiked) {
          transaction.delete(likeRef);
          transaction.update(postRef, { likesCount: firebase.firestore.FieldValue.increment(-1) });
        } else {
          transaction.set(likeRef, { userId: this.currentUser.uid, postId, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
          transaction.update(postRef, { likesCount: firebase.firestore.FieldValue.increment(1) });
        }
      });
      const countEl = document.getElementById(`like-count-${postId}`);
      const btn = document.getElementById(`like-btn-${postId}`);
      if (isLiked) {
        if (countEl) countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
        if (btn) btn.classList.remove('active');
      } else {
        if (countEl) countEl.textContent = parseInt(countEl.textContent) + 1;
        if (btn) btn.classList.add('active');
      }
    } catch { this.showToast('Failed to update like', 'error'); }
    finally { this.activeOperations.delete(opKey); }
  },

  togglePostComments(postId) {
    const panel = document.getElementById(`comments-panel-${postId}`);
    if (!panel) return;
    const wasHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    if (wasHidden) this.loadPostComments(postId);
  },

  async submitPostComment(postId) {
    if (!this.currentUser) { this.showToast('Sign in to comment', 'warning'); return; }
    const input = document.getElementById(`comment-field-${postId}`);
    const text = this.sanitizeInput(input?.value?.trim() || '');
    if (!text) { this.showToast('Comment cannot be empty', 'warning'); return; }
    const btn = input?.nextElementSibling;
    if (btn) { btn.disabled = true; }
    try {
      await this.addPostComment(postId, text);
      if (input) input.value = '';
    } catch { this.showToast('Failed to add comment', 'error'); }
    finally { if (btn) btn.disabled = false; }
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
    container.innerHTML = '<div class="loading" style="padding:8px 0">loading...</div>';
    try {
      const snap = await this.db.collection('post_comments')
        .where('postId', '==', postId)
        .orderBy('createdAt', 'asc')
        .limit(20)
        .get();
      if (snap.empty) { container.innerHTML = '<div class="feed-no-comments">no comments yet</div>'; return; }
      container.innerHTML = '';
      snap.forEach(doc => {
        const d = doc.data();
        const el = document.createElement('div');
        el.className = 'feed-comment';
        el.innerHTML = `
          <span class="feed-comment-user">${this.escapeHtml(d.displayName)}</span>
          <span class="feed-comment-time">${this.timeAgo(d.createdAt?.toDate?.())}</span>
          <p class="feed-comment-text">${this.escapeHtml(d.text)}</p>`;
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
      await this.db.collection('user_followers').doc(`${this.currentUser.uid}_${userId}`).set({
        followerId: this.currentUser.uid, followingId: userId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
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
      const ref = this.db.collection('user_followers').doc(`${this.currentUser.uid}_${userId}`);
      const snap = await ref.get();
      if (snap.exists) { await this.unfollowUser(userId); this.updateFollowButtons(userId, false); }
      else { await this.followUser(userId); this.updateFollowButtons(userId, true); }
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
      if (snap.exists) {
        await ref.delete();
        if (btn) btn.textContent = 'Follow';
        btn?.classList.remove('following');
      } else {
        await ref.set({ followerId: this.currentUser.uid, followingId: userId, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        if (btn) btn.textContent = 'Unfollow';
        btn?.classList.add('following');
        this.showToast('Following!', 'success');
      }
    } catch { this.showToast('Failed to update follow status', 'error'); }
    finally { this.activeOperations.delete(opKey); }
  },

  updateFollowButtons(userId, following) {
    const btn = document.getElementById(`follow-btn-${userId}`);
    if (btn) {
      btn.innerHTML = following ? '<i class="fas fa-user-check"></i> Unfollow' : '<i class="fas fa-user-plus"></i> Follow';
      btn.className = following ? 'btn' : 'btn btn-primary';
    }
    const feedBtn = document.getElementById(`follow-feed-${userId}`);
    if (feedBtn) {
      feedBtn.textContent = following ? 'Unfollow' : 'Follow';
      feedBtn.classList.toggle('following', following);
    }
  },
};
