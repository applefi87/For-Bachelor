/* 海月水母館 — 抽屜裡屬於海的內容：水母名片、找伴侶、商店、呼吸、更多、名冊、設定、關於。
 * 抽屜本身是暗色展示牌（DESIGN.md §6.7）。這裡都是「現在的事」，直接排在暗色上，不放紙；
 * 分組靠間距和小標，分列靠細線，不包框，也不放線條圖示。 */
(function (MJ) {
  'use strict';

  const UI = MJ.UI;
  const RENDER = UI.RENDER;
  const { U, Gn, A, F, esc, $, noteName, colorCss, portraitImg } = UI.h;
  let Game = null;
  UI.onInit((g) => (Game = g));

  /* ================= 小工具 ================= */

  const pad = (n) => String(n).padStart(2, '0');
  const num = (s) => '<span class="num">' + s + '</span>';
  const light = (n) => '光 ' + num(U.fmt(n));
  const mobile = () => window.matchMedia('(max-width: 699px)').matches;

  /** 欄位日期：09.25；不是今年才加年份（DESIGN.md §4.2） */
  const md = (ts) => {
    const d = new Date(ts);
    const s = pad(d.getMonth() + 1) + '.' + pad(d.getDate());
    return d.getFullYear() === new Date().getFullYear() ? s : d.getFullYear() + '.' + s;
  };

  /** 時間長度：超過 1 分鐘就不寫秒 */
  const dur = (sec) => {
    sec = Math.max(0, Math.ceil(sec));
    if (sec < 60) return sec + ' 秒';
    const m = Math.max(1, Math.round(sec / 60));
    if (m < 60) return m + ' 分';
    return Math.floor(m / 60) + ' 小時' + (m % 60 ? ' ' + (m % 60) + ' 分' : '');
  };

  /** 名字是不是你自己取的：你取的名字用手寫體（DESIGN.md §1 第 3 條） */
  const isNamed = (j) => !!(j.named || (Game.state.flags.named && Game.state.flags.named[j.id]));
  const nameHTML = (j) => (isNamed(j) ? '<span class="hand">' + esc(j.name) + '</span>' : esc(j.name));

  /** 特徵：顏色、傘形、花紋、體質（顏色前面一塊方形色票，這是資料，不是裝飾） */
  const traitList = (g) => {
    const d = Gn.describe(g);
    return [d.colorName, d.shapeName, d.patternName, d.specialName].filter(Boolean);
  };
  const swatch = (g) => '<i class="swatch-sq" style="--c:' + colorCss(g) + '" aria-hidden="true"></i>';

  /** 抽屜頁首的標題要放手寫的名字或等寬的編號時，等 openSheet 寫完純文字再換掉 */
  const titleHTML = (html, kind, arg) =>
    queueMicrotask(() => {
      if (UI.sheetKind === kind && UI.sheetArg === arg) UI.el.sheetTitle.innerHTML = html;
    });

  /** 返回鍵寫上一層的名字：「← 更多」 */
  const BACK_NAME = { more: '更多', roster: '名冊', shop: '商店', codex: '圖鑑', settings: '設定', tides: '潮汐圖' };
  UI.onInit(() => {
    const back = $('sheetBack');
    const title = $('sheetTitle');
    if (!back || !title || !window.MutationObserver) return;
    new MutationObserver(() => {
      const t = '← ' + (BACK_NAME[UI.sheetBackTo] || '上一層');
      if (back.textContent !== t) back.textContent = t;
    }).observe(title, { childList: true, characterData: true, subtree: true });
  });

  /* ================= 會變動的數字（每 0.4 秒） ================= */

  const setText = (el, t) => {
    if (el && el.textContent !== t) el.textContent = t;
  };
  const setHTML = (el, key, html) => {
    if (el && el.dataset.k !== key) {
      el.dataset.k = key;
      el.innerHTML = html;
    }
  };

  const tick = () => {
    const kind = UI.sheetKind;
    if (!kind || !Game) return;
    const body = UI.el.sheetBody;
    const s = Game.state;
    if (kind === 'shop') {
      setText(body.querySelector('[data-live="light"]'), U.fmt(s.light));
      setText(body.querySelector('[data-live="rate"]'), '+' + U.fmt(Game.rate * 3600));
      setText(body.querySelector('[data-live="cap"]'), Game.residentCount() + '/' + Game.capacity());
      // 買得起就出現「換取」；買不起就寫還差多少，不做半透明的按鈕
      body.querySelectorAll('[data-cost]').forEach((side) => {
        const cost = +side.dataset.cost;
        const can = s.light >= cost;
        const btn = side.querySelector('[data-buy]');
        const short = side.querySelector('.short');
        if (btn && btn.hidden === can) btn.hidden = !can;
        if (short) {
          if (short.hidden !== can) short.hidden = can;
          if (!can) {
            const n = U.fmt(Math.ceil(cost - s.light));
            setHTML(short, n, '還差 ' + num(n) + ' 光');
          }
        }
      });
    } else if (kind === 'jelly') {
      const b = UI.bound;
      if (!b || !b.jelly) return;
      const j = b.jelly;
      for (const k of ['fullness', 'happy', 'growth']) setText(body.querySelector('[data-live="' + k + '"]'), String(Math.round(U.clamp(j[k], 0, 1) * 100)));
      if (!j.visitor) {
        const br = Game.breedable(j);
        setText(body.querySelector('[data-live="breed"]'), br.ok ? '可以' : String(br.reason).replace(/[\u3002\uff01!]+$/, ''));
        const mate = body.querySelector('[data-a="mate"]');
        if (mate && mate.hidden === br.ok) mate.hidden = !br.ok;
      }
    } else if (kind === 'roster') {
      body.querySelectorAll('[data-hatch]').forEach((el) => {
        const p = Game.polyps.find((q) => q.id === el.dataset.hatch);
        if (p) setText(el, p.stageName + '　約 ' + dur(p.remaining) + '後孵化');
      });
    }
  };

  // 接在「海的介面」每 0.4 秒的更新後面（ui.js 的 UI.frame 會呼叫 UI.refreshBound）
  const baseRefresh = UI.refreshBound;
  UI.refreshBound = () => {
    baseRefresh();
    tick();
  };

  /* ================= 水母名片 ================= */

  RENDER.jelly = (body, j) => {
    const g = j.genes;
    const d = Gn.describe(g);
    const size = mobile() ? 132 : 168;
    const visitor = j.visitor;
    if (!visitor) UI.lastJellyId = j.id;

    let html = '<div class="card-hero">';
    html += '<canvas class="card-portrait" id="cardCanvas" width="' + size + '" height="' + size + '" aria-label="' + esc(j.name) + '的樣子"></canvas>';
    html += '<div class="card-id">';
    html += '<p class="card-sp">海月水母　<span class="latin">Aurelia aurita</span></p>';
    html += '<p class="card-line">' + (visitor ? j.stage : '<span data-bind="stage">' + j.stage + '</span>') + '</p>';
    html += '<p class="card-line">' + d.rarity + '　' + num(d.stars + '/5') + '</p>';
    html += '<p class="card-traits">' + swatch(g) + traitList(g).join('　') + '</p>';
    html += '</div></div>';

    if (visitor) {
      const left = Math.max(0, (j.leaveAt || 0) - Game.t);
      html += '<p class="lede">野生訪客。約 ' + dur(left) + '後離開。</p>';
      const full = Game.residentCount() >= Game.capacity();
      if (full) html += '<p class="note">水族箱已滿。</p>';
      else html += '<div class="btn-row card-actions"><button class="btn-2" data-a="adopt">留下牠</button></div>';
    } else {
      const meter = (k, label) =>
        '<div class="meter"><span>' + label + '</span><div class="bar"><i data-bind="' + k + '"></i></div><span class="num" data-live="' + k + '"></span></div>';
      html += '<div class="meters">' + meter('fullness', '飽足') + meter('happy', '開心') + (j.adult ? '' : meter('growth', '成長')) + '</div>';

      html += '<dl class="kv card-kv">';
      html += '<div><dt>親密度</dt><dd><span class="num" data-bind="affection">' + Math.floor(j.affection) + '</span></dd></div>';
      html += '<div><dt>吃掉的心情</dt><dd>' + num(j.worryFed) + ' 筆</dd></div>';
      html += '<div><dt>牠的音</dt><dd>' + noteName(g) + '</dd></div>';
      html += '<div><dt>觸手</dt><dd>' + num(g.tentacles) + ' 條</dd></div>';
      html += '<div><dt>來到這裡</dt><dd>' + num(md(j.born)) + '</dd></div>';
      if (j.origin) html += '<div><dt>來自</dt><dd>' + num(md(j.origin.t)) + ' 的「' + esc(j.origin.word) + '」</dd></div>';
      else html += '<div><dt>父母</dt><dd>' + (j.parents ? esc(j.parents.join(' × ')) : '大海') + '</dd></div>';
      html += '<div><dt>配對</dt><dd data-live="breed"></dd></div>';
      html += '</dl>';

      // 這一層沒有主要按鈕；回到大海是刪除類動作，放在行尾，原地確認
      html += '<div class="btn-row card-actions">';
      html += '<button class="btn-2" data-a="pet">摸摸</button>';
      html += '<button class="btn-2" data-a="rename">改名</button>';
      html += '<button class="btn-2" data-a="mate" hidden>找伴侶</button>';
      html += '<button class="btn-2 danger" data-a="release">回到大海</button>';
      html += '</div><div class="card-inline" hidden></div>';
      if (j.origin) html += '<p class="note">心情水母不佔名額、不產光。</p>';
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
    baseRefresh();
    tick();

    const actions = body.querySelector('.card-actions');
    const inline = body.querySelector('.card-inline');
    const back = () => {
      inline.hidden = true;
      inline.innerHTML = '';
      actions.hidden = false;
      const f = actions.querySelector('[data-a="' + (inline.dataset.from || 'pet') + '"]');
      if (f) f.focus();
    };
    const open = (from, markup) => {
      inline.dataset.from = from;
      inline.innerHTML = markup;
      actions.hidden = true;
      inline.hidden = false;
    };

    if (actions)
      actions.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-a]');
        if (!b) return;
        const a = b.dataset.a;
        if (a === 'pet') Game.petButton(j.id);
        else if (a === 'adopt') {
          Game.adoptVisitor(j.id);
          UI.openSheet('jelly', j);
        } else if (a === 'mate') UI.openSheet('mate', j, { back: null });
        else if (a === 'rename') {
          // 改名在原地變成一條書寫線；你打的字是手寫體
          open(
            'rename',
            '<form class="card-rename"><label class="label" for="renameIn">新的名字</label>' +
              '<input id="renameIn" class="lined" maxlength="12" autocomplete="off" value="' + esc(j.name) + '">' +
              '<div class="btn-row"><button type="button" class="btn-3" data-r="no">取消</button><button type="submit" class="btn-2">好</button></div></form>'
          );
          const input = $('renameIn');
          input.focus();
          input.select();
          inline.querySelector('[data-r="no"]').addEventListener('click', back);
          inline.querySelector('form').addEventListener('submit', (ev) => {
            ev.preventDefault();
            const name = input.value.trim();
            if (!name || name === j.name) return back();
            // 寫字的地方都要做危機檢查：有自傷的字就先打開專線，名字不改
            if (F.isCrisis(name)) {
              back();
              UI.careModal();
              return;
            }
            const flags = Game.state.flags;
            flags.named = flags.named || {};
            flags.named[j.id] = 1;
            j.named = true;
            Game.rename(j.id, name);
            UI.rerender();
          });
        } else if (a === 'release') {
          open(
            'release',
            '<p class="card-ask">讓「' + nameHTML(j) + '」回到大海？</p><p class="note">牠會游出水族箱，名字留在名冊。</p>' +
              '<div class="btn-row"><button type="button" class="btn-3" data-r="no">取消</button><button type="button" class="btn-2 danger" data-r="yes">讓牠回去</button></div>'
          );
          // 預設焦點放在「取消」
          const no = inline.querySelector('[data-r="no"]');
          no.focus();
          no.addEventListener('click', back);
          inline.querySelector('[data-r="yes"]').addEventListener('click', () => {
            UI.closeSheet();
            Game.release(j.id);
          });
        }
      });

    if (!visitor) titleHTML((j.no != null ? num('No. ' + j.no) + '　' : '') + nameHTML(j), 'jelly', j);
    return visitor ? '野生訪客' : j.name;
  };

  /* ================= 找伴侶 ================= */

  RENDER.mate = (body, j) => {
    const list = Game.partnersFor(j);
    if (!list.some((k) => k.id === UI.mateSel)) UI.mateSel = null;
    let html = '<p class="lede">兩隻成年、吃飽、沒在休息的水母，可以一起孕育水螅體。孩子混合兩邊的特徵，偶爾出現新的。</p>';
    html += '<p class="mate-pair">' + portraitImg(j.genes, j.growth, 48, 'portrait xs') + '<span>' + nameHTML(j) + '</span><span class="fg-3">×</span><span data-live="partner" class="fg-2">還沒選</span></p>';
    if (!list.length) {
      html += '<p class="empty">沒有可配對的對象（需成年、吃飽）。</p>';
    } else {
      html += '<h3 class="sub-h">選一隻</h3><div class="rows" role="radiogroup" aria-label="選一隻">';
      for (const k of list) {
        const on = k.id === UI.mateSel;
        html += '<button type="button" class="row pick-row' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-mate="' + k.id + '">' + portraitImg(k.genes, k.growth, 48, 'portrait xs');
        html += '<span class="row-main"><span class="row-title">' + nameHTML(k) + '</span>';
        html += '<span class="row-sub">' + traitList(k.genes).join('　') + '</span>';
        if (Game.feeling(j, k)) html += '<span class="row-sub">可能出現特殊體質</span>';
        html += '</span></button>';
      }
      html += '</div>';
      html += '<div class="btn-row"><span class="note" id="mateWhy">先選一隻</span><button class="btn" id="mateGo">讓牠們靠近</button></div>';
    }
    body.innerHTML = html;

    const go = $('mateGo');
    const sync = () => {
      const k = list.find((x) => x.id === UI.mateSel);
      const p = body.querySelector('[data-live="partner"]');
      p.innerHTML = k ? nameHTML(k) : '還沒選';
      p.className = k ? '' : 'fg-2';
      body.querySelectorAll('[data-mate]').forEach((b) => {
        const on = b.dataset.mate === UI.mateSel;
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', String(on));
      });
      if (go) {
        go.disabled = !k;
        $('mateWhy').hidden = !!k;
      }
    };
    body.querySelectorAll('[data-mate]').forEach((b) =>
      b.addEventListener('click', () => {
        A.click();
        UI.mateSel = b.dataset.mate;
        sync();
      })
    );
    if (go)
      go.addEventListener('click', () => {
        if (UI.mateSel && Game.startMate(j.id, UI.mateSel)) {
          UI.mateSel = null;
          UI.closeSheet();
        }
      });
    sync();
    return '找伴侶';
  };

  /* ================= 商店 ================= */

  // 撈水母那一列的縮圖：一隻普通的海月水母
  const SAMPLE = { hue: 196, hue2: 176, sat: 0.4, shape: 'dome', size: 1, tentacles: 8, tentLen: 0.9, arms: 2, armLen: 0.7, pattern: 'clover', glow: 0.75, pulse: 1, special: null, seed: 424242 };

  /** 右欄：價格＋換取；買不起就寫還差多少。已擁有、已滿這類狀態直接寫字 */
  const buySide = (price, attrs, label = '換取') =>
    '<div class="shop-side" data-cost="' + price + '"><span class="price">' + light(price) + '</span>' +
    '<button type="button" class="btn-2" ' + attrs + '>' + label + '</button><span class="short" hidden></span></div>';
  const stateSide = (text, cls = '') => '<div class="shop-side"><span class="state' + (cls ? ' ' + cls : '') + '">' + text + '</span></div>';

  const shopRow = (thumb, title, lines, side, on) =>
    '<li class="row shop-row' + (on ? ' on' : '') + '">' + thumb + '<div class="row-main"><div class="row-title">' + title + '</div>' + lines + '</div>' + side + '</li>';
  const sub = (t) => '<div class="row-sub">' + t + '</div>';
  const clue = (t) => (t ? '<div class="row-sub clue">' + t + '</div>' : '');

  const decorSide = (k, def, n, locked) => {
    if (n >= def.max) return stateSide(def.max > 1 ? '已滿' : '已放置');
    if (locked) return stateSide('還沒有珍珠');
    return buySide(def.price, 'data-buy="decor" data-id="' + k + '"');
  };

  const habitatRow = (k, have) => {
    const def = MJ.Decor.DEFS[k];
    const n = Game.decorCount(k);
    const locked = def.needsPearl && !Game.eco.pearls().length;
    return shopRow('<canvas class="thumb" data-decor="' + k + '" width="72" height="72" aria-hidden="true"></canvas>', def.name, sub(def.desc) + clue(have), decorSide(k, def, n, locked));
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
    let html = '<p class="wallet"><span class="wallet-l">光</span><span class="num wallet-n" data-live="light">' + U.fmt(s.light) + '</span>';
    html += '<span class="wallet-rate"><span class="num" data-live="rate">+' + U.fmt(Game.rate * 3600) + '</span>/小時</span></p>';
    html += '<div class="tabs" role="tablist" aria-label="商店分類">';
    for (const [id, name] of tabs) html += '<button type="button" role="tab" class="tab' + (id === tab ? ' on' : '') + '" aria-selected="' + (id === tab) + '" data-tab="' + id + '">' + name + '</button>';
    html += '</div>';

    if (tab === 'jelly') {
      const full = Game.residentCount() >= Game.capacity();
      html += '<ul class="rows shop-rows">';
      html += shopRow(
        portraitImg(SAMPLE, 1, 72, 'thumb'),
        '撈一隻野生水母',
        sub('外觀隨機。每撈一次漲價。'),
        full ? stateSide('已滿') : buySide(Game.catchCost(), 'data-buy="catch"')
      );
      const next = Game.TANK_PRICE[s.tank];
      html += shopRow(
        '<span class="thumb thumb-cap" aria-hidden="true"><span class="label">現住</span><span class="num" data-live="cap">' + Game.residentCount() + '/' + Game.capacity() + '</span></span>',
        '升級水族箱',
        sub(next != null ? '容量 ' + num(Game.capacity()) + ' → ' + num(Game.TANK[s.tank + 1]) + ' 隻（含水螅體）' : '容量 ' + num(Game.capacity()) + ' 隻（含水螅體）'),
        next != null ? buySide(next, 'data-buy="tank"') : stateSide('已是最大')
      );
      html += '</ul>';
    } else if (tab === 'food') {
      const unit = { star: '顆', dew: '滴' };
      html += '<ul class="rows shop-rows">';
      for (const k of ['star', 'dew']) {
        const t = MJ.Food.TYPES[k];
        const item = Game.SHOP_FOOD[k];
        html += shopRow(
          '<canvas class="thumb" data-food="' + k + '" width="72" height="72" aria-hidden="true"></canvas>',
          t.name + '<small>' + num(item.qty) + ' ' + (unit[k] || '份') + '</small>',
          sub(esc(t.desc)) + clue('持有 ' + num(s.inventory[k] || 0)),
          buySide(item.price, 'data-buy="food" data-id="' + k + '"')
        );
      }
      html += '</ul><p class="note">在「餵食」切換食物。</p>';
    } else if (tab === 'decor') {
      if (s.decor.length) html += '<div class="btn-row"><button type="button" class="btn-2" data-arrange="1">調整擺設</button></div>';
      html += '<ul class="rows shop-rows">';
      for (const [k, def] of Object.entries(MJ.Decor.DEFS)) {
        if (def.hab) continue;
        const n = Game.decorCount(k);
        const placed = def.max > 1 && n > 0 && n < def.max ? clue('已放置 ' + num(n + '/' + def.max)) : '';
        html += shopRow('<canvas class="thumb" data-decor="' + k + '" width="72" height="72" aria-hidden="true"></canvas>', def.name, sub(def.desc) + placed, decorSide(k, def, n, false));
      }
      html += '</ul>';
    } else if (tab === 'habitat') {
      // 棲地只改變生物待在哪裡；生物本身、陪法、潮汐圖，永遠不用光換
      html += '<p class="lede">棲地不產生生物，只改變牠們待的位置和彼此的關係。</p>';
      const E = Game.eco;
      const pearls = E.pearls().length;
      const have = {
        seagrass: E.seahorses.length ? '現在有 ' + num(E.seahorses.length) + ' 隻海馬' : '還沒有海馬（來自「先著陸」）',
        cave: E.crabs.length || E.lanterns.length ? '現在有 ' + num(E.crabs.length) + ' 隻寄居蟹、' + num(E.lanterns.length) + ' 條燈籠魚' : '寄居蟹來自「換個殼看看」，燈籠魚來自「聽聽它要什麼」',
        moonstone: E.lanterns.length ? '現在有 ' + num(E.lanterns.length) + ' 條燈籠魚' : '還沒有燈籠魚（來自「聽聽它要什麼」）',
        pearlbox: pearls ? '珍珠 ' + num(pearls) + ' 顆' : '還沒有珍珠',
      };
      html += '<ul class="rows shop-rows">';
      for (const k of ['seagrass', 'cave', 'moonstone']) html += habitatRow(k, have[k]);
      const shellToday = s.eco.shellDay === U.today();
      html += shopRow(
        '<canvas class="thumb" data-shell="nautilus" width="72" height="72" aria-hidden="true"></canvas>',
        '空殼',
        sub('最大的寄居蟹會搬進去，舊殼依序往下讓。每天限 ' + num(1) + ' 個。') + clue(E.crabs.length ? '現在有 ' + num(E.crabs.length) + ' 隻寄居蟹' : '還沒有寄居蟹，殼會留在沙地上。'),
        shellToday ? stateSide('今天已放') : buySide(Game.SHELL_PRICE, 'data-buy="shell"')
      );
      html += habitatRow('pearlbox', have.pearlbox);
      html += '</ul>';
    } else if (tab === 'theme') {
      html += '<ul class="rows shop-rows">';
      for (const [k, th] of Object.entries(MJ.World.THEMES)) {
        const owned = s.themes.includes(k);
        const using = s.theme === k;
        let side;
        if (using) side = stateSide('使用中', 'now');
        else if (owned) side = '<div class="shop-side"><button type="button" class="btn-2" data-buy="theme" data-id="' + k + '">換上</button></div>';
        else side = buySide(th.price, 'data-buy="theme" data-id="' + k + '"');
        html += shopRow('<canvas class="thumb thumb-theme" data-theme="' + k + '" width="72" height="48" aria-hidden="true"></canvas>', th.name, sub(esc(th.desc)), side, using);
      }
      html += '</ul>';
    }
    body.innerHTML = html;

    body.querySelectorAll('canvas[data-decor]').forEach((c) => UI.drawDecorThumb(c, c.dataset.decor));
    body.querySelectorAll('canvas[data-shell]').forEach((c) => {
      const g = hiDpi(c, 72, 72);
      g.translate(36, 38);
      g.scale(2.2, 2.2);
      MJ.Eco.drawShell(g, c.dataset.shell, 1, 1);
    });
    body.querySelectorAll('canvas[data-food]').forEach((c) => drawFoodThumb(c, c.dataset.food));
    body.querySelectorAll('canvas[data-theme]').forEach((c) => drawThemeThumb(c, MJ.World.THEMES[c.dataset.theme]));

    body.querySelectorAll('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        A.click();
        UI.openSheet('shop', b.dataset.tab);
        const t = UI.el.sheetBody.querySelector('[data-tab="' + b.dataset.tab + '"]');
        if (t) t.focus();
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
    tick();
    return '商店';
  };

  /** 縮圖用的 canvas：依螢幕密度放大 */
  const hiDpi = (canvas, w, h) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  };

  UI.drawDecorThumb = (canvas, type) => {
    const S = 72;
    const ctx = hiDpi(canvas, S, S);
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

  /** 零食的縮圖：和撒進水裡的樣子一樣（food.js 的畫法） */
  const drawFoodThumb = (canvas, type) => {
    const ctx = hiDpi(canvas, 72, 72);
    const x = 36;
    const y = 36;
    ctx.globalCompositeOperation = 'lighter';
    if (type === 'star') {
      const r = 12;
      U.drawGlow(ctx, x, y, r * 6, 48, 0.95, 0.6, 1);
      ctx.fillStyle = U.hsla(48, 0.95, 0.75, 1);
      ctx.beginPath();
      U.starPath(ctx, x, y, r, 5, 0.5, -Math.PI / 2);
      ctx.fill();
    } else {
      const r = 11;
      U.drawGlow(ctx, x, y, r * 6, 205, 0.6, 0.75, 1);
      ctx.fillStyle = 'rgba(225,240,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.6);
      ctx.quadraticCurveTo(x + r, y, x, y + r);
      ctx.quadraticCurveTo(x - r, y, x, y - r * 1.6);
      ctx.fill();
    }
  };

  /** 主題的縮圖：那片海本身（水色由上到下＋一條沙地），直角 */
  const drawThemeThumb = (canvas, th) => {
    const W = 72;
    const H = 48;
    const ctx = hiDpi(canvas, W, H);
    const grad = ctx.createLinearGradient(0, 0, 0, H - 8);
    th.grad.forEach((c, i) => grad.addColorStop(i / (th.grad.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H - 8);
    ctx.fillStyle = th.sand[0];
    ctx.fillRect(0, H - 8, W, 8);
  };

  /* ================= 呼吸設定 ================= */

  RENDER.breath = (body) => {
    const sel = UI.breathSel || { id: 'relax', cycles: 5 };
    UI.breathSel = sel;
    let html = '<p class="lede">吸氣時水母張傘，吐氣時收傘上浮。</p>';
    html += '<h3 class="sub-h">節奏</h3><div class="rows" role="radiogroup" aria-label="呼吸節奏">';
    for (const [id, b] of Object.entries(Game.BREATHS)) {
      const on = sel.id === id;
      const beats = b.seq.map(([, d]) => d).join(' · ');
      html += '<button type="button" role="radio" aria-checked="' + on + '" class="row pick-row breath-row' + (on ? ' on' : '') + '" data-id="' + id + '">';
      html += '<span class="row-main"><span class="row-title">' + b.name + '</span><span class="row-sub">' + esc(b.desc) + '</span></span>';
      html += '<span class="num beats">' + beats + '</span></button>';
    }
    html += '</div><h3 class="sub-h">輪數</h3><div class="tabs" role="radiogroup" aria-label="輪數">';
    for (const n of [3, 5, 10]) html += '<button type="button" role="radio" aria-checked="' + (sel.cycles === n) + '" class="tab' + (sel.cycles === n ? ' on' : '') + '" data-cycles="' + n + '"><span>' + num(n) + ' 輪</span></button>';
    html += '</div>';
    const pat = Game.BREATHS[sel.id];
    const secs = pat.seq.reduce((a, [, d]) => a + d, 0) * sel.cycles;
    const left = Game.breathLeft();
    html += '<p class="note">' + (left ? '完成後 +' + Game.breathReward(sel.cycles) + ' 光，今天還有 ' + left + ' 次。' : '今天的光已領完。') + '完成後 5 分鐘內出生的水母，體質可能不同。</p>';
    // 這個抽屜本身就是一個任務：「開始」是唯一的主要按鈕
    html += '<button type="button" class="btn wide" id="breathGo">開始（約 ' + dur(secs) + '）</button>';
    body.innerHTML = html;
    body.querySelectorAll('[data-id]').forEach((b) =>
      b.addEventListener('click', () => {
        A.click();
        sel.id = b.dataset.id;
        UI.rerender();
        const f = UI.el.sheetBody.querySelector('[data-id="' + sel.id + '"]');
        if (f) f.focus();
      })
    );
    body.querySelectorAll('[data-cycles]').forEach((b) =>
      b.addEventListener('click', () => {
        A.click();
        sel.cycles = +b.dataset.cycles;
        UI.rerender();
        const f = UI.el.sheetBody.querySelector('[data-cycles="' + sel.cycles + '"]');
        if (f) f.focus();
      })
    );
    $('breathGo').addEventListener('click', () => {
      UI.closeSheet();
      Game.startBreath(sel.id, sel.cycles);
    });
    return '呼吸';
  };

  /* ================= 更多 ================= */

  RENDER.more = (body) => {
    const s = Game.state;
    const achDone = Object.keys(s.achievements).length;
    // 「需要找人說話」固定在最後一列，和其他列一樣安靜；一打開就看得到
    const items = [
      ['tides', '潮汐圖', '每一筆心情和結果'],
      ['diary', '天氣紀錄', '這個月來過 ' + num(Game.daysThisMonth()) + ' 天'],
      ['ach', '成就', num(achDone + '/' + Game.ACH.length)],
      ['roster', '名冊', '所有水母'],
      ['photo', '拍照', '拍下現在的水族箱'],
      ['settings', '設定', '聲音、存檔'],
      ['about', '關於海月', '玩法與製作'],
      ['care', '需要找人說話', '專線電話，都有真的人接'],
    ];
    let html = '<section class="sleep-block"><h3 class="grp-h">晚安模式</h3><p class="note">畫面變暗，音樂在設定時間內漸弱。</p><div class="btn-row">';
    for (const m of [15, 30, 60]) html += '<button type="button" class="btn-2" data-sleep="' + m + '"><span>' + num(m) + ' 分鐘</span></button>';
    html += '</div></section><ul class="rows nav-rows">';
    for (const [id, name, subText] of items) {
      html += '<li><button type="button" class="row nav-row menu-row" data-go="' + id + '"><span class="row-main"><span class="row-title">' + name + '</span><span class="row-sub">' + subText + '</span></span><span class="go" aria-hidden="true">→</span></button></li>';
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
        } else if (id === 'care') UI.careModal();
        else UI.openSheet(id, null, { back: 'more' });
      })
    );
    return '更多';
  };

  /* ================= 名冊 ================= */

  /** 名冊裡的水螅體：用水族箱同一套畫法畫一個小的 */
  const drawPolypThumb = (canvas, p) => {
    const S = 48;
    const ctx = hiDpi(canvas, S, S);
    const q = new MJ.Polyp({ genes: p.genes, progress: p.progress, x: 0.5 });
    q.t = 1;
    q.draw(ctx, { W: S, H: S, unit: 0.9, sandY: () => S - 14 });
  };

  RENDER.roster = (body) => {
    const s = Game.state;
    const res = Game.residentJellies();
    let html = '<h3 class="sub-h">住在這裡　' + num(res.length) + ' 隻</h3>';
    if (!res.length) html += '<p class="empty">現在沒有水母住在這裡。</p>';
    else {
      html += '<ul class="rows">';
      for (const j of res) {
        const on = j.id === UI.lastJellyId;
        html += '<li><button type="button" class="row nav-row roster-row' + (on ? ' on' : '') + '" data-open="' + j.id + '">' + portraitImg(j.genes, j.growth, 48, 'portrait xs');
        html += '<span class="row-main"><span class="row-title">' + nameHTML(j) + '</span><span class="row-sub">' + [j.stage].concat(traitList(j.genes).slice(0, 2)).join('　') + '</span></span><span class="go" aria-hidden="true">→</span></button></li>';
      }
      html += '</ul>';
    }
    if (Game.polyps.length) {
      html += '<h3 class="sub-h">海底的水螅體</h3><ul class="rows">';
      for (const p of Game.polyps) {
        html += '<li class="row"><canvas class="portrait xs" data-polyp="' + p.id + '" width="48" height="48" aria-hidden="true"></canvas>';
        html += '<div class="row-main"><div class="row-title">' + (p.parents ? esc(p.parents.join(' × ')) + ' 的孩子' : '從大海漂來的') + '</div>';
        html += '<div class="row-sub" data-hatch="' + p.id + '">' + p.stageName + '　約 ' + dur(p.remaining) + '後孵化</div></div></li>';
      }
      html += '</ul>';
    }
    if (s.released.length) {
      html += '<h3 class="sub-h">回到大海</h3><ul class="rows">';
      for (const r of s.released) {
        html += '<li class="row dim">' + portraitImg(r.genes, 1, 48, 'portrait xs') + '<div class="row-main"><div class="row-title">' + esc(r.name) + '</div><div class="row-sub">' + traitList(r.genes).slice(0, 2).join('　') + '</div></div>' + num(md(r.date)) + '</li>';
      }
      html += '</ul>';
    }
    body.innerHTML = html;
    body.querySelectorAll('canvas[data-polyp]').forEach((c) => {
      const p = Game.polyps.find((q) => q.id === c.dataset.polyp);
      if (p) drawPolypThumb(c, p);
    });
    body.querySelectorAll('[data-open]').forEach((el) =>
      el.addEventListener('click', () => {
        const j = Game.jellies.find((k) => k.id === el.dataset.open);
        if (!j) return;
        A.click();
        UI.openSheet('jelly', j, { back: 'roster' });
        Game.tut('card');
      })
    );
    return '名冊';
  };
  RENDER.roster.back = 'more';

  /* ================= 設定 ================= */

  RENDER.settings = (body) => {
    const st = Game.state.settings;
    // 開關一律是方形勾選框（DESIGN.md §6.2）；整列可點
    const check = (key, label, subText) =>
      '<label class="toggle"><span><b>' + label + '</b><small>' + subText + '</small></span><input type="checkbox" id="set_' + key + '" data-set="' + key + '"' + (st[key] ? ' checked' : '') + '><i aria-hidden="true"></i></label>';
    const vol = Math.round(st.volume * 100);
    let html = '<h3 class="sub-h">聲音</h3><div class="set-list">';
    html += check('music', '背景音樂', '深海的和弦、鈴聲與水聲');
    html += check('sing', '水母唱歌', '水母脈動時，偶爾唱出自己的音');
    html += check('sfx', '音效', '點水、泡泡、摸摸的聲音');
    html += '<div class="set-vol"><label class="set-vol-h" for="set_volume"><b>音量</b><span class="num" data-live="vol">' + vol + '</span></label>';
    html += '<input type="range" class="ruler" id="set_volume" min="0" max="1" step="0.05" value="' + st.volume + '">';
    html += '<div class="ruler-scale" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div></div>';
    html += '</div><h3 class="sub-h">音樂的氛圍</h3><div class="tabs" role="radiogroup" aria-label="音樂的氛圍">';
    for (const [k, m] of Object.entries(A.MOODS)) {
      html += '<button type="button" role="radio" aria-checked="' + (st.mood === k) + '" class="tab' + (st.mood === k ? ' on' : '') + '" data-mood="' + k + '">' + m.name + '</button>';
    }
    html += '</div><h3 class="sub-h">存檔</h3><p class="note">存檔只在這台裝置的瀏覽器裡。換裝置：複製存檔碼，到新裝置貼上。</p>';
    html += '<div class="btn-row"><button type="button" class="btn-2" id="expBtn">複製存檔碼</button><button type="button" class="btn-2" id="impBtn">貼上存檔碼</button></div>';
    html += '<div id="saveBox" class="save-box" hidden></div>';
    html += '<h3 class="sub-h">從頭開始</h3><p class="note">水母、光、圖鑑和所有心情紀錄都會刪除，無法復原。</p>';
    html += '<div class="btn-row"><button type="button" class="btn-2 danger" id="resetBtn">從頭開始</button></div>';
    body.innerHTML = html;

    body.querySelectorAll('[data-set]').forEach((el) =>
      el.addEventListener('change', () => {
        Game.updateSettings({ [el.dataset.set]: el.checked });
        UI.updateSound();
      })
    );
    const volIn = $('set_volume');
    volIn.addEventListener('input', (e) => {
      Game.updateSettings({ volume: +e.target.value, muted: false });
      setText(body.querySelector('[data-live="vol"]'), String(Math.round(+e.target.value * 100)));
    });
    volIn.addEventListener('change', () => UI.updateSound());
    body.querySelectorAll('[data-mood]').forEach((b) =>
      b.addEventListener('click', () => {
        Game.updateSettings({ mood: b.dataset.mood });
        UI.rerender();
        const f = UI.el.sheetBody.querySelector('[data-mood="' + b.dataset.mood + '"]');
        if (f) f.focus();
      })
    );
    const box = $('saveBox');
    $('expBtn').addEventListener('click', () => {
      const code = Game.exportSave();
      box.hidden = false;
      box.innerHTML = '<textarea id="saveCode" class="code" rows="4" readonly aria-label="存檔碼">' + esc(code) + '</textarea>';
      const ta = $('saveCode');
      ta.focus();
      ta.select();
      const manual = () => UI.toast('已選取，請手動複製');
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => UI.toast('存檔碼已複製'), manual);
      else manual();
    });
    $('impBtn').addEventListener('click', () => {
      box.hidden = false;
      box.innerHTML = '<textarea id="saveIn" class="code" rows="4" placeholder="把存檔碼貼在這裡" aria-label="貼上存檔碼"></textarea><div class="btn-row"><button type="button" class="btn-2" id="impGo">讀取這個存檔</button></div>';
      $('saveIn').focus();
      $('impGo').addEventListener('click', async () => {
        const text = $('saveIn').value;
        if (!text.trim()) return;
        // 會取代現在的水族箱：用確認框，「取消」是預設焦點
        const ok = await UI.confirm({ title: '要讀取這個存檔嗎？', text: '現在的水族箱會被取代。', ok: '讀取', cancel: '取消' });
        if (ok && !Game.importSave(text)) UI.toast('讀不到存檔：存檔碼可能不完整');
      });
    });
    $('resetBtn').addEventListener('click', async () => {
      // 會遺失資料：用確認框，「不要」是預設焦點
      const ok = await UI.confirm({ title: '要從頭開始嗎？', text: '水母、光、圖鑑和所有心情紀錄都會刪除，無法復原。', ok: '從頭開始', cancel: '不要', danger: true });
      if (ok) Game.resetAll();
    });
    return '設定';
  };
  RENDER.settings.back = null;

  /* ================= 關於 ================= */

  RENDER.about = (body) => {
    const li = (t) => '<li>' + t + '</li>';
    const tel = (n) => '<a class="tel num" href="tel:' + n + '">' + n + '</a>';
    body.innerHTML =
      '<p class="lede">海月水母館是一座夜光水母缸。沒有輸贏，水母不會死；餓了只是比較暗。</p>' +
      '<h3 class="sub-h">玩法</h3><ul class="facts-list">' +
      li('點水面：撒下浮游生物。按住拖曳：撒一整排。水面也是一把琴，越右邊音越高。') +
      li('按住水母滑動：摸摸牠。') +
      li('按「心情」：替感覺取名字，再選一種陪法。不同的陪法長成不同的生物：水母、海馬、寄居蟹、燈籠魚、小丑魚、海龜、藍眼淚、珊瑚、瓶中信。') +
      li('兩隻成年水母可以配對。孵出來的孩子混合兩邊的特徵。') +
      li('每天第一次來，會收到一封海的來信。') +
      '</ul><h3 class="sub-h">規則</h3><ul class="facts-list">' +
      li('光很稀有。水母會發光；每天前 ' + num(3) + ' 筆心情各 +' + num(30) + ' 光，不論是什麼感覺、選了哪種陪法、還是還沒決定。') +
      li('心情長出的生物、陪法和潮汐圖，都不用光換。') +
      li('棲地不產生生物，只改變牠們待的地方：海馬聚在海草床，寄居蟹躲進礁石洞，燈籠魚白天待在洞的陰影裡、晚上繞著月光石。') +
      li('圖鑑共 ' + num(Gn.codexTotal()) + ' 項。特殊體質有配方，看提示找。') +
      '</ul><h3 class="sub-h">設計依據</h3><ul class="facts-list">' +
      li('<b>替感覺取名字</b>：說得越精準，越不容易被它淹沒（情緒標記、情緒顆粒度）。') +
      li('<b>沒有唯一正確的陪法</b>：能依情況換方法的人，比只用一種的人過得好（情緒調節彈性）。所以每一種陪法都會長出生物；章魚只在你用過很多種時出現。') +
      li('<b>讓它待著</b>來自接納與「觀浪」；<b>先著陸</b>是 5-4-3-2-1 著陸技巧；<b>換個殼</b>來自認知重評與拉開距離；<b>聽它要什麼</b>來自情緒背後的需要；<b>對自己溫柔</b>是自我慈悲的三個部分；<b>一件小事</b>是行為活化；<b>品嚐、感謝、留給以後</b>是正向情緒的保存與回想。') +
      li('<b>陪法的順序跟著強度變</b>：浪很大時，換角度想比較難，先穩住的方法排前面；浪小時，想一想的方法排前面。每一種都一直選得到。') +
      li('<b>珍珠</b>要 ' + num(7) + ' 層以上、用過 ' + num(3) + ' 種陪法才結成；它記錄的是陪過的路，不是感覺來了幾次。一直只選「先倒出來就好」時，會提一句：只是發洩，不一定會讓感覺變小。') +
      li('<b>前後各量一次</b>：潮汐圖記下陪完之後浪的變化。同一種陪法用過 ' + num(5) + ' 次以上才畫出來；強的時候和不那麼強的時候分開看，因為浪很大時，下一次量本來就容易低一點。') +
      li('撐不住的時候，可以打安心專線 ' + tel('1925') + '（24 小時）、生命線 ' + tel('1995') + '、張老師 ' + tel('1980') + '；遇到家暴、性侵害或兒少受傷害，打 ' + tel('113') + '。這裡不能取代真的人。') +
      '</ul><h3 class="sub-h">製作</h3>' +
      '<p class="note">水母、觸手、音樂和每一句話，都是程式當下生成的，沒有使用圖片或音檔。觸手用簡單的物理模擬；音樂是 D 大調五聲音階，怎麼點都和諧。</p>' +
      '<p class="note">所有資料只存在這台裝置的瀏覽器裡。儀式一開始寫的那段話，預設不保存。</p>';
    return '關於海月';
  };
  RENDER.about.back = 'more';
})((window.MJ = window.MJ || {}));
