"use client";

import Image from "next/image";

/**
 * チームのわ ロゴ
 *
 * コンセプト: 4人が手を取り合い輪をつくる = チームの絆・和
 * アイコンはアプリアイコン（favicon / ホーム画面）と同一デザイン
 */

type LogoIconProps = {
  size?: number;
  className?: string;
};

export function LogoIcon({ size = 32, className }: LogoIconProps) {
  return (
    <Image
      src="/logo.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={`rounded-full ${className ?? ""}`}
      priority
    />
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
      <span className="font-light">チームの</span>
      <span className="font-extrabold">わ</span>
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
