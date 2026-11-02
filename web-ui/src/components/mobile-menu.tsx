"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileMenu({ links }: { links: readonly (readonly [string, string])[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative col-start-3 row-start-1 justify-self-end md:hidden">
      <button
        type="button"
        aria-label="Toggle navigation menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="grid size-[34px] cursor-pointer place-items-center rounded-full bg-white text-foreground transition-colors hover:bg-[hsl(var(--brand-warning-amber))]"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div
          id="mobile-menu"
          className="absolute right-0 top-[calc(100%+8px)] z-40 flex w-[min(220px,calc(100vw-32px))] flex-col gap-1 rounded-2xl border border-border bg-white p-2 shadow-xl"
        >
          {links.map(([label, href]) => (
            <Button
              key={href}
              nativeButton={false}
              variant="ghost"
              render={<Link href={`#${href}`} onClick={() => setOpen(false)} />}
              className="h-10 w-full justify-start rounded-xl px-3 text-sm text-foreground"
            >
              {label}
              <ArrowRight className="ml-auto" size={14} />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}