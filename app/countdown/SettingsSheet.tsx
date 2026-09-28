"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Icon } from "@/app/components/Icon";
import { type CustomDay, DATA_INFO, DEFAULT_SETTINGS, type Settings, parseYmd } from "./calendar";
import { TargetToggle } from "./ui";

export type SheetSection = "calendar" | "events" | "quotes";

const inputCls =
  "min-h-12 w-full rounded-2xl border border-[#e3dccd] bg-white px-4 text-base text-[#3d3935] outline-none transition focus:border-[#3f7a94] focus:ring-2 focus:ring-[#3f7a94]/20";
const addBtn =
  "min-h-12 shrink-0 rounded-2xl bg-[#3d3935] px-5 text-base font-bold text-white transition hover:bg-[#2a2724] disabled:opacity-40";

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-4 text-base font-bold text-[#3d3935]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-6 w-6 shrink-0 accent-[#3f7a94]"
      />
      {children}
    </label>
  );
}

function SectionTitle({ id, title, desc, count }: { id?: string; title: string; desc?: string; count?: string }) {
  return (
    <div id={id} className="mt-9 flex scroll-mt-24 items-start justify-between gap-3">
      <div>
        <h3 className="text-xl font-black">{title}</h3>
        {desc && <p className="mt-1 text-sm font-semibold text-[#6f685e]">{desc}</p>}
      </div>
      {count && (
        <span className="shrink-0 rounded-full bg-[#fbe9df] px-3 py-1 text-sm font-bold text-[#b4532f]">{count}</span>
      )}
    </div>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#8c857a] hover:bg-[#f3eee4] hover:text-[#b4532f]"
    >
      <Icon name="close" className="h-[18px] w-[18px]" strokeWidth={2.2} />
    </button>
  );
}

const byDate = <T extends { date: string }>(xs: T[]) => [...xs].sort((a, b) => a.date.localeCompare(b.date));

