/* 海月水母館 — 日夜：一天的時鐘。海、水母、聲音、生物都從這裡拿「太陽有多亮」，不各自看時間。
 *
 *   MJ.Day.sun    0..1  太陽曲線：白天 1；17:30 起慢慢降，21:00 到 0；05:30 起慢慢升，07:00 回到 1
 *   MJ.Day.night  0..1  = 1 − sun，給要「夜裡才有」的東西用
 *   MJ.Day.phase  'day' | 'dusk' | 'night' | 'dawn'
 *   MJ.Day.setClock(h)  撥時鐘（小時，可以是小數，null 恢復真實時間），立刻套用；網址加 ?clock=22 也可以
 *
 * 讀的是裝置的系統時間，每 15 秒重新判斷一次，回到前景時立刻判斷；自然變化用大約 20 秒慢慢過去。
 * 說明與參數：docs/features/daynight.md
 */
(function (MJ) {
  'use strict';

  const Day = { clock: null, sun: 1, night: 0, phase: 'day', target: 1, timer: 0 };

  try {
    const q = new URLSearchParams(location.search).get('clock');
    if (q != null && q !== '' && isFinite(+q)) Day.clock = ((+q % 24) + 24) % 24;
  } catch (e) {
    /* 沒有網址參數也沒關係 */
  }

  /** 現在幾點（小時，含分鐘的小數） */
  Day.hourNow = () => {
    if (Day.clock != null) return Day.clock;
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  };

  const smooth = (k) => k * k * (3 - 2 * k);

  /** 太陽曲線：某個時刻太陽有多亮 */
  Day.sunAt = (h) => {
    if (h >= 7 && h < 17.5) return 1;
    if (h >= 17.5 && h < 21) return 1 - smooth((h - 17.5) / 3.5);
    if (h >= 5.5 && h < 7) return smooth((h - 5.5) / 1.5);
    return 0;
  };

  Day.phaseAt = (h) => (h >= 7 && h < 17.5 ? 'day' : h >= 17.5 && h < 21 ? 'dusk' : h >= 5.5 && h < 7 ? 'dawn' : 'night');

  /** 重新看一次時間。instant：不做過渡，直接跳到目標 */
  Day.sync = (instant) => {
    const h = Day.hourNow();
    Day.target = Day.sunAt(h);
    Day.phase = Day.phaseAt(h);
    Day.timer = 15;
    if (instant) {
      Day.sun = Day.target;
      Day.night = 1 - Day.sun;
    }
  };

  Day.setClock = (h) => {
    Day.clock = h == null ? null : ((+h % 24) + 24) % 24;
    Day.sync(true);
  };

  /** 每一幀：慢慢靠近目標（約 20 秒走完） */
  Day.update = (dt) => {
    Day.timer -= dt;
    if (Day.timer <= 0) Day.sync(false);
    const d = Day.target - Day.sun;
    if (Math.abs(d) < 0.002) Day.sun = Day.target;
    else Day.sun += d * Math.min(1, dt * 0.15);
    Day.night = 1 - Day.sun;
  };

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) Day.sync(false);
  });

  Day.sync(true);
  MJ.Day = Day;
})((window.MJ = window.MJ || {}));
