/**
 * 撐到放假：學期日期、國定假日與工作日計算。
 *
 * 國定假日來源：行政院人事行政總處 115 年、116 年政府行政機關辦公日曆表。
 * 115 年起取消彈性放假，沒有補班日，所以只需要列「放假日」。
 */

export type Target = "winter" | "summer";

/** 自訂的學校行事曆：off＝不上班（校慶補休、研習日），work＝要上班（補課日）。 */
export type CustomDay = { date: string; label: string; kind?: "off" | "work" };

/** 我的倒數事件，例如段考、校慶、發薪日。 */
export type CountdownEvent = { date: string; label: string };

export type Settings = {
  target: Target;
  /** 上學期開學日（進度條起點） */
  semesterStart: string;
  winterStart: string;
  /** 下學期開學日（暑假模式排除寒假用） */
  springStart: string;
  summerStart: string;
  excludeSat: boolean;
  excludeSun: boolean;
  excludeHolidays: boolean;
  excludeWinter: boolean;
  hoursPerDay: number;
  custom: CustomDay[];
  events: CountdownEvent[];
  /** 自訂的教師生存語錄，會和內建語錄一起輪流出現 */
  quotes: string[];
};

/** 115 學年度（2026-08 ~ 2027-07）教育部行事曆。 */
export const DEFAULT_SETTINGS: Settings = {
  target: "winter",
  semesterStart: "2026-08-31",
  winterStart: "2027-01-21",
  springStart: "2027-02-11",
  summerStart: "2027-07-01",
  excludeSat: true,
  excludeSun: true,
  excludeHolidays: true,
  excludeWinter: true,
  hoursPerDay: 8,
  custom: [],
  events: [],
  quotes: [],
};

/** 預設資料的版本與來源，顯示在頁面上讓老師知道數字怎麼來的。 */
export const DATA_INFO = {
  year: "115 學年度",
  updated: "2026/09/28",
  sources: "行政院人事行政總處 115、116 年辦公日曆表、教育部 115 學年度行事曆",
  coverage: "國定假日資料到 2027 年 6 月",
};

/** 國定假日與補假（含落在週末的原日），涵蓋到 116 年 6 月。 */
export const HOLIDAYS: Record<string, string> = {
  // 115 年（2026）
  "2026-09-25": "中秋節",
  "2026-09-28": "教師節",
  "2026-10-09": "國慶日補假",
  "2026-10-10": "國慶日",
  "2026-10-25": "臺灣光復節",
  "2026-10-26": "臺灣光復節補假",
  "2026-12-25": "行憲紀念日",
  // 116 年（2027）
  "2027-01-01": "開國紀念日",
  "2027-02-04": "小年夜",
  "2027-02-05": "除夕",
  "2027-02-06": "春節",
  "2027-02-07": "春節",
  "2027-02-08": "春節",
  "2027-02-09": "春節補假",
  "2027-02-10": "春節補假",
  "2027-02-28": "和平紀念日",
  "2027-03-01": "和平紀念日補假",
  "2027-04-04": "兒童節",
  "2027-04-05": "清明節",
  "2027-04-06": "兒童節補假",
  "2027-04-30": "勞動節補假",
  "2027-05-01": "勞動節",
  "2027-06-09": "端午節",
};

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Date → "2027-01-21"（本地時區） */
export function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** "2027-01-21" → 當天 00:00（本地時區）；格式不對回 null。 */
export function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}

