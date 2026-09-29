/**
 * 學校行事曆匯入：把貼上的文字或 CSV 轉成「不上班日／補課日／倒數事件」。
 *
 * 一行一筆，日期寫法很寬鬆：2026-10-15、2026/10/15、115/10/15（民國）、10/15、10月15日，
 * 後面接名稱，可再加一欄類型（不上班／補課／事件）。從 Excel、Google 試算表複製（Tab 分隔）也可以。
 */

import { type Settings, dateOf, toYmd } from "./calendar";

export type ImportKind = "off" | "work" | "event";
export type ImportRow = { line: number; date: string; label: string; kind: ImportKind };
export type ImportError = { line: number; text: string; reason: string };

export const KIND_LABEL: Record<ImportKind, string> = {
  off: "不上班",
  work: "補課（要上班）",
  event: "倒數事件",
};

const TYPE_WORDS: Record<string, ImportKind> = {
  不上班: "off",
  放假: "off",
  休假: "off",
  補休: "off",
  停課: "off",
  假日: "off",
  補課: "work",
  補班: "work",
  上班: "work",
  工作日: "work",
  事件: "event",
  活動: "event",
  倒數: "event",
};

/** 沒寫類型時，從名稱猜：有「補課」就是補課，有「放假、補休」就是不上班，其他當事件。 */
function guessKind(label: string): ImportKind {
  if (/補課|補班/.test(label)) return "work";
  if (/放假|補休|停課|彈性假|颱風假/.test(label)) return "off";
  return "event";
}

const DEFAULT_LABEL: Record<ImportKind, string> = { off: "學校放假", work: "補課日", event: "學校活動" };

function validDate(y: number, m: number, d: number) {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null;
}

const FULL = /(?<!\d)(\d{4}|1\d{2})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?(?!\d)/;
const SHORT = /(?<!\d)(\d{1,2})\s*[/.月]\s*(\d{1,2})\s*日?(?!\d)/;
const RANGE_SEP = /^\s*(?:[~～至到]|-|－|—)\s*/;
const MAX_RANGE_DAYS = 31;

type Found = { y: number | null; m: number; d: number; index: number; length: number };

/** 找出字串裡第一個日期（有年份的優先）。 */
function findDate(t: string): Found | null {
  const f = FULL.exec(t);
  const sh = SHORT.exec(t);
  const pick = f && (!sh || f.index <= sh.index) ? f : sh;
  if (!pick) return null;
  const withYear = pick === f;
  return {
    y: withYear ? Number(pick[1]) : null,
    m: Number(withYear ? pick[2] : pick[1]),
    d: Number(withYear ? pick[3] : pick[2]),
    index: pick.index,
    length: pick[0].length,
  };
}

export function parseCalendarText(text: string, s: Settings): { rows: ImportRow[]; errors: ImportError[] } {
  // 只寫月/日時：8–12 月算開學那年，1–7 月算下一年
  const schoolYear = dateOf(s, "semesterStart").getFullYear();
  const yearOf = (f: { y: number | null; m: number }) =>
    f.y == null ? (f.m >= 8 ? schoolYear : schoolYear + 1) : f.y < 1911 ? f.y + 1911 : f.y;
  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const t = raw.trim();
    if (!t) return;

    const first = findDate(t);
    if (!first) {
      // 表頭（例如「日期,名稱,類型」）直接略過
      if (!/日期/.test(t)) errors.push({ line, text: t, reason: "找不到日期" });
      return;
    }
    const start = validDate(yearOf(first), first.m, first.d);
    if (!start) {
      errors.push({ line, text: t, reason: "這個日期不存在" });
      return;
    }
    let rest = t.slice(0, first.index) + " " + t.slice(first.index + first.length);

    // 日期區間：1/21～1/23、1/21-23
    let end = start;
    const after = t.slice(first.index + first.length);
    const sep = RANGE_SEP.exec(after);
    if (sep) {
      const tail = after.slice(sep[0].length);
      const second = findDate(tail);
      const dayOnly = /^(\d{1,2})\s*日?(?![\d/.月])/.exec(tail);
      let used = 0;
      if (second && second.index === 0) {
        const e = validDate(second.y == null ? start.getFullYear() : yearOf(second), second.m, second.d);
        if (e) end = e;
        used = second.length;
      } else if (dayOnly) {
        const e = validDate(start.getFullYear(), start.getMonth() + 1, Number(dayOnly[1]));
        if (e) end = e;
        used = dayOnly[0].length;
      }
      if (used) rest = t.slice(0, first.index) + " " + tail.slice(used);
      // 跨年的區間（12/30～1/2）
      if (end.getTime() < start.getTime()) end = new Date(end.getFullYear() + 1, end.getMonth(), end.getDate());
      const span = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
      if (span > MAX_RANGE_DAYS) {
        errors.push({ line, text: t, reason: `區間太長（${span} 天），請分開寫` });
        return;
      }
    }

    // 拿掉星期幾，剩下的依逗號、Tab、頓號切開
    const parts = rest
      .replace(/[（(]\s*[一二三四五六日天]\s*[)）]|(?:星期|週|周)[一二三四五六日天]/g, " ")
      .split(/[,，\t|、;；]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    let kind: ImportKind | null = null;
    const labels: string[] = [];
    for (const p of parts) {
      if (!kind && TYPE_WORDS[p]) kind = TYPE_WORDS[p];
      else labels.push(p);
    }
    const label = labels.join(" ").trim();
    const k = kind ?? guessKind(label);

    // 放假、補課的區間拆成每一天；事件只記開始那天
    const days: Date[] = [];
    for (let d = start; d.getTime() <= end.getTime(); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      days.push(d);
      if (k === "event") break;
    }
    for (const d of days) {
      const row = { line, date: toYmd(d), label: label || DEFAULT_LABEL[k], kind: k };
      const key = `${row.date}|${row.label}|${row.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
  });

  return { rows, errors };
}

/** 把匯入的資料併進設定：同一天的自訂日以新的為準，同日同名的事件不重複加入。 */
export function mergeImport(s: Settings, rows: ImportRow[]): Pick<Settings, "custom" | "events"> {
  const custom = [...s.custom];
  const events = [...s.events];
  for (const r of rows) {
    if (r.kind === "event") {
      if (!events.some((e) => e.date === r.date && e.label === r.label)) events.push({ date: r.date, label: r.label });
    } else {
      const i = custom.findIndex((c) => c.date === r.date);
      const item = { date: r.date, label: r.label, kind: r.kind };
      if (i >= 0) custom[i] = item;
      else custom.push(item);
    }
  }
  const byDate = <T extends { date: string }>(xs: T[]) => xs.sort((a, b) => a.date.localeCompare(b.date));
  return { custom: byDate(custom), events: byDate(events) };
}
