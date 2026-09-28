"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/app/components/Icon";
import { PrivacyNote, ToolHeader, btn } from "@/app/components/ToolHeader";
import { Board } from "./Board";
import { SavedSchedules } from "./SavedSchedules";
import {
  type Issue,
  KIND_INFO,
  type Kind,
  type Row,
  TEMPLATES,
  fmtClock,
  hmToSec,
  normalizeHm,
  nowSec,
  secToHm,
  uid,
  useNow,
  useSchedule,
  validate,
  withIds,
} from "./schedule";

const openDisplay = () => window.open("/timer/display", "chang-timer-display");

const inputCls =
  "min-h-11 w-full rounded-[10px] border-[1.5px] bg-white px-3 text-base font-bold text-ink outline-none focus:border-timer";

function TimeInput({
  label,
  value,
  invalid,
  onChange,
}: {
  label: string;
  value: string;
  invalid: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[13px] font-bold text-muted">
      <span className={`sm:sr-only ${invalid ? "text-[#b91c1c]" : ""}`}>{label}</span>
      <input
        value={value}
        inputMode="numeric"
        placeholder="08:10"
        maxLength={5}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(normalizeHm(e.target.value))}
        className={`${inputCls} tabular-nums ${invalid ? "border-2 border-[#b91c1c] bg-[#fff7f7]" : "border-line-strong"}`}
      />
    </label>
  );
}

function RowEditor({
  row,
  kind,
  issue,
  live,
  first,
  last,
  onChange,
  onMove,
  onCopy,
  onRemove,
}: {
  row: Row;
  kind: Kind;
  issue: Issue | undefined;
  live: boolean;
  first: boolean;
  last: boolean;
  onChange: (patch: Partial<Row>) => void;
  onMove: (d: -1 | 1) => void;
  onCopy: () => void;
  onRemove: () => void;
}) {
  const info = KIND_INFO[kind];
  const name = row.label || `這一${kind === "exam" ? "科" : "列"}`;
  const iconBtn = "flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-paper disabled:opacity-30";
  return (
    <li
      className={`flex flex-col gap-2 rounded-[14px] p-3 ${
        live
          ? "border-2 border-timer bg-[#eeedfd]"
          : issue
            ? "border-[1.5px] border-[#f3b7b7] bg-white"
            : "border-[1.5px] border-line bg-white"
      }`}
    >
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[minmax(0,1fr)_112px_112px_auto] sm:items-end">
        <label className="col-span-2 flex flex-col gap-1 text-[13px] font-bold text-muted sm:col-span-1">
          <span className={`flex items-center gap-2 ${issue?.field === "label" ? "text-[#b91c1c]" : ""}`}>
            <span className="sm:sr-only">{info.item}</span>
            {live && (
              <span className="rounded-full bg-timer px-2.5 py-0.5 text-xs font-bold text-white sm:hidden">{info.live}</span>
            )}
          </span>
          <span className="flex items-center gap-2.5">
            <input
              value={row.label}
              placeholder={kind === "exam" ? "例如：國文" : "例如：第四節"}
              aria-invalid={issue?.field === "label" || undefined}
              onChange={(e) => onChange({ label: e.target.value })}
              className={`${inputCls} ${
                issue?.field === "label" ? "border-2 border-[#b91c1c] bg-[#fff7f7]" : "border-line-strong"
              }`}
            />
            {live && (
              <span className="hidden shrink-0 rounded-full bg-timer px-2.5 py-1 text-[13px] font-bold text-white sm:inline">
                {info.live}
              </span>
            )}
          </span>
        </label>
        <TimeInput label="開始" value={row.start} invalid={issue?.field === "start"} onChange={(v) => onChange({ start: v })} />
        <TimeInput label="結束" value={row.end} invalid={issue?.field === "end"} onChange={(v) => onChange({ end: v })} />
        <div className="col-span-2 flex justify-end gap-1 sm:col-span-1">
          <button type="button" aria-label={`把「${name}」往上移`} disabled={first} onClick={() => onMove(-1)} className={iconBtn}>
            <Icon name="chevronUp" className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>
          <button type="button" aria-label={`把「${name}」往下移`} disabled={last} onClick={() => onMove(1)} className={iconBtn}>
            <Icon name="chevronDown" className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>
          <button type="button" aria-label={`複製「${name}」`} onClick={onCopy} className={iconBtn}>
            <Icon name="copy" className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>
          <button type="button" aria-label={`刪除「${name}」`} onClick={onRemove} className={`${iconBtn} text-[#b91c1c]`}>
            <Icon name="trash" className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>
        </div>
      </div>
      {issue && (
        <p className="flex items-center gap-1.5 text-sm font-bold text-[#b91c1c]">
          <Icon name="info" className="h-4 w-4 shrink-0" strokeWidth={2.4} />
          {issue.msg}
        </p>
      )}
    </li>
  );
}

