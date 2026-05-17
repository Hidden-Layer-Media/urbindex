export const searchMethods = {
  initGlobalSearch() {
    const input = document.getElementById('global-search-input');
    input?.addEventListener('input', () => this.performGlobalSearch(input.value));
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
        <div class="search-result" style="padding:8px; border-bottom:1px solid var(--border-dim); cursor:pointer;" onclick="app.handleSearchResult('${i.type}', '${i.id}')">
          <i class="fas fa-${i.icon}"></i> <strong>${i.type}:</strong> ${this.escapeHtml(i.name)}
        </div>
      `).join('');
    } catch { results.innerHTML = '<div class="error">Search failed</div>'; }
  },

  handleSearchResult(type, id) {
    document.getElementById('search-modal').classList.remove('active');
    if (type === 'Location') this.showLocationDetailModal(id);
    else if (type === 'Post') this.showView('social'); // Simplified
    else if (type === 'User') this.showView('profile', id);
  }
};
