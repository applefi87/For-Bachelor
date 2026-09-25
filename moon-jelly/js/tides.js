/*
 * 海月水母館 — 潮汐圖：把心情紀錄攤開來看
 *
 * 不下結論，只把你自己的資料擺在你面前：
 * 感覺都落在哪裡、哪一種陪法對你來說讓浪變小、哪一種需要一直出現、你寫給自己的話。
 */
(function (MJ) {
  'use strict';

  const U = MJ.U;
  const F = MJ.Feelings;
  const esc = U.escape;
  const DAY = 86400000;
  // 色盲友善的藍橘配對（已用驗證工具在深色底上檢查過）
  const DOWN = '#3b9fd4';
  const UP = '#c9772b';

  const T = {};
  let range = 30;
  let group = 'all';
  const MIN_N = 3;
  const GROUPS = [
    ['all', '全部', () => true],
    ['high', '強的時候', (e) => e.i0 >= 7],
    ['low', '不那麼強', (e) => e.i0 <= 6],
  ];

  const inRange = (e) => range === 0 || Date.now() - e.t < range * DAY;

  T.render = (body) => {
    const Game = MJ.Game;
    const UI = MJ.UI;
    const icon = UI.icon;
    const all = Game.state.entries;
    const list = all.filter(inRange);
    let html = '';

    html += '<div class="seg" role="radiogroup" aria-label="時間範圍">';
    for (const [v, n] of [[7, '7 天'], [30, '30 天'], [0, '全部']]) {
      html += '<button class="seg-btn' + (range === v ? ' on' : '') + '" role="radio" aria-checked="' + (range === v) + '" data-range="' + v + '">' + n + '</button>';
    }
    html += '</div>';

    if (!all.length) {
      html +=
        '<div class="empty">還沒有任何心情。<br>下次有感覺的時候，按下方的「心情」，把它倒進海裡。</div>' +
        '<button class="btn wide" id="tStart">現在就試試看</button>';
      body.innerHTML = html;
      bindRange(body);
      body.querySelector('#tStart').addEventListener('click', () => MJ.Ritual.start());
      return '潮汐圖';
    }

    const turned = list.filter((e) => e.turn);
    const turnKinds = new Set(turned.map((e) => e.turn));
    html += '<p class="lede">' + (range ? '這 ' + range + ' 天' : '到目前為止') + '，你替 <b>' + list.length + '</b> 份感覺取了名字，用了 <b>' + turnKinds.size + '</b> 種方式陪它們。</p>';
    if (Game.weekEntries().length) html += '<button class="btn ghost wide" id="tRecap">' + icon('diary') + '這一週的回顧</button>';

    /* 1. 海的地圖：情緒環狀模型 */
    html += '<h3 class="sub-h">感覺都落在哪裡</h3>';
    html += mapSVG(list);

    /* 2. 哪一種陪法，讓浪變小 */
    // 強度很高的時候，下一次量本來就容易低一點（回歸平均數），所以可以分開看強的和不那麼強的時候
    const gf = (GROUPS.find((g) => g[0] === group) || GROUPS[0])[2];
    const neg = turned.filter((e) => !F.isPositive(e.fam) && e.i0 != null && e.i1 != null && gf(e));
    const byTurn = {};
    for (const e of neg) (byTurn[e.turn] = byTurn[e.turn] || []).push(e.i1 - e.i0);
    const all3 = Object.keys(byTurn).map((t) => ({
      t,
      n: byTurn[t].length,
      down: byTurn[t].filter((x) => x < 0).length,
      avg: byTurn[t].reduce((a, b) => a + b, 0) / byTurn[t].length,
    }));
    const rows = all3.filter((r) => r.n >= MIN_N).sort((a, b) => a.avg - b.avg);
    const few = all3.filter((r) => r.n < MIN_N);
    html += '<h3 class="sub-h">對你來說，哪一種陪法讓浪變小</h3>';
    html += '<div class="seg wrap" role="radiogroup" aria-label="哪些時候">';
    for (const [id, name] of GROUPS) html += '<button class="seg-btn' + (group === id ? ' on' : '') + '" role="radio" aria-checked="' + (group === id) + '" data-group="' + id + '">' + name + '</button>';
    html += '</div>';
    if (rows.length) {
      html += changeSVG(rows);
      html += '<p class="note">數字是陪完之後，強度平均變了多少；下面一行是有幾次真的變小。「強的時候」是一開始 7 以上，「不那麼強」是 6 以下。浪很大的時候，下一次量本來就容易低一點，分開看會比較公平。</p>';
    } else html += '<p class="note">' + (neg.length ? '同一種陪法用過三次以上，這裡才會出現。' : '不舒服的感覺陪完幾次之後，這裡會出現你自己的答案。') + '</p>';
    if (few.length) html += '<p class="note">還不到三次：' + few.map((r) => F.TURNS[r.t].name + '（' + r.n + '）').join('、') + '</p>';

    /* 3. 感覺在替你在乎的事 */
    const needCount = {};
    for (const e of turned) if (e.turn === 'need') for (const n of e.needs || []) needCount[n] = (needCount[n] || 0) + 1;
    const needRows = Object.keys(needCount)
      .map((n) => ({ n, c: needCount[n] }))
      .sort((a, b) => b.c - a.c);
    if (needRows.length) {
      html += '<h3 class="sub-h">感覺在替你在乎的事</h3>' + needSVG(needRows);
      html += '<p class="sea-q">' + esc(F.NEED_QUESTIONS[needRows[0].n]) + '</p>';
    }

    /* 4. 最常用的字 */
    const wc = {};
    for (const e of list) for (const w of e.words || []) wc[w] = (wc[w] || 0) + 1;
    const words = Object.keys(wc)
      .sort((a, b) => wc[b] - wc[a])
      .slice(0, 12);
    html += '<h3 class="sub-h">你用過的字</h3><div class="chips">';
    for (const w of words) {
      const f = F.FAMILIES[F.familyOf(w)];
      html += '<span class="chip"><i class="sw" style="background:hsl(' + f.hue + ',' + Math.round(Math.max(0.3, f.sat) * 100) + '%,65%)"></i>' + esc(w) + '<small class="cnt">' + wc[w] + '</small></span>';
    }
    const distinct = new Set([].concat(...all.map((e) => e.words || []))).size;
    html += '</div><p class="note">到目前為止，你用過 ' + distinct + ' 個不同的字描述自己的感覺。</p>';

    /* 5. 還在漂的幼生 */
    const larvae = all.filter((e) => !e.turn);
    if (larvae.length) {
      html += '<h3 class="sub-h">還在漂的幼生</h3><ul class="rows">';
      for (const e of larvae.slice(-6).reverse()) {
        html += '<li class="row">' + '<span class="eco-badge sm" style="--h:' + F.FAMILIES[e.fam].hue + '">' + icon('larva') + '</span>';
        html += '<div class="row-main"><div class="row-title">' + e.words.map((w) => '「' + esc(w) + '」').join('') + '</div><div class="row-sub">' + fmtDate(e.t) + (e.i0 != null ? '・浪 ' + e.i0 : '') + '</div></div>';
        html += '<button class="btn sm ghost" data-resume="' + e.id + '">陪它</button></li>';
      }
      html += '</ul>';
    }

    /* 6. 背上的小事 */
    const steps = all.filter((e) => e.turn === 'step' && e.step && e.step.status === 'pending');
    if (steps.length) {
      html += '<h3 class="sub-h">海龜背上的小事</h3><ul class="rows">';
      for (const e of steps.slice(-6).reverse()) {
        html += '<li class="row"><span class="eco-badge sm" style="--h:' + F.TURNS.step.hue + '">' + icon('step') + '</span>';
        html += '<div class="row-main"><div class="row-title">' + esc(e.step.what) + '</div><div class="row-sub">' + fmtDate(e.t) + '・想在「' + F.STEP_WHEN[e.step.when].name + '」做</div></div>';
        html += '<button class="btn sm" data-done="' + e.id + '">做到了</button></li>';
      }
      html += '</ul>';
    }

    /* 7. 你寫給自己的話 */
    const said = all.filter((e) => e.text && ['reframe', 'kind', 'savor', 'thank', 'keep', 'need'].includes(e.turn)).slice(-12).reverse();
    if (said.length) {
      html += '<h3 class="sub-h">你寫給自己的話</h3><ul class="said-list">';
      for (const e of said) {
        const t = F.TURNS[e.turn];
        const label = e.turn === 'reframe' ? F.LENSES[e.lens].name : t.name;
        html += '<li style="--h:' + t.hue + '"><span class="said-meta"><i></i>' + fmtDate(e.t) + '・' + label + '・「' + esc(e.words[0]) + '」</span>' + esc(e.text) + '</li>';
      }
      html += '</ul>';
    }

    /* 8. 珍珠盒 */
    const pearls = Game.eco.pearls();
    if (pearls.length) {
      html += '<h3 class="sub-h">珍珠盒</h3><div class="pearl-box">';
      pearls.forEach((p, i) => {
        html += '<button class="pearl-item" data-pearl="' + i + '"><canvas width="64" height="64" data-layers="' + p.layers.join(',') + '" aria-hidden="true"></canvas><span>' + F.FAMILIES[p.fam].name + '</span></button>';
      });
      html += '</div>';
    }

    html += '<div class="tip" id="tTip" role="tooltip" hidden></div>';
    body.innerHTML = html;

    bindRange(body);
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
    body.querySelectorAll('canvas[data-layers]').forEach((c) => UI.drawPearl(c, c.dataset.layers.split(','), 64));
    body.querySelectorAll('[data-pearl]').forEach((b) => b.addEventListener('click', () => UI.pearlModal(pearls[+b.dataset.pearl])));
    bindTips(body);
    return '潮汐圖';
  };

  function bindRange(body) {
    body.querySelectorAll('[data-range]').forEach((b) =>
      b.addEventListener('click', () => {
        range = +b.dataset.range;
        MJ.UI.rerender();
      })
    );
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    return d.getMonth() + 1 + '/' + d.getDate();
  }

  /** 提示框：滑過或聚焦在資料點上時出現 */
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

  /** 情緒環狀模型：橫軸舒服與否、縱軸激動與否；每個家族一顆泡泡，名字直接標在旁邊 */
  function mapSVG(list) {
    const W = 340;
    const H = 300;
    const pad = 34;
    const cx = W / 2;
    const cy = H / 2;
    const sx = (v) => cx + v * (W / 2 - pad);
    const sy = (a) => cy - a * (H / 2 - pad);
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
    let svg = '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="感覺落在情緒地圖上的位置">';
    svg += '<line x1="12" y1="' + cy + '" x2="' + (W - 12) + '" y2="' + cy + '" class="axis"/>';
    svg += '<line x1="' + cx + '" y1="12" x2="' + cx + '" y2="' + (H - 12) + '" class="axis"/>';
    svg += '<text x="12" y="' + (cy - 6) + '" class="ax-lbl">不舒服</text>';
    svg += '<text x="' + (W - 12) + '" y="' + (cy - 6) + '" class="ax-lbl" text-anchor="end">舒服</text>';
    svg += '<text x="' + (cx + 6) + '" y="20" class="ax-lbl">激動</text>';
    svg += '<text x="' + (cx + 6) + '" y="' + (H - 8) + '" class="ax-lbl">平靜</text>';
    for (const id of F.FAMILY_IDS) {
      const f = F.FAMILIES[id];
      const s = stats[id];
      const x = sx(f.v);
      const y = sy(f.a);
      if (!s) {
        svg += '<circle cx="' + x + '" cy="' + y + '" r="3" class="ghost-dot"/>';
        svg += '<text x="' + x + '" y="' + (y + 16) + '" class="ax-lbl" text-anchor="middle">' + f.name + '</text>';
        continue;
      }
      const r = 6 + Math.sqrt(s.n / max) * 12;
      const avg = s.m ? '，平均強度 ' + (s.sum / s.m).toFixed(1) : '';
      svg +=
        '<g class="bubble" tabindex="0" data-tip="' + f.name + '：' + s.n + ' 次' + avg + '">' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + (r + 10) + '" fill="transparent"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + (r + 2) + '" class="ring"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="hsl(' + f.hue + ',' + Math.round(Math.max(0.3, f.sat) * 100) + '%,58%)" fill-opacity="0.8"/>' +
        '<text x="' + x + '" y="' + (y + r + 13) + '" class="b-lbl" text-anchor="middle">' + f.name + ' ' + s.n + '</text></g>';
    }
    svg += '</svg></div>';
    return svg;
  }

  const roundBar = (x0, y, len, h, dir) => {
    // 基線那一端是平的、資料那一端是圓角
    const rr = Math.min(4, len / 2);
    if (dir > 0) {
      const x1 = x0 + len;
      return 'M' + x0 + ',' + y + 'H' + (x1 - rr) + 'Q' + x1 + ',' + y + ' ' + x1 + ',' + (y + rr) + 'V' + (y + h - rr) + 'Q' + x1 + ',' + (y + h) + ' ' + (x1 - rr) + ',' + (y + h) + 'H' + x0 + 'Z';
    }
    const x1 = x0 - len;
    return 'M' + x0 + ',' + y + 'H' + (x1 + rr) + 'Q' + x1 + ',' + y + ' ' + x1 + ',' + (y + rr) + 'V' + (y + h - rr) + 'Q' + x1 + ',' + (y + h) + ' ' + (x1 + rr) + ',' + (y + h) + 'H' + x0 + 'Z';
  };

  /**
   * 陪完之後浪的變化。往右是浪變小（藍），往左是浪變大（橘）。
   * 左右用同一把尺；數值標在長條的尾端。
   */
  function changeSVG(rows) {
    const W = 340;
    const rowH = 40;
    const nameW = 100;
    const labelRoom = 58;
    const H = rows.length * rowH + 26;
    const drops = rows.map((r) => -r.avg);
    const maxDown = Math.max(0, ...drops);
    const maxUp = Math.max(0, ...drops.map((d) => -d));
    const upRoom = maxUp > 0 ? 64 : 0;
    const base = nameW + upRoom;
    const scale = Math.min((W - base - labelRoom) / Math.max(maxDown, 0.5), maxUp > 0 ? (upRoom - 34) / maxUp : Infinity);
    let svg = '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="每一種陪法之後，強度平均變化">';
    svg += '<line x1="' + base + '" y1="2" x2="' + base + '" y2="' + (H - 20) + '" class="axis"/>';
    svg += '<text x="' + (base + 4) + '" y="' + (H - 4) + '" class="ax-lbl">浪變小 →</text>';
    if (upRoom) svg += '<text x="' + (base - 4) + '" y="' + (H - 4) + '" class="ax-lbl" text-anchor="end">← 變大</text>';
    rows.forEach((r, i) => {
      const y = 6 + i * rowH;
      const t = F.TURNS[r.t];
      const d = -r.avg;
      const len = Math.max(2, Math.abs(d) * scale);
      const dir = d >= 0 ? 1 : -1;
      const color = d > 0 ? DOWN : d < 0 ? UP : '#6f909c';
      const val = (d > 0 ? '−' : d < 0 ? '+' : '±') + Math.abs(d).toFixed(1);
      svg += '<g class="bar-row" tabindex="0" data-tip="' + t.name + '：' + r.n + ' 次裡有 ' + r.down + ' 次變小，強度平均 ' + val + '">';
      svg += '<rect x="0" y="' + (y - 5) + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>';
      svg += '<circle cx="6" cy="' + (y + 7) + '" r="4" fill="hsl(' + t.hue + ',70%,62%)"/>';
      svg += '<text x="16" y="' + (y + 11) + '" class="b-name">' + t.name + '</text>';
      svg += '<text x="16" y="' + (y + 26) + '" class="b-sub">' + r.down + '/' + r.n + ' 次變小</text>';
      svg += '<path d="' + roundBar(base, y, len, 14, dir) + '" fill="' + color + '"/>';
      const tx = dir > 0 ? base + len + 5 : base - len - 5;
      svg += '<text x="' + tx + '" y="' + (y + 11) + '" class="b-val" text-anchor="' + (dir > 0 ? 'start' : 'end') + '">' + val + '</text>';
      svg += '</g>';
    });
    svg += '</svg></div>';
    return svg;
  }

  /** 需要：每一群燈籠魚有多大 */
  function needSVG(rows) {
    const W = 340;
    const rowH = 26;
    const left = 84;
    const H = rows.length * rowH + 6;
    const max = Math.max(...rows.map((r) => r.c));
    const scale = (W - left - 40) / max;
    let svg = '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="各種需要出現的次數">';
    rows.forEach((r, i) => {
      const n = F.NEEDS[r.n];
      const y = 6 + i * rowH;
      const len = Math.max(4, r.c * scale);
      svg += '<g tabindex="0" data-tip="' + n.name + '：' + r.c + ' 次">';
      svg += '<rect x="0" y="' + (y - 5) + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>';
      svg += '<circle cx="6" cy="' + (y + 6) + '" r="4" fill="hsl(' + n.hue + ',80%,62%)"/>';
      svg += '<text x="16" y="' + (y + 10) + '" class="b-name">' + n.name + '</text>';
      svg += '<path d="' + roundBar(left, y, len, 12, 1) + '" fill="' + DOWN + '"/>';
      svg += '<text x="' + (left + len + 6) + '" y="' + (y + 10) + '" class="b-val">' + r.c + '</text></g>';
    });
    svg += '</svg></div>';
    return svg;
  }

  MJ.Tides = T;
  if (MJ.UI && MJ.UI.RENDER) {
    MJ.UI.RENDER.tides = T.render;
    MJ.UI.RENDER.tides.back = 'more';
  }
})((window.MJ = window.MJ || {}));
