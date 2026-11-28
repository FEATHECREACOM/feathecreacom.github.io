(() => {
  const platforms = {
    bluesky: ['bsky.app', 'bsky.social'],
    threads: ['threads.com', 'threads.net'],
    youtube: ['youtube.com', 'youtu.be'],
    instagram: ['instagram.com'],
    tiktok: ['tiktok.com'],
    reddit: ['reddit.com', 'redd.it'],
    x: ['x.com', 'twitter.com', 't.co'],
  };

  const params = new URLSearchParams(location.search);
  let source = [params.get('src'), params.get('utm_source')]
    .map((value) => value?.trim().toLowerCase())
    .find((value) => Object.hasOwn(platforms, value));

  if (!source) {
    let host = '';
    try { host = new URL(document.referrer).hostname; } catch { /* A referrer may be absent. */ }
    source = Object.keys(platforms).find((platform) => platforms[platform].some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    )) ?? 'unknown';
  }

  for (const [id, store] of [['ios', 'app_store'], ['android', 'google_play']]) {
    const link = document.getElementById(id);
    const recordClick = (event) => {
      if (!event.isTrusted || event.defaultPrevented) return;
      if (event.type === 'auxclick' && event.button !== 1) return;

      const endpoint = new URL('https://pulse-wrecker-stats.feathecrea.workers.dev/click');
      endpoint.search = new URLSearchParams({ source, store });
      fetch(endpoint, {
        method: 'POST',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        keepalive: true,
      }).catch(() => {});
    };
    link?.addEventListener('click', recordClick);
    link?.addEventListener('auxclick', recordClick);
  }
})();
