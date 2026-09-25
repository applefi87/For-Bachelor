/* 海月水母館 — 海底裝飾：全部用程式畫出來 */
(function (MJ) {
  'use strict';

  const U = MJ.U;

  const DEFS = {
    kelp: { name: '海帶林', price: 40, max: 3, w: 70, h: 210, desc: '高高的海帶，會跟著水流慢慢搖。' },
    coral: { name: '粉珊瑚', price: 60, max: 3, w: 90, h: 95, desc: '一小叢粉紅珊瑚，枝頭亮著細細的光。' },
    airstone: { name: '氣泡石', price: 80, max: 2, w: 36, h: 22, desc: '一直咕嚕咕嚕地冒泡泡。' },
    conch: { name: '大海螺', price: 90, max: 1, w: 64, h: 44, tap: true, desc: '點一下，可以聽見海的聲音。' },
    anemone: { name: '螢光海葵', price: 120, max: 2, w: 70, h: 70, desc: '觸手的尖端，發著淡紫色的光。' },
    bottle: { name: '漂流瓶', price: 150, max: 1, w: 60, h: 40, tap: true, desc: '瓶子裡塞著一張紙條，點開來看看。' },
    lantern: { name: '石燈籠', price: 200, max: 1, w: 46, h: 110, tap: true, desc: '海底的一盞燈。點一下可以開關。' },
    moonstone: { name: '月光石', price: 260, max: 1, w: 50, h: 56, desc: '在它旁邊游泳的水母，心情會比較好。' },
    chest: { name: '寶箱', price: 320, max: 1, w: 64, h: 50, tap: true, desc: '偶爾冒出金色泡泡。戳破金泡泡會得到光。' },
    ship: { name: '小沉船', price: 520, max: 1, w: 170, h: 120, desc: '不知道從哪裡漂來的小船，窗戶還亮著。' },
  };

  const D = { DEFS };

  D.create = (type, x) => ({ id: U.uid(), type, x: x == null ? U.rand(0.08, 0.92) : x, seed: U.randInt(1, 1e9), on: true });

  D.size = (d, unit) => {
    const def = DEFS[d.type];
    return { w: def.w * unit, h: def.h * unit };
  };

  D.bbox = (d, world) => {
    const { w, h } = D.size(d, world.unit);
    const x = d.x * world.W;
    const base = world.sandY(x) + 6;
    return { x: x - w / 2, y: base - h, w, h, cx: x, base };
  };

  D.hit = (d, px, py, world) => {
    const b = D.bbox(d, world);
    const pad = 10;
    return px > b.x - pad && px < b.x + b.w + pad && py > b.y - pad && py < b.base + pad;
  };

  /** 每幀更新：冒泡、影響水母 */
  D.update = (d, dt, world, game) => {
    const b = D.bbox(d, world);
    const u = world.unit;
    if (d.type === 'airstone') {
      d._acc = (d._acc || 0) + dt;
      while (d._acc > 0.11) {
        d._acc -= 0.11;
        world.addBubble(b.cx + U.rand(-6, 6) * u, b.base - b.h * 0.7, U.rand(1.2, 3.2) * u);
      }
    } else if (d.type === 'chest') {
      d._acc = (d._acc || 0) + dt;
      if (d._acc > 18) {
        d._acc = U.rand(-8, 0);
        world.addBubble(b.cx + U.rand(-8, 8) * u, b.base - b.h * 0.6, 7 * u, { big: true, gold: true });
      }
      if (Math.random() < dt * 0.6) world.addBubble(b.cx + U.rand(-10, 10) * u, b.base - b.h * 0.6, U.rand(1, 2.4) * u);
    } else if (d.type === 'ship') {
      if (Math.random() < dt * 0.5) world.addBubble(b.cx + U.rand(-30, 30) * u, b.base - b.h * 0.5, U.rand(1.2, 3) * u);
    } else if (d.type === 'moonstone' && game) {
      for (const j of game.jellies) {
        const dx = j.x - b.cx;
        const dy = j.y - (b.base - b.h);
        if (dx * dx + dy * dy < 170 * 170 * u * u) j.happy = Math.min(1, j.happy + dt * 0.012);
      }
    }
  };

  D.draw = (ctx, d, world, t, highlight) => {
    const b = D.bbox(d, world);
    const u = world.unit;
    ctx.save();
    ctx.translate(b.cx, b.base);
    const fn = DRAW[d.type];
    if (fn) fn(ctx, d, u, t, world);
    ctx.restore();
    if (highlight) {
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = 'rgba(230,245,250,0.55)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);
      ctx.restore();
    }
  };

  /* ---------- 各種裝飾的畫法（原點在底部中央，往上是負 y） ---------- */

  const DRAW = {};

  DRAW.kelp = (ctx, d, u, t, world) => {
    if (!d._strands) {
      const r = U.seeded(d.seed);
      d._strands = [];
      const n = 4 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        d._strands.push({
          x: (r() - 0.5) * 50,
          h: (130 + r() * 90) * (1 - Math.abs(i - n / 2) * 0.05),
          hue: 85 + r() * 40,
          phase: r() * 10,
          w: 6 + r() * 4,
        });
      }
    }
    for (const s of d._strands) {
      const segs = 14;
      const segLen = (s.h * u) / segs;
      let x = s.x * u;
      let y = 0;
      let ang = -Math.PI / 2;
      const L = [];
      const R = [];
      const bulbs = [];
      for (let i = 0; i <= segs; i++) {
        const k = i / segs;
        const width = s.w * u * (0.5 + 0.8 * Math.sin(Math.PI * Math.min(1, k * 1.2 + 0.1)));
        const nx = Math.cos(ang + Math.PI / 2);
        const ny = Math.sin(ang + Math.PI / 2);
        L.push(x + nx * width * 0.5, y + ny * width * 0.5);
        R.push(x - nx * width * 0.5, y - ny * width * 0.5);
        if (i % 4 === 2) bulbs.push(x + nx * width * 0.7, y + ny * width * 0.7);
        ang += Math.sin(t * 0.7 + s.phase + i * 0.38) * 0.06 * k + world.current * 0.02 * k;
        x += Math.cos(ang) * segLen;
        y += Math.sin(ang) * segLen;
      }
      ctx.fillStyle = U.hsla(s.hue, 0.45, 0.26 * (1 - world.dim * 0.6), 0.9);
      ctx.beginPath();
      ctx.moveTo(L[0], L[1]);
      for (let i = 2; i < L.length; i += 2) ctx.lineTo(L[i], L[i + 1]);
      for (let i = R.length - 2; i >= 0; i -= 2) ctx.lineTo(R[i], R[i + 1]);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = U.hsla(s.hue + 10, 0.5, 0.36 * (1 - world.dim * 0.6), 0.9);
      for (let i = 0; i < bulbs.length; i += 2) {
        ctx.beginPath();
        ctx.arc(bulbs[i], bulbs[i + 1], 2.4 * u, 0, U.TAU);
        ctx.fill();
      }
    }
  };

  DRAW.coral = (ctx, d, u, t, world) => {
    if (!d._segs) {
      const r = U.seeded(d.seed);
      const segs = [];
      const tips = [];
      const hue = [350, 5, 335, 15][Math.floor(r() * 4)];
      d._hue = hue + (r() - 0.5) * 16;
      const grow = (x, y, a, len, w, depth) => {
        const x2 = x + Math.cos(a) * len;
        const y2 = y + Math.sin(a) * len;
        segs.push([x, y, x2, y2, w, depth]);
        if (depth >= 4 || len < 8) {
          tips.push([x2, y2, r() * 10]);
          return;
        }
        const n = r() < 0.4 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const na = a + (i - (n - 1) / 2) * (0.45 + r() * 0.3) + (r() - 0.5) * 0.3;
          grow(x2, y2, na, len * (0.68 + r() * 0.15), w * 0.72, depth + 1);
        }
      };
      grow(-12, 0, -Math.PI / 2 - 0.35, 30, 9, 0);
      grow(10, 0, -Math.PI / 2 + 0.3, 26, 8, 0);
      d._segs = segs;
      d._tips = tips;
    }
    const dimK = 1 - world.dim * 0.5;
    ctx.lineCap = 'round';
    for (const [x1, y1, x2, y2, w, depth] of d._segs) {
      ctx.strokeStyle = U.hsla(d._hue, 0.55, (0.38 + depth * 0.06) * dimK, 1);
      ctx.lineWidth = w * u;
      ctx.beginPath();
      ctx.moveTo(x1 * u, y1 * u);
      ctx.lineTo(x2 * u, y2 * u);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, ph] of d._tips) {
      const a = 0.5 + 0.5 * Math.sin(t * 1.4 + ph);
      U.drawGlow(ctx, x * u, y * u, 14 * u, d._hue + 10, 0.9, 0.7, a * 0.8);
      ctx.fillStyle = U.hsla(d._hue + 15, 0.8, 0.85, 0.5 + a * 0.4);
      ctx.beginPath();
      ctx.arc(x * u, y * u, 1.6 * u, 0, U.TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  DRAW.airstone = (ctx, d, u) => {
    ctx.fillStyle = '#2d4658';
    ctx.beginPath();
    ctx.ellipse(0, -8 * u, 17 * u, 10 * u, 0, 0, U.TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,200,215,0.18)';
    ctx.beginPath();
    ctx.ellipse(-4 * u, -12 * u, 9 * u, 4 * u, -0.2, 0, U.TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(5,15,25,0.6)';
    for (const [x, y] of [[-7, -9], [2, -12], [8, -7], [-1, -6]]) {
      ctx.beginPath();
      ctx.arc(x * u, y * u, 1.3 * u, 0, U.TAU);
      ctx.fill();
    }
  };

  DRAW.conch = (ctx, d, u, t) => {
    ctx.save();
    ctx.scale(u, u);
    ctx.rotate(-0.12);
    // 螺塔
    ctx.fillStyle = '#e7cfb4';
    ctx.beginPath();
    ctx.moveTo(-30, -14);
    ctx.lineTo(-8, -32);
    ctx.lineTo(6, -18);
    ctx.closePath();
    ctx.fill();
    // 身體
    const g = ctx.createLinearGradient(-20, -40, 10, 0);
    g.addColorStop(0, '#f4e2cc');
    g.addColorStop(1, '#c79d80');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-26, -12);
    ctx.bezierCurveTo(-18, -38, 22, -40, 28, -16);
    ctx.bezierCurveTo(30, -4, 18, 2, 0, 0);
    ctx.bezierCurveTo(-14, 0, -24, -4, -26, -12);
    ctx.fill();
    // 螺紋
    ctx.strokeStyle = 'rgba(140,95,70,0.45)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-20 + i * 9, -24 + i * 2);
      ctx.quadraticCurveTo(-12 + i * 9, -12, -16 + i * 10, -2);
      ctx.stroke();
    }
    // 開口
    const ig = ctx.createRadialGradient(18, -12, 1, 18, -12, 14);
    ig.addColorStop(0, '#ff9fa8');
    ig.addColorStop(1, '#f1c4b8');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.ellipse(18, -13, 9, 12, 0.5, 0, U.TAU);
    ctx.fill();
    ctx.restore();
    if (d._ping && t >= d._ping && t - d._ping < 1.4) {
      const k = (t - d._ping) / 1.4;
      ctx.strokeStyle = 'rgba(255,220,210,' + (0.5 * (1 - k)).toFixed(3) + ')';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(22 * u, -26 * u, (10 + i * 8 + k * 16) * u, -1.1, -0.1);
        ctx.stroke();
      }
    }
  };

  DRAW.anemone = (ctx, d, u, t, world) => {
    if (!d._arms) {
      const r = U.seeded(d.seed);
      d._arms = [];
      const n = 15;
      for (let i = 0; i < n; i++) {
        d._arms.push({ a: -Math.PI / 2 + ((i / (n - 1)) - 0.5) * 2.3, len: 34 + r() * 22, ph: r() * 10 });
      }
      d._hue = [285, 300, 265, 315][Math.floor(r() * 4)];
    }
    const hue = d._hue;
    const dimK = 1 - world.dim * 0.4;
    // 觸手
    ctx.lineCap = 'round';
    const tips = [];
    for (const arm of d._arms) {
      let x = 0;
      let y = -22 * u;
      let a = arm.a;
      ctx.strokeStyle = U.hsla(hue, 0.45, 0.45 * dimK, 0.9);
      ctx.lineWidth = 3.2 * u;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const segs = 6;
      for (let i = 1; i <= segs; i++) {
        a += Math.sin(t * 1.1 + arm.ph + i * 0.6) * 0.09 + world.current * 0.015;
        x += Math.cos(a) * (arm.len / segs) * u;
        y += Math.sin(a) * (arm.len / segs) * u;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      tips.push(x, y, arm.ph);
    }
    // 底座
    const g = ctx.createLinearGradient(0, -26 * u, 0, 0);
    g.addColorStop(0, U.hsla(hue, 0.4, 0.32 * dimK, 1));
    g.addColorStop(1, U.hsla(hue - 20, 0.3, 0.16, 1));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-20 * u, 0);
    ctx.bezierCurveTo(-18 * u, -14 * u, -14 * u, -26 * u, 0, -26 * u);
    ctx.bezierCurveTo(14 * u, -26 * u, 18 * u, -14 * u, 20 * u, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < tips.length; i += 3) {
      const a = 0.55 + 0.45 * Math.sin(t * 1.8 + tips[i + 2]);
      U.drawGlow(ctx, tips[i], tips[i + 1], 16 * u, hue + 15, 0.9, 0.7, a);
      ctx.fillStyle = U.hsla(hue + 20, 0.7, 0.85, 0.8);
      ctx.beginPath();
      ctx.arc(tips[i], tips[i + 1], 2 * u, 0, U.TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  DRAW.bottle = (ctx, d, u, t, world) => {
    ctx.save();
    ctx.scale(u, u);
    ctx.translate(0, -12);
    ctx.rotate(-0.42);
    // 瓶身
    ctx.fillStyle = 'rgba(150,220,205,0.2)';
    ctx.strokeStyle = 'rgba(190,240,225,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-26, -11);
    ctx.lineTo(8, -11);
    ctx.quadraticCurveTo(16, -11, 18, -5);
    ctx.lineTo(28, -5);
    ctx.lineTo(28, 5);
    ctx.lineTo(18, 5);
    ctx.quadraticCurveTo(16, 11, 8, 11);
    ctx.lineTo(-26, 11);
    ctx.quadraticCurveTo(-31, 11, -31, 0);
    ctx.quadraticCurveTo(-31, -11, -26, -11);
    ctx.fill();
    ctx.stroke();
    // 軟木塞
    ctx.fillStyle = '#a57b55';
    ctx.fillRect(27, -4.5, 7, 9);
    // 紙條
    ctx.fillStyle = '#efe2c4';
    ctx.fillRect(-20, -5, 24, 10);
    ctx.strokeStyle = 'rgba(120,90,60,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-16, -1.5);
    ctx.lineTo(0, -1.5);
    ctx.moveTo(-16, 1.8);
    ctx.lineTo(-3, 1.8);
    ctx.stroke();
    // 反光
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-22, -7.5);
    ctx.lineTo(6, -7.5);
    ctx.stroke();
    ctx.restore();
    // 半埋在沙裡
    ctx.fillStyle = world.theme.sand[0];
    ctx.beginPath();
    ctx.ellipse(-8 * u, 1 * u, 26 * u, 6 * u, 0, Math.PI, U.TAU);
    ctx.fill();
  };

  DRAW.lantern = (ctx, d, u, t, world) => {
    const s = u;
    const stone = (l) => 'hsl(210,8%,' + Math.round(l * (1 - world.dim * 0.5)) + '%)';
    // 台座
    ctx.fillStyle = stone(28);
    ctx.fillRect(-20 * s, -10 * s, 40 * s, 10 * s);
    // 柱子
    ctx.fillStyle = stone(33);
    ctx.fillRect(-7 * s, -48 * s, 14 * s, 38 * s);
    // 中台
    ctx.fillStyle = stone(30);
    ctx.fillRect(-17 * s, -56 * s, 34 * s, 8 * s);
    // 火袋
    ctx.fillStyle = stone(35);
    ctx.fillRect(-14 * s, -78 * s, 28 * s, 22 * s);
    const on = d.on !== false;
    const flick = 0.85 + 0.15 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
    ctx.fillStyle = on ? 'rgba(255,205,120,' + (0.85 * flick).toFixed(3) + ')' : 'rgba(20,30,40,0.9)';
    ctx.fillRect(-7 * s, -73 * s, 14 * s, 12 * s);
    // 屋頂
    ctx.fillStyle = stone(26);
    ctx.beginPath();
    ctx.moveTo(-26 * s, -78 * s);
    ctx.quadraticCurveTo(-14 * s, -82 * s, -6 * s, -94 * s);
    ctx.lineTo(6 * s, -94 * s);
    ctx.quadraticCurveTo(14 * s, -82 * s, 26 * s, -78 * s);
    ctx.quadraticCurveTo(28 * s, -76 * s, 24 * s, -76 * s);
    ctx.lineTo(-24 * s, -76 * s);
    ctx.quadraticCurveTo(-28 * s, -76 * s, -26 * s, -78 * s);
    ctx.fill();
    // 寶珠
    ctx.fillStyle = stone(32);
    ctx.beginPath();
    ctx.moveTo(0, -108 * s);
    ctx.quadraticCurveTo(8 * s, -100 * s, 5 * s, -94 * s);
    ctx.lineTo(-5 * s, -94 * s);
    ctx.quadraticCurveTo(-8 * s, -100 * s, 0, -108 * s);
    ctx.fill();
    if (on) {
      ctx.globalCompositeOperation = 'lighter';
      U.drawGlow(ctx, 0, -67 * s, 150 * s * flick, 36, 0.95, 0.6, 0.75);
      U.drawGlow(ctx, 0, -67 * s, 40 * s, 40, 1, 0.7, 0.9);
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  DRAW.moonstone = (ctx, d, u, t) => {
    ctx.fillStyle = '#243548';
    ctx.beginPath();
    ctx.moveTo(-24 * u, 0);
    ctx.quadraticCurveTo(-22 * u, -18 * u, -4 * u, -20 * u);
    ctx.quadraticCurveTo(18 * u, -22 * u, 24 * u, 0);
    ctx.closePath();
    ctx.fill();
    const p = 0.8 + 0.2 * Math.sin(t * 1.3);
    ctx.globalCompositeOperation = 'lighter';
    U.drawGlow(ctx, 0, -34 * u, 140 * u * p, 205, 0.5, 0.75, 0.7);
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(-5 * u, -40 * u, 2 * u, 0, -34 * u, 16 * u);
    g.addColorStop(0, 'rgba(255,255,255,0.98)');
    g.addColorStop(0.6, 'rgba(205,228,255,0.85)');
    g.addColorStop(1, 'rgba(150,190,240,0.6)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -34 * u, 15 * u, 0, U.TAU);
    ctx.fill();
  };

  DRAW.chest = (ctx, d, u, t, world) => {
    ctx.save();
    ctx.scale(u, u);
    ctx.rotate(0.05);
    const dimK = 1 - world.dim * 0.5;
    // 內部的金光
    ctx.globalCompositeOperation = 'lighter';
    U.drawGlow(ctx, 0, -28, 90 * (0.9 + 0.1 * Math.sin(t * 2)), 45, 0.95, 0.6, 0.6);
    ctx.globalCompositeOperation = 'source-over';
    // 箱體
    ctx.fillStyle = 'hsl(24,42%,' + Math.round(26 * dimK) + '%)';
    ctx.fillRect(-30, -26, 60, 26);
    // 金幣
    ctx.fillStyle = '#f1c65a';
    for (const [x, y] of [[-14, -27], [-4, -29], [6, -27], [14, -28], [0, -31]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, 5, 2.5, 0, 0, U.TAU);
      ctx.fill();
    }
    // 蓋子（微開）
    ctx.save();
    ctx.translate(-30, -26);
    ctx.rotate(-0.55);
    ctx.fillStyle = 'hsl(24,40%,' + Math.round(30 * dimK) + '%)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(60, 0);
    ctx.quadraticCurveTo(60, -18, 30, -20);
    ctx.quadraticCurveTo(0, -18, 0, 0);
    ctx.fill();
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(12, -19, 5, 19);
    ctx.fillRect(43, -19, 5, 19);
    ctx.restore();
    // 鐵條
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(-18, -26, 5, 26);
    ctx.fillRect(13, -26, 5, 26);
    ctx.fillRect(-4, -18, 8, 9);
    ctx.restore();
  };

  DRAW.ship = (ctx, d, u, t, world) => {
    ctx.save();
    ctx.scale(u, u);
    ctx.rotate(-0.1);
    const dimK = 1 - world.dim * 0.5;
    // 桅杆
    ctx.strokeStyle = 'hsl(25,30%,' + Math.round(22 * dimK) + '%)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-6, -40);
    ctx.lineTo(4, -112);
    ctx.stroke();
    // 破帆
    const flap = Math.sin(t * 0.9) * 6;
    ctx.fillStyle = 'rgba(215,205,180,' + (0.55 * dimK).toFixed(3) + ')';
    ctx.beginPath();
    ctx.moveTo(3, -104);
    ctx.quadraticCurveTo(30 + flap, -92, 36 + flap, -70);
    ctx.lineTo(24 + flap * 0.6, -74);
    ctx.lineTo(28 + flap * 0.5, -60);
    ctx.lineTo(-1, -58);
    ctx.closePath();
    ctx.fill();
    // 船身
    const g = ctx.createLinearGradient(0, -52, 0, 0);
    g.addColorStop(0, 'hsl(22,34%,' + Math.round(30 * dimK) + '%)');
    g.addColorStop(1, 'hsl(22,30%,' + Math.round(15 * dimK) + '%)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-84, -50);
    ctx.lineTo(80, -46);
    ctx.quadraticCurveTo(76, -14, 50, 0);
    ctx.lineTo(-58, 0);
    ctx.quadraticCurveTo(-80, -18, -84, -50);
    ctx.fill();
    // 木板縫
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-82 + i * 3, -50 + i * 12);
      ctx.lineTo(78 - i * 7, -46 + i * 12);
      ctx.stroke();
    }
    // 發光的圓窗
    const flick = 0.85 + 0.15 * Math.sin(t * 5.1) * Math.sin(t * 2.3);
    ctx.globalCompositeOperation = 'lighter';
    for (const x of [-44, -14, 16, 46]) {
      U.drawGlow(ctx, x, -30, 34 * flick, 40, 0.9, 0.6, 0.6);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const x of [-44, -14, 16, 46]) {
      ctx.fillStyle = 'rgba(255,210,140,' + (0.85 * flick).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, -30, 5, 0, U.TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,25,15,0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
    // 埋進沙裡
    ctx.fillStyle = world.theme.sand[0];
    ctx.beginPath();
    ctx.ellipse(0, 2 * u, 90 * u, 9 * u, 0, Math.PI, U.TAU);
    ctx.fill();
  };

  MJ.Decor = D;
})((window.MJ = window.MJ || {}));
