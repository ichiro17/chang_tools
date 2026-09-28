"use client";

import { useRef, useState } from "react";
import { Icon } from "@/app/components/Icon";
import { btn } from "@/app/components/ToolHeader";
import {
  KIND_INFO,
  type Kind,
  type Row,
  downloadSchedule,
  parseScheduleFile,
  uid,
  useSavedSchedules,
} from "./schedule";

/**
 * 我的課表：把目前的課表存成好幾組、隨時載入，
 * 也可以匯出成檔案，換電腦或換教室時再匯入。
 */
export function SavedSchedules({
  kind,
  rows,
  load,
}: {
  kind: Kind;
  rows: Row[];
  /** 載入一份課表（會切換到它的模式並取代目前的課表） */
  load: (kind: Kind, rows: Row[]) => void;
}) {
  const { saved, save, remove } = useSavedSchedules();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const confirmReplace = (target: Kind, label: string) =>
    rows.length === 0 || kind !== target || window.confirm(`載入「${label}」會取代目前的課表，確定嗎？`);

  const onSave = () => {
    const n = name.trim();
    if (!n || rows.length === 0) return;
    const updated = save(n, kind, rows);
    setMsg({ text: updated ? `已更新「${n}」。` : `已儲存「${n}」。` });
    setName("");
  };

  const onImport = async (file: File) => {
    const result = parseScheduleFile(await file.text());
    if ("error" in result) {
      setMsg({ text: result.error, error: true });
      return;
    }
    const label = result.name || file.name;
    if (!confirmReplace(result.kind, label)) return;
    load(result.kind, result.rows);
    setMsg({ text: `已匯入「${label}」（${KIND_INFO[result.kind].name}，${result.rows.length} 項）。` });
  };

  return (
    <section className="flex flex-col gap-3.5 rounded-[20px] border-[1.5px] border-line bg-white p-4 sm:p-5">
      <h2 className="text-[17px] font-black">我的課表</h2>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <label htmlFor="save-name" className="text-[13px] font-bold text-muted">
          把目前的{KIND_INFO[kind].name}存起來
        </label>
        <div className="flex gap-2">
          <input
            id="save-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === "exam" ? "例如：段考第一天" : "例如：五年級自然課"}
            className="min-h-11 min-w-0 flex-1 rounded-xl border-[1.5px] border-line-strong bg-white px-3 text-[15px] outline-none focus:border-timer"
          />
          <button type="submit" disabled={!name.trim() || rows.length === 0} className={`${btn.base} ${btn.dark}`}>
            儲存
          </button>
        </div>
      </form>

      {saved.length === 0 ? (
        <p className="rounded-xl bg-paper px-3.5 py-3 text-sm text-muted">還沒有存過課表。存起來之後，換一天、換一班都能一鍵載入。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {saved.map((x) => (
            <li key={x.id} className="flex items-center gap-2 rounded-xl bg-paper py-1.5 pl-3.5 pr-1.5">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-black">{x.name}</span>
                <span className="text-xs font-bold text-muted">
                  {KIND_INFO[x.kind].name} · {x.rows.length} 項
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!confirmReplace(x.kind, x.name)) return;
                  load(x.kind, x.rows.map((r) => ({ ...r, id: uid() })));
                  setMsg({ text: `已載入「${x.name}」。` });
                }}
                className={`${btn.base} ${btn.secondary} px-3 text-sm`}
              >
                載入
              </button>
              <button
                type="button"
                aria-label={`匯出「${x.name}」`}
                onClick={() => downloadSchedule(x.name, x.kind, x.rows)}
                className="flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-white"
              >
                <Icon name="download" className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                aria-label={`刪除「${x.name}」`}
                onClick={() => {
                  if (window.confirm(`要刪除「${x.name}」嗎？`)) remove(x.id);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[#b91c1c] hover:bg-white"
              >
                <Icon name="trash" className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={rows.length === 0}
          onClick={() => downloadSchedule("", kind, rows)}
          className={`${btn.base} ${btn.secondary} text-sm`}
        >
          <Icon name="download" className="h-4 w-4" strokeWidth={2.2} />
          匯出目前課表
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={`${btn.base} ${btn.secondary} text-sm`}>
          <Icon name="upload" className="h-4 w-4" strokeWidth={2.2} />
          匯入課表檔案
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="選擇課表檔案"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = "";
          }}
        />
      </div>

      <p
        role="status"
        className={`min-h-5 text-[13px] font-bold ${msg?.error ? "text-[#b91c1c]" : "text-[#065f46]"}`}
      >
        {msg?.text}
      </p>
      <p className="-mt-2 text-[13px] leading-relaxed text-muted">匯出的檔案可以用 LINE、雲端硬碟帶到另一台電腦，再按「匯入」。</p>
    </section>
  );
}
