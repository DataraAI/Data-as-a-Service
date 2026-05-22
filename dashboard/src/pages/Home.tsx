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
import pilotRoadmap from "@/assets/pilot-roadmap.png";
import rackManual from "@/assets/rack-manual.png";
import rackRobot from "@/assets/rack-robot.png";

type ProductCard = {
  name: string;
  badge: string;
  description: string;
  cta: string;
  to: string;
  Icon: LucideIcon;
  tone: string;
  iconTone: string;
};

type MissionCard = {
  title: string;
  description: string;
  Icon: LucideIcon;
  tone: string;
};

type CustomerResult = {
  metric: string;
  company: string;
  detail: string;
  label: string;
  tone: string;
};

const PRODUCT_CARDS: ProductCard[] = [
  {
    name: "RoboDataHub",
    badge: "Core Platform",
    description:
      "EGO + EXO datasets across automotive, warehouse, data center, and dexterity.",
    cta: "Browse datasets",
    to: "/robodatahub",
    Icon: Database,
    tone: "border-teal-200 bg-teal-50/70",
    iconTone: "border-teal-200 bg-white text-primary",
  },
  {
    name: "RoboEyeView",
    badge: "Patented IP",
    description: "EXO to EGO view synthesis that pushes real deployments from 85% toward 95%+.",
    cta: "Learn more",
    to: "/roboeyeview",
    Icon: Eye,
    tone: "border-blue-200 bg-blue-50/70",
    iconTone: "border-blue-200 bg-white text-sky-700",
  },
  {
    name: "RoboHandMotion",
    badge: "Patented IP",
    description:
      "Hand, tool, and object interaction signals for humanoid and dexterous training.",
    cta: "See solution",
    to: "/robohandmotion",
    Icon: Hand,
    tone: "border-violet-200 bg-violet-50/70",
    iconTone: "border-violet-200 bg-white text-violet-700",
  },
  {
    name: "RoboTaskManipulator",
    badge: "Task Intelligence",
    description:
      "Assembly, pick-place, and cabling workflows with multi-step structure for execution.",
    cta: "See solution",
    to: "/robotaskmanipulator",
    Icon: Workflow,
    tone: "border-orange-200 bg-orange-50/70",
    iconTone: "border-orange-200 bg-white text-orange-700",
  },
];

const MISSION_CARDS: MissionCard[] = [
  {
    title: "Real-World First",
    description:
      "Authentic multi-modal datasets captured in working environments instead of simulated stand-ins.",
    Icon: Clock3,
    tone: "border-teal-200 bg-teal-50 text-primary",
  },
  {
    title: "Data Infrastructure",
    description:
      "End-to-end pipelines from capture to policy-ready training data across four robotics verticals.",
    Icon: Layers3,
    tone: "border-blue-200 bg-blue-50 text-sky-700",
  },
  {
    title: "Partnership-Driven",
    description:
      "Co-developed with leading robotics teams so the product reflects real production requirements.",
    Icon: Users,
    tone: "border-violet-200 bg-violet-50 text-violet-700",
  },
];

const CUSTOMER_RESULTS: CustomerResult[] = [
  {
    metric: "3.8x",
    company: "Figure AI",
    detail:
      "Faster model convergence on manipulation tasks using RoboDataHub dexterous sequences versus in-house collection.",
    label: "Humanoid",
    tone: "border-teal-200 bg-teal-50 text-primary",
  },
  {
    metric: "60%",
    company: "BMW Robotics",
    detail:
      "Reduction in labeling cost for production-line vision models using RoboEyeView EGO synthesis.",
    label: "Automotive",
    tone: "border-blue-200 bg-blue-50 text-sky-700",
  },
  {
    metric: "99.1%",
    company: "Foxconn Smart Factory",
    detail:
      "Label accuracy on rack-navigation sequences, outperforming the previous internal baseline by 4.7 points.",
    label: "Data Center",
    tone: "border-violet-200 bg-violet-50 text-violet-700",
  },
];

