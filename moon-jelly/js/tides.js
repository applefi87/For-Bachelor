/*
 * 海月水母館 — 潮汐圖：把心情紀錄攤開來看
 *
 * 抽屜裡的一疊紙（art §5.13）：每一張圖是一張圖版，圖號、圖說在圖的下方。
 * 不下結論，只把你自己的資料擺在你面前：感覺都落在哪裡、陪完之後浪怎麼變、哪一種需要一直出現、你寫給自己的話。
 * 陪完之後的變化：少於 5 次不畫（clinical §7.4）、依使用次數排序、單色長條、方向寫 ↓ ↑，不用紅綠也不用藍橘。
 */
(function (MJ) {
  'use strict';

  const U = MJ.U;
  const F = MJ.Feelings;
  const esc = U.escape;
  const DAY = 86400000;

  const T = {};
  let range = 30;
  let group = 'all';
  const MIN_N = 5;
  const GROUPS = [
    ['all', '全部', () => true],
    ['high', '強的時候', (e) => e.i0 >= 7],
    ['low', '不那麼強', (e) => e.i0 <= 6],
  ];

  const inRange = (e) => range === 0 || Date.now() - e.t < range * DAY;

  T.render = (body) => {
    const Game = MJ.Game;
    const UI = MJ.UI;
    const P = UI.paper;
    const { num, plateHead, caption, mmdd } = P;
    const all = Game.state.entries;
    const list = all.filter(inRange);
    let html = '<div class="sheaf">';

    if (!all.length) {
      html += '<section class="paper leaf"><p class="empty">此頁空白。</p><div class="btn-row"><button class="btn-2" id="tStart">記下第一筆</button></div></section></div>';
      body.innerHTML = html;
      body.querySelector('#tStart').addEventListener('click', () => MJ.Ritual.start());
      return '潮汐圖';
    }

    // 時間範圍：切換檢視，放在紙外面的暗色上
    html += '<div class="tabs" role="tablist" aria-label="時間範圍">';
    for (const [v, n] of [[7, num(7) + ' 天'], [30, num(30) + ' 天'], [0, '全部']]) {
      html += '<button role="tab" class="tab' + (range === v ? ' on' : '') + '" aria-selected="' + (range === v) + '" data-range="' + v + '">' + n + '</button>';
    }
    html += '</div>';

    const turned = list.filter((e) => e.turn);
    const turnKinds = new Set(turned.map((e) => e.turn));
    html += '<section class="paper leaf tide-sum"><p class="sum-line">' + (range ? num(range) + ' 天' : '全部') + '　' + num(list.length) + ' 筆　陪法 ' + num(turnKinds.size) + ' 種</p>';
    if (Game.weekEntries().length) html += '<button class="btn-2" id="tRecap">本週紀錄 →</button>';
    html += '</section>';

    let plate = 0;
    let fig = 0;

    /* 1. 感覺都落在哪裡：情緒環狀模型 */
    html += '<section class="paper leaf framed">' + plateHead(++plate, '感覺都落在哪裡');
    html += '<div class="chart" data-chart="map"></div>';
    html += caption(++fig, '感覺的落點。橫軸：不舒服～舒服；縱軸：安靜～激動。圓的面積＝次數。') + '</section>';

    /* 2. 陪完之後，浪的變化 */
    // 強度很高的時候，下一次量本來就容易低一點（回歸平均數），所以可以分開看強的和不那麼強的時候
    const gf = (GROUPS.find((g) => g[0] === group) || GROUPS[0])[2];
    const neg = turned.filter((e) => !F.isPositive(e.fam) && e.i0 != null && e.i1 != null && gf(e));
    const byTurn = {};
    for (const e of neg) (byTurn[e.turn] = byTurn[e.turn] || []).push(e.i1 - e.i0);
    const stats = Object.keys(byTurn)
      .filter((t) => F.TURNS[t])
      .map((t) => ({
        t,
        n: byTurn[t].length,
        down: byTurn[t].filter((x) => x < 0).length,
        avg: byTurn[t].reduce((a, b) => a + b, 0) / byTurn[t].length,
      }));
    // 依使用次數排序，不依效果排序：這張圖不是在比哪一種比較有效
    const byUse = (a, b) => b.n - a.n || F.TURN_IDS.indexOf(a.t) - F.TURN_IDS.indexOf(b.t);
    const rows = stats.filter((r) => r.n >= MIN_N).sort(byUse);
    const few = stats.filter((r) => r.n < MIN_N).sort(byUse);
    html += '<div class="tabs" role="tablist" aria-label="哪些時候">';
    for (const [id, name] of GROUPS) html += '<button role="tab" class="tab' + (group === id ? ' on' : '') + '" aria-selected="' + (group === id) + '" data-group="' + id + '">' + name + '</button>';
    html += '</div>';
    html += '<section class="paper leaf framed">' + plateHead(++plate, '陪完之後，浪的變化');
    if (rows.length) {
      html += '<div class="chart" data-chart="change"></div>';
      html += caption(++fig, '上：陪完後浪的平均變化。下：變小的次數。「強的時候」是一開始 ' + num(7) + ' 以上。浪大時下一次量本來就容易變低，所以分開看。');
    } else html += '<p class="plate-lede">' + (neg.length ? '同一種陪法滿 ' + num(MIN_N) + ' 次後顯示。' : '不舒服的感覺陪完幾次之後，這裡會出現你自己的紀錄。') + '</p>';
    if (few.length) html += '<p class="note">還不到 ' + num(MIN_N) + ' 次：' + few.map((r) => F.TURNS[r.t].name + '（' + num(r.n) + '）').join('、') + '</p>';
    html += '</section>';

    /* 3. 感覺在替你在乎的事 */
    const needCount = {};
    for (const e of turned) if (e.turn === 'need') for (const n of e.needs || []) if (F.NEEDS[n]) needCount[n] = (needCount[n] || 0) + 1;
    const needRows = Object.keys(needCount)
      .map((n) => ({ n, c: needCount[n] }))
      .sort((a, b) => b.c - a.c);
    if (needRows.length) {
      html += '<section class="paper leaf framed">' + plateHead(++plate, '感覺在替你在乎的事') + '<div class="chart" data-chart="need"></div>';
      html += caption(++fig, '「聽聽它要什麼」選過的需要，以及次數。');
      if (F.NEED_QUESTIONS[needRows[0].n]) html += '<p class="plate-q">' + esc(F.NEED_QUESTIONS[needRows[0].n]) + '</p>';
      html += '</section>';
    }

    /* 4. 你用過的字：像書後面的索引 */
    const wc = {};
    for (const e of list) for (const w of e.words || []) wc[w] = (wc[w] || 0) + 1;
    const words = Object.keys(wc)
      .sort((a, b) => wc[b] - wc[a])
      .slice(0, 12);
    const distinct = new Set([].concat(...all.map((e) => e.words || []))).size;
    if (words.length) {
      html += '<section class="paper leaf"><header class="ph"><h3 class="ph-t">你用過的字</h3></header><ul class="idx">';
      for (const w of words) html += '<li><span>' + esc(w) + '</span>' + num(wc[w]) + '</li>';
      html += '</ul><p class="note">到目前為止，你用過 ' + num(distinct) + ' 個不同的字描述自己的感覺。</p></section>';
    }

    /* 5. 還在漂的幼生 */
    const larvae = all.filter((e) => !e.turn);
    if (larvae.length) {
      html += '<section class="paper leaf"><header class="ph"><h3 class="ph-t">還在漂的幼生</h3></header><ul class="rows act-rows">';
      for (const e of larvae.slice(-6).reverse()) {
        html += '<li class="row"><div class="row-main"><span class="rec-words">' + P.wordsHTML(e) + '</span><span class="label">' + num(mmdd(e.t)) + (e.i0 != null ? '　' + P.waveKey(e) + ' ' + num(e.i0) : '') + '</span></div>';
        html += '<button class="btn-2" data-resume="' + e.id + '">陪它</button></li>';
      }
      html += '</ul></section>';
    }

    /* 6. 海龜背上的小事 */
    const steps = all.filter((e) => e.turn === 'step' && e.step && e.step.status === 'pending');
    if (steps.length) {
      html += '<section class="paper leaf"><header class="ph"><h3 class="ph-t">海龜背上的小事</h3></header><ul class="rows act-rows">';
      for (const e of steps.slice(-6).reverse()) {
        // 危機紀錄不重現原文
        const what = e.crisis || !e.step.what ? '一件小事' : '<span class="hand">' + esc(e.step.what) + '</span>';
        html += '<li class="row"><div class="row-main"><span class="act-t">' + what + '</span><span class="label">' + num(mmdd(e.t)) + '　想在「' + (F.STEP_WHEN[e.step.when] || F.STEP_WHEN.now).name + '」做</span></div>';
        html += '<button class="btn-2" data-done="' + e.id + '">做到了</button></li>';
      }
      html += '</ul></section>';
    }

    /* 7. 你寫給自己的話：危機紀錄的原文永遠不重現 */
    const said = all.filter((e) => !e.crisis && e.text && P.SAID_TURNS.includes(e.turn)).slice(-12).reverse();
    if (said.length) {
      html += '<section class="paper leaf"><header class="ph"><h3 class="ph-t">你寫給自己的話</h3></header><ul class="memos">';
      for (const e of said) html += P.memo(e);
      html += '</ul></section>';
    }

    /* 8. 珍珠盒 */
    const pearls = Game.eco.pearls();
    if (pearls.length) {
      html += '<section class="paper leaf framed">' + plateHead(++plate, '珍珠盒', num(pearls.length) + ' 顆') + '<ul class="pbox">';
      pearls.forEach((p, i) => {
        html += '<li><button class="pearl-item" data-pearl="' + i + '" aria-label="「' + F.FAMILIES[p.fam].name + '」的珍珠，' + p.layers.length + ' 層"><span class="win"><canvas data-layers="' + p.layers.join(',') + '" aria-hidden="true"></canvas></span>';
        html += '<span class="pearl-n">' + P.famDot(p.fam) + F.FAMILIES[p.fam].name + '</span><span class="label">' + num(p.layers.length) + ' 層</span></button></li>';
      });
      html += '</ul>' + caption(++fig, '同一種感覺結成的珍珠。點一顆看剖面。') + '</section>';
    }

    html += '</div><div class="paper tip" id="tTip" role="tooltip" hidden></div>';
    body.innerHTML = html;

    // 圖依紙的實際寬度畫：SVG 不縮放，字級維持 13／12px
    body.querySelectorAll('[data-chart]').forEach((el) => {
      const W = Math.max(260, Math.floor(el.clientWidth) || 320);
      const k = el.dataset.chart;
      el.innerHTML = k === 'map' ? mapSVG(list, W) : k === 'change' ? changeSVG(rows, W) : needSVG(needRows, W);
    });

    body.querySelectorAll('[data-range]').forEach((b) =>
      b.addEventListener('click', () => {
        range = +b.dataset.range;
        MJ.UI.rerender();
      })
    );
    const rc = body.querySelector('#tRecap');
    if (rc) rc.addEventListener('click', () => UI.recapModal());
    body.querySelectorAll('[data-group]').forEach((b) =>
      b.addEventListener('click', () => {
        group = b.dataset.group;
        MJ.UI.rerender();
      })
    );
    body.querySelectorAll('[data-resume]').forEach((b) =>
      b.addEventListener('click', () => {
        const e = all.find((x) => x.id === b.dataset.resume);
        if (e) MJ.Ritual.start({ resume: e });
      })
    );
    body.querySelectorAll('[data-done]').forEach((b) =>
      b.addEventListener('click', () => {
        UI.closeSheet();
        Game.setStep(b.dataset.done, 'done');
      })
    );
    body.querySelectorAll('canvas[data-layers]').forEach((c) => UI.drawPearl(c, c.dataset.layers.split(','), Math.round(c.parentNode.clientWidth) || 72));
    body.querySelectorAll('[data-pearl]').forEach((b) => b.addEventListener('click', () => UI.pearlModal(pearls[+b.dataset.pearl])));
    bindTips(body);
    return '潮汐圖';
  };

  /** 提示框：滑過或聚焦在資料點上時出現（紙色、1px 印刷墨框、直角） */
  function bindTips(body) {
    const tip = body.querySelector('#tTip');
    if (!tip) return;
    const show = (el, ev) => {
      tip.textContent = el.getAttribute('data-tip');
      tip.hidden = false;
      const r = body.getBoundingClientRect();
      let x;
      let y;
      if (ev && ev.clientX != null) {
        x = ev.clientX - r.left;
        y = ev.clientY - r.top + body.scrollTop;
      } else {
        const b = el.getBoundingClientRect();
        x = b.left + b.width / 2 - r.left;
        y = b.top - r.top + body.scrollTop;
      }
      tip.style.left = Math.max(8, Math.min(r.width - 8 - tip.offsetWidth, x - tip.offsetWidth / 2)) + 'px';
      tip.style.top = y - tip.offsetHeight - 12 + 'px';
    };
    const hide = () => (tip.hidden = true);
    body.querySelectorAll('[data-tip]').forEach((el) => {
      el.addEventListener('pointerenter', (e) => show(el, e));
      el.addEventListener('pointermove', (e) => show(el, e));
      el.addEventListener('pointerleave', hide);
      el.addEventListener('focus', () => show(el));
      el.addEventListener('blur', hide);
    });
  }

  const svgOpen = (W, H, label) => '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + label + '">';

  /** 情緒環狀模型：橫軸舒服與否、縱軸激動與否；每個家族一顆實心圓，面積＝次數，名字直接標在旁邊 */
  function mapSVG(list, W) {
    const H = Math.round(Math.min(W * 0.82, 320));
    const padX = 40;
    const padY = 32;
    const cx = W / 2;
    const cy = H / 2;
    const sx = (v) => cx + v * (W / 2 - padX);
    const sy = (a) => cy - a * (H / 2 - padY);
    const stats = {};
    for (const e of list) {
      if (!F.FAMILIES[e.fam]) continue;
      const s = (stats[e.fam] = stats[e.fam] || { n: 0, sum: 0, m: 0 });
      s.n++;
      if (e.i0 != null) {
        s.sum += e.i0;
        s.m++;
      }
    }
    const max = Math.max(1, ...Object.values(stats).map((s) => s.n));
    let svg = svgOpen(W, H, '感覺落在情緒地圖上的位置');
    svg += '<line x1="0" y1="' + cy + '" x2="' + W + '" y2="' + cy + '" class="axis"/>';
    svg += '<line x1="' + cx + '" y1="0" x2="' + cx + '" y2="' + H + '" class="axis"/>';
    svg += '<text x="0" y="' + (cy - 8) + '" class="ax-lbl">不舒服</text>';
    svg += '<text x="' + W + '" y="' + (cy - 8) + '" class="ax-lbl" text-anchor="end">舒服</text>';
    svg += '<text x="' + (cx + 8) + '" y="13" class="ax-lbl">激動</text>';
    svg += '<text x="' + (cx + 8) + '" y="' + (H - 3) + '" class="ax-lbl">安靜</text>';
    for (const id of F.FAMILY_IDS) {
      const f = F.FAMILIES[id];
      const s = stats[id];
      const x = sx(f.v);
      const y = sy(f.a);
      if (!s) {
        svg += '<circle cx="' + x + '" cy="' + y + '" r="3" class="ghost-dot"/>';
        svg += '<text x="' + x + '" y="' + (y + 17) + '" class="ax-lbl" text-anchor="middle">' + f.name + '</text>';
        continue;
      }
      // 面積與次數成正比，半徑 3–20
      const r = Math.max(3, 20 * Math.sqrt(s.n / max));
      const avg = s.m ? '，平均浪 ' + (s.sum / s.m).toFixed(1) : '';
      const paint = id === 'fog' ? 'class="pt fog" style="stroke:var(--fp-fog)"' : 'class="pt" style="fill:var(--fp-' + id + ')"';
      // 落在縱軸上的（說不上來）把名字標在右上，不壓在軸線上
      const onAxis = Math.abs(f.v) < 0.1;
      const lbl = onAxis
        ? '<text x="' + (x + r + 6) + '" y="' + (y - r - 4) + '" class="b-lbl">'
        : '<text x="' + x + '" y="' + (y + r + 16) + '" class="b-lbl" text-anchor="middle">';
      svg +=
        '<g class="bubble" tabindex="0" data-tip="' + f.name + '：' + s.n + ' 次' + avg + '">' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + (r + 8) + '" fill="transparent"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" ' + paint + '/>' +
        lbl + f.name + ' <tspan class="b-num">' + s.n + '</tspan></text></g>';
    }
    return svg + '</svg>';
  }

  /** ↓ 0.8（浪變小）、↑ 0.4（浪變大）；不用顏色表示好壞 */
  const dirText = (d) => (Math.abs(d) < 0.05 ? '0.0' : (d > 0 ? '↓ ' : '↑ ') + Math.abs(d).toFixed(1));

  /**
   * 陪完之後浪的變化。往右是浪變小，往左是浪變大；左右同一把尺，長條同一個顏色。
   * 左欄是陪法名，下一行是「變小的次數/總次數」。
   */
  function changeSVG(rows, W) {
    const rowH = 52;
    const nameW = 116;
    const valRoom = 44;
    const drops = rows.map((r) => -r.avg);
    const maxDown = Math.max(0, ...drops);
    const maxUp = Math.max(0, ...drops.map((d) => -d));
    const avail = W - nameW - valRoom - (maxUp > 0 ? valRoom : 8);
    // 分母至少 2：平均只變 0.2 的時候，長條不會被放大到滿版
    const scale = avail / Math.max(maxDown + maxUp, 2);
    const base = nameW + (maxUp > 0 ? valRoom + maxUp * scale : 8);
    const H = rows.length * rowH + 28;
    let svg = svgOpen(W, H, '每一種陪法之後，浪平均的變化');
    svg += '<line x1="' + base + '" y1="0" x2="' + base + '" y2="' + (H - 24) + '" class="axis"/>';
    svg += '<text x="' + (base + 6) + '" y="' + (H - 6) + '" class="ax-lbl">浪變小 →</text>';
    if (maxUp > 0) svg += '<text x="' + (base - 6) + '" y="' + (H - 6) + '" class="ax-lbl" text-anchor="end">← 變大</text>';
    rows.forEach((r, i) => {
      const y = 4 + i * rowH;
      const t = F.TURNS[r.t];
      const d = -r.avg;
      const len = Math.max(1, Math.abs(d) * scale);
      const right = d >= 0;
      const val = dirText(d);
      svg += '<g class="bar-row" tabindex="0" data-tip="' + t.name + '：' + r.n + ' 次裡有 ' + r.down + ' 次變小，浪平均 ' + val + '">';
      svg += '<rect x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>';
      svg += '<text x="0" y="' + (y + 17) + '" class="b-name">' + t.name + '</text>';
      svg += '<text x="0" y="' + (y + 36) + '" class="b-sub">' + r.down + '/' + r.n + ' 次變小</text>';
      svg += '<rect class="b-bar" x="' + (right ? base : base - len) + '" y="' + (y + 6) + '" width="' + len + '" height="12"/>';
      const tx = right ? base + len + 6 : base - len - 6;
      svg += '<text x="' + tx + '" y="' + (y + 16) + '" class="b-val" text-anchor="' + (right ? 'start' : 'end') + '">' + val + '</text>';
      svg += '</g>';
    });
    return svg + '</svg>';
  }

  /** 需要：單一系列，單色長條 */
  function needSVG(rows, W) {
    const rowH = 32;
    const left = 88;
    const H = rows.length * rowH;
    const max = Math.max(...rows.map((r) => r.c));
    const scale = (W - left - 40) / max;
    let svg = svgOpen(W, H, '各種需要出現的次數');
    svg += '<line x1="' + left + '" y1="0" x2="' + left + '" y2="' + H + '" class="axis"/>';
    rows.forEach((r, i) => {
      const n = F.NEEDS[r.n];
      const y = i * rowH;
      const len = Math.max(2, r.c * scale);
      svg += '<g class="bar-row" tabindex="0" data-tip="' + n.name + '：' + r.c + ' 次">';
      svg += '<rect x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>';
      svg += '<text x="0" y="' + (y + 21) + '" class="b-name">' + n.name + '</text>';
      svg += '<rect class="b-bar" x="' + left + '" y="' + (y + 10) + '" width="' + len + '" height="12"/>';
      svg += '<text x="' + (left + len + 6) + '" y="' + (y + 20) + '" class="b-val">' + r.c + '</text></g>';
    });
    return svg + '</svg>';
  }

  MJ.Tides = T;
  if (MJ.UI && MJ.UI.RENDER) {
    MJ.UI.RENDER.tides = T.render;
    MJ.UI.RENDER.tides.back = 'more';
  }
})((window.MJ = window.MJ || {}));
