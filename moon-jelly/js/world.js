/* 海月水母館 — 海：背景、光束、海雪、氣泡、海草、主題特效、日夜 */
(function (MJ) {
  'use strict';

  const U = MJ.U;

  /*
   * 海的顏色（color.md §2.3、§2.7）：情緒上的輕重用亮度和彩度控制，色相只用來分辨是哪一片海。
   * 光束、水面光、極光都不用高飽和的青綠；最深處不低於 OKLCH L 0.14；swatch 一律等於 grad[0]。
   */
  const THEMES = {
    night: {
      name: '深夜藍', price: 0, desc: '最初的那片海。深藍，光束從水面斜照下來。',
      grad: ['#193d54', '#102a3f', '#0a192a', '#080f1c'],
      ray: [200, 218, 226], rayA: 0.05, snow: [200, 214, 222], snowN: 1,
      sand: ['#1a2d3f', '#0d1824'], sandLine: [170, 192, 204],
      weed: [150, 178], weedSat: 0.26, weedLight: 0.23, glow: 1, swatch: '#193d54',
    },
    dusk: {
      name: '黃昏珊瑚', price: 300, desc: '暗粉紫的水，往下漸漸變成深紫。',
      grad: ['#5f3957', '#3d294a', '#221b36', '#100d21'],
      ray: [240, 206, 192], rayA: 0.06, snow: [236, 214, 208], snowN: 1,
      sand: ['#31263a', '#171322'], sandLine: [226, 188, 182],
      weed: [318, 350], weedSat: 0.24, weedLight: 0.26, glow: 1, swatch: '#5f3957',
    },
    moon: {
      name: '滿月之夜', price: 400, desc: '水面上有一輪月亮，月光碎在水裡。',
      grad: ['#213c5a', '#152b45', '#0c192e', '#070f1d'],
      ray: [214, 222, 236], rayA: 0.05, snow: [212, 220, 234], snowN: 1,
      sand: ['#202c3d', '#111723'], sandLine: [196, 208, 232],
      weed: [175, 205], weedSat: 0.26, weedLight: 0.24, glow: 1.05, fx: 'moon', swatch: '#213c5a',
    },
    abyss: {
      name: '無光深淵', price: 450, desc: '沒有光束，只有生物自己的光，海雪偶爾閃一下。',
      grad: ['#0d1822', '#09121c', '#070d16', '#060a11'],
      ray: [120, 170, 220], rayA: 0, snow: [160, 190, 220], snowN: 1.8,
      sand: ['#0d151c', '#070b12'], sandLine: [70, 110, 150],
      weed: [200, 235], weedSat: 0.26, weedLight: 0.13, glow: 1.2, fx: 'abyss', swatch: '#0d1822',
    },
    sakura: {
      name: '櫻花淺灘', price: 500, desc: '白天的淺灘，花瓣從水面落下。夜裡會跟著變暗。',
      grad: ['#4b5e80', '#34476a', '#212f4e', '#101931'],
      ray: [236, 218, 228], rayA: 0.055, snow: [236, 224, 232], snowN: 0.8,
      sand: ['#3b4255', '#202538'], sandLine: [232, 206, 220],
      weed: [115, 150], weedSat: 0.26, weedLight: 0.3, glow: 0.95, fx: 'petals', swatch: '#4b5e80',
    },
    aurora: {
      name: '極光冰海', price: 650, desc: '北方的冰海，水面上有一道流動的極光。',
      grad: ['#143a42', '#0b2a39', '#081a2a', '#060e1b'],
      ray: [196, 228, 222], rayA: 0.03, snow: [210, 232, 230], snowN: 1.1,
      sand: ['#1b3237', '#0d1a20'], sandLine: [160, 206, 198],
      weed: [150, 178], weedSat: 0.26, weedLight: 0.22, glow: 1.12, fx: 'aurora', swatch: '#143a42',
    },
  };

  /*
   * 一天分三段（color.md §2.4，DESIGN §3.4）。不需要使用者設定：
   *   白天 07–18、傍晚 18–21、夜 21–07。夜裡降低總光量，不改文字顏色。
   * 夜裡 body 會加上 is-night（紙換成夜間紙色）。只有在時段改變時才切換 class，
   * 所以別的程式（或測試）手動切換 is-night 時，海也會跟著那個 class 走。
   */
  const NIGHT_RAY = [214, 214, 206];
  const phaseAt = (h) => (h >= 21 || h < 7 ? 'night' : h >= 18 ? 'dusk' : 'day');

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
      this.dim = 0; // 晚安、呼吸、儀式、紙打開時變暗（由 game.js 決定目標值）
      this.current = 0;
      this.bg = null;
      this.prevBg = null;
      this.fade = 1;
      this.depth = 0;
      this.dockY = null;

      // 日夜與模式：K 值都是 0..1，每一幀慢慢靠近目標，不一下子跳
      this.phase = null;
      this.clockT = 0;
      this.dockT = 1;
      this.lit = false;
      this.nightK = 0;
      this.duskK = 0;
      this.sleepK = 0;
      this.hushK = 0;
      this.hudK = 0;
      this.snowSpeed = 1;
      // 由 game.js 每一幀設定
      this.sleep = false; // 晚安模式
      this.hush = 0; // 儀式開著：光束收起來
      this.hushSnow = 1; // 儀式開著時海雪變慢（0.6；危機 0.4）
      this.hud = true; // HUD 在的時候才畫頂部暗帶
      this.lamp = null; // 儀式紀錄表的位置 { x, y, w, h }：後面放一盞檯燈
      this.applyLight();
    }

    /** 目前幾點（測試或截圖時可以用 World.clock 覆寫） */
    hourNow() {
      return World.clock != null ? World.clock : new Date().getHours();
    }

    /** 暫時把時鐘撥到某個小時（null 恢復正常）。立刻重新判斷是白天還是夜裡 */
    setClock(hour) {
      World.clock = hour == null ? null : hour;
      this.clockT = 0;
    }

    get night() {
      return this.nightK > 0.5;
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
      this.layoutFloor();
      this.bg = this.renderBg();
      this.prevBg = null;
      this.fade = 1;
      this.buildWeeds();
      this.buildSnow();
      this.buildRays();
      this.buildPetals();
      this.auroraSprites = null;
    }

    /**
     * 底座（#dock）上緣的位置。模式切換時底座會用 transform 滑出去，
     * 所以固定定位時用 offsetTop（不含 transform）；量不到就回傳 null。
     */
    measureDock() {
      const H = this.H;
      try {
        const d = document.getElementById('dock');
        if (!d) return null;
        const cs = getComputedStyle(d);
        if (cs.display === 'none') return null;
        let top = cs.position === 'fixed' ? d.offsetTop : NaN;
        if (!(top > H * 0.5 && top <= H)) top = d.getBoundingClientRect().top;
        return top > H * 0.5 && top <= H ? Math.round(top) : null;
      } catch (e) {
        return null;
      }
    }

    /**
     * 沙地停在底座上方（DESIGN §8）：floorY 是沙地的後緣，從底座上緣往上算；
     * 底座下面的沙被底座擋住。手機上海底那一帶比較高，住在沙地上的生物可以前後錯開（depth）。
     */
    layoutFloor() {
      const { W, H } = this;
      const dock = this.measureDock();
      this.dockY = dock;
      if (dock != null) {
        const phone = Math.min(W, H) < 500;
        const band = U.clamp(H * (phone ? 0.13 : 0.09), 60, 120);
        this.floorY = dock - band;
        this.depth = band * 0.55;
      } else {
        // 沒有底座（或量不到）：沿用舊的算法
        this.floorY = H - Math.max(U.clamp(H * 0.11, 58, 112), 120);
        this.depth = 0;
      }
    }

    /** 海床的高度（有起伏） */
    sandY(x) {
      return this.floorY + Math.sin(x * 0.0042 + 1.3) * 5 + Math.sin(x * 0.011 + 0.4) * 2.5;
    }

    /** 沙地上的某個深度（dz 0 = 後緣，1 = 最靠近玻璃） */
    groundY(x, dz) {
      return this.sandY(x) + (dz || 0) * this.depth;
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

      // 暗角：四角不壓成黑色，偏靛藍
      const vg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.25, W / 2, H * 0.5, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(4,8,18,0)');
      vg.addColorStop(1, 'rgba(4,8,18,0.32)');
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

      // 沙地：低彩度的石板藍，和水連成一體
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

    /**
     * 日夜、晚安、儀式對光量的影響（color.md §2.4、§6.2）。每一幀更新，全部平滑過渡。
     *   rayK   光束係數：白天 1、傍晚 0.8、夜 0.5；晚安與儀式時收到 0
     *   surfA  水面光：.07／.06／.04；晚安 0
     *   snowK  海雪量：夜 ×0.6、晚安 ×0.4
     *   MJ.Bio.k 生物發光：夜 ×0.85、晚安 ×0.6
     *   dimBase world.dim 的底值：夜 .12（game.js 讀）
     */
    applyLight() {
      const n = this.nightK;
      const s = this.sleepK;
      this.rayK = U.lerp(U.lerp(1, 0.8, this.duskK), 0.5, n) * (1 - s) * (1 - this.hushK);
      this.surfA = U.lerp(U.lerp(0.07, 0.06, this.duskK), 0.04, n) * (1 - s);
      this.snowK = U.lerp(U.lerp(1, 0.6, n), 0.4, s);
      this.dimBase = 0.12 * n;
      if (MJ.Bio) MJ.Bio.k = U.lerp(U.lerp(1, 0.85, n), 0.6, s);
    }

    updateClock(dt) {
      this.clockT -= dt;
      if (this.clockT <= 0 || this.phase == null) {
        this.clockT = 15;
        const ph = phaseAt(this.hourNow());
        if (ph !== this.phase) {
          this.phase = ph;
          if (document.body) document.body.classList.toggle('is-night', ph === 'night');
        }
      }
      const nightT = document.body && document.body.classList.contains('is-night') ? 1 : 0;
      const duskT = this.phase === 'dusk' && !nightT ? 1 : 0;
      const first = !this.lit;
      this.lit = true;
      const ease = (cur, tgt, rate) => (first ? tgt : cur + (tgt - cur) * Math.min(1, dt * rate));
      // 日夜約 8 秒換過去；晚安 1 秒多；儀式開著時光束 1.2 秒內收起，完成後慢慢回來；HUD 暗帶跟著 HUD 400ms
      this.nightK = ease(this.nightK, nightT, 0.35);
      this.duskK = ease(this.duskK, duskT, 0.35);
      this.sleepK = ease(this.sleepK, this.sleep ? 1 : 0, 0.9);
      this.hushK = ease(this.hushK, this.hush, this.hush > this.hushK ? 2.5 : 0.8);
      this.hudK = ease(this.hudK, this.hud ? 1 : 0, 6);
      this.snowSpeed = ease(this.snowSpeed, this.hushSnow, 1.5);
      this.applyLight();

      // 底座的位置改變了（例如介面換了版型、手機轉向），沙地跟著移
      this.dockT -= dt;
      if (this.dockT <= 0 && this.W) {
        this.dockT = 1;
        const d = this.measureDock();
        if ((d == null) !== (this.dockY == null) || (d != null && Math.abs(d - this.dockY) > 2)) {
          this.layoutFloor();
          this.bg = this.renderBg();
          this.prevBg = null;
          this.fade = 1;
        }
      }
    }

    update(dt, t) {
      this.t = t;
      const { W, H } = this;
      this.updateClock(dt);
      this.current = (U.noise(t * 0.035) - 0.5) * 2;
      if (this.fade < 1) this.fade = Math.min(1, this.fade + dt / 1.6);

      // 海雪
      const cur = this.current * 6;
      const sp = this.snowSpeed;
      for (const s of this.snow) {
        s.y += (3 + 7 * s.z) * dt * this.unit * sp;
        s.x += (Math.sin(t * 0.25 + s.tw) * 2.5 + cur) * s.z * dt * sp;
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

    /** 光束的顏色：夜裡偏向極淡的暖白 */
    rayColor() {
      const r = this.theme.ray;
      const k = this.nightK;
      return [Math.round(U.lerp(r[0], NIGHT_RAY[0], k)), Math.round(U.lerp(r[1], NIGHT_RAY[1], k)), Math.round(U.lerp(r[2], NIGHT_RAY[2], k))];
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

      const [r, g, b] = this.rayColor();
      // 光束
      const rayK = this.rayK * (1 - this.dim);
      if (th.rayA > 0 && rayK > 0.01) {
        for (const ray of this.rays) {
          const a = th.rayA * rayK * (0.55 + 0.45 * Math.sin(t * ray.speed + ray.phase));
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

      // 水面的光（上限 .07，夜裡 .04）
      const surf = this.surfA * (1 - this.dim);
      if (surf > 0.002) {
        const sgrd = ctx.createLinearGradient(0, 0, 0, 70);
        sgrd.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + surf.toFixed(3) + ')');
        sgrd.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
        ctx.fillStyle = sgrd;
        ctx.fillRect(0, 0, W, 70);
        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (surf * 0.9).toFixed(3) + ')';
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
      }

      // 海底的焦散光斑
      const [lr, lg, lb] = th.sandLine;
      const ck = (1 - this.sleepK * 0.6) * (1 - this.dim * 0.5);
      for (let i = 0; i < 14; i++) {
        const x = ((i / 14) * W + Math.sin(t * 0.13 + i * 1.7) * 60 + W) % W;
        const y = this.sandY(x) + 6 + (i % 3) * 7;
        const a = (0.035 + 0.03 * Math.sin(t * 0.7 + i * 2.1)) * ck;
        if (a <= 0) continue;
        ctx.fillStyle = 'rgba(' + lr + ',' + lg + ',' + lb + ',' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(x, y, 26 + (i % 4) * 10, 2.2 + (i % 2), 0, 0, U.TAU);
        ctx.fill();
      }
      ctx.restore();

      // 頂部暗帶：HUD 直接寫在水上，次要字靠它過 AA（全站唯一的介面漸層，理由是可讀性）
      if (this.hudK > 0.01) {
        const band = ctx.createLinearGradient(0, 0, 0, 120);
        band.addColorStop(0, 'rgba(15,22,27,' + (0.4 * this.hudK).toFixed(3) + ')');
        band.addColorStop(1, 'rgba(15,22,27,0)');
        ctx.fillStyle = band;
        ctx.fillRect(0, 0, W, 120);
      }

      // 海雪（夜裡變少）
      const [nr, ng, nb] = th.snow;
      const total = this.snow.length;
      const shown = total * this.snowK;
      for (let i = 0; i < total; i++) {
        const cut = U.clamp(shown - i, 0, 1);
        if (cut <= 0) break;
        const s = this.snow[i];
        const tw = 0.6 + 0.4 * Math.sin(this.t * 1.3 + s.tw);
        const a = (0.1 + 0.35 * s.z) * tw * cut;
        if (th.fx === 'abyss' && s.bio) {
          const flash = Math.max(0, Math.sin(this.t * 0.8 + s.tw * 3)) ** 8;
          if (flash > 0.05) {
            ctx.globalCompositeOperation = 'lighter';
            MJ.glow(ctx, s.x, s.y, 16 * s.z + 6, 195, 0.9, 0.6, flash * 0.7 * cut);
            ctx.globalCompositeOperation = 'source-over';
          }
        }
        ctx.fillStyle = 'rgba(' + nr + ',' + ng + ',' + nb + ',' + a.toFixed(3) + ')';
        const rr = s.r * s.z;
        ctx.fillRect(s.x - rr, s.y - rr, rr * 2, rr * 2);
      }

      // 後排海草
      for (const w of this.weeds) if (!w.front) this.drawWeed(ctx, w);

      if (th.fx === 'petals') this.drawPetals(ctx, false);
      this.drawDrops(ctx);
    }

    /** 水母前面的東西：前排海草、氣泡、水面的花瓣；最後是變暗的那一層 */
    drawFront(ctx) {
      for (const w of this.weeds) if (w.front) this.drawWeed(ctx, w);
      this.drawBubbles(ctx);
      if (this.theme.fx === 'petals') this.drawPetals(ctx, true);
      if (this.dim > 0.002) {
        // 變暗像沉到更深的水裡，不是拉上一塊黑幕；不模糊、不染暖
        ctx.fillStyle = 'rgba(4,9,18,' + (this.dim * 0.6).toFixed(3) + ')';
        ctx.fillRect(0, 0, this.W, this.H);
      }
      // 儀式開著時，紀錄表後面一圈極淡的暖光，像深夜桌前開了一盞燈（color.md §6.1）。
      // 暖意只放在這一處，不把整片海染暖
      const L = this.lamp;
      if (L && this.hushK > 0.01) {
        const rx = Math.max(L.w * 0.75, 240);
        const ry = Math.max(L.h * 0.6, 200);
        ctx.save();
        ctx.translate(L.x, L.y);
        ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, 'rgba(235,222,196,' + (0.05 * this.hushK).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(235,222,196,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
        ctx.restore();
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
          MJ.glow(ctx, b.x, b.y, b.r * 5, 42, 0.7, 0.72, 0.6);
          ctx.globalCompositeOperation = 'source-over';
        }
        // 金泡泡用「光」的金色（--light #ebcd90）
        ctx.strokeStyle = b.gold
          ? 'rgba(235,205,144,0.75)'
          : b.bonus
          ? U.hsla(this.t * 40 + b.x * 0.5, 0.35, 0.82, 0.8)
          : 'rgba(205,226,236,' + a + ')';
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
        ctx.fillStyle = U.hsla(p.hue, 0.5, 0.86 * (1 - this.dim * 0.4), p.surface ? 0.85 : 0.7);
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
        ctx.strokeStyle = 'rgba(200,220,232,' + ((1 - k) * 0.4).toFixed(3) + ')';
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
      const k = (1 - this.dim * 0.5) * (1 - this.sleepK * 0.5);
      // 月面是一大塊亮白：月面 .32、光暈 .35、月光碎片 .07（color.md §2.7）
      U.drawGlow(ctx, x, y, r * 9, 215, 0.4, 0.8, 0.35 * k);
      // 從水下看月亮，會被波浪揉得有點歪
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1 + Math.sin(t * 1.1) * 0.05, 0.62 + Math.sin(t * 0.9 + 1) * 0.04);
      ctx.fillStyle = 'rgba(236,240,248,' + (0.32 * k).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, U.TAU);
      ctx.fill();
      ctx.restore();
      // 月光碎在水裡
      for (let i = 0; i < 9; i++) {
        const yy = y + 28 + i * 16 + Math.sin(t * 0.9 + i) * 3;
        const ww = r * (1.4 - i * 0.12) * (0.6 + 0.4 * Math.sin(t * 1.7 + i * 1.3));
        const a = 0.07 * (1 - i / 9) * k;
        ctx.fillStyle = 'rgba(226,234,248,' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.ellipse(x + Math.sin(t * 0.6 + i * 0.8) * 10, yy, Math.max(1, ww), 1.6, 0, 0, U.TAU);
        ctx.fill();
      }
    }

    drawAurora(ctx) {
      const { W } = this;
      // 流動速度 ×0.7
      const t = this.t * 0.7;
      if (!this.auroraSprites) {
        // 飽和度 .9 → .55：全站最亢奮的區塊，降下來
        this.auroraSprites = [150, 175, 290].map((hue) => {
          const c = document.createElement('canvas');
          c.width = 4;
          c.height = 128;
          const g = c.getContext('2d');
          const grd = g.createLinearGradient(0, 0, 0, 128);
          grd.addColorStop(0, U.hsla(hue, 0.55, 0.6, 0));
          grd.addColorStop(0.55, U.hsla(hue, 0.55, 0.62, 0.55));
          grd.addColorStop(0.8, U.hsla(hue + 20, 0.55, 0.7, 0.8));
          grd.addColorStop(1, U.hsla(hue, 0.55, 0.6, 0));
          g.fillStyle = grd;
          g.fillRect(0, 0, 4, 128);
          return c;
        });
      }
      const step = W > 900 ? 7 : 10;
      // 每道 alpha ×0.6；夜裡再 ×0.5；晚安、變暗時再降
      const k = 0.6 * (1 - this.nightK * 0.5) * (1 - this.dim * 0.5) * (1 - this.sleepK * 0.6);
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
  World.phaseAt = phaseAt;
  World.clock = null;
  MJ.World = World;
})((window.MJ = window.MJ || {}));
