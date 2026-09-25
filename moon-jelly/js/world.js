/* 海月水母館 — 海：背景、光束、海雪、氣泡、海草、主題特效 */
(function (MJ) {
  'use strict';

  const U = MJ.U;

  const THEMES = {
    night: {
      name: '深夜藍', price: 0, desc: '最初的那片海。安靜的深藍，剛剛好。',
      grad: ['#14405e', '#0c2a45', '#07192d', '#040d19'],
      ray: [170, 220, 240], rayA: 0.06, snow: [190, 225, 238], snowN: 1,
      sand: ['#16304a', '#0a1828'], sandLine: [120, 180, 205],
      weed: [165, 200], weedSat: 0.38, weedLight: 0.24, glow: 1, swatch: '#1b4a6b',
    },
    dusk: {
      name: '黃昏珊瑚', price: 300, desc: '夕陽沉進海裡的那一刻，水是粉紫色的。',
      grad: ['#7a4674', '#4b3264', '#271e48', '#120f28'],
      ray: [255, 196, 170], rayA: 0.08, snow: [255, 215, 205], snowN: 1,
      sand: ['#3d2b4d', '#1d1731'], sandLine: [255, 180, 170],
      weed: [318, 350], weedSat: 0.32, weedLight: 0.3, glow: 1, swatch: '#7a4674',
    },
    moon: {
      name: '滿月之夜', price: 400, desc: '從水裡也看得到月亮。今晚的月色很美。',
      grad: ['#1e4068', '#132d4d', '#0a1b33', '#050e1e'],
      ray: [230, 238, 255], rayA: 0.05, snow: [220, 230, 250], snowN: 1,
      sand: ['#1c2c45', '#0d172a'], sandLine: [200, 215, 250],
      weed: [175, 205], weedSat: 0.3, weedLight: 0.24, glow: 1.05, fx: 'moon', swatch: '#2a4f7a',
    },
    abyss: {
      name: '無光深淵', price: 450, desc: '陽光到不了的地方，只剩水母自己的光。',
      grad: ['#08141f', '#050d17', '#03080f', '#010408'],
      ray: [120, 170, 220], rayA: 0, snow: [150, 190, 230], snowN: 1.8,
      sand: ['#0b1520', '#04080d'], sandLine: [70, 110, 150],
      weed: [200, 235], weedSat: 0.3, weedLight: 0.13, glow: 1.45, fx: 'abyss', swatch: '#0a1622',
    },
    sakura: {
      name: '櫻花淺灘', price: 500, desc: '春天的淺灘，花瓣一片一片落進海裡。',
      grad: ['#58709a', '#3b5480', '#223559', '#111c37'],
      ray: [255, 222, 236], rayA: 0.075, snow: [255, 228, 238], snowN: 0.8,
      sand: ['#3a4766', '#1e2745'], sandLine: [255, 205, 225],
      weed: [115, 150], weedSat: 0.3, weedLight: 0.3, glow: 0.95, fx: 'petals', swatch: '#6f86b0',
    },
    aurora: {
      name: '極光冰海', price: 650, desc: '北方的冰海，頭頂掛著一條會流動的光。',
      grad: ['#0f3d4b', '#0b2b3f', '#071a2d', '#030b17'],
      ray: [170, 255, 225], rayA: 0.03, snow: [215, 248, 245], snowN: 1.1,
      sand: ['#163340', '#0a1a23'], sandLine: [150, 240, 220],
      weed: [150, 178], weedSat: 0.35, weedLight: 0.22, glow: 1.12, fx: 'aurora', swatch: '#14505c',
    },
  };

  class World {
    constructor() {
      this.themeId = 'night';
      this.theme = THEMES.night;
      this.t = 0;
      this.bubbles = [];
      this.snow = [];
      this.weeds = [];
      this.rays = [];
      this.petals = [];
      this.drops = [];
      this.rain = false;
      this.dim = 0; // 晚安模式時變暗
      this.current = 0;
      this.bg = null;
      this.prevBg = null;
      this.fade = 1;
    }

    setTheme(id, instant) {
      if (!THEMES[id]) id = 'night';
      if (id === this.themeId && this.bg) return;
      this.themeId = id;
      this.theme = THEMES[id];
      if (this.W) {
        if (!instant && this.bg) {
          this.prevBg = this.bg;
          this.fade = 0;
        }
        this.bg = this.renderBg();
        this.buildWeeds();
        this.buildSnow();
      }
    }

    resize(W, H, dpr, unit) {
      this.W = W;
      this.H = H;
      this.dpr = dpr;
      this.unit = unit;
      // 海床要高過底部選單，住在沙地上的生物才不會被擋住
      this.floorY = H - Math.max(U.clamp(H * 0.11, 58, 112), 120);
      this.bg = this.renderBg();
      this.prevBg = null;
      this.fade = 1;
      this.buildWeeds();
      this.buildSnow();
      this.buildRays();
      this.buildPetals();
      this.auroraSprites = null;
    }

    /** 海床的高度（有起伏） */
    sandY(x) {
      return this.floorY + Math.sin(x * 0.0042 + 1.3) * 5 + Math.sin(x * 0.011 + 0.4) * 2.5;
    }

    renderBg() {
      const { W, H, dpr } = this;
      const th = this.theme;
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(W * dpr));
      c.height = Math.max(1, Math.round(H * dpr));
      const g = c.getContext('2d');
      g.scale(dpr, dpr);

      const grd = g.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, th.grad[0]);
      grd.addColorStop(0.35, th.grad[1]);
      grd.addColorStop(0.7, th.grad[2]);
      grd.addColorStop(1, th.grad[3]);
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);

      // 暗角
      const vg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.25, W / 2, H * 0.5, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,4,10,0.45)');
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);

      // 遠方的礁石剪影
      const rnd = U.seeded(7 + W);
      g.fillStyle = 'rgba(2,8,16,0.28)';
      g.beginPath();
      g.moveTo(0, H);
      let x = 0;
      g.lineTo(0, this.floorY - 30 - rnd() * 40);
      while (x < W) {
        x += 40 + rnd() * 90;
        g.lineTo(x, this.floorY - 10 - rnd() * 70 * (0.4 + 0.6 * Math.abs(Math.sin(x * 0.003))));
      }
      g.lineTo(W, H);
      g.closePath();
      g.fill();

      // 沙地
      const sg = g.createLinearGradient(0, this.floorY - 8, 0, H);
      sg.addColorStop(0, th.sand[0]);
      sg.addColorStop(1, th.sand[1]);
      g.fillStyle = sg;
      g.beginPath();
      g.moveTo(0, H);
      for (let px = 0; px <= W + 8; px += 8) g.lineTo(px, this.sandY(px));
      g.lineTo(W, H);
      g.closePath();
      g.fill();

      // 沙地上緣的一道微光
      const [lr, lg, lb] = th.sandLine;
      g.strokeStyle = 'rgba(' + lr + ',' + lg + ',' + lb + ',0.16)';
      g.lineWidth = 1.2;
      g.beginPath();
      for (let px = 0; px <= W + 8; px += 8) {
        const y = this.sandY(px) + 0.5;
        if (px === 0) g.moveTo(px, y);
        else g.lineTo(px, y);
      }
      g.stroke();

      // 沙紋
      g.strokeStyle = 'rgba(' + lr + ',' + lg + ',' + lb + ',0.05)';
      g.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const yy = this.floorY + 12 + i * ((H - this.floorY) / 7);
        g.beginPath();
        for (let px = 0; px <= W; px += 10) {
          const y = yy + Math.sin(px * 0.02 + i * 1.7) * 2.2;
          if (px === 0) g.moveTo(px, y);
          else g.lineTo(px, y);
        }
        g.stroke();
      }

      // 小石子
      const pr = U.seeded(99 + H);
      const pebbles = Math.floor(W / 14);
      for (let i = 0; i < pebbles; i++) {
        const px = pr() * W;
        const py = this.sandY(px) + 6 + pr() * (H - this.floorY - 8);
        const r = 0.8 + pr() * 2.6;
        const light = pr() < 0.5;
        g.fillStyle = light ? 'rgba(' + lr + ',' + lg + ',' + lb + ',0.1)' : 'rgba(0,0,0,0.22)';
        g.beginPath();
        g.ellipse(px, py, r * 1.4, r, 0, 0, U.TAU);
        g.fill();
      }
      return c;
    }

    buildWeeds() {
      const { W } = this;
      const th = this.theme;
      const rnd = U.seeded(3 + Math.round(W));
      this.weeds = [];
      const n = Math.max(6, Math.round(W / 70));
      for (let i = 0; i < n; i++) {
        // 中間留空，讓水母有地方游
        let fx = rnd();
        if (fx > 0.3 && fx < 0.7 && rnd() < 0.7) fx = fx < 0.5 ? fx * 0.6 : 1 - (1 - fx) * 0.6;
        const front = rnd() < 0.22;
        const h = (front ? 40 + rnd() * 50 : 60 + rnd() * 120) * this.unit;
        this.weeds.push({
          x: fx * W,
          h,
          segs: 10,
          hue: U.lerp(th.weed[0], th.weed[1], rnd()),
          light: th.weedLight * (front ? 0.55 : 1) * (0.8 + rnd() * 0.4),
          sat: th.weedSat,
          w: (4 + rnd() * 5) * this.unit,
          phase: rnd() * 10,
          front,
          blades: 1 + Math.floor(rnd() * 3),
        });
      }
    }

    buildSnow() {
      const { W, H } = this;
      const n = Math.min(280, Math.round(((W * H) / 8500) * (this.theme.snowN || 1)));
      this.snow = [];
      for (let i = 0; i < n; i++) {
        this.snow.push({
          x: Math.random() * W,
          y: Math.random() * H,
          z: U.rand(0.25, 1),
          r: U.rand(0.5, 1.6),
          tw: U.rand(U.TAU),
          bio: Math.random() < 0.14,
        });
      }
    }

    buildRays() {
      this.rays = [];
      for (let i = 0; i < 6; i++) {
        this.rays.push({
          x: U.rand(0.05, 0.95),
          w: U.rand(0.04, 0.12),
          tilt: U.rand(-0.18, 0.05),
          speed: U.rand(0.08, 0.2),
          phase: U.rand(U.TAU),
          len: U.rand(0.55, 0.85),
        });
      }
    }

    buildPetals() {
      this.petals = [];
      for (let i = 0; i < 28; i++) this.petals.push(this.newPetal(true));
    }

    newPetal(anywhere) {
      const surface = Math.random() < 0.45;
      return {
        x: Math.random() * this.W,
        y: anywhere ? (surface ? U.rand(4, 26) : Math.random() * this.floorY) : -10,
        surface,
        vx: U.rand(-6, 10),
        vy: surface ? 0 : U.rand(6, 14),
        rot: U.rand(U.TAU),
        vr: U.rand(-0.8, 0.8),
        size: U.rand(4, 7) * this.unit,
        hue: U.rand(338, 355),
        phase: U.rand(U.TAU),
      };
    }

    addBubble(x, y, r, o = {}) {
      if (this.bubbles.length > 160) return null;
      const b = {
        x, y,
        r: r || U.rand(1.5, 4.5) * this.unit,
        vy: -U.rand(28, 48),
        phase: U.rand(U.TAU),
        wob: U.rand(4, 10),
        big: !!o.big,
        gold: !!o.gold,
      };
      this.bubbles.push(b);
      return b;
    }

    update(dt, t) {
      this.t = t;
      const { W, H } = this;
      this.current = (U.noise(t * 0.035) - 0.5) * 2;
      if (this.fade < 1) this.fade = Math.min(1, this.fade + dt / 1.6);

      // 海雪
      const cur = this.current * 6;
      for (const s of this.snow) {
        s.y += (3 + 7 * s.z) * dt * this.unit;
        s.x += (Math.sin(t * 0.25 + s.tw) * 2.5 + cur) * s.z * dt;
        if (s.y > H + 4) {
          s.y = -4;
          s.x = Math.random() * W;
        }
        if (s.x < -4) s.x = W + 4;
        else if (s.x > W + 4) s.x = -4;
      }

      // 氣泡
      for (let i = this.bubbles.length - 1; i >= 0; i--) {
        const b = this.bubbles[i];
        b.y += b.vy * dt * (b.big ? 0.6 : 1);
        b.x += Math.cos(t * 3 + b.phase) * b.wob * dt;
        if (b.y < 10) {
          this.bubbles.splice(i, 1);
        }
      }
      // 海底偶爾冒泡
      if (Math.random() < dt * 0.8) {
        const x = U.rand(W);
        const n = U.randInt(1, 4);
        for (let i = 0; i < n; i++) this.addBubble(x + U.rand(-4, 4), this.sandY(x) - i * 8);
      }

      if (this.theme.fx === 'petals') {
        for (let i = 0; i < this.petals.length; i++) {
          const p = this.petals[i];
          p.rot += p.vr * dt;
          if (p.surface) {
            p.x += (p.vx + cur * 2) * dt;
            p.y = 12 + Math.sin(t * 0.9 + p.phase) * 3;
            if (Math.random() < dt * 0.02) {
              p.surface = false;
              p.vy = U.rand(6, 12);
            }
          } else if (p.vy > 0) {
            p.x += (p.vx * 0.4 + Math.sin(t + p.phase) * 8 + cur) * dt;
            p.y += p.vy * dt;
            if (p.y > this.sandY(p.x) - 2) {
              p.vy = 0;
              p.vr = 0;
            }
          }
          if (p.x < -20) p.x = W + 20;
          if (p.x > W + 20) p.x = -20;
          if (!p.surface && p.vy === 0) {
            p.settled = (p.settled || 0) + dt;
            if (p.settled > 14) this.petals[i] = Object.assign(this.newPetal(false), { surface: true, y: 12 });
          }
        }
      }

      if (this.rain) {
        if (Math.random() < dt * 9) {
          this.drops.push({ x: Math.random() * W, y: U.rand(6, 20), age: 0 });
        }
        for (let i = this.drops.length - 1; i >= 0; i--) {
          this.drops[i].age += dt;
          if (this.drops[i].age > 1.1) this.drops.splice(i, 1);
        }
      } else if (this.drops.length) this.drops.length = 0;
    }

    /** 水母後面的一切 */
    drawBack(ctx) {
      const { W, H, t } = this;
      const th = this.theme;
      if (this.prevBg && this.fade < 1) {
        ctx.drawImage(this.prevBg, 0, 0, W, H);
        ctx.globalAlpha = this.fade;
        ctx.drawImage(this.bg, 0, 0, W, H);
        ctx.globalAlpha = 1;
      } else ctx.drawImage(this.bg, 0, 0, W, H);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      if (th.fx === 'aurora') this.drawAurora(ctx);
      if (th.fx === 'moon') this.drawMoon(ctx);

      // 光束
      if (th.rayA > 0) {
        const [r, g, b] = th.ray;
        const hour = new Date().getHours();
        const dayK = hour >= 7 && hour < 18 ? 1.25 : 0.85;
        for (const ray of this.rays) {
          const a = th.rayA * dayK * (0.55 + 0.45 * Math.sin(t * ray.speed + ray.phase)) * (1 - this.dim);
          if (a < 0.004) continue;
          const x0 = ray.x * W + Math.sin(t * 0.05 + ray.phase) * 20;
          const w0 = ray.w * W;
          const len = H * ray.len;
          const x1 = x0 + ray.tilt * len;
          const grd = ctx.createLinearGradient(0, 0, 0, len);
          grd.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')');
          grd.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.moveTo(x0 - w0 / 2, 0);
          ctx.lineTo(x0 + w0 / 2, 0);
          ctx.lineTo(x1 + w0 * 1.2, len);
          ctx.lineTo(x1 - w0 * 1.2, len);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 水面的光
      const [sr, sg, sb] = th.ray;
      const sgrd = ctx.createLinearGradient(0, 0, 0, 70);
      sgrd.addColorStop(0, 'rgba(' + sr + ',' + sg + ',' + sb + ',' + (0.13 * (1 - this.dim)).toFixed(3) + ')');
      sgrd.addColorStop(1, 'rgba(' + sr + ',' + sg + ',' + sb + ',0)');
      ctx.fillStyle = sgrd;
      ctx.fillRect(0, 0, W, 70);
      ctx.strokeStyle = 'rgba(' + sr + ',' + sg + ',' + sb + ',' + (0.12 * (1 - this.dim)).toFixed(3) + ')';
      ctx.lineWidth = 1;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 12) {
          const y = 8 + k * 9 + Math.sin(x * 0.018 + t * (0.8 + k * 0.3) + k * 2) * 2.5 + Math.sin(x * 0.047 - t * 1.1) * 1.2;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 海底的焦散光斑
      const [lr, lg, lb] = th.sandLine;
      for (let i = 0; i < 14; i++) {
        const x = ((i / 14) * W + Math.sin(t * 0.13 + i * 1.7) * 60 + W) % W;
        const y = this.sandY(x) + 6 + (i % 3) * 7;
        const a = 0.035 + 0.03 * Math.sin(t * 0.7 + i * 2.1);
        if (a <= 0) continue;
        ctx.fillStyle = 'rgba(' + lr + ',' + lg + ',' + lb + ',' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(x, y, 26 + (i % 4) * 10, 2.2 + (i % 2), 0, 0, U.TAU);
        ctx.fill();
      }
      ctx.restore();

      // 海雪
      const [nr, ng, nb] = th.snow;
      for (const s of this.snow) {
        const tw = 0.6 + 0.4 * Math.sin(this.t * 1.3 + s.tw);
        const a = (0.1 + 0.35 * s.z) * tw;
        if (th.fx === 'abyss' && s.bio) {
          const flash = Math.max(0, Math.sin(this.t * 0.8 + s.tw * 3)) ** 8;
          if (flash > 0.05) {
            ctx.globalCompositeOperation = 'lighter';
            U.drawGlow(ctx, s.x, s.y, 16 * s.z + 6, 195, 0.9, 0.6, flash);
            ctx.globalCompositeOperation = 'source-over';
          }
        }
        ctx.fillStyle = 'rgba(' + nr + ',' + ng + ',' + nb + ',' + a.toFixed(3) + ')';
        const r = s.r * s.z;
        ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
      }

      // 後排海草
      for (const w of this.weeds) if (!w.front) this.drawWeed(ctx, w);

      if (th.fx === 'petals') this.drawPetals(ctx, false);
      this.drawDrops(ctx);
    }

    /** 水母前面的東西：前排海草、氣泡、水面的花瓣 */
    drawFront(ctx) {
      for (const w of this.weeds) if (w.front) this.drawWeed(ctx, w);
      this.drawBubbles(ctx);
      if (this.theme.fx === 'petals') this.drawPetals(ctx, true);
      if (this.dim > 0) {
        ctx.fillStyle = 'rgba(1,5,12,' + (this.dim * 0.55).toFixed(3) + ')';
        ctx.fillRect(0, 0, this.W, this.H);
      }
    }

    drawWeed(ctx, w) {
      const t = this.t;
      const base = this.sandY(w.x) + 4;
      for (let b = 0; b < w.blades; b++) {
        const off = (b - (w.blades - 1) / 2) * w.w * 1.3;
        const h = w.h * (1 - b * 0.18);
        const segs = w.segs;
        const segLen = h / segs;
        let x = w.x + off;
        let y = base;
        let ang = -Math.PI / 2 + (b - (w.blades - 1) / 2) * 0.12;
        const L = [];
        const R = [];
        for (let i = 0; i <= segs; i++) {
          const k = i / segs;
          const width = w.w * (1 - k * 0.85) * (0.85 + 0.15 * Math.sin(i * 1.3 + w.phase));
          const nx = Math.cos(ang + Math.PI / 2);
          const ny = Math.sin(ang + Math.PI / 2);
          L.push(x + nx * width * 0.5, y + ny * width * 0.5);
          R.push(x - nx * width * 0.5, y - ny * width * 0.5);
          ang += Math.sin(t * 0.8 + w.phase + i * 0.42 + b) * 0.07 * k + this.current * 0.025 * k;
          x += Math.cos(ang) * segLen;
          y += Math.sin(ang) * segLen;
        }
        ctx.fillStyle = U.hsla(w.hue, w.sat, w.light * (1 - this.dim * 0.6), w.front ? 0.95 : 0.8);
        ctx.beginPath();
        ctx.moveTo(L[0], L[1]);
        for (let i = 2; i < L.length; i += 2) ctx.lineTo(L[i], L[i + 1]);
        for (let i = R.length - 2; i >= 0; i -= 2) ctx.lineTo(R[i], R[i + 1]);
        ctx.closePath();
        ctx.fill();
      }
    }

    drawBubbles(ctx) {
      ctx.lineWidth = 1;
      for (const b of this.bubbles) {
        const a = b.big ? 0.6 : 0.4;
        if (b.gold) {
          ctx.globalCompositeOperation = 'lighter';
          U.drawGlow(ctx, b.x, b.y, b.r * 5, 45, 0.9, 0.6, 0.6);
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.strokeStyle = b.gold
          ? 'rgba(255,225,150,0.75)'
          : b.bonus
          ? U.hsla(this.t * 70 + b.x * 0.5, 0.8, 0.82, 0.8)
          : 'rgba(205,238,248,' + a + ')';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, U.TAU);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.9) + ')';
        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, Math.max(0.6, b.r * 0.28), 0, U.TAU);
        ctx.fill();
      }
    }

    drawPetals(ctx, surfaceOnly) {
      for (const p of this.petals) {
        if (p.surface !== surfaceOnly) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, p.surface ? 0.55 : 0.8 + 0.2 * Math.sin(this.t * 2 + p.phase));
        const s = p.size;
        ctx.fillStyle = U.hsla(p.hue, 0.75, 0.86, p.surface ? 0.85 : 0.7);
        ctx.beginPath();
        ctx.moveTo(0, s);
        ctx.bezierCurveTo(-s * 1.1, s * 0.2, -s * 0.7, -s * 0.9, -s * 0.18, -s * 0.8);
        ctx.lineTo(0, -s * 0.5);
        ctx.lineTo(s * 0.18, -s * 0.8);
        ctx.bezierCurveTo(s * 0.7, -s * 0.9, s * 1.1, s * 0.2, 0, s);
        ctx.fill();
        ctx.restore();
      }
    }

    drawDrops(ctx) {
      if (!this.drops.length) return;
      ctx.lineWidth = 1;
      for (const d of this.drops) {
        const k = d.age / 1.1;
        ctx.strokeStyle = 'rgba(190,225,240,' + ((1 - k) * 0.4).toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, 3 + k * 22, (3 + k * 22) * 0.22, 0, 0, U.TAU);
        ctx.stroke();
      }
    }

    drawMoon(ctx) {
      const { W, t } = this;
      const x = W * 0.74;
      const y = 26;
      const r = Math.min(W, this.H) * 0.06 + 14;
      U.drawGlow(ctx, x, y, r * 9, 215, 0.4, 0.8, 0.55 * (1 - this.dim * 0.5));
      // 從水下看月亮，會被波浪揉得有點歪
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1 + Math.sin(t * 1.1) * 0.05, 0.62 + Math.sin(t * 0.9 + 1) * 0.04);
      ctx.fillStyle = 'rgba(240,244,255,0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, U.TAU);
      ctx.fill();
      ctx.restore();
      // 月光碎在水裡
      for (let i = 0; i < 9; i++) {
        const yy = y + 28 + i * 16 + Math.sin(t * 0.9 + i) * 3;
        const ww = r * (1.4 - i * 0.12) * (0.6 + 0.4 * Math.sin(t * 1.7 + i * 1.3));
        const a = 0.09 * (1 - i / 9);
        ctx.fillStyle = 'rgba(230,238,255,' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(x + Math.sin(t * 0.6 + i * 0.8) * 10, yy, Math.max(1, ww), 1.6, 0, 0, U.TAU);
        ctx.fill();
      }
    }

    drawAurora(ctx) {
      const { W, t } = this;
      if (!this.auroraSprites) {
        this.auroraSprites = [150, 175, 290].map((hue) => {
          const c = document.createElement('canvas');
          c.width = 4;
          c.height = 128;
          const g = c.getContext('2d');
          const grd = g.createLinearGradient(0, 0, 0, 128);
          grd.addColorStop(0, U.hsla(hue, 0.9, 0.6, 0));
          grd.addColorStop(0.55, U.hsla(hue, 0.9, 0.62, 0.55));
          grd.addColorStop(0.8, U.hsla(hue + 20, 0.9, 0.7, 0.8));
          grd.addColorStop(1, U.hsla(hue, 0.9, 0.6, 0));
          g.fillStyle = grd;
          g.fillRect(0, 0, 4, 128);
          return c;
        });
      }
      const step = W > 900 ? 7 : 10;
      const k = 1 - this.dim * 0.5;
      for (let band = 0; band < 3; band++) {
        const img = this.auroraSprites[band];
        const baseY = 18 + band * 24;
        const h = 90 - band * 18;
        for (let x = -step; x < W + step; x += step) {
          const y = baseY + Math.sin(x * 0.0042 + t * 0.18 + band * 2) * 26 + Math.sin(x * 0.012 - t * 0.11 + band) * 10;
          const a = (0.25 + 0.25 * Math.sin(x * 0.009 + t * 0.4 + band * 1.7)) * (band === 2 ? 0.45 : 0.8) * k;
          if (a <= 0.02) continue;
          ctx.globalAlpha = a;
          ctx.drawImage(img, x, y, step + 1, h);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  World.THEMES = THEMES;
  MJ.World = World;
})((window.MJ = window.MJ || {}));
