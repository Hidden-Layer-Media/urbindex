export const forumMethods = {
  _forumBoards: [
    { id: 'general',    name: 'General Discussion',       desc: 'Introductions, general urbex talk, off-topic.',       icon: 'fa-comments' },
    { id: 'intel',      name: 'Location Intel',            desc: 'Reports, tips, and info on specific locations.',       icon: 'fa-map-pin' },
    { id: 'gear',       name: 'Gear & Kit',                desc: 'Equipment, cameras, safety gear, loadout talk.',       icon: 'fa-toolbox' },
    { id: 'techniques', name: 'Techniques',                desc: 'Methods, approaches, urban navigation, safety.',       icon: 'fa-book' },
    { id: 'photo',      name: 'Urban Art & Photography',   desc: 'Share shots and visual finds from the field.',         icon: 'fa-camera' },
    { id: 'meetups',    name: 'Meetups & Events',          desc: 'Organize trips, crew meetups, local events.',          icon: 'fa-users' },
  ],

  _forumCtx: {},

  showForum() {
    this._forumCtx = {};
    const view = document.getElementById('forum-view-content');
    if (!view) return;

    const user = this.currentUser;
    const userHandle = user && !user.isAnonymous
      ? this.escapeHtml(user.displayName || user.email?.split('@')[0] || 'user')
      : null;

    const boardRows = this._forumBoards.map(b => `
      <div class="forum-board-row" data-board-id="${b.id}" tabindex="0" role="button">
        <div class="forum-board-icon"><i class="fas ${b.icon}"></i></div>
        <div class="forum-board-info">
          <div class="forum-board-name">${b.name}</div>
          <div class="forum-board-desc">${b.desc}</div>
        </div>
        <div class="forum-board-stats" id="fstats-${b.id}">
          <div class="forum-stat"><span class="forum-stat-val">--</span><span class="forum-stat-lbl">threads</span></div>
          <div class="forum-stat"><span class="forum-stat-val">--</span><span class="forum-stat-lbl">posts</span></div>
        </div>
        <div class="forum-board-last" id="flast-${b.id}">
          <span style="color:var(--text-muted);font-size:0.8rem;">loading...</span>
        </div>
      </div>
    `).join('');

    view.innerHTML = `
      <div class="forum-home-header">
        <div>
          <div class="cz-label" style="margin-bottom:4px;">Community</div>
          <h2 style="margin:0 0 4px;">// FORUMS</h2>
          <p style="color:var(--text-dim);font-size:0.9rem;margin:0;">Drop intel, ask questions, share finds from the field.</p>
        </div>
        ${userHandle
          ? `<div class="forum-user-badge"><i class="fas fa-terminal"></i> ${userHandle}</div>`
          : `<button class="btn btn-primary" onclick="app.handleAuth()"><i class="fas fa-terminal"></i> Sign In to Post</button>`
        }
      </div>

      <div class="forum-board-list">
        <div class="forum-board-list-header">
          <span></span>
          <span>BOARD</span>
          <span>STATS</span>
          <span>LAST POST</span>
        </div>
        ${boardRows}
      </div>
    `;

    view.querySelectorAll('.forum-board-row').forEach(row => {
      const bid = row.dataset.boardId;
      const go = () => this.showForumBoard(bid);
      row.addEventListener('click', go);
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });

    this._loadForumBoardStats();
  },

  async _loadForumBoardStats() {
    for (const board of this._forumBoards) {
      try {
        const snap = await this.db.collection('forum_threads').where('boardId', '==', board.id).get();
        let postTotal = 0;
        let latestTime = 0;
        let latestAuthor = '';
        snap.forEach(doc => {
          const d = doc.data();
          postTotal += d.postCount || 1;
          const t = d.lastPostAt?.toMillis?.() || 0;
          if (t > latestTime) { latestTime = t; latestAuthor = d.lastPostAuthorName || d.authorName || ''; }
        });
        const statsEl = document.getElementById(`fstats-${board.id}`);
        if (statsEl) statsEl.innerHTML = `
          <div class="forum-stat"><span class="forum-stat-val">${snap.size}</span><span class="forum-stat-lbl">threads</span></div>
          <div class="forum-stat"><span class="forum-stat-val">${postTotal}</span><span class="forum-stat-lbl">posts</span></div>
        `;
        const lastEl = document.getElementById(`flast-${board.id}`);
        if (lastEl) {
          if (latestTime) {
            lastEl.innerHTML = `
              <span class="forum-last-author">${this.escapeHtml(latestAuthor)}</span>
              <span class="forum-last-time">${this.timeAgo(new Date(latestTime))}</span>
            `;
          } else {
            lastEl.innerHTML = `<span style="color:var(--text-muted);font-size:0.8rem;">no posts yet</span>`;
          }
        }
      } catch { /* non-fatal */ }
    }
  },

  showForumBoard(boardId) {
    const board = this._forumBoards.find(b => b.id === boardId);
    this._forumCtx = { boardId, boardName: board?.name || boardId };
    const view = document.getElementById('forum-view-content');
    if (!view) return;

    view.innerHTML = `
      <div class="forum-nav-bar">
        <button class="btn btn-sm" onclick="app.showForum()"><i class="fas fa-arrow-left"></i> Forums</button>
        <span class="forum-breadcrumb">// ${this.escapeHtml(board?.name || boardId)}</span>
        ${this.currentUser && !this.currentUser.isAnonymous
          ? `<button class="btn btn-primary btn-sm" id="forum-new-thread-btn"><i class="fas fa-plus"></i> New Thread</button>`
          : `<button class="btn btn-sm" onclick="app.handleAuth()"><i class="fas fa-terminal"></i> Sign In to Post</button>`
        }
      </div>
      <div id="forum-thread-list"><div class="loading">Loading threads...</div></div>
    `;

    document.getElementById('forum-new-thread-btn')?.addEventListener('click', () => this.showNewThreadForm());
    this._loadForumThreads(boardId);
  },

  async _loadForumThreads(boardId) {
    const container = document.getElementById('forum-thread-list');
    if (!container) return;
    try {
      const snap = await this.db.collection('forum_threads')
        .where('boardId', '==', boardId)
        .orderBy('lastPostAt', 'desc')
        .limit(50)
        .get();

      if (snap.empty) {
        container.innerHTML = `
          <div class="forum-empty">
            <i class="fas fa-comment-slash"></i>
            <p>No threads yet — be the first to post.</p>
            ${this.currentUser && !this.currentUser.isAnonymous
              ? `<button class="btn btn-primary" id="forum-empty-new-btn"><i class="fas fa-plus"></i> Start Thread</button>`
              : ''}
          </div>`;
        document.getElementById('forum-empty-new-btn')?.addEventListener('click', () => this.showNewThreadForm());
        return;
      }

      let html = `
        <div class="forum-thread-header">
          <span class="fth-subject">SUBJECT</span>
          <span class="fth-author">AUTHOR</span>
          <span class="fth-replies">REPLIES</span>
          <span class="fth-last">LAST POST</span>
        </div>`;

      snap.forEach(doc => {
        const d = doc.data();
        const replies = Math.max(0, (d.postCount || 1) - 1);
        const lastTime = d.lastPostAt ? this.timeAgo(d.lastPostAt.toDate()) : 'just now';
        const lastAuthor = this.escapeHtml(d.lastPostAuthorName || d.authorName || '');
        html += `
          <div class="forum-thread-row" data-tid="${doc.id}" data-ttitle="${this.escapeHtml(d.title || 'Untitled')}" tabindex="0" role="button">
            <div class="forum-thread-subject">
              <i class="fas fa-comment-alt forum-thread-icon"></i>
              <span class="forum-thread-title">${this.escapeHtml(d.title || 'Untitled')}</span>
            </div>
            <span class="forum-thread-author">${this.escapeHtml(d.authorName || 'unknown')}</span>
            <span class="forum-thread-replies">${replies}</span>
            <div class="forum-thread-last">
              <span class="forum-last-author">${lastAuthor}</span>
              <span class="forum-last-time">${lastTime}</span>
            </div>
          </div>`;
      });

      container.innerHTML = html;

      container.querySelectorAll('.forum-thread-row').forEach(row => {
        const go = () => {
          this._forumCtx.threadId = row.dataset.tid;
          this._forumCtx.threadTitle = row.dataset.ttitle;
          this.showForumThread(row.dataset.tid);
        };
        row.addEventListener('click', go);
        row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
    } catch (e) {
      container.innerHTML = `<div class="error">Failed to load threads.</div>`;
    }
  },

  showNewThreadForm() {
    const { boardId, boardName } = this._forumCtx;
    if (!this.currentUser || this.currentUser.isAnonymous) { this.showToast('Sign in to post', 'warning'); this.handleAuth(); return; }
    const view = document.getElementById('forum-view-content');
    if (!view) return;

    view.innerHTML = `
      <div class="forum-nav-bar">
        <button class="btn btn-sm" id="forum-compose-back"><i class="fas fa-arrow-left"></i> ${this.escapeHtml(boardName || 'Board')}</button>
        <span class="forum-breadcrumb">// New Thread</span>
      </div>
      <div class="panel forum-compose-panel">
        <div class="panel-header"><i class="fas fa-edit"></i> // NEW THREAD — ${this.escapeHtml(boardName || '')}</div>
        <div class="forum-compose-body">
          <div class="form-group">
            <label class="form-label">SUBJECT:</label>
            <input class="input" id="forum-new-title" maxlength="120" placeholder="Thread title..." autofocus>
          </div>
          <div class="form-group">
            <label class="form-label">MESSAGE:</label>
            <textarea class="textarea" id="forum-new-body" rows="10" maxlength="10000" placeholder="Your post..."></textarea>
            <div class="forum-char-count"><span id="forum-new-count">0</span>/10000</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-primary" id="forum-compose-submit"><i class="fas fa-paper-plane"></i> Post Thread</button>
            <button class="btn" id="forum-compose-cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('forum-compose-back')?.addEventListener('click', () => this.showForumBoard(boardId));
    document.getElementById('forum-compose-cancel')?.addEventListener('click', () => this.showForumBoard(boardId));
    document.getElementById('forum-compose-submit')?.addEventListener('click', () => this._submitNewThread());

    const bodyEl = document.getElementById('forum-new-body');
    const countEl = document.getElementById('forum-new-count');
    if (bodyEl && countEl) bodyEl.addEventListener('input', () => { countEl.textContent = bodyEl.value.length; });
  },

  async _submitNewThread() {
    if (!this.currentUser || this.currentUser.isAnonymous) return;
    const { boardId } = this._forumCtx;
    const titleEl = document.getElementById('forum-new-title');
    const bodyEl  = document.getElementById('forum-new-body');
    const title   = titleEl?.value.trim();
    const body    = bodyEl?.value.trim();

    if (!title) { this.showToast('Thread needs a title', 'warning'); titleEl?.focus(); return; }
    if (!body)  { this.showToast('Thread needs content', 'warning'); bodyEl?.focus(); return; }
    if (body.length > 10000) { this.showToast('Post too long (max 10000 chars)', 'warning'); return; }

    const submitBtn = document.getElementById('forum-compose-submit');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Posting...'; }

    try {
      const authorName = this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'anonymous';
      const now = firebase.firestore.FieldValue.serverTimestamp();
      let newThreadId;

      await this.db.runTransaction(async (transaction) => {
        const threadRef = this.db.collection('forum_threads').doc();
        newThreadId = threadRef.id;
        
        transaction.set(threadRef, {
          boardId,
          title:               this.sanitizeInput(title),
          authorId:            this.currentUser.uid,
          authorName:          this.sanitizeInput(authorName),
          createdAt:           now,
          postCount:           1,
          lastPostAt:          now,
          lastPostAuthorName:  this.sanitizeInput(authorName),
        });

        const postRef = this.db.collection('forum_posts').doc();
        transaction.set(postRef, {
          threadId:   newThreadId,
          boardId,
          content:    this.sanitizeInput(body),
          authorId:   this.currentUser.uid,
          authorName: this.sanitizeInput(authorName),
          createdAt:  now,
          postNumber: 1,
          isOp:       true,
        });
      });

      this.showToast('Thread posted!', 'success');
      this._forumCtx.threadId    = newThreadId;
      this._forumCtx.threadTitle = title;
      this.showForumThread(newThreadId);
    } catch (e) {
      this.showToast('Failed to post thread', 'error');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Thread'; }
    }
  },

  showForumThread(threadId) {
    const { boardId, boardName, threadTitle } = this._forumCtx;
    const view = document.getElementById('forum-view-content');
    if (!view) return;

    const canPost = this.currentUser && !this.currentUser.isAnonymous;

    view.innerHTML = `
      <div class="forum-nav-bar">
        <button class="btn btn-sm" id="forum-thread-back"><i class="fas fa-arrow-left"></i> ${this.escapeHtml(boardName || 'Board')}</button>
        <span class="forum-breadcrumb forum-thread-breadcrumb">// ${this.escapeHtml(threadTitle || 'Thread')}</span>
      </div>
      <div id="forum-posts-container"><div class="loading">Loading posts...</div></div>
      ${canPost ? `
        <div class="panel forum-compose-panel" id="forum-reply-box">
          <div class="panel-header"><i class="fas fa-reply"></i> // POST REPLY</div>
          <div class="forum-compose-body">
            <textarea class="textarea" id="forum-reply-body" rows="5" maxlength="10000" placeholder="Your reply..."></textarea>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
              <span class="forum-char-count"><span id="forum-reply-count">0</span>/10000</span>
              <button class="btn btn-primary" id="forum-reply-submit"><i class="fas fa-paper-plane"></i> Post Reply</button>
            </div>
          </div>
        </div>
      ` : `
        <div class="panel" style="padding:16px;text-align:center;">
          <button class="btn btn-primary" onclick="app.handleAuth()"><i class="fas fa-terminal"></i> Sign In to Reply</button>
        </div>
      `}
    `;

    document.getElementById('forum-thread-back')?.addEventListener('click', () => this.showForumBoard(boardId));
    document.getElementById('forum-reply-submit')?.addEventListener('click', () => this._submitForumReply(threadId));

    const replyEl  = document.getElementById('forum-reply-body');
    const replyCnt = document.getElementById('forum-reply-count');
    if (replyEl && replyCnt) replyEl.addEventListener('input', () => { replyCnt.textContent = replyEl.value.length; });

    this._loadForumPosts(threadId);
  },

  async _loadForumPosts(threadId) {
    const container = document.getElementById('forum-posts-container');
    if (!container) return;
    try {
      const snap = await this.db.collection('forum_posts')
        .where('threadId', '==', threadId)
        .orderBy('createdAt', 'asc')
        .get();

      if (snap.empty) { container.innerHTML = '<div class="forum-empty"><p>No posts found.</p></div>'; return; }

      container.innerHTML = '';
      let postNum = 0;
      snap.forEach(doc => {
        postNum++;
        const d   = doc.data();
        const el  = document.createElement('div');
        el.className = 'forum-post';
        const initials = (d.authorName || '?').slice(0, 2).toUpperCase();
        const timeStr  = d.createdAt ? this.timeAgo(d.createdAt.toDate()) : 'just now';
        const isOwn    = this.currentUser && d.authorId === this.currentUser.uid;
        const content  = this.escapeHtml(d.content || '').replace(/\n/g, '<br>');
        el.innerHTML = `
          <div class="forum-post-header">
            <div class="forum-post-meta">
              <div class="forum-post-avatar">${initials}</div>
              <div class="forum-post-author-col">
                <span class="forum-post-author">${this.escapeHtml(d.authorName || 'unknown')}</span>
                ${d.isOp ? '<span class="forum-op-badge">OP</span>' : ''}
              </div>
            </div>
            <div class="forum-post-info">
              <span class="forum-post-num">#${postNum}</span>
              <span class="forum-post-time">${timeStr}</span>
            </div>
          </div>
          <div class="forum-post-body">${content}</div>
          ${isOwn ? `<div class="forum-post-footer"><button class="btn btn-sm forum-delete-btn" data-pid="${doc.id}" data-tid="${threadId}"><i class="fas fa-trash-alt"></i> Delete</button></div>` : ''}
        `;
        container.appendChild(el);
      });

      container.querySelectorAll('.forum-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => this._deleteForumPost(btn.dataset.pid, btn.dataset.tid));
      });
    } catch (e) {
      container.innerHTML = `<div class="error">Failed to load posts.</div>`;
    }
  },

  async _submitForumReply(threadId) {
    if (!this.currentUser || this.currentUser.isAnonymous) return;
    const { boardId } = this._forumCtx;
    const bodyEl  = document.getElementById('forum-reply-body');
    const content = bodyEl?.value.trim();
    if (!content) { this.showToast('Reply cannot be empty', 'warning'); bodyEl?.focus(); return; }
    if (content.length > 10000) { this.showToast('Reply too long (max 10000 chars)', 'warning'); return; }

    const submitBtn = document.getElementById('forum-reply-submit');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Posting...'; }

    try {
      const authorName = this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'anonymous';
      const now = firebase.firestore.FieldValue.serverTimestamp();
      const threadRef = this.db.collection('forum_threads').doc(threadId);

      await this.db.runTransaction(async (transaction) => {
        const threadDoc = await transaction.get(threadRef);
        if (!threadDoc.exists) throw new Error('Thread does not exist');
        
        const newPostCount = (threadDoc.data().postCount || 1) + 1;
        const postRef = this.db.collection('forum_posts').doc();
        
        transaction.set(postRef, {
          threadId,
          boardId:    boardId || '',
          content:    this.sanitizeInput(content),
          authorId:   this.currentUser.uid,
          authorName: this.sanitizeInput(authorName),
          createdAt:  now,
          postNumber: newPostCount,
          isOp:       false,
        });

        transaction.update(threadRef, {
          postCount:          newPostCount,
          lastPostAt:         now,
          lastPostAuthorName: this.sanitizeInput(authorName),
        });
      });

      if (bodyEl) bodyEl.value = '';
      const cntEl = document.getElementById('forum-reply-count');
      if (cntEl) cntEl.textContent = '0';
      this.showToast('Reply posted!', 'success');
      this._loadForumPosts(threadId);
    } catch (e) {
      this.showToast('Failed to post reply', 'error');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Reply'; }
    }
  },

  async _deleteForumPost(postId, threadId) {
    if (!this.currentUser) return;
    if (!confirm('Delete this post?')) return;
    try {
      await this.db.collection('forum_posts').doc(postId).delete();
      await this.db.collection('forum_threads').doc(threadId).update({
        postCount: firebase.firestore.FieldValue.increment(-1),
      });
      this.showToast('Post deleted', 'success');
      this._loadForumPosts(threadId);
    } catch {
      this.showToast('Failed to delete post', 'error');
    }
  },
};