function Editor({
  kind,
  rows,
  setRows,
  applyTemplate,
  now,
}: {
  kind: Kind;
  rows: Row[];
  setRows: (fn: (prev: Row[]) => Row[]) => void;
  applyTemplate: (name: string) => void;
  now: Date;
}) {
  const [showDone, setShowDone] = useState(false);
  const curSec = nowSec(now);
  const info = KIND_INFO[kind];
  const issues = validate(rows, kind);

  const isDone = (r: Row) => {
    const e = hmToSec(r.end);
    return !issues.has(r.id) && e != null && e <= curSec;
  };
  const isLive = (r: Row) => {
    const s = hmToSec(r.start);
    const e = hmToSec(r.end);
    return !issues.has(r.id) && s != null && e != null && curSec >= s && curSec < e;
  };
  const done = rows.filter(isDone);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));
  const move = (id: string, d: -1 | 1) =>
    setRows((prev) => {
      const i = prev.findIndex((r) => r.id === id);
      const j = i + d;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const copy = (id: string) =>
    setRows((prev) => {
      const i = prev.findIndex((r) => r.id === id);
      return i < 0 ? prev : [...prev.slice(0, i + 1), { ...prev[i], id: uid() }, ...prev.slice(i + 1)];
    });

  // 新的一列接在最後一列後面：從上一列的結束時間開始
  const lastRow = rows.at(-1);
  const lastEnd = lastRow ? hmToSec(lastRow.end) : null;
  const add = () => {
    const start = lastEnd ?? 8 * 3600 + 10 * 60;
    const len = kind === "exam" ? 70 * 60 : 45 * 60;
    setRows((prev) => [...prev, { id: uid(), label: "", start: secToHm(start), end: secToHm(start + len) }]);
  };

  return (
    <section className="flex flex-col gap-4 rounded-[20px] border-[1.5px] border-line bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">{info.title}</h2>
        <label className="flex items-center">
          <span className="sr-only">套用課表範例</span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) applyTemplate(e.target.value);
            }}
            className="min-h-11 rounded-xl border-[1.5px] border-line-strong bg-white pl-3.5 pr-9 text-[15px] font-bold text-ink"
          >
            <option value="">套用課表範例…</option>
            {TEMPLATES.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}（{KIND_INFO[t.kind].name}）
              </option>
            ))}
          </select>
        </label>
      </div>

      {issues.size > 0 && (
        <div role="alert" className="flex items-center gap-2.5 rounded-xl border-[1.5px] border-[#f3b7b7] bg-[#fdecec] px-4 py-3 text-[15px] font-bold text-[#8f1515]">
          <Icon name="alert" className="h-5 w-5 shrink-0 text-[#b91c1c]" strokeWidth={2.2} />
          有 {issues.size} 個問題需要修正，投影畫面會先略過這些項目。
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-xl bg-paper px-4 py-8 text-center text-[15px] text-muted">
          還沒有安排。按「新增一列」，或從右上角套用課表範例。
        </p>
      ) : (
        <>
          <div aria-hidden className="hidden grid-cols-[minmax(0,1fr)_112px_112px_188px] gap-2.5 px-3 text-[13px] font-bold text-muted sm:grid">
            <span>{info.item}</span>
            <span>開始</span>
            <span>結束</span>
            <span className="text-right">調整</span>
          </div>

          {done.length > 0 && (
            <button
              type="button"
              aria-expanded={showDone}
              onClick={() => setShowDone((v) => !v)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-line-strong bg-[#faf8f4] px-3 text-sm font-bold text-muted"
            >
              <Icon name={showDone ? "chevronUp" : "chevronDown"} className="h-4 w-4" strokeWidth={2.4} />
              {showDone
                ? `收合已${kind === "exam" ? "考完" : "結束"}的 ${done.length} 項`
                : `已${kind === "exam" ? "考完" : "結束"} ${done.length} 項（${done.map((r) => r.label).join("、")}）· 展開`}
            </button>
          )}

          <ol className="flex flex-col gap-2.5">
            {rows.map((r, i) =>
              !showDone && isDone(r) ? null : (
                <RowEditor
                  key={r.id}
                  row={r}
                  kind={kind}
                  issue={issues.get(r.id)}
                  live={isLive(r)}
                  first={i === 0}
                  last={i === rows.length - 1}
                  onChange={(patch) => update(r.id, patch)}
                  onMove={(d) => move(r.id, d)}
                  onCopy={() => copy(r.id)}
                  onRemove={() => remove(r.id)}
                />
              ),
            )}
          </ol>
        </>
      )}

      <button
        type="button"
        onClick={add}
        className={`${btn.base} min-h-[52px] border-[1.5px] border-timer bg-white text-base text-timer hover:bg-timer-tint`}
      >
        <Icon name="plus" className="h-[18px] w-[18px]" strokeWidth={2.4} />
        新增一列
        {lastRow && lastEnd != null && (
          <span className="hidden font-medium sm:inline">
            （接在「{lastRow.label || "最後一列"}」之後，{secToHm(lastEnd)} 開始）
          </span>
        )}
      </button>
      <p className="text-[13px] text-muted">時間一律使用 24 小時制，例如 08:10。可以用上移、下移按鈕調整順序。</p>
    </section>
  );
}

