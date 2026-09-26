/**
 * F1-61 — Pemutar terkendala (PRD DNG-03/05/06/10, DR-AUD-01..05).
 *
 * Aturan non-negotiable:
 * - HANYA Play/Pause — tidak ada next/prev/±10s; kontrol seek TIDAK PERNAH di DOM.
 * - Progress bar non-interaktif (pointer-events:none; tabindex disengaja tidak ada).
 * - Tombol panah ←/→ diabaikan saat fokus di dalam pemutar.
 * - Context menu (klik kanan) dimatikan di area pemutar — cegah "Buka audio di tab baru".
 * - playbackRate dikunci 1.0 (setiap 'ratechange' dikembalikan).
 * - Single player: memutar lagu lain menjeda yang aktif.
 * - Resume memakai posisi sessionStorage (bukan currentTime bawaan browser).
 */
(function () {
  'use strict';

  var PLAYERS = document.querySelectorAll('.audio-player');
  if (!PLAYERS.length) return;

  var active = null; // elemen .audio-player yang sedang diputar

  function storageKey(mediaId) {
    return 'na:audio-pos:' + mediaId;
  }

  function requestToken(mediaId) {
    // F1-60 — token signed berumur pendek; endpoint mengembalikan URL stream.
    return fetch('/audio/' + mediaId + '/token', {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')
        ? document.querySelector('meta[name=csrf-token]').content : '' },
      credentials: 'same-origin',
    }).then(function (res) {
      if (!res.ok) throw new Error('token');
      return res.json();
    });
  }

  function pause(activePlayer) {
    if (!activePlayer || !activePlayer._audio) return;
    activePlayer._audio.pause();
  }

  function toggle(player) {
    var btn = player.querySelector('[data-player-toggle]');

    if (player._audio && !player._audio.paused) {
      player._audio.pause();
      return;
    }

    if (player._audio) {
      singleGuard(player);
      player._audio.play();
      return;
    }

    var mediaId = player.getAttribute('data-media-id');
    requestToken(mediaId).then(function (data) {
      var audio = new Audio(data.url);
      audio.preload = 'none';
      audio.playbackRate = 1.0; // DR-AUD-03 — kunci kecepatan

      audio.addEventListener('ratechange', function () {
        audio.playbackRate = 1.0; // dikunci — percobaan ubah kecepatan diabaikan
      });
      audio.addEventListener('timeupdate', function () {
        var pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        var bar = player.querySelector('[data-player-bar]');
        if (bar) bar.style.width = pct + '%';
        var time = player.querySelector('[data-player-time]');
        if (time) time.textContent = format(audio.currentTime);
        try { sessionStorage.setItem(storageKey(mediaId), String(audio.currentTime)); } catch (e) {}
      });
      audio.addEventListener('ended', function () {
        btn.textContent = '▶';
        btn.setAttribute('aria-pressed', 'false');
        try { sessionStorage.removeItem(storageKey(mediaId)); } catch (e) {}
      });
      audio.addEventListener('pause', function () {
        btn.textContent = '▶';
        btn.setAttribute('aria-pressed', 'false');
        if (active === player) active = null;
      });
      audio.addEventListener('play', function () {
        btn.textContent = '⏸';
        btn.setAttribute('aria-pressed', 'true');
        active = player;
      });

      player._audio = audio;
      singleGuard(player);

      // Resume posisi tersimpan di sessionStorage — bukan currentTime browser (DNG-10)
      var saved = parseFloat(sessionStorage.getItem(storageKey(mediaId)) || '0');
      if (saved > 0 && isFinite(saved)) {
        audio.currentTime = saved;
      }

      audio.play();
    }).catch(function () {
      btn.setAttribute('aria-label', 'Audio tidak tersedia');
      btn.disabled = true;
    });
  }

  /** DNG-06 — hanya satu pemutar aktif: yang lain dijeda. */
  function singleGuard(player) {
    if (active && active !== player) pause(active);
    active = player;
  }

  function format(seconds) {
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  PLAYERS.forEach(function (player) {
    player.setAttribute('role', 'group');
    player.setAttribute('aria-label', 'Pemutar audio terkendala — hanya putar/jeda');

    var btn = player.querySelector('[data-player-toggle]');
    if (!btn) return;

    btn.addEventListener('click', function () { toggle(player); });

    // Cegah menu konteks di area pemutar (DNG-03 — tanpa jalan pintas unduh)
    player.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // ←/→ diabaikan — seek keyboard mustahil (DNG-05)
    player.addEventListener('keydown', function (e) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  });
})();
