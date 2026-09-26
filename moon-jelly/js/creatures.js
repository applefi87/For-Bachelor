/*
 * 海月水母館 — 心情長出來的生態系
 *
 * 每一份心情先是一隻幼生，選了怎麼陪它之後，才長成某一種生物。
 * 生物之間彼此有關：藍眼淚餵水母和珊瑚、珊瑚讓雀鯛住下、海龜帶殼回來給寄居蟹換、
 * 同一種需要的燈籠魚游成一群、同一種感覺來很多次就在珍珠貝裡多一層、
 * 用過很多種陪法，章魚就會出現。
 *
 * 生物不另外存檔，全部從心情紀錄（state.entries）推導出來，所以重新整理也會長一樣。
 */
(function (MJ) {
  'use strict';

  const U = MJ.U;
  const F = MJ.Feelings;
  const TAU = U.TAU;
  const DAY = 86400000;

  const famHue = (f) => (F.FAMILIES[f] || F.FAMILIES.calm).hue;
  const famSat = (f) => Math.max(0.3, (F.FAMILIES[f] || F.FAMILIES.calm).sat);
  const seedOf = (id) => U.seeded(U.hashStr(String(id)));
  const turnHue = (t) => (F.TURNS[t] ? F.TURNS[t].hue : 200);

  /* ============================================================
   * 殼：寄居蟹背的、沙地上空著的
   * 原點在殼的中心，開口朝右下（蟹的身體從那裡出來）
   * ============================================================ */
  function drawShell(ctx, type, s, t) {
    ctx.save();
    ctx.scale(s, s);
    const aperture = (x, y, rx, ry, rot, fill, lip) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
      ctx.fill();
      if (lip) {
        ctx.strokeStyle = lip;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
    };
    if (type === 'spire') {
      const g = ctx.createLinearGradient(-20, -12, 8, 8);
      g.addColorStop(0, '#f4e6cc');
      g.addColorStop(1, '#b98a5f');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-21, -13);
      ctx.quadraticCurveTo(-3, -12, 9, -2);
      ctx.quadraticCurveTo(11, 6, 2, 8);
      ctx.quadraticCurveTo(-9, 4, -21, -13);
      ctx.fill();
      ctx.strokeStyle = 'rgba(110,70,40,0.45)';
      ctx.lineWidth = 0.9;
      for (let i = 1; i < 6; i++) {
        const k = i / 6;
        ctx.beginPath();
        ctx.moveTo(-21 + k * 26, -13 + k * 9);
        ctx.quadraticCurveTo(-19 + k * 24, -9 + k * 12, -21 + k * 22, -13 + k * 19);
        ctx.stroke();
      }
      aperture(5, 4, 4.2, 3.2, 0.5, '#4d3226', '#f7ecd8');
    } else if (type === 'conch') {
      const g = ctx.createLinearGradient(-10, -14, 10, 8);
      g.addColorStop(0, '#fbeee4');
      g.addColorStop(1, '#d99f88');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-12, 4);
      ctx.quadraticCurveTo(-14, -8, -3, -11);
      ctx.lineTo(-1, -16);
      ctx.lineTo(2, -11);
      ctx.lineTo(5, -15);
      ctx.lineTo(6.5, -9.5);
      ctx.lineTo(10.5, -11.5);
      ctx.lineTo(10.5, -5);
      ctx.quadraticCurveTo(14, 2, 8, 8);
      ctx.lineTo(-6, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,90,70,0.35)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-10, -2);
      ctx.quadraticCurveTo(0, -6, 9, -2);
      ctx.moveTo(-9, 3);
      ctx.quadraticCurveTo(0, -1, 9, 3);
      ctx.stroke();
      aperture(6, 4, 4.3, 3.2, 0.6, '#f0939a', '#fff2ea');
    } else if (type === 'cowrie') {
      const g = ctx.createLinearGradient(0, -9, 0, 7);
      g.addColorStop(0, '#d9b48a');
      g.addColorStop(1, '#7c4f33');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -1, 11.5, 8, -0.08, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(70,40,25,0.45)';
      const r = U.seeded(7);
      for (let i = 0; i < 11; i++) {
        ctx.beginPath();
        ctx.arc(-8 + r() * 16, -7 + r() * 8, 0.8 + r() * 1.2, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(-3, -5.5, 5, 1.8, -0.15, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#3a2418';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-8, 5.5);
      ctx.quadraticCurveTo(0, 7.5, 9, 4.5);
      ctx.stroke();
    } else if (type === 'nautilus') {
      const g = ctx.createRadialGradient(-2, -3, 1, 0, 0, 11);
      g.addColorStop(0, '#fbf3e3');
      g.addColorStop(1, '#e2c9a4');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, TAU);
      ctx.clip();
      ctx.strokeStyle = 'rgba(150,80,40,0.7)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI + i * 0.42;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
        ctx.quadraticCurveTo(Math.cos(a + 0.3) * 8, Math.sin(a + 0.3) * 8, Math.cos(a + 0.15) * 12, Math.sin(a + 0.15) * 12);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(120,80,50,0.5)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 3; a += 0.2) {
        const rr = 1.2 + a * 1.05;
        const x = Math.cos(a) * rr - 1;
        const y = Math.sin(a) * rr - 1;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      aperture(7, 3.5, 3.8, 4.2, 0.3, '#3f2a20', '#fff6e6');
    } else if (type === 'star') {
      const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 11);
      g.addColorStop(0, '#4d64b0');
      g.addColorStop(1, '#1c2754');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 10.5, 0, TAU);
      ctx.fill();
      const r = U.seeded(11);
      ctx.fillStyle = '#ffe9a8';
      for (let i = 0; i < 9; i++) {
        const x = -8 + r() * 14;
        const y = -8 + r() * 12;
        const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
        ctx.globalAlpha = 0.4 + tw * 0.6;
        ctx.beginPath();
        U.sparklePath(ctx, x, y, 0.8 + tw * 1.3);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      aperture(6, 4, 4.2, 3.4, 0.6, '#11173a', '#9fb3ff');
    } else if (type === 'nacre') {
      const g = ctx.createLinearGradient(-10, -10, 10, 10);
      for (let i = 0; i <= 4; i++) g.addColorStop(i / 4, U.hsla(t * 30 + i * 70, 0.55, 0.84, 1));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 10.5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2.6; a += 0.2) {
        const rr = 1 + a * 1.1;
        const x = Math.cos(a) * rr - 1;
        const y = Math.sin(a) * rr - 2;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      aperture(6, 4, 4.2, 3.4, 0.6, '#6e5a78', '#fff');
    } else {
      // moon：圓滾滾的玉螺
      const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 11);
      g.addColorStop(0, '#f3e6d0');
      g.addColorStop(1, '#c49a6c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 10.5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,80,50,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 3; a += 0.2) {
        const rr = 1 + a * 1.05;
        const x = Math.cos(a) * rr - 1.5;
        const y = Math.sin(a) * rr - 2;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      aperture(6, 4, 4.4, 3.4, 0.6, '#4a3024', '#f7ecd8');
    }
    ctx.restore();
  }

  /* ============================================================
   * 心情幼生：還沒決定怎麼陪的感覺
   * ============================================================ */
  class Larva {
    constructor(entry, eco) {
      this.kind = 'larva';
      this.entry = entry;
      this.eco = eco;
      const r = seedOf(entry.id);
      const G = eco.game;
      this.x = (0.18 + r() * 0.64) * G.W;
      this.y = (0.22 + r() * 0.3) * G.H;
      this.vx = 0;
      this.vy = 0;
      this.ph = r() * TAU;
      this.rot = r() * TAU;
      this.appear = 1;
    }
    get r() {
      return (5 + (this.entry.i0 || 5) * 0.5) * this.eco.game.unit;
    }
    update(dt) {
      const G = this.eco.game;
      const t = this.eco.t;
      this.vx += (U.noise(t * 0.2 + this.ph * 10) - 0.5) * 34 * dt;
      this.vy += (U.noise(t * 0.2 + this.ph * 10 + 50) - 0.5) * 34 * dt;
      const k = Math.exp(-0.8 * dt);
      this.vx *= k;
      this.vy *= k;
      if (this.x < 40) this.vx += 24 * dt;
      if (this.x > G.W - 40) this.vx -= 24 * dt;
      if (this.y < G.H * 0.12) this.vy += 24 * dt;
      if (this.y > G.world.floorY - 90) this.vy -= 24 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rot += dt * 0.4;
      if (this.appear < 1) this.appear = Math.min(1, this.appear + dt * 0.7);
    }
    draw(ctx) {
      const e = this.entry;
      const hue = famHue(e.fam);
      const sat = famSat(e.fam);
      const t = this.eco.t;
      const pulse = 1 + Math.sin(t * 2 + this.ph) * 0.08;
      const r = this.r * (0.6 + 0.4 * this.appear) * pulse;
      ctx.save();
      ctx.globalAlpha = this.appear;
      ctx.globalCompositeOperation = 'lighter';
      U.drawGlow(ctx, this.x, this.y, r * 7, hue, sat, 0.62, 0.85);
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.strokeStyle = U.hsla(hue, sat, 0.86, 0.55);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let k = 0; k < 22; k++) {
        const a = (k / 22) * TAU;
        const w = Math.sin(t * 9 + k * 1.3) * 0.35;
        const cx = Math.cos(a) * r;
        const cy = Math.sin(a) * r * 0.72;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a + w) * r * 0.45, cy + Math.sin(a + w) * r * 0.33);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.25, 0, 0, 0, r);
      g.addColorStop(0, U.hsla(hue, sat * 0.5, 0.94, 0.95));
      g.addColorStop(1, U.hsla(hue, sat, 0.6, 0.5));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.72, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = U.hsla(hue, sat, 0.45, 0.6);
      ctx.beginPath();
      ctx.arc(r * 0.15, 0, r * 0.22, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    hit(x, y) {
      return Math.hypot(x - this.x, y - this.y) < this.r * 2 + 12;
    }
  }

  /* ============================================================
   * 寄居蟹：換個殼看看
   * ============================================================ */
  class Crab {
    constructor(entry, eco) {
      this.kind = 'crab';
      this.entry = entry;
      this.eco = eco;
      const r = seedOf(entry.id);
      this.xf = 0.06 + r() * 0.88;
      this.x = null;
      this.dir = r() < 0.5 ? -1 : 1;
      this.state = 'idle';
      this.timer = 1 + r() * 4;
      this.legPh = r() * TAU;
      this.ph = r() * TAU;
      this.hide = 0;
      this.hop = 0;
      this.inCave = 0;
      this.flee = null;
      this.appear = 1;
      this.shell = null;
    }
    get size() {
      const age = (Date.now() - this.entry.t) / DAY;
      return 0.74 + Math.min(0.55, age * 0.04);
    }
    get k() {
      return 1.45 * this.eco.game.unit * this.size;
    }
    update(dt) {
      const G = this.eco.game;
      if (this.x == null) this.x = this.xf * G.W;
      if (this.appear < 1) this.appear = Math.min(1, this.appear + dt * 0.8);
      if (this.hop > 0) this.hop = Math.max(0, this.hop - dt * 1.3);
      // 有礁石洞的話，受驚的寄居蟹會跑進洞裡躲一下
      if (this.flee != null) {
        const d = this.flee - this.x;
        if (Math.abs(d) < 6) {
          this.flee = null;
          this.inCave = U.rand(4, 7);
        } else {
          this.dir = d > 0 ? 1 : -1;
          this.x += this.dir * 46 * G.unit * dt;
          this.legPh += dt * 22;
          this.state = 'walk';
          return;
        }
      }
      if (this.inCave > 0) {
        this.inCave -= dt;
        if (this.inCave <= 0) {
          this.state = 'walk';
          this.timer = U.rand(2, 4);
          this.dir = Math.random() < 0.5 ? -1 : 1;
        }
        return;
      }
      if (this.hide > 0) {
        this.hide -= dt;
        return;
      }
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.state === 'walk') {
          this.state = 'idle';
          this.timer = U.rand(2, 7);
        } else {
          this.state = 'walk';
          this.timer = U.rand(2, 5);
          if (Math.random() < 0.4) this.dir *= -1;
        }
      }
      if (this.state === 'walk') {
        this.x += this.dir * 9 * G.unit * (0.8 + this.size * 0.3) * dt;
        this.legPh += dt * 9;
        if (this.x < 24) {
          this.x = 24;
          this.dir = 1;
        }
        if (this.x > G.W - 24) {
          this.x = G.W - 24;
          this.dir = -1;
        }
      }
    }
    /** 被點到：有洞就跑進洞裡，沒有就縮進殼裡 */
    startle() {
      const cave = this.eco.habitat('cave');
      if (cave && this.inCave <= 0 && this.flee == null) {
        const cx = cave.x * this.eco.game.W;
        if (Math.abs(cx - this.x) < this.eco.game.W * 0.6) {
          this.flee = cx + U.rand(-8, 8);
          return;
        }
      }
      this.hide = 2.2;
    }
    draw(ctx) {
      const G = this.eco.game;
      if (this.x == null) this.x = this.xf * G.W;
      if (this.inCave > 0) return;
      const t = this.eco.t;
      const k = this.k;
      const hopY = Math.sin(Math.min(1, this.hop) * Math.PI) * 20 * G.unit;
      const y = G.world.sandY(this.x) + 1 - hopY;
      const hue = famHue(this.entry.fam);
      const body = U.hsla(hue, 0.5, 0.56, 1);
      const dark = U.hsla(hue, 0.45, 0.38, 1);
      const hidden = this.hide > 0;
      ctx.save();
      ctx.globalAlpha = this.appear;
      ctx.translate(this.x, y);
      ctx.scale(this.dir * k, k);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const walk = this.state === 'walk' && !hidden;
      const legs = (color, off) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const ph = this.legPh + i * 2.1 + off;
          const lift = walk ? Math.max(0, Math.sin(ph)) * 2.2 : 0;
          const sw = walk ? Math.cos(ph) * 2.2 : 0;
          const hx = 1.5 + i * 3.1 - off;
          ctx.moveTo(hx, -5);
          ctx.lineTo(hx + 3.4 + sw * 0.5, -9 - lift * 0.3);
          ctx.lineTo(hx + 5.5 + sw, -lift);
        }
        ctx.stroke();
      };
      if (!hidden) legs(dark, 1.4);

      // 殼
      ctx.save();
      ctx.translate(-6, -10);
      const sh = this.shell;
      drawShell(ctx, sh ? sh.type : 'moon', (sh ? sh.size : 1) / this.size, t);
      ctx.restore();

      if (hidden) {
        // 躲在殼裡，只露出眼睛
        ctx.fillStyle = '#0c0f14';
        ctx.beginPath();
        ctx.arc(-0.5, -6.5, 1.1, 0, TAU);
        ctx.arc(1.8, -6, 1.1, 0, TAU);
        ctx.fill();
        ctx.restore();
        return;
      }

      // 觸角
      ctx.strokeStyle = U.hsla(hue, 0.4, 0.72, 0.9);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      const aw = Math.sin(t * 2.3 + this.ph) * 2;
      ctx.moveTo(10, -10);
      ctx.quadraticCurveTo(15, -16 + aw, 20, -15 + aw);
      ctx.moveTo(9, -10.5);
      ctx.quadraticCurveTo(12, -19 - aw, 17, -20 - aw);
      ctx.stroke();

      // 身體
      const g = ctx.createLinearGradient(0, -12, 0, -2);
      g.addColorStop(0, U.hsla(hue, 0.5, 0.66, 1));
      g.addColorStop(1, body);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(6, -7, 5.6, 4.3, -0.1, 0, TAU);
      ctx.fill();

      // 眼柄與眼睛
      ctx.strokeStyle = body;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(8, -10);
      ctx.lineTo(9.5, -15.5);
      ctx.moveTo(6.3, -10.5);
      ctx.lineTo(7, -15);
      ctx.stroke();
      ctx.fillStyle = '#0c0f14';
      ctx.beginPath();
      ctx.arc(9.6, -16, 1.35, 0, TAU);
      ctx.arc(7, -15.4, 1.25, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(10, -16.4, 0.45, 0, TAU);
      ctx.arc(7.4, -15.8, 0.4, 0, TAU);
      ctx.fill();

      legs(body, 0);

      // 大小螯
      ctx.fillStyle = U.hsla(hue, 0.55, 0.6, 1);
      ctx.beginPath();
      ctx.ellipse(13.2, -5, 4.3, 3, -0.25, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(14.5, -5.5);
      ctx.lineTo(17.3, -5.2);
      ctx.stroke();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(11.3, -2.3, 2.6, 1.8, 0.1, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    hit(x, y) {
      if (this.x == null || this.inCave > 0) return false;
      const G = this.eco.game;
      const k = this.k;
      const cy = G.world.sandY(this.x) - 10 * k;
      return Math.abs(x - this.x) < 22 * k + 8 && Math.abs(y - cy) < 16 * k + 10;
    }
  }

  /* 沙地上沒人住的殼 */
  class SpareShell {
    constructor(shell, eco) {
      this.kind = 'shell';
      this.shell = shell;
      this.eco = eco;
      this.xf = 0.08 + seedOf(shell.id + 'x')() * 0.84;
      this.appear = 1;
    }
    update(dt) {
      if (this.appear < 1) this.appear = Math.min(1, this.appear + dt * 0.8);
    }
    draw(ctx) {
      const G = this.eco.game;
      const x = this.xf * G.W;
      const k = 1.45 * G.unit;
      ctx.save();
      ctx.globalAlpha = this.appear * 0.95;
      ctx.translate(x, G.world.sandY(x) - 8 * k * this.shell.size);
      ctx.rotate(0.35);
      ctx.scale(k, k);
      drawShell(ctx, this.shell.type, this.shell.size, this.eco.t);
      ctx.restore();
      if (this.shell.gift) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        U.drawGlow(ctx, x, G.world.sandY(x) - 8 * k, 50 * k, 48, 0.6, 0.75, 0.3 + 0.15 * Math.sin(this.eco.t * 2));
        ctx.restore();
      }
    }
    hit(x, y) {
      const G = this.eco.game;
      const sx = this.xf * G.W;
      return Math.abs(x - sx) < 18 * G.unit && Math.abs(y - (G.world.sandY(sx) - 8 * G.unit)) < 16 * G.unit;
    }
  }

  /* ============================================================
   * 燈籠魚：聽聽它要什麼。同一種需要的，游成一群
   * ============================================================ */
  class Lantern {
    constructor(entry, need, eco) {
      this.kind = 'lantern';
      this.entry = entry;
      this.need = need;
      this.eco = eco;
      const r = seedOf(entry.id + need);
      const G = eco.game;
      this.ox = (r() - 0.5) * 120;
      this.oy = (r() - 0.5) * 60;
      this.x = G.W * (0.2 + r() * 0.6);
      this.y = G.H * (0.3 + r() * 0.3);
      this.vx = 0;
      this.vy = 0;
      this.ang = 0;
      this.ph = r() * TAU;
      this.len = 22 + r() * 7;
      this.appear = 1;
    }
    update(dt, school) {
      const G = this.eco.game;
      const u = G.unit;
      const t = this.eco.t;
      const wob = Math.sin(t * 0.7 + this.ph) * 10 * u;
      const tx = school.x + this.ox * u + wob;
      const ty = school.y + this.oy * u + Math.cos(t * 0.5 + this.ph) * 6 * u;
      this.vx += ((tx - this.x) * 0.9 - this.vx * 0.9) * dt + (U.noise(t + this.ph * 7) - 0.5) * 20 * dt;
      this.vy += ((ty - this.y) * 0.9 - this.vy * 0.9) * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > 4) this.ang += U.angleDiff(this.ang, Math.atan2(this.vy, this.vx)) * Math.min(1, dt * 4);
      if (this.appear < 1) this.appear = Math.min(1, this.appear + dt * 0.8);
    }
    draw(ctx) {
      const G = this.eco.game;
      const u = G.unit;
      const L = this.len * u;
      const Hh = L * 0.28;
      const t = this.eco.t;
      const needHue = F.NEEDS[this.need] ? F.NEEDS[this.need].hue : 200;
      ctx.save();
      ctx.globalAlpha = this.appear;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.ang);
      if (Math.cos(this.ang) < 0) ctx.scale(1, -1);
      const wag = Math.sin(t * 8 + this.ph) * Hh * 0.35;
      // 尾鰭
      ctx.fillStyle = 'rgba(150,175,200,0.55)';
      ctx.beginPath();
      ctx.moveTo(-L * 0.36, 0);
      ctx.lineTo(-L * 0.62, -Hh * 0.7 + wag);
      ctx.lineTo(-L * 0.52, wag * 0.5);
      ctx.lineTo(-L * 0.62, Hh * 0.7 + wag);
      ctx.closePath();
      ctx.fill();
      // 身體
      const g = ctx.createLinearGradient(0, -Hh, 0, Hh);
      g.addColorStop(0, 'hsl(215,32%,28%)');
      g.addColorStop(0.55, 'hsl(212,22%,52%)');
      g.addColorStop(1, 'hsl(205,20%,78%)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(L * 0.5, 0);
      ctx.bezierCurveTo(L * 0.46, -Hh * 0.95, L * 0.05, -Hh * 1.05, -L * 0.4, -Hh * 0.25);
      ctx.lineTo(-L * 0.4, Hh * 0.25);
      ctx.bezierCurveTo(L * 0.05, Hh * 1.05, L * 0.46, Hh * 0.95, L * 0.5, 0);
      ctx.fill();
      // 眼睛（燈籠魚的眼睛很大）
      ctx.fillStyle = '#0a1320';
      ctx.beginPath();
      ctx.arc(L * 0.3, -Hh * 0.12, Hh * 0.36, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,220,235,0.7)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      // 發光器
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const px = L * (0.26 - i * 0.12);
        const py = Hh * 0.45;
        const tw = 0.6 + 0.4 * Math.sin(t * 3 + i + this.ph);
        U.drawGlow(ctx, px, py, 7 * u, needHue, 0.95, 0.6, tw);
        ctx.fillStyle = U.hsla(needHue, 0.9, 0.86, 0.9);
        ctx.beginPath();
        ctx.arc(px, py, 0.9 * u, 0, TAU);
        ctx.fill();
      }
      U.drawGlow(ctx, L * 0.42, Hh * 0.1, 9 * u, needHue, 0.9, 0.62, 0.7);
      ctx.restore();
    }
    hit(x, y) {
      const u = this.eco.game.unit;
      return Math.hypot(x - this.x, y - this.y) < this.len * u * 0.7 + 12;
    }
  }

  /* ============================================================
   * 海葵與小丑魚：對自己溫柔
   * ============================================================ */
  class Clownfish {
    constructor(entry, home, eco) {
      this.kind = 'clown';
      this.entry = entry;
      this.home = home;
      this.eco = eco;
      const r = seedOf(entry.id);
      this.a = r() * TAU;
      this.spin = (0.25 + r() * 0.35) * (r() < 0.5 ? -1 : 1);
      this.R = 1;
      this.dive = 0;
      this.ph = r() * TAU;
      this.x = null;
      this.y = null;
      this.face = 1;
      this.appear = 1;
    }
    update(dt) {
      const G = this.eco.game;
      const u = G.unit;
      const [cx, cy] = this.home.center();
      this.a += this.spin * dt;
      if (this.dive > 0) this.dive -= dt;
      else if (Math.random() < dt * 0.06) this.dive = U.rand(1.5, 3);
      const R = (this.dive > 0 ? 8 : 26 + Math.sin(this.eco.t * 0.6 + this.ph) * 8) * u * this.home.scale;
      const tx = cx + Math.cos(this.a) * R;
      const ty = cy + Math.sin(this.a) * R * 0.45 - (this.dive > 0 ? 0 : 6 * u);
      if (this.x == null) {
        this.x = tx;
        this.y = ty;
      }
      const dx = tx - this.x;
      this.x += dx * Math.min(1, dt * 2.2);
      this.y += (ty - this.y) * Math.min(1, dt * 2.2);
      if (Math.abs(dx) > 0.3) this.face = dx > 0 ? 1 : -1;
      if (this.appear < 1) this.appear = Math.min(1, this.appear + dt * 0.8);
    }
    draw(ctx) {
      if (this.x == null) return;
      const u = this.eco.game.unit;
      const L = 16 * u;
      const t = this.eco.t;
      const hue = famHue(this.entry.fam);
      ctx.save();
      ctx.globalAlpha = this.appear;
      ctx.globalCompositeOperation = 'lighter';
      U.drawGlow(ctx, this.x, this.y, L * 2.4, hue, famSat(this.entry.fam), 0.6, 0.35);
      ctx.globalCompositeOperation = 'source-over';
      ctx.translate(this.x, this.y);
      ctx.scale(this.face, 1);
      const wag = Math.sin(t * 10 + this.ph) * 0.25;
      // 尾鰭
      ctx.save();
      ctx.translate(-L * 0.46, 0);
      ctx.rotate(wag);
      ctx.fillStyle = '#ff7a22';
      ctx.strokeStyle = '#1b1210';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-L * 0.3, -L * 0.3, -L * 0.28, 0);
      ctx.quadraticCurveTo(-L * 0.3, L * 0.3, 0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      // 背鰭
      ctx.fillStyle = '#ff8a30';
      ctx.beginPath();
      ctx.moveTo(L * 0.15, -L * 0.24);
      ctx.quadraticCurveTo(-L * 0.05, -L * 0.48, -L * 0.3, -L * 0.2);
      ctx.fill();
      // 身體
      const bodyPath = new Path2D();
      bodyPath.ellipse(0, 0, L * 0.5, L * 0.28, 0, 0, TAU);
      const g = ctx.createLinearGradient(0, -L * 0.3, 0, L * 0.3);
      g.addColorStop(0, '#ff9a3c');
      g.addColorStop(1, '#f25d12');
      ctx.fillStyle = g;
      ctx.fill(bodyPath);
      ctx.save();
      ctx.clip(bodyPath);
      ctx.fillStyle = '#fff8f0';
      ctx.strokeStyle = '#1b1210';
      ctx.lineWidth = 0.8;
      for (const [x, w] of [[L * 0.24, L * 0.1], [-L * 0.03, L * 0.13], [-L * 0.36, L * 0.07]]) {
        ctx.beginPath();
        ctx.ellipse(x, 0, w, L * 0.34, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(27,18,16,0.6)';
      ctx.lineWidth = 0.7;
      ctx.stroke(bodyPath);
      // 胸鰭
      ctx.fillStyle = 'rgba(255,140,60,0.9)';
      ctx.beginPath();
      ctx.ellipse(L * 0.08, L * 0.08, L * 0.1, L * 0.05, 0.5 + wag, 0, TAU);
      ctx.fill();
      // 眼睛
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(L * 0.36, -L * 0.05, L * 0.055, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    hit(x, y) {
      if (this.x == null) return false;
      return Math.hypot(x - this.x, y - this.y) < 13 * this.eco.game.unit + 10;
    }
  }

  class KindAnemone {
    constructor(entries, eco) {
      this.kind = 'anemone';
      this.entries = entries;
      this.eco = eco;
      const r = seedOf(entries[0].id + 'a');
      this.xf = 0.3 + r() * 0.32;
      this.hue = famHue(entries[0].fam);
      this.arms = [];
      for (let i = 0; i < 22; i++) this.arms.push({ a: -Math.PI / 2 + (i / 21 - 0.5) * 2.5, len: 30 + r() * 20, ph: r() * 10 });
      this.fish = [];
      this.appear = 1;
    }
    get scale() {
      return 0.9 + this.entries.length * 0.15;
    }
    center() {
      const G = this.eco.game;
      const x = this.xf * G.W;
      return [x, G.world.sandY(x) - 34 * G.unit * this.scale];
    }
    update(dt) {
      if (this.appear < 1) this.appear = Math.min(1, this.appear + dt * 0.6);
      for (const f of this.fish) f.update(dt);
    }
    draw(ctx) {
      const G = this.eco.game;
      const u = G.unit * this.scale * (0.5 + 0.5 * this.appear);
      const x = this.xf * G.W;
      const base = G.world.sandY(x) + 3;
      const t = this.eco.t;
      const hue = this.hue;
      const n = 12 + this.entries.length * 4;
      ctx.save();
      ctx.globalAlpha = this.appear;
      ctx.lineCap = 'round';
      const tips = [];
      for (let i = 0; i < n; i++) {
        const arm = this.arms[Math.floor((i / n) * this.arms.length)];
        let px = x;
        let py = base - 20 * u;
        let a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.4;
        ctx.strokeStyle = U.hsla(hue, 0.5, 0.5, 0.92);
        ctx.lineWidth = 3.4 * u;
        ctx.beginPath();
        ctx.moveTo(px, py);
        for (let s = 1; s <= 6; s++) {
          a += Math.sin(t * 1.1 + arm.ph + s * 0.6) * 0.1 + G.world.current * 0.015;
          px += Math.cos(a) * (arm.len / 6) * u;
          py += Math.sin(a) * (arm.len / 6) * u;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
        tips.push(px, py, arm.ph);
      }
      const g = ctx.createLinearGradient(0, base - 24 * u, 0, base);
      g.addColorStop(0, U.hsla(hue, 0.45, 0.36, 1));
      g.addColorStop(1, U.hsla(hue, 0.35, 0.16, 1));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 20 * u, base);
      ctx.bezierCurveTo(x - 18 * u, base - 13 * u, x - 14 * u, base - 24 * u, x, base - 24 * u);
      ctx.bezierCurveTo(x + 14 * u, base - 24 * u, x + 18 * u, base - 13 * u, x + 20 * u, base);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < tips.length; i += 3) {
        const a = 0.55 + 0.45 * Math.sin(t * 1.7 + tips[i + 2]);
        U.drawGlow(ctx, tips[i], tips[i + 1], 14 * u, hue + 15, 0.9, 0.7, a * 0.9);
      }
      ctx.restore();
    }
    drawFish(ctx) {
      for (const f of this.fish) f.draw(ctx);
    }
    hit(x, y) {
      const [cx, cy] = this.center();
      const u = this.eco.game.unit * this.scale;
      return Math.abs(x - cx) < 34 * u && Math.abs(y - cy) < 30 * u;
    }
  }

  /* ============================================================
   * 海龜：一件小事
   * ============================================================ */
  class Turtle {
    constructor(entry, eco) {
      this.kind = 'turtle';
      this.entry = entry;
      this.eco = eco;
      const r = seedOf(entry.id);
      this.xf = 0.25 + r() * 0.5;
      this.ph = r() * TAU;
      this.a = r() * TAU;
      this.x = null;
      this.y = null;
      this.face = 1;
      this.appear = 1;
      this.journey = 0;
    }
    get done() {
      return this.entry.step && this.entry.step.status === 'done';
    }
    get size() {
      const n = this.eco.stepsDone || 0;
      return (this.done ? 0.85 : 0.6) + Math.min(0.5, n * 0.05);
    }
    update(dt) {
      const G = this.eco.game;
      const u = G.unit;
      if (this.appear < 1) this.appear = Math.min(1, this.appear + dt * 0.6);
      if (this.x == null) {
        this.x = this.xf * G.W;
        this.y = G.world.sandY(this.x) - 8 * u;
      }
      if (this.journey > 0) {
        // 出發旅行：往右游出畫面，再帶著殼游回來
        this.journey -= dt;
        const goingOut = this.journey > 11;
        const tx = goingOut ? G.W + 140 : this.xf * G.W;
        const ty = goingOut ? G.H * 0.3 : G.H * 0.45;
        this.x += U.clamp(tx - this.x, -70 * u * dt, 70 * u * dt);
        this.y += (ty - this.y) * Math.min(1, dt * 0.8);
        this.face = tx > this.x ? 1 : -1;
        if (!goingOut && this.journey <= 0.5 && !this.dropped) {
          this.dropped = true;
          if (this.eco.onGiftArrive) this.eco.onGiftArrive(this);
        }
        return;
      }
      if (!this.done) {
        // 還沒做的小事：在沙地上休息，不急
        const tx = this.xf * G.W;
        this.x += (tx - this.x) * Math.min(1, dt * 0.5);
        const ty = G.world.sandY(this.x) - 8 * u * this.size;
        this.y += (ty - this.y) * Math.min(1, dt * 0.8);
        this.face = 1;
      } else {
        this.a += dt * 0.05;
        const tx = G.W * (0.5 + Math.cos(this.a + this.ph) * 0.34);
        const ty = G.H * (0.42 + Math.sin(this.a * 1.7 + this.ph) * 0.16);
        const dx = tx - this.x;
        this.x += U.clamp(dx, -40 * u * dt, 40 * u * dt);
        this.y += (ty - this.y) * Math.min(1, dt * 0.4);
        if (Math.abs(dx) > 2) this.face = dx > 0 ? 1 : -1;
      }
    }
    draw(ctx) {
      if (this.x == null) return;
      const G = this.eco.game;
      const t = this.eco.t;
      const k = 1.35 * G.unit * this.size;
      const swim = this.done || this.journey > 0;
      const flap = swim ? Math.sin(t * 1.8 + this.ph) : Math.sin(t * 0.4 + this.ph) * 0.1;
      const bob = swim ? Math.sin(t * 1.8 + this.ph + 1) * 2 : 0;
      ctx.save();
      ctx.globalAlpha = this.appear;
      ctx.translate(this.x, this.y + bob);
      ctx.scale(this.face * k, k);
      const skin = 'hsl(78,22%,52%)';
      const skinDark = 'hsl(80,22%,38%)';
      // 後鰭
      ctx.fillStyle = skinDark;
      ctx.save();
      ctx.translate(-14, 3);
      ctx.rotate(0.4 + flap * 0.3);
      ctx.beginPath();
      ctx.ellipse(-4, 1, 6, 2.6, 0.3, 0, TAU);
      ctx.fill();
      ctx.restore();
      // 前鰭（在身體後面那一片）
      ctx.save();
      ctx.translate(9, 2);
      ctx.rotate(0.5 + flap * 0.7);
      ctx.fillStyle = skinDark;
      ctx.beginPath();
      ctx.ellipse(-7, 5, 13, 3.4, 0.25, 0, TAU);
      ctx.fill();
      ctx.restore();
      // 頭
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.ellipse(22, -2 + (swim ? 0 : Math.sin(t * 0.5 + this.ph) * 1.2), 6.2, 4.6, -0.1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#0f1a14';
      ctx.beginPath();
      ctx.arc(24.6, -3.6, 1.1, 0, TAU);
      ctx.fill();
      // 殼
      const g = ctx.createLinearGradient(0, -14, 0, 2);
      g.addColorStop(0, 'hsl(38,40%,42%)');
      g.addColorStop(1, 'hsl(34,38%,26%)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-19, 1);
      ctx.bezierCurveTo(-17, -14, 13, -16, 17, 1);
      ctx.quadraticCurveTo(0, 5, -19, 1);
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,205,150,0.35)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-9, -8.5);
      ctx.lineTo(-3, -11.5);
      ctx.lineTo(4, -11.5);
      ctx.lineTo(9, -8);
      ctx.moveTo(-3, -11.5);
      ctx.lineTo(-4, -4);
      ctx.lineTo(4, -4);
      ctx.lineTo(4, -11.5);
      ctx.moveTo(-4, -4);
      ctx.lineTo(-11, -2);
      ctx.moveTo(4, -4);
      ctx.lineTo(11, -2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(240,215,160,0.45)';
      ctx.beginPath();
      ctx.moveTo(-18, 0.5);
      ctx.quadraticCurveTo(0, 4, 16.5, 0.5);
      ctx.stroke();
      // 前鰭（靠近我們的那一片）
      ctx.save();
      ctx.translate(10, 2);
      ctx.rotate(0.3 + flap * 0.8);
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.ellipse(-7, 5, 13, 3.6, 0.25, 0, TAU);
      ctx.fill();
      ctx.restore();
      // 背上的小燈：還沒做的那件小事
      if (!this.done || this.journey > 0) {
        const hue = famHue(this.entry.fam);
        ctx.globalCompositeOperation = 'lighter';
        const tw = 0.7 + 0.3 * Math.sin(t * 2 + this.ph);
        U.drawGlow(ctx, 0, -15, 16, this.journey > 0 && this.journey < 11 ? 48 : hue, 0.9, 0.65, tw);
        ctx.fillStyle = U.hsla(this.journey > 0 && this.journey < 11 ? 48 : hue, 0.7, 0.85, 0.9);
        ctx.beginPath();
        ctx.arc(0, -15, 2.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    hit(x, y) {
      if (this.x == null) return false;
      const k = 1.35 * this.eco.game.unit * this.size;
      return Math.abs(x - this.x) < 26 * k + 8 && Math.abs(y - (this.y - 5 * k)) < 14 * k + 10;
    }
  }

  /* ============================================================
   * 海馬：先著陸。尾巴捲住一根海草，在水流裡待穩
   * ============================================================ */
  class Seahorse {
    constructor(entry, eco) {
      this.kind = 'seahorse';
      this.entry = entry;
      this.eco = eco;
      const r = seedOf(entry.id + 'h');
      this.xf = 0.08 + r() * 0.84;
      this.slot = r();
      this.hold = 0.42 + r() * 0.2;
      this.len = 78 + r() * 34;
      this.ph = r() * TAU;
      this.face = r() < 0.5 ? -1 : 1;
      this.appear = 1;
      this.x = null;
      this.y = null;
      this.bx = null;
    }
    /** 這隻海馬捲著的那根海草，長在哪裡 */
    baseX() {
      const G = this.eco.game;
      const bed = this.eco.bedX();
      if (bed != null) return bed * G.W + (this.slot - 0.5) * 110 * G.unit;
      return this.xf * G.W;
    }
    /** 海草上某一點（t = 0 在沙裡，1 在頂端） */
    bladeAt(t, bx, base) {
      const G = this.eco.game;
      const u = G.unit;
      const sway = Math.sin(this.eco.t * 0.7 + this.ph) * 10 * u + G.world.current * 6;
      const L = this.len * u;
      const cx = bx + sway * 0.4;
      const cy = base - L * 0.55;
      const ex = bx + sway;
      const ey = base - L;
      const m = 1 - t;
      return [m * m * bx + 2 * m * t * cx + t * t * ex, m * m * base + 2 * m * t * cy + t * t * ey];
    }
    update(dt) {
      const G = this.eco.game;
      if (this.appear < 1) this.appear = Math.min(1, this.appear + dt * 0.7);
      const tx = this.baseX();
      this.bx = this.bx == null ? tx : this.bx + (tx - this.bx) * Math.min(1, dt * 0.5);
      const [x, y] = this.bladeAt(this.hold, this.bx, G.world.sandY(this.bx) + 2);
      this.x = x;
      this.y = y;
    }
    pos() {
      if (this.x == null) this.update(0);
      return [this.x, this.y - 22 * this.eco.game.unit];
    }
    drawBlade(ctx) {
      const G = this.eco.game;
      const u = G.unit;
      const bx = this.bx == null ? this.baseX() : this.bx;
      const base = G.world.sandY(bx) + 2;
      ctx.strokeStyle = 'hsla(128,34%,34%,0.95)';
      ctx.lineCap = 'round';
      ctx.lineWidth = 3.2 * u;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const [x, y] = this.bladeAt(i / 12, bx, base);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = 'hsla(120,40%,52%,0.35)';
      ctx.lineWidth = 1 * u;
      ctx.stroke();
    }
    draw(ctx) {
      const G = this.eco.game;
      if (this.x == null) this.update(0);
      const k = 1.45 * G.unit;
      const t = this.eco.t;
      const hue = famHue(this.entry.fam);
      const sat = Math.min(0.55, famSat(this.entry.fam));
      ctx.save();
      ctx.globalAlpha = this.appear;
      this.drawBlade(ctx);
      ctx.globalCompositeOperation = 'lighter';
      U.drawGlow(ctx, this.x, this.y - 18 * k, 40 * k, hue, sat, 0.6, 0.35);
      ctx.globalCompositeOperation = 'source-over';
      ctx.translate(this.x, this.y);
      ctx.scale(this.face * k, k);
      ctx.rotate(Math.sin(t * 0.9 + this.ph) * 0.06);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const body = U.hsla(hue, sat, 0.58, 1);
      const dark = U.hsla(hue, sat, 0.38, 1);
      // 尾巴：捲在海草上
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(4.5, -6);
      ctx.quadraticCurveTo(4, -1, 1.5, 1.5);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 2.4, -0.3, Math.PI * 1.6);
      ctx.stroke();
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(0.4, 0.5, 1.1, Math.PI * 1.6, Math.PI * 3.2);
      ctx.stroke();
      // 背鰭：一直輕輕在拍
      const fl = Math.sin(t * 14 + this.ph) * 1.2;
      ctx.fillStyle = U.hsla(hue, sat * 0.6, 0.8, 0.7);
      ctx.beginPath();
      ctx.moveTo(1, -14);
      ctx.quadraticCurveTo(-4.5 + fl, -17, -3.5 - fl, -21);
      ctx.lineTo(0.2, -21);
      ctx.closePath();
      ctx.fill();
      // 身體
      const g = ctx.createLinearGradient(0, -36, 10, -6);
      g.addColorStop(0, U.hsla(hue, sat, 0.7, 1));
      g.addColorStop(1, body);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(2.5, -6);
      ctx.bezierCurveTo(-0.5, -12, 1.2, -20, 0.4, -26);
      ctx.bezierCurveTo(-0.6, -31, 2, -36, 6, -36);
      ctx.lineTo(8.6, -35.2);
      ctx.lineTo(14, -33.8);
      ctx.lineTo(14.2, -31.9);
      ctx.lineTo(8.4, -31);
      ctx.bezierCurveTo(6.4, -29, 9.4, -24, 10.2, -19);
      ctx.bezierCurveTo(11, -13, 8.2, -8, 5.4, -5.5);
      ctx.closePath();
      ctx.fill();
      // 身上的環節
      ctx.strokeStyle = U.hsla(hue, sat, 0.42, 0.6);
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 6; i++) {
        const yy = -9 - i * 3.2;
        ctx.beginPath();
        ctx.moveTo(1.6 + Math.abs(i - 3) * 0.15, yy);
        ctx.lineTo(7.4 + (i < 3 ? i * 0.8 : (5 - i) * 0.9), yy + 0.8);
        ctx.stroke();
      }
      // 頭冠與眼睛
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(4.4, -36);
      ctx.lineTo(4.8, -39);
      ctx.lineTo(6.6, -36.2);
      ctx.fill();
      ctx.fillStyle = '#10141c';
      ctx.beginPath();
      ctx.arc(6.6, -33.2, 1.15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(7, -33.6, 0.4, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    hit(x, y) {
      if (this.x == null) return false;
      const k = 1.45 * this.eco.game.unit;
      return Math.abs(x - (this.x + 5 * k * this.face)) < 12 * k + 10 && y < this.y + 6 * k + 8 && y > this.y - 40 * k - 8;
    }
  }

  /* ============================================================
   * 藍眼淚：先倒出來就好。碰到會亮，是水母和珊瑚的食物
   * ============================================================ */
  class Tears {
    constructor(eco) {
      this.eco = eco;
      this.pts = [];
      this.byEntry = new Map();
    }
    setEntries(entries) {
      const G = this.eco.game;
      const now = Date.now();
      const live = new Set();
      for (const e of entries) {
        live.add(e.id);
        const age = (now - (e.tt || e.t)) / (3 * DAY);
        const want = Math.max(0, Math.round((22 + (e.i0 || 5) * 5) * (1 - age)));
        let list = this.byEntry.get(e.id);
        if (!list) {
          list = [];
          this.byEntry.set(e.id, list);
        }
        const r = seedOf(e.id + 't');
        while (list.length < want) {
          list.push({
            x: r() * G.W,
            y: G.H * (0.04 + Math.pow(r(), 1.8) * 0.45),
            ph: r() * TAU,
            flash: this.eco.fresh ? 1 : 0,
            s: 0.6 + r() * 0.8,
          });
        }
        if (list.length > want) list.length = want;
      }
      for (const id of Array.from(this.byEntry.keys())) if (!live.has(id)) this.byEntry.delete(id);
      this.pts = [];
      for (const list of this.byEntry.values()) for (const p of list) this.pts.push(p);
      if (this.pts.length > 700) this.pts.length = 700;
    }
    disturb(x, y, r) {
      const r2 = r * r;
      for (const p of this.pts) {
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy < r2) p.flash = Math.min(1, p.flash + 0.9);
      }
    }
    update(dt) {
      const G = this.eco.game;
      const t = this.eco.t;
      const k = Math.exp(-2 * dt);
      const cur = G.world.current * 4;
      for (const p of this.pts) {
        p.flash *= k;
        p.x += (Math.sin(t * 0.3 + p.ph) * 2 + cur) * dt;
        p.y += Math.cos(t * 0.4 + p.ph) * 1.5 * dt;
        if (p.x < -10) p.x = G.W + 10;
        else if (p.x > G.W + 10) p.x = -10;
        if (Math.random() < dt * 0.015) p.flash = Math.max(p.flash, 0.6);
      }
      // 水母游過去，藍眼淚會亮，水母也吃飽一點
      if (!this.pts.length) return;
      for (const j of G.jellies) {
        const [cx, cy] = j.center();
        const r = j.bellW * 0.9;
        const r2 = r * r;
        let fed = 0;
        for (let i = (Math.random() * 3) | 0; i < this.pts.length; i += 3) {
          const p = this.pts[i];
          const dx = p.x - cx;
          const dy = p.y - cy;
          if (dx * dx + dy * dy < r2) {
            if (p.flash < 0.3) fed++;
            p.flash = 1;
          }
        }
        if (fed && !j.visitor) {
          j.fullness = Math.min(1, j.fullness + fed * 0.004);
          j.petGlow = Math.min(1, j.petGlow + fed * 0.02);
        }
      }
    }
    draw(ctx) {
      if (!this.pts.length) return;
      const u = this.eco.game.unit;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.pts) {
        const f = p.flash;
        if (f > 0.05) U.drawGlow(ctx, p.x, p.y, (8 + 18 * f) * u * p.s, 192, 1, 0.58, f);
        ctx.fillStyle = 'rgba(150,230,255,' + (0.12 + f * 0.8).toFixed(3) + ')';
        ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6);
      }
      ctx.restore();
    }
  }

  /* ============================================================
   * 珊瑚礁與雀鯛：細細品嚐、謝謝誰
   * ============================================================ */
  class Reef {
    constructor(xf, eco) {
      this.kind = 'reef';
      this.xf = xf;
      this.eco = eco;
      this.items = [];
      this.fish = [];
      this.hiding = 0;
    }
    setEntries(entries) {
      const prev = new Map(this.items.map((it) => [it.entry.id, it]));
      const tips = [];
      this.items = entries.map((e, i) => {
        const old = prev.get(e.id);
        const r = seedOf(e.id + 'c');
        let it;
        if (e.turn === 'thank') {
          it = { entry: e, type: 'mound', x: -42 + r() * 84, rx: 11 + r() * 7, ry: 7 + r() * 5, ph: r() * 10 };
        } else {
          const fromTip = i >= 3 && tips.length && r() < 0.55;
          const base = fromTip ? tips[Math.floor(r() * tips.length)] : [-38 + r() * 76, 0];
          const segs = [];
          const tp = [];
          const grow = (x, y, a, len, w, d) => {
            const x2 = x + Math.cos(a) * len;
            const y2 = y + Math.sin(a) * len;
            segs.push([x, y, x2, y2, w, d]);
            if (d >= 2 || len < 7) {
              tp.push([x2, y2, r() * 10]);
              return;
            }
            const n = r() < 0.35 ? 3 : 2;
            for (let k = 0; k < n; k++) grow(x2, y2, a + (k - (n - 1) / 2) * (0.5 + r() * 0.3), len * (0.7 + r() * 0.15), w * 0.72, d + 1);
          };
          grow(base[0], base[1], -Math.PI / 2 + (r() - 0.5) * 0.9, 14 + r() * 10, fromTip ? 4 : 6, 0);
          it = { entry: e, type: 'branch', segs, tips: tp, bx: base[0], by: base[1] };
          for (const q of tp) tips.push([q[0], q[1]]);
        }
        it.grow = old ? old.grow : this.eco.fresh && i === entries.length - 1 ? 0 : 1;
        return it;
      });
      const want = this.items.length >= 4 ? Math.min(14, Math.floor(this.items.length * 0.6)) : 0;
      while (this.fish.length < want) this.fish.push({ x: null, y: null, vx: 0, vy: 0, ph: Math.random() * TAU, a: Math.random() * TAU });
      if (this.fish.length > want) this.fish.length = want;
    }
    base() {
      const G = this.eco.game;
      const x = this.xf * G.W;
      return [x, G.world.sandY(x) + 4];
    }
    update(dt) {
      const G = this.eco.game;
      const u = G.unit;
      const t = this.eco.t;
      for (const it of this.items) if (it.grow < 1) it.grow = Math.min(1, it.grow + dt * 0.35);
      const [bx, by] = this.base();
      // 手指或滑鼠靠近，雀鯛就躲進珊瑚裡
      const P = G.pointer;
      if (P && P.hx != null && this.eco.t - (P.moveT || -9) < 0.4 && Math.hypot(P.hx - bx, P.hy - (by - 40 * u)) < 110 * u) this.hiding = 2.2;
      if (this.hiding > 0) this.hiding -= dt;
      for (const f of this.fish) {
        if (f.x == null) {
          f.x = bx + U.rand(-40, 40) * u;
          f.y = by - U.rand(30, 70) * u;
        }
        f.a += dt * (0.5 + (f.ph % 1) * 0.5);
        let tx;
        let ty;
        if (this.hiding > 0 && this.items.length) {
          tx = bx + Math.sin(f.ph * 7) * 25 * u;
          ty = by - 18 * u;
        } else {
          tx = bx + Math.cos(f.a + f.ph) * 60 * u;
          ty = by - (55 + Math.sin(f.a * 1.3 + f.ph) * 25) * u;
        }
        const k = this.hiding > 0 ? 5 : 1.4;
        f.vx += ((tx - f.x) * k - f.vx * 1.5) * dt + (U.noise(t * 2 + f.ph * 9) - 0.5) * 60 * dt;
        f.vy += ((ty - f.y) * k - f.vy * 1.5) * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
      }
    }
    draw(ctx) {
      if (!this.items.length) return;
      const G = this.eco.game;
      const u = G.unit;
      const t = this.eco.t;
      const [bx, by] = this.base();
      const fedGlow = this.eco.tears && this.eco.tears.pts.length ? 1.4 : 1;
      ctx.save();
      ctx.translate(bx, by);
      ctx.lineCap = 'round';
      for (const it of this.items) {
        const hue = famHue(it.entry.fam);
        const sat = famSat(it.entry.fam);
        ctx.save();
        if (it.type === 'mound') {
          ctx.translate(it.x * u, 0);
          ctx.scale(it.grow, it.grow);
          const g = ctx.createRadialGradient(-it.rx * 0.3 * u, -it.ry * u, 1, 0, -it.ry * 0.4 * u, it.rx * u * 1.2);
          g.addColorStop(0, U.hsla(hue, sat * 0.8, 0.66, 1));
          g.addColorStop(1, U.hsla(hue, sat * 0.7, 0.36, 1));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(0, 0, it.rx * u, it.ry * u, 0, Math.PI, TAU);
          ctx.fill();
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(0, 0, it.rx * u, it.ry * u, 0, Math.PI, TAU);
          ctx.clip();
          ctx.strokeStyle = U.hsla(hue, sat * 0.6, 0.28, 0.55);
          ctx.lineWidth = 1.1 * u;
          for (let k = 0; k < 5; k++) {
            ctx.beginPath();
            for (let x = -it.rx; x <= it.rx; x += 2) {
              const y = -it.ry * (0.2 + k * 0.17) + Math.sin(x * 0.7 + k + it.ph) * 1.4;
              if (x === -it.rx) ctx.moveTo(x * u, y * u);
              else ctx.lineTo(x * u, y * u);
            }
            ctx.stroke();
          }
          ctx.restore();
          ctx.globalCompositeOperation = 'lighter';
          U.drawGlow(ctx, 0, -it.ry * 0.6 * u, it.rx * 2.4 * u, hue, sat, 0.65, 0.3 * fedGlow);
        } else {
          ctx.translate(it.bx * u, it.by * u);
          ctx.scale(it.grow, it.grow);
          ctx.translate(-it.bx * u, -it.by * u);
          for (const [x1, y1, x2, y2, w, d] of it.segs) {
            ctx.strokeStyle = U.hsla(hue, sat * 0.75, 0.42 + d * 0.08, 1);
            ctx.lineWidth = w * u;
            ctx.beginPath();
            ctx.moveTo(x1 * u, y1 * u);
            ctx.lineTo(x2 * u, y2 * u);
            ctx.stroke();
          }
          ctx.globalCompositeOperation = 'lighter';
          for (const [x, y, ph] of it.tips) {
            const a = (0.5 + 0.5 * Math.sin(t * 1.3 + ph)) * fedGlow;
            U.drawGlow(ctx, x * u, y * u, 12 * u, hue + 10, 0.9, 0.7, Math.min(1, a * 0.8));
            ctx.fillStyle = U.hsla(hue + 10, 0.8, 0.86, 0.8);
            ctx.beginPath();
            ctx.arc(x * u, y * u, 1.5 * u, 0, TAU);
            ctx.fill();
          }
        }
        ctx.restore();
      }
      ctx.restore();
    }
    drawFish(ctx) {
      const u = this.eco.game.unit;
      const t = this.eco.t;
      for (const f of this.fish) {
        if (f.x == null) continue;
        const L = 8 * u;
        const ang = Math.atan2(f.vy, f.vx);
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(ang);
        if (Math.cos(ang) < 0) ctx.scale(1, -1);
        const wag = Math.sin(t * 14 + f.ph) * L * 0.12;
        ctx.fillStyle = 'hsl(172,70%,62%)';
        ctx.beginPath();
        ctx.moveTo(L * 0.5, 0);
        ctx.quadraticCurveTo(L * 0.1, -L * 0.38, -L * 0.35, 0);
        ctx.quadraticCurveTo(L * 0.1, L * 0.34, L * 0.5, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-L * 0.3, 0);
        ctx.lineTo(-L * 0.6, -L * 0.28 + wag);
        ctx.lineTo(-L * 0.5, wag * 0.3);
        ctx.lineTo(-L * 0.6, L * 0.28 + wag);
        ctx.fill();
        ctx.fillStyle = 'rgba(10,40,50,0.8)';
        ctx.beginPath();
        ctx.arc(L * 0.28, -L * 0.04, L * 0.07, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    itemAt(x, y) {
      const u = this.eco.game.unit;
      const [bx, by] = this.base();
      let best = null;
      let bd = 22 * u;
      for (const it of this.items) {
        const pts = it.type === 'mound' ? [[it.x, -it.ry * 0.5]] : it.tips.map((q) => [q[0], q[1]]).concat([[it.bx, it.by - 6]]);
        for (const [px, py] of pts) {
          const d = Math.hypot(x - (bx + px * u), y - (by + py * u));
          if (d < bd) {
            bd = d;
            best = it;
          }
        }
      }
      return best;
    }
  }

  /**
   * 珍珠：同一種感覺，至少七層、用過三種以上的陪法，才會結成一顆。
   * 只用同一種方式陪它，貝殼裡最多留十二層，更舊的會被新的蓋過去。
   * 這樣珍珠記錄的是「陪它的路徑」，而不是「它來了幾次」。
   */
  const PEARL_MIN = 7;
  const PEARL_MAX = 12;
  const PEARL_KINDS = 3;
  function pearlChain(list) {
    const done = [];
    let cur = [];
    for (const e of list) {
      cur.push(e);
      if (cur.length > PEARL_MAX) cur.shift();
      if (cur.length >= PEARL_MIN && new Set(cur.map((x) => x.turn)).size >= PEARL_KINDS) {
        done.push({ layers: cur.map((x) => x.turn), t: e.tt || e.t });
        cur = [];
      }
    }
    return { done, cur: cur.map((x) => x.turn) };
  }

  /* ============================================================
   * 珍珠貝：同一種感覺來了很多次
   * ============================================================ */
  class Oyster {
    constructor(fam, eco) {
      this.kind = 'oyster';
      this.fam = fam;
      this.eco = eco;
      const r = seedOf('oyster' + fam);
      this.xf = 0.34 + r() * 0.34;
      this.ph = r() * TAU;
      this.open = 0;
      this.cycleT = r() * 14;
      this.layers = [];
      this.pearls = null;
      this.appear = 1;
    }
    update(dt) {
      if (this.appear < 1) this.appear = Math.min(1, this.appear + dt * 0.6);
      // 大約每十四秒打開一次，讓人看見裡面的珍珠
      this.cycleT += dt;
      if (this.peek > 0) this.peek -= dt;
      const target = this.cycleT % 14 < 4.5 || this.peek > 0 ? 1 : 0;
      this.open += (target - this.open) * Math.min(1, dt * 1.5);
    }
    draw(ctx) {
      const G = this.eco.game;
      const u = G.unit * 1.1;
      const x = this.xf * G.W;
      const base = G.world.sandY(x) + 1;
      const t = this.eco.t;
      ctx.save();
      ctx.globalAlpha = this.appear;
      ctx.translate(x, base);
      // 下殼
      const g = ctx.createLinearGradient(0, -8 * u, 0, 2 * u);
      g.addColorStop(0, '#6d6378');
      g.addColorStop(1, '#3a3442');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-15 * u, -4 * u);
      ctx.quadraticCurveTo(-14 * u, 3 * u, 0, 3 * u);
      ctx.quadraticCurveTo(15 * u, 3 * u, 16 * u, -4 * u);
      ctx.closePath();
      ctx.fill();
      // 珍珠質內層
      const ng = ctx.createLinearGradient(-12 * u, -6 * u, 12 * u, -2 * u);
      for (let i = 0; i <= 4; i++) ng.addColorStop(i / 4, U.hsla(t * 20 + i * 60, 0.35, 0.82, 0.9));
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.ellipse(1 * u, -4 * u, 13 * u, 3.2 * u * (0.4 + this.open * 0.6), 0, 0, TAU);
      ctx.fill();
      // 珍珠：每一層是一種陪法的顏色
      const n = this.layers.length;
      if (n && this.open > 0.1) {
        const pr = (2.4 + n * 0.45) * u;
        const py = -5 * u - this.open * 2 * u;
        ctx.globalCompositeOperation = 'lighter';
        U.drawGlow(ctx, 2 * u, py, pr * 7, turnHue(this.layers[n - 1]), 0.5, 0.8, 0.5 * this.open);
        ctx.globalCompositeOperation = 'source-over';
        for (let i = n - 1; i >= 0; i--) {
          const rr = pr * ((i + 1) / n);
          ctx.fillStyle = U.hsla(turnHue(this.layers[i]), 0.45, 0.82, 1);
          ctx.beginPath();
          ctx.arc(2 * u, py, rr, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        ctx.arc(2 * u - pr * 0.35, py - pr * 0.35, pr * 0.25, 0, TAU);
        ctx.fill();
      }
      // 上殼（打開時往後翻）
      ctx.save();
      ctx.translate(-14 * u, -4 * u);
      ctx.rotate(-this.open * 0.55);
      const tg = ctx.createLinearGradient(0, -10 * u, 0, 0);
      tg.addColorStop(0, '#8a7f96');
      tg.addColorStop(1, '#4d4557');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(4 * u, -10 * u, 16 * u, -9 * u);
      ctx.quadraticCurveTo(29 * u, -7 * u, 30 * u, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,25,40,0.45)';
      ctx.lineWidth = 0.8;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 6 * u, -1 * u);
        ctx.quadraticCurveTo(i * 6 * u + 2 * u, -5 * u, i * 5.5 * u + 3 * u, -8.5 * u);
        ctx.stroke();
      }
      ctx.restore();
      // 家族的小光點
      ctx.globalCompositeOperation = 'lighter';
      U.drawGlow(ctx, -12 * u, -2 * u, 12 * u, famHue(this.fam), famSat(this.fam), 0.62, 0.6);
      ctx.restore();
    }
    hit(x, y) {
      const G = this.eco.game;
      const ox = this.xf * G.W;
      const oy = G.world.sandY(ox) - 5 * G.unit;
      return Math.abs(x - ox) < 20 * G.unit + 8 && Math.abs(y - oy) < 14 * G.unit + 8;
    }
  }

  /* ============================================================
   * 章魚：用過很多種陪法
   * ============================================================ */
  class Octopus {
    constructor(eco) {
      this.kind = 'octopus';
      this.eco = eco;
      this.turns = [];
      this.appear = 0;
      this.flash = 0;
      this.ph = Math.random() * TAU;
    }
    update(dt) {
      if (this.appear < 1) this.appear = Math.min(1, this.appear + dt * 0.25);
      if (this.flash > 0) this.flash -= dt;
    }
    colorAt(i, t) {
      const n = this.turns.length || 1;
      const speed = this.flash > 0 ? 6 : 0.35;
      const idx = Math.floor(t * speed + i * 0.7) % n;
      return turnHue(this.turns[idx]);
    }
    draw(ctx) {
      const G = this.eco.game;
      const u = G.unit;
      const t = this.eco.t;
      const x = G.W - 46 * u;
      const base = G.world.sandY(x) + 2;
      ctx.save();
      // 洞穴石頭
      ctx.fillStyle = '#1d2c3a';
      ctx.beginPath();
      ctx.moveTo(x - 50 * u, base);
      ctx.quadraticCurveTo(x - 46 * u, base - 44 * u, x - 6 * u, base - 50 * u);
      ctx.quadraticCurveTo(x + 44 * u, base - 50 * u, x + 60 * u, base);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0a1119';
      ctx.beginPath();
      ctx.ellipse(x + 4 * u, base - 2 * u, 22 * u, 20 * u, 0, Math.PI, TAU);
      ctx.fill();
      ctx.globalAlpha = this.appear;
      const peek = (Math.sin(t * 0.25 + this.ph) * 0.5 + 0.5) * 10 * u;
      const cx = x + 4 * u;
      const cy = base - 20 * u - peek;
      const hue = this.colorAt(0, t);
      // 八隻手
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const side = i < 4 ? -1 : 1;
        const k = i % 4;
        let a = side < 0 ? Math.PI - 0.2 - k * 0.28 : 0.2 + k * 0.28;
        let px = cx + side * 6 * u;
        let py = cy + 8 * u;
        const segs = 9;
        const len = (30 + k * 3) * u;
        let w = 5 * u;
        const ah = this.colorAt(i + 1, t);
        for (let s = 0; s < segs; s++) {
          const f = s / segs;
          a += Math.sin(t * 1.3 + i * 1.7 + s * 0.45) * 0.18 + side * f * 0.12;
          const nx = px + Math.cos(a) * (len / segs);
          const ny = Math.min(base, py + Math.sin(a) * (len / segs) + 1.2 * u);
          ctx.strokeStyle = U.hsla(ah, 0.45, 0.46 - f * 0.08, 1);
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          if (s % 2 === 1) {
            ctx.fillStyle = 'rgba(255,225,215,0.55)';
            ctx.beginPath();
            ctx.arc(nx, ny + w * 0.35, w * 0.18, 0, TAU);
            ctx.fill();
          }
          px = nx;
          py = ny;
          w *= 0.86;
        }
      }
      // 身體
      const g = ctx.createRadialGradient(cx - 6 * u, cy - 16 * u, 2, cx, cy - 6 * u, 22 * u);
      g.addColorStop(0, U.hsla(hue, 0.5, 0.66, 1));
      g.addColorStop(1, U.hsla(hue, 0.45, 0.36, 1));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 8 * u, 15 * u, 19 * u, -0.15, 0, TAU);
      ctx.fill();
      // 色素細胞
      for (let i = 0; i < 12; i++) {
        const a = i * 2.4;
        const rr = (4 + (i % 4) * 3) * u;
        const px = cx + Math.cos(a) * rr * 0.9;
        const py = cy - 12 * u + Math.sin(a) * rr;
        const s = (1.2 + Math.sin(t * 2 + i) * 0.6) * u * (this.flash > 0 ? 1.8 : 1);
        ctx.fillStyle = U.hsla(this.colorAt(i + 3, t), 0.7, 0.62, 0.85);
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.3, s), 0, TAU);
        ctx.fill();
      }
      // 眼睛：橫的瞳孔
      for (const ex of [-6, 6]) {
        ctx.fillStyle = '#f3ead8';
        ctx.beginPath();
        ctx.ellipse(cx + ex * u, cy + 2 * u, 3.4 * u, 3 * u, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#11151c';
        ctx.fillRect(cx + ex * u - 2.2 * u, cy + 1.4 * u, 4.4 * u, 1.3 * u);
      }
      ctx.restore();
    }
    hit(x, y) {
      const G = this.eco.game;
      const u = G.unit;
      const cx = G.W - 42 * u;
      const cy = G.world.sandY(cx) - 26 * u;
      return this.appear > 0.5 && Math.abs(x - cx) < 40 * u && Math.abs(y - cy) < 34 * u;
    }
  }

  /* ============================================================
   * 瓶中信：留給以後
   * ============================================================ */
  class Bottle {
    constructor(entry, index, eco) {
      this.kind = 'bottle';
      this.entry = entry;
      this.eco = eco;
      const r = seedOf(entry.id + 'b');
      this.xf = 0.12 + ((index * 0.23 + r() * 0.12) % 0.76);
      this.ph = r() * TAU;
      this.appear = 1;
    }
    update(dt) {
      if (this.appear < 1) this.appear = Math.min(1, this.appear + dt * 0.6);
    }
    pos() {
      const G = this.eco.game;
      const t = this.eco.t;
      return [this.xf * G.W + Math.sin(t * 0.2 + this.ph) * 20, 16 + Math.sin(t * 1.1 + this.ph) * 3];
    }
    draw(ctx) {
      const G = this.eco.game;
      const u = G.unit;
      const t = this.eco.t;
      const [x, y] = this.pos();
      ctx.save();
      ctx.globalAlpha = this.appear;
      ctx.translate(x, y);
      ctx.rotate(-0.25 + Math.sin(t * 0.9 + this.ph) * 0.12);
      ctx.scale(u * 0.75, u * 0.75);
      ctx.globalCompositeOperation = 'lighter';
      U.drawGlow(ctx, 0, 0, 70, 160, 0.5, 0.7, 0.45);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(160,230,210,0.28)';
      ctx.strokeStyle = 'rgba(210,250,235,0.7)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-20, -9, 32, 18, 7);
      else ctx.rect(-20, -9, 32, 18);
      ctx.rect(12, -4, 9, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#a57b55';
      ctx.fillRect(20, -3.5, 5, 7);
      ctx.fillStyle = '#f1e4c6';
      ctx.fillRect(-14, -4.5, 20, 9);
      ctx.restore();
    }
    hit(x, y) {
      const [bx, by] = this.pos();
      return Math.hypot(x - bx, y - by) < 26 * this.eco.game.unit + 8;
    }
  }

  /* ============================================================
   * 變身：一顆心情的光球落下來，炸開，變成生物
   * ============================================================ */
  class Orb {
    constructor(entry, eco, onBurst, from) {
      this.entry = entry;
      this.eco = eco;
      this.onBurst = onBurst;
      const G = eco.game;
      this.x = from ? from.x : G.W * 0.5;
      this.y = from ? from.y : -30;
      this.ty = from ? from.y : G.H * 0.38;
      this.age = 0;
      this.words = (entry.words || []).join('、');
    }
    update(dt) {
      this.age += dt;
      this.y += (this.ty - this.y) * Math.min(1, dt * 2.2);
      if (this.age > 2.1 && !this.burst) {
        this.burst = true;
        if (this.onBurst) this.onBurst(this.x, this.y);
      }
    }
    draw(ctx) {
      if (this.burst) return;
      const G = this.eco.game;
      const u = G.unit;
      const hue = famHue(this.entry.fam);
      const sat = famSat(this.entry.fam);
      const k = Math.min(1, this.age / 0.6);
      const grow = this.age > 1.5 ? 1 + (this.age - 1.5) * 0.9 : 1;
      const r = 26 * u * grow;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      U.drawGlow(ctx, this.x, this.y, r * 6, hue, sat, 0.62, k);
      ctx.strokeStyle = U.hsla(hue, sat, 0.85, 0.5 * k);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, TAU);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = Math.round(15 * Math.max(0.8, u)) + 'px ' + MJ.FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,250,240,' + (0.9 * k).toFixed(3) + ')';
      ctx.fillText(this.words, this.x, this.y);
      ctx.restore();
    }
  }

  /* ============================================================
   * 生態系本身
   * ============================================================ */
  class Eco {
    constructor(game) {
      this.game = game;
      this.t = 0;
      this.larvae = [];
      this.crabs = [];
      this.spare = [];
      this.lanterns = [];
      this.schools = {};
      this.anemones = [];
      this.turtles = [];
      this.seahorses = [];
      this.tears = new Tears(this);
      this.reefs = [new Reef(0.17, this), new Reef(0.74, this)];
      this.oysters = [];
      this.octopus = null;
      this.bottles = [];
      this.orbs = [];
      this.assign = null;
      this.fresh = false;
    }

    get entries() {
      return this.game.state.entries;
    }
    get eco() {
      return this.game.state.eco;
    }

    /** 從紀錄重建所有生物；回傳這次發生的關係事件 */
    rebuild(fresh) {
      this.fresh = !!fresh;
      const E = this.entries;
      const now = Date.now();
      const events = [];

      // 一週沒被決定的幼生，自己化成藍眼淚
      for (const e of E) {
        if (!e.turn && now - e.t > 7 * DAY) {
          e.turn = 'release';
          e.tt = now;
          e.auto = true;
        }
      }

      const reuse = (list, key, make) => {
        const old = list.find((c) => c.key === key);
        if (old) return old;
        const c = make();
        c.key = key;
        if (this.fresh) c.appear = 0;
        return c;
      };

      this.larvae = E.filter((e) => !e.turn)
        .slice(-8)
        .map((e) => reuse(this.larvae, e.id, () => new Larva(e, this)));

      // 寄居蟹與殼：大的蟹配大的殼，新的殼一來就會一路換下去
      const crabE = E.filter((e) => e.turn === 'reframe').slice(-8);
      this.crabs = crabE.map((e) => reuse(this.crabs, e.id, () => new Crab(e, this)));
      const shells = crabE.map((e) => {
        const lens = F.LENSES[e.lens] || F.LENSES.friend;
        return { id: e.id, type: lens.shell, size: 0.8 + seedOf(e.id + 's')() * 0.35, lens: e.lens };
      });
      const gifts = (this.eco.gifts || []).filter((g) => !g.revealAt || g.revealAt <= now).slice(-6);
      for (const g of gifts) shells.push({ id: g.id, type: g.type, size: g.size, gift: true });
      shells.sort((a, b) => b.size - a.size);
      const bySize = this.crabs.slice().sort((a, b) => b.size - a.size);
      const newAssign = {};
      bySize.forEach((c, i) => {
        c.shell = shells[i] || null;
        newAssign[c.key] = c.shell ? c.shell.id : null;
      });
      let moved = 0;
      if (this.assign) {
        for (const c of this.crabs) {
          if (this.assign[c.key] !== undefined && this.assign[c.key] !== newAssign[c.key]) {
            c.hop = 1;
            moved++;
          }
        }
      }
      if (moved >= 1 && this.assign) events.push({ type: 'chain', n: moved });
      this.assign = newAssign;
      this.spare = shells.slice(bySize.length).map((s) => reuse(this.spare, 'shell' + s.id, () => new SpareShell(s, this)));

      // 燈籠魚：依需要成群
      const fish = [];
      for (const e of E) if (e.turn === 'need') for (const n of (e.needs || []).slice(0, 2)) fish.push([e, n]);
      this.lanterns = fish.slice(-36).map(([e, n]) => reuse(this.lanterns, e.id + ':' + n, () => new Lantern(e, n, this)));
      const counts = {};
      for (const f of this.lanterns) counts[f.need] = (counts[f.need] || 0) + 1;
      for (const n of Object.keys(counts)) {
        if (!this.schools[n]) {
          const r = seedOf('school' + n);
          this.schools[n] = { x: this.game.W * (0.2 + r() * 0.6), y: this.game.H * 0.45, ph: r() * 100 };
        }
        this.schools[n].count = counts[n];
      }

      // 海葵與小丑魚：三份溫柔話長一株海葵
      const kindE = E.filter((e) => e.turn === 'kind').slice(-15);
      const groups = [];
      for (let i = 0; i < kindE.length; i += 3) groups.push(kindE.slice(i, i + 3));
      this.anemones = groups.map((g) => {
        const a = reuse(this.anemones, g[0].id, () => new KindAnemone(g, this));
        a.entries = g;
        a.fish = g.map((e) => a.fish.find((f) => f.entry.id === e.id) || Object.assign(new Clownfish(e, a, this), { appear: this.fresh ? 0 : 1 }));
        return a;
      });

      // 海龜
      this.stepsDone = E.filter((e) => e.turn === 'step' && e.step && e.step.status === 'done').length;
      const stepE = E.filter((e) => e.turn === 'step' && e.step && e.step.status !== 'dropped').slice(-4);
      this.turtles = stepE.map((e) => reuse(this.turtles, e.id, () => new Turtle(e, this)));

      // 海馬：先著陸
      const groundE = E.filter((e) => e.turn === 'ground').slice(-8);
      this.seahorses = groundE.map((e) => reuse(this.seahorses, e.id, () => new Seahorse(e, this)));

      // 藍眼淚：三天內倒出來的
      this.tears.setEntries(E.filter((e) => e.turn === 'release' && now - (e.tt || e.t) < 3 * DAY));

      // 珊瑚礁
      const reefE = E.filter((e) => e.turn === 'savor' || e.turn === 'thank').slice(-40);
      const before = this.reefs[0].fish.length + this.reefs[1].fish.length;
      this.reefs[0].setEntries(reefE.slice(0, 20));
      this.reefs[1].setEntries(reefE.slice(20));
      const after = this.reefs[0].fish.length + this.reefs[1].fish.length;
      if (before === 0 && after > 0 && this.fresh) events.push({ type: 'chromis' });

      // 珍珠貝：同一種感覺來了三次以上
      const byFam = {};
      for (const e of E) if (e.turn && e.fam) (byFam[e.fam] = byFam[e.fam] || []).push(e);
      const oy = Object.keys(byFam)
        .filter((f) => byFam[f].length >= 3)
        .sort((a, b) => byFam[b][byFam[b].length - 1].t - byFam[a][byFam[a].length - 1].t)
        .slice(0, 4);
      this.oysters = oy.map((f) => {
        const o = reuse(this.oysters, 'oy' + f, () => new Oyster(f, this));
        const chain = pearlChain(byFam[f]);
        const done = chain.done.length;
        if (o.pearls != null && done > o.pearls && this.fresh) events.push({ type: 'pearl', fam: f });
        o.pearls = done;
        o.layers = chain.cur;
        return o;
      });

      // 章魚：一個月內用過四種以上的陪法
      const recent = new Set(E.filter((e) => e.turn && now - (e.tt || e.t) < 30 * DAY).map((e) => e.turn));
      if (recent.size >= 4) {
        if (!this.octopus) {
          this.octopus = new Octopus(this);
          if (!this.fresh) this.octopus.appear = 1;
          else events.push({ type: 'octopus' });
        }
        this.octopus.turns = Array.from(recent);
      } else this.octopus = null;

      // 瓶中信
      const keepE = E.filter((e) => e.turn === 'keep').slice(-4);
      this.bottles = keepE.map((e, i) => reuse(this.bottles, e.id, () => new Bottle(e, i, this)));

      // 物種登錄
      const sp = this.eco.species;
      const mark = (id, ok) => {
        if (ok && !sp[id]) {
          sp[id] = now;
          if (this.fresh) events.push({ type: 'species', id });
        }
      };
      mark('larva', this.larvae.length > 0);
      mark('jelly', E.some((e) => e.turn === 'allow'));
      mark('crab', this.crabs.length > 0);
      mark('lantern', this.lanterns.length > 0);
      mark('clown', this.anemones.length > 0);
      mark('turtle', this.turtles.length > 0);
      mark('seahorse', this.seahorses.length > 0);
      mark('tears', E.some((e) => e.turn === 'release'));
      mark('coral', reefE.length > 0);
      mark('bottle', keepE.length > 0);
      mark('oyster', this.oysters.length > 0);
      mark('octopus', !!this.octopus);

      this.fresh = false;
      return events;
    }

    /** 所有完成的珍珠（給潮汐圖用） */
    pearls() {
      const byFam = {};
      for (const e of this.entries) if (e.turn && e.fam) (byFam[e.fam] = byFam[e.fam] || []).push(e);
      const out = [];
      for (const f of Object.keys(byFam)) for (const p of pearlChain(byFam[f]).done) out.push(Object.assign({ fam: f }, p));
      return out.sort((a, b) => b.t - a.t);
    }

    /** 棲地（商店買的）：不會變出生物，只改變牠們待的地方 */
    habitat(type) {
      return this.game.state.decor.find((d) => d.type === type) || null;
    }
    bedX() {
      const b = this.habitat('seagrass');
      return b ? b.x : null;
    }

    spawnOrb(entry, onBurst, from) {
      this.orbs.push(new Orb(entry, this, onBurst, from));
    }

    disturb(x, y) {
      this.tears.disturb(x, y, 46 * this.game.unit);
    }

    update(dt) {
      this.t += dt;
      const G = this.game;
      // 時段從 MJ.Day 拿（太陽降到一半以下就算晚上），不自己看時鐘
      const night = MJ.Day ? MJ.Day.sun < 0.5 : false;
      // 燈籠魚：晚上游上來、白天沉下去。有礁石洞的話白天待在它的陰影裡；有月光石的話晚上繞著它
      const cave = night ? null : this.habitat('cave');
      const moon = night ? this.habitat('moonstone') : null;
      const u = G.unit;
      for (const n of Object.keys(this.schools)) {
        const s = this.schools[n];
        let tx;
        let ty;
        if (cave) {
          const cx = cave.x * G.W;
          tx = cx + (U.noise(this.t * 0.05 + s.ph) - 0.5) * 110 * u;
          ty = G.world.sandY(cx) - (34 + U.noise(this.t * 0.04 + s.ph + 20) * 36) * u;
        } else if (moon) {
          const mx = moon.x * G.W;
          const a = this.t * 0.25 + s.ph;
          tx = mx + Math.cos(a) * 90 * u;
          ty = G.world.sandY(mx) - 120 * u + Math.sin(a) * 36 * u;
        } else {
          tx = G.W * (0.15 + U.noise(this.t * 0.02 + s.ph) * 0.7);
          const baseY = night ? 0.26 : 0.56;
          ty = G.H * (baseY + (U.noise(this.t * 0.03 + s.ph + 40) - 0.5) * 0.2);
        }
        s.x += (tx - s.x) * Math.min(1, dt * 0.15);
        s.y += (ty - s.y) * Math.min(1, dt * 0.1);
      }
      for (const c of this.larvae) c.update(dt);
      for (const c of this.crabs) c.update(dt);
      for (const c of this.spare) c.update(dt);
      for (const f of this.lanterns) f.update(dt, this.schools[f.need]);
      for (const a of this.anemones) a.update(dt);
      for (const tt of this.turtles) tt.update(dt);
      for (const h of this.seahorses) h.update(dt);
      this.tears.update(dt);
      for (const r of this.reefs) r.update(dt);
      for (const o of this.oysters) o.update(dt);
      if (this.octopus) this.octopus.update(dt);
      for (const b of this.bottles) b.update(dt);
      for (let i = this.orbs.length - 1; i >= 0; i--) {
        this.orbs[i].update(dt);
        if (this.orbs[i].burst) this.orbs.splice(i, 1);
      }
    }

    /** 海底：在水母後面 */
    drawFloor(ctx) {
      for (const r of this.reefs) r.draw(ctx);
      for (const a of this.anemones) a.draw(ctx);
      for (const o of this.oysters) o.draw(ctx);
      if (this.octopus) this.octopus.draw(ctx);
      for (const h of this.seahorses) h.draw(ctx);
      for (const s of this.spare) s.draw(ctx);
      for (const c of this.crabs) c.draw(ctx);
      for (const tt of this.turtles) if (!tt.done && tt.journey <= 0) tt.draw(ctx);
    }

    /** 中層：魚群、幼生、游泳的海龜 */
    drawMid(ctx) {
      for (const f of this.lanterns) f.draw(ctx);
      for (const r of this.reefs) r.drawFish(ctx);
      for (const a of this.anemones) a.drawFish(ctx);
      for (const tt of this.turtles) if (tt.done || tt.journey > 0) tt.draw(ctx);
      for (const c of this.larvae) c.draw(ctx);
    }

    /** 最上層：藍眼淚、海面的瓶子、正在變身的光球 */
    drawTop(ctx) {
      this.tears.draw(ctx);
      for (const b of this.bottles) b.draw(ctx);
      for (const o of this.orbs) o.draw(ctx);
    }

    /** 點到了哪一隻 */
    hit(x, y) {
      for (const b of this.bottles) if (b.hit(x, y)) return b;
      for (const c of this.larvae) if (c.hit(x, y)) return c;
      for (const a of this.anemones) for (const f of a.fish) if (f.hit(x, y)) return f;
      for (let i = this.lanterns.length - 1; i >= 0; i--) if (this.lanterns[i].hit(x, y)) return this.lanterns[i];
      for (const tt of this.turtles) if (tt.hit(x, y)) return tt;
      for (const h of this.seahorses) if (h.hit(x, y)) return h;
      for (const c of this.crabs) if (c.hit(x, y)) return c;
      for (const o of this.oysters) if (o.hit(x, y)) return o;
      if (this.octopus && this.octopus.hit(x, y)) return this.octopus;
      for (const a of this.anemones) if (a.hit(x, y)) return a;
      for (const r of this.reefs) {
        const it = r.itemAt(x, y);
        if (it) return { kind: 'coral', item: it, reef: r };
      }
      for (const s of this.spare) if (s.hit(x, y)) return s;
      return null;
    }

    /** 新生出來的那隻，用來把光點引過去 */
    find(entryId) {
      const all = [].concat(this.larvae, this.crabs, this.lanterns, this.turtles, this.seahorses, this.bottles);
      for (const c of all) if (c.entry && c.entry.id === entryId) return c;
      for (const a of this.anemones) for (const f of a.fish) if (f.entry.id === entryId) return f;
      return null;
    }
  }

  Eco.drawShell = drawShell;
  MJ.Eco = Eco;
})((window.MJ = window.MJ || {}));
