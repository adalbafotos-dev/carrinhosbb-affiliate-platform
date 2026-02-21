"use client";

import { useEffect, useState } from "react";

export function AnimatedEffects() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[0] overflow-hidden">
      {/* Floating Particles and Baby Elements */}
      <div className="absolute left-[8%] bottom-[25%] float-slow opacity-[0.05]">
        {/* Pacifier Icon */}
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M8 12c0-3 2-6 4-6s4 3 4 6" />
          <path d="M12 2v4" />
          <path d="M9 2h6" />
        </svg>
      </div>

      <div className="absolute right-[12%] top-[30%] float-mid opacity-[0.04]">
        {/* Rattle Icon */}
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--brand-hot)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="7" r="5" fill="var(--brand-primary)" />
          <path d="M12 12v8" />
          <path d="M10 20h4" />
        </svg>
      </div>

      <div className="absolute left-[20%] top-[40%] float-fast opacity-[0.03]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--brand-accent)"><path d="M12 2l3 7 7-1-4 6 2 7-7-4-7 4 2-7-4-6 7 1z" /></svg>
      </div>

      <div className="absolute right-[30%] bottom-[40%] float-slow opacity-[0.02]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--brand-primary)"><circle cx="12" cy="12" r="10" /></svg>
      </div>

      <div className="absolute left-[40%] top-[80%] float-fast opacity-[0.03]">
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="var(--brand-hot)" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
      </div>

      {/* Static Decorative Circles in Background */}
      <div className="absolute -left-32 -top-32 w-96 h-96 bg-(--accent-soft) opacity-10 blur-[80px] rounded-full" />
      <div className="absolute -right-32 top-1/2 w-80 h-80 bg-(--brand-hot) opacity-10 blur-[100px] rounded-full" />
    </div>
  );
}
