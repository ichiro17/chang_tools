/** 撐到放假各區塊共用的小元件與文字。 */

import type { ReactNode } from "react";
import type { Target } from "./calendar";

export const TARGETS: { key: Target; emoji: string; title: string; sub: string; name: string }[] = [
  { key: "winter", emoji: "☃️", title: "我要撐到寒假", sub: "先跨過第一學期", name: "寒假" },
  { key: "summer", emoji: "🏖️", title: "我要撐到暑假", sub: "一路撐到學年終點", name: "暑假" },
];

export const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

/** 10/9（五） */
export function fmtMD(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;
}

/** 深色膠囊標籤（底下多一層陰影，像按鈕浮起來）。 */
export function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#3d3935] px-5 py-2 text-base font-bold tracking-wide text-white shadow-[0_5px_0_#d9d3c7]">
      {icon}
      {children}
    </span>
  );
}

/** 各區塊的卡片外框。 */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`flex flex-col gap-5 rounded-[2.25rem] border border-[#e6dfd1] bg-[#fdfbf6] p-6 shadow-sm sm:p-8 ${className}`}
    >
      {children}
    </section>
  );
}

export function TargetToggle({
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
              <span className={`block truncate text-xs sm:text-sm ${on ? "text-white/70" : "text-[#6f685e]"}`}>{t.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
