# 04 Firebase 帳號與雲端備份

## 一句話

一進館就有一個匿名帳號在背後把紀錄備份到 Firestore；想跨裝置就綁 Google。本機優先、紀錄用聯集合併、永遠不少一筆；沒網路照玩。

## 使用者的決定

- Firebase；心情原文**全部上傳**（做法 A，`docs/plans/cloud.md` 第 5 節）；不訂閱、不 iOS。
- 舊網址的資料經 03 搬過來後要自動進雲端。

## 前置作業（使用者自己做，做完把結果貼給開發的人）

1. **GitHub Pages**：repo Settings → Pages → Source「Deploy from a branch」→ `main`、`/ (root)`。網址會是 `https://applefi87.github.io/For-Bachelor/moon-jelly/`。想要短一點，可加一個 GitHub Actions workflow 把 `moon-jelly/` 發布到 `gh-pages` 分支的根目錄（非必要）。
2. **Firebase 專案**：console.firebase.google.com → 新增專案（Analytics 關掉）。
3. **Authentication** → Sign-in method：開啟「匿名」與「Google」。Settings → Authorized domains 加 `applefi87.github.io`（本機測試的 `localhost` 預設已在）。
4. **Firestore Database** → 建立（Native／Standard 模式），位置選 `asia-east1`（台灣）。
5. 專案設定 → 一般 → 「你的應用程式」新增 Web 應用程式，把 `firebaseConfig`（apiKey、authDomain、projectId、appId…；這些是公開值，不是秘密）貼到 `moon-jelly/js/cloud-config.js`。
6. Firestore → 規則：貼上本文件第「安全規則」節，發布。
7. 之後若要 Apple 登入：Apple 開發者帳號（99 美元／年）＋ Firebase 的 Apple provider；本規格不做。

## 載入 SDK

- 用 Firebase JS SDK 的**模組版**，從 `https://www.gstatic.com/firebasejs/<版本>/firebase-app.js`、`firebase-auth.js`、`firebase-firestore-lite.js`（Lite：沒有離線快取與即時監聽，我們自己管本機，剛好）。版本釘死（例如 10.x 的最新一版），寫在 `js/cloud.js` 頂端。
- `js/cloud.js` 是 `<script type="module">`，載入後把 `MJ.Cloud` 掛上去；**其他程式只透過 `MJ.Cloud` 存取**，而且要能在 `MJ.Cloud` 不存在或初始化失敗時照常運作（Artifact、單檔版、沒網路）。
- `tools/build-single.js` 目前只合併傳統 `<script src>`；改成：`type="module"` 的 script 保留原樣（單檔版沒有雲端功能，正常）。`--site=artifact` 時直接拿掉這個 script。
- `index.html` 的 `<script type="module" src="js/cloud.js">` 放在最後，`MJ.Game.init()` 不等它。

## 資料

```
users/{uid}/profile            ← state 除 entries 外的全部（02 的 profile），加 u、v: 2、device
users/{uid}/months/{YYYY-MM}   ← { m, u, entries: { [id]: entry } }（02 的月份文件，原樣）
```

- 單一文件上限 1 MiB；一個月 150 筆、每筆 ≤ 2 KB，最多 300 KB，安全。若某月超過 800 KB（極端），把 `raw` 修剪（重用 `trimSave` 的做法）再上傳。
- `device`：本機產生的隨機 id（存 profile），只用來知道最後儲存的是哪台。

## 安全規則（Firestore）

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

只有本人能讀寫自己的路徑；其他都拒絕。這就是全部的防護：破解只影響自己（使用者的決定）。可選：在 profile 規則加 `request.resource.data.keys().hasOnly([...])` 的欄位白名單。

## 帳號

1. **第一次進館**（或舊使用者第一次載入這版）：`signInAnonymously()`。失敗（沒網路）就下次再試，不擋遊戲。
2. **綁 Google**：更多 → 帳號 → 「用 Google 登入，換手機也在」→ `linkWithPopup(GoogleAuthProvider)`；手機瀏覽器 popup 被擋（error `auth/popup-blocked`）就改 `linkWithRedirect`。
3. **另一台裝置登入同一個 Google**：`signInWithPopup` 會得到另一個 uid（B）。若本機原本是匿名 uid（A）且 A 在雲端有資料：把 A 的 profile 與 months 讀下來，和本機合併（下面的規則），再以 B 為身分上傳，最後把 A 的文件刪掉、A 的帳號 `delete()`。這一步要在 popup 完成後立刻做，有進度提示「正在合併紀錄」。
4. **`auth/credential-already-in-use`**（匿名帳號要綁的 Google 已經有帳號）：改成 `signInWithCredential(error.credential)`，然後照第 3 點合併。
5. 登出：更多 → 帳號 → 登出（本機存檔留著；登出後再 `signInAnonymously` 產生新的匿名帳號，並提示「這台裝置現在是新的匿名帳號，之前的紀錄還在你的 Google 帳號裡」）。

## 同步規則

- **紀錄（months）用聯集**：兩邊同一個月的 `entries` 依 `id` 合併；同一筆兩邊都有取 `u` 大的；一邊有另一邊沒有的補上。合併結果和雙方都不同時，本機更新 + 上傳。
- **profile 最後儲存的贏**：`u` 大的整份採用（本機的 `u` 是 `Game.save()` 的時間）。例外：`notices`、`settings.muted`、`tutorial` 這幾個不影響進度的用本機。
- 這兩個函式寫成純函式 `Cloud.mergeMonth(a, b)`、`Cloud.mergeProfile(a, b)`，可單獨測。

