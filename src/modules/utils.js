export const utilsMethods = {
  sanitizeInput(input) {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  },

  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  },

  timeAgo(date) {
    if (!date) return 'Unknown time';
    const now = new Date();
    const then = date instanceof Date ? date : new Date(date);
    if (isNaN(then.getTime())) return 'Unknown time';
    const seconds = Math.floor((now - then) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  },

  showError(message) {
    this.showToast(message, 'error');
  },

  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { error: 'fa-exclamation-circle', success: 'fa-check-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info}" aria-hidden="true"></i>
      <span>${this.escapeHtml(message)}</span>
      <button onclick="this.closest('.toast').remove()" aria-label="Close" style="background:none;border:none;cursor:pointer;color:var(--text-muted);margin-left:auto;font-size:14px;">&times;</button>
    `;
    container.appendChild(toast);
    this.announceToScreenReader(message, type === 'error' ? 'assertive' : 'polite');
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 200); }, duration);
  },

  announceToScreenReader(message, priority = 'polite') {
    const id = priority === 'assertive' ? 'assertive-live-region' : 'live-region';
    const el = document.getElementById(id);
    if (el) {
      el.textContent = message;
      setTimeout(() => { el.textContent = ''; }, 1000);
    }
  },

  trapFocus(container, event) {
    const focusable = container.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first) { last.focus(); event.preventDefault(); }
    } else {
      if (document.activeElement === last) { first.focus(); event.preventDefault(); }
    }
  },

  getRiskColor(riskLevel) {
    const colors = { safe: '#00FF41', low: '#88FF00', medium: '#FFAA00', high: '#FF4400', extreme: '#FF0000' };
    return colors[riskLevel] || '#888888';
  },

  fuzzyMatch(text, query) {
    if (!query) return true;
    const t = text.toLowerCase();
    const q = query.toLowerCase();
    if (t.includes(q)) return true;
    let qi = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) qi++;
    }
    return qi === q.length;
  },
};
