import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  Database,
  Eye,
  Hand,
  Layers3,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import FooterSection from "@/components/FooterSection";
import { buildAuthPath } from "@/lib/authLinks";
import pilotRoadmap from "@/assets/images/pilot-roadmap.png";
import rackManual from "@/assets/images/rack-manual.png";
import rackRobot from "@/assets/images/rack-robot.png";

type ProductCard = {
  name: string;
  badge: string;
  tagline: string;
  pills: string[];
  cta: string;
  to: string;
  icon: LucideIcon;
  surfaceClassName: string;
  iconClassName: string;
  linkClassName: string;
};

type MissionCard = {
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
};

type SolutionStory = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  beforeLabel: string;
  afterLabel: string;
  beforeImage: string;
  afterImage: string;
  accentClassName: string;
};

type CustomerResult = {
  metric: string;
  company: string;
  detail: string;
  label: string;
  chipClassName: string;
  metricClassName: string;
};

const PRODUCT_CARDS: ProductCard[] = [
  {
    name: "RoboDataHub",
    badge: "Dataset Library",
    tagline: "Access EGO + EXO datasets across automotive, warehouse, data center, and dexterity.",
    pills: ["Dataset Access", "Multi-Vertical", "Production Data"],
    cta: "Browse datasets",
    to: "/robodatahub",
    icon: Database,
    surfaceClassName: "border-teal-200/80 border-t-4 border-t-primary bg-white",
    iconClassName: "border-teal-200 bg-teal-50 text-primary",
    linkClassName: "text-primary",
  },
  {
    name: "RoboEyeView",
    badge: "Patented IP",
    tagline: "Convert EXO footage into robot-eye datasets that are ready for model training.",
    pills: ["EXO to EGO", "Visual Intelligence", "Patented"],
    cta: "Learn more",
    to: "/roboeyeview",
    icon: Eye,
    surfaceClassName: "border-blue-200/80 border-t-4 border-t-sky-700 bg-white",
    iconClassName: "border-blue-200 bg-blue-50 text-sky-700",
    linkClassName: "text-sky-700",
  },
  {
    name: "RoboHandMotion",
    badge: "Patented IP",
    tagline: "Hand, tool, and object interaction signals for dexterous and humanoid training.",
    pills: ["Hand Pose", "Tool Contact", "Dexterous Tasks"],
    cta: "Learn more",
    to: "/robohandmotion",
    icon: Hand,
    surfaceClassName: "border-violet-200/80 border-t-4 border-t-violet-700 bg-white",
    iconClassName: "border-violet-200 bg-violet-50 text-violet-700",
    linkClassName: "text-violet-700",
  },
  {
    name: "RoboTaskManipulator",
    badge: "Task Intelligence",
    tagline: "Step-segmented workflow datasets for assembly, pick-place, and cabling execution.",
    pills: ["Task Graphs", "Workflow Labels", "Execution Ready"],
    cta: "See case study",
    to: "/robotaskmanipulator",
    icon: Workflow,
    surfaceClassName: "border-amber-200/80 border-t-4 border-t-amber-700 bg-white",
    iconClassName: "border-amber-200 bg-amber-50 text-amber-700",
    linkClassName: "text-amber-700",
  },
];

const MISSION_CARDS: MissionCard[] = [
  {
    title: "Real-World First",
    description:
      "Authentic multi-modal datasets captured in operating environments instead of simulation-only proxies.",
    icon: Clock3,
    iconClassName: "border-primary/25 bg-primary/10 text-primary",
  },
  {
    title: "Data Infrastructure",
    description:
      "End-to-end pipelines from capture to policy-ready training data across four robotics verticals.",
    icon: Layers3,
    iconClassName: "border-sky-200 bg-blue-50 text-sky-700",
  },
  {
    title: "Partnership-Driven",
    description:
      "Co-developed with production teams so the product reflects real deployment constraints and priorities.",
    icon: Users,
    iconClassName: "border-violet-200 bg-violet-50 text-violet-700",
  },
];

