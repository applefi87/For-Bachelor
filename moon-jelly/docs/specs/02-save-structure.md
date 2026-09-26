# 02 存檔改成「館＋月份」

## 一句話

程式裡的 `state` 長相不變，只改**存起來的格式**：一份「館」（紀錄以外的全部）加上「每個月一份紀錄」。這是雲端同步的地基：上傳只傳有變的那個月。

## 為什麼

半年的紀錄可能 1 MB，每次存檔都整份寫一次太重，而且雲端不能每次都傳整份。拆成月份之後，本機與雲端都只動有變的部分。紀錄以 `id` 為主鍵，之後才能用「聯集」合併、永遠不少一筆。

## 現況（`js/store.js`）

- 一個鍵 `moonjelly.save.v1`，整份 JSON；`_` 開頭與 `fresh` 不寫入。
- `S.load()` 用 `merge(defaults, saved)`；`S.save(state)`；`S.exportText`／`S.importText`（base64 的整份 JSON）；`S.size`；`S.persist`。
- 紀錄的變動發生在：`Game.commitEntry`（新增、幼生決定陪法）、`Game.digestEntry`（`e.jellyAte`）、`Game.setStep`／`dueSteps`（`e.step.status`、`doneAt`、`asked`）、`Eco.rebuild`（一週沒決定的幼生自動 `e.turn = 'release'`）、`Game.trimSave`（拿掉 `raw`）。做這份規格時 `grep -n "e\.\(turn\|step\|jellyAte\|raw\|tt\)" js/*.js` 再確認一次。

## 要做的

### 1. 每筆紀錄加 `u`（最後改動時間）

- 新增 `Game.touchEntry(e)`：`e.u = Date.now()`；把 `monthOf(e)` 加進 `MJ.Store.dirty`（一個 `Set`）。
- 上面列的每個變動點都呼叫它。`Eco.rebuild` 在 `creatures.js`，用 `this.game.touchEntry(e)`。
- 舊紀錄沒有 `u` 的，載入時補 `u = e.tt || e.t`。

### 2. 存的格式（v2）

localStorage 的鍵：

| 鍵 | 內容 |
|---|---|
| `moonjelly.profile.v2` | `state` 除了 `entries` 以外的全部，加 `v: 2`、`u`（最後儲存時間） |
| `moonjelly.month.v2.YYYY-MM` | `{ m: 'YYYY-MM', u, entries: { [id]: entry } }`，月份用 `e.t` 的本地時間算 |
| `moonjelly.months.v2` | 有哪些月份的清單 `['2026-08', '2026-09']`（載入時不用掃全部鍵） |

- `S.save(state)`：永遠寫 profile；月份只寫 `dirty` 裡的，寫完清空。第一次（沒有 v2 鍵）寫全部。
- `S.load()`：讀 profile 與所有月份，把 entries 攤平成陣列、依 `t` 排序，放回 `state.entries`；`merge(defaults, …)` 照舊，所以之後新增欄位還是有預設值。
- 同一筆紀錄如果出現在兩個月份文件裡（不該發生，但要防），以 `u` 大的為準。

### 3. 從 v1 搬過來

- `S.load()` 發現只有 `moonjelly.save.v1`：讀進來、立刻用 v2 格式寫出去（全部月份）、確認寫成功後把 v1 改名成 `moonjelly.save.v1.bak`（`setItem` 新鍵、`removeItem` 舊鍵）；7 天後再開時刪掉 `.bak`（profile 記 `migratedAt`）。
- 寫 v2 失敗（配額）：不改名，照舊用 v1 跑，並讓 `Game.trimSave` 先修剪再試一次。
- 存檔碼：`exportText` 仍輸出**整份** state（含 entries 陣列，`v: 2`）；`importText` 接受 v1 與 v2 兩種（有 `entries` 陣列就直接用；如果是 profile＋months 的物件也接受，方便之後從雲端匯出的東西）。匯入後把所有月份標 dirty。
- 「重新開始」（`S.reset`）要刪掉所有 v2 鍵與 `.bak`。

### 4. `trimSave`

改成算 v2 的總大小（profile ＋ 所有月份）；修剪時把被改的月份標 dirty。

### 5. 不變的

`Game.state.entries` 還是陣列，其他程式一行都不用改；`Game.save()` 的呼叫時機不變。

## 驗收

1. 用 v1 存檔（00 的 `oldsave.js` 產生的）開新版：紀錄數、裝飾、珍珠、水母都在；localStorage 出現 profile、months 清單、每月一鍵；`moonjelly.save.v1.bak` 在、`moonjelly.save.v1` 不在。
2. 記一筆心情 → 只有那個月的鍵與 profile 的 `u` 改變（比較 `localStorage` 的其他鍵完全相同）。
3. 小事「做到了」→ 那筆的 `u` 更新、那個月 dirty。
4. 匯出存檔碼再「重新開始」再匯入：全部回來；匯入 v1 格式的碼也可以。
5. 3,000 筆（00 的 `bigsave.js`）：`S.save` 平均 < 30 ms（只寫一個月）；載入 < 300 ms。
6. `docs/features/save.md` 新增（把 README 總表的「存檔」那列指過去），寫清楚鍵與格式。
