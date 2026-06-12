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

function HandBall({ cx, cy, r, opacity = 1 }: { cx: number; cy: number; r: number; opacity?: number }) {
  // ハンドボール: 円 + 緩やかな曲線パネル (暫定デザイン)
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} stroke={STROKE} strokeWidth="2" fill={FILL} fillOpacity="0.35" />
      {[ -0.4, 0, 0.4 ].map((t) => (
        <path
          key={t}
          d={`M ${cx - r} ${cy + r * t} Q ${cx} ${cy + r * (t - 0.4)} ${cx + r} ${cy + r * t}`}
          stroke={STROKE}
          strokeWidth="1.5"
          fill="none"
        />
      ))}
    </g>
  );
}

function DodgeBall({ cx, cy, r, opacity = 1 }: { cx: number; cy: number; r: number; opacity?: number }) {
  // ドッジボール: 円 + 同心円と十字 (暫定デザイン)
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} stroke={STROKE} strokeWidth="2" fill={FILL} fillOpacity="0.45" />
      <circle cx={cx} cy={cy} r={r * 0.55} stroke={STROKE} strokeWidth="1.5" fill="none" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={STROKE} strokeWidth="1.5" />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={STROKE} strokeWidth="1.5" />
    </g>
  );
}

function OvalBall({ cx, cy, r, opacity = 1, laces }: { cx: number; cy: number; r: number; opacity?: number; laces?: boolean }) {
  // 楕円ボール (ラグビー / アメフト共通の暫定デザイン)
  const rx = r;
  const ry = r * 0.62;
  return (
    <g opacity={opacity}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke={STROKE} strokeWidth="2" fill={FILL} fillOpacity="0.35" />
      {/* 中央のシーム */}
      <line x1={cx - rx * 0.7} y1={cy} x2={cx + rx * 0.7} y2={cy} stroke={STROKE} strokeWidth="1.5" />
      {/* レース (アメフトのみ) */}
      {laces &&
        [-0.4, -0.2, 0, 0.2, 0.4].map((t) => (
          <line
            key={t}
            x1={cx + rx * t}
            y1={cy - ry * 0.18}
            x2={cx + rx * t}
            y2={cy + ry * 0.18}
            stroke={STROKE}
            strokeWidth="1.5"
          />
        ))}
    </g>
  );
}

function RugbyBall(props: { cx: number; cy: number; r: number; opacity?: number }) {
  return <OvalBall {...props} />;
}

function AmericanFootball(props: { cx: number; cy: number; r: number; opacity?: number }) {
  return <OvalBall {...props} laces />;
}

type BallProps = { cx: number; cy: number; r: number; opacity?: number };

const BALL_BY_SPORT: Record<SportKey, (props: BallProps) => React.ReactElement> = {
  soccer: SoccerBall,
  basketball: BasketBall,
  baseball: BaseBall,
  volleyball: VolleyBall,
  tennis: TennisBall,
  // 以下は暫定デザイン (背景は後で調整予定)
  softball: BaseBall, // ソフトボールは野球ボールと同形状を流用
  futsal: SoccerBall, // フットサルはサッカーボールを流用
  handball: HandBall,
  rugby: RugbyBall,
  american_football: AmericanFootball,
  dodgeball: DodgeBall,
};

export function SportBackground({ sport }: { sport: SportKey }) {
  const Ball = BALL_BY_SPORT[sport];
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* 流れるアクセントライン (画面全体に薄く流す) */}
      <svg
        viewBox="0 0 1200 1000"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full opacity-[0.08]"
      >
        <FlowLines />
      </svg>
      {/*
        ボールは画面端を基準に絶対配置する。
        以前は単一 SVG (viewBox 1200x1000, slice) に詰めていたが、
        モバイル縦長ビューポートでは右側の cx=900〜1050 が大幅にクロップされ
        ボールが見えなくなる問題があったため、ビューポート相対の配置に変更。
      */}
      {/* 右上の大きなボール */}
      <div className="absolute -top-6 -right-10 sm:-top-4 sm:-right-6 w-44 sm:w-64 md:w-80 lg:w-96 aspect-square opacity-[0.1]">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <Ball cx={100} cy={100} r={95} />
        </svg>
      </div>
      {/* 右下〜中央の小さなボール */}
      <div className="absolute bottom-24 -right-4 sm:bottom-28 sm:right-16 md:right-32 w-24 sm:w-28 md:w-32 aspect-square opacity-[0.08]">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <Ball cx={100} cy={100} r={95} />
        </svg>
      </div>
    </div>
  );
}
