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
        record = edit(req.result);
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
      const { id, named, nickname, revision } = record;
      const result = await fetch(endpoint, {method:'POST', credentials:'omit', referrerPolicy:'no-referrer',
        headers:{'Content-Type':'application/json'}, body:JSON.stringify({id, named, nickname, revision})});
      if (!result.ok) throw Error('Pending');
      await update(current => current?.id === id ? {...current, sent:Math.max(current.sent,revision)} : null);
    } catch {
      clearTimeout(timer);
      timer = setTimeout(retry, 60000);
    }
  }
  function retry() { update(record => record).then(sync).catch(() => {}); }
  function record(name, share) {
    update(previous => {
      const r = previous || {id:crypto.randomUUID(), named:false, nickname:null, revision:1, sent:0};
      if (name !== undefined) {
        const nickname = share && name ? name : null;
        if (nickname !== r.nickname || (name && !r.named)) {
          r.named ||= Boolean(name);
          r.nickname = nickname;
          r.revision++;
        }
      }
      return r;
    }).then(sync).catch(() => {});
  }
  window.playtestStats = {
    start:() => record(),
    name:(name, share) => record(name, share),
    restore:async input => {
      try {
        const r = await update(record => record);
        if (input.isConnected && !input.dataset.touched && r?.nickname && input.closest('.sname')?.querySelector('input[type=text]')?.value === r.nickname) input.checked = true;
      } catch {}
    }
  };
  document.addEventListener('change', e => { if(e.target.id==='shareWithDev') e.target.dataset.touched='1'; });
  const base = document.getElementById('base');
  let lastInput;
  new MutationObserver(() => {
    const input = base.querySelector('#shareWithDev');
    if (input && input !== lastInput) window.playtestStats.restore(input);
    lastInput = input;
  }).observe(base, {subtree:true, childList:true});
  addEventListener('online',retry);
  retry();
})();
