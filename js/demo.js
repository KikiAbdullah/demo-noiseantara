/**
 * Demo statis Noiseantara: resolver URL subpath, pencarian offline,
 * dan penonaktifan jujur fitur server (form POST, login, filter).
 */
(function () {
  'use strict';
  var SRC = (document.currentScript && document.currentScript.src) || '';
  var ROOT = SRC.slice(0, SRC.lastIndexOf('/js/demo.js') + 1);
  function resolve(path) { return ROOT + String(path).replace(/^\//, ''); }
  window.__demoUrl = resolve;
  var INDEX = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg) {
    var t = document.getElementById('siteToast'), x = document.getElementById('siteToastText');
    if (t && x && window.bootstrap) {
      x.textContent = msg;
      try { window.bootstrap.Toast.getOrCreateInstance(t, { delay: 3800 }).show(); return; } catch (e) {}
    }
    window.alert(msg);
  }

  // Template URL runtime (scene explorer) → absolutkan ke root demo.
  document.querySelectorAll('[data-scene-url-template]').forEach(function (el) {
    var tpl = el.getAttribute('data-scene-url-template') || '';
    if (tpl.charAt(0) === '/') el.setAttribute('data-scene-url-template', resolve(tpl));
  });

  // URL share/sitasi relatif → absolut penuh (Web Share butuh URL mutlak
  // yang benar di subpath, mis. /repo/rilisan/x).
  document.querySelectorAll('[data-url]').forEach(function (el) {
    var u = el.getAttribute('data-url') || '';
    if (u.charAt(0) === '.' || (u.charAt(0) !== '/' && u.indexOf('://') === -1 && u.charAt(0) !== '#')) {
      try { el.setAttribute('data-url', new URL(u, location.href).href); } catch (err) {}
    }
  });

  // Banner: hormati pilihan tutup sebelumnya.
  try {
    if (localStorage.getItem('demo-banner') === 'hide') {
      var b0 = document.getElementById('demoBanner');
      if (b0) b0.remove();
    }
  } catch (e) {}
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-demo-dismiss]')) {
      var b = document.getElementById('demoBanner');
      if (b) b.remove();
      try { localStorage.setItem('demo-banner', 'hide'); } catch (err) {}
    }
  });

  // Formulir: POST diblokir jujur; filter GET diberi penjelasan.
  document.querySelectorAll('form').forEach(function (f) {
    var m = (f.getAttribute('method') || 'GET').toUpperCase();
    if (m === 'POST') {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        toast('Mode demo statis: pengiriman formulir dinonaktifkan.');
      });
    } else if (f.classList.contains('archive-filterbar') || f.classList.contains('needs-filterbar')) {
      f.addEventListener('submit', function () {
        toast('Demo statis menampilkan seluruh data — filter butuh server.');
      });
    }
  });

  // Tautan butuh server → penjelasan, bukan 404 buta.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/^\/(login|register|dashboard|admin|password|kontribusi\/(baru|saya|lacak)|api\/)/.test(href)) {
      e.preventDefault();
      toast('Butuh server Laravel — tidak tersedia di demo statis.');
    }
  }, true);

  // Pencarian offline dari indeks lokal.
  function loadIndex() {
    if (INDEX) return Promise.resolve(INDEX);
    return fetch(resolve('data/search-index.json')).then(function (r) { return r.json(); }).then(function (d) { INDEX = d; return d; });
  }
  function match(items, q, prefix) {
    q = q.toLowerCase();
    return (items || []).filter(function (it) {
      var n = (it.n || '').toLowerCase();
      return prefix ? n.indexOf(q) === 0 : n.indexOf(q) !== -1;
    });
  }
  function withUrl(it) { return { name: it.n, url: resolve(it.u) }; }

  var _fetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var u = typeof input === 'string' ? input : (input && input.url) || '';
    if (String(u).indexOf('/api/cari/saran') !== -1) {
      var q = '';
      try { q = new URL(u, location.href).searchParams.get('q') || ''; } catch (err) {}
      return loadIndex().then(function (d) {
        var out = { artists: [], releases: [], labels: [] };
        if (q.trim().length >= 2) {
          out.artists = match(d.artists, q, true).slice(0, 5).map(withUrl);
          out.releases = match(d.releases, q, true).slice(0, 5).map(withUrl);
          out.labels = match(d.labels, q, true).slice(0, 5).map(withUrl);
        }
        return { ok: true, json: function () { return Promise.resolve(out); } };
      });
    }
    return _fetch(input, init);
  };

  // Render hasil /cari?q=... dari indeks lokal.
  function renderSearchPage() {
    var form = document.querySelector('.search-page-form');
    var host = document.querySelector('.search-page-results .site-container');
    if (!form || !host) return;
    var q = '';
    try { q = (new URLSearchParams(location.search).get('q') || '').trim(); } catch (err) {}
    if (!q) return;
    var input = form.querySelector('input[name="q"]');
    if (input) input.value = q;
    loadIndex().then(function (d) {
      var groups = [
        ['Artis', match(d.artists, q, false)],
        ['Rilisan', match(d.releases, q, false)],
        ['Label', match(d.labels, q, false)]
      ];
      var total = groups[0][1].length + groups[1][1].length + groups[2][1].length;
      var h = '<div class="directory-result-label">' + total + ' HASIL UNTUK &ldquo;' + esc(q) + '&rdquo; <span>/ DEMO OFFLINE</span></div>';
      if (!total) {
        h += '<div class="empty-state"><p class="mono-label">BELUM DITEMUKAN</p><h3>Belum ada yang cocok dengan &ldquo;' + esc(q) + '&rdquo;.</h3></div>';
      } else {
        groups.forEach(function (g) {
          if (!g[1].length) return;
          h += '<div class="search-group"><h2>' + g[0].toUpperCase() + ' <span>' + g[1].length + '</span></h2><div>';
          g[1].forEach(function (it) {
            h += '<a href="' + esc(resolve(it.u)) + '" class="search-result-row"><span class="search-result-symbol"></span><span><strong>' + esc(it.n) + '</strong><small>' + g[0] + '</small></span><span aria-hidden="true">\u2197</span></a>';
          });
          h += '</div></div>';
        });
      }
      host.innerHTML = h;
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderSearchPage);
  else renderSearchPage();
})();