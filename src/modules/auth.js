export const authMethods = {
  initAuth() {
    if (!this.auth) { this.showError('Authentication system failed to initialize. Please refresh the page.'); return; }

    this.auth.onAuthStateChanged(user => {
      this.currentUser = user;
      this.updateAuthUI();
      this.loadActivity();
      this.loadStats();
      if (user) {
        this.loadUserData();
        if (!user.isAnonymous) this.initSessionManagement();
      } else {
        this.stopSessionManagement();
      }
    }, error => {
      if (error.code === 'auth/network-request-failed') {
        this.showError('Network error. Retrying connection...');
        setTimeout(() => this.initAuth(), 5000);
      } else {
        this.showError('Authentication error occurred. Please refresh the page.');
      }
    });

    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchAuthTab(tab.dataset.tab));
    });

    const signinForm = document.getElementById('signin-form-element');
    if (signinForm) signinForm.addEventListener('submit', e => this.handleSignIn(e));

    const signupForm = document.getElementById('signup-form-element');
    if (signupForm) signupForm.addEventListener('submit', e => this.handleSignUp(e));

    this.initOAuthButtons();
    this.initFormValidation();
  },

  async handleAuth() {
    if (this.currentUser && !this.currentUser.isAnonymous) {
      const opKey = 'auth-signout';
      if (this.activeOperations.has(opKey)) return;
      this.activeOperations.add(opKey);
      try {
        await this.auth.signOut();
        this.showToast('Signed out successfully', 'success');
      } catch { this.showToast('Failed to sign out', 'error'); }
      finally { this.activeOperations.delete(opKey); }
      return;
    }
    this.showAuthModal();
  },

  showAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => modal.querySelector('input')?.focus(), 100);
    this.announceToScreenReader('Authentication dialog opened', 'assertive');
  },

  hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    modal.querySelectorAll('form').forEach(f => f.reset());
    this.switchAuthTab('signin');
    this.announceToScreenReader('Authentication dialog closed');
  },

  switchAuthTab(tabName) {
    document.querySelectorAll('.auth-tab').forEach(tab => {
      const active = tab.dataset.tab === tabName;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active);
    });
    document.querySelectorAll('.auth-form').forEach(form => {
      const active = form.id === `${tabName}-form`;
      form.classList.toggle('active', active);
      form.setAttribute('aria-hidden', !active);
    });
    this.announceToScreenReader(`Switched to ${tabName} tab`);
    setTimeout(() => {
      document.querySelector('.auth-form.active')?.querySelector('input')?.focus();
    }, 100);
  },

  async handleSignIn(e) {
    e.preventDefault();
    const emailEl = document.getElementById('signin-email');
    const passwordEl = document.getElementById('signin-password');
    if (!this.validateEmail(emailEl) || !passwordEl.value) {
      this.showToast('Please correct the errors above', 'warning'); return;
    }
    const btn = e.target.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    btn.textContent = 'Signing In...'; btn.disabled = true;
    try {
      await this.auth.signInWithEmailAndPassword(emailEl.value.trim(), passwordEl.value.trim());
      this.hideAuthModal();
      this.showToast('Signed in successfully!', 'success');
    } catch (err) {
      const msgs = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'This account has been disabled',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/invalid-credential': 'Invalid email or password',
      };
      this.showToast(msgs[err.code] || err.message, 'error');
    } finally { btn.textContent = orig; btn.disabled = false; }
  },

  async handleSignUp(e) {
    e.preventDefault();
    const emailEl = document.getElementById('signup-email');
    const pwEl = document.getElementById('signup-password');
    if (!this.validateEmail(emailEl) || !this.validatePassword(pwEl) || !this.validatePasswordConfirmation()) {
      this.showToast('Please correct the errors above', 'warning'); return;
    }
    const btn = e.target.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    btn.textContent = 'Creating Account...'; btn.disabled = true;
    try {
      const result = await this.auth.createUserWithEmailAndPassword(emailEl.value.trim(), pwEl.value.trim());
      await this.createUserProfile(result.user, 'email');
      await result.user.sendEmailVerification();
      this.hideAuthModal();
      this.showToast('Account created! Please check your email to verify your account.', 'success');
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'An account with this email already exists',
        'auth/invalid-email': 'Invalid email address',
        'auth/weak-password': 'Password is too weak',
        'auth/operation-not-allowed': 'Email/password accounts are not enabled',
        'auth/too-many-requests': 'Too many requests. Please try again later.',
      };
      this.showToast(msgs[err.code] || err.message, 'error');
    } finally { btn.textContent = orig; btn.disabled = false; }
  },

  async signInAnonymously() {
    try {
      await this.auth.signInAnonymously();
      this.hideAuthModal();
      this.showToast('Signed in as guest', 'success');
    } catch (err) {
      if (err.code === 'auth/admin-restricted-operation') {
        this.showToast('Anonymous sign-in is currently disabled. Please use email sign-in.', 'warning');
      } else {
        this.showToast('Failed to sign in anonymously', 'error');
      }
    }
  },

  initOAuthButtons() {
    const pairs = [
      ['google-signin-btn', 'google'], ['google-signup-btn', 'google'],
      ['github-signin-btn', 'github'], ['github-signup-btn', 'github'],
    ];
    pairs.forEach(([id, provider]) => {
      document.getElementById(id)?.addEventListener('click', () => this.signInWithProvider(provider));
    });
  },

  async signInWithProvider(provider) {
    const opKey = `oauth-${provider}-signin`;
    if (this.activeOperations.has(opKey)) return;
    this.activeOperations.add(opKey);
    try {
      const result = await this.auth.signInWithPopup(this.getProvider(provider));
      if (result.user?.metadata.creationTime === result.user?.metadata.lastSignInTime) {
        await this.createUserProfile(result.user, provider);
        this.showToast(`Welcome to Urbindex! Account created with ${provider}.`, 'success');
      } else {
        this.showToast(`Signed in successfully with ${provider}!`, 'success');
      }
      this.hideAuthModal();
    } catch (err) {
      const msgs = {
        'auth/popup-closed-by-user': 'Sign in cancelled',
        'auth/popup-blocked': 'Pop-up blocked. Please allow pop-ups for this site.',
        'auth/cancelled-popup-request': 'Sign in request cancelled',
        'auth/account-exists-with-different-credential': 'An account already exists with the same email but different credentials',
      };
      this.showToast(msgs[err.code] || err.message, 'error');
    } finally { this.activeOperations.delete(opKey); }
  },

  async signUpWithProvider(provider) { await this.signInWithProvider(provider); },

  getProvider(name) {
    switch (name) {
      case 'google': return new firebase.auth.GoogleAuthProvider();
      case 'github': return new firebase.auth.GithubAuthProvider();
      default: throw new Error(`Unsupported provider: ${name}`);
    }
  },

  async createUserProfile(user, provider) {
    try {
      await this.db.collection('users').doc(user.uid).set({
        email: user.email,
        displayName: user.displayName || `Explorer ${user.uid.substring(0, 6)}`,
        photoURL: user.photoURL,
        provider,
        emailVerified: user.emailVerified,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (err) { console.error('Error creating user profile:', err); }
  },

  updateAuthUI() {
    const btn = document.getElementById('auth-btn');
    const span = btn?.querySelector('span');
    const icon = btn?.querySelector('i');
    const profileBtn = document.getElementById('profile-btn');
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');

    if (this.currentUser) {
      if (span) span.textContent = 'Sign Out';
      if (icon) icon.className = 'fas fa-sign-out-alt';
      btn?.setAttribute('title', 'Sign out of your account');
      if (profileBtn) profileBtn.style.display = '';
      dot?.classList.remove('offline');
      if (text) text.textContent = 'Connected';
    } else {
      if (span) span.textContent = 'Sign In / Register';
      if (icon) icon.className = 'fas fa-user';
      btn?.setAttribute('title', 'Sign in or create an account');
      if (profileBtn) profileBtn.style.display = '';
      dot?.classList.add('offline');
      if (text) text.textContent = 'Guest Mode';
    }
  },

  initFormValidation() {
    ['signin-email', 'signup-email'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.addEventListener('input', () => this.validateEmail(el)); el.addEventListener('blur', () => this.validateEmail(el)); }
    });
    const pw = document.getElementById('signup-password');
    if (pw) { pw.addEventListener('input', () => this.validatePassword(pw)); pw.addEventListener('blur', () => this.validatePassword(pw)); }
    const cpw = document.getElementById('signup-confirm-password');
    if (cpw) { cpw.addEventListener('input', () => this.validatePasswordConfirmation()); cpw.addEventListener('blur', () => this.validatePasswordConfirmation()); }
  },

  validateEmail(input) {
    const email = input.value.trim();
    const err = document.getElementById(`${input.id}-error`);
    input.classList.remove('error', 'success');
    if (!email) { this.showFieldError(input, err, 'Email is required'); return false; }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      this.showFieldError(input, err, 'Please enter a valid email address'); return false;
    }
    this.showFieldSuccess(input, err, 'Valid email address'); return true;
  },

  validatePassword(input) {
    const pw = input.value;
    const err = document.getElementById(`${input.id}-error`);
    const fill = document.getElementById('password-strength-fill');
    const txt = document.getElementById('password-strength-text');
    input.classList.remove('error', 'success');
    if (!pw) { this.showFieldError(input, err, 'Password is required'); this.updatePasswordStrength('', fill, txt); return false; }
    const v = this.checkPasswordStrength(pw);
    if (!v.isValid) { this.showFieldError(input, err, v.message); this.updatePasswordStrength(pw, fill, txt); return false; }
    this.showFieldSuccess(input, err, 'Strong password');
    this.updatePasswordStrength(pw, fill, txt);
    this.validatePasswordConfirmation();
    return true;
  },

  checkPasswordStrength(pw) {
    const checks = { length: pw.length >= 8, lower: /[a-z]/.test(pw), upper: /[A-Z]/.test(pw), num: /\d/.test(pw), sym: /[!@#$%^&*(),.?":{}|<>]/.test(pw) };
    const n = Object.values(checks).filter(Boolean).length;
    if (!pw.length) return { isValid: false, message: 'Password is required', strength: 0 };
    if (n < 3) return { isValid: false, message: 'Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols', strength: 1 };
    if (n < 4) return { isValid: true, message: 'Fair password strength', strength: 2 };
    if (n < 5) return { isValid: true, message: 'Good password strength', strength: 3 };
    return { isValid: true, message: 'Strong password', strength: 4 };
  },

  updatePasswordStrength(pw, fill, txt) {
    if (!fill || !txt) return;
    const v = this.checkPasswordStrength(pw);
    fill.className = 'strength-fill';
    const map = { 1: ['strength-weak', 'Weak'], 2: ['strength-fair', 'Fair'], 3: ['strength-good', 'Good'], 4: ['strength-strong', 'Strong'] };
    const [cls, label] = map[v.strength] || ['', 'Not entered'];
    if (cls) fill.classList.add(cls);
    txt.textContent = `Password strength: ${label}`;
  },

  validatePasswordConfirmation() {
    const pw = document.getElementById('signup-password');
    const cpw = document.getElementById('signup-confirm-password');
    const err = document.getElementById('signup-confirm-error');
    if (!pw || !cpw || !err) return false;
    cpw.classList.remove('error', 'success');
    if (!cpw.value) { this.showFieldError(cpw, err, 'Please confirm your password'); return false; }
    if (pw.value !== cpw.value) { this.showFieldError(cpw, err, 'Passwords do not match'); return false; }
    this.showFieldSuccess(cpw, err, 'Passwords match'); return true;
  },

  showFieldError(input, el, msg) {
    input.classList.add('error'); input.classList.remove('success');
    if (el) { el.innerHTML = `<i class="fas fa-exclamation-triangle" aria-hidden="true"></i> ${msg}`; el.style.display = 'block'; }
  },

  showFieldSuccess(input, el, msg) {
    input.classList.add('success'); input.classList.remove('error');
    if (el) { el.innerHTML = `<i class="fas fa-check-circle" aria-hidden="true"></i> ${msg}`; el.style.display = 'block'; }
  },

  async handlePasswordReset(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email')?.value.trim();
    if (!email) { this.showToast('Please enter your email address', 'warning'); return; }
    const btn = e.target.querySelector('button[type="submit"]');
    const orig = btn.textContent; btn.textContent = 'Sending...'; btn.disabled = true;
    try {
      await this.auth.sendPasswordResetEmail(email);
      this.hidePasswordResetModal();
      this.showToast('Password reset email sent! Check your inbox.', 'success');
    } catch (err) {
      const msgs = { 'auth/user-not-found': 'No account found with this email address', 'auth/invalid-email': 'Invalid email address', 'auth/too-many-requests': 'Too many requests. Please try again later.' };
      this.showToast(msgs[err.code] || err.message, 'error');
    } finally { btn.textContent = orig; btn.disabled = false; }
  },

  showPasswordResetModal() {
    const modal = document.getElementById('password-reset-modal');
    if (modal) { modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false'); setTimeout(() => document.getElementById('reset-email')?.focus(), 100); }
  },

  hidePasswordResetModal() {
    const modal = document.getElementById('password-reset-modal');
    if (modal) { modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); modal.querySelector('form')?.reset(); }
  },

  async resendVerificationEmail() {
    if (!this.currentUser) { this.showToast('Please sign in first', 'warning'); return; }
    if (this.currentUser.emailVerified) { this.showToast('Your email is already verified!', 'success'); return; }
    try {
      await this.currentUser.sendEmailVerification();
      this.showToast('Verification email sent! Check your inbox.', 'success');
    } catch (err) {
      this.showToast(err.code === 'auth/too-many-requests' ? 'Too many requests. Please try again later.' : err.message, 'error');
    }
  },

  initSessionManagement() {
    if (!this.currentUser || this.currentUser.isAnonymous) return;
    this.sessionWarningTimer = setTimeout(() => this.showSessionWarning(), 50 * 60 * 1000);
    this.sessionRefreshTimer = setInterval(() => this.refreshSession(), 60 * 60 * 1000);
  },

  stopSessionManagement() {
    clearTimeout(this.sessionWarningTimer); this.sessionWarningTimer = null;
    clearInterval(this.sessionCountdownTimer); this.sessionCountdownTimer = null;
    clearInterval(this.sessionRefreshTimer); this.sessionRefreshTimer = null;
    this.hideSessionWarning();
  },

  showSessionWarning() {
    const el = document.getElementById('session-warning');
    const span = document.getElementById('session-countdown');
    if (el) el.style.display = 'block';
    let countdown = 300;
    if (span) span.textContent = Math.floor(countdown / 60);
    this.sessionCountdownTimer = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        this.hideSessionWarning();
        this.showToast('Your session has expired. Please sign in again.', 'warning');
        this.auth.signOut();
        return;
      }
      if (countdown <= 60 && el) el.classList.add('warning');
      if (span) { const m = Math.floor(countdown / 60); const s = countdown % 60; span.textContent = m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : s; }
    }, 1000);
  },

  hideSessionWarning() {
    const el = document.getElementById('session-warning');
    if (el) { el.style.display = 'none'; el.classList.remove('warning'); }
    clearInterval(this.sessionCountdownTimer); this.sessionCountdownTimer = null;
  },

  async handleSessionExpired() {
    try {
      await this.auth.signOut();
      this.currentUser = null;
      this.hideSessionWarning();
      this.updateAuthUI();
      this.showToast('Your session has expired. Please sign in again.', 'warning');
    } catch {}
  },

  async refreshSession() {
    if (!this.currentUser || this.currentUser.isAnonymous) return;
    try {
      await this.currentUser.getIdToken(true);
      this.hideSessionWarning();
    } catch (err) {
      if (err.code === 'auth/id-token-expired') {
        this.showToast('Your session has expired. Please sign in again.', 'warning');
        await this.auth.signOut();
      }
    }
  },

  initRateLimiting() {
    this.authAttempts = new Map();
    this.maxAttempts = 5;
    this.attemptWindow = 15 * 60 * 1000;
  },

  checkRateLimit(identifier) {
    const now = Date.now();
    const recent = (this.authAttempts.get(identifier) || []).filter(t => now - t < this.attemptWindow);
    return recent.length < this.maxAttempts;
  },

  recordAuthAttempt(identifier) {
    const now = Date.now();
    const recent = (this.authAttempts.get(identifier) || []).filter(t => now - t < this.attemptWindow);
    recent.push(now);
    this.authAttempts.set(identifier, recent);
  },

  async loadUserData() {
    if (!this.currentUser) return;
    try {
      await this.db.collection('users').doc(this.currentUser.uid).set({
        lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
        online: true,
      }, { merge: true });
    } catch {}
  },

  handleProfileButtonClick() {
    if (!this.currentUser) this.handleAuth();
    else this.showView('profile');
  },
};
