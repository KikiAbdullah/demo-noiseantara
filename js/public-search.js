/**
 * Pencarian modal tema Noiseantara (SRC-01/07): Ctrl/⌘+K, saran terkelompok
 * dari API server (debounce 250ms), keyboard ↑↓/Enter/Esc.
 */
(function () {
  'use strict';

  var input = document.getElementById('siteSearchInput');
  var results = document.getElementById('searchResults');
  var allLink = document.getElementById('searchAllLink');
  var timer = null;
  if (!input || !results) return;

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render(data) {
    var groups = [
      ['ARTIS', data.artists || []],
      ['RILISAN', data.releases || []],
      ['LABEL', data.labels || []],
    ];
    var html = '';
    var optionIndex = 0;
    groups.forEach(function (group) {
      var label = group[0];
      var items = group[1];
      if (!items.length) return;
      html += '<div class="suggestion-group" role="group" aria-label="' + label + '">'
        + '<div class="suggestion-caption">' + label + ' / ' + items.length + '</div>';
      items.forEach(function (item) {
        html += '<a href="' + esc(item.url) + '" role="option" id="search-option-' + optionIndex++ + '" aria-selected="false" class="suggestion-item" data-suggestion>'
          + '<span class="suggestion-thumb"><span class="search-result-symbol"></span></span>'
          + '<span><strong>' + esc(item.name) + '</strong><small>' + label + '</small></span></a>';
      });
      html += '</div>';
    });
    results.innerHTML = html || '<div class="search-empty">Belum ada yang cocok dengan <strong>' + esc(input.value) + '</strong>.</div>';
  }

  function update() {
    var q = input.value.trim();
    if (q.length < 2) {
      results.innerHTML = '<div class="search-hint">Mulai menulis untuk mencari artis, rilisan, dan label.</div>';
      input.setAttribute('aria-expanded', 'false');
      return;
    }
    fetch('/api/cari/saran?q=' + encodeURIComponent(q), { credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) { if (data) render(data); })
      .catch(function () {});
  }

  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(update, 250); // SRC-01 debounce 250ms
  });

  input.addEventListener('keydown', function (e) {
    var options = Array.prototype.slice.call(results.querySelectorAll('[data-suggestion]'));
    var current = options.findIndex(function (el) { return el.getAttribute('aria-selected') === 'true'; });
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!options.length) return;
      e.preventDefault();
      var next = e.key === 'ArrowDown' ? (current + 1) % options.length : (current <= 0 ? options.length - 1 : current - 1);
      options.forEach(function (item, i) { item.setAttribute('aria-selected', String(i === next)); });
      input.setAttribute('aria-activedescendant', options[next].id);
      options[next].scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (current >= 0 && options[current]) location.href = options[current].getAttribute('href');
      else location.href = (window.__demoUrl ? window.__demoUrl('cari?q=' + encodeURIComponent(input.value.trim())) : '/cari?q=' + encodeURIComponent(input.value.trim()));
    }
    if (e.key === 'Escape') {
      var modal = bootstrap.Modal.getInstance(document.getElementById('searchModal'));
      if (modal) modal.hide();
    }
  });

  // Update "lihat semua hasil" saat mengetik
  input.addEventListener('input', function () {
    if (allLink) allLink.href = (window.__demoUrl ? window.__demoUrl('cari?q=' + encodeURIComponent(input.value.trim())) : '/cari?q=' + encodeURIComponent(input.value.trim()));
  });

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      var el = document.getElementById('searchModal');
      if (el && window.bootstrap) bootstrap.Modal.getOrCreateInstance(el).show();
    }
  });

  var searchModal = document.getElementById('searchModal');
  if (searchModal && window.bootstrap) {
    searchModal.addEventListener('shown.bs.modal', function () { input.focus(); });
  }
})();
