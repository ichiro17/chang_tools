"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type Person = { id: number; name: string };
type Winner = { id: number; name: string; round: number };

const SPIN_MS = 4200;
const EXTRA_SPINS = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 角度以 12 點鐘方向為 0，順時針遞增 */
function pointOnCircle(angleDeg: number, r: number): readonly [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [150 + r * Math.cos(rad), 150 + r * Math.sin(rad)] as const;
}

function parseNames(text: string): string[] {
  return text
    .split(/[\n,，、；;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function DrawPage() {
  const [rawInput, setRawInput] = useState("");
  const [pool, setPool] = useState<Person[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [drawCount, setDrawCount] = useState(1);
  const [autoRemove, setAutoRemove] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [noAnim, setNoAnim] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [lastResults, setLastResults] = useState<string[]>([]);

  const idRef = useRef(0);
  const roundRef = useRef(0);

  const seg = pool.length > 0 ? 360 / pool.length : 360;
  const canDraw = pool.length > 0 && !spinning;
  const effectiveCount = Math.max(1, Math.min(drawCount, pool.length || 1));

  // 鮮豔彩虹配色：沿色相環一圈，飽和度高、亮度居中，相鄰色塊靠白色分隔線區隔
  const colorFor = useMemo(
    () =>
      (i: number, n: number) => {
        const hue = Math.round((i * 360) / Math.max(n, 1) + 8) % 360;
        const light = i % 2 === 0 ? 56 : 62;
        return `hsl(${hue} 82% ${light}%)`;
      },
    [],
  );

  function resetWheel(toZero = true) {
    setNoAnim(true);
    if (toZero) setRotation(0);
    setHighlightId(null);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setNoAnim(false)),
    );
  }

  function loadList(replace: boolean) {
    const names = parseNames(rawInput);
    if (names.length === 0) return;
    const people = names.map((name) => ({ id: idRef.current++, name }));
    if (replace) {
      setPool(people);
      setWinners([]);
      roundRef.current = 0;
    } else {
      setPool((prev) => [...prev, ...people]);
    }
    setLastResults([]);
    setRawInput("");
    resetWheel(true);
  }

  function removeFromPool(id: number) {
    setPool((prev) => prev.filter((p) => p.id !== id));
    resetWheel(false);
  }

  function returnWinner(w: Winner) {
    setWinners((prev) => prev.filter((x) => x !== w));
    setPool((prev) =>
      prev.some((p) => p.id === w.id)
        ? prev
        : [...prev, { id: w.id, name: w.name }],
    );
    resetWheel(false);
  }

  function clearAll() {
    setPool([]);
    setWinners([]);
    setLastResults([]);
    roundRef.current = 0;
    resetWheel(true);
  }

  async function handleDraw() {
    if (!canDraw) return;
    const count = Math.min(drawCount, pool.length);
    setSpinning(true);
    setLastResults([]);
    setHighlightId(null);
    roundRef.current += 1;
    const round = roundRef.current;

    // 一輪之內名單不變，用本地陣列避免同一輪重複抽到同一人
    const available = [...pool];
    const picked: Person[] = [];
    let current = rotation;

    for (let i = 0; i < count; i++) {
      const k = Math.floor(Math.random() * available.length);
      const person = available[k];
      available.splice(k, 1);
      picked.push(person);

      const idx = pool.findIndex((p) => p.id === person.id);
      const center = idx * seg + seg / 2;
      const jitter = (Math.random() - 0.5) * seg * 0.34;
      const targetMod = (((-(center + jitter)) % 360) + 360) % 360;
      const delta = (((targetMod - (current % 360)) % 360) + 360) % 360;
      current = current + 360 * EXTRA_SPINS + delta;

      setHighlightId(null);
      setRotation(current);
      await sleep(SPIN_MS + 250);
      setHighlightId(person.id);
      // 停在中獎者身上停留一下再繼續（最後一位停久一點，自動移除前讓人看清楚）
      await sleep(i === count - 1 ? 1800 : 900);
    }

    setWinners((prev) => [
      ...prev,
      ...picked.map((p) => ({ id: p.id, name: p.name, round })),
    ]);
    setLastResults(picked.map((p) => p.name));

    if (autoRemove) {
      const ids = new Set(picked.map((p) => p.id));
      setPool((prev) => prev.filter((p) => !ids.has(p.id)));
    }
    setSpinning(false);
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              🎡 抽籤轉盤
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              輸入名單 → 轉盤隨機抽出 → 抽中可自動移除避免重複
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            ← 首頁
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          {/* 左：控制區 */}
          <section className="flex flex-col gap-5">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <label className="mb-2 block text-sm font-semibold">
                名單（每行一位，或用逗號 / 頓號分隔）
              </label>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                rows={6}
                placeholder={"小明\n小華\n小美\n阿強"}
                className="w-full resize-y rounded-lg border border-zinc-300 bg-zinc-50 p-3 font-mono text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => loadList(true)}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  disabled={parseNames(rawInput).length === 0}
                >
                  載入名單（取代）
                </button>
                <button
                  onClick={() => loadList(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  disabled={parseNames(rawInput).length === 0}
                >
                  ＋ 加入
                </button>
                <button
                  onClick={clearAll}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  清空全部
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  一次抽出
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, pool.length)}
                    value={drawCount}
                    onChange={(e) =>
                      setDrawCount(
                        Math.max(1, Math.floor(Number(e.target.value) || 1)),
                      )
                    }
                    className="w-16 rounded-lg border border-zinc-300 bg-zinc-50 px-2 py-1 text-center dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  位
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoRemove}
                    onChange={(e) => setAutoRemove(e.target.checked)}
                    className="h-4 w-4"
                  />
                  抽中後自動移除（避免重複）
                </label>
              </div>
              <button
                onClick={handleDraw}
                disabled={!canDraw}
                className="mt-4 w-full rounded-xl bg-red-600 px-6 py-3 text-lg font-bold text-white shadow-sm transition hover:bg-red-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {spinning
                  ? "轉盤轉動中…"
                  : pool.length === 0
                    ? "先載入名單"
                    : `開始抽出 ${effectiveCount} 位`}
              </button>
              {lastResults.length > 0 && (
                <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-center text-sm font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                  🎉 這次抽中：{lastResults.join("、")}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-2 text-sm font-semibold">
                  轉盤名單（{pool.length}）
                </h2>
                {pool.length === 0 ? (
                  <p className="text-sm text-zinc-400">尚未載入名單</p>
                ) : (
                  <ul className="flex max-h-56 flex-wrap gap-1.5 overflow-auto">
                    {pool.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => removeFromPool(p.id)}
                          disabled={spinning}
                          title="點擊移除"
                          className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs hover:bg-red-100 hover:text-red-700 disabled:opacity-50 dark:bg-zinc-800 dark:hover:bg-red-500/20 dark:hover:text-red-300"
                        >
                          {p.name} ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-2 text-sm font-semibold">
                  中獎名單（{winners.length}）
                </h2>
                {winners.length === 0 ? (
                  <p className="text-sm text-zinc-400">尚無中獎者</p>
                ) : (
                  <ol className="flex max-h-56 flex-col gap-1 overflow-auto text-sm">
                    {winners.map((w, i) => (
                      <li
                        key={`${w.id}-${i}`}
                        className="flex items-center justify-between rounded-lg bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800"
                      >
                        <span>
                          <span className="mr-1 text-zinc-400">
                            #{i + 1}
                          </span>
                          {w.name}
                          <span className="ml-1 text-xs text-zinc-400">
                            （第 {w.round} 輪）
                          </span>
                        </span>
                        <button
                          onClick={() => returnWinner(w)}
                          disabled={spinning}
                          className="text-xs text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
                        >
                          放回
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </section>

          {/* 右：轉盤 */}
          <section className="flex flex-col items-center">
            <div className="relative aspect-square w-full max-w-[440px]">
              <svg
                viewBox="0 0 300 300"
                className="h-full w-full"
                style={{ filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.22))" }}
              >
                <defs>
                  <radialGradient id="wheelSheen" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.6} />
                    <stop offset="42%" stopColor="#ffffff" stopOpacity={0.14} />
                    <stop offset="78%" stopColor="#ffffff" stopOpacity={0} />
                    <stop offset="100%" stopColor="#000000" stopOpacity={0.12} />
                  </radialGradient>
                  <linearGradient id="rimGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f4483d" />
                    <stop offset="100%" stopColor="#c22c22" />
                  </linearGradient>
                  <radialGradient id="hubDome" cx="38%" cy="34%" r="72%">
                    <stop offset="0%" stopColor="#ff8078" />
                    <stop offset="55%" stopColor="#ed3b30" />
                    <stop offset="100%" stopColor="#bd291f" />
                  </radialGradient>
                </defs>

                {/* 外框（不轉動） */}
                <circle cx={150} cy={150} r={149} fill="url(#rimGrad)" />
                <circle
                  cx={150}
                  cy={150}
                  r={149}
                  fill="none"
                  stroke="#9c1d13"
                  strokeWidth={1.5}
                />
                <circle
                  cx={150}
                  cy={150}
                  r={125}
                  fill="none"
                  stroke="#8f1a11"
                  strokeWidth={2}
                />
                <circle cx={150} cy={150} r={124} fill="#fafafa" />
                {/* 金色鉚釘 */}
                {Array.from({ length: 16 }).map((_, i) => {
                  const [sx, sy] = pointOnCircle((i * 360) / 16, 137);
                  return (
                    <circle
                      key={i}
                      cx={sx}
                      cy={sy}
                      r={3.6}
                      fill="#ffd34d"
                      stroke="#e0a12b"
                      strokeWidth={1}
                    />
                  );
                })}

                {/* 轉盤本體（會轉動） */}
                <g
                  style={{
                    transformBox: "view-box",
                    transformOrigin: "150px 150px",
                    transform: `rotate(${rotation}deg)`,
                    transition: noAnim
                      ? "none"
                      : `transform ${SPIN_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
                  }}
                >
                  {pool.length === 0 && (
                    <>
                      <circle cx={150} cy={150} r={122} fill="#e5e7eb" />
                      <text
                        x={150}
                        y={150}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#6b7280"
                        fontSize={15}
                      >
                        請先載入名單
                      </text>
                    </>
                  )}

                  {pool.length === 1 && (
                    <>
                      <circle
                        cx={150}
                        cy={150}
                        r={122}
                        fill={colorFor(0, 1)}
                      />
                      <text
                        x={150}
                        y={150}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        fontSize={16}
                        fontWeight={800}
                        style={{
                          paintOrder: "stroke",
                          stroke: "rgba(0,0,0,0.25)",
                          strokeWidth: 3,
                        }}
                      >
                        {pool[0].name}
                      </text>
                    </>
                  )}

                  {pool.length > 1 &&
                    pool.map((p, i) => {
                      const start = i * seg;
                      const end = (i + 1) * seg;
                      const [x0, y0] = pointOnCircle(start, 122);
                      const [x1, y1] = pointOnCircle(end, 122);
                      const large = seg > 180 ? 1 : 0;
                      return (
                        <path
                          key={p.id}
                          d={`M150,150 L${x0.toFixed(2)},${y0.toFixed(
                            2,
                          )} A122,122 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(
                            2,
                          )} Z`}
                          fill={colorFor(i, pool.length)}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      );
                    })}

                  {pool.length > 1 &&
                    pool.map((p, i) => {
                      const mid = i * seg + seg / 2;
                      const fs =
                        pool.length > 22
                          ? 9
                          : pool.length > 15
                            ? 11
                            : pool.length > 10
                              ? 13
                              : 15;
                      const innerR = 30;
                      const outerR = 112;
                      // 文字貼著圓周（外緣）擺放，往圓心方向延展；依可用長度估算字數
                      const maxChars = Math.max(
                        2,
                        Math.floor((outerR - innerR) / (fs * 0.95)),
                      );
                      const label =
                        p.name.length > maxChars
                          ? `${p.name.slice(0, maxChars - 1)}…`
                          : p.name;
                      const active = highlightId === p.id;
                      return (
                        <text
                          key={`t-${p.id}`}
                          x={150 + outerR}
                          y={150}
                          textAnchor="end"
                          dominantBaseline="central"
                          transform={`rotate(${(mid - 90).toFixed(2)} 150 150)`}
                          fill="#ffffff"
                          fontSize={active ? fs + 1.5 : fs}
                          fontWeight={active ? 900 : 700}
                          style={{
                            paintOrder: "stroke",
                            stroke: "rgba(0,0,0,0.28)",
                            strokeWidth: 3,
                            letterSpacing: "0.5px",
                          }}
                        >
                          {label}
                        </text>
                      );
                    })}

                  {/* 內圈光澤（隨盤轉，因為是同心圓所以看不出差別） */}
                  <circle
                    cx={150}
                    cy={150}
                    r={122}
                    fill="url(#wheelSheen)"
                    pointerEvents="none"
                  />

                  {/* 中獎區塊高亮（畫在最上層） */}
                  {highlightId != null &&
                    pool.length > 1 &&
                    (() => {
                      const i = pool.findIndex((p) => p.id === highlightId);
                      if (i < 0) return null;
                      const start = i * seg;
                      const end = (i + 1) * seg;
                      const [x0, y0] = pointOnCircle(start, 122);
                      const [x1, y1] = pointOnCircle(end, 122);
                      const large = seg > 180 ? 1 : 0;
                      const d = `M150,150 L${x0.toFixed(2)},${y0.toFixed(
                        2,
                      )} A122,122 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(
                        2,
                      )} Z`;
                      return (
                        <>
                          <path d={d} fill="rgba(255,255,255,0.22)" />
                          <path
                            d={d}
                            fill="none"
                            stroke="#ffd34d"
                            strokeWidth={5}
                            strokeLinejoin="round"
                          />
                        </>
                      );
                    })()}
                </g>

                {/* 指針 + 中心鈕（不轉動，永遠指向正上方） */}
                <g style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}>
                  <path
                    d="M150 10 L141 150 L159 150 Z"
                    fill="#d92d20"
                    stroke="#9c1d13"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                  />
                  <circle cx={150} cy={150} r={25} fill="#f4f4f5" />
                  <circle
                    cx={150}
                    cy={150}
                    r={19}
                    fill="url(#hubDome)"
                    stroke="#9c1d13"
                    strokeWidth={1}
                  />
                  <circle cx={150} cy={150} r={10} fill="#ff5f54" />
                  <ellipse
                    cx={144}
                    cy={144}
                    rx={5}
                    ry={3.5}
                    fill="#ffffff"
                    opacity={0.5}
                  />
                </g>
              </svg>
            </div>
            <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              指針指到的區塊即為中獎者
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
