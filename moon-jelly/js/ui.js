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
    UI.updateFood();
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
    Game.selectedId = kind === 'jelly' && arg ? arg.id : null;
  };

  UI.closeSheet = () => {
    UI.sheetKind = null;
    UI.cardLive = null;
    UI.bound = null;
    Game.selectedId = null;
    UI.el.sheet.classList.remove('open');
  };

  UI.rerender = () => {
    if (UI.sheetKind) {
      const top = UI.el.sheetBody.scrollTop;
      UI.openSheet(UI.sheetKind, UI.sheetArg, { back: UI.sheetBackTo });
      UI.el.sheetBody.scrollTop = top;
    }
  };

  UI.openJelly = (j) => {
    UI.openSheet('jelly', j);
    Game.tut('card');
  };

  /** 每 0.4 秒更新抽屜裡會變動的數字 */
  UI.refreshBound = () => {
    const b = UI.bound;
    if (b && b.jelly) {
      const j = b.jelly;
      if (!Game.jellies.includes(j) || j.leaving) {
        UI.closeSheet();
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
        UI.rerender();
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

  /* ---------- 水母名片 ---------- */
  RENDER.jelly = (body, j) => {
    const g = j.genes;
    const d = Gn.describe(g);
    const size = 168;
    const visitor = j.visitor;
    let html = '<div class="card-hero">';
    html += '<canvas class="card-portrait" id="cardCanvas" width="' + size + '" height="' + size + '" aria-label="' + esc(j.name) + '的樣子"></canvas>';
    html += '<div class="card-id">' + starsHTML(d.stars) + '<div class="rarity">' + d.rarity + '・<span data-bind="stage">' + j.stage + '</span></div>';
    html += '<div class="chips">' + traitChips(g) + '</div></div></div>';

    if (visitor) {
      const left = Math.max(0, (j.leaveAt || 0) - Game.t);
      html += '<p class="lede">從外面的海游進來參觀的野生水母。大約 ' + U.duration(left) + '後就會離開。</p>';
      const full = Game.residentCount() >= Game.capacity();
      html += '<div class="actions"><button class="btn" data-a="adopt"' + (full ? ' disabled' : '') + '>邀請牠住下來</button></div>';
      if (full) html += '<p class="note">水族箱滿了。升級水族箱，或讓一隻水母回到大海，就能留下牠。</p>';
    } else {
      html += '<div class="meters">';
      html += '<div class="meter"><span>飽足</span><div class="bar"><i data-bind="fullness"></i></div></div>';
      html += '<div class="meter"><span>心情</span><div class="bar bar-happy"><i data-bind="happy"></i></div></div>';
      if (!j.adult) html += '<div class="meter"><span>成長</span><div class="bar bar-grow"><i data-bind="growth"></i></div></div>';
      html += '</div>';
      html += '<dl class="facts">';
      html += '<div><dt>親密度</dt><dd><span data-bind="affection">' + Math.floor(j.affection) + '</span></dd></div>';
      html += '<div><dt>吃掉的心情</dt><dd>' + j.worryFed + ' 份</dd></div>';
      html += '<div><dt>牠的音</dt><dd>' + noteName(g) + '</dd></div>';
      html += '<div><dt>觸手</dt><dd>' + g.tentacles + ' 條</dd></div>';
      html += '<div><dt>來到這裡</dt><dd>' + dateStr(j.born) + '</dd></div>';
      if (j.origin) html += '<div><dt>來自</dt><dd>' + dateStr(j.origin.t) + ' 的「' + esc(j.origin.word) + '」</dd></div>';
      else html += '<div><dt>父母</dt><dd>' + (j.parents ? esc(j.parents.join(' × ')) : '來自大海') + '</dd></div>';
      html += '</dl>';
      const br = Game.breedable(j);
      html += '<div class="actions">';
      html += '<button class="btn" data-a="pet">' + icon('heart') + '摸摸</button>';
      html += '<button class="btn" data-a="mate" data-bind="mateBtn"' + (br.ok ? '' : ' disabled') + '>找伴侶</button>';
      html += '<button class="btn ghost" data-a="rename">改名</button>';
      html += '<button class="btn ghost quiet" data-a="release">回到大海</button>';
      html += '</div>';
      html += '<p class="note" data-bind="breedNote"></p>';
      if (j.origin) html += '<p class="note">由心情變成的水母不佔水族箱的名額，也不替你賺光。牠只是陪著。</p>';
    }
    body.innerHTML = html;

    const canvas = $('cardCanvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const env = MJ.Jelly.portraitEnv(g, size);
    env.world.theme = { glow: 1 };
    const pj = MJ.Jelly.posed(g, j.growth, env);
    for (let i = 0; i < 40; i++) pj.animate(1 / 30, env);
    UI.cardLive = { jelly: pj, env, canvas, ctx: canvas.getContext('2d'), dpr, size };

    const els = {};
    body.querySelectorAll('[data-bind]').forEach((el) => (els[el.dataset.bind] = el));
    UI.bound = { jelly: j, els, wasAdult: j.adult, visitor: j.visitor };
    UI.refreshBound();

    body.querySelector('.actions').addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-a]');
      if (!b) return;
      const a = b.dataset.a;
      if (a === 'pet') Game.petButton(j.id);
      else if (a === 'adopt') {
        Game.adoptVisitor(j.id);
        UI.openSheet('jelly', j);
      } else if (a === 'mate') UI.openSheet('mate', j, { back: null });
      else if (a === 'rename') {
        const name = await UI.prompt({ title: '幫牠取個新名字', value: j.name, max: 12 });
        if (name) {
          Game.rename(j.id, name);
          UI.openSheet('jelly', j);
        }
      } else if (a === 'release') {
        const ok = await UI.confirm({
          title: '要讓「' + j.name + '」回到大海嗎？',
          text: '牠會慢慢游向海面，回到外面的海。名字會留在名冊的「回到大海的孩子」裡。',
          img: UI.portrait(g, j.growth, 120),
          ok: '讓牠回去',
          cancel: '再想想',
        });
        if (ok) {
          UI.closeSheet();
          Game.release(j.id);
        }
      }
    });
    return visitor ? '野生的訪客' : j.name;
  };

  /* ---------- 找伴侶 ---------- */
  RENDER.mate = (body, j) => {
    const list = Game.partnersFor(j);
    let html = '<div class="mate-self">' + portraitImg(j.genes, 1, 64, 'portrait sm') + '<p class="lede">成年、吃飽、沒有在休息的水母，才能一起孕育新的水螅體。孩子會混合兩邊的樣子，偶爾也會出現誰都沒見過的特徵。</p></div>';
    if (!list.length) {
      html += '<div class="empty">現在沒有可以配對的對象。<br>餵大家吃點東西，或等小水母長大吧。</div>';
    } else {
      html += '<ul class="rows">';
      for (const k of list) {
        const feel = Game.feeling(j, k);
        const d = Gn.describe(k.genes);
        html += '<li class="row">' + portraitImg(k.genes, k.growth, 60, 'portrait sm');
        html += '<div class="row-main"><div class="row-title">' + esc(k.name) + ' ' + starsHTML(d.stars) + '</div>';
        html += '<div class="row-sub">' + d.colorName + '・' + d.shapeName + '・' + d.patternName + (d.specialName ? '・' + d.specialName : '') + '</div>';
        if (feel) html += '<div class="row-feel">有一種特別的預感</div>';
        html += '</div><button class="btn sm" data-mate="' + k.id + '">就是牠</button></li>';
      }
      html += '</ul>';
    }
    body.innerHTML = html;
    body.querySelectorAll('[data-mate]').forEach((b) =>
      b.addEventListener('click', () => {
        if (Game.startMate(j.id, b.dataset.mate)) UI.closeSheet();
      })
    );
    return '幫「' + j.name + '」找伴侶';
  };

  /* ---------- 圖鑑 ---------- */
  const SAMPLE = (over) =>
    Object.assign(
      { hue: 196, hue2: 176, sat: 0.55, shape: 'dome', size: 1, tentacles: 8, tentLen: 0.9, arms: 2, armLen: 0.7, pattern: 'plain', glow: 0.75, pulse: 1, special: null, seed: 424242 },
      over
    );

  RENDER.codex = (body, tab) => {
    tab = tab || UI.codexTab || 'color';
    UI.codexTab = tab;
    const s = Game.state;
    const found = Object.keys(s.codex).length;
    const total = Gn.codexTotal();
    const tabs = [
      ['color', '顏色', Gn.COLORS.length, 'color:'],
      ['shape', '傘形', Gn.SHAPE_IDS.length, 'shape:'],
      ['pattern', '花紋', Gn.PATTERN_IDS.length, 'pattern:'],
      ['special', '體質', Gn.SPECIAL_IDS.length, 'special:'],
      ['eco', '生態', F.SPECIES_IDS.length, 'eco'],
      ['life', '一生', 0, ''],
    ];
    const count = (prefix) => (prefix === 'eco' ? Object.keys(s.eco.species).length : Object.keys(s.codex).filter((k) => k.startsWith(prefix)).length);
    let html = '<div class="progress-head"><div><strong>' + found + '</strong> / ' + total + ' 項已發現</div><div class="bar"><i style="width:' + Math.round((found / total) * 100) + '%"></i></div></div>';
    html += '<div class="tabs" role="tablist">';
    for (const [id, name, n, prefix] of tabs) {
      html += '<button role="tab" class="tab' + (id === tab ? ' on' : '') + '" aria-selected="' + (id === tab) + '" data-tab="' + id + '">' + name + (n ? '<small>' + count(prefix) + '/' + n + '</small>' : '') + '</button>';
    }
    html += '</div>';

    if (tab === 'color') {
      html += '<div class="swatches">';
      for (const c of Gn.COLORS) {
        const got = s.codex['color:' + c.id];
        const bg = c.pale ? 'radial-gradient(circle at 40% 35%, #fff, hsl(200,20%,78%))' : 'radial-gradient(circle at 40% 35%, hsl(' + c.hue + ',85%,86%), hsl(' + c.hue + ',70%,56%))';
        html += '<div class="swatch' + (got ? '' : ' locked') + '"><span class="orb" style="' + (got ? 'background:' + bg : '') + '"></span>';
        html += '<b>' + (got ? c.name : '？？') + '</b><small>' + (got ? c.desc : '還沒遇見這個顏色') + '</small></div>';
      }
      html += '</div>';
    } else if (tab === 'shape' || tab === 'pattern' || tab === 'special') {
      const defs = tab === 'shape' ? Gn.SHAPES : tab === 'pattern' ? Gn.PATTERNS : Gn.SPECIALS;
      const ids = Object.keys(defs);
      html += '<ul class="rows codex-rows">';
      for (const id of ids) {
        const def = defs[id];
        const got = s.codex[tab + ':' + id];
        const genes =
          tab === 'shape'
            ? SAMPLE({ shape: id })
            : tab === 'pattern'
            ? SAMPLE({ pattern: id, hue: 330, hue2: 45, sat: 0.6 })
            : SAMPLE({ special: id, hue: id === 'golden' ? 46 : 260, hue2: 190, sat: id === 'ghost' ? 0.12 : 0.65, pattern: 'clover' });
        html += '<li class="row' + (got ? '' : ' locked') + '">';
        html += got ? portraitImg(genes, 1, 64, 'portrait sm') : '<span class="portrait sm unknown" aria-hidden="true">？</span>';
        html += '<div class="row-main"><div class="row-title">' + (got ? def.name : '？？？') + '</div>';
        if (got) html += '<div class="row-sub">' + def.desc + '</div>';
        else html += '<div class="row-sub clue">' + (def.hint ? '提示：' + def.hint : '還沒遇見。多養幾隻、多配幾對看看。') + '</div>';
        html += '</div></li>';
      }
      html += '</ul>';
    } else if (tab === 'eco') {
      html += UI.ecoCodex();
    } else {
      html += '<ol class="life">';
      const stages = [
        ['水螅體', '像一朵小小的海葵，黏在海底。這是水母的童年。'],
        ['橫裂體', '身體一節一節分開，疊成一串小碟子。'],
        ['碟狀幼體', '最上面的碟子脫離出發，看起來像八角星。'],
        ['水母體', '傘慢慢長圓，就是我們熟悉的水母了。'],
      ];
      for (const [n, d] of stages) html += '<li><b>' + n + '</b><span>' + d + '</span></li>';
      html += '</ol><h3 class="sub-h">水母小知識</h3><ul class="facts-list">';
      for (const f of C.facts) html += '<li>' + esc(f) + '</li>';
      html += '</ul>';
    }
    body.innerHTML = html;
    body.querySelectorAll('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        A.click();
        UI.openSheet('codex', b.dataset.tab);
      })
    );
    return '水母圖鑑';
  };

  /* ---------- 商店 ---------- */
  const priceBtn = (price, label, extra = '') =>
    '<button class="btn sm price" data-price="' + price + '"' + extra + '>' + '<span class="light-dot sm"></span>' + U.fmt(price) + (label ? '<span class="price-lbl">' + label + '</span>' : '') + '</button>';

  const habitatRow = (k, have) => {
    const def = MJ.Decor.DEFS[k];
    const n = Game.decorCount(k);
    const locked = def.needsPearl && !Game.eco.pearls().length;
    let html = '<li class="row"><canvas class="thumb" data-decor="' + k + '" width="72" height="72" aria-hidden="true"></canvas><div class="row-main"><div class="row-title">' + def.name + '</div>';
    html += '<div class="row-sub">' + def.desc + '</div>' + (have ? '<div class="row-sub clue">' + esc(have) + '</div>' : '') + '</div>';
    if (n >= def.max) html += '<button class="btn sm" disabled data-lock="1">已擁有</button>';
    else if (locked) html += '<button class="btn sm" disabled data-lock="1">還沒有珍珠</button>';
    else html += priceBtn(def.price, '', ' data-buy="decor" data-id="' + k + '"');
    return html + '</li>';
  };

  RENDER.shop = (body, tab) => {
    tab = tab || UI.shopTab || 'jelly';
    UI.shopTab = tab;
    const s = Game.state;
    const tabs = [
      ['jelly', '水母'],
      ['habitat', '棲地'],
      ['decor', '裝飾'],
      ['food', '零食'],
      ['theme', '主題'],
    ];
    let html = '<div class="wallet"><span class="light-dot"></span><span>' + U.fmt(s.light) + ' 光</span><span class="wallet-sub">水母們每小時大約發出 ' + U.fmt(Game.rate * 3600) + ' 光</span></div>';
    html += '<div class="tabs" role="tablist">';
    for (const [id, name] of tabs) html += '<button role="tab" class="tab' + (id === tab ? ' on' : '') + '" aria-selected="' + (id === tab) + '" data-tab="' + id + '">' + name + '</button>';
    html += '</div>';

    if (tab === 'jelly') {
      const full = Game.residentCount() >= Game.capacity();
      html += '<ul class="rows shop-rows">';
      html += '<li class="row"><span class="thumb net" aria-hidden="true">' + icon('jelly', 'i big') + '</span><div class="row-main"><div class="row-title">撈一隻野生水母</div>';
      html += '<div class="row-sub">從外面的海撈一隻來。長什麼樣子，撈起來才知道。每撈一次會貴一點點。</div></div>';
      html += full ? '<button class="btn sm" disabled data-lock="1">滿了</button>' : priceBtn(Game.catchCost(), '', ' data-buy="catch"');
      html += '</li>';
      const next = Game.TANK_PRICE[s.tank];
      html += '<li class="row"><span class="thumb tank" aria-hidden="true"><b id="capLine">' + Game.residentCount() + ' / ' + Game.capacity() + '</b></span><div class="row-main"><div class="row-title">升級水族箱</div>';
      html += '<div class="row-sub">' + (next != null ? '可以住的水母（含水螅體）從 ' + Game.capacity() + ' 隻變成 ' + Game.TANK[s.tank + 1] + ' 隻。' : '已經是最大的水族箱了。') + '</div></div>';
      html += next != null ? priceBtn(next, '', ' data-buy="tank"') : '<button class="btn sm" disabled data-lock="1">最大</button>';
      html += '</li></ul>';
    } else if (tab === 'food') {
      html += '<ul class="rows shop-rows">';
      for (const k of ['star', 'dew']) {
        const t = MJ.Food.TYPES[k];
        const item = Game.SHOP_FOOD[k];
        html += '<li class="row"><span class="thumb"><span class="food-dot big food-' + k + '"></span></span><div class="row-main"><div class="row-title">' + t.name + ' ×' + item.qty + '</div>';
        html += '<div class="row-sub">' + t.desc + '　現在有 ' + (s.inventory[k] || 0) + ' 份。</div></div>';
        html += priceBtn(item.price, '', ' data-buy="food" data-id="' + k + '"') + '</li>';
      }
      html += '</ul><p class="note">買好之後，按下方的「餵食」切換要撒的東西。</p>';
    } else if (tab === 'decor') {
      if (s.decor.length) html += '<button class="btn ghost wide" data-arrange="1">' + icon('arrange') + '調整擺設的位置</button>';
      html += '<ul class="rows shop-rows">';
      for (const [k, def] of Object.entries(MJ.Decor.DEFS)) {
        if (def.hab) continue;
        const n = Game.decorCount(k);
        html += '<li class="row"><canvas class="thumb" data-decor="' + k + '" width="72" height="72" aria-hidden="true"></canvas><div class="row-main"><div class="row-title">' + def.name + (def.max > 1 ? '<small>' + n + '/' + def.max + '</small>' : '') + '</div>';
        html += '<div class="row-sub">' + def.desc + '</div></div>';
        html += n >= def.max ? '<button class="btn sm" disabled data-lock="1">' + (def.max > 1 ? '已滿' : '已擁有') + '</button>' : priceBtn(def.price, '', ' data-buy="decor" data-id="' + k + '"');
        html += '</li>';
      }
      html += '</ul>';
    } else if (tab === 'habitat') {
      // 棲地只改變生物待在哪裡；生物本身、陪法、潮汐圖，永遠不用光換
      html += '<p class="lede">棲地不會變出生物，生物只從你的心情長出來。棲地會改變牠們待的地方，讓牠們之間多一點關係。</p>';
      const E = Game.eco;
      const have = {
        seagrass: E.seahorses.length ? '現在有 ' + E.seahorses.length + ' 隻海馬。' : '還沒有海馬：用「先著陸」陪過一次心情，就會有。',
        cave: E.crabs.length || E.lanterns.length ? '現在有 ' + E.crabs.length + ' 隻寄居蟹、' + E.lanterns.length + ' 條燈籠魚。' : '寄居蟹來自「換個殼看看」，燈籠魚來自「聽聽它要什麼」。',
        moonstone: E.lanterns.length ? '現在有 ' + E.lanterns.length + ' 條燈籠魚。' : '燈籠魚來自「聽聽它要什麼」。',
        pearlbox: E.pearls().length ? '你有 ' + E.pearls().length + ' 顆珍珠。' : '還沒有珍珠。',
      };
      html += '<ul class="rows shop-rows">';
      for (const k of ['seagrass', 'cave', 'moonstone']) html += habitatRow(k, have[k]);
      const shellToday = s.eco.shellDay === U.today();
      html += '<li class="row"><canvas class="thumb" data-shell="nautilus" width="72" height="72" aria-hidden="true"></canvas><div class="row-main"><div class="row-title">一個空殼</div>';
      html += '<div class="row-sub">放在沙地上。最大的寄居蟹會搬進去，舊殼一路讓給小一號的。一天可以放一個。</div><div class="row-sub clue">' + (E.crabs.length ? '現在有 ' + E.crabs.length + ' 隻寄居蟹。' : '還沒有寄居蟹：殼會先在沙地上等。') + '</div></div>';
      html += shellToday ? '<button class="btn sm" disabled data-lock="1">明天再來</button>' : priceBtn(Game.SHELL_PRICE, '', ' data-buy="shell"');
      html += '</li>';
      html += habitatRow('pearlbox', have.pearlbox);
      html += '</ul>';
    } else if (tab === 'theme') {
      html += '<ul class="theme-grid">';
      for (const [k, th] of Object.entries(MJ.World.THEMES)) {
        const owned = s.themes.includes(k);
        const using = s.theme === k;
        const bg = 'linear-gradient(180deg,' + th.grad.join(',') + ')';
        html += '<li class="theme-card' + (using ? ' using' : '') + '"><span class="theme-sw" style="background:' + bg + '"><i style="background:' + th.sand[0] + '"></i></span>';
        html += '<div class="theme-name">' + th.name + '</div><div class="theme-desc">' + th.desc + '</div>';
        if (using) html += '<button class="btn sm ghost" disabled data-lock="1">使用中</button>';
        else if (owned) html += '<button class="btn sm ghost" data-buy="theme" data-id="' + k + '">換上</button>';
        else html += priceBtn(th.price, '', ' data-buy="theme" data-id="' + k + '"');
        html += '</li>';
      }
      html += '</ul>';
    }
    body.innerHTML = html;

    body.querySelectorAll('canvas[data-decor]').forEach((c) => UI.drawDecorThumb(c, c.dataset.decor));
    body.querySelectorAll('canvas[data-shell]').forEach((c) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = 72 * dpr;
      c.height = 72 * dpr;
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.translate(36, 38);
      g.scale(2.2, 2.2);
      MJ.Eco.drawShell(g, c.dataset.shell, 1, 1);
    });
    body.querySelectorAll('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        A.click();
        UI.openSheet('shop', b.dataset.tab);
      })
    );
    const arr = body.querySelector('[data-arrange]');
    if (arr)
      arr.addEventListener('click', () => {
        UI.closeSheet();
        Game.arrange(true);
      });
    body.querySelectorAll('[data-buy]').forEach((b) =>
      b.addEventListener('click', () => {
        const kind = b.dataset.buy;
        const id = b.dataset.id;
        if (kind === 'catch') {
          UI.closeSheet();
          Game.catchWild();
          return;
        }
        if (kind === 'tank') Game.upgradeTank();
        else if (kind === 'shell') Game.buyShell();
        else if (kind === 'food') Game.buyFood(id);
        else if (kind === 'decor') Game.buyDecor(id);
        else if (kind === 'theme') Game.buyTheme(id);
        UI.rerender();
      })
    );
    UI.refreshBound();
    return '貝殼商店';
  };

  UI.drawDecorThumb = (canvas, type) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = 72;
    canvas.width = S * dpr;
    canvas.height = S * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const def = MJ.Decor.DEFS[type];
    const unit = Math.min(60 / def.w, 56 / def.h);
    const world = {
      W: S,
      H: S,
      unit,
      dim: 0,
      current: 0,
      theme: Game.world.theme,
      sandY: () => S - 14,
      addBubble: () => null,
    };
    ctx.fillStyle = Game.world.theme.sand[0];
    ctx.fillRect(0, S - 12, S, 12);
    MJ.Decor.draw(ctx, MJ.Decor.create(type, 0.5), world, 1.2, false);
  };

  /* ---------- 呼吸設定 ---------- */
  RENDER.breath = (body) => {
    const sel = UI.breathSel || { id: 'relax', cycles: 5 };
    UI.breathSel = sel;
    let html = '<p class="lede">水母們會跟著你一起呼吸。吸氣的時候，傘會慢慢張開；吐氣的時候，輕輕收起來往上游。</p>';
    html += '<div class="choice-list" role="radiogroup" aria-label="呼吸節奏">';
    for (const [id, b] of Object.entries(Game.BREATHS)) {
      html += '<button role="radio" aria-checked="' + (sel.id === id) + '" class="choice' + (sel.id === id ? ' on' : '') + '" data-id="' + id + '"><b>' + b.name + '<span class="mono">' + b.label + '</span></b><small>' + b.desc + '</small></button>';
    }
    html += '</div><div class="seg" role="radiogroup" aria-label="次數">';
    for (const n of [3, 5, 10]) html += '<button role="radio" aria-checked="' + (sel.cycles === n) + '" class="seg-btn' + (sel.cycles === n ? ' on' : '') + '" data-cycles="' + n + '">' + n + ' 輪</button>';
    html += '</div>';
    const pat = Game.BREATHS[sel.id];
    const secs = pat.seq.reduce((a, [, d]) => a + d, 0) * sel.cycles;
    html += '<button class="btn wide" id="breathGo">開始（約 ' + U.duration(secs) + '）</button>';
    const left = Game.breathLeft();
    html += '<p class="note">' + (left ? '完成後會得到 ' + Game.breathReward(sel.cycles) + ' 光（今天還有 ' + left + ' 次）。' : '今天的光已經給過了，呼吸還是一樣好。') + '做完五分鐘內出生的孩子，好像會特別不一樣。</p>';
    body.innerHTML = html;
    body.querySelectorAll('.choice').forEach((b) =>
      b.addEventListener('click', () => {
        sel.id = b.dataset.id;
        UI.rerender();
      })
    );
    body.querySelectorAll('[data-cycles]').forEach((b) =>
      b.addEventListener('click', () => {
        sel.cycles = +b.dataset.cycles;
        UI.rerender();
      })
    );
    $('breathGo').addEventListener('click', () => {
      UI.closeSheet();
      Game.startBreath(sel.id, sel.cycles);
    });
    return '和水母一起呼吸';
  };

  /* ---------- 更多 ---------- */
  RENDER.more = (body) => {
    const s = Game.state;
    const achDone = Object.keys(s.achievements).length;
    const items = [
      ['tides', 'tides', '潮汐圖', '你的心情，和它們變成了什麼'],
      ['photo', 'camera', '拍照', '把現在的水族箱拍下來'],
      ['roster', 'jelly', '水母名冊', '住在這裡的、還在長大的、回到大海的'],
      ['ach', 'trophy', '成就', achDone + ' / ' + Game.ACH.length + ' 個'],
      ['diary', 'diary', '心情日記', '連續 ' + (s.daily.streak || 0) + ' 天'],
      ['settings', 'settings', '聲音與設定', '音樂、音效、存檔'],
      ['about', 'info', '關於海月', '怎麼玩、這裡是怎麼做出來的'],
    ];
    let html = '<div class="sleep-card"><div class="sleep-head">' + icon('moon', 'i big') + '<div><b>晚安模式</b><small>畫面變暗，音樂在你選的時間內慢慢變小。</small></div></div><div class="seg">';
    for (const m of [15, 30, 60]) html += '<button class="seg-btn" data-sleep="' + m + '">' + m + ' 分鐘</button>';
    html += '</div></div><ul class="menu">';
    for (const [id, ic, name, sub] of items) {
      html += '<li><button class="menu-item" data-go="' + id + '">' + icon(ic) + '<span><b>' + name + '</b><small>' + esc(sub) + '</small></span></button></li>';
    }
    html += '</ul>';
    body.innerHTML = html;
    body.querySelectorAll('[data-sleep]').forEach((b) =>
      b.addEventListener('click', () => {
        UI.closeSheet();
        Game.startSleep(+b.dataset.sleep);
      })
    );
    body.querySelectorAll('[data-go]').forEach((b) =>
      b.addEventListener('click', () => {
        A.click();
        const id = b.dataset.go;
        if (id === 'photo') {
          UI.closeSheet();
          Game.startPhoto();
        } else UI.openSheet(id, null, { back: 'more' });
      })
    );
    return '更多';
  };

  RENDER.roster = (body) => {
    const s = Game.state;
    const res = Game.residentJellies();
    let html = '<h3 class="sub-h">住在這裡（' + res.length + ' 隻）</h3><ul class="rows">';
    for (const j of res) {
      const d = Gn.describe(j.genes);
      html += '<li class="row clickable" data-open="' + j.id + '">' + portraitImg(j.genes, j.growth, 56, 'portrait sm');
      html += '<div class="row-main"><div class="row-title">' + esc(j.name) + ' ' + starsHTML(d.stars) + '</div><div class="row-sub">' + j.stage + '・' + d.colorName + '・' + d.shapeName + (d.specialName ? '・' + d.specialName : '') + '</div></div></li>';
    }
    html += '</ul>';
    if (Game.polyps.length) {
      html += '<h3 class="sub-h">海底的水螅體</h3><ul class="rows">';
      for (const p of Game.polyps) {
        html += '<li class="row"><span class="portrait sm unknown" aria-hidden="true">' + icon('jelly') + '</span><div class="row-main"><div class="row-title">' + (p.parents ? esc(p.parents.join(' × ')) + ' 的孩子' : '從大海漂來的') + '</div><div class="row-sub" data-remaining="' + p.id + '">約 ' + U.duration(p.remaining) + '後孵化</div></div></li>';
      }
      html += '</ul>';
    }
    if (s.released.length) {
      html += '<h3 class="sub-h">回到大海的孩子</h3><ul class="rows">';
      for (const r of s.released) {
        const d = Gn.describe(r.genes);
        html += '<li class="row dim">' + portraitImg(r.genes, 1, 48, 'portrait xs') + '<div class="row-main"><div class="row-title">' + esc(r.name) + '</div><div class="row-sub">' + d.colorName + '・' + d.shapeName + '・' + dateStr(r.date) + ' 回到大海</div></div></li>';
      }
      html += '</ul>';
    }
    body.innerHTML = html;
    body.querySelectorAll('[data-open]').forEach((el) =>
      el.addEventListener('click', () => {
        const j = Game.jellies.find((k) => k.id === el.dataset.open);
        if (j) UI.openJelly(j);
      })
    );
    return '水母名冊';
  };
  RENDER.roster.back = 'more';

  RENDER.ach = (body) => {
    const s = Game.state;
    let html = '<ul class="ach-list">';
    for (const a of Game.ACH) {
      const done = s.achievements[a.id];
      html += '<li class="ach' + (done ? ' done' : '') + '">' + icon('trophy') + '<div><b>' + a.name + '</b><small>' + a.desc + '</small></div><span class="ach-r">' + (done ? dateStr(done) : a.reward ? '+' + a.reward : '紀念') + '</span></li>';
    }
    html += '</ul>';
    body.innerHTML = html;
    return '成就';
  };
  RENDER.ach.back = 'more';

  RENDER.diary = (body) => {
    const s = Game.state;
    const days = 35;
    const today = new Date();
    let html = '<p class="lede">每天來拆海的來信時選的心情，會記在這裡。</p><div class="diary">';
    const wd = ['日', '一', '二', '三', '四', '五', '六'];
    for (const w of wd) html += '<span class="dw">' + w + '</span>';
    const start = new Date(today);
    start.setDate(today.getDate() - days + 1);
    for (let i = 0; i < start.getDay(); i++) html += '<span class="dd blank"></span>';
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = U.today(d);
      const m = C.moods.find((x) => x.id === s.moods[key]);
      const isToday = i === days - 1;
      html += '<span class="dd' + (isToday ? ' today' : '') + '" title="' + key + (m ? '・' + m.name : '') + '"' + (m ? ' style="--m:' + m.color + '"' : '') + '><i></i><small>' + d.getDate() + '</small></span>';
    }
    html += '</div><div class="legend">';
    for (const m of C.moods) html += '<span><i style="background:' + m.color + '"></i>' + m.name + '</span>';
    html += '</div><dl class="facts two"><div><dt>連續</dt><dd>' + (s.daily.streak || 0) + ' 天</dd></div><div><dt>最長紀錄</dt><dd>' + (s.daily.best || 0) + ' 天</dd></div><div><dt>拆過的信</dt><dd>' + s.stats.letters + ' 封</dd></div><div><dt>記下的心情</dt><dd>' + (s.stats.rituals || 0) + ' 份</dd></div></dl>';
    body.innerHTML = html;
    return '心情日記';
  };
  RENDER.diary.back = 'more';

  RENDER.settings = (body) => {
    const st = Game.state.settings;
    const tog = (key, label, sub) =>
      '<label class="toggle"><span><b>' + label + '</b><small>' + sub + '</small></span><input type="checkbox" id="set_' + key + '" data-set="' + key + '"' + (st[key] ? ' checked' : '') + '><i aria-hidden="true"></i></label>';
    let html = '<div class="set-group">';
    html += tog('music', '背景音樂', '深海的和弦、鈴聲與水聲');
    html += tog('sing', '水母唱歌', '每隻水母脈動時，偶爾會唱出自己的音');
    html += tog('sfx', '音效', '點水、泡泡、摸摸的聲音');
    html += '<label class="range"><span><b>音量</b></span><input type="range" id="set_volume" min="0" max="1" step="0.05" value="' + st.volume + '"></label>';
    html += '</div><h3 class="sub-h">音樂的氛圍</h3><div class="seg wrap" role="radiogroup">';
    for (const [k, m] of Object.entries(A.MOODS)) {
      html += '<button role="radio" aria-checked="' + (st.mood === k) + '" class="seg-btn' + (st.mood === k ? ' on' : '') + '" data-mood="' + k + '">' + m.name + '</button>';
    }
    html += '</div><h3 class="sub-h">存檔</h3><p class="note">存檔只放在這台裝置的瀏覽器裡。想搬到別的裝置，可以複製存檔碼，再到那邊貼上。</p>';
    html += '<div class="btn-row"><button class="btn ghost sm" id="expBtn">複製存檔碼</button><button class="btn ghost sm" id="impBtn">貼上存檔碼</button><button class="btn ghost sm quiet" id="resetBtn">從頭開始</button></div>';
    html += '<div id="saveBox"></div>';
    body.innerHTML = html;

    body.querySelectorAll('[data-set]').forEach((el) =>
      el.addEventListener('change', () => {
        Game.updateSettings({ [el.dataset.set]: el.checked });
        UI.updateSound();
      })
    );
    $('set_volume').addEventListener('input', (e) => Game.updateSettings({ volume: +e.target.value, muted: false }));
    $('set_volume').addEventListener('change', () => UI.updateSound());
    body.querySelectorAll('[data-mood]').forEach((b) =>
      b.addEventListener('click', () => {
        Game.updateSettings({ mood: b.dataset.mood });
        UI.rerender();
      })
    );
    $('expBtn').addEventListener('click', () => {
      const code = Game.exportSave();
      $('saveBox').innerHTML = '<textarea id="saveCode" class="code" rows="4" readonly aria-label="存檔碼">' + esc(code) + '</textarea>';
      const ta = $('saveCode');
      ta.focus();
      ta.select();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(
          () => UI.toast('存檔碼複製好了。'),
          () => UI.toast('已經選取存檔碼，自己複製一下就好。')
        );
      } else UI.toast('已經選取存檔碼，自己複製一下就好。');
    });
    $('impBtn').addEventListener('click', () => {
      $('saveBox').innerHTML = '<textarea id="saveIn" class="code" rows="4" placeholder="把存檔碼貼在這裡" aria-label="貼上存檔碼"></textarea><button class="btn sm" id="impGo">讀取這個存檔</button>';
      $('impGo').addEventListener('click', async () => {
        const text = $('saveIn').value;
        if (!text.trim()) return;
        const ok = await UI.confirm({ title: '要讀取這個存檔嗎？', text: '現在的水族箱會被取代。', ok: '讀取', cancel: '先不要' });
        if (ok && !Game.importSave(text)) UI.toast('這段存檔碼看不懂。確認一下有沒有複製完整？');
      });
    });
    $('resetBtn').addEventListener('click', async () => {
      const ok = await UI.confirm({ title: '真的要從頭開始嗎？', text: '所有的水母、光、圖鑑和日記都會消失，沒辦法復原。', ok: '從頭開始', cancel: '不要', danger: true });
      if (ok) Game.resetAll();
    });
    return '聲音與設定';
  };
  RENDER.settings.back = null;

  RENDER.about = (body) => {
    body.innerHTML =
      '<p class="lede">海月水母館是一座只屬於你的夜光水母缸。這裡沒有輸贏，也沒有水母會死掉，餓了只是比較不亮而已。</p>' +
      '<h3 class="sub-h">可以做的事</h3><ul class="facts-list">' +
      '<li>點水撒下浮游生物；按住拖曳可以撒一整排。水面也是一把琴：越右邊，音越高。</li>' +
      '<li>按住水母輕輕滑動，就是摸摸。被愛得夠多的水母，孩子會帶著愛心。</li>' +
      '<li>按「心情」替感覺取名字，再選一種方式陪它。不同的陪法，會讓它長成不同的生物：水母、海馬、寄居蟹、燈籠魚、小丑魚、海龜、藍眼淚、珊瑚、瓶中信。</li>' +
      '<li>光很稀有。水母會慢慢發光；每天前三份心情各給 30 光，不管是什麼感覺、選了哪種陪法、還是還沒決定，都一樣。心情長出來的生物、陪法和潮汐圖，永遠不用光換。</li>' +
      '<li>商店的「棲地」不會變出生物，只會改變牠們待的地方：海馬聚在海草床、寄居蟹躲進礁石洞、燈籠魚白天待在洞的陰影裡，晚上繞著月光石。</li>' +
      '<li>兩隻長大的水母可以一起孕育水螅體，孩子會混合兩邊的樣子。</li>' +
      '<li>圖鑑有 ' + Gn.codexTotal() + ' 項，特殊體質都藏著配方，看提示慢慢找。</li>' +
      '<li>每天第一次來，會收到一封海的來信。</li></ul>' +
      '<h3 class="sub-h">這裡是怎麼做出來的</h3><p class="note">畫面裡的每一隻水母、每一根觸手、每一段音樂和每一句話，都是程式當下生成的，沒有使用任何圖片或音檔。水母的觸手用簡單的物理模擬；音樂是 D 大調五聲音階，所以怎麼點都會好聽。</p>' +
      '<h3 class="sub-h">心情的設計，參考了哪些心理學</h3><ul class="facts-list">' +
      '<li><b>替感覺取名字</b>：把感覺說出來、說得越精準，越不容易被它淹沒（情緒標記、情緒顆粒度）。</li>' +
      '<li><b>沒有唯一正確的陪法</b>：研究發現，能依情況換著用不同方法的人，比只會用一種的人過得好（情緒調節彈性）。所以每一種陪法都會長出生物，章魚只在你用過很多種時出現。</li>' +
      '<li><b>讓它待著</b>來自接納與「觀浪」；<b>先著陸</b>是 5-4-3-2-1 著陸技巧；<b>換個殼</b>來自認知重評與拉開距離；<b>聽它要什麼</b>來自情緒背後的需要；<b>對自己溫柔</b>是自我慈悲的三個部分；<b>一件小事</b>是行為活化；<b>品嚐、感謝、留給以後</b>是正向情緒的保存與回想。</li>' +
      '<li><b>陪法的順序會跟著強度變</b>：浪很大的時候，換角度想比較難做到，所以先穩住的方法會排在前面；浪小的時候，想一想的方法排在前面。每一種都一直選得到。</li>' +
      '<li><b>珍珠</b>要七層以上、用過三種陪法才會結成，它記錄的是你陪它走過的路，不是它來了幾次。一直只「倒出來」的話，會輕輕提一句：研究發現，只是發洩不一定會讓感覺變小。</li>' +
      '<li><b>前後各量一次</b>：看看浪有沒有變化。久了，潮汐圖會告訴你，對你自己來說哪一種陪法比較有用。</li>' +
      '<li><b>潮汐圖</b>只在同一種陪法用過三次以上才畫出來，也可以分開看強的時候和不那麼強的時候：浪很大時，下一次量本來就容易低一點。</li>' +
      '<li>如果真的撐不住，請打給安心專線 1925、生命線 1995、張老師 1980；遇到家暴、性侵害或兒少受傷害，可以打 113。這裡不能取代真的人。</li></ul>' +
      '<p class="note">所有資料只存在你這台裝置的瀏覽器裡。儀式一開始寫的那段話，預設不會被保存。</p>';
    return '關於海月';
  };
  RENDER.about.back = 'more';

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

  UI.welcomeModal = () => {
    UI.showModal((card, close) => {
      card.innerHTML =
        '<h2 class="m-title">歡迎來到海月水母館</h2>' +
        '<p class="m-text">這裡有三隻水母，和一個快要孵化的水螅體。從今天開始，牠們就交給你了。</p>' +
        '<ul class="how"><li><b>點水</b>撒下浮游生物</li><li><b>按住水母滑動</b>摸摸牠</li><li><b>點水母</b>看牠的名片</li><li><b>按「心情」</b>替感覺取名字，看它長成什麼生物</li></ul>' +
        '<p class="m-foot">不用急。水母們在這裡漂了很久，也會一直在這裡。</p>' +
        '<div class="btn-row center"><button class="btn ghost" data-w="feel">' + icon('heartsea') + '我現在有感覺</button><button class="btn" data-w="ok">好，我知道了</button></div>';
      card.querySelector('[data-w="ok"]').addEventListener('click', () => close());
      card.querySelector('[data-w="feel"]').addEventListener('click', () => {
        close();
        setTimeout(() => MJ.Ritual.start(), 300);
      });
    });
  };

  /** 回來的時候：離開時發生的事、該問的小事、今天的信、這週的回顧，合成一張卡 */
  UI.welcomeBack = (o) => {
    let after = null;
    UI.showModal(
      (card, close) => {
        let html = '<h2 class="m-title">歡迎回來</h2>';
        const off = o.offline;
        if (off) {
          html += '<p class="m-text">你離開了 ' + U.duration(off.sec) + '。</p><ul class="how">';
          if (off.gain > 0) html += '<li>水母們一共發了 <b>' + U.fmt(off.gain) + '</b> 光</li>';
          if (off.born.length) html += '<li><b>' + off.born.map((j) => '「' + esc(j.name) + '」').join('、') + '</b> 出生了</li>';
          if (off.grown) html += '<li>有 <b>' + off.grown + '</b> 隻小水母長大了</li>';
          html += '</ul>';
          if (off.born.length) html += '<div class="born-row">' + off.born.map((j) => portraitImg(j.genes, j.growth, 72, 'portrait sm')).join('') + '</div>';
        }
        if (o.steps.length) {
          html += '<div class="wb-steps"><div class="wb-h">' + icon('step') + '之前想做的小事，後來呢？怎麼樣都可以。</div>';
          for (const e of o.steps) {
            html += '<div class="wb-step" data-id="' + e.id + '"><b>' + esc(e.step.what) + '</b><span class="wb-btns">' +
              '<button class="btn sm ghost" data-s="dropped">不需要了</button><button class="btn sm ghost" data-s="later">還沒</button><button class="btn sm" data-s="done">做到了</button></span></div>';
          }
          html += '</div>';
        }
        html += '<div class="wb-actions">';
        if (o.letter) html += '<button class="btn" data-w="letter">' + icon('letter') + '拆今天的信</button>';
        if (o.recap) html += '<button class="btn ghost" data-w="recap">' + icon('tides') + '這一週的回顧</button>';
        html += '<button class="btn ghost" data-w="feel">' + icon('heartsea') + '我現在有感覺</button>';
        html += '</div><div class="btn-row center"><button class="btn ghost quiet" data-w="ok">先看看水母</button></div>';
        card.innerHTML = html;
        const said = { done: '做到了。海龜出發去旅行了。', later: '好，不急。', dropped: '好，先放下。' };
        card.querySelectorAll('.wb-step').forEach((row) =>
          row.querySelectorAll('[data-s]').forEach((b) =>
            b.addEventListener('click', () => {
              const st = b.dataset.s;
              row.querySelector('.wb-btns').innerHTML = '<small>' + said[st] + '</small>';
              Game.setStep(row.dataset.id, st, true);
            })
          )
        );
        card.querySelectorAll('[data-w]').forEach((b) =>
          b.addEventListener('click', () => {
            const w = b.dataset.w;
            if (w === 'letter') after = () => UI.letterModal();
            else if (w === 'recap') after = () => UI.recapModal();
            else if (w === 'feel') after = () => MJ.Ritual.start();
            close();
          })
        );
      },
      { cls: 'wide', onClose: () => after && setTimeout(after, 60) }
    );
  };

  UI.letterModal = () => {
    if (!Game.letterDue()) return;
    UI.showModal(
      (card, close) => {
        let html = '<div class="letter-seal" aria-hidden="true">' + icon('letter') + '</div><h2 class="m-title">今天的海，寄來了一封信</h2>';
        html += '<p class="m-text">拆信之前，想先問問你：今天的心情是？</p><div class="moods">';
        for (const m of C.moods) html += '<button class="mood-btn" data-mood="' + m.id + '" style="--m:' + m.color + '"><i></i><b>' + m.name + '</b><small>' + m.desc + '</small></button>';
        html += '</div>';
        card.innerHTML = html;
        card.querySelectorAll('[data-mood]').forEach((b) =>
          b.addEventListener('click', () => {
            const r = Game.claimLetter(b.dataset.mood);
            if (!r) return close();
            A.discover();
            let h = '<div class="letter"><p class="letter-reply">' + esc(r.reply) + '</p><p class="letter-main">' + esc(r.letter) + '</p><p class="letter-sign">— 海</p></div>';
            h += '<div class="fact"><span>今天的水母小知識</span>' + esc(r.fact) + '</div>';
            h += '<p class="gift"><span class="light-dot sm"></span>+' + r.reward + ' 光・' + r.gifts.join('・') + '・連續 ' + r.streak + ' 天</p>';
            h += '<div class="btn-row center"><button class="btn">收下</button></div>';
            card.innerHTML = h;
            card.querySelector('.btn').addEventListener('click', () => close());
          })
        );
      },
      { cls: 'paper', dismissible: false }
    );
  };

  UI.bottleModal = (text, reward) => {
    UI.showModal(
      (card, close) => {
        card.innerHTML =
          '<h2 class="m-title">漂流瓶裡的紙條</h2><div class="letter"><p class="letter-main">' + esc(text) + '</p></div>' +
          (reward ? '<p class="gift"><span class="light-dot sm"></span>+' + reward + ' 光</p>' : '') +
          '<div class="btn-row center"><button class="btn">收好</button></div>';
        card.querySelector('.btn').addEventListener('click', () => close());
      },
      { cls: 'paper' }
    );
  };

  const newbornCard = (title, lede, j, found) => {
    const d = Gn.describe(j.genes);
    let html = '<h2 class="m-title">' + title + '</h2><img class="portrait lg" src="' + UI.portrait(j.genes, Math.max(j.growth, 0.6), 160) + '" alt="">';
    html += '<div class="nb-name">' + esc(j.name) + '</div><div class="nb-meta">' + starsHTML(d.stars) + ' ' + d.rarity + '</div>';
    html += '<div class="chips center">' + traitChips(j.genes) + '</div>';
    if (lede) html += '<p class="m-text">' + lede + '</p>';
    if (found && found.length) html += '<p class="found">圖鑑新發現：' + found.map(Game.codexName).join('、') + '</p>';
    return html;
  };

  UI.birthModal = (j, found) => {
    UI.showModal((card, close) => {
      card.innerHTML =
        newbornCard('新生命！', (j.parents ? esc(j.parents.join(' 和 ')) + '的孩子，' : '') + '剛從水螅體脫離出發，現在還是一片小小的碟狀幼體。', j, found) +
        '<div class="btn-row center"><button class="btn ghost" data-r="rename">取別的名字</button><button class="btn" data-r="ok">歡迎你</button></div>';
      card.querySelector('[data-r="ok"]').addEventListener('click', () => close());
      card.querySelector('[data-r="rename"]').addEventListener('click', () => {
        close();
        setTimeout(async () => {
          const name = await UI.prompt({ title: '幫牠取個名字', value: j.name, max: 12 });
          if (name) Game.rename(j.id, name);
        }, 320);
      });
    });
  };

  UI.catchModal = (j, found) => {
    UI.showModal((card, close) => {
      card.innerHTML =
        newbornCard('撈到了！', '一隻從外面的海來的水母。' + (j.adult ? '已經是大人了。' : '還沒完全長大。'), j, found) +
        '<div class="btn-row center"><button class="btn">歡迎你</button></div>';
      card.querySelector('.btn').addEventListener('click', () => close());
    });
  };

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

  /** 一份心情的小卡：字、時間、浪的變化 */
  UI.entryCard = (e) => {
    const fam = F.FAMILIES[e.fam] || F.FAMILIES.calm;
    let wave = e.i0 == null ? '沒有量強度' : '浪 ' + e.i0;
    if (e.i0 != null && e.turn && e.i1 != null && e.i1 !== e.i0) wave += ' → ' + e.i1;
    let html = '<div class="entry-card" style="--h:' + fam.hue + ';--s:' + Math.round(Math.max(0.3, fam.sat) * 100) + '%">';
    html += '<div class="entry-words">' + e.words.map((w) => '「' + esc(w) + '」').join('') + '</div>';
    html += '<div class="entry-meta">' + timeStr(e.t) + '・' + wave + '</div>';
    if (e.raw) html += '<p class="entry-raw">' + esc(e.raw) + '</p>';
    html += '</div>';
    return html;
  };

  UI.ecoCodex = () => {
    const sp = Game.state.eco.species;
    let html = '<p class="lede">每一份心情一開始都是一隻幼生。你選擇怎麼陪它，決定它長成哪一種生物。牠們在海裡，彼此有關。</p>';
    html += '<ul class="rows codex-rows eco-rows">';
    for (const id of F.SPECIES_IDS) {
      const d = F.SPECIES[id];
      const got = sp[id];
      html += '<li class="row' + (got ? '' : ' locked') + '"><span class="eco-badge" style="--h:' + SPECIES_HUE[id] + '">' + icon(SPECIES_ICON[id]) + '</span>';
      html += '<div class="row-main"><div class="row-title">' + (got ? d.name : '？？？') + '<small>' + esc(d.from) + '</small></div>';
      if (got) html += '<div class="row-sub">' + esc(d.fact) + '</div><div class="row-sub link-line">' + esc(d.link) + '</div>';
      else html += '<div class="row-sub clue">從「' + esc(d.from) + '」長出來。</div>';
      html += '</div></li>';
    }
    html += '</ul>';
    html += '<h3 class="sub-h">牠們之間的關係</h3><ul class="web">';
    const rel = [
      ['藍眼淚', '餵養', '水母、珊瑚'],
      ['珊瑚礁', '收留', '雀鯛'],
      ['海葵', '保護', '小丑魚'],
      ['海龜', '帶殼給', '寄居蟹'],
      ['海草床', '聚集', '海馬'],
      ['礁石洞', '替', '寄居蟹和燈籠魚遮蔭'],
      ['月光石', '在晚上吸引', '燈籠魚'],
      ['大的寄居蟹', '把舊殼讓給', '小一號的'],
      ['同一種需要', '聚成', '一群燈籠魚'],
      ['同一種感覺', '一層層長成', '珍珠'],
      ['很多種陪法', '引來', '章魚'],
      ['瓶中信', '在難受的時候回到', '你身邊'],
    ];
    for (const [a, v, b] of rel) html += '<li><b>' + a + '</b><span class="web-v">' + v + '</span><b>' + b + '</b></li>';
    html += '</ul>';
    return html;
  };

  UI.openCreature = (c) => UI.openSheet('creature', c);

  RENDER.creature = (body, c) => {
    const kind = c.kind;
    const spId = KIND_SPECIES[kind] || 'larva';
    const sp = F.SPECIES[spId];
    let title = sp.name;
    let html = '';
    const quote = (text, label) => (text ? '<blockquote class="said"><span>' + label + '</span>' + esc(text) + '</blockquote>' : '');
    const actions = [];
    if (kind === 'larva') {
      title = '心情幼生';
      html += '<p class="lede">還沒決定怎麼陪的感覺。牠會在海裡漂一陣子，等你想好。</p>' + UI.entryCard(c.entry);
      actions.push('<button class="btn wide" data-act="resume">現在決定怎麼陪它</button>');
    } else if (kind === 'crab') {
      const e = c.entry;
      const lens = F.LENSES[e.lens] || F.LENSES.friend;
      const sh = c.shell;
      html += '<p class="lede">背著「' + (sh && sh.gift ? '海龜帶回來的殼' : lens.name) + '」。' + (sh && sh.id !== e.id ? '牠已經換過殼了。' : '') + '</p>';
      html += UI.entryCard(e) + quote(e.text, lens.ask);
    } else if (kind === 'shell') {
      title = '空著的殼';
      html += '<p class="lede">' + (c.shell.gift ? '海龜旅行回來時帶的殼。' : '某隻寄居蟹換下來的殼。') + '等哪隻寄居蟹長大了，就會搬進去。</p>';
    } else if (kind === 'lantern') {
      const n = F.NEEDS[c.need];
      const school = Game.eco.schools[c.need];
      title = '燈籠魚・' + n.name;
      html += '<p class="lede">這一群有 <b>' + (school ? school.count : 1) + '</b> 條燈籠魚，都在說「' + n.name + '」。</p>';
      html += UI.entryCard(c.entry) + quote(c.entry.text, '被照顧到一點點，會是：');
      html += '<p class="sea-q">' + esc(F.NEED_QUESTIONS[c.need]) + '</p>';
    } else if (kind === 'clown') {
      title = '小丑魚';
      html += UI.entryCard(c.entry) + quote(c.entry.text, '你對自己說');
    } else if (kind === 'anemone') {
      title = '海葵';
      html += '<p class="lede">你寫給自己的溫柔話，長成了這株海葵。住在裡面的小丑魚，是被它保護著的感覺。</p>';
      for (const e of c.entries) html += quote(e.text, dateStr(e.t) + '・「' + e.words[0] + '」的時候');
    } else if (kind === 'turtle') {
      const e = c.entry;
      const st = e.step;
      title = '海龜';
      html += UI.entryCard(e);
      html += '<div class="step-box"><span>背上的小事</span><b>' + esc(st.what) + '</b><small>' + (st.status === 'done' ? '做到了・' + timeStr(st.doneAt) : '想在「' + F.STEP_WHEN[st.when].name + '」做') + '</small></div>';
      if (st.status === 'pending') {
        actions.push('<button class="btn" data-act="done">做到了</button>');
        actions.push('<button class="btn ghost" data-act="drop">不需要了</button>');
        html += '<p class="note">還沒做也沒關係，牠會在沙灘上等。</p>';
      }
    } else if (kind === 'seahorse') {
      title = '海馬';
      html += '<p class="lede">牠用尾巴捲著一根海草' + (Game.eco.bedX() != null ? '，和其他海馬待在同一片海草床裡' : '') + '。</p>' + UI.entryCard(c.entry);
    } else if (kind === 'coral') {
      const e = c.item.entry;
      title = e.turn === 'thank' ? '腦珊瑚' : '珊瑚枝';
      html += UI.entryCard(e) + quote(e.text, e.turn === 'thank' ? '你想謝謝' : '那個瞬間');
    } else if (kind === 'oyster') {
      const fam = F.FAMILIES[c.fam];
      title = '「' + fam.name + '」的珍珠貝';
      const kinds = new Set(c.layers).size;
      html += '<p class="lede">「' + fam.name + '」來了很多次。每來一次，珍珠就多一層；那一層的顏色，是你那一次選的陪法。</p>';
      html += '<div class="pearl-row"><canvas class="pearl-cv" id="pearlCv" width="120" height="120" aria-label="珍珠的樣子"></canvas><div><b>' + c.layers.length + ' 層・' + kinds + ' 種陪法</b><small>' + (c.pearls ? '已經結成 ' + c.pearls + ' 顆・' : '') + '七層以上、用過三種陪法，就會結成一顆</small></div></div>';
      html += '<ol class="layers">' + c.layers.map((t) => '<li>' + turnChip(t) + '</li>').join('') + '</ol>';
    } else if (kind === 'octopus') {
      html += '<p class="lede">這個月，你用過這些方式陪自己的感覺：</p><div class="chips">' + c.turns.map((t) => turnChip(t)).join('') + '</div>';
      html += '<p class="note">點牠的時候，牠會把每一種顏色都閃一遍。</p>';
    } else if (kind === 'bottle') {
      title = '瓶中信';
      html += '<p class="lede">' + dateStr(c.entry.t) + '，你寫給以後的自己：</p><blockquote class="said big">' + esc(c.entry.text || '') + '</blockquote>';
    }
    html += '<div class="sp-note"><div><b>真實的牠</b><span>' + esc(sp.fact) + '</span></div><div><b>和誰有關</b><span>' + esc(sp.link) + '</span></div></div>';
    if (actions.length) html += '<div class="btn-row">' + actions.join('') + '</div>';
    body.innerHTML = html;

    if (kind === 'oyster') UI.drawPearl($('pearlCv'), c.layers, 120);
    body.querySelectorAll('[data-act]').forEach((b) =>
      b.addEventListener('click', () => {
        const a = b.dataset.act;
        if (a === 'resume') {
          UI.closeSheet();
          MJ.Ritual.start({ resume: c.entry });
        } else if (a === 'done') {
          UI.closeSheet();
          Game.setStep(c.entry.id, 'done');
        } else if (a === 'drop') {
          UI.closeSheet();
          Game.setStep(c.entry.id, 'dropped');
        }
      })
    );
    return title;
  };

  /** 珍珠：由內到外，一層一層是當時選的陪法 */
  UI.drawPearl = (canvas, layers, size) => {
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = size / 2;
    const R = size * 0.36;
    g.globalCompositeOperation = 'lighter';
    U.drawGlow(g, c, c, size * 1.1, layers.length ? F.TURNS[layers[layers.length - 1]].hue : 40, 0.4, 0.8, 0.6);
    g.globalCompositeOperation = 'source-over';
    const n = Math.max(1, layers.length);
    const den = Math.max(7, n);
    for (let i = n - 1; i >= 0; i--) {
      const t = layers[i];
      const r = R * ((i + 1) / den);
      g.fillStyle = t ? U.hsla(F.TURNS[t].hue, 0.5, 0.8 - i * 0.015, 1) : 'rgba(255,255,255,0.2)';
      g.beginPath();
      g.arc(c, c, Math.max(3, r), 0, U.TAU);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 0.8;
      g.stroke();
    }
    const outer = Math.max(3, R * (n / den));
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath();
    g.arc(c - outer * 0.35, c - outer * 0.35, Math.max(1, outer * 0.16), 0, U.TAU);
    g.fill();
  };

  /** 變身之後的那張小卡 */
  UI.ritualResult = (e, c) => {
    const w = e.words.map((x) => '「' + esc(x) + '」').join('');
    const t = e.turn;
    let head;
    let line;
    if (t === 'allow') {
      head = '變成了一隻小水母';
      line = '牠跟著水流，慢慢地漂。' + (c && c.genes && c.genes.special === 'moonlight' ? '牠的傘，帶著一點月光。' : '');
    } else if (t === 'ground') {
      head = '變成了一隻海馬';
      line = '牠用尾巴捲住一根海草，在水流裡待穩了。';
    } else if (t === 'reframe') {
      head = '變成了一隻寄居蟹';
      line = '牠背著「' + F.LENSES[e.lens].name + '」，在沙地上慢慢走。';
    } else if (t === 'need') {
      head = '變成了燈籠魚';
      const names = (e.needs || []).map((n) => F.NEEDS[n].name);
      const school = Game.eco.schools[(e.needs || [])[0]];
      line = '牠游進了「' + names.join('」和「') + '」那一群' + (school && school.count >= 2 ? '。這一群現在有 ' + school.count + ' 條了。' : '。');
    } else if (t === 'kind') {
      head = '變成了一條小丑魚';
      line = '牠住進了你寫給自己的那句話裡。';
    } else if (t === 'step') {
      head = '變成了一隻小海龜';
      line = '牠背上亮著「' + esc(e.step.what) + '」。做到了之後點牠，牠會出發去旅行。';
    } else if (t === 'release') {
      head = '散成了藍眼淚';
      line = (e.jellyAte ? '「' + esc(e.jellyAte) + '」吃掉了它。' : '') + '手指劃過水面，它們會亮。水母和珊瑚會慢慢把它們吃掉。';
    } else if (t === 'savor') {
      head = '長成了一截珊瑚';
      line = '那個瞬間，現在是珊瑚礁的一部分。';
    } else if (t === 'thank') {
      head = '長成了一顆腦珊瑚';
      line = '圓圓的，長在珊瑚礁底下。';
    } else if (t === 'keep') {
      head = '裝進了瓶子';
      line = '它漂在海面上。哪天需要，點它就能讀。';
    } else {
      head = '變成了一隻幼生';
      line = '牠先在海裡漂著。想好怎麼陪它，再點牠。';
    }
    let wave = '';
    if (t && e.i0 != null) {
      const a = e.i0;
      const b = e.i1 == null ? a : e.i1;
      if (F.isPositive(e.fam)) wave = b > a ? '這份感覺變亮了（' + a + ' → ' + b + '）。' : b === a ? '它還是這麼亮。' : '它淡了一點（' + a + ' → ' + b + '），也沒關係。';
      else wave = b < a ? '浪從 ' + a + ' 退到了 ' + b + '。' : b === a ? '浪還是 ' + a + '。你陪它待了一下。' : '浪變大了一點（' + a + ' → ' + b + '）。有時候一靠近它，它會先變大。';
    }
    let q = '';
    if (t === 'need' && e.needs && e.needs.length) q = F.NEED_QUESTIONS[e.needs[0]];
    else if (F.TURN_QUESTIONS[t]) q = U.pick(F.TURN_QUESTIONS[t]);
    const hue = t ? F.TURNS[t].hue : 200;
    const gift = e._gift;
    delete e._gift;
    UI.showModal(
      (card, close) => {
        card.innerHTML =
          '<div class="res-badge" style="--h:' + hue + '">' + icon(t || 'larva', 'i big') + '</div>' +
          '<p class="res-words">' + w + '</p><h2 class="m-title">' + head + '</h2><p class="m-text">' + line + '</p>' +
          (wave ? '<p class="res-wave">' + wave + '</p>' : '') +
          (q ? '<p class="sea-q">' + esc(q) + '</p>' : '') +
          (gift ? '<p class="res-gift"><span class="light-dot sm"></span>謝謝你記下它・+' + gift.n + ' 光</p>' : '') +
          '<div class="btn-row center">' + (c ? '<button class="btn ghost" data-r="look">看看牠</button>' : '') + '<button class="btn" data-r="ok">好</button></div>';
        card.querySelector('[data-r="ok"]').addEventListener('click', () => close());
        const look = card.querySelector('[data-r="look"]');
        if (look)
          look.addEventListener('click', () => {
            Game.highlight = { c, until: Game.t + 4 };
            close();
          });
      },
      { cls: 'result' }
    );
  };

  /** 之前想做的小事，後來呢？ */
  UI.stepAsk = (e) => {
    UI.showModal(
      (card, close) => {
        card.innerHTML =
          '<div class="res-badge" style="--h:' + F.TURNS.step.hue + '">' + icon('step', 'i big') + '</div>' +
          '<h2 class="m-title">之前想做的小事</h2><blockquote class="said big">' + esc(e.step.what) + '</blockquote>' +
          '<p class="m-text">後來呢？怎麼樣都可以。</p>' +
          '<div class="btn-row center"><button class="btn ghost" data-r="dropped">不需要了</button><button class="btn ghost" data-r="later">還沒，沒關係</button><button class="btn" data-r="done">做到了</button></div>';
        card.querySelectorAll('[data-r]').forEach((b) =>
          b.addEventListener('click', () => {
            close();
            Game.setStep(e.id, b.dataset.r);
          })
        );
      },
      { dismissible: true }
    );
  };

  UI.pearlModal = (p) => {
    const fam = F.FAMILIES[p.fam];
    UI.showModal(
      (card, close) => {
        card.innerHTML =
          '<canvas class="pearl-cv big" id="pearlBig" width="160" height="160" aria-label="珍珠"></canvas>' +
          '<h2 class="m-title">「' + fam.name + '」的珍珠</h2>' +
          '<p class="m-text">這 ' + p.layers.length + ' 次「' + fam.name + '」，你用了 ' + new Set(p.layers).size + ' 種方式陪它。由裡到外，每一層是那一次你選的陪法。</p>' +
          '<ol class="layers">' + p.layers.map((t) => '<li>' + turnChip(t) + '</li>').join('') + '</ol>' +
          '<div class="btn-row center"><button class="btn">收進珍珠盒</button></div>';
        UI.drawPearl($('pearlBig'), p.layers, 160);
        card.querySelector('.btn').addEventListener('click', () => close());
      },
      { cls: 'paper' }
    );
  };

  /** 每週回顧：只用你自己的字組成，不下結論、不給建議 */
  UI.recapModal = () => {
    const s = Game.state;
    const week = Game.weekEntries();
    s.eco.lastRecap = Date.now();
    Game.save();
    const md = (ts) => {
      const d = new Date(ts);
      return d.getMonth() + 1 + '/' + d.getDate();
    };
    let html = '<div class="letter-seal" aria-hidden="true">' + icon('tides') + '</div><h2 class="m-title">這一週的海</h2><div class="letter recap">';
    if (!week.length) html += '<p>這一週很安靜，海也是。</p>';
    else {
      html += '<p>這一週，你替 <b>' + week.length + '</b> 份感覺取了名字。</p>';
      const wc = {};
      for (const e of week) for (const w of e.words || []) wc[w] = (wc[w] || 0) + 1;
      const top = Object.keys(wc).sort((a, b) => wc[b] - wc[a]).slice(0, 3);
      if (top.length) html += '<p>最常出現的是' + top.map((w) => '「' + esc(w) + '」').join('') + '。</p>';
      const turns = Array.from(new Set(week.map((e) => e.turn).filter((t) => F.TURNS[t])));
      if (turns.length) html += '<p>你用了 ' + turns.length + ' 種方式陪它們：</p><div class="chips center">' + turns.map((t) => turnChip(t)).join('') + '</div>';
      const drops = week.filter((e) => !F.isPositive(e.fam) && e.i0 != null && e.i1 != null && e.i1 < e.i0 && F.TURNS[e.turn]).sort((a, b) => b.i0 - b.i1 - (a.i0 - a.i1));
      if (drops.length) {
        const e = drops[0];
        html += '<p>浪退最多的一次，是 ' + md(e.t) + ' 的「' + esc(e.words[0]) + '」：從 ' + e.i0 + ' 到 ' + e.i1 + '，那時候你選了「' + F.TURNS[e.turn].name + '」。</p>';
      }
      const done = s.entries.filter((e) => e.step && e.step.status === 'done' && Date.now() - (e.step.doneAt || 0) < 7 * 86400000);
      if (done.length) html += '<p>你做到了：' + done.slice(-4).map((e) => '「' + esc(e.step.what) + '」').join('') + '。</p>';
      const pos = week.filter((e) => F.isPositive(e.fam)).length;
      if (pos) html += '<p>其中有 ' + pos + ' 份，是舒服的感覺。</p>';
      const said = week.filter((e) => e.text && ['reframe', 'kind', 'savor', 'thank', 'keep', 'need'].includes(e.turn)).slice(-3);
      if (said.length) {
        html += '<p>這週你寫給自己的話：</p>';
        for (const e of said) html += '<blockquote class="said"><span>' + md(e.t) + '・' + F.TURNS[e.turn].name + '</span>' + esc(e.text) + '</blockquote>';
      }
    }
    html += '<p class="letter-sign">— 海</p></div><div class="btn-row center"><button class="btn ghost" data-r="tides">打開潮汐圖</button><button class="btn" data-r="ok">收好</button></div>';
    UI.showModal(
      (card, close) => {
        card.innerHTML = html;
        card.querySelector('[data-r="ok"]').addEventListener('click', () => close());
        card.querySelector('[data-r="tides"]').addEventListener('click', () => {
          close();
          UI.openSheet('tides', null, { back: 'more' });
        });
      },
      { cls: 'paper' }
    );
  };

  UI.pastLetterModal = (letter) => {
    const d = new Date(letter.t);
    const turn = F.TURNS[letter.turn];
    UI.showModal(
      (card, close) => {
        card.innerHTML =
          '<div class="letter-seal" aria-hidden="true">' + icon('keep') + '</div>' +
          '<h2 class="m-title">瓶子裡，是你寫的字</h2>' +
          '<p class="m-text">' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日，你在「' + (turn ? turn.name : '') + '」的時候寫過：</p>' +
          '<div class="letter"><p class="letter-main">' + esc(letter.text) + '</p><p class="letter-sign">— 那時候的你</p></div>' +
          '<div class="btn-row center"><button class="btn">收好</button></div>';
        card.querySelector('.btn').addEventListener('click', () => close());
      },
      { cls: 'paper' }
    );
  };

  MJ.UI = UI;
})((window.MJ = window.MJ || {}));
