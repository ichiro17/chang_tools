import { FlipClock } from "@/app/components/FlipClock";
import { KIND_INFO, type Kind, type Row, analyze, fmtClock, fmtDate, fmtDur, nowSec } from "./schedule";

/**
 * 學生看到的投影畫面：現在時間、目前項目、剩餘時間、進度條、下一個項目。
 * 字級用容器單位（cqh/cqw），同一個元件可以當控制台的小預覽，也可以全螢幕投影。
 * 深色底、高對比，不用太淡的灰字。
 */
export function Board({
  now,
  mounted,
  rows,
  kind,
  showSec,
}: {
  now: Date;
  mounted: boolean;
  rows: Row[];
  kind: Kind;
  showSec: boolean;
}) {
  const curSec = nowSec(now);
  const { active, next } = analyze(rows, kind, curSec);
  const info = KIND_INFO[kind];

  const remain = active ? active.e - curSec : 0;
  const frac = active ? Math.min(1, Math.max(0, (curSec - active.s) / (active.e - active.s))) : 0;
  const low = active != null && remain <= 60;
  const upcoming = active ? next : null;

  return (
    <div
      className="flex h-full w-full select-none flex-col overflow-hidden bg-[#121110] text-white"
      style={{ containerType: "size", padding: "6cqh 5cqw 7cqh" }}
    >
      <div className="flex items-center justify-between gap-[2cqw] font-bold text-[#e7e2d9]" style={{ fontSize: "3.2cqh" }}>
        <span>{mounted ? `${fmtDate(now)} · ${info.name}` : info.name}</span>
        <FlipClock text={mounted ? fmtClock(now, showSec) : showSec ? "--:--:--" : "--:--"} fontSize="min(5.5cqh, 6cqw)" />
      </div>

      <div className="flex flex-1 flex-col justify-center" style={{ gap: "2.4cqh" }}>
        {mounted && active && (
          <>
            <span
              className="self-start rounded-full bg-[#a5b4fc] font-black text-[#121110]"
              style={{ fontSize: "3.2cqh", padding: "0.8cqh 2.2cqh" }}
            >
              {info.live}
            </span>
            <div className="flex items-end justify-between" style={{ gap: "4cqw" }}>
              <span className="min-w-0 truncate font-black leading-none tracking-wide" style={{ fontSize: "min(18cqh, 11cqw)" }}>
                {active.label}
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="font-bold text-[#e7e2d9]" style={{ fontSize: "3.6cqh" }}>
                  剩餘時間
                </span>
                <span
                  className={`font-extrabold leading-none tabular-nums ${low ? "animate-pulse text-[#fca5a5]" : ""}`}
                  style={{ fontSize: "min(20cqh, 12cqw)" }}
                >
                  {fmtDur(remain)}
                </span>
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`${active.label}進度`}
              aria-valuenow={Math.round(frac * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="overflow-hidden rounded-full bg-[#2f2c29]"
              style={{ height: "3.8cqh", marginTop: "1cqh" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${frac * 100}%`,
                  background: low ? "#fca5a5" : "#a5b4fc",
                  transition: "width 0.4s linear, background 0.5s ease",
                }}
              />
            </div>
            <div className="flex justify-between font-semibold tabular-nums text-[#e7e2d9]" style={{ fontSize: "3.3cqh" }}>
              <span>{active.start}</span>
              <span>{active.end}</span>
            </div>
          </>
        )}

        {mounted && !active && next && (
          <>
            <span
              className="self-start rounded-full bg-[#e7e2d9] font-black text-[#121110]"
              style={{ fontSize: "3.2cqh", padding: "0.8cqh 2.2cqh" }}
            >
              即將開始
            </span>
            <span className="truncate font-black leading-none tracking-wide" style={{ fontSize: "min(18cqh, 11cqw)" }}>
              {next.label}
            </span>
            <span className="font-bold tabular-nums text-[#e7e2d9]" style={{ fontSize: "5cqh" }}>
              {next.start} 開始 · 還有 {fmtDur(next.s - curSec)}
            </span>
          </>
        )}

        {mounted && !active && !next && (
          <span className="text-center font-bold text-[#e7e2d9]" style={{ fontSize: "6cqh" }}>
            {kind === "exam" ? "今日考程結束／沒有安排" : "今日流程結束／沒有安排"}
          </span>
        )}
      </div>

      {mounted && upcoming && (
        <div
          className="flex items-center rounded-[2.5cqh] bg-[#211f1c] font-bold"
          style={{ fontSize: "4cqh", padding: "2.6cqh 3.4cqh", gap: "2.6cqh" }}
        >
          <span className="text-[#e7e2d9]">下一個</span>
          <span className="truncate font-black">{upcoming.label}</span>
          <span className="shrink-0 tabular-nums text-[#e7e2d9]">
            {upcoming.start}–{upcoming.end}
          </span>
        </div>
      )}
    </div>
  );
}
