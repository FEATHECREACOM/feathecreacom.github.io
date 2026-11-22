// Keep one anonymous installation record across game saves and concurrent tabs.
(() => {
  const endpoint = document.currentScript.dataset.endpoint;
  let database;
  function openDatabase() {
    if (!database) database = new Promise((resolve, reject) => {
      const req = indexedDB.open('nameless-demo-playtest', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('stats');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return database;
  }
  async function update(edit) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('stats', 'readwrite');
      const store = tx.objectStore('stats');
      const req = store.get('browser');
      let record;
      req.onsuccess = () => {
        const previous = req.result;
        if (previous) delete previous.nickname;
        record = edit(previous);
        if (record) store.put(record, 'browser');
      };
      tx.oncomplete = () => resolve(record);
      tx.onabort = () => reject(tx.error);
    });
  }
  let timer;
  async function sync(record) {
    if (!record || record.sent >= record.revision) return;
    try {
      const { id, named, revision } = record;
      const result = await fetch(endpoint, {method:'POST', credentials:'omit', referrerPolicy:'no-referrer',
        headers:{'Content-Type':'application/json'}, body:JSON.stringify({id, named, revision})});
      if (!result.ok) throw Error('Pending');
      await update(current => current?.id === id ? {...current, sent:Math.max(current.sent,revision)} : null);
    } catch {
      clearTimeout(timer);
      timer = setTimeout(retry, 60000);
    }
  }
  function retry() { update(record => record).then(sync).catch(() => {}); }
  function record(named = false) {
    update(previous => {
      const current = previous || {id:crypto.randomUUID(), named:false, revision:1, sent:0};
      if (named && !current.named) {
        current.named = true;
        current.revision++;
      }
      return current;
    }).then(sync).catch(() => {});
  }
  window.playtestStats = {
    start:() => record(),
    nameSet:() => record(true),
    // Compatibility with already cached game pages.
    name:value => { if (value) record(true); }
  };
  addEventListener('online',retry);
  retry();
})();