/** 教師手帳設定：學期日期、工作日規則、學校行事曆、倒數事件、生存語錄。手機上全螢幕，標題與「完成」固定在上下。 */
export function SettingsSheet({
  s,
  update,
  onClose,
  focus,
}: {
  s: Settings;
  update: (patch: Partial<Settings>) => void;
  onClose: () => void;
  focus?: SheetSection;
}) {
  const [day, setDay] = useState<CustomDay>({ date: "", label: "", kind: "off" });
  const [ev, setEv] = useState({ date: "", label: "" });
  const [quote, setQuote] = useState("");
  const [hoursText, setHoursText] = useState(String(s.hoursPerDay));
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // 從別的區塊點「新增」進來時，直接捲到那一段
  useEffect(() => {
    if (focus) document.getElementById(`sheet-${focus}`)?.scrollIntoView({ block: "start" });
    else closeRef.current?.focus();
  }, [focus]);

  const addDay = () => {
    if (!parseYmd(day.date)) return;
    update({ custom: byDate([...s.custom.filter((c) => c.date !== day.date), { ...day, label: day.label.trim() }]) });
    setDay({ date: "", label: "", kind: day.kind });
  };
  const addEvent = () => {
    if (!parseYmd(ev.date) || !ev.label.trim()) return;
    update({ events: byDate([...s.events, { date: ev.date, label: ev.label.trim() }]) });
    setEv({ date: "", label: "" });
  };
  const addQuote = () => {
    if (!quote.trim()) return;
    update({ quotes: [...s.quotes, quote.trim()] });
    setQuote("");
  };

  const dateField = (key: "semesterStart" | "winterStart" | "springStart" | "summerStart", label: string) => (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-bold text-[#6f685e]">{label}</span>
      <input type="date" value={s[key]} onChange={(e) => update({ [key]: e.target.value })} className={inputCls} />
    </label>
  );

  const offCount = s.custom.filter((c) => c.kind !== "work").length;
  const workCount = s.custom.length - offCount;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button
        type="button"
        aria-label="關閉設定"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-[#3d3935]/30 backdrop-blur-[2px]"
      />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-[#fffdf8] text-[#3d3935] shadow-2xl sm:rounded-l-[2rem]">
        <div className="flex items-center justify-between gap-4 border-b border-dashed border-[#e3dccd] px-5 py-4 sm:px-7 sm:pt-6">
          <div>
            <p className="text-sm font-bold tracking-widest text-[#b4532f]">教師手帳設定</p>
            <h2 id="sheet-title" className="mt-0.5 text-2xl font-black sm:text-3xl">
              調整你的逃生路線
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#ebe4d6] bg-white shadow-sm transition hover:bg-[#f3eee4]"
          >
            <Icon name="close" className="h-6 w-6" strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8 sm:px-7">
          <SectionTitle title="倒數目標" />
          <div className="mt-3">
            <TargetToggle value={s.target} onChange={(t) => update({ target: t })} compact />
          </div>

          <SectionTitle
            title="我的學期日期"
            desc={`官方預設來自 ${DATA_INFO.year}；學校行事曆若有調整，可以在這裡修改。`}
          />
          <div className="mt-4 grid grid-cols-1 gap-4 min-[400px]:grid-cols-2">
            {dateField("semesterStart", "開學日")}
            {dateField("winterStart", "寒假開始")}
            {dateField("springStart", "下學期開學")}
            {dateField("summerStart", "暑假開始")}
          </div>

          <SectionTitle title="工作日計算" />
          <div className="mt-2 flex flex-col">
            <Toggle checked={s.excludeSat} onChange={(v) => update({ excludeSat: v })}>
              扣除星期六
            </Toggle>
            <Toggle checked={s.excludeSun} onChange={(v) => update({ excludeSun: v })}>
              扣除星期日
            </Toggle>
            <Toggle checked={s.excludeHolidays} onChange={(v) => update({ excludeHolidays: v })}>
              扣除國定假日與補假
            </Toggle>
            <Toggle checked={s.excludeWinter} onChange={(v) => update({ excludeWinter: v })}>
              暑假模式排除寒假
            </Toggle>
          </div>
          <label className="mt-4 flex flex-col gap-2">
            <span className="text-sm font-bold text-[#6f685e]">每日工時（1–12 小時）</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={12}
              value={hoursText}
              onChange={(e) => {
                setHoursText(e.target.value);
                const n = Math.round(Number(e.target.value));
                if (n >= 1 && n <= 12) update({ hoursPerDay: n });
              }}
              onBlur={() => setHoursText(String(s.hoursPerDay))}
              className={`${inputCls} sm:w-1/2`}
            />
          </label>

          <SectionTitle
            id="sheet-calendar"
            title="我的學校行事曆"
            desc="校慶補休、研習日等不上班的日子，或週末的補課日。"
            count={`${offCount} 天放假${workCount ? ` · ${workCount} 天補課` : ""}`}
          />
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              addDay();
            }}
          >
            <div role="radiogroup" aria-label="這一天" className="grid grid-cols-2 gap-1 rounded-2xl bg-[#f1ece2] p-1">
              {(
                [
                  ["off", "不上班"],
                  ["work", "補課（要上班）"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={day.kind === k}
                  onClick={() => setDay({ ...day, kind: k })}
                  className={`min-h-11 rounded-xl text-[15px] font-bold ${
                    day.kind === k ? "bg-white text-[#3d3935] shadow-sm" : "text-[#6f685e]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 min-[480px]:flex-row">
              <input
                type="date"
                value={day.date}
                onChange={(e) => setDay({ ...day, date: e.target.value })}
                aria-label="日期"
                className={`${inputCls} min-[480px]:w-44 min-[480px]:shrink-0`}
              />
              <input
                type="text"
                value={day.label}
                onChange={(e) => setDay({ ...day, label: e.target.value })}
                aria-label="名稱（可不填）"
                placeholder={day.kind === "work" ? "例如：校慶補課" : "例如：校慶補休（可不填）"}
                className={`${inputCls} min-w-0 flex-1`}
              />
            </div>
            <button type="submit" disabled={!parseYmd(day.date)} className={addBtn}>
              ＋ 新增到行事曆
            </button>
          </form>
          {s.custom.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-[#6f685e]">目前沒有自訂的日子。</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {s.custom.map((c) => (
                <li key={c.date} className="flex items-center gap-3 rounded-2xl border border-[#ebe4d6] bg-white py-1 pl-4 pr-1">
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      c.kind === "work" ? "bg-[#e7eef3] text-[#2f5d73]" : "bg-[#fbe9df] text-[#9a4424]"
                    }`}
                  >
                    {c.kind === "work" ? "補課" : "放假"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    <span className="tabular-nums">{c.date.replaceAll("-", "/")}</span>
                    <span className="ml-2 font-semibold text-[#6f685e]">
                      {c.label || (c.kind === "work" ? "補課日" : "我的快樂假日")}
                    </span>
                  </span>
                  <RemoveButton
                    label={`刪除 ${c.date}`}
                    onClick={() => update({ custom: s.custom.filter((x) => x.date !== c.date) })}
                  />
                </li>
              ))}
            </ul>
          )}

          <SectionTitle
            id="sheet-events"
            title="我的倒數事件"
            desc="段考、校慶、發薪日⋯⋯會出現在「接下來的小目標」，過了會變成徽章。"
            count={`${s.events.length} 個`}
          />
          <form
            className="mt-4 flex flex-col gap-3 min-[480px]:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              addEvent();
            }}
          >
            <input
              type="date"
              value={ev.date}
              onChange={(e) => setEv({ ...ev, date: e.target.value })}
              aria-label="事件日期"
              className={`${inputCls} min-[480px]:w-44 min-[480px]:shrink-0`}
            />
            <input
              type="text"
              value={ev.label}
              onChange={(e) => setEv({ ...ev, label: e.target.value })}
              aria-label="事件名稱"
              placeholder="例如：第一次段考"
              className={`${inputCls} min-w-0 flex-1`}
            />
            <button type="submit" disabled={!parseYmd(ev.date) || !ev.label.trim()} className={addBtn}>
              ＋ 新增
            </button>
          </form>
          {s.events.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {s.events.map((e, i) => (
                <li
                  key={`${e.date}-${e.label}-${i}`}
                  className="flex items-center gap-3 rounded-2xl border border-[#ebe4d6] bg-white py-1 pl-4 pr-1"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    <span className="tabular-nums">{e.date.replaceAll("-", "/")}</span>
                    <span className="ml-2 font-semibold text-[#6f685e]">{e.label}</span>
                  </span>
                  <RemoveButton label={`刪除 ${e.label}`} onClick={() => update({ events: s.events.filter((_, j) => j !== i) })} />
                </li>
              ))}
            </ul>
          )}

          <SectionTitle
            id="sheet-quotes"
            title="我的生存語錄"
            desc="會和內建的語錄一起每天輪流出現。"
            count={`${s.quotes.length} 句`}
          />
          <form
            className="mt-4 flex flex-col gap-3 min-[480px]:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              addQuote();
            }}
          >
            <input
              type="text"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              aria-label="新的語錄"
              placeholder="例如：下課鐘是世界上最好聽的聲音。"
              className={`${inputCls} min-w-0 flex-1`}
            />
            <button type="submit" disabled={!quote.trim()} className={addBtn}>
              ＋ 新增
            </button>
          </form>
          {s.quotes.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {s.quotes.map((q, i) => (
                <li key={`${q}-${i}`} className="flex items-center gap-3 rounded-2xl border border-[#ebe4d6] bg-white py-1 pl-4 pr-1">
                  <span className="min-w-0 flex-1 text-sm font-semibold">{q}</span>
                  <RemoveButton label={`刪除語錄：${q}`} onClick={() => update({ quotes: s.quotes.filter((_, j) => j !== i) })} />
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`要把所有設定恢復成 ${DATA_INFO.year}官方預設嗎？自訂的行事曆、倒數事件與語錄也會清空。`)) return;
              update(DEFAULT_SETTINGS);
              setHoursText(String(DEFAULT_SETTINGS.hoursPerDay));
            }}
            className="mt-10 min-h-12 w-full rounded-2xl border border-[#f1cdb9] bg-[#fdf1ea] px-4 text-lg font-bold text-[#9a4424] transition hover:bg-[#fbe6da]"
          >
            ↺ 恢復 {DATA_INFO.year}官方預設
          </button>
          <p className="mt-5 text-center text-sm font-semibold text-[#6f685e]">設定只會儲存在這台裝置的瀏覽器，不會上傳到雲端。</p>
        </div>

        <div className="border-t border-[#e3dccd] bg-[#fffdf8] px-5 py-3 sm:hidden">
          <button type="button" onClick={onClose} className="min-h-12 w-full rounded-2xl bg-[#3d3935] text-lg font-bold text-white">
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
