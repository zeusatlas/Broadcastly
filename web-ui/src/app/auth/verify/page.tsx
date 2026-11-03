import Link from "next/link";
import { ArrowLeft, ArrowRight, KeyRound } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { AuthHeading } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function OtpPage() {
  return (
    <main className="grid h-svh w-full overflow-hidden bg-[hsl(var(--brand-stone))] text-foreground lg:grid-cols-[7fr_3fr]">
      <aside aria-hidden="true" className="hidden h-full bg-[url('/otp.jpg')] bg-cover bg-center lg:block" />
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
          description="We sent a one-time verification code to your email. Enter it below to continue."
        />
        <div className="w-full space-y-5">
          <div className="space-y-3">
            <label id="otp-code-label" className="block text-center text-sm font-medium">
              6-digit verification code
            </label>
            <InputOTP
              aria-labelledby="otp-code-label"
              maxLength={6}
              pattern="^[0-9]+$"
              inputMode="numeric"
              autoComplete="one-time-code"
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
          <Button
            nativeButton={false}
            render={<Link href="/auth/login" />}
            className="h-11 w-full rounded-lg bg-[hsl(var(--brand-atlas-navy))] text-sm font-semibold text-white hover:bg-[hsl(var(--brand-steel-blue))]"
          >
            Verify code <ArrowRight size={16} />
          </Button>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Didn’t get a code?{" "}
          <button
            type="button"
            className="cursor-pointer font-semibold text-[hsl(var(--brand-atlas-navy))] hover:underline"
          >
            Resend code
          </button>
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> Back to sign in
        </Link>
        </div>
      </section>
    </main>
  );
}
