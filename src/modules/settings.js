export const settingsMethods = {
  showSettings() {
    const content = document.getElementById('settings-content');
    if (!content) return;
    if (!this.currentUser) {
      content.innerHTML = `
        <div class="sign-in-prompt">
          <i class="fas fa-lock"></i>
          <h3>// SIGN IN REQUIRED</h3>
          <p class="text-muted mb-20">Sign in to manage your account settings and preferences</p>
          <button class="btn btn-primary" onclick="app.handleAuth()"><i class="fas fa-sign-in-alt"></i> Sign In Now</button>
        </div>`;
      return;
    }
    content.innerHTML = `
      <div class="view-header">
        <h2>// SETTINGS</h2>
      </div>

      <div class="panel settings-section">
        <h3 class="settings-section-title"><i class="fas fa-user-cog"></i> Account Settings</h3>
        <div class="form-group">
          <label class="form-label">Display Name</label>
          <input class="input" type="text" id="settings-display-name" value="${this.escapeHtml(this.currentUser.displayName || '')}" placeholder="Your display name" maxlength="40">
        </div>
        <div class="form-group">
          <label class="form-label">Bio</label>
          <textarea class="textarea" id="settings-bio" rows="2" maxlength="200" placeholder="Short field note..."></textarea>
          <div class="field-help">Max 200 characters. Shown on your profile.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Links</label>
          <input class="input" type="url" id="settings-link-1" placeholder="https://...">
          <div class="field-help">One URL shown on your profile.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input class="input" type="email" id="settings-email" value="${this.escapeHtml(this.currentUser.email || '')}" disabled>
          <div class="field-help">Email cannot be changed.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Account Status</label>
          <div class="flex gap-8 flex-wrap items-center">
            <span class="chip ${this.currentUser.emailVerified ? 'live' : 'signal'}"><i class="fas ${this.currentUser.emailVerified ? 'fa-check-circle' : 'fa-clock'}"></i> ${this.currentUser.emailVerified ? 'Verified' : 'Unverified'}</span>
            <span class="chip">${this.currentUser.isAnonymous ? 'Anonymous' : 'Registered'}</span>
            <span class="chip">Joined ${new Date(this.currentUser.metadata?.creationTime).toLocaleDateString()}</span>
            ${!this.currentUser.emailVerified ? `<button class="btn btn-sm" onclick="app.resendVerificationEmail()"><i class="fas fa-envelope"></i> Verify Email</button>` : ''}
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="app.updateAccountSettings()"><i class="fas fa-save"></i> Save Account Settings</button>
        </div>
      </div>

      <div class="panel settings-section">
        <h3 class="settings-section-title"><i class="fas fa-bell"></i> Notification Preferences</h3>
        <div class="form-group">
          <label class="form-label">Email Notifications</label>
          <select class="input" id="settings-email-notifications"><option value="all">All Activity</option><option value="important">Important Only</option><option value="none">Disabled</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Push Notifications</label>
          <select class="input" id="settings-push-notifications"><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Frequency</label>
          <select class="input" id="settings-notification-frequency"><option value="realtime">Real-time</option><option value="hourly">Hourly Digest</option><option value="daily">Daily Digest</option><option value="weekly">Weekly Summary</option></select>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="app.updateNotificationSettings()"><i class="fas fa-save"></i> Save Preferences</button>
        </div>
      </div>

      <div class="panel settings-section">
        <h3 class="settings-section-title"><i class="fas fa-shield-alt"></i> Privacy &amp; Security</h3>
        <div class="form-group">
          <label class="form-label">Profile Visibility</label>
          <select class="input" id="settings-profile-visibility"><option value="public">Public</option><option value="followers">Followers Only</option><option value="private">Private</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Location Visibility</label>
          <select class="input" id="settings-location-visibility"><option value="public">Public (Show on map)</option><option value="followers">Followers Only</option><option value="private">Private</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Activity Feed Visibility</label>
          <select class="input" id="settings-activity-visibility"><option value="public">Public</option><option value="followers">Followers Only</option><option value="private">Private</option></select>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="app.updatePrivacySettings()"><i class="fas fa-save"></i> Save Privacy Settings</button>
        </div>
      </div>

      <div class="panel settings-section">
        <h3 class="settings-section-title"><i class="fas fa-palette"></i> Display &amp; Interface</h3>
        <div class="form-group">
          <label class="form-label">Map Tile Style</label>
          <select class="input" id="settings-map-style"><option value="default">OpenStreetMap Default</option><option value="dark">Dark Mode Map</option><option value="terrain">Terrain View</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Visual Intensity</label>
          <select class="input" id="settings-intensity" onchange="app.updateTerminalIntensity(this.value)">
            <option value="0.2">Low</option>
            <option value="0.5" selected>Medium</option>
            <option value="0.8">High</option>
          </select>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" onclick="app.updateDisplaySettings()"><i class="fas fa-save"></i> Save Display Settings</button>
        </div>
      </div>

      <div class="panel settings-section">
        <h3 class="settings-section-title"><i class="fas fa-tools"></i> Account Management</h3>
        <div class="form-actions flex-col">
          <button class="btn btn-primary" onclick="app.showChangePasswordModal()"><i class="fas fa-key"></i> Change Password</button>
          <button class="btn btn-primary" onclick="app.exportData()"><i class="fas fa-download"></i> Export My Data (JSON)</button>
          <button class="btn btn-danger" onclick="app.confirmDeleteAccount()"><i class="fas fa-trash-alt"></i> Delete Account Permanently</button>
        </div>
      </div>

      <div class="panel settings-section">
        <h3 class="settings-section-title"><i class="fas fa-info-circle"></i> App Information</h3>
        <div class="app-info">
          <div>Version: 2.0.0-vite</div>
          <div>Last Updated: ${new Date().toLocaleDateString()}</div>
          <div>Storage Used: <span id="storage-used">Calculating...</span></div>
          <div>Cache Status: <span id="cache-status">Active</span></div>
        </div>
        <div class="form-actions">
          <button class="btn" onclick="app.clearCache()"><i class="fas fa-broom"></i> Clear Cache</button>
        </div>
      </div>`;

    this.loadUserSettings();
    this.calculateStorageUsage();
  },

  async loadUserSettings() {
    const intensity = localStorage.getItem('terminal-intensity');
    if (intensity) this.updateTerminalIntensity(intensity);

    if (!this.currentUser) return;
    try {
      const [settingsDoc, userDoc] = await Promise.all([
        this.db.collection('user_settings').doc(this.currentUser.uid).get(),
        this.db.collection('users').doc(this.currentUser.uid).get(),
      ]);

      if (userDoc.exists) {
        const u = userDoc.data();
        const bioEl = document.getElementById('settings-bio');
        const linkEl = document.getElementById('settings-link-1');
        if (bioEl && u.bio) bioEl.value = u.bio;
        if (linkEl && u.links?.length) linkEl.value = u.links[0] || '';
      }

      if (!settingsDoc.exists) return;
      const s = settingsDoc.data();
      const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
      set('settings-email-notifications', s.emailNotifications);
      set('settings-push-notifications', s.pushNotifications);
      set('settings-notification-frequency', s.notificationFrequency);
      set('settings-profile-visibility', s.profileVisibility);
      set('settings-location-visibility', s.locationVisibility);
      set('settings-activity-visibility', s.activityVisibility);
      set('settings-map-style', s.mapStyle);
      if (s.mapStyle) this.changeTileLayer(s.mapStyle);
      if (s.locationVisibility) this._locationVisibility = s.locationVisibility;
    } catch {}
  },

  async updateAccountSettings() {
    if (!this.currentUser) return;
    const name = document.getElementById('settings-display-name')?.value.trim();
    const bio = this.sanitizeInput(document.getElementById('settings-bio')?.value.trim() || '');
    const link = document.getElementById('settings-link-1')?.value.trim();
    const links = link && /^https?:\/\//i.test(link) ? [link] : [];
    try {
      await this.currentUser.updateProfile({ displayName: name });
      await this.db.collection('users').doc(this.currentUser.uid).update({
        displayName: name,
        bio: bio.substring(0, 200),
        links,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      this.showToast('Account settings saved', 'success');
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
    const locationVisibility = document.getElementById('settings-location-visibility')?.value || 'public';
    const payload = {
      profileVisibility: document.getElementById('settings-profile-visibility')?.value,
      locationVisibility,
      activityVisibility: document.getElementById('settings-activity-visibility')?.value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    try {
      await this.db.collection('user_settings').doc(this.currentUser.uid).set(payload, { merge: true });
      // Propagate visibility change to all user's locations
      const locSnap = await this.db.collection('locations').where('createdBy', '==', this.currentUser.uid).where('status', '==', 'active').get();
      if (!locSnap.empty) {
        const batch = this.db.batch();
        locSnap.forEach(doc => batch.update(doc.ref, { visibility: locationVisibility }));
        await batch.commit();
      }
      this._locationVisibility = locationVisibility;
      this.showToast('Privacy settings updated!', 'success');
    } catch { this.showToast('Failed to update privacy settings', 'error'); }
  },

  async updateDisplaySettings() {
    if (!this.currentUser) return;
    const mapStyle = document.getElementById('settings-map-style')?.value;
    const intensity = document.getElementById('settings-intensity')?.value;
    localStorage.setItem('terminal-intensity', intensity);
    try {
      await this.db.collection('user_settings').doc(this.currentUser.uid).set({ mapStyle, intensity, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      this.updateTerminalIntensity(intensity);
      if (mapStyle) this.changeTileLayer(mapStyle);
      this.showToast('Display settings updated!', 'success');
    } catch { this.showToast('Failed to update display settings', 'error'); }
  },

  updateTerminalIntensity(val) {
    const root = document.documentElement;
    root.style.setProperty('--scanline-opacity', val);
    root.style.setProperty('--glitch-duration', val == '0.8' ? '0.1s' : '0.3s');
  },

  showChangePasswordModal() {
    if (!this.currentUser || this.currentUser.isAnonymous) { this.showToast('Password change not available for anonymous accounts', 'warning'); return; }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span><i class="fas fa-key"></i> Change Password</span>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <form id="change-password-form">
            <div class="form-group"><label class="form-label">Current Password</label><input class="input" type="password" id="current-password" required autocomplete="current-password"></div>
            <div class="form-group"><label class="form-label">New Password</label><input class="input" type="password" id="new-password" required minlength="8" autocomplete="new-password"><div class="field-help">Minimum 8 characters</div></div>
            <div class="form-group"><label class="form-label">Confirm New Password</label><input class="input" type="password" id="confirm-new-password" required autocomplete="new-password"></div>
            <div class="form-actions">
              <button type="button" class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="submit" class="btn btn-primary"><i class="fas fa-key"></i> Change Password</button>
            </div>
          </form>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
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
      document.querySelector('#change-password-form')?.closest('.modal-overlay')?.remove();
      this.showToast('Password changed successfully!', 'success');
    } catch (err) {
      const msgs = { 'auth/wrong-password': 'Current password is incorrect', 'auth/weak-password': 'New password is too weak' };
      this.showToast(msgs[err.code] || 'Failed to change password', 'error');
    }
  },

  confirmDeleteAccount() {
    if (!this.currentUser) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header modal-header-danger">
          <span><i class="fas fa-exclamation-triangle"></i> Delete Account</span>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="danger-notice">
            <p>This action is <strong>PERMANENT</strong> and will delete all your locations, posts, and profile data.</p>
          </div>
          <div class="form-group"><label class="form-label">Type "DELETE" to confirm:</label><input class="input" type="text" id="delete-confirm-text" placeholder="DELETE" autocomplete="off"></div>
          <div class="form-actions">
            <button type="button" class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button type="button" class="btn btn-danger" onclick="app.executeAccountDeletion()"><i class="fas fa-trash-alt"></i> Delete My Account</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  },

  async executeAccountDeletion() {
    if (document.getElementById('delete-confirm-text')?.value !== 'DELETE') { this.showToast('Please type DELETE to confirm', 'warning'); return; }
    const opKey = 'delete-account-final';
    if (this.activeOperations.has(opKey)) return;
    this.activeOperations.add(opKey);
    try {
      const uid = this.currentUser.uid;
      this.showToast('Deleting account data...', 'info');
      
      const colls = [
        { name: 'locations', fields: ['createdBy'] },
        { name: 'forum', fields: ['createdBy'] },
        { name: 'comments', fields: ['createdBy'] },
        { name: 'user_followers', fields: ['followerId', 'followingId'] },
        { name: 'user_notifications', fields: ['userId'] },
        { name: 'user_settings', fields: ['userId'] },
        { name: 'post_likes', fields: ['userId'] },
        { name: 'location_likes', fields: ['userId'] },
        { name: 'location_visits', fields: ['userId'] },
        { name: 'user_profiles', fields: ['userId'] },
        { name: 'user_badges', fields: ['userId'] },
        { name: 'forum_posts', fields: ['authorId'] },
        { name: 'forum_threads', fields: ['authorId'] }
      ];

      for (const coll of colls) {
        for (const field of coll.fields) {
          let hasMore = true;
          while (hasMore) {
            const snap = await this.db.collection(coll.name).where(field, '==', uid).limit(100).get();
            if (snap.empty) {
              hasMore = false;
            } else {
              const batch = this.db.batch();
              snap.docs.forEach(doc => batch.delete(doc.ref));
              await batch.commit();
              if (snap.size < 100) hasMore = false;
            }
          }
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
