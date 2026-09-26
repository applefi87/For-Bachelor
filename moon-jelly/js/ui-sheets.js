/* 海月水母館 — 海裡的抽屜：水母名片、找伴侶、商店、呼吸、更多、名冊、成就、設定、關於 */
(function (MJ) {
  'use strict';

  const UI = MJ.UI;
  const RENDER = UI.RENDER;
  const { U, Gn, C, A, F, esc, icon, $, noteName, dateStr, starsHTML, colorCss, portraitImg, traitChips, timeStr, famChip, turnChip, SPECIES_ICON, SPECIES_HUE, KIND_SPECIES } = UI.h;
  let Game = null;
  UI.onInit((g) => (Game = g));

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
      ['diary', 'diary', '心情日記', '這個月來過 ' + Game.daysThisMonth() + ' 天'],
      ['settings', 'settings', '聲音與設定', '音樂、音效、存檔'],
      ['about', 'info', '關於海月', '怎麼玩、這裡是怎麼做出來的'],
      ['care', 'heart', '需要找人說話', '專線電話，都有真的人接'],
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
        } else if (id === 'care') UI.careModal();
        else UI.openSheet(id, null, { back: 'more' });
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

})((window.MJ = window.MJ || {}));
