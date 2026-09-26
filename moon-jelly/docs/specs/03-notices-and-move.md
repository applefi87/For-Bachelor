# 03 公告與搬家

## 一句話

一個「館方公告」的機制：可以對所有使用者發一則有按鈕的公告；第一則公告就是「海月搬家了，帶著存檔過去」，讓還在舊網址（claude.ai 的 Artifact）的人一兩步就把資料帶到新網站，之後由 04 自動備份到雲端。

## 為什麼

- 使用者的正式網站目前是 Artifact（`https://claude.ai/artifact/B2rNPPbEHxDQTRhYkoeBeR`），裡面**連不到 Firebase**，所以要搬到 GitHub Pages。存檔在瀏覽器裡是**依網址分開的**，新網址讀不到舊網址的存檔，只能請使用者帶過去。
- 使用者要求：搬家要「不做任何事，或簡單點幾步，一次性」；而且這個廣播機制之後要拿來做推廣與公告。

## 一、公告機制 `MJ.Notice`（新檔 `js/notice.js`）

### 資料

```js
{
  id: 'move-2026-10',          // 唯一；看過的記在 state.notices.seen[id] = 時間
  from: '2026-10-01',          // 可省略
  to: '2027-03-31',            // 可省略；過期不顯示
  kicker: '館方公告',           // 小字
  title: '海月搬到新的地址了',
  body: ['第一段。', '第二段。'],   // 純文字，一段一項；不放 HTML
  actions: [                   // 最多 3 個；第一個是主要（.btn），其他 .btn.ghost
    { label: '帶著存檔過去', kind: 'move' },
    { label: '複製存檔碼', kind: 'copySave' },
    { label: '之後再說', kind: 'later' },
  ],
  repeat: 'untilDone',         // 'once'（看過就不再出）| 'untilDone'（每次進館都出，直到 done）| 'daily'
  audience: 'all',             // 'all' | 'hasEntries'（有紀錄的人）| 'fresh'（第一次來的人）
  site: 'artifact',            // 'artifact' | 'web' | 'all'：只在哪種部署出現
}
```

`kind`：`link`（`url`，新分頁開）、`sheet`（`sheet: 'shop'` 之類，開抽屜）、`copySave`（把存檔碼複製到剪貼簿；`navigator.clipboard.writeText` 失敗就改成選取文字讓人自己複製）、`move`（見第二節）、`later`（關掉，依 `repeat` 決定下次）、`done`（關掉並標 `state.notices.done[id]`，不再出）。

### 來源

1. `js/notices.js`：內建陣列 `MJ.NOTICES`，隨程式一起打包（Artifact 只能靠這個）。
2. 正式網站另外嘗試 `fetch('notices.json', { cache: 'no-store' })`（同網域、5 秒逾時、失敗就當沒有），合併時同 `id` 以 json 的為準。這樣以後改一個檔案就能發公告，不用重新打包。
3. `MJ.CONFIG = { site: 'artifact' | 'web', newSiteUrl: 'https://…' }`：新檔 `js/config.js`，打包時決定；`build-single.js` 加參數 `--site=artifact`，預設 `web`。

### 什麼時候出現

- `UI.afterStart` 之後、歡迎卡或歡迎回來卡關掉之後，才輪到公告（用 `UI.showModal` 的排隊機制，公告排最後）。
- **不出現**的時候：儀式開著、`UI.isQuiet()`（陪完心情的安靜期、危機之後）、任何模式（呼吸、晚安、拍照、調整）、一天已經出過一則（`repeat: 'daily'` 與 `'once'` 都算；`untilDone` 例外）。
- 一次只出一則，依 `from` 新的在前。

### 樣式

`UI.showModal(render, { cls: 'paper' })`，和來信同一種紙：kicker 小字、標題 `.m-title`、段落 `.m-text`、按鈕列 `.btn-row.center`。不用圖示、不用驚嘆號、不用倒數、不用「限時」。

### 「更多」裡的「公告」

`RENDER.more` 加一列 `['notices', 'letter', '館方公告', '最近一則的標題']`，列出看過的公告（`.rows`），點開再看一次（動作照樣可用）。沒有公告時這列不顯示。

