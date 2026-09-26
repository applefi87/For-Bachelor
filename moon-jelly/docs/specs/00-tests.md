# 00 把測試放進 repo

## 為什麼

到目前為止的回歸測試只存在雲端 session 的暫存區，換 session 就沒了。之後每份規格都要跑，所以先把它們放進 `moon-jelly/tests/`。

## 要做的

1. `tests/kit.js`：共用工具。`open({ port, mobile, out })` 開瀏覽器（手機 390×844、`deviceScaleFactor 2`、`isMobile`、`hasTouch`；桌面 1280×800）、清 `localStorage`（先設 `MJ.Game.noSave = true` 再清，不然離開頁面時會把舊存檔寫回去）、收集 `pageerror` 與 console error；`enter(p)` 按 `#introStart` 再關掉所有排隊的視窗（`MJ.UI.modalOpenNow` 為真就 `MJ.UI.closeModal()`）；`closeModals(p)`；`report(errs)`。
2. `tests/run.js`：一個指令跑全部，印出每組 PASS／FAIL 數與 console 錯誤數，任何 FAIL 就 exit 1。
3. 把下面每一組寫成獨立檔案。每個 `ok(條件, 說明)` 印 PASS／FAIL。

## 要重建的測試（原本的內容）

| 檔案 | 檢查什麼 |
|---|---|
| `desktop.js`（原 t7，50 項） | 開場與歡迎卡；餵食；摸摸；心情儀式走完一遍（選字、強度 9、選「先著陸」、第 4 步 6）→ 結果卡寫海馬、有「浪從 9 退到了 6」、沒有「+30 光」；一天前三份給 30 光、第四份不給；不同陪法給的光相同；連續只倒出來的提醒；商店撈水母、棲地、主題；水母名冊；成就；設定的匯出匯入存檔碼；螃蟹被點會躲進洞（`inCave > 0 || flee != null`，允許重跑一次）；潮汐圖用過 3 次才畫；歡迎回來卡合併所有事情；來信 |
| `mobile.js`（原 t8，9 項） | 390×844 的版面：底部選單不擋沙地生物、抽屜從底部上來、儀式卡片不超出畫面、說明牌可以拉開與關上 |
| `crisis.js`（原 t12，24 項） | 每個寫字的地方（倒出來、寫給自己、小事、瓶中信、改名）打自傷字詞都會出現專線畫面；專線有 1925、1995、113、1980、119、110 且是 `tel:` 連結；1980 排最後；危機紀錄不給光、結果卡不重現原文、之後的安靜期（`MJ.UI.quietUntil` 很久）；「更多」的「需要找人說話」打得開 |
| `oldsave.js`（原 t9，5 項） | 用 git 上一個 tag／main 的版本產生存檔（含珍珠、心情水母、棲地），用現在的版本開：紀錄數一樣、裝飾在、珍珠規則相容、棲地顯示「已擁有」、重新整理不壞 |
| `callout.js`（原 co1–co6） | 點水母出牌子、拖拉展開、左右滑換一隻、往邊緣拉關上（桌面滑鼠與手機真觸控 CDP `Input.dispatchTouchEvent`）；19 種生物逐一打開並滑到底；結果卡之後的牌子（含「倒出來」被吃掉指那隻水母、危機不跳）；出生、撈到、長大、章魚之後的牌子；水族箱小事件（`MJ.Game.fireEvent('swarm'|'bottle'|'visitor'|'bubbles')`）只有一行字、`MJ.UI.callout.open` 為假 |
| `step4.js` | 第 4 步標題「現在大概在哪裡？」；「剛才」刻度的 x 與滑桿圓鈕在 i0 的位置差 ≤ 2px |
| `daynight.js` | `MJ.Day.setClock(10/19.5/23)` 之後畫面上半段（canvas 上 45%）的平均亮度：夜比白天暗 ≥ 20%、傍晚介於中間；`MJ.Game.rate` 白天夜晚差 < 2%；`pickWanderTarget` 400 次的平均 y 夜裡比白天低 ≥ H×0.04；`?clock=22` 開頁面立刻 `MJ.Day.night === 1`；自然變化約 20 秒（3 秒後 0.2–0.95，23 秒後 < 0.1） |
| `bigsave.js` | 塞 3,000 筆紀錄（各種陪法、raw 600 字）再 `commitEntry` 一筆：`entries.length === 3001`；`MJ.Store.size` ≤ 4.2 MB 且有 `rawTrimmed`；`MJ.Store.save` 成功；生態重建 < 200 ms、生物 < 200 隻 |

## 驗收

- `node tests/run.js` 全部 PASS，桌面與手機各一組截圖存到 `tests/shots/`（加進 `.gitignore`）。
