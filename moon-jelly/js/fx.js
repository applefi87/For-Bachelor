/* 海月水母館 — 粒子特效：光點、愛心、漣漪、飄字 */
(function (MJ) {
  'use strict';

  const U = MJ.U;
  // canvas 裡的字：系統的字用黑體，使用者自己打的句子用手寫體，數字用等寬（和 css/base.css 的 --f-* 同一組字族）
  MJ.FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif';
  MJ.FONT_HAND = '"Iansui", "Kaiti TC", "BiauKai", "DFKai-SB", serif';
  MJ.FONT_NUM = '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  // 字型只有被 DOM 用到才會下載；canvas 先要一次，免得第一次畫字時退回系統字
  try {
    if (document.fonts && document.fonts.load) {
      const none = () => {};
      document.fonts.load('500 15px "Noto Sans TC"', '海月水母館光浪').catch(none);
      document.fonts.load('15px "Iansui"', '今天').catch(none);
      document.fonts.load('15px "IBM Plex Mono"', '+0123456789').catch(none);
    }
  } catch (e) {
    /* 舊瀏覽器沒有 FontFace API：用後備字族 */
  }

  /**
   * 生物發光（color.md §2.5）：飽和度上限 0.6，亮度跟著夜深與晚安模式降低。
   * 海裡所有 lighter 疊加的光暈都走這裡，不直接呼叫 U.drawGlow。
   * MJ.Bio.k 由 world.js 每一幀更新（白天 1、夜 0.85、晚安 0.6）。
   */
  MJ.Bio = { k: 1, satMax: 0.6 };
  MJ.glow = (ctx, x, y, size, h, s, l, alpha = 1) => U.drawGlow(ctx, x, y, size, h, Math.min(s, MJ.Bio.satMax), l, alpha * MJ.Bio.k);

  class FX {
    constructor() {
      this.list = [];
    }

    add(p) {
      if (this.list.length > 800) this.list.splice(0, 50);
      p.age = 0;
      this.list.push(p);
      return p;
    }

    spark(x, y, hue, n = 8, o = {}) {
      const speed = o.speed || 60;
      for (let i = 0; i < n; i++) {
        const a = o.dir != null ? o.dir + U.rand(-o.spread || -0.6, o.spread || 0.6) : U.rand(U.TAU);
        const v = U.rand(0.3, 1) * speed;
        this.add({
          type: 'spark',
          x, y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - (o.up || 0),
          life: U.rand(0.7, 1.4) * (o.life || 1),
          size: U.rand(1.2, 2.6) * (o.size || 1),
          hue: hue + U.rand(-15, 15),
          sat: o.sat == null ? 0.6 : o.sat,
          drag: o.drag || 1.8,
          grav: o.grav || 0,
        });
      }
    }

    hearts(x, y, n = 3, hue = 340) {
      for (let i = 0; i < n; i++) {
        this.add({
          type: 'heart',
          x: x + U.rand(-10, 10),
          y: y + U.rand(-6, 6),
          vx: U.rand(-14, 14),
          vy: U.rand(-40, -22),
          life: U.rand(1.3, 2),
          size: U.rand(5, 9),
          hue: hue + U.rand(-12, 12),
          phase: U.rand(U.TAU),
        });
      }
    }

    text(x, y, str, color = '#ebcd90', size = 15) {
      this.add({ type: 'text', x, y, vy: -26, life: 1.8, str, color, size });
    }

    ring(x, y, hue, r1 = 60, o = {}) {
      this.add({
        type: 'ring',
        x, y,
        r0: o.r0 || 4,
        r1,
        life: o.life || 1.2,
        hue,
        sat: o.sat == null ? 0.6 : o.sat,
        width: o.width || 1.6,
        squash: o.squash || 1,
      });
    }

    ripple(x, y, hue = 190) {
      this.ring(x, y, hue, 46, { life: 1.1, squash: 0.55, width: 1.4, sat: 0.4 });
      this.ring(x, y, hue, 28, { life: 0.8, squash: 0.55, width: 1, sat: 0.4 });
    }

    firefly(x, y, hue) {
      this.add({
        type: 'firefly',
        x, y,
        vx: U.rand(-8, 8),
        vy: U.rand(-18, -6),
        life: U.rand(2.5, 4.5),
        hue: hue + U.rand(-10, 10),
        phase: U.rand(U.TAU),
        size: U.rand(1.4, 2.4),
      });
    }

    /** 一道光從 (x0,y0) 飛到 (x1,y1)：變身後的心情去找牠的新家 */
    trail(x0, y0, x1, y1, hue) {
      this.add({ type: 'trail', x0, y0, x1, y1, x: x0, y: y0, life: 1.3, hue, arc: U.rand(-80, 80), hist: [] });
    }

    /** 煩惱被吃掉時，字一個個散開變成光 */
    scatterText(x, y, str, hue, hand = true) {
      const chars = Array.from(str).filter((c) => c.trim()).slice(0, 40);
      chars.forEach((ch, i) => {
        const a = U.rand(U.TAU);
        const v = U.rand(20, 70);
        this.add({
          type: 'char',
          x: x + U.rand(-12, 12),
          y: y + U.rand(-12, 12),
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 30,
          life: U.rand(1.6, 2.6) + i * 0.015,
          ch,
          hue,
          hand,
          rot: U.rand(-0.4, 0.4),
          vr: U.rand(-1.5, 1.5),
          size: U.rand(12, 17),
        });
      });
    }

    update(dt) {
      const L = this.list;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i];
        p.age += dt;
        if (p.age >= p.life) {
          L.splice(i, 1);
          continue;
        }
        switch (p.type) {
          case 'spark': {
            const k = Math.exp(-p.drag * dt);
            p.vx *= k;
            p.vy = p.vy * k + p.grav * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            break;
          }
          case 'heart':
            p.x += (p.vx + Math.sin(p.age * 3 + p.phase) * 10) * dt;
            p.y += p.vy * dt;
            p.vy *= Math.exp(-0.5 * dt);
            break;
          case 'text':
            p.y += p.vy * dt;
            p.vy *= Math.exp(-1.2 * dt);
            break;
          case 'firefly':
            p.vx += U.rand(-30, 30) * dt;
            p.vx *= Math.exp(-1 * dt);
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            break;
          case 'trail': {
            const k = U.easeInOut(Math.min(1, p.age / (p.life * 0.8)));
            const mx = (p.x0 + p.x1) / 2 + p.arc;
            const my = Math.min(p.y0, p.y1) - 60;
            const a = 1 - k;
            p.x = a * a * p.x0 + 2 * a * k * mx + k * k * p.x1;
            p.y = a * a * p.y0 + 2 * a * k * my + k * k * p.y1;
            p.hist.push(p.x, p.y);
            if (p.hist.length > 36) p.hist.splice(0, 2);
            break;
          }
          case 'char': {
            const k = Math.exp(-1.6 * dt);
            p.vx *= k;
            p.vy = p.vy * k - 14 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rot += p.vr * dt;
            break;
          }
          default:
            break;
        }
      }
    }

    draw(ctx) {
      const L = this.list;
      if (!L.length) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of L) {
        const t = p.age / p.life;
        if (p.type === 'spark') {
          const a = 1 - t;
          MJ.glow(ctx, p.x, p.y, p.size * 10, p.hue, p.sat, 0.65, a);
          ctx.fillStyle = U.hsla(p.hue, p.sat * 0.5, 0.92, a);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, U.TAU);
          ctx.fill();
        } else if (p.type === 'ring') {
          const e = U.easeOut(t);
          const r = U.lerp(p.r0, p.r1, e);
          ctx.strokeStyle = U.hsla(p.hue, Math.min(p.sat, 0.6), 0.8, (1 - t) * 0.55 * MJ.Bio.k);
          ctx.lineWidth = p.width * (1 - t * 0.6);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, r, r * p.squash, 0, 0, U.TAU);
          ctx.stroke();
        } else if (p.type === 'firefly') {
          const fade = Math.min(1, t * 6) * (1 - t);
          const tw = 0.55 + 0.45 * Math.sin(p.age * 6 + p.phase);
          MJ.glow(ctx, p.x, p.y, p.size * 12, p.hue, 0.9, 0.62, fade * tw);
          ctx.fillStyle = U.hsla(p.hue, 0.6, 0.9, fade * tw);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.8, 0, U.TAU);
          ctx.fill();
        } else if (p.type === 'char') {
          const a = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
          MJ.glow(ctx, p.x, p.y, p.size * 3, p.hue, 0.8, 0.6, a * 0.6);
        } else if (p.type === 'trail') {
          const a = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;
          const h = p.hist;
          for (let i = 0; i < h.length; i += 2) {
            const k = i / h.length;
            MJ.glow(ctx, h[i], h[i + 1], 6 + 16 * k, p.hue, 0.8, 0.65, a * k * 0.7);
          }
          MJ.glow(ctx, p.x, p.y, 40, p.hue, 0.8, 0.7, a);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const p of L) {
        const t = p.age / p.life;
        if (p.type === 'heart') {
          const a = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
          ctx.fillStyle = U.hsla(p.hue, 0.5, 0.78, a * 0.9);
          ctx.beginPath();
          U.heartPath(ctx, p.x, p.y, p.size * (0.8 + t * 0.4));
          ctx.fill();
        } else if (p.type === 'text') {
          const a = t < 0.1 ? t / 0.1 : 1 - Math.max(0, (t - 0.5) / 0.5);
          ctx.globalAlpha = a;
          // 數字（+20 光）用等寬字；其他用黑體。字重只有 400／500，不加陰影
          ctx.font = '500 ' + p.size + 'px ' + (/^[+\-]?\d/.test(p.str) ? MJ.FONT_NUM : MJ.FONT);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = p.color;
          ctx.fillText(p.str, p.x, p.y);
          ctx.globalAlpha = 1;
        } else if (p.type === 'char') {
          const a = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = a;
          // 散開的是使用者自己寫的字：手寫體
          ctx.font = p.size + 'px ' + (p.hand ? MJ.FONT_HAND : MJ.FONT);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = U.hsla(p.hue, 0.35, 0.9, 1);
          ctx.fillText(p.ch, 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }

  MJ.FX = FX;
})((window.MJ = window.MJ || {}));
