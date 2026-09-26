# 海月水母館 — 設計重整：共同簡報（給規劃小組）

## 產品
- 一個療癒網站「海月水母館」（繁體中文、台灣使用者）。一座夜光水母缸，畫面全部是 Canvas 2D 程式繪製，聲音是 Web Audio 生成。
- 核心：使用者有情緒時按「心情」，走一個四步儀式（倒出來 → 取名字（10 個家族、60 個字、強度 0–10）→ 怎麼陪它（10 種陪法，每種長成不同海洋生物）→ 現在呢（再量一次強度））。每份心情長成一隻生物，生物之間有生態關係。
- 使用情境：常在晚上、在情緒不好的時候、在手機上使用。也可能是睡前（有晚安模式）。
- 程式：純 vanilla JS，無框架。可以用單一 HTML 檔打開。外部字型只能用 Google Fonts 的 <link>；其他資源都要 inline。
- 程式碼在 /home/user/For-Bachelor/moon-jelly/（style.css、js/ui.js、js/ritual.js、js/tides.js、js/world.js 的 THEMES、js/content.js 的文案、js/feelings.js 的家族顏色等）。**不要修改 repo 裡的任何檔案**，只讀。

## 現況的診斷（已經和使用者確認）
使用者覺得網站「看起來像 AI 做的」。審查結論：
1. 每個設計選擇都是預設值、說不出理由：毛玻璃（17 個 backdrop-filter）、19 種圓角、23 種字級、11 種字距、27 個陰影、珊瑚色膠囊主按鈕＋外框膠囊副按鈕、置中發光標題、中文旁邊的英文斜體襯線副標（Moon Jelly Aquarium）、發光圓圈裡放線條圖示的置中 modal 版型重複 8 次以上、什麼都做成同一種膠囊（60 個字的按鈕、需要、陪法、篩選）、通用 1.6px 線條圖示。
2. 介面蓋住了唯一有個性的東西：畫出來的水族箱。結果卡擋住剛長出來的生物。
3. 字體：霞鶩文楷（LXGW WenKai TC）在 12–13px 深色底上太細；強度數字突然用金色英文斜體（Cormorant）。
4. 文案：「慢慢」26 次、「不用」21 次、「沒關係」10 次、「— 海」簽名；每一句都在安慰，語氣平均，正是 AI 文字的特徵。使用者也說過不要講道理。
5. 手機構圖：上半部空、生物在底部只有 15–25px、和底部選單搶位置。

## 使用者選定的方向：B＋A
- **B 夜間水族館展示牌**（海裡的一切）：頂部資訊（HUD）、下方選單、通知、生物說明。說明出現在生物旁邊，用一條細線指過去（像水族館玻璃旁的解說牌）；左對齊、有編號、數字用等寬字、只用一個強調色；不擋畫面。
- **A 標本圖版／紙**（收起來的東西）：圖鑑、海的來信、珍珠盒、每週回顧、你寫給自己的話、每一筆心情（採集／觀察紀錄卡）。借用海克爾《自然界的藝術形態》圖版與博物館標本卡：紙、細線、圖版編號、學名斜體。
- 原則：**你寫的字用手寫體（文楷），系統的字用印刷體**。海是暗的，你留下的東西是紙做的。
- 使用者特別強調：**風格統一、設計感**，以及**背景等顏色風格會影響情緒與感受**。

## 可看的圖（用 Read 工具打開）
截圖資料夾：/tmp/claude-0/-home-user-For-Bachelor/5daffd50-f9e4-5512-83b0-37d13290618f/scratchpad/shots/
- f-d01-intro.png 開場、f-d03-tank.png 主畫面、f-d04-codex.png 圖鑑、f-d05-jelly.png 水母名片、f-d06-shop.png 商店、f-d07-more.png 更多、f-d08/09-letter 海的來信、f-d10-pour / f-d11-name / f-d12-turn 儀式、f-d13-result 結果卡
- f-m01…f-m13 是同樣畫面的手機版（390×844，2 倍解析度）
- a03-ground.png（著陸互動）、a09-shop-habitat.png、a11-tides.png（潮汐圖）、a13-recap.png、a14-welcome-back.png
審查圖：/tmp/claude-0/-home-user-For-Bachelor/5daffd50-f9e4-5512-83b0-37d13290618f/scratchpad/review/tells.png（13 處 AI 痕跡）、review/directions.png（A/B/C 草稿）

## 技術限制
- 手機 390px 寬不能橫向溢出；觸控目標至少 44px；文字對比至少 WCAG AA。
- 可用 Google Fonts（繁中可選：Noto Sans TC、Noto Serif TC、LXGW WenKai TC、Cactus Classical Serif、Chiron Hei HK、Chiron Sung HK、Iansui 等；拉丁字：IBM Plex Mono、EB Garamond 等）。中文字型很大，最多用 3–4 個家族。
- 世界的顏色在 js/world.js 的 THEMES（night 預設、dusk、moon、abyss、sakura、aurora），每個有 grad（由上到下 4 色）、sand、weed 等。感覺家族的顏色在 js/feelings.js 的 FAMILIES（hue/sat）。

## 產出格式
- 寫成一個 markdown 檔（路徑見你的任務）。要**具體**：hex 色碼、px、字重、行高、元件規則、要刪掉什麼。每個決定寫一句理由。
- 不確定或證據薄弱的地方要老實標註，不要誇大研究結論。
- 用繁體中文寫。
