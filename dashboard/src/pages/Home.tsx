import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Database, Eye, Hand, Workflow } from "lucide-react";
import Navigation from "@/components/Navigation";
import FooterSection from "@/components/FooterSection";
import { buildAuthPath } from "@/lib/authLinks";

type ProductCard = {
  name: string;
  badge: string;
  badgeTone: string;
  description: string;
  cta: string;
  to: string;
  Icon: typeof Database;
  iconTone: string;
};

type CustomerResult = {
  metric: string;
  company: string;
  detail: string;
  tone: string;
  label: string;
};

const PRODUCT_CARDS: ProductCard[] = [
  {
    name: "RoboDataHub",
    badge: "Core Platform",
    badgeTone: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    description:
      "EGO + EXO datasets across automotive, warehouse, data center, and dexterity.",
    cta: "See solution",
    to: "/product#robodatahub",
    Icon: Database,
    iconTone: "border-primary/20 bg-primary/10 text-primary",
  },
  {
    name: "RoboEyeView",
    badge: "Patented IP",
    badgeTone: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    description: "EXO to EGO view synthesis. 85% to 95%+ accuracy.",
    cta: "See solution",
    to: "/product#roboeyeview",
    Icon: Eye,
    iconTone: "border-blue-400/20 bg-blue-400/10 text-blue-300",
  },
  {
    name: "RoboHandMotion",
    badge: "Patented IP",
    badgeTone: "border-violet-400/25 bg-violet-400/10 text-violet-300",
    description:
      "Hand, tool, and object interaction data for humanoid and dexterous training.",
    cta: "Learn more",
    to: "/product#robohandmotion",
    Icon: Hand,
    iconTone: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  },
  {
    name: "RoboTaskManipulator",
    badge: "Task Intelligence",
    badgeTone: "border-orange-400/25 bg-orange-400/10 text-orange-300",
    description:
      "Assembly, pick-place, and cabling workflows. 95% precision at Peer Robotics.",
    cta: "See case study",
    to: "/product#robotaskmanipulator",
    Icon: Workflow,
    iconTone: "border-orange-400/20 bg-orange-400/10 text-orange-300",
  },
];

const CUSTOMER_RESULTS: CustomerResult[] = [
  {
    metric: "3.8x",
    company: "Figure AI",
    detail:
      "Faster model convergence on manipulation tasks using RoboDataHub dexterous sequences vs. in-house collection.",
    tone: "bg-primary/8 text-primary border-primary/15",
    label: "Humanoid",
  },
  {
    metric: "60%",
    company: "BMW Robotics",
    detail:
      "Reduction in labeling cost for production-line vision models using RoboEyeView EGO synthesis pipeline.",
    tone: "bg-violet-400/8 text-violet-300 border-violet-400/15",
    label: "Automotive",
  },
  {
    metric: "99.1%",
    company: "Foxconn Smart Factory",
    detail:
      "Label accuracy on rack-navigation sequences, exceeding internal baseline by 4.7 percentage points.",
    tone: "bg-emerald-400/8 text-emerald-300 border-emerald-400/15",
    label: "Data Center",
  },
];

const TRUSTED_BY = [
  "NVIDIA",
  "BMW Group",
  "Figure AI",
  "Boston Dynamics",
  "Foxconn",
  "Waymo",
  "1X Technologies",
];

