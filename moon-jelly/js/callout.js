/* 海月水母館 — 生物說明牌
 *
 * 點一隻水母（或心情長出來的生物），牠身上出現一個圈，一條細線從圈拉到一塊牌子。
 * - 牌子自己靠上或靠下，停在和生物相反的那一半，盡量不擋住牠；生物游過去了，牌子才換邊。
 * - 往空的地方拉（靠下的牌子往上、靠上的往下）→ 展開成詳細：上面的內容不換，只是往下多顯示。
 * - 往邊緣拉 → 詳細先收合，再拉一次就滑出去關上。
 * - 左右滑 → 換一隻：先是水母，再來是其他生物，依種類分組，組內依誕生／來到的時間。
 * 牌子本身用原本的樣式（霧面玻璃、圓角、手寫字）。
 */
(function (MJ) {
  'use strict';

  const UI = MJ.UI;
  const { U, Gn, A, esc, icon, $, noteName, dateStr, starsHTML, traitChips } = UI.h;
  let Game = null;

  const CO = {
    open: false,
    thing: null,
    status: null,
    side: 'b',
    expanded: false,
    queue: [],
    raf: 0,
    next: 0,
    moving: false,
    drag: null,
    justDragged: 0,
    act: null,
  };
  UI.callout = CO;

  let card, grip, pic, kicker, nameEl, body, prevB, nextB, leader, line, ring, dot;

  const narrow = () => window.innerWidth <= 700;
  const hudBottom = () => Math.max(UI.el.hud.getBoundingClientRect().bottom, 56);
  const dockTop = () => {
    const r = UI.el.dock.getBoundingClientRect();
    return r.top > 0 ? r.top : window.innerHeight;
  };

  /* ================= 生物在哪裡 ================= */

  const isJelly = (c) => c instanceof MJ.Jelly;
  const same = (a, b) => a === b || !!(a && b && a.kind === 'coral' && b.kind === 'coral' && a.item.entry === b.item.entry);

  /** 珊瑚每次重建都是新物件，用紀錄找回現在那一截 */
  const coralNow = (c) => {
    for (const r of Game.eco.reefs) {
      const it = r.items.find((x) => x.entry === c.item.entry);
      if (it) return [r, it];
    }
    return null;
  };

  /** 還在水族箱裡嗎 */
  const alive = (c) => {
    if (!c || !Game) return false;
    const E = Game.eco;
    if (isJelly(c)) return Game.jellies.includes(c) && !c.leaving;
    switch (c.kind) {
      case 'larva': return E.larvae.includes(c);
      case 'crab': return E.crabs.includes(c);
      case 'shell': return E.spare.includes(c);
      case 'lantern': return E.lanterns.includes(c);
      case 'clown': return E.anemones.some((a) => a.fish.includes(c));
      case 'anemone': return E.anemones.includes(c);
      case 'turtle': return E.turtles.includes(c);
      case 'seahorse': return E.seahorses.includes(c);
      case 'oyster': return E.oysters.includes(c);
      case 'octopus': return E.octopus === c;
      case 'bottle': return E.bottles.includes(c);
      case 'coral': return !!coralNow(c);
    }
    return false;
  };

  /** 圈要畫在哪裡：[x, y, r]（CSS 像素）。跟各生物的點擊範圍一致；躲起來或不在了回傳 null */
  const anchorOf = (c) => {
    if (!alive(c)) return null;
    const u = Game.unit;
    const w = Game.world;
    const W = Game.W;
    let a = null;
    if (isJelly(c)) {
      const [x, y] = c.center();
      a = [x, y, Math.max(c.bellW, c.bellH) * 0.6 + 8];
    } else {
      switch (c.kind) {
        case 'larva':
          a = [c.x, c.y, c.r * 1.6 + 8];
          break;
        case 'crab':
          if (c.x == null || c.inCave > 0) return null;
          a = [c.x, w.sandY(c.x) - 10 * c.k, 18 * c.k + 4];
          break;
        case 'shell': {
          const x = c.xf * W;
          a = [x, w.sandY(x) - 8 * u, 18 * u];
          break;
        }
        case 'lantern':
          a = [c.x, c.y, c.len * u * 0.6 + 6];
          break;
        case 'clown':
          if (c.x == null) return null;
          a = [c.x, c.y, 13 * u + 4];
          break;
        case 'anemone': {
          const [x, y] = c.center();
          a = [x, y, 32 * u * c.scale];
          break;
        }
        case 'turtle': {
          if (c.x == null) return null;
          const k = 1.35 * u * c.size;
          a = [c.x, c.y - 5 * k, 24 * k];
          break;
        }
        case 'seahorse': {
          if (c.x == null) return null;
          const k = 1.45 * u;
          a = [c.x + 5 * k * c.face, c.y - 17 * k, 22 * k];
          break;
        }
        case 'oyster': {
          const x = c.xf * W;
          a = [x, w.sandY(x) - 5 * u, 22 * u];
          break;
        }
        case 'octopus': {
          const x = W - 42 * u;
          a = [x, w.sandY(x) - 26 * u, 40 * u];
          break;
        }
        case 'bottle': {
          const [x, y] = c.pos();
          a = [x, y, 24 * u];
          break;
        }
        case 'coral': {
          const [r, it] = coralNow(c);
          const [bx, by] = r.base();
          let px = it.x;
          let py = -it.ry * 0.5;
          if (it.type !== 'mound') {
            px = it.bx;
            py = it.by;
            for (const q of it.tips) {
              px += q[0];
              py += q[1];
            }
            px /= it.tips.length + 1;
            py /= it.tips.length + 1;
          }
          a = [bx + px * u, by + py * u, 24 * u];
          break;
        }
      }
    }
    if (!a || !isFinite(a[0]) || !isFinite(a[1])) return null;
    return [a[0], a[1], U.clamp(a[2], 14, 72)];
  };

  /** 游出畫面的時候線先淡掉，牌子留著 */
  const readTarget = () => {
    const t = anchorOf(CO.thing);
    if (!t) return null;
    const [x, y, r] = t;
    if (x < -r || y < -r || x > window.innerWidth + r || y > window.innerHeight + r) return null;
    return t;
  };

  /* ================= 左右滑的順序 ================= */

  const bornAt = (c) => (c.entry ? c.entry.tt || c.entry.t : 0);
  const GROUPS = [
    { name: '水母', list: () => Game.jellies.filter((j) => !j.leaving).sort((a, b) => a.visitor - b.visitor || a.born - b.born), sorted: true },
    { name: '心情幼生', list: () => Game.eco.larvae },
    { name: '寄居蟹', list: () => Game.eco.crabs },
    { name: '燈籠魚', list: () => Game.eco.lanterns },
    { name: '小丑魚', list: () => [].concat(...Game.eco.anemones.map((a) => a.fish)) },
    { name: '海葵', list: () => Game.eco.anemones, t: (a) => a.entries[0].t },
    { name: '海龜', list: () => Game.eco.turtles },
    { name: '海馬', list: () => Game.eco.seahorses },
    { name: '珊瑚', list: () => [].concat(...Game.eco.reefs.map((r) => r.items.map((item) => ({ kind: 'coral', item, reef: r })))) },
    { name: '瓶中信', list: () => Game.eco.bottles },
    { name: '珍珠貝', list: () => Game.eco.oysters, t: () => 0 },
    { name: '章魚', list: () => (Game.eco.octopus ? [Game.eco.octopus] : []) },
  ];

  /** 全部排成一列：[{ c, g, i, n }]，i 是在自己那一組裡的第幾隻 */
  const lineup = () => {
    const out = [];
    for (const g of GROUPS) {
      let items = g.list().slice();
      if (!g.sorted) {
        const t = g.t || bornAt;
        items = items.map((c, k) => [c, k]).sort((a, b) => t(a[0]) - t(b[0]) || a[1] - b[1]).map((p) => p[0]);
      }
      items.forEach((c, i) => out.push({ c, g, i, n: items.length }));
    }
    return out;
  };

  /* ================= 牌子的內容 ================= */

  const meter = (label, bind, cls = '') => '<div class="meter"><span>' + label + '</span><div class="bar' + cls + '"><i data-bind="' + bind + '"></i></div></div>';

  /** 水母：一打開看得到的，和往空的地方拉開之後多出來的 */
  const jellyParts = (j) => {
    const g = j.genes;
    const d = Gn.describe(g);
    const title = '<span class="nm">' + esc(j.visitor ? '野生的訪客' : j.name) + '</span>' + starsHTML(d.stars);
    let short = '<div class="chips"><span class="chip">' + d.rarity + '・<span data-bind="stage">' + j.stage + '</span></span>' + traitChips(g) + '</div>';
    const actions = [];
    let more = '';
    if (j.visitor) {
      const left = Math.max(0, (j.leaveAt || 0) - Game.t);
      const full = Game.residentCount() >= Game.capacity();
      short += '<p class="lede">從外面的海游進來參觀的野生水母。大約 ' + U.duration(left) + '後就會離開。</p>';
      actions.push('<button class="btn sm" data-a="adopt"' + (full ? ' disabled' : '') + '>邀請牠住下來</button>');
      if (full) short += '<p class="note">水族箱滿了。升級水族箱，或讓一隻水母回到大海，就能留下牠。</p>';
    } else {
      short += '<div class="meters">' + meter('飽足', 'fullness') + meter('心情', 'happy', ' bar-happy') + (j.adult ? '' : meter('成長', 'growth', ' bar-grow')) + '</div>';
      short += '<p class="co-line"><span>來到這裡 <b>' + dateStr(j.born) + '</b></span><span>親密度 <b data-bind="affection">' + Math.floor(j.affection) + '</b></span></p>';
      actions.push('<button class="btn sm" data-a="pet">' + icon('heart') + '摸摸</button>');
      more += '<dl class="facts">';
      more += '<div><dt>吃掉的心情</dt><dd>' + j.worryFed + ' 份</dd></div>';
      more += '<div><dt>牠的音</dt><dd>' + noteName(g) + '</dd></div>';
      more += '<div><dt>觸手</dt><dd>' + g.tentacles + ' 條</dd></div>';
      if (j.origin) more += '<div><dt>來自</dt><dd>' + dateStr(j.origin.t) + ' 的「' + esc(j.origin.word) + '」</dd></div>';
      else more += '<div><dt>父母</dt><dd>' + (j.parents ? esc(j.parents.join(' × ')) : '來自大海') + '</dd></div>';
      more += '</dl>';
      const br = Game.breedable(j);
      more += '<div class="actions"><button class="btn sm" data-a="mate" data-bind="mateBtn"' + (br.ok ? '' : ' disabled') + '>找伴侶</button>';
      more += '<button class="btn sm ghost" data-a="rename">改名</button><button class="btn sm ghost quiet" data-a="release">回到大海</button></div>';
      more += '<p class="note" data-bind="breedNote"></p>';
      if (j.origin) more += '<p class="note">由心情變成的水母不佔水族箱的名額，也不替你賺光。牠只是陪著。</p>';
    }
    return {
      title,
      short,
      actions,
      more,
      pic: () => {
        // 小小的標本窗：跟原本名片上的一樣，是會動的水母
        const size = 48;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        pic.innerHTML = '<canvas class="co-portrait" width="' + size * dpr + '" height="' + size * dpr + '"></canvas>';
        const canvas = pic.firstChild;
        const env = MJ.Jelly.portraitEnv(g, size);
        env.world.theme = { glow: 1 };
        const pj = MJ.Jelly.posed(g, j.growth, env);
        for (let i = 0; i < 40; i++) pj.animate(1 / 30, env);
        UI.cardLive = { jelly: pj, env, canvas, ctx: canvas.getContext('2d'), dpr, size };
      },
      bind: (root) => {
        const els = {};
        root.querySelectorAll('[data-bind]').forEach((el) => (els[el.dataset.bind] = el));
        UI.bound = { jelly: j, els, wasAdult: j.adult, visitor: j.visitor, co: true };
        UI.refreshBound();
      },
      act: async (a) => {
        if (a === 'pet') Game.petButton(j.id);
        else if (a === 'adopt') {
          Game.adoptVisitor(j.id);
          if (!j.visitor) {
            CO.status = '住下來了';
            render();
          }
        } else if (a === 'mate') UI.openSheet('mate', j, { back: null });
        else if (a === 'rename') {
          const name = await UI.prompt({ title: '幫牠取個新名字', value: j.name, max: 12 });
          if (name) {
            Game.rename(j.id, name);
            CO.refresh();
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
            CO.close();
            Game.release(j.id);
          }
        }
      },
    };
  };

  const render = () => {
    const c = CO.thing;
    UI.cardLive = null;
    UI.bound = null;
    Game.selectedId = isJelly(c) ? c.id : null;
    const P = isJelly(c) ? jellyParts(c) : UI.creatureParts(c);
    CO.act = P.act || null;
    const all = lineup();
    const me = all.find((p) => same(p.c, c));
    kicker.innerHTML =
      (me ? '<span>' + esc(me.g.name) + '</span><span class="co-pos">' + (me.i + 1) + ' / ' + me.n + '</span>' : '') +
      (CO.status ? '<span class="chip special co-status">' + esc(CO.status) + '</span>' : '');
    nameEl.innerHTML = P.title;
    if (P.pic) P.pic();
    else pic.innerHTML = '<div class="res-badge co-badge" style="--h:' + P.badge.hue + '">' + icon(P.badge.icon) + '</div>';
    const hasMore = !!P.more;
    if (!hasMore) CO.expanded = false;
    const acts = P.actions.slice();
    if (hasMore) acts.push('<button class="btn sm ghost co-more-btn" data-a="more" aria-expanded="' + CO.expanded + '">' + (CO.expanded ? '收合' : '詳細') + '</button>');
    body.innerHTML =
      '<div class="co-short">' + P.short + (acts.length ? '<div class="actions co-acts">' + acts.join('') + '</div>' : '') + '</div>' +
      (hasMore ? '<div class="co-more">' + P.more + '</div>' : '');
    body.scrollTop = 0;
    card.classList.toggle('has-more', hasMore);
    card.classList.toggle('expanded', CO.expanded);
    grip.setAttribute('aria-label', CO.expanded ? '收合' : '看詳細');
    const many = all.length > 1;
    prevB.disabled = nextB.disabled = !many;
    if (P.bind) P.bind(body);
    if (P.after) P.after(body);
  };

  /* ================= 位置 ================= */

  /** 牌子停在和生物相反的那一半：生物在上半 → 牌子靠下（貼著底部選單）；在下半 → 靠上（在頂部資訊下面） */
  const place = () => {
    const t = readTarget();
    const W = window.innerWidth;
    const hb = hudBottom();
    const dt = dockTop();
    CO.side = t && t[1] > (hb + dt) / 2 ? 't' : 'b';
    card.classList.toggle('side-t', CO.side === 't');
    card.classList.toggle('side-b', CO.side === 'b');
    // 牌子靠上的時候，通知改從下面出來，不壓在牌子上
    document.body.classList.toggle('co-top', CO.side === 't');
    const w = narrow() ? W - 24 : 380;
    const left = narrow() ? 12 : U.clamp((t ? t[0] : W / 2) - w / 2, 16, Math.max(16, W - 16 - w));
    card.style.width = w + 'px';
    card.style.left = Math.round(left) + 'px';
    if (CO.side === 'b') {
      card.style.bottom = Math.round(window.innerHeight - dt + 8) + 'px';
      card.style.top = 'auto';
    } else {
      card.style.top = Math.round(hb + 8) + 'px';
      card.style.bottom = 'auto';
    }
    size(t);
    CO.placedAt = t ? t.slice() : null;
  };

  /** 詳細的時候長到生物旁邊為止（不蓋住牠）；那邊的空間太小，才讓它長滿 */
  const size = (t) => {
    const hb = hudBottom();
    const dt = dockTop();
    const full = dt - 8 - (hb + 8);
    let max = full;
    if (CO.expanded && t) {
      const room = CO.side === 'b' ? dt - 8 - (t[1] + t[2] + 18) : t[1] - t[2] - 18 - (hb + 8);
      if (room >= 280) max = Math.min(full, room);
    }
    card.style.maxHeight = Math.round(Math.max(160, max)) + 'px';
  };

  const nearestOnCircle = (cx, cy, r, px, py) => {
    const d = Math.hypot(px - cx, py - cy) || 1;
    return [cx + ((px - cx) / d) * r, cy + ((py - cy) / d) * r, d];
  };

  /** 細線：從圈上最靠近牌子的那一點，拉到牌子的邊（每一幀跟著生物） */
  const draw = (t) => {
    const R = card.getBoundingClientRect();
    const [x, y, r] = t;
    const ey = CO.side === 'b' ? R.top : R.bottom;
    const ex = U.clamp(x, R.left + 28, R.right - 28);
    const [px, py, d] = nearestOnCircle(x, y, r, ex, ey);
    const set = (el, k) => {
      for (const n in k) el.setAttribute(n, typeof k[n] === 'number' ? k[n].toFixed(1) : k[n]);
    };
    set(ring, { cx: x, cy: y, r });
    const show = d > r + 6 && (CO.side === 'b' ? y < R.top : y > R.bottom);
    set(line, { x1: px, y1: py, x2: ex, y2: ey, opacity: show ? 1 : 0 });
    set(dot, { cx: ex, cy: ey, opacity: show ? 1 : 0 });
  };

  /** 生物游到牌子底下、跑到另一半、或（桌面）橫著離太遠：牌子才換位置，淡出淡入，不追著跑 */
  const maybeMove = (t) => {
    if (CO.expanded || CO.moving) return;
    const now = performance.now();
    if (now < CO.next) return;
    CO.next = now + 500;
    const R = card.getBoundingClientRect();
    const [x, y, r] = t;
    const pad = 10;
    const overlap = x + r > R.left - pad && x - r < R.right + pad && y + r > R.top - pad && y - r < R.bottom + pad;
    const wrong = CO.side === 'b' ? y > R.top : y < R.bottom;
    const far = !narrow() && (x < R.left - 160 || x > R.right + 160);
    if (overlap || wrong || far) relocate();
  };

  const relocate = () => {
    CO.moving = true;
    CO.next = performance.now() + 1600;
    card.classList.remove('show');
    leader.classList.add('lost');
    setTimeout(() => {
      CO.moving = false;
      if (!CO.open) return;
      place();
      card.classList.add('show');
      leader.classList.remove('lost');
    }, 180);
  };

  const tick = () => {
    CO.raf = 0;
    if (!CO.open) return;
    // 開始陪心情、呼吸、晚安、拍照、調整擺設：牌子收起來
    if ((MJ.Ritual && MJ.Ritual.open) || Game.mode !== 'normal' || !alive(CO.thing)) {
      CO.close();
      return;
    }
    const t = readTarget();
    if (!t) leader.classList.add('lost');
    else {
      // 一打開還找不到生物（剛淡入、躲在洞裡）：找到的時候再擺一次
      if (!CO.placedAt && !CO.drag && !CO.moving) place();
      if (!CO.moving) leader.classList.remove('lost');
      draw(t);
      if (!CO.drag) maybeMove(t);
    }
    CO.raf = requestAnimationFrame(tick);
  };

  /* ================= 打開、換一隻、關上 ================= */

  const openOn = (thing, status) => {
    if (UI.sheetKind) UI.closeSheet();
    UI.closePopovers();
    const again = CO.open && same(CO.thing, thing);
    CO.thing = thing;
    CO.status = status || (again ? CO.status : null);
    if (!again) CO.expanded = false;
    clearStyles();
    render();
    const first = !CO.open;
    CO.open = true;
    document.body.classList.add('co-open');
    card.hidden = false;
    CO.next = performance.now() + 900;
    place();
    if (first) {
      card.classList.remove('show');
      leader.classList.remove('on', 'lost');
      void card.offsetWidth;
    }
    requestAnimationFrame(() => {
      if (!CO.open) return;
      card.classList.add('show');
      leader.classList.add('on');
    });
    if (!CO.raf) CO.raf = requestAnimationFrame(tick);
  };

  /**
   * 打開某隻生物的牌子。
   * o.auto：通知之後自己出現的（出生、撈到、陪完心情…）。排隊，等你手上沒在看別的（抽屜、別的牌子、視窗、儀式）再出來。
   * o.status：牌子上方的小字，例如「剛出生」。
   */
  CO.show = (thing, o = {}) => {
    if (!thing || !Game) return;
    if (o.auto) {
      // 你正看著的就是牠：只換上方的小字，不再排一次
      if (CO.open && same(CO.thing, thing)) {
        CO.status = o.status || CO.status;
        render();
        return;
      }
      CO.queue.push({ thing, status: o.status || null, at: Date.now() });
      return;
    }
    openOn(thing, o.status);
  };

  const busy = () =>
    CO.open || !!UI.sheetKind || UI.modalOpenNow || (MJ.Ritual && MJ.Ritual.open) || Game.mode !== 'normal' || !Game.started || UI.el.feedPop.classList.contains('open');

  /** 每 0.4 秒看一次排隊的牌子 */
  CO.pump = () => {
    if (!CO.queue.length) return;
    // 寫下過自傷字詞之後，整段都安靜：不讓牌子自己跳出來
    if (UI.quietUntil - Date.now() > 3600 * 1000) {
      CO.queue.length = 0;
      return;
    }
    const now = Date.now();
    CO.queue = CO.queue.filter((q) => now - q.at < 120000 && alive(q.thing));
    if (!CO.queue.length || busy()) return;
    const q = CO.queue.shift();
    openOn(q.thing, q.status);
  };

  CO.refresh = () => {
    if (CO.open) render();
  };

  const clearStyles = () => {
    card.classList.remove('dragging');
    card.style.transform = '';
    card.style.opacity = '';
    card.style.transition = '';
    card.style.height = '';
  };

  CO.close = () => {
    if (!CO.open) return;
    CO.open = false;
    CO.thing = null;
    CO.status = null;
    CO.expanded = false;
    CO.drag = null;
    CO.act = null;
    UI.cardLive = null;
    if (UI.bound && UI.bound.co) UI.bound = null;
    if (Game) Game.selectedId = null;
    card.classList.remove('show');
    leader.classList.remove('on');
    document.body.classList.remove('co-open', 'co-top');
    setTimeout(() => {
      if (CO.open) return;
      card.hidden = true;
      clearStyles();
      card.classList.remove('expanded');
    }, 280);
  };

  /** 左右滑：換下一隻（或上一隻）。最後一隻之後回到第一隻 */
  const step = (delta) => {
    const all = lineup();
    if (all.length < 2) return snap();
    const i = all.findIndex((p) => same(p.c, CO.thing));
    const next = all[(i + delta + all.length) % all.length].c;
    A.click();
    const out = delta > 0 ? -1 : 1;
    card.classList.remove('dragging');
    card.style.transition = 'transform 0.16s ease-in, opacity 0.16s';
    card.style.transform = 'translateX(' + out * 70 + 'px)';
    card.style.opacity = '0';
    leader.classList.add('lost');
    setTimeout(() => {
      if (!CO.open) return;
      CO.thing = next;
      CO.status = null;
      render();
      place();
      card.style.transition = 'none';
      card.style.transform = 'translateX(' + -out * 70 + 'px)';
      void card.offsetWidth;
      card.style.transition = '';
      card.style.transform = '';
      card.style.opacity = '';
      leader.classList.remove('lost');
    }, 170);
  };

  /** 展開成詳細／收合：從貼著的那一邊往空的地方長出去 */
  const setExpanded = (on) => {
    if (on === CO.expanded || (on && !card.classList.contains('has-more'))) return;
    const h0 = card.offsetHeight;
    CO.expanded = on;
    card.classList.toggle('expanded', on);
    const b = body.querySelector('.co-more-btn');
    if (b) {
      b.textContent = on ? '收合' : '詳細';
      b.setAttribute('aria-expanded', String(on));
    }
    grip.setAttribute('aria-label', on ? '收合' : '看詳細');
    if (!on) body.scrollTop = 0;
    size(readTarget());
    const h1 = card.offsetHeight;
    card.style.transition = 'none';
    card.style.height = h0 + 'px';
    void card.offsetWidth;
    card.style.transition = 'height 0.32s var(--ease), transform 0.3s var(--ease), opacity 0.22s';
    card.style.height = h1 + 'px';
    clearTimeout(CO.hTimer);
    CO.hTimer = setTimeout(() => {
      card.style.height = '';
      card.style.transition = '';
    }, 360);
    A.click();
  };

  const snap = () => {
    card.classList.remove('dragging');
    card.style.transform = '';
    card.style.opacity = '';
  };

  const slideAway = () => {
    card.classList.remove('dragging');
    card.style.transition = 'transform 0.22s ease-in, opacity 0.22s';
    card.style.transform = 'translateY(' + (CO.side === 'b' ? 120 : -120) + '%)';
    card.style.opacity = '0';
    setTimeout(() => CO.close(), 200);
  };

  /* ================= 拖拉 ================= */

  const onDown = (e) => {
    if (!CO.open || (e.button != null && e.button > 0)) return;
    if (e.target.closest('input, textarea, a')) return;
    CO.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), axis: null, dx: 0, dy: 0, head: !!e.target.closest('.co-grip, .co-head') };
  };

  const onMove = (e) => {
    const g = CO.drag;
    if (!g || e.pointerId !== g.id) return;
    g.dx = e.clientX - g.x0;
    g.dy = e.clientY - g.y0;
    if (!g.axis) {
      if (Math.hypot(g.dx, g.dy) < 10) return;
      g.axis = Math.abs(g.dx) > Math.abs(g.dy) ? 'x' : 'y';
      // 詳細的內容比牌子長時，上下滑是捲動；要收合從上面那一條拉
      if (g.axis === 'y' && CO.expanded && !g.head && body.scrollHeight > body.clientHeight + 2) {
        CO.drag = null;
        return;
      }
      try {
        card.setPointerCapture(g.id);
      } catch (err) {
        /* 沒關係 */
      }
      card.classList.add('dragging');
    }
    if (g.axis === 'x') {
      card.style.transform = 'translateX(' + g.dx + 'px)';
      card.style.opacity = String(Math.max(0.35, 1 - Math.abs(g.dx) / 360));
    } else {
      const toEdge = CO.side === 'b' ? g.dy > 0 : g.dy < 0;
      card.style.transform = 'translateY(' + (toEdge ? g.dy : g.dy * 0.3) + 'px)';
      if (toEdge && !CO.expanded) card.style.opacity = String(Math.max(0.35, 1 - Math.abs(g.dy) / 260));
    }
  };

  const onUp = (e) => {
    const g = CO.drag;
    if (!g || e.pointerId !== g.id) return;
    CO.drag = null;
    if (!g.axis) return;
    CO.justDragged = performance.now();
    if (e.type === 'pointercancel') return snap();
    const dt = Math.max(1, performance.now() - g.t0);
    if (g.axis === 'x') {
      const fast = Math.abs(g.dx) > 30 && Math.abs(g.dx) / dt > 0.5;
      if (Math.abs(g.dx) > 70 || fast) return step(g.dx < 0 ? 1 : -1);
      return snap();
    }
    const toEdge = CO.side === 'b' ? g.dy > 0 : g.dy < 0;
    const fast = Math.abs(g.dy) > 24 && Math.abs(g.dy) / dt > 0.5;
    if (toEdge) {
      if (Math.abs(g.dy) < 60 && !fast) return snap();
      if (CO.expanded) {
        snap();
        setExpanded(false);
      } else slideAway();
    } else {
      snap();
      if (Math.abs(g.dy) > 36 || fast) setExpanded(true);
    }
  };

  /* ================= 初始化 ================= */

  UI.onInit((g) => {
    Game = g;
    card = $('callout');
    grip = $('coGrip');
    pic = $('coPic');
    kicker = $('coKicker');
    nameEl = $('coName');
    body = $('coBody');
    prevB = $('coPrev');
    nextB = $('coNext');
    leader = $('coLeader');
    line = $('coLine');
    ring = $('coRing');
    dot = $('coDot');

    card.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    // 拖拉放開時不要順便按到按鈕
    card.addEventListener(
      'click',
      (e) => {
        if (performance.now() - CO.justDragged < 350) {
          e.stopPropagation();
          e.preventDefault();
        }
      },
      true
    );
    card.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]');
      if (!b || b.disabled) return;
      const a = b.dataset.a;
      if (a === 'more') setExpanded(!CO.expanded);
      else if (CO.act) CO.act(a, b);
    });
    grip.addEventListener('click', () => setExpanded(!CO.expanded));
    prevB.addEventListener('click', () => step(-1));
    nextB.addEventListener('click', () => step(1));
    $('coClose').addEventListener('click', () => CO.close());
    document.addEventListener('keydown', (e) => {
      if (!CO.open || UI.modalOpenNow || e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });
    window.addEventListener('resize', () => {
      if (CO.open) place();
    });
  });

  UI.anchorOf = anchorOf;
})((window.MJ = window.MJ || {}));
