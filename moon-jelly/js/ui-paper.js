/* 海月水母館 — 紙：使用者留下、可以重讀的東西。
 * 紀錄卡、圖鑑（目次＋圖版）、天氣紀錄、海的來信、瓶中紙條、你的瓶中信、珍珠、本週紀錄、成就（檢核表）。
 *
 * 紙是一個有四個邊的物件，四周一定看得到暗色（DESIGN.md §2、§3.2）。
 * 系統的字是印刷的（明體，由 .paper 套用）；只有使用者自己打的句子用手寫體；數字等寬。
 * 紙上的強調就是使用者的墨水（--pen），不用 --accent。 */
(function (MJ) {
  'use strict';

  const UI = MJ.UI;
  const RENDER = UI.RENDER;
  const { U, Gn, C, A, F, esc, $, portraitImg } = UI.h;
  let Game = null;
  UI.onInit((g) => (Game = g));

  /* ================================================================
   * 共用的小工具（tides.js 也用：UI.paper）
   * ================================================================ */

  const p2 = (n) => String(n).padStart(2, '0');
  const num = (s) => '<span class="num">' + s + '</span>';
  /** 欄位日期：09.25；不是今年的加年份 */
  const mmdd = (ts) => {
    const d = new Date(ts);
    const md = p2(d.getMonth() + 1) + '.' + p2(d.getDate());
    return d.getFullYear() === new Date().getFullYear() ? md : d.getFullYear() + '.' + md;
  };
  const hhmm = (ts) => {
    const d = new Date(ts);
    return p2(d.getHours()) + ':' + p2(d.getMinutes());
  };
  const stamp = (ts) => mmdd(ts) + ' ' + hhmm(ts);
  const ymd = (ts) => {
    const d = new Date(ts);
    return d.getFullYear() + '.' + p2(d.getMonth() + 1) + '.' + p2(d.getDate());
  };
  /** 句子裡的日期：9 月 25 日 */
  const dayStr = (ts) => {
    const d = new Date(ts);
    return d.getMonth() + 1 + ' 月 ' + d.getDate() + ' 日';
  };

  /** 一個字屬於哪個家族：先看 60 個字，再看家族名本身 */
  const famOf = (w, fallback) => F.familyOf(w) || F.FAMILY_IDS.find((id) => F.FAMILIES[id].name === w) || fallback || 'fog';
  /** 紙上的家族色點（顏料色），永遠搭配名字；「說不上來」是虛線圈 */
  const famDot = (id) => '<i class="dot' + (id === 'fog' ? ' fog' : '') + '" style="--c:var(--fp-' + id + ')" aria-hidden="true"></i>';
  const wordsHTML = (e) => (e.words || []).map((w) => '<span class="w">' + famDot(famOf(w, e.fam)) + esc(w) + '</span>').join('');

  /** 浪 8 → 5；舒服的感覺用「亮」；沒量寫「未量」 */
  const waveKey = (e) => (F.isPositive(e.fam) ? '亮' : '浪');
  const waveVal = (e) => {
    if (!e.turn || e.i1 == null) return e.i0 == null ? '未量' : num(e.i0);
    return e.i0 == null ? '未量 ' + num('→ ' + e.i1) : num(e.i0 + ' → ' + e.i1);
  };

  /** 每一筆心情的編號：No. 18（不補零）。存檔裡的順序＋1 */
  const entryNo = (e) => {
    if (e.no != null) return e.no;
    const i = Game.state.entries.findIndex((x) => x.id === e.id);
    return i >= 0 ? i + 1 : Game.state.entries.length + 1;
  };

  /** 學名：屬名、種名斜體；科以上正體。珊瑚、瓶中信、幼生不加 */
  const LATIN = { jelly: 'Aurelia aurita', crab: 'Paguroidea', lantern: 'Myctophidae', clown: 'Amphiprion', turtle: 'Chelonioidea', seahorse: 'Hippocampus', tears: 'Noctiluca scintillans', oyster: 'Pinctada', octopus: 'Octopus' };
  const latinOf = (id) => {
    const d = F.SPECIES[id];
    const s = (d && d.latin) || LATIN[id];
    if (!s) return '';
    const up = /(idae|oidea|inae|formes)$/.test(s);
    return '<span class="latin' + (up ? ' up' : '') + '" lang="la">' + esc(s) + '</span>';
  };

  /** 圖版的頁首：「圖版 1　顏色　　　3/13」 */
  const plateHead = (no, title, right) =>
    '<header class="ph">' + (no != null ? '<span class="label">圖版 ' + num(no) + '</span>' : '') + '<h3 class="ph-t">' + title + '</h3>' + (right ? '<span class="ph-n">' + right + '</span>' : '') + '</header>';
  /** 圖說：圖號等寬，放在圖的下方 */
  const caption = (no, text) => '<p class="caption">' + (no != null ? '圖 ' + num(no) + '　' : '') + text + '</p>';
  /** 信頭：標題＋行尾的日期或編號；sub 是第二行的欄位 */
  const letterhead = (title, right, sub) =>
    '<header class="lh"><h2 class="lh-t">' + title + '</h2>' + (right ? '<span class="lh-m">' + right + '</span>' : '') + (sub ? '<p class="lh-s">' + sub + '</p>' : '') + '</header>';
  const kvRow = (k, v) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>';

  UI.paper = { num, mmdd, hhmm, stamp, ymd, dayStr, famOf, famDot, wordsHTML, waveKey, waveVal, entryNo, latinOf, plateHead, caption, letterhead, kvRow };
  UI.entryNo = entryNo;

  /* ================================================================
   * 紀錄卡：一筆心情＝一張填完的觀察紀錄卡（art §5.8.1）
   * ================================================================ */

  /**
   * opts.compact：精簡版（只有頁首、名稱、浪、記述；沒有內框，頂部 1px 實線）
   * 危機紀錄（e.crisis）不重現任何原文。
   */
  UI.entryCard = (e, opts = {}) => {
    const t = F.TURNS[e.turn];
    let h = '<article class="paper rec' + (opts.compact ? ' compact' : ' framed') + '">';
    h += '<header class="rec-h"><span class="label">心情紀錄</span>' + num('No. ' + entryNo(e)) + '<span class="num rec-t">' + stamp(e.t) + '</span></header>';
    h += '<dl class="kv">';
    h += kvRow('名稱', '<span class="rec-words">' + wordsHTML(e) + '</span>');
    h += kvRow(waveKey(e), waveVal(e));
    if (!opts.compact) {
      let turn = '<span class="fg-2">還沒選</span>';
      if (t) turn = esc(t.name) + (e.turn === 'reframe' && F.LENSES[e.lens] ? '（' + F.LENSES[e.lens].name + '）' : '');
      h += kvRow('陪法', turn);
      const sp = t && F.SPECIES[t.species];
      if (sp) h += kvRow('長成', esc(sp.name) + (latinOf(t.species) ? '　' + latinOf(t.species) : ''));
      const needs = (e.needs || []).map((n) => F.NEEDS[n] && F.NEEDS[n].name).filter(Boolean);
      if (needs.length) h += kvRow('需要', needs.join('、'));
      if (e.step) {
        const st = e.step;
        const what = e.crisis || !st.what ? '一件小事' : '<span class="hand">' + esc(st.what) + '</span>';
        let status;
        if (st.status === 'done') status = '做到了' + (st.doneAt ? ' ' + num(stamp(st.doneAt)) : '');
        else if (st.status === 'dropped') status = '已劃掉';
        else status = '想在「' + (F.STEP_WHEN[st.when] || F.STEP_WHEN.now).name + '」做';
        h += kvRow('小事', what + '<span class="rec-sub">' + status + '</span>');
      }
    }
    h += '</dl>';
    if (e.raw && !e.crisis) h += '<div class="rec-raw"><span class="label">記述</span><p class="lined">' + esc(e.raw) + '</p></div>';
    h += '</article>';
    return h;
  };

  /* ================================================================
   * 圖鑑：一本圖冊。目次＋圖版 1–6（art §5.8.2、§8.3）
   * 切換用暗色上的 .tabs（屬於海），內容是一張張紙
   * ================================================================ */

  const SAMPLE = (over) =>
    Object.assign(
      { hue: 196, hue2: 176, sat: 0.55, shape: 'dome', size: 1, tentacles: 8, tentLen: 0.9, arms: 2, armLen: 0.7, pattern: 'plain', glow: 0.75, pulse: 1, special: null, seed: 424242 },
      over
    );

  const PLATES = [
    ['color', '顏色', () => Gn.COLORS.length],
    ['shape', '傘形', () => Gn.SHAPE_IDS.length],
    ['pattern', '花紋', () => Gn.PATTERN_IDS.length],
    ['special', '體質', () => Gn.SPECIAL_IDS.length],
    ['eco', '生態', null],
    ['life', '一生', null],
  ];
  const plateNo = (id) => PLATES.findIndex((p) => p[0] === id) + 1;
  const foundIn = (id) => Object.keys(Game.state.codex).filter((k) => k.startsWith(id + ':')).length;

  const LIFE = [
    ['水螅體', '附著在海底，形似小海葵。'],
    ['橫裂體', '身體橫向分節，疊成一串小碟子。'],
    ['碟狀幼體', '最上面一節脫離，形如八角星。'],
    ['水母體', '傘逐漸長圓，成為水母。'],
  ];

  RENDER.codex = (body, tab) => {
    tab = tab || UI.codexTab || 'toc';
    if (tab !== 'toc' && !PLATES.some((p) => p[0] === tab)) tab = 'toc';
    UI.codexTab = tab;
    const s = Game.state;

    let html = '<div class="sheaf">';
    html += '<div class="tabs" role="tablist" aria-label="圖鑑">';
    for (const [id, name] of [['toc', '目次']].concat(PLATES)) {
      html += '<button role="tab" class="tab' + (id === tab ? ' on' : '') + '" aria-selected="' + (id === tab) + '" data-tab="' + id + '">' + name + '</button>';
    }
    html += '</div>';

    if (tab === 'toc') {
      const found = Object.keys(s.codex).length;
      html += '<section class="paper leaf framed">' + plateHead(null, '目次', '已發現　' + num(found + '/' + Gn.codexTotal())) + '<ol class="toc">';
      PLATES.forEach(([id, name, total], i) => {
        html += '<li><button class="toc-row" data-plate="' + id + '"><span class="label">圖版 ' + num(i + 1) + '</span><span class="toc-t">' + name + '</span>';
        html += total ? '<span class="num toc-n">' + foundIn(id) + '/' + total() + '</span>' : '';
        html += '</button></li>';
      });
      html += '</ol></section>';
    } else if (tab === 'color') {
      html += '<section class="paper leaf framed">' + plateHead(plateNo('color'), '顏色', num(foundIn('color') + '/' + Gn.COLORS.length)) + '<ol class="figs">';
      Gn.COLORS.forEach((c, i) => {
        const got = s.codex['color:' + c.id];
        html += '<li class="fig' + (got ? '' : ' none') + '">';
        html += got
          ? '<span class="win">' + portraitImg(SAMPLE({ hue: c.hue, hue2: c.pale ? 200 : c.hue + 24, sat: c.pale ? 0.12 : 0.62 }), 1, 112, '') + '</span>'
          : '<span class="win empty" aria-hidden="true"></span>';
        html += '<span class="fig-n">' + num(i + 1) + '<span>' + (got ? c.name : '未發現') + '</span></span>';
        if (got) html += '<span class="fig-d">' + esc(c.desc) + '</span>';
        html += '</li>';
      });
      html += '</ol>' + caption(1, '水母傘的顏色，依色相分成 12 種，另有幾乎透明的月白。') + '</section>';
    } else if (tab === 'shape' || tab === 'pattern' || tab === 'special') {
      const defs = tab === 'shape' ? Gn.SHAPES : tab === 'pattern' ? Gn.PATTERNS : Gn.SPECIALS;
      const ids = Object.keys(defs);
      const name = PLATES[plateNo(tab) - 1][1];
      html += '<section class="paper leaf framed">' + plateHead(plateNo(tab), name, num(foundIn(tab) + '/' + ids.length)) + '<ol class="rows spec-rows">';
      ids.forEach((id, i) => {
        const def = defs[id];
        const got = s.codex[tab + ':' + id];
        const genes =
          tab === 'shape'
            ? SAMPLE({ shape: id })
            : tab === 'pattern'
            ? SAMPLE({ pattern: id, hue: 330, hue2: 45, sat: 0.6 })
            : SAMPLE({ special: id, hue: id === 'golden' ? 46 : 260, hue2: 190, sat: id === 'ghost' ? 0.12 : 0.65, pattern: 'clover' });
        html += '<li class="row' + (got ? '' : ' none') + '">';
        html += got ? '<span class="win">' + portraitImg(genes, 1, 64, '') + '</span>' : '<span class="win empty" aria-hidden="true"></span>';
        html += '<div class="row-main"><span class="fig-n">' + num(i + 1) + '<span>' + (got ? def.name : '未發現') + '</span></span>';
        if (got) html += '<span class="fig-d">' + esc(def.desc) + '</span>';
        else if (def.hint) html += '<span class="fig-d">提示：' + esc(def.hint) + '</span>';
        html += '</div></li>';
      });
      html += '</ol></section>';
    } else if (tab === 'eco') {
      html += UI.ecoCodex();
    } else {
      html += '<section class="paper leaf framed">' + plateHead(plateNo('life'), '一生') + '<ol class="figs four">';
      LIFE.forEach(([n, d], i) => {
        html += '<li class="fig"><span class="win"><canvas data-stage="' + i + '" aria-hidden="true"></canvas></span>';
        html += '<span class="fig-n">' + num(i + 1) + '<span>' + n + '</span></span><span class="fig-d">' + d + '</span></li>';
      });
      html += '</ol>' + caption(1, '海月水母的一生。水螅體可以一次放出好幾隻碟狀幼體。') + '</section>';
      html += '<section class="paper leaf"><header class="ph"><h3 class="ph-t">水母小知識</h3></header><ol class="numbered">';
      C.facts.forEach((f, i) => (html += '<li>' + num(i + 1) + '<span>' + esc(f) + '</span></li>'));
      html += '</ol></section>';
    }
    html += '</div>';
    body.innerHTML = html;

    const go = (id) => {
      A.click();
      UI.openSheet('codex', id);
      UI.el.sheetBody.scrollTop = 0;
    };
    body.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
    body.querySelectorAll('[data-plate]').forEach((b) => b.addEventListener('click', () => go(b.dataset.plate)));
    body.querySelectorAll('canvas[data-stage]').forEach((c) => drawStage(c, +c.dataset.stage));
    return '圖鑑';
  };

  /** 一生的四張圖：水螅體、橫裂體用 polyp.js 畫，碟狀幼體、水母體用水母的肖像 */
  function drawStage(canvas, i) {
    const size = Math.round(canvas.parentNode.clientWidth) || 88;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const genes = SAMPLE({ pattern: 'clover' });
    if (i === 2) return drawEphyra(g, size, genes.hue);
    if (i === 3) {
      const c = document.createElement('canvas');
      MJ.Jelly.portrait(c, genes, 1, size);
      g.drawImage(c, 0, 0, size, size);
      return;
    }
    if (!MJ.Polyp) return;
    const p = new MJ.Polyp({ genes, x: 0.5, progress: i === 0 ? 0.25 : 0.9 });
    p.t = 1.2;
    const unit = size / 64;
    const sand = size * 0.84;
    const world = { W: size, H: size, unit, sandY: () => sand };
    g.save();
    // 只畫生物本身：底下那圈孵化進度是水族箱裡的介面，不放進圖版
    g.beginPath();
    g.rect(0, 0, size, sand + 3 + 3 * unit);
    g.clip();
    p.draw(g, world);
    g.restore();
  }

  /** 碟狀幼體（從上面看）：八條臂，每條臂的尖端分叉 */
  function drawEphyra(g, size, hue) {
    const c = size / 2;
    const R = size * 0.3;
    g.save();
    g.globalCompositeOperation = 'lighter';
    U.drawGlow(g, c, c, size * 0.8, hue, 0.5, 0.66, 0.3);
    g.fillStyle = U.hsla(hue, 0.45, 0.76, 0.42);
    g.strokeStyle = U.hsla(hue, 0.5, 0.86, 0.75);
    g.lineWidth = 1;
    g.beginPath();
    g.arc(c, c, R * 0.46, 0, U.TAU);
    g.fill();
    g.stroke();
    const w = R * 0.16;
    for (let k = 0; k < 8; k++) {
      g.save();
      g.translate(c, c);
      g.rotate((k / 8) * U.TAU + 0.2);
      g.beginPath();
      g.moveTo(R * 0.4, -w);
      g.lineTo(R * 0.86, -w * 0.9);
      g.lineTo(R * 1.02, -w * 1.5);
      g.lineTo(R * 0.9, 0);
      g.lineTo(R * 1.02, w * 1.5);
      g.lineTo(R * 0.86, w * 0.9);
      g.lineTo(R * 0.4, w);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    }
    g.fillStyle = U.hsla(hue, 0.4, 0.88, 0.6);
    g.beginPath();
    g.arc(c, c, R * 0.12, 0, U.TAU);
    g.fill();
    g.restore();
  }

  /** 圖版 5 生態：只列見過的（心情長出來的生物不算完成度，也不留空格暗示還缺哪一種陪法） */
  UI.ecoCodex = () => {
    const sp = Game.state.eco.species;
    const met = F.SPECIES_IDS.filter((id) => sp[id]);
    let html = '<section class="paper leaf framed">' + plateHead(plateNo('eco'), '生態');
    if (!met.length) html += '<p class="empty">此頁空白。每一筆心情都會長成一種生物。</p>';
    else html += '<p class="plate-lede">每一筆心情一開始都是一隻幼生。你選怎麼陪它，決定它長成哪一種生物。</p>';
    html += '<ol class="rows eco-rows">';
    for (const id of met) {
      const d = F.SPECIES[id];
      html += '<li class="row"><div class="row-main">';
      html += '<p class="eco-name"><span>' + esc(d.name) + '</span>' + latinOf(id) + '</p>';
      html += '<dl class="kv">' + kvRow('來自', esc(d.from)) + kvRow('實際生態', esc(d.fact)) + kvRow('在這座館裡', esc(d.link)) + '</dl>';
      html += '</div></li>';
    }
    html += '</ol></section>';

    const rel = [
      ['藍眼淚', '餵養', '水母、珊瑚'],
      ['珊瑚礁', '收留', '雀鯛'],
      ['海葵', '保護', '小丑魚'],
      ['海龜', '帶殼給', '寄居蟹'],
      ['海草床', '聚集', '海馬'],
      ['礁石洞', '遮蔭', '寄居蟹、燈籠魚'],
      ['月光石', '晚上吸引', '燈籠魚'],
      ['大的寄居蟹', '把舊殼讓給', '小一號的'],
      ['同一種需要', '聚成', '一群燈籠魚'],
      ['同一種感覺', '一層層長成', '珍珠'],
      ['很多種陪法', '引來', '章魚'],
      ['瓶中信', '難受的時候回到', '你身邊'],
    ];
    html += '<section class="paper leaf"><header class="ph"><h3 class="ph-t">牠們之間的關係</h3></header>';
    html += '<table class="tbl"><thead><tr><th scope="col">主體</th><th scope="col">關係</th><th scope="col">對象</th></tr></thead><tbody>';
    for (const [a, v, b] of rel) html += '<tr><td>' + a + '</td><td class="fg-2">' + v + '</td><td>' + b + '</td></tr>';
    html += '</tbody></table></section>';
    return html;
  };

  /* ================================================================
   * 天氣紀錄（原心情日記）：每天拆信前選的天氣。7 欄格線，當天圈一個字
   * ================================================================ */

  const WX_CHAR = { sunny: '晴', cloudy: '雲', rain: '雨', storm: '雷', fog: '霧' };

  RENDER.diary = (body) => {
    const s = Game.state;
    const days = 35;
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - days + 1);
    let html = '<div class="sheaf"><section class="paper leaf framed">';
    html += plateHead(null, '天氣紀錄', num(mmdd(start) + '～' + mmdd(today)));
    html += '<div class="cal"><div class="cal-row" aria-hidden="true">';
    for (const w of ['日', '一', '二', '三', '四', '五', '六']) html += '<span class="cal-w">' + w + '</span>';
    html += '</div><div class="cal-days" role="list" aria-label="最近 35 天的天氣">';
    for (let i = 0; i < start.getDay(); i++) html += '<span class="cal-d blank" aria-hidden="true"></span>';
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const m = C.moods.find((x) => x.id === s.moods[U.today(d)]);
      const isToday = i === days - 1;
      html += '<span class="cal-d' + (isToday ? ' today' : '') + '" role="listitem" aria-label="' + dayStr(d) + (m ? '　' + m.name : '') + '">';
      html += '<span class="num">' + d.getDate() + '</span>' + (m ? '<b class="cal-m" aria-hidden="true">' + (WX_CHAR[m.id] || m.name[0]) + '</b>' : '') + '</span>';
    }
    html += '</div></div>';
    html += caption(1, C.moods.map((m) => '<span class="nw">' + (WX_CHAR[m.id] || m.name[0]) + '＝' + m.name + '</span>').join('　') + '。圈起來的字是那天拆信前選的天氣。');
    html += '</section><section class="paper leaf"><dl class="kv">';
    html += kvRow('這個月來過', num(Game.daysThisMonth()) + ' 天');
    html += kvRow('一共來過', num(Object.keys(s.visits || {}).length) + ' 天');
    html += kvRow('拆過的信', num(s.stats.letters) + ' 封');
    html += kvRow('記下的心情', num(s.stats.rituals || 0) + ' 筆');
    html += '</dl></section></div>';
    body.innerHTML = html;
    return '天氣紀錄';
  };
  RENDER.diary.back = 'more';

  /* ================================================================
   * 成就：檢核表。印刷的框，你的墨水畫的勾
   * ================================================================ */

  RENDER.ach = (body) => {
    const s = Game.state;
    const done = Game.ACH.filter((a) => s.achievements[a.id]).length;
    let html = '<div class="sheaf"><section class="paper leaf framed">' + plateHead(null, '檢核表', num(done + '/' + Game.ACH.length)) + '<ul class="checklist">';
    for (const a of Game.ACH) {
      const at = s.achievements[a.id];
      html += '<li' + (at ? ' class="done"' : '') + '><span class="tick' + (at ? ' on' : '') + '" role="img" aria-label="' + (at ? '已完成' : '未完成') + '"></span>';
      html += '<span class="ck-main"><span class="ck-t">' + esc(a.name) + '</span><span class="label">' + esc(a.desc) + '</span></span>';
      html += '<span class="num ck-r">' + (at ? mmdd(at) : a.reward ? '+' + a.reward + ' 光' : '') + '</span></li>';
    }
    html += '</ul></section></div>';
    body.innerHTML = html;
    return '成就';
  };
  RENDER.ach.back = 'more';

  /* ================================================================
   * 信紙：海的來信、瓶中紙條、你的瓶中信、本週紀錄（art §5.8.3、type-copy §2.5）
   * 信沒有內框；信頭下面一條 1px 實線。信尾不署名。
   * ================================================================ */

  const giftText = (g) => esc(String(g).replace(/\s*×\s*(\d+)/, ' $1 顆'));

  UI.letterModal = () => {
    if (!Game.letterDue()) return;
    UI.showModal(
      (card, close) => {
        const s = Game.state;
        let html = letterhead('今天的信', '第 ' + num(s.stats.letters + 1) + ' 封　' + num(ymd(Date.now())));
        html += '<p class="lt-q">拆信前，選今天的天氣：</p><div class="weather" role="group" aria-label="今天的天氣">';
        for (const m of C.moods) html += '<button class="mood-btn" data-mood="' + m.id + '" aria-pressed="false"><span class="pick">' + m.name + '</span><span class="label">' + m.desc + '</span></button>';
        html += '</div><div class="lt-open" hidden></div>';
        card.innerHTML = html;
        const btns = card.querySelectorAll('[data-mood]');
        let chosen = false;
        btns.forEach((b) =>
          b.addEventListener('click', () => {
            if (chosen) return;
            const r = Game.claimLetter(b.dataset.mood);
            if (!r) return close();
            chosen = true;
            A.discover();
            // 圈了才出現信文：圈留在紙上，其他選項變成鉛筆色
            btns.forEach((x) => {
              x.disabled = true;
              x.setAttribute('aria-pressed', String(x === b));
            });
            b.querySelector('.pick').classList.add('on');
            const gifts = ['<span class="num">+' + r.reward + '</span> 光'].concat((r.gifts || []).map(giftText)).join('　');
            let h = '<p class="lt-reply">' + esc(r.reply) + '</p><p class="lt-main">' + esc(r.letter) + '</p><hr>';
            h += '<dl class="kv">' + kvRow('附記', esc(r.fact)) + '<div><dt>附上</dt><dd class="gift">' + gifts + '</dd></div></dl>';
            h += '<div class="btn-row"><button class="btn" data-r="ok">收下</button></div>';
            const open = card.querySelector('.lt-open');
            open.innerHTML = h;
            open.hidden = false;
            const ok = open.querySelector('[data-r="ok"]');
            ok.addEventListener('click', () => close());
            setTimeout(() => ok.focus({ preventScroll: true }), 60);
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
          letterhead('瓶中紙條', num(ymd(Date.now()))) +
          '<p class="lt-main">' + esc(text) + '</p>' +
          (reward ? '<hr><dl class="kv"><div><dt>附上</dt><dd class="gift">' + num('+' + reward) + ' 光</dd></div></dl>' : '') +
          '<div class="btn-row"><button class="btn">收下</button></div>';
        card.querySelector('.btn').addEventListener('click', () => close());
      },
      { cls: 'paper' }
    );
  };

  /** 海送回來的、你以前寫的字：手寫體坐在書寫線上 */
  UI.pastLetterModal = (letter) => {
    const turn = F.TURNS[letter.turn];
    UI.showModal(
      (card, close) => {
        card.innerHTML =
          letterhead('你的瓶中信', null, '寫於 ' + dayStr(letter.t) + (turn ? '　「' + turn.name + '」' : '')) +
          '<p class="lined lt-hand">' + esc(letter.text) + '</p>' +
          '<div class="btn-row"><button class="btn">收下</button></div>';
        card.querySelector('.btn').addEventListener('click', () => close());
      },
      { cls: 'paper' }
    );
  };

  /* ================================================================
   * 珍珠：剖面放在標本窗裡，旁邊是由內到外的陪法（art §5.8.2）
   * ================================================================ */

  /** 珍珠層的顏色（color.md §5.5，淡）；珍珠本來就是光，所以底下是一圈很淡的金色 */
  const PEARL = { allow: '#b1d2f4', ground: '#d7c4ee', reframe: '#ebc6a6', need: '#a0dbd6', kind: '#f2bec6', step: '#bfd7ae', release: '#a3d7ea', savor: '#e3caa2', thank: '#f2c1b2', keep: '#aadbc4' };

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
    U.drawGlow(g, c, c, size * 1.05, 42, 0.62, 0.72, 0.32);
    g.globalCompositeOperation = 'source-over';
    const n = Math.max(1, layers.length);
    const den = Math.max(7, n);
    for (let i = n - 1; i >= 0; i--) {
      const t = layers[i];
      const r = R * ((i + 1) / den);
      g.fillStyle = PEARL[t] || (F.TURNS[t] ? U.hsla(F.TURNS[t].hue, 0.5, 0.82, 1) : 'rgba(235,205,144,0.35)');
      g.beginPath();
      g.arc(c, c, Math.max(3, r), 0, U.TAU);
      g.fill();
      g.strokeStyle = 'rgba(15,22,27,0.28)';
      g.lineWidth = 0.8;
      g.stroke();
    }
    const outer = Math.max(3, R * (n / den));
    g.fillStyle = 'rgba(255,250,236,0.75)';
    g.beginPath();
    g.arc(c - outer * 0.35, c - outer * 0.35, Math.max(1, outer * 0.14), 0, U.TAU);
    g.fill();
  };

  UI.pearlModal = (p) => {
    const fam = F.FAMILIES[p.fam];
    const kinds = new Set(p.layers).size;
    UI.showModal(
      (card, close) => {
        let h = letterhead('「' + fam.name + '」的珍珠', num(p.layers.length) + ' 層　' + num(kinds) + ' 種陪法');
        h += '<figure class="pearl-fig"><span class="win pearl-win"><canvas id="pearlBig" aria-label="珍珠的剖面"></canvas></span><ol class="strata">';
        p.layers.forEach((t, i) => (h += '<li>' + num(i + 1) + '<span>' + (F.TURNS[t] ? F.TURNS[t].name : '') + '</span></li>'));
        h += '</ol></figure>' + caption(1, '剖面。由裡到外，每一層是那一次你選的陪法。');
        h += '<div class="btn-row"><button class="btn">收進珍珠盒</button></div>';
        card.innerHTML = h;
        UI.drawPearl($('pearlBig'), p.layers, 160);
        card.querySelector('.btn').addEventListener('click', () => close());
      },
      { cls: 'paper' }
    );
  };

  /* ================================================================
   * 本週紀錄：只用你自己的字組成，不下結論、不給建議（clinical §7.4）
   * ================================================================ */

  /** 會在回顧裡重現的，只有這幾種陪法寫下的字；危機紀錄的原文永遠不重現 */
  const SAID_TURNS = ['reframe', 'kind', 'savor', 'thank', 'keep', 'need'];

  UI.recapModal = () => {
    const s = Game.state;
    const week = Game.weekEntries();
    s.eco.lastRecap = Date.now();
    Game.save();
    const now = Date.now();
    let html = letterhead('本週紀錄', num(mmdd(now - 6 * 86400000) + '～' + mmdd(now)));
    if (!week.length) html += '<p class="empty">本週沒有紀錄。</p>';
    else {
      html += '<ul class="ledger"><li>共 ' + num(week.length) + ' 筆。</li>';
      const wc = {};
      for (const e of week) for (const w of e.words || []) wc[w] = (wc[w] || 0) + 1;
      const top = Object.keys(wc).sort((a, b) => wc[b] - wc[a]).slice(0, 3);
      if (top.length) html += '<li>最常出現：' + top.map((w) => '「' + esc(w) + '」').join('') + '</li>';
      const turns = Array.from(new Set(week.map((e) => e.turn).filter((t) => F.TURNS[t])));
      if (turns.length) html += '<li>陪法 ' + num(turns.length) + ' 種：' + turns.map((t) => F.TURNS[t].name).join('、') + '</li>';
      const measured = week.filter((e) => !F.isPositive(e.fam) && e.i0 != null && e.i1 != null && F.TURNS[e.turn]);
      if (measured.length) {
        const down = measured.filter((e) => e.i1 < e.i0).length;
        const same = measured.filter((e) => e.i1 === e.i0).length;
        html += '<li>陪完之後：變小 ' + num(down) + ' 次、沒變 ' + num(same) + ' 次、變大 ' + num(measured.length - down - same) + ' 次。</li>';
      }
      const done = s.entries.filter((e) => !e.crisis && e.step && e.step.status === 'done' && now - (e.step.doneAt || 0) < 7 * 86400000);
      if (done.length) html += '<li>做到了：' + done.slice(-4).map((e) => '「<span class="hand">' + esc(e.step.what) + '</span>」').join('') + '</li>';
      const pos = week.filter((e) => F.isPositive(e.fam)).length;
      if (pos) html += '<li>舒服的感覺：' + num(pos) + ' 筆</li>';
      html += '</ul>';
      const said = week.filter((e) => !e.crisis && e.text && SAID_TURNS.includes(e.turn)).slice(-3);
      if (said.length) {
        html += '<h3 class="sub-h">這週你寫給自己的話</h3><ul class="memos">';
        for (const e of said) html += memo(e);
        html += '</ul>';
      }
    }
    html += '<div class="btn-row"><button class="btn-2" data-r="tides">潮汐圖</button><button class="btn" data-r="ok">收下</button></div>';
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

  /** 精簡版紀錄：日期、陪法、那時候的字，下面是你寫的話（手寫、坐在書寫線上） */
  function memo(e) {
    const t = F.TURNS[e.turn];
    const label = e.turn === 'reframe' && F.LENSES[e.lens] ? F.LENSES[e.lens].name : t ? t.name : '';
    return (
      '<li class="memo"><span class="memo-m">' + num(mmdd(e.t)) + '<span>' + label + '</span>' + (e.words && e.words[0] ? '<span>「' + esc(e.words[0]) + '」</span>' : '') + '</span>' +
      '<p class="lined">' + esc(e.text) + '</p></li>'
    );
  }
  UI.paper.memo = memo;
  UI.paper.SAID_TURNS = SAID_TURNS;
})((window.MJ = window.MJ || {}));
