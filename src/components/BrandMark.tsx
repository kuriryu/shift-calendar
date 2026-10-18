import { useId } from "react";

const ICON_PX = { sm: 16, md: 22, lg: 29 } as const;

const TEXT_CLASS = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
} as const;

function ShiftKitIcon({ sizePx, shadowId }: { sizePx: number; shadowId: string }) {
  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <rect x="1" y="1" width="16" height="16" rx="3.5" fill="#2F80ED" />
      <rect x="19" y="1" width="16" height="16" rx="3.5" fill="#56CCF2" />
      <rect x="1" y="19" width="16" height="16" rx="3.5" fill="#E8EEF4" />
      <g filter={`url(#${shadowId})`}>
        <rect
          x="19"
          y="19"
          width="16"
          height="16"
          rx="3.5"
          fill="#1F2937"
          transform="rotate(-8 27 27)"
        />
      </g>
      <defs>
        <filter
          id={shadowId}
          x="14"
          y="16"
          width="22"
          height="22"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#1F2937" floodOpacity="0.28" />
        </filter>
      </defs>
    </svg>
  );
}

/** ShiftKit lockup: 4-square icon + wordmark */
export default function BrandMark({
  size = "md",
  compact = false,
}: {
  size?: "sm" | "md" | "lg";
  compact?: boolean;
}) {
  const iconPx = ICON_PX[size];
  const textClass = TEXT_CLASS[size];
  const shadowId = useId().replace(/:/g, "");

  return (
    <span
      className="inline-flex items-center gap-2"
      aria-label="ShiftKit"
      lang="en"
    >
      <ShiftKitIcon sizePx={iconPx} shadowId={shadowId} />
      {!compact && (
        <span
          className={`font-[family-name:var(--font-brand)] font-semibold leading-none tracking-tight text-[#1F2937] ${textClass}`}
        >
          ShiftKit
        </span>
      )}
    </span>
  );
}
