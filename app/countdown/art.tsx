/**
 * 撐到放假的插圖：倒數卡片底部的「放假之路」場景，以及各處用到的線條圖示。
 * 場景座標都在 572×160 的 viewBox 裡，隨卡片寬度等比縮放。
 */

import type { Target } from "./calendar";

const W = 572;
const H = 160;
/** 小路起點（學校）與終點（雪人 / 陽傘）的 x */
const X0 = 52;
const X1 = 526;

/** 小路的高度：中間微微隆起，終點比起點稍高。 */
function roadY(x: number) {
  const t = (x - X0) / (X1 - X0);
  return 96 - 12 * Math.sin(Math.PI * t) - 6 * t;
}

/** 沿著小路（往下平移 dy）取點連成折線，每 8px 一點就夠平滑。 */
function along(from: number, to: number, dy = 0) {
  const n = Math.max(1, Math.ceil((to - from) / 8));
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const x = from + ((to - from) * i) / n;
    pts.push(`${x.toFixed(1)} ${(roadY(x) + dy).toFixed(1)}`);
  }
  return `M${pts.join(" L")}`;
}

const GROUND = `${along(0, W, 10)} L${W} ${H} L0 ${H} Z`;

function School() {
  return (
    <g
      transform={`translate(46 ${roadY(X0) + 6})`}
      stroke="#6f685e"
      fill="#fff"
      strokeWidth={2}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M-14 0V-16L0-27 14-16V0Z" />
      <path d="M-4 0V-8H4V0M0-27V-38" fill="none" />
      <path d="M0-38 8-35 0-32" fill="#c96b4a" stroke="#c96b4a" />
    </g>
  );
}

function WinterBackdrop() {
  return (
    <>
      <path d="M0 46C110 8 220 14 320 36S500 66 572 20V160H0Z" fill="#edf3f5" />
      <g
        transform="translate(470 54)"
        stroke="#8fae9c"
        fill="#f3f7f2"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M0-34 12-14H6L16 2H-16L-6-14H-12Z" />
        <path d="M0 2V10" />
      </g>
      <path d={GROUND} fill="#e1ebef" />
    </>
  );
}

function SummerBackdrop() {
  return (
    <>
      <path
        d="M0 36C40 24 80 48 120 36S200 24 240 36 320 48 360 36 440 24 480 36 550 46 572 34V160H0Z"
        fill="#e3eff0"
      />
      <path
        d="M0 62C40 52 80 72 120 62S200 52 240 62 320 72 360 62 440 52 480 62 550 70 572 60"
        fill="none"
        stroke="#c7dde0"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path d={GROUND} fill="#f3e7d2" />
      <g
        transform="translate(372 132)"
        stroke="#d6b48c"
        fill="#fbf1e2"
        strokeWidth={1.8}
        strokeLinejoin="round"
      >
        <path d="M-9 4 0-9 9 4Z" />
        <path d="M0-9V4M-4.5-2.5-3 4M4.5-2.5 3 4" fill="none" />
      </g>
    </>
  );
}

function Snowman() {
  return (
    <g transform={`translate(528 ${roadY(X1) + 2})`} stroke="#3d3935" fill="#fff" strokeWidth={2}>
      <circle cy={-11} r={11} />
      <circle cy={-30} r={8} />
      <path d="M-7-37H7M-5-37V-45H5V-37" fill="#3d3935" />
      <path d="M-8-23H8" stroke="#c96b4a" strokeWidth={4} strokeLinecap="round" />
    </g>
  );
}

function Parasol() {
  return (
    <g
      transform={`translate(528 ${roadY(X1) + 4})`}
      stroke="#3d3935"
      strokeWidth={2}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M-6 0 4-40M4-32C6-40 6-46 4-48" fill="none" />
      <path d="M-18-34C-12-52 18-52 26-30 18-34 12-34 4-32-4-36-10-36-18-34Z" fill="#f1b48f" />
    </g>
  );
}

/** 卡片底部的場景：從學校走向放假，走過的路是實線，標記停在「已撐過」的位置。 */
export function JourneyScene({
  target,
  pct,
  showMarker,
}: {
  target: Target;
  pct: number;
  showMarker: boolean;
}) {
  const mx = X0 + (X1 - X0) * pct;
  const my = roadY(mx);
  const winter = target === "winter";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 aspect-[572/160]" aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
        {winter ? <WinterBackdrop /> : <SummerBackdrop />}
        <path
          d={along(X0, X1)}
          fill="none"
          stroke={winter ? "#a9c1cb" : "#d6bf9c"}
          strokeWidth={3}
          strokeDasharray="1 10"
          strokeLinecap="round"
        />
        {showMarker && pct > 0 && (
          <path
            d={along(X0, mx)}
            fill="none"
            stroke="#c96b4a"
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}
        <School />
        {winter ? <Snowman /> : <Parasol />}
        {showMarker && (
          <circle cx={mx} cy={my} r={8} fill="#c96b4a" stroke="#fff" strokeWidth={3} />
        )}
      </svg>
      {showMarker && (
        <span
          className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-[#3d3935] px-3 py-1 text-xs font-bold text-white sm:text-[13px]"
          style={{ left: `${(mx / W) * 100}%`, top: `calc(${((my - 14) / H) * 100}%)` }}
        >
          已撐過 {Math.round(pct * 100)}%
        </span>
      )}
    </div>
  );
}

function Snowflake({ className, color = "#9fbccb" }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="-18 -18 36 36"
      className={className}
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M0-16V16M-13.9-8 13.9 8M-13.9 8 13.9-8M-4-12 0-8 4-12M-4 12 0 8 4 12" />
    </svg>
  );
}

