"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type Target,
  loadSettings,
  pad2,
  parseYmd,
  progress,
  targetDate,
  workload,
} from "./calendar";

const LS_KEY = "chang-tools:countdown:settings";

const TARGETS: { key: Target; emoji: string; title: string; sub: string; name: string }[] = [
  { key: "winter", emoji: "☃️", title: "我要撐到寒假", sub: "先跨過第一學期", name: "寒假" },
  { key: "summer", emoji: "🏖️", title: "我要撐到暑假", sub: "一路撐到學年終點", name: "暑假" },
];

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

/** 依剩餘天數給一句打氣的話。 */
function cheer(days: number) {
  if (days <= 0) return "放假啦！🎉";
  if (days <= 7) return "最後衝刺！";
  if (days <= 30) return "看得到終點了！";
  if (days <= 60) return "撐住，過半了！";
  if (days <= 150) return "再一下下！";
  return "路還很長，先喝口水";
}

function fmtTarget(d: Date) {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/** 深色膠囊標籤（底下多一層陰影，像按鈕浮起來）。 */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-[#3d3935] px-5 py-2 text-base font-bold tracking-wide text-white shadow-[0_5px_0_#d9d3c7]">
      {children}
    </span>
  );
}

function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d="M12 0c.6 6.2 5.8 11.4 12 12-6.2.6-11.4 5.8-12 12-.6-6.2-5.8-11.4-12-12C6.2 11.4 11.4 6.2 12 0z"
        fill="currentColor"
      />
    </svg>
  );
}

