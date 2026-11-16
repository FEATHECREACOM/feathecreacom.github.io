/* Shared language preference for feathecrea pages. */
(function () {
  'use strict';
  var KEY = 'feathecrea-lang';
  function valid(value) { return value === 'ja' || value === 'en'; }
  function get(legacyKey) {
    var query = new URLSearchParams(location.search).get('lang');
    if (valid(query)) return query;
    try {
      var saved = localStorage.getItem(KEY);
      if (valid(saved)) return saved;
      if (legacyKey) {
        saved = localStorage.getItem(legacyKey);
        if (valid(saved)) return saved;
      }
    } catch (e) {}
    return /^ja\b/i.test(navigator.language || '') ? 'ja' : 'en';
  }
  function save(lang) {
    if (!valid(lang)) return;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    var current = new URL(location.href);
    var changed = false;
    if (current.searchParams.has('lang') && current.searchParams.get('lang') !== lang) {
      current.searchParams.set('lang', lang);
      changed = true;
    }
    if (/^#(ja|en)$/.test(current.hash) && current.hash !== '#' + lang) {
      current.hash = lang;
      changed = true;
    }
    if (changed) history.replaceState(null, '', current.pathname + current.search + current.hash);
    // Keep the current choice in internal links even when storage is blocked.
    document.querySelectorAll('a[href]').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      var url = new URL(href, location.href);
      if (url.hostname === 'play.google.com' && url.pathname === '/store/apps/details') {
        url.searchParams.set('hl', lang);
        link.href = url.href;
        return;
      }
      if (url.hostname === 'apps.apple.com') {
        url.pathname = url.pathname.replace(/^\/(jp|us)\//, '/' + (lang === 'ja' ? 'jp' : 'us') + '/');
        link.href = url.href;
        return;
      }
      if (url.origin !== location.origin || !(/\/$|\.html$/.test(url.pathname))) return;
      url.searchParams.set('lang', lang);
      link.setAttribute('href', url.pathname + url.search + url.hash);
    });
  }
  window.FeathecreaLanguage = { get: get, save: save };
})();
