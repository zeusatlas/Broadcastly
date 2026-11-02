"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const links = [
  ["Platform", "platform"],
  ["How it works", "how-it-works"],
  ["FAQs", "faq"],
] as const;

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on Escape key press or click outside
  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/70 bg-[hsl(var(--brand-stone)/.92)] backdrop-blur-xl transition-[height] duration-200 h-[58px] md:h-[88px] lg:h-[69px]">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-full w-[calc(100%-32px)] md:w-[min(1200px,calc(100%-64px))] items-center justify-between gap-4"
      >
        {/* Brand logo */}
        <div className="flex items-center shrink-0">
          <BrandMark />
        </div>

        {/* Center Floating Pill Menu (Desktop & Tablet) */}
        <div className="hidden md:flex items-center justify-center gap-1 rounded-[48px] bg-white px-2.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.06]">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={`#${href}`}
              data-gsap="nav-link"
              className="inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium text-[#444444] transition-colors hover:bg-[hsl(var(--brand-stone))] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-atlas-navy))]"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 lg:gap-5 shrink-0">
          <Link
            href="#contact"
            data-gsap="nav-action"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--brand-atlas-navy))] px-4 text-xs font-semibold text-white transition-colors hover:bg-[hsl(var(--brand-steel-blue))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-atlas-navy))] focus-visible:ring-offset-2 md:px-5 md:text-sm shrink-0"
          >
            <span>Get started</span>
            <ArrowUpRight size={15} />
          </Link>

          {/* Mobile Menu Trigger & Panel (Mobile only) */}
          <div ref={menuRef} className="relative md:hidden">
            <button
              type="button"
              aria-label={
                mobileMenuOpen
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-panel"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="grid size-11 place-items-center rounded-full border border-black/10 bg-white text-foreground transition-colors hover:bg-[hsl(var(--brand-warning-amber))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-atlas-navy))]"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {mobileMenuOpen && (
              <div
                id="mobile-nav-panel"
                role="dialog"
                aria-label="Mobile navigation"
                className="absolute right-0 top-[calc(100%+12px)] z-50 flex w-[min(280px,calc(100vw-32px))] flex-col gap-1 rounded-2xl border border-border bg-white p-3 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex flex-col gap-1">
                  {links.map(([label, href]) => (
                    <Link
                      key={href}
                      href={`#${href}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex h-11 items-center justify-between rounded-xl px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-[hsl(var(--brand-stone))]"
                    >
                      <span>{label}</span>
                      <ArrowRight size={15} className="text-muted-foreground" />
                    </Link>
                  ))}
                  <Link
                    href="#how-it-works"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-11 items-center justify-between rounded-xl px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-[hsl(var(--brand-stone))]"
                  >
                    <span>For executives</span>
                    <ArrowRight size={15} className="text-muted-foreground" />
                  </Link>
                </div>

                <div className="mt-2 border-t border-border pt-2">
                  <Link
                    href="#contact"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--brand-atlas-navy))] px-4 text-sm font-semibold text-white transition-colors hover:bg-[hsl(var(--brand-steel-blue))]"
                  >
                    <span>Get started</span>
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
