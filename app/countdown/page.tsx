"use client";

import { Icon } from "@/app/components/Icon";
import { ToolHeader, btn } from "@/app/components/ToolHeader";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_SETTINGS, type Settings, loadSettings, pad2, progress, targetDate, workload } from "./calendar";
import {
  CalendarCheckIcon,
  ChipIcon,
  FlagIcon,
  HourglassIcon,
  JourneyScene,
  SkyDecor,
} from "./art";
import { type SheetSection, SettingsSheet } from "./SettingsSheet";
import { CalcNote, DataInfo, MilestonesCard, StagesCard, TodayCard } from "./sections";
import { Chip, TARGETS, TargetToggle, fmtMD } from "./ui";

const LS_KEY = "chang-tools:countdown:settings";

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

/** 左邊：距離放假的倒數。底部是從學校走向放假的小路，標記停在「已撐過」的位置。 */
function CountdownCard({ now, mounted, s }: { now: Date; mounted: boolean; s: Settings }) {
  const target = targetDate(s);
  const name = TARGETS.find((t) => t.key === s.target)!.name;
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86_400_000);
  const rest = Math.floor((diff % 86_400_000) / 1000);
  const hms = [Math.floor(rest / 3600), Math.floor((rest % 3600) / 60), rest % 60].map(pad2);
  const pct = progress(now, s);

  return (
    <section className="relative overflow-hidden rounded-[2.25rem] border border-[#e6dfd1] bg-[#fbf8f1] shadow-sm">
      <SkyDecor target={s.target} />
      <JourneyScene target={s.target} pct={pct} showMarker={mounted} />

      <div
        className="relative flex flex-col items-center px-7 pt-7 text-center sm:px-9 sm:pt-9"
        style={{ paddingBottom: "calc(28% + 1.5rem)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 self-stretch">
          <Chip icon={<ChipIcon kind={s.target} />}>距離{name}還有</Chip>
          <span className="text-sm font-bold text-[#7a7367]">目標日 {fmtTarget(target)}</span>
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
              <span className="text-[#d9895f]">:</span>
              {hms[1]}
              <span className="text-[#d9895f]">:</span>
              {hms[2]}
            </>
          ) : (
            "--:--:--"
          )}
        </p>
      </div>
    </section>
  );
}

/** 右邊：扣掉週末、假日後，真正還要上班的天數與工時。畫成教師手帳的橫線內頁。 */
function WorkloadCard({ now, mounted, s }: { now: Date; mounted: boolean; s: Settings }) {
  const today = now.toDateString();
  // 只在換日或設定改變時重算，不必每秒跑
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const w = useMemo(() => workload(now, s), [today, s]);

  const stat = (icon: React.ReactNode, label: string, value: number, unit: string) => (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl border border-[#e6dfd1] bg-white">
        {icon}
      </span>
      <span className="mt-2 text-base font-bold text-[#5f594f] sm:text-lg">{label}</span>
      <span
        className="font-black leading-none tracking-[-0.05em] text-[#3d3935] tabular-nums"
        style={{ fontSize: "clamp(3.5rem, 9vw, 5.5rem)" }}
      >
        {mounted ? value.toLocaleString() : "--"}
      </span>
      <span className="text-sm font-bold text-[#7a7367]">{unit}</span>
    </div>
  );

  return (
    <section
      className="relative flex flex-col overflow-hidden rounded-[2.25rem] border border-[#e6dfd1] bg-[#fdfbf6] py-7 pl-12 pr-7 shadow-sm sm:py-9 sm:pl-14 sm:pr-9"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent 0 35px, #ece6da 35px 36px)",
      }}
    >
      {/* 手帳左邊的紅色雙邊線 */}
      <span aria-hidden className="absolute inset-y-0 left-6 w-0.5 bg-[#f0cfc0]" />
      <span aria-hidden className="absolute inset-y-0 left-[1.95rem] w-px bg-[#f0cfc0]" />

      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <Chip icon={<ChipIcon kind="pencil" />}>教師工作量</Chip>
        <span className="text-sm font-bold text-[#7a7367]">今天也算在裡面</span>
      </div>

      <div className="relative grid flex-1 grid-cols-2 items-center py-8">
        {stat(<CalendarCheckIcon className="h-11 w-11" />, "真正還要上班", w.days, "天")}
        <div className="border-l-2 border-dashed border-[#ddd5c6]">
          {stat(<HourglassIcon className="h-11 w-11" />, "真正剩餘工時", w.hours, "小時")}
        </div>
      </div>

      {mounted && w.nextBreak && (
        <p className="relative flex flex-wrap items-center justify-center gap-x-2 rounded-2xl border border-[#ebe4d6] bg-white px-4 py-3 text-center text-sm font-bold text-[#5f594f]">
          {/* 紙膠帶 */}
          <span
            aria-hidden
            className="absolute -top-2 left-4 h-4 w-16 -rotate-3 bg-[#e9c48c]/55"
          />
          <FlagIcon className="h-[18px] w-[18px]" />
          下一個平日放假：
          <span className="text-[#b85c3c]">
            {fmtMD(w.nextBreak.date)}
            {w.nextBreak.label}
          </span>
        </p>
      )}
      <div className="relative mt-3">
        <CalcNote s={s} />
      </div>
    </section>
  );
}

export default function CountdownPage() {
  const [now, setNow] = useState(() => new Date());
  const [state, setState] = useState<{ ready: boolean; s: Settings }>({
    ready: false,
    s: DEFAULT_SETTINGS,
  });
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<SheetSection | undefined>();
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
  const openAt = (section?: SheetSection) => {
    setFocus(section);
    setOpen(true);
  };

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
    <div className="min-h-screen bg-gradient-to-b from-[#fcf6ea] to-[#f5efe3] text-[#3d3935]">
      <ToolHeader
        tool="countdown"
        actions={
          <button
            type="button"
            onClick={() => openAt()}
            className={`${btn.base} ${btn.dark}`}
          >
            <Icon name="settings" className="h-[18px] w-[18px]" />
            設定
          </button>
        }
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8">
        <p className="text-sm font-semibold text-muted">寒暑假倒數，順便算算真正還要上幾天班</p>

        <div className="sm:ml-auto sm:w-[40rem] sm:max-w-full">
          <TargetToggle value={s.target} onChange={(t) => update({ target: t })} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <CountdownCard now={now} mounted={mounted} s={s} />
          <WorkloadCard now={now} mounted={mounted} s={s} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <TodayCard now={now} s={s} mounted={mounted} onEditQuotes={() => openAt("quotes")} />
          <StagesCard now={now} s={s} mounted={mounted} onAddEvent={() => openAt("events")} />
        </div>

        <MilestonesCard now={now} s={s} mounted={mounted} />

        <DataInfo s={s} />
      </div>

      {open && <SettingsSheet s={s} update={update} onClose={close} focus={focus} />}
    </div>
  );
}
