/*
 * 海月水母館 — 心情的儀式
 *
 * 倒出來 → 取名字 → 怎麼陪它 → 現在呢
 * 情緒一來、想急著放上來的時候，最快兩三下就能完成；想慢慢來也可以。
 * 這裡只問問題、只給選項，不告訴你「應該」怎麼想。
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

  const R = { open: false };
  let Game;
  let d = null; // 這一次的草稿
  let anim = null;

  const icon = (n, cls) => MJ.UI.icon(n, cls);
  const famStyle = (f) => '--h:' + F.FAMILIES[f].hue + ';--s:' + Math.round(Math.max(0.3, F.FAMILIES[f].sat) * 100) + '%';

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
      R.show('turn');
    } else {
      d = { id: U.uid(), t: Date.now(), raw: '', keepRaw: false, words: [], fams: [], fam: null, i0: 5, needs: [], text: '' };
      R.show('pour');
    }
    const el = $('ritual');
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('open'));
    R.open = true;
    document.body.classList.add('ritual-open');
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

  R.show = (step, arg) => {
    stopAnim();
    d.step = step;
    const idx = stepIndex(step);
    $('ritualSteps').innerHTML = STEPS.map(
      ([id, name], i) => '<li class="' + (i < idx ? 'done' : i === idx ? 'on' : '') + '"' + (i === idx ? ' aria-current="step"' : '') + '><i></i><span>' + name + '</span></li>'
    ).join('');
    const body = $('ritualBody');
    body.scrollTop = 0;
    body.innerHTML = '';
    VIEW[step](body, arg);
    const f = body.querySelector('[data-focus]');
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 120);
    MJ.Audio.click();
  };

  const VIEW = {};

  /* ---------- 1. 倒出來 ---------- */
  VIEW.pour = (body) => {
    body.innerHTML =
      '<h2 class="r-title" id="ritualTitle">現在心裡有什麼？</h2>' +
      '<textarea id="rRaw" class="field" rows="5" maxlength="600" data-focus placeholder="' + esc(U.pick(F.POUR_PLACEHOLDERS)) + '" aria-label="現在心裡有什麼">' + esc(d.raw) + '</textarea>' +
      '<label class="check"><input type="checkbox" id="rKeepRaw"' + (d.keepRaw ? ' checked' : '') + '><i aria-hidden="true"></i><span>把這段文字留下來<small>不勾的話，結束時它會溶進海裡，不會被保存</small></span></label>' +
      '<div class="btn-row between"><button class="btn ghost" id="rSkip">不寫，直接選感覺</button><button class="btn" id="rNext">下一步</button></div>' +
      (d.resume ? '' : '<button class="link-btn" id="rQuick">' + icon('release', 'i') + '只想倒出來，不整理了</button>');
    const next = () => {
      d.raw = $('rRaw').value.trim();
      d.keepRaw = $('rKeepRaw').checked;
      if (F.isCrisis(d.raw)) R.show('care', 'name');
      else R.show('name');
    };
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
        if (F.isCrisis(d.raw)) R.show('care', 'finish');
        else R.finish();
      });
  };

  /* 真的撐不住的時候 */
  VIEW.care = (body, next) => {
    const back = next === 'again' ? 'do' : 'pour';
    body.innerHTML =
      '<h2 class="r-title">謝謝你願意寫出來</h2>' +
      '<p class="r-sub">如果你現在有傷害自己的念頭，請讓一個真的人陪你一下。打電話過去，不用準備好要說什麼。</p>' +
      '<ul class="hotlines">' +
      F.HOTLINES.map(([n, num, note]) => '<li><span>' + n + (note ? '<small>' + note + '</small>' : '') + '</span><b class="num">' + num + '</b></li>').join('') +
      '</ul>' +
      '<p class="r-note">你不用一個人撐著。如果有立即的危險，請撥 119 或 110。</p>' +
      '<div class="btn-row between"><button class="btn ghost" id="rCareBack">回去改一下</button><button class="btn" id="rCareGo">我知道了，繼續</button></div>';
    $('rCareBack').addEventListener('click', () => R.show(back));
    $('rCareGo').addEventListener('click', () => (next === 'finish' ? R.finish() : R.show(next || 'name')));
  };

  /* ---------- 2. 取名字 ---------- */
  VIEW.name = (body) => {
    let html = '<h2 class="r-title" id="ritualTitle">它比較像哪些字？</h2><p class="r-sub">選一到三個。越接近越好，不用完全準。</p>';
    // 最近用過的字放最上面，手機上不用一直往下找
    const recent = [];
    const past = Game.state.entries;
    for (let i = past.length - 1; i >= 0 && recent.length < 6; i--) {
      for (const w of past[i].words || []) if (recent.length < 6 && !recent.includes(w) && F.familyOf(w)) recent.push(w);
    }
    if (recent.length) {
      html += '<div class="recent-words"><span>最近用過</span><div class="words">';
      for (const w of recent) {
        const on = d.words.includes(w);
        html += '<button class="word' + (on ? ' on' : '') + '" style="' + famStyle(F.familyOf(w)) + '" data-word="' + esc(w) + '" aria-pressed="' + on + '">' + esc(w) + '</button>';
      }
      html += '</div></div>';
    }
    html += '<div class="fam-grid">';
    for (const id of F.FAMILY_IDS) {
      const fam = F.FAMILIES[id];
      html += '<div class="fam" style="' + famStyle(id) + '"><div class="fam-name"><i></i>' + fam.name + '</div><div class="words">';
      for (const w of fam.words) {
        const on = d.words.includes(w);
        html += '<button class="word' + (on ? ' on' : '') + '" data-word="' + esc(w) + '" aria-pressed="' + on + '">' + esc(w) + '</button>';
      }
      html += '</div></div>';
    }
    html += '</div>';
    html +=
      '<div class="intensity"><div class="i-head"><label for="rI0">有多強？</label><b id="rIVal">' + d.i0 + '</b></div>' +
      '<input type="range" id="rI0" min="0" max="10" step="1" value="' + d.i0 + '" aria-describedby="rIScale">' +
      '<div class="i-scale" id="rIScale"><span>一點點</span><span>快滿出來了</span></div>' +
      '<canvas class="wave" id="rWave" aria-hidden="true"></canvas></div>';
    html += '<div class="btn-row between"><button class="btn ghost" id="rBack">上一步</button><button class="btn" id="rNext"' + (d.words.length ? '' : ' disabled') + '>下一步</button></div>';
    body.innerHTML = html;

    body.querySelectorAll('[data-word]').forEach((b) =>
      b.addEventListener('click', () => {
        const w = b.dataset.word;
        const i = d.words.indexOf(w);
        if (i >= 0) d.words.splice(i, 1);
        else {
          d.words.push(w);
          if (d.words.length > 3) d.words.shift();
        }
        body.querySelectorAll('[data-word]').forEach((x) => {
          const on = d.words.includes(x.dataset.word);
          x.classList.toggle('on', on);
          x.setAttribute('aria-pressed', String(on));
        });
        $('rNext').disabled = !d.words.length;
        MJ.Audio.chime(0);
      })
    );
    if (d.i0 == null) d.i0 = 5;
    $('rI0').addEventListener('input', (e) => {
      d.i0 = +e.target.value;
      $('rIVal').textContent = d.i0;
    });
    $('rBack').addEventListener('click', () => R.show('pour'));
    $('rNext').addEventListener('click', () => {
      d.fams = [];
      for (const w of d.words) {
        const f = F.familyOf(w);
        if (f && !d.fams.includes(f)) d.fams.push(f);
      }
      d.fam = d.fams[0];
      R.show('turn');
    });
    waveLoop($('rWave'), () => d.i0, () => d.fam || F.familyOf(d.words[0]) || 'calm');
  };

  /** 小小的浪：高度跟著強度 */
  function waveLoop(canvas, getI, getFam) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 48;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    const t0 = performance.now();
    const loop = (now) => {
      const t = (now - t0) / 1000;
      const i = getI();
      const f = F.FAMILIES[getFam()] || F.FAMILIES.calm;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const amp = 2 + (i / 10) * (h * 0.38);
      for (let k = 0; k < 2; k++) {
        ctx.strokeStyle = U.hsla(f.hue, Math.max(0.3, f.sat), 0.7, k ? 0.3 : 0.85);
        ctx.lineWidth = k ? 1 : 1.8;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const y = h / 2 + Math.sin(x * 0.03 + t * (1.2 + i * 0.18) + k * 1.4) * amp * (k ? 0.6 : 1) + Math.sin(x * 0.071 - t * 0.9) * amp * 0.2;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
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
    let html = '<h2 class="r-title" id="ritualTitle">你想怎麼陪' + words + '？</h2><p class="r-sub">沒有哪一種比較對。不同的陪法，會讓它長成不一樣的生物。</p>';
    if (last3.length === 3 && last3.every((e) => e.turn === 'release') && turns.includes('release')) {
      html += '<p class="r-note soft">最近三次「' + esc(F.FAMILIES[d.fam].name) + '」，你都先把它倒出來。這次也可以；想的話，也能換一種，看看浪會不會不一樣。</p>';
    }
    html += '<div class="turns">';
    for (const id of turns) {
      const t = F.TURNS[id];
      const sp = F.SPECIES[t.species];
      const sub = id === 'reframe' && high ? '浪小一點的時候再換殼也可以' : t.sub;
      html +=
        '<button class="turn' + (id === rec ? ' rec' : '') + '" data-turn="' + id + '" style="--h:' + t.hue + '">' + icon(id, 'i turn-i') +
        '<span class="turn-main"><b>' + t.name + (id === rec ? '<em class="new">這種時候常用</em>' : '') + '</b><small>' + sub + '</small></span>' +
        '<span class="turn-sp">' + sp.name + '</span></button>';
    }
    html += '</div>';
    if (!d.resume) html += '<button class="link-btn" id="rLater">' + icon('larva', 'i') + '還不想決定，先讓它漂著</button>';
    html += '<div class="btn-row between"><button class="btn ghost" id="rBack">' + (d.resume ? '先不要' : '上一步') + '</button></div>';
    body.innerHTML = html;
    body.querySelectorAll('[data-turn]').forEach((b) =>
      b.addEventListener('click', () => {
        d.turn = b.dataset.turn;
        d.text = '';
        d.needs = [];
        d.lens = null;
        R.show('do');
      })
    );
    const later = $('rLater');
    if (later)
      later.addEventListener('click', () => {
        d.turn = null;
        R.finish();
      });
    $('rBack').addEventListener('click', () => (d.resume ? R.close() : R.show('name')));
  };

  /* ---------- 3b. 陪它的那一小段 ---------- */
  VIEW.do = (body) => {
    const t = F.TURNS[d.turn];
    const head = '<h2 class="r-title" id="ritualTitle" style="--h:' + t.hue + '">' + icon(d.turn, 'i title-i') + t.name + '</h2>';
    const nav = (label, disabled) =>
      '<div class="btn-row between"><button class="btn ghost" id="rBack">換一種</button><button class="btn" id="rNext"' + (disabled ? ' disabled' : '') + '>' + (label || '下一步') + '</button></div>';
    const word = esc(d.words[0] || '這個感覺');
    let html = head;

    if (d.turn === 'allow') {
      html +=
        '<p class="r-sub" id="rSurfTxt">看著這道浪就好，不用推開它。</p>' +
        '<canvas class="surf" id="rSurf" aria-label="一道會起伏的浪"></canvas>' +
        '<p class="r-note" id="rSurfCount">第 1 道浪</p>' + nav('好了', true);
    } else if (d.turn === 'ground') {
      html += '<p class="r-sub">先不用處理那個感覺。把注意力放回你所在的地方，每注意到一樣，就點一顆。</p><ol class="ground">';
      F.GROUND.forEach(([verb, n, hint], i) => {
        html += '<li data-row="' + i + '"><span class="g-lbl"><b>' + verb + '</b><small>' + hint + '</small></span><span class="g-dots">';
        for (let k = 0; k < n; k++) html += '<button class="g-dot" data-g="' + i + '" aria-label="' + verb + '第 ' + (k + 1) + ' 樣" aria-pressed="false"></button>';
        html += '</span></li>';
      });
      html += '</ol><p class="r-note" id="rGroundNote">前三行點完就可以往下，後面兩行想做再做。</p>' + nav('下一步', true);
    } else if (d.turn === 'reframe') {
      html += '<p class="r-sub">選一個殼背背看。同一件事，換個殼看起來會不太一樣。</p><div class="lenses">';
      for (const id of F.LENS_IDS) {
        const l = F.LENSES[id];
        html += '<button class="lens" data-lens="' + id + '" aria-pressed="false"><canvas width="56" height="56" data-shell="' + l.shell + '" aria-hidden="true"></canvas><span>' + l.name + '</span></button>';
      }
      html += '</div><p class="r-ask" id="rAsk">先選一個殼。</p><textarea id="rText" class="field" rows="3" maxlength="200" placeholder="寫一句就好" aria-label="換個角度寫一句" disabled></textarea>' + nav('下一步', true);
    } else if (d.turn === 'need') {
      html += '<p class="r-sub">「' + word + '」可能在替你在乎什麼？選一到兩個。</p><div class="chips needs">';
      for (const id of F.NEED_IDS) {
        const n = F.NEEDS[id];
        html += '<button class="chip-btn" data-need="' + id + '" style="--h:' + n.hue + '" aria-pressed="false"><i></i>' + n.name + '</button>';
      }
      html += '</div><p class="r-ask">如果這個需要被照顧到一點點，會是什麼樣子？</p><textarea id="rText" class="field" rows="2" maxlength="200" placeholder="可以不寫" aria-label="被照顧到的樣子"></textarea>' + nav('下一步', true);
    } else if (d.turn === 'kind') {
      html +=
        '<ol class="kind-steps">' +
        '<li><span>這真的很</span><div class="chips">' + F.KIND_HARD.map((w) => '<button class="chip-btn" data-hard="' + w + '" aria-pressed="false">' + w + '</button>').join('') + '</div></li>' +
        '<li><span>此刻也有很多人，正覺得「' + word + '」。會這樣的，不只你一個。</span></li>' +
        '<li><span>如果是對一個很重要的人，你會對他說：</span><textarea id="rText" class="field" rows="2" maxlength="200" placeholder="寫給自己" aria-label="對自己說的話"></textarea>' +
        '<div class="chips small">' + F.KIND_WORDS.map((w) => '<button class="chip-btn" data-kw="' + w + '">' + w + '</button>').join('') + '</div></li>' +
        '</ol>' + nav('下一步', true);
    } else if (d.turn === 'step') {
      const ideas = (F.STEP_IDEAS[d.fam] || []).concat(F.STEP_IDEAS.any).slice(0, 6);
      html +=
        '<p class="r-sub">現在做得到、最小的一步是什麼？小到不太可能失敗的那種。</p><div class="chips">' +
        ideas.map((w) => '<button class="chip-btn" data-idea="' + esc(w) + '">' + esc(w) + '</button>').join('') +
        '</div><input id="rText" class="field" maxlength="40" placeholder="自己寫也可以" aria-label="一件小事">' +
        '<p class="r-ask">什麼時候？</p><div class="seg" role="radiogroup" aria-label="什麼時候">' +
        Object.entries(F.STEP_WHEN).map(([k, v]) => '<button class="seg-btn' + (k === 'now' ? ' on' : '') + '" role="radio" aria-checked="' + (k === 'now') + '" data-when="' + k + '">' + v.name + '</button>').join('') +
        '</div>' + nav('下一步', true);
      d.when = 'now';
    } else if (d.turn === 'release') {
      html += '<p class="r-sub">不用整理，也不用想通。</p>';
      if (!d.raw) html += '<textarea id="rText" class="field" rows="4" maxlength="600" data-focus placeholder="想到什麼就寫什麼。寫完，它會被水母吃掉，散成藍眼淚。" aria-label="倒出來"></textarea>';
      else html += '<p class="r-quote">' + esc(d.raw.length > 80 ? d.raw.slice(0, 80) + '……' : d.raw) + '</p>';
      html += nav('下一步', false);
    } else if (d.turn === 'savor') {
      html += '<p class="r-sub">那個瞬間裡，你看到、聽到、或感覺到什麼？</p><textarea id="rText" class="field" rows="3" maxlength="200" data-focus placeholder="例如：風吹過來的時候，剛好聞到桂花" aria-label="那個瞬間"></textarea>' + nav('下一步', false);
    } else if (d.turn === 'thank') {
      html +=
        '<p class="r-sub">想謝謝誰、或什麼？</p><textarea id="rText" class="field" rows="3" maxlength="200" data-focus placeholder="一個人、一件事、或一個巧合" aria-label="想謝謝的"></textarea>' +
        '<label class="check"><input type="checkbox" id="rTell"><i aria-hidden="true"></i><span>等一下想跟他說<small>好消息說出來，常常會變得更亮</small></span></label>' + nav('下一步', false);
    } else if (d.turn === 'keep') {
      html += '<p class="r-sub">寫給以後某個不好的日子的你。它會裝進瓶子，漂在海面上。</p><textarea id="rText" class="field" rows="3" maxlength="200" data-focus placeholder="例如：記得今天，你笑到肚子痛" aria-label="寫給以後的自己"></textarea>' + nav('下一步', true);
    }
    body.innerHTML = html;

    const text = $('rText');
    const next = $('rNext');
    const refresh = () => {
      const v = text ? text.value.trim() : '';
      if (d.turn === 'reframe') next.disabled = !d.lens;
      else if (d.turn === 'need') next.disabled = !d.needs.length;
      else if (d.turn === 'kind') next.disabled = !v;
      else if (d.turn === 'step') next.disabled = !v;
      else if (d.turn === 'keep') next.disabled = !v;
    };
    if (text) text.addEventListener('input', refresh);
    $('rBack').addEventListener('click', () => R.show('turn'));
    next.addEventListener('click', () => {
      d.text = text ? text.value.trim() : '';
      if (d.turn === 'thank') d.tell = !!($('rTell') && $('rTell').checked);
      // 不只第一步：任何一個寫字的地方出現傷害自己的念頭，都先停下來
      if (F.isCrisis(d.text)) R.show('care', 'again');
      else R.show('again');
    });

    if (d.turn === 'allow') surf();
    if (d.turn === 'ground') {
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
          if (need) $('rGroundNote').textContent = [...rows].every((r) => r.classList.contains('done')) ? '腳踩著地板。你在這裡。' : '可以往下了。後面兩行想做再做。';
        })
      );
    }
    if (d.turn === 'reframe') {
      body.querySelectorAll('canvas[data-shell]').forEach((c) => {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        c.width = 56 * dpr;
        c.height = 56 * dpr;
        const g = c.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.translate(28, 30);
        g.scale(1.7, 1.7);
        MJ.Eco.drawShell(g, c.dataset.shell, 1, 1);
      });
      body.querySelectorAll('[data-lens]').forEach((b) =>
        b.addEventListener('click', () => {
          d.lens = b.dataset.lens;
          body.querySelectorAll('[data-lens]').forEach((x) => {
            x.classList.toggle('on', x === b);
            x.setAttribute('aria-pressed', String(x === b));
          });
          $('rAsk').textContent = F.LENSES[d.lens].ask;
          text.disabled = false;
          text.focus();
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
            if (d.needs.length > 2) d.needs.shift();
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
    if (d.turn === 'kind') {
      body.querySelectorAll('[data-hard]').forEach((b) =>
        b.addEventListener('click', () => {
          d.hard = b.dataset.hard;
          body.querySelectorAll('[data-hard]').forEach((x) => {
            x.classList.toggle('on', x === b);
            x.setAttribute('aria-pressed', String(x === b));
          });
        })
      );
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
      body.querySelectorAll('[data-when]').forEach((b) =>
        b.addEventListener('click', () => {
          d.when = b.dataset.when;
          body.querySelectorAll('[data-when]').forEach((x) => {
            x.classList.toggle('on', x === b);
            x.setAttribute('aria-checked', String(x === b));
          });
        })
      );
    }
    refresh();
  };

  /** 讓它待著：看三道浪升起、到頂、落下 */
  function surf() {
    const canvas = $('rSurf');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 150;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    const f = F.FAMILIES[d.fam] || F.FAMILIES.calm;
    const WAVE = 8;
    const t0 = performance.now();
    let lastWave = -1;
    let lastPhase = '';
    const loop = (now) => {
      const t = (now - t0) / 1000;
      const wave = Math.floor(t / WAVE);
      const p = (t % WAVE) / WAVE;
      // 一道浪：升起（0–0.45）、到頂（0.45–0.55）、落下（0.55–1）
      const env = p < 0.45 ? U.easeInOut(p / 0.45) : p < 0.55 ? 1 : 1 - U.easeInOut((p - 0.55) / 0.45);
      const size = (0.35 + (d.i0 / 10) * 0.65) * (wave >= 2 ? 0.8 : 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const base = h * 0.82;
      const peak = base - env * h * 0.62 * size;
      const crest = w * 0.5;
      const yAt = (x) => {
        const dx = (x - crest) / (w * 0.26);
        return base - (base - peak) * Math.exp(-dx * dx) + Math.sin(x * 0.05 + t * 1.3) * 2;
      };
      const g = ctx.createLinearGradient(0, peak, 0, h);
      g.addColorStop(0, U.hsla(f.hue, Math.max(0.3, f.sat), 0.62, 0.55));
      g.addColorStop(1, U.hsla(f.hue, Math.max(0.3, f.sat), 0.4, 0.05));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 3) ctx.lineTo(x, yAt(x));
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = U.hsla(f.hue, 0.4, 0.88, 0.9);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        if (x === 0) ctx.moveTo(x, yAt(x));
        else ctx.lineTo(x, yAt(x));
      }
      ctx.stroke();
      // 浪頭上的那顆光
      const oy = yAt(crest) - 10;
      ctx.globalCompositeOperation = 'lighter';
      U.drawGlow(ctx, crest, oy, 60, f.hue, Math.max(0.3, f.sat), 0.65, 0.9);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255,250,240,0.95)';
      ctx.beginPath();
      ctx.arc(crest, oy, 5, 0, U.TAU);
      ctx.fill();

      const phase = p < 0.45 ? '升起來了……' : p < 0.55 ? '到頂了。' : '慢慢落下……';
      if (phase !== lastPhase) {
        lastPhase = phase;
        const el = $('rSurfTxt');
        if (el) el.textContent = phase;
        if (phase === '到頂了。') MJ.Audio.bell(MJ.Audio.degMidi(9), 0.08, 0, 0, null, 3);
      }
      if (wave !== lastWave) {
        lastWave = wave;
        const c = $('rSurfCount');
        if (c) c.textContent = wave < 3 ? '第 ' + (wave + 1) + ' 道浪' : '它還在的話，也沒關係。';
        if (wave >= 1) {
          const b = $('rNext');
          if (b) b.disabled = false;
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
    body.innerHTML =
      '<h2 class="r-title" id="ritualTitle">現在呢？</h2>' +
      '<p class="r-sub">' + (pos ? '剛才這份感覺是 ' + d.i0 + '。現在它有多亮？' : '剛才是 ' + d.i0 + '。現在它有多強？') + '</p>' +
      '<div class="intensity"><div class="i-head"><label for="rI1">' + (pos ? '有多亮？' : '有多強？') + '</label><b id="rIVal">' + i1 + '</b></div>' +
      '<input type="range" id="rI1" min="0" max="10" step="1" value="' + i1 + '">' +
      '<div class="i-scale"><span>一點點</span><span>快滿出來了</span></div>' +
      '<canvas class="wave" id="rWave" aria-hidden="true"></canvas></div>' +
      '<p class="r-note">沒有變也沒關係。這只是讓你看看它現在的樣子。</p>' +
      '<div class="btn-row between"><button class="btn ghost" id="rBack">上一步</button><button class="btn big" id="rFinish">交給海</button></div>';
    d.i1 = i1;
    $('rI1').addEventListener('input', (e) => {
      d.i1 = +e.target.value;
      $('rIVal').textContent = d.i1;
    });
    $('rBack').addEventListener('click', () => R.show('do'));
    $('rFinish').addEventListener('click', () => R.finish());
    waveLoop($('rWave'), () => d.i1, () => d.fam || 'calm');
  };

  /* ---------- 完成：變成生物 ---------- */
  R.finish = () => {
    const draft = d;
    R.close();
    Game.commitEntry(draft);
  };

  MJ.Ritual = R;
})((window.MJ = window.MJ || {}));
