"use client";

import { useEffect, useMemo, useState } from "react";

type CountdownParts = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type CountdownTimerProps = {
  targetDate?: string;
};

type ResolvedTargetDate = {
  date: Date;
  invalidInput: boolean;
};

const DEFAULT_DAYS_AHEAD = 30;

function resolveTargetDate(targetDate?: string): ResolvedTargetDate {
  if (targetDate?.trim()) {
    const parsed = new Date(targetDate);
    if (!Number.isNaN(parsed.getTime())) {
      return { date: parsed, invalidInput: false };
    }
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + DEFAULT_DAYS_AHEAD);
  return { date: fallback, invalidInput: Boolean(targetDate?.trim()) };
}

function getCountdownParts(target: Date): CountdownParts {
  const totalMs = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
  const seconds = Math.floor((totalMs / 1000) % 60);

  return { totalMs, days, hours, minutes, seconds };
}

function TimeCell({ label, value }: { label: string; value: number }) {
  const formatted = String(value).padStart(2, "0");

  return (
    <div className="min-w-[4.25rem] rounded-xl border border-amber-200 bg-white/95 px-3 py-3 text-center shadow-sm sm:min-w-[4.75rem] sm:px-4">
      <p
        key={formatted}
        className="text-2xl font-bold text-amber-900 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-50 motion-safe:duration-300 sm:text-3xl"
      >
        {formatted}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 sm:text-xs">
        {label}
      </p>
    </div>
  );
}

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const resolvedTarget = useMemo(() => resolveTargetDate(targetDate), [targetDate]);
  const [parts, setParts] = useState<CountdownParts | null>(null);

  useEffect(() => {
    const update = () => setParts(getCountdownParts(resolvedTarget.date));

    update();
    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [resolvedTarget.date]);

  if (resolvedTarget.invalidInput) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-center text-sm font-semibold text-rose-700">
        Invalid `NEXT_PUBLIC_COMING_SOON_TARGET_DATE` format. Use an ISO value
        like `2026-06-01T10:00:00Z`.
      </div>
    );
  }

  const safeParts =
    parts ?? ({ totalMs: 1, days: 0, hours: 0, minutes: 0, seconds: 0 } as CountdownParts);

  if (safeParts.totalMs <= 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
        We are live. Fresh pastries are ready.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
        Launching In
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <TimeCell label="Days" value={safeParts.days} />
        <span className="text-xl font-bold text-amber-600/80 motion-safe:animate-pulse">:</span>
        <TimeCell label="Hours" value={safeParts.hours} />
        <span className="text-xl font-bold text-amber-600/80 motion-safe:animate-pulse">:</span>
        <TimeCell label="Minutes" value={safeParts.minutes} />
        <span className="text-xl font-bold text-amber-600/80 motion-safe:animate-pulse">:</span>
        <TimeCell label="Seconds" value={safeParts.seconds} />
      </div>
    </div>
  );
}
