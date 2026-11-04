"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ApiError, authApi } from "@/lib/api";
import { clearTokens, readTokens, saveTokens } from "@/lib/auth-session";

async function refreshSession(refreshToken: string) {
  const response = await authApi.refresh(refreshToken);
  saveTokens(response.data);
  return response.data.accessToken;
}

export function DashboardAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      const tokens = readTokens();
      if (!tokens.accessToken && !tokens.refreshToken) {
        router.replace("/auth/login");
        return;
      }

      try {
        let accessToken = tokens.accessToken;
        if (!accessToken && tokens.refreshToken) {
          accessToken = await refreshSession(tokens.refreshToken);
        }

        let user;
        try {
          user = (await authApi.currentUser(accessToken!)).data;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401 || !tokens.refreshToken) throw error;
          accessToken = await refreshSession(tokens.refreshToken);
          user = (await authApi.currentUser(accessToken)).data;
        }

        if (user.role !== "platform_admin") throw new Error("This account cannot access the admin dashboard.");
        if (!cancelled) setAuthorized(true);
      } catch {
        clearTokens();
        if (!cancelled) router.replace("/auth/login");
      }
    }

    void checkSession();
    return () => { cancelled = true; };
  }, [router]);

  if (!authorized) {
    return (
      <main className="grid min-h-svh place-items-center bg-[hsl(var(--brand-stone))] p-6 text-foreground">
        <div className="flex flex-col items-center gap-4">
          <BrandMark />
          <p role="status" className="text-sm text-muted-foreground">Checking your session…</p>
        </div>
      </main>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
