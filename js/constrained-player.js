
(function () {
  'use strict';

  var PLAYERS = document.querySelectorAll('.audio-player');
  if (!PLAYERS.length) return;

  var active = null; 

  function storageKey(mediaId) {
    return 'na:audio-pos:' + mediaId;
  }

  function requestToken(mediaId) {
    
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
      audio.playbackRate = 1.0; 

      audio.addEventListener('ratechange', function () {
        audio.playbackRate = 1.0; 
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

    
    player.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    
    player.addEventListener('keydown', function (e) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  });
})();
