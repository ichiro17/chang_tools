"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/app/components/Icon";
import { Board } from "../Board";
import { KIND_INFO, fmtClock, useNow, useSchedule } from "../schedule";

/**
 * 課堂時鐘的投影畫面：只給學生看，不放任何設定。
 * 課表在控制台（/timer）編輯，這裡透過本機儲存自動同步。
 */
export default function TimerDisplayPage() {
  const now = useNow();
  const { ready, mode, showSec, classRows, examRows } = useSchedule({ readOnly: true });
  const [isFs, setIsFs] = useState(false);
  const [hint, setHint] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);

  const toggleFs = useCallback(() => {
    if (!document.fullscreenElement) void wrapRef.current?.requestFullscreen?.().catch(() => {});
    else void document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    const h = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f") toggleFs();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [toggleFs]);

  // 投影時避免螢幕休眠
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
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
  }, []);

  useEffect(() => {
    const prev = document.title;
    document.title = ready ? `${fmtClock(now, false)} · ${KIND_INFO[mode].name}` : "課堂時鐘";
    return () => {
      document.title = prev;
    };
  }, [now, ready, mode]);

  return (
    <div ref={wrapRef} className="relative h-screen w-screen bg-[#121110]">
      <Board now={now} mounted={ready} rows={mode === "exam" ? examRows : classRows} kind={mode} showSec={showSec} />

      {!isFs && (
        <Link
          href="/timer"
          className="absolute bottom-3 left-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-3.5 text-sm font-bold text-[#e7e2d9] hover:bg-white/20"
        >
          <Icon name="arrowLeft" className="h-[18px] w-[18px]" />
          回控制台
        </Link>
      )}

      {hint && (
        <div className="absolute bottom-3 right-4 flex items-center gap-3 rounded-2xl bg-white/10 py-1.5 pl-4 pr-1.5 text-sm text-[#e7e2d9]">
          <span>
            <kbd className="rounded-md bg-white/20 px-2 py-0.5 font-bold text-white">F</kbd> {isFs ? "離開全螢幕" : "全螢幕"}
          </span>
          {isFs && (
            <span>
              <kbd className="rounded-md bg-white/20 px-2 py-0.5 font-bold text-white">Esc</kbd> 離開
            </span>
          )}
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
  );
}
