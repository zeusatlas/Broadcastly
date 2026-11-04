import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface DashboardBreadcrumbItem {
  label: string;
  href?: string;
}

export function DashboardBreadcrumbs({ items }: { items: DashboardBreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
          {index > 0 ? <ChevronRight size={13} aria-hidden="true" className="shrink-0" /> : null}
          {item.href ? (
            <Link href={item.href} className="truncate transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="truncate font-medium text-foreground">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
