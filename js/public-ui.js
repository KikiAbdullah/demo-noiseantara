
(function () {
  'use strict';

  var toastTimer = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showToast(message) {
    var toast = document.getElementById('siteToast');
    var text = document.getElementById('siteToastText');
    if (!toast || !text || !window.bootstrap) {
      if (message) window.alert(message);
      return;
    }
    text.textContent = message;
    var instance = window.bootstrap.Toast.getOrCreateInstance(toast, { delay: 3200 });
    instance.show();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { instance.hide(); }, 3400);
  }

  function copyText(text, okMessage) {
    function done() { showToast(okMessage || 'Disalin ke papan klip.'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        window.prompt('Salin manual:', text);
      });
    } else {
      window.prompt('Salin manual:', text);
    }
  }

  
  function refreshSavedCount() {
    var nodes = document.querySelectorAll('[data-saved-count]');
    if (!nodes.length) return;
    var count = 0;
    try {
      var raw = window.localStorage.getItem('noiseantara:saved-releases:v1') || '[]';
      count = JSON.parse(raw).length || 0;
    } catch (e) { count = 0; }
    nodes.forEach(function (el) { el.textContent = String(count); });
  }

  
  
  
  function shareUrl(url, title, text) {
    var absolute = url;
    try { absolute = new URL(url, window.location.origin).toString(); } catch (e) {}
    var shareTitle = title || document.title;
    var meta = document.querySelector('meta[name="description"]');
    var shareText = text
      || (meta && meta.getAttribute('content'))
      || shareTitle;
    
    var fullMessage = shareTitle + '\n' + shareText + '\n' + absolute;
    if (navigator.share) {
      var payload = { title: shareTitle, text: shareText, url: absolute };
      try {
        var result = navigator.share(payload);
        if (result && typeof result.catch === 'function') {
          result.catch(function () { copyText(fullMessage, 'Ringkasan + tautan disalin.'); });
        }
      } catch (e) {
        copyText(fullMessage, 'Ringkasan + tautan disalin.');
      }
    } else {
      copyText(fullMessage, 'Ringkasan + tautan disalin ke papan klip.');
    }
  }

  
  var citationState = { title: '', url: '', year: String(new Date().getFullYear()), format: 'apa' };

  function buildCitation() {
    var t = citationState.title || document.title;
    var u = citationState.url || window.location.href;
    var y = citationState.year;
    if (citationState.format === 'mla') {
      return 'Noiseantara. "' + t + '." Noiseantara Arsip, ' + y + ', ' + u + '.';
    }
    if (citationState.format === 'footnote') {
      return 'Noiseantara, "' + t + '" (entri arsip, ' + y + '), ' + u + '.';
    }
    if (citationState.format === 'bibtex') {
      var key = 'noiseantara' + y + t.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20);
      return '@misc{' + key + ',\n  author = {Noiseantara},\n  title = {' + t + '},\n  year = {' + y + '},\n  url = {' + u + '},\n  note = {Entri arsip digital}\n}';
    }
    return 'Noiseantara. (' + y + '). ' + t + ' [Entri arsip]. ' + u;
  }

  function renderCitation() {
    var out = document.getElementById('citationText');
    if (out) out.textContent = buildCitation();
    document.querySelectorAll('[data-citation-format]').forEach(function (btn) {
      var active = btn.getAttribute('data-citation-format') === citationState.format;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function openCitation(title, url) {
    citationState.title = title || document.title;
    citationState.url = url || window.location.href;
    citationState.format = 'apa';
    renderCitation();
    var el = document.getElementById('citationModal');
    if (el && window.bootstrap) window.bootstrap.Modal.getOrCreateInstance(el).show();
  }

  
  function openCover(src, title) {
    var img = document.getElementById('coverModalImage');
    var caption = document.getElementById('coverModalCaption');
    var heading = document.getElementById('coverModalTitle');
    if (img) {
      img.src = src;
      img.alt = title ? 'Perbesaran: ' + title : 'Perbesaran sampul arsip';
    }
    if (caption) caption.textContent = title ? title + ' — kredit dicatat pada lembar entri.' : 'Sampul entri arsip.';
    if (heading) heading.textContent = 'ARTEFAK / ' + String(title || 'SAMPUL ARSIP').toUpperCase().slice(0, 48);
    var el = document.getElementById('coverModal');
    if (el && window.bootstrap) window.bootstrap.Modal.getOrCreateInstance(el).show();
  }

  
  function openReport() {
    var url = document.getElementById('reportUrl');
    if (url) url.textContent = window.location.href;
    var el = document.getElementById('reportModal');
    if (el && window.bootstrap) window.bootstrap.Modal.getOrCreateInstance(el).show();
  }

  
  function openCoverZoom() {
    var dialog = document.getElementById('coverZoom');
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
  }

  
  document.addEventListener('change', function (event) {
    var select = event.target.closest('select[data-sort-select]');
    if (!select) return;
    var option = select.options[select.selectedIndex];
    var url = option && option.getAttribute('data-url');
    if (url) window.location.href = url;
  });

  
  
  function initSceneExplorer() {
    var list = document.querySelector('.scene-city-list');
    var panel = document.getElementById('scenePreview');
    if (!list || !panel) return;
    var urlTemplate = list.getAttribute('data-scene-url-template') || '/scene/:slug';

    function span(className, text) {
      var el = document.createElement('span');
      if (className) el.className = className;
      el.textContent = text;
      return el;
    }

    list.querySelectorAll('.city-select').forEach(function (btn) {
      btn.addEventListener('click', function () {
        list.querySelectorAll('.city-select').forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');

        panel.style.setProperty('--city-accent', btn.dataset.cityColor || '#d2f26b');

        while (panel.firstChild) panel.removeChild(panel.firstChild);

        var sun = document.createElement('span');
        sun.className = 'scene-preview-sun';
        sun.setAttribute('aria-hidden', 'true');
        panel.appendChild(sun);

        var top = document.createElement('div');
        top.className = 'scene-preview-top';
        top.appendChild(span('', 'SCENE FILE / ' + String(btn.dataset.cityCode || '').toUpperCase()));
        top.appendChild(span('', 'JAWA TIMUR, INDONESIA'));
        panel.appendChild(top);

        var name = document.createElement('strong');
        name.className = 'scene-preview-name';
        name.textContent = String(btn.dataset.cityName || '').toUpperCase();
        name.appendChild(span('', '.'));
        panel.appendChild(name);

        var footer = document.createElement('div');
        footer.className = 'scene-preview-footer';
        var counts = document.createElement('div');
        counts.appendChild(span('', String(btn.dataset.cityReleases || '0').padStart(2, '0') + ' RILISAN'));
        counts.appendChild(span('', String(btn.dataset.cityArtists || '0').padStart(2, '0') + ' ARTIS'));
        var linkWrap = document.createElement('div');
        var copy = document.createElement('p');
        copy.textContent = 'Scene kota ini di arsip.';
        var link = document.createElement('a');
        link.href = urlTemplate.replace(':slug', encodeURIComponent(btn.dataset.citySlug || ''));
        link.textContent = 'JELAJAHI SCENE';
        linkWrap.appendChild(copy);
        linkWrap.appendChild(link);
        footer.appendChild(counts);
        footer.appendChild(linkWrap);
        panel.appendChild(footer);
      });
    });
  }

  
  
  function initSavedList() {
    var list = document.getElementById('savedList');
    if (!list) return;
    var KEY = 'noiseantara:saved-releases:v1';
    var emptyUrl = list.getAttribute('data-empty-url') || '/rilisan';

    function read() {
      try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { return []; }
    }

    function render() {
      var items = read();
      document.querySelectorAll('[data-saved-count]').forEach(function (el) {
        el.textContent = String(items.length).padStart(2, '0');
      });
      list.textContent = '';
      if (!items.length) {
        var empty = document.createElement('div');
        empty.className = 'empty-state';
        var mark = document.createElement('span');
        mark.className = 'empty-state-mark';
        mark.textContent = '▪';
        empty.appendChild(mark);
        empty.appendChild(Object.assign(document.createElement('p'), { className: 'mono-label', textContent: 'BELUM ADA YANG DISIMPAN' }));
        empty.appendChild(Object.assign(document.createElement('h3'), { textContent: 'Daftarmu masih kosong.' }));
        empty.appendChild(Object.assign(document.createElement('p'), { textContent: 'Jelajahi rilisan dan tekan ikon bookmark pada kartu untuk menyimpan di sini.' }));
        var actions = document.createElement('div');
        actions.className = 'empty-actions';
        var cta = document.createElement('a');
        cta.href = emptyUrl;
        cta.className = 'btn-ink';
        cta.textContent = 'JELAJAHI RILISAN';
        actions.appendChild(cta);
        empty.appendChild(actions);
        list.appendChild(empty);
        return;
      }
      var wrap = document.createElement('div');
      wrap.className = 'saved-rows';
      items.forEach(function (slug) {
        var row = document.createElement('div');
        row.className = 'saved-row';
        var strong = document.createElement('strong');
        strong.textContent = String(slug).replace(/-/g, ' ');
        var a = document.createElement('a');
        a.href = '/rilisan/' + encodeURIComponent(slug);
        a.textContent = 'BUKA →';
        row.appendChild(strong);
        row.appendChild(a);
        wrap.appendChild(row);
      });
      list.appendChild(wrap);
      list.appendChild(Object.assign(document.createElement('p'), {
        className: 'saved-note',
        textContent: 'Tautan di atas membuka entri /rilisan sesuai slug yang tersimpan. Hapus item yang sudah tidak ada dengan tombol di bawah.',
      }));
    }

    var clearBtn = document.getElementById('clearSaved');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      localStorage.removeItem(KEY);
      render();
    });
    window.addEventListener('storage', render);
    render();
  }

  
  
  function initGuestContributionForm() {
    var form = document.getElementById('contributionForm');
    if (!form) return;
    var steps = form.querySelectorAll('.form-step');
    if (!steps.length) return;
    var card = form.closest('.contribution-form-card') || document;
    var stepBtns = card.querySelectorAll('.steps .step');
    if (!stepBtns.length) stepBtns = document.querySelectorAll('[data-step-go]');
    var back = document.getElementById('stepBack');
    var next = document.getElementById('stepNext');
    var submit = document.getElementById('stepSubmit');
    var errorBox = document.getElementById('formError');
    var current = 0;

    function show(i) {
      current = Math.max(0, Math.min(i, steps.length - 1));
      steps.forEach(function (s, k) { s.classList.toggle('active', k === current); });
      stepBtns.forEach(function (b, k) {
        b.classList.toggle('active', k === current);
        if (k === current) { b.setAttribute('aria-current', 'step'); } else { b.removeAttribute('aria-current'); }
      });
      if (back) back.hidden = current === 0;
      if (next) next.hidden = current === steps.length - 1;
      if (submit) submit.hidden = current !== steps.length - 1;
      if (errorBox && current !== steps.length - 1) { errorBox.style.display = 'none'; }
      var active = steps[current];
      if (active) {
        var first = active.querySelector('input,select,textarea');
        if (first && document.activeElement && form.contains(document.activeElement)) first.focus({ preventScroll: true });
      }
    }

    function validateStep(i) {
      var visible = steps[i];
      if (!visible) return true;
      var invalid = visible.querySelectorAll('input[required],select[required],textarea[required]');
      for (var k = 0; k < invalid.length; k++) {
        if (!invalid[k].checkValidity()) { invalid[k].reportValidity(); return false; }
      }
      return true;
    }

    if (next) next.addEventListener('click', function () {
      if (!validateStep(current)) return;
      show(current + 1);
    });
    if (back) back.addEventListener('click', function () { show(current - 1); });
    stepBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var target = parseInt(b.getAttribute('data-step-go') || b.dataset.stepGo || '0', 10);
        if (isNaN(target)) target = 0;
        
        if (target > current && !validateStep(current)) return;
        show(target);
      });
    });

    
    form.addEventListener('submit', function (e) {
      var messages = [];
      
      var kindEl = form.querySelector('#entity_kind');
      var kind = kindEl ? kindEl.value : 'rilisan';
      var requiredIds = ['title', 'city_slug', 'source_type', 'source_description', 'guest_name', 'guest_email'];
      if (kind === 'rilisan') requiredIds.push('artist_name');
      requiredIds.forEach(function (id) {
        var el = form.querySelector('#' + id);
        if (el && !el.checkValidity()) messages.push(el.previousElementSibling ? el.previousElementSibling.textContent.trim() : id);
      });
      var consent = form.querySelector('input[name="consent"]');
      if (consent && !consent.checked) messages.push('Persetujuan hak & kode etik wajib dicentang');
      if (!form.checkValidity()) {
        e.preventDefault();
        if (errorBox) {
          errorBox.style.display = 'block';
          errorBox.innerHTML = '<strong>Lengkapi dulu sebelum dikirim:</strong><ul>' + (messages.length ? messages.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') : '<li>Periksa kembali kolom bertanda *.</li>') + '</ul>';
          errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        for (var i = 0; i < steps.length; i++) {
          var req = steps[i].querySelectorAll('input[required],select[required],textarea[required]');
          var bad = false;
          req.forEach ? req.forEach(function (el) { if (!el.checkValidity()) bad = true; }) : null;
          if (bad) { show(i); break; }
        }
        return;
      }
      if (submit) { submit.disabled = true; submit.textContent = 'MENGIRIM…'; }
    });

    var rows = document.getElementById('trackRows');
    var addBtn = form.querySelector('[data-action="add-track"]');
    if (rows && addBtn) addBtn.addEventListener('click', function () {
      var n = rows.querySelectorAll('.track-input-row').length;
      var div = document.createElement('div');
      div.className = 'track-input-row';
      div.innerHTML = '<span>' + String(n + 1).padStart(2, '0') + '</span>'
        + '<input type="text" name="tracks[]" maxlength="120" class="form-control form-control-n" placeholder="Judul lagu">'
        + '<button type="button" data-action="remove-track" aria-label="Hapus lagu"><i class="icon ph ph-x" style="font-size:16px" aria-hidden="true"></i></button>';
      rows.appendChild(div);
      div.querySelector('input').focus();
    });
    if (rows) rows.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="remove-track"]');
      if (!btn || btn.disabled) return;
      var list = rows.querySelectorAll('.track-input-row');
      if (list.length <= 1) return;
      btn.closest('.track-input-row').remove();
      list = rows.querySelectorAll('.track-input-row');
      list.forEach(function (r, i) { r.querySelector('span').textContent = String(i + 1).padStart(2, '0'); });
    });
  }

  
  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-action]');
    if (!trigger) return;
    var action = trigger.getAttribute('data-action');

    if (action === 'back-to-top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'share') {
      shareUrl(trigger.getAttribute('data-url') || window.location.href, trigger.getAttribute('data-title') || document.title, trigger.getAttribute('data-text') || '');
    } else if (action === 'cite') {
      openCitation(trigger.getAttribute('data-title') || document.title, trigger.getAttribute('data-url') || window.location.href);
    } else if (action === 'show-cover') {
      openCover(trigger.getAttribute('data-cover') || trigger.querySelector('img')?.src || '', trigger.getAttribute('data-title') || '');
    } else if (action === 'zoom-cover') {
      openCoverZoom();
    } else if (action === 'copy-citation') {
      copyText(buildCitation(), 'Sitasi disalin ke papan klip.');
    } else if (action === 'copy-report') {
      var reason = (document.getElementById('reportReason') || {}).value || 'Lainnya';
      var detail = (document.getElementById('reportDetail') || {}).value || '-';
      copyText('LAPORAN ARSIP\nHalaman: ' + window.location.href + '\nAlasan: ' + reason + '\nKeterangan: ' + detail, 'Ringkasan laporan disalin.');
    } else if (action === 'report') {
      openReport();
    } else if (action === 'print-page') {
      window.print();
    }
  });

  
  document.querySelectorAll('[data-citation-format]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      citationState.format = btn.getAttribute('data-citation-format') || 'apa';
      renderCitation();
    });
  });

  
  
  
  
  document.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-flash-dismiss]');
    if (!btn) return;
    var flash = btn.closest('.flash-status');
    if (!flash) return;
    var wrap = flash.closest('.flash-wrap');
    flash.remove();
    if (wrap && !wrap.children.length) wrap.remove();
  });

  
  function updateScrollUi() {
    var bar = document.getElementById('readingProgress');
    var top = document.querySelector('[data-action="back-to-top"].back-top');
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (bar) bar.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
    if (top) top.classList.toggle('is-visible', window.scrollY > 700);
  }
  document.addEventListener('scroll', updateScrollUi, { passive: true });
  window.addEventListener('resize', updateScrollUi);

  
  document.addEventListener('DOMContentLoaded', function () {
    refreshSavedCount();
    updateScrollUi();
    renderCitation();
    initSceneExplorer();
    initSavedList();
    initGuestContributionForm();
    window.addEventListener('storage', refreshSavedCount);
  });
  refreshSavedCount();
  updateScrollUi();
})();
