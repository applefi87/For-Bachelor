/*
 * 海月水母館 — 心情的資料：感覺的家族、細緻的字、轉折（陪伴方式）、需要、角度
 *
 * 設計依據（只當作骨架，不拿來說教）：
 * - 情緒環狀模型（Russell）：每種感覺有「舒服—不舒服」與「平靜—激動」兩個座標。
 * - 情緒標記（affect labeling）與情緒顆粒度：把感覺說得越精準，越不容易被它淹沒。
 * - 情緒調節的彈性（Bonanno）：沒有唯一正確的陪法，能依情況換著用才是重點。
 *   所以每一種轉折都是一條正當的路，只是會長出不一樣的生物。
 * - 各種轉折分別對應：接納與觀浪（ACT、urge surfing）、著陸（grounding）、認知重評與自我拉開距離、
 *   情緒背後的需要（EFT、非暴力溝通）、自我慈悲（Neff）、行為活化、宣洩、
 *   品味（savoring）、感恩、正向記憶的保存與回想。
 * - 強度很高的時候，換角度想（重評）比較難做到，先把注意力拉回身體、讓浪過去比較容易
 *   （Sheppes & Gross）；所以陪法的排列順序會跟著強度變，但每一種都選得到。
 * - 反覆只用「倒出來」陪同一種感覺，研究上不一定會讓它變小（Bushman 2002），
 *   所以只會輕輕提一句，不會擋。
 */