function TargetToggle({
  value,
  onChange,
  compact,
}: {
  value: Target;
  onChange: (t: Target) => void;
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-3xl border border-[#ebe4d6] bg-white/60 p-1.5 shadow-sm">
      {TARGETS.map((t) => {
        const on = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            aria-pressed={on}
            className={`flex items-center gap-2 rounded-[1.1rem] px-3 text-left transition sm:gap-3 ${
              compact ? "py-3 sm:px-4" : "py-3.5 sm:px-6"
            } ${on ? "bg-[#3d3935] text-white shadow-md" : "text-[#3d3935] hover:bg-[#f3eee4]"}`}
          >
            <span className="text-2xl leading-none sm:text-3xl">{t.emoji}</span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold sm:text-lg">{t.title}</span>
              <span
                className={`block truncate text-xs sm:text-sm ${on ? "text-white/70" : "text-[#8c857a]"}`}
              >
                {t.sub}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** 左邊：距離放假的倒數。背景的弧線是「已撐過的比例」。 */
function CountdownCard({ now, mounted, s }: { now: Date; mounted: boolean; s: Settings }) {
  const target = targetDate(s);
  const name = TARGETS.find((t) => t.key === s.target)!.name;
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86_400_000);
  const rest = Math.floor((diff % 86_400_000) / 1000);
  const hms = [Math.floor(rest / 3600), Math.floor((rest % 3600) / 60), rest % 60].map(pad2);
  const pct = progress(now, s);

  // 半徑 140 的圓，從左下往上繞；已撐過的比例畫成深色弧
  const C = 2 * Math.PI * 140;

  return (
    <section className="relative overflow-hidden rounded-[2.25rem] border border-[#ebe4d6] bg-gradient-to-br from-[#fdf8e8] to-[#fffcf4] p-7 shadow-sm sm:p-9">
      <svg
        viewBox="0 0 320 320"
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/2 w-[125%] max-w-[34rem] -translate-x-[30%]"
      >
        <circle cx="160" cy="160" r="140" fill="none" stroke="#eef3e8" strokeWidth="26" />
        {mounted && (
          <circle
            cx="160"
            cy="160"
            r="140"
            fill="none"
            stroke="#dbe8d3"
            strokeWidth="26"
            strokeLinecap="round"
            strokeDasharray={`${C * pct} ${C}`}
            transform="rotate(150 160 160)"
          />
        )}
      </svg>
      <Sparkle className="absolute right-[18%] top-[16%] h-9 w-9 rotate-12 text-[#8aa9b3]" />

      <div className="relative flex flex-col items-center text-center">
        <div className="self-start">
          <Chip>距離{name}還有</Chip>
        </div>
        <p className="mt-6 text-3xl font-black tracking-wider text-[#3d3935] sm:text-4xl">
          {mounted ? cheer(days) : " "}
        </p>
        <p className="mt-2 flex items-end font-black leading-none text-[#c96b4a]">
          <span
            className="tabular-nums tracking-[-0.06em]"
            style={{ fontSize: "clamp(5.5rem, 17vw, 10rem)" }}
          >
            {mounted ? days : "--"}
          </span>
          <span className="mb-3 ml-2 text-3xl">天</span>
        </p>
        <p className="mt-4 font-mono text-3xl font-bold tracking-widest text-[#3d3935] sm:text-4xl">
          {mounted ? (
            <>
              {hms[0]}
              <span className="text-[#e08a5f]">:</span>
              {hms[1]}
              <span className="text-[#e08a5f]">:</span>
              {hms[2]}
            </>
          ) : (
            "--:--:--"
          )}
        </p>
        <p className="mt-8 flex items-center gap-2 text-sm font-semibold text-[#6f685e] sm:text-base">
          <span aria-hidden>🗓️</span>
          目標日 {fmtTarget(target)}
          {mounted && <span className="text-[#a39c90]">· 已撐過 {Math.round(pct * 100)}%</span>}
        </p>
      </div>
    </section>
  );
}

/** 右邊：扣掉週末、假日後，真正還要上班的天數與工時。 */
function WorkloadCard({ now, mounted, s }: { now: Date; mounted: boolean; s: Settings }) {
  const today = now.toDateString();
  // 只在換日或設定改變時重算，不必每秒跑
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const w = useMemo(() => workload(now, s), [today, s]);

  const stat = (emoji: string, label: string, value: number, unit: string) => (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-4xl shadow-sm">
        {emoji}
      </span>
      <span className="mt-2 text-base font-bold text-[#6f685e] sm:text-lg">{label}</span>
      <span
        className="font-black leading-none tracking-[-0.05em] text-[#3d3935] tabular-nums"
        style={{ fontSize: "clamp(3.5rem, 9vw, 5.5rem)" }}
      >
        {mounted ? value.toLocaleString() : "--"}
      </span>
      <span className="text-sm font-bold text-[#8c857a]">{unit}</span>
    </div>
  );

  return (
    <section className="flex flex-col rounded-[2.25rem] border border-[#ebe4d6] bg-gradient-to-br from-[#fbf9f4] to-[#f1f6f4] p-7 shadow-sm sm:p-9">
      <div className="flex items-center justify-between gap-3">
        <Chip>教師工作量</Chip>
        <span className="text-sm font-bold text-[#8c857a]">今天也算在裡面</span>
      </div>

      <div className="grid flex-1 grid-cols-2 items-center py-8">
        {stat("🎒", "真正還要上班", w.days, "天")}
        <div className="border-l border-dashed border-[#ddd6c9]">
          {stat("⏰", "真正剩餘工時", w.hours, "小時")}
        </div>
      </div>

      {mounted && w.nextBreak && (
        <p className="rounded-2xl bg-white/70 px-4 py-3 text-center text-sm font-semibold text-[#6f685e]">
          下一個平日放假：
          <span className="text-[#c96b4a]">
            {w.nextBreak.date.getMonth() + 1}/{w.nextBreak.date.getDate()}（
            {WEEK[w.nextBreak.date.getDay()]}）{w.nextBreak.label}
          </span>
        </p>
      )}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-4 py-2.5 text-base font-bold text-[#3d3935]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-6 w-6 shrink-0 accent-[#3f7a94]"
      />
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-2xl border border-[#e3dccd] bg-white px-4 py-3.5 text-base text-[#3d3935] outline-none transition focus:border-[#3f7a94] focus:ring-2 focus:ring-[#3f7a94]/20";

function SettingsSheet({
  s,
  update,
  onClose,
}: {
  s: Settings;
  update: (patch: Partial<Settings>) => void;
  onClose: () => void;
}) {
  const [newDate, setNewDate] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [hoursText, setHoursText] = useState(String(s.hoursPerDay));

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const addCustom = () => {
    if (!parseYmd(newDate)) return;
    const rest = s.custom.filter((c) => c.date !== newDate);
    update({
      custom: [...rest, { date: newDate, label: newLabel.trim() }].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    });
    setNewDate("");
    setNewLabel("");
  };

  const dateField = (key: "semesterStart" | "winterStart" | "springStart" | "summerStart", label: string) => (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-bold text-[#6f685e]">{label}</span>
      <input
        type="date"
        value={s[key]}
        onChange={(e) => update({ [key]: e.target.value })}
        className={inputCls}
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal aria-label="教師手帳設定">
      <button
        type="button"
        aria-label="關閉設定"
        onClick={onClose}
        className="absolute inset-0 bg-[#3d3935]/30 backdrop-blur-[2px]"
      />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-[#fffdf8] px-5 pb-10 pt-6 text-[#3d3935] shadow-2xl sm:rounded-l-[2rem] sm:px-7">
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-[#e3dccd] pb-5">
          <div>
            <p className="text-sm font-bold tracking-widest text-[#c96b4a]">教師手帳設定</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">調整你的逃生路線</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#ebe4d6] bg-white text-2xl shadow-sm transition hover:bg-[#f3eee4]"
          >
            ✕
          </button>
        </div>

        <h3 className="mt-7 text-xl font-black">倒數目標</h3>
        <div className="mt-3">
          <TargetToggle value={s.target} onChange={(t) => update({ target: t })} compact />
        </div>

        <h3 className="mt-8 text-xl font-black">我的學期日期</h3>
        <p className="mt-1 text-sm font-semibold text-[#8c857a]">
          官方預設來自 115 學年度；學校行事曆若有調整，可以在這裡修改。
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {dateField("semesterStart", "開學日")}
          {dateField("winterStart", "寒假開始")}
          {dateField("springStart", "下學期開學")}
          {dateField("summerStart", "暑假開始")}
        </div>

        <h3 className="mt-8 text-xl font-black">工作日計算</h3>
        <div className="mt-2 flex flex-col">
          <Toggle checked={s.excludeSat} onChange={(v) => update({ excludeSat: v })}>
            扣除星期六
          </Toggle>
          <Toggle checked={s.excludeSun} onChange={(v) => update({ excludeSun: v })}>
            扣除星期日
          </Toggle>
          <Toggle checked={s.excludeHolidays} onChange={(v) => update({ excludeHolidays: v })}>
            扣除國定假日與補假
          </Toggle>
          <Toggle checked={s.excludeWinter} onChange={(v) => update({ excludeWinter: v })}>
            暑假模式排除寒假
          </Toggle>
        </div>

        <label className="mt-4 flex flex-col gap-2">
          <span className="text-sm font-bold text-[#6f685e]">每日工時（1–12 小時）</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={12}
            value={hoursText}
            onChange={(e) => {
              setHoursText(e.target.value);
              const n = Math.round(Number(e.target.value));
              if (n >= 1 && n <= 12) update({ hoursPerDay: n });
            }}
            onBlur={() => setHoursText(String(s.hoursPerDay))}
            className={`${inputCls} sm:w-1/2`}
          />
        </label>

        <div className="mt-8 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black">我的快樂假日</h3>
            <p className="mt-1 text-sm font-semibold text-[#8c857a]">
              校慶補休、研習日或任何你想先排除的日子。
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#fbe9df] px-3 py-1 text-sm font-bold text-[#c96b4a]">
            {s.custom.length} 天
          </span>
        </div>
        <form
          className="mt-4 flex flex-wrap gap-3 sm:flex-nowrap"
          onSubmit={(e) => {
            e.preventDefault();
            addCustom();
          }}
        >
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            aria-label="日期"
            className={`${inputCls} sm:w-44 sm:shrink-0`}
          />
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="例如：校慶補休（可不填）"
            className={`${inputCls} min-w-0 flex-1`}
          />
          <button
            type="submit"
            disabled={!parseYmd(newDate)}
            className="shrink-0 rounded-2xl bg-[#3d3935] px-5 py-3.5 text-base font-bold text-white transition hover:bg-[#2a2724] disabled:opacity-40"
          >
            ＋ 新增
          </button>
        </form>
        {s.custom.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-[#8c857a]">目前沒有自訂不上班日。</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {s.custom.map((c) => (
              <li
                key={c.date}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#ebe4d6] bg-white px-4 py-2.5"
              >
                <span className="min-w-0 truncate text-sm font-bold">
                  <span className="tabular-nums">{c.date.replaceAll("-", "/")}</span>
                  <span className="ml-3 font-semibold text-[#8c857a]">{c.label || "我的快樂假日"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => update({ custom: s.custom.filter((x) => x.date !== c.date) })}
                  aria-label={`刪除 ${c.date}`}
                  className="shrink-0 rounded-lg px-2 py-1 text-sm text-[#a39c90] hover:bg-[#f3eee4] hover:text-[#c96b4a]"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => {
            if (!window.confirm("要把所有設定恢復成 115 學年度官方預設嗎？自訂的快樂假日也會清空。")) return;
            update(DEFAULT_SETTINGS);
            setHoursText(String(DEFAULT_SETTINGS.hoursPerDay));
          }}
          className="mt-10 w-full rounded-2xl border border-[#f1cdb9] bg-[#fdf1ea] px-4 py-3.5 text-lg font-bold text-[#c96b4a] transition hover:bg-[#fbe6da]"
        >
          ↺ 恢復 115 學年度官方預設
        </button>
        <p className="mt-5 text-center text-sm font-semibold text-[#6f685e]">
          設定只會儲存在這台裝置的瀏覽器，不會上傳到雲端。
        </p>
      </div>
    </div>
  );
}

export default function CountdownPage() {
  const [now, setNow] = useState(() => new Date());
  const [state, setState] = useState<{ ready: boolean; s: Settings }>({
    ready: false,
    s: DEFAULT_SETTINGS,
  });
  const [open, setOpen] = useState(false);
  const { ready: mounted, s } = state;

  // 掛載後才從本機載入，避免 SSR / CSR hydration 不一致
  useEffect(() => {
    let loaded = DEFAULT_SETTINGS;
    try {
      loaded = loadSettings(localStorage.getItem(LS_KEY));
    } catch {
      /* 壞掉的資料就用預設 */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ ready: true, s: loaded });
  }, []);

  useEffect(() => {
    if (!state.ready) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state.s));
    } catch {
      /* 儲存空間不可用時略過 */
    }
  }, [state]);

  const update = useCallback(
    (patch: Partial<Settings>) => setState((st) => ({ ...st, s: { ...st.s, ...patch } })),
    [],
  );
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // 分頁標題顯示剩幾天
  useEffect(() => {
    const prev = document.title;
    const name = TARGETS.find((t) => t.key === s.target)!.name;
    const days = Math.max(0, Math.floor((targetDate(s).getTime() - now.getTime()) / 86_400_000));
    document.title = mounted ? `${name}還有 ${days} 天 · 撐到放假` : "撐到放假";
    return () => {
      document.title = prev;
    };
  }, [now, mounted, s]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fcf6ea] to-[#f5efe3] px-4 py-8 text-[#3d3935] sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">🏖️ 撐到放假</h1>
            <p className="mt-1 text-sm font-semibold text-[#8c857a]">
              寒暑假倒數，順便算算真正還要上幾天班
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg border border-[#e3dccd] bg-white px-3 py-1.5 text-sm font-semibold hover:bg-[#f3eee4]"
            >
              ⚙️ 設定
            </button>
            <Link
              href="/"
              className="rounded-lg border border-[#e3dccd] px-3 py-1.5 text-sm font-semibold hover:bg-white"
            >
              ← 首頁
            </Link>
          </div>
        </header>

        <div className="sm:ml-auto sm:w-[40rem] sm:max-w-full">
          <TargetToggle value={s.target} onChange={(t) => update({ target: t })} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <CountdownCard now={now} mounted={mounted} s={s} />
          <WorkloadCard now={now} mounted={mounted} s={s} />
        </div>

        <p className="text-center text-xs font-semibold text-[#a39c90]">
          國定假日依人事行政總處 115、116 年辦公日曆表，資料到 2027 年 6 月。
        </p>
      </div>

      {open && <SettingsSheet s={s} update={update} onClose={close} />}
    </div>
  );
}