### 什麼時候傳

| 事件 | 動作 |
|---|---|
| 進館、登入成功 | 下載 profile 與**清單裡有的月份 ＋ 雲端有但本機沒有的月份**（`months` collection 列出），合併，必要時上傳 |
| `Game.commitEntry` 之後 | 立刻上傳那個月（與 profile） |
| `Game.save()`（其他改動） | 標 dirty；每 5 分鐘若有 dirty 就上傳 |
| `visibilitychange` 隱藏、`pagehide` | 上傳 dirty（`fetch` 用 `keepalive`；Firestore Lite 走 REST，可以） |
| 回到前景且距上次下載 > 10 分鐘 | 下載一次並合併 |
| 沒網路／失敗 | 留在 dirty，下次再傳；指數退避（10 秒起，最多 10 分鐘） |

- 寫入用 `setDoc`（整份文件），profile 與月份各自獨立；不做交易。
- 同一時間只跑一個同步（鎖），排隊的合併成一次。

### 狀態顯示

- 更多 → 帳號：一行「已備份・3 分鐘前」／「有 2 筆還沒備份（沒有網路）」／「還沒有連上雲端」。文字用 `timeStr` 或「N 分鐘前」。
- 不用 toast、不閃、不在 HUD 放圖示。匯入存檔碼（03）成功後例外：toast「存檔帶過來了，已備份」。

## 「更多 → 帳號」畫面（`RENDER.account`）

```
雲端備份
  已備份・3 分鐘前                    （狀態行）
  這台裝置的帳號：匿名                  （或：Google・名字／email 的前半）
  [ 用 Google 登入，換手機也在 ]        （匿名時）
  [ 登出 ]                            （已綁 Google 時）
你的資料
  存在 Google Firebase（台灣機房），只有你的帳號能讀。我們不看、不分析、不賣。
  [ 匯出存檔碼 ]  [ 隱私與條款 ]
  [ 刪除雲端資料與帳號 ]（.btn.ghost.quiet；確認框先問要不要匯出存檔碼；刪 profile、所有 months、然後 user.delete()；本機存檔留著；成功後 toast「雲端的資料刪掉了」）
```

`RENDER.more` 的 `items` 加 `['account', 'jelly'→ 新圖示 'cloud'（一朵簡單的線條雲）, '帳號與備份', 狀態行的短版]`，放在「聲音與設定」上面。

## 隱私與條款（`RENDER.privacy`，從帳號畫面與「關於」進）

繁體中文、一頁、`.paper` 或抽屜都可以。內容要點（照這個寫，不加行銷語）：

- 你在這裡寫的東西（選的字、強度、陪法、你寫的話、原文）存在你的裝置，登入後也備份到 Google Firebase 的伺服器（台灣機房）。
- 只有你的帳號能讀寫；開發者不看內容、不做分析、不投放廣告、不賣資料。
- 匿名帳號只是一個隨機編號；綁 Google 後我們拿到的是 Google 給的編號與你允許的名字或 email，只用來認出你。
- 你可以隨時匯出全部資料（存檔碼），隨時刪除雲端資料與帳號，刪除立即生效。
- 這裡不是醫療服務；撐不住的時候請撥專線（列出那幾支）。
- 更新日期。

## 隱藏的注意事項

- Artifact 與單檔版沒有 `MJ.Cloud`，所有入口（帳號畫面、狀態行）要顯示「這個版本沒有雲端備份」而不是壞掉。
- 03 匯入的存檔帶著舊的 `device`，上傳時換成本機的。
- 危機紀錄照樣備份（使用者選 A），但**不變**的規則是畫面上不重現原文。
- 不加任何給光的東西；登入不給光、備份不給光。
- 沒有帳號密碼、沒有 email 寄送。

## 驗收

- **純函式**：`mergeMonth`／`mergeProfile` 的單元測試（node 直接 require）：聯集、`u` 大的贏、空值、重複 id。
- **假後端**：`MJ.Cloud.backend` 可以換成記憶體版（`get/set/delete/list`），Playwright 測試用它：
  1. 進館後 `Cloud.uid` 有值、profile 與本月文件在假後端裡。
  2. 記一筆心情 → 本月文件立刻更新，其他月份沒動。
  3. 模擬第二台裝置（另一個 context，同 uid）各記一筆 → 兩邊同步後都各有兩筆。
  4. 兩邊改同一筆小事的狀態 → `u` 大的贏。
  5. 斷網（`context.setOffline(true)`）記兩筆 → 狀態行寫「有 2 筆還沒備份」→ 恢復後 30 秒內備份完成。
  6. 匿名 A 綁 Google 遇到已存在的 B（假後端模擬）→ 合併後 B 有 A 的紀錄、A 的文件被刪。
  7. 刪除帳號 → 假後端沒有任何該 uid 的文件；本機存檔還在。
- **真的 Firebase**（手動，寫在 PR 裡附截圖）：兩台裝置（電腦與手機）各記一筆，互相看得到；隱私頁打得開；Authorized domains 正確（Google 登入成功）。
- 00 全部通過；`docs/features/cloud.md` 新增並標「已有」，把 `docs/plans/cloud.md` 對應的段落改成指向它。