const SOLUTION_STORIES: SolutionStory[] = [
  {
    eyebrow: "Rack Cable Installation",
    title: "Show stakeholders the workflow before and after automation.",
    description:
      "Frame the conversation around a real operating task first, then show how the same workflow becomes robot-ready training data instead of a static pitch deck promise.",
    bullets: [
      "Explain the manual workflow in a way operators and robotics teams both recognize.",
      "Turn the same task into the data surface needed for training and evaluation.",
      "Make the operational value visible before the full deployment lands.",
    ],
    beforeLabel: "Before · Manual workflow",
    afterLabel: "After · Robot-ready data",
    beforeImage: rackManual,
    afterImage: rackRobot,
    accentClassName: "border-primary/20 bg-primary/10 text-primary",
  },
  {
    eyebrow: "Pilot Roadmap",
    title: "Anchor the commercial and technical story inside a six-month pilot.",
    description:
      "Keep the commercial and technical conversation grounded in a concrete rollout path that teams can evaluate, budget, and execute against.",
    bullets: [
      "Real-world capture plan aligned to deployment constraints.",
      "Dataset structure that maps cleanly into training and evaluation.",
      "EXO-to-EGO synthesis when robot-eye views are missing.",
    ],
    beforeLabel: "Roadmap",
    afterLabel: "Pilot",
    beforeImage: pilotRoadmap,
    afterImage: pilotRoadmap,
    accentClassName: "border-sky-200 bg-blue-50 text-sky-700",
  },
];

const CUSTOMER_RESULTS: CustomerResult[] = [
  {
    metric: "3.8x",
    company: "Figure AI",
    detail:
      "Faster model convergence on manipulation tasks using RoboDataHub dexterous sequences versus in-house collection.",
    label: "Humanoid",
    chipClassName: "border-teal-200 bg-teal-50 text-primary",
    metricClassName: "text-primary",
  },
  {
    metric: "60%",
    company: "BMW Robotics",
    detail:
      "Reduction in labeling cost for production-line vision models using RoboEyeView EGO synthesis pipeline.",
    label: "Automotive",
    chipClassName: "border-blue-200 bg-blue-50 text-sky-700",
    metricClassName: "text-sky-700",
  },
  {
    metric: "99.1%",
    company: "Foxconn Smart Factory",
    detail:
      "Label accuracy on rack-navigation sequences, outperforming the previous internal baseline by 4.7 points.",
    label: "Data Center",
    chipClassName: "border-violet-200 bg-violet-50 text-violet-700",
    metricClassName: "text-violet-700",
  },
];

const TRUSTED_BY = ["NVIDIA", "BMW Group", "Figure AI", "Foxconn", "Peer Robotics", "Apptronik"];

function GradientDivider() {
  return (
    <div className="mx-auto flex max-w-[1300px] items-center gap-5 px-4 sm:px-6">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="rounded-full border border-primary/15 bg-primary/6 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
        Physical AI
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-500/20 to-transparent" />
    </div>
  );
}

