import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  FileSpreadsheet,
  Landmark,
  LockKeyhole,
  Megaphone,
  UsersRound,
} from "lucide-react";
import { LandingMotion } from "@/components/landing-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { Footer2 } from "@/components/footer2";
import { BrandMark } from "@/components/brand-mark";

const features = [
  {
    icon: Landmark,
    title: "Your structure, clearly mapped",
    copy: "Organise teams, departments and work groups. Keep roles and access connected to each part of your organisation.",
  },
  {
    icon: FileSpreadsheet,
    title: "A member directory you can trust",
    copy: "Add people or import Excel and CSV files. Preview validation, check phone numbers and review duplicates before saving.",
  },
  {
    icon: Megaphone,
    title: "Official SMS, with oversight",
    copy: "Choose eligible recipients, review segment and credit estimates, and follow the configured approval process.",
  },
];
const steps = [
  {
    title: "Prepare the broadcast",
    copy: "Write a message or choose a reusable template. Select a recipient group within your scope.",
  },
  {
    title: "Review before sending",
    copy: "Check the audience, segment estimate and credit cost. Request approval when the rules require it.",
  },
  {
    title: "Follow the outcome",
    copy: "Review provider-reported delivery states, broadcast history and reconciled credit usage.",
  },
];
const faqs = [
  { question: "Who is Broadcastly for?", answer: "Broadcastly is designed for teams and organisations that need a clear way to manage people, coordinate updates and send accountable bulk SMS." },
  { question: "Can we organise people into teams?", answer: "Yes. Create a structure that reflects your organisation, assign roles and keep access aligned with each person’s responsibilities and scope." },
  { question: "How does message approval work?", answer: "Before a broadcast is sent, eligible recipients, message segments and estimated credit costs can be reviewed. Broadcasts can follow the configured approval process." },
  { question: "Can we track delivery and SMS usage?", answer: "Broadcast history brings provider-reported delivery states together with credit estimates and reconciled usage, giving your team a clear record of activity." },
];
const eyebrow =
  "text-[11px] font-semibold uppercase tracking-[.12em] text-foreground/60";
const display =
  "font-[family-name:var(--font-manrope)] font-extrabold uppercase leading-[.92] tracking-[-.06em] text-foreground";
const editorialDisplay =
  "font-[family-name:var(--font-manrope)] font-bold leading-[.98] tracking-[-.055em] text-foreground";
const primaryButton =
  "!h-11 !rounded-lg !border-[hsl(var(--brand-atlas-navy))] !bg-[hsl(var(--brand-atlas-navy))] !px-5 !font-semibold !text-white hover:!bg-[hsl(var(--brand-steel-blue))]";
const sectionWidth =
  "mx-auto w-[min(1200px,calc(100%-40px))] md:w-[min(1200px,calc(100%-64px))]";

