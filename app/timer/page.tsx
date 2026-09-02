"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlipClock, barColor } from "@/app/components/FlipClock";

/** 一段課堂流程 / 一科考試。時間為當日 "HH:MM"。 */
type Row = { id: string; label: string; start: string; end: string };
type Kind = "class" | "exam";

const LS_CLASS = "chang-tools:timer:schedule";
const LS_EXAM = "chang-tools:timer:exams";
const LS_MODE = "chang-tools:timer:mode";
const LS_SEC = "chang-tools:timer:showSec";

const uid = () => Math.random().toString(36).slice(2, 9);

/** 典型節次，帶入後老師自行調整。 */
const SAMPLE_CLASS: Omit<Row, "id">[] = [
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
];

const SAMPLE_EXAM: Omit<Row, "id">[] = [
  { label: "國文", start: "08:10", end: "09:40" },
  { label: "英文", start: "10:00", end: "11:10" },
  { label: "數學", start: "11:30", end: "12:40" },
];

function withIds(rows: Omit<Row, "id">[]): Row[] {
  return rows.map((r) => ({ ...r, id: uid() }));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** "08:10" → 29400（秒）；格式不對回 null。 */
function hmToSec(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 3600 + min * 60;
}

function nowSec(d: Date) {
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

function fmtClock(d: Date, showSec: boolean) {
  const base = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return showSec ? `${base}:${pad2(d.getSeconds())}` : base;
}

function fmtDur(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(ss)}` : `${pad2(m)}:${pad2(ss)}`;
}

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
function fmtDate(d: Date) {
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}（${WEEK[d.getDay()]}）`;
}

type Parsed = Row & { s: number; e: number };

/** 從清單挑出「進行中」與「下一個」。已結束的自然不會被選到。 */
function analyze(rows: Row[], curSec: number) {
  const valid = rows
    .map((r) => ({ ...r, s: hmToSec(r.start), e: hmToSec(r.end) }))
    .filter((r): r is Parsed => r.s != null && r.e != null && r.e > r.s)
    .sort((a, b) => a.s - b.s);
  const active = valid.find((r) => curSec >= r.s && curSec < r.e) ?? null;
  const next = valid.find((r) => r.s > curSec) ?? null;
  return { valid, active, next };
}

function Board({
  now,
  mounted,
  rows,
  kind,
  showSec,
  big,
}: {
  now: Date;
  mounted: boolean;
  rows: Row[];
  kind: Kind;
  showSec: boolean;
  big?: boolean;
}) {
  const curSec = nowSec(now);
  const { active, next } = useMemo(
    () => analyze(rows, curSec),
    [rows, curSec],
  );

  const clockFs = big
    ? "clamp(3.25rem, 19vh, 12rem)"
    : "clamp(2.25rem, 11vw, 5.5rem)";
  const nowLabel = kind === "exam" ? "考試中" : "進行中";
  const emptyLabel =
    kind === "exam" ? "今日考程結束 / 沒有安排" : "今日流程結束 / 沒有安排";

  const remain = active ? active.e - curSec : 0;
  const frac = active ? Math.max(0, remain / (active.e - active.s)) : 0;
  const low = active != null && remain <= 60;

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-[3cqh] overflow-hidden bg-neutral-950 px-6 py-8 text-center text-white select-none"
      style={{ containerType: "size" }}
    >
      <div className="flex flex-col items-center gap-[1.5cqh]">
        <FlipClock
          text={mounted ? fmtClock(now, showSec) : showSec ? "--:--:--" : "--:--"}
          fontSize={clockFs}
          className={low ? "animate-pulse" : ""}
        />
        <div
          className="font-medium text-white/55"
          style={{ fontSize: big ? "clamp(0.9rem, 3cqh, 2rem)" : "0.95rem" }}
        >
          {mounted ? fmtDate(now) : " "}
        </div>
      </div>

      {mounted && active && (
        <div className="flex w-full flex-col items-center gap-[2cqh]">
          <div
            className="font-semibold tracking-widest text-white/60"
            style={{ fontSize: big ? "clamp(0.9rem, 3.5cqh, 2.2rem)" : "0.9rem" }}
          >
            {nowLabel}
          </div>
          <div
            className="font-black leading-none"
            style={{ fontSize: big ? "clamp(2rem, 12cqh, 9rem)" : "clamp(1.5rem, 8vw, 3rem)" }}
          >
            {active.label || "（未命名）"}
          </div>
          <div
            className="font-mono font-bold tabular-nums"
            style={{
              fontSize: big ? "clamp(1.5rem, 7cqh, 5rem)" : "clamp(1.1rem, 5vw, 2rem)",
              color: low ? "#fecaca" : "#ffffff",
            }}
          >
            {fmtDur(remain)}
          </div>
          <div
            className="overflow-hidden rounded-full bg-white/15"
            style={{ height: big ? "1.4cqh" : "0.5rem", width: big ? "62cqw" : "72%" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${frac * 100}%`,
                background: barColor(frac, remain),
                transition: "width 0.4s linear, background 0.5s ease",
              }}
            />
          </div>
          <div
            className="text-white/50"
            style={{ fontSize: big ? "clamp(0.8rem, 2.6cqh, 1.6rem)" : "0.8rem" }}
          >
            {active.start}–{active.end}
            {next && `　·　接下來 ${next.start} ${next.label || "（未命名）"}`}
          </div>
        </div>
      )}

      {mounted && !active && next && (
        <div className="flex flex-col items-center gap-[1.5cqh]">
          <div
            className="font-semibold tracking-widest text-white/60"
            style={{ fontSize: big ? "clamp(0.9rem, 3.5cqh, 2.2rem)" : "0.9rem" }}
          >
            接下來
          </div>
          <div
            className="font-black leading-none"
            style={{ fontSize: big ? "clamp(1.8rem, 10cqh, 7rem)" : "clamp(1.3rem, 7vw, 2.6rem)" }}
          >
            {next.label || "（未命名）"}
          </div>
          <div
            className="text-white/60"
            style={{ fontSize: big ? "clamp(0.9rem, 3cqh, 1.8rem)" : "0.9rem" }}
          >
            {next.start} 開始　·　還有 {fmtDur(next.s - curSec)}
          </div>
        </div>
      )}

      {mounted && !active && !next && (
        <div
          className="font-semibold text-white/45"
          style={{ fontSize: big ? "clamp(1rem, 4cqh, 2.4rem)" : "1rem" }}
        >
          {emptyLabel}
        </div>
      )}
    </div>
  );
}

function Editor({
  kind,
  rows,
  setRows,
  now,
}: {
  kind: Kind;
  rows: Row[];
  setRows: (fn: (prev: Row[]) => Row[]) => void;
  now: Date;
}) {
  const curSec = nowSec(now);
  const labelCol = kind === "exam" ? "科目" : "項目";

  const update = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));
  const add = () =>
    setRows((prev) => [
      ...prev,
      { id: uid(), label: "", start: "", end: "" },
    ]);
  const clearFinished = () =>
    setRows((prev) =>
      prev.filter((r) => {
        const e = hmToSec(r.end);
        return e == null || e > curSec;
      }),
    );
  const loadSample = () =>
    setRows(() => withIds(kind === "exam" ? SAMPLE_EXAM : SAMPLE_CLASS));

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-semibold">
          {kind === "exam" ? "考程（期中 / 期末）" : "課堂流程"}
        </h2>
        <button
          onClick={loadSample}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          帶入範例
        </button>
        {kind === "exam" && (
          <button
            onClick={clearFinished}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            清除已考完
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-400">
          尚未安排，按「＋ 新增一列」或「帶入範例」
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const s = hmToSec(r.start);
            const e = hmToSec(r.end);
            const bad = r.start && r.end && (s == null || e == null || e <= s);
            const done = e != null && e <= curSec;
            const live = s != null && e != null && curSec >= s && curSec < e;
            return (
              <li
                key={r.id}
                className={`flex flex-wrap items-center gap-2 rounded-lg border p-2 ${
                  live
                    ? "border-emerald-400 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/10"
                    : done
                      ? "border-zinc-200 bg-zinc-50 opacity-55 dark:border-zinc-800 dark:bg-zinc-950"
                      : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <input
                  value={r.label}
                  onChange={(ev) => update(r.id, { label: ev.target.value })}
                  placeholder={labelCol}
                  className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
                <input
                  type="time"
                  value={r.start}
                  onChange={(ev) => update(r.id, { start: ev.target.value })}
                  className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
                <span className="text-zinc-400">–</span>
                <input
                  type="time"
                  value={r.end}
                  onChange={(ev) => update(r.id, { end: ev.target.value })}
                  className={`rounded-md border bg-zinc-50 px-2 py-1 text-sm dark:bg-zinc-950 ${
                    bad
                      ? "border-red-400 dark:border-red-500"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                />
                {done && (
                  <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                    已{kind === "exam" ? "考完" : "結束"}
                  </span>
                )}
                <button
                  onClick={() => remove(r.id)}
                  className="ml-auto rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  刪除
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={add}
        className="mt-3 rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        ＋ 新增一列
      </button>
      <p className="mt-2 text-xs text-zinc-400">
        自動儲存在這台電腦的瀏覽器。已{kind === "exam" ? "考完" : "結束"}的項目不會出現在投影畫面上。
      </p>
    </div>
  );
}

type Store = {
  classRows: Row[];
  examRows: Row[];
  mode: Kind;
  showSec: boolean;
};

const DEFAULT_STORE: Store = {
  classRows: [],
  examRows: [],
  mode: "class",
  showSec: true,
};

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

export default function TimerPage() {
  const [now, setNow] = useState(() => new Date());
  const [isFs, setIsFs] = useState(false);
  const [state, setState] = useState<{ ready: boolean } & Store>({
    ready: false,
    ...DEFAULT_STORE,
  });

  const wrapRef = useRef<HTMLDivElement>(null);

  const { ready: mounted, mode, showSec, classRows, examRows } = state;

  // 掛載後才從本機載入，避免 SSR / CSR hydration 不一致
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ ready: true, ...loadStore() });
  }, []);

  // 任何變更即寫回本機（資料量很小，一次全寫）
  useEffect(() => {
    if (!state.ready) return;
    try {
      localStorage.setItem(LS_CLASS, JSON.stringify(state.classRows));
      localStorage.setItem(LS_EXAM, JSON.stringify(state.examRows));
      localStorage.setItem(LS_MODE, state.mode);
      localStorage.setItem(LS_SEC, state.showSec ? "1" : "0");
    } catch {
      /* 儲存空間不可用時略過 */
    }
  }, [state]);

  const setMode = useCallback(
    (m: Kind) => setState((s) => ({ ...s, mode: m })),
    [],
  );
  const setShowSec = useCallback(
    (v: boolean) => setState((s) => ({ ...s, showSec: v })),
    [],
  );
  const setClassRows = useCallback(
    (fn: (prev: Row[]) => Row[]) =>
      setState((s) => ({ ...s, classRows: fn(s.classRows) })),
    [],
  );
  const setExamRows = useCallback(
    (fn: (prev: Row[]) => Row[]) =>
      setState((s) => ({ ...s, examRows: fn(s.examRows) })),
    [],
  );

  // 每秒更新時間
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // 全螢幕
  const toggleFs = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) void wrapRef.current?.requestFullscreen?.();
    else void document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    const h = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // 投影時避免螢幕休眠
  useEffect(() => {
    if (!isFs) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: {
        request: (t: "screen") => Promise<{ release: () => Promise<void> }>;
      };
    };
    nav.wakeLock
      ?.request("screen")
      .then((l) => {
        lock = l;
      })
      .catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, [isFs]);

  // 分頁標題顯示現在時間
  useEffect(() => {
    const prev = document.title;
    document.title = mounted
      ? `${fmtClock(now, false)} · 課堂時鐘`
      : "課堂時鐘";
    return () => {
      document.title = prev;
    };
  }, [now, mounted]);

  // 快捷鍵
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key.toLowerCase() === "f") toggleFs();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [toggleFs]);

  const rows = mode === "exam" ? examRows : classRows;
  const setRows = mode === "exam" ? setExamRows : setClassRows;

  const modeToggle = (
    <div className="inline-flex rounded-xl border border-zinc-300 p-1 dark:border-zinc-700">
      {(["class", "exam"] as const).map((k) => (
        <button
          key={k}
          onClick={() => setMode(k)}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
            mode === k
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {k === "class" ? "一般上課" : "考試期間"}
        </button>
      ))}
    </div>
  );

  return (
    <div
      ref={wrapRef}
      className={
        isFs
          ? "h-screen w-screen bg-neutral-950"
          : "min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-8"
      }
    >
      {isFs ? (
        <div className="relative h-full w-full">
          <Board
            now={now}
            mounted={mounted}
            rows={rows}
            kind={mode}
            showSec={showSec}
            big
          />
          <div className="absolute right-3 top-3 flex gap-2 opacity-30 transition-opacity hover:opacity-100">
            {(["class", "exam"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setMode(k)}
                className={`rounded-lg px-3 py-1.5 text-sm text-white ${
                  mode === k ? "bg-white/30" : "bg-black/40 hover:bg-black/60"
                }`}
              >
                {k === "class" ? "上課" : "考試"}
              </button>
            ))}
            <button
              onClick={toggleFs}
              className="rounded-lg bg-black/40 px-3 py-1.5 text-sm text-white hover:bg-black/60"
            >
              ✕ 離開全螢幕
            </button>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6">
          <header className="flex w-full items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                🕐 課堂時鐘 / 考程
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                投影現在時間，依課堂流程 / 考程自動顯示目前進行的項目與剩餘時間
              </p>
            </div>
            <Link
              href="/"
              className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              ← 首頁
            </Link>
          </header>

          <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 shadow-lg dark:border-zinc-800">
            <div className="aspect-[16/9] w-full">
              <Board
                now={now}
                mounted={mounted}
                rows={rows}
                kind={mode}
                showSec={showSec}
              />
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3">
            {modeToggle}
            <button
              onClick={toggleFs}
              className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-bold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              🖥️ 全螢幕投影
            </button>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showSec}
                onChange={(e) => setShowSec(e.target.checked)}
                className="h-4 w-4"
              />
              顯示秒數
            </label>
            <span className="text-xs text-zinc-400">快捷鍵：F 全螢幕</span>
          </div>

          <Editor kind={mode} rows={rows} setRows={setRows} now={now} />
        </div>
      )}
    </div>
  );
}