export default function Home() {
  const productsRef = useRef<HTMLElement | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-[88px]">
        <section className="hero-gradient-animate relative isolate min-h-[calc(100vh-88px)] overflow-hidden px-4 sm:px-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_40%,rgba(29,233,182,0.07),transparent_70%),radial-gradient(ellipse_40%_40%_at_80%_70%,rgba(30,136,229,0.05),transparent_60%)]" />
          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-[1440px] items-center justify-center py-20">
            <div className="max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/7 px-5 py-2 text-xs font-semibold tracking-[0.08em] text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_rgba(29,233,182,0.9)]" />
                NVIDIA Inception Member - 2026
              </div>

              <h1 className="mt-8 font-sans-tech text-[clamp(3rem,7vw,5rem)] font-black leading-none tracking-[-0.05em] text-white">
                The Sim-to-Real Gap
                <br />
                is{" "}
                <span className="bg-gradient-to-r from-primary to-[#1e88e5] bg-clip-text text-transparent">
                  Costing You.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/45 sm:text-lg">
                Robots fail in production because training data doesn&apos;t match the real
                world. Simulation gets you 85%.
              </p>

              <p className="mt-6 font-sans-tech text-[clamp(3rem,7vw,5rem)] font-black leading-none tracking-[-0.05em] text-white">
                DataraAI <span className="text-primary">closes the gap.</span>
              </p>

              <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                The complete data stack for Physical AI. Humanoid. Automotive. Warehouse. Data
                Center.
              </p>

              <div className="mt-11 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => productsRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex h-14 items-center justify-center rounded-full bg-primary px-8 text-sm font-extrabold text-primary-foreground shadow-[0_14px_32px_rgba(29,233,182,0.22)] transition-opacity hover:opacity-90"
                >
                  See How It Works
                </button>
                <Link
                  to={buildAuthPath("register", "/viewer")}
                  className="inline-flex h-14 items-center justify-center rounded-full border border-white/18 bg-white/5 px-8 text-sm font-bold text-foreground transition-colors hover:border-white/35 hover:bg-white/8"
                >
                  Get Access
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          id="products"
          ref={productsRef}
          className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 md:py-20"
        >
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-[4px] bg-primary shadow-[0_0_12px_rgba(29,233,182,0.5)]" />
              <div className="text-2xl font-extrabold text-white">Products</div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Four products. Full Physical AI data stack.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {PRODUCT_CARDS.map((card) => (
              <Link
                key={card.name}
                to={card.to}
                className={`group rounded-[24px] border border-white/6 bg-[#0d1014] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 ${
                  card.name === "RoboDataHub"
                    ? "bg-[linear-gradient(135deg,rgba(29,233,182,0.06),rgba(29,233,182,0.02))]"
                    : ""
                }`}
              >
                <div
                  className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${card.iconTone}`}
                >
                  <card.Icon className="h-5 w-5" />
                </div>
                <div
                  className={`inline-flex rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${card.badgeTone}`}
                >
                  {card.badge}
                </div>
                <div className="mt-4 text-lg font-extrabold text-white">{card.name}</div>
                <p className="mt-3 min-h-[72px] text-sm leading-6 text-muted-foreground">
                  {card.description}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
                  {card.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="customers" className="border-y border-white/6 bg-[#040608]">
          <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 md:py-20">
            <div className="mb-10">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-[4px] bg-[#1e88e5] shadow-[0_0_12px_rgba(30,136,229,0.5)]" />
                <div className="text-2xl font-extrabold text-white">Customers</div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Measurable outcomes from production deployments across robotics verticals.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {CUSTOMER_RESULTS.map((result) => (
                <div
                  key={result.company}
                  className="rounded-[24px] border border-white/6 bg-[#0d1014] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
                >
                  <div className="text-5xl font-black leading-none tracking-[-0.05em] text-primary">
                    {result.metric}
                  </div>
                  <div className="mt-3 text-base font-bold text-white">{result.company}</div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.detail}</p>
                  <div
                    className={`mt-5 inline-flex rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${result.tone}`}
                  >
                    {result.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/6 bg-[#040608]">
          <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-4 px-4 py-8 text-center sm:px-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Trusted by teams at
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-bold text-muted-foreground">
              {TRUSTED_BY.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(135deg,#050e0a_0%,#060c14_50%,#04080f_100%)] px-4 py-16 text-center sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-[clamp(1.75rem,2.6vw,2.25rem)] font-extrabold tracking-tight text-white">
              Ready to close the Sim-to-Real gap?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Join leading robotics companies using DataraAI&apos;s real-world data to achieve
              95%+ precision.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={buildAuthPath("register", "/viewer")}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground"
              >
                Get Access
              </Link>
              <Link
                to="/viewer"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/12 px-6 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Explore RoboDataHub
              </Link>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
