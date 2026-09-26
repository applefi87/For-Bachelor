/* 海月水母館 — 食物：浮游生物、星星糖、月光露、煩惱 */
(function (MJ) {
  'use strict';

  const U = MJ.U;

  const TYPES = {
    plankton: { name: '浮游生物', price: 0, desc: '最普通的一餐。點一下水就會撒下去。' },
    star: { name: '星星糖', price: 12, desc: '甜甜的點心。吃了會很開心。' },
    dew: { name: '月光露', price: 20, desc: '一滴月光。小水母喝了會長得比較快。' },
  };

  class Food {
    constructor(env) {
      this.env = env;
      this.items = [];
      this.t = 0;
    }

    count(type) {
      let n = 0;
      for (const f of this.items) if (!type || f.type === type) n++;
      return n;
    }

    drop(type, x, y) {
      const u = this.env.unit;
      if (type === 'plankton') {
        if (this.count('plankton') > 90) return false;
        const n = U.randInt(4, 6);
        for (let i = 0; i < n; i++) {
          this.items.push({
            type,
            x: x + U.rand(-20, 20) * u,
            y: y + U.rand(-10, 10) * u,
            vy: U.rand(9, 17) * u,
            r: U.rand(1.4, 2.4) * u,
            hue: U.rand(68, 105),
            phase: U.rand(U.TAU),
            life: 45,
          });
        }
      } else if (type === 'star') {
        this.items.push({ type, x, y, vy: 20 * u, r: 6 * u, hue: 48, phase: U.rand(U.TAU), rot: 0, life: 60 });
      } else if (type === 'dew') {
        this.items.push({ type, x, y, vy: 16 * u, r: 5 * u, hue: 200, phase: U.rand(U.TAU), life: 60 });
      }
      return true;
    }

    worry(text, x) {
      const u = this.env.unit;
      const item = {
        type: 'worry',
        text,
        chars: Array.from(text.replace(/\s+/g, ' ').trim()),
        x,
        y: 24,
        vy: 44 * u,
        r: 36 * u,
        hue: 42,
        phase: U.rand(U.TAU),
        life: 9999,
        claimedBy: null,
        hoverY: U.rand(0.28, 0.45) * this.env.H,
      };
      this.items.push(item);
      return item;
    }

    remove(item) {
      const i = this.items.indexOf(item);
      if (i >= 0) this.items.splice(i, 1);
    }

    /** 某隻水母眼中最近、而且想吃的食物 */
    nearestFor(j, cx, cy, fullness) {
      const u = this.env.unit;
      let best = null;
      let bestD = Infinity;
      for (const f of this.items) {
        if (f.type === 'worry') {
          // 等煩惱沉到定位、讓人看清楚之後，水母才過去吃
          if (f.claimedBy === j.id && f.settled) return f;
          continue;
        }
        if (f.type === 'plankton' && fullness > 0.96) continue;
        const range = f.type === 'plankton' ? 240 * u : 420 * u;
        const dx = f.x - cx;
        const dy = f.y - cy;
        const d = dx * dx + dy * dy;
        if (d < range * range && d < bestD) {
          best = f;
          bestD = d;
        }
      }
      return best;
    }

    update(dt) {
      this.t += dt;
      const world = this.env.world;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const f = this.items[i];
        if (f.type === 'worry') {
          if (!f.settled) {
            f.y += f.vy * dt;
            if (f.y >= f.hoverY) {
              f.settled = true;
              f.bob = this.t;
            }
          } else f.y = f.hoverY + Math.sin((this.t - f.bob) * 0.8) * 6;
          f.x += Math.sin(this.t * 0.5 + f.phase) * 5 * dt;
          continue;
        }
        const floor = world.sandY(f.x) - f.r;
        if (f.y < floor) {
          f.y = Math.min(floor, f.y + f.vy * dt);
          f.x += Math.sin(this.t * 1.3 + f.phase) * 7 * dt + world.current * 3 * dt;
        } else {
          f.life -= dt * 3;
        }
        if (f.rot != null) f.rot += dt * 0.8;
        f.life -= dt;
        if (f.life <= 0) this.items.splice(i, 1);
      }
    }

    draw(ctx) {
      const t = this.t;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const f of this.items) {
        const fade = Math.min(1, f.life / 3);
        if (f.type === 'plankton') {
          const tw = 0.7 + 0.3 * Math.sin(t * 5 + f.phase);
          U.drawGlow(ctx, f.x, f.y, f.r * 9, f.hue, 0.9, 0.6, tw * fade);
          ctx.fillStyle = U.hsla(f.hue, 0.8, 0.85, 0.9 * fade);
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * 0.7, 0, U.TAU);
          ctx.fill();
        } else if (f.type === 'star') {
          U.drawGlow(ctx, f.x, f.y, f.r * 8, 48, 0.95, 0.6, fade);
          ctx.fillStyle = U.hsla(48, 0.95, 0.75, fade);
          ctx.beginPath();
          U.starPath(ctx, f.x, f.y, f.r, 5, 0.5, f.rot - Math.PI / 2);
          ctx.fill();
        } else if (f.type === 'dew') {
          U.drawGlow(ctx, f.x, f.y, f.r * 9, 205, 0.6, 0.75, fade);
          ctx.fillStyle = 'rgba(225,240,255,' + (0.85 * fade).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(f.x, f.y - f.r * 1.6);
          ctx.quadraticCurveTo(f.x + f.r, f.y, f.x, f.y + f.r);
          ctx.quadraticCurveTo(f.x - f.r, f.y, f.x, f.y - f.r * 1.6);
          ctx.fill();
        }
      }
      // 煩惱：發光的球，裡面繞著字
      for (const f of this.items) {
        if (f.type !== 'worry') continue;
        const pulse = 1 + Math.sin(t * 2 + f.phase) * 0.06;
        ctx.globalCompositeOperation = 'lighter';
        U.drawGlow(ctx, f.x, f.y, f.r * 5 * pulse, f.hue, 0.85, 0.6, 0.9);
        ctx.strokeStyle = 'rgba(255,230,180,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * pulse, 0, U.TAU);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        const shown = f.chars.slice(0, 12);
        const n = shown.length;
        ctx.font = Math.round(f.r * 0.36) + 'px ' + MJ.FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < n; i++) {
          const a = (i / n) * U.TAU + t * 0.4 + f.phase;
          const rr = f.r * 0.68;
          ctx.fillStyle = 'rgba(255,244,220,0.85)';
          ctx.fillText(shown[i], f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr);
        }
      }
      ctx.restore();
    }
  }

  Food.TYPES = TYPES;
  MJ.Food = Food;
})((window.MJ = window.MJ || {}));
