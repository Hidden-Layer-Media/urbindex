export const messageMethods = {
  _messageUnsubscribe: null,

  async initMessaging() {
    if (!this.currentUser) return;
    let initialLoad = true;
    this._messageUnsubscribe = this.db.collection('direct_messages')
      .where('toUserId', '==', this.currentUser.uid)
      .where('read', '==', false)
      .onSnapshot(snap => {
        if (initialLoad) { initialLoad = false; return; }
        const added = snap.docChanges().filter(c => c.type === 'added').length;
        if (added) this.showToast(`${added} new message${added > 1 ? 's' : ''}`, 'info');
      });
  },

  cleanupMessaging() {
    if (this._messageUnsubscribe) {
      this._messageUnsubscribe();
      this._messageUnsubscribe = null;
    }
  },

  async sendMessage(toUserId, body) {
    if (!this.currentUser) return;
    try {
      await this.db.collection('direct_messages').add({
        fromUserId: this.currentUser.uid,
        fromDisplayName: this.currentUser.displayName || 'Explorer',
        toUserId,
        body: this.sanitizeInput(body),
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      this.showToast('Message sent', 'success');
    } catch { this.showToast('Failed to send message', 'error'); }
  }
};
