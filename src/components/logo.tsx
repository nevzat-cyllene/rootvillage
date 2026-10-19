import { cn } from "@/lib/utils";

export function Logo({
  className,
  markOnly = false,
  size = 28,
}: {
  className?: string;
  markOnly?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="rvSteel" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5F5F7" />
            <stop offset="0.45" stopColor="#D2D2D7" />
            <stop offset="1" stopColor="#8E8E93" />
          </linearGradient>
          <linearGradient id="rvInk" x1="18" y1="16" x2="46" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1D1D1F" />
            <stop offset="1" stopColor="#5B6B7C" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="29" stroke="url(#rvSteel)" strokeWidth="2.5" fill="#FFFFFF" />
        <path
          d="M32 14c0 8-6 12-6 20 0 5 2.5 8 6 10 3.5-2 6-5 6-10 0-8-6-12-6-20Z"
          fill="url(#rvInk)"
          opacity="0.92"
        />
        <path
          d="M32 44v6M26 48h12"
          stroke="#5B6B7C"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="32" cy="20" r="2.2" fill="#FAFAFA" />
      </svg>
      {!markOnly && (
        <span className="text-[17px] font-semibold tracking-[-0.03em] text-text">
          RootVillage
        </span>
      )}
    </span>
  );
}
