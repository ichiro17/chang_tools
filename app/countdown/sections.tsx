"use client";

import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/app/components/Icon";
import {
  DATA_INFO,
  type Milestone,
  type MilestoneKind,
  type Settings,
  daysBetween,
  dayOff,
  milestones,
  quoteFor,
  stages,
  startOfDay,
  usesDefaultDates,
} from "./calendar";
import { Card, Chip, TARGETS, fmtMD } from "./ui";

const chipIcon = (name: IconName) => <Icon name={name} className="h-4 w-4 text-[#f1c9a8]" strokeWidth={2.4} />;

const smallBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#e3dccd] bg-white px-4 text-[15px] font-bold text-[#3d3935] transition hover:bg-[#f3eee4] disabled:opacity-40";

/** 今天：是不是工作日，加上每日一句教師生存語錄。 */
export function TodayCard({
  now,
  s,
  mounted,
  onEditQuotes,
}: {
  now: Date;
  s: Settings;
  mounted: boolean;
  onEditQuotes: () => void;
}) {
  const [shift, setShift] = useState(0);
  const off = dayOff(now, s);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Chip icon={chipIcon("sun")}>今天</Chip>
        <span className="text-sm font-bold text-[#6f685e]">{mounted ? fmtMD(now) : " "}</span>
      </div>
      {mounted && (
        <p
          className={`self-start rounded-full px-4 py-1.5 text-[15px] font-black ${
            off ? "bg-[#e0f2ec] text-[#065f46]" : "bg-[#f1ece2] text-[#3d3935]"
          }`}
        >
          {off ? `今天放假：${off}` : "今天是工作日，也算在剩餘天數裡"}
        </p>
      )}
      <figure className="flex flex-1 flex-col gap-3 rounded-3xl bg-white px-6 py-6">
        <Icon name="quote" className="h-8 w-8 text-[#d9895f]" strokeWidth={2.4} />
        <blockquote className="text-2xl font-black leading-snug text-[#3d3935] sm:text-[26px]">
          {mounted ? quoteFor(now, s, shift) : " "}
        </blockquote>
        <figcaption className="text-sm font-bold text-[#6f685e]">每日一句教師生存語錄</figcaption>
      </figure>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setShift((n) => n + 1)} className={smallBtn}>
          <Icon name="refresh" className="h-[18px] w-[18px]" strokeWidth={2.2} />
          換一句
        </button>
        <button type="button" onClick={onEditQuotes} className={smallBtn}>
          <Icon name="plus" className="h-[18px] w-[18px]" strokeWidth={2.4} />
          寫一句自己的
        </button>
      </div>
    </Card>
  );
}

