/* 海月水母館 — 基因、稀有度、繁殖配方 */
(function (MJ) {
  'use strict';

  const U = MJ.U;
  const G = {};

  /* ---------- 顏色 ---------- */
  G.COLORS = [
    { id: 'crimson', name: '緋紅', hue: 0, from: 352, to: 10, desc: '像深海裡的一小盞燈籠。' },
    { id: 'coral', name: '珊瑚', hue: 18, from: 10, to: 28, desc: '暖暖的，像傍晚的海面。' },
    { id: 'amber', name: '琥珀', hue: 36, from: 28, to: 46, desc: '被封在時間裡的光。' },
    { id: 'gold', name: '金盞', hue: 55, from: 46, to: 66, desc: '金色的光，在水裡特別溫柔。' },
    { id: 'lime', name: '若草', hue: 88, from: 66, to: 110, desc: '春天剛冒出來的顏色。' },
    { id: 'jade', name: '翡翠', hue: 135, from: 110, to: 158, desc: '像被月光照到的海草。' },
    { id: 'lake', name: '湖水', hue: 172, from: 158, to: 186, desc: '裝著一整座湖的安靜。' },
    { id: 'sky', name: '天青', hue: 198, from: 186, to: 212, desc: '雨過天晴的那一塊天空。' },
    { id: 'lapis', name: '琉璃', hue: 226, from: 212, to: 242, desc: '最接近夜晚的藍。' },
    { id: 'wisteria', name: '紫藤', hue: 258, from: 242, to: 274, desc: '帶著一點點想念的紫。' },
    { id: 'bellflower', name: '桔梗', hue: 290, from: 274, to: 308, desc: '不說話也很好看的顏色。' },
    { id: 'sakura', name: '櫻粉', hue: 328, from: 308, to: 352, desc: '軟軟的，像剛睡醒的臉頰。' },
    { id: 'moonwhite', name: '月白', hue: 200, pale: true, desc: '幾乎透明，像月光本身。' },
  ];
  const COLOR_BY_ID = {};
  G.COLORS.forEach((c) => (COLOR_BY_ID[c.id] = c));

  G.colorOf = (g) => {
    if (g.sat < 0.3) return COLOR_BY_ID.moonwhite;
    const h = U.wrapHue(g.hue);
    for (const c of G.COLORS) {
      if (c.pale) continue;
      if (c.from > c.to) {
        if (h >= c.from || h < c.to) return c;
      } else if (h >= c.from && h < c.to) return c;
    }
    return COLOR_BY_ID.crimson;
  };

  /* ---------- 傘的形狀 ---------- */
  // k1：傘側控制點寬度，k2：傘側控制點高度，k3：頂部圓潤度，h：高寬比，scallop：傘緣花邊數
  G.SHAPES = {
    dome: { name: '圓頂', h: 0.62, k1: 1.0, k2: 0.78, k3: 0.56, scallop: 0, weight: 30, pts: 0,
      desc: '最經典的樣子，像一把小傘。海月水母就是這樣。' },
    bell: { name: '吊鐘', h: 0.86, k1: 0.72, k2: 0.95, k3: 0.4, scallop: 0, weight: 22, pts: 0.5,
      desc: '傘緣微微張開，像一口會發光的鐘。' },
    disc: { name: '圓盤', h: 0.38, k1: 1.08, k2: 0.9, k3: 0.72, scallop: 0, weight: 20, pts: 0.5,
      desc: '扁扁的，像一片會游泳的月亮。' },
    lantern: { name: '燈籠', h: 0.98, k1: 1.12, k2: 1.0, k3: 0.78, scallop: 0, weight: 12, pts: 1,
      desc: '圓圓胖胖，像廟口掛著的燈籠。' },
    tall: { name: '高帽', h: 1.28, k1: 0.95, k2: 1.12, k3: 0.46, scallop: 0, weight: 10, pts: 1.5,
      desc: '高高的傘，像戴了一頂帽子。箱水母也是這種身形。' },
    crown: { name: '花冠', h: 0.64, k1: 1.02, k2: 0.8, k3: 0.6, scallop: 12, weight: 6, pts: 2,
      desc: '傘緣留著一圈花邊，像碟狀幼體長大後捨不得脫掉的裙擺。' },
  };
  G.SHAPE_IDS = Object.keys(G.SHAPES);

  /* ---------- 花紋 ---------- */
  G.PATTERNS = {
    plain: { name: '素面', weight: 26, pts: 0, desc: '乾乾淨淨，什麼都不畫也很好看。' },
    clover: { name: '四葉草', weight: 22, pts: 0, desc: '海月水母的招牌。這四個圓圈，其實是牠的生殖腺。' },
    dots: { name: '星點', weight: 18, pts: 0.5, desc: '一閃一閃，像撒了一把亮粉。' },
    rings: { name: '年輪', weight: 14, pts: 0.5, desc: '一圈一圈，像水波，也像樹的年輪。' },
    stripes: { name: '放射紋', weight: 12, pts: 1, desc: '從傘頂畫下來的線條，像太平洋海刺水母。' },
    spiral: { name: '漩渦', weight: 6, pts: 1.5, desc: '看久了，會有一點想睡。' },
    heart: { name: '愛心', weight: 0, pts: 3, recipe: true,
      desc: '被深深愛著的水母，孩子身上會長出愛心。', hint: '被深深愛著的水母……' },
    starry: { name: '星空', weight: 0, pts: 3, recipe: true,
      desc: '傘裡裝著一小片夜空。', hint: '點點與點點相遇。' },
  };
  G.PATTERN_IDS = Object.keys(G.PATTERNS);

  /* ---------- 特殊體質 ---------- */
  G.SPECIALS = {
    rainbow: { name: '彩虹', pts: 4, desc: '顏色會一直流動。向身上有彩虹的櫛水母致敬。',
      hint: '顏色相隔很遠的兩隻，也許會生下所有的顏色。' },
    ghost: { name: '幽靈', pts: 3, desc: '有時候淡到快看不見。別擔心，牠只是比較害羞。',
      hint: '兩道很淡、很淡的影子相遇。' },
    golden: { name: '黃金', pts: 4, desc: '會一直掉金粉。據說看到的人，那天會有好運。',
      hint: '兩道金色的光。' },
    aurora: { name: '極光', pts: 3.5, desc: '傘上掛著一條會飄動的極光。',
      hint: '在極光下出生的孩子。' },
    twin: { name: '雙生', pts: 3, desc: '傘裡面，還藏著一把小小的傘。',
      hint: '長得一模一樣的兩隻……' },
    firefly: { name: '螢火', pts: 3, desc: '吃過很多煩惱，所以身邊總飄著小小的光。',
      hint: '吃過很多煩惱的水母，會把光傳給孩子。' },
    moonlight: { name: '月光', pts: 3.5, desc: '每一次脈動，都會泛開一圈月光。',
      hint: '在一次很深的呼吸之後。' },
  };
  G.SPECIAL_IDS = Object.keys(G.SPECIALS);

  G.RARITY = ['', '普通', '少見', '稀有', '夢幻', '傳說'];

  G.rarityPoints = (g) => {
    let s = 0;
    s += G.SHAPES[g.shape].pts;
    s += G.PATTERNS[g.pattern].pts;
    if (g.special) s += G.SPECIALS[g.special].pts;
    if (G.colorOf(g).id === 'moonwhite') s += 1;
    if (g.tentacles >= 14) s += 0.5;
    if (g.size >= 1.25) s += 0.5;
    return s;
  };
  G.stars = (g) => {
    const p = G.rarityPoints(g);
    if (p < 1) return 1;
    if (p < 2) return 2;
    if (p < 3.5) return 3;
    if (p < 5.5) return 4;
    return 5;
  };

  const commonPatterns = () => {
    const m = {};
    for (const k of G.PATTERN_IDS) if (G.PATTERNS[k].weight) m[k] = G.PATTERNS[k].weight;
    return m;
  };
  const shapeWeights = () => {
    const m = {};
    for (const k of G.SHAPE_IDS) m[k] = G.SHAPES[k].weight;
    return m;
  };

  const applySpecialColor = (g) => {
    if (g.special === 'golden') {
      g.hue = U.rand(43, 52);
      g.hue2 = U.rand(38, 56);
      g.sat = U.rand(0.82, 0.95);
      g.glow = Math.max(g.glow, 0.8);
    } else if (g.special === 'ghost') {
      g.sat = U.rand(0.06, 0.2);
    } else if (g.special === 'moonlight') {
      g.glow = Math.max(g.glow, 0.75);
    }
  };

  G.normalize = (g) => {
    g.hue = U.wrapHue(g.hue);
    g.hue2 = U.wrapHue(g.hue2);
    g.sat = U.clamp(g.sat, 0.05, 1);
    g.size = U.clamp(g.size, 0.65, 1.45);
    g.tentacles = U.clamp(Math.round(g.tentacles / 2) * 2, 4, 18);
    g.tentLen = U.clamp(g.tentLen, 0.5, 1.9);
    g.arms = U.clamp(Math.round(g.arms), 0, 4);
    g.armLen = U.clamp(g.armLen, 0.3, 1.2);
    g.glow = U.clamp(g.glow, 0.2, 1);
    g.pulse = U.clamp(g.pulse, 0.6, 1.45);
    if (!G.SHAPES[g.shape]) g.shape = 'dome';
    if (!G.PATTERNS[g.pattern]) g.pattern = 'plain';
    if (g.special && !G.SPECIALS[g.special]) g.special = null;
    if (!g.seed) g.seed = U.randInt(1, 1e9);
    return g;
  };

  /** 野生水母 */
  G.random = (opts = {}) => {
    const hue = U.rand(360);
    const satRoll = Math.random();
    const g = {
      hue,
      hue2: hue + U.pick([0, 18, -18, 40, -40, 150, 180]) + U.rand(-12, 12),
      sat: satRoll < 0.72 ? U.rand(0.55, 0.95) : satRoll < 0.9 ? U.rand(0.35, 0.55) : U.rand(0.12, 0.3),
      shape: U.weighted(shapeWeights()),
      size: U.rand(0.8, 1.2),
      tentacles: U.randInt(2, 7) * 2,
      tentLen: U.rand(0.65, 1.45),
      arms: U.pick([0, 2, 3, 4, 4]),
      armLen: U.rand(0.4, 1),
      pattern: U.weighted(commonPatterns()),
      glow: U.rand(0.35, 0.9),
      pulse: U.rand(0.75, 1.25),
      special: null,
      seed: U.randInt(1, 1e9),
    };
    const specialChance = opts.specialChance == null ? 0.008 : opts.specialChance;
    if (U.chance(specialChance)) g.special = U.pick(['golden', 'ghost', 'rainbow']);
    if (opts.starter) {
      g.special = null;
      g.shape = U.pick(['dome', 'dome', 'bell', 'disc']);
      g.pattern = U.pick(['plain', 'clover', 'clover', 'dots']);
      g.sat = U.rand(0.55, 0.9);
    }
    applySpecialColor(g);
    return G.normalize(g);
  };

  /**
   * 繁殖。pa / pb 是水母物件（需要 genes、affection、worryFed）。
   * ctx: { theme, breathRecent }
   */
  G.breed = (pa, pb, ctx = {}) => {
    const A = pa.genes;
    const B = pb.genes;
    const from = () => (Math.random() < 0.5 ? A : B);
    const mut = (p) => Math.random() < p;

    const g = {};
    g.hue = U.hueLerp(A.hue, B.hue, U.rand(0.2, 0.8)) + (mut(0.12) ? U.rand(-70, 70) : U.rand(-8, 8));
    g.hue2 = U.hueLerp(A.hue2, B.hue2, U.rand(0.2, 0.8)) + (mut(0.15) ? U.rand(-90, 90) : U.rand(-10, 10));
    g.sat = mut(0.08) ? U.rand(0.1, 0.95) : U.lerp(A.sat, B.sat, Math.random()) + U.rand(-0.06, 0.06);
    g.size = mut(0.08) ? U.rand(0.7, 1.42) : U.lerp(A.size, B.size, Math.random()) + U.rand(-0.06, 0.06);
    g.tentacles = from().tentacles + U.pick([-2, 0, 0, 0, 2]);
    g.tentLen = mut(0.1) ? U.rand(0.5, 1.85) : U.lerp(A.tentLen, B.tentLen, Math.random()) + U.rand(-0.08, 0.08);
    g.arms = mut(0.08) ? U.pick([0, 2, 3, 4]) : from().arms;
    g.armLen = U.lerp(A.armLen, B.armLen, Math.random()) + U.rand(-0.08, 0.08);
    g.glow = U.lerp(A.glow, B.glow, Math.random()) + U.rand(-0.06, 0.1);
    g.pulse = U.lerp(A.pulse, B.pulse, Math.random()) + U.rand(-0.06, 0.06);

    const r = Math.random();
    g.shape = r < 0.45 ? A.shape : r < 0.9 ? B.shape : U.weighted(shapeWeights());

    const rp = Math.random();
    g.pattern = rp < 0.42 ? A.pattern : rp < 0.84 ? B.pattern : U.weighted(commonPatterns());
    const love = (pa.affection || 0) + (pb.affection || 0);
    if (love >= 40 && U.chance(0.3)) g.pattern = 'heart';
    if (A.pattern === 'dots' && B.pattern === 'dots' && U.chance(0.3)) g.pattern = 'starry';

    // 特殊體質：先看遺傳，再看配方，最後是一點點奇蹟
    g.special = null;
    const inherited = [A.special, B.special].filter(Boolean);
    if (inherited.length && U.chance(0.35)) g.special = U.pick(inherited);
    if (!g.special) {
      const recipes = [
        ['rainbow', Math.abs(U.hueDiff(A.hue, B.hue)) >= 140, 0.14],
        ['ghost', A.sat < 0.35 && B.sat < 0.35, 0.3],
        ['golden', G.colorOf(A).id === 'gold' && G.colorOf(B).id === 'gold', 0.15],
        ['aurora', ctx.theme === 'aurora', 0.15],
        ['twin', A.shape === B.shape, 0.1],
        ['firefly', (pa.worryFed || 0) + (pb.worryFed || 0) >= 5, 0.25],
        ['moonlight', !!ctx.breathRecent, 0.25],
      ];
      for (let i = recipes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [recipes[i], recipes[j]] = [recipes[j], recipes[i]];
      }
      for (const [id, ok, p] of recipes) {
        if (ok && U.chance(p)) {
          g.special = id;
          break;
        }
      }
    }
    if (!g.special && U.chance(0.012)) g.special = U.pick(['rainbow', 'ghost', 'golden', 'twin']);
    applySpecialColor(g);
    g.seed = U.randInt(1, 1e9);
    return G.normalize(g);
  };

  G.describe = (g) => {
    const color = G.colorOf(g);
    const stars = G.stars(g);
    return {
      color,
      colorName: color.name,
      shapeName: G.SHAPES[g.shape].name,
      patternName: G.PATTERNS[g.pattern].name,
      specialName: g.special ? G.SPECIALS[g.special].name : null,
      stars,
      rarity: G.RARITY[stars],
    };
  };

  /** 圖鑑用的鍵 */
  G.codexKeys = (g) => {
    const keys = ['color:' + G.colorOf(g).id, 'shape:' + g.shape, 'pattern:' + g.pattern];
    if (g.special) keys.push('special:' + g.special);
    return keys;
  };
  G.codexTotal = () => G.COLORS.length + G.SHAPE_IDS.length + G.PATTERN_IDS.length + G.SPECIAL_IDS.length;

  /** 水母的音：色相決定音階位置，體型決定高低 */
  G.noteOf = (g) => {
    let idx = Math.floor(U.wrapHue(g.hue) / 36); // 0..9
    if (g.size > 1.15) idx -= 5;
    else if (g.size < 0.85) idx += 3;
    return idx;
  };

  G.makeName = (taken) => {
    const set = new Set(taken);
    const free = MJ.Content.names.filter((n) => !set.has(n));
    if (free.length) return U.pick(free);
    for (let i = 0; i < 40; i++) {
      const n = U.pick(MJ.Content.namePrefix) + U.pick(MJ.Content.names);
      if (!set.has(n)) return n;
    }
    return U.pick(MJ.Content.names) + U.randInt(2, 99);
  };

  MJ.Genes = G;
})((window.MJ = window.MJ || {}));
