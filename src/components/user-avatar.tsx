"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  name?: string | null;
  image?: string | null;
  size?: number;
  className?: string;
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

export function UserAvatar({
  name,
  image,
  size = 40,
  className = "",
}: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(image) && !failed;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <Image
          src={image as string}
          alt={name ? `${name} avatar` : "User avatar"}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          sizes={`${size}px`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="font-semibold text-indigo-400"
          style={{ fontSize: Math.max(11, size * 0.32) }}
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}