export default function TimerPage() {
  const now = useNow();
  const { ready, mode, showSec, classRows, examRows, setMode, setShowSec, setRows } = useSchedule();
  const rows = mode === "exam" ? examRows : classRows;

  const applyTemplate = (name: string) => {
    const t = TEMPLATES.find((x) => x.name === name);
    if (!t) return;
    const current = t.kind === "exam" ? examRows : classRows;
    if (current.length > 0 && !window.confirm(`套用「${t.name}」會取代目前的 ${current.length} 列，確定嗎？`)) return;
    setRows(t.kind, () => withIds(t.rows));
    setMode(t.kind);
  };

  // 分頁標題顯示現在時間
  useEffect(() => {
    const prev = document.title;
    document.title = ready ? `${fmtClock(now, false)} · 課堂時鐘` : "課堂時鐘";
    return () => {
      document.title = prev;
    };
  }, [now, ready]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <ToolHeader
        tool="timer"
        actions={
          <button type="button" onClick={openDisplay} className={`${btn.base} ${btn.dark}`}>
            <Icon name="maximize" className="h-[18px] w-[18px]" strokeWidth={2.2} />
            <span className="hidden sm:inline">開啟投影畫面</span>
            <span className="sm:hidden">投影</span>
          </button>
        }
      />

      <main className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-6 sm:px-6 sm:py-7 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-line bg-white p-4 sm:p-5">
            <h2 className="text-[17px] font-black">模式</h2>
            <div role="radiogroup" aria-label="模式" className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
              {(["class", "exam"] as const).map((k) => {
                const on = mode === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setMode(k)}
                    className={`flex flex-col gap-0.5 rounded-[14px] px-4 py-3 text-left ${
                      on ? "border-[2.5px] border-timer bg-[#eeedfd]" : "border-[1.5px] border-line-strong bg-white hover:bg-paper"
                    }`}
                  >
                    <span className="flex items-center justify-between text-[17px] font-black">
                      {KIND_INFO[k].name}
                      {on && <Icon name="check" className="h-5 w-5 text-timer" strokeWidth={3} />}
                    </span>
                    <span className="text-sm text-muted">{KIND_INFO[k].desc}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-3.5 rounded-[20px] border-[1.5px] border-line bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-black">投影預覽</h2>
              <span className="text-[13px] text-muted">學生看到的畫面</span>
            </div>
            <div className="aspect-video overflow-hidden rounded-[14px]">
              <Board now={now} mounted={ready} rows={rows} kind={mode} showSec={showSec} />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center justify-between text-[15px] font-bold">
              顯示秒數
              <input
                type="checkbox"
                checked={showSec}
                onChange={(e) => setShowSec(e.target.checked)}
                className="h-[22px] w-[22px] accent-timer"
              />
            </label>
            <button type="button" onClick={openDisplay} className={`${btn.base} min-h-[52px] bg-timer text-base font-black text-white hover:brightness-110`}>
              <Icon name="maximize" className="h-5 w-5" strokeWidth={2.2} />
              在新分頁開啟投影畫面
            </button>
            <p className="text-[13px] leading-relaxed text-muted">
              把投影分頁拖到投影幕，按 <kbd className="rounded-[5px] border border-line-strong px-1.5 font-bold">F</kbd>{" "}
              全螢幕。這裡改的課表會自動同步過去。
            </p>
          </section>

          <SavedSchedules
            kind={mode}
            rows={rows}
            load={(k, r) => {
              setRows(k, () => r);
              setMode(k);
            }}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Editor kind={mode} rows={rows} setRows={(fn) => setRows(mode, fn)} applyTemplate={applyTemplate} now={now} />
          <PrivacyNote>課表只會儲存在這台裝置的瀏覽器，不會上傳到雲端。</PrivacyNote>
        </div>
      </main>
    </div>
  );
}
