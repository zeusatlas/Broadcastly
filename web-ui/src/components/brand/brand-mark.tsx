import Link from "next/link";

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/#top"
      data-gsap="brand"
      aria-label="Broadcastly home"
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-[17px] font-bold tracking-[-.055em] no-underline sm:gap-2.5 sm:text-[19px] ${
        light ? "text-white" : "text-foreground"
      }`}
    >
      <span aria-hidden="true" className="inline-flex h-6 w-6 items-end gap-[3px]">
        <i className="h-[13px] w-[6px] rounded-t bg-[hsl(var(--brand-heritage-gold))] opacity-70" />
        <i className="h-5 w-[6px] rounded-t bg-[hsl(var(--brand-heritage-gold))]" />
        <i className="h-4 w-[6px] rounded-t bg-[hsl(var(--brand-heritage-gold))] opacity-85" />
      </span>
      broadcastly
    </Link>
  );
}