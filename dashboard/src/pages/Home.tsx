import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Database, Eye, Hand, Workflow, type LucideIcon } from "lucide-react";
import Navigation from "@/components/Navigation";
import FooterSection from "@/components/FooterSection";
import { buildAuthPath } from "@/lib/authLinks";
import { useAppTheme } from "@/theme/AppThemeProvider";
import pilotRoadmap from "@/assets/images/pilot-roadmap.png";
import rackManual from "@/assets/images/rack-manual.png";
import rackRobot from "@/assets/images/rack-robot.png";
import simToRealLoopDark from "@/assets/images/sim to real loop-dark.png";
import simToRealLoop from "@/assets/images/sim to real loop.png";
import solutionBefore from "@/assets/images/serverrack/solutionbefore.png";
import solutionAfter from "@/assets/images/serverrack/solutionafter.png";

type ProductCard = {
  name: string;
  badge: string;
  tagline: string;
  pills: string[];
  linkLabel: string;
  to: string;
  icon: LucideIcon;
  tone: string;
  pillTone: string;
  linkTone: string;
};

type SolutionCard = {
  kicker: string;
  title: string;
  description: string;
  bullets: string[];
  metrics: { value: string; label: string }[];
  beforeLabel: string;
  afterLabel: string;
  beforeImage: string;
  afterImage: string;
  accent: string;
  beforeTone: string;
  afterTone: string;
  beforeImageClassName?: string;
  afterImageClassName?: string;
};

type CustomerCard = {
  value: string;
  company: string;
  detail: string;
  label: string;
  valueTone: string;
  chipTone: string;
};

const HOME_SECTION_SCROLL_OFFSET = 96;