/** 兩個日期之間差幾天（都取當天 00:00）。 */
export function daysBetween(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

/** 某個設定欄位的日期；空白或亂填時退回官方預設。 */
export function dateOf(
  s: Settings,
  key: "semesterStart" | "winterStart" | "springStart" | "summerStart",
) {
  return parseYmd(s[key]) ?? parseYmd(DEFAULT_SETTINGS[key])!;
}

export function targetDate(s: Settings) {
  return dateOf(s, s.target === "winter" ? "winterStart" : "summerStart");
}

/** 這一天是否要上班；不上班時回傳原因（給「下一個放假日」顯示）。 */
export function dayOff(d: Date, s: Settings): string | null {
  const key = toYmd(d);
  const custom = s.custom.find((c) => c.date === key);
  if (custom?.kind === "work") return null;
  if (custom) return custom.label || "我的快樂假日";
  if (s.excludeHolidays && HOLIDAYS[key]) return HOLIDAYS[key];
  if (s.target === "summer" && s.excludeWinter) {
    const t = d.getTime();
    if (
      t >= dateOf(s, "winterStart").getTime() &&
      t < dateOf(s, "springStart").getTime()
    )
      return "寒假";
  }
  const wd = d.getDay();
  if (s.excludeSat && wd === 6) return "星期六";
  if (s.excludeSun && wd === 0) return "星期日";
  return null;
}

export type Workload = {
  /** 從今天（含）到目標日前一天，還要上班的天數 */
  days: number;
  hours: number;
  /** 明天起，下一個「平日卻放假」的日子（週末不算驚喜） */
  nextBreak: { date: Date; label: string } | null;
};

export function workload(today: Date, s: Settings): Workload {
  const end = targetDate(s).getTime();
  let days = 0;
  let nextBreak: Workload["nextBreak"] = null;
  const first = startOfDay(today).getTime();
  for (let d = startOfDay(today); d.getTime() < end; d = addDays(d, 1)) {
    const off = dayOff(d, s);
    if (!off) days++;
    else if (
      !nextBreak &&
      d.getTime() > first &&
      d.getDay() !== 0 &&
      d.getDay() !== 6
    )
      nextBreak = { date: d, label: off };
  }
  return { days, hours: days * s.hoursPerDay, nextBreak };
}

/** from（含）到 to（不含）之間還要上幾天班。 */
export function countWorkdays(from: Date, to: Date, s: Settings) {
  let n = 0;
  for (let d = startOfDay(from); d.getTime() < to.getTime(); d = addDays(d, 1)) if (!dayOff(d, s)) n++;
  return n;
}

const WEEKEND = new Set(["星期六", "星期日"]);

/** 明天起、放假日之前，第一個連放 3 天以上的連假。 */
export function nextLongBreak(today: Date, s: Settings) {
  const limit = targetDate(s).getTime();
  let start: Date | null = null;
  let length = 0;
  let label = "";
  const done = () => (start && length >= 3 ? { start, length, label: label.replace(/補假$/, "") || "連假" } : null);
  for (let d = addDays(startOfDay(today), 1); d.getTime() < limit; d = addDays(d, 1)) {
    const off = dayOff(d, s);
    if (off) {
      if (!start) {
        start = d;
        length = 0;
        label = "";
      }
      length++;
      if (!label && !WEEKEND.has(off)) label = off;
    } else {
      const found = done();
      if (found) return found;
      start = null;
    }
  }
  return done();
}

export type Stage = {
  key: string;
  label: string;
  date: Date;
  days: number;
  workdays: number;
  note?: string;
};

/** 多階段倒數：把一大段路切成週末、連假、自訂事件、寒暑假等小目標，依日期排序。 */
export function stages(today: Date, s: Settings): Stage[] {
  const t0 = startOfDay(today);
  const out: Stage[] = [];
  // 天數和上方大倒數一樣：到那天 00:00 還剩幾個「完整的一天」
  const add = (key: string, label: string, date: Date, note?: string) =>
    out.push({
      key,
      label,
      date,
      days: Math.max(0, Math.floor((date.getTime() - today.getTime()) / 86_400_000)),
      workdays: countWorkdays(t0, date, s),
      note,
    });

  // 平日才列「週末」：找下一個不用上班的週六或週日（補課的週末跳過）
  const wd = t0.getDay();
  if (wd !== 0 && wd !== 6) {
    for (let i = 1; i <= 14; i++) {
      const d = addDays(t0, i);
      if ((d.getDay() === 0 || d.getDay() === 6) && dayOff(d, s)) {
        add("weekend", "週末", d);
        break;
      }
    }
  }
  const lb = nextLongBreak(t0, s);
  if (lb) add("long", `${lb.label}連假`, lb.start, `連放 ${lb.length} 天`);
  for (const e of s.events) {
    const d = parseYmd(e.date);
    if (d && d.getTime() > t0.getTime()) add(`ev-${e.date}-${e.label}`, e.label || "我的倒數事件", d);
  }
  const winter = dateOf(s, "winterStart");
  const summer = dateOf(s, "summerStart");
  if (winter.getTime() > t0.getTime()) add("winter", "寒假", winter);
  if (summer.getTime() > t0.getTime()) add("summer", "暑假", summer);
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export type MilestoneKind = "start" | "week" | "month" | "half" | "count" | "vacation" | "event";

export type Milestone = {
  key: string;
  kind: MilestoneKind;
  title: string;
  congrats: string;
  date: Date;
};

/** 學年里程碑：全部由學期日期算出來，不用另外記錄；日期到了就解鎖徽章。 */
export function milestones(s: Settings): Milestone[] {
  const sem = dateOf(s, "semesterStart");
  const winter = dateOf(s, "winterStart");
  const spring = dateOf(s, "springStart");
  const summer = dateOf(s, "summerStart");
  const mid = (a: Date, b: Date) => startOfDay(new Date((a.getTime() + b.getTime()) / 2));

  const list: Milestone[] = [
    { key: "start", kind: "start", title: "開學第 1 天", congrats: "新學期開始了，你已經站上起跑線。", date: sem },
    { key: "week1", kind: "week", title: "撐過第一週", congrats: "恭喜！你撐過開學第一週了。", date: addDays(sem, 7) },
    { key: "month1", kind: "month", title: "撐過第一個月", congrats: "恭喜！開學滿一個月，節奏找回來了。", date: addMonths(sem, 1) },
    { key: "half1", kind: "half", title: "上學期過半", congrats: "恭喜！你已經撐過上學期的一半。", date: mid(sem, winter) },
    { key: "w100", kind: "count", title: "寒假倒數 100 天", congrats: "寒假進入倒數 100 天！", date: addDays(winter, -100) },
    { key: "w50", kind: "count", title: "寒假倒數 50 天", congrats: "寒假只剩 50 天了！", date: addDays(winter, -50) },
    { key: "w10", kind: "count", title: "寒假最後 10 天", congrats: "最後 10 天，衝刺！", date: addDays(winter, -10) },
    { key: "winter", kind: "vacation", title: "撐到寒假", congrats: "寒假到了！好好休息，你值得。", date: winter },
    { key: "spring", kind: "start", title: "下學期開學", congrats: "下學期開始，再出發！", date: spring },
    { key: "half2", kind: "half", title: "下學期過半", congrats: "恭喜！下學期也過一半了。", date: mid(spring, summer) },
    { key: "s100", kind: "count", title: "暑假倒數 100 天", congrats: "暑假進入倒數 100 天！", date: addDays(summer, -100) },
    { key: "s50", kind: "count", title: "暑假倒數 50 天", congrats: "暑假只剩 50 天了！", date: addDays(summer, -50) },
    { key: "s10", kind: "count", title: "暑假最後 10 天", congrats: "最後 10 天，學年終點就在眼前！", date: addDays(summer, -10) },
    { key: "summer", kind: "vacation", title: "撐到暑假", congrats: "一整個學年，你撐過來了！", date: summer },
  ];
  for (const e of s.events) {
    const d = parseYmd(e.date);
    if (!d) continue;
    const name = e.label || "我的倒數事件";
    list.push({
      key: `ev-${e.date}-${e.label}`,
      kind: "event",
      title: `撐過「${name}」`,
      congrats: `恭喜！「${name}」結束了。`,
      date: addDays(d, 1),
    });
  }
  return list.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** 內建的教師生存語錄。 */
export const QUOTES = [
  "今天也不是永遠。",
  "再撐一下，午餐會來的。",
  "會議會結束，假期會到來。",
  "今天完成一件事，就是進度。",
  "你不是在浪費時間，你正在累積學期經驗值。",
  "改不完的作業明天還在，今天的你可以先下班。",
  "深呼吸，下一節課也會過去的。",
  "你已經比昨天的自己多撐了一天。",
  "學生記得的，常常是你今天的一句話。",
  "累了就喝口水，這也是今天的正事。",
];

/** 每天固定一句（同一天打開都一樣），shift 用來「換一句」。 */
export function quoteFor(today: Date, s: Settings, shift = 0) {
  const all = [...QUOTES, ...s.quotes.filter((q) => q.trim())];
  const day = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86_400_000);
  return all[(((day + shift) % all.length) + all.length) % all.length];
}

/** 學期日期是不是還是官方預設。 */
export function usesDefaultDates(s: Settings) {
  return (["semesterStart", "winterStart", "springStart", "summerStart"] as const).every(
    (k) => s[k] === DEFAULT_SETTINGS[k],
  );
}

/** 從開學到目標日，已經撐過的比例（0–1）。 */
export function progress(now: Date, s: Settings) {
  const start = dateOf(s, "semesterStart").getTime();
  const end = targetDate(s).getTime();
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
}

export function loadSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  const v = JSON.parse(raw) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...v,
    custom: Array.isArray(v.custom) ? v.custom : [],
    events: Array.isArray(v.events) ? v.events : [],
    quotes: Array.isArray(v.quotes) ? v.quotes : [],
  };
}
