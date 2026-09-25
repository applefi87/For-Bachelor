/* 海月水母館 — 共用小工具 */
(function (MJ) {
  'use strict';

  const TAU = Math.PI * 2;
  const U = {};

  U.TAU = TAU;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  U.randInt = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;

  /** 依權重抽一個 key：{ a: 3, b: 1 } */
  U.weighted = (map) => {
    let total = 0;
    for (const k in map) total += map[k];
    let r = Math.random() * total;
    for (const k in map) {
      r -= map[k];
      if (r <= 0) return k;
    }
    return Object.keys(map)[0];
  };

  U.smooth = (t) => t * t * (3 - 2 * t);
  U.easeOut = (t) => 1 - Math.pow(1 - t, 3);
  U.easeInOut = (t) => 0.5 - Math.cos(Math.PI * t) / 2;

  /** 角度差（弧度），結果在 -PI..PI */
  U.angleDiff = (a, b) => {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  };

  /** 色相差（度），結果在 -180..180 */
  U.hueDiff = (a, b) => {
    let d = (b - a) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  };
  U.hueLerp = (a, b, t) => (((a + U.hueDiff(a, b) * t) % 360) + 360) % 360;
  U.wrapHue = (h) => ((h % 360) + 360) % 360;

  U.hsla = (h, s, l, a) =>
    'hsla(' + Math.round(h) + ',' + Math.round(s * 100) + '%,' + Math.round(l * 100) + '%,' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';

  U.uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5);

  U.fmt = (n) => Math.floor(n).toLocaleString('zh-TW');

  U.today = (d = new Date()) => {
    const p = (x) => String(x).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };

  U.daysBetween = (a, b) => {
    const da = new Date(a + 'T00:00:00');
    const db = new Date(b + 'T00:00:00');
    return Math.round((db - da) / 86400000);
  };

  U.escape = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.duration = (sec) => {
    sec = Math.max(0, Math.ceil(sec));
    if (sec < 60) return sec + ' 秒';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m < 60) return m + ' 分' + (s ? ' ' + s + ' 秒' : '');
    const h = Math.floor(m / 60);
    return h + ' 小時' + (m % 60 ? ' ' + (m % 60) + ' 分' : '');
  };

  /** 可重現的亂數（給裝飾、花紋用） */
  U.seeded = (seed) => {
    let s = seed >>> 0 || 1;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
  };
  U.hashStr = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  /* 一維平滑雜訊，0..1 */
  const perm = new Float32Array(512);
  for (let i = 0; i < 512; i++) perm[i] = Math.random();
  U.noise = (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = perm[i & 511];
    const b = perm[(i + 1) & 511];
    return a + (b - a) * f * f * (3 - 2 * f);
  };

  /* 發光貼圖快取：一張放射漸層，用 drawImage 疊加比 shadowBlur 快很多 */
  const glowCache = new Map();
  U.glow = (h, s = 0.8, l = 0.62) => {
    const key = (Math.round(h / 4) * 4) + '|' + Math.round(s * 10) + '|' + Math.round(l * 10);
    let c = glowCache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, U.hsla(h, s, l, 0.5));
    grd.addColorStop(0.25, U.hsla(h, s, l, 0.24));
    grd.addColorStop(0.6, U.hsla(h, s, l, 0.06));
    grd.addColorStop(1, U.hsla(h, s, l, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    glowCache.set(key, c);
    return c;
  };

  /** 在 (x,y) 畫一團光，size 為直徑 */
  U.drawGlow = (ctx, x, y, size, h, s, l, alpha = 1) => {
    if (size <= 0.5 || alpha <= 0.01) return;
    const img = U.glow(h, s, l);
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * alpha;
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    ctx.globalAlpha = prev;
  };

  U.heartPath = (ctx, x, y, s) => {
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.95, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  };

  U.starPath = (ctx, x, y, r, points = 5, inner = 0.45, rot = -Math.PI / 2) => {
    for (let i = 0; i < points * 2; i++) {
      const rr = i % 2 === 0 ? r : r * inner;
      const a = rot + (i * Math.PI) / points;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  /** 四角星（閃光） */
  U.sparklePath = (ctx, x, y, r) => {
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
  };

  U.store = {
    get(key) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : null;
      } catch (e) {
        return null;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
        return true;
      } catch (e) {
        return false;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        /* 私密模式等情況，忽略 */
      }
    },
  };

  U.inFrame = (() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  })();

  U.reducedMotion = (() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  })();

  MJ.U = U;
})((window.MJ = window.MJ || {}));
