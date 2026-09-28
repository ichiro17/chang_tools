/** 抽籤轉盤的 SVG：外框、指針不動，盤面依 rotation 轉動。 */

export type Entry = { key: string; name: string };

/** 角度以 12 點鐘方向為 0，順時針遞增 */
function pointOnCircle(angleDeg: number, r: number): readonly [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [150 + r * Math.cos(rad), 150 + r * Math.sin(rad)] as const;
}

// 鮮豔彩虹配色：沿色相環一圈，飽和度高、亮度居中，相鄰色塊靠白色分隔線區隔
function colorFor(i: number, n: number) {
  const hue = Math.round((i * 360) / Math.max(n, 1) + 8) % 360;
  const light = i % 2 === 0 ? 56 : 62;
  return `hsl(${hue} 82% ${light}%)`;
}

function sectorPath(i: number, seg: number) {
  const [x0, y0] = pointOnCircle(i * seg, 122);
  const [x1, y1] = pointOnCircle((i + 1) * seg, 122);
  const large = seg > 180 ? 1 : 0;
  return `M150,150 L${x0.toFixed(2)},${y0.toFixed(2)} A122,122 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
}

export function Wheel({
  pool,
  rotation,
  noAnim,
  spinMs,
  highlightKey,
  emptyText,
}: {
  pool: Entry[];
  rotation: number;
  noAnim: boolean;
  spinMs: number;
  highlightKey: string | null;
  emptyText: string;
}) {
  const seg = pool.length > 0 ? 360 / pool.length : 360;
  const hi = highlightKey == null ? -1 : pool.findIndex((p) => p.key === highlightKey);

  return (
    <svg
      viewBox="0 0 300 300"
      className="h-full w-full"
      style={{ filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.22))" }}
      role="img"
      aria-label={pool.length > 0 ? `轉盤上有 ${pool.length} 位` : emptyText}
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
      <circle cx={150} cy={150} r={149} fill="none" stroke="#9c1d13" strokeWidth={1.5} />
      <circle cx={150} cy={150} r={125} fill="none" stroke="#8f1a11" strokeWidth={2} />
      <circle cx={150} cy={150} r={124} fill="#fafafa" />
      {/* 金色鉚釘 */}
      {Array.from({ length: 16 }).map((_, i) => {
        const [sx, sy] = pointOnCircle((i * 360) / 16, 137);
        return <circle key={i} cx={sx} cy={sy} r={3.6} fill="#ffd34d" stroke="#e0a12b" strokeWidth={1} />;
      })}

      {/* 轉盤本體（會轉動） */}
      <g
        style={{
          transformBox: "view-box",
          transformOrigin: "150px 150px",
          transform: `rotate(${rotation}deg)`,
          transition: noAnim ? "none" : `transform ${spinMs}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      >
        {pool.length === 0 && (
          <>
            <circle cx={150} cy={150} r={122} fill="#e5e7eb" />
            <text x={150} y={150} textAnchor="middle" dominantBaseline="middle" fill="#57524a" fontSize={15}>
              {emptyText}
            </text>
          </>
        )}

        {pool.length === 1 && (
          <>
            <circle cx={150} cy={150} r={122} fill={colorFor(0, 1)} />
            <text
              x={150}
              y={150}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize={16}
              fontWeight={800}
              style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.25)", strokeWidth: 3 }}
            >
              {pool[0].name}
            </text>
          </>
        )}

        {pool.length > 1 &&
          pool.map((p, i) => (
            <path key={p.key} d={sectorPath(i, seg)} fill={colorFor(i, pool.length)} stroke="#ffffff" strokeWidth={2} />
          ))}

        {pool.length > 1 &&
          pool.map((p, i) => {
            const mid = i * seg + seg / 2;
            const fs = pool.length > 22 ? 9 : pool.length > 15 ? 11 : pool.length > 10 ? 13 : 15;
            const innerR = 30;
            const outerR = 112;
            // 文字貼著圓周（外緣）擺放，往圓心方向延展；依可用長度估算字數
            const maxChars = Math.max(2, Math.floor((outerR - innerR) / (fs * 0.95)));
            const label = p.name.length > maxChars ? `${p.name.slice(0, maxChars - 1)}…` : p.name;
            const active = i === hi;
            return (
              <text
                key={`t-${p.key}`}
                x={150 + outerR}
                y={150}
                textAnchor="end"
                dominantBaseline="central"
                transform={`rotate(${(mid - 90).toFixed(2)} 150 150)`}
                fill="#ffffff"
                fontSize={active ? fs + 1.5 : fs}
                fontWeight={active ? 900 : 700}
                style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.28)", strokeWidth: 3, letterSpacing: "0.5px" }}
              >
                {label}
              </text>
            );
          })}

        {/* 內圈光澤（隨盤轉，因為是同心圓所以看不出差別） */}
        <circle cx={150} cy={150} r={122} fill="url(#wheelSheen)" pointerEvents="none" />

        {/* 中獎區塊高亮（畫在最上層） */}
        {hi >= 0 && pool.length > 1 && (
          <>
            <path d={sectorPath(hi, seg)} fill="rgba(255,255,255,0.22)" />
            <path d={sectorPath(hi, seg)} fill="none" stroke="#ffd34d" strokeWidth={5} strokeLinejoin="round" />
          </>
        )}
      </g>

      {/* 指針 + 中心鈕（不轉動，永遠指向正上方） */}
      <g style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}>
        <path d="M150 10 L141 150 L159 150 Z" fill="#d92d20" stroke="#9c1d13" strokeWidth={1.5} strokeLinejoin="round" />
        <circle cx={150} cy={150} r={25} fill="#f4f4f5" />
        <circle cx={150} cy={150} r={19} fill="url(#hubDome)" stroke="#9c1d13" strokeWidth={1} />
        <circle cx={150} cy={150} r={10} fill="#ff5f54" />
        <ellipse cx={144} cy={144} rx={5} ry={3.5} fill="#ffffff" opacity={0.5} />
      </g>
    </svg>
  );
}