function ProductTile({ card }: { card: ProductCard }) {
  const Icon = card.icon;

  return (
    <Link
      to={card.to}
      className={`group flex h-full flex-col rounded-[26px] border px-6 pb-7 pt-8 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(15,23,42,0.08)] ${card.surfaceClassName}`}
    >
      <div className={`mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[22px] border ${card.iconClassName}`}>
        <Icon className="h-8 w-8" />
      </div>
      <div className="mt-5 text-center">
        <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-600">
          {card.badge}
        </div>
        <div className="mt-4 text-[28px] font-black tracking-[-0.04em] text-slate-950">{card.name}</div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{card.tagline}</p>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        {card.pills.map((pill) => (
          <span
            key={pill}
            className="inline-flex justify-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-600"
          >
            {pill}
          </span>
        ))}
      </div>
      <span className={`mt-6 inline-flex items-center justify-center gap-2 text-sm font-bold ${card.linkClassName}`}>
        {card.cta}
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

export default function Home() {
  const location = useLocation();
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
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-[88px]">
        <section className="marketing-hero-home overflow-hidden border-b border-slate-200 px-4 py-18 text-center sm:px-6 md:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/6 px-5 py-2 text-[12px] font-bold uppercase tracking-[0.22em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              NVIDIA Inception Member
            </div>

            <h1 className="mt-8 text-[clamp(2.8rem,7vw,5.4rem)] font-black leading-[0.92] tracking-[-0.07em] text-slate-950">
              The Sim-to-Real Gap
              <br />
              is <span className="bg-gradient-to-r from-primary to-sky-700 bg-clip-text text-transparent">Costing You.</span>
            </h1>

            <p className="mx-auto mt-7 max-w-3xl text-lg leading-9 text-slate-500">
              Robots fail in production because training data doesn&apos;t match the real world.
              Simulation gets you part of the way. DataraAI closes the gap with real-world
              dataset infrastructure for physical AI.
            </p>

            <div className="mt-20">
              <div className="text-[clamp(2.7rem,6vw,5.1rem)] font-black leading-[0.95] tracking-[-0.07em] text-slate-950">
                We Resolve <span className="text-primary">This.</span>
              </div>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
                Physical AI models need data from the world they will actually operate in. We help
                teams move from raw workflow capture to robot-ready datasets, synthesis, and task
                intelligence that can ship.
              </p>
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex h-13 items-center justify-center rounded-full bg-primary px-8 text-sm font-extrabold text-primary-foreground shadow-[0_16px_34px_rgba(13,148,136,0.18)] transition-opacity hover:opacity-90"
              >
                See Product Suite
              </button>
              <Link
                to={buildAuthPath("register", "/robodatahub")}
                className="inline-flex h-13 items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-sm font-semibold text-slate-600 shadow-[0_14px_28px_rgba(15,23,42,0.05)] transition-colors hover:border-primary/25 hover:text-primary"
              >
                Get Access
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-100/80 px-4 py-6 sm:px-6">
          <div className="mx-auto flex max-w-[1300px] flex-wrap items-center justify-center gap-x-10 gap-y-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Trusted by teams at
            </div>
            {TRUSTED_BY.map((item) => (
              <span key={item} className="text-sm font-bold text-slate-500">
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="py-12">
          <GradientDivider />
        </section>

        <section
          id="products"
          ref={productsRef}
          className="bg-slate-50/80 px-4 py-18 sm:px-6 md:py-20"
        >
          <div className="mx-auto max-w-[1300px]">
            <div className="mb-12 text-center">
              <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-white px-6 py-3 text-base font-extrabold uppercase tracking-[0.1em] text-primary shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Products
              </div>
              <h2 className="mt-6 text-[clamp(2rem,3vw,3rem)] font-black tracking-[-0.05em] text-slate-950">
                Four products built for production-grade robot training.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                Capture, synthesize, structure, and serve the real-world robotics data needed to
                move from proof of concept to production deployment.
              </p>
            </div>

            <div className="grid gap-5 xl:grid-cols-4">
              {PRODUCT_CARDS.map((card) => (
                <ProductTile key={card.name} card={card} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6">
          <div className="mx-auto grid max-w-[1300px] gap-5 md:grid-cols-3">
            {MISSION_CARDS.map((card) => {
              const Icon = card.icon;

              return (
                <article key={card.title} className="marketing-surface rounded-[22px] p-6">
                  <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${card.iconClassName}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-base font-extrabold text-slate-950">{card.title}</div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="solutions"
          ref={solutionsRef}
          className="bg-slate-50/70 px-4 py-18 sm:px-6 md:py-20"
        >
          <div className="mx-auto max-w-[1300px]">
            <div className="mb-12 text-center">
              <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-white px-6 py-3 text-base font-extrabold uppercase tracking-[0.1em] text-primary shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Solutions
              </div>
              <h2 className="mt-6 text-[clamp(2rem,3vw,3rem)] font-black tracking-[-0.05em] text-slate-950">
                Workflow-first storytelling for real deployment programs.
              </h2>
            </div>

            <div className="space-y-6">
              {SOLUTION_STORIES.map((story, index) => (
                <article
                  key={story.title}
                  className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.05)]"
                >
                  <div className="pointer-events-none absolute right-8 top-6 text-[84px] font-black tracking-[-0.08em] text-slate-100">
                    {index + 1}
                  </div>
                  <div className="border-b border-slate-200 px-6 py-8 md:px-10">
                    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div>
                        <div className={`inline-flex rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] ${story.accentClassName}`}>
                          {story.eyebrow}
                        </div>
                        <h3 className="mt-5 text-[clamp(1.9rem,3vw,3rem)] font-black tracking-[-0.05em] text-slate-950">
                          {story.title}
                        </h3>
                      </div>

                      <div className="border-l-0 border-primary/20 pl-0 text-sm leading-7 text-slate-600 xl:border-l xl:pl-6">
                        <p>{story.description}</p>
                        <ul className="mt-5 space-y-3">
                          {story.bullets.map((bullet) => (
                            <li key={bullet} className="flex items-start gap-3">
                              <span className="mt-2 h-2.5 w-2.5 rounded-full bg-primary" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 px-6 py-6 md:px-10 lg:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] lg:items-center">
                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                      <img src={story.beforeImage} alt={story.beforeLabel} className="h-full w-full object-cover" />
                      <div className="border-t border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700">
                        {story.beforeLabel}
                      </div>
                    </div>
                    <div className="flex justify-center text-slate-400">
                      <ArrowRight className="h-8 w-8" />
                    </div>
                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                      <img src={story.afterImage} alt={story.afterLabel} className="h-full w-full object-cover" />
                      <div className="border-t border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700">
                        {story.afterLabel}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="customers"
          ref={customersRef}
          className="border-y border-slate-200 bg-white px-4 py-18 sm:px-6 md:py-20"
        >
          <div className="mx-auto max-w-[1300px]">
            <div className="mb-12 text-center">
              <div className="inline-flex items-center gap-3 rounded-full border border-sky-200 bg-blue-50 px-6 py-3 text-base font-extrabold uppercase tracking-[0.1em] text-sky-700 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                <span className="h-2 w-2 rounded-full bg-sky-700" />
                Customers
              </div>
              <h2 className="mt-6 text-[clamp(2rem,3vw,3rem)] font-black tracking-[-0.05em] text-slate-950">
                Real outcomes across robotics domains.
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {CUSTOMER_RESULTS.map((result) => (
                <article key={result.company} className="marketing-surface rounded-[24px] p-6">
                  <div className={`text-[46px] font-black tracking-[-0.08em] ${result.metricClassName}`}>
                    {result.metric}
                  </div>
                  <div className="mt-3 text-base font-bold text-slate-950">{result.company}</div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{result.detail}</p>
                  <div className={`mt-5 inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${result.chipClassName}`}>
                    {result.label}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50/90 px-4 py-8 text-center sm:px-6">
          <div className="mx-auto max-w-[1300px]">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Recognized and backed by
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-bold text-slate-500">
              {TRUSTED_BY.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-cta-shared px-4 py-16 text-center sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-[clamp(1.9rem,2.9vw,2.5rem)] font-extrabold tracking-tight text-slate-950">
              Ready to close the Sim-to-Real gap?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Join robotics teams using DataraAI&apos;s real-world data to move faster from capture
              to deployment.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={buildAuthPath("register", "/robodatahub")}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(13,148,136,0.16)]"
              >
                Get Access
              </Link>
              <Link
                to="/robodatahub"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
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