/** 多階段倒數：把一大段路切成週末、連假、自訂事件等小目標。 */
export function StagesCard({
  now,
  s,
  mounted,
  onAddEvent,
}: {
  now: Date;
  s: Settings;
  mounted: boolean;
  onAddEvent: () => void;
}) {
  const today = now.toDateString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo(() => stages(now, s), [today, s]);
  const first = list[0];
  const vacation = list.find((x) => x.key === s.target);

  return (
    <Card>
      <div>
        <Chip icon={chipIcon("flag")}>接下來的小目標</Chip>
      </div>
      {mounted && first && (
        <div className="flex flex-col gap-1">
          <p className="text-2xl font-black leading-snug">
            再撐 <span className="text-[#b4532f]">{first.days}</span> 天，就是{first.label}。
          </p>
          {vacation && vacation !== first && (
            <p className="text-[15px] font-bold text-[#6f685e]">
              再上 {vacation.workdays} 個工作日，就到{vacation.label}。
            </p>
          )}
        </div>
      )}
      {mounted && list.length === 0 && <p className="text-xl font-black">放假中，好好休息！</p>}
      {mounted && list.length > 0 && (
        <ol className="flex flex-col gap-2">
          {list.map((x, i) => (
            <li
              key={x.key}
              className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
                i === 0 ? "border-2 border-[#3d3935] bg-white" : "border border-[#ebe4d6] bg-white"
              }`}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[17px] font-black">{x.label}</span>
                <span className="text-[13px] font-bold text-[#6f685e]">
                  {fmtMD(x.date)}
                  {x.note && ` · ${x.note}`}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="text-xl font-black tabular-nums">
                  {x.days}
                  <span className="ml-0.5 text-sm">天</span>
                </span>
                <span className="text-[13px] font-bold text-[#6f685e]">上班 {x.workdays} 天</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      <button type="button" onClick={onAddEvent} className={`${smallBtn} self-start`}>
        <Icon name="plus" className="h-[18px] w-[18px]" strokeWidth={2.4} />
        新增倒數事件（段考、校慶、發薪日）
      </button>
    </Card>
  );
}

const BADGE: Record<MilestoneKind, { icon: IconName; bg: string }> = {
  start: { icon: "flag", bg: "#3f7a94" },
  week: { icon: "calendar", bg: "#4d7a57" },
  month: { icon: "calendar", bg: "#4d7a57" },
  half: { icon: "star", bg: "#a8691b" },
  count: { icon: "clock", bg: "#b4532f" },
  vacation: { icon: "sun", bg: "#9a4424" },
  event: { icon: "trophy", bg: "#6d28d9" },
};

function badgeOf(m: Milestone) {
  if (m.key === "winter") return { icon: "snowflake" as IconName, bg: "#2f6f8f" };
  return BADGE[m.kind];
}

/** 學期里程碑與成就徽章：日期到了就解鎖，最近達成的會跳出恭喜。 */
export function MilestonesCard({ now, s, mounted }: { now: Date; s: Settings; mounted: boolean }) {
  const t0 = startOfDay(now);
  const list = milestones(s);
  const got = list.filter((m) => m.date.getTime() <= t0.getTime());
  const recent = got.filter((m) => daysBetween(m.date, t0) <= 7).at(-1);
  const upcoming = list.find((m) => m.date.getTime() > t0.getTime());

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Chip icon={chipIcon("trophy")}>學期里程碑</Chip>
        {mounted && (
          <span className="text-sm font-bold text-[#6f685e]">
            已解鎖 {got.length} / {list.length} 個徽章
          </span>
        )}
      </div>

      {mounted && recent && (
        <div role="status" className="flex items-center gap-4 rounded-3xl bg-[#3d3935] px-5 py-4 text-white">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            style={{ background: badgeOf(recent).bg }}
          >
            <Icon name={badgeOf(recent).icon} className="h-6 w-6" />
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-black">{recent.congrats}</span>
            <span className="text-sm font-bold text-[#e7e2d9]">
              {daysBetween(recent.date, t0) === 0 ? "今天" : fmtMD(recent.date)}達成「{recent.title}」
            </span>
          </span>
        </div>
      )}
      {mounted && !recent && upcoming && (
        <p className="text-[15px] font-bold text-[#6f685e]">
          下一個徽章：「{upcoming.title}」，還有 {daysBetween(t0, upcoming.date)} 天。
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 min-[520px]:grid-cols-3 lg:grid-cols-5">
        {list.map((m) => {
          const ok = mounted && m.date.getTime() <= t0.getTime();
          const b = badgeOf(m);
          return (
            <li
              key={m.key}
              className={`flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-center ${
                ok ? "bg-white" : "border border-dashed border-[#d8d0c2]"
              }`}
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full ${
                  ok ? "text-white" : "border-2 border-dashed border-[#c9c0b1] text-[#8c857a]"
                }`}
                style={ok ? { background: b.bg } : undefined}
              >
                <Icon name={ok ? b.icon : "lock"} className="h-7 w-7" />
              </span>
              <span className={`text-[15px] font-black leading-tight ${ok ? "" : "text-[#6f685e]"}`}>{m.title}</span>
              <span className="text-xs font-bold text-[#6f685e]">
                {mounted ? (ok ? `${fmtMD(m.date)} 達成` : `還有 ${daysBetween(t0, m.date)} 天`) : " "}
              </span>
              <span className="sr-only">{ok ? "已解鎖" : "尚未解鎖"}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** 工作量卡片底下的「計算方式」，讓老師知道數字怎麼來的。 */
export function CalcNote({ s }: { s: Settings }) {
  const name = TARGETS.find((t) => t.key === s.target)!.name;
  const excluded = [
    s.excludeSat && "星期六",
    s.excludeSun && "星期日",
    s.excludeHolidays && "國定假日與補假",
    s.target === "summer" && s.excludeWinter && "寒假",
  ].filter(Boolean);
  const off = s.custom.filter((c) => c.kind !== "work").length;
  const work = s.custom.length - off;

  return (
    <details className="group relative rounded-2xl border border-[#ebe4d6] bg-white px-4 py-3 text-sm text-[#5f594f]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-bold text-[#3d3935]">
        計算方式
        <Icon name="chevronDown" className="h-4 w-4 transition group-open:rotate-180" strokeWidth={2.4} />
      </summary>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 leading-relaxed">
        <li>從今天（今天若要上班也算）一路算到{name}開始的前一天。</li>
        <li>已扣除：{excluded.length ? excluded.join("、") : "（沒有勾選任何項目）"}。</li>
        {off > 0 && <li>另外扣除你自訂的 {off} 天不上班日。</li>}
        {work > 0 && <li>加回你自訂的 {work} 天補課日。</li>}
        <li>剩餘工時＝剩餘工作日 × 每日 {s.hoursPerDay} 小時。</li>
        <li>這些規則都可以在「設定」調整。</li>
      </ul>
    </details>
  );
}

/** 頁尾的資料版本資訊：官方預設只是預設值，不是唯一答案。 */
export function DataInfo({ s }: { s: Settings }) {
  return (
    <div className="flex flex-col gap-1 text-center text-xs font-semibold leading-relaxed text-[#6f685e]">
      <p>
        目前使用：{usesDefaultDates(s) ? `${DATA_INFO.year}官方預設` : "你自訂的學期日期"} · 最後更新：{DATA_INFO.updated} ·{" "}
        {DATA_INFO.coverage}
      </p>
      <p>資料來源：{DATA_INFO.sources}。各校行事曆可能不同，學校若有補課、校慶或彈性放假，請到「設定」調整。</p>
    </div>
  );
}
