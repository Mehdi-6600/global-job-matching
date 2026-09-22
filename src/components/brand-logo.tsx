import { useId, type SVGProps } from "react";

/**
 * Global Job Matching — brand mark
 * Two stylized figures (blue + green) forming the letter M,
 * with a location pin in the center.
 *
 * `useId()` generates a unique suffix for the SVG gradient IDs so
 * that multiple <BrandMark /> instances on the same page (navbar +
 * footer, for example) do not collide on the `gjm-blue` / `gjm-green`
 * identifiers — which would cause some browsers to reuse the first
 * gradient definition and render inconsistent colors.
 */
export function BrandMark({
  size = 36,
  ...props
}: { size?: number } & SVGProps<SVGSVGElement>) {
  const uid = useId().replace(/:/g, "");
  const blueId = `gjm-blue-${uid}`;
  const greenId = `gjm-green-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id={blueId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id={greenId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#84CC16" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>

      {/* Blue figure — left shoulder arc */}
      <path
        d="M10 50 C 10 32, 20 20, 30 20 C 36 20, 40 24, 42 30 L 30 42 C 28 38, 26 34, 22 34 C 18 34, 16 38, 16 44 L 16 50 Z"
        fill={`url(#${blueId})`}
      />

      {/* Green figure — right shoulder arc */}
      <path
        d="M54 50 C 54 32, 44 20, 34 20 C 28 20, 24 24, 22 30 L 34 42 C 36 38, 38 34, 42 34 C 46 34, 48 38, 48 44 L 48 50 Z"
        fill={`url(#${greenId})`}
      />

      {/* Left head */}
      <circle cx="22" cy="14" r="5" fill={`url(#${blueId})`} />

      {/* Right head */}
      <circle cx="42" cy="14" r="5" fill={`url(#${greenId})`} />

      {/* Location pin — center */}
      <path
        d="M32 30 C 27.58 30, 24 33.58, 24 38 C 24 42, 28 46, 32 52 C 36 46, 40 42, 40 38 C 40 33.58, 36.42 30, 32 30 Z"
        fill="#0F172A"
      />
      <circle cx="32" cy="38" r="3" fill="#FFFFFF" />
    </svg>
  );
}
