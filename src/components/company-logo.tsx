"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  name?: string | null;
  logo?: string | null;
  size?: number;
  className?: string;
  priority?: boolean;
};

function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Optimized company logo via next/image.
 * Falls back to initials if URL missing or fails to load.
 */
export function CompanyLogo({
  name,
  logo,
  size = 56,
  className = "",
  priority = false,
}: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(logo) && !failed;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <Image
          src={logo as string}
          alt={name ? `${name} logo` : "Company logo"}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          sizes={`${size}px`}
          priority={priority}
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="font-bold text-cyan-400"
          style={{ fontSize: Math.max(12, size * 0.28) }}
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}
