import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/phone-number-input";

export function Login2() {
  return (
    <main className="h-svh w-full overflow-hidden bg-card text-foreground">
      <div className="grid h-full min-h-0 w-full md:grid-cols-[.8fr_1.2fr] lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative order-2 flex h-full min-h-0 flex-col justify-center bg-card px-6 py-4 sm:px-10 md:px-8 lg:px-12 xl:px-16">
          <div className="absolute left-6 right-6 top-5 flex items-center justify-between sm:left-10 sm:right-10 md:left-8 md:right-8 md:top-7">
            <BrandMark />
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to website <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="mx-auto w-full max-w-[390px] py-8 md:py-4">
            <p className="text-center text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--accent-emphasis))] md:text-left">
              Broadcastly workspace
            </p>
            <h1 className="mt-2 text-center font-[family-name:var(--font-manrope)] text-3xl font-bold tracking-[-.055em] sm:text-[34px] md:text-left">
              Sign in
            </h1>
            <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground md:text-left">
              Welcome back. Enter your details to continue.
            </p>

            <div className="my-4 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[.12em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              Secure sign in
              <span className="h-px flex-1 bg-border" />
            </div>

            <Card className="gap-0 rounded-none border-0 bg-transparent p-0 shadow-none">
              <div className="space-y-4">
                <label className="block space-y-2 text-sm font-medium">
                  Email address
                  <Input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    required
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium">
                  Phone number
                  <PhoneNumberInput />
                </label>
                <Button
                  type="button"
                  className="h-11 w-full rounded-lg bg-[hsl(var(--brand-atlas-navy))] text-sm font-semibold text-white hover:bg-[hsl(var(--brand-steel-blue))]"
                >
                  Sign in <ArrowRight size={16} />
                </Button>
              </div>
            </Card>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Need help accessing your account?{" "}
              <Link
                href="mailto:hello@broadcastly.app"
                className="font-semibold text-foreground hover:underline"
              >
                Contact support
              </Link>
            </p>
          </div>
        </section>

        <aside
          aria-hidden="true"
          className="order-1 hidden h-full min-h-0 bg-[hsl(var(--brand-atlas-navy))] bg-[url('/login.jpg')] bg-cover bg-center md:block"
        />
      </div>
    </main>
  );
}