(function (MJ) {
  'use strict';

  const F = {};

  /** 感覺的家族：v = 舒服程度（-1..1），a = 激動程度（-1..1） */
  F.FAMILIES = {
    anger: { name: '生氣', hue: 4, sat: 0.72, v: -0.82, a: 0.55, words: ['煩躁', '生氣', '委屈', '不公平', '被冒犯', '受夠了'] },
    anx: { name: '不安', hue: 276, sat: 0.6, v: -0.3, a: 0.85, words: ['緊張', '擔心', '慌', '害怕', '壓力大', '心神不寧'] },
    shame: { name: '自責', hue: 318, sat: 0.5, v: -0.5, a: 0.05, words: ['自責', '丟臉', '愧疚', '不夠好', '後悔', '懷疑自己'] },
    sad: { name: '難過', hue: 208, sat: 0.62, v: -0.88, a: -0.36, words: ['難過', '失落', '失望', '想哭', '心痛', '遺憾'] },
    lonely: { name: '孤單', hue: 236, sat: 0.45, v: -0.26, a: -0.44, words: ['孤單', '被忽略', '想念', '格格不入', '沒人懂', '疏遠'] },
    tired: { name: '疲憊', hue: 205, sat: 0.18, v: -0.62, a: -0.88, words: ['累', '空空的', '麻木', '提不起勁', '無力', '厭倦'] },
    calm: { name: '平靜', hue: 162, sat: 0.55, v: 0.6, a: -0.6, words: ['平靜', '放鬆', '安心', '自在', '踏實', '滿足'] },
    joy: { name: '喜悅', hue: 46, sat: 0.85, v: 0.7, a: 0.65, words: ['開心', '興奮', '期待', '有成就感', '驕傲', '好笑'] },
    warm: { name: '溫暖', hue: 20, sat: 0.75, v: 0.72, a: 0.02, words: ['感謝', '被愛', '感動', '溫暖', '被理解', '幸運'] },
    fog: { name: '說不上來', hue: 200, sat: 0.12, v: 0, a: 0, words: ['說不上來', '亂', '悶', '複雜', '很滿', '怪怪的'] },
  };
  F.FAMILY_IDS = Object.keys(F.FAMILIES);
  F.isPositive = (fam) => F.FAMILIES[fam] && F.FAMILIES[fam].v > 0;

  F.familyOf = (word) => {
    for (const id of F.FAMILY_IDS) if (F.FAMILIES[id].words.includes(word)) return id;
    return null;
  };

  /**
   * 轉折：你想怎麼陪這份感覺。每一種都會把「幼生」變成不同的生物。
   * side: neg 用在不舒服的感覺、pos 用在舒服的感覺、any 兩邊都可以。
   */
  F.TURNS = {
    allow: {
      name: '讓它待著', sub: '不用改變它，陪它一下', side: 'any', hue: 222, species: 'jelly',
      desc: '看著浪升起、到頂、落下。不去推開它。',
    },
    ground: {
      name: '先著陸', sub: '先回到身體和這個地方', side: 'neg', hue: 300, species: 'seahorse',
      desc: '看見五樣、聽見四種、摸到三種……',
    },
    reframe: {
      name: '換個殼看看', sub: '用另一個角度看同一件事', side: 'neg', hue: 30, species: 'crab',
      desc: '選一個角度，寫一句話。',
    },
    need: {
      name: '聽聽它要什麼', sub: '這個感覺在替你在乎什麼', side: 'neg', hue: 268, species: 'lantern',
      desc: '感覺常常是一個提醒。',
    },
    kind: {
      name: '對自己溫柔', sub: '用對朋友的方式對自己', side: 'neg', hue: 340, species: 'clown',
      desc: '三句話，對自己說。',
    },
    step: {
      name: '一件小事', sub: '現在做得到、最小的一步', side: 'neg', hue: 100, species: 'turtle',
      desc: '小到不太可能失敗的那種。',
    },
    release: {
      name: '先倒出來就好', sub: '不用整理，交給海', side: 'neg', hue: 186, species: 'tears',
      desc: '有時候說出來就夠了。',
    },
    savor: {
      name: '細細品嚐', sub: '把這個瞬間多留一下', side: 'pos', hue: 48, species: 'coral',
      desc: '那個時候，你看到、聽到、感覺到什麼？',
    },
    thank: {
      name: '謝謝誰', sub: '這份好，是從哪裡來的', side: 'pos', hue: 12, species: 'coral',
      desc: '一個人、一件事、或一個巧合。',
    },
    keep: {
      name: '留給以後', sub: '寫給某個不好的日子的自己', side: 'pos', hue: 160, species: 'bottle',
      desc: '它會裝進瓶子，漂在海面上。',
    },
  };
  F.TURN_IDS = Object.keys(F.TURNS);

  /** 陪法的排列：跟著強度變。浪很大時，先穩住的放前面；浪小的時候，想一想的放前面 */
  F.TURN_ORDER = {
    high: ['ground', 'allow', 'release', 'kind', 'step', 'need', 'reframe'],
    mid: ['allow', 'reframe', 'need', 'kind', 'step', 'ground', 'release'],
    low: ['reframe', 'need', 'step', 'kind', 'allow', 'ground', 'release'],
    pos: ['savor', 'thank', 'keep', 'allow'],
  };
  F.band = (i0) => (i0 == null ? 'mid' : i0 >= 8 ? 'high' : i0 <= 4 ? 'low' : 'mid');
  F.orderTurns = (fams, i0) => {
    const avail = F.turnsFor(fams);
    const neg = F.TURN_ORDER[F.band(i0)];
    const order = F.isPositive(fams[0]) ? F.TURN_ORDER.pos.concat(neg) : neg.concat(F.TURN_ORDER.pos);
    const out = [];
    for (const id of order.concat(avail)) if (avail.includes(id) && !out.includes(id)) out.push(id);
    return out;
  };
  /**
   * 「這種時候常用」：只標一個，依感覺的家族、強度、最近是不是一直來。
   * recentSame = 最近兩週同一個家族出現的次數（不含這一次）
   */
  F.recommend = (fam, i0, recentSame) => {
    if (F.isPositive(fam)) return { joy: 'savor', warm: 'thank', calm: 'savor' }[fam] || 'savor';
    if (i0 != null && i0 >= 8) return 'ground';
    if (recentSame >= 3) return 'need';
    if (fam === 'anx') return i0 != null && i0 >= 6 ? 'ground' : 'reframe';
    return { shame: 'kind', tired: 'step', sad: 'step', lonely: 'step', anger: 'need', fog: 'allow' }[fam] || 'allow';
  };
  F.turnsFor = (fams) => {
    const hasPos = fams.some(F.isPositive);
    const hasNeg = fams.some((f) => !F.isPositive(f));
    return F.TURN_IDS.filter((id) => {
      const s = F.TURNS[id].side;
      return s === 'any' || (s === 'neg' && hasNeg) || (s === 'pos' && hasPos);
    });
  };

  /** 換殼：每一種角度就是一種殼 */
  F.LENSES = {
    friend: { name: '朋友之殼', shell: 'moon', ask: '如果是好朋友遇到這件事，你會跟他說什麼？' },
    future: { name: '一年後之殼', shell: 'spire', ask: '一年後的你回頭看這件事，會怎麼說？' },
    other: { name: '另一邊之殼', shell: 'conch', ask: '對方那時候，可能正在經歷什麼？' },
    small: { name: '還好之殼', shell: 'cowrie', ask: '這件事裡，有沒有哪一小部分其實還可以？' },
    wonder: { name: '好奇之殼', shell: 'nautilus', ask: '如果先不急著下結論，還有哪些可能？' },
  };
  F.LENS_IDS = Object.keys(F.LENSES);

  /** 感覺背後常見的需要 */
  F.NEEDS = {
    rest: { name: '休息', hue: 200 },
    safety: { name: '安全感', hue: 140 },
    understood: { name: '被理解', hue: 214 },
    respect: { name: '被尊重', hue: 36 },
    fair: { name: '公平', hue: 8 },
    connect: { name: '連結', hue: 336 },
    freedom: { name: '自由', hue: 180 },
    valued: { name: '被肯定', hue: 50 },
    certainty: { name: '確定感', hue: 262 },
    meaning: { name: '意義', hue: 58 },
    selfcare: { name: '照顧自己', hue: 96 },
  };
  F.NEED_IDS = Object.keys(F.NEEDS);

  /** 海問的一個問題：只問，不回答 */
  F.NEED_QUESTIONS = {
    rest: '今天有沒有一段時間，可以不用對任何人負責？',
    safety: '現在，身邊有什麼是穩的？',
    understood: '有沒有一個人，你願意讓他知道這件事？',
    respect: '你希望別人怎麼對待你？',
    fair: '如果事情公平了，會有什麼不一樣？',
    connect: '最近一次覺得被接住，是什麼時候？',
    freedom: '有沒有什麼，是你其實可以說不的？',
    valued: '這陣子，有哪件事你其實做得不錯？',
    certainty: '在不確定裡，哪一件事是確定的？',
    meaning: '這件事讓你這麼在意，是因為你重視什麼？',
    selfcare: '身體現在需要什麼？',
  };
  F.TURN_QUESTIONS = {
    allow: ['它現在在身體的哪裡？', '如果它有顏色，會是什麼顏色？', '它比剛才輕一點，還是重一點？'],
    ground: ['現在，腳底是什麼感覺？', '剛才注意到的東西裡，哪一樣最讓你意外？'],
    reframe: ['還有沒有第三種看法？', '這個殼，你之後還想再背嗎？'],
    kind: ['這句話，今天可以再對自己說一次嗎？', '你最近一次這樣對自己說話，是什麼時候？'],
    release: ['現在的肩膀，是什麼感覺？', '呼吸有沒有比剛才長一點？'],
    savor: ['明天，想留意什麼樣的小事？', '這個瞬間，有什麼聲音？'],
    thank: ['他知道你這麼想嗎？', '這份好，你也曾經給過誰嗎？'],
    keep: ['下次打開這個瓶子的你，會在哪裡呢？'],
    step: ['做完之後，想怎麼犒賞自己？'],
  };

  /** 先著陸：5-4-3-2-1 */
  F.GROUND = [
    ['看見', 5, '五樣看得見的東西'],
    ['聽見', 4, '四種聲音，遠的近的都算'],
    ['摸到', 3, '三種觸感：衣服、椅子、地板'],
    ['聞到', 2, '兩種味道，聞不到就深呼吸'],
    ['嚐到', 1, '嘴裡的一種味道'],
  ];

  /** 對自己溫柔：三句 */
  F.KIND_HARD = ['難受', '辛苦', '不容易', '累', '痛', '委屈'];
  F.KIND_WORDS = ['你已經很努力了', '慢慢來也沒關係', '你可以休息', '會這樣很正常', '我在這裡陪你', '不完美也可以', '先照顧好自己就好'];

  /** 一件小事的建議 */
  F.STEP_IDEAS = {
    anger: ['離開現場走一小段', '寫下想說但不寄出的話', '喝一杯冰水', '用力握拳再慢慢放開'],
    anx: ['把擔心的事寫成三點', '只做五分鐘第一步', '把腳踩穩，感覺地板', '傳訊息給一個人'],
    shame: ['寫下一件今天做到的事', '洗個熱水澡', '跟信任的人說一句', '把這件事和「我是誰」分開寫'],
    sad: ['喝一杯溫的東西', '聽一首喜歡的歌', '抱一下抱枕', '今天早點睡'],
    lonely: ['傳訊息給一個人', '去有人的地方坐一下', '打電話給家人', '跟店員說聲謝謝'],
    tired: ['躺下十分鐘', '喝一杯水', '關掉通知半小時', '只做一件最小的事'],
    fog: ['喝一杯水', '出去走五分鐘', '把現在的想法寫成三行', '洗把臉'],
    any: ['喝一杯水', '出去走五分鐘', '整理桌面一小塊', '伸個懶腰'],
  };
  F.STEP_WHEN = {
    now: { name: '現在', delay: 30 * 60 * 1000 },
    later: { name: '今天晚點', delay: 3 * 3600 * 1000 },
    tomorrow: { name: '明天', delay: 0 },
  };

  F.POUR_PLACEHOLDERS = [
    '發生了什麼事？寫多寫少都可以。',
    '亂七八糟也沒關係，這裡只有你和海。',
    '可以只寫一個詞。',
    '不想寫也可以，直接下一步。',
  ];

  /**
   * 真的撐不住的時候：在文字裡看到這些字，就先停下來給資源。
   * 關鍵字比對一定會漏也會誤報（例如「他去死」），但誤報的代價遠小於漏報。
   * 這份清單沒有經過自殺防治專業審閱，之後應該請專業機構看過。
   */
  const CRISIS = [
    '自殺', '想死', '不想活', '活不下去', '結束生命', '傷害自己', '傷害我自己', '自殘', '割腕', '割自己', '輕生', '去死',
    '消失就好', '想消失', '不想存在', '不想醒來', '不想再醒來', '撐不下去', '活著好累', '死了算了', '不如死', '了結',
    '跳下去', '燒炭', '吞藥', '安眠藥', '遺書', '想結束一切',
  ];
  F.isCrisis = (text) => {
    if (!text) return false;
    return CRISIS.some((w) => text.includes(w));
  };
  /**
   * 專線（最後查證：2026 年 9 月）。1925、1995、113 是 24 小時；
   * 張老師 1980 有服務時段、不是 24 小時（各地時段不同，所以只寫「不是 24 小時」），排在最後。
   */
  F.HOTLINES = [
    ['安心專線', '1925', '24 小時・免付費'],
    ['生命線', '1995', '24 小時'],
    ['保護專線', '113', '24 小時・家暴、性侵害、兒少'],
    ['張老師', '1980', '有服務時段，不是 24 小時'],
  ];
  /**
   * 危機畫面：全站唯一不套美術風格的「安全元件」。號碼是整列可以直接撥打的連結。
   * mode = 'text'：文字裡出現了自傷的字；'menu'：使用者自己打開。
   */
  F.careHTML = (mode) => {
    const phone = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.8h2.6l1.4 4-1.9 1.3a11.5 11.5 0 0 0 6.2 6.2l1.3-1.9 4 1.4v2.6a1.9 1.9 0 0 1-2.1 1.9A15.6 15.6 0 0 1 4.7 5.9a1.9 1.9 0 0 1 1.9-2.1z"/></svg>';
    let html = '<div class="care">';
    if (mode === 'text') {
      html += '<h2 class="care-title">先停一下</h2><p class="care-text">你寫的話裡，有想傷害自己的意思。如果是這樣，現在打給一個真的人，不用想好要說什麼。</p>';
    } else {
      html += '<h2 class="care-title">需要找人說話的時候</h2><p class="care-text">這些電話都有真的人接。不用想好要說什麼。</p>';
    }
    html += '<p class="care-small">這裡沒有人在看，也不會通知任何人。</p><ul class="care-lines">';
    for (const [name, num, note] of F.HOTLINES) {
      html += '<li><a class="care-line" href="tel:' + num + '"><span class="care-name">' + name + '<small>' + note + '</small></span><span class="care-num">' + phone + '<b>' + num + '</b><em>撥打</em></span></a></li>';
    }
    html += '</ul><p class="care-urgent">有立即的危險：<a href="tel:119">119</a> 或 <a href="tel:110">110</a></p><p class="care-desk">用電腦的話，可以拿手機撥這些號碼。</p></div>';
    return html;
  };

  /** 轉折的圖示（24×24 線條） */
  F.ICONS = {
    allow: '<path d="M3 14c2.5-4 5-4 7.5 0s5 4 7.5 0 2.5-3 3-3"/><path d="M3 18.5c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0"/>',
    reframe: '<path d="M12 19.5a7.5 7.5 0 1 1 7.5-7.5c0 3.2-2.6 5.2-5.3 5.2S9.7 15.1 9.7 12.6s1.8-3.7 3.4-3.7 2.7 1.2 2.7 2.8"/>',
    need: '<path d="M9 4.5h6M10 4.5v2.2M14 4.5v2.2"/><path d="M8 9.2A2.5 2.5 0 0 1 10.5 6.7h3A2.5 2.5 0 0 1 16 9.2v6.3a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3z"/><path d="M12 10.5v4.5M10.5 12.5h3"/>',
    kind: '<path d="M12 19s-6.5-4-6.5-8.6A3.6 3.6 0 0 1 12 8.2a3.6 3.6 0 0 1 6.5 2.2C18.5 15 12 19 12 19z"/><path d="M3.5 13.5c1 3 3.2 5.5 6 6.5M20.5 13.5c-1 3-3.2 5.5-6 6.5"/>',
    step: '<path d="M8.5 5c1.5 0 2.3 1.7 2 4-.3 2-1.3 3.2-2.5 3.2S6.2 11 6.3 9c.1-2.4.8-4 2.2-4z"/><path d="M7 14.5c.8 0 1.5.8 1.3 2.2-.1 1-.8 1.8-1.5 1.8s-1.3-.9-1.2-2c.1-1.2.6-2 1.4-2z"/><path d="M15.5 8c1.4 0 2.2 1.6 2 3.8-.3 2-1.3 3-2.4 3s-1.9-1.2-1.8-3.2c.1-2.3.8-3.6 2.2-3.6z"/><path d="M16.8 17c.8 0 1.4.8 1.3 2-.1 1-.7 1.7-1.4 1.7s-1.3-.8-1.2-1.9c.1-1.1.6-1.8 1.3-1.8z"/>',
    release: '<path d="M12 3.5s-4.5 5.2-4.5 8.5a4.5 4.5 0 0 0 9 0c0-3.3-4.5-8.5-4.5-8.5z"/><path d="M5 18.5c1.5 1.3 3 1.3 4.5 0M14.5 18.5c1.5 1.3 3 1.3 4.5 0"/>',
    savor: '<path d="M12 3.8l1.7 5 5 1.7-5 1.7-1.7 5-1.7-5-5-1.7 5-1.7z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    thank: '<path d="M4.5 12.5l3-2.5 3 1.3h3.2a1.3 1.3 0 0 1 0 2.6H11"/><path d="M4.5 18.5l2.3-1.6h5.4l5.6-4a1.4 1.4 0 0 0-1.6-2.2L13.7 12"/><path d="M15.5 4.5a2 2 0 0 1 3 0 2 2 0 0 1 3 2.6L18.5 10l-3-2.9a2 2 0 0 1 0-2.6z"/>',
    keep: '<path d="M10 3.5h4M10.5 3.5v3.3L8 10.2A4 4 0 0 0 7.2 12.6V18a2.5 2.5 0 0 0 2.5 2.5h4.6a2.5 2.5 0 0 0 2.5-2.5v-5.4a4 4 0 0 0-.8-2.4l-2.5-3.4V3.5"/><path d="M9.5 14h5M9.5 16.8h3.5"/>',
    larva: '<ellipse cx="12" cy="12" rx="4.5" ry="3.3"/><path d="M5 12H3.5M20.5 12H19M12 6.5V5M12 19v-1.5M7.3 7.3l-1-1M17.7 7.3l1-1M7.3 16.7l-1 1M17.7 16.7l1 1"/>',
    tides: '<path d="M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
    ground: '<path d="M13.5 4.5c-1.9 0-3.3 1.4-3.3 3.1 0 1 .5 1.9 1.2 2.4-2.1 1-3.4 3.1-3.4 5.4 0 2.6 2 4.4 4.4 4.4 1.6 0 2.8-1.1 2.8-2.5s-1-2.2-2.1-2.2-1.6.8-1.6 1.4"/><path d="M13.5 4.5l4.5 1.6-3.6 1.3"/><circle cx="12.9" cy="6.6" r=".6"/><path d="M8.2 12.5c-1.2.2-2 .9-2.4 1.8M8 15.5c-1 .4-1.6 1.1-1.8 2"/>',
    heartsea: '<path d="M12 18.5s-6.5-4-6.5-8.6A3.6 3.6 0 0 1 12 7.7a3.6 3.6 0 0 1 6.5 2.2c0 4.6-6.5 8.6-6.5 8.6z"/><path d="M8.5 12.2c1.2-1 2.3-1 3.5 0s2.3 1 3.5 0"/>',
  };

  /** 每一種生物：怎麼來的、真實的牠、和誰有關 */
  F.SPECIES = {
    larva: {
      name: '心情幼生', from: '還沒決定怎麼陪的感覺',
      fact: '很多海洋生物小時候都是漂在水裡的幼生，長大後會變成完全不一樣的樣子。',
      link: '點一下牠，就能決定牠要長成什麼。一週都沒動的話，牠會自己化成藍眼淚。',
    },
    jelly: {
      name: '海月水母', from: '讓它待著',
      fact: '水母不逆流而游，牠們跟著洋流，也去了很遠的地方。',
      link: '會吃藍眼淚；吃得越多，傘越亮。',
    },
    crab: {
      name: '寄居蟹', from: '換個殼看看',
      fact: '寄居蟹會排隊換殼：大的換進新殼，舊殼留給小一號的。科學家叫它「空缺鏈」。',
      link: '海龜帶回來的殼、或你放下的空殼，會引起一連串的換殼。有礁石洞的話，受驚時會躲進去。',
    },
    lantern: {
      name: '燈籠魚', from: '聽聽它要什麼',
      fact: '燈籠魚晚上游到淺海、白天回到深處，這是地球上規模最大的遷徙之一。',
      link: '說出同一種需要的燈籠魚會游成一群。白天，有礁石洞就待在它的陰影裡；晚上，會繞著月光石。',
    },
    clown: {
      name: '小丑魚與海葵', from: '對自己溫柔',
      fact: '海葵的觸手有刺，小丑魚身上的黏液讓牠能住在裡面；小丑魚也會替海葵趕走天敵。',
      link: '你寫給自己的溫柔話是海葵，被它保護的感覺是小丑魚。',
    },
    turtle: {
      name: '海龜', from: '一件小事',
      fact: '母海龜會靠著地磁，回到自己出生的沙灘。',
      link: '小事做到了，海龜就會出發旅行，回來時帶著一個殼送給寄居蟹。',
    },
    seahorse: {
      name: '海馬', from: '先著陸',
      fact: '海馬游得很慢，會用尾巴捲住海草，讓自己在水流裡穩穩的。牠們也是少數由爸爸懷孕的動物。',
      link: '每隻海馬都捲著一根海草。有了海草床，牠們會聚在一起，捲在同一片海草裡。',
    },
    tears: {
      name: '藍眼淚', from: '先倒出來就好',
      fact: '馬祖的藍眼淚，是夜光藻這類浮游生物被擾動時發出的藍光。',
      link: '是水母和珊瑚的食物。手指劃過去，它會亮。',
    },
    coral: {
      name: '珊瑚與雀鯛', from: '細細品嚐、謝謝誰',
      fact: '珊瑚蟲和體內的共生藻互相依靠；光鰓雀鯛一受到驚嚇，就會躲進珊瑚枝裡。',
      link: '每一個好的瞬間都會長出一截珊瑚。珊瑚礁夠大，雀鯛就會搬進來。',
    },
    bottle: {
      name: '瓶中信', from: '留給以後',
      fact: '有些漂流瓶在海上漂了幾十年，才被人撿到。',
      link: '在你很難受的時候，海可能會把其中一瓶送回來。',
    },
    oyster: {
      name: '珍珠貝', from: '同一種感覺來了很多次',
      fact: '有東西跑進貝殼裡，珍珠貝會一層一層分泌珍珠質把它包起來。',
      link: '同一種感覺每來一次，就多一層，顏色是你那次選的陪法。七層以上、用過三種陪法，才會結成一顆珍珠。',
    },
    octopus: {
      name: '章魚', from: '用過很多種陪法',
      fact: '章魚有三顆心臟，皮膚上的色素細胞能在一眨眼之間變色。',
      link: '一個月內用過四種以上的陪法，牠就會出現。牠身上的顏色，是你用過的每一種。',
    },
  };
  F.SPECIES_IDS = Object.keys(F.SPECIES);

  MJ.Feelings = F;
})((window.MJ = window.MJ || {}));
