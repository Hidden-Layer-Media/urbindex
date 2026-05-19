export const searchMethods = {
  initGlobalSearch() {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('global-search-input');
    
    input?.addEventListener('input', () => this.performGlobalSearch(input.value));
    
    modal?.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const focusable = modal.querySelectorAll('input, button');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    });
  },

  async performGlobalSearch(query) {
    const results = document.getElementById('global-search-results');
    if (!results) return;
    if (query.length < 2) { results.innerHTML = ''; return; }
    
    results.innerHTML = '<div class="loading">Searching...</div>';
    
    try {
      const [locSnap, postSnap, userSnap] = await Promise.all([
        this.db.collection('locations').where('status', '==', 'active').get(),
        this.db.collection('forum').orderBy('createdAt', 'desc').limit(50).get(),
        this.db.collection('users').limit(50).get(),
      ]);

      const items = [];
      locSnap.forEach(d => { const data = d.data(); if (this.fuzzyMatch(data.name || '', query)) items.push({ type: 'Location', name: data.name, id: d.id, icon: 'map-marker-alt' }); });
      postSnap.forEach(d => { const data = d.data(); if (this.fuzzyMatch(data.body || '', query)) items.push({ type: 'Post', name: data.body.substring(0, 30), id: d.id, icon: 'bullhorn' }); });
      userSnap.forEach(d => { const data = d.data(); if (this.fuzzyMatch(data.displayName || '', query)) items.push({ type: 'User', name: data.displayName, id: d.id, icon: 'user' }); });

      if (!items.length) { results.innerHTML = '<div class="empty-state">No results found.</div>'; return; }

      results.innerHTML = items.map(i => `
        <div class="search-result" onclick="app.handleSearchResult('${i.type}', '${i.id}')">
          <span class="search-result-icon"><i class="fas fa-${i.icon}"></i></span>
          <span class="search-result-name">${this.escapeHtml(i.name || '—')}</span>
          <span class="search-result-type">${i.type}</span>
        </div>
      `).join('');
    } catch { results.innerHTML = '<div class="error">Search failed</div>'; }
  },

  handleSearchResult(type, id) {
    document.getElementById('search-modal').classList.remove('active');
    if (type === 'Location') this.showLocationDetailModal(id);
    else if (type === 'Post') this.showView('social');
    else if (type === 'User') this.showView('profile', id);
  }
};
