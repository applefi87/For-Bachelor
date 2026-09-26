/* 海月水母館 — 生物的說明：生物名片、陪完之後的結果、小事的追問 */
(function (MJ) {
  'use strict';

  const UI = MJ.UI;
  const RENDER = UI.RENDER;
  const { U, Gn, C, A, F, esc, icon, $, noteName, dateStr, starsHTML, colorCss, portraitImg, traitChips, timeStr, famChip, turnChip, SPECIES_ICON, SPECIES_HUE, KIND_SPECIES } = UI.h;
  let Game = null;
  UI.onInit((g) => (Game = g));

  UI.openCreature = (c) => UI.openSheet('creature', c);

  RENDER.creature = (body, c) => {
    const kind = c.kind;
    const spId = KIND_SPECIES[kind] || 'larva';
    const sp = F.SPECIES[spId];
    let title = sp.name;
    let html = '';
    const quote = (text, label) => (text ? '<blockquote class="said"><span>' + label + '</span>' + esc(text) + '</blockquote>' : '');
    const actions = [];
    if (kind === 'larva') {
      title = '心情幼生';
      html += '<p class="lede">還沒決定怎麼陪的感覺。牠會在海裡漂一陣子，等你想好。</p>' + UI.entryCard(c.entry);
      actions.push('<button class="btn wide" data-act="resume">現在決定怎麼陪它</button>');
    } else if (kind === 'crab') {
      const e = c.entry;
      const lens = F.LENSES[e.lens] || F.LENSES.friend;
      const sh = c.shell;
      html += '<p class="lede">背著「' + (sh && sh.gift ? '海龜帶回來的殼' : lens.name) + '」。' + (sh && sh.id !== e.id ? '牠已經換過殼了。' : '') + '</p>';
      html += UI.entryCard(e) + quote(e.text, lens.ask);
    } else if (kind === 'shell') {
      title = '空著的殼';
      html += '<p class="lede">' + (c.shell.gift ? '海龜旅行回來時帶的殼。' : '某隻寄居蟹換下來的殼。') + '等哪隻寄居蟹長大了，就會搬進去。</p>';
    } else if (kind === 'lantern') {
      const n = F.NEEDS[c.need];
      const school = Game.eco.schools[c.need];
      title = '燈籠魚・' + n.name;
      html += '<p class="lede">這一群有 <b>' + (school ? school.count : 1) + '</b> 條燈籠魚，都在說「' + n.name + '」。</p>';
      html += UI.entryCard(c.entry) + quote(c.entry.text, '被照顧到一點點，會是：');
      html += '<p class="sea-q">' + esc(F.NEED_QUESTIONS[c.need]) + '</p>';
    } else if (kind === 'clown') {
      title = '小丑魚';
      html += UI.entryCard(c.entry) + quote(c.entry.text, '你對自己說');
    } else if (kind === 'anemone') {
      title = '海葵';
      html += '<p class="lede">你寫給自己的溫柔話，長成了這株海葵。住在裡面的小丑魚，是被它保護著的感覺。</p>';
      for (const e of c.entries) html += quote(e.text, dateStr(e.t) + '・「' + e.words[0] + '」的時候');
    } else if (kind === 'turtle') {
      const e = c.entry;
      const st = e.step;
      title = '海龜';
      html += UI.entryCard(e);
      html += '<div class="step-box"><span>背上的小事</span><b>' + esc(st.what) + '</b><small>' + (st.status === 'done' ? '做到了・' + timeStr(st.doneAt) : '想在「' + F.STEP_WHEN[st.when].name + '」做') + '</small></div>';
      if (st.status === 'pending') {
        actions.push('<button class="btn" data-act="done">做到了</button>');
        actions.push('<button class="btn ghost" data-act="drop">不需要了</button>');
        html += '<p class="note">還沒做也沒關係，牠會在沙灘上等。</p>';
      }
    } else if (kind === 'seahorse') {
      title = '海馬';
      html += '<p class="lede">牠用尾巴捲著一根海草' + (Game.eco.bedX() != null ? '，和其他海馬待在同一片海草床裡' : '') + '。</p>' + UI.entryCard(c.entry);
    } else if (kind === 'coral') {
      const e = c.item.entry;
      title = e.turn === 'thank' ? '腦珊瑚' : '珊瑚枝';
      html += UI.entryCard(e) + quote(e.text, e.turn === 'thank' ? '你想謝謝' : '那個瞬間');
    } else if (kind === 'oyster') {
      const fam = F.FAMILIES[c.fam];
      title = '「' + fam.name + '」的珍珠貝';
      const kinds = new Set(c.layers).size;
      html += '<p class="lede">「' + fam.name + '」來了很多次。每來一次，珍珠就多一層；那一層的顏色，是你那一次選的陪法。</p>';
      html += '<div class="pearl-row"><canvas class="pearl-cv" id="pearlCv" width="120" height="120" aria-label="珍珠的樣子"></canvas><div><b>' + c.layers.length + ' 層・' + kinds + ' 種陪法</b><small>' + (c.pearls ? '已經結成 ' + c.pearls + ' 顆' : '還沒結成珍珠') + '</small></div></div>';
      html += '<ol class="layers">' + c.layers.map((t) => '<li>' + turnChip(t) + '</li>').join('') + '</ol>';
    } else if (kind === 'octopus') {
      html += '<p class="lede">這個月，你用過這些方式陪自己的感覺：</p><div class="chips">' + c.turns.map((t) => turnChip(t)).join('') + '</div>';
      html += '<p class="note">點牠的時候，牠會把每一種顏色都閃一遍。</p>';
    } else if (kind === 'bottle') {
      title = '瓶中信';
      html += '<p class="lede">' + dateStr(c.entry.t) + '，你寫給以後的自己：</p><blockquote class="said big">' + esc(c.entry.text || '') + '</blockquote>';
    }
    html += '<div class="sp-note"><div><b>真實的牠</b><span>' + esc(sp.fact) + '</span></div><div><b>和誰有關</b><span>' + esc(sp.link) + '</span></div></div>';
    if (actions.length) html += '<div class="btn-row">' + actions.join('') + '</div>';
    body.innerHTML = html;

    if (kind === 'oyster') UI.drawPearl($('pearlCv'), c.layers, 120);
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

  /** 變身之後的那張小卡 */
  UI.ritualResult = (e, c) => {
    const w = e.words.map((x) => '「' + esc(x) + '」').join('');
    const t = e.turn;
    let head;
    let line;
    if (t === 'allow') {
      head = '變成了一隻小水母';
      line = '牠跟著水流，慢慢地漂。' + (c && c.genes && c.genes.special === 'moonlight' ? '牠的傘，帶著一點月光。' : '');
    } else if (t === 'ground') {
      head = '變成了一隻海馬';
      line = '牠用尾巴捲住一根海草，在水流裡待穩了。';
    } else if (t === 'reframe') {
      head = '變成了一隻寄居蟹';
      line = '牠背著「' + F.LENSES[e.lens].name + '」，在沙地上慢慢走。';
    } else if (t === 'need') {
      head = '變成了燈籠魚';
      const names = (e.needs || []).map((n) => F.NEEDS[n].name);
      const school = Game.eco.schools[(e.needs || [])[0]];
      line = '牠游進了「' + names.join('」和「') + '」那一群' + (school && school.count >= 2 ? '。這一群現在有 ' + school.count + ' 條了。' : '。');
    } else if (t === 'kind') {
      head = '變成了一條小丑魚';
      line = '牠住進了你寫給自己的那句話裡。';
    } else if (t === 'step') {
      head = '變成了一隻小海龜';
      line = '牠背上亮著「' + esc(e.step.what) + '」。做到了之後點牠，牠會出發去旅行。';
    } else if (t === 'release') {
      head = '散成了藍眼淚';
      line = (e.jellyAte ? '「' + esc(e.jellyAte) + '」吃掉了它。' : '') + '手指劃過水面，它們會亮。水母和珊瑚會慢慢把它們吃掉。';
    } else if (t === 'savor') {
      head = '長成了一截珊瑚';
      line = '那個瞬間，現在是珊瑚礁的一部分。';
    } else if (t === 'thank') {
      head = '長成了一顆腦珊瑚';
      line = '圓圓的，長在珊瑚礁底下。';
    } else if (t === 'keep') {
      head = '裝進了瓶子';
      line = '它漂在海面上。哪天需要，點它就能讀。';
    } else {
      head = '變成了一隻幼生';
      line = '牠先在海裡漂著。想好怎麼陪它，再點牠。';
    }
    let wave = '';
    if (t && e.i0 != null) {
      const a = e.i0;
      const b = e.i1 == null ? a : e.i1;
      if (F.isPositive(e.fam)) wave = b > a ? '這份感覺變亮了（' + a + ' → ' + b + '）。' : b === a ? '它還是這麼亮。' : '它淡了一點（' + a + ' → ' + b + '），也沒關係。';
      else wave = b < a ? '浪從 ' + a + ' 退到了 ' + b + '。' : b === a ? '浪還是 ' + a + '。你陪它待了一下。' : '浪變大了一點（' + a + ' → ' + b + '）。有時候一靠近它，它會先變大。';
    }
    let q = '';
    if (t === 'need' && e.needs && e.needs.length) q = F.NEED_QUESTIONS[e.needs[0]];
    else if (F.TURN_QUESTIONS[t]) q = U.pick(F.TURN_QUESTIONS[t]);
    const hue = t ? F.TURNS[t].hue : 200;
    // 光還是會加（HUD 上看得到），但不寫在這張牌上：記下心情不該像在換錢
    delete e._gift;
    // 文字裡出現過自傷的字，或很強的難過、疲憊、孤單、自責：底下放一行專線，不跳出、不打斷
    const care = e.crisis || (e.i0 != null && e.i0 >= 9 && ['sad', 'tired', 'lonely', 'shame'].includes(e.fam));
    UI.showModal(
      (card, close) => {
        card.innerHTML =
          '<div class="res-badge" style="--h:' + hue + '">' + icon(t || 'larva', 'i big') + '</div>' +
          '<p class="res-words">' + w + '</p><h2 class="m-title">' + head + '</h2><p class="m-text">' + line + '</p>' +
          (wave ? '<p class="res-wave">' + wave + '</p>' : '') +
          (q ? '<p class="sea-q">' + esc(q) + '</p>' : '') +
          (care ? '<p class="res-care"><a href="tel:1925">專線 1925（24 小時・免付費）</a></p>' : '') +
          '<div class="btn-row center">' + (c ? '<button class="btn ghost" data-r="look">看看牠</button>' : '') + '<button class="btn" data-r="ok">好</button></div>';
        card.querySelector('[data-r="ok"]').addEventListener('click', () => close());
        const look = card.querySelector('[data-r="look"]');
        if (look)
          look.addEventListener('click', () => {
            Game.highlight = { c, until: Game.t + 4 };
            close();
          });
      },
      { cls: 'result' }
    );
  };

  /** 之前想做的小事，後來呢？ */
  UI.stepAsk = (e) => {
    UI.showModal(
      (card, close) => {
        card.innerHTML =
          '<div class="res-badge" style="--h:' + F.TURNS.step.hue + '">' + icon('step', 'i big') + '</div>' +
          '<h2 class="m-title">之前想做的小事</h2><blockquote class="said big">' + esc(e.step.what) + '</blockquote>' +
          '<p class="m-text">後來呢？怎麼樣都可以。</p>' +
          '<div class="btn-row center"><button class="btn ghost" data-r="dropped">不需要了</button><button class="btn ghost" data-r="later">還沒，沒關係</button><button class="btn" data-r="done">做到了</button></div>';
        card.querySelectorAll('[data-r]').forEach((b) =>
          b.addEventListener('click', () => {
            close();
            Game.setStep(e.id, b.dataset.r);
          })
        );
      },
      { dismissible: true }
    );
  };

})((window.MJ = window.MJ || {}));
