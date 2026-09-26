/* 海月水母館 — 海上的牌子：陪完之後的結果、點生物、出生、撈到、小事的追問、導言牌，以及生物的抽屜 */
(function (MJ) {
  'use strict';

  const UI = MJ.UI;
  const RENDER = UI.RENDER;
  const { U, Gn, F, esc, $, dateStr, traitChips, turnChip, KIND_SPECIES, hhmm, dur, latinOf, isNamed } = UI.h;
  let Game = null;
  UI.onInit((g) => (Game = g));

  /* ---------- 共用 ---------- */

  /** 這筆心情是第幾筆：和紙上的紀錄卡用同一個號碼（UI.entryNo 在 ui-paper.js）；沒有時退回 e.no 或累計次數 */
  const entryNo = (e, fresh) => {
    if (!e) return null;
    if (UI.entryNo) {
      const n = UI.entryNo(e);
      if (n != null && n !== '') return n;
    }
    if (e.no != null) return e.no;
    if (fresh && !e.resumed && Game.state.stats && Game.state.stats.rituals) return Game.state.stats.rituals;
    return null;
  };

  const wordsOf = (e) => (e && e.words && e.words.length ? e.words.join('　') : '');
  const fromRow = (e) => ['來自', '「' + e.words.map(esc).join('」「') + '」'];
  const dateRow = (e) => ['日期', '<span class="num">' + dateStr(e.t) + '</span>'];
  const turnRow = (e) => (e.turn && F.TURNS[e.turn] ? ['陪法', F.TURNS[e.turn].name] : null);

  /** 指示線的目標：優先用 Game.targetOf；珊瑚這種沒有位置的，退回它所在的珊瑚礁 */
  const targetFor = (thing) => {
    if (!thing || !Game.targetOf) return null;
    if (thing.kind === 'coral' && thing.reef && typeof thing.anchor !== 'function') return Game.targetOf(thing.reef);
    return Game.targetOf(thing);
  };

  const onlyBody = (id) => {
    const q = F.TURN_QUESTIONS[id];
    return q && q[0] ? q[0] : '';
  };

  /* ================= 陪完心情的結果（DESIGN.md §7.5） ================= */

  /** 生物長出來約 1.4 秒後（game.js 延遲）亮起，細線指向牠。牌上不寫「+光」。 */
  UI.ritualResult = (e, c) => {
    const t = e.turn;
    const crisis = !!e.crisis;
    let sp = 'larva';
    let line = '變成了一隻心情幼生';
    let rows = [];
    const notes = [];
    const said = (s) => (crisis ? '一件小事' : '<span class="hand">' + esc(s) + '</span>');
    if (t === 'allow') {
      sp = 'jelly';
      line = '長成了一隻海月水母';
      rows.push(['狀態', '隨水流漂']);
      if (c && c.genes && c.genes.special === 'moonlight') rows.push(['體質', '月光']);
    } else if (t === 'ground') {
      sp = 'seahorse';
      line = '長成了一隻海馬';
      rows.push(['捲著', '一根海草']);
    } else if (t === 'reframe') {
      sp = 'crab';
      line = '長成了一隻寄居蟹';
      rows.push(['背著', esc((F.LENSES[e.lens] || F.LENSES.friend).name)]);
    } else if (t === 'need') {
      sp = 'lantern';
      line = '長成了一條燈籠魚';
      const names = (e.needs || []).map((n) => F.NEEDS[n].name);
      const school = Game.eco.schools[(e.needs || [])[0]];
      if (names.length) rows.push(['群', '「' + names.map(esc).join('」「') + '」' + (school && school.count >= 2 ? '，共 <span class="num">' + school.count + '</span> 條' : '')]);
    } else if (t === 'kind') {
      sp = 'clown';
      line = '長成了一條小丑魚';
      rows.push(['住在', '你寫的那句話（海葵）']);
    } else if (t === 'step') {
      sp = 'turtle';
      line = '長成了一隻海龜';
      rows.push(['背著', said(e.step ? e.step.what : '一件小事')]);
      notes.push('做到後點牠：出發旅行');
    } else if (t === 'release') {
      sp = 'tears';
      line = '散成了藍眼淚';
      if (e.jellyAte) rows.push(['吃掉它的', '「' + esc(e.jellyAte) + '」']);
      notes.push('手指劃過水面：會亮');
    } else if (t === 'savor') {
      sp = 'coral';
      line = '長成了一截珊瑚';
      rows.push(['長在', '珊瑚礁']);
    } else if (t === 'thank') {
      sp = 'coral';
      line = '長成了一顆腦珊瑚';
      rows.push(['長在', '珊瑚礁底部']);
    } else if (t === 'keep') {
      sp = 'bottle';
      line = '裝進了一個瓶子';
      rows.push(['漂在', '海面']);
      notes.push('點瓶子：可讀');
    } else {
      rows.push(['狀態', '還沒選陪法']);
      notes.push('點牠：選陪法');
    }
    rows = rows.slice(0, 2);

    // 浪永遠寫「前 → 後」；舒服的感覺用「亮」；沒量就不寫這一列
    if (t && e.i0 != null) {
      const a = e.i0;
      const b = e.i1 == null ? a : e.i1;
      const pos = F.isPositive(e.fam);
      rows.push([pos ? '亮' : '浪', '<span class="num">' + a + ' → ' + b + '</span>']);
      if (!pos && b > a) notes.push('一靠近，浪常會先變大。');
    }

    // 海的問題：浪 ≥8 時只問身體的問題，或不問；危機後整段安靜
    let q = '';
    const high = Math.max(e.i0 == null ? 0 : e.i0, e.i1 == null ? 0 : e.i1) >= 8;
    if (!crisis && t) {
      if (high) q = { ground: onlyBody('ground'), release: onlyBody('release'), allow: onlyBody('allow') }[t] || '';
      else if (t === 'need' && e.needs && e.needs.length) q = F.NEED_QUESTIONS[e.needs[0]];
      else if (F.TURN_QUESTIONS[t]) q = U.pick(F.TURN_QUESTIONS[t]);
    }

    // 光還是會加（HUD 上看得到），但不寫在這張牌上：記下心情不該像在換錢
    delete e._gift;
    // 文字裡出現過自傷的字，或很強的難過、疲憊、孤單、自責：底下放一行專線，不跳出、不打斷
    const strong = (e.i0 != null && e.i0 >= 9) || (e.i1 != null && e.i1 >= 9);
    const care = crisis || (strong && ['sad', 'tired', 'lonely', 'shame'].includes(e.fam));

    let target = c ? targetFor(c) : null;
    if (!target && (t === 'savor' || t === 'thank')) {
      const reef = Game.eco.reefs.find((r) => r.items.some((it) => it.entry === e));
      if (reef) target = Game.targetOf(reef);
    }

    return UI.label(
      Object.assign(
        {
          target,
          no: entryNo(e, true),
          time: hhmm(e.t),
          status: '新居民',
          words: wordsOf(e) || F.SPECIES[sp].name,
          line,
          rows,
          note: notes,
          question: q,
          care: care ? '<p class="res-care"><a href="tel:1925">專線 1925　24 小時　免付費</a></p>' : '',
          actions: [{ label: '收起', id: 'ok' }],
        },
        latinOf(sp)
      )
    );
  };

  /* ================= 點生物：短牌＋「詳細 →」 ================= */

  UI.openCreature = (c) => {
    if (!c) return;
    const kind = c.kind;
    const spId = KIND_SPECIES[kind] || 'larva';
    const sp = F.SPECIES[spId] || {};
    const e = c.entry || (c.item && c.item.entry) || null;
    const detail = { label: '詳細 →', onClick: () => UI.openSheet('creature', c) };
    const o = Object.assign({ target: targetFor(c), no: entryNo(e), words: sp.name, rows: [], actions: [detail] }, latinOf(kind));
    const add = (r) => r && o.rows.length < 4 && o.rows.push(r);

    if (kind === 'larva') {
      o.words = '心情幼生';
      o.status = '還在漂';
      add(fromRow(e));
      add(dateRow(e));
      o.note = '還沒選陪法。7 天沒選，會化成藍眼淚。';
      o.actions = [
        {
          label: '選陪法',
          onClick: () => MJ.Ritual.start({ resume: e }),
        },
        detail,
      ];
    } else if (kind === 'crab') {
      const sh = c.shell;
      add(['背著', sh && sh.gift ? '海龜帶回來的殼' : esc((F.LENSES[e.lens] || F.LENSES.friend).name)]);
      add(fromRow(e));
      add(dateRow(e));
    } else if (kind === 'shell') {
      o.words = '空殼';
      delete o.latin;
      o.no = null;
      o.note = c.shell && c.shell.gift ? '海龜帶回來的殼。' : '寄居蟹換下來的殼。';
      add(['等', '長大的寄居蟹搬進去']);
      o.actions = [];
    } else if (kind === 'lantern') {
      const n = F.NEEDS[c.need];
      const school = Game.eco.schools[c.need];
      if (n) add(['需要', '「' + esc(n.name) + '」']);
      add(['群', '<span class="num">' + (school ? school.count : 1) + '</span> 條']);
      if (e) add(fromRow(e));
      if (n && F.NEED_QUESTIONS[c.need]) o.question = F.NEED_QUESTIONS[c.need];
    } else if (kind === 'clown') {
      o.words = '小丑魚';
      add(fromRow(e));
      add(turnRow(e));
      add(dateRow(e));
    } else if (kind === 'anemone') {
      o.words = '海葵';
      o.no = null;
      add(['句子', '<span class="num">' + (c.entries ? c.entries.length : 0) + '</span> 句']);
      add(['住著', '小丑魚']);
    } else if (kind === 'turtle') {
      const st = e.step || {};
      o.status = c.journey > 0 ? '旅行中' : st.status === 'done' ? '做到了' : '';
      add(['背著', e.crisis ? '一件小事' : '<span class="hand">' + esc(st.what || '一件小事') + '</span>']);
      add(fromRow(e));
      add(dateRow(e));
      if (st.status === 'pending') {
        o.note = '牠會在沙灘上等。';
        o.actions = [{ label: '做到了', onClick: () => Game.setStep(e.id, 'done') }, detail];
      }
    } else if (kind === 'seahorse') {
      add(['捲著', Game.eco.bedX() != null ? '海草床' : '一根海草']);
      add(fromRow(e));
      add(dateRow(e));
    } else if (kind === 'coral') {
      o.words = e && e.turn === 'thank' ? '腦珊瑚' : '珊瑚枝';
      add(fromRow(e));
      add(turnRow(e));
      add(dateRow(e));
    } else if (kind === 'oyster') {
      const fam = F.FAMILIES[c.fam];
      o.words = '珍珠貝';
      o.no = null;
      add(['感覺', UI.h.famChip(c.fam)]);
      add(['層', '<span class="num">' + c.layers.length + '</span> 層']);
      add(['陪法', '<span class="num">' + new Set(c.layers).size + '</span> 種']);
      if (c.pearls) add(['珍珠', '<span class="num">' + c.pearls + '</span> 顆']);
      if (!fam) o.rows.shift();
    } else if (kind === 'octopus') {
      o.no = null;
      add(['陪法', (c.turns || []).map((t) => (F.TURNS[t] ? F.TURNS[t].name : '')).filter(Boolean).join('　')]);
      o.note = '這個月用過的陪法。';
    } else if (kind === 'bottle') {
      o.words = '瓶中信';
      add(['寫於', '<span class="num">' + dateStr(e.t) + '</span>']);
      add(fromRow(e));
    }
    if (!o.actions.length) o.actions = [{ label: '收起' }];
    return UI.label(o);
  };

  /* ================= 生物的抽屜（暗色；那一筆心情是一張紙） ================= */

  RENDER.creature = (body, c) => {
    const kind = c.kind;
    const spId = KIND_SPECIES[kind] || 'larva';
    const sp = F.SPECIES[spId];
    const lat = latinOf(kind);
    let title = sp.name;
    let html = '';
    const facts = [];
    const actions = [];
    const record = (e) => (e ? '<h3 class="sub-h">這一筆心情</h3>' + UI.entryCard(e) : '');
    // 你寫的字：手寫體；有危機字眼的文字永遠不重現
    const said = (e, label) => (e && e.text && !e.crisis ? '<div class="cr-said"><p class="label">' + esc(label) + '</p><p class="hand">' + esc(e.text) + '</p></div>' : '');
    const kv = () => (facts.length ? '<dl class="kv">' + facts.map((r) => '<div><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>').join('') + '</dl>' : '');

    if (kind === 'larva') {
      title = '心情幼生';
      facts.push(['狀態', '還沒選陪法']);
      html += kv() + '<p class="cr-p">7 天沒選，會化成藍眼淚。</p>' + record(c.entry);
      actions.push('<button class="btn" data-act="resume">選陪法</button>');
    } else if (kind === 'crab') {
      const e = c.entry;
      const lens = F.LENSES[e.lens] || F.LENSES.friend;
      const sh = c.shell;
      facts.push(['背著', sh && sh.gift ? '海龜帶回來的殼' : esc(lens.name)]);
      if (sh && sh.id !== e.id) facts.push(['換過殼', '是']);
      html += kv() + record(e) + said(e, lens.ask);
    } else if (kind === 'shell') {
      title = '空殼';
      html += '<p class="cr-p">' + (c.shell.gift ? '海龜旅行回來時帶的殼。' : '寄居蟹換下來的殼。') + '長大的寄居蟹會搬進去。</p>';
    } else if (kind === 'lantern') {
      const n = F.NEEDS[c.need];
      const school = Game.eco.schools[c.need];
      title = '燈籠魚　' + n.name;
      facts.push(['需要', '「' + esc(n.name) + '」']);
      facts.push(['群', '<span class="num">' + (school ? school.count : 1) + '</span> 條']);
      html += kv() + record(c.entry) + said(c.entry, '被照顧到一點點，會是');
      html += '<p class="lb-q">' + esc(F.NEED_QUESTIONS[c.need]) + '</p>';
    } else if (kind === 'clown') {
      title = '小丑魚';
      html += record(c.entry) + said(c.entry, '你對自己說');
    } else if (kind === 'anemone') {
      title = '海葵';
      html += '<p class="cr-p">你寫給自己的話長成海葵；住在裡面的小丑魚，是被它保護的感覺。</p>';
      for (const e of c.entries) html += said(e, dateStr(e.t) + '　「' + e.words[0] + '」');
    } else if (kind === 'turtle') {
      const e = c.entry;
      const st = e.step;
      title = '海龜';
      facts.push(['背上的小事', e.crisis ? '一件小事' : '<span class="hand">' + esc(st.what) + '</span>']);
      facts.push(['狀態', st.status === 'done' ? '做到了　<span class="num">' + UI.h.timeStr(st.doneAt) + '</span>' : st.status === 'dropped' ? '已劃掉' : '想在「' + F.STEP_WHEN[st.when].name + '」做']);
      html += kv();
      if (st.status === 'pending') {
        html += '<p class="cr-p">牠會在沙灘上等。</p>';
        actions.push('<button class="btn-2" data-act="done">做到了</button>');
        actions.push('<button class="btn-2" data-act="drop">不需要了</button>');
      }
      html += record(e);
    } else if (kind === 'seahorse') {
      title = '海馬';
      facts.push(['捲著', Game.eco.bedX() != null ? '海草床，和其他海馬一起' : '一根海草']);
      html += kv() + record(c.entry);
    } else if (kind === 'coral') {
      const e = c.item.entry;
      title = e.turn === 'thank' ? '腦珊瑚' : '珊瑚枝';
      html += record(e) + said(e, e.turn === 'thank' ? '你想謝謝' : '那個瞬間');
    } else if (kind === 'oyster') {
      const fam = F.FAMILIES[c.fam];
      title = '「' + fam.name + '」的珍珠貝';
      html += '<p class="cr-p">同一種感覺每來一次加一層，顏色是那次的陪法。</p>';
      facts.push(['層', '<span class="num">' + c.layers.length + '</span> 層']);
      facts.push(['陪法', '<span class="num">' + new Set(c.layers).size + '</span> 種']);
      facts.push(['珍珠', c.pearls ? '<span class="num">' + c.pearls + '</span> 顆' : '還沒結成']);
      html += '<div class="cr-pearl"><canvas id="pearlCv" width="120" height="120" aria-label="珍珠的樣子"></canvas>' + kv() + '</div>';
      html += '<h3 class="sub-h">由裡到外</h3><ol class="cr-list">' + c.layers.map((t) => '<li>' + turnChip(t) + '</li>').join('') + '</ol>';
    } else if (kind === 'octopus') {
      html += '<h3 class="sub-h">這個月用過的陪法</h3><ul class="cr-list">' + c.turns.map((t) => '<li>' + turnChip(t) + '</li>').join('') + '</ul>';
      html += '<p class="cr-p">點牠：每一種顏色閃一遍。</p>';
    } else if (kind === 'bottle') {
      title = '瓶中信';
      const e = c.entry;
      html += said(e, '寫於 ' + dateStr(e.t) + '　寫給以後的自己') || '<p class="cr-p">寫於 ' + dateStr(e.t) + '</p>';
    }
    if (lat.latin) html = '<p class="cr-latin"><span class="latin' + (lat.latinUp ? ' up' : '') + '" lang="la">' + esc(lat.latin) + '</span></p>' + html;
    html += '<h3 class="sub-h">實際生態</h3><p class="cr-p">' + esc(sp.fact) + '</p><h3 class="sub-h">在這座館裡</h3><p class="cr-p">' + esc(sp.link) + '</p>';
    if (actions.length) html += '<div class="btn-row">' + actions.join('') + '</div>';
    body.innerHTML = html;

    if (kind === 'oyster' && UI.drawPearl) UI.drawPearl($('pearlCv'), c.layers, 120);
    body.querySelectorAll('[data-act]').forEach((b) =>
      b.addEventListener('click', () => {
        const a = b.dataset.act;
        if (a === 'resume') {
          UI.closeSheet();
          MJ.Ritual.start({ resume: c.entry });
        } else if (a === 'done') {
          UI.closeSheet();
          Game.setStep(c.entry.id, 'done');
        } else if (a === 'drop') {
          UI.closeSheet();
          Game.setStep(c.entry.id, 'dropped');
        }
      })
    );
    return title;
  };

  /* ================= 之前想做的小事，後來呢？ ================= */

  /** 說明牌指向那隻海龜；三個答案同一個樣子（不暗示期待你做到） */
  UI.stepAsk = (e) => {
    const tt = Game.eco.turtles.find((x) => x.entry === e);
    UI.label({
      target: tt ? targetFor(tt) : null,
      wait: true,
      status: '之前的小事',
      words: e.crisis ? '一件小事' : e.step.what,
      hand: !e.crisis,
      question: '後來呢？',
      actions: [
        { label: '做到了', id: 'done', onClick: () => Game.setStep(e.id, 'done') },
        { label: '還沒', id: 'later', onClick: () => Game.setStep(e.id, 'later') },
        { label: '不需要了', id: 'dropped', onClick: () => Game.setStep(e.id, 'dropped') },
      ],
    });
  };

  /* ================= 導言牌：第一次來、歡迎回來 ================= */

  UI.welcomeModal = () => {
    const n = Game.tankJellies ? Game.tankJellies().length : Game.jellies.length;
    const p = Game.polyps.length;
    UI.showModal(
      (card, close) => {
        card.innerHTML =
          '<h2 class="m-title" id="mTitle">參觀須知</h2>' +
          '<p class="m-text">館內有水母 <span class="num">' + n + '</span> 隻' + (p ? '、水螅體 <span class="num">' + p + '</span> 個' : '') + '，由你照顧。</p>' +
          '<dl class="kv guide-how"><div><dt>點水面</dt><dd>餵食</dd></div><div><dt>按住水母滑動</dt><dd>摸摸</dd></div><div><dt>點水母</dt><dd>看名片</dd></div><div><dt>「心情」</dt><dd>替感覺取名字，長成生物</dd></div></dl>' +
          '<div class="btn-row"><button class="btn-2" data-w="feel">記下感覺</button><button class="btn-2 push" data-w="ok">好</button></div>';
        card.setAttribute('aria-labelledby', 'mTitle');
        card.querySelector('[data-w="ok"]').addEventListener('click', () => close());
        card.querySelector('[data-w="feel"]').addEventListener('click', () => {
          close();
          setTimeout(() => MJ.Ritual.start(), 200);
        });
      },
      { cls: 'guide', place: 'base' }
    );
  };

  /** 回來的時候：離開時發生的事、該問的小事、今天的信、本週紀錄，合成一張導言牌 */
  UI.welcomeBack = (o) => {
    let after = null;
    UI.showModal(
      (card, close) => {
        const off = o.offline;
        let html = '';
        // 標題就是事實：離開多久；沒有的話，用第一件要說的事當標題
        const title = off ? '你不在的 ' + dur(off.sec) : o.steps.length ? '之前的小事' : o.letter ? '今天的信，未拆' : '本週紀錄';
        html += '<h2 class="m-title" id="mTitle">' + title + '</h2>';
        if (off) {
          const rows = [];
          if (off.gain > 0) rows.push(['光', '<span class="num">+' + U.fmt(off.gain) + '</span>']);
          if (off.born.length) rows.push(['出生', off.born.map((j) => '「' + esc(j.name) + '」').join('')]);
          if (off.grown) rows.push(['成年', '<span class="num">' + off.grown + '</span> 隻']);
          if (rows.length) html += '<dl class="kv">' + rows.map((r) => '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>').join('') + '</dl>';
        }
        if (o.steps.length) {
          html += '<div class="wb-steps">' + (off ? '<h3 class="sub-h">之前的小事：</h3>' : '');
          for (const e of o.steps) {
            html +=
              '<div class="wb-step" data-id="' + e.id + '"><p class="hand">' + esc(e.crisis ? '一件小事' : e.step.what) + '</p><span class="wb-btns">' +
              '<button class="btn-2" data-s="done">做到了</button><button class="btn-2" data-s="later">還沒</button><button class="btn-2" data-s="dropped">不需要了</button></span></div>';
          }
          html += '</div>';
        }
        html += '<div class="btn-row">';
        if (o.letter) html += '<button class="btn-2" data-w="letter">拆信 →</button>';
        if (o.recap) html += '<button class="btn-2" data-w="recap">本週紀錄 →</button>';
        html += '<button class="btn-3" data-w="feel">記下感覺</button>';
        html += '<button class="btn-2 push" data-w="ok">好</button></div>';
        card.innerHTML = html;
        card.setAttribute('aria-labelledby', 'mTitle');
        const said = { done: '海龜出發了。', later: '留著。', dropped: '已劃掉。' };
        card.querySelectorAll('.wb-step').forEach((row) =>
          row.querySelectorAll('[data-s]').forEach((b) =>
            b.addEventListener('click', () => {
              const st = b.dataset.s;
              row.querySelector('.wb-btns').innerHTML = '<small>' + said[st] + '</small>';
              Game.setStep(row.dataset.id, st, true);
            })
          )
        );
        card.querySelectorAll('[data-w]').forEach((b) =>
          b.addEventListener('click', () => {
            const w = b.dataset.w;
            if (w === 'letter') after = () => UI.letterModal();
            else if (w === 'recap') after = () => UI.recapModal();
            else if (w === 'feel') after = () => MJ.Ritual.start();
            close();
          })
        );
      },
      { cls: 'guide', onClose: () => after && setTimeout(after, 60) }
    );
  };

  /* ================= 出生、撈到：說明牌指向那隻水母 ================= */

  const jellyRows = (j, found) => {
    const d = Gn.describe(j.genes);
    const rows = [['特徵', '<span class="chips">' + traitChips(j.genes) + '</span>']];
    return { d, rows, found: found && found.length ? '<span class="lb-status on">新</span>　' + found.map((k) => esc(Game.codexName(k))).join('、') : '' };
  };

  UI.birthModal = (j, found) => {
    const { rows, found: f } = jellyRows(j, found);
    if (j.parents) rows.push(['父母', esc(j.parents.join(' × '))]);
    if (f) rows.push(['圖鑑', f]);
    UI.label(Object.assign({
      target: Game.targetOf(j),
      wait: true,
      no: j.no,
      status: '新生',
      words: j.name,
      hand: isNamed(j),
      line: '海月水母',
      rows,
      note: '碟狀幼體',
      actions: [
        {
          label: '取別的名字',
          id: 'rename',
          onClick: () =>
            setTimeout(async () => {
              const name = await UI.prompt({ title: '替牠取名字', value: j.name, max: 12 });
              if (!name) return;
              Game.rename(j.id, name);
              // 你取的名字：之後在名片、說明牌上用手寫體（和 ui-sheets.js 的改名一樣記下來）
              const flags = Game.state.flags;
              flags.named = flags.named || {};
              flags.named[j.id] = 1;
              j.named = true;
            }, 200),
        },
        { label: '收起', id: 'ok' },
      ],
    }, latinOf('jelly')));
  };

  UI.catchModal = (j, found) => {
    const { d, rows, found: f } = jellyRows(j, found);
    rows.push(['稀有度', esc(d.rarity) + '　' + UI.h.starsHTML(d.stars)]);
    if (f) rows.push(['圖鑑', f]);
    UI.label(Object.assign({
      target: Game.targetOf(j),
      no: j.no,
      status: '新居民',
      words: j.name,
      line: '海月水母',
      rows,
      note: j.adult ? '已成年' : '還沒成年',
      actions: [{ label: '收起', id: 'ok' }],
    }, latinOf('jelly')));
  };

})((window.MJ = window.MJ || {}));
