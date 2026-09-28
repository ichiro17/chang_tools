"use client";

import { useCallback, useEffect, useState } from "react";

/** 一段課堂流程 / 一科考試。時間為當日 "HH:MM"（24 小時制）。 */
export type Row = { id: string; label: string; start: string; end: string };
export type Kind = "class" | "exam";

export const KIND_INFO: Record<Kind, { name: string; desc: string; item: string; live: string; title: string }> = {
  class: { name: "課堂流程", desc: "顯示節次與下課", item: "項目", live: "進行中", title: "今天的課堂流程" },
  exam: { name: "考試考程", desc: "顯示科目與考試時間", item: "科目", live: "考試中", title: "今天的考程" },
};

const LS_CLASS = "chang-tools:timer:schedule";
const LS_EXAM = "chang-tools:timer:exams";
const LS_MODE = "chang-tools:timer:mode";
const LS_SEC = "chang-tools:timer:showSec";
const LS_KEYS = [LS_CLASS, LS_EXAM, LS_MODE, LS_SEC];

export const uid = () => Math.random().toString(36).slice(2, 9);

type Template = { name: string; kind: Kind; rows: Omit<Row, "id">[] };

/** 課表範本，套用後老師再自行調整。 */
export const TEMPLATES: Template[] = [
  {
    name: "國小上午課表",
    kind: "class",
    rows: [
      { label: "第一節", start: "08:40", end: "09:20" },
      { label: "下課", start: "09:20", end: "09:30" },
      { label: "第二節", start: "09:30", end: "10:10" },
      { label: "大下課", start: "10:10", end: "10:30" },
      { label: "第三節", start: "10:30", end: "11:10" },
      { label: "下課", start: "11:10", end: "11:20" },
      { label: "第四節", start: "11:20", end: "12:00" },
    ],
  },
  {
    name: "國中課表",
    kind: "class",
    rows: [
      { label: "第一節", start: "08:10", end: "08:55" },
      { label: "下課", start: "08:55", end: "09:05" },
      { label: "第二節", start: "09:05", end: "09:50" },
      { label: "下課", start: "09:50", end: "10:10" },
      { label: "第三節", start: "10:10", end: "10:55" },
      { label: "下課", start: "10:55", end: "11:05" },
      { label: "第四節", start: "11:05", end: "11:50" },
      { label: "午休", start: "11:50", end: "13:15" },
      { label: "第五節", start: "13:20", end: "14:05" },
      { label: "下課", start: "14:05", end: "14:15" },
      { label: "第六節", start: "14:15", end: "15:00" },
      { label: "下課", start: "15:00", end: "15:20" },
      { label: "第七節", start: "15:20", end: "16:05" },
    ],
  },
  {
    name: "期中考",
    kind: "exam",
    rows: [
      { label: "國文", start: "08:10", end: "09:20" },
      { label: "英文", start: "09:40", end: "10:50" },
      { label: "數學", start: "11:10", end: "12:20" },
    ],
  },
  {
    name: "段考（全天）",
    kind: "exam",
    rows: [
      { label: "國文", start: "08:10", end: "09:20" },
      { label: "英文", start: "09:40", end: "10:50" },
      { label: "數學", start: "11:10", end: "12:20" },
      { label: "自然", start: "13:20", end: "14:30" },
      { label: "社會", start: "14:50", end: "16:00" },
    ],
  },
];

