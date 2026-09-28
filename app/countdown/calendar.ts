/**
 * 撐到放假：學期日期、國定假日與工作日計算。
 *
 * 國定假日來源：行政院人事行政總處 115 年、116 年政府行政機關辦公日曆表。
 * 115 年起取消彈性放假，沒有補班日，所以只需要列「放假日」。
 */

export type Target = "winter" | "summer";

export type CustomDay = { date: string; label: string };

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

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
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
  };
}
