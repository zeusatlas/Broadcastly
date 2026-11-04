"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { ApiError, authApi } from "@/lib/api";
import { clearTokens, withAuthenticatedSession } from "@/lib/auth-session";

export function DashboardAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const user = await withAuthenticatedSession(async (accessToken) =>
          (await authApi.currentUser(accessToken)).data,
        );
        if (user.role !== "platform_admin") {
          clearTokens();
          router.replace("/auth/login");
          return;
        }
        if (!cancelled) {
          setError("");
          setAuthorized(true);
        }
      } catch (sessionError) {
        if (cancelled) return;
        if (sessionError instanceof ApiError && (sessionError.status === 401 || sessionError.status === 403)) {
          clearTokens();
          router.replace("/auth/login");
          return;
        }
        setError(sessionError instanceof Error ? sessionError.message : "Unable to verify your session.");
      }
    }

    void checkSession();
    return () => { cancelled = true; };
  }, [attempt, router]);

  if (!authorized) {
    return (
      <main className="grid min-h-svh place-items-center bg-[hsl(var(--brand-stone))] p-6 text-foreground">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <BrandMark />
          {error ? (
            <>
              <p role="alert" className="text-sm text-muted-foreground">{error}</p>
              <Button type="button" variant="outline" onClick={() => { setError(""); setAttempt((value) => value + 1); }}>Try again</Button>
            </>
          ) : (
            <p role="status" className="text-sm text-muted-foreground">Checking your session…</p>
          )}
        </div>
      </main>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
