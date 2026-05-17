export const messageMethods = {
  async initMessaging() {
    // Set up real-time listener for new messages
    if (!this.currentUser) return;
    this.db.collection('user_messages')
      .where('toUserId', '==', this.currentUser.uid)
      .where('read', '==', false)
      .onSnapshot(snap => {
        if (!snap.empty) this.showToast(`You have ${snap.size} new message(s)`, 'info');
      });
  },

  async sendMessage(toUserId, body) {
    if (!this.currentUser) return;
    await this.db.collection('user_messages').add({
      fromUserId: this.currentUser.uid,
      fromDisplayName: this.currentUser.displayName || 'Explorer',
      toUserId,
      body: this.sanitizeInput(body),
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    this.showToast('Message sent', 'success');
  }
};
