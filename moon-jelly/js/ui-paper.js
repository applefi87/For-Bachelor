/* 海月水母館 — 紙：圖鑑、心情日記、海的來信、瓶中紙條、紀錄卡、珍珠、每週回顧、成就 */
(function (MJ) {
  'use strict';

  const UI = MJ.UI;
  const RENDER = UI.RENDER;
  const { U, Gn, C, A, F, esc, icon, $, noteName, dateStr, starsHTML, colorCss, portraitImg, traitChips, timeStr, famChip, turnChip, SPECIES_ICON, SPECIES_HUE, KIND_SPECIES } = UI.h;
  let Game = null;
  UI.onInit((g) => (Game = g));

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
      ['eco', '生態', 0, 'eco'],
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
    html += '</div><dl class="facts two"><div><dt>這個月來過</dt><dd>' + Game.daysThisMonth() + ' 天</dd></div><div><dt>一共來過</dt><dd>' + Object.keys(s.visits || {}).length + ' 天</dd></div><div><dt>拆過的信</dt><dd>' + s.stats.letters + ' 封</dd></div><div><dt>記下的心情</dt><dd>' + (s.stats.rituals || 0) + ' 份</dd></div></dl>';
    body.innerHTML = html;
    return '心情日記';
  };
  RENDER.diary.back = 'more';

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
            let h = '<div class="letter"><p class="letter-reply">' + esc(r.reply) + '</p><p class="letter-main">' + esc(r.letter) + '</p></div>';
            h += '<div class="fact"><span>今天的水母小知識</span>' + esc(r.fact) + '</div>';
            h += '<p class="gift"><span class="light-dot sm"></span>+' + r.reward + ' 光・' + r.gifts.join('・') + '</p>';
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

  /** 一份心情的小卡：字、時間、浪的變化 */
  UI.entryCard = (e) => {
    const fam = F.FAMILIES[e.fam] || F.FAMILIES.calm;
    let wave = e.i0 == null ? '沒有量強度' : '浪 ' + e.i0;
    if (e.i0 != null && e.turn && e.i1 != null && e.i1 !== e.i0) wave += ' → ' + e.i1;
    let html = '<div class="entry-card" style="--h:' + fam.hue + ';--s:' + Math.round(Math.max(0.3, fam.sat) * 100) + '%">';
    html += '<div class="entry-words">' + e.words.map((w) => '「' + esc(w) + '」').join('') + '</div>';
    html += '<div class="entry-meta">' + timeStr(e.t) + '・' + wave + '</div>';
    if (e.raw && !e.crisis) html += '<p class="entry-raw">' + esc(e.raw) + '</p>';
    html += '</div>';
    return html;
  };

  UI.ecoCodex = () => {
    const sp = Game.state.eco.species;
    let html = '<p class="lede">每一份心情一開始都是一隻幼生。你選擇怎麼陪它，決定它長成哪一種生物。牠們在海裡，彼此有關。</p>';
    // 只列出遇見過的：心情長出來的生物不算完成度，也不留空格暗示「還缺哪一種陪法」
    const met = F.SPECIES_IDS.filter((id) => sp[id]);
    if (!met.length) html += '<div class="empty">還沒有。每一份心情，都會長成一種生物。</div>';
    html += '<ul class="rows codex-rows eco-rows">';
    for (const id of met) {
      const d = F.SPECIES[id];
      html += '<li class="row"><span class="eco-badge" style="--h:' + SPECIES_HUE[id] + '">' + icon(SPECIES_ICON[id]) + '</span>';
      html += '<div class="row-main"><div class="row-title">' + d.name + '<small>' + esc(d.from) + '</small></div>';
      html += '<div class="row-sub">' + esc(d.fact) + '</div><div class="row-sub link-line">' + esc(d.link) + '</div>';
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
      const measured = week.filter((e) => !F.isPositive(e.fam) && e.i0 != null && e.i1 != null && F.TURNS[e.turn]);
      if (measured.length) {
        const down = measured.filter((e) => e.i1 < e.i0).length;
        const same = measured.filter((e) => e.i1 === e.i0).length;
        html += '<p>陪完之後：變小 ' + down + ' 次、沒變 ' + same + ' 次、變大 ' + (measured.length - down - same) + ' 次。</p>';
      }
      const done = s.entries.filter((e) => e.step && e.step.status === 'done' && Date.now() - (e.step.doneAt || 0) < 7 * 86400000);
      if (done.length) html += '<p>你做到了：' + done.slice(-4).map((e) => '「' + esc(e.step.what) + '」').join('') + '。</p>';
      const pos = week.filter((e) => F.isPositive(e.fam)).length;
      if (pos) html += '<p>其中有 ' + pos + ' 份，是舒服的感覺。</p>';
      const said = week.filter((e) => !e.crisis && e.text && ['reframe', 'kind', 'savor', 'thank', 'keep', 'need'].includes(e.turn)).slice(-3);
      if (said.length) {
        html += '<p>這週你寫給自己的話：</p>';
        for (const e of said) html += '<blockquote class="said"><span>' + md(e.t) + '・' + F.TURNS[e.turn].name + '</span>' + esc(e.text) + '</blockquote>';
      }
    }
    html += '</div><div class="btn-row center"><button class="btn ghost" data-r="tides">打開潮汐圖</button><button class="btn" data-r="ok">收好</button></div>';
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

  /* ---------- 成就（檢核表，紙） ---------- */
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

})((window.MJ = window.MJ || {}));
