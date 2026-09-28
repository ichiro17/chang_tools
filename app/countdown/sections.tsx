"use client";

import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/app/components/Icon";
import {
  DATA_INFO,
  type Milestone,
  type MilestoneKind,
  type Settings,
  addDays,
  daysBetween,
  dayOff,
  milestones,
  quoteFor,
  stages,
  startOfDay,
  targetDate,
  toYmd,
  usesDefaultDates,
  workload,
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

type ScenarioKey = "leave" | "comp" | "closure" | "makeup" | "shorter";

const SCENARIOS: { key: ScenarioKey; label: string; tag: string; kind: "off" | "work" | null }[] = [
  { key: "leave", label: "請一天假", tag: "請假", kind: "off" },
  { key: "comp", label: "多一天補休", tag: "補休", kind: "off" },
  { key: "closure", label: "學校臨時放假", tag: "臨時放假", kind: "off" },
  { key: "makeup", label: "多一天補課", tag: "補課", kind: "work" },
  { key: "shorter", label: "每天少算 1 小時", tag: "", kind: null },
];

/** 「如果今天請假」模擬器：先試算，確定了再一鍵加進行事曆。 */
export function SimulatorCard({
  now,
  s,
  update,
}: {
  now: Date;
  s: Settings;
  update: (patch: Partial<Settings>) => void;
}) {
  const [key, setKey] = useState<ScenarioKey>("leave");
  const [dateText, setDateText] = useState("");
  const [done, setDone] = useState("");
  const sc = SCENARIOS.find((x) => x.key === key)!;
  const t0 = startOfDay(now);
  const target = targetDate(s);
  const name = TARGETS.find((t) => t.key === s.target)!.name;

  // 預設日期：請假類挑下一個要上班的日子，補課挑下一個不用上班的日子
  const defaultDate = (() => {
    for (let d = addDays(t0, 1); d.getTime() < target.getTime(); d = addDays(d, 1)) {
      const off = dayOff(d, s) != null;
      if (sc.kind === "work" ? off : !off) return toYmd(d);
    }
    return toYmd(addDays(t0, 1));
  })();
  const date = dateText || defaultDate;

  const d = new Date(`${date}T00:00`);
  const inRange = !Number.isNaN(d.getTime()) && d.getTime() >= t0.getTime() && d.getTime() < target.getTime();
  const next: Settings = sc.kind
    ? { ...s, custom: [...s.custom.filter((c) => c.date !== date), { date, label: sc.tag, kind: sc.kind }] }
    : { ...s, hoursPerDay: Math.max(1, s.hoursPerDay - 1) };
  const before = workload(now, s);
  const after = workload(now, next);
  const dDays = after.days - before.days;
  const dHours = after.hours - before.hours;
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  const noChange = sc.kind && inRange && dDays === 0;
  const canApply = sc.kind ? inRange && dDays !== 0 : s.hoursPerDay > 1;

  return (
    <Card>
      <div>
        <Chip icon={chipIcon("lab")}>如果⋯會怎樣？</Chip>
      </div>
      <p className="-mt-1 text-[15px] font-bold text-[#6f685e]">先試算看看，不會改到你的設定。</p>

      <div role="radiogroup" aria-label="情境" className="flex flex-wrap gap-2">
        {SCENARIOS.map((x) => (
          <button
            key={x.key}
            type="button"
            role="radio"
            aria-checked={key === x.key}
            onClick={() => {
              setKey(x.key);
              setDateText("");
              setDone("");
            }}
            className={`min-h-11 rounded-full px-4 text-[15px] font-bold ${
              key === x.key ? "bg-[#3d3935] text-white" : "border border-[#e3dccd] bg-white text-[#3d3935] hover:bg-[#f3eee4]"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {sc.kind && (
        <label className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-center">
          <span className="text-[15px] font-bold">哪一天？</span>
          <input
            type="date"
            value={date}
            min={toYmd(t0)}
            onChange={(e) => {
              setDateText(e.target.value);
              setDone("");
            }}
            className="min-h-12 rounded-2xl border border-[#e3dccd] bg-white px-4 text-base outline-none focus:border-[#3f7a94]"
          />
        </label>
      )}

      {sc.kind && !inRange ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-[15px] font-bold text-[#9a4424]">
          這一天不在倒數範圍內（今天到{name}前一天）。
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-3">
          {(
            [
              ["剩餘工作日", before.days, after.days, dDays, "天"],
              ["剩餘工時", before.hours, after.hours, dHours, "小時"],
            ] as const
          ).map(([label, b, a, diff, unit]) => (
            <div key={label} className="flex flex-col gap-1 rounded-2xl bg-white px-4 py-3">
              <dt className="text-sm font-bold text-[#6f685e]">{label}</dt>
              <dd className="flex flex-wrap items-baseline gap-x-2 font-black tabular-nums">
                <span className="text-base text-[#6f685e] line-through decoration-2">{b.toLocaleString()}</span>
                <span aria-hidden>→</span>
                <span className="text-3xl">{a.toLocaleString()}</span>
                <span className="text-sm">{unit}</span>
                {diff !== 0 && (
                  <span className={`text-sm ${diff < 0 ? "text-[#065f46]" : "text-[#9a4424]"}`}>（{sign(diff)}）</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {noChange && (
        <p className="text-[15px] font-bold text-[#6f685e]">
          {sc.kind === "work" ? "那天本來就要上班，所以沒有變化。" : "那天本來就不用上班，所以沒有變化。"}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canApply}
          onClick={() => {
            if (sc.kind) {
              update({ custom: next.custom.sort((a, b) => a.date.localeCompare(b.date)) });
              setDone(`已把 ${fmtMD(d)} ${sc.tag}加進你的學校行事曆。`);
            } else {
              update({ hoursPerDay: next.hoursPerDay });
              setDone(`每日工時已改成 ${next.hoursPerDay} 小時。`);
            }
          }}
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#3d3935] px-5 text-base font-bold text-white hover:bg-[#2a2724] disabled:opacity-40"
        >
          <Icon name="check" className="h-5 w-5" strokeWidth={2.6} />
          {sc.kind ? "加入我的學校行事曆" : `把每日工時改成 ${Math.max(1, s.hoursPerDay - 1)} 小時`}
        </button>
        <span role="status" className="text-[15px] font-bold text-[#065f46]">
          {done}
        </span>
      </div>
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
      <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between gap-2 font-bold text-[#3d3935]">
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