/** 數字上方的天空：寒假飄雪、暑假有太陽和海鷗。 */
export function SkyDecor({ target }: { target: Target }) {
  if (target === "winter") {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Snowflake className="absolute right-[8%] top-[33%] h-7 w-7 sm:right-[12%] sm:top-[24%] sm:h-8 sm:w-8" />
        <Snowflake className="absolute right-[5%] top-[46%] h-5 w-5 sm:right-[6%] sm:top-[40%]" />
        <Snowflake className="absolute left-[7%] top-[38%] h-4 w-4 sm:left-[9%] sm:top-[33%]" color="#b9cfd9" />
        <span className="absolute left-[18%] top-[23%] h-1.5 w-1.5 rounded-full bg-[#c9dae2]" />
        <span className="absolute right-[10%] top-[55%] h-2 w-2 rounded-full bg-[#c9dae2]" />
        <span className="absolute left-[6%] top-[52%] h-1.5 w-1.5 rounded-full bg-[#c9dae2]" />
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <svg
        viewBox="-40 -40 80 80"
        className="absolute right-[4%] top-[32%] h-12 w-12 sm:right-[6%] sm:top-[22%] sm:h-16 sm:w-16"
        fill="none"
        stroke="#eab27a"
        strokeWidth={2.4}
        strokeLinecap="round"
      >
        <circle r={18} fill="#fbe7cf" />
        <path d="M0-30V-38M0 30V38M-30 0H-38M30 0H38M-21-21-27-27M21 21 27 27M-21 21-27 27M21-21 27-27" />
      </svg>
      <svg
        viewBox="0 0 70 50"
        className="absolute left-[4%] top-[36%] h-8 w-11 sm:left-[8%] sm:top-[30%] sm:h-10 sm:w-14"
        fill="none"
        strokeWidth={2.2}
        strokeLinecap="round"
      >
        <path d="M2 10Q10 2 18 10 26 2 34 10" stroke="#a9b9bf" />
        <path d="M44 42Q49 37 54 42 59 37 64 42" stroke="#c4d0d4" />
      </svg>
    </div>
  );
}

type IconProps = { className?: string };

/** 標籤用的小圖示 */
export function ChipIcon({ kind }: { kind: "winter" | "summer" | "pencil" }) {
  const common = {
    width: 16,
    height: 16,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (kind === "winter")
    return (
      <svg {...common} viewBox="-17 -17 34 34" stroke="#bcd3dd" strokeWidth={3.4}>
        <path d="M0-16V16M-13.9-8 13.9 8M-13.9 8 13.9-8" />
      </svg>
    );
  if (kind === "summer")
    return (
      <svg {...common} viewBox="0 0 24 24" stroke="#f2c08f" strokeWidth={2.4}>
        <circle cx={12} cy={12} r={4.5} />
        <path d="M12 2V4M12 20V22M2 12H4M20 12H22M4.9 4.9 6.3 6.3M17.7 17.7 19.1 19.1M4.9 19.1 6.3 17.7M17.7 6.3 19.1 4.9" />
      </svg>
    );
  return (
    <svg {...common} viewBox="0 0 24 24" stroke="#f1c9a8" strokeWidth={2.4}>
      <path d="M4 20 5 15 16 4 20 8 9 19ZM13.5 6.5 17.5 10.5" />
    </svg>
  );
}

/** 打勾的月曆：還要上幾天班 */
export function CalendarCheckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      stroke="#3d3935"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x={6} y={9} width={28} height={25} rx={4} />
      <path d="M6 16H34M13 5V12M27 5V12" />
      <path d="M13 25 17.5 29 27 21" stroke="#c96b4a" strokeWidth={2.8} />
    </svg>
  );
}

/** 沙漏：還剩多少工時 */
export function HourglassIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      stroke="#3d3935"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 5H30M10 35H30" />
      <path d="M12 5V10C12 15 20 17 20 20 20 23 12 25 12 30V35M28 5V10C28 15 20 17 20 20 20 23 28 25 28 30V35" />
      <path d="M15 33C15 29 20 27 20 27 20 27 25 29 25 33Z" fill="#c96b4a" stroke="#c96b4a" strokeWidth={1} />
      <path d="M17 12H23" stroke="#c96b4a" />
    </svg>
  );
}

/** 小旗子：下一個放假日 */
export function FlagIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="#c96b4a"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 21V4M5 4H17L14.5 8 17 12H5" />
    </svg>
  );
}
