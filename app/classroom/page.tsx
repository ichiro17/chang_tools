"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createAudioEngine, type AudioEngine, type NoiseType } from "./audio";
import { FlipClock, barColor } from "@/app/components/FlipClock";

type ModeId = "quiet" | "group" | "attention" | "selfstudy" | "exam";

type Mode = {
  id: ModeId;
  emoji: string;
  title: string;
  line: string;
  usesTimer: boolean; // 此模式是否搭配倒數
  defaultSec: number; // 選此模式時帶入的預設秒數（不會自動開始，要老師按）
  bg: string;
};

const MODES: Mode[] = [
  {
    id: "quiet",
    emoji: "🔇",
    title: "安靜模式",
    line: "現在進行個人作業",
    usesTimer: false,
    defaultSec: 0,
    bg: "linear-gradient(135deg,#1e3a8a,#1d4ed8)",
  },
  {
    id: "group",
    emoji: "👥",
    title: "小組討論",
    line: "3 分鐘討論時間",
    usesTimer: true,
    defaultSec: 180,
    bg: "linear-gradient(135deg,#0f766e,#059669)",
  },
  {
    id: "attention",
    emoji: "👀",
    title: "看老師",
    line: "請停止手邊工作，注意前方",
    usesTimer: false,
    defaultSec: 0,
    bg: "linear-gradient(135deg,#b45309,#dc2626)",
  },
  {
    id: "selfstudy",
    emoji: "📖",
    title: "自主學習",
    line: "開始自主學習",
    usesTimer: true,
    defaultSec: 900,
    bg: "linear-gradient(135deg,#5b21b6,#7c3aed)",
  },
  {
    id: "exam",
    emoji: "📝",
    title: "測驗模式",
    line: "請準備開始作答",
    usesTimer: true,
    defaultSec: 1800,
    bg: "linear-gradient(135deg,#0f172a,#334155)",
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
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden text-center text-white select-none"
      style={{ background: mode.bg, containerType: "size" }}
    >
      <div
        className={flash ? "animate-pulse" : ""}
        style={{ lineHeight: 1.12 }}
      >
        <div style={{ fontSize: "clamp(2rem, 17cqh, 15rem)" }}>{mode.emoji}</div>
        <div
          className="font-black tracking-wide"
          style={{ fontSize: "clamp(1.5rem, 11cqh, 10rem)" }}
        >
          {mode.title}
        </div>
        <div
          className="font-medium opacity-90"
          style={{
            fontSize: "clamp(0.95rem, 5cqh, 4rem)",
            marginTop: "2cqh",
          }}
        >
          {mode.line}
        </div>
      </div>

      {showTimer && (
        <div
          className={`flex flex-col items-center ${low ? "animate-pulse" : ""}`}
          style={{ marginTop: "3cqh", gap: "3cqh", color: low ? "#fecaca" : "#ffffff" }}
        >
          <FlipClock
            text={fmt(remainingMs)}
            fontSize="clamp(2rem, 15cqh, 12rem)"
          />
          <div
            className="overflow-hidden rounded-full bg-black/25"
            style={{ height: "1.4cqh", width: "56cqw" }}
          >
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

  // 倒數
  const [timerTotalMs, setTimerTotalMs] = useState(180_000);
  const [timerRemainingMs, setTimerRemainingMs] = useState(180_000);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [customMin, setCustomMin] = useState("5");

  // 聲音
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
  const pct =
    timerTotalMs > 0
      ? Math.max(0, Math.min(100, (timerRemainingMs / timerTotalMs) * 100))
      : 0;

  const ensureAudio = useCallback((): AudioEngine | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    if (!engRef.current) engRef.current = createAudioEngine(ctxRef.current);
    engRef.current.resume();
    return engRef.current;
  }, []);

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
        if (
          secs <= mark &&
          secs > 0 &&
          totalSecs > mark &&
          !firedRef.current.has(mark)
        ) {
          firedRef.current.add(mark);
          if (cueOn) engRef.current?.attention();
        }
      }
      if (rem <= 0) {
        setTimerRunning(false);
        if (!firedRef.current.has(0)) {
          firedRef.current.add(0);
          if (cueOn) (ensureAudio() ?? engRef.current)?.alarm();
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [timerRunning, timerTotalMs, cueOn, ensureAudio]);

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
      if (cueOn) {
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
    [cueOn, ensureAudio],
  );

  // 全螢幕
  const requestFs = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) void wrapRef.current?.requestFullscreen?.();
  }, []);

  const toggleFs = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) void wrapRef.current?.requestFullscreen?.();
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

  const stopProjection = useCallback(() => {
    setProjecting(false);
    if (typeof document !== "undefined" && document.fullscreenElement)
      void document.exitFullscreen?.();
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
  }, [
    selectMode,
    timerRunning,
    pauseTimer,
    startTimer,
    toggleFs,
    projecting,
    startProjection,
    stopProjection,
  ]);

  // 分頁標題
  useEffect(() => {
    const prev = document.title;
    document.title = `${mode.emoji} ${mode.title} · 課堂模式`;
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

  return (
    <div
      ref={wrapRef}
      className={
        projecting
          ? "fixed inset-0 z-50 bg-black"
          : "min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-8"
      }
    >
      {projecting ? (
        <div className="relative h-full w-full">
          <Stage
            mode={mode}
            showTimer={showTimer}
            remainingMs={timerRemainingMs}
            pct={pct}
            flash={flash}
          />

          {/* 上方：模式切換 dock（平時淡出，滑鼠移上去變清楚） */}
          <div className="group absolute inset-x-0 top-0 flex justify-center p-3">
            <div className="flex flex-wrap justify-center gap-2 opacity-25 transition-opacity duration-200 group-hover:opacity-100">
              {MODES.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => selectMode(m.id)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-semibold text-white backdrop-blur transition ${
                    m.id === currentMode
                      ? "bg-white/30 ring-2 ring-white"
                      : "bg-black/35 hover:bg-black/55"
                  }`}
                >
                  <span className="text-lg">{m.emoji}</span>
                  <span className="hidden sm:inline">
                    {i + 1}. {m.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 右上：控制 */}
          <div className="absolute right-3 top-3 flex gap-2 opacity-40 transition-opacity hover:opacity-100">
            <button
              onClick={toggleFs}
              className="rounded-lg bg-black/40 px-3 py-1.5 text-sm text-white hover:bg-black/60"
            >
              {isFs ? "視窗" : "全螢幕"}
            </button>
            <button
              onClick={stopProjection}
              className="rounded-lg bg-black/40 px-3 py-1.5 text-sm text-white hover:bg-black/60"
            >
              ✕ 離開投影
            </button>
          </div>

          {/* 倒數控制：老師按了才開始 */}
          {showTimer && (
            <div className="absolute inset-x-0 bottom-[8vh] flex justify-center">
              {!timerRunning ? (
                <button
                  onClick={startTimer}
                  className="rounded-2xl bg-white/95 px-10 py-4 text-2xl font-black text-zinc-900 shadow-xl transition hover:bg-white active:scale-[0.98]"
                >
                  ▶ 開始倒數
                </button>
              ) : (
                <div className="flex gap-3 opacity-40 transition-opacity hover:opacity-100">
                  <button
                    onClick={pauseTimer}
                    className="rounded-xl bg-black/45 px-6 py-2.5 text-lg font-semibold text-white hover:bg-black/65"
                  >
                    ⏸ 暫停
                  </button>
                  <button
                    onClick={resetTimer}
                    className="rounded-xl bg-black/45 px-6 py-2.5 text-lg font-semibold text-white hover:bg-black/65"
                  >
                    ↺ 重設
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                🏫 課堂模式 Classroom Mode
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                按一個按鈕，投影幕就顯示清楚的課堂指令 · 倒數 · 背景音樂 · 白噪音 · 提示音 · 全螢幕投影
              </p>
            </div>
            <Link
              href="/"
              className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              ← 首頁
            </Link>
          </header>

          {/* 預覽 */}
          <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 shadow-lg dark:border-zinc-800">
            <div className="aspect-[16/9] w-full">
              <Stage
                mode={mode}
                showTimer={showTimer}
                remainingMs={timerRemainingMs}
                pct={pct}
                flash={flash}
              />
            </div>
          </div>

          {/* 模式按鈕 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {MODES.map((m, i) => (
              <button
                key={m.id}
                onClick={() => selectMode(m.id)}
                className={`flex flex-col items-start gap-1 rounded-xl p-4 text-left text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] ${
                  m.id === currentMode ? "ring-4 ring-offset-2 ring-zinc-900 dark:ring-white dark:ring-offset-zinc-950" : ""
                }`}
                style={{ background: m.bg }}
              >
                <span className="text-3xl">{m.emoji}</span>
                <span className="text-lg font-bold">
                  {i + 1}. {m.title}
                </span>
                <span className="text-sm opacity-90">{m.line}</span>
                {m.usesTimer && (
                  <span className="mt-1 rounded bg-white/20 px-1.5 py-0.5 text-xs">
                    倒數 {Math.round(m.defaultSec / 60)} 分（按開始）
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 投影按鈕 */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={startProjection}
              className="rounded-xl bg-zinc-900 px-6 py-3 text-lg font-bold text-white shadow-sm transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              🖥️ 開始投影（全螢幕）
            </button>
            <button
              onClick={() => {
                setProjecting(true);
                ensureAudio();
              }}
              className="rounded-xl border border-zinc-300 px-5 py-3 font-semibold hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              投影模式（不全螢幕）
            </button>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              投影後：數字鍵 1–5 切換模式 · 空白鍵 倒數開始／暫停 · Esc 離開
            </span>
          </div>

          {/* 控制面板 */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* 倒數 */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">⏱️ 倒數計時</h2>
                <span className="font-mono text-lg font-bold tabular-nums">
                  {fmt(timerRemainingMs)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={timerRunning ? pauseTimer : startTimer}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold text-white ${
                    timerRunning
                      ? "bg-amber-500 hover:bg-amber-400"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {timerRunning ? "暫停" : "開始"}
                </button>
                <button
                  onClick={resetTimer}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  重設
                </button>
                <button
                  onClick={() => {
                    setShowTimer(false);
                    setTimerRunning(false);
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  隱藏
                </button>
                {[-60_000, 60_000].map((d) => (
                  <button
                    key={d}
                    onClick={() => addTimer(d)}
                    className="rounded-lg bg-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  >
                    {d > 0 ? "+1 分" : "−1 分"}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {TIMER_PRESETS.map((min) => (
                  <button
                    key={min}
                    onClick={() => configTimer(min * 60_000)}
                    className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${
                      timerTotalMs === min * 60_000
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {min} 分
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm">自訂</span>
                <input
                  type="number"
                  min={0}
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  className="w-16 rounded-lg border border-zinc-300 bg-zinc-50 px-2 py-1 text-center dark:border-zinc-700 dark:bg-zinc-950"
                />
                <span className="text-sm">分</span>
                <button
                  onClick={() => {
                    const m = Math.max(0, Math.floor(Number(customMin) || 0));
                    if (m > 0) configTimer(m * 60_000);
                  }}
                  className="rounded-lg bg-zinc-900 px-3 py-1 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  套用
                </button>
              </div>
            </div>

            {/* 聲音 */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-3 text-sm font-semibold">🎵 聲音</h2>

              <label className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={musicOn}
                    onChange={(e) => {
                      ensureAudio();
                      setMusicOn(e.target.checked);
                    }}
                    className="h-4 w-4"
                  />
                  背景音樂（環境音）
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={musicLevel}
                  onChange={(e) => setMusicLevel(Number(e.target.value))}
                  className="w-28"
                  disabled={!musicOn}
                />
              </label>

              <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={noiseOn}
                    onChange={(e) => {
                      ensureAudio();
                      setNoiseOn(e.target.checked);
                    }}
                    className="h-4 w-4"
                  />
                  白噪音
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={noiseType}
                    onChange={(e) =>
                      setNoiseType(e.target.value as NoiseType)
                    }
                    disabled={!noiseOn}
                    className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    {(Object.keys(NOISE_LABELS) as NoiseType[]).map((t) => (
                      <option key={t} value={t}>
                        {NOISE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={noiseLevel}
                    onChange={(e) => setNoiseLevel(Number(e.target.value))}
                    className="w-20"
                    disabled={!noiseOn}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 py-1.5 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={cueOn}
                  onChange={(e) => setCueOn(e.target.checked)}
                  className="h-4 w-4"
                />
                上課提示音 / 注意力提示 / 時間到響鈴
              </label>

              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => ensureAudio()?.chime()}
                  className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  試聽 上課音
                </button>
                <button
                  onClick={() => ensureAudio()?.attention()}
                  className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  試聽 注意力提示
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-400">
            提示：背景音樂與白噪音皆為即時合成，非音檔。第一次開聲音若瀏覽器擋住，再點一次即可。
          </p>
        </div>
      )}
    </div>
  );
}
