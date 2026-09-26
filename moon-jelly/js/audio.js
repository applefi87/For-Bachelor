/* 海月水母館 — 聲音引擎：全部即時合成，沒有任何音檔 */
(function (MJ) {
  'use strict';

  const U = MJ.U;
  const SCALE = [0, 2, 4, 7, 9]; // 大調五聲音階，怎麼彈都好聽
  const KEY = 62; // D4

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const degMidi = (idx, base = KEY) => {
    const o = Math.floor(idx / 5);
    const d = ((idx % 5) + 5) % 5;
    return base + 12 * o + SCALE[d];
  };

  // D 大調裡溫柔的四個和弦
  const PROGRESSION = [
    [50, 57, 61, 66], // Dmaj9
    [47, 54, 57, 61], // Bm9
    [43, 54, 57, 62], // Gmaj9
    [45, 52, 59, 62], // Asus
  ];
  const CHORD_LEN = 10;

  const MOODS = {
    deep: { name: '深海', water: 0.16, rain: 0, pad: 1, bells: 0.55, box: 0 },
    musicbox: { name: '音樂盒', water: 0.09, rain: 0, pad: 0.55, bells: 0, box: 1 },
    rain: { name: '雨夜', water: 0.07, rain: 0.11, pad: 0.7, bells: 0.25, box: 0 },
    quiet: { name: '靜謐', water: 0.14, rain: 0, pad: 0, bells: 0, box: 0 },
  };

  const A = {
    ctx: null,
    settings: { music: true, sfx: true, volume: 0.8, mood: 'deep', sing: true, muted: false },
    MOODS,
  };

  A.configure = (s) => {
    Object.assign(A.settings, s || {});
    if (A.ctx) A.applySettings();
  };

  A.init = () => {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    let ctx;
    try {
      ctx = new AC();
    } catch (e) {
      return;
    }
    A.ctx = ctx;

    A.master = ctx.createGain();
    A.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 18;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.35;
    A.master.connect(comp).connect(ctx.destination);

    A.reverb = ctx.createConvolver();
    A.reverb.buffer = makeImpulse(ctx, 4.2, 2.6);
    const revOut = ctx.createGain();
    revOut.gain.value = 0.62;
    A.reverb.connect(revOut).connect(A.master);

    A.musicBus = ctx.createGain();
    A.musicFilter = ctx.createBiquadFilter();
    A.musicFilter.type = 'lowpass';
    A.musicFilter.frequency.value = 2600;
    A.musicFilter.Q.value = 0.4;
    A.musicBus.connect(A.musicFilter);
    A.musicFilter.connect(A.master);
    const mSend = ctx.createGain();
    mSend.gain.value = 0.9;
    A.musicFilter.connect(mSend).connect(A.reverb);

    A.sfxBus = ctx.createGain();
    A.sfxBus.connect(A.master);
    const sSend = ctx.createGain();
    sSend.gain.value = 0.5;
    A.sfxBus.connect(sSend).connect(A.reverb);

    A.padBus = ctx.createGain();
    A.padBus.gain.value = 0;
    A.padBus.connect(A.musicBus);

    // 海水聲：棕噪音 + 緩慢擺動的低通
    const brown = makeNoise(ctx, 'brown', 6);
    const water = ctx.createBufferSource();
    water.buffer = brown;
    water.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'lowpass';
    wf.frequency.value = 340;
    wf.Q.value = 0.7;
    const wlfo = ctx.createOscillator();
    wlfo.frequency.value = 0.06;
    const wlfoGain = ctx.createGain();
    wlfoGain.gain.value = 140;
    wlfo.connect(wlfoGain).connect(wf.frequency);
    A.waterGain = ctx.createGain();
    A.waterGain.gain.value = 0;
    water.connect(wf).connect(A.waterGain).connect(A.musicBus);
    water.start();
    wlfo.start();

    // 雨聲：白噪音帶通
    const white = makeNoise(ctx, 'white', 4);
    const rain = ctx.createBufferSource();
    rain.buffer = white;
    rain.loop = true;
    const rhp = ctx.createBiquadFilter();
    rhp.type = 'highpass';
    rhp.frequency.value = 1100;
    const rlp = ctx.createBiquadFilter();
    rlp.type = 'lowpass';
    rlp.frequency.value = 6500;
    A.rainGain = ctx.createGain();
    A.rainGain.gain.value = 0;
    rain.connect(rhp).connect(rlp).connect(A.rainGain).connect(A.musicBus);
    rain.start();

    A.noiseBuf = white;
    A.chordIdx = 0;
    A.nextChordAt = ctx.currentTime + 0.3;
    A.nextBellAt = ctx.currentTime + 2;
    A.nextBoxAt = ctx.currentTime + 1.5;
    A.nextDropAt = ctx.currentTime + 1;
    A.box = { idx: 7, left: 8 };
    A.lastSing = 0;
    A.singers = 0;
    A.extraRain = 0;

    A.applySettings(true);
    A.timer = setInterval(A.tick, 180);
  };

  A.applySettings = (fadeIn) => {
    if (!A.ctx) return;
    const now = A.ctx.currentTime;
    const s = A.settings;
    const mood = MOODS[s.mood] || MOODS.deep;
    A.master.gain.cancelScheduledValues(now);
    A.master.gain.setTargetAtTime(s.muted ? 0 : s.volume, now, fadeIn ? 1.2 : 0.15);
    A.musicBus.gain.setTargetAtTime(s.music ? 1 : 0, now, 0.4);
    A.sfxBus.gain.setTargetAtTime(s.sfx ? 1 : 0, now, 0.1);
    // 夜裡跟著閉館：水聲 ×0.7、和弦墊 ×0.85（鈴聲在 tick 裡變稀）
    const night = MJ.Day ? MJ.Day.night : 0;
    A.nightApplied = night;
    A.waterGain.gain.setTargetAtTime(mood.water * (1 - 0.3 * night), now, 1.5);
    A.rainGain.gain.setTargetAtTime(Math.max(mood.rain, A.extraRain), now, 2);
    A.padBus.gain.setTargetAtTime(mood.pad * (1 - 0.15 * night), now, 2);
  };

  A.setRainLayer = (on) => {
    A.extraRain = on ? 0.06 : 0;
    if (A.ctx) A.applySettings();
  };

  A.tick = () => {
    const ctx = A.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const s = A.settings;
    if (!s.music || A.sleeping === 'done') return;
    const mood = MOODS[s.mood] || MOODS.deep;
    const night = MJ.Day ? MJ.Day.night : 0;
    if (Math.abs(night - (A.nightApplied || 0)) > 0.05) A.applySettings();

    if (mood.pad > 0 && now >= A.nextChordAt - 1.2) {
      const at = Math.max(A.nextChordAt, now + 0.05);
      playChord(PROGRESSION[A.chordIdx], at, CHORD_LEN);
      A.chordIdx = (A.chordIdx + 1) % PROGRESSION.length;
      A.nextChordAt = at + CHORD_LEN;
    } else if (mood.pad === 0 && now > A.nextChordAt) {
      A.nextChordAt = now + 1;
    }

    // 水母唱得多的時候，背景的鈴聲就少一點
    // 夜裡鈴聲稀一點、低兩度
    const bellDensity = mood.bells * (s.sing && A.singers >= 3 ? 0.4 : 1) * (1 - 0.6 * night);
    if (bellDensity > 0 && now >= A.nextBellAt) {
      if (Math.random() < bellDensity) {
        const idx = U.randInt(5 - Math.round(2 * night), 14 - Math.round(3 * night));
        A.bell(degMidi(idx), U.rand(0.1, 0.24), U.rand(-0.7, 0.7), now + 0.02, A.musicBus, U.rand(2.6, 4.2));
        if (Math.random() < 0.2) A.bell(degMidi(idx + 2), U.rand(0.06, 0.12), U.rand(-0.7, 0.7), now + 0.32, A.musicBus, 3);
      }
      A.nextBellAt = now + U.rand(1.3, 3.6);
    }

    if (mood.box > 0 && now >= A.nextBoxAt) {
      const b = A.box;
      if (b.left <= 0) {
        b.left = U.randInt(6, 10);
        A.nextBoxAt = now + U.rand(1.8, 3.2);
      } else {
        b.idx = U.clamp(b.idx + U.pick([-2, -1, -1, 0, 1, 1, 2]), 4, 15);
        if (Math.random() > 0.15) {
          A.pluck(degMidi(b.idx), U.rand(0.16, 0.26), U.rand(-0.3, 0.3), now + 0.02);
          if (Math.random() < 0.25) A.pluck(degMidi(b.idx - 2, KEY - 12), 0.1, 0, now + 0.02);
        }
        b.left--;
        A.nextBoxAt = now + U.pick([0.42, 0.42, 0.84, 0.63]);
      }
    }

    const rainLevel = Math.max(mood.rain, A.extraRain);
    if (rainLevel > 0 && now >= A.nextDropAt) {
      A.drop(now + 0.01, rainLevel);
      A.nextDropAt = now + U.rand(0.08, 0.6);
    }
  };

  function playChord(notes, at, len) {
    const ctx = A.ctx;
    const attack = 3.5;
    const release = 5.5;
    const end = at + len + release;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 900;
    filt.Q.value = 0.3;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(1, at + attack);
    env.gain.setValueAtTime(1, at + len);
    env.gain.linearRampToValueAtTime(0, end);
    filt.connect(env).connect(A.padBus);
    for (const n of notes) {
      const f = mtof(n);
      const parts = [
        ['sine', f, 0, 0.05],
        ['triangle', f, 7, 0.028],
        ['sine', f * 2, -5, 0.012],
      ];
      for (const [type, freq, det, g] of parts) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        o.detune.value = det + U.rand(-3, 3);
        const gn = ctx.createGain();
        gn.gain.value = g;
        o.connect(gn).connect(filt);
        o.start(at);
        o.stop(end + 0.1);
      }
    }
  }

  /** 玻璃鈴聲 */
  A.bell = (midi, vel = 0.2, pan = 0, when, bus, dur = 3) => {
    const ctx = A.ctx;
    if (!ctx) return;
    const t = when || ctx.currentTime + 0.01;
    const f = mtof(midi);
    const out = ctx.createGain();
    out.gain.value = 1;
    let node = out;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = U.clamp(pan, -1, 1);
      out.connect(p);
      node = p;
    }
    node.connect(bus || A.sfxBus);
    const partials = [
      [1, vel, dur],
      [2.01, vel * 0.22, dur * 0.6],
      [4.17, vel * 0.07, dur * 0.25],
    ];
    for (const [ratio, amp, d] of partials) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(amp, 0.0002), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + d + 0.05);
    }
  };

  /** 音樂盒的撥弦 */
  A.pluck = (midi, vel = 0.2, pan = 0, when) => {
    const ctx = A.ctx;
    if (!ctx) return;
    const t = when || ctx.currentTime + 0.01;
    const f = mtof(midi + 12);
    const out = ctx.createGain();
    let node = out;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      out.connect(p);
      node = p;
    }
    node.connect(A.musicBus);
    const parts = [
      ['triangle', 1, vel, 1.6],
      ['sine', 3.01, vel * 0.18, 0.5],
      ['sine', 5.4, vel * 0.05, 0.2],
    ];
    for (const [type, r, amp, d] of parts) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * r;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + d + 0.05);
    }
  };

  A.drop = (t, level) => {
    const ctx = A.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    const f = U.rand(1800, 4200);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.02 + level * 0.12 * Math.random(), t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    let node = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = U.rand(-0.9, 0.9);
      g.connect(p);
      node = p;
    }
    o.connect(g);
    node.connect(A.musicBus);
    o.start(t);
    o.stop(t + 0.1);
  };

  const ready = () => A.ctx && A.ctx.state === 'running';

  /* ---------- 音效 ---------- */

  A.bubble = (pan = 0, size = 1) => {
    if (!ready()) return;
    const ctx = A.ctx;
    const t = ctx.currentTime + 0.005;
    const o = ctx.createOscillator();
    o.type = 'sine';
    const f0 = U.rand(260, 520) / size;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * U.rand(2.2, 3), t + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    let node = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = U.clamp(pan, -1, 1);
      g.connect(p);
      node = p;
    }
    o.connect(g);
    node.connect(A.sfxBus);
    o.start(t);
    o.stop(t + 0.14);
  };

  A.plop = (pan = 0) => {
    if (!ready()) return;
    const ctx = A.ctx;
    const t = ctx.currentTime + 0.005;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(620, t);
    o.frequency.exponentialRampToValueAtTime(170, t + 0.13);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    let node = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = U.clamp(pan, -1, 1);
      g.connect(p);
      node = p;
    }
    o.connect(g);
    node.connect(A.sfxBus);
    o.start(t);
    o.stop(t + 0.2);
  };

  /** 點水：左邊低音、右邊高音，整片水面就是一把琴 */
  A.tapNote = (xFrac, pan) => {
    if (!ready()) return;
    const idx = Math.round(U.clamp(xFrac, 0, 1) * 10) + 3;
    A.bell(degMidi(idx), 0.2, pan, 0, A.sfxBus, 2.6);
  };

  A.chime = (pan = 0) => {
    if (!ready()) return;
    const idx = U.randInt(8, 14);
    A.bell(degMidi(idx), 0.13, pan, 0, A.sfxBus, 2);
  };

  A.sparkle = (pan = 0) => {
    if (!ready()) return;
    const t = A.ctx.currentTime + 0.01;
    const i = U.randInt(9, 12);
    A.bell(degMidi(i), 0.1, pan, t, A.sfxBus, 1.4);
    A.bell(degMidi(i + 2), 0.08, pan, t + 0.07, A.sfxBus, 1.6);
  };

  A.arpeggio = (start = 5, count = 5, step = 0.09, vel = 0.16) => {
    if (!ready()) return;
    const t = A.ctx.currentTime + 0.02;
    for (let i = 0; i < count; i++) {
      A.bell(degMidi(start + i), vel * (1 - i * 0.06), (i / count - 0.5) * 0.8, t + i * step, A.sfxBus, 2.8);
    }
  };

  A.hatch = () => A.arpeggio(5, 6, 0.11, 0.17);
  A.discover = () => {
    A.arpeggio(7, 7, 0.07, 0.15);
    if (ready()) A.bell(degMidi(17), 0.1, 0, A.ctx.currentTime + 0.6, A.sfxBus, 4);
  };

  A.whoosh = () => {
    if (!ready()) return;
    const ctx = A.ctx;
    const t = ctx.currentTime + 0.01;
    const src = ctx.createBufferSource();
    src.buffer = A.noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(260, t);
    bp.frequency.exponentialRampToValueAtTime(1400, t + 0.7);
    bp.frequency.exponentialRampToValueAtTime(380, t + 1.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
    src.connect(bp).connect(g).connect(A.sfxBus);
    src.start(t, U.rand(0, 2));
    src.stop(t + 1.8);
  };

  A.click = () => {
    if (!ready()) return;
    const ctx = A.ctx;
    const t = ctx.currentTime + 0.005;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = 1320;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g).connect(A.sfxBus);
    o.start(t);
    o.stop(t + 0.08);
  };

  A.open = () => {
    if (!ready()) return;
    const t = A.ctx.currentTime + 0.01;
    A.bell(degMidi(10), 0.07, -0.2, t, A.sfxBus, 1.2);
    A.bell(degMidi(12), 0.06, 0.2, t + 0.06, A.sfxBus, 1.4);
  };

  /** 水母唱歌：每隻水母脈動時偶爾發出自己的音 */
  A.sing = (idx, vel = 0.14, pan = 0) => {
    if (!ready() || !A.settings.sing || !A.settings.music) return;
    const now = A.ctx.currentTime;
    if (now - A.lastSing < 0.3) return;
    A.lastSing = now;
    A.bell(degMidi(idx + 3), vel, pan, now + 0.02, A.musicBus, 3.2);
  };

  /** 呼吸引導：吸氣時聲音變亮，吐氣時變暗 */
  A.breath = (phase, dur) => {
    if (!ready()) return;
    const f = A.musicFilter.frequency;
    const now = A.ctx.currentTime;
    f.cancelScheduledValues(now);
    f.setValueAtTime(f.value, now);
    if (phase === 'in') f.linearRampToValueAtTime(4200, now + dur);
    else if (phase === 'out') f.linearRampToValueAtTime(700, now + dur);
    else if (phase === 'end') f.linearRampToValueAtTime(2600, now + 2);
    if (phase === 'in') A.bell(degMidi(7), 0.08, 0, now + 0.02, A.sfxBus, 3.5);
    if (phase === 'out') A.bell(degMidi(5), 0.07, 0, now + 0.02, A.sfxBus, 4);
  };

  /** 晚安模式：音量在指定時間內慢慢降到 0 */
  A.sleepFade = (minutes) => {
    if (!A.ctx) return;
    const now = A.ctx.currentTime;
    const g = A.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0.0001, now + minutes * 60);
    A.sleeping = 'fading';
    clearTimeout(A.sleepTimer);
    A.sleepTimer = setTimeout(() => (A.sleeping = 'done'), minutes * 60000);
  };
  A.wake = () => {
    clearTimeout(A.sleepTimer);
    A.sleeping = null;
    A.applySettings(true);
  };

  function makeNoise(ctx, kind, seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.2;
      } else d[i] = w * 0.5;
    }
    // 頭尾淡入淡出，循環時不會喀一聲
    const fade = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < fade; i++) {
      d[i] *= i / fade;
      d[len - 1 - i] *= i / fade;
    }
    return buf;
  }

  function makeImpulse(ctx, seconds, decay) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  A.degMidi = degMidi;
  MJ.Audio = A;
})((window.MJ = window.MJ || {}));
