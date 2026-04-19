export const settingsMethods = {
  showSettings() {
    const content = document.getElementById('settings-content');
    if (!content) return;
    if (!this.currentUser) {
      content.innerHTML = `<div style="text-align:center;padding:48px;"><i class="fas fa-lock" style="font-size:3rem;color:var(--text-muted);margin-bottom:16px;"></i><h3>// SIGN IN REQUIRED</h3><p style="color:var(--text-muted);margin-bottom:20px;">Sign in to manage your account settings and preferences</p><button class="btn btn-primary" onclick="app.handleAuth()"><i class="fas fa-sign-in-alt"></i> Sign In Now</button></div>`;
      return;
    }
    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h2>// SETTINGS</h2>
        <button class="btn" onclick="app.showView('map')"><i class="fas fa-map"></i> Back to Map</button>
      </div>

      <div class="panel">
        <h3 style="margin-bottom:16px;"><i class="fas fa-user-cog"></i> Account Settings</h3>
        <div class="form-group">
          <label class="form-label">Display Name</label>
          <input class="input" type="text" id="settings-display-name" value="${this.escapeHtml(this.currentUser.displayName || '')}" placeholder="Your display name">
        </div>
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input class="input" type="email" id="settings-email" value="${this.escapeHtml(this.currentUser.email || '')}" disabled>
          <div class="field-help">Email cannot be changed. Contact support if needed.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Account Status</label>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <span class="chip ${this.currentUser.emailVerified ? 'live' : 'signal'}"><i class="fas ${this.currentUser.emailVerified ? 'fa-check-circle' : 'fa-clock'}"></i> ${this.currentUser.emailVerified ? 'Verified' : 'Unverified'}</span>
            <span class="chip">${this.currentUser.isAnonymous ? 'Anonymous' : 'Registered'}</span>
            <span class="chip">Joined ${new Date(this.currentUser.metadata?.creationTime).toLocaleDateString()}</span>
            ${!this.currentUser.emailVerified ? `<button class="btn" style="font-size:0.8rem;padding:3px 8px;" onclick="app.resendVerificationEmail()"><i class="fas fa-envelope"></i> Verify Email</button>` : ''}
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="app.updateAccountSettings()"><i class="fas fa-save"></i> Save Account Settings</button>
        </div>
      </div>

      <div class="panel" style="margin-top:16px;">
        <h3 style="margin-bottom:16px;"><i class="fas fa-bell"></i> Notification Preferences</h3>
        <div class="form-group">
          <label class="form-label">Email Notifications</label>
          <select class="select" id="settings-email-notifications"><option value="all">All Activity</option><option value="important">Important Only</option><option value="none">Disabled</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Push Notifications</label>
          <select class="select" id="settings-push-notifications"><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Frequency</label>
          <select class="select" id="settings-notification-frequency"><option value="realtime">Real-time</option><option value="hourly">Hourly Digest</option><option value="daily">Daily Digest</option><option value="weekly">Weekly Summary</option></select>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="app.updateNotificationSettings()"><i class="fas fa-save"></i> Save Preferences</button>
        </div>
      </div>

      <div class="panel" style="margin-top:16px;">
        <h3 style="margin-bottom:16px;"><i class="fas fa-shield-alt"></i> Privacy &amp; Security</h3>
        <div class="form-group">
          <label class="form-label">Profile Visibility</label>
          <select class="select" id="settings-profile-visibility"><option value="public">Public</option><option value="followers">Followers Only</option><option value="private">Private</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Location Visibility</label>
          <select class="select" id="settings-location-visibility"><option value="public">Public (Show on map)</option><option value="followers">Followers Only</option><option value="private">Private</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Activity Feed Visibility</label>
          <select class="select" id="settings-activity-visibility"><option value="public">Public</option><option value="followers">Followers Only</option><option value="private">Private</option></select>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="app.updatePrivacySettings()"><i class="fas fa-save"></i> Save Privacy Settings</button>
        </div>
      </div>

      <div class="panel" style="margin-top:16px;">
        <h3 style="margin-bottom:16px;"><i class="fas fa-palette"></i> Display &amp; Interface</h3>
        <div class="form-group">
          <label class="form-label">Map Tile Style</label>
          <select class="select" id="settings-map-style"><option value="default">OpenStreetMap Default</option><option value="dark">Dark Mode Map</option><option value="terrain">Terrain View</option></select>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="app.updateDisplaySettings()"><i class="fas fa-save"></i> Save Display Settings</button>
        </div>
      </div>

      <div class="panel" style="margin-top:16px;">
        <h3 style="margin-bottom:16px;"><i class="fas fa-tools"></i> Account Management</h3>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <button class="btn" style="background:var(--amber);color:#000;" onclick="app.showChangePasswordModal()"><i class="fas fa-key"></i> Change Password</button>
          <button class="btn" style="background:var(--yellow);color:#000;" onclick="app.exportData()"><i class="fas fa-download"></i> Export My Data (JSON)</button>
          <button class="btn" style="background:var(--red-alert);color:#000;" onclick="app.confirmDeleteAccount()"><i class="fas fa-trash-alt"></i> Delete Account Permanently</button>
        </div>
      </div>

      <div class="panel" style="margin-top:16px;">
        <h3 style="margin-bottom:16px;"><i class="fas fa-info-circle"></i> App Information</h3>
        <div style="color:var(--text-dim);font-family:var(--font-mono);font-size:12px;line-height:1.8;">
          <div>Version: 2.0.0-vite</div>
          <div>Last Updated: ${new Date().toLocaleDateString()}</div>
          <div>Storage Used: <span id="storage-used">Calculating...</span></div>
          <div>Cache Status: <span id="cache-status">Active</span></div>
        </div>
        <button class="btn" style="margin-top:12px;" onclick="app.clearCache()"><i class="fas fa-broom"></i> Clear Cache</button>
      </div>`;

    this.loadUserSettings();
    this.calculateStorageUsage();
  },

  async loadUserSettings() {
    if (!this.currentUser) return;
    try {
      const doc = await this.db.collection('user_settings').doc(this.currentUser.uid).get();
      if (!doc.exists) return;
      const s = doc.data();
      const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
      set('settings-email-notifications', s.emailNotifications);
      set('settings-push-notifications', s.pushNotifications);
      set('settings-notification-frequency', s.notificationFrequency);
      set('settings-profile-visibility', s.profileVisibility);
      set('settings-location-visibility', s.locationVisibility);
      set('settings-activity-visibility', s.activityVisibility);
      set('settings-map-style', s.mapStyle);
    } catch {}
  },

  async updateAccountSettings() {
    if (!this.currentUser) return;
    const name = document.getElementById('settings-display-name')?.value.trim();
    try {
      await this.currentUser.updateProfile({ displayName: name });
      await this.db.collection('users').doc(this.currentUser.uid).update({ displayName: name, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      this.showToast('Account settings updated successfully!', 'success');
      if (document.getElementById('profile-view')?.classList.contains('active')) this.loadProfile();
    } catch { this.showToast('Failed to update account settings', 'error'); }
  },

  async updateNotificationSettings() {
    if (!this.currentUser) return;
    const payload = {
      emailNotifications: document.getElementById('settings-email-notifications')?.value,
      pushNotifications: document.getElementById('settings-push-notifications')?.value,
      notificationFrequency: document.getElementById('settings-notification-frequency')?.value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    try {
      await this.db.collection('user_settings').doc(this.currentUser.uid).set(payload, { merge: true });
      this.showToast('Notification settings updated!', 'success');
    } catch { this.showToast('Failed to update notification settings', 'error'); }
  },

  async updatePrivacySettings() {
    if (!this.currentUser) return;
    const payload = {
      profileVisibility: document.getElementById('settings-profile-visibility')?.value,
      locationVisibility: document.getElementById('settings-location-visibility')?.value,
      activityVisibility: document.getElementById('settings-activity-visibility')?.value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    try {
      await this.db.collection('user_settings').doc(this.currentUser.uid).set(payload, { merge: true });
      this.showToast('Privacy settings updated!', 'success');
    } catch { this.showToast('Failed to update privacy settings', 'error'); }
  },

  async updateDisplaySettings() {
    if (!this.currentUser) return;
    const mapStyle = document.getElementById('settings-map-style')?.value;
    try {
      await this.db.collection('user_settings').doc(this.currentUser.uid).set({ mapStyle, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      this.showToast('Display settings updated!', 'success');
    } catch { this.showToast('Failed to update display settings', 'error'); }
  },

  showChangePasswordModal() {
    if (!this.currentUser || this.currentUser.isAnonymous) { this.showToast('Password change not available for anonymous accounts', 'warning'); return; }
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        <h3><i class="fas fa-key"></i> Change Password</h3>
        <form id="change-password-form">
          <div class="form-group"><label class="form-label required">Current Password</label><input class="input" type="password" id="current-password" required autocomplete="current-password"></div>
          <div class="form-group"><label class="form-label required">New Password</label><input class="input" type="password" id="new-password" required minlength="8" autocomplete="new-password"><div class="field-help">Minimum 8 characters</div></div>
          <div class="form-group"><label class="form-label required">Confirm New Password</label><input class="input" type="password" id="confirm-new-password" required autocomplete="new-password"></div>
          <div class="form-actions">
            <button type="button" class="btn" onclick="this.closest('.modal').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-key"></i> Change Password</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('change-password-form').addEventListener('submit', async e => { e.preventDefault(); await this.handlePasswordChange(); });
  },

  async handlePasswordChange() {
    const cur = document.getElementById('current-password')?.value;
    const nw = document.getElementById('new-password')?.value;
    const conf = document.getElementById('confirm-new-password')?.value;
    if (nw !== conf) { this.showToast('New passwords do not match', 'error'); return; }
    if ((nw || '').length < 8) { this.showToast('New password must be at least 8 characters', 'warning'); return; }
    try {
      const cred = firebase.auth.EmailAuthProvider.credential(this.currentUser.email, cur);
      await this.currentUser.reauthenticateWithCredential(cred);
      await this.currentUser.updatePassword(nw);
      document.querySelector('#change-password-form')?.closest('.modal')?.remove();
      this.showToast('Password changed successfully!', 'success');
    } catch (err) {
      const msgs = { 'auth/wrong-password': 'Current password is incorrect', 'auth/weak-password': 'New password is too weak' };
      this.showToast(msgs[err.code] || 'Failed to change password', 'error');
    }
  },

  confirmDeleteAccount() {
    if (!this.currentUser) return;
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        <h3 style="color:var(--red-alert);"><i class="fas fa-exclamation-triangle"></i> Delete Account</h3>
        <div style="margin:20px 0;padding:12px;border:1px solid var(--red-alert);">
          <p style="margin-bottom:12px;">This action is <strong>PERMANENT</strong> and will delete all your locations, posts, and profile data.</p>
        </div>
        <div class="form-group"><label class="form-label required">Type "DELETE" to confirm:</label><input class="input" type="text" id="delete-confirm-text" placeholder="DELETE" autocomplete="off"></div>
        <div class="form-actions">
          <button type="button" class="btn" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="button" class="btn" style="background:var(--red-alert);color:#000;" onclick="app.executeAccountDeletion()"><i class="fas fa-trash-alt"></i> Delete My Account</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  async executeAccountDeletion() {
    if (document.getElementById('delete-confirm-text')?.value !== 'DELETE') { this.showToast('Please type DELETE to confirm', 'warning'); return; }
    const opKey = 'delete-account-final';
    if (this.activeOperations.has(opKey)) return;
    this.activeOperations.add(opKey);
    try {
      const uid = this.currentUser.uid;
      this.showToast('Deleting account data...', 'info');
      const colls = ['locations','forum','comments','user_followers','user_notifications','user_settings','post_likes','location_likes','location_visits'];
      for (const c of colls) {
        for (const field of ['userId', 'createdBy']) {
          const snap = await this.db.collection(c).where(field, '==', uid).limit(50).get();
          if (!snap.empty) { const b = this.db.batch(); snap.docs.forEach(d => b.delete(d.ref)); await b.commit(); }
        }
      }
      await this.db.collection('users').doc(uid).delete();
      await this.currentUser.delete();
      document.querySelectorAll('.modal').forEach(m => m.remove());
      this.showToast('Account deleted successfully. Goodbye.', 'success');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      this.showToast(err.code === 'auth/requires-recent-login' ? 'Please sign out and sign back in before deleting your account' : 'Failed to delete account', 'error');
    } finally { this.activeOperations.delete(opKey); }
  },

  async exportData() {
    if (!this.currentUser) { this.showToast('Please sign in to export your data', 'warning'); return; }
    const opKey = 'export-data';
    if (this.activeOperations.has(opKey)) return;
    this.activeOperations.add(opKey);
    try {
      this.showToast('Gathering your data...', 'info');
      const uid = this.currentUser.uid;
      const [userDoc, locsSnap, forumSnap, commentsSnap, followersSnap, followingSnap, badgesSnap] = await Promise.all([
        this.db.collection('users').doc(uid).get(),
        this.db.collection('locations').where('createdBy', '==', uid).get(),
        this.db.collection('forum').where('createdBy', '==', uid).get(),
        this.db.collection('comments').where('createdBy', '==', uid).get(),
        this.db.collection('user_followers').where('followingId', '==', uid).get(),
        this.db.collection('user_followers').where('followerId', '==', uid).get(),
        this.db.collection('user_badges').where('userId', '==', uid).get(),
      ]);
      const exportData = {
        exportDate: new Date().toISOString(),
        user: { uid, email: this.currentUser.email, displayName: this.currentUser.displayName, photoURL: this.currentUser.photoURL, emailVerified: this.currentUser.emailVerified, createdAt: this.currentUser.metadata?.creationTime, lastSignIn: this.currentUser.metadata?.lastSignInTime },
        profile: userDoc.exists ? userDoc.data() : {},
        locations: locsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        posts: forumSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        comments: commentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        followers: followersSnap.docs.map(d => d.data().followerId),
        following: followingSnap.docs.map(d => d.data().followingId),
        badges: badgesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `urbindex-export-${uid}-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      this.showToast('Data exported successfully!', 'success');
    } catch { this.showToast('Failed to export data', 'error'); }
    finally { this.activeOperations.delete(opKey); }
  },

  async calculateStorageUsage() {
    if (!this.currentUser) return;
    try {
      const snap = await this.db.collection('locations').where('createdBy', '==', this.currentUser.uid).get();
      let size = 0;
      snap.forEach(doc => { size += new Blob([JSON.stringify(doc.data())]).size; });
      const el = document.getElementById('storage-used');
      if (el) el.textContent = size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(2)} MB` : `${(size / 1024).toFixed(2)} KB`;
    } catch { const el = document.getElementById('storage-used'); if (el) el.textContent = 'Unknown'; }
  },

  async clearCache() {
    try {
      if ('caches' in window) { const names = await caches.keys(); await Promise.all(names.map(n => caches.delete(n))); }
      sessionStorage.clear();
      const auth = localStorage.getItem('firebase:authUser');
      localStorage.clear();
      if (auth) localStorage.setItem('firebase:authUser', auth);
      this.showToast('Cache cleared successfully!', 'success');
      const el = document.getElementById('cache-status');
      if (el) { el.textContent = 'Cleared'; setTimeout(() => { el.textContent = 'Active'; }, 3000); }
    } catch { this.showToast('Failed to clear cache', 'error'); }
  },
};
