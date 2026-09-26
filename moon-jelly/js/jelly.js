/* 海月水母館 — 水母：程式生成的外型、脈動推進、觸手物理 */
(function (MJ) {
  'use strict';

  const U = MJ.U;
  const G = MJ.Genes;
  const TAU = U.TAU;
  const HALF_PI = Math.PI / 2;
  const TENT_SEGS = 14;
  const ARM_SEGS = 9;

  class Jelly {
    constructor(data, env) {
      this.env = env;
      this.id = data.id || U.uid();
      this.name = data.name || '水母';
      this.genes = G.normalize(Object.assign({}, data.genes));
      this.growth = data.growth == null ? 1 : data.growth;
      this.fullness = data.fullness == null ? 0.7 : data.fullness;
      this.happy = data.happy == null ? 0.6 : data.happy;
      this.affection = data.affection || 0;
      this.worryFed = data.worryFed || 0;
      this.born = data.born || Date.now();
      this.lastBreed = data.lastBreed || 0;
      this.parents = data.parents || null;
      this.visitor = !!data.visitor;
      this.origin = data.origin || null;

      this.x = data.x != null ? data.x * env.W : U.rand(env.W * 0.15, env.W * 0.85);
      this.y = data.y != null ? data.y * env.H : U.rand(env.H * 0.2, env.H * 0.65);
      this.vx = 0;
      this.vy = 0;
      this.heading = -HALF_PI + U.rand(-0.3, 0.3);
      this.phase = Math.random();
      this.c = 0;
      this.thrust = 0;
      this.t = U.rand(100);
      this.noiseOff = U.rand(1000);
      this.mode = 'wander';
      this.target = null;
      this.retarget = 0;
      this.petGlow = 0;
      this.fade = data.fadeIn ? 0 : 1;
      this.leaving = false;
      this.mateWith = null;
      this.effectAcc = 0;
      this.buildPattern();
      this.buildTentacles();
    }

    toJSON() {
      const env = this.env;
      return {
        id: this.id,
        name: this.name,
        genes: this.genes,
        growth: +this.growth.toFixed(4),
        fullness: +this.fullness.toFixed(3),
        happy: +this.happy.toFixed(3),
        affection: Math.round(this.affection * 10) / 10,
        worryFed: this.worryFed,
        born: this.born,
        lastBreed: this.lastBreed,
        parents: this.parents,
        origin: this.origin,
        x: +(this.x / env.W).toFixed(3),
        y: +(this.y / env.H).toFixed(3),
      };
    }

    get stage() {
      if (this.growth < 0.25) return '碟狀幼體';
      if (this.growth < 1) return '幼年水母';
      return '成年水母';
    }
    get adult() {
      return this.growth >= 1;
    }
    get ephyra() {
      return U.clamp(1 - this.growth / 0.3, 0, 1);
    }
    get bellW() {
      return 72 * this.env.unit * this.genes.size * (0.28 + 0.72 * U.easeOut(this.growth));
    }
    get bellH() {
      return this.bellW * U.lerp(G.SHAPES[this.genes.shape].h, 0.32, this.ephyra);
    }
    get brightness() {
      const sleep = this.env.mode === 'sleep' ? 0.75 : 1;
      return (0.5 + 0.25 * this.fullness + 0.25 * this.happy + 0.6 * this.petGlow) * sleep;
    }

    /** 本地座標（原點在傘緣中心，-y 是前進方向）轉世界座標 */
    toWorld(lx, ly) {
      const r = this.heading + HALF_PI;
      const c = Math.cos(r);
      const s = Math.sin(r);
      return [this.x + lx * c - ly * s, this.y + lx * s + ly * c];
    }
    center() {
      return this.toWorld(0, -this.bellH * 0.45);
    }
    hit(px, py, pad = 14) {
      const [cx, cy] = this.center();
      const r = Math.max(this.bellW, this.bellH) * 0.6 + pad;
      const dx = px - cx;
      const dy = py - cy;
      return dx * dx + dy * dy < r * r;
    }

    buildPattern() {
      const r = U.seeded(this.genes.seed);
      this.dots = [];
      for (let i = 0; i < 16; i++) {
        this.dots.push({ u: r() * 2 - 1, v: 0.12 + r() * 0.8, r: 0.6 + r() * 0.9, ph: r() * TAU });
      }
    }

    buildTentacles() {
      const g = this.genes;
      const [rx, ry] = [this.x, this.y];
      this.tents = [];
      const n = g.tentacles;
      for (let i = 0; i < n; i++) {
        const theta = (i / n) * TAU + 0.2;
        const pts = new Float32Array((TENT_SEGS + 1) * 4);
        for (let j = 0; j <= TENT_SEGS; j++) {
          pts[j * 4] = rx;
          pts[j * 4 + 1] = ry + j * 3;
          pts[j * 4 + 2] = rx;
          pts[j * 4 + 3] = ry + j * 3;
        }
        this.tents.push({ theta, pts, len: U.rand(0.82, 1.15), phase: U.rand(TAU) });
      }
      this.arms = [];
      for (let i = 0; i < g.arms; i++) {
        const pts = new Float32Array((ARM_SEGS + 1) * 4);
        for (let j = 0; j <= ARM_SEGS; j++) {
          pts[j * 4] = rx;
          pts[j * 4 + 1] = ry + j * 3;
          pts[j * 4 + 2] = rx;
          pts[j * 4 + 3] = ry + j * 3;
        }
        const off = g.arms === 1 ? 0 : (i / (g.arms - 1)) * 2 - 1;
        this.arms.push({ off, pts, phase: U.rand(TAU), len: U.rand(0.85, 1.1) });
      }
    }

    /* ---------------- 行為 ---------------- */

    pickWanderTarget() {
      const env = this.env;
      const floor = env.world.floorY;
      // 夜裡整群往下沉一些（海月水母真的有日夜垂直遷徙），白天回到中上
      const night = MJ.Day ? MJ.Day.night : 0;
      const top = env.H * (0.1 + 0.13 * night) + this.bellH;
      let x = U.rand(env.W * 0.08, env.W * 0.92);
      let y = U.rand(top, floor - this.bellH - this.bellW * 1.2);
      if (env.world.rain) {
        // 下雨的日子，水母會靠近畫面中間陪你
        x = U.lerp(x, env.W / 2, 0.55);
        y = U.lerp(y, env.H * 0.5, 0.4);
      }
      this.target = { x, y };
      this.retarget = U.rand(8, 16);
    }

    update(dt, env) {
      this.t += dt;
      const g = this.genes;
      const u = env.unit;

      if (!this.visitor) {
        this.fullness = Math.max(0, this.fullness - dt * 0.0011);
        const baseHappy = 0.3 + 0.4 * this.fullness;
        this.happy += (baseHappy - this.happy) * dt * 0.004;
        if (this.growth < 1) {
          this.growth += dt * (0.0022 + 0.0048 * this.fullness) * (env.growthBoost || 1);
          if (this.growth >= 1) {
            this.growth = 1;
            if (env.onGrown) env.onGrown(this);
          }
        }
      }
      this.petGlow = Math.max(0, this.petGlow - dt * 0.45);

      if (this.leaving) this.fade = Math.max(0, this.fade - dt * 0.28);
      else if (this.fade < 1) this.fade = Math.min(1, this.fade + dt * 0.5);

      /* 決定要往哪裡去 */
      let mode = 'wander';
      let tx;
      let ty;
      const [cx, cy] = this.center();
      if (this.mateWith && this.mateWith.env) {
        mode = 'mate';
        const m = this.mateWith;
        tx = (this.x + m.x) / 2 + (this.x < m.x ? -this.bellW * 0.3 : this.bellW * 0.3);
        ty = (this.y + m.y) / 2;
      } else if (this.petTarget) {
        mode = 'pet';
        tx = this.petTarget.x;
        ty = this.petTarget.y + this.bellH * 0.4;
      } else if (this.leaving) {
        mode = 'leave';
        if (this.releaseUp) {
          tx = this.x;
          ty = -400;
        } else {
          tx = this.x < env.W / 2 ? -200 : env.W + 200;
          ty = env.H * 0.3;
        }
      } else if (env.food && env.mode !== 'breath') {
        const f = env.food.nearestFor(this, cx, cy, this.fullness);
        if (f) {
          mode = 'food';
          tx = f.x;
          ty = f.y;
          const dx = f.x - cx;
          const dy = f.y - cy;
          const reach = Math.max(this.bellW, this.bellH) * 0.62 + 4;
          if (dx * dx + dy * dy < reach * reach && env.onEat) env.onEat(this, f);
        }
      }
      if (mode === 'wander') {
        this.retarget -= dt;
        if (!this.target || this.retarget <= 0) this.pickWanderTarget();
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        if (dx * dx + dy * dy < 900) this.retarget = Math.min(this.retarget, 1.5);
        tx = this.target.x;
        ty = this.target.y;
      }
      this.mode = mode;

      /* 脈動 */
      const breathing = env.mode === 'breath' && env.breath;
      let freq = (0.42 + 0.3 * g.pulse) * (1 + (1 - this.growth) * 0.6);
      const below = ty > this.y + 24;
      // 水母往下的時候不太划水，而是放鬆讓自己慢慢沉下去
      let thrustK = 1;
      let sink = 7;
      if (mode === 'wander' && below) {
        freq *= 0.55;
        thrustK = 0.1;
        sink = 17;
      } else if (below) sink = 12;
      if (mode === 'food' || mode === 'mate' || mode === 'pet' || mode === 'leave') freq *= 1.25;
      if (env.mode === 'sleep') freq *= 0.6;
      // 夜裡脈動慢一點：大家在休息
      if (MJ.Day) freq *= 1 - 0.15 * MJ.Day.night;

      if (breathing) {
        const bc = env.breath.c;
        this.c += (bc - this.c) * Math.min(1, dt * 3);
        this.thrust = env.breath.push * 0.45;
      } else {
        this.phase += dt * freq;
        if (this.phase >= 1) {
          this.phase -= 1;
          this.onPulse(env);
        }
        const p = this.phase;
        this.c = p < 0.22 ? U.easeOut(p / 0.22) : 1 - U.easeInOut((p - 0.22) / 0.78);
        this.thrust = p < 0.26 ? Math.sin((p / 0.26) * Math.PI) : 0;
      }

      /* 轉向 */
      let desired = Math.atan2(ty - this.y, tx - this.x);
      let turn = 0.9;
      if (mode === 'wander') {
        if (below) desired = -HALF_PI + U.clamp((tx - this.x) * 0.004, -0.5, 0.5);
        else desired = -HALF_PI + U.clamp(U.angleDiff(-HALF_PI, desired), -1.0, 1.0);
      } else {
        turn = 1.7;
        if (mode !== 'leave') desired = -HALF_PI + U.clamp(U.angleDiff(-HALF_PI, desired), -1.6, 1.6);
      }
      if (breathing) {
        desired = -HALF_PI;
        turn = 0.6;
      }
      const diff = U.angleDiff(this.heading, desired);
      this.heading += U.clamp(diff, -turn * dt, turn * dt);
      this.heading += (U.noise(this.t * 0.35 + this.noiseOff) - 0.5) * 0.5 * dt;

      /* 力 */
      const power = (60 + 34 * g.pulse) * u * (0.55 + 0.45 * this.growth) * (mode === 'wander' ? 1 : 1.35);
      const push = this.thrust * thrustK * power * dt * 2.2;
      this.vx += Math.cos(this.heading) * push + env.world.current * 1.2 * u * dt;
      this.vy += Math.sin(this.heading) * push + sink * u * dt;
      if (breathing) this.vy += ((this.breathHome || env.H * 0.45) - this.y) * 0.35 * dt;
      const drag = Math.exp(-1.3 * dt);
      this.vx *= drag;
      this.vy *= drag;

      const m = this.bellW * 0.7 + 10;
      if (mode !== 'leave') {
        if (this.x < m) this.vx += (m - this.x) * 1.2 * dt;
        if (this.x > env.W - m) this.vx -= (this.x - (env.W - m)) * 1.2 * dt;
      }
      const top = this.bellH + 24;
      if (this.y < top && mode !== 'leave') this.vy += (top - this.y) * 1.5 * dt;
      const floor = env.world.floorY - this.bellW * 0.5;
      if (this.y > floor) this.vy -= (this.y - floor) * 1.5 * dt;

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (mode !== 'leave') this.x = U.clamp(this.x, 4, env.W - 4);
      this.y = U.clamp(this.y, mode === 'leave' ? -600 : 12, env.world.floorY + 6);

      this.updateLimbs(dt, env);
      this.updateEffects(dt, env);
    }

    /** 名片裡的動態肖像：原地脈動，不移動 */
    animate(dt, env) {
      this.t += dt;
      const g = this.genes;
      this.phase += dt * (0.42 + 0.3 * g.pulse);
      if (this.phase >= 1) this.phase -= 1;
      const p = this.phase;
      this.c = p < 0.22 ? U.easeOut(p / 0.22) : 1 - U.easeInOut((p - 0.22) / 0.78);
      this.heading = -HALF_PI + Math.sin(this.t * 0.6) * 0.06;
      this.y = env.anchorY + Math.sin(p * TAU) * 1.5 - this.c * 3;
      this.updateLimbs(dt, env);
      this.updateEffects(dt, env);
    }

    onPulse(env) {
      const g = this.genes;
      const singK = MJ.Day ? 1 - 0.5 * MJ.Day.night : 1;
      if (env.sing && this.fade > 0.5 && Math.random() < (this.adult ? 0.3 : 0.16) * singK) {
        MJ.Audio.sing(G.noteOf(g), (0.07 + 0.08 * g.glow) * (this.visitor ? 0.6 : 1), U.clamp((this.x / env.W) * 2 - 1, -0.8, 0.8));
      }
      if (g.special === 'moonlight' && env.fx) {
        const [cx, cy] = this.center();
        env.fx.ring(cx, cy, 210, this.bellW * 1.3, { r0: this.bellW * 0.4, sat: 0.3, life: 1.6, width: 1.3 });
      }
    }

    updateEffects(dt, env) {
      const g = this.genes;
      if (!env.fx || !g.special) return;
      this.effectAcc += dt;
      if (g.special === 'firefly' && this.effectAcc > 0.55) {
        this.effectAcc = 0;
        const [x, y] = this.toWorld(U.rand(-0.5, 0.5) * this.bellW, U.rand(0, this.bellW * 0.8));
        env.fx.firefly(x, y, U.wrapHue(g.hue2 + 20));
      } else if (g.special === 'golden' && this.effectAcc > 0.35) {
        this.effectAcc = 0;
        const [x, y] = this.toWorld(U.rand(-0.45, 0.45) * this.bellW, 0);
        env.fx.spark(x, y, 46, 1, { speed: 12, grav: 16, life: 1.6, size: 0.8, drag: 0.8 });
      }
    }

    /* 觸手：跟隨式約束 + 慣性 */
    updateLimbs(dt, env) {
      const g = this.genes;
      const u = env.unit;
      const r = this.heading + HALF_PI;
      const cos = Math.cos(r);
      const sin = Math.sin(r);
      const w = this.bellW * (1 - 0.17 * this.c);
      const downX = -sin;
      const downY = cos;
      const damp = 0.9;
      const grav = 110 * u * dt * dt;
      const tLen = (this.bellW * 1.55 * g.tentLen) / TENT_SEGS;
      const t = this.t;
      const eph = this.ephyra;

      for (const tent of this.tents) {
        const lx = Math.sin(tent.theta) * w * 0.46;
        const ly = Math.cos(tent.theta) * w * 0.07 - this.bellH * 0.02;
        const rootX = this.x + lx * cos - ly * sin;
        const rootY = this.y + lx * sin + ly * cos;
        const pts = tent.pts;
        pts[0] = rootX;
        pts[1] = rootY;
        const seg = tLen * tent.len * (1 - eph * 0.55);
        for (let j = 1; j <= TENT_SEGS; j++) {
          const i = j * 4;
          const vx = (pts[i] - pts[i + 2]) * damp;
          const vy = (pts[i + 1] - pts[i + 3]) * damp;
          pts[i + 2] = pts[i];
          pts[i + 3] = pts[i + 1];
          const wave = Math.sin(t * 2.1 - j * 0.55 + tent.phase) * 0.22 * u * (j / TENT_SEGS);
          pts[i] += vx + cos * wave;
          pts[i + 1] += vy + sin * wave + grav;
        }
        for (let j = 1; j <= TENT_SEGS; j++) {
          const i = j * 4;
          const p = i - 4;
          if (j <= 2) {
            const k = j === 1 ? 0.55 : 0.25;
            const ax = pts[p] + downX * seg;
            const ay = pts[p + 1] + downY * seg;
            pts[i] += (ax - pts[i]) * k;
            pts[i + 1] += (ay - pts[i + 1]) * k;
          }
          const dx = pts[i] - pts[p];
          const dy = pts[i + 1] - pts[p + 1];
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          pts[i] = pts[p] + (dx / d) * seg;
          pts[i + 1] = pts[p + 1] + (dy / d) * seg;
        }
      }

      const aLen = (this.bellW * 0.95 * g.armLen) / ARM_SEGS;
      for (const arm of this.arms) {
        const lx = arm.off * w * 0.12;
        const ly = -this.bellH * 0.08;
        const pts = arm.pts;
        pts[0] = this.x + lx * cos - ly * sin;
        pts[1] = this.y + lx * sin + ly * cos;
        const seg = aLen * arm.len;
        for (let j = 1; j <= ARM_SEGS; j++) {
          const i = j * 4;
          const vx = (pts[i] - pts[i + 2]) * 0.88;
          const vy = (pts[i + 1] - pts[i + 3]) * 0.88;
          pts[i + 2] = pts[i];
          pts[i + 3] = pts[i + 1];
          const wave = Math.sin(t * 1.6 - j * 0.5 + arm.phase) * 0.18 * u;
          pts[i] += vx + cos * wave;
          pts[i + 1] += vy + sin * wave + grav * 0.7;
        }
        for (let j = 1; j <= ARM_SEGS; j++) {
          const i = j * 4;
          const p = i - 4;
          if (j <= 2) {
            const k = j === 1 ? 0.6 : 0.3;
            const ax = pts[p] + (downX + cos * arm.off * 0.15) * seg;
            const ay = pts[p + 1] + (downY + sin * arm.off * 0.15) * seg;
            pts[i] += (ax - pts[i]) * k;
            pts[i + 1] += (ay - pts[i + 1]) * k;
          }
          const dx = pts[i] - pts[p];
          const dy = pts[i + 1] - pts[p + 1];
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          pts[i] = pts[p] + (dx / d) * seg;
          pts[i + 1] = pts[p + 1] + (dy / d) * seg;
        }
      }
    }

    /* ---------------- 繪製 ---------------- */

    colorAt(t) {
      const g = this.genes;
      if (g.special === 'rainbow') return U.wrapHue(g.hue + t * 40);
      if (g.special === 'aurora') return U.wrapHue(g.hue + Math.sin(t * 0.5) * 50);
      return g.hue;
    }

    draw(ctx, env) {
      if (this.fade <= 0.01) return;
      const g = this.genes;
      const t = this.t;
      let alpha = this.fade;
      if (g.special === 'ghost') alpha *= 0.45 + 0.35 * Math.sin(t * 0.5 + this.noiseOff);
      const bright = this.brightness;
      const hue = this.colorAt(t);
      const hue2 = g.special === 'rainbow' ? U.wrapHue(g.hue2 + t * 40 + 90) : g.hue2;
      const sat = g.sat;
      // 夜裡光暈只微降：光束關掉之後，水母靠對比反而更像一盞燈
      const themeGlow = (env.world && env.world.theme ? env.world.theme.glow || 1 : 1) * (MJ.Day ? 1 - 0.1 * MJ.Day.night : 1);

      ctx.save();
      ctx.globalAlpha = alpha;

      // 光暈
      ctx.globalCompositeOperation = 'lighter';
      const [cx, cy] = this.center();
      const size = Math.max(this.bellW, this.bellH) * (2.1 + 1.8 * g.glow) * (0.8 + bright * 0.4);
      const glowSat = g.special === 'moonlight' ? 0.35 : sat;
      U.drawGlow(ctx, cx, cy, size, hue, glowSat, 0.62, (0.35 + 0.45 * g.glow) * bright * themeGlow);
      if (g.special === 'moonlight' || g.special === 'golden') {
        U.drawGlow(ctx, cx, cy, size * 1.4, g.special === 'golden' ? 45 : 210, 0.5, 0.75, 0.35 * bright);
      }

      // 觸手
      const tw = Math.max(0.6, 1.05 * env.unit * Math.sqrt(g.size) * (0.6 + 0.4 * this.growth));
      ctx.lineWidth = tw;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let k = 0; k < this.tents.length; k++) {
        const tent = this.tents[k];
        const front = Math.cos(tent.theta) > 0;
        const h2 = g.special === 'rainbow' ? U.wrapHue(hue2 + k * 25) : hue2;
        ctx.strokeStyle = U.hsla(h2, sat * 0.9, 0.72, (front ? 0.5 : 0.28) * (0.6 + bright * 0.4));
        const pts = tent.pts;
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let j = 1; j < TENT_SEGS; j++) {
          const i = j * 4;
          const mx = (pts[i] + pts[i + 4]) / 2;
          const my = (pts[i + 1] + pts[i + 5]) / 2;
          ctx.quadraticCurveTo(pts[i], pts[i + 1], mx, my);
        }
        ctx.lineTo(pts[TENT_SEGS * 4], pts[TENT_SEGS * 4 + 1]);
        ctx.stroke();
        if (g.special === 'firefly' && k % 2 === 0) {
          const tp = TENT_SEGS * 4;
          U.drawGlow(ctx, pts[tp], pts[tp + 1], 12 * env.unit, U.wrapHue(hue2 + 20), 0.9, 0.65, 0.5 + 0.5 * Math.sin(t * 3 + k));
        }
      }

      // 口腕（荷葉邊的緞帶）
      if (this.arms.length) {
        const aw = this.bellW * 0.13;
        ctx.fillStyle = U.hsla(hue, sat, 0.72, 0.22 * (0.6 + bright * 0.4));
        for (const arm of this.arms) {
          const pts = arm.pts;
          const L = [];
          const R = [];
          for (let j = 0; j <= ARM_SEGS; j++) {
            const i = j * 4;
            const ni = Math.min(j + 1, ARM_SEGS) * 4;
            const pi = Math.max(j - 1, 0) * 4;
            let dx = pts[ni] - pts[pi];
            let dy = pts[ni + 1] - pts[pi + 1];
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            dx /= d;
            dy /= d;
            const k = j / ARM_SEGS;
            const ww = aw * (1 - k * 0.75) * (1 + 0.45 * Math.sin(j * 1.9 + t * 2.4 + arm.phase));
            L.push(pts[i] - dy * ww, pts[i + 1] + dx * ww);
            R.push(pts[i] + dy * ww, pts[i + 1] - dx * ww);
          }
          ctx.beginPath();
          ctx.moveTo(L[0], L[1]);
          for (let i = 2; i < L.length; i += 2) ctx.lineTo(L[i], L[i + 1]);
          for (let i = R.length - 2; i >= 0; i -= 2) ctx.lineTo(R[i], R[i + 1]);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 傘
      ctx.translate(this.x, this.y);
      ctx.rotate(this.heading + HALF_PI);
      this.drawBell(ctx, env, hue, hue2, sat, bright, 1);
      if (g.special === 'twin') {
        ctx.save();
        ctx.translate(0, -this.bellH * 0.16);
        ctx.scale(0.52, 0.52);
        this.drawBell(ctx, env, hue2, hue, sat, bright, 0.8, true);
        ctx.restore();
      }
      ctx.restore();
    }

    bellPath(w, h) {
      const g = this.genes;
      const sh = G.SHAPES[g.shape];
      const eph = this.ephyra;
      const k1 = U.lerp(sh.k1, 1.08, eph);
      const k2 = U.lerp(sh.k2, 0.9, eph);
      const k3 = U.lerp(sh.k3, 0.72, eph);
      const p = new Path2D();
      const hw = w / 2;
      p.moveTo(-hw, 0);
      p.bezierCurveTo(-hw * k1, -h * k2, -hw * k3, -h, 0, -h);
      p.bezierCurveTo(hw * k3, -h, hw * k1, -h * k2, hw, 0);
      const lobes = eph > 0.02 ? 8 : sh.scallop;
      if (lobes) {
        const depth = h * (sh.scallop ? 0.14 : 0) + h * 0.7 * eph;
        for (let i = 0; i < lobes; i++) {
          const x1 = hw - (w * (i + 1)) / lobes;
          const xm = hw - (w * (i + 0.5)) / lobes;
          p.quadraticCurveTo(xm, depth * 2, x1, 0);
        }
      } else {
        p.quadraticCurveTo(0, h * 0.16 * (1 - this.c * 0.5), -hw, 0);
      }
      p.closePath();
      return p;
    }

    drawBell(ctx, env, hue, hue2, sat, bright, alphaK, inner) {
      const g = this.genes;
      const t = this.t;
      const u = env.unit;
      const w = this.bellW * (1 - 0.17 * this.c);
      const h = this.bellH * (1 + 0.13 * this.c);
      const path = this.bellPath(w, h);
      const A = alphaK * (0.75 + 0.25 * bright);

      ctx.globalCompositeOperation = 'source-over';
      let fill;
      if (g.special === 'rainbow' && !inner) {
        fill = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        for (let i = 0; i <= 5; i++) fill.addColorStop(i / 5, U.hsla(t * 50 + i * 60, 0.85, 0.72, 0.42 * A));
      } else if (g.special === 'aurora' && !inner) {
        fill = ctx.createLinearGradient(0, -h, 0, 0);
        const s = (Math.sin(t * 0.7) + 1) / 2;
        fill.addColorStop(0, U.hsla(hue, sat, 0.8, 0.45 * A));
        fill.addColorStop(0.35 + s * 0.3, U.hsla(hue + 110, sat, 0.7, 0.4 * A));
        fill.addColorStop(1, U.hsla(hue + 40, sat, 0.6, 0.2 * A));
      } else if (g.pattern === 'starry' && !inner) {
        fill = ctx.createRadialGradient(0, -h * 0.5, 0, 0, -h * 0.4, Math.max(w, h) * 0.8);
        fill.addColorStop(0, U.hsla(235, 0.55, 0.3, 0.7 * A));
        fill.addColorStop(0.7, U.hsla(hue, sat, 0.45, 0.45 * A));
        fill.addColorStop(1, U.hsla(hue, sat, 0.6, 0.25 * A));
      } else {
        fill = ctx.createRadialGradient(0, -h * 0.58, 0, 0, -h * 0.4, Math.max(w, h) * 0.8);
        fill.addColorStop(0, U.hsla(hue, sat, 0.88, 0.5 * A));
        fill.addColorStop(0.55, U.hsla(hue, sat, 0.66, 0.3 * A));
        fill.addColorStop(1, U.hsla(hue, sat, 0.55, 0.16 * A));
      }
      ctx.fillStyle = fill;
      ctx.fill(path);

      // 花紋
      ctx.save();
      ctx.clip(path);
      this.drawPattern(ctx, w, h, hue, hue2, sat, A, u, inner);
      // 內層的傘（厚度感）
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = U.hsla(hue, sat, 0.8, 0.16 * A);
      ctx.lineWidth = 1 * u;
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.02, w * 0.38, h * 0.8, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      // 胃
      ctx.fillStyle = U.hsla(hue2, sat, 0.75, 0.2 * A);
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.22, w * 0.12, h * 0.14, 0, 0, TAU);
      ctx.fill();
      ctx.restore();

      // 傘緣亮線與高光
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = U.hsla(hue, sat * 0.8, 0.85, 0.5 * A);
      ctx.lineWidth = Math.max(0.8, 1.2 * u);
      ctx.stroke(path);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.3 * A).toFixed(3) + ')';
      ctx.lineWidth = Math.max(1, 1.8 * u);
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.5, w * 0.34, h * 0.36, 0, Math.PI * 1.12, Math.PI * 1.38);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    drawPattern(ctx, w, h, hue, hue2, sat, A, u, inner) {
      const g = this.genes;
      const t = this.t;
      const pat = inner ? 'plain' : g.pattern;
      if (pat === 'plain') return;
      ctx.globalCompositeOperation = 'lighter';
      if (pat === 'clover') {
        ctx.strokeStyle = U.hsla(hue2, Math.max(0.5, sat), 0.78, 0.55 * A);
        ctx.lineWidth = Math.max(1, 2.2 * u * g.size);
        for (let k = 0; k < 4; k++) {
          const a = Math.PI / 4 + (k * Math.PI) / 2;
          const x = Math.cos(a) * w * 0.15;
          const y = -h * 0.46 + Math.sin(a) * h * 0.15;
          ctx.beginPath();
          ctx.ellipse(x, y, w * 0.075, h * 0.075, 0, a + Math.PI + 0.7, a + Math.PI + 0.7 + TAU * 0.78);
          ctx.stroke();
        }
      } else if (pat === 'dots' || pat === 'heart' || pat === 'starry') {
        for (let i = 0; i < this.dots.length; i++) {
          const d = this.dots[i];
          const x = d.u * w * 0.42 * (1 - d.v * 0.35);
          const y = -h * (0.08 + d.v * 0.82);
          const tw = 0.5 + 0.5 * Math.sin(t * 2 + d.ph);
          if (pat === 'dots') {
            ctx.fillStyle = U.hsla(hue2, sat, 0.85, (0.35 + 0.45 * tw) * A);
            ctx.beginPath();
            ctx.arc(x, y, d.r * 1.6 * u * g.size, 0, TAU);
            ctx.fill();
          } else if (pat === 'heart') {
            if (i % 3) continue;
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = U.hsla(345, 0.85, 0.8, (0.45 + 0.35 * tw) * A);
            ctx.beginPath();
            U.heartPath(ctx, x, y, (3 + d.r * 2) * u * g.size);
            ctx.fill();
            ctx.globalCompositeOperation = 'lighter';
          } else {
            ctx.fillStyle = i % 4 === 0 ? U.hsla(48, 0.9, 0.85, (0.3 + 0.7 * tw) * A) : U.hsla(210, 0.3, 0.95, (0.25 + 0.7 * tw) * A);
            ctx.beginPath();
            U.sparklePath(ctx, x, y, (1.5 + d.r * 2.2 * tw) * u * g.size);
            ctx.fill();
          }
        }
        if (pat === 'starry') {
          ctx.strokeStyle = 'rgba(220,230,255,' + (0.18 * A).toFixed(3) + ')';
          ctx.lineWidth = 0.7 * u;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const d = this.dots[i * 2];
            const x = d.u * w * 0.42 * (1 - d.v * 0.35);
            const y = -h * (0.08 + d.v * 0.82);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else if (pat === 'rings') {
        ctx.strokeStyle = U.hsla(hue2, sat, 0.8, 0.28 * A);
        ctx.lineWidth = Math.max(1, 1.6 * u);
        for (const k of [0.36, 0.6, 0.84]) {
          ctx.beginPath();
          ctx.ellipse(0, 0, (w / 2) * k, h * k, 0, Math.PI, TAU);
          ctx.stroke();
        }
      } else if (pat === 'stripes') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = U.hsla(hue2, sat, 0.35, 0.35 * A);
        ctx.lineWidth = Math.max(1, 2 * u * g.size);
        for (let i = 0; i < 7; i++) {
          const x = (-0.45 + i * 0.15) * w;
          ctx.beginPath();
          ctx.moveTo(0, -h);
          ctx.quadraticCurveTo(x * 0.8, -h * 0.55, x, 0);
          ctx.stroke();
        }
      } else if (pat === 'spiral') {
        ctx.strokeStyle = U.hsla(hue2, sat, 0.82, 0.38 * A);
        ctx.lineWidth = Math.max(1, 1.5 * u);
        ctx.beginPath();
        const rot = t * 0.5;
        const R = w * 0.36;
        for (let a = 0; a <= Math.PI * 6; a += 0.2) {
          const r = (a / (Math.PI * 6)) * R;
          const x = Math.cos(a + rot) * r;
          const y = -h * 0.5 + Math.sin(a + rot) * r * (h / w) * 1.1;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /**
   * 畫一張靜態肖像到 canvas 上，給圖鑑、名冊用。
   */
  Jelly.portrait = (canvas, genes, growth = 1, cssSize = 96) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const env = Jelly.portraitEnv(genes, cssSize);
    const j = Jelly.posed(genes, growth, env);
    for (let i = 0; i < 90; i++) j.animate(1 / 30, env);
    ctx.clearRect(0, 0, cssSize, cssSize);
    j.draw(ctx, env);
    return j;
  };

  /** 做一隻擺好姿勢、原地不動的水母（肖像、名片用） */
  Jelly.posed = (genes, growth, env) => {
    const j = new Jelly({ genes, growth, x: 0.5, y: 0.5 }, env);
    j.heading = -HALF_PI;
    j.y = env.H * 0.1 + j.bellH * 1.1;
    env.anchorY = j.y;
    j.buildTentacles();
    return j;
  };

  Jelly.portraitEnv = (genes, cssSize) => {
    const g = G.normalize(Object.assign({}, genes));
    const unit = (cssSize * 0.6) / (72 * g.size * Math.max(1, G.SHAPES[g.shape].h * 1.05));
    return {
      unit,
      W: cssSize,
      H: cssSize,
      world: { floorY: cssSize * 10, current: 0, theme: { glow: 1 } },
      mode: 'normal',
      fx: null,
      sing: false,
      anchorY: cssSize * 0.4,
    };
  };

  MJ.Jelly = Jelly;
})((window.MJ = window.MJ || {}));
