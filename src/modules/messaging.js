export const messageMethods = {
  _messageUnsubscribe: null,
  _currentThreadId: null,

  async initMessaging() {
    if (!this.currentUser) return;
    let initialLoad = true;
    this._messageUnsubscribe = this.db.collection('direct_messages')
      .where('toUserId', '==', this.currentUser.uid)
      .where('read', '==', false)
      .onSnapshot(snap => {
        if (initialLoad) { initialLoad = false; this._updateMessagesBadge(snap.size); return; }
        const added = snap.docChanges().filter(c => c.type === 'added').length;
        if (added) this.showToast(`${added} new message${added > 1 ? 's' : ''}`, 'info');
        this._updateMessagesBadge(snap.size);
      });
  },

  _updateMessagesBadge(count) {
    const badge = document.getElementById('messages-badge');
    if (badge) { badge.textContent = count; badge.classList.toggle('hidden', count === 0); }
  },

  cleanupMessaging() {
    if (this._messageUnsubscribe) { this._messageUnsubscribe(); this._messageUnsubscribe = null; }
  },

  async showInbox() {
    const view = document.getElementById('messages-view-content');
    if (!view) return;
    this._currentThreadId = null;
    if (!this.currentUser) {
      view.innerHTML = `<div class="sign-in-prompt"><i class="fas fa-lock"></i><h3>// SIGN IN REQUIRED</h3><p class="text-muted mb-20">Sign in to send and receive messages.</p><button class="btn btn-primary" onclick="app.handleAuth()"><i class="fas fa-sign-in-alt"></i> Sign In</button></div>`;
      return;
    }
    view.innerHTML = `
      <div class="view-header">
        <h2>// MESSAGES</h2>
      </div>
      <div id="inbox-list" class="loading">Loading conversations...</div>`;
    await this._loadInbox();
  },

  async _loadInbox() {
    const container = document.getElementById('inbox-list');
    if (!container || !this.currentUser) return;
    try {
      const uid = this.currentUser.uid;
      const [received, sent] = await Promise.all([
        this.db.collection('direct_messages').where('toUserId', '==', uid).orderBy('createdAt', 'desc').limit(100).get(),
        this.db.collection('direct_messages').where('fromUserId', '==', uid).orderBy('createdAt', 'desc').limit(100).get(),
      ]);

      const convos = new Map();
      const merge = (doc, isSent) => {
        const d = doc.data();
        const partnerId = isSent ? d.toUserId : d.fromUserId;
        const partnerName = isSent ? (d.toDisplayName || 'Explorer') : (d.fromDisplayName || 'Explorer');
        const ts = d.createdAt?.toDate?.() || new Date(0);
        const existing = convos.get(partnerId);
        convos.set(partnerId, {
          partnerName: existing?.partnerName || partnerName,
          lastMsg: existing ? (ts > existing.lastTime ? d.body : existing.lastMsg) : d.body,
          lastTime: existing ? (ts > existing.lastTime ? ts : existing.lastTime) : ts,
          unread: (existing?.unread || 0) + (!isSent && !d.read ? 1 : 0),
        });
      };
      received.forEach(doc => merge(doc, false));
      sent.forEach(doc => merge(doc, true));

      if (!convos.size) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-envelope-open"></i><p>No messages yet.</p></div>';
        return;
      }

      const sorted = [...convos.entries()].sort((a, b) => b[1].lastTime - a[1].lastTime);
      container.innerHTML = '';
      sorted.forEach(([partnerId, c]) => {
        const el = document.createElement('div');
        el.className = `inbox-row${c.unread ? ' inbox-row-unread' : ''}`;
        el.innerHTML = `
          <div class="inbox-avatar">${this.escapeHtml(c.partnerName.charAt(0).toUpperCase())}</div>
          <div class="inbox-info">
            <div class="inbox-name">${this.escapeHtml(c.partnerName)}${c.unread ? `<span class="inbox-unread-chip">${c.unread}</span>` : ''}</div>
            <div class="inbox-preview">${this.escapeHtml((c.lastMsg || '').substring(0, 70))}${(c.lastMsg || '').length > 70 ? '...' : ''}</div>
          </div>
          <div class="inbox-time">${this.timeAgo(c.lastTime)}</div>`;
        el.addEventListener('click', () => this.openThread(partnerId, c.partnerName));
        container.appendChild(el);
      });
    } catch { container.innerHTML = '<div class="error">Failed to load messages</div>'; }
  },

  async openThread(partnerId, partnerName) {
    const view = document.getElementById('messages-view-content');
    if (!view || !this.currentUser) return;
    this._currentThreadId = partnerId;

    view.innerHTML = `
      <div class="view-header thread-header">
        <button class="btn btn-sm" onclick="app.showInbox()"><i class="fas fa-arrow-left"></i></button>
        <h2>// ${this.escapeHtml(partnerName)}</h2>
      </div>
      <div id="thread-messages" class="thread-messages"></div>
      <div class="thread-composer">
        <textarea class="textarea thread-input" id="thread-input" rows="2" placeholder="Type a message... (Ctrl+Enter to send)"></textarea>
        <button class="btn btn-primary thread-send-btn" id="thread-send-btn" onclick="app._sendThreadMessage('${partnerId}', '${this.escapeHtml(partnerName)}')"><i class="fas fa-paper-plane"></i></button>
      </div>`;

    document.getElementById('thread-input')?.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this._sendThreadMessage(partnerId, partnerName);
      }
    });

    await this._loadThread(partnerId);
  },

  async _loadThread(partnerId) {
    const container = document.getElementById('thread-messages');
    if (!container || !this.currentUser) return;
    const uid = this.currentUser.uid;
    container.innerHTML = '<div class="loading">Loading...</div>';
    try {
      const [received, sent] = await Promise.all([
        this.db.collection('direct_messages').where('fromUserId', '==', partnerId).where('toUserId', '==', uid).orderBy('createdAt', 'asc').limit(100).get(),
        this.db.collection('direct_messages').where('fromUserId', '==', uid).where('toUserId', '==', partnerId).orderBy('createdAt', 'asc').limit(100).get(),
      ]);

      // Mark received as read
      const batch = this.db.batch();
      received.docs.filter(d => !d.data().read).forEach(d => batch.update(d.ref, { read: true }));
      batch.commit().then(() => this._updateMessagesBadge(0)).catch(() => {});

      const msgs = [];
      received.forEach(doc => msgs.push({ ...doc.data(), id: doc.id, mine: false }));
      sent.forEach(doc => msgs.push({ ...doc.data(), id: doc.id, mine: true }));
      msgs.sort((a, b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0));

      if (!msgs.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>Start the conversation.</p></div>';
        return;
      }

      container.innerHTML = '';
      msgs.forEach(m => {
        const el = document.createElement('div');
        el.className = `thread-msg ${m.mine ? 'thread-msg-mine' : 'thread-msg-theirs'}`;
        el.innerHTML = `
          <div class="thread-bubble">${this.escapeHtml(m.body || '')}</div>
          <div class="thread-msg-time">${this.timeAgo(m.createdAt?.toDate?.())}</div>`;
        container.appendChild(el);
      });
      container.scrollTop = container.scrollHeight;
    } catch { container.innerHTML = '<div class="error">Failed to load thread</div>'; }
  },

  async _sendThreadMessage(toUserId, toDisplayName) {
    const input = document.getElementById('thread-input');
    const btn = document.getElementById('thread-send-btn');
    if (!input || !this.currentUser) return;
    const body = input.value.trim();
    if (!body) return;
    input.value = '';
    if (btn) { btn.disabled = true; }
    try {
      await this.db.collection('direct_messages').add({
        fromUserId: this.currentUser.uid,
        fromDisplayName: this.currentUser.displayName || 'Explorer',
        toUserId,
        toDisplayName: toDisplayName || 'Explorer',
        body: this.sanitizeInput(body),
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      const container = document.getElementById('thread-messages');
      if (container) {
        const el = document.createElement('div');
        el.className = 'thread-msg thread-msg-mine';
        el.innerHTML = `<div class="thread-bubble">${this.escapeHtml(body)}</div><div class="thread-msg-time">just now</div>`;
        container.appendChild(el);
        container.scrollTop = container.scrollHeight;
      }
    } catch { this.showToast('Failed to send message', 'error'); input.value = body; }
    finally { if (btn) btn.disabled = false; }
  },

  async sendMessage(toUserId, body) {
    if (!this.currentUser) return;
    try {
      const toUser = await this.db.collection('users').doc(toUserId).get();
      await this.db.collection('direct_messages').add({
        fromUserId: this.currentUser.uid,
        fromDisplayName: this.currentUser.displayName || 'Explorer',
        toUserId,
        toDisplayName: toUser.exists ? (toUser.data().displayName || 'Explorer') : 'Explorer',
        body: this.sanitizeInput(body),
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      this.showToast('Message sent', 'success');
    } catch { this.showToast('Failed to send message', 'error'); }
  },
};