const TRUSTED_BY = [
  "NVIDIA",
  "BMW Group",
  "Figure AI",
  "Foxconn",
  "Peer Robotics",
  "Apptronik",
  "Waymo",
];

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
        <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.12),transparent_24%),radial-gradient(circle_at_85%_12%,rgba(29,78,216,0.08),transparent_20%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-18 sm:px-6 md:py-24">
          <div className="mx-auto grid max-w-[1440px] gap-12 xl:grid-cols-[minmax(0,1.05fr)_360px] xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/6 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                NVIDIA Inception Member
              </div>

              <h1 className="mt-6 text-[clamp(3rem,7vw,5.2rem)] font-black leading-[0.95] tracking-[-0.06em] text-slate-950">
                The Sim-to-Real Gap
                <br />
                is <span className="bg-gradient-to-r from-primary to-sky-700 bg-clip-text text-transparent">Costing You.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500 sm:text-lg">
                Robots fail in production because training data does not match the real world.
                Simulation gets you part of the way. DataraAI closes the gap with real-world
                dataset infrastructure for physical AI.
              </p>

              <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => productsRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex h-13 items-center justify-center rounded-xl bg-primary px-7 text-sm font-bold text-primary-foreground shadow-[0_16px_30px_rgba(13,148,136,0.18)] transition-opacity hover:opacity-90"
                >
                  See Product Suite
                </button>
                <Link
                  to={buildAuthPath("register", "/robodatahub")}
                  className="inline-flex h-13 items-center justify-center rounded-xl border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-600 shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition-colors hover:border-primary/30 hover:text-primary"
                >
                  Get Access
                </Link>
              </div>
            </div>

            <div className="marketing-surface rounded-[28px] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Product Snapshot
                  </div>
                  <div className="mt-2 text-xl font-extrabold text-slate-950">Physical AI Data Stack</div>
                </div>
                <div className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  4 Products
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {PRODUCT_CARDS.map((card) => (
                  <div
                    key={card.name}
                    className={`flex items-start gap-4 rounded-[22px] border p-4 ${card.tone}`}
                  >
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${card.iconTone}`}>
                      <card.Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-950">{card.name}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {card.badge}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                    </div>
                  </div>
                ))}
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
              <div className="h-3 w-3 rounded-[4px] bg-primary" />
              <div className="text-2xl font-extrabold text-slate-950">Product Suite</div>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              Four products. One coordinated operating surface for real-world robotics data.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {PRODUCT_CARDS.map((card) => (
              <Link
                key={card.name}
                to={card.to}
                className={`group rounded-[24px] border p-6 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)] ${card.tone}`}
              >
                <div className={`inline-flex rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${card.iconTone}`}>
                  {card.badge}
                </div>
                <div className="mt-4 text-lg font-extrabold text-slate-950">{card.name}</div>
                <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-600">{card.description}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
                  {card.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50/90 px-4 py-14 sm:px-6">
          <div className="mx-auto grid max-w-[1440px] gap-5 md:grid-cols-3">
            {MISSION_CARDS.map((card) => (
              <article key={card.title} className="marketing-surface rounded-[22px] p-6">
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${card.tone}`}>
                  <card.Icon className="h-5 w-5" />
                </div>
                <div className="text-base font-extrabold text-slate-950">{card.title}</div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="solutions"
          ref={solutionsRef}
          className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 md:py-20"
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
            <div className="marketing-surface rounded-[28px] p-8">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Deployment Story
              </div>
              <h2 className="mt-4 text-[clamp(2rem,3.2vw,3rem)] font-black tracking-[-0.05em] text-slate-950">
                From raw workflow capture to production robot data.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Show the same workflow before and after automation so operators, robotics teams,
                and deployment stakeholders can all see the path from today&apos;s manual process to
                tomorrow&apos;s robot-ready data.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] sm:items-center">
                <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
                  <img src={rackManual} alt="Manual rack workflow" className="h-full w-full object-cover" />
                  <div className="border-t border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                    Before: manual rack workflow
                  </div>
                </div>
                <div className="flex justify-center text-primary">
                  <ArrowRight className="h-6 w-6" />
                </div>
                <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
                  <img src={rackRobot} alt="Robot rack workflow" className="h-full w-full object-cover" />
                  <div className="border-t border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                    After: robot-ready training view
                  </div>
                </div>
              </div>
            </div>

            <div className="marketing-surface-muted rounded-[28px] p-8">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700">
                Pilot Roadmap
              </div>
              <h3 className="mt-4 text-2xl font-extrabold text-slate-950">
                Move from target use case to live deployment inside a six-month pilot.
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Anchor the commercial and technical conversation with a clear operational sequence,
                not just the end result.
              </p>
              <div className="mt-6 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
                <img src={pilotRoadmap} alt="Pilot roadmap" className="w-full object-cover" />
              </div>
              <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
                  Real-world capture plan aligned to deployment constraints.
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
                  Dataset structure that maps cleanly into training and evaluation.
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
                  EXO-to-EGO synthesis when robot-eye views are missing.
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
                  Task-level decomposition for multi-step execution workflows.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="customers"
          ref={customersRef}
          className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 md:py-20"
        >
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-10">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-[4px] bg-sky-700" />
              <div className="text-2xl font-extrabold text-slate-950">Customers</div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
              Measurable outcomes across robotics domains, presented with enough clarity to keep
              both the commercial and technical story visible.
            </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {CUSTOMER_RESULTS.map((result) => (
                <article
                  key={result.company}
                  className="marketing-surface rounded-[24px] p-6"
                >
                  <div className="text-5xl font-black tracking-[-0.06em] text-primary">{result.metric}</div>
                  <div className="mt-3 text-base font-bold text-slate-950">{result.company}</div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{result.detail}</p>
                  <div className={`mt-5 inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${result.tone}`}>
                    {result.label}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-12 rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-8 text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Trusted by teams at
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-bold text-slate-500">
                {TRUSTED_BY.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(135deg,#f8fafc_0%,#eef6f5_50%,#eff6ff_100%)] px-4 py-16 text-center sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-[clamp(1.9rem,2.8vw,2.5rem)] font-extrabold tracking-tight text-slate-950">
              Ready to close the Sim-to-Real gap?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Join leading robotics companies using DataraAI&apos;s real-world data to move faster
              from capture to deployment.
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
