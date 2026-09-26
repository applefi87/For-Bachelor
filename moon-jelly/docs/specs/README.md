# 開發規格

給接手開發的人（另一個 Claude session 或任何工程師）。每份規格都是獨立的，照編號順序做；每一份做完都是一個可以合併的 PR。

| 編號 | 規格 | 前置 | 估計 |
|---|---|---|---|
| 00 | [把測試放進 repo](00-tests.md) | 無 | 半天 |
| 01 | [紀錄簿](01-record-book.md) | 無 | 2–3 天 |
| 02 | [存檔改成「館＋月份」](02-save-structure.md) | 無（01 做完再做比較順） | 1–2 天 |
| 03 | [公告與搬家](03-notices-and-move.md) | 需要新網址（見 04 的前置作業） | 2 天 |
| 04 | [Firebase 帳號與雲端備份](04-firebase-sync.md) | 02、03；使用者建好 Firebase 專案與 GitHub Pages | 5–7 天 |

## 先知道的事

- 專案在 `moon-jelly/`，純 vanilla JS 的傳統 `<script>`，共用一個全域 `MJ`，Canvas 2D，手機為主。先讀 `/CLAUDE.md`（使用者的習慣、安全規則）、`moon-jelly/README.md`、`docs/features/README.md`（每個功能現在的狀態）。
- **風格照舊版**：霧面玻璃、圓角、霞鶩文楷。不引進新的設計語言；新的畫面用現有的元件（`.sheet`、`.modal-card.paper`、`.rows`、`.chip`、`.btn`）。
- **守住的規則**：光很稀有（不新增任何給光的地方）；心理安全優先（任何新畫面都不在儀式中、不在危機安靜期跳出；危機紀錄永遠不重現原文）；**紀錄永遠不丟**。
- **文案**：繁體中文、白話、短；跟著那個檔案原本的語氣。專線畫面（`feelings.js` 的 `careHTML`）不套美術風格、不改文字。
- **每個功能檔要更新**：做完一份規格，把 `docs/features/` 裡對應的檔案（沒有就新增）改成「已有」，寫清楚行為與參數；`docs/features/README.md` 的總表也改。
- **commit**：英文、祈使句、說明為什麼；一份規格一個或幾個 commit；不改寫已推送的歷史、不 force push。

## 本機環境

```bash
cd moon-jelly
npx http-server -p 8765 -s -c-1 .        # 開發用伺服器
node tools/build-single.js dist/moon-jelly.html            # 單檔版
node tools/build-single.js out.html --fragment             # 給 Artifact 預覽用的片段
```

測試用 Playwright（`npm i -D playwright && npx playwright install chromium`），見 00。本機的 Chromium 連得到 Google Fonts，不用像雲端沙盒那樣攔字型。

## 部署與預覽的差別（很重要）

- claude.ai 的 Artifact（例如使用者最初的網站 `https://claude.ai/artifact/B2rNPPbEHxDQTRhYkoeBeR`）**擋掉所有網路請求**，只放行幾個 script CDN 與 Google Fonts。所以 Firebase（登入、Firestore）在 Artifact 裡**完全不能用**。
- 因此 04 之後正式網站要放在 **GitHub Pages**（或 Cloudflare Pages），Artifact 只當預覽。03 就是為了把使用者從舊的 Artifact 搬到新網址。

## 完成的定義

1. 規格裡的驗收項目全部通過，附截圖（桌面 1280×800 與手機 390×844）。
2. 00 的回歸測試全部通過，沒有 console 錯誤。
3. 功能檔與 README 更新。
4. 沒有新增給光的地方；危機測試（00 的 t12）通過。
