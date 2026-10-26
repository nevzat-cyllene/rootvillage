"use client";

import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizes: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-11 w-11",
  lg: "h-16 w-16",
};

function genderTone(gender: Person["gender"], inverted?: boolean) {
  if (inverted) {
    if (gender === "female") return "bg-[#FFD8E6]/22 ring-[#FFD4E3]/70";
    if (gender === "male") return "bg-[#D8EBFF]/22 ring-[#CBE4FF]/70";
    return "bg-white/15 ring-white/20";
  }
  if (gender === "female") return "bg-[var(--gender-female-bg)] ring-[var(--gender-female)]/35";
  if (gender === "male") return "bg-[var(--gender-male-bg)] ring-[var(--gender-male)]/35";
  return "bg-accent-soft ring-border-soft";
}

function glyphColor(gender: Person["gender"], inverted?: boolean) {
  if (inverted) return "rgba(255,255,255,0.92)";
  if (gender === "female") return "var(--gender-female)";
  if (gender === "male") return "var(--gender-male)";
  return "#5B6B7C";
}

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
          "shrink-0 rounded-full object-cover ring-[3px] shadow-[0_7px_20px_rgba(24,43,61,0.16)]",
          g === "female" && "ring-[var(--gender-female)]/65",
          g === "male" && "ring-[var(--gender-male)]/65",
          (!g || (g !== "female" && g !== "male")) && "ring-border-soft",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        sizes[size],
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-[3px] shadow-[0_7px_20px_rgba(24,43,61,0.14)]",
        genderTone(g, inverted),
        className,
      )}
      aria-hidden
    >
      <Silhouette gender={g} color={glyphColor(g, inverted)} />
    </span>
  );
}

function Silhouette({
  gender,
  color,
}: {
  gender: Person["gender"];
  color: string;
}) {
  if (gender === "female") {
    return (
      <svg viewBox="0 0 64 64" className="h-[78%] w-[78%]" fill={color}>
        <circle cx="32" cy="22" r="11" />
        <path d="M14 56c2-12 9-18 18-18s16 6 18 18v3H14v-3Z" />
        <circle cx="48" cy="14" r="5.5" fill="none" stroke={color} strokeWidth="2.2" />
        <path
          d="M48 19.5v8M44.5 24h7"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (gender === "male") {
    return (
      <svg viewBox="0 0 64 64" className="h-[78%] w-[78%]" fill={color}>
        <circle cx="30" cy="23" r="11" />
        <path d="M8 56c3-14 11-20 22-20s19 6 22 20v3H8v-3Z" />
        <circle cx="46" cy="16" r="5.5" fill="none" stroke={color} strokeWidth="2.2" />
        <path
          d="M50 12l7-7M50.5 5h7v7"
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-[72%] w-[72%]" fill={color}>
      <circle cx="32" cy="23" r="11.5" />
      <path d="M10 58c2.5-14 11-21 22-21s19.5 7 22 21v2H10v-2Z" />
    </svg>
  );
}
