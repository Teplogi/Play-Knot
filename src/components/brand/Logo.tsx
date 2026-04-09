"use client";

/**
 * Play Knot ロゴ
 *
 * コンセプト: 2つのリングが交差する「結び目」= チームの絆
 * "Play" はライトウェイト、"Knot" はボールド — 動と静のコントラスト
 */

type LogoIconProps = {
  size?: number;
  className?: string;
};

export function LogoIcon({ size = 32, className }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* 背景 */}
      <rect width="40" height="40" rx="10" fill="url(#logo-grad)" />

      {/* 結び目モチーフ: 2つの楕円リングが交差 */}
      {/* 左リング（背面部分） */}
      <ellipse cx="16" cy="20" rx="9" ry="7" stroke="white" strokeWidth="2.5" strokeOpacity="0.5" fill="none" />
      {/* 右リング（前面に被る部分を塗り潰しで隠す） */}
      <ellipse cx="24" cy="20" rx="9" ry="7" stroke="white" strokeWidth="2.5" fill="none" />
      {/* 交差部分のハイライト — 左リングの前面部分を再描画 */}
      <path
        d="M 19.5 14.2 A 9 7 0 0 0 19.5 25.8"
        stroke="white"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

type LogoTextProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const TEXT_SIZES = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
} as const;

export function LogoText({ size = "md", className }: LogoTextProps) {
  return (
    <span className={`tracking-tight ${TEXT_SIZES[size]} ${className ?? ""}`}>
      <span className="font-light italic">Play</span>
      <span className="font-extrabold ml-0.5">Knot</span>
    </span>
  );
}

type LogoProps = {
  iconSize?: number;
  textSize?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
};

export function Logo({ iconSize = 32, textSize = "md", className, showText = true }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoIcon size={iconSize} />
      {showText && <LogoText size={textSize} className="text-gray-900" />}
    </span>
  );
}
