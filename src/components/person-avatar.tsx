"use client";

import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizes: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-11 w-11",
  lg: "h-16 w-16",
};

export function PersonAvatar({
  person,
  gender,
  avatarUrl,
  size = "md",
  className,
  inverted = false,
}: {
  person?: Pick<Person, "full_name" | "gender" | "avatar_url"> | null;
  gender?: Person["gender"];
  avatarUrl?: string | null;
  size?: Size;
  className?: string;
  /** For dark focus cards */
  inverted?: boolean;
}) {
  const g = gender ?? person?.gender ?? null;
  const url = avatarUrl ?? person?.avatar_url ?? null;
  const name = person?.full_name ?? "";

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={cn(
          sizes[size],
          "shrink-0 rounded-full object-cover ring-1 ring-border-soft",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        sizes[size],
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        inverted ? "bg-white/15 ring-1 ring-white/20" : "bg-accent-soft ring-1 ring-border-soft",
        className,
      )}
      aria-hidden
    >
      <Silhouette gender={g} inverted={inverted} />
    </span>
  );
}

function Silhouette({
  gender,
  inverted,
}: {
  gender: Person["gender"];
  inverted?: boolean;
}) {
  const fill = inverted ? "rgba(255,255,255,0.88)" : "#5B6B7C";
  // Female: slightly softer head+shoulders; male: broader shoulders; neutral default
  if (gender === "female") {
    return (
      <svg viewBox="0 0 64 64" className="h-[72%] w-[72%]" fill={fill}>
        <circle cx="32" cy="24" r="12" />
        <path d="M12 58c2-14 10-20 20-20s18 6 20 20v2H12v-2Z" />
        <path d="M22 18c0-2 3-6 10-6s10 4 10 6" fill="none" stroke={fill} strokeWidth="2" opacity="0.35" />
      </svg>
    );
  }
  if (gender === "male") {
    return (
      <svg viewBox="0 0 64 64" className="h-[72%] w-[72%]" fill={fill}>
        <circle cx="32" cy="22" r="11" />
        <path d="M8 58c3-15 12-22 24-22s21 7 24 22v2H8v-2Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-[72%] w-[72%]" fill={fill}>
      <circle cx="32" cy="23" r="11.5" />
      <path d="M10 58c2.5-14 11-21 22-21s19.5 7 22 21v2H10v-2Z" />
    </svg>
  );
}
