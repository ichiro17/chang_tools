"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "@/app/components/Icon";
import type { Settings } from "./calendar";
import { type ImportKind, KIND_LABEL, mergeImport, parseCalendarText } from "./importer";

const EXAMPLE = `日期,名稱,類型
2026/10/15,校外教學,事件
2026/10/16,校慶補休,不上班
10/3(六),校慶補課,補課
115/11/2,第一次段考
1/21～1/23,期末補課,補課`;

/** 批次匯入學校行事曆：貼上文字或選 CSV 檔，先預覽、可改類型，確定再加入。 */
export function CalendarImport({ s, update }: { s: Settings; update: (patch: Partial<Settings>) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [kinds, setKinds] = useState<Record<string, ImportKind>>({});
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { rows, errors } = useMemo(() => parseCalendarText(text, s), [text, s]);
  // 預覽裡改過的類型（以日期＋行號記）
  const finalRows = rows.map((r) => ({ ...r, kind: kinds[`${r.line}-${r.date}`] ?? r.kind }));
  const count = (k: ImportKind) => finalRows.filter((r) => r.kind === k).length;

  const setText2 = (t: string) => {
    setText(t);
    setKinds({});
    setMsg("");
  };

  const apply = () => {
    if (finalRows.length === 0) return;
    update(mergeImport(s, finalRows));
    setMsg(
      `已加入 ${finalRows.length} 筆：${count("off")} 天不上班、${count("work")} 天補課、${count("event")} 個倒數事件。`,
    );
    setText("");
    setKinds({});
  };

  if (!open) {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-[#c9c0b1] bg-white px-4 text-base font-bold text-[#3d3935] hover:bg-[#f3eee4]"
        >
          <Icon name="upload" className="h-5 w-5" strokeWidth={2.2} />
          批次匯入（貼上學校行事曆）
        </button>
        {msg && (
          <p role="status" className="text-sm font-bold text-[#065f46]">
            {msg}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-3xl border border-[#e3dccd] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-base font-black">批次匯入</h4>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="收起批次匯入"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-[#6f685e] hover:bg-[#f3eee4]"
        >
          <Icon name="close" className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </button>
      </div>
      <p className="text-sm leading-relaxed text-[#5f594f]">
        一行一筆：<strong>日期、名稱、類型</strong>（類型可不寫）。日期可以寫 2026/10/15、115/10/15、10/15，
        也可以寫區間 1/21～1/23。從 Excel、Google 試算表直接複製貼上也可以。
      </p>
      <details className="rounded-xl bg-[#f6f3ed] px-3 py-2 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-bold">看範例</summary>
        <pre className="overflow-x-auto whitespace-pre-wrap pb-2 font-mono text-[13px] leading-relaxed">{EXAMPLE}</pre>
        <button
          type="button"
          onClick={() => setText2(EXAMPLE)}
          className="mb-2 min-h-11 rounded-xl border border-[#e3dccd] bg-white px-3 font-bold"
        >
          把範例貼進來試試
        </button>
        <p className="pb-1 text-[13px] text-[#6f685e]">
          沒寫類型時：名稱有「補課」算補課，有「放假、補休、停課」算不上班，其他算倒數事件。加入前可以逐筆修改。
        </p>
      </details>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-[#6f685e]">貼上行事曆內容</span>
        <textarea
          value={text}
          onChange={(e) => setText2(e.target.value)}
          rows={6}
          placeholder={"10/16 校慶補休 不上班\n11/2 第一次段考"}
          className="w-full resize-y rounded-2xl border border-[#e3dccd] bg-white p-3 font-mono text-[15px] leading-relaxed outline-none focus:border-[#3f7a94]"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e3dccd] bg-white px-3 text-sm font-bold hover:bg-[#f3eee4]"
        >
          <Icon name="upload" className="h-4 w-4" strokeWidth={2.2} />
          選擇 CSV／文字檔
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          className="hidden"
          aria-label="選擇 CSV 或文字檔"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setText2(await f.text());
            e.target.value = "";
          }}
        />
      </div>

      {errors.length > 0 && (
        <div role="alert" className="rounded-2xl border border-[#f3b7b7] bg-[#fdecec] px-3.5 py-2.5 text-sm text-[#8f1515]">
          <p className="font-bold">有 {errors.length} 行看不懂，會先略過：</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {errors.slice(0, 8).map((er) => (
              <li key={er.line}>
                第 {er.line} 行「{er.text.length > 24 ? `${er.text.slice(0, 24)}…` : er.text}」：{er.reason}
              </li>
            ))}
            {errors.length > 8 && <li>⋯還有 {errors.length - 8} 行</li>}
          </ul>
        </div>
      )}

      {finalRows.length > 0 && (
        <>
          <p className="text-sm font-bold">
            可以加入 {finalRows.length} 筆：{count("off")} 天不上班、{count("work")} 天補課、{count("event")} 個倒數事件
          </p>
          <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
            {finalRows.map((r) => {
              const key = `${r.line}-${r.date}`;
              return (
                <li key={key} className="flex flex-wrap items-center gap-2 rounded-xl bg-[#f6f3ed] px-3 py-1.5">
                  <span className="text-sm font-bold tabular-nums">{r.date.replaceAll("-", "/")}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{r.label}</span>
                  <select
                    aria-label={`${r.date} ${r.label} 的類型`}
                    value={r.kind}
                    onChange={(e) => setKinds({ ...kinds, [key]: e.target.value as ImportKind })}
                    className="min-h-11 rounded-lg border border-[#e3dccd] bg-white px-2 text-sm font-bold"
                  >
                    {(Object.keys(KIND_LABEL) as ImportKind[]).map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={apply}
            className="min-h-12 rounded-2xl bg-[#3d3935] px-5 text-base font-bold text-white hover:bg-[#2a2724]"
          >
            加入這 {finalRows.length} 筆
          </button>
          <p className="text-[13px] text-[#6f685e]">同一天已經有自訂日時，會以匯入的為準；同日同名的事件不會重複加入。</p>
        </>
      )}
      {msg && (
        <p role="status" className="text-sm font-bold text-[#065f46]">
          {msg}
        </p>
      )}
    </div>
  );
}
