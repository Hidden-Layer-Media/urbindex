export const gamificationMethods = {
  async updateUserXP(userId, actionType) {
    const xpTable = { check_in: 10, add_location: 50, post_forum: 5, add_comment: 2 };
    const xpGain = xpTable[actionType] || 0;
    if (xpGain === 0) return;

    const ref = this.db.collection('user_xp').doc(userId);
    try {
      await this.db.runTransaction(async (transaction) => {
        const doc = await transaction.get(ref);
        const currentXP = doc.exists ? (doc.data().xp || 0) : 0;
        const newXP = currentXP + xpGain;
        const newLevel = Math.floor(newXP / 100) + 1;
        transaction.set(ref, { xp: newXP, level: newLevel, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      });
    } catch (e) {
      console.error('Failed to update XP:', e);
    }
  },

  getUserLevelBadge(level) {
    if (level >= 10) return '<i class="fas fa-skull" style="color:var(--red-alert);"></i> Veteran';
    if (level >= 5) return '<i class="fas fa-shield-alt" style="color:var(--yellow);"></i> Explorer';
    return '<i class="fas fa-user" style="color:var(--text-muted);"></i> Scout';
  }
};
