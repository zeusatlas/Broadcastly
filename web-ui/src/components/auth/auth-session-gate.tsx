"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { restorePlatformAdminSession } from "@/lib/auth-session";

export function AuthSessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkedPath, setCheckedPath] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void restorePlatformAdminSession().then((isAuthenticated) => {
      if (!active) return;
      if (isAuthenticated) {
        router.replace("/dashboard");
      } else {
        setCheckedPath(pathname);
      }
    });
    return () => { active = false; };
  }, [pathname, router]);

  if (checkedPath !== pathname) {
    return (
      <main className="grid min-h-svh place-items-center bg-[hsl(var(--brand-stone))] p-6 text-foreground">
        <div className="flex flex-col items-center gap-4">
          <BrandMark />
          <p role="status" className="text-sm text-muted-foreground">Checking your session…</p>
        </div>
      </main>
    );
  }

  return children;
}
