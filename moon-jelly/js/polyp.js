/* 海月水母館 — 水螅體：水母真正的童年。水螅體 → 橫裂體 → 碟狀幼體 */
(function (MJ) {
  'use strict';

  const U = MJ.U;

  class Polyp {
    constructor(data) {
      this.id = data.id || U.uid();
      this.genes = data.genes;
      this.parents = data.parents || null;
      this.x = data.x == null ? U.rand(0.15, 0.85) : data.x;
      this.progress = data.progress || 0;
      this.duration = data.duration || 80;
      this.born = data.born || Date.now();
      this.t = U.rand(10);
      this.done = false;
    }

    toJSON() {
      return {
        id: this.id,
        genes: this.genes,
        parents: this.parents,
        x: this.x,
        progress: +this.progress.toFixed(4),
        duration: this.duration,
        born: this.born,
      };
    }

    get remaining() {
      return Math.max(0, (1 - this.progress) * this.duration);
    }
    get stageName() {
      return this.progress < 0.5 ? '水螅體' : '橫裂體';
    }

    update(dt, boost = 1) {
      this.t += dt;
      if (this.progress < 1) this.progress = Math.min(1, this.progress + (dt / this.duration) * boost);
    }

    base(world) {
      const x = this.x * world.W;
      return [x, world.sandY(x) + 3];
    }

    top(world) {
      const [x, y] = this.base(world);
      const h = this.height(world.unit);
      return [x + Math.sin(this.t * 0.8) * 2 * world.unit, y - h];
    }

    height(u) {
      return (24 + this.progress * 16) * u;
    }

    hit(px, py, world) {
      const [x, y] = this.base(world);
      const h = this.height(world.unit) + 14 * world.unit;
      return Math.abs(px - x) < 20 * world.unit + 8 && py < y + 8 && py > y - h - 8;
    }

    draw(ctx, world) {
      const u = world.unit;
      const g = this.genes;
      const [bx, by] = this.base(world);
      const h = this.height(u);
      const sway = Math.sin(this.t * 0.8) * 2 * u;
      const hue = g.hue;
      const sat = Math.min(g.sat * 0.8, MJ.Bio ? MJ.Bio.satMax : 0.72);

      // 柄
      ctx.strokeStyle = U.hsla(hue, sat * 0.6, 0.7, 0.5);
      ctx.lineWidth = 3 * u;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx - sway, by - h * 0.5, bx + sway, by - h);
      ctx.stroke();
      // 基盤
      ctx.fillStyle = U.hsla(hue, sat * 0.5, 0.55, 0.5);
      ctx.beginPath();
      ctx.ellipse(bx, by, 7 * u, 2.4 * u, 0, 0, U.TAU);
      ctx.fill();

      const tx = bx + sway;
      const ty = by - h;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      (MJ.glow || U.drawGlow)(ctx, tx, ty, (40 + this.progress * 40) * u, hue, sat, 0.62, 0.45 + 0.3 * Math.sin(this.t * 2));

      if (this.progress < 0.5) {
        // 水螅體：小杯子加一圈細觸手
        ctx.fillStyle = U.hsla(hue, sat, 0.75, 0.55);
        ctx.beginPath();
        ctx.moveTo(tx - 6 * u, ty);
        ctx.quadraticCurveTo(tx, ty + 9 * u, tx + 6 * u, ty);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = U.hsla(hue, sat, 0.8, 0.55);
        ctx.lineWidth = 1 * u;
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI / 2 + (i / 7 - 0.5) * 2.4;
          const len = (8 + 3 * Math.sin(this.t * 2 + i)) * u;
          ctx.beginPath();
          ctx.moveTo(tx + Math.cos(a) * 4 * u, ty);
          ctx.quadraticCurveTo(
            tx + Math.cos(a) * len * 0.7 + Math.sin(this.t + i) * 2 * u,
            ty + Math.sin(a) * len * 0.5,
            tx + Math.cos(a) * len,
            ty + Math.sin(a) * len
          );
          ctx.stroke();
        }
      } else {
        // 橫裂體：一疊小碟子，最上面那片準備出發
        const k = (this.progress - 0.5) * 2;
        const n = 2 + Math.floor(k * 4);
        for (let i = 0; i < n; i++) {
          const yy = ty + i * 4.2 * u;
          const top = i === 0;
          const wob = top ? Math.sin(this.t * (3 + k * 5)) * (1 + k * 2) * u : 0;
          const w = (7 - i * 0.4) * u;
          ctx.fillStyle = U.hsla(hue, sat, top ? 0.8 : 0.7, top ? 0.8 : 0.5);
          ctx.beginPath();
          for (let l = 0; l <= 8; l++) {
            const a = (l / 8) * Math.PI;
            const r = w * (l % 2 === 0 ? 1 : 0.75);
            const px = tx + Math.cos(a) * r;
            const py = yy - wob + Math.sin(a) * 2.2 * u;
            if (l === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.quadraticCurveTo(tx, yy - wob - 3 * u, tx + w, yy - wob);
          ctx.fill();
        }
      }
      ctx.restore();

      // 進度的小光環
      ctx.strokeStyle = 'rgba(240,248,250,0.35)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(bx, by + 10 * u, 5 * u, -Math.PI / 2, -Math.PI / 2 + U.TAU * this.progress);
      ctx.stroke();
    }
  }

  MJ.Polyp = Polyp;
})((window.MJ = window.MJ || {}));
