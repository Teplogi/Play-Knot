/**
 * スポーツ種目別の背景装飾
 *
 * 共通レイアウト:
 *   - 右上に大きなボール (opacity ~0.07)
 *   - 左下に流れるアクセントライン (opacity ~0.05)
 *   - 中央〜下に小さなボールをひとつ (opacity ~0.04)
 *
 * pointer-events: none で全画面の最背面に絶対配置する想定。
 */

import type { SportKey } from "@/lib/sports";

const STROKE = "#6366f1"; // indigo-500
const FILL = "#a5b4fc"; // indigo-300

function FlowLines() {
  // 左下から右上に向けてゆるやかに流れる装飾ライン
  return (
    <g opacity="0.5">
      <path d="M -50 800 Q 200 600 500 500 T 1200 300" stroke={STROKE} strokeWidth="2" fill="none" />
      <path d="M -50 870 Q 200 700 500 600 T 1200 400" stroke={STROKE} strokeWidth="1.5" fill="none" />
      <path d="M -50 940 Q 200 800 500 700 T 1200 500" stroke={STROKE} strokeWidth="1" fill="none" />
    </g>
  );
}

function SoccerBall({ cx, cy, r, opacity = 1 }: { cx: number; cy: number; r: number; opacity?: number }) {
  // サッカーボール: 中央五角形 + 周囲の六角形パターン
  const angles = [0, 72, 144, 216, 288];
  const inner = r * 0.35;
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} stroke={STROKE} strokeWidth="2" fill="white" />
      <polygon
        points={angles
          .map((a) => {
            const rad = ((a - 90) * Math.PI) / 180;
            return `${cx + Math.cos(rad) * inner},${cy + Math.sin(rad) * inner}`;
          })
          .join(" ")}
        fill={FILL}
        stroke={STROKE}
        strokeWidth="1.5"
      />
      {angles.map((a, i) => {
        const rad = ((a - 90) * Math.PI) / 180;
        const x = cx + Math.cos(rad) * inner;
        const y = cy + Math.sin(rad) * inner;
        const rad2 = ((a - 90 + 36) * Math.PI) / 180;
        const x2 = cx + Math.cos(rad2) * r;
        const y2 = cy + Math.sin(rad2) * r;
        return <line key={i} x1={x} y1={y} x2={x2} y2={y2} stroke={STROKE} strokeWidth="1.5" />;
      })}
    </g>
  );
}

function BasketBall({ cx, cy, r, opacity = 1 }: { cx: number; cy: number; r: number; opacity?: number }) {
  // バスケットボール: 円 + 縦線 + 左右の弧
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} stroke={STROKE} strokeWidth="2" fill={FILL} fillOpacity="0.4" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={STROKE} strokeWidth="1.5" />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={STROKE} strokeWidth="1.5" />
      <path
        d={`M ${cx - r * 0.7} ${cy - r * 0.7} Q ${cx} ${cy} ${cx - r * 0.7} ${cy + r * 0.7}`}
        stroke={STROKE}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d={`M ${cx + r * 0.7} ${cy - r * 0.7} Q ${cx} ${cy} ${cx + r * 0.7} ${cy + r * 0.7}`}
        stroke={STROKE}
        strokeWidth="1.5"
        fill="none"
      />
    </g>
  );
}

function BaseBall({ cx, cy, r, opacity = 1 }: { cx: number; cy: number; r: number; opacity?: number }) {
  // 野球ボール: 円 + 左右の縫い目
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} stroke={STROKE} strokeWidth="2" fill="white" />
      {/* 左の縫い目 */}
      <path
        d={`M ${cx - r * 0.8} ${cy - r * 0.5} Q ${cx - r * 0.3} ${cy} ${cx - r * 0.8} ${cy + r * 0.5}`}
        stroke={STROKE}
        strokeWidth="1.5"
        fill="none"
      />
      {/* 右の縫い目 */}
      <path
        d={`M ${cx + r * 0.8} ${cy - r * 0.5} Q ${cx + r * 0.3} ${cy} ${cx + r * 0.8} ${cy + r * 0.5}`}
        stroke={STROKE}
        strokeWidth="1.5"
        fill="none"
      />
      {/* ステッチ */}
      {[-0.4, -0.2, 0, 0.2, 0.4].map((t) => (
        <g key={t}>
          <line
            x1={cx - r * 0.75 + 4}
            y1={cy + r * t}
            x2={cx - r * 0.55}
            y2={cy + r * (t - 0.05)}
            stroke={STROKE}
            strokeWidth="1"
          />
          <line
            x1={cx + r * 0.75 - 4}
            y1={cy + r * t}
            x2={cx + r * 0.55}
            y2={cy + r * (t - 0.05)}
            stroke={STROKE}
            strokeWidth="1"
          />
        </g>
      ))}
    </g>
  );
}

function VolleyBall({ cx, cy, r, opacity = 1 }: { cx: number; cy: number; r: number; opacity?: number }) {
  // バレーボール: 円 + 3本のカーブ
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} stroke={STROKE} strokeWidth="2" fill="white" />
      {[0, 60, 120].map((angle) => (
        <g key={angle} transform={`rotate(${angle} ${cx} ${cy})`}>
          <path
            d={`M ${cx - r} ${cy} Q ${cx} ${cy - r * 0.5} ${cx + r} ${cy}`}
            stroke={STROKE}
            strokeWidth="1.5"
            fill="none"
          />
        </g>
      ))}
      <circle cx={cx} cy={cy} r={r * 0.15} fill={FILL} />
    </g>
  );
}

function TennisBall({ cx, cy, r, opacity = 1 }: { cx: number; cy: number; r: number; opacity?: number }) {
  // テニスボール: 円 + S字の縫い目
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} stroke={STROKE} strokeWidth="2" fill={FILL} fillOpacity="0.5" />
      <path
        d={`M ${cx - r} ${cy} Q ${cx - r * 0.3} ${cy - r * 0.8} ${cx} ${cy} T ${cx + r} ${cy}`}
        stroke="white"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d={`M ${cx - r} ${cy} Q ${cx - r * 0.3} ${cy + r * 0.8} ${cx} ${cy} T ${cx + r} ${cy}`}
        stroke="white"
        strokeWidth="2.5"
        fill="none"
      />
    </g>
  );
}

type BallProps = { cx: number; cy: number; r: number; opacity?: number };

const BALL_BY_SPORT: Record<SportKey, (props: BallProps) => React.ReactElement> = {
  soccer: SoccerBall,
  basketball: BasketBall,
  baseball: BaseBall,
  volleyball: VolleyBall,
  tennis: TennisBall,
};

export function SportBackground({ sport }: { sport: SportKey }) {
  const Ball = BALL_BY_SPORT[sport];
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <svg
        viewBox="0 0 1200 1000"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        {/* 流れるアクセントライン */}
        <g opacity="0.07">
          <FlowLines />
        </g>
        {/* 右上の大きなボール */}
        <g opacity="0.09">
          <Ball cx={1050} cy={180} r={170} />
        </g>
        {/* 中央右下の小さなボール */}
        <g opacity="0.06">
          <Ball cx={900} cy={780} r={70} />
        </g>
      </svg>
    </div>
  );
}