## 二、搬家

### 舊網址（Artifact，`site: 'artifact'`）

內建一則 `move-2026-10`（`repeat: 'untilDone'`、`audience: 'all'`）：

> 館方公告
> **海月搬到新的地址了**
> 新的地址一樣免費，多了一件事：你的紀錄會自動備份到雲端，換手機、清除瀏覽器資料都不會不見。
> 這裡的紀錄不會自己過去，要請你帶過去，一次就好。
> [帶著存檔過去] [複製存檔碼] [之後再說]

- `move`：算存檔碼 `MJ.Store.exportText(state)`。**≤ 200 KB**：開新分頁 `newSiteUrl + '#save=' + 存檔碼`（`<a target="_blank" rel="noopener">`，用真的連結元素 click，Artifact 裡 `window.open` 不可靠）。**> 200 KB**：先 `copySave`，再開 `newSiteUrl + '#paste'`，並在公告下方寫一行「存檔碼已複製，到新地址按「我有存檔碼」貼上就好」。
- 按了「帶著存檔過去」或「複製存檔碼」之後，這則公告下次改成一條 `.hint` 樣式的小橫幅（HUD 下方）「搬家了 → 帶著存檔過去」，不再用整張紙擋畫面；按 `×` 才 `done`。
- 舊網址**不要**停用任何功能，也不要把資料鎖住。

### 新網址（`site: 'web'`）

1. 載入時看 `location.hash`：
   - `#save=…`：解碼（`MJ.Store.importText`）。本機**沒有紀錄**（`entries.length === 0` 且 `stats.rituals === 0`）→ 直接匯入、`history.replaceState` 清掉 hash、進館後 toast「存檔帶過來了」。本機**已有紀錄** → 先問一張紙：「這裡已經有一份存檔（N 筆紀錄）。要用帶來的取代嗎？」[用帶來的] [保留這裡的]；選取代前先把這裡的匯出成存檔碼顯示一次（可複製）。
   - `#paste`：進館後直接開「我有存檔碼」的貼上畫面。
   - 解碼失敗：toast「這段存檔碼看不懂」，不動本機。
2. 開場畫面（`#intro`）在「入館」下方加一行小連結「我有存檔碼」→ 貼上畫面（用現有設定裡的匯入，抽出來成 `UI.pasteSaveModal()`）。
3. 匯入成功後：如果 04 已上線，立刻觸發一次雲端備份（`MJ.Cloud.flush()`）。

### 為什麼不自動

不同網址的 localStorage 互不相通，Artifact 又擋網路，沒有任何不經使用者的方法能把資料拿出來。「帶著存檔過去」一個按鈕就是最短的路。

## 三、發佈順序（給使用者的說明，寫進 PR）

1. 先部署新網址（04 的前置作業），確認 `#save=` 流程可用。
2. 再把 `--site=artifact` 的片段發布到舊的 Artifact（`B2rN…`），舊網址的人就會看到搬家公告。
3. 之後要發公告：改 `notices.json` 推上 main 即可；Artifact 那邊要重新打包才看得到。

## 驗收

1. `site: 'artifact'` 的建置：進館、關掉歡迎卡後出現搬家公告；儀式中、安靜期、晚安模式不出；按「之後再說」下次進館還會出；按「帶著存檔過去」開了含 `#save=` 的新分頁（測試用 `context.waitForEvent('page')`）、下次變成小橫幅。
2. 存檔碼 > 200 KB（塞 1,000 筆含 raw）：改走複製＋`#paste`。
3. `site: 'web'`：帶 `#save=` 開頁：空的本機直接匯入且 hash 被清掉；已有紀錄的本機出現取代／保留的紙，兩個選項都對；壞掉的碼不動本機。
4. `notices.json` 的一則 `once` 公告：出一次，第二天不再出；`更多 → 館方公告` 看得到。
5. 一天只出一則（兩則 `once` 同時有效時，第二則隔天才出）。
6. 00 全部通過；`docs/features/notices.md` 新增。
