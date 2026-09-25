/* 海月水母館 — 存檔：只存在這台裝置的瀏覽器裡 */
(function (MJ) {
  'use strict';

  const U = MJ.U;
  const KEY = 'moonjelly.save.v1';

  const S = { KEY };

  S.defaults = () => ({
    v: 1,
    created: Date.now(),
    lastSeen: Date.now(),
    light: 25,
    lifetimeLight: 0,
    jellies: [],
    polyps: [],
    decor: [],
    theme: 'night',
    themes: ['night'],
    tank: 0,
    inventory: { star: 2, dew: 1 },
    codex: {},
    achievements: {},
    stats: {
      feeds: 0, pets: 0, worries: 0, breaths: 0, breeds: 0, hatched: 0,
      released: 0, events: 0, catches: 0, letters: 0, photos: 0, sleeps: 0, bubbles: 0,
    },
    daily: { last: null, streak: 0, best: 0 },
    moods: {},
    released: [],
    settings: { music: true, sfx: true, volume: 0.8, mood: 'deep', sing: true, muted: false },
    tutorial: {},
    flags: {},
    lastBreathAt: 0,
    cooldowns: { chest: 0, bottle: 0, conch: 0 },
    seenLetters: [],
  });

  const merge = (base, saved) => {
    for (const k in saved) {
      const v = saved[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        merge(base[k], v);
      } else if (v !== undefined) base[k] = v;
    }
    return base;
  };

  S.load = () => {
    const saved = U.store.get(KEY);
    const st = S.defaults();
    if (saved && typeof saved === 'object') merge(st, saved);
    st.fresh = !saved;
    return st;
  };

  // 以 _ 開頭的欄位是畫圖用的暫存（例如珊瑚的枝枒），不寫進存檔
  const replacer = (k, v) => (k && k[0] === '_') || k === 'fresh' ? undefined : v;
  const serialize = (state) => JSON.stringify(state, replacer);

  S.save = (state) => {
    try {
      localStorage.setItem(KEY, serialize(state));
      return true;
    } catch (e) {
      return false;
    }
  };

  S.reset = () => U.store.remove(KEY);

  S.exportText = (state) => {
    try {
      return btoa(unescape(encodeURIComponent(serialize(state))));
    } catch (e) {
      return '';
    }
  };

  S.importText = (text) => {
    try {
      const obj = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
      if (!obj || typeof obj !== 'object' || !Array.isArray(obj.jellies)) return null;
      return merge(S.defaults(), obj);
    } catch (e) {
      return null;
    }
  };

  MJ.Store = S;
})((window.MJ = window.MJ || {}));
