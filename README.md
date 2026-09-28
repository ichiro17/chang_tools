# 🧰 小張的小工具箱

給老師的課堂小工具集 —— 打開就能用，免登入、免安裝。
點名抽籤、課堂時鐘、投影指令、放假倒數，一個網站搞定。

線上網址：https://github.com/ichiro17/chang_tools

---

## 工具

### 🎡 抽籤轉盤 · `/draw`

貼上一份名單，轉盤就會隨機抽人。上課點名、分組、抽獎都好用。

- 支援換行、逗號、頓號分隔名單
- 一次抽 1 位或多位
- 抽中自動從轉盤移除，避免重複；也可把中獎者放回
- 中獎名單依輪次記錄

### 🕐 課堂時鐘 / 考程 · `/timer`

投影幕上顯示現在時間，並依你排好的課堂流程或考程，自動秀出「現在進行的項目」與剩餘時間。

- 翻頁時鐘 + 進度條
- 自訂「一般上課」課堂流程與「考試期間」考程（指定開始 / 結束時刻）
- 進行中的項目自動切換，已結束 / 已考完的自動從畫面消失
- 資料存在瀏覽器本機（localStorage），全螢幕投影（快捷鍵 `F`）

### 🏫 課堂模式 · `/classroom`

按一個按鈕，投影幕就切成清楚的課堂指令：安靜作業、小組討論、看老師⋯⋯

- 五種課堂模式一鍵切換（數字鍵 `1`–`5`）
- 內建倒數與時間到響鈴
- 背景音樂 / 白噪音即時合成（非音檔）
- 全螢幕投影、空白鍵控制倒數

### 🏖️ 撐到放假 · `/countdown`

寒假 / 暑假倒數，再算算扣掉週末與假日後，真正還要上幾天班、幾小時。

- 「撐到寒假」「撐到暑假」一鍵切換，倒數到秒
- 內建 115 學年度行事曆與人事行政總處國定假日（含補假）
- 可調整學期日期、每日工時，自選是否扣除週六 / 週日 / 國定假日 / 寒假
- 「我的快樂假日」：自行加入校慶補休、研習日等不上班日
- 設定存在瀏覽器本機（localStorage）

---

## 技術

- [Next.js 16](https://nextjs.org)（App Router、Turbopack）
- React 19
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript

沒有後端、沒有資料庫；所有設定都存在使用者自己的瀏覽器。

## 本機開發

```bash
npm install
npm run dev
```

開 [http://localhost:3000](http://localhost:3000)。

其他指令：

```bash
npm run build   # 產生正式版
npm run start   # 跑正式版
npm run lint    # ESLint
```

## 專案結構

```
app/
├── page.tsx            landing page
├── layout.tsx          根 layout
├── draw/page.tsx       抽籤轉盤
├── timer/page.tsx      課堂時鐘 / 考程
├── classroom/          課堂模式（page.tsx + audio.ts 音訊引擎）
├── countdown/          撐到放假（page.tsx + calendar.ts 行事曆與工作日計算）
└── components/
    └── FlipClock.tsx   共用翻頁時鐘元件
```
