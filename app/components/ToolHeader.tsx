import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type ToolKey = "draw" | "timer" | "classroom" | "countdown";

/** 每個工具的名稱、圖示與主題色（Tailwind class 要寫完整字串才會被打包）。 */
export const TOOLS: Record<
  ToolKey,
  { name: string; icon: IconName; text: string; bg: string; tint: string; border: string }
> = {
  draw: {
    name: "抽籤轉盤",
    icon: "wheel",
    text: "text-draw",
    bg: "bg-draw",
    tint: "bg-draw-tint",
    border: "border-draw",
  },
  timer: {
    name: "課堂時鐘／考程",
    icon: "clock",
    text: "text-timer",
    bg: "bg-timer",
    tint: "bg-timer-tint",
    border: "border-timer",
  },
  classroom: {
    name: "課堂模式",
    icon: "board",
    text: "text-classroom",
    bg: "bg-classroom",
    tint: "bg-classroom-tint",
    border: "border-classroom",
  },
  countdown: {
    name: "撐到放假",
    icon: "parasol",
    text: "text-countdown",
    bg: "bg-countdown",
    tint: "bg-countdown-tint",
    border: "border-countdown",
  },
};

/** 按鈕樣式：高度至少 44px，方便觸控。 */
export const btn = {
  base: "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  secondary: "border-[1.5px] border-line-strong bg-white text-ink hover:bg-paper",
  dark: "bg-ink text-white hover:bg-[#35322d]",
};

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-black text-ink">
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-ink text-white">
        <Icon name="toolbox" className="h-5 w-5" />
      </span>
      <span className="text-[17px]">小張的小工具箱</span>
    </Link>
  );
}

/**
 * 四個工具共用的頁首：左邊「小工具箱 / 工具名稱」，右邊固定是「返回首頁」＋各工具自己的動作。
 * 手機上收成「←」＋工具名稱，省空間。
 */
export function ToolHeader({ tool, actions }: { tool: ToolKey; actions?: ReactNode }) {
  const t = TOOLS[tool];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-2 sm:h-[72px] sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            aria-label="返回首頁"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-paper sm:hidden"
          >
            <Icon name="arrowLeft" className="h-[22px] w-[22px]" strokeWidth={2.2} />
          </Link>
          <span className="hidden sm:flex">
            <Logo />
          </span>
          <span className="hidden text-[#a39b8d] sm:inline" aria-hidden>
            /
          </span>
          <h1 className={`flex min-w-0 items-center gap-2 text-[17px] font-black ${t.text}`}>
            <Icon name={t.icon} className="h-[22px] w-[22px] shrink-0" />
            <span className="truncate">{t.name}</span>
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/" className={`${btn.base} ${btn.secondary} hidden sm:inline-flex`}>
            <Icon name="arrowLeft" className="h-[18px] w-[18px]" strokeWidth={2.2} />
            返回首頁
          </Link>
          {actions}
        </div>
      </div>
    </header>
  );
}

/** 各頁底部的隱私說明。 */
export function PrivacyNote({ children }: { children?: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[13px] text-muted">
      <Icon name="lock" className="h-4 w-4 shrink-0" />
      {children ?? "設定只會儲存在這台裝置的瀏覽器，不會上傳到雲端。"}
    </p>
  );
}
