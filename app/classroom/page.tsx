"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FlipClock, barColor } from "@/app/components/FlipClock";
import { Icon, type IconName, PlayIcon } from "@/app/components/Icon";
import { ToolHeader, btn } from "@/app/components/ToolHeader";
import { type AudioEngine, type NoiseType, createAudioEngine } from "./audio";

type ModeId = "quiet" | "group" | "attention" | "selfstudy" | "exam";

type Mode = {
  id: ModeId;
  icon: IconName;
  title: string;
  line: string;
  usesTimer: boolean; // 此模式是否搭配倒數
  defaultSec: number; // 選此模式時帶入的預設秒數（不會自動開始，要老師按）
  tile: string; // 控制台卡片圖示底色
  stage: string; // 投影畫面底色（較深，白字高對比）
};

const MODES: Mode[] = [
  {
    id: "quiet",
    icon: "speakerOff",
    title: "安靜模式",
    line: "現在進行個人作業",
    usesTimer: false,
    defaultSec: 0,
    tile: "#1d4ed8",
    stage: "#1e3a8a",
  },
  {
    id: "group",
    icon: "users",
    title: "小組討論",
    line: "3 分鐘討論時間",
    usesTimer: true,
    defaultSec: 180,
    tile: "#047857",
    stage: "#064e3b",
  },
  {
    id: "attention",
    icon: "eye",
    title: "看老師",
    line: "請停止手邊工作，注意前方",
    usesTimer: false,
    defaultSec: 0,
    tile: "#c2410c",
    stage: "#9a3412",
  },
  {
    id: "selfstudy",
    icon: "book",
    title: "自主學習",
    line: "開始自主學習",
    usesTimer: true,
    defaultSec: 900,
    tile: "#6d28d9",
    stage: "#4c1d95",
  },
  {
    id: "exam",
    icon: "exam",
    title: "測驗模式",
    line: "請準備開始作答",
    usesTimer: true,
    defaultSec: 1800,
    tile: "#334155",
    stage: "#1e293b",
  },
];

const NOISE_LABELS: Record<NoiseType, string> = {
  white: "白噪音",
  pink: "粉紅噪音",
  brown: "棕噪音",
};

const TIMER_PRESETS = [1, 3, 5, 10, 15, 20, 30, 45, 60];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}

function Kbd({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <kbd
      className={`rounded-md px-2 py-0.5 font-sans font-bold ${
        dark ? "bg-white/20 text-white" : "border-[1.5px] border-line-strong bg-white text-ink"
      }`}
    >
      {children}
    </kbd>
  );
}

