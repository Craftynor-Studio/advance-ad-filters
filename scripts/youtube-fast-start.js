// Advance Ad Filters: YouTube fast start. MIT License, https://github.com/Craftynor-Studio/advance-ad-filters
// Run at document start on https://www.youtube.com and https://m.youtube.com, in the top frame.
(function () {
  'use strict';

  if (window.__youtubeAdFastStart) return;

  var nativeSetTimeout = window.setTimeout;
  var nativeSetInterval = window.setInterval;
  var nativeClearInterval = window.clearInterval;
  var functionToString = Function.prototype.toString;
  var scanInterval = 0;
  var scanDeadline = 0;
  var playbackKickDeadline = 0;

  // YouTube currently uses a 17-second native callback in its blocked-ad
  // recovery path. Keep every ordinary timer untouched and shorten only that
  // exact native callback to the equivalent upstream fast-path delay.
  window.setTimeout = new Proxy(nativeSetTimeout, {
    apply: function (target, thisArg, args) {
      if (Number(args[1]) === 17000 && typeof args[0] === 'function') {
        var source = '';
        try { source = functionToString.call(args[0]); } catch (_) {}
        if (source.indexOf('[native code]') !== -1) args[1] = 17;
      }
      return Reflect.apply(target, thisArg, args);
    },
  });

  function visible(element) {
    if (!element) return false;
    var style = window.getComputedStyle(element);
    var rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      rect.width > 0 && rect.height > 0;
  }

  function safeCall(target, method) {
    try {
      return target && typeof target[method] === 'function' ? target[method]() : null;
    } catch (_) {
      return null;
    }
  }

  function scan() {
    var player = document.getElementById('movie_player') ||
      document.querySelector('.html5-video-player');
    var video = document.querySelector('video');
    var skipButton = Array.prototype.slice.call(document.querySelectorAll(
      '.ytp-ad-skip-button-modern,.ytp-ad-skip-button,.ytp-skip-ad-button,' +
      '.videoAdUiSkipButton,button[aria-label*="Skip ad" i]'
    )).find(visible);
    if (skipButton) {
      try { skipButton.click(); } catch (_) {}
    }

    var adState = safeCall(player, 'getAdState');
    var stats = safeCall(player, 'getVideoStats') || {};
    var debugText = String(stats.debug_info || safeCall(player, 'getDebugText') || '');
    var serverAd = debugText.indexOf('SSAP, AD') !== -1;
    var adModule = document.querySelector('.video-ads.ytp-ad-module');
    var adShowing = !!(
      skipButton || serverAd || (typeof adState === 'number' && adState >= 0) ||
      (player && player.classList.contains('ad-showing')) ||
      document.querySelector('.ad-showing') || visible(adModule)
    );

    if (adShowing && player) {
      var progress = safeCall(player, 'getProgressState') || {};
      var duration = Number(progress.duration || (video && video.duration));
      if (Number.isFinite(duration) && duration > 0) {
        try {
          if (typeof player.seekTo === 'function') player.seekTo(duration, true);
          else if (video) video.currentTime = duration;
        } catch (_) {}
      }
    }

    if (Date.now() < playbackKickDeadline && player && video && video.paused &&
        !video.ended && video.currentTime < 0.35 && video.readyState >= 2) {
      var playerState = safeCall(player, 'getPlayerState');
      if (playerState === -1 || playerState === 3 || playerState === 5) {
        try {
          var promise = video.play();
          if (promise && promise.catch) promise.catch(function () {});
        } catch (_) {}
      }
    }

    if (scanInterval && Date.now() >= scanDeadline) {
      nativeClearInterval.call(window, scanInterval);
      scanInterval = 0;
    }
  }

  function arm() {
    var now = Date.now();
    scanDeadline = Math.max(scanDeadline, now + 12000);
    playbackKickDeadline = Math.max(playbackKickDeadline, now + 8000);
    scan();
    if (!scanInterval) scanInterval = nativeSetInterval.call(window, scan, 100);
  }

  window.__youtubeAdFastStart = { arm: arm, scan: scan };
  ['yt-navigate-start', 'yt-navigate-finish', 'yt-page-data-updated', 'popstate'].forEach(function (name) {
    window.addEventListener(name, arm, true);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm, { once: true });
  } else {
    arm();
  }
}());