function scrollToHomeSection(target: HTMLElement | null) {
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - HOME_SECTION_SCROLL_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

const PRODUCT_CARDS: ProductCard[] = [
  {
    name: "RoboDataHub",
    badge: "Core Platform",
    tagline: "Central intelligence layer for Physical AI training data",
    pills: ["EGO + EXO labelled datasets", "4 industry verticals", "500K+ annotated sequences"],
    linkLabel: "Browse datasets",
    to: "/robodatahub",
    icon: Database,
    tone: "border-teal-200/80 border-t-4 border-t-primary",
    pillTone: "border-teal-200 bg-teal-50 text-teal-700",
    linkTone: "text-primary",
  },
  {
    name: "RoboAnnotator",
    badge: "Patented IP",
    tagline: "AI-assisted annotation platform for robot training data",
    pills: ["EXO to EGO view synthesis", "85% to 95%+ accuracy", "60% labelling cost cut"],
    linkLabel: "Learn more",
    to: "/roboannotator",
    icon: Eye,
    tone: "border-blue-200/80 border-t-4 border-t-blue-700",
    pillTone: "border-blue-200 bg-blue-50 text-blue-700",
    linkTone: "text-blue-700",
  },
  {
    name: "RoboHandMotion",
    badge: "Patented IP",
    tagline: "Precision hand & tool interaction data for dexterous robots",
    pills: ["Finger-level motion capture", "Tool + object interaction", "Dexterity-ready format"],
    linkLabel: "Learn more",
    to: "/robohandmotion",
    icon: Hand,
    tone: "border-violet-200/80 border-t-4 border-t-violet-700",
    pillTone: "border-violet-200 bg-violet-50 text-violet-700",
    linkTone: "text-violet-700",
  },
  {
    name: "RoboTaskManipulator",
    badge: "Task Intelligence",
    tagline: "Full task workflows for assembly, pick-place & cabling",
    pills: ["Assembly & pick-place data", "95% precision - Peer Robotics", "Multi-step task sequences"],
    linkLabel: "See case study",
    to: "/robotaskmanipulator",
    icon: Workflow,
    tone: "border-amber-200/80 border-t-4 border-t-amber-700",
    pillTone: "border-amber-200 bg-amber-50 text-amber-700",
    linkTone: "text-amber-700",
  },
];

const SOLUTION_CARDS: SolutionCard[] = [
  {
    kicker: "Warehouse Automation - Intralogistics",
    title: "Pellet Transport Automation",
    description:
      "Training data for robots moving loaded pellet containers across warehouse lanes, pickup points, and outbound staging zones without slowing downstream operations.",
    bullets: [
      "Detect and localize palletized pellet loads",
      "Navigate shared aisles and dynamic traffic safely",
      "Align at pickup and drop-off points with repeatable precision",
      "Track load handoff, route completion, and exceptions in real time",
    ],
    metrics: [
      { value: "2.8x", label: "More throughput" },
      { value: "41%", label: "Lower handling time" },
      { value: "99.3%", label: "Route accuracy" },
    ],
    beforeLabel: "Before - Manual Hauling",
    afterLabel: "After - Autonomous Transport",
    beforeImage: solutionBefore,
    afterImage: solutionAfter,
    accent: "text-primary",
    beforeTone: "border-red-200 bg-red-50/80 text-red-700",
    afterTone: "border-primary/20 bg-primary/10 text-primary",
  },
  {
    kicker: "Data Center - NVL72 Infrastructure",
    title: "Rack Cable Installation",
    description:
      "Training data for robots handling dense NVL72 GPU cluster cabling - power, network, and management cables across OEM/ODM rack production lines.",
    bullets: [
      "Identify correct cable type and port",
      "Align connector and insert with full seating",
      "Route and dress cables without cross-over",
      "Detect mis-seats and anomalies in real time",
    ],
    metrics: [
      { value: "60%", label: "Less rework" },
      { value: "3x", label: "Faster cycle" },
      { value: "99.1%", label: "Accuracy" },
    ],
    beforeLabel: "Before - Manual",
    afterLabel: "After - Automated",
    beforeImage:
      "https://plus.unsplash.com/premium_photo-1683134238579-a7575f7eba35?w=1200&q=88",
    afterImage:
      "https://images.unsplash.com/photo-1682559736721-c2e77ff4c650?w=1200&q=88",
    accent: "text-primary",
    beforeTone: "border-red-200 bg-red-50/80 text-red-700",
    afterTone: "border-primary/20 bg-primary/10 text-primary",
    afterImageClassName: "scale-[1.04]",
  },
  {
    kicker: "Manufacturing Automation - Rack Assembly",
    title: "Server Rack Integration",
    description:
      "End-to-end training data for robots that pick, align, and insert server sleds into rack rails - replacing a 2-person manual process with a single robot arm operating 24/7.",
    bullets: [
      "Pick sled, carry and align to rack rail",
      "Force-controlled insertion and latch verification",
      "Handle varying sled weights and positions",
      "Post-install barcode scan and QC sign-off",
    ],
    metrics: [
      { value: "2 to 1", label: "Workers replaced" },
      { value: "3x", label: "Faster insertion" },
      { value: "24/7", label: "Operation" },
    ],
    beforeLabel: "Before - 2 Workers",
    afterLabel: "After - Robot Arm",
    beforeImage: rackManual,
    afterImage: rackRobot,
    accent: "text-blue-700",
    beforeTone: "border-red-200 bg-red-50/80 text-red-700",
    afterTone: "border-primary/20 bg-primary/10 text-primary",
  },
];

const CUSTOMER_CARDS: CustomerCard[] = [
  {
    value: "3.8x",
    company: "Figure AI",
    detail:
      "Faster model convergence on manipulation tasks using RoboDataHub dexterous sequences vs. in-house collection.",
    label: "Dexterity",
    valueTone: "text-primary",
    chipTone: "border-teal-200 bg-teal-50 text-primary",
  },
  {
    value: "60%",
    company: "BMW Robotics",
    detail:
      "Reduction in labeling cost for production-line vision models using RoboAnnotator EGO synthesis pipeline.",
    label: "Automotive",
    valueTone: "text-violet-700",
    chipTone: "border-violet-200 bg-violet-50 text-violet-700",
  },
  {
    value: "99.1%",
    company: "Foxconn Smart Factory",
    detail:
      "Label accuracy on rack-navigation sequences, exceeding internal baseline by 4.7 percentage points.",
    label: "Data Center",
    valueTone: "text-blue-700",
    chipTone: "border-blue-200 bg-blue-50 text-blue-700",
  },
];

function ProductTile({ card }: { card: ProductCard }) {
  const Icon = card.icon;

  return (
    <Link
      to={card.to}
      className={`group flex h-full flex-col rounded-[22px] border bg-card px-6 pb-8 pt-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.05)] outline outline-1 outline-transparent transition-all duration-200 hover:-translate-y-1 hover:border-primary/45 hover:outline-primary/20 hover:shadow-[0_18px_42px_rgba(15,23,42,0.12)] ${card.tone}`}
    >
      <div className={`mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[20px] border ${card.pillTone}`}>
        <Icon className="h-8 w-8" />
      </div>
      <div className="mt-5 inline-flex self-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
        {card.badge}
      </div>
      <h3 className="mx-auto mt-4 max-w-full whitespace-nowrap text-center text-[24px] font-black tracking-[-0.05em] text-slate-950">
        {card.name}
      </h3>
      <p className="mt-3 text-[15px] leading-6 text-slate-500">{card.tagline}</p>
      <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200 text-left">
        {card.pills.map((pill) => (
          <span key={pill} className="flex items-center gap-3 px-1 py-3 text-[13px] font-semibold text-slate-600">
            <span className={`h-1 w-3 shrink-0 bg-current ${card.linkTone}`} />
            {pill}
          </span>
        ))}
      </div>
      <span className={`mt-6 inline-flex items-center justify-center gap-2 text-[12.5px] font-extrabold ${card.linkTone}`}>
        {card.linkLabel}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function MetricRow({ metrics }: { metrics: SolutionCard["metrics"] }) {
  return (
    <div className="flex overflow-hidden rounded-[14px] border border-slate-200 bg-slate-50">
      {metrics.map((metric, index) => (
        <div key={metric.label} className="flex flex-1 items-center justify-center">
          <div className="px-5 py-4 text-center">
            <div className="text-2xl font-black tracking-[-0.04em] text-slate-950">{metric.value}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {metric.label}
            </div>
          </div>
          {index < metrics.length - 1 && <div className="h-10 w-px bg-slate-200" />}
        </div>
      ))}
    </div>
  );
}

function HomeSectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-center gap-4 text-[18px] font-extrabold uppercase tracking-[0.18em] text-primary sm:text-xl">
      <span className="h-px w-12 bg-primary/45" />
      {children}
      <span className="h-px w-12 bg-primary/45" />
    </div>
  );
}

export default function Home() {
  const location = useLocation();
  const { isDarkMode } = useAppTheme();
  const productsRef = useRef<HTMLElement | null>(null);
  const solutionsRef = useRef<HTMLElement | null>(null);
  const customersRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!location.hash) return;

    const targetMap: Record<string, HTMLElement | null> = {
      "#products": productsRef.current,
      "#solutions": solutionsRef.current,
      "#customers": customersRef.current,
    };

    const target = targetMap[location.hash];
    if (!target) return;

    window.setTimeout(() => {
      scrollToHomeSection(target);
    }, 40);
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-[88px]">
        <section className="marketing-hero-home overflow-hidden px-4 py-10 text-center sm:px-6 md:min-h-[calc(88vh-88px)] md:py-12 lg:py-14">
          <div className="mx-auto max-w-[860px]">
            <div className="inline-flex border-y border-primary/30 px-5 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
              NVIDIA Inception Member - 2025
            </div>

            <h1 className="marketing-display-title mt-7 text-[clamp(38px,5.5vw,64px)] font-black leading-[1] tracking-[-0.045em] text-slate-950">
              The Sim-to-Real Gap
              <br />
              is <span className="bg-gradient-to-r from-primary to-blue-700 bg-clip-text text-transparent">Costing You.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-[680px] text-[22px] leading-[1.55] text-slate-500">
              Robots fail in production because training data does not match the real world.
            </p>

            <div className="marketing-display-title mt-16 text-[clamp(38px,5.5vw,64px)] font-black leading-[1] tracking-[-0.045em] text-slate-950 md:mt-20">
              DataraAI <span className="text-primary">closes the gap.</span>
            </div>
            <p className="mx-auto mt-7 max-w-[560px] text-[17px] leading-[1.7] text-slate-500">
              The complete data stack for Physical AI. Dexterity. Automotive. Warehouse. Data Center.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => scrollToHomeSection(productsRef.current)}
                className="inline-flex h-14 items-center justify-center rounded-full bg-primary px-8 text-[15px] font-extrabold text-primary-foreground shadow-[0_6px_20px_rgba(13,148,136,0.2)] transition-all hover:-translate-y-0.5 hover:opacity-90"
              >
                See How It Works
              </button>
              <Link
                to={buildAuthPath("register", "/")}
                className="inline-flex h-14 items-center justify-center rounded-full border border-slate-200 bg-card px-8 text-[15px] font-bold text-slate-700 transition-colors hover:bg-muted"
              >
                Request a Demo
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-background px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-[1300px]">
            <div className="mb-10 text-center">
              <HomeSectionLabel>End-to-End</HomeSectionLabel>
              <h2 className="marketing-display-title mt-4 text-[32px] font-black tracking-[-0.02em] text-slate-950">
                From Factory Floor to Deployed Robot — and Back Again
              </h2>
              <p className="mx-auto mt-3 max-w-[760px] text-[15px] leading-7 text-slate-500 dark:text-slate-400">
                Real factory data is transformed into simulation-ready environments, used to train robot policies at scale, and transferred to physical robots for deployment. Real-world performance then feeds back into simulation, creating a continuous cycle of improvement.
              </p>
            </div>

            <figure>
              <img
                src={isDarkMode ? simToRealLoopDark : simToRealLoop}
                alt="Continuous improvement loop between simulation model training and real-world robot deployment"
                className="mx-auto block h-auto w-full max-w-[1100px]"
              />
            </figure>
          </div>
        </section>

        <section id="products" ref={productsRef} className="scroll-mt-[104px] bg-background px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-[1300px]">
            <div className="mb-10 text-center">
              <HomeSectionLabel>Products</HomeSectionLabel>
              <h2 className="marketing-display-title mt-6 text-[36px] font-black tracking-[-0.02em] text-slate-950">
                The Full Physical AI Data Stack
              </h2>
              <p className="mx-auto mt-3 max-w-[480px] text-[15px] leading-7 text-slate-500">
                Four products built for production-grade robot training.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-4">
              {PRODUCT_CARDS.map((card) => (
                <ProductTile key={card.name} card={card} />
              ))}
            </div>
          </div>
        </section>

        <section id="solutions" ref={solutionsRef} className="scroll-mt-[104px] bg-background px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-[1300px]">
            <div className="mb-10 text-center">
              <HomeSectionLabel>Solutions</HomeSectionLabel>
              <h2 className="marketing-display-title mt-6 text-[36px] font-black tracking-[-0.02em] text-slate-950">
                Real-World Automation, Ready to Deploy
              </h2>
              <p className="mx-auto mt-3 max-w-[480px] text-[15px] leading-7 text-slate-500">
                See the same task - done manually today, automated by robots tomorrow.
              </p>
            </div>

            <div className="space-y-6">
              {SOLUTION_CARDS.map((card, index) => (
                <article
                  key={card.title}
                  className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-card shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                >
                  <div className="pointer-events-none absolute right-11 top-7 text-[96px] font-black tracking-[-0.08em] text-black/[0.03]">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="border-b border-slate-200 px-8 py-10 md:px-12">
                    <div className={`mb-5 text-[10px] font-extrabold uppercase tracking-[0.22em] ${card.accent}`}>
                      {card.kicker}
                    </div>
                    <div className="grid gap-8 xl:grid-cols-2">
                      <div>
                        <h3 className="marketing-display-title text-[38px] font-black leading-[1.08] tracking-[-0.02em] text-slate-950">
                          {card.title}
                        </h3>
                      </div>
                      <div className={`border-l-2 pl-4 text-[14.5px] leading-7 text-slate-500 ${card.accent === "text-blue-700" ? "border-blue-300" : "border-teal-300"}`}>
                        {card.description}
                      </div>
                    </div>
                    <div className="mt-7 grid gap-6 xl:grid-cols-2">
                      <ul className="space-y-3">
                        {card.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-center gap-3 text-sm text-slate-700">
                            <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${card.accent === "text-blue-700" ? "border-blue-300 bg-blue-50" : "border-teal-300 bg-teal-50"}`}>
                              <span className={`h-2 w-2 rounded-full ${card.accent === "text-blue-700" ? "bg-blue-700" : "bg-primary"}`} />
                            </span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                      <MetricRow metrics={card.metrics} />
                    </div>
                  </div>

                  <div className="grid gap-4 px-6 py-6 lg:h-[420px] lg:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] lg:gap-0 lg:items-center lg:px-10">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-[24px] lg:aspect-auto lg:h-full">
                      <img src={card.beforeImage} alt={card.beforeLabel} className="h-full w-full object-cover brightness-[0.88]" />
                      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border px-4 py-2 text-xs font-bold whitespace-nowrap backdrop-blur-md ${card.beforeTone}`}>
                        {card.beforeLabel}
                      </div>
                    </div>
                    <div className="flex justify-center text-slate-400">
                      <ArrowRight className="h-6 w-6" />
                    </div>
                    <div className="relative aspect-[16/10] overflow-hidden rounded-[24px] lg:aspect-auto lg:h-full">
                      <img
                        src={card.afterImage}
                        alt={card.afterLabel}
                        className={`h-full w-full object-cover brightness-[0.92] ${card.afterImageClassName ?? ""}`}
                      />
                      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border px-4 py-2 text-xs font-bold whitespace-nowrap backdrop-blur-md ${card.afterTone}`}>
                        {card.afterLabel}
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-card">
                <div className="px-8 py-10 text-center md:px-12">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-primary">
                    From Use Case to Production
                  </div>
                  <h3 className="marketing-display-title mt-4 text-[32px] font-black tracking-[-0.02em] text-slate-950">
                    How We Work With Data Centers
                  </h3>
                  <p className="mx-auto mt-3 max-w-[560px] text-[15px] leading-7 text-slate-500">
                    From target use case to production robot deployment in a 6-month pilot.
                  </p>
                </div>
                <div className="px-6 pb-10 md:px-10">
                  <img
                    src={pilotRoadmap}
                    alt="6-month pilot roadmap"
                    className="mx-auto block w-full max-w-[1100px] rounded-2xl border border-slate-200"
                  />
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="customers" ref={customersRef} className="scroll-mt-[104px] bg-background px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-[1300px]">
            <div className="text-center">
              <HomeSectionLabel>Customers</HomeSectionLabel>
              <h2 className="marketing-display-title mt-6 text-[36px] font-black tracking-[-0.02em] text-slate-950">
                Real Results in Production
              </h2>
              <p className="mx-auto mt-3 max-w-[480px] text-[15px] leading-7 text-slate-500">
                Measurable outcomes from live deployments across robotics verticals.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {CUSTOMER_CARDS.map((card) => (
                <article key={card.company} className="rounded-[14px] border border-slate-200 bg-card p-7 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                  <div className={`text-[44px] font-black leading-none tracking-[-0.06em] ${card.valueTone}`}>{card.value}</div>
                  <div className="mt-2 text-sm font-bold text-slate-950">{card.company}</div>
                  <p className="mt-3 text-[13px] leading-6 text-slate-500">{card.detail}</p>
                  <div className={`mt-4 inline-flex rounded-sm border px-3 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${card.chipTone}`}>
                    {card.label}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-cta-shared px-4 py-16 text-center sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="marketing-display-title text-[clamp(24px,2.8vw,36px)] font-black tracking-[-0.015em] text-slate-950">
              Ready to close the Sim-to-Real gap?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Join leading robotics companies using DataraAI&apos;s real-world data to achieve 95%+ precision.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={buildAuthPath("register", "/")}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-extrabold text-primary-foreground shadow-[0_14px_28px_rgba(13,148,136,0.16)]"
              >
                Request a Demo
              </Link>
              <Link
                to="/robodatahub"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-card px-8 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
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
