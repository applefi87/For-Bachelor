/* 海月水母館 — 遊戲本體：主迴圈、輸入、經濟、事件、繁殖、呼吸、晚安、拍照 */
(function (MJ) {
  'use strict';

  const U = MJ.U;
  const Gn = MJ.Genes;
  const A = MJ.Audio;
  const C = MJ.Content;

  const TANK = [6, 9, 12, 16];
  const TANK_PRICE = [300, 900, 2400];
  const BREED_COOLDOWN = 4 * 60 * 1000;
  const MAX_POLYPS = 3;
  const OFFLINE_CAP = 3 * 3600;
  const OFFLINE_EFF = 0.35;

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
    ['worry_1', '交給海', '第一次把煩惱交給水母', 30, (s) => s.stats.worries >= 1],
    ['worry_10', '輕一點了', '水母們吃掉了 10 個煩惱', 120, (s) => s.stats.worries >= 10],
    ['worry_50', '無事一身輕', '水母們吃掉了 50 個煩惱', 400, (s) => s.stats.worries >= 50],
    ['breath_1', '深呼吸', '完成一次呼吸練習', 30, (s) => s.stats.breaths >= 1],
    ['breath_10', '潮汐之心', '完成 10 次呼吸練習', 200, (s) => s.stats.breaths >= 10],
    ['catch_1', '撈到了', '第一次撈到野生水母', 20, (s) => s.stats.catches >= 1],
    ['hatch_1', '新生命', '第一隻水母寶寶出生', 50, (s) => s.stats.hatched >= 1],
    ['hatch_10', '大家族', '十隻水母寶寶出生', 300, (s) => s.stats.hatched >= 10],
    ['release_1', '回到大海', '第一次讓水母回到大海', 30, (s) => s.stats.released >= 1],
    ['codex_10', '小小研究員', '圖鑑發現 10 項', 100, (s) => Object.keys(s.codex).length >= 10],
    ['codex_25', '海洋學家', '圖鑑發現 25 項', 400, (s) => Object.keys(s.codex).length >= 25],
    ['codex_all', '海月博士', '圖鑑全部完成', 2000, (s) => Object.keys(s.codex).length >= Gn.codexTotal()],
    ['special_1', '奇蹟', '第一次遇見特殊體質的水母', 150, (s) => Object.keys(s.codex).some((k) => k.startsWith('special:'))],
    ['streak_3', '常來玩', '連續 3 天來看水母', 60, (s) => s.daily.streak >= 3],
    ['streak_7', '一週的潮汐', '連續 7 天來看水母', 300, (s) => s.daily.streak >= 7],
    ['decor_5', '小小造景師', '擁有 5 個裝飾', 100, (s) => s.decor.length >= 5],
    ['theme_2', '換個風景', '擁有第二個主題', 50, (s) => s.themes.length >= 2],
    ['tank_max', '大海的一角', '把水族箱升到最大', 500, (s) => s.tank >= TANK.length - 1],
    ['family_12', '熱熱鬧鬧', '同時養 12 隻水母', 250, (s, g) => g.residentJellies().length >= 12],
    ['night_owl', '夜貓子', '在凌晨 0～4 點來看水母', 50, (s) => !!s.flags.nightOwl],
    ['star', '許個願', '接住一顆流星', 40, (s) => !!s.flags.star],
    ['bubbles_50', '戳泡泡', '戳破 50 顆泡泡', 60, (s) => s.stats.bubbles >= 50],
    ['sleep', '晚安', '第一次使用晚安模式', 30, (s) => s.stats.sleeps >= 1],
    ['photo', '留念', '第一次拍下水族箱', 20, (s) => s.stats.photos >= 1],
    ['light_10k', '萬家燈火', '累積獲得 10,000 光', 300, (s) => s.lifetimeLight >= 10000],
  ].map(([id, name, desc, reward, test]) => ({ id, name, desc, reward, test }));

  const TUTORIAL = [
    ['feed', '點一下水面，撒點浮游生物給水母吃。'],
    ['pet', '按住水母輕輕滑動，就能摸摸牠。'],
    ['card', '點一下水母，看看牠的名片。'],
    ['worry', '按下方的「煩惱」，把心事交給水母。'],
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
    Game.applyMood();
    Game.nextEvent = U.rand(40, 70);
    Game.achTimer = 2;

    Game.bindInput();
    MJ.UI.init(Game);

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
    s.light = 25;
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
    return (
      (0.05 + 0.13 * j.growth) *
      (0.6 + 0.8 * g.glow) *
      (0.55 + 0.35 * j.fullness + 0.3 * j.happy) *
      Math.sqrt(g.size) *
      (1 + (j._stars - 1) * 0.15) *
      (g.special ? 1.5 : 1)
    );
  };

  Game.residentJellies = () => Game.jellies.filter((j) => !j.visitor && !j.leaving);
  Game.residentCount = () => Game.residentJellies().length + Game.polyps.length;
  Game.capacity = () => TANK[Game.state.tank] || TANK[0];

  Game.incomeRate = () => {
    let r = 0;
    for (const j of Game.jellies) if (!j.visitor && !j.leaving) r += Game.jellyRate(j);
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
        Game.nextEvent = U.rand(70, 150);
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
    Game.drawBottle(ctx);
    Game.food.draw(ctx);

    let selected = null;
    for (const j of Game.jellies) {
      if (j.id === Game.selectedId) selected = j;
      else j.draw(ctx, Game);
    }
    if (selected) {
      selected.draw(ctx, Game);
      Game.drawSelection(ctx, selected);
    }
    Game.fx.draw(ctx);
    Game.drawSwarm(ctx);
    Game.drawStar(ctx);
    w.drawFront(ctx);
    const label = Game.hoverJelly || (Game.pointer.target && Game.pointer.target.kind === 'jelly' && Game.pointer.moved > 6 ? Game.pointer.target.j : null);
    if (label && Game.mode === 'normal') Game.drawLabel(ctx, label);
  };

  Game.drawSelection = (ctx, j) => {
    const [cx, cy] = j.center();
    const r = Math.max(j.bellW, j.bellH) * 0.75 + 10;
    ctx.save();
    ctx.strokeStyle = 'rgba(240,248,250,0.4)';
    ctx.setLineDash([3, 6]);
    ctx.lineDashOffset = -Game.t * 8;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, U.TAU);
    ctx.stroke();
    ctx.restore();
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
        const r = 60;
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
        Game.addLight(n * 2);
        Game.fx.text(x, y - 20, '+' + n * 2 + ' 光', '#bfeaff');
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
        const r = b.gold ? 8 : 1;
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
      if (now > s.cooldowns.conch) {
        s.cooldowns.conch = now + 30000;
        Game.addLight(3);
        Game.fx.text(b.cx, b.y - 10, '+3 光');
      }
      MJ.UI.toast(U.pick(['你聽見了海的聲音。', '海螺裡，有很遠很遠的浪。', '嘩——沙——嘩——沙——']));
    } else if (d.type === 'bottle') {
      const bonus = now > s.cooldowns.bottle;
      if (bonus) {
        s.cooldowns.bottle = now + 3 * 60000;
        Game.addLight(5);
      }
      A.open();
      MJ.UI.bottleModal(Game.nextLetter(), bonus ? 5 : 0);
    } else if (d.type === 'lantern') {
      d.on = d.on === false;
      A.click();
    } else if (d.type === 'chest') {
      if (now > s.cooldowns.chest) {
        s.cooldowns.chest = now + 4 * 60000;
        const r = U.randInt(30, 70);
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

  Game.sendWorry = (text) => {
    text = String(text || '').trim();
    if (!text) return;
    if (!Game.residentJellies().length) {
      MJ.UI.toast('水族箱裡還沒有水母可以幫忙。等寶寶孵化再來吧。');
      return;
    }
    const x = U.rand(0.3, 0.7) * Game.W;
    Game.food.worry(text.slice(0, 200), x);
    A.whoosh();
    Game.tut('worry');
  };

  Game.digestWorry = (j, f) => {
    const s = Game.state;
    j.worryFed++;
    j.fullness = Math.min(1, j.fullness + 0.2);
    j.happy = Math.min(1, j.happy + 0.3);
    j.petGlow = 1;
    const [cx, cy] = j.center();
    Game.fx.scatterText(f.x, f.y, f.text, 42);
    Game.fx.spark(cx, cy, j.genes.hue, 18, { speed: 80 });
    Game.fx.ring(cx, cy, j.genes.hue, 80 * Game.unit);
    A.arpeggio(7, 4, 0.1, 0.12);
    const reward = 12 + Math.min(40, f.chars.length);
    Game.addLight(reward);
    Game.fx.text(cx, cy - j.bellH - 10, '+' + reward + ' 光');
    s.stats.worries++;
    MJ.UI.toast(U.pick(C.worryReplies).replace('{name}', j.name), 'soft', U.pick(C.worryAfter));
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
      else MJ.UI.toast('「' + j.name + '」出生了。');
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
      for (const k of found) reward += k.startsWith('special:') ? 100 : 20;
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
    MJ.UI.toast('「' + j.name + '」長大了！現在可以幫牠找伴侶。');
  };

  /* ================= 商店 ================= */

  Game.catchCost = () => Math.min(180, 30 + Game.state.stats.catches * 10);

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
    if (!Game.spend(def.price)) return MJ.UI.toast('光還不夠，再等一下下。');
    const d = MJ.Decor.create(type, Game.freeDecorX());
    Game.state.decor.push(d);
    A.sparkle();
    MJ.UI.toast(def.name + '放好了。想換位置的話，按「調整擺設」。');
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

  Game.release = (id) => {
    const s = Game.state;
    const j = Game.jellies.find((k) => k.id === id);
    if (!j || j.visitor) return;
    j.leaving = true;
    j.releaseUp = true;
    const stars = Gn.stars(j.genes);
    const reward = 10 + stars * 10;
    Game.addLight(reward);
    s.released.unshift({ name: j.name, genes: j.genes, date: Date.now(), born: j.born });
    if (s.released.length > 60) s.released.length = 60;
    s.stats.released++;
    const [cx, cy] = j.center();
    Game.fx.spark(cx, cy, j.genes.hue, 20, { speed: 50, up: 30 });
    A.arpeggio(10, 4, 0.16, 0.1);
    MJ.UI.toast('「' + j.name + '」回到大海了。祝牠一路順風。', 'soft', '+' + reward + ' 光');
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
      if (Math.random() < dt * 9) {
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
    const r = U.randInt(20, 40);
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

  Game.claimLetter = (moodId) => {
    const s = Game.state;
    const d = s.daily;
    const today = U.today();
    if (d.last === today) return null;
    const yesterday = U.today(new Date(Date.now() - 86400000));
    d.streak = d.last === yesterday ? d.streak + 1 : 1;
    d.best = Math.max(d.best || 0, d.streak);
    d.last = today;
    s.moods[today] = moodId;
    const reward = Math.min(150, 30 + (d.streak - 1) * 10);
    Game.addLight(reward);
    const gifts = ['星星糖 ×1'];
    s.inventory.star = (s.inventory.star || 0) + 1;
    if (d.streak % 3 === 0) {
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
      streak: d.streak,
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
    const reward = 15 * b.cycles;
    Game.addLight(reward);
    s.stats.breaths++;
    s.lastBreathAt = Date.now();
    A.breath('end');
    A.arpeggio(5, 4, 0.2, 0.1);
    Game.breath = null;
    Game.mode = 'normal';
    MJ.UI.breathEnd(true, reward);
    Game.save();
  };

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
    for (const a of ACH) {
      if (s.achievements[a.id]) continue;
      if (a.test(s, Game)) {
        s.achievements[a.id] = Date.now();
        Game.addLight(a.reward);
        A.discover();
        MJ.UI.toast('成就達成：' + a.name, 'achievement', a.desc + '・+' + a.reward + ' 光');
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

  /* ================= 開始 ================= */

  Game.start = () => {
    if (Game.started) return;
    Game.started = true;
    A.init();
    const h = new Date().getHours();
    if (h >= 0 && h < 4) Game.state.flags.nightOwl = true;
    MJ.UI.afterStart(Game.offline);
  };

  MJ.Game = Game;
})((window.MJ = window.MJ || {}));