/** 投影畫面：大圖示、模式名稱、一句指令、倒數。單色底、白字高對比。 */
function Stage({
  mode,
  showTimer,
  remainingMs,
  pct,
  flash,
}: {
  mode: Mode;
  showTimer: boolean;
  remainingMs: number;
  pct: number;
  flash: boolean;
}) {
  const low = showTimer && remainingMs <= 10_000 && remainingMs > 0;
  return (
    <div
      className="relative flex h-full w-full select-none flex-col items-center justify-center overflow-hidden text-center text-white"
      style={{ background: mode.stage, containerType: "size" }}
    >
      <div className={`flex flex-col items-center ${flash ? "animate-pulse" : ""}`} style={{ gap: "1.5cqh" }}>
        <Icon name={mode.icon} strokeWidth={1.6} className="h-[16cqh] w-[16cqh]" />
        <div className="font-black tracking-[0.06em]" style={{ fontSize: "clamp(1.5rem, 16cqh, 10rem)", lineHeight: 1.1 }}>
          {mode.title}
        </div>
        <div className="font-bold text-[#f4f4f5]" style={{ fontSize: "clamp(0.95rem, 5.5cqh, 4rem)" }}>
          {mode.line}
        </div>
      </div>

      {showTimer && (
        <div
          className={`flex flex-col items-center ${low ? "animate-pulse" : ""}`}
          style={{ marginTop: "3.5cqh", gap: "3cqh", color: low ? "#fecaca" : "#ffffff" }}
        >
          <FlipClock text={fmt(remainingMs)} fontSize="clamp(2rem, 14cqh, 11rem)" />
          <div className="overflow-hidden rounded-full bg-black/30" style={{ height: "1.6cqh", width: "56cqw" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: barColor(pct / 100, Math.ceil(remainingMs / 1000)),
                transition: "width 0.25s linear, background 0.4s ease",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClassroomPage() {
  const [currentMode, setCurrentMode] = useState<ModeId>("quiet");
  const [projecting, setProjecting] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [flash, setFlash] = useState(false);
  const [hint, setHint] = useState(true);

  // 倒數
  const [timerTotalMs, setTimerTotalMs] = useState(180_000);
  const [timerRemainingMs, setTimerRemainingMs] = useState(180_000);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [customMin, setCustomMin] = useState("5");

  // 聲音
  const [soundOn, setSoundOn] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [audioReady, setAudioReady] = useState(false);
  const [moreSound, setMoreSound] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [musicLevel, setMusicLevel] = useState(0.4);
  const [noiseOn, setNoiseOn] = useState(false);
  const [noiseType, setNoiseType] = useState<NoiseType>("white");
  const [noiseLevel, setNoiseLevel] = useState(0.35);
  const [cueOn, setCueOn] = useState(true);

  const ctxRef = useRef<AudioContext | null>(null);
  const engRef = useRef<AudioEngine | null>(null);
  const endRef = useRef(0);
  const firedRef = useRef<Set<number>>(new Set());
  const wrapRef = useRef<HTMLDivElement>(null);

  const mode = MODES.find((m) => m.id === currentMode) ?? MODES[0];
  const pct = timerTotalMs > 0 ? Math.max(0, Math.min(100, (timerRemainingMs / timerTotalMs) * 100)) : 0;
  const cues = cueOn && soundOn;

  const ensureAudio = useCallback((): AudioEngine | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      ctx.onstatechange = () => setAudioReady(ctx.state === "running");
      ctxRef.current = ctx;
    }
    if (!engRef.current) engRef.current = createAudioEngine(ctxRef.current);
    engRef.current.resume();
    return engRef.current;
  }, []);

  // 聲音開關與總音量
  useEffect(() => {
    engRef.current?.setMaster(soundOn ? volume : 0);
  }, [soundOn, volume, audioReady]);

  // 背景音樂開關 / 音量
  useEffect(() => {
    const e = musicOn ? ensureAudio() : engRef.current;
    if (!e) return;
    if (musicOn) e.startPad(musicLevel * 0.12);
    else e.stopPad();
  }, [musicOn, musicLevel, ensureAudio]);

  // 白噪音開關 / 類型 / 音量
  useEffect(() => {
    const e = noiseOn ? ensureAudio() : engRef.current;
    if (!e) return;
    if (noiseOn) e.startNoise(noiseType, noiseLevel * 0.25);
    else e.stopNoise();
  }, [noiseOn, noiseType, noiseLevel, ensureAudio]);

  // 倒數主迴圈
  useEffect(() => {
    if (!timerRunning) return;
    const tick = () => {
      const rem = Math.max(0, endRef.current - Date.now());
      setTimerRemainingMs(rem);
      const secs = Math.ceil(rem / 1000);
      const totalSecs = Math.ceil(timerTotalMs / 1000);
      for (const mark of [60, 30, 10]) {
        if (secs <= mark && secs > 0 && totalSecs > mark && !firedRef.current.has(mark)) {
          firedRef.current.add(mark);
          if (cues) engRef.current?.attention();
        }
      }
      if (rem <= 0) {
        setTimerRunning(false);
        if (!firedRef.current.has(0)) {
          firedRef.current.add(0);
          if (cues) (ensureAudio() ?? engRef.current)?.alarm();
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [timerRunning, timerTotalMs, cues, ensureAudio]);

  const startTimer = useCallback(() => {
    const rem = timerRemainingMs <= 0 ? timerTotalMs : timerRemainingMs;
    if (rem >= timerTotalMs) firedRef.current.clear();
    endRef.current = Date.now() + rem;
    setTimerRemainingMs(rem);
    setShowTimer(true);
    setTimerRunning(true);
    ensureAudio();
  }, [timerRemainingMs, timerTotalMs, ensureAudio]);

  const pauseTimer = useCallback(() => {
    setTimerRemainingMs(Math.max(0, endRef.current - Date.now()));
    setTimerRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    firedRef.current.clear();
    setTimerRunning(false);
    setTimerRemainingMs(timerTotalMs);
  }, [timerTotalMs]);

  // 設定倒數時間（不會自動開始，要老師按「開始」）
  const configTimer = useCallback((ms: number) => {
    firedRef.current.clear();
    setTimerRunning(false);
    setTimerTotalMs(ms);
    setTimerRemainingMs(ms);
    setShowTimer(ms > 0);
  }, []);

  const addTimer = useCallback(
    (deltaMs: number) => {
      setTimerTotalMs((t) => Math.max(1000, t + deltaMs));
      if (timerRunning) endRef.current += deltaMs;
      else setTimerRemainingMs((r) => Math.max(0, r + deltaMs));
    },
    [timerRunning],
  );

  const selectMode = useCallback(
    (id: ModeId) => {
      setCurrentMode(id);
      const m = MODES.find((x) => x.id === id);
      if (!m) return;
      if (cues) {
        const e = ensureAudio();
        if (id === "attention") e?.attention();
        else e?.chime();
      }
      if (id === "attention") {
        setFlash(true);
        window.setTimeout(() => setFlash(false), 4500);
      }
      // 切換模式：倒數一律重新開始（回到該模式預設時間、尚未開始，要老師按「開始」）
      firedRef.current.clear();
      setTimerRunning(false);
      if (m.usesTimer) {
        setTimerTotalMs(m.defaultSec * 1000);
        setTimerRemainingMs(m.defaultSec * 1000);
        setShowTimer(true);
      } else {
        setShowTimer(false);
      }
    },
    [cues, ensureAudio],
  );

  // 全螢幕
  const requestFs = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) void wrapRef.current?.requestFullscreen?.().catch(() => {});
  }, []);

  const toggleFs = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) void wrapRef.current?.requestFullscreen?.().catch(() => {});
    else void document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    const h = () => {
      const on = Boolean(document.fullscreenElement);
      setIsFs(on);
      if (!on) setProjecting(false);
    };
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const startProjection = useCallback(() => {
    setProjecting(true);
    requestFs();
    ensureAudio();
  }, [requestFs, ensureAudio]);

  const previewProjection = useCallback(() => {
    setProjecting(true);
    ensureAudio();
  }, [ensureAudio]);

  const stopProjection = useCallback(() => {
    setProjecting(false);
    if (typeof document !== "undefined" && document.fullscreenElement) void document.exitFullscreen?.();
  }, []);

  // 執行倒數時避免螢幕休眠
  useEffect(() => {
    if (!timerRunning && !projecting) return;
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
  }, [timerRunning, projecting]);

  // 快捷鍵
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT")) return;
      if (e.key >= "1" && e.key <= "5") {
        const m = MODES[Number(e.key) - 1];
        if (m) selectMode(m.id);
      } else if (e.code === "Space") {
        // 焦點在按鈕上時，空白鍵交給按鈕本身
        if (el?.tagName === "BUTTON") return;
        e.preventDefault();
        if (timerRunning) pauseTimer();
        else startTimer();
      } else if (e.key.toLowerCase() === "f") {
        toggleFs();
      } else if (e.key.toLowerCase() === "p") {
        if (projecting) stopProjection();
        else startProjection();
      } else if (e.key === "Escape" && projecting && !document.fullscreenElement) {
        stopProjection();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selectMode, timerRunning, pauseTimer, startTimer, toggleFs, projecting, startProjection, stopProjection]);

  // 分頁標題
  useEffect(() => {
    const prev = document.title;
    document.title = `${mode.title} · 課堂模式`;
    return () => {
      document.title = prev;
    };
  }, [mode]);

  useEffect(() => {
    return () => {
      engRef.current?.stopPad();
      engRef.current?.stopNoise();
    };
  }, []);

  const shortcuts = (dark?: boolean) => (
    <>
      <span>
        <Kbd dark={dark}>1–5</Kbd> 切換模式
      </span>
      <span>
        <Kbd dark={dark}>Space</Kbd> 開始／暫停
      </span>
      <span>
        <Kbd dark={dark}>Esc</Kbd> 離開投影
      </span>
    </>
  );

  return (
    <div ref={wrapRef} className={projecting ? "fixed inset-0 z-50 bg-black" : "min-h-screen bg-paper text-ink"}>
      {projecting ? (
        <div className="relative h-full w-full">
          <Stage mode={mode} showTimer={showTimer} remainingMs={timerRemainingMs} pct={pct} flash={flash} />

          {/* 上方：模式切換 dock（平時淡出，滑鼠移上去變清楚） */}
          <div className="group absolute inset-x-0 top-0 flex justify-center p-3">
            <div className="flex flex-wrap justify-center gap-2 opacity-25 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
              {MODES.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => selectMode(m.id)}
                  aria-pressed={m.id === currentMode}
                  className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-base font-bold text-white backdrop-blur transition ${
                    m.id === currentMode ? "bg-white/30 ring-2 ring-white" : "bg-black/35 hover:bg-black/55"
                  }`}
                >
                  <Icon name={m.icon} className="h-5 w-5" />
                  <span className="hidden sm:inline">
                    {i + 1}. {m.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 左上：回控制台 */}
          <button
            type="button"
            onClick={stopProjection}
            className="absolute left-3 top-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-black/30 px-3.5 text-[15px] font-bold text-white hover:bg-black/50"
          >
            <Icon name="arrowLeft" className="h-[18px] w-[18px]" />
            回控制台
          </button>
          <button
            type="button"
            onClick={toggleFs}
            className="absolute right-3 top-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-black/30 px-3.5 text-[15px] font-bold text-white hover:bg-black/50"
          >
            <Icon name="maximize" className="h-[18px] w-[18px]" />
            {isFs ? "離開全螢幕" : "全螢幕"}
          </button>

          {/* 倒數控制：老師按了才開始 */}
          {showTimer && (
            <div className="absolute inset-x-0 bottom-[9vh] flex justify-center">
              {!timerRunning ? (
                <button
                  type="button"
                  onClick={startTimer}
                  className="inline-flex items-center gap-3 rounded-2xl bg-white px-10 py-4 text-2xl font-black text-ink shadow-xl transition hover:bg-[#f4f4f5] active:scale-[0.98]"
                >
                  <PlayIcon className="h-7 w-7" />
                  開始倒數
                </button>
              ) : (
                <div className="flex gap-3 opacity-40 transition-opacity focus-within:opacity-100 hover:opacity-100">
                  <button
                    type="button"
                    onClick={pauseTimer}
                    className="min-h-11 rounded-xl bg-black/45 px-6 text-lg font-bold text-white hover:bg-black/65"
                  >
                    暫停
                  </button>
                  <button
                    type="button"
                    onClick={resetTimer}
                    className="min-h-11 rounded-xl bg-black/45 px-6 text-lg font-bold text-white hover:bg-black/65"
                  >
                    重設
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 右下：快捷鍵提示，可隱藏 */}
          {hint && (
            <div className="absolute bottom-3 right-3 hidden items-center gap-4 rounded-2xl bg-black/35 py-1.5 pl-4 pr-1.5 text-[15px] text-[#f4f4f5] md:flex">
              {shortcuts(true)}
              <button
                type="button"
                onClick={() => setHint(false)}
                aria-label="隱藏快捷鍵提示"
                className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10"
              >
                <Icon name="close" className="h-[18px] w-[18px]" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <ToolHeader
            tool="classroom"
            actions={
              <>
                <span className="hidden md:contents">
                  <button
                    type="button"
                    onClick={previewProjection}
                    className={`${btn.base} border-[1.5px] border-classroom bg-white text-classroom hover:bg-classroom-tint`}
                  >
                    開啟投影預覽
                  </button>
                </span>
                <button type="button" onClick={startProjection} className={`${btn.base} bg-classroom font-black text-white hover:brightness-110`}>
                  <Icon name="maximize" className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  <span className="hidden sm:inline">開始全螢幕投影</span>
                  <span className="sm:hidden">投影</span>
                </button>
              </>
            }
          />

          <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-7">
            <section className="flex flex-col gap-3.5">
              <h2 className="text-xl font-black">選擇課堂模式</h2>
              <div role="radiogroup" aria-label="課堂模式" className="grid grid-cols-2 gap-4 pt-3 sm:grid-cols-3 lg:grid-cols-5">
                {MODES.map((m, i) => {
                  const on = m.id === currentMode;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => selectMode(m.id)}
                      className={`relative flex min-h-[200px] flex-col items-start gap-2.5 rounded-[20px] p-4 text-left transition sm:p-5 ${
                        on
                          ? "border-[3px] border-ink bg-[#f0f7f3] shadow-[0_6px_0_#1f1d1a]"
                          : "border-[1.5px] border-line bg-white hover:-translate-y-0.5 hover:border-line-strong"
                      }`}
                    >
                      {on && (
                        <span className="absolute -top-3.5 left-4 flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[13px] font-black text-white">
                          <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3.2} />
                          目前使用中
                        </span>
                      )}
                      <span className="flex w-full items-start justify-between">
                        <span
                          className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                          style={{ background: m.tile }}
                        >
                          <Icon name={m.icon} className="h-[30px] w-[30px]" />
                        </span>
                        <kbd
                          aria-hidden
                          className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-2 font-sans text-[15px] font-bold ${
                            on ? "bg-ink text-white" : "border-[1.5px] border-line-strong text-muted"
                          }`}
                        >
                          {i + 1}
                        </kbd>
                      </span>
                      <span className="text-xl font-black sm:text-[21px]">{m.title}</span>
                      <span className="flex-1 text-sm leading-normal text-muted">{m.line}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[13px] font-bold ${
                          on && m.usesTimer ? "bg-classroom text-white" : "bg-[#f1ede5] text-muted"
                        }`}
                      >
                        {m.usesTimer ? `倒數 ${Math.round(m.defaultSec / 60)} 分` : "不倒數"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="grid items-start gap-5 md:grid-cols-2">
              {/* 倒數 */}
              <section className="flex flex-col gap-4 rounded-[20px] border-[1.5px] border-line bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black">倒數計時</h2>
                  <span className="text-sm text-muted">
                    {mode.title}
                    {mode.usesTimer ? ` · 預設 ${Math.round(mode.defaultSec / 60)} 分` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <span className="text-6xl font-extrabold leading-none tabular-nums sm:text-7xl" aria-live="off">
                    {fmt(timerRemainingMs)}
                  </span>
                  <div className="flex gap-2">
                    {[-60_000, 60_000].map((d) => (
                      <button key={d} type="button" onClick={() => addTimer(d)} className={`${btn.base} ${btn.secondary}`}>
                        {d > 0 ? "＋1 分" : "−1 分"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={timerRunning ? pauseTimer : startTimer}
                    className={`${btn.base} min-h-14 flex-1 text-lg font-black text-white hover:brightness-110 ${
                      timerRunning ? "bg-[#b45309]" : "bg-classroom"
                    }`}
                  >
                    {!timerRunning && <PlayIcon className="h-5 w-5" />}
                    {timerRunning ? "暫停" : "開始倒數"}
                  </button>
                  <button type="button" onClick={resetTimer} className={`${btn.base} ${btn.secondary} min-h-14 px-5 text-base`}>
                    重設
                  </button>
                  {showTimer && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowTimer(false);
                        setTimerRunning(false);
                      }}
                      className={`${btn.base} ${btn.secondary} min-h-14 px-4 text-base`}
                    >
                      隱藏
                    </button>
                  )}
                </div>
                <div role="group" aria-label="快速設定倒數" className="flex flex-wrap gap-2">
                  {TIMER_PRESETS.map((min) => {
                    const on = timerTotalMs === min * 60_000;
                    return (
                      <button
                        key={min}
                        type="button"
                        aria-pressed={on}
                        onClick={() => configTimer(min * 60_000)}
                        className={`min-h-11 rounded-full px-4 text-[15px] font-bold ${
                          on ? "border-2 border-ink bg-ink text-white" : "border-[1.5px] border-line-strong bg-white text-ink hover:bg-paper"
                        }`}
                      >
                        {min} 分
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="custom-min" className="text-[15px] font-bold">
                    自訂
                  </label>
                  <input
                    id="custom-min"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={customMin}
                    onChange={(e) => setCustomMin(e.target.value)}
                    className="min-h-11 w-20 rounded-xl border-[1.5px] border-line-strong bg-white px-2 text-center text-base font-bold"
                  />
                  <span className="text-[15px]">分</span>
                  <button
                    type="button"
                    onClick={() => {
                      const m = Math.max(0, Math.floor(Number(customMin) || 0));
                      if (m > 0) configTimer(m * 60_000);
                    }}
                    className={`${btn.base} ${btn.dark}`}
                  >
                    套用
                  </button>
                </div>
              </section>

              {/* 聲音 */}
              <section className="flex flex-col gap-4 rounded-[20px] border-[1.5px] border-line bg-white p-5 sm:p-6">
                <h2 className="flex items-center gap-2.5 text-lg font-black">
                  <Icon name="speaker" className="h-[22px] w-[22px]" />
                  聲音
                </h2>
                {soundOn && !audioReady && (
                  <div
                    role="status"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-[1.5px] border-[#f2d27a] bg-[#fef3c7] px-3.5 py-3"
                  >
                    <span className="text-sm font-bold text-[#7a3d06]">聲音尚未啟用，請點擊「啟用聲音」。</span>
                    <button
                      type="button"
                      onClick={() => ensureAudio()?.chime()}
                      className={`${btn.base} bg-[#92400e] text-sm text-white hover:brightness-110`}
                    >
                      啟用聲音
                    </button>
                  </div>
                )}
                <div className="flex min-h-11 items-center justify-between">
                  <span id="sound-label" className="text-base font-bold">
                    聲音開／關
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={soundOn}
                    aria-labelledby="sound-label"
                    onClick={() => setSoundOn((v) => !v)}
                    className="relative h-11 w-[60px]"
                  >
                    <span className={`absolute left-1 top-[7px] h-[30px] w-[52px] rounded-full transition ${soundOn ? "bg-classroom" : "bg-[#b5ad9f]"}`} />
                    <span
                      className={`absolute top-[10px] h-6 w-6 rounded-full bg-white shadow transition-all ${soundOn ? "left-[29px]" : "left-[7px]"}`}
                    />
                  </button>
                </div>
                <label className="flex items-center gap-3.5 text-base font-bold">
                  音量
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    disabled={!soundOn}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="h-11 flex-1 accent-classroom"
                  />
                  <span className="w-12 text-right tabular-nums">{Math.round(volume * 100)}%</span>
                </label>

                <button
                  type="button"
                  aria-expanded={moreSound}
                  aria-controls="more-sound"
                  onClick={() => setMoreSound((v) => !v)}
                  className="flex min-h-[52px] items-center justify-between gap-3 rounded-xl border-[1.5px] border-line bg-[#faf8f4] px-4 py-2 text-left"
                >
                  <span className="flex flex-col">
                    <span className="text-[15px] font-bold">更多聲音設定</span>
                    <span className="text-[13px] text-muted">白噪音、背景音樂、提示音、時間到鈴聲、試聽</span>
                  </span>
                  <Icon name={moreSound ? "chevronUp" : "chevronDown"} className="h-5 w-5 shrink-0" strokeWidth={2.4} />
                </button>

                {moreSound && (
                  <div id="more-sound" className="flex flex-col gap-1 rounded-xl border-[1.5px] border-line p-3.5">
                    <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
                      <label className="flex items-center gap-2.5 text-[15px] font-bold">
                        <input
                          type="checkbox"
                          checked={musicOn}
                          onChange={(e) => {
                            ensureAudio();
                            setMusicOn(e.target.checked);
                          }}
                          className="h-5 w-5 accent-classroom"
                        />
                        背景音樂（環境音）
                      </label>
                      <input
                        type="range"
                        aria-label="背景音樂音量"
                        min={0}
                        max={1}
                        step={0.02}
                        value={musicLevel}
                        onChange={(e) => setMusicLevel(Number(e.target.value))}
                        className="h-11 w-32 accent-classroom"
                        disabled={!musicOn}
                      />
                    </div>

                    <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
                      <label className="flex items-center gap-2.5 text-[15px] font-bold">
                        <input
                          type="checkbox"
                          checked={noiseOn}
                          onChange={(e) => {
                            ensureAudio();
                            setNoiseOn(e.target.checked);
                          }}
                          className="h-5 w-5 accent-classroom"
                        />
                        白噪音
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="白噪音種類"
                          value={noiseType}
                          onChange={(e) => setNoiseType(e.target.value as NoiseType)}
                          disabled={!noiseOn}
                          className="min-h-11 rounded-lg border-[1.5px] border-line-strong bg-white px-2 text-sm"
                        >
                          {(Object.keys(NOISE_LABELS) as NoiseType[]).map((t) => (
                            <option key={t} value={t}>
                              {NOISE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                        <input
                          type="range"
                          aria-label="白噪音音量"
                          min={0}
                          max={1}
                          step={0.02}
                          value={noiseLevel}
                          onChange={(e) => setNoiseLevel(Number(e.target.value))}
                          className="h-11 w-24 accent-classroom"
                          disabled={!noiseOn}
                        />
                      </div>
                    </div>

                    <label className="flex min-h-11 items-center gap-2.5 text-[15px] font-bold">
                      <input
                        type="checkbox"
                        checked={cueOn}
                        onChange={(e) => setCueOn(e.target.checked)}
                        className="h-5 w-5 accent-classroom"
                      />
                      上課提示音、注意力提示、時間到鈴聲
                    </label>

                    <div className="mt-1 flex flex-wrap gap-2">
                      <button type="button" onClick={() => ensureAudio()?.chime()} className={`${btn.base} ${btn.secondary} text-sm`}>
                        試聽上課音
                      </button>
                      <button type="button" onClick={() => ensureAudio()?.attention()} className={`${btn.base} ${btn.secondary} text-sm`}>
                        試聽注意力提示
                      </button>
                      <button type="button" onClick={() => ensureAudio()?.alarm()} className={`${btn.base} ${btn.secondary} text-sm`}>
                        試聽時間到
                      </button>
                    </div>
                    <p className="mt-1 text-[13px] text-muted">背景音樂與白噪音都是即時合成，不是音檔。</p>
                  </div>
                )}
              </section>
            </div>

            <p className="hidden flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted md:flex">
              <Icon name="keyboard" className="h-5 w-5" />
              {shortcuts()}
            </p>
          </main>
        </>
      )}
    </div>
  );
}
