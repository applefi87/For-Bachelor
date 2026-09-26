/* 海月水母館 — 海的介面：HUD、底座、通知、提示、說明牌、對話牌、各種模式（DESIGN.md §6、§10、§12） */
(function (MJ) {
  'use strict';

  const U = MJ.U;
  const Gn = MJ.Genes;
  const C = MJ.Content;
  const A = MJ.Audio;
  const esc = U.escape;

  /* ---------- 線條圖示 ----------
   * 介面上已經不用圖示（DESIGN.md §6.7）。這張表和 UI.icon 只為了還沒改寫的檔案先不壞，
   * 海的介面自己不再輸出任何圖示。 */
  const ICONS = {
    feed: '<circle cx="7" cy="5.5" r="1.5"/><circle cx="14.5" cy="8" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="16.5" cy="15" r="1.5"/><circle cx="11" cy="19" r="1.5"/>',
    breath: '<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="6" opacity=".65"/><circle cx="12" cy="12" r="9.5" opacity=".35"/>',
    codex: '<path d="M5 5a1.8 1.8 0 0 1 1.8-1.8H19v14.6H6.8A1.8 1.8 0 0 0 5 19.6z"/><path d="M5 19.6a1.8 1.8 0 0 0 1.8 1.8H19"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    letter: '<rect x="3.5" y="5.5" width="17" height="13"/><path d="M4 7l8 6 8-6"/>',
    camera: '<rect x="3" y="7" width="18" height="13"/><circle cx="12" cy="13.5" r="3.6"/>',
    moon: '<path d="M19.5 14.5A7.8 7.8 0 1 1 9.5 4.5a6.2 6.2 0 0 0 10 10z"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
    jelly: '<path d="M5 12a7 7 0 0 1 14 0z"/><path d="M8.5 12c0 3-1 5-1.2 8M12 12v8.5M15.5 12c0 3 1 5 1.2 8"/>',
    trophy: '<path d="M12 3.8l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z"/>',
    diary: '<rect x="4" y="5" width="16" height="15"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
    heart: '<path d="M12 19s-7-4.4-7-9.3A3.9 3.9 0 0 1 12 7.4a3.9 3.9 0 0 1 7 2.3C19 14.6 12 19 12 19z"/>',
    arrange: '<path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3"/>',
    pearl: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2"/>',
    octo: '<path d="M7 12a5 5 0 0 1 10 0v2H7z"/><path d="M8 14c-1 2-2.5 3-4 3M10 14c-.3 2.5-1 4-2.3 5M14 14c.3 2.5 1 4 2.3 5M16 14c1 2 2.5 3 4 3"/>',
  };
  Object.assign(ICONS, MJ.Feelings.ICONS);
  const icon = (n, cls = 'i') => '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';
  const F = MJ.Feelings;

  /* ---------- 格式（DESIGN.md §4.2） ---------- */
  const pad2 = (n) => String(n).padStart(2, '0');
  const SOLFEGE = ['Do', 'Re', 'Mi', 'Sol', 'La'];
  const noteName = (g) => {
    const idx = Gn.noteOf(g) + 3;
    const reg = idx < 5 ? '低音' : idx < 10 ? '中音' : '高音';
    return reg + ' ' + SOLFEGE[((idx % 5) + 5) % 5];
  };
  /** 欄位日期：09.25；不是今年才加年份 2025.09.25 */
  const dateStr = (ts) => {
    const d = new Date(ts);
    const md = pad2(d.getMonth() + 1) + '.' + pad2(d.getDate());
    return d.getFullYear() === new Date().getFullYear() ? md : d.getFullYear() + '.' + md;
  };
  /** 欄位日期＋時間：09.25 21:40 */
  const timeStr = (ts) => dateStr(ts) + ' ' + hhmm(ts);
  const hhmm = (ts) => {
    const d = new Date(ts);
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  };
  /** 時間長度：超過 1 分鐘就不寫秒 */
  const dur = (sec) => {
    sec = Math.max(0, Math.ceil(sec));
    if (sec < 60) return sec + ' 秒';
    const m = Math.round(sec / 60);
    if (m < 60) return m + ' 分';
    const h = Math.floor(m / 60);
    return h + ' 小時' + (m % 60 ? ' ' + (m % 60) + ' 分' : '');
  };
  /** 稀有度：文字＋等寬，沒有星星 */
  const starsHTML = (n) => '<span class="num stars" aria-label="稀有度 ' + n + '/5">' + n + '/5</span>';
  const colorCss = (g, l = 70) => 'hsl(' + Math.round(g.hue) + ',' + Math.round(Math.max(g.sat, 0.15) * 100) + '%,' + l + '%)';

  const UI = { sheetKind: null, icon, dimWanted: 0 };
  let Game;
  const $ = (id) => document.getElementById(id);
  const narrow = () => window.innerWidth < 700;

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
      settingsBtn: $('btnSettings'),
      dock: $('dock'),
      toasts: $('toasts'),
      hint: $('hint'),
      sheet: $('sheet'),
      sheetTitle: $('sheetTitle'),
      sheetBody: $('sheetBody'),
      sheetBack: $('sheetBack'),
      modal: $('modal'),
      modalCard: $('modalCard'),
      leader: $('leader'),
      leaderLine: $('leaderLine'),
      leaderRing: $('leaderRing'),
      feedPop: $('feedPop'),
      intro: $('intro'),
      feelBtn: document.querySelector('#dock [data-act="worry"]'),
    };

    // 還沒改寫的按鈕若只靠圖示，先換成它的名字（不再畫圖示）
    document.querySelectorAll('[data-icon]').forEach((el) => {
      if (!el.textContent.trim() && el.getAttribute('aria-label')) el.textContent = el.getAttribute('aria-label');
    });
    UI.updateSound();

    const introSub = $('introSub');
    if (introSub) {
      const n = Game.jellies ? Game.jellies.filter((j) => !j.leaving).length : 0;
      introSub.innerHTML = n ? '現正展出　<span class="num">' + n + '</span> 隻' : '';
    }

    UI.el.dock.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      A.click();
      const act = b.dataset.act;
      if (act === 'feed') return UI.toggleFeed();
      UI.closePopovers();
      if (act === 'worry') MJ.Ritual.start();
      else if (UI.sheetKind && sheetRoot() === act) UI.closeSheet();
      else if (act === 'breath') UI.openSheet('breath');
      else if (act === 'codex') UI.openSheet('codex');
      else if (act === 'shop') UI.openSheet('shop');
      else if (act === 'more') UI.openSheet('more');
    });

    UI.el.feedPop.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-food]');
      if (!b) return;
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
      UI.toast('點水面：撒下' + MJ.Food.TYPES[type].name);
    });

    UI.el.soundBtn.addEventListener('click', () => {
      Game.updateSettings({ muted: !Game.state.settings.muted });
      UI.updateSound();
    });
    UI.el.settingsBtn.addEventListener('click', () => (UI.sheetKind === 'settings' ? UI.closeSheet() : UI.openSheet('settings')));
    UI.el.letterBtn.addEventListener('click', () => UI.letterModal());
    $('sheetClose').addEventListener('click', () => UI.closeSheet());
    UI.el.sheetBack.addEventListener('click', () => {
      if (UI.sheetBackTo) UI.openSheet(UI.sheetBackTo);
    });
    UI.el.modal.addEventListener('click', (e) => {
      if (e.target === UI.el.modal && UI.modalDismiss && !SOFT[UI.modalKind]) UI.closeModal();
    });
    $('hintClose').addEventListener('click', () => {
      UI.el.hint.hidden = true;
      UI.hintDismissed = true;
    });

    // 說明牌、導言牌不擋海：點在牌子以外的任何地方就收起來
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (!UI.modalOpenNow || UI.modalClosing || !SOFT[UI.modalKind]) return;
        if (UI.el.modalCard.contains(e.target)) return;
        UI.closeModal();
      },
      true
    );

    $('introStart').addEventListener('click', () => Game.start());
    $('breathStop').addEventListener('click', () => Game.stopBreath());
    $('sleepStop').addEventListener('click', () => Game.stopSleep());
    $('photoShot').addEventListener('click', () => Game.takePhoto());
    $('photoClose').addEventListener('click', () => Game.stopPhoto());
    $('arrangeDone').addEventListener('click', () => Game.arrange(false));

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (UI.modalOpenNow) {
        if (UI.modalDismiss) UI.closeModal();
      } else if (UI.el.feedPop.classList.contains('open')) UI.closePopovers();
      else if (UI.sheetKind) UI.closeSheet();
      else if (Game.mode === 'breath') Game.stopBreath();
      else if (Game.mode === 'sleep') Game.stopSleep();
      else if (Game.mode === 'photo') Game.stopPhoto();
      else if (Game.mode === 'arrange') Game.arrange(false);
    });

    let rz = 0;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => {
        if (LB.handle && !LB.handle.closed && LB.card) {
          placeLabel(LB.card, readTarget());
          const t = readTarget();
          if (t) drawLeader(t);
        }
      }, 140);
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
    UI.refreshBound();
    UI.pendingToasts = [];
  };

  UI.afterStart = (offline) => {
    document.body.classList.remove('intro');
    UI.el.intro.classList.add('gone');
    setTimeout(() => (UI.el.intro.hidden = true), 900);
    const pend = UI.pendingToasts || [];
    UI.pendingToasts = null;
    UI.showHint(Game.currentHint());
    const s = Game.state;
    if (s.fresh) {
      UI.welcomeModal();
      setTimeout(() => {
        const p = Game.polyps[0];
        if (p) UI.note('海底發光的是水螅體，約 ' + dur(p.remaining) + '後孵化', { target: Game.targetOf(p), timeout: 7000 });
      }, 14000);
    }
    if (s.fresh) {
      if (Game.letterDue()) UI.el.letterBtn.hidden = false;
    } else {
      // 回來的時候，所有事情合成一張導言牌，不要一個接一個跳出來
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
    const r = '+' + U.fmt(Game.rate * 3600) + '/小時';
    if (UI.el.rate.textContent !== r) UI.el.rate.textContent = r;
    const due = Game.started && Game.letterDue();
    if (UI.el.letterBtn.hidden === !!due) UI.el.letterBtn.hidden = !due;
  };

  UI.updateSound = () => {
    const muted = !!Game.state.settings.muted;
    const b = UI.el.soundBtn;
    b.textContent = muted ? '聲音 關' : '聲音 開';
    b.setAttribute('aria-pressed', String(!muted));
    b.setAttribute('aria-label', muted ? '聲音：關。按一下打開' : '聲音：開。按一下關掉');
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
    if (UI.deferred.length && UI.deferTick <= 0 && !UI.isQuiet() && !UI.modalOpenNow && Game.mode !== 'sleep') {
      UI.deferTick = 3.2;
      UI.toast.apply(null, UI.deferred.shift());
    }
    if (Game.mode === 'sleep') UI.sleepTick();
  };

  /* ================= 通知 ================= */

  /** 剛陪完一份心情的時候，先安靜一下：成就和新發現晚一點再說 */
  UI.quietUntil = 0;
  UI.deferred = [];
  UI.quiet = (sec) => {
    UI.quietUntil = Math.max(UI.quietUntil, Date.now() + sec * 1000);
  };
  UI.isQuiet = () => Date.now() < UI.quietUntil || !!(MJ.Ritual && MJ.Ritual.open);

  /** 通知欄：左上、HUD 下方，最多同時 2 則，其餘排隊。停 4 秒，有第二行 6 秒；點一下提早收掉。 */
  UI.toastQueue = [];
  UI.toast = (text, kind = 'soft', sub = null) => {
    if (UI.pendingToasts) {
      UI.pendingToasts.push([text, kind, sub]);
      return;
    }
    if ((kind === 'achievement' || kind === 'discover') && UI.isQuiet()) {
      UI.deferred.push([text, kind, sub]);
      return;
    }
    // 晚安模式不出現通知；手機上說明牌停在通知欄的位置，等它收起再說
    if ((Game && Game.mode === 'sleep') || (narrow() && UI.modalOpenNow && SOFT[UI.modalKind])) {
      UI.deferred.push([text, kind, sub]);
      return;
    }
    showToast(text, kind, sub);
  };

  const showToast = (text, kind, sub) => {
    const box = UI.el.toasts;
    const live = [...box.children].filter((el) => !el.classList.contains('out'));
    if (live.length >= 2) {
      UI.toastQueue.push([text, kind, sub]);
      return;
    }
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = '<p class="toast-main">' + esc(text) + '</p>' + (sub ? '<p class="toast-sub">' + esc(sub) + '</p>' : '');
    box.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    let gone = false;
    const kill = () => {
      if (gone) return;
      gone = true;
      el.classList.add('out');
      setTimeout(() => {
        el.remove();
        const next = UI.toastQueue.shift();
        if (next) showToast.apply(null, next);
      }, 400);
    };
    el.addEventListener('click', kill);
    setTimeout(kill, sub ? 6000 : 4000);
  };

  /* ================= 提示 ================= */

  UI.showHint = (text) => {
    const h = UI.el.hint;
    if (!text || UI.hintDismissed) {
      h.hidden = true;
      return;
    }
    $('hintText').textContent = text;
    h.hidden = false;
  };

  /* ================= 對話牌、導言牌、說明牌、紙：共用 #modal =================
   * kind：dialog（暗色對話牌）、care（專線）、paper（紙）、guide（導言牌）、label（說明牌）、note（短版說明牌）
   * guide、label、note 不擋海（SOFT）：點在牌子以外就收起。
   * 同一時間只開一個；儀式開著時一律排隊，儀式關上後 UI.pumpModals 再叫出來。 */

  const SOFT = { guide: 1, label: 1, note: 1 };
  UI.modalQueue = [];
  UI.modalKind = null;
  UI.modalClosing = false;
  let modalSeq = 0;

  const kindOf = (opts) => {
    if (opts.kind) return opts.kind;
    const cls = ' ' + (opts.cls || '') + ' ';
    if (cls.includes(' paper ')) return 'paper';
    if (cls.includes(' care-card ')) return 'care';
    if (cls.includes(' guide ')) return 'guide';
    return 'dialog';
  };

  UI.showModal = (render, opts = {}) => {
    if (opts.cancelled) return;
    const kind = kindOf(opts);
    if (MJ.Ritual && MJ.Ritual.open) {
      UI.modalQueue.push([render, opts]);
      return;
    }
    if (UI.modalOpenNow) {
      // 新的說明牌收掉舊的說明牌；短版說明牌讓位給任何東西；其他的排隊
      const cur = UI.modalKind;
      const replace = !UI.modalClosing && (cur === 'note' || (cur === 'label' && kind === 'label' && !opts.wait));
      if (!replace) {
        UI.modalQueue.push([render, opts]);
        return;
      }
      closeNow();
    }
    modalSeq++;
    UI.modalOpenNow = true;
    UI.modalClosing = false;
    UI.modalKind = kind;
    UI.modalDismiss = opts.dismissible !== false;
    UI.modalOnClose = opts.onClose || null;
    const m = UI.el.modal;
    const card = UI.el.modalCard;
    m.className = 'modal is-' + kind + (opts.place ? ' at-' + opts.place : '');
    card.className = 'modal-card ' + (opts.cls || '');
    card.removeAttribute('style');
    card.removeAttribute('aria-labelledby');
    card.removeAttribute('aria-label');
    card.setAttribute('aria-modal', SOFT[kind] ? 'false' : 'true');
    card.innerHTML = '';
    // 紙打開時，世界讓海變暗（world 讀 MJ.UI.dimWanted）
    UI.dimWanted = kind === 'paper' ? 0.35 : 0;
    render(card, UI.closeModal);
    m.hidden = false;
    if (opts.afterRender) opts.afterRender(card);
    requestAnimationFrame(() => m.classList.add('open'));
    if (SOFT[kind]) {
      if (kind !== 'note') setTimeout(() => UI.modalCard && card.focus({ preventScroll: true }), 60);
    } else {
      const f = card.querySelector('[autofocus], textarea, input, .btn, .btn-2');
      if (f) setTimeout(() => f.focus({ preventScroll: true }), 60);
    }
  };

  /** 儀式關上之後，把排隊的視窗叫出來 */
  UI.pumpModals = () => {
    if (UI.modalOpenNow || (MJ.Ritual && MJ.Ritual.open)) return;
    while (UI.modalQueue.length) {
      const next = UI.modalQueue.shift();
      if (next[1].cancelled) continue;
      UI.showModal(next[0], next[1]);
      return;
    }
  };

  const resetModal = () => {
    const m = UI.el.modal;
    m.hidden = true;
    m.classList.remove('open');
    UI.el.modalCard.classList.remove('show');
    UI.modalOpenNow = false;
    UI.modalClosing = false;
    UI.modalKind = null;
    UI.dimWanted = 0;
    stopLabel();
  };

  /** 立刻換掉（新的說明牌要出來時） */
  const closeNow = () => {
    const cb = UI.modalOnClose;
    UI.modalOnClose = null;
    modalSeq++;
    resetModal();
    if (cb) cb();
  };

  UI.closeModal = () => {
    if (!UI.modalOpenNow || UI.modalClosing) return;
    UI.modalClosing = true;
    const kind = UI.modalKind;
    const cb = UI.modalOnClose;
    UI.modalOnClose = null;
    UI.el.modal.classList.remove('open');
    UI.el.modalCard.classList.remove('show');
    UI.dimWanted = 0;
    leaderOff();
    const seq = modalSeq;
    setTimeout(
      () => {
        if (seq !== modalSeq) return;
        resetModal();
        if (cb) cb();
        UI.pumpModals();
      },
      SOFT[kind] ? 160 : 280
    );
  };

  /* ================= 生物說明牌（DESIGN.md §6.4、§7.5、§12；art.md §5.5） =================
   * DOM：#modal.is-label > #modalCard.modal-card.label.face-{l|r|t|b}
   *        p.lb-head（No.、時間、狀態）→ h2#lbName.lb-name → p.lb-line（＋學名）→ dl.kv.lb-rows
   *        → p.lb-note → hr.lb-rule → p.lb-q → p.res-care → div.btn-row.lb-acts
   *      指示線與目標圈：svg#leader（polyline#leaderLine、circle#leaderRing），蓋在海上、不接收點擊。
   * 牌子不動；線與圈每一幀跟著 target() 走；target() 回傳 null 時線與圈淡出，牌子留著。 */

  const LB = { handle: null, card: null, target: null, raf: 0, rect: null, face: null, nameMid: 24, next: 0, moving: false, timer: 0, opts: null };

  const statusOn = (s) => s === '新居民' || s === '新生' || s === '新發現';

  const labelHTML = (o) => {
    let h = '';
    const head = [];
    if (o.no != null && o.no !== '') head.push('<span class="num">No. ' + esc(o.no) + '</span>');
    if (o.time) head.push('<span class="num">' + esc(o.time) + '</span>');
    if (o.status) head.push('<span class="lb-status' + (o.statusOn || statusOn(o.status) ? ' on' : '') + '">' + esc(o.status) + '</span>');
    if (head.length) h += '<p class="lb-head">' + head.join('') + '</p>';
    const lat = o.latin ? '<span class="latin' + (o.latinUp ? ' up' : '') + '" lang="la">' + esc(o.latin) + '</span>' : '';
    if (o.words) h += '<h2 class="lb-name' + (o.hand ? ' hand' : '') + '" id="lbName">' + esc(o.words) + (!o.line && lat ? '<span class="lb-latin">　' + lat + '</span>' : '') + '</h2>';
    if (o.line) h += '<p class="lb-line">' + esc(o.line) + (lat ? '　' + lat : '') + '</p>';
    if (o.rows && o.rows.length) h += '<dl class="kv lb-rows">' + o.rows.map((r) => '<div><dt>' + esc(r[0]) + '</dt><dd' + (r[2] ? ' class="' + r[2] + '"' : '') + '>' + r[1] + '</dd></div>').join('') + '</dl>';
    const notes = [].concat(o.note || []).filter(Boolean);
    for (const n of notes) h += '<p class="lb-note">' + esc(n) + '</p>';
    if (o.body) h += o.body;
    if (o.question || o.care) h += '<hr class="lb-rule">';
    if (o.question) h += '<p class="lb-q">' + esc(o.question) + '</p>';
    if (o.care) h += o.care;
    const acts = o.actions && o.actions.length ? o.actions : o.kind === 'note' ? [] : [{ label: '收起' }];
    if (acts.length) {
      h += '<div class="btn-row lb-acts">' + acts.map((a, i) => '<button class="' + (a.primary ? 'btn' : a.cls || 'btn-2') + '" data-lb="' + i + '"' + (a.id ? ' data-r="' + esc(a.id) + '"' : '') + '>' + esc(a.label) + '</button>').join('') + '</div>';
    }
    return { html: h, acts };
  };

  /**
   * UI.label(opts) → { close() }
   * opts = { target, no, time, status, words, line, latin, latinUp, rows: [[k, v(html), ddClass?]], note, body(html), question, care(html),
   *          actions: [{ label, primary, id, keep, onClick }], hand, wait, update(card), onClose }
   * - target：每一幀呼叫的函式，回傳 [x, y, r]（CSS 像素）或 null。
   * - 同一時間只有一塊；新的收掉舊的。wait: true 時（自動出現的，例如出生、小事）改成排在現在這塊後面。
   * - 儀式開著時排隊，UI.pumpModals 時再出現。不自動消失；點別處、Esc、「收起」關閉。
   */
  UI.label = (opts = {}) => {
    const kind = opts.kind === 'note' ? 'note' : 'label';
    const mopts = {
      kind,
      wait: !!opts.wait,
      cls: 'label',
      dismissible: true,
      onClose: () => {
        handle.closed = true;
        if (opts.onClose) opts.onClose();
      },
      afterRender: (card) => startLabel(card, opts, handle),
    };
    const handle = {
      closed: false,
      close() {
        if (handle.closed) return;
        mopts.cancelled = true;
        if (LB.handle === handle) UI.closeModal();
        else handle.closed = true;
      },
    };
    UI.showModal((card) => {
      // 手機上抽屜蓋住海：先收起來，讓牌子指得到生物
      if (narrow() && UI.sheetKind) UI.closeSheet();
      const { html, acts } = labelHTML(Object.assign({ kind }, opts));
      card.innerHTML = html;
      if (card.querySelector('#lbName')) card.setAttribute('aria-labelledby', 'lbName');
      else card.setAttribute('aria-label', card.textContent.trim().slice(0, 40));
      card.querySelectorAll('[data-lb]').forEach((b) =>
        b.addEventListener('click', () => {
          const a = acts[+b.dataset.lb];
          if (a.keep) {
            if (a.onClick) a.onClick(b);
            return;
          }
          handle.close();
          if (a.onClick) a.onClick();
        })
      );
      if (opts.onRender) opts.onRender(card, handle);
    }, mopts);
    return handle;
  };

  /**
   * UI.note(text, { target, sub, timeout })：短版說明牌（一兩行字＋指示線），預設 6 秒後自己收起。
   * 沒有 target、target() 一開始就是 null、或現在有別的牌子／儀式／模式時，等於 UI.toast(text, 'soft', sub)。
   */
  UI.note = (text, o = {}) => {
    const t = typeof o.target === 'function' ? o.target : null;
    const first = t ? safeCall(t) : null;
    const busy = (MJ.Ritual && MJ.Ritual.open) || (UI.modalOpenNow && UI.modalKind !== 'note') || (Game && Game.mode !== 'normal') || UI.pendingToasts;
    if (!first || busy) {
      UI.toast(text, 'soft', o.sub || null);
      return { close() {} };
    }
    const timeout = o.timeout === 0 ? 0 : o.timeout || 6000;
    return UI.label({
      kind: 'note',
      target: t,
      body: '<p class="lb-text">' + esc(text) + '</p>' + (o.sub ? '<p class="lb-note">' + esc(o.sub) + '</p>' : ''),
      actions: timeout ? [] : [{ label: '知道了' }],
      timeout,
    });
  };

  const safeCall = (fn) => {
    try {
      const r = fn();
      if (!r || !isFinite(r[0]) || !isFinite(r[1])) return null;
      return [r[0], r[1], U.clamp(isFinite(r[2]) ? r[2] : 24, 16, 64)];
    } catch (e) {
      return null;
    }
  };

  const readTarget = () => {
    if (!LB.target) return null;
    const t = safeCall(LB.target);
    if (!t) return null;
    // 游出畫面：線淡出，牌子留著
    const W = window.innerWidth;
    const H = window.innerHeight;
    if (t[0] < -t[2] || t[0] > W + t[2] || t[1] < -t[2] || t[1] > H + t[2]) return null;
    return t;
  };

  const startLabel = (card, o, handle) => {
    stopLabel();
    LB.handle = handle;
    LB.card = card;
    LB.opts = o;
    LB.target = typeof o.target === 'function' ? o.target : null;
    LB.next = performance.now() + 900;
    const t = readTarget();
    placeLabel(card, t);
    // 目標圈 120ms → 線描出 200ms → 牌子 200ms；沒有目標時牌子直接亮起
    card.style.setProperty('--lb-delay', t ? '320ms' : '0ms');
    const svg = UI.el.leader;
    svg.classList.remove('on', 'lost');
    if (t) drawLeader(t);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (LB.handle !== handle || handle.closed) return;
        card.classList.add('show');
        if (t) svg.classList.add('on');
      })
    );
    LB.raf = requestAnimationFrame(tickLabel);
    if (o.timeout) LB.timer = setTimeout(() => handle.close(), o.timeout);
  };

  const stopLabel = () => {
    cancelAnimationFrame(LB.raf);
    clearTimeout(LB.timer);
    LB.raf = 0;
    LB.handle = null;
    LB.card = null;
    LB.target = null;
    LB.opts = null;
    LB.moving = false;
    leaderOff();
  };

  const leaderOff = () => {
    if (UI.el && UI.el.leader) UI.el.leader.classList.remove('on', 'lost');
  };

  const tickLabel = () => {
    const h = LB.handle;
    if (!h || h.closed || UI.modalClosing) return;
    const svg = UI.el.leader;
    const t = readTarget();
    if (!t) svg.classList.add('lost');
    else {
      if (svg.classList.contains('lost')) svg.classList.remove('lost');
      if (!LB.moving) {
        drawLeader(t);
        maybeMove(t);
      }
    }
    LB.raf = requestAnimationFrame(tickLabel);
  };

  /** 放牌子：桌面放在生物空間比較多的一側；手機全寬、停在和生物相反的半邊 */
  const placeLabel = (card, t) => {
    const W = window.innerWidth;
    const hudB = Math.max(UI.el.hud.getBoundingClientRect().bottom, 56);
    const dockT = UI.el.dock.getBoundingClientRect().top || window.innerHeight;
    card.classList.remove('face-l', 'face-r', 'face-t', 'face-b');
    let left;
    let top;
    let face = null;
    let cw;
    if (narrow()) {
      cw = W - 32;
      left = 16;
      card.style.width = cw + 'px';
      const ch = card.offsetHeight;
      if (!t || t[1] >= (hudB + dockT) / 2) {
        top = hudB + 8;
        face = t ? 'b' : null;
      } else {
        top = Math.max(hudB + 8, dockT - 8 - ch);
        face = 't';
      }
    } else {
      cw = 288;
      card.style.width = cw + 'px';
      const ch = card.offsetHeight;
      const sheetOpen = UI.el.sheet.classList.contains('open');
      const right = sheetOpen ? Math.min(W, UI.el.sheet.getBoundingClientRect().left) : W;
      const name = card.querySelector('.lb-name') || card.querySelector('.lb-text') || card.firstElementChild;
      LB.nameMid = name ? name.offsetTop + name.offsetHeight / 2 : 24;
      if (!t) {
        left = 24;
        top = hudB + 32;
      } else {
        const [x, y, r] = t;
        const gap = 64;
        const spaceR = right - (x + r);
        const spaceL = x - r;
        const side = spaceR >= spaceL ? 'r' : 'l';
        left = side === 'r' ? x + r + gap : x - r - gap - cw;
        left = U.clamp(left, 24, Math.max(24, right - 24 - cw));
        top = U.clamp(y - LB.nameMid, hudB + 16, Math.max(hudB + 16, dockT - 16 - ch));
        face = x < left + cw / 2 ? 'l' : 'r';
      }
    }
    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';
    if (face) card.classList.add('face-' + face);
    LB.face = face;
    LB.rect = { left, top, w: cw, h: card.offsetHeight };
    if (narrow()) LB.nameMid = 24;
  };

  const nearestOnCircle = (cx, cy, r, px, py) => {
    const d = Math.hypot(px - cx, py - cy);
    if (d < 1) return [cx, cy - r];
    return [cx + ((px - cx) / d) * r, cy + ((py - cy) / d) * r];
  };

  /** 指示線：從目標圈上最靠近牌子的點出發，直線到牌子外側 16px、與名稱行同高，再水平接進 2px 邊 */
  const drawLeader = (t) => {
    const R = LB.rect;
    if (!R || !LB.face) return;
    const [x, y, r] = t;
    let pts;
    if (LB.face === 'l' || LB.face === 'r') {
      const edgeX = LB.face === 'l' ? R.left : R.left + R.w;
      const outX = LB.face === 'l' ? edgeX - 16 : edgeX + 16;
      const ny = U.clamp(R.top + LB.nameMid, R.top + 8, R.top + R.h - 8);
      const p = nearestOnCircle(x, y, r, outX, ny);
      pts = [p, [outX, ny], [edgeX, ny]];
    } else {
      const edgeY = LB.face === 't' ? R.top : R.top + R.h;
      const ax = U.clamp(x, 40, window.innerWidth - 40);
      const p = nearestOnCircle(x, y, r, ax, edgeY);
      pts = [p, [ax, edgeY]];
    }
    UI.el.leaderLine.setAttribute('points', pts.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' '));
    const ring = UI.el.leaderRing;
    ring.setAttribute('cx', x.toFixed(1));
    ring.setAttribute('cy', y.toFixed(1));
    ring.setAttribute('r', r.toFixed(1));
  };

  /** 生物游到牌子底下、跑到另一邊、或線拉得太長時，牌子才換位置：淡出淡入，不滑動 */
  const maybeMove = (t) => {
    const now = performance.now();
    if (now < LB.next) return;
    LB.next = now + 500;
    const R = LB.rect;
    const [x, y, r] = t;
    const pad = 8;
    const overlap = x + r > R.left - pad && x - r < R.left + R.w + pad && y + r > R.top - pad && y - r < R.top + R.h + pad;
    let wrong = false;
    let far = false;
    if (LB.face === 'l') wrong = x > R.left;
    else if (LB.face === 'r') wrong = x < R.left + R.w;
    else if (LB.face === 'b') wrong = y < R.top + R.h;
    else if (LB.face === 't') wrong = y > R.top;
    if (!narrow() && (LB.face === 'l' || LB.face === 'r')) {
      const ex = LB.face === 'l' ? R.left : R.left + R.w;
      far = Math.hypot(ex - x, R.top + LB.nameMid - y) > 420;
    }
    if (!overlap && !wrong && !far) return;
    const card = LB.card;
    const h = LB.handle;
    LB.moving = true;
    LB.next = now + 1600;
    card.style.setProperty('--lb-delay', '0ms');
    card.classList.remove('show');
    UI.el.leader.classList.add('lost');
    setTimeout(() => {
      if (LB.handle !== h || h.closed) return;
      const t2 = readTarget();
      placeLabel(card, t2);
      if (t2) drawLeader(t2);
      card.classList.add('show');
      UI.el.leader.classList.remove('lost');
      LB.moving = false;
    }, 160);
  };

  /* ================= 餵食選單 ================= */

  UI.toggleFeed = () => {
    const pop = UI.el.feedPop;
    if (pop.classList.contains('open')) return UI.closePopovers();
    UI.updateFood();
    pop.classList.add('open');
    pop.setAttribute('aria-hidden', 'false');
    const b = document.querySelector('#dock [data-act="feed"]');
    if (b) {
      const r = b.getBoundingClientRect();
      pop.style.left = Math.max(16, Math.min(r.left, window.innerWidth - pop.offsetWidth - 16)) + 'px';
    }
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
    UI.el.feedPop.innerHTML = Object.keys(types)
      .map((k) => {
        const n = k === 'plankton' ? '∞' : String(inv[k] || 0);
        const sel = Game.foodType === k ? ' selected' : '';
        const empty = k !== 'plankton' && !(inv[k] > 0);
        return (
          '<button class="food-opt' + sel + (empty ? ' empty' : '') + '" data-food="' + k + '"' + (sel ? ' aria-current="true"' : '') + '>' +
          '<span class="food-dot food-' + k + '" aria-hidden="true"></span>' +
          '<span class="food-name"><b>' + types[k].name + '</b><small>' + (empty ? '商店可買' : esc(types[k].desc)) + '</small></span>' +
          '<span class="num food-count">' + n + '</span></button>'
        );
      })
      .join('');
    const lbl = document.querySelector('#dock [data-act="feed"] .lbl');
    if (lbl) {
      const t = Game.foodType;
      lbl.innerHTML = t === 'plankton' || !types[t] ? '餵食' : esc(types[t].name) + ' <span class="num">' + (inv[t] || 0) + '</span>';
    }
  };

  /* ================= 抽屜 ================= */

  const DOCK_ACTS = ['feed', 'breath', 'codex', 'shop', 'more'];
  const sheetRoot = () => {
    if (!UI.sheetKind) return null;
    if (DOCK_ACTS.includes(UI.sheetKind)) return UI.sheetKind;
    const back = UI.sheetBackTo || (RENDER[UI.sheetKind] && RENDER[UI.sheetKind].back);
    return DOCK_ACTS.includes(back) ? back : null;
  };
  const markCurrent = () => {
    const root = sheetRoot();
    document.querySelectorAll('#dock .dock-item').forEach((b) => {
      if (b.dataset.act === root) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
    if (UI.el.settingsBtn) {
      if (UI.sheetKind === 'settings') UI.el.settingsBtn.setAttribute('aria-current', 'true');
      else UI.el.settingsBtn.removeAttribute('aria-current');
    }
    document.body.classList.toggle('sheet-open', !!UI.sheetKind);
  };

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
    markCurrent();
  };

  UI.closeSheet = () => {
    UI.sheetKind = null;
    UI.cardLive = null;
    UI.bound = null;
    if (Game) Game.selectedId = null;
    if (UI.el) {
      UI.el.sheet.classList.remove('open');
      markCurrent();
    }
  };

  UI.rerender = () => {
    if (UI.sheetKind) {
      const top = UI.el.sheetBody.scrollTop;
      UI.openSheet(UI.sheetKind, UI.sheetArg, { back: UI.sheetBackTo });
      UI.el.sheetBody.scrollTop = top;
    }
  };

  /** 點水母：先在水母旁邊亮一塊說明牌；「詳細 →」才打開抽屜裡的完整名片 */
  UI.openJelly = (j) => {
    Game.tut('card');
    if (!j) return;
    const g = j.genes;
    const sp = F.SPECIES.jelly || {};
    const rows = [['特徵', '<span class="chips">' + traitChips(g) + '</span>']];
    if (j.visitor) {
      rows.push(['狀態', '野生訪客　約 ' + dur(Math.max(0, (j.leaveAt || 0) - Game.t)) + '後離開']);
    } else {
      const bar = (k) => '<div class="bar"><i data-m="' + k + '" style="width:' + Math.round(U.clamp(j[k], 0, 1) * 100) + '%"></i></div>';
      rows.push(['飽足', bar('fullness'), 'dd-bar']);
      rows.push(['開心', bar('happy'), 'dd-bar']);
      rows.push(['來到這裡', '<span class="num">' + dateStr(j.born) + '</span>']);
    }
    const detail = { label: '詳細 →', onClick: () => UI.openSheet('jelly', j) };
    UI.label({
      target: Game.targetOf(j),
      no: j.no,
      status: j.visitor ? '訪客' : j.stage,
      words: j.name,
      line: '海月水母',
      latin: sp.latin,
      latinUp: sp.latinUp === true,
      rows,
      actions: j.visitor ? [detail] : [{ label: '摸摸', keep: true, onClick: () => Game.petButton(j.id) }, detail],
      update: (card) => {
        card.querySelectorAll('[data-m]').forEach((el) => (el.style.width = Math.round(U.clamp(j[el.dataset.m], 0, 1) * 100) + '%'));
      },
    });
  };

  /** 每 0.4 秒更新會變動的數字：抽屜裡的名片、說明牌的長條、底座的心情方塊 */
  UI.refreshBound = () => {
    // 今天還沒記過：心情方塊寫「記下心情」；記過之後是「心情」。不用小點、不脈動
    const fb = UI.el && UI.el.feelBtn;
    if (fb && Game) {
      const E = Game.state.entries;
      const done = E.length > 0 && U.today(new Date(E[E.length - 1].t)) === U.today();
      const txt = done ? '心情' : '記下心情';
      const lbl = fb.querySelector('.lbl') || fb;
      if (lbl.textContent !== txt) lbl.textContent = txt;
      // 給測試與其他檔案讀的狀態（沒有任何樣子）
      if (fb.classList.contains('nudge') === done) fb.classList.toggle('nudge', !done);
    }
    if (LB.handle && !LB.handle.closed && LB.opts && LB.opts.update && LB.card) LB.opts.update(LB.card);
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
        const txt = br.ok ? '' : '還不能配對：' + br.reason;
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
      if (cap) cap.textContent = Game.residentCount() + '/' + Game.capacity();
    }
    if (UI.sheetKind === 'roster') {
      UI.el.sheetBody.querySelectorAll('[data-remaining]').forEach((el) => {
        const p = Game.polyps.find((q) => q.id === el.dataset.remaining);
        if (p) el.textContent = '約 ' + dur(p.remaining) + '後孵化';
      });
    }
  };

  /* ---------- 肖像：直角的標本窗（底色 --plate） ---------- */
  const portraitCache = new Map();
  let plateColor = null;
  UI.portrait = (genes, growth = 1, size = 96) => {
    const key = genes.seed + '|' + genes.hue.toFixed(0) + genes.shape + genes.pattern + (genes.special || '') + '|' + growth.toFixed(2) + '|' + size;
    let url = portraitCache.get(key);
    if (url) return url;
    const c = document.createElement('canvas');
    MJ.Jelly.portrait(c, genes, growth, size);
    try {
      if (!plateColor) plateColor = getComputedStyle(document.documentElement).getPropertyValue('--plate').trim() || '#0f161b';
      const ctx = c.getContext('2d');
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = plateColor;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.restore();
      url = c.toDataURL();
    } catch (e) {
      url = '';
    }
    portraitCache.set(key, url);
    return url;
  };
  const portraitImg = (genes, growth, size, cls = 'portrait') =>
    '<img class="' + cls + '" src="' + UI.portrait(genes, growth, size) + '" width="' + size + '" height="' + size + '" alt="">';

  /** 特徵：方形色票＋顏色、傘形、花紋、體質（純文字） */
  const traitChips = (g) => {
    const d = Gn.describe(g);
    let html = '<span class="chip"><i class="sw" style="background:' + colorCss(g) + '"></i>' + d.colorName + '</span>';
    html += '<span class="chip">' + d.shapeName + '</span>';
    html += '<span class="chip">' + d.patternName + '</span>';
    if (d.specialName) html += '<span class="chip">' + d.specialName + '</span>';
    return html;
  };

  const RENDER = {};
  UI.RENDER = RENDER;

  /* ================= 對話牌（最後手段） ================= */

  /** 專線：從「更多」打開。和儀式裡的危機畫面是同一個元件（careHTML 不改） */
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
            (o.img ? '<img class="portrait m-portrait" src="' + o.img + '" alt="">' : '') +
            '<h2 class="m-title" id="mTitle">' + esc(o.title) + '</h2>' +
            (o.text ? '<p class="m-text">' + esc(o.text) + '</p>' : '') +
            '<div class="btn-row"><button class="btn-3" data-r="0">' + esc(o.cancel || '取消') + '</button>' +
            '<button class="' + (o.danger ? 'btn-2 danger' : 'btn') + '" data-r="1">' + esc(o.ok || '確定') + '</button></div>';
          card.setAttribute('aria-labelledby', 'mTitle');
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
            '<h2 class="m-title" id="mTitle">' + esc(o.title) + '</h2>' +
            '<form class="m-form" id="promptForm"><input id="promptInput" class="lined" maxlength="' + (o.max || 20) + '" value="' + esc(o.value || '') + '" aria-labelledby="mTitle" autocomplete="off">' +
            '<div class="btn-row"><button type="button" class="btn-3" data-r="0">取消</button><button type="submit" class="btn">好</button></div></form>';
          card.setAttribute('aria-labelledby', 'mTitle');
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

  /** 拍好的照片：一張紙（照片放在標本窗，下面一行圖說） */
  UI.photoResult = (url) => {
    UI.showModal(
      (card, close) => {
        const now = new Date();
        let html = '';
        if (url) {
          html += '<img class="photo" src="' + url + '" alt="水族箱的照片">';
          html += '<p class="photo-cap"><span class="num">' + now.getFullYear() + '.' + pad2(now.getMonth() + 1) + '.' + pad2(now.getDate()) + ' ' + hhmm(now) + '</span><span>海月水母館</span></p>';
          if (!(UI.downloads || !U.inFrame)) html += '<p class="m-text">長按或右鍵點圖片另存</p>';
        } else html += '<p class="m-text">這個瀏覽器無法把畫面存成圖片。請用系統的截圖。</p>';
        html += '<div class="btn-row"><button class="btn-3" data-r="done">不用了</button><button class="btn-2" data-r="ok">繼續拍</button>';
        if (url && (UI.downloads || !U.inFrame)) html += '<button class="btn" data-r="save">存下來</button>';
        html += '</div>';
        card.innerHTML = html;
        const saveBtn = card.querySelector('[data-r="save"]');
        if (saveBtn) saveBtn.addEventListener('click', () => UI.savePhoto(url));
        card.querySelector('[data-r="ok"]').addEventListener('click', () => close());
        card.querySelector('[data-r="done"]').addEventListener('click', () => {
          close();
          Game.stopPhoto();
        });
      },
      { cls: 'paper photo-card' }
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
        UI.toast('照片已存下');
      } catch (e) {
        const code = e && e.code;
        if (code === 'declined') return;
        if (code === 'rate_limited') UI.toast('上一個存檔視窗還開著');
        else UI.toast('無法直接下載', 'soft', '長按或右鍵點圖片另存');
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
    if (m) {
      document.body.classList.add('mode-' + m);
      // 模式裡不留說明牌
      if (UI.modalOpenNow && SOFT[UI.modalKind]) UI.closeModal();
    }
  };

  UI.breathStart = (b) => {
    UI.closeSheet();
    UI.closePopovers();
    setMode('breath');
    UI.breathInfo = { cycles: b.cycles, t0: Date.now() };
    $('breathUI').hidden = false;
    UI.breathStep($('breathWord').textContent, b);
  };
  UI.breathStep = (word, b) => {
    const w = $('breathWord');
    w.textContent = word;
    w.classList.remove('pop');
    void w.offsetWidth;
    w.classList.add('pop');
    $('breathCycle').innerHTML = '第 <span class="num">' + Math.min(b.cycle + 1, b.cycles) + '/' + b.cycles + '</span> 輪　' + esc(b.pat.name);
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
    if (done) {
      const info = UI.breathInfo || { cycles: 0, t0: Date.now() };
      const sec = Math.round((Date.now() - info.t0) / 1000);
      UI.toast('呼吸 ' + info.cycles + ' 輪，' + Math.floor(sec / 60) + ':' + pad2(sec % 60), 'soft', reward ? '+' + reward + ' 光' : null);
    }
  };

  UI.sleepStart = (min) => {
    UI.closePopovers();
    UI.closeSheet();
    setMode('sleep');
    $('sleepUI').hidden = false;
    $('sleepLine').textContent = U.pick(C.sleepLines);
    $('sleepSub').textContent = '音樂 ' + min + ' 分鐘內漸弱。點畫面：叫出按鈕';
    UI.sleepTick(true);
    UI.sleepPeek();
  };
  UI.sleepTick = (force) => {
    const t = hhmm(Date.now());
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
    UI.toast('晚安模式結束　' + hhmm(Date.now()));
  };

  UI.photoStart = () => {
    UI.closePopovers();
    UI.closeSheet();
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

  /* ================= 給其他介面檔案共用的小工具 ================= */

  const SPECIES_ICON = { larva: 'larva', jelly: 'allow', crab: 'reframe', lantern: 'need', clown: 'kind', turtle: 'step', seahorse: 'ground', tears: 'release', coral: 'savor', bottle: 'keep', oyster: 'pearl', octopus: 'octo' };
  const SPECIES_HUE = { larva: 200, jelly: 222, crab: 30, lantern: 268, clown: 340, turtle: 100, seahorse: 300, tears: 186, coral: 48, bottle: 160, oyster: 45, octopus: 15 };
  const KIND_SPECIES = { larva: 'larva', crab: 'crab', shell: 'crab', lantern: 'lantern', clown: 'clown', anemone: 'clown', turtle: 'turtle', seahorse: 'seahorse', coral: 'coral', oyster: 'oyster', octopus: 'octopus', bottle: 'bottle' };

  /** 家族：色點永遠搭配名字；「說不上來」是虛線圈（紙上自動換成顏料色，見 sea.css .paper .fam） */
  const famChip = (f) => {
    const fam = F.FAMILIES[f];
    if (!fam) return '';
    return '<span class="fam"><i class="dot' + (f === 'fog' ? ' fog' : '') + '" style="--c:var(--f-' + f + ')"></i>' + fam.name + '</span>';
  };
  /** 陪法：介面上不上色，只有字 */
  const turnChip = (t, extra = '') => (F.TURNS[t] ? '<span class="chip turn-chip">' + F.TURNS[t].name + extra + '</span>' : '');

  UI.h = { U, Gn, C, A, F, esc, icon, $, noteName, dateStr, starsHTML, colorCss, portraitImg, traitChips, timeStr, famChip, turnChip, SPECIES_ICON, SPECIES_HUE, KIND_SPECIES, hhmm, dur };
  const initHooks = [];
  UI.onInit = (fn) => initHooks.push(fn);

  MJ.UI = UI;
})((window.MJ = window.MJ || {}));