export function withIds(rows: Omit<Row, "id">[]): Row[] {
  return rows.map((r) => ({ ...r, id: uid() }));
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** "08:10" → 29400（秒）；格式不對回 null。 */
export function hmToSec(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 3600 + min * 60;
}

export function secToHm(sec: number) {
  const s = ((sec % 86400) + 86400) % 86400;
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}`;
}

/** 輸入框離開時把「810」「8:10」「0810」整理成「08:10」；整理不了就原樣留著讓檢查提醒。 */
export function normalizeHm(raw: string) {
  const t = raw.trim().replace("：", ":");
  const m = /^(\d{1,2}):?(\d{2})$/.exec(t);
  if (!m) return t;
  const hm = `${pad2(Number(m[1]))}:${m[2]}`;
  return hmToSec(hm) == null ? t : hm;
}

export function nowSec(d: Date) {
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

export function fmtClock(d: Date, showSec: boolean) {
  const base = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return showSec ? `${base}:${pad2(d.getSeconds())}` : base;
}

export function fmtDur(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(ss)}` : `${pad2(m)}:${pad2(ss)}`;
}

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
export function fmtDate(d: Date) {
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}（${WEEK[d.getDay()]}）`;
}

export type Issue = { field: "label" | "start" | "end"; msg: string };

/**
 * 即時檢查每一列：名稱空白、時間格式、開始晚於結束、與前面的項目重疊。
 * 每列只回報第一個問題，錯誤訊息直接顯示在那一列旁邊。
 */
export function validate(rows: Row[], kind: Kind): Map<string, Issue> {
  const issues = new Map<string, Issue>();
  const ok: { row: Row; s: number; e: number }[] = [];
  for (const r of rows) {
    const s = hmToSec(r.start);
    const e = hmToSec(r.end);
    if (!r.label.trim()) issues.set(r.id, { field: "label", msg: `請輸入${KIND_INFO[kind].item}名稱。` });
    else if (s == null) issues.set(r.id, { field: "start", msg: "開始時間不完整，請用 24 小時制，例如 08:10。" });
    else if (e == null) issues.set(r.id, { field: "end", msg: "結束時間不完整，請用 24 小時制，例如 08:55。" });
    else if (e <= s) issues.set(r.id, { field: "end", msg: "結束時間必須晚於開始時間。" });
    else ok.push({ row: r, s, e });
  }
  // 依開始時間排序後，只要開始得比「前面最晚結束的項目」早，就是重疊
  ok.sort((a, b) => a.s - b.s);
  let latest: (typeof ok)[number] | null = null;
  for (const cur of ok) {
    if (latest && cur.s < latest.e) {
      issues.set(cur.row.id, {
        field: "start",
        msg: `與「${latest.row.label}」時間重疊（${latest.row.label}到 ${latest.row.end} 才結束）。`,
      });
      continue;
    }
    if (!latest || cur.e > latest.e) latest = cur;
  }
  return issues;
}

export type Parsed = Row & { s: number; e: number };

/** 從沒有問題的項目中挑出「進行中」與「下一個」。已結束的自然不會被選到。 */
export function analyze(rows: Row[], kind: Kind, curSec: number) {
  const issues = validate(rows, kind);
  const valid = rows
    .filter((r) => !issues.has(r.id))
    .map((r) => ({ ...r, s: hmToSec(r.start)!, e: hmToSec(r.end)! }))
    .sort((a, b) => a.s - b.s);
  const active = valid.find((r) => curSec >= r.s && curSec < r.e) ?? null;
  const next = valid.find((r) => r.s > curSec) ?? null;
  return { valid, active, next, issues };
}

export type Store = {
  classRows: Row[];
  examRows: Row[];
  mode: Kind;
  showSec: boolean;
};

const DEFAULT_STORE: Store = { classRows: [], examRows: [], mode: "class", showSec: true };

function loadStore(): Store {
  try {
    const c = localStorage.getItem(LS_CLASS);
    const e = localStorage.getItem(LS_EXAM);
    const m = localStorage.getItem(LS_MODE);
    const s = localStorage.getItem(LS_SEC);
    return {
      classRows: c ? (JSON.parse(c) as Row[]) : [],
      examRows: e ? (JSON.parse(e) as Row[]) : [],
      mode: m === "exam" ? "exam" : "class",
      showSec: s == null ? true : s === "1",
    };
  } catch {
    return DEFAULT_STORE;
  }
}

/**
 * 課表資料：存在本機，並在分頁之間同步。
 * 控制台改課表時，另一個分頁的投影畫面（/timer/display）會跟著更新。
 * 投影畫面只讀不寫（readOnly），避免兩邊互相覆蓋。
 */
export function useSchedule({ readOnly = false } = {}) {
  const [state, setState] = useState<{ ready: boolean } & Store>({ ready: false, ...DEFAULT_STORE });

  // 掛載後才從本機載入，避免 SSR / CSR hydration 不一致
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ ready: true, ...loadStore() });
    const onStorage = (e: StorageEvent) => {
      if (e.key == null || LS_KEYS.includes(e.key)) setState({ ready: true, ...loadStore() });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!state.ready || readOnly) return;
    try {
      localStorage.setItem(LS_CLASS, JSON.stringify(state.classRows));
      localStorage.setItem(LS_EXAM, JSON.stringify(state.examRows));
      localStorage.setItem(LS_MODE, state.mode);
      localStorage.setItem(LS_SEC, state.showSec ? "1" : "0");
    } catch {
      /* 儲存空間不可用時略過 */
    }
  }, [state, readOnly]);

  const setMode = useCallback((m: Kind) => setState((s) => ({ ...s, mode: m })), []);
  const setShowSec = useCallback((v: boolean) => setState((s) => ({ ...s, showSec: v })), []);
  const setRows = useCallback(
    (kind: Kind, fn: (prev: Row[]) => Row[]) =>
      setState((s) => (kind === "exam" ? { ...s, examRows: fn(s.examRows) } : { ...s, classRows: fn(s.classRows) })),
    [],
  );

  return { ...state, setMode, setShowSec, setRows };
}

/** 每秒更新的現在時間。 */
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
