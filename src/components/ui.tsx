import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary:
      "bg-text text-white hover:bg-[#2d2d2f] border border-transparent shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]",
    secondary:
      "bg-bg-surface text-text border border-border-soft hover:border-border titanium-surface",
    ghost: "bg-transparent text-text-secondary hover:text-text hover:bg-black/[0.03]",
    danger: "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/15",
  };

  return (
    <button
      className={cn(
        "pressable inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-medium disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-[12px] border border-border-soft bg-bg-surface px-3.5 py-2.5 text-base text-text outline-none placeholder:text-text-secondary focus:border-accent/40 focus:ring-2 focus:ring-accent/15 sm:text-[15px]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full min-h-[96px] resize-y rounded-[12px] border border-border-soft bg-bg-surface px-3.5 py-2.5 text-base text-text outline-none placeholder:text-text-secondary focus:border-accent/40 focus:ring-2 focus:ring-accent/15 sm:text-[15px]",
        className,
      )}
      {...props}
    />
  );
}

export function Surface({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-[var(--radius)] titanium-surface p-5", className)}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "accent";
}) {
  const tones = {
    neutral: "bg-bg-elevated text-text-secondary border-border-soft",
    warn: "bg-[#fff4e5] text-[#9a6700] border-[#f0d9a8]",
    accent: "bg-accent-soft text-accent border-border-soft",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-[13px] font-medium uppercase tracking-[0.08em] text-text-secondary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[32px] font-semibold tracking-[-0.035em] text-text sm:text-[40px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[16px] leading-relaxed text-text-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-border bg-bg-surface/60 px-6 py-12 text-center">
      <h3 className="text-[18px] font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[14px] text-text-secondary">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
