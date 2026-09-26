/* 海月水母館 — 介面：抽屜、對話框、提示、名片、圖鑑、商店 */
(function (MJ) {
  'use strict';

  const U = MJ.U;
  const Gn = MJ.Genes;
  const C = MJ.Content;
  const A = MJ.Audio;
  const esc = U.escape;

  /* ---------- 圖示（手繪線條，24×24） ---------- */
  const ICONS = {
    feed: '<circle cx="7" cy="5.5" r="1.5"/><circle cx="14.5" cy="8" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="16.5" cy="15" r="1.5"/><circle cx="11" cy="19" r="1.5"/>',
    worry: '<path d="M5 7.5c0-1.4 1.1-2.5 2.5-2.5h9c1.4 0 2.5 1.1 2.5 2.5v6c0 1.4-1.1 2.5-2.5 2.5H11l-4 3.5V16h0.5"/><path d="M9 9.5h6M9 12.5h4"/>',
    breath: '<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="6" opacity=".65"/><circle cx="12" cy="12" r="9.5" opacity=".35"/>',
    codex: '<path d="M5 5a1.8 1.8 0 0 1 1.8-1.8H19v14.6H6.8A1.8 1.8 0 0 0 5 19.6z"/><path d="M5 19.6a1.8 1.8 0 0 0 1.8 1.8H19"/><path d="M9.5 8.5a2.5 2.5 0 0 1 5 0z"/><path d="M10.5 8.5v3M12 8.5v3.5M13.5 8.5v3"/>',
    shop: '<path d="M12 20.5c-4.6 0-8.3-3.2-8.3-8.3a8.3 8.3 0 0 1 16.6 0c0 5.1-3.7 8.3-8.3 8.3z"/><path d="M12 20.5L6.2 6.6M12 20.5L9.2 4.3M12 20.5V3.9M12 20.5l2.8-16.2M12 20.5l5.8-13.9"/>',
    more: '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
    soundOn: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/>',
    soundOff: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    letter: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
    camera: '<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.6"/><path d="M8.5 7l1.6-2.8h3.8L15.5 7"/>',
    moon: '<path d="M19.5 14.5A7.8 7.8 0 1 1 9.5 4.5a6.2 6.2 0 0 0 10 10z"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
    next: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
    jelly: '<path d="M5 12a7 7 0 0 1 14 0z"/><path d="M8.5 12c0 3-1 5-1.2 8M12 12v8.5M15.5 12c0 3 1 5 1.2 8"/>',
    trophy: '<path d="M12 3.8l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z"/>',
    diary: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/><circle cx="9" cy="14.5" r="1"/><circle cx="14" cy="14.5" r="1"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
    heart: '<path d="M12 19s-7-4.4-7-9.3A3.9 3.9 0 0 1 12 7.4a3.9 3.9 0 0 1 7 2.3C19 14.6 12 19 12 19z"/>',
    arrange: '<path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3"/>',
  };
  ICONS.pearl = '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2"/><path d="M8.5 8.8a4.5 4.5 0 0 1 2.2-1.5"/>';
  ICONS.octo = '<path d="M7 12a5 5 0 0 1 10 0v2H7z"/><path d="M8 14c-1 2-2.5 3-4 3M10 14c-.3 2.5-1 4-2.3 5M14 14c.3 2.5 1 4 2.3 5M16 14c1 2 2.5 3 4 3"/><circle cx="10" cy="11" r=".6"/><circle cx="14" cy="11" r=".6"/>';
  Object.assign(ICONS, MJ.Feelings.ICONS);
  const icon = (n, cls = 'i') => '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';
  const F = MJ.Feelings;

  const SOLFEGE = ['Do', 'Re', 'Mi', 'Sol', 'La'];
  const noteName = (g) => {
    const idx = Gn.noteOf(g) + 3;
    const reg = idx < 5 ? '低音' : idx < 10 ? '中音' : '高音';
    return reg + ' ' + SOLFEGE[((idx % 5) + 5) % 5];
  };
  const dateStr = (ts) => {
    const d = new Date(ts);
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
  };
  const starsHTML = (n) => '<span class="stars" aria-label="稀有度 ' + n + ' 顆星">' + '★'.repeat(n) + '<span class="off">' + '★'.repeat(5 - n) + '</span></span>';
  const colorCss = (g, l = 70) => 'hsl(' + Math.round(g.hue) + ',' + Math.round(Math.max(g.sat, 0.15) * 100) + '%,' + l + '%)';

  const UI = { sheetKind: null, icon };
  let Game;
  const $ = (id) => document.getElementById(id);

  /* ================= 初始化 ================= */

  UI.init = (game) => {
    Game = game;
    for (const fn of initHooks) fn(game);
    UI.el = {
      hud: $('hud'),
      light: $('lightNum'),
      rate: $('lightRate'),
      letterBtn: $('btnLetter'),
      soundBtn: $('btnSound'),
      dock: $('dock'),
      toasts: $('toasts'),
      hint: $('hint'),
      sheet: $('sheet'),
      sheetTitle: $('sheetTitle'),
      sheetBody: $('sheetBody'),
      sheetBack: $('sheetBack'),
      modal: $('modal'),
      modalCard: $('modalCard'),
      feedPop: $('feedPop'),
      intro: $('intro'),
      feelBtn: document.querySelector('#dock [data-act="worry"]'),
    };

    document.querySelectorAll('[data-icon]').forEach((el) => {
      el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
    });
    UI.updateSound();

    UI.el.dock.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      A.click();
      const act = b.dataset.act;
      if (act === 'feed') return UI.toggleFeed();
      UI.closePopovers();
      if (act === 'worry') MJ.Ritual.start();
      else if (act === 'breath') UI.openSheet('breath');
      else if (act === 'codex') UI.openSheet('codex');
      else if (act === 'shop') UI.openSheet('shop');
      else if (act === 'more') UI.openSheet('more');
    });

    UI.el.feedPop.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-food]');
      if (b) {
        const type = b.dataset.food;
        if (type !== 'plankton' && !(Game.state.inventory[type] > 0)) {
          UI.closePopovers();
          UI.openSheet('shop', 'food');
          return;
        }
        Game.foodType = type;
        A.click();
        UI.updateFood();
        UI.closePopovers();
        UI.toast('點一下水面，就會撒下' + MJ.Food.TYPES[type].name + '。');
      }
    });

    $('btnSound').addEventListener('click', () => {
      Game.updateSettings({ muted: !Game.state.settings.muted });
      UI.updateSound();
    });
    $('btnSettings').addEventListener('click', () => UI.openSheet('settings'));
    UI.el.letterBtn.addEventListener('click', () => UI.letterModal());
    $('sheetClose').addEventListener('click', () => UI.closeSheet());
    UI.el.sheetBack.addEventListener('click', () => {
      if (UI.sheetBackTo) UI.openSheet(UI.sheetBackTo);
    });
    UI.el.modal.addEventListener('click', (e) => {
      if (e.target === UI.el.modal && UI.modalDismiss) UI.closeModal();
    });
    $('hintClose').addEventListener('click', () => {
      UI.el.hint.hidden = true;
      UI.hintDismissed = true;
    });

    $('introStart').addEventListener('click', () => Game.start());
    $('breathStop').addEventListener('click', () => Game.stopBreath());
    $('sleepStop').addEventListener('click', () => Game.stopSleep());
    $('photoShot').addEventListener('click', () => Game.takePhoto());
    $('photoClose').addEventListener('click', () => Game.stopPhoto());
    $('arrangeDone').addEventListener('click', () => Game.arrange(false));

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (UI.el.modal.classList.contains('open')) {
        if (UI.modalDismiss) UI.closeModal();
      } else if (UI.el.feedPop.classList.contains('open')) UI.closePopovers();
      else if (UI.callout.open) UI.callout.close();
      else if (UI.sheetKind) UI.closeSheet();
      else if (Game.mode === 'breath') Game.stopBreath();
      else if (Game.mode === 'sleep') Game.stopSleep();
      else if (Game.mode === 'photo') Game.stopPhoto();
      else if (Game.mode === 'arrange') Game.arrange(false);
    });

    // 在 claude.ai 的頁面裡，存照片要透過平台的下載功能；其他地方用一般的下載
    UI.downloads = null;
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        window.claude.use('downloads').then((d) => (UI.downloads = d), () => {});
      }
    } catch (e) {
      UI.downloads = null;
    }

    UI.updateFood();
    UI.hudTick = 0;
    UI.displayLight = Game.state.light;
    UI.renderHud(true);
    UI.pendingToasts = [];
  };

  UI.afterStart = (offline) => {
    document.body.classList.remove('intro');
    UI.el.intro.classList.add('gone');
    setTimeout(() => (UI.el.intro.hidden = true), 1200);
    const pend = UI.pendingToasts || [];
    UI.pendingToasts = null;
    UI.showHint(Game.currentHint());
    const s = Game.state;
    if (s.fresh) {
      UI.welcomeModal();
      setTimeout(() => {
        if (Game.polyps.length) UI.toast('海底那個發光的小東西是水螅體，就快孵化了。');
      }, 14000);
    }
    if (s.fresh) {
      if (Game.letterDue()) UI.el.letterBtn.hidden = false;
    } else {
      // 回來的時候，所有事情合成一張卡，不要一個接一個跳出來
      const off = offline && (offline.gain > 0 || offline.born.length) ? offline : null;
      const steps = Game.dueSteps(true);
      const letter = Game.letterDue();
      const recap = Game.recapDue();
      if (off || steps.length || letter || recap) UI.welcomeBack({ offline: off, steps, letter, recap });
    }
    pend.forEach((t) => UI.toast.apply(null, t));
  };

  /* ================= HUD ================= */

  UI.renderHud = (force) => {
    const s = Game.state;
    const target = s.light;
    const d = UI.displayLight;
    UI.displayLight = force ? target : d + (target - d) * 0.25;
    if (Math.abs(target - UI.displayLight) < 1) UI.displayLight = target;
    const txt = U.fmt(UI.displayLight);
    if (UI.el.light.textContent !== txt) UI.el.light.textContent = txt;
    const r = '+' + U.fmt(Game.rate * 3600) + ' / 小時';
    if (UI.el.rate.textContent !== r) UI.el.rate.textContent = r;
    const due = Game.started && Game.letterDue();
    if (UI.el.letterBtn.hidden === due) UI.el.letterBtn.hidden = !due;
    // 今天還沒記過心情：心情按鈕上亮一個很淡的小點（只提醒，不催）
    const E = s.entries;
    const nudge = Game.started && E.length > 0 && U.today(new Date(E[E.length - 1].t)) !== U.today();
    if (UI.el.feelBtn && UI.el.feelBtn.classList.contains('nudge') !== nudge) UI.el.feelBtn.classList.toggle('nudge', nudge);
  };

  UI.updateSound = () => {
    const muted = !!Game.state.settings.muted;
    const b = UI.el.soundBtn;
    b.innerHTML = icon(muted ? 'soundOff' : 'soundOn');
    b.setAttribute('aria-label', muted ? '打開聲音' : '關掉聲音');
    b.setAttribute('aria-pressed', String(!muted));
  };

  UI.frame = (dt) => {
    UI.hudTick -= dt;
    if (UI.hudTick <= 0) {
      UI.hudTick = 0.12;
      UI.renderHud();
    }
    const live = UI.cardLive;
    if (live) {
      live.jelly.animate(dt, live.env);
      const ctx = live.ctx;
      ctx.setTransform(live.dpr, 0, 0, live.dpr, 0, 0);
      ctx.clearRect(0, 0, live.size, live.size);
      live.jelly.draw(ctx, live.env);
    }
    UI.slowTick = (UI.slowTick || 0) - dt;
    if (UI.slowTick <= 0) {
      UI.slowTick = 0.4;
      UI.refreshBound();
      UI.callout.pump();
    }
    UI.deferTick = (UI.deferTick || 0) - dt;
    if (UI.deferred.length && UI.deferTick <= 0 && !UI.isQuiet() && !UI.modalOpenNow) {
      UI.deferTick = 3.2;
      UI.toast.apply(null, UI.deferred.shift());
    }
    if (Game.mode === 'sleep') UI.sleepTick();
  };

  /* ================= 提示 ================= */

  /** 剛陪完一份心情的時候，先安靜一下：成就和新發現晚一點再說 */
  UI.quietUntil = 0;
  UI.deferred = [];
  UI.quiet = (sec) => {
    UI.quietUntil = Math.max(UI.quietUntil, Date.now() + sec * 1000);
  };
  UI.isQuiet = () => Date.now() < UI.quietUntil || !!(MJ.Ritual && MJ.Ritual.open);

  UI.toast = (text, kind = 'soft', sub = null) => {
    if (UI.pendingToasts) {
      UI.pendingToasts.push([text, kind, sub]);
      return;
    }
    if ((kind === 'achievement' || kind === 'discover') && UI.isQuiet()) {
      UI.deferred.push([text, kind, sub]);
      return;
    }
    const box = UI.el.toasts;
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = '<div class="toast-main">' + esc(text) + '</div>' + (sub ? '<div class="toast-sub">' + esc(sub) + '</div>' : '');
    box.appendChild(el);
    while (box.children.length > 3) box.firstElementChild.remove();
    const life = 3400 + String(text).length * 45 + (sub ? 1200 : 0);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 450);
    }, life);
  };

  UI.showHint = (text) => {
    const h = UI.el.hint;
    if (!text || UI.hintDismissed) {
      h.hidden = true;
      return;
    }
    $('hintText').textContent = text;
    h.hidden = false;
  };

  /* ================= 餵食選單 ================= */

  UI.toggleFeed = () => {
    const pop = UI.el.feedPop;
    if (pop.classList.contains('open')) return UI.closePopovers();
    UI.callout.close();
    UI.updateFood();
    // 對齊「餵食」按鈕的左邊（桌面的選單在中間，手機是整排）
    const r = UI.el.dock.getBoundingClientRect();
    pop.style.left = Math.round(Math.max(16, Math.min(r.left, window.innerWidth - pop.offsetWidth - 16))) + 'px';
    pop.classList.add('open');
    pop.setAttribute('aria-hidden', 'false');
  };

  UI.closePopovers = () => {
    const pop = UI.el && UI.el.feedPop;
    if (!pop) return;
    pop.classList.remove('open');
    pop.setAttribute('aria-hidden', 'true');
  };

  UI.updateFood = () => {
    if (!UI.el) return;
    const inv = Game.state.inventory;
    const types = MJ.Food.TYPES;
    UI.el.feedPop.innerHTML =
      '<div class="pop-title">要餵什麼？</div>' +
      Object.keys(types)
        .map((k) => {
          const n = k === 'plankton' ? '∞' : '×' + (inv[k] || 0);
          const sel = Game.foodType === k ? ' selected' : '';
          const empty = k !== 'plankton' && !(inv[k] > 0);
          return (
            '<button class="food-opt' + sel + (empty ? ' empty' : '') + '" data-food="' + k + '">' +
            '<span class="food-dot food-' + k + '"></span>' +
            '<span class="food-name">' + types[k].name + '<small>' + (empty ? '到商店買' : esc(types[k].desc)) + '</small></span>' +
            '<span class="food-count">' + n + '</span></button>'
          );
        })
        .join('');
    const lbl = document.querySelector('#dock [data-act="feed"] .lbl');
    if (lbl) lbl.textContent = Game.foodType === 'plankton' ? '餵食' : types[Game.foodType].name;
    const btn = document.querySelector('#dock [data-act="feed"]');
    if (btn) btn.classList.toggle('accent', Game.foodType !== 'plankton');
  };

  /* ================= 抽屜 ================= */

  UI.openSheet = (kind, arg, opts = {}) => {
    const R = RENDER[kind];
    if (!R) return;
    UI.callout.close();
    UI.cardLive = null;
    UI.bound = null;
    UI.sheetKind = kind;
    UI.sheetArg = arg;
    UI.sheetBackTo = opts.back || R.back || null;
    UI.el.sheetBack.hidden = !UI.sheetBackTo;
    const body = UI.el.sheetBody;
    body.scrollTop = 0;
    const title = R(body, arg);
    UI.el.sheetTitle.textContent = title;
    const sh = UI.el.sheet;
    if (!sh.classList.contains('open')) {
      sh.classList.add('open');
      A.open();
    }
    sh.setAttribute('aria-label', title);
  };

  UI.closeSheet = () => {
    UI.sheetKind = null;
    if (!UI.callout.open) {
      UI.cardLive = null;
      UI.bound = null;
    }
    UI.el.sheet.classList.remove('open');
  };

  UI.rerender = () => {
    if (UI.sheetKind) {
      const top = UI.el.sheetBody.scrollTop;
      UI.openSheet(UI.sheetKind, UI.sheetArg, { back: UI.sheetBackTo });
      UI.el.sheetBody.scrollTop = top;
    }
  };

  /** 點水母：牠旁邊出現說明牌（callout.js） */
  UI.openJelly = (j) => {
    UI.callout.show(j);
    Game.tut('card');
  };

  /** 每 0.4 秒更新說明牌（或抽屜）裡會變動的數字 */
  UI.refreshBound = () => {
    const b = UI.bound;
    if (b && b.jelly) {
      const j = b.jelly;
      if (!Game.jellies.includes(j) || j.leaving) {
        if (b.co) UI.callout.close();
        else UI.closeSheet();
        return;
      }
      const set = (k, v) => {
        const el = b.els[k];
        if (el) el.style.width = Math.round(U.clamp(v, 0, 1) * 100) + '%';
      };
      set('fullness', j.fullness);
      set('happy', j.happy);
      set('growth', j.growth);
      if (b.els.affection) b.els.affection.textContent = Math.floor(j.affection);
      if (b.els.stage) b.els.stage.textContent = j.stage;
      if (b.els.breedNote) {
        const br = Game.breedable(j);
        const txt = br.ok ? '可以找伴侶了。' : '還不能找伴侶：' + br.reason + '。';
        if (b.els.breedNote.textContent !== txt) b.els.breedNote.textContent = txt;
        if (b.els.mateBtn) b.els.mateBtn.disabled = !br.ok;
      }
      if (b.wasAdult !== j.adult || b.visitor !== j.visitor) {
        if (b.co) UI.callout.refresh();
        else UI.rerender();
        return;
      }
    }
    if (UI.sheetKind === 'shop' || UI.sheetKind === 'mate') {
      const light = Game.state.light;
      UI.el.sheetBody.querySelectorAll('[data-price]').forEach((btn) => {
        if (btn.dataset.lock) return;
        btn.disabled = light < +btn.dataset.price;
      });
      const cap = $('capLine');
      if (cap) cap.textContent = Game.residentCount() + ' / ' + Game.capacity();
    }
    if (UI.sheetKind === 'roster') {
      UI.el.sheetBody.querySelectorAll('[data-remaining]').forEach((el) => {
        const p = Game.polyps.find((q) => q.id === el.dataset.remaining);
        if (p) el.textContent = '約 ' + U.duration(p.remaining) + '後孵化';
      });
    }
  };

  const portraitCache = new Map();
  UI.portrait = (genes, growth = 1, size = 96) => {
    const key = genes.seed + '|' + genes.hue.toFixed(0) + genes.shape + genes.pattern + (genes.special || '') + '|' + growth.toFixed(2) + '|' + size;
    let url = portraitCache.get(key);
    if (url) return url;
    const c = document.createElement('canvas');
    MJ.Jelly.portrait(c, genes, growth, size);
    try {
      url = c.toDataURL();
    } catch (e) {
      url = '';
    }
    portraitCache.set(key, url);
    return url;
  };
  const portraitImg = (genes, growth, size, cls = 'portrait') =>
    '<img class="' + cls + '" src="' + UI.portrait(genes, growth, size) + '" width="' + size + '" height="' + size + '" alt="">';

  const traitChips = (g) => {
    const d = Gn.describe(g);
    let html = '<span class="chip"><i class="sw" style="background:' + colorCss(g) + '"></i>' + d.colorName + '</span>';
    html += '<span class="chip">' + d.shapeName + '</span>';
    html += '<span class="chip">' + d.patternName + '</span>';
    if (d.specialName) html += '<span class="chip special">' + d.specialName + '</span>';
    return html;
  };

  const RENDER = {};
  UI.RENDER = RENDER;

  /* ================= 對話框 ================= */

  UI.modalQueue = [];
  UI.showModal = (render, opts = {}) => {
    // 同一時間只開一個；正在陪心情的時候，其他視窗（例如孵化）等儀式結束再說
    if (UI.modalOpenNow || (MJ.Ritual && MJ.Ritual.open)) {
      UI.modalQueue.push([render, opts]);
      return;
    }
    UI.modalOpenNow = true;
    UI.modalDismiss = opts.dismissible !== false;
    UI.modalOnClose = opts.onClose || null;
    const card = UI.el.modalCard;
    card.className = 'modal-card ' + (opts.cls || '');
    card.innerHTML = '';
    render(card, UI.closeModal);
    UI.el.modal.hidden = false;
    requestAnimationFrame(() => UI.el.modal.classList.add('open'));
    const f = card.querySelector('[autofocus], textarea, input, .btn');
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 60);
  };

  /** 儀式關上之後，把排隊的視窗叫出來 */
  UI.pumpModals = () => {
    if (UI.modalOpenNow || (MJ.Ritual && MJ.Ritual.open)) return;
    const next = UI.modalQueue.shift();
    if (next) UI.showModal(next[0], next[1]);
  };

  UI.closeModal = () => {
    if (!UI.modalOpenNow) return;
    const cb = UI.modalOnClose;
    UI.modalOnClose = null;
    UI.el.modal.classList.remove('open');
    setTimeout(() => {
      UI.el.modal.hidden = true;
      UI.modalOpenNow = false;
      if (cb) cb();
      const next = UI.modalQueue.shift();
      if (next) UI.showModal(next[0], next[1]);
    }, 280);
  };

  /** 專線：從「更多」打開。和儀式裡的危機畫面是同一個元件 */
  UI.careModal = () => {
    UI.showModal(
      (card, close) => {
        card.innerHTML = MJ.Feelings.careHTML('menu') + '<div class="care-actions"><button class="btn ghost" data-r="ok">關上</button></div>';
        card.querySelector('[data-r="ok"]').addEventListener('click', () => close());
      },
      { cls: 'care-card' }
    );
  };

  UI.confirm = (o) =>
    new Promise((resolve) => {
      let answered = false;
      UI.showModal(
        (card, close) => {
          card.innerHTML =
            (o.img ? '<img class="portrait md" src="' + o.img + '" alt="">' : '') +
            '<h2 class="m-title">' + esc(o.title) + '</h2>' +
            (o.text ? '<p class="m-text">' + esc(o.text) + '</p>' : '') +
            '<div class="btn-row center"><button class="btn ghost" data-r="0">' + esc(o.cancel || '取消') + '</button><button class="btn' + (o.danger ? ' danger' : '') + '" data-r="1">' + esc(o.ok || '確定') + '</button></div>';
          card.querySelectorAll('[data-r]').forEach((b) =>
            b.addEventListener('click', () => {
              answered = true;
              resolve(b.dataset.r === '1');
              close();
            })
          );
        },
        { onClose: () => !answered && resolve(false) }
      );
    });

  UI.prompt = (o) =>
    new Promise((resolve) => {
      let answered = false;
      UI.showModal(
        (card, close) => {
          card.innerHTML =
            '<h2 class="m-title">' + esc(o.title) + '</h2>' +
            '<form class="m-form" id="promptForm"><input id="promptInput" class="field" maxlength="' + (o.max || 20) + '" value="' + esc(o.value || '') + '" aria-label="' + esc(o.title) + '" autocomplete="off">' +
            '<div class="btn-row center"><button type="button" class="btn ghost" data-r="0">取消</button><button type="submit" class="btn">好</button></div></form>';
          const input = card.querySelector('#promptInput');
          setTimeout(() => input.select(), 80);
          card.querySelector('[data-r="0"]').addEventListener('click', () => close());
          card.querySelector('#promptForm').addEventListener('submit', (e) => {
            e.preventDefault();
            answered = true;
            resolve(input.value.trim() || null);
            close();
          });
        },
        { onClose: () => !answered && resolve(null) }
      );
    });

  UI.photoResult = (url) => {
    UI.showModal(
      (card, close) => {
        let html = '<h2 class="m-title">拍好了</h2>';
        if (url) {
          html += '<img class="photo" src="' + url + '" alt="水族箱的照片">';
          html += '<p class="m-text">長按圖片（手機）或按右鍵（電腦），就能存下來。</p>';
        } else html += '<p class="m-text">這個瀏覽器沒辦法把畫面變成圖片。可以改用系統的截圖。</p>';
        html += '<div class="btn-row center">';
        if (url && (UI.downloads || !U.inFrame)) html += '<button class="btn ghost" data-r="save">存下照片</button>';
        html += '<button class="btn" data-r="ok">繼續拍</button><button class="btn ghost" data-r="done">完成</button></div>';
        card.innerHTML = html;
        const saveBtn = card.querySelector('[data-r="save"]');
        if (saveBtn) saveBtn.addEventListener('click', () => UI.savePhoto(url));
        card.querySelector('[data-r="ok"]').addEventListener('click', () => close());
        card.querySelector('[data-r="done"]').addEventListener('click', () => {
          close();
          Game.stopPhoto();
        });
      },
      { cls: 'wide' }
    );
    const f = $('flash');
    f.classList.remove('go');
    void f.offsetWidth;
    f.classList.add('go');
  };

  UI.savePhoto = async (url) => {
    const name = 'moon-jelly-' + U.today() + '.jpg';
    if (UI.downloads) {
      try {
        const [head, b64] = url.split(',');
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: head.slice(5, head.indexOf(';')) });
        await UI.downloads.save({ filename: name, data: blob });
        UI.toast('照片存好了。');
      } catch (e) {
        const code = e && e.code;
        if (code === 'declined') return;
        if (code === 'rate_limited') UI.toast('上一個存檔視窗還開著，等一下再試。');
        else UI.toast('這裡沒辦法直接存檔，長按或按右鍵圖片也可以存。');
      }
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', name);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /* ================= 模式 ================= */

  const setMode = (m) => {
    document.body.classList.remove('mode-breath', 'mode-sleep', 'mode-photo', 'mode-arrange');
    if (m) document.body.classList.add('mode-' + m);
  };

  UI.breathStart = (b) => {
    UI.closeSheet();
    UI.closePopovers();
    setMode('breath');
    $('breathUI').hidden = false;
    $('breathCycle').textContent = '第 1 / ' + b.cycles + ' 輪・' + b.pat.name;
  };
  UI.breathStep = (word, b) => {
    const w = $('breathWord');
    w.textContent = word;
    w.classList.remove('pop');
    void w.offsetWidth;
    w.classList.add('pop');
    $('breathCycle').textContent = '第 ' + (b.cycle + 1) + ' / ' + b.cycles + ' 輪・' + b.pat.name;
  };
  UI.breathFrame = (b) => {
    const ring = $('breathRing');
    ring.style.transform = 'scale(' + (0.55 + 0.45 * (1 - b.c)).toFixed(3) + ')';
    const n = Math.max(1, Math.ceil(b.dur - b.stepT));
    const el = $('breathCount');
    if (el.textContent !== String(n)) el.textContent = n;
  };
  UI.breathEnd = (done, reward) => {
    $('breathUI').hidden = true;
    setMode(null);
    if (done) UI.toast(U.pick(C.breathDone), 'soft', '+' + reward + ' 光');
  };

  UI.sleepStart = (min) => {
    UI.closePopovers();
    setMode('sleep');
    $('sleepUI').hidden = false;
    $('sleepLine').textContent = U.pick(C.sleepLines);
    $('sleepSub').textContent = '音樂會在 ' + min + ' 分鐘內慢慢變小。輕點畫面可以叫出按鈕。';
    UI.sleepTick(true);
    UI.sleepPeek();
  };
  UI.sleepTick = (force) => {
    const d = new Date();
    const t = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const el = $('sleepClock');
    if (force || el.textContent !== t) el.textContent = t;
  };
  UI.sleepPeek = () => {
    const el = $('sleepUI');
    el.classList.add('peek');
    clearTimeout(UI.peekTimer);
    UI.peekTimer = setTimeout(() => el.classList.remove('peek'), 5000);
  };
  UI.sleepEnd = () => {
    $('sleepUI').hidden = true;
    setMode(null);
    UI.toast('早安，或者晚安。水母們都在。');
  };

  UI.photoStart = () => {
    UI.closePopovers();
    setMode('photo');
    $('photoUI').hidden = false;
  };
  UI.photoEnd = () => {
    $('photoUI').hidden = true;
    setMode(null);
  };

  UI.arrangeUI = (on) => {
    setMode(on ? 'arrange' : null);
    $('arrangeBar').hidden = !on;
  };

  /* ================= 心情長出來的生態 ================= */

  const SPECIES_ICON = { larva: 'larva', jelly: 'allow', crab: 'reframe', lantern: 'need', clown: 'kind', turtle: 'step', seahorse: 'ground', tears: 'release', coral: 'savor', bottle: 'keep', oyster: 'pearl', octopus: 'octo' };
  const SPECIES_HUE = { larva: 200, jelly: 222, crab: 30, lantern: 268, clown: 340, turtle: 100, seahorse: 300, tears: 186, coral: 48, bottle: 160, oyster: 45, octopus: 15 };
  const KIND_SPECIES = { larva: 'larva', crab: 'crab', shell: 'crab', lantern: 'lantern', clown: 'clown', anemone: 'clown', turtle: 'turtle', seahorse: 'seahorse', coral: 'coral', oyster: 'oyster', octopus: 'octopus', bottle: 'bottle' };
  const timeStr = (ts) => {
    const d = new Date(ts);
    return d.getMonth() + 1 + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };
  const famChip = (f) => {
    const fam = F.FAMILIES[f];
    return fam ? '<span class="chip"><i class="sw" style="background:hsl(' + fam.hue + ',' + Math.round(Math.max(0.3, fam.sat) * 100) + '%,65%)"></i>' + fam.name + '</span>' : '';
  };
  const turnChip = (t, extra = '') => '<span class="chip turn-chip" style="--h:' + F.TURNS[t].hue + '"><i class="sw"></i>' + F.TURNS[t].name + extra + '</span>';


  // 給其他介面檔案共用的小工具（ui-sheets.js、ui-paper.js、ui-eco.js）
  UI.h = { U, Gn, C, A, F, esc, icon, $, noteName, dateStr, starsHTML, colorCss, portraitImg, traitChips, timeStr, famChip, turnChip, SPECIES_ICON, SPECIES_HUE, KIND_SPECIES };
  const initHooks = [];
  UI.onInit = (fn) => initHooks.push(fn);

  MJ.UI = UI;
})((window.MJ = window.MJ || {}));