function ProductPreview() {
  return (
    <div
      className="relative w-full max-w-[450px] justify-self-center pt-2"
      role="img"
      aria-label="Concept preview of the Broadcastly mobile app"
    >
      <div
        data-gsap="phone"
        className="mx-auto w-[min(300px,70vw)] rotate-[4deg] rounded-[38px] border-[7px] border-white/60 bg-[hsl(var(--brand-steel-blue))] p-2.5 shadow-xl shadow-[hsl(var(--brand-midnight)/.14)]"
      >
        <div className="relative min-h-[510px] overflow-hidden rounded-[29px] bg-[hsl(var(--brand-midnight))] px-4 pb-16 pt-3 text-white">
          <div className="flex justify-between text-[9px] font-semibold">
            <span>9:41</span>
            <span>â— â— â—</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <BrandMark light />
            <span className="grid size-8 place-items-center rounded-full bg-white/10 text-[9px]">
              CE
            </span>
          </div>
          <div className="mt-8">
            <p className="text-[8px] font-semibold tracking-[.14em] text-white/55">
              TEAM WORKSPACE
            </p>
            <h3 className="mt-2 text-[27px] font-light tracking-[-.05em]">
              Good morning.
            </h3>
            <p className="mt-1 text-[9px] text-white/60">
              Keep your people in the loop.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between rounded-xl bg-[hsl(var(--brand-steel-blue)/.44)] p-3">
            <div className="grid gap-2">
              <span className="text-[8px] tracking-widest text-white/60">
                SMS CREDITS
              </span>
              <strong className="text-[11px] font-medium">
                Available balance
              </strong>
            </div>
            <ArrowUpRight size={16} />
          </div>
          <div className="mb-2 mt-6 flex items-center justify-between text-[10px]">
            <strong>Recent broadcasts</strong>
            <span className="text-[8px] text-white/55">View all</span>
          </div>
          {[
            {
              Icon: Megaphone,
              title: "Team meeting update",
              state: "Needs approval",
            },
            {
              Icon: UsersRound,
              title: "Project group notice",
              state: "Scheduled",
            },
          ].map(({ Icon, title, state }, i) => (
            <div
              key={title}
              className="grid grid-cols-[31px_1fr_16px] items-center gap-2 border-t border-white/10 py-3 text-white/65"
            >
              <i
                className={`grid size-[29px] place-items-center rounded-lg ${i ? "bg-[hsl(var(--brand-steel-blue))]" : "bg-[hsl(var(--brand-heritage-gold)/.2)] text-[hsl(var(--brand-warning-amber))]"}`}
              >
                <Icon size={15} />
              </i>
              <div>
                <strong className="block text-[9px] font-medium text-white">
                  {title}
                </strong>
                <span className="mt-1 block text-[8px] text-white/55">
                  {state}
                </span>
              </div>
              <ArrowRight size={14} />
            </div>
          ))}
          <div className="absolute inset-x-0 bottom-0 flex justify-around border-t border-white/10 bg-[hsl(var(--brand-midnight))] px-1 py-3 text-[7px] text-white/60">
            {[
              [Landmark, "Home"],
              [UsersRound, "Members"],
              [Megaphone, "Broadcast"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Landmark;
              return (
                <span
                  key={String(label)}
                  className="grid justify-items-center gap-1"
                >
                  <I size={15} />
                  {String(label)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mx-auto mt-4 flex max-w-[290px] justify-between text-[8px] tracking-[.1em] text-muted-foreground">
        <span>EXECUTIVE MOBILE APP</span>
        <span>Concept preview</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div
      id="top"
      className="overflow-x-clip bg-[hsl(var(--brand-stone))] text-[hsl(var(--brand-ink))]"
    >
      <LandingMotion />
      <SiteHeader />
      <main>
        <section
          aria-labelledby="hero-title"
          className="mx-auto grid min-h-[540px] max-w-[1200px] grid-cols-1 items-center gap-3 px-5 py-10 md:min-h-[580px] md:grid-cols-[1.05fr_.95fr] md:gap-[52px] md:px-8 md:py-6"
        >
          <div className="flex max-w-[620px] flex-col items-start md:pb-4">
            <h1
              id="hero-title"
              data-gsap="hero-title"
              className={`${display} mt-6 max-w-[660px] text-[clamp(46px,13vw,70px)] md:text-[clamp(50px,7vw,92px)]`}
            >
              Organise your
              <br />
              team.
              <br />
              <em className="not-italic text-[hsl(var(--brand-atlas-navy))]">
                Communicate clearly.
              </em>
            </h1>
            <p
              data-gsap="hero-body"
              className="mt-6 max-w-[500px] text-sm leading-relaxed text-muted-foreground md:text-base"
            >
              Bring people, group updates and approved bulk SMS together in one
              clear, accountable workflow.
            </p>
            <div
              data-gsap="hero-body"
              className="mt-6 flex w-full flex-col flex-wrap gap-3 sm:w-auto sm:flex-row"
            >
              <Button
                nativeButton={false}
                size="lg"
                render={<Link href="#how-it-works" />}
                className={primaryButton}
              >
                Explore the platform <ArrowRight size={16} />
              </Button>
              <Button
                nativeButton={false}
                variant="outline"
                size="lg"
                render={<Link href="#platform" />}
                className="!h-11 !rounded-lg !border-[1.5px] !border-foreground !bg-transparent !px-5 font-semibold text-foreground hover:!bg-foreground/5"
              >
                See what you can do <ArrowDown size={15} />
              </Button>
            </div>
            <p
              data-gsap="hero-body"
              className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"
            >
              <LockKeyhole
                size={14}
                className="text-[hsl(var(--accent-emphasis))]"
              />
              Access follows appointments, permissions and scope
            </p>
          </div>
          <ProductPreview />
        </section>

        <section id="platform" className={`${sectionWidth} pb-16 md:pb-[90px]`}>
          <div
            data-gsap="reveal"
            className="mb-8 flex flex-col items-center gap-4 text-center md:mb-[30px]"
          >
            <div>
              <p className={`${eyebrow} mb-4`}>The tools your team needs</p>
              <h2 className={`${editorialDisplay} text-[clamp(42px,6vw,72px)]`}>
                Organisation to
                <br />
                <em className="not-italic text-[hsl(var(--brand-atlas-navy))]">
                  official outreach.
                </em>
              </h2>
            </div>
            <p className="max-w-[540px] text-center text-sm leading-relaxed text-muted-foreground">
              A role-aware workspace for teams and organisations, with people
              management and accountable bulk SMS at its core.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
            {features.map(({ icon: Icon, title, copy }) => (
              <Card
                key={title}
                data-gsap="benefit"
                className="min-h-[220px] rounded-[28px] border-0 bg-card p-6 text-foreground shadow-none md:min-h-[260px]"
              >
                <div className="grid size-[38px] place-items-center rounded-lg bg-[hsl(var(--brand-warning-amber)/.23)] text-[hsl(var(--brand-atlas-navy))]">
                  <Icon size={20} strokeWidth={1.7} />
                </div>
                <h3 className="mb-2 mt-6 font-[family-name:var(--font-manrope)] text-lg font-bold uppercase leading-tight tracking-[-.04em]">
                  {title}
                </h3>
                <p className="max-w-[290px] text-[13px] leading-relaxed text-muted-foreground">
                  {copy}
                </p>
                <Button
                  nativeButton={false}
                  variant="ghost"
                  size="icon"
                  render={<Link href="#how-it-works" />}
                  aria-label={`Learn more about ${title}`}
                  className="absolute bottom-5 right-5 grid size-[34px] place-items-center rounded-full bg-[hsl(var(--brand-stone))] text-foreground hover:bg-[hsl(var(--brand-warning-amber))]"
                >
                  <ArrowUpRight size={17} />
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-[hsl(var(--brand-atlas-navy))] px-5 py-16 text-white md:px-8 md:py-20">
          <div data-gsap="reveal" className="mx-auto max-w-[760px] text-center">
            <p className={`${eyebrow} text-[hsl(var(--brand-warning-amber))]`}>
              Made for executive teams
            </p>
            <h2
              className={`${editorialDisplay} mt-5 text-[clamp(45px,7vw,82px)] text-white`}
            >
              Every send.
              <br />
              <em className="not-italic">Accounted for.</em>
            </h2>
            <p className="mx-auto mt-5 max-w-[600px] text-base leading-relaxed text-white/80">
              See who a broadcast is for, what it is expected to cost, whether
              it needs approval and what the SMS provider reports back.
            </p>
            <div className="mx-auto mt-7 flex w-fit flex-col gap-3 text-left text-xs text-white/90">
              {[
                "Scope-aware recipient selection",
                "Approval workflow when required",
                "Delivery reporting and history",
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check
                    size={14}
                    className="text-[hsl(var(--brand-warning-amber))]"
                  />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section
          data-gsap="reveal"
          aria-labelledby="scope-title"
          className="grid grid-cols-1 items-center gap-6 bg-card px-5 py-14 md:grid-cols-[.95fr_1.05fr] md:gap-[9%] md:px-[max(32px,calc((100vw-1200px)/2))] md:py-20"
        >
          <div className="max-w-[460px]">
            <p className={`${eyebrow} mb-4`}>Access with accountability</p>
            <h2
              id="scope-title"
              className={`${editorialDisplay} text-[clamp(42px,6vw,70px)]`}
            >
              Authority follows
              <br />
              <em className="not-italic text-[hsl(var(--brand-atlas-navy))]">
                responsibility.
              </em>
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Titles alone donâ€™t unlock access. Assigned roles, permissions
              and team scope determine what each person can manage.
            </p>
          </div>
          <div className="border-t border-border">
            {[
              "Keep role assignments and their history connected to each team.",
              "Keep people records, recipients and reports within each userâ€™s permitted scope.",
              "Retain an audit trail of approvals, broadcasts and credit transactions.",
            ].map((text, i) => (
              <div
                key={text}
                data-gsap="scope-point"
                className="grid grid-cols-[34px_1fr] gap-3 border-b border-border py-4"
              >
                <span className="pt-0.5 text-[10px] font-bold text-[hsl(var(--accent-emphasis))]">
                  0{i + 1}
                </span>
                <p className="m-0 text-xs leading-relaxed text-foreground/85">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className={`${sectionWidth} grid grid-cols-1 gap-6 border-t border-border py-16 md:grid-cols-[.85fr_1.15fr] md:gap-[10%] md:py-[90px]`}
        >
          <div data-gsap="reveal" className="text-center md:text-left">
            <p className={`${eyebrow} mb-4`}>Official SMS, with oversight</p>
            <h2 className={`${editorialDisplay} text-[clamp(45px,6.5vw,80px)]`}>
              From draft
              <br />
              to{" "}
              <em className="not-italic text-[hsl(var(--brand-atlas-navy))]">
                delivery report.
              </em>
            </h2>
            <p className="mx-auto mt-5 max-w-[430px] text-sm leading-relaxed text-muted-foreground md:mx-0">
              Every broadcast carries its audience, approval, cost estimate and
              outcome through the process.
            </p>
          </div>
          <div className="self-center">
            {steps.map((step, i) => (
              <article
                key={step.title}
                data-gsap="workflow-step"
                className="grid grid-cols-[35px_1fr_20px] items-center gap-x-4 border-b border-border py-5 first:border-t"
              >
                <span className="row-span-2 self-start pt-0.5 text-[10px] font-bold text-[hsl(var(--accent-emphasis))]">
                  0{i + 1}
                </span>
                <h3 className="m-0 text-sm font-bold uppercase">
                  {step.title}
                </h3>
                <p className="col-start-2 m-0 mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {step.copy}
                </p>
                <ArrowRight
                  className="col-start-3 row-span-2 row-start-1 text-muted-foreground"
                  size={17}
                />
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="bg-card px-5 py-16 md:px-8 md:py-20">
          <div data-gsap="reveal" className="mx-auto grid max-w-[1200px] gap-8 md:grid-cols-[.8fr_1.2fr] md:gap-16">
            <div>
              <p className={`${eyebrow} mb-4`}>Frequently asked questions</p>
              <h2 className={`${editorialDisplay} text-[clamp(42px,6vw,68px)]`}>Good to<br/><em className="not-italic text-[hsl(var(--brand-atlas-navy))]">know.</em></h2>
              <p className="mt-5 max-w-[360px] text-sm leading-relaxed text-muted-foreground">A few quick answers about organising teams and communicating with confidence.</p>
            </div>
            <div className="divide-y divide-border border-y border-border">
              {faqs.map(({ question, answer }, index) => <details key={question} className="group py-1" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-sm font-semibold text-foreground marker:hidden [&::-webkit-details-marker]:hidden md:text-base">{question}<span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--brand-stone))] text-lg font-normal text-foreground transition-transform group-open:rotate-45">+</span></summary>
                <p className="max-w-[620px] pb-5 pr-10 text-sm leading-relaxed text-muted-foreground">{answer}</p>
              </details>)}
            </div>
          </div>
        </section>

        <section id="contact" data-gsap="reveal" className="px-5 pb-8 pt-16 md:px-8 md:pb-12 md:pt-20">
          <div className="mx-auto max-w-[1200px] overflow-hidden rounded-[32px] bg-[hsl(var(--brand-atlas-navy))] px-6 py-9 text-white md:rounded-[40px] md:px-12 md:py-12 lg:px-16 lg:py-14">
            <div className="grid items-end gap-8 md:grid-cols-[1.2fr_.8fr] md:gap-12">
              <div>
                <p className={`${eyebrow} text-[hsl(var(--brand-warning-amber))]`}>A clearer way to communicate</p>
                <h2 className={`${editorialDisplay} mt-5 text-[clamp(42px,7vw,82px)] text-white`}>
                  Bring everyone<br/><em className="not-italic text-white/70">into the loop.</em>
                </h2>
              </div>
              <div className="max-w-[390px] pb-1">
                <p className="text-sm leading-relaxed text-white/75 md:text-base">Keep your people, permissions and important updates working together in one dependable place.</p>
                <Button nativeButton={false} size="lg" render={<Link href="#platform"/>} className={`${primaryButton} mt-6 !border-white !bg-white !text-[hsl(var(--brand-atlas-navy))] hover:!bg-[hsl(var(--brand-stone))]`}>
                  Explore the platform <ArrowRight size={16}/>
                </Button>
              </div>
            </div>
            <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-4 text-[10px] font-semibold uppercase tracking-[.12em] text-white/60 md:mt-12">
              <span>People, organised</span><span className="hidden text-[hsl(var(--brand-warning-amber))] sm:inline">•</span><span>Access, accountable</span><span className="hidden text-[hsl(var(--brand-warning-amber))] sm:inline">•</span><span>Communication, clear</span>
            </div>
          </div>
        </section>
      </main>
      <Footer2 />
    </div>
  );
}
