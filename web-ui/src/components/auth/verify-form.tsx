"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { AuthHeading } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ApiError, authApi } from "@/lib/api";
import {
  clearChallenge,
  clearTokens,
  readChallenge,
  saveTokens,
} from "@/lib/auth-session";
import { toast } from "sonner";

export function VerifyForm() {
  const router = useRouter();
  const [maskedPhone, setMaskedPhone] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendIn, setResendIn] = useState(60);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const challenge = readChallenge();
      if (!challenge.challengeId || !challenge.maskedPhone) {
        router.replace("/auth/login");
        return;
      }
      setChallengeId(challenge.challengeId);
      setMaskedPhone(challenge.maskedPhone);
      setIsReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(
      () => setResendIn((value) => value - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== 6)
      return toast.error("Enter the 6 digit code we sent you.");
    setError("");
    setIsSubmitting(true);
    try {
      const response = await authApi.verifyCode(challengeId, code);
      if (response.data.user.role !== "platform_admin") {
        clearChallenge();
        toast.error(
          "This web dashboard is available to platform administrators only.",
        );
      }
      saveTokens(response.data.tokens);
      clearChallenge();
      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      if (submitError instanceof ApiError) setError(submitError.message);
      else
        setError(
          submitError instanceof Error
            ? submitError.message
            : "We couldn't verify that code.",
        );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendCode() {
    if (resendIn > 0 || isResending) return;
    setError("");
    setIsResending(true);
    try {
      const response = await authApi.resendCode(challengeId);
      setResendIn(response.data.resendIn || 60);
      toast.success("New code has been sent");
      setCode("");
    } catch (submitError) {
      if (submitError instanceof ApiError) toast.error(submitError.message);
      else
        toast.error(
          submitError instanceof Error
            ? submitError.message
            : "Unable to resend the code.",
        );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="grid h-svh w-full overflow-hidden bg-[hsl(var(--brand-stone))] text-foreground lg:grid-cols-[7fr_3fr]">
      <aside
        aria-hidden="true"
        className="hidden h-full bg-[url('/otp.jpg')] bg-cover bg-center lg:block"
      />
      <section className="relative flex h-full min-h-0 flex-col items-center justify-center px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="absolute left-5 top-6 sm:left-8 sm:top-8">
          <BrandMark />
        </div>
        <div className="flex w-full max-w-[440px] flex-col items-center text-center">
          <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-[hsl(var(--brand-warning-amber)/.22)] text-[hsl(var(--brand-atlas-navy))]">
            <KeyRound size={22} />
          </div>
          <AuthHeading
            eyebrow="Verify your identity"
            title="Enter your code"
            description={
              maskedPhone
                ? `We sent a one-time verification code to ${maskedPhone}. Enter it below to continue.`
                : "Checking your sign inâ€¦"
            }
          />
          <form onSubmit={verifyCode} className="w-full space-y-5">
            <div className="space-y-3">
              <label
                id="otp-code-label"
                className="block text-center text-sm font-medium"
              >
                6-digit verification code
              </label>
              <InputOTP
                aria-labelledby="otp-code-label"
                maxLength={6}
                pattern="^[0-9]+$"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(value) => setCode(value.replace(/\D/g, ""))}
                containerClassName="w-full justify-center"
              >
                <InputOTPGroup className="gap-1.5 rounded-none sm:gap-2">
                  {Array.from({ length: 6 }, (_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="!size-8 !rounded-md !border !bg-background text-base font-semibold sm:!size-10 sm:!rounded-lg sm:text-lg"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            {error ? (
              <p role="alert" className="text-left text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={!isReady || isSubmitting || code.length !== 6}
              className="h-11 w-full rounded-lg bg-[hsl(var(--brand-atlas-navy))] text-sm font-semibold text-white hover:bg-[hsl(var(--brand-steel-blue))]"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Verify code"
              )}{" "}
              <ArrowRight size={16} />
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Didnâ€™t get a code?{" "}
            <button
              type="button"
              onClick={resendCode}
              disabled={!isReady || resendIn > 0 || isResending}
              className="cursor-pointer font-semibold text-[hsl(var(--brand-atlas-navy))] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResending
                ? "Sendingâ€¦"
                : resendIn > 0
                  ? `Resend in ${resendIn}s`
                  : "Resend code"}
            </button>
          </p>
          <Link
            href="/auth/login"
            onClick={() => {
              clearChallenge();
              clearTokens();
            }}
            className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
