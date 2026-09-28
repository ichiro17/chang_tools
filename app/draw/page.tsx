"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon, PlayIcon } from "@/app/components/Icon";
import { PrivacyNote, ToolHeader, btn } from "@/app/components/ToolHeader";
import { type Entry, Wheel } from "./Wheel";

type Winner = Entry & { seq: number };
type Snapshot = { text: string; drawn: string[]; winners: Winner[] };

const SPIN_MS = 4200;
const EXTRA_SPINS = 5;
const UNDO_SECS = 5;
const LS_ROSTER = "chang-tools:draw:roster";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseNames(text: string): string[] {
  return text
    .split(/[\n,，、；;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 同名的人用出現順序區分（王小明#1、王小明#2），改名單時其他人的抽籤狀態不受影響。 */
function toEntries(names: string[]): Entry[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    return { key: `${name}#${n}`, name };
  });
}

function findDuplicates(names: string[]) {
  const count = new Map<string, number>();
  for (const n of names) count.set(n, (count.get(n) ?? 0) + 1);
  return {
    dupNames: [...count].filter(([, c]) => c > 1).map(([n]) => n),
    extra: names.length - count.size,
  };
}

function shuffled<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 焦點在輸入框或按鈕上時，空白鍵交給它自己處理 */
function isInteractive(el: EventTarget | null) {
  return el instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(el.tagName);
}

const STEPS = ["貼上名單", "設定抽法", "開始抽籤"];

function Steps({ current }: { current: number }) {
  return (
    <ol aria-label="抽籤步驟" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px] font-bold sm:text-base">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const now = n === current;
        return (
          <li key={label} className="flex items-center gap-3" aria-current={now ? "step" : undefined}>
            {i > 0 && <span aria-hidden className={`h-0.5 w-6 sm:w-12 ${n <= current ? "bg-draw" : "bg-[#d8d0c2]"}`} />}
            <span className={`flex items-center gap-2.5 ${n > current ? "text-muted" : "text-ink"}`}>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full tabular-nums ${
                  done
                    ? "bg-draw text-white"
                    : now
                      ? "border-[2.5px] border-draw text-draw"
                      : "border-2 border-[#b5ad9f]"
                }`}
              >
                {done ? <Icon name="check" className="h-4 w-4" strokeWidth={3} /> : n}
              </span>
              {label}
              {done && <span className="sr-only">（已完成）</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function DrawPage() {
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [drawn, setDrawn] = useState<string[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [drawCount, setDrawCount] = useState(1);
  const [autoRemove, setAutoRemove] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [noAnim, setNoAnim] = useState(false);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [result, setResult] = useState<Entry[] | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);
  const [keptDupes, setKeptDupes] = useState("");
  const [undo, setUndo] = useState<(Snapshot & { left: number }) | null>(null);
  const [projecting, setProjecting] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const drawRef = useRef<() => void>(() => {});
  const againRef = useRef<HTMLButtonElement>(null);

  // 名單存在本機，下次打開還在
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(localStorage.getItem(LS_ROSTER) ?? "");
    } catch {
      /* 儲存空間不可用時略過 */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(LS_ROSTER, text);
    } catch {
      /* 儲存空間不可用時略過 */
    }
  }, [text, ready]);

  const names = useMemo(() => parseNames(text), [text]);
  const roster = useMemo(() => toEntries(names), [names]);
  const pool = useMemo(() => {
    const left = roster.filter((e) => !drawn.includes(e.key));
    if (!order) return left;
    const rank = new Map(order.map((k, i) => [k, i]));
    return [...left].sort((a, b) => (rank.get(a.key) ?? order.length) - (rank.get(b.key) ?? order.length));
  }, [roster, drawn, order]);

  const { dupNames, extra } = useMemo(() => findDuplicates(names), [names]);
  const showDupes = dupNames.length > 0 && keptDupes !== dupNames.join("、");
  const count = Math.max(1, Math.min(drawCount, pool.length));
  const step = roster.length === 0 ? 1 : winners.length === 0 ? 2 : 3;
  const lastSeq = winners.at(-1)?.seq ?? 0;

  const resetWheel = useCallback((toZero: boolean) => {
    setNoAnim(true);
    if (toZero) {
      rotationRef.current = 0;
      setRotation(0);
    }
    setHighlightKey(null);
    requestAnimationFrame(() => requestAnimationFrame(() => setNoAnim(false)));
  }, []);

  async function handleDraw() {
    if (spinning || pool.length === 0) return;
    const n = Math.min(count, pool.length);
    setResult(null);
    setSpinning(true);
    setHighlightKey(null);

    // 一次抽多位時，同一次之內不會重複抽到同一人
    const available = [...pool];
    const picked: Entry[] = [];
    const seg = 360 / pool.length;
    let current = rotationRef.current;

    for (let i = 0; i < n; i++) {
      const k = Math.floor(Math.random() * available.length);
      const person = available[k];
      available.splice(k, 1);
      picked.push(person);

      const idx = pool.findIndex((p) => p.key === person.key);
      const center = idx * seg + seg / 2;
      const jitter = (Math.random() - 0.5) * seg * 0.34;
      const targetMod = ((-(center + jitter) % 360) + 360) % 360;
      const delta = (((targetMod - (current % 360)) % 360) + 360) % 360;
      current = current + 360 * EXTRA_SPINS + delta;

      setHighlightKey(null);
      rotationRef.current = current;
      setRotation(current);
      await sleep(SPIN_MS + 250);
      setHighlightKey(person.key);
      // 停在中獎者身上停留一下，再跳出大字結果
      await sleep(i === n - 1 ? 700 : 900);
    }

    setWinners((prev) => [...prev, ...picked.map((p, i) => ({ ...p, seq: prev.length + i + 1 }))]);
    if (autoRemove) setDrawn((prev) => [...prev, ...picked.map((p) => p.key)]);
    setResult(picked);
    setSpinning(false);
  }

  useEffect(() => {
    drawRef.current = () => void handleDraw();
  });

  const returnWinners = (ws: Winner[]) => {
    const seqs = new Set(ws.map((w) => w.seq));
    const keys = new Set(ws.map((w) => w.key));
    setWinners((prev) => prev.filter((w) => !seqs.has(w.seq)));
    setDrawn((prev) => prev.filter((k) => !keys.has(k)));
    resetWheel(false);
  };

  const newRound = () => {
    setDrawn([]);
    setWinners([]);
    setResult(null);
    resetWheel(true);
  };

  const clearList = () => {
    setUndo({ text, drawn, winners, left: UNDO_SECS });
    setText("");
    setDrawn([]);
    setWinners([]);
    setResult(null);
    setOrder(null);
    resetWheel(true);
  };

  const restore = () => {
    if (!undo) return;
    setText(undo.text);
    setDrawn(undo.drawn);
    setWinners(undo.winners);
    setUndo(null);
  };

  // 「已清空」提示倒數 5 秒後消失
  const undoOpen = undo != null;
  useEffect(() => {
    if (!undoOpen) return;
    const id = window.setInterval(
      () => setUndo((u) => (u == null ? null : u.left <= 1 ? null : { ...u, left: u.left - 1 })),
      1000,
    );
    return () => window.clearInterval(id);
  }, [undoOpen]);

  // 結果跳出時，焦點移到「再抽」按鈕
  useEffect(() => {
    if (result) againRef.current?.focus();
  }, [result]);

  const startProjection = () => {
    setProjecting(true);
    wrapRef.current?.requestFullscreen?.().catch(() => {});
  };
  const stopProjection = useCallback(() => {
    setProjecting(false);
    if (document.fullscreenElement) void document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    const h = () => {
      if (!document.fullscreenElement) setProjecting(false);
    };
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // 快捷鍵：空白鍵抽籤、Esc 關閉結果或離開投影
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isInteractive(e.target)) {
        e.preventDefault();
        drawRef.current();
      } else if (e.key === "Escape") {
        if (result) setResult(null);
        else if (projecting && !document.fullscreenElement) stopProjection();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [result, projecting, stopProjection]);

  const drawLabel = spinning
    ? "轉盤轉動中…"
    : roster.length === 0
      ? "請先輸入名單"
      : pool.length === 0
        ? "本輪已完成"
        : `開始抽籤（抽 ${count} 位）`;

  const drawButton = (big?: boolean) => (
    <button
      type="button"
      onClick={() => void handleDraw()}
      disabled={spinning || pool.length === 0}
      className={`flex w-full items-center justify-center gap-2.5 rounded-[18px] font-black transition active:scale-[0.99] disabled:cursor-not-allowed ${
        big ? "min-h-[76px] text-2xl" : "min-h-16 text-xl"
      } ${spinning || pool.length === 0 ? "bg-[#e8e2d7] text-muted" : "bg-draw text-white hover:brightness-110"}`}
    >
      {!spinning && pool.length > 0 && <PlayIcon className="h-6 w-6" />}
      {drawLabel}
    </button>
  );

  const wheel = (
    <Wheel
      pool={pool}
      rotation={rotation}
      noAnim={noAnim}
      spinMs={SPIN_MS}
      highlightKey={highlightKey}
      emptyText={roster.length === 0 ? "請先輸入名單" : "本輪已完成"}
    />
  );

  return (
    <div
      ref={wrapRef}
      className={projecting ? "fixed inset-0 z-50 overflow-auto bg-[#1a1816] text-white" : "min-h-screen bg-paper text-ink"}
    >
      {projecting ? (
        <div className="relative flex min-h-full flex-col items-center justify-center gap-6 px-6 py-20">
          <div className="absolute left-6 top-5 flex items-center gap-2.5 text-lg font-bold text-[#ece7df]">
            <Icon name="wheel" className="h-6 w-6 text-[#f9c9d3]" />
            抽籤轉盤 · 投影畫面
          </div>
          <button
            type="button"
            onClick={stopProjection}
            className="absolute right-5 top-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-[15px] font-bold text-[#ece7df] hover:bg-white/20"
          >
            <Icon name="close" className="h-[18px] w-[18px]" />
            離開投影
          </button>
          <div className="aspect-square w-[min(66vh,86vw)]">{wheel}</div>
          <div className="flex w-full max-w-md flex-col items-center gap-3">
            {drawButton(true)}
            {pool.length > 0 && <p className="text-lg font-bold text-[#ece7df]">本輪剩餘 {pool.length} 位</p>}
            {roster.length > 0 && pool.length === 0 && !spinning && (
              <button type="button" onClick={newRound} className={`${btn.base} min-h-[52px] bg-white px-6 text-lg text-ink`}>
                <Icon name="undo" className="h-5 w-5" strokeWidth={2.2} />
                全部放回，開始新一輪
              </button>
            )}
          </div>
          <div className="absolute bottom-4 right-5 hidden items-center gap-4 rounded-xl bg-white/10 px-4 py-2.5 text-[15px] text-[#ece7df] sm:flex">
            <span>
              <kbd className="rounded-md bg-white/20 px-2 py-0.5 font-bold">Space</kbd> 抽籤
            </span>
            <span>
              <kbd className="rounded-md bg-white/20 px-2 py-0.5 font-bold">Esc</kbd> 離開
            </span>
          </div>
        </div>
      ) : (
        <>
          <ToolHeader
            tool="draw"
            actions={
              <button type="button" onClick={startProjection} className={`${btn.base} ${btn.dark}`}>
                <Icon name="maximize" className="h-[18px] w-[18px]" strokeWidth={2.2} />
                <span className="hidden sm:inline">開啟投影畫面</span>
                <span className="sm:hidden">投影</span>
              </button>
            }
          />

          <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-7">
            <Steps current={step} />

            <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
              {/* 左：步驟 1–3 */}
              <div className="flex flex-col gap-4">
                <section className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-line bg-white p-5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="names" className="text-[17px] font-black">
                      1. 貼上名單
                    </label>
                    {roster.length > 0 && (
                      <span className="rounded-full bg-classroom-tint px-3 py-1 text-sm font-bold text-[#065f46]">
                        已載入 {roster.length} 位
                      </span>
                    )}
                  </div>
                  <textarea
                    id="names"
                    rows={6}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={spinning}
                    placeholder={"小明\n小華\n小美"}
                    aria-describedby="names-help"
                    className="w-full resize-y rounded-xl border-[1.5px] border-line-strong bg-white p-3 text-[15px] leading-relaxed outline-none focus:border-draw disabled:opacity-60"
                  />
                  <p id="names-help" className="text-[13px] text-muted">
                    每行一位，也可以用逗號、頓號分隔。前後空白與空白列會自動略過。
                  </p>
                  {showDupes && (
                    <div role="status" className="flex flex-col gap-2.5 rounded-xl border-[1.5px] border-[#f2d27a] bg-[#fef3c7] p-3.5">
                      <span className="flex items-start gap-2 text-sm font-bold text-[#7a3d06]">
                        <Icon name="alert" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#92400e]" strokeWidth={2.2} />
                        發現 {extra} 筆重複姓名：{dupNames.join("、")}。要合併嗎？
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setText([...new Set(names)].join("\n"))}
                          className={`${btn.base} bg-[#92400e] text-sm text-white hover:brightness-110`}
                        >
                          合併重複
                        </button>
                        <button
                          type="button"
                          onClick={() => setKeptDupes(dupNames.join("、"))}
                          className={`${btn.base} border-[1.5px] border-[#d9b25a] bg-white text-sm text-[#7a3d06]`}
                        >
                          保留（同名不同人）
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={clearList}
                    disabled={!text || spinning}
                    className={`${btn.base} ${btn.secondary} self-start text-sm text-muted`}
                  >
                    <Icon name="trash" className="h-4 w-4" strokeWidth={2.2} />
                    清空名單
                  </button>
                </section>

                <section
                  className={`flex flex-col gap-3.5 rounded-[20px] bg-white p-5 ${
                    step === 2 ? "border-2 border-draw" : "border-[1.5px] border-line"
                  }`}
                >
                  <h2 className="text-[17px] font-black">2. 設定抽法</h2>
                  <div className="flex items-center justify-between gap-3">
                    <span id="count-label" className="text-[15px] font-bold">
                      一次抽出
                    </span>
                    <div role="group" aria-labelledby="count-label" className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="少抽一位"
                        onClick={() => setDrawCount(Math.max(1, count - 1))}
                        disabled={count <= 1 || spinning}
                        className={`${btn.base} ${btn.secondary} w-11 px-0 text-xl`}
                      >
                        −
                      </button>
                      <span aria-live="polite" className="w-12 text-center text-2xl font-extrabold tabular-nums">
                        {count}
                      </span>
                      <button
                        type="button"
                        aria-label="多抽一位"
                        onClick={() => setDrawCount(count + 1)}
                        disabled={count >= pool.length || spinning}
                        className={`${btn.base} ${btn.secondary} w-11 px-0 text-xl`}
                      >
                        ＋
                      </button>
                      <span className="text-[15px] text-muted">位</span>
                    </div>
                  </div>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] font-bold">
                    <input
                      type="checkbox"
                      checked={autoRemove}
                      onChange={(e) => setAutoRemove(e.target.checked)}
                      className="h-[22px] w-[22px] accent-draw"
                    />
                    抽中後自動移除（本輪不重複）
                  </label>
                  <p className="text-[13px] leading-relaxed text-muted">
                    每位名單成員機率相同。
                    {pool.length === 1 && " 目前只剩 1 位。"}
                  </p>
                </section>

                <section className="flex flex-col gap-2">
                  {drawButton()}
                  {roster.length > 0 && pool.length > 0 && (
                    <p className="text-center text-sm text-muted">
                      本輪剩餘 <strong className="text-ink">{pool.length}</strong> 位 · 也可以按空白鍵
                    </p>
                  )}
                  {roster.length > 0 && pool.length === 0 && !spinning && (
                    <div className="flex flex-col items-center gap-3 rounded-2xl bg-classroom-tint p-4 text-center">
                      <span className="flex items-center gap-2 text-lg font-black text-[#065f46]">
                        <Icon name="checkCircle" className="h-6 w-6" strokeWidth={2.4} />
                        本輪已完成，{roster.length} 位都抽過了
                      </span>
                      <button type="button" onClick={newRound} className={`${btn.base} bg-draw text-white hover:brightness-110`}>
                        全部放回，開始新一輪
                      </button>
                    </div>
                  )}
                </section>
              </div>

              {/* 右：轉盤＋紀錄 */}
              <div className="flex flex-col gap-6">
                <section aria-label="轉盤" className="flex flex-col items-center gap-4 rounded-[20px] border-[1.5px] border-line bg-white p-6">
                  <div className="aspect-square w-full max-w-[420px]">{wheel}</div>
                  <p className="text-center text-[15px] text-muted">
                    {roster.length === 0 ? "貼上名單後，轉盤就會出現名字" : `轉盤上有 ${pool.length} 位 · 指針指到的就是中獎者`}
                  </p>
                </section>

                <section className="flex flex-col gap-4 rounded-[20px] border-[1.5px] border-line bg-white p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[17px] font-black">本輪紀錄</h2>
                    <span className="text-sm text-muted">{winners.length} 位</span>
                  </div>
                  {winners.length === 0 ? (
                    <p className="text-sm text-muted">還沒有人被抽中。</p>
                  ) : (
                    <ol className="grid gap-2.5 sm:grid-cols-2">
                      {[...winners].reverse().map((w) => (
                        <li key={w.seq} className="flex items-center justify-between gap-2 rounded-xl bg-paper py-2 pl-3.5 pr-2">
                          <span className="flex min-w-0 flex-col">
                            <span className="text-xs font-bold text-muted">第 {w.seq} 次</span>
                            <span className="truncate text-[17px] font-black">{w.name}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => returnWinners([w])}
                            disabled={spinning}
                            aria-label={`把${w.name}放回名單`}
                            className={`${btn.base} ${btn.secondary} px-3 text-[13px]`}
                          >
                            放回
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={newRound}
                      disabled={spinning || (winners.length === 0 && drawn.length === 0)}
                      className={`${btn.base} ${btn.secondary} text-sm`}
                    >
                      <Icon name="undo" className="h-4 w-4" strokeWidth={2.2} />
                      全部放回，開始新一輪
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOrder(shuffled(pool.map((p) => p.key)));
                        resetWheel(false);
                      }}
                      disabled={spinning || pool.length < 2}
                      className={`${btn.base} ${btn.secondary} text-sm`}
                    >
                      <Icon name="shuffle" className="h-4 w-4" strokeWidth={2.2} />
                      重新洗牌
                    </button>
                  </div>
                </section>
              </div>
            </div>

            <PrivacyNote>名單只會儲存在這台裝置的瀏覽器，不會上傳到雲端。</PrivacyNote>
          </main>
        </>
      )}

      {/* 抽中結果：大字置中，全班都看得到 */}
      {result && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="result-title"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1a1816]/85 p-4 backdrop-blur-sm"
        >
          <section className="flex w-full max-w-3xl flex-col items-center gap-3 rounded-[36px] bg-white px-6 py-10 text-center text-ink sm:px-14">
            <span id="result-title" className="rounded-full bg-draw px-5 py-2 text-lg font-black tracking-[0.1em] text-white sm:text-[22px]">
              本次抽中
            </span>
            {result.length === 1 ? (
              <p className="mt-2 font-black leading-tight tracking-wide" style={{ fontSize: "clamp(3.5rem, 11vw, 8.5rem)" }}>
                {result[0].name}
              </p>
            ) : (
              <ul className="mt-3 flex flex-wrap justify-center gap-x-8 gap-y-1">
                {result.map((p) => (
                  <li key={p.key} className="font-black leading-tight" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}>
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-lg font-bold text-muted sm:text-[22px]">
              {result.length === 1 ? `第 ${lastSeq} 次` : `第 ${lastSeq - result.length + 1}–${lastSeq} 次`} · 本輪剩餘 {pool.length} 位
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                ref={againRef}
                type="button"
                onClick={() => void handleDraw()}
                disabled={pool.length === 0}
                className={`${btn.base} min-h-[60px] rounded-2xl px-7 text-xl font-black ${
                  pool.length === 0 ? "bg-[#e8e2d7] text-muted" : "bg-draw text-white hover:brightness-110"
                }`}
              >
                {pool.length > 0 && <PlayIcon className="h-[22px] w-[22px]" />}
                {pool.length === 0 ? "本輪已完成" : `再抽 ${count} 位`}
              </button>
              <button
                type="button"
                onClick={() => {
                  returnWinners(winners.slice(-result.length));
                  setResult(null);
                }}
                className={`${btn.base} ${btn.secondary} min-h-[60px] rounded-2xl px-6 text-xl`}
              >
                <Icon name="undo" className="h-[22px] w-[22px]" strokeWidth={2.2} />
                放回名單
              </button>
              <button type="button" onClick={() => setResult(null)} className={`${btn.base} ${btn.secondary} min-h-[60px] rounded-2xl px-6 text-xl`}>
                關閉
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 清空後 5 秒內可復原，不用確認視窗打斷上課 */}
      {undo && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-ink py-2.5 pl-5 pr-2.5 text-white shadow-xl"
        >
          <span className="text-base font-bold">已清空名單（{parseNames(undo.text).length} 位）</span>
          <button type="button" onClick={restore} className={`${btn.base} bg-white text-ink`}>
            <Icon name="undo" className="h-[18px] w-[18px]" strokeWidth={2.4} />
            復原 · {undo.left}
          </button>
        </div>
      )}
    </div>
  );
}
