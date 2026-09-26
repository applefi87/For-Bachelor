/* 海月水母館 — 遊戲本體：主迴圈、輸入、經濟、事件、繁殖、呼吸、晚安、拍照 */
(function (MJ) {
  'use strict';

  const U = MJ.U;
  const Gn = MJ.Genes;
  const A = MJ.Audio;
  const C = MJ.Content;
  const F = MJ.Feelings;

  const DAY = 86400000;
  const TANK = [6, 9, 12, 16];
  const TANK_PRICE = [400, 1200, 3000];
  const BREED_COOLDOWN = 4 * 60 * 1000;
  const MAX_POLYPS = 3;
  const OFFLINE_CAP = 6 * 3600;
  const OFFLINE_EFF = 0.15;
  // 光是稀有的：水母慢慢發光，一天裡真正會讓你停下來的，是幾件小事
  const RATE_K = 0.04;
  const RITUAL_LIGHT = 30;
  const RITUAL_DAILY = 3;
  const BREATH_DAILY = 3;
  const ORIGIN_MAX = 12;

  const BREATHS = {
    relax: { name: '放鬆', label: '4・2・6', desc: '吐氣比吸氣長，身體會自己慢下來。', seq: [['in', 4], ['hold', 2], ['out', 6]] },
    sleep: { name: '助眠', label: '4・7・8', desc: '睡不著的時候，試試看這個節奏。', seq: [['in', 4], ['hold', 7], ['out', 8]] },
    box: { name: '方塊', label: '4・4・4・4', desc: '要專心之前，先把心收攏。', seq: [['in', 4], ['hold', 4], ['out', 4], ['rest', 4]] },
  };
  const BREATH_WORDS = { in: '吸氣', hold: '停住', out: '慢慢吐氣', rest: '停一下' };

  const SHOP_FOOD = {
    star: { qty: 5, price: 50 },
    dew: { qty: 3, price: 55 },
  };

  const ACH = [
    ['first_feed', '第一口', '第一次餵水母吃東西', 10, (s) => s.stats.feeds >= 1],
    ['feed_100', '浮游生物大師', '餵食 100 次', 80, (s) => s.stats.feeds >= 100],
    ['pet_10', '軟軟的', '摸摸水母 10 次', 20, (s) => s.stats.pets >= 10],
    ['pet_200', '水母知己', '摸摸水母 200 次', 150, (s) => s.stats.pets >= 200],
    ['worry_10', '輕一點了', '陪了 10 份感覺', 120, (s) => s.stats.rituals >= 10],
    ['worry_50', '潮來潮往', '陪了 50 份感覺', 300, (s) => s.stats.rituals >= 50],
    ['breath_1', '深呼吸', '完成一次呼吸練習', 30, (s) => s.stats.breaths >= 1],
    ['breath_10', '潮汐之心', '完成 10 次呼吸練習', 200, (s) => s.stats.breaths >= 10],
    ['catch_1', '撈到了', '第一次撈到野生水母', 20, (s) => s.stats.catches >= 1],
    ['hatch_1', '新生命', '第一隻水母寶寶出生', 50, (s) => s.stats.hatched >= 1],
    ['hatch_10', '大家族', '十隻水母寶寶出生', 300, (s) => s.stats.hatched >= 10],
    ['release_1', '回到大海', '第一次讓水母回到大海', 30, (s) => s.stats.released >= 1],
    ['codex_10', '小小研究員', '圖鑑發現 10 項', 100, (s) => Object.keys(s.codex).length >= 10],
    ['codex_25', '海洋學家', '圖鑑發現 25 項', 400, (s) => Object.keys(s.codex).length >= 25],
    ['codex_all', '海月博士', '圖鑑全部完成', 800, (s) => Object.keys(s.codex).length >= Gn.codexTotal()],
    ['special_1', '奇蹟', '第一次遇見特殊體質的水母', 150, (s) => Object.keys(s.codex).some((k) => k.startsWith('special:'))],
    ['streak_3', '常來玩', '來看水母 3 天（不用連續）', 60, (s) => Object.keys(s.visits || {}).length >= 3],
    ['streak_7', '一週的潮汐', '來看水母 7 天（不用連續）', 300, (s) => Object.keys(s.visits || {}).length >= 7],
    ['decor_5', '小小造景師', '擁有 5 個裝飾', 100, (s) => s.decor.length >= 5],
    ['theme_2', '換個風景', '擁有第二個主題', 50, (s) => s.themes.length >= 2],
    ['tank_max', '大海的一角', '把水族箱升到最大', 500, (s) => s.tank >= TANK.length - 1],
    ['family_12', '熱熱鬧鬧', '同時養 12 隻水母', 250, (s, g) => g.tankJellies().length >= 12],
    ['star', '許個願', '接住一顆流星', 40, (s) => !!s.flags.star],
    ['bubbles_50', '戳泡泡', '戳破 50 顆泡泡', 60, (s) => s.stats.bubbles >= 50],
    ['sleep', '晚安', '第一次使用晚安模式', 30, (s) => s.stats.sleeps >= 1],
    ['photo', '留念', '第一次拍下水族箱', 20, (s) => s.stats.photos >= 1],
    ['light_10k', '萬家燈火', '累積獲得 10,000 光', 300, (s) => s.lifetimeLight >= 10000],
    ['ritual_1', '替它取名字', '第一次替一份感覺取名字', 20, (s) => s.stats.rituals >= 1],
    ['words_20', '說得很準', '用過 20 個不同的感覺字', 120, (s) => new Set([].concat(...s.entries.map((e) => e.words || []))).size >= 20],
    ['step_1', '小事做到了', '完成一件小事', 40, (s) => s.stats.stepsDone >= 1],
    ['chain', '空缺鏈', '看見寄居蟹一個接一個換殼', 30, (s) => !!s.flags.chain],
  ].map(([id, name, desc, reward, test]) => ({ id, name, desc, reward, test }));

  const TUTORIAL = [
    ['feed', '點一下水面，撒點浮游生物給水母吃。'],
    ['pet', '按住水母輕輕滑動，就能摸摸牠。'],
    ['card', '點一下水母，看看牠的名片。'],
    ['worry', '有感覺的時候，按下方的「心情」，把它倒進海裡。'],
  ];

  const Game = {
    W: 0,
    H: 0,
    dpr: 1,
    unit: 1,
    t: 0,
    mode: 'normal',
    foodType: 'plankton',
    jellies: [],
    polyps: [],
    sing: false,
    started: false,
    rate: 0,
    mating: null,
    swarm: null,
    bottle: null,
    star: null,
    bubbleRain: 0,
    selectedId: null,
    hoverJelly: null,
    BREATHS,
    TANK,
    TANK_PRICE,
    SHOP_FOOD,
    ACH,
  };

  /* ================= 初始化 ================= */

  Game.init = () => {
    const canvas = document.getElementById('sea');
    Game.canvas = canvas;
    Game.ctx = canvas.getContext('2d', { alpha: false });
    const s = (Game.state = MJ.Store.load());
    s.flags = s.flags || {};
    if (!s.tutorial || typeof s.tutorial !== 'object') s.tutorial = {};
    if (!Array.isArray(s.entries)) s.entries = [];
    s.eco = Object.assign({ gifts: [], species: {}, lastReturn: 0, lastRecap: 0 }, s.eco || {});
    A.configure(s.settings);

    Game.world = new MJ.World();
    Game.world.setTheme(s.theme, true);
    Game.fx = new MJ.FX();
    Game.food = new MJ.Food(Game);
    Game.resize();

    Game.jellies = s.jellies.map((d) => new MJ.Jelly(d, Game));
    Game.polyps = s.polyps.map((d) => new MJ.Polyp(d));
    if (s.fresh || (!Game.jellies.length && !Game.polyps.length)) Game.seedStarter();
    else Game.offline = Game.catchUp((Date.now() - s.lastSeen) / 1000, true);
    Game.eco = new MJ.Eco(Game);
    Game.eco.rebuild(false);
    Game.eco.onGiftArrive = Game.onGiftArrive;
    Game.applyMood();
    Game.nextEvent = U.rand(40, 70);
    Game.achTimer = 2;
    Game.ecoTimer = 60;
    Game.stepTimer = 20;

    Game.bindInput();
    MJ.UI.init(Game);
    MJ.Ritual.init(Game);

    let rz;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(Game.resize, 120);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        Game.hiddenAt = Date.now();
        Game.save();
      } else if (Game.hiddenAt) {
        const sec = (Date.now() - Game.hiddenAt) / 1000;
        Game.hiddenAt = 0;
        Game.lastFrame = performance.now();
        if (sec > 20 && Game.started) {
          const r = Game.catchUp(sec, false);
          if (r && r.gain > 0) MJ.UI.toast('離開的 ' + U.duration(sec) + '裡，水母們發了 ' + U.fmt(r.gain) + ' 光。');
        }
      }
    });
    window.addEventListener('pagehide', Game.save);
    setInterval(Game.save, 8000);

    Game.lastFrame = performance.now();
    requestAnimationFrame(Game.frame);
  };

  Game.seedStarter = () => {
    const s = Game.state;
    const names = [];
    const base = U.rand(360);
    for (let i = 0; i < 3; i++) {
      const g = Gn.random({ starter: true });
      g.hue = U.wrapHue(base + i * 120 + U.rand(-20, 20));
      g.hue2 = U.wrapHue(g.hue + U.pick([0, 20, -20, 40]));
      const name = Gn.makeName(names);
      names.push(name);
      const j = new MJ.Jelly({ genes: g, name, growth: 1, fullness: 0.6, happy: 0.6 }, Game);
      Game.jellies.push(j);
      Game.register(j.genes, true, true);
    }
    const pg = Gn.random({ starter: true });
    pg.pattern = 'dots';
    Game.polyps.push(new MJ.Polyp({ genes: pg, x: 0.5 + U.rand(-0.2, 0.2), progress: 0.3, duration: 70, parents: null }));
    s.light = 50;
  };

  Game.resize = () => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    if (W * H > 2000000) dpr = Math.min(dpr, 1.5);
    const oldW = Game.W;
    const oldH = Game.H;
    Game.W = W;
    Game.H = H;
    Game.dpr = dpr;
    Game.canvas.width = Math.round(W * dpr);
    Game.canvas.height = Math.round(H * dpr);
    Game.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Game.unit = U.clamp(Math.min(W, H) / 760, 0.62, 1.35);
    Game.world.resize(W, H, dpr, Game.unit);
    if (oldW && oldH) {
      for (const j of Game.jellies) {
        j.x *= W / oldW;
        j.y *= H / oldH;
        j.target = null;
        j.buildTentacles();
      }
    }
  };

  /* ================= 經濟 ================= */

  Game.jellyRate = (j) => {
    const g = j.genes;
    if (j._stars == null) j._stars = Gn.stars(g);
    if (j.origin) return 0;
    return (
      RATE_K *
      (0.05 + 0.13 * j.growth) *
      (0.6 + 0.8 * g.glow) *
      (0.55 + 0.35 * j.fullness + 0.3 * j.happy) *
      Math.sqrt(g.size) *
      (1 + (j._stars - 1) * 0.15) *
      (g.special ? 1.5 : 1)
    );
  };

  Game.residentJellies = () => Game.jellies.filter((j) => !j.visitor && !j.leaving);
  /** 佔水族箱名額的水母：心情變成的水母不算，牠們是另外住在這裡的 */
  Game.tankJellies = () => Game.jellies.filter((j) => !j.visitor && !j.leaving && !j.origin);
  Game.residentCount = () => Game.tankJellies().length + Game.polyps.length;
  Game.capacity = () => TANK[Game.state.tank] || TANK[0];

  Game.incomeRate = () => {
    let r = 0;
    for (const j of Game.jellies) if (!j.visitor && !j.leaving && !j.origin) r += Game.jellyRate(j);
    return r;
  };

  Game.addLight = (n) => {
    if (!(n > 0)) return;
    Game.state.light += n;
    Game.state.lifetimeLight += n;
  };

  Game.spend = (n) => {
    if (Game.state.light < n) return false;
    Game.state.light -= n;
    return true;
  };

  /** 離開一段時間後補上進度 */
  Game.catchUp = (sec, silent) => {
    if (!(sec > 20)) return null;
    const eff = Math.min(sec, OFFLINE_CAP);
    const gain = Math.floor(Game.incomeRate() * eff * OFFLINE_EFF);
    Game.addLight(gain);
    let grown = 0;
    for (const j of Game.jellies) {
      if (j.visitor) continue;
      j.fullness = Math.max(0.25, j.fullness - eff * 0.0011);
      if (j.growth < 1) {
        j.growth = Math.min(1, j.growth + eff * 0.0035);
        if (j.growth >= 1) grown++;
      }
    }
    const born = [];
    for (const p of Game.polyps.slice()) {
      p.progress = Math.min(1, p.progress + sec / p.duration);
      if (p.progress >= 1) born.push(Game.hatch(p, silent));
    }
    for (const j of born) {
      const rest = Math.max(0, sec - 60);
      j.growth = Math.min(1, j.growth + rest * 0.003);
    }
    return { sec, gain, grown, born };
  };

  /* ================= 主迴圈 ================= */

  Game.frame = (ts) => {
    const dt = Math.min(0.05, Math.max(0, (ts - Game.lastFrame) / 1000));
    Game.lastFrame = ts;
    try {
      Game.update(dt);
      Game.render();
    } catch (e) {
      if (!Game._errShown) {
        Game._errShown = true;
        console.error(e);
      }
    }
    requestAnimationFrame(Game.frame);
  };

  Game.update = (dt) => {
    const s = Game.state;
    Game.t += dt;
    const w = Game.world;
    const dimTarget = Game.mode === 'sleep' ? 0.62 : Game.mode === 'breath' ? 0.25 : 0;
    w.dim += (dimTarget - w.dim) * Math.min(1, dt * 0.8);
    w.update(dt, Game.t);
    for (const d of s.decor) MJ.Decor.update(d, dt, w, Game);
    Game.food.update(dt);
    Game.assignWorries();

    Game.sing = Game.started && s.settings.sing && s.settings.music;
    let adults = 0;
    for (const j of Game.jellies) {
      j.update(dt, Game);
      if (j.adult && !j.visitor) adults++;
    }
    A.singers = adults;
    Game.separate(dt);
    Game.eco.update(dt);
    Game.ecoTimer -= dt;
    if (Game.ecoTimer <= 0) {
      // 定時重建：幼生、藍眼淚、寄居蟹都會隨時間慢慢變化
      Game.ecoTimer = 60;
      Game.handleEcoEvents(Game.eco.rebuild(false));
    }
    if (Game.started && Game.mode === 'normal') {
      Game.stepTimer -= dt;
      if (Game.stepTimer <= 0) {
        Game.stepTimer = 300;
        Game.checkSteps();
      }
    }

    for (let i = Game.jellies.length - 1; i >= 0; i--) {
      const j = Game.jellies[i];
      if (j.visitor && !j.leaving && Game.t > j.leaveAt) {
        j.leaving = true;
        if (Game.selectedId === j.id) MJ.UI.closeSheet();
      }
      if (j.leaving && j.fade <= 0.01) {
        Game.jellies.splice(i, 1);
        if (Game.hoverJelly === j) Game.hoverJelly = null;
      }
    }

    for (const p of Game.polyps.slice()) {
      p.update(dt);
      if (p.progress >= 1) Game.hatch(p, false);
    }

    if (Game.mating) Game.updateMating();
    Game.fx.update(dt);

    Game.rate = Game.incomeRate();
    if (Game.mode !== 'photo') Game.addLight(Game.rate * dt);

    if (Game.started && Game.mode === 'normal') {
      Game.nextEvent -= dt;
      if (Game.nextEvent <= 0) {
        Game.fireEvent();
        Game.nextEvent = U.rand(150, 300);
      }
    }
    Game.updateEvents(dt);
    if (Game.mode === 'breath') Game.updateBreath(dt);

    Game.achTimer -= dt;
    if (Game.achTimer <= 0) {
      Game.achTimer = 2;
      Game.checkAchievements();
    }
    MJ.UI.frame(dt);
  };

  Game.separate = (dt) => {
    const L = Game.jellies;
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      for (let k = i + 1; k < L.length; k++) {
        const b = L[k];
        if (a.mateWith === b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = (a.bellW + b.bellW) * 0.55;
        const d2 = dx * dx + dy * dy;
        if (d2 < min * min && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const push = ((min - d) / min) * 40 * dt;
          a.vx -= (dx / d) * push;
          a.vy -= (dy / d) * push;
          b.vx += (dx / d) * push;
          b.vy += (dy / d) * push;
        }
      }
    }
  };

  Game.render = () => {
    const ctx = Game.ctx;
    const w = Game.world;
    w.drawBack(ctx);
    const arranging = Game.mode === 'arrange';
    for (const d of Game.state.decor) MJ.Decor.draw(ctx, d, w, Game.t, arranging);
    for (const p of Game.polyps) p.draw(ctx, w);
    Game.eco.drawFloor(ctx);
    Game.drawBottle(ctx);
    Game.food.draw(ctx);
    Game.eco.drawMid(ctx);

    let selected = null;
    for (const j of Game.jellies) {
      if (j.id === Game.selectedId) selected = j;
      else j.draw(ctx, Game);
    }
    // 說明牌開著的那隻畫在最上面；圈和細線由說明牌自己畫（callout.js）
    if (selected) selected.draw(ctx, Game);
    Game.fx.draw(ctx);
    Game.eco.drawTop(ctx);
    Game.drawSwarm(ctx);
    Game.drawStar(ctx);
    w.drawFront(ctx);
    const label = Game.hoverJelly || (Game.pointer.target && Game.pointer.target.kind === 'jelly' && Game.pointer.moved > 6 ? Game.pointer.target.j : null);
    if (label && Game.mode === 'normal' && label.id !== Game.selectedId) Game.drawLabel(ctx, label);
  };

  Game.drawLabel = (ctx, j) => {
    const [cx, cy] = j.center();
    const y = cy - Math.max(j.bellW, j.bellH) * 0.75 - 14;
    const text = j.visitor ? '野生的訪客' : j.name;
    ctx.save();
    ctx.font = '600 14px ' + MJ.FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 18;
    ctx.fillStyle = 'rgba(6,20,34,0.7)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx - w / 2, y - 12, w, 24, 12);
    else ctx.rect(cx - w / 2, y - 12, w, 24);
    ctx.fill();
    ctx.fillStyle = 'rgba(236,246,248,0.95)';
    ctx.fillText(text, cx, y + 0.5);
    ctx.restore();
  };

  /* ================= 輸入 ================= */

  Game.pointer = { down: false, target: null, moved: 0 };

  Game.bindInput = () => {
    const c = Game.canvas;
    const P = Game.pointer;
    c.addEventListener('pointerdown', (e) => {
      if (!Game.started) return;
      if (Game.mode === 'sleep') {
        MJ.UI.sleepPeek();
        return;
      }
      if (Game.mode === 'photo' || Game.mode === 'breath') return;
      e.preventDefault();
      MJ.UI.closePopovers();
      const x = e.clientX;
      const y = e.clientY;
      P.down = true;
      P.id = e.pointerId;
      P.x = P.sx = P.lx = x;
      P.y = P.sy = P.ly = y;
      P.t0 = performance.now();
      P.moved = 0;
      P.petDist = 0;
      try {
        c.setPointerCapture(e.pointerId);
      } catch (err) {
        /* 某些瀏覽器不支援，沒關係 */
      }
      if (Game.tryCollect(x, y)) {
        P.target = { kind: 'collected' };
        return;
      }
      if (Game.mode === 'arrange') {
        const d = Game.decorAt(x, y);
        P.target = d ? { kind: 'decor', d, off: x - d.x * Game.W } : { kind: 'none' };
        return;
      }
      const j = Game.jellyAt(x, y);
      if (j) {
        P.target = { kind: 'jelly', j };
        return;
      }
      const eco = Game.eco.hit(x, y);
      if (eco) {
        P.target = { kind: 'eco', c: eco };
        return;
      }
      // 點到水、水螅體、瓶子或裝飾：說明牌收起來
      MJ.UI.callout.close();
      const p = Game.polyps.find((q) => q.hit(x, y, Game.world));
      if (p) {
        P.target = { kind: 'polyp', p };
        return;
      }
      if (Game.bottle && Game.bottleHit(x, y)) {
        P.target = { kind: 'bottle' };
        return;
      }
      const d = Game.decorAt(x, y);
      if (d && MJ.Decor.DEFS[d.type].tap) {
        P.target = { kind: 'decorTap', d };
        return;
      }
      P.target = { kind: 'water' };
    });

    const move = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      P.hx = x;
      P.hy = y;
      P.moveT = Game.eco ? Game.eco.t : 0;
      if (Game.started && (P.down || e.pointerType === 'mouse') && Game.eco) Game.eco.disturb(x, y);
      if (!P.down) {
        if (Game.started && Game.mode === 'normal' && e.pointerType === 'mouse') {
          const j = Game.jellyAt(x, y);
          Game.hoverJelly = j;
          c.style.cursor = j ? 'grab' : 'pointer';
        }
        return;
      }
      if (e.pointerId !== P.id) return;
      const dist = Math.hypot(x - P.lx, y - P.ly);
      P.moved += dist;
      P.lx = x;
      P.ly = y;
      P.x = x;
      P.y = y;
      const tg = P.target;
      if (!tg) return;
      if (tg.kind === 'jelly' && P.moved > 6) {
        c.style.cursor = 'grabbing';
        tg.j.petTarget = { x, y };
        Game.petTick(tg.j, dist);
      } else if (tg.kind === 'water' && P.moved > 14 && Game.mode === 'normal') {
        const gap = 42 * Game.unit;
        if (Math.hypot(x - (P.dropX == null ? P.sx : P.dropX), y - (P.dropY == null ? P.sy : P.dropY)) > gap) {
          P.dropX = x;
          P.dropY = y;
          if (Game.feedAt(x, y, true)) A.tapNote(x / Game.W, (x / Game.W) * 2 - 1);
        }
      } else if (tg.kind === 'decor') {
        tg.d.x = U.clamp((x - tg.off) / Game.W, 0.04, 0.96);
      }
    };
    window.addEventListener('pointermove', move, { passive: true });

    const up = (e) => {
      if (!P.down || e.pointerId !== P.id) return;
      P.down = false;
      const tg = P.target;
      const quick = P.moved < 12 && performance.now() - P.t0 < 500;
      if (tg) {
        if (tg.kind === 'jelly') {
          tg.j.petTarget = null;
          c.style.cursor = 'grab';
          if (quick) MJ.UI.openJelly(tg.j);
        } else if (tg.kind === 'water' && P.moved < 14 && e.type !== 'pointercancel') {
          Game.tapWater(P.x, P.y);
        } else if (tg.kind === 'polyp' && quick) {
          const p = tg.p;
          MJ.UI.toast(p.stageName + '・還要大約 ' + U.duration(p.remaining) + ' 就會孵化' + (p.parents ? '（' + p.parents.join(' × ') + ' 的孩子）' : '') + '。');
        } else if (tg.kind === 'bottle' && quick) {
          Game.openBottle();
        } else if (tg.kind === 'decorTap' && quick) {
          Game.tapDecor(tg.d);
        } else if (tg.kind === 'eco' && quick) {
          Game.tapCreature(tg.c);
        } else if (tg.kind === 'eco' && P.moved >= 12) {
          Game.eco.disturb(P.x, P.y);
        }
      }
      P.target = null;
      P.dropX = P.dropY = null;
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', () => {
      if (!P.down) Game.hoverJelly = null;
    });
  };

  Game.jellyAt = (x, y) => {
    for (let i = Game.jellies.length - 1; i >= 0; i--) {
      const j = Game.jellies[i];
      if (!j.leaving && j.fade > 0.3 && j.hit(x, y)) return j;
    }
    return null;
  };

  Game.decorAt = (x, y) => {
    const list = Game.state.decor;
    for (let i = list.length - 1; i >= 0; i--) if (MJ.Decor.hit(list[i], x, y, Game.world)) return list[i];
    return null;
  };

  Game.tapWater = (x, y) => {
    Game.fx.ripple(x, y);
    A.tapNote(x / Game.W, (x / Game.W) * 2 - 1);
    Game.feedAt(x, y, false);
  };

  Game.feedAt = (x, y, stroke) => {
    const s = Game.state;
    let type = Game.foodType;
    if (type !== 'plankton') {
      if ((s.inventory[type] || 0) <= 0) {
        type = Game.foodType = 'plankton';
        MJ.UI.updateFood();
      } else {
        s.inventory[type]--;
        if (s.inventory[type] <= 0) {
          Game.foodType = 'plankton';
          MJ.UI.toast(MJ.Food.TYPES[type].name + '用完了，可以到商店補貨。');
        }
        MJ.UI.updateFood();
      }
    }
    const ok = Game.food.drop(type, x, y);
    if (ok && (!stroke || type !== 'plankton' || Math.random() < 0.34)) s.stats.feeds++;
    Game.tut('feed');
    return ok;
  };

  Game.petTick = (j, dist) => {
    const s = Game.state;
    j.petGlow = Math.min(1, j.petGlow + dist * 0.004);
    j.happy = Math.min(1, j.happy + dist * 0.0004);
    j.petAcc = (j.petAcc || 0) + dist;
    if (j.petAcc > 34) {
      j.petAcc = 0;
      const [cx, cy] = j.center();
      Game.fx.hearts(cx, cy - j.bellH * 0.3, 1, 345);
      j.affection += 0.3;
      if (Game.t - (Game.lastChime || 0) > 0.22) {
        Game.lastChime = Game.t;
        A.chime((cx / Game.W) * 2 - 1);
      }
    }
    Game.pointer.petDist += dist;
    if (Game.pointer.petDist > 140) {
      Game.pointer.petDist = 0;
      s.stats.pets++;
      Game.tut('pet');
      if (Math.random() < 0.3) {
        const [cx, cy] = j.center();
        Game.fx.text(cx, cy - j.bellH, U.pick(C.petLines), '#ffd9e2', 14);
      }
    }
  };

  /** 點擊時先看有沒有可以收集的東西：流星、海螢、泡泡 */
  Game.tryCollect = (x, y) => {
    const s = Game.state;
    if (Game.star) {
      const st = Game.star;
      if (Math.hypot(x - st.x, y - st.y) < 80) {
        Game.star = null;
        const r = 20;
        Game.addLight(r);
        s.flags.star = true;
        Game.fx.spark(x, y, 50, 24, { speed: 120 });
        Game.fx.text(x, y + 26, '+' + r + ' 光・許個願吧', '#fff0b8', 16);
        A.discover();
        MJ.UI.toast('你接住了一顆流星。偷偷許個願吧。');
        return true;
      }
    }
    if (Game.swarm) {
      const sw = Game.swarm;
      let n = 0;
      for (const p of sw.pts) {
        if (!p.alive) continue;
        const px = sw.x + p.ox;
        const py = sw.y + p.oy;
        if (Math.hypot(x - px, y - py) < 70 * Game.unit + 10) {
          p.alive = false;
          n++;
          Game.fx.spark(px, py, 195, 4, { speed: 40 });
        }
      }
      if (n) {
        sw.caught = (sw.caught || 0) + n;
        const r = Math.floor(sw.caught / 2) - (sw.paid || 0);
        sw.paid = (sw.paid || 0) + r;
        if (r > 0) {
          Game.addLight(r);
          Game.fx.text(x, y - 20, '+' + r + ' 光', '#bfeaff');
        }
        A.sparkle((x / Game.W) * 2 - 1);
        return true;
      }
    }
    const bubbles = Game.world.bubbles;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (!b.bonus && !b.gold) continue;
      if (Math.hypot(x - b.x, y - b.y) < b.r + 16) {
        bubbles.splice(i, 1);
        const r = b.gold ? 2 : 1;
        Game.addLight(r);
        s.stats.bubbles++;
        Game.fx.spark(b.x, b.y, b.gold ? 46 : 190, b.gold ? 10 : 5, { speed: 50, sat: b.gold ? 0.9 : 0.3 });
        Game.fx.text(b.x, b.y - 14, '+' + r, b.gold ? '#ffe39a' : '#dff4fa', 13);
        A.bubble((b.x / Game.W) * 2 - 1, b.gold ? 1.6 : 1);
        return true;
      }
    }
    return false;
  };

  Game.tapDecor = (d) => {
    const s = Game.state;
    const now = Date.now();
    const b = MJ.Decor.bbox(d, Game.world);
    if (d.type === 'conch') {
      d._ping = Game.t;
      A.whoosh();
      A.arpeggio(12, 5, 0.14, 0.1);
      MJ.UI.toast(U.pick(['你聽見了海的聲音。', '海螺裡，有很遠很遠的浪。', '嘩——沙——嘩——沙——']));
    } else if (d.type === 'bottle') {
      const bonus = now > s.cooldowns.bottle;
      if (bonus) {
        s.cooldowns.bottle = now + 20 * 3600000;
        Game.addLight(5);
      }
      A.open();
      MJ.UI.bottleModal(Game.nextLetter(), bonus ? 5 : 0);
    } else if (d.type === 'lantern') {
      d.on = d.on === false;
      A.click();
    } else if (d.type === 'chest') {
      if (now > s.cooldowns.chest) {
        s.cooldowns.chest = now + 4 * 3600000;
        const r = U.randInt(20, 40);
        Game.addLight(r);
        Game.fx.spark(b.cx, b.y + b.h * 0.3, 46, 26, { speed: 110, up: 60, grav: 90 });
        Game.fx.text(b.cx, b.y - 12, '+' + r + ' 光', '#ffe39a', 16);
        A.discover();
      } else {
        MJ.UI.toast('寶箱還在休息，' + U.duration((s.cooldowns.chest - now) / 1000) + '後再來。');
        A.bubble(0);
      }
    }
  };

  /* ================= 食物、煩惱 ================= */

  Game.assignWorries = () => {
    for (const f of Game.food.items) {
      if (f.type !== 'worry') continue;
      const owner = f.claimedBy && Game.jellies.find((j) => j.id === f.claimedBy && !j.leaving);
      if (owner) continue;
      let best = null;
      let bd = Infinity;
      for (const j of Game.jellies) {
        if (j.visitor || j.leaving || j.mateWith) continue;
        const d = Math.hypot(j.x - f.x, j.y - f.y);
        if (d < bd) {
          bd = d;
          best = j;
        }
      }
      f.claimedBy = best ? best.id : null;
    }
  };

  Game.onEat = (j, f) => {
    Game.food.remove(f);
    const [cx, cy] = j.center();
    const pan = (cx / Game.W) * 2 - 1;
    if (f.type === 'plankton') {
      j.fullness = Math.min(1, j.fullness + 0.06);
      j.happy = Math.min(1, j.happy + 0.01);
      if (j.growth < 1) j.growth = Math.min(0.999, j.growth + 0.004);
      Game.fx.spark(cx, cy, f.hue, 3, { speed: 25 });
      if (Game.t - (Game.lastPlop || 0) > 0.12) {
        Game.lastPlop = Game.t;
        A.plop(pan);
      }
    } else if (f.type === 'star') {
      j.happy = Math.min(1, j.happy + 0.35);
      j.fullness = Math.min(1, j.fullness + 0.1);
      j.petGlow = 1;
      Game.fx.hearts(cx, cy - j.bellH * 0.3, 3, 345);
      Game.fx.spark(cx, cy, 48, 12, { speed: 60 });
      A.sparkle(pan);
    } else if (f.type === 'dew') {
      if (j.growth < 1) j.growth = Math.min(0.999, j.growth + 0.15);
      else j.happy = Math.min(1, j.happy + 0.2);
      Game.fx.ring(cx, cy, 205, 50 * Game.unit, { sat: 0.4 });
      Game.fx.spark(cx, cy, 205, 8, { speed: 40, sat: 0.4 });
      A.sparkle(pan);
    } else if (f.type === 'worry') {
      Game.digestWorry(j, f);
    }
  };

  Game.digestWorry = (j, f) => {
    if (f.entry) Game.digestEntry(j, f);
  };

  /* ================= 繁殖與孵化 ================= */

  Game.breedable = (j) => {
    if (j.visitor) return { ok: false, reason: '牠是來玩的客人' };
    if (!j.adult) return { ok: false, reason: '還沒長大，再等等' };
    if (j.fullness < 0.4) return { ok: false, reason: '肚子有點餓，先餵牠吃點東西' };
    const cd = BREED_COOLDOWN - (Date.now() - j.lastBreed);
    if (cd > 0) return { ok: false, reason: '剛當完爸媽，再休息 ' + U.duration(cd / 1000) };
    if (Game.polyps.length >= MAX_POLYPS) return { ok: false, reason: '海底已經有 ' + MAX_POLYPS + ' 個水螅體了' };
    if (Game.residentCount() >= Game.capacity()) return { ok: false, reason: '水族箱滿了，可以升級或讓一隻回到大海' };
    if (Game.mating) return { ok: false, reason: '有另一對正在約會中' };
    return { ok: true };
  };

  Game.partnersFor = (j) => Game.jellies.filter((k) => k !== j && !k.leaving && Game.breedable(k).ok);

  /** 這一對會不會觸發特別的配方（不透露是哪一個） */
  Game.feeling = (a, b) => {
    const A1 = a.genes;
    const B1 = b.genes;
    const s = Game.state;
    return (
      Math.abs(U.hueDiff(A1.hue, B1.hue)) >= 140 ||
      (A1.sat < 0.35 && B1.sat < 0.35) ||
      (Gn.colorOf(A1).id === 'gold' && Gn.colorOf(B1).id === 'gold') ||
      s.theme === 'aurora' ||
      A1.shape === B1.shape ||
      a.worryFed + b.worryFed >= 5 ||
      Date.now() - s.lastBreathAt < 5 * 60000 ||
      a.affection + b.affection >= 40 ||
      (A1.pattern === 'dots' && B1.pattern === 'dots') ||
      !!A1.special ||
      !!B1.special
    );
  };

  Game.startMate = (aId, bId) => {
    const a = Game.jellies.find((j) => j.id === aId);
    const b = Game.jellies.find((j) => j.id === bId);
    if (!a || !b || !Game.breedable(a).ok || !Game.breedable(b).ok) return false;
    a.mateWith = b;
    b.mateWith = a;
    Game.mating = { a, b, t0: Game.t };
    MJ.UI.toast('「' + a.name + '」和「' + b.name + '」正在慢慢靠近彼此……');
    return true;
  };

  Game.updateMating = () => {
    const { a, b, t0 } = Game.mating;
    if (!Game.jellies.includes(a) || !Game.jellies.includes(b) || a.leaving || b.leaving) {
      if (a) a.mateWith = null;
      if (b) b.mateWith = null;
      Game.mating = null;
      return;
    }
    const [ax, ay] = a.center();
    const [bx, by] = b.center();
    const d = Math.hypot(ax - bx, ay - by);
    if (d < (a.bellW + b.bellW) * 0.8 || Game.t - t0 > 25) Game.completeMate(a, b, (ax + bx) / 2, (ay + by) / 2);
  };

  Game.completeMate = (a, b, mx, my) => {
    const s = Game.state;
    Game.fx.hearts(mx, my, 9, 345);
    Game.fx.ring(mx, my, 340, 90 * Game.unit, { sat: 0.6 });
    A.arpeggio(5, 5, 0.12, 0.15);
    const genes = Gn.breed(a, b, { theme: s.theme, breathRecent: Date.now() - s.lastBreathAt < 5 * 60000 });
    const p = new MJ.Polyp({
      genes,
      parents: [a.name, b.name],
      x: U.clamp(mx / Game.W, 0.06, 0.94),
      progress: 0,
      duration: U.randInt(70, 95),
    });
    Game.polyps.push(p);
    a.lastBreed = b.lastBreed = Date.now();
    a.fullness = Math.max(0, a.fullness - 0.2);
    b.fullness = Math.max(0, b.fullness - 0.2);
    a.mateWith = b.mateWith = null;
    Game.mating = null;
    s.stats.breeds++;
    const special = genes.special || Gn.stars(genes) >= 4;
    MJ.UI.toast(
      '一個新的水螅體在海底住下了，大約 ' + U.duration(p.duration) + '後孵化。',
      special ? 'discover' : 'soft',
      special ? '這個水螅體，發著不太一樣的光……' : null
    );
    Game.save();
  };

  Game.hatch = (p, silent) => {
    const w = Game.world;
    const [tx, ty] = p.top(w);
    const taken = Game.jellies.map((j) => j.name);
    const j = new MJ.Jelly(
      {
        genes: p.genes,
        name: Gn.makeName(taken),
        growth: 0.02,
        fullness: 0.6,
        happy: 0.8,
        parents: p.parents,
        x: tx / Game.W,
        y: (ty - 8) / Game.H,
        fadeIn: !silent,
      },
      Game
    );
    j.vy = -18;
    Game.jellies.push(j);
    const i = Game.polyps.indexOf(p);
    if (i >= 0) Game.polyps.splice(i, 1);
    Game.state.stats.hatched++;
    const found = Game.register(j.genes, silent);
    if (!silent) {
      Game.fx.ring(tx, ty, j.genes.hue, 70 * Game.unit);
      Game.fx.spark(tx, ty, j.genes.hue, 16, { speed: 60 });
      A.hatch();
      // 呼吸、晚安、拍照的時候不跳視窗打擾，只輕輕說一聲
      if (Game.mode === 'normal' || Game.mode === 'arrange') MJ.UI.birthModal(j, found);
      else MJ.UI.toast('「' + j.name + '」出生了。', 'soft', null, () => MJ.UI.callout.show(j, { auto: true, status: '剛出生' }));
    }
    return j;
  };

  Game.register = (genes, silent, noReward) => {
    const s = Game.state;
    const found = [];
    for (const k of Gn.codexKeys(genes)) {
      if (!s.codex[k]) {
        s.codex[k] = Date.now();
        found.push(k);
      }
    }
    if (found.length) {
      let reward = 0;
      for (const k of found) reward += k.startsWith('special:') ? 60 : 10;
      if (noReward) return found;
      Game.addLight(reward);
      if (!silent) {
        A.discover();
        MJ.UI.toast('圖鑑新發現：' + found.map(Game.codexName).join('、'), 'discover', '+' + reward + ' 光');
      }
    }
    return found;
  };

  Game.codexName = (key) => {
    const [kind, id] = key.split(':');
    if (kind === 'color') return (Gn.COLORS.find((c) => c.id === id) || {}).name + '色';
    if (kind === 'shape') return Gn.SHAPES[id].name + '傘';
    if (kind === 'pattern') return Gn.PATTERNS[id].name + '紋';
    if (kind === 'special') return Gn.SPECIALS[id].name + '體質';
    return key;
  };

  Game.onGrown = (j) => {
    if (j.visitor || !Game.started) return;
    A.arpeggio(9, 3, 0.1, 0.1);
    MJ.UI.toast('「' + j.name + '」長大了！現在可以幫牠找伴侶。', 'soft', null, () => MJ.UI.callout.show(j, { auto: true, status: '長大了' }));
  };

  /* ================= 商店 ================= */

  Game.catchCost = () => Math.min(300, 60 + Game.state.stats.catches * 20);

  Game.catchWild = () => {
    const s = Game.state;
    if (Game.residentCount() >= Game.capacity()) return MJ.UI.toast('水族箱滿了。可以升級，或讓一隻水母回到大海。');
    const cost = Game.catchCost();
    if (!Game.spend(cost)) return MJ.UI.toast('光還不夠，再等一下下。');
    const g = Gn.random({ specialChance: 0.012 });
    const taken = Game.jellies.map((j) => j.name);
    const j = new MJ.Jelly(
      { genes: g, name: Gn.makeName(taken), growth: Math.random() < 0.6 ? 1 : U.rand(0.45, 0.8), fullness: 0.5, happy: 0.55, x: U.rand(0.2, 0.8), y: 0.06, fadeIn: true },
      Game
    );
    j.vy = 30 * Game.unit;
    Game.jellies.push(j);
    s.stats.catches++;
    A.whoosh();
    Game.fx.ripple(j.x, 30, 190);
    const found = Game.register(g, false);
    MJ.UI.catchModal(j, found);
    Game.save();
  };

  Game.adoptVisitor = (id) => {
    const j = Game.jellies.find((k) => k.id === id);
    if (!j || !j.visitor) return;
    if (Game.residentCount() >= Game.capacity()) return MJ.UI.toast('水族箱滿了，沒辦法留牠下來。');
    j.visitor = false;
    j.leaving = false;
    j.name = Gn.makeName(Game.jellies.map((k) => k.name));
    Game.register(j.genes, false);
    A.hatch();
    MJ.UI.toast('「' + j.name + '」決定留下來了。歡迎！');
    Game.save();
  };

  Game.upgradeTank = () => {
    const s = Game.state;
    const price = TANK_PRICE[s.tank];
    if (price == null) return;
    if (!Game.spend(price)) return MJ.UI.toast('光還不夠，再等一下下。');
    s.tank++;
    A.discover();
    MJ.UI.toast('水族箱變大了！現在可以住 ' + Game.capacity() + ' 隻。');
    Game.save();
  };

  Game.buyFood = (type) => {
    const item = SHOP_FOOD[type];
    if (!item) return;
    if (!Game.spend(item.price)) return MJ.UI.toast('光還不夠，再等一下下。');
    Game.state.inventory[type] = (Game.state.inventory[type] || 0) + item.qty;
    A.sparkle();
    MJ.UI.toast('買了 ' + item.qty + ' 份' + MJ.Food.TYPES[type].name + '。按「餵食」就可以換成它。');
    MJ.UI.updateFood();
  };

  Game.decorCount = (type) => Game.state.decor.filter((d) => d.type === type).length;

  Game.buyDecor = (type) => {
    const def = MJ.Decor.DEFS[type];
    if (!def || Game.decorCount(type) >= def.max) return;
    if (def.needsPearl && !Game.eco.pearls().length) return;
    if (!Game.spend(def.price)) return MJ.UI.toast('光還不夠，再等一下下。');
    const d = MJ.Decor.create(type, Game.freeDecorX());
    Game.state.decor.push(d);
    A.sparkle();
    MJ.UI.toast(def.name + '放好了。想換位置的話，按「調整擺設」。');
    Game.save();
  };

  /** 買一個空殼放在沙地上：最大的寄居蟹搬進去，舊殼一路往下讓（一天一個） */
  Game.SHELL_PRICE = 60;
  Game.buyShell = () => {
    const s = Game.state;
    if (s.eco.shellDay === U.today()) return;
    if (!Game.spend(Game.SHELL_PRICE)) return MJ.UI.toast('光還不夠，再等一下下。');
    s.eco.shellDay = U.today();
    s.eco.gifts.push({ id: U.uid(), type: U.pick(['moon', 'spire', 'conch', 'cowrie', 'nautilus', 'star', 'nacre']), size: U.rand(1.2, 1.45), t: Date.now(), revealAt: Date.now(), from: 'shop' });
    if (s.eco.gifts.length > 12) s.eco.gifts.shift();
    const events = Game.eco.rebuild(true);
    A.sparkle();
    if (!events.some((ev) => ev.type === 'chain')) MJ.UI.toast('空殼放在沙地上了。', 'soft', '等哪隻寄居蟹長大了，就會搬進去。');
    Game.handleEcoEvents(events);
    Game.save();
  };

  Game.freeDecorX = () => {
    const taken = Game.state.decor.map((d) => d.x).concat(Game.polyps.map((p) => p.x));
    let best = 0.5;
    let bestD = -1;
    for (let i = 0; i < 24; i++) {
      const x = U.rand(0.07, 0.93);
      let d = 1;
      for (const t of taken) d = Math.min(d, Math.abs(t - x));
      if (d > bestD) {
        bestD = d;
        best = x;
      }
    }
    return best;
  };

  Game.buyTheme = (id) => {
    const th = MJ.World.THEMES[id];
    const s = Game.state;
    if (!th) return;
    if (s.themes.includes(id)) return Game.setTheme(id);
    if (!Game.spend(th.price)) return MJ.UI.toast('光還不夠，再等一下下。');
    s.themes.push(id);
    A.discover();
    Game.setTheme(id);
  };

  Game.setTheme = (id) => {
    const s = Game.state;
    if (!s.themes.includes(id)) return;
    s.theme = id;
    Game.world.setTheme(id);
    MJ.UI.toast('換成「' + MJ.World.THEMES[id].name + '」了。');
    Game.save();
  };

  Game.arrange = (on) => {
    Game.mode = on ? 'arrange' : 'normal';
    MJ.UI.arrangeUI(on);
    if (!on) Game.save();
  };

  /* ================= 水母的名片操作 ================= */

  Game.petButton = (id) => {
    const j = Game.jellies.find((k) => k.id === id);
    if (!j) return;
    j.petGlow = 1;
    j.happy = Math.min(1, j.happy + 0.08);
    j.affection += 1;
    const [cx, cy] = j.center();
    Game.fx.hearts(cx, cy - j.bellH * 0.3, 3, 345);
    A.chime((cx / Game.W) * 2 - 1);
    Game.state.stats.pets++;
    Game.tut('pet');
  };

  Game.rename = (id, name) => {
    const j = Game.jellies.find((k) => k.id === id);
    name = String(name || '').trim().slice(0, 12);
    if (!j || !name) return;
    j.name = name;
    Game.save();
  };

  Game.release = (id, quiet) => {
    const s = Game.state;
    const j = Game.jellies.find((k) => k.id === id);
    if (!j || j.visitor) return;
    j.leaving = true;
    j.releaseUp = true;
    // 只有自己長大、住滿一天的水母，回去時才會留下一點光（免得撈了就放）
    const settled = j.adult && !j.origin && Date.now() - (j.born || 0) > DAY;
    const reward = settled ? 5 + Gn.stars(j.genes) * 3 : 0;
    Game.addLight(reward);
    s.released.unshift({ name: j.name, genes: j.genes, date: Date.now(), born: j.born });
    if (s.released.length > 60) s.released.length = 60;
    s.stats.released++;
    const [cx, cy] = j.center();
    Game.fx.spark(cx, cy, j.genes.hue, 20, { speed: 50, up: 30 });
    A.arpeggio(10, 4, 0.16, 0.1);
    if (!quiet) MJ.UI.toast('「' + j.name + '」回到大海了。祝牠一路順風。', 'soft', reward ? '+' + reward + ' 光' : null);
    if (Game.mating && (Game.mating.a === j || Game.mating.b === j)) Game.updateMating();
    Game.save();
  };

  /* ================= 隨機事件 ================= */

  Game.fireEvent = () => {
    const s = Game.state;
    const visitors = Game.jellies.filter((j) => j.visitor).length;
    const type = U.weighted({
      swarm: 28,
      bottle: Game.bottle ? 0 : 18,
      star: 16,
      visitor: visitors ? 0 : 16,
      bubbles: 22,
    });
    s.stats.events++;
    const W = Game.W;
    const H = Game.H;
    const u = Game.unit;
    if (type === 'swarm') {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const pts = [];
      for (let i = 0; i < 26; i++) {
        pts.push({ ox: U.rand(-70, 70) * u, oy: U.rand(-40, 40) * u, ph: U.rand(U.TAU), alive: true, bx: 0, by: 0 });
      }
      Game.swarm = { dir, x: dir > 0 ? -100 : W + 100, y: U.rand(0.25, 0.6) * H, pts, speed: 42 * u };
      MJ.UI.toast('一群海螢游過來了。點點看，可以收集牠們的光。');
    } else if (type === 'bottle') {
      Game.bottle = { x: U.rand(0.15, 0.85) * W, y: -30, vy: 34 * u, rot: U.rand(-0.5, 0.5), landed: false, life: 120 };
      MJ.UI.toast('有個漂流瓶，慢慢沉下來了。');
    } else if (type === 'star') {
      const dir = Math.random() < 0.5 ? 1 : -1;
      Game.star = { x: dir > 0 ? U.rand(0.05, 0.35) * W : U.rand(0.65, 0.95) * W, y: U.rand(18, 50), vx: dir * 170 * u, vy: U.rand(8, 18), age: 0, life: 3.4, trail: [] };
    } else if (type === 'visitor') {
      const g = Gn.random({ specialChance: 0.05 });
      const fromLeft = Math.random() < 0.5;
      const j = new MJ.Jelly({ genes: g, name: '訪客', visitor: true, fadeIn: true, x: fromLeft ? 0.02 : 0.98, y: U.rand(0.25, 0.55), growth: 1 }, Game);
      j.leaveAt = Game.t + 100;
      Game.jellies.push(j);
      MJ.UI.toast('有一隻野生水母游進來參觀了。點牠看看？');
    } else if (type === 'bubbles') {
      Game.bubbleRain = 6;
      MJ.UI.toast('海底冒出一大串泡泡！戳戳看。');
    }
  };

  Game.updateEvents = (dt) => {
    const W = Game.W;
    const u = Game.unit;
    if (Game.swarm) {
      const sw = Game.swarm;
      sw.x += sw.dir * sw.speed * dt;
      sw.y += Math.sin(Game.t * 0.5) * 6 * dt;
      if ((sw.dir > 0 && sw.x > W + 120) || (sw.dir < 0 && sw.x < -120) || sw.pts.every((p) => !p.alive)) Game.swarm = null;
    }
    if (Game.bottle) {
      const b = Game.bottle;
      const floor = Game.world.sandY(b.x) - 8 * u;
      if (b.y < floor) {
        b.y += b.vy * dt;
        b.x += Math.sin(Game.t * 0.8) * 10 * dt;
        b.rot += Math.sin(Game.t * 1.1) * 0.3 * dt;
      } else b.landed = true;
      b.life -= dt;
      if (b.life <= 0) Game.bottle = null;
    }
    if (Game.star) {
      const st = Game.star;
      st.age += dt;
      st.x += st.vx * dt;
      st.y += st.vy * dt;
      st.trail.push(st.x, st.y);
      if (st.trail.length > 40) st.trail.splice(0, 2);
      if (st.age > st.life) Game.star = null;
    }
    if (Game.bubbleRain > 0) {
      Game.bubbleRain -= dt;
      if (Math.random() < dt * 2.5) {
        const x = U.rand(0.05, 0.95) * W;
        const b = Game.world.addBubble(x, Game.world.sandY(x) - 4, U.rand(6, 11) * u, { big: true });
        if (b) b.bonus = true;
      }
    }
  };

  Game.drawSwarm = (ctx) => {
    const sw = Game.swarm;
    if (!sw) return;
    const t = Game.t;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of sw.pts) {
      if (!p.alive) continue;
      const x = sw.x + p.ox + Math.sin(t * 1.3 + p.ph) * 12;
      const y = sw.y + p.oy + Math.cos(t * 1.1 + p.ph) * 8;
      const tw = 0.5 + 0.5 * Math.sin(t * 4 + p.ph * 3);
      U.drawGlow(ctx, x, y, 38 * Game.unit, 195, 1, 0.6, 0.55 + tw * 0.45);
      ctx.fillStyle = 'rgba(210,244,255,' + (0.65 + tw * 0.35).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, U.TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  Game.drawStar = (ctx) => {
    const st = Game.star;
    if (!st) return;
    const a = Math.min(1, st.age * 3) * Math.min(1, (st.life - st.age) * 2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tr = st.trail;
    for (let i = 0; i < tr.length; i += 2) {
      const k = i / tr.length;
      U.drawGlow(ctx, tr[i], tr[i + 1], 18 * k, 48, 0.7, 0.8, a * k * 0.6);
    }
    U.drawGlow(ctx, st.x, st.y, 60, 48, 0.8, 0.8, a);
    ctx.fillStyle = 'rgba(255,250,225,' + a.toFixed(3) + ')';
    ctx.beginPath();
    U.sparklePath(ctx, st.x, st.y, 7);
    ctx.fill();
    ctx.restore();
  };

  Game.drawBottle = (ctx) => {
    const b = Game.bottle;
    if (!b) return;
    const u = Game.unit;
    const fade = Math.min(1, b.life / 3);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot + (b.landed ? 0.9 : 0));
    ctx.scale(u * 0.8, u * 0.8);
    ctx.globalCompositeOperation = 'lighter';
    U.drawGlow(ctx, 0, 0, 90, 170, 0.5, 0.7, 0.5 + 0.2 * Math.sin(Game.t * 2));
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(150,220,205,0.3)';
    ctx.strokeStyle = 'rgba(200,245,230,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-22, -10, 36, 20, 8);
    else ctx.rect(-22, -10, 36, 20);
    ctx.rect(14, -5, 10, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#a57b55';
    ctx.fillRect(23, -4, 6, 8);
    ctx.fillStyle = '#efe2c4';
    ctx.fillRect(-15, -5, 22, 10);
    ctx.restore();
  };

  Game.bottleHit = (x, y) => {
    const b = Game.bottle;
    return b && Math.hypot(x - b.x, y - b.y) < 40 * Game.unit + 12;
  };

  Game.openBottle = () => {
    if (!Game.bottle) return;
    const b = Game.bottle;
    Game.bottle = null;
    if (b.letter) {
      Game.fx.spark(b.x, b.y, 160, 14, { speed: 60, sat: 0.5 });
      A.open();
      MJ.UI.pastLetterModal(b.letter);
      return;
    }
    const r = U.randInt(10, 20);
    Game.addLight(r);
    Game.fx.spark(b.x, b.y, 170, 14, { speed: 60, sat: 0.5 });
    A.open();
    MJ.UI.bottleModal(Game.nextLetter(), r);
  };

  Game.nextLetter = () => {
    const s = Game.state;
    const all = C.letters;
    let pool = all.map((_, i) => i).filter((i) => !s.seenLetters.includes(i));
    if (!pool.length) {
      s.seenLetters = [];
      pool = all.map((_, i) => i);
    }
    const i = U.pick(pool);
    s.seenLetters.push(i);
    return all[i];
  };

  /* ================= 每日來信 ================= */

  Game.letterDue = () => Game.state.daily.last !== U.today();

  /** 來過的日子：只增不減，不算連續 */
  Game.markVisit = () => {
    const s = Game.state;
    s.visits = s.visits || {};
    s.visits[U.today()] = 1;
    const keys = Object.keys(s.visits).sort();
    if (keys.length > 400) for (const k of keys.slice(0, keys.length - 400)) delete s.visits[k];
  };
  Game.daysThisMonth = () => {
    const m = U.today().slice(0, 7);
    return Object.keys(Game.state.visits || {}).filter((k) => k.startsWith(m)).length;
  };

  Game.claimLetter = (moodId) => {
    const s = Game.state;
    const d = s.daily;
    const today = U.today();
    if (d.last === today) return null;
    const yesterday = U.today(new Date(Date.now() - 86400000));
    // 連續天數還是記著（舊存檔相容），但不再顯示、不再影響獎勵：斷掉的連續紀錄很容易變成自責
    d.streak = d.last === yesterday ? d.streak + 1 : 1;
    d.best = Math.max(d.best || 0, d.streak);
    d.last = today;
    s.moods[today] = moodId;
    const reward = 25;
    Game.addLight(reward);
    const gifts = ['星星糖 ×1'];
    s.inventory.star = (s.inventory.star || 0) + 1;
    if ((s.stats.letters + 1) % 3 === 0) {
      s.inventory.dew = (s.inventory.dew || 0) + 1;
      gifts.push('月光露 ×1');
    }
    s.stats.letters++;
    Game.applyMood();
    MJ.UI.updateFood();
    Game.save();
    return {
      reply: U.pick(C.moodReplies[moodId] || C.moodReplies.fog),
      letter: Game.nextLetter(),
      fact: U.pick(C.facts),
      reward,
      days: Game.daysThisMonth(),
      gifts,
    };
  };

  Game.applyMood = () => {
    const m = Game.state.moods[U.today()];
    Game.world.rain = m === 'rain' || m === 'storm';
    A.setRainLayer(Game.world.rain);
  };

  /* ================= 呼吸 ================= */

  Game.startBreath = (id, cycles) => {
    const pat = BREATHS[id] || BREATHS.relax;
    Game.mode = 'breath';
    Game.breath = { id, pat, cycles, cycle: 0, step: -1, stepT: 0, dur: 1, c: 0.4, c0: 0.4, push: 0, kind: 'in' };
    for (const j of Game.jellies) j.breathHome = U.rand(0.3, 0.62) * Game.H;
    MJ.UI.breathStart(Game.breath);
    Game.nextBreathStep();
  };

  Game.nextBreathStep = () => {
    const b = Game.breath;
    b.step++;
    if (b.step >= b.pat.seq.length) {
      b.step = 0;
      b.cycle++;
      if (b.cycle >= b.cycles) {
        Game.finishBreath();
        return;
      }
    }
    const [kind, dur] = b.pat.seq[b.step];
    b.kind = kind;
    b.dur = dur;
    b.stepT = 0;
    b.c0 = b.c;
    A.breath(kind === 'in' ? 'in' : kind === 'out' ? 'out' : 'hold', dur);
    MJ.UI.breathStep(BREATH_WORDS[kind], b);
  };

  Game.updateBreath = (dt) => {
    const b = Game.breath;
    if (!b) return;
    b.stepT += dt;
    const k = U.clamp(b.stepT / b.dur, 0, 1);
    const e = U.easeInOut(k);
    if (b.kind === 'in') {
      b.c = U.lerp(b.c0, 0, e);
      b.push = 0;
    } else if (b.kind === 'out') {
      b.c = U.lerp(b.c0, 1, e);
      b.push = Math.sin(k * Math.PI);
    } else b.push = 0;
    MJ.UI.breathFrame(b, k);
    if (b.stepT >= b.dur) Game.nextBreathStep();
  };

  Game.finishBreath = () => {
    const s = Game.state;
    const b = Game.breath;
    const today = U.today();
    if (s.breathDay !== today) {
      s.breathDay = today;
      s.breathCount = 0;
    }
    let reward = 0;
    if (s.breathCount < BREATH_DAILY) {
      s.breathCount++;
      reward = Game.breathReward(b.cycles);
      Game.addLight(reward);
    }
    s.stats.breaths++;
    s.lastBreathAt = Date.now();
    A.breath('end');
    A.arpeggio(5, 4, 0.2, 0.1);
    Game.breath = null;
    Game.mode = 'normal';
    MJ.UI.breathEnd(true, reward);
    Game.save();
  };

  Game.breathReward = (cycles) => 4 * cycles;
  Game.breathLeft = () => (Game.state.breathDay === U.today() ? Math.max(0, BREATH_DAILY - (Game.state.breathCount || 0)) : BREATH_DAILY);

  Game.stopBreath = () => {
    if (Game.mode !== 'breath') return;
    A.breath('end');
    Game.breath = null;
    Game.mode = 'normal';
    MJ.UI.breathEnd(false, 0);
  };

  /* ================= 晚安、拍照 ================= */

  Game.startSleep = async (minutes) => {
    Game.mode = 'sleep';
    A.sleepFade(minutes);
    Game.state.stats.sleeps++;
    MJ.UI.sleepStart(minutes);
    try {
      if (navigator.wakeLock) Game.wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) {
      Game.wakeLock = null;
    }
  };

  Game.stopSleep = () => {
    if (Game.mode !== 'sleep') return;
    Game.mode = 'normal';
    A.wake();
    MJ.UI.sleepEnd();
    try {
      if (Game.wakeLock) Game.wakeLock.release();
    } catch (e) {
      /* 已經被系統釋放 */
    }
    Game.wakeLock = null;
  };

  Game.startPhoto = () => {
    Game.mode = 'photo';
    Game.hoverJelly = null;
    MJ.UI.photoStart();
  };

  Game.stopPhoto = () => {
    if (Game.mode !== 'photo') return;
    Game.mode = 'normal';
    MJ.UI.photoEnd();
  };

  Game.takePhoto = () => {
    const src = Game.canvas;
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.scale(Game.dpr, Game.dpr);
    g.font = '15px ' + MJ.FONT;
    g.textAlign = 'right';
    g.textBaseline = 'bottom';
    g.fillStyle = 'rgba(230,243,245,0.72)';
    g.fillText('海月水母館・' + U.today().replace(/-/g, '.'), Game.W - 18, Game.H - 16);
    Game.state.stats.photos++;
    A.click();
    let url = '';
    try {
      url = c.toDataURL('image/jpeg', 0.92);
    } catch (e) {
      url = '';
    }
    MJ.UI.photoResult(url);
  };

  /* ================= 設定、存檔 ================= */

  Game.updateSettings = (patch) => {
    Object.assign(Game.state.settings, patch);
    A.configure(Game.state.settings);
    Game.save();
  };

  Game.syncState = () => {
    const s = Game.state;
    s.jellies = Game.jellies.filter((j) => !j.visitor && !j.leaving).map((j) => j.toJSON());
    s.polyps = Game.polyps.map((p) => p.toJSON());
    s.lastSeen = Date.now();
  };

  Game.save = () => {
    if (!Game.state || Game.noSave) return;
    Game.syncState();
    MJ.Store.save(Game.state);
  };

  Game.exportSave = () => {
    Game.syncState();
    return MJ.Store.exportText(Game.state);
  };

  Game.importSave = (text) => {
    const st = MJ.Store.importText(text);
    if (!st) return false;
    MJ.Store.save(st);
    Game.noSave = true;
    location.reload();
    return true;
  };

  Game.resetAll = () => {
    Game.noSave = true;
    MJ.Store.reset();
    location.reload();
  };

  /* ================= 成就、教學 ================= */

  Game.checkAchievements = () => {
    const s = Game.state;
    // 剛陪完一份心情的那一分鐘，不跳成就打擾；晚一點再說
    if (MJ.UI.isQuiet()) return;
    for (const a of ACH) {
      if (s.achievements[a.id]) continue;
      if (a.test(s, Game)) {
        s.achievements[a.id] = Date.now();
        Game.addLight(a.reward);
        A.discover();
        MJ.UI.toast((a.reward ? '成就達成：' : '留下紀念：') + a.name, 'achievement', a.desc + (a.reward ? '・+' + a.reward + ' 光' : ''));
        return;
      }
    }
  };

  Game.tut = (key) => {
    const s = Game.state;
    if (s.tutorial[key]) return;
    s.tutorial[key] = true;
    MJ.UI.showHint(Game.currentHint());
  };

  Game.currentHint = () => {
    const s = Game.state;
    for (const [key, text] of TUTORIAL) if (!s.tutorial[key]) return text;
    return null;
  };

  /* ================= 心情與生態 ================= */

  /** 儀式結束：把這份心情記下來，交給海 */
  Game.commitEntry = (d) => {
    const s = Game.state;
    const now = Date.now();
    let e = d.resume;
    if (!e) {
      e = { id: d.id, t: d.t, words: d.words.slice(0, 3), fams: d.fams.slice(), fam: d.fam, i0: d.i0 };
      if (d.keepRaw && d.raw) e.raw = d.raw.slice(0, 600);
      s.entries.push(e);
      if (s.entries.length > 800) s.entries.splice(0, s.entries.length - 800);
    }
    if (d.crisis) e.crisis = true;
    e.turn = d.turn || null;
    if (e.turn === 'allow' && d.waves) e.waves = d.waves;
    if (e.turn) {
      e.tt = now;
      e.i1 = d.i1 == null ? e.i0 : d.i1;
      if (d.text) e.text = d.text.slice(0, 200);
      if (e.turn === 'reframe') e.lens = d.lens || 'friend';
      if (e.turn === 'need') e.needs = d.needs.slice(0, 2);
      if (e.turn === 'kind' && d.hard) e.hard = d.hard;
      if (e.turn === 'thank' && d.tell) e.tell = true;
      if (e.turn === 'step') e.step = { what: e.text || '一件小事', when: d.when || 'now', status: 'pending', due: Game.stepDue(d.when, now) };
    }
    s.stats.rituals = (s.stats.rituals || 0) + 1;
    const today = U.today();
    if (s.ritualDay !== today) {
      s.ritualDay = today;
      s.ritualCount = 0;
    }
    // 獎勵的是「記下來」這個動作：不管是什麼感覺、選了哪種陪法（或還沒決定），都一樣。
    // 一天前三份給光；之後照樣長生物，只是不再給光，免得感覺變成賺錢的工具
    // 文字裡出現過自傷的字：不給光、不跳通知（延到下次打開），也不讓那段字變成動畫
    if (!d.resume && s.ritualCount < RITUAL_DAILY && !d.crisis) {
      s.ritualCount++;
      Game.addLight(RITUAL_LIGHT);
      e._gift = { n: RITUAL_LIGHT, count: s.ritualCount };
    }
    MJ.UI.quiet(d.crisis ? 1e7 : 75);
    Game.tut('worry');
    const raw = d.crisis ? '' : d.raw || (e.turn === 'release' ? d.text : '');
    A.whoosh();

    if (e.turn === 'release') {
      // 先倒出來就好：交給一隻水母吃掉，吃完散成藍眼淚
      if (Game.residentJellies().length) {
        const item = Game.food.worry(raw || e.words.join('、'), U.rand(0.3, 0.7) * Game.W);
        item.entry = e;
        Game.save();
        return;
      }
    }
    let from = null;
    if (d.resume) {
      const l = Game.eco.larvae.find((c) => c.entry === e);
      if (l) {
        from = { x: l.x, y: l.y };
        Game.eco.larvae = Game.eco.larvae.filter((c) => c !== l);
      }
    }
    Game.eco.spawnOrb(e, (x, y) => Game.transform(e, x, y, raw), from);
    Game.save();
  };

  /** 光球炸開，變成生物 */
  Game.transform = (e, x, y, raw) => {
    const f = F.FAMILIES[e.fam] || F.FAMILIES.calm;
    Game.fx.ring(x, y, f.hue, 110 * Game.unit, { sat: 0.6, life: 1.6, width: 2 });
    Game.fx.ring(x, y, f.hue, 60 * Game.unit, { sat: 0.6, life: 1.2 });
    Game.fx.spark(x, y, f.hue, 26, { speed: 100 });
    if (raw) Game.fx.scatterText(x, y, raw, f.hue);
    A.hatch();
    let c = null;
    if (e.turn === 'allow') c = Game.jellyFromEntry(e, x, y);
    const events = Game.eco.rebuild(true);
    if (!c) c = Game.eco.find(e.id);
    if (c && e.turn !== 'allow') {
      if (c.kind === 'lantern' || c.kind === 'larva' || c.kind === 'clown' || c.kind === 'turtle') {
        c.x = x;
        c.y = y;
      } else {
        const [tx, ty] = Game.creaturePos(c);
        Game.fx.trail(x, y, tx, ty, f.hue);
      }
    }
    if (e.turn === 'savor' || e.turn === 'thank') {
      const reef = Game.eco.reefs.find((r) => r.items.some((it) => it.entry === e));
      if (reef) {
        const [bx, by] = reef.base();
        Game.fx.trail(x, y, bx, by - 30 * Game.unit, f.hue);
        // 珊瑚沒有自己的物件：給說明牌一個指向那一截的
        c = { kind: 'coral', item: reef.items.find((it) => it.entry === e), reef };
      }
    }
    Game.handleEcoEvents(events);
    setTimeout(() => MJ.UI.ritualResult(e, c), 1400);
    Game.maybeReturnBottle(e);
    Game.save();
  };

  Game.creaturePos = (c) => {
    const w = Game.world;
    if (c.kind === 'crab' || c.kind === 'shell') {
      const x = c.x != null ? c.x : c.xf * Game.W;
      return [x, w.sandY(x) - 12 * Game.unit];
    }
    if (c.pos) return c.pos();
    if (c.x != null) return [c.x, c.y];
    return [Game.W / 2, Game.H / 2];
  };

  /** 讓它待著：這份感覺變成一隻小水母 */
  Game.jellyFromEntry = (e, x, y) => {
    const f = F.FAMILIES[e.fam] || F.FAMILIES.calm;
    const g = Gn.random({ starter: true });
    g.hue = U.wrapHue(f.hue + U.rand(-10, 10));
    g.hue2 = U.wrapHue(g.hue + U.pick([20, -20, 40, 150]));
    g.sat = U.clamp(f.sat * 0.9 + 0.05, 0.12, 0.95);
    g.shape = f.a > 0.4 ? U.pick(['bell', 'tall', 'lantern']) : f.a < -0.3 ? U.pick(['disc', 'dome']) : U.pick(['dome', 'crown', 'bell']);
    g.pattern = e.i0 >= 8 ? 'rings' : e.words.length >= 3 ? 'dots' : U.pick(['clover', 'plain', 'spiral']);
    g.size = 0.8 + e.i0 * 0.03;
    // 亮度和月光跟著「陪它看了幾道浪」，不跟著強度下降：接納不是為了讓它變小，也不該讓人想把分數報低
    const waves = e.waves || 1;
    g.glow = U.clamp(0.5 + waves * 0.08, 0.3, 1);
    // 陪一份很大的浪退下來，出生的水母會帶著月光
    if (waves >= 3) g.special = 'moonlight';
    Gn.normalize(g);
    const j = new MJ.Jelly(
      {
        genes: g,
        name: Gn.makeName(Game.jellies.map((k) => k.name)),
        growth: 0.3,
        fullness: 0.7,
        happy: 0.7,
        x: x / Game.W,
        y: y / Game.H,
        fadeIn: true,
        origin: { word: e.words[0], fam: e.fam, t: e.t, entry: e.id },
      },
      Game
    );
    Game.jellies.push(j);
    e.jelly = j.id;
    Game.register(j.genes, false, !!e.crisis);
    // 心情變成的水母太多的時候，最早的那一隻會慢慢游回大海
    const born = Game.jellies.filter((k) => k.origin && !k.leaving && k !== j);
    if (born.length >= ORIGIN_MAX) Game.release(born[0].id, true);
    return j;
  };

  /** 被水母吃掉的「倒出來」 */
  Game.digestEntry = (j, f) => {
    const e = f.entry;
    e.jellyAte = j.name;
    j.worryFed++;
    j.fullness = Math.min(1, j.fullness + 0.2);
    j.happy = Math.min(1, j.happy + 0.3);
    j.petGlow = 1;
    const [cx, cy] = j.center();
    Game.fx.scatterText(f.x, f.y, f.text, 190);
    Game.fx.spark(cx, cy, 190, 20, { speed: 80 });
    Game.fx.ring(cx, cy, 190, 90 * Game.unit, { sat: 0.8 });
    A.arpeggio(7, 4, 0.1, 0.12);
    const events = Game.eco.rebuild(true);
    Game.eco.tears.disturb(cx, cy, 220 * Game.unit);
    Game.handleEcoEvents(events);
    setTimeout(() => MJ.UI.ritualResult(e, j), 1400);
    Game.maybeReturnBottle(e);
    Game.save();
  };

  Game.handleEcoEvents = (events) => {
    if (!events || !events.length) return;
    const s = Game.state;
    for (const ev of events) {
      if (ev.type === 'chain') {
        s.flags.chain = true;
        MJ.UI.toast('寄居蟹們換了殼：大的搬進新殼，舊殼留給了小一號的。', 'discover');
      } else if (ev.type === 'chromis') {
        MJ.UI.toast('珊瑚礁長得夠大了，一群雀鯛搬了進來。', 'discover');
      } else if (ev.type === 'octopus') {
        A.discover();
        MJ.UI.toast('一隻章魚從石頭後面探出頭來。', 'discover', '牠皮膚上的顏色，是你這個月用過的每一種陪法。', () => MJ.UI.callout.show(Game.eco.octopus, { auto: true, status: '剛出現' }));
      } else if (ev.type === 'pearl') {
        A.discover();
        const p = Game.eco.pearls().find((q) => q.fam === ev.fam);
        const oy = Game.eco.oysters.find((q) => q.fam === ev.fam);
        if (p) setTimeout(() => MJ.UI.pearlModal(p, () => MJ.UI.callout.show(oy, { auto: true, status: '結出珍珠' })), 2600);
      } else if (ev.type === 'species') {
        const sp = F.SPECIES[ev.id];
        if (sp && ev.id !== 'larva') MJ.UI.toast('生態新發現：' + sp.name, 'discover', '在圖鑑的「生態」可以看到牠');
      }
    }
  };

  /** 點到生態裡的生物 */
  Game.tapCreature = (c) => {
    if (c.kind === 'crab') {
      c.startle();
      A.bubble(0, 1.4);
    } else if (c.kind === 'octopus') {
      c.flash = 1.6;
      A.sparkle(0.6);
    } else if (c.kind === 'oyster') {
      c.peek = 4;
      A.chime(0);
    } else if (c.kind === 'larva' || c.kind === 'seahorse') {
      A.chime(0);
    } else A.click();
    MJ.UI.openCreature(c);
  };

  /* ---------- 一件小事的後續 ---------- */

  Game.stepDue = (when, now) => {
    if (when === 'later') return now + 3 * 3600 * 1000;
    if (when === 'tomorrow') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.getTime();
    }
    return now + 30 * 60 * 1000;
  };

  /** 到了約定時間、今天還沒問過的小事 */
  Game.dueSteps = (mark) => {
    const today = U.today();
    const now = Date.now();
    const out = Game.state.entries.filter((e) => e.turn === 'step' && e.step && e.step.status === 'pending' && now >= e.step.due && e.step.asked !== today);
    if (mark) for (const e of out) e.step.asked = today;
    return out.slice(-3);
  };

  /** 過了約定的時間，輕輕問一聲；一天只問一次，不追。正在陪心情、或有別的視窗開著的時候不打擾 */
  Game.checkSteps = () => {
    if (MJ.Ritual.open || MJ.UI.modalOpenNow || MJ.UI.isQuiet()) return;
    const e = Game.dueSteps(false)[0];
    if (!e) return;
    e.step.asked = U.today();
    MJ.UI.stepAsk(e);
  };

  /* ---------- 每週回顧：用你自己的字組成 ---------- */

  Game.weekEntries = () => Game.state.entries.filter((e) => Date.now() - e.t < 7 * DAY);
  Game.recapDue = () => {
    const s = Game.state;
    const E = s.entries;
    if (!E.length || Date.now() - E[0].t < 5 * DAY) return false;
    if (Date.now() - (s.eco.lastRecap || 0) < 6.5 * DAY) return false;
    return Game.weekEntries().length >= 3;
  };

  Game.setStep = (id, status, quiet) => {
    const s = Game.state;
    const e = s.entries.find((x) => x.id === id);
    if (!e || !e.step) return;
    if (status === 'done') {
      e.step.status = 'done';
      e.step.doneAt = Date.now();
      s.stats.stepsDone = (s.stats.stepsDone || 0) + 1;
      const gift = {
        id: U.uid(),
        type: U.pick(['star', 'nacre', 'conch', 'nautilus']),
        size: U.rand(1.25, 1.45),
        t: Date.now(),
        revealAt: Date.now() + 21000,
        from: e.id,
      };
      s.eco.gifts.push(gift);
      if (s.eco.gifts.length > 12) s.eco.gifts.shift();
      Game.eco.rebuild(false);
      const tt = Game.eco.turtles.find((x) => x.entry === e);
      if (tt) {
        tt.journey = 22;
        tt.dropped = false;
        MJ.UI.toast('海龜出發去旅行了。牠會帶點東西回來。', 'discover', null, () => MJ.UI.callout.show(tt, { auto: true, status: '出發去旅行' }));
      } else {
        gift.revealAt = Date.now();
        Game.onGiftArrive(null);
      }
      Game.addLight(15);
      A.hatch();
    } else if (status === 'later') {
      e.step.asked = U.today();
      if (!quiet) MJ.UI.toast('好。海龜會在沙灘上等你，不急。');
    } else if (status === 'dropped') {
      e.step.status = 'dropped';
      Game.eco.rebuild(false);
      if (!quiet) MJ.UI.toast('好，這件事先放下。');
    }
    Game.save();
  };

  /** 海龜旅行回來，把殼放在沙地上，寄居蟹一個接一個換殼 */
  Game.onGiftArrive = (turtle) => {
    const events = Game.eco.rebuild(true);
    if (turtle) {
      Game.fx.spark(turtle.x, turtle.y, 48, 16, { speed: 60 });
      A.discover();
    }
    if (!events.some((ev) => ev.type === 'chain'))
      MJ.UI.toast('海龜回來了，帶回一個殼，放在沙地上。', 'discover', '等哪隻寄居蟹長大了，就會搬進去。', turtle ? () => MJ.UI.callout.show(turtle, { auto: true, status: '回來了' }) : null);
    Game.handleEcoEvents(events);
    Game.save();
  };

  /** 很難受的時候，海可能會把你以前寫的一句話送回來 */
  Game.maybeReturnBottle = (e) => {
    const s = Game.state;
    if (F.isPositive(e.fam) || e.crisis) return;
    if (Math.max(e.i0 || 0, e.i1 || 0) < 6) return;
    if (Date.now() - (s.eco.lastReturn || 0) < 20 * 3600 * 1000) return;
    const pool = s.entries.filter((x) => !x.crisis && ['keep', 'savor', 'thank', 'kind'].includes(x.turn) && x.text && Date.now() - x.t > 12 * 3600 * 1000);
    if (!pool.length || Math.random() > 0.75) return;
    const keeps = pool.filter((x) => x.turn === 'keep');
    const pick = keeps.length && Math.random() < 0.6 ? U.pick(keeps) : U.pick(pool);
    s.eco.lastReturn = Date.now();
    setTimeout(() => {
      Game.bottle = {
        x: U.rand(0.2, 0.8) * Game.W,
        y: -30,
        vy: 30 * Game.unit,
        rot: U.rand(-0.5, 0.5),
        landed: false,
        life: 300,
        letter: { text: pick.text, t: pick.t, turn: pick.turn },
      };
      MJ.UI.toast('有個瓶子慢慢沉下來了。好像是你以前丟進海裡的。');
    }, 9000);
  };

  /* ================= 開始 ================= */

  Game.start = () => {
    if (Game.started) return;
    Game.started = true;
    A.init();
    const h = new Date().getHours();
    Game.markVisit();
    MJ.UI.afterStart(Game.offline);
  };

  MJ.Game = Game;
})((window.MJ = window.MJ || {}));
