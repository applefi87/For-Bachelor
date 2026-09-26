/*
 * 海月水母館 — 心情的儀式（暗色的「心情紀錄」表，DESIGN.md §7）
 *
 * 倒出來 → 取名字 → 怎麼陪 → 現在呢
 * 情緒一來、想急著放上來的時候，最快兩三下就能完成；想慢慢來也可以。
 * 這裡只問問題、只給選項，不告訴你「應該」怎麼想。
 *
 * 版面：頁首（心情紀錄、日期、四個步驟字、先不要）與頁尾（狀態＋行動）固定，中間捲動。
 * 前兩步照最壞的情況（浪 8–10）設計：說明最多一行、選項分兩層、量尺和「下一步」一直看得到。
 */
(function (MJ) {
  'use strict';

  const U = MJ.U;
  const F = MJ.Feelings;
  const esc = U.escape;
  const $ = (id) => document.getElementById(id);

  const STEPS = [
    ['pour', '倒出來'],
    ['name', '取名字'],
    ['turn', '怎麼陪'],
    ['again', '現在呢'],
  ];
  const MAX_WORDS = 3;
  const MAX_NEEDS = 2;

  const R = { open: false };
  let Game;
  let d = null; // 這一次的草稿
  let anim = null;

  /* 觸控裝置上不自動聚焦輸入框，免得一打開就彈出鍵盤 */
  const finePointer = () => {
    try {
      return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    } catch (e) {
      return true;
    }
  };
  const p2 = (n) => String(n).padStart(2, '0');
  const stamp = (t) => {
    const x = new Date(t);
    return p2(x.getMonth() + 1) + '.' + p2(x.getDate()) + ' ' + p2(x.getHours()) + ':' + p2(x.getMinutes());
  };
  const num = (n) => '<span class="num">' + n + '</span>';
  const famOf = (w) => F.familyOf(w);
  /**
   * 家族名本身也可以直接當答案（DESIGN §7.2）。只有 F.familyOf 認得的名字才開放，
   * 免得存進紀錄後別的地方查不到它屬於哪一族（「不安」「疲憊」「喜悅」等 feelings.js 認得家族名後自動開放）。
   */
  const nameWord = (id) => {
    const n = F.FAMILIES[id].name;
    return famOf(n) === id ? n : null;
  };
  const dot = (id) => '<i class="dot' + (id === 'fog' ? ' fog' : '') + '" style="--c:var(--f-' + id + ')" aria-hidden="true"></i>';

  R.init = (game) => {
    Game = game;
    $('ritualClose').addEventListener('click', () => R.close());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && R.open && !MJ.UI.modalOpenNow) R.close();
    });
  };

  /** 打開儀式。opts.resume = 還在漂的幼生 */
  R.start = (opts = {}) => {
    MJ.UI.closeSheet();
    MJ.UI.closePopovers();
    if (opts.resume) {
      const e = opts.resume;
      d = { resume: e, id: e.id, t: e.t, raw: '', keepRaw: false, words: e.words.slice(), fams: e.fams.slice(), fam: e.fam, i0: e.i0, needs: [], text: '' };
    } else {
      // 強度預設不帶值：沒動量尺就存 null
      d = { id: U.uid(), t: Date.now(), raw: '', keepRaw: false, words: [], fams: [], fam: null, i0: null, needs: [], text: '' };
    }
    const el = $('ritual');
    $('ritualStamp').textContent = stamp(d.t);
    el.hidden = false;
    R.open = true;
    document.body.classList.add('ritual-open');
    R.show(opts.resume ? 'turn' : 'pour', undefined, true);
    void el.offsetWidth; // 先排版在畫面下方，再滑上來
    el.classList.add('open');
  };

  R.close = () => {
    stopAnim();
    const el = $('ritual');
    el.classList.remove('open');
    R.open = false;
    document.body.classList.remove('ritual-open');
    setTimeout(() => {
      if (!R.open) el.hidden = true;
      MJ.UI.pumpModals();
    }, 320);
  };

  function stopAnim() {
    if (anim) cancelAnimationFrame(anim);
    anim = null;
  }

  function stepIndex(step) {
    if (step === 'do') return 2;
    return Math.max(0, STEPS.findIndex((s) => s[0] === step));
  }

  /** 頁首的四個步驟字：目前那個加底線，底線平移過去（字都是三個字寬，所以位置用 em 算） */
  function setSteps(idx, hide, still) {
    const ol = $('ritualSteps');
    if (!ol.children.length) ol.innerHTML = STEPS.map(([id, name]) => '<li data-step="' + id + '">' + name + '</li>').join('');
    ol.hidden = hide;
    [...ol.children].forEach((li, i) => {
      li.className = i < idx ? 'done' : i === idx ? 'on' : '';
      if (i === idx) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
    if (still) ol.classList.add('still');
    ol.style.setProperty('--i', idx);
    if (still) {
      void ol.offsetWidth;
      ol.classList.remove('still');
    }
  }

  R.show = (step, arg, first) => {
    stopAnim();
    d.step = step;
    setSteps(stepIndex(step), step === 'care', first);
    const body = $('ritualBody');
    const foot = $('ritualFoot');
    body.scrollTop = 0;
    body.innerHTML = '';
    foot.innerHTML = '';
    foot.hidden = step === 'care';
    // 舊內容即時消失，新內容 120ms 淡入（危機畫面一出現就是最終樣子）
    for (const x of [body, foot]) {
      x.classList.remove('ink');
      if (step !== 'care') {
        void x.offsetWidth;
        x.classList.add('ink');
      }
    }
    VIEW[step](body, arg);
    const f = body.querySelector('[data-focus]');
    const title = $('ritualTitle');
    if (f && finePointer()) setTimeout(() => f.focus({ preventScroll: true }), 120);
    else if (title) title.focus({ preventScroll: true });
    // 浪大的時候，換步驟不出聲
    if (!(d.i0 != null && d.i0 >= 8)) MJ.Audio.click();
  };

  /** 頁尾：左邊狀態，右邊行動（主要按鈕在最後；手機上它自己一行、滿寬） */
  function footRow(status, actions) {
    return '<div class="r-row"><p class="r-status" id="rStatus" aria-live="polite">' + (status || '') + '</p>' + actions + '</div>';
  }
  const setStatus = (html) => {
    const s = $('rStatus');
    if (s) s.innerHTML = html || '';
  };

  /** 圈選的字被擠掉時，讓人看得到：筆圈 300ms 淡出 */
  function fadeOut(root, attr, value) {
    root.querySelectorAll('[' + attr + ']').forEach((x) => {
      if (x.getAttribute(attr) !== value) return;
      x.classList.add('out');
      setTimeout(() => x.classList.remove('out'), 320);
    });
  }

  const VIEW = {};

  /* ---------- 1. 倒出來 ---------- */
  VIEW.pour = (body) => {
    body.innerHTML =
      '<h2 class="r-title" id="ritualTitle" tabindex="-1">現在心裡有什麼？</h2>' +
      '<textarea id="rRaw" class="lined" rows="5" maxlength="600" data-focus placeholder="' + esc(U.pick(F.POUR_PLACEHOLDERS)) + '" aria-label="現在心裡有什麼">' + esc(d.raw) + '</textarea>' +
      '<label class="check"><input type="checkbox" id="rKeepRaw"' + (d.keepRaw ? ' checked' : '') + '><span><b>保存這段文字</b><small>不勾選：結束後刪除，不存檔</small></span></label>' +
      '<div class="r-links">' +
      (d.resume ? '' : '<button class="btn-3" id="rQuick">只倒出來，不整理</button>') +
      '<button class="btn-3 r-care" id="rCareLink">撐不住的時候 → 專線</button></div>';
    $('ritualFoot').innerHTML = footRow('', '<button class="btn-2" id="rSkip">跳過</button><button class="btn" id="rNext">下一步</button>');
    const next = () => {
      d.raw = $('rRaw').value.trim();
      d.keepRaw = $('rKeepRaw').checked;
      if (F.isCrisis(d.raw)) R.show('care', { next: 'name', back: 'pour' });
      else R.show('name');
    };
    $('rCareLink').addEventListener('click', () => {
      d.raw = $('rRaw').value;
      d.keepRaw = $('rKeepRaw').checked;
      R.show('care', { mode: 'menu', next: 'pour', back: 'pour' });
    });
    $('rNext').addEventListener('click', next);
    $('rSkip').addEventListener('click', () => {
      d.raw = '';
      R.show('name');
    });
    $('rRaw').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) next();
    });
    // 最快的路：不取名字、不量強度，直接交給水母吃掉
    const quick = $('rQuick');
    if (quick)
      quick.addEventListener('click', () => {
        d.raw = $('rRaw').value.trim();
        d.keepRaw = $('rKeepRaw').checked;
        d.words = ['說不上來'];
        d.fams = ['fog'];
        d.fam = 'fog';
        d.i0 = null;
        d.i1 = null;
        d.turn = 'release';
        d.text = '';
        d.quick = true;
        if (F.isCrisis(d.raw)) R.show('care', { next: 'finish', back: 'pour' });
        else R.finish();
      });
  };

  /*
   * 真的撐不住的時候：全站唯一不套美術風格的畫面。號碼可以直接撥打；
   * 兩個按鈕一樣輕重，不擋、不倒數，也不暗示「把字刪掉就好」。
   * 文字裡出現自傷的字時，這份紀錄之後不給光、不讓字散開、不重現原文（見 Game.commitEntry）。
   */
  VIEW.care = (body, o = {}) => {
    const mode = o.mode || 'text';
    if (mode === 'text') d.crisis = true;
    body.innerHTML =
      F.careHTML(mode) +
      '<div class="care-actions"><button class="btn ghost" id="rCareBack">回到剛才的地方</button>' +
      (mode === 'text' ? '<button class="btn ghost" id="rCareGo">先繼續</button>' : '') + '</div>';
    $('rCareBack').addEventListener('click', () => R.show(o.back || 'pour'));
    const go = $('rCareGo');
    if (go) go.addEventListener('click', () => (o.next === 'finish' ? R.finish() : R.show(o.next || 'name')));
  };

  /* ---------- 量尺：浪有多大？（0–10，預設不帶值） ---------- */
  function meterHTML(id, v, o = {}) {
    const read = v == null ? '<span class="r-unset">滑一下，或跳過</span>' : num(v);
    let before = '';
    if (o.before != null) before = '<i class="r-before' + (o.before >= 8 ? ' flip' : '') + '" style="--v:' + o.before + '" aria-hidden="true"><span>剛才</span></i>';
    return (
      '<div class="r-meter' + (o.big ? ' big' : '') + '">' +
      '<div class="r-meter-head"><label for="' + id + '" id="rMeterLbl">' + o.label + '</label><output class="r-read" id="rIVal" for="' + id + '">' + read + '</output></div>' +
      '<div class="r-ruler' + (before ? ' has-before' : '') + '">' + before +
      '<input type="range" class="ruler' + (v == null ? ' unset' : '') + '" id="' + id + '" min="0" max="10" step="1" value="' + (v == null ? 5 : v) + '" aria-describedby="rIScale"' + (v == null ? ' aria-valuetext="未量"' : '') + '></div>' +
      '<div class="r-scale" id="rIScale"><span>' + num(0) + ' 幾乎沒有</span>' + num(5) + '<span>快滿出來 ' + num(10) + '</span></div>' +
      '<canvas class="wave" id="rWave" aria-hidden="true"></canvas></div>'
    );
  }
  /** 量尺接上草稿：碰過才算量了（點在原本的位置上也算） */
  function bindMeter(id, set) {
    const r = $(id);
    const take = () => {
      r.classList.remove('unset');
      r.removeAttribute('aria-valuetext');
      $('rIVal').innerHTML = num(+r.value);
      set(+r.value);
    };
    r.addEventListener('input', take);
    r.addEventListener('pointerup', take);
  }

  /* ---------- 2. 取名字 ---------- */
  function recentWords() {
    const recent = [];
    const past = Game.state.entries;
    for (let i = past.length - 1; i >= 0 && recent.length < 6; i--) {
      for (const w of past[i].words || []) if (recent.length < 6 && !recent.includes(w) && famOf(w)) recent.push(w);
    }
    return recent;
  }
  const pickBtn = (w) => {
    const on = d.words.includes(w);
    return '<button class="pick' + (on ? ' on' : '') + '" data-word="' + esc(w) + '" aria-pressed="' + on + '">' + esc(w) + '</button>';
  };

  VIEW.name = (body) => {
    const recent = recentWords();
    let html = '<h2 class="r-title" id="ritualTitle" tabindex="-1">它比較像哪些字？</h2><p class="r-sub">選 1～3 個。</p>';
    // 第一層：最近用過（最多 6）＋10 個家族名；「說不上來」永遠在最後
    if (recent.length) html += '<div class="recent-words"><h3 class="sub-h">最近用過</h3><div class="picks">' + recent.map(pickBtn).join('') + '</div></div>';
    html += '<div class="fam-grid" role="group" aria-label="感覺">';
    for (const id of F.FAMILY_IDS) {
      const w = nameWord(id);
      const on = !!w && d.words.includes(w);
      html +=
        '<button class="pick fam-name' + (on ? ' on' : '') + '" data-fam="' + id + '"' + (w ? ' data-word="' + esc(w) + '" aria-pressed="' + on + '"' : '') +
        ' aria-expanded="false" aria-controls="rFam-' + id + '">' + dot(id) + F.FAMILIES[id].name + '</button>' +
        // 第二層：點家族才在原地展開那 6 個字（一次只開一族）
        '<div class="fam-words" id="rFam-' + id + '" role="group" aria-label="' + F.FAMILIES[id].name + '" hidden>' + F.FAMILIES[id].words.map(pickBtn).join('') + '</div>';
    }
    html += '</div>';
    body.innerHTML = html;

    const pos = () => d.words.length && F.isPositive(famOf(d.words[0]));
    $('ritualFoot').innerHTML =
      meterHTML('rI0', d.i0, { label: pos() ? '有多亮？' : '浪有多大？' }) +
      footRow('', '<button class="btn-2" id="rBack">上一步</button><button class="btn" id="rNext">下一步</button>');

    const grid = body.querySelector('.fam-grid');
    const openFam = (id) => {
      d.openFam = id;
      grid.classList.toggle('has-open', !!id);
      grid.querySelectorAll('[data-fam]').forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.fam === id)));
      grid.querySelectorAll('.fam-words').forEach((p) => (p.hidden = p.id !== 'rFam-' + id));
      const panel = id && $('rFam-' + id);
      if (panel) panel.scrollIntoView({ block: 'nearest' });
    };
    const sync = () => {
      body.querySelectorAll('[data-word]').forEach((x) => {
        const on = d.words.includes(x.dataset.word);
        x.classList.toggle('on', on);
        x.setAttribute('aria-pressed', String(on));
      });
      setStatus(d.words.length ? '已選 ' + num(d.words.length + '/' + MAX_WORDS) + '：' + d.words.map(esc).join('　') : '還沒選字');
      $('rNext').disabled = !d.words.length;
      $('rMeterLbl').textContent = pos() ? '有多亮？' : '浪有多大？';
    };
    const toggle = (w) => {
      const i = d.words.indexOf(w);
      if (i >= 0) d.words.splice(i, 1);
      else {
        d.words.push(w);
        if (d.words.length > MAX_WORDS) fadeOut(body, 'data-word', d.words.shift());
      }
      sync();
      MJ.Audio.chime(0);
    };
    // 打開家族時自動圈起來的家族名：之後在同一族裡圈了更準的字，就換成那個字（「不安」→「慌」）
    d.auto = d.auto || {};
    body.querySelectorAll('[data-word]:not([data-fam])').forEach((b) =>
      b.addEventListener('click', () => {
        const w = b.dataset.word;
        const f = b.closest('.fam-words') && famOf(w);
        const auto = f && d.auto[f];
        if (auto) delete d.auto[f];
        if (auto && auto !== w && d.words.includes(auto) && !d.words.includes(w)) {
          d.words.splice(d.words.indexOf(auto), 1);
          fadeOut(body, 'data-word', auto);
        }
        toggle(w);
      })
    );
    grid.querySelectorAll('[data-fam]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.fam;
        const w = b.dataset.word;
        if (d.openFam !== id) {
          openFam(id);
          // 家族名直接當答案；這一族已經有圈起來的字就不再加
          if (w && !d.words.some((x) => famOf(x) === id)) {
            d.auto[id] = w;
            toggle(w);
          }
        } else if (w) {
          delete d.auto[id];
          toggle(w);
        } else openFam(null);
      })
    );
    if (d.openFam) openFam(d.openFam);
    sync();

    bindMeter('rI0', (v) => (d.i0 = v));
    $('rBack').addEventListener('click', () => R.show('pour'));
    $('rNext').addEventListener('click', () => {
      d.fams = [];
      for (const w of d.words) {
        const f = famOf(w);
        if (f && !d.fams.includes(f)) d.fams.push(f);
      }
      d.fam = d.fams[0];
      R.show('turn');
    });
    waveLoop($('rWave'), () => d.i0);
  };

  /** 小小的浪：一條你的墨水畫的線，振幅跟著強度，速度固定 */
  function waveLoop(canvas, getI) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ctx = canvas.getContext('2d');
    const ink = getComputedStyle(canvas).color;
    let w = 0;
    let h = 0;
    const t0 = performance.now();
    const loop = (now) => {
      if (canvas.clientWidth !== w || canvas.clientHeight !== h) {
        w = canvas.clientWidth || 300;
        h = canvas.clientHeight || 32;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      const t = (now - t0) / 1000;
      const i = getI() || 0; // 未量：一條幾乎平的線
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const amp = 1 + (i / 10) * (h * 0.36);
      // 浪的高度跟著強度（讓人覺得被看見），速度固定在約 0.1 Hz（十秒一個起伏），不隨強度變快；
      // 系統設定「減少動態效果」時，浪停住
      const tt = U.reducedMotion ? 0 : t * 0.63;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const y = h / 2 + Math.sin(x * 0.03 + tt) * amp + Math.sin(x * 0.071 - tt * 0.7) * amp * 0.2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      anim = requestAnimationFrame(loop);
    };
    anim = requestAnimationFrame(loop);
  }

  /* ---------- 3. 怎麼陪它 ---------- */
  VIEW.turn = (body) => {
    const fams = d.fams.length ? d.fams : ['calm'];
    const turns = F.orderTurns(fams, d.i0);
    const words = d.words.map((w) => '「' + esc(w) + '」').join('');
    // 同一個家族最近兩週來了幾次（不算這一次）、最近三次是不是都只倒出來
    const past = Game.state.entries.filter((e) => e.fam === d.fam && e.id !== d.id);
    const recentSame = past.filter((e) => Date.now() - e.t < 14 * 86400000).length;
    const last3 = past.filter((e) => e.turn).slice(-3);
    const rec = F.recommend(d.fam, d.i0, recentSame);
    const high = d.i0 != null && d.i0 >= 8;
    // 數量跟著強度：8–10 先列 3 種、5–7 列 5 種、0–4 或未量全部；舒服的感覺列 4 種。其餘收起來，但一直選得到
    let n = turns.length;
    if (F.isPositive(fams[0])) n = 4;
    else if (high) n = 3;
    else if (d.i0 != null && d.i0 >= 5) n = 5;
    n = Math.min(n, turns.length);
    const ri = turns.indexOf(rec);
    if (ri >= n) turns.splice(n - 1, 0, turns.splice(ri, 1)[0]); // 「這種時候常用」的那一種一定看得到

    let html = '<h2 class="r-title" id="ritualTitle" tabindex="-1">怎麼陪' + words + '？</h2>';
    if (!high) html += '<p class="r-sub">右欄是它會長成的生物。</p>';
    if (last3.length === 3 && last3.every((e) => e.turn === 'release') && turns.includes('release')) {
      html += '<p class="r-note soft">最近 3 次「' + esc(F.FAMILIES[d.fam].name) + '」都選了「' + F.TURNS.release.name + '」。</p>';
    }
    html += '<div class="turns">';
    turns.forEach((id, i) => {
      const t = F.TURNS[id];
      const sp = F.SPECIES[t.species];
      const sub = id === 'reframe' && high ? '浪大時比較難做到' : t.sub;
      html +=
        '<button class="turn' + (id === rec ? ' rec' : '') + '" data-turn="' + id + '"' + (i >= n ? ' hidden' : '') + '>' +
        '<span class="t-main"><b class="t-name">' + t.name + '</b><small class="t-sub">' + sub + (id === rec ? '<span class="t-rec">　這種時候常用</span>' : '') + '</small></span>' +
        // 生物名小而淡；浪大時不顯示，免得為了想要某種生物而選
        (high ? '' : '<span class="t-sp">' + sp.name + '</span>') + '</button>';
    });
    html += '</div>';
    if (n < turns.length) html += '<button class="btn-3 r-more" id="rMore" aria-expanded="false">其他 ' + (turns.length - n) + ' 種</button>';
    body.innerHTML = html;
    $('ritualFoot').innerHTML = footRow(
      d.resume ? '' : '<button class="btn-3" id="rLater">先不選，讓它漂著</button>',
      d.resume ? '' : '<button class="btn-2" id="rBack">上一步</button>'
    );

    body.querySelectorAll('[data-turn]').forEach((b) =>
      b.addEventListener('click', () => {
        d.turn = b.dataset.turn;
        d.text = '';
        d.needs = [];
        d.lens = null;
        d.hard = null;
        R.show('do');
      })
    );
    const more = $('rMore');
    if (more)
      more.addEventListener('click', () => {
        const hidden = [...body.querySelectorAll('.turn[hidden]')];
        hidden.forEach((b) => (b.hidden = false));
        more.remove();
        if (hidden[0]) hidden[0].focus({ preventScroll: true });
      });
    const later = $('rLater');
    if (later)
      later.addEventListener('click', () => {
        d.turn = null;
        R.finish();
      });
    const back = $('rBack');
    if (back) back.addEventListener('click', () => R.show('name'));
  };

  /* ---------- 3b. 陪它的那一小段 ---------- */
  const picksOf = (list, attr, cur, role) =>
    list
      .map(([v, label]) => {
        const on = cur(v);
        return '<button class="pick' + (on ? ' on' : '') + '" ' + attr + '="' + esc(v) + '"' + (role ? ' role="radio" aria-checked="' + on + '"' : ' aria-pressed="' + on + '"') + '>' + esc(label) + '</button>';
      })
      .join('');

  VIEW.do = (body) => {
    const t = F.TURNS[d.turn];
    const word = esc(d.words[0] || '這個感覺');
    const text0 = esc(d.text || '');
    let html = '<h2 class="r-title" id="ritualTitle" tabindex="-1">' + t.name + '</h2>';
    let label = '下一步';
    let status = '';

    if (d.turn === 'allow') {
      html +=
        '<p class="r-sub">看著浪。</p>' +
        '<canvas class="surf" id="rSurf" aria-label="一道會升起、落下的浪"></canvas>' +
        '<p class="r-cap"><span id="rSurfTxt">升起</span>　<span id="rSurfCount">第 ' + num(1) + ' 道浪</span></p>';
      label = '好了';
      status = '看完一道浪即可繼續。';
    } else if (d.turn === 'ground') {
      html += '<p class="r-sub">每注意到一樣，點一顆。</p><ol class="ground">';
      F.GROUND.forEach(([verb, n, hint], i) => {
        html += '<li data-row="' + i + '"><span class="g-lbl"><b>' + verb + '</b><small>' + hint + '</small></span><span class="g-dots">';
        for (let k = 0; k < n; k++) html += '<button class="g-dot" data-g="' + i + '" aria-label="' + verb + '第 ' + (k + 1) + ' 樣" aria-pressed="false"></button>';
        html += '</span><i class="g-tick" aria-hidden="true"></i></li>';
      });
      html += '</ol>';
      status = '<span id="rGroundNote">點完前 3 行即可繼續。</span>';
    } else if (d.turn === 'reframe') {
      html += '<p class="r-sub">選一個殼。</p><div class="lenses" role="radiogroup" aria-label="殼">';
      for (const id of F.LENS_IDS) {
        const l = F.LENSES[id];
        const on = d.lens === id;
        html += '<button class="lens' + (on ? ' on' : '') + '" data-lens="' + id + '" role="radio" aria-checked="' + on + '"><span class="lens-fig"><canvas data-shell="' + l.shell + '" aria-hidden="true"></canvas></span><span class="lens-name">' + l.name + '</span></button>';
      }
      html +=
        '</div><p class="r-ask" id="rAsk">' + (d.lens ? F.LENSES[d.lens].ask : '') + '</p>' +
        '<textarea id="rText" class="lined" rows="3" maxlength="200" placeholder="寫一句" aria-label="換個角度寫一句"' + (d.lens ? '' : ' hidden') + '>' + text0 + '</textarea>';
    } else if (d.turn === 'need') {
      html +=
        '<p class="r-sub">「' + word + '」可能在替你在乎什麼？選 1～2 個。</p>' +
        '<div class="picks grid needs">' + picksOf(F.NEED_IDS.map((id) => [id, F.NEEDS[id].name]), 'data-need', (v) => d.needs.includes(v)) + '</div>' +
        '<p class="r-ask"><label for="rText">被照顧到一點，會是什麼樣子？</label></p><textarea id="rText" class="lined" rows="2" maxlength="200" placeholder="選填">' + text0 + '</textarea>';
    } else if (d.turn === 'kind') {
      html +=
        '<div class="kind-row"><p class="r-ask">這真的很</p><div class="picks" role="radiogroup" aria-label="這真的很">' + picksOf(F.KIND_HARD.map((w) => [w, w]), 'data-hard', (v) => d.hard === v, true) + '</div></div>' +
        '<p class="r-ask kind-row">現在也有很多人覺得「' + word + '」。</p>' +
        '<div class="kind-row"><p class="r-ask"><label for="rText">換作是朋友，你會對他說：</label></p>' +
        '<textarea id="rText" class="lined" rows="2" maxlength="200" placeholder="寫給自己">' + text0 + '</textarea>' +
        '<div class="r-starters"><span class="r-starters-h">可以從這裡開始</span>' + F.KIND_WORDS.map((w) => '<button class="btn-3" data-kw="' + esc(w) + '">' + esc(w) + '</button>').join('') + '</div></div>';
    } else if (d.turn === 'step') {
      const ideas = (F.STEP_IDEAS[d.fam] || []).concat(F.STEP_IDEAS.any).filter((w, i, a) => a.indexOf(w) === i).slice(0, 6);
      d.when = d.when || 'now';
      html +=
        '<p class="r-sub">選一件小到不會失敗的事。</p>' +
        '<div class="picks ideas">' + picksOf(ideas.map((w) => [w, w]), 'data-idea', (v) => v === d.text) + '</div>' +
        '<input id="rText" class="lined" maxlength="40" placeholder="或自己寫" aria-label="一件小事" value="' + text0 + '">' +
        '<p class="r-ask">什麼時候？</p><div class="picks" role="radiogroup" aria-label="什麼時候">' +
        picksOf(Object.entries(F.STEP_WHEN).map(([k, v]) => [k, v.name]), 'data-when', (v) => v === d.when, true) + '</div>';
    } else if (d.turn === 'release') {
      if (!d.raw) html += '<textarea id="rText" class="lined" rows="4" maxlength="600" data-focus placeholder="寫完，水母會把它吃掉。" aria-label="倒出來">' + text0 + '</textarea>';
      // 危機字詞出現過的原文不再重現
      else if (!d.crisis) html += '<p class="r-quote hand">' + esc(d.raw.length > 80 ? d.raw.slice(0, 80) + '……' : d.raw) + '</p>';
    } else if (d.turn === 'savor') {
      html += '<p class="r-sub"><label for="rText">那個瞬間裡，你看到、聽到、或感覺到什麼？</label></p><textarea id="rText" class="lined" rows="3" maxlength="200" data-focus placeholder="例如：風吹過來的時候，剛好聞到桂花">' + text0 + '</textarea>';
    } else if (d.turn === 'thank') {
      html +=
        '<p class="r-sub"><label for="rText">想謝謝誰、或什麼？</label></p><textarea id="rText" class="lined" rows="3" maxlength="200" data-focus placeholder="一個人、一件事、或一個巧合">' + text0 + '</textarea>' +
        '<label class="check"><input type="checkbox" id="rTell"' + (d.tell ? ' checked' : '') + '><span><b>等一下告訴他</b></span></label>';
    } else if (d.turn === 'keep') {
      html += '<p class="r-sub"><label for="rText">裝進瓶子，漂在海面上。</label></p><textarea id="rText" class="lined" rows="3" maxlength="200" data-focus placeholder="例如：記得今天，你笑到肚子痛">' + text0 + '</textarea>';
    }
    body.innerHTML = html;
    $('ritualFoot').innerHTML = footRow(status, '<button class="btn-2" id="rBack">換一種</button><button class="btn" id="rNext">' + label + '</button>');

    const text = $('rText');
    const next = $('rNext');
    const refresh = () => {
      const v = text ? text.value.trim() : '';
      if (d.turn === 'reframe') {
        next.disabled = !d.lens;
        setStatus(d.lens ? '已選：' + F.LENSES[d.lens].name : '先選一個殼。');
      } else if (d.turn === 'need') {
        next.disabled = !d.needs.length;
        setStatus(d.needs.length ? '已選 ' + num(d.needs.length + '/' + MAX_NEEDS) + '：' + d.needs.map((x) => F.NEEDS[x].name).join('　') : '選 1～2 個即可繼續。');
      } else if (d.turn === 'kind' || d.turn === 'keep') {
        next.disabled = !v;
        setStatus(v ? '' : '寫一句即可繼續。');
      } else if (d.turn === 'step') {
        next.disabled = !v;
        setStatus(v ? '' : '選一件或自己寫，即可繼續。');
        body.querySelectorAll('[data-idea]').forEach((x) => {
          const on = x.dataset.idea === v;
          x.classList.toggle('on', on);
          x.setAttribute('aria-pressed', String(on));
        });
      }
    };
    if (text) text.addEventListener('input', refresh);
    $('rBack').addEventListener('click', () => R.show('turn'));
    next.addEventListener('click', () => {
      d.text = text ? text.value.trim() : '';
      if (d.turn === 'thank') d.tell = !!($('rTell') && $('rTell').checked);
      // 不只第一步：任何一個寫字的地方出現傷害自己的念頭，都先停下來
      if (F.isCrisis(d.text)) R.show('care', { next: 'again', back: 'do' });
      else R.show('again');
    });

    if (d.turn === 'allow') {
      next.disabled = true;
      surf();
    }
    if (d.turn === 'ground') {
      next.disabled = true;
      let taps = 0;
      body.querySelectorAll('[data-g]').forEach((b) =>
        b.addEventListener('click', () => {
          if (b.classList.contains('on')) return;
          b.classList.add('on');
          b.setAttribute('aria-pressed', 'true');
          taps++;
          MJ.Audio.bell(MJ.Audio.degMidi(4 + Math.min(10, taps >> 1)), 0.05, 0, 0, null, 2);
          const row = b.closest('li');
          if (!row.querySelector('.g-dot:not(.on)')) row.classList.add('done');
          const rows = body.querySelectorAll('.ground li');
          const need = [0, 1, 2].every((i) => rows[i].classList.contains('done'));
          next.disabled = !need;
          if (need) $('rGroundNote').textContent = [...rows].every((r) => r.classList.contains('done')) ? '腳踩著地板。你在這裡。' : '可以繼續了。';
        })
      );
    }
    if (d.turn === 'reframe') {
      body.querySelectorAll('canvas[data-shell]').forEach((c) => {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        c.width = 48 * dpr;
        c.height = 48 * dpr;
        const g = c.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.translate(24, 26);
        g.scale(1.45, 1.45);
        MJ.Eco.drawShell(g, c.dataset.shell, 1, 1);
      });
      body.querySelectorAll('[data-lens]').forEach((b) =>
        b.addEventListener('click', () => {
          d.lens = b.dataset.lens;
          body.querySelectorAll('[data-lens]').forEach((x) => {
            x.classList.toggle('on', x === b);
            x.setAttribute('aria-checked', String(x === b));
          });
          $('rAsk').textContent = F.LENSES[d.lens].ask;
          text.hidden = false;
          if (finePointer()) text.focus();
          MJ.Audio.chime(0);
          refresh();
        })
      );
    }
    if (d.turn === 'need') {
      body.querySelectorAll('[data-need]').forEach((b) =>
        b.addEventListener('click', () => {
          const n = b.dataset.need;
          const i = d.needs.indexOf(n);
          if (i >= 0) d.needs.splice(i, 1);
          else {
            d.needs.push(n);
            if (d.needs.length > MAX_NEEDS) fadeOut(body, 'data-need', d.needs.shift());
          }
          body.querySelectorAll('[data-need]').forEach((x) => {
            const on = d.needs.includes(x.dataset.need);
            x.classList.toggle('on', on);
            x.setAttribute('aria-pressed', String(on));
          });
          MJ.Audio.chime(0);
          refresh();
        })
      );
    }
    const single = (attr, set) =>
      body.querySelectorAll('[' + attr + ']').forEach((b) =>
        b.addEventListener('click', () => {
          set(b.getAttribute(attr));
          body.querySelectorAll('[' + attr + ']').forEach((x) => {
            x.classList.toggle('on', x === b);
            x.setAttribute('aria-checked', String(x === b));
          });
        })
      );
    if (d.turn === 'kind') {
      single('data-hard', (v) => (d.hard = v));
      body.querySelectorAll('[data-kw]').forEach((b) =>
        b.addEventListener('click', () => {
          text.value = b.dataset.kw + (text.value ? '。' + text.value : '');
          refresh();
        })
      );
    }
    if (d.turn === 'step') {
      body.querySelectorAll('[data-idea]').forEach((b) =>
        b.addEventListener('click', () => {
          text.value = b.dataset.idea;
          refresh();
        })
      );
      single('data-when', (v) => (d.when = v));
    }
    refresh();
  };

  /** 讓它待著：看三道浪升起、到頂、落下（系統示範的浪：單色的線＋很淡的填色） */
  function surf() {
    const canvas = $('rSurf');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 144;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    const ink = getComputedStyle(canvas).color;
    const wash = ink.replace(/^rgba?\(([^,]+),([^,]+),([^,)]+).*$/, 'rgba($1,$2,$3,0.08)');
    const WAVE = 8;
    const t0 = performance.now();
    let lastWave = -1;
    let lastPhase = '';
    const loop = (now) => {
      const t = (now - t0) / 1000;
      const wave = Math.floor(t / WAVE);
      const p = (t % WAVE) / WAVE;
      // 一道浪：升起（0–0.45）、到頂（0.45–0.55）、落下（0.55–1）；減少動態效果時畫一道靜止的浪，只換圖說
      const env = U.reducedMotion ? 1 : p < 0.45 ? U.easeInOut(p / 0.45) : p < 0.55 ? 1 : 1 - U.easeInOut((p - 0.55) / 0.45);
      const size = (0.35 + ((d.i0 || 0) / 10) * 0.65) * (wave >= 2 ? 0.8 : 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const base = h * 0.82;
      const peak = base - env * h * 0.62 * size;
      const crest = w * 0.5;
      const ripple = U.reducedMotion ? 0 : t * 1.3;
      const yAt = (x) => {
        const dx = (x - crest) / (w * 0.26);
        return base - (base - peak) * Math.exp(-dx * dx) + Math.sin(x * 0.05 + ripple) * 2;
      };
      ctx.fillStyle = wash;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 3) ctx.lineTo(x, yAt(x));
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        if (x === 0) ctx.moveTo(x, yAt(x));
        else ctx.lineTo(x, yAt(x));
      }
      ctx.stroke();
      // 浪頂一個實心點（不發光）
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(crest, yAt(crest) - 8, 3, 0, U.TAU);
      ctx.fill();

      const phase = p < 0.45 ? '升起' : p < 0.55 ? '到頂' : '落下';
      if (phase !== lastPhase) {
        lastPhase = phase;
        const el = $('rSurfTxt');
        if (el) el.textContent = phase;
        if (phase === '到頂') MJ.Audio.bell(MJ.Audio.degMidi(9), 0.08, 0, 0, null, 3);
      }
      if (wave !== lastWave) {
        lastWave = wave;
        d.waves = Math.max(d.waves || 1, wave);
        const c = $('rSurfCount');
        if (c) c.innerHTML = '第 ' + num(wave + 1) + ' 道浪';
        if (wave >= 1) {
          const b = $('rNext');
          if (b) b.disabled = false;
          setStatus('');
        }
      }
      anim = requestAnimationFrame(loop);
    };
    anim = requestAnimationFrame(loop);
  }

  /* ---------- 4. 現在呢 ---------- */
  VIEW.again = (body) => {
    const pos = F.isPositive(d.fam);
    const i1 = d.i1 == null ? d.i0 : d.i1;
    d.i1 = i1;
    body.innerHTML =
      '<h2 class="r-title" id="ritualTitle" tabindex="-1">現在大概在哪裡？</h2>' +
      '<p class="r-sub">剛才：' + (pos ? '亮' : '浪') + ' ' + (d.i0 == null ? '未量' : num(d.i0)) + '</p>' +
      meterHTML('rI1', i1, { label: pos ? '有多亮？' : '浪有多大？', before: d.i0, big: true });
    $('ritualFoot').innerHTML = footRow('', '<button class="btn-2" id="rBack">上一步</button><button class="btn" id="rFinish">交給海</button>');
    bindMeter('rI1', (v) => (d.i1 = v));
    $('rBack').addEventListener('click', () => R.show('do'));
    $('rFinish').addEventListener('click', () => R.finish());
    waveLoop($('rWave'), () => d.i1);
  };

  /* ---------- 完成：變成生物 ---------- */
  R.finish = () => {
    const draft = d;
    R.close();
    Game.commitEntry(draft);
  };

  MJ.Ritual = R;
})((window.MJ = window.MJ || {}));
