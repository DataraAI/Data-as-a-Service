import type { ReactNode } from "react";
import { Hand } from "lucide-react";
import { Link } from "react-router-dom";
import FooterSection from "@/components/FooterSection";
import Navigation from "@/components/Navigation";
import { buildAuthPath } from "@/lib/authLinks";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";

type StepCard = {
  step: string;
  title: string;
  description: string;
  accent: "blue" | "purple" | "orange";
  icon: "capture" | "engine" | "training";
};

type TransformCard = {
  title: string;
  description: string;
  availability: "In Library" | "On-demand";
  sourceImage: string;
  engineDetail: string;
  outputs: { image: string; label: string }[];
  tags: { label: string; tone: "purple" | "teal" | "orange" | "blue" }[];
  hours: string;
};

type GalleryCard = {
  title: string;
  description: string;
  image: string;
  tags: { label: string; tone: "purple" | "teal" | "orange" | "blue" }[];
  hours: string;
};

const STATS = [
  { value: "8", label: "Datasets" },
  { value: "2,850+", label: "Hours Labeled" },
  { value: "2", label: "Verticals" },
  { value: "Patented", label: "Hand Motion Pipeline", featured: true },
];

const PROCESS_STEPS: StepCard[] = [
  {
    step: "Step 01 · Capture",
    title: "Raw Video Footage",
    description:
      "Third-person footage of hand tasks: household, kitchen, or manipulation — any fixed or mobile camera.",
    accent: "blue",
    icon: "capture",
  },
  {
    step: "Step 02",
    title: "RoboHandMotion Engine",
    description: "Pose estimation, keypoint tracking & interaction labeling.",
    accent: "purple",
    icon: "engine",
  },
  {
    step: "Step 03 · Training Data",
    title: "Labeled Motion Datasets",
    description:
      "Pose sequences, grasp annotations & tool trajectories — ready for dexterous robot model training.",
    accent: "orange",
    icon: "training",
  },
];

const DEXTEROUS_DATASETS: TransformCard[] = [
  {
    title: "Kitchen Drawer Manipulation",
    description: "Full-body EXO of trash bag handling → hand-level pose & grasp annotations",
    availability: "On-demand",
    sourceImage: "humanoid/kitchendrawer.png",
    engineDetail: "Hand Tracking",
    outputs: [
      { image: "humanoid/kitchendrawer.png", label: "Wrist Pose" },
      { image: "humanoid/kitchendrawer.png", label: "Finger Joints" },
      { image: "humanoid/kitchendrawer.png", label: "Grasp Point" },
      { image: "humanoid/kitchendrawer.png", label: "Motion Path" },
    ],
    tags: [
      { label: "Hand Pose Tracking", tone: "purple" },
      { label: "Wrist-level Annotations", tone: "purple" },
      { label: "Grasp Points", tone: "orange" },
    ],
    hours: "380 hrs labeled",
  },
  {
    title: "Surface Cleaning — Stovetop",
    description: "Full-body cleaning EXO → hand skeleton & contact zone annotations at varied proximities",
    availability: "In Library",
    sourceImage: "humanoid/stovetop.png",
    engineDetail: "Motion Synthesis",
    outputs: [
      { image: "humanoid/stovetop.png", label: "Hand Path" },
      { image: "humanoid/stovetop.png", label: "Contact Points" },
      { image: "humanoid/stovetop.png", label: "Pose Sequence" },
      { image: "humanoid/stovetop.png", label: "Close-up" },
    ],
    tags: [
      { label: "Hand Pose Tracking", tone: "purple" },
      { label: "Surface Segmentation", tone: "teal" },
      { label: "Multi-distance Views", tone: "blue" },
    ],
    hours: "450 hrs labeled",
  },
  {
    title: "Dishwashing — Sink Manipulation",
    description: "Wide kitchen scene EXO → grasp classification & wet object handling annotations",
    availability: "On-demand",
    sourceImage: "humanoid/dishwashing.png",
    engineDetail: "Grasp Synthesis",
    outputs: [
      { image: "humanoid/dishwashing.png", label: "Grasp Type" },
      { image: "humanoid/dishwashing.png", label: "Object State" },
      { image: "humanoid/dishwashing.png", label: "Joint Angles" },
      { image: "humanoid/dishwashing.png", label: "Motion Arc" },
    ],
    tags: [
      { label: "Grasp Keypoints", tone: "purple" },
      { label: "Wet Object Handling", tone: "teal" },
      { label: "Edge Conditions", tone: "orange" },
    ],
    hours: "600 hrs labeled",
  },
];

const HOUSEHOLD_DATASETS: GalleryCard[] = [
  {
    title: "Surface & Floor Cleaning",
    description: "Sweeping, scrubbing motions — 3 tool types",
    image: "humanoid/humanoid1.png",
    tags: [
      { label: "Arm Trajectory", tone: "purple" },
      { label: "Tool Grip", tone: "teal" },
    ],
    hours: "280 hrs",
  },
  {
    title: "Dishwasher Loading",
    description: "Object placement, rack navigation, door operation",
    image: "humanoid/humanoid2.png",
    tags: [
      { label: "Bimanual Grasp", tone: "purple" },
      { label: "Object Place", tone: "orange" },
    ],
    hours: "310 hrs",
  },
  {
    title: "Hand Dish Washing",
    description: "Scrub, rinse, transfer — wet object sequences",
    image: "humanoid/humanoid3.png",
    tags: [
      { label: "Wet Grasp", tone: "purple" },
      { label: "Force Est.", tone: "teal" },
    ],
    hours: "340 hrs",
  },
  {
    title: "Trash Collection & Sorting",
    description: "Pick, bag, and bin — varied object sizes & weights",
    image: "humanoid/humanoid4.png",
    tags: [
      { label: "Lift & Place", tone: "purple" },
      { label: "Sort Logic", tone: "blue" },
    ],
    hours: "240 hrs",
  },
  {
    title: "Laundry — Washer Operation",
    description: "Load, sort, and transfer fabric items",
    image: "humanoid/humanoid5.png",
    tags: [
      { label: "Deformable Obj.", tone: "purple" },
      { label: "Bimanual", tone: "orange" },
    ],
    hours: "250 hrs",
  },
  {
    title: "Laundry — Fold & Transfer",
    description: "Garment folding, hang, and drawer placement",
    image: "humanoid/humanoid5.png",
    tags: [
      { label: "Deformable Obj.", tone: "purple" },
      { label: "Bimanual", tone: "orange" },
    ],
    hours: "250 hrs",
  },
];

function surfaceImage(path: string) {
  return frontPageImageUrl(path);
}

function SurfaceImage({
  path,
  alt,
  className,
}: {
  path: string;
  alt: string;
  className?: string;
}) {
  const src = surfaceImage(path);

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-sm text-slate-400 dark:bg-slate-900 dark:text-slate-500 ${className ?? ""}`}
      >
        Image unavailable
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
}

function Badge({
  tone,
  children,
}: {
  tone: "purple" | "teal" | "orange" | "blue";
  children: ReactNode;
}) {
  const classes =
    tone === "purple"
      ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200"
      : tone === "teal"
        ? "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200"
        : tone === "orange"
          ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200"
          : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200";

  return (
    <span
      className={`rounded-[4px] border px-2 py-1 text-[10px] font-bold tracking-[0.08em] ${classes}`}
    >
      {children}
    </span>
  );
}

function StatStrip() {
  return (
    <div className="grid gap-px overflow-hidden rounded-[10px] border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-700 dark:bg-slate-700">
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className={`bg-white px-5 py-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:bg-slate-900 ${
            "featured" in stat && stat.featured ? "bg-violet-50 dark:bg-violet-950/20" : ""
          }`}
        >
          <p
            className={`font-black tracking-[-0.04em] text-violet-600 dark:text-violet-300 ${
              "featured" in stat && stat.featured ? "text-[18px]" : "text-[28px]"
            }`}
          >
            {stat.value}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function StepIcon({ type }: { type: StepCard["icon"] }) {
  if (type === "capture") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    );
  }

  if (type === "engine") {
    return (
      <Hand className="h-4 w-4" />
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function StepCardView({ step }: { step: StepCard }) {
  const classes =
    step.accent === "blue"
      ? "border-blue-200 bg-blue-50/80 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200"
      : step.accent === "purple"
        ? "border-violet-200 bg-violet-50/80 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200"
        : "border-orange-200 bg-orange-50/80 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200";

  const iconClasses =
    step.accent === "blue"
      ? "border-blue-300 bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50"
      : step.accent === "purple"
        ? "border-violet-300 bg-violet-100 dark:border-violet-800 dark:bg-violet-950/50"
        : "border-orange-300 bg-orange-100 dark:border-orange-800 dark:bg-orange-950/50";

  return (
    <div className={`flex-1 rounded-[12px] border px-[22px] py-5 ${classes}`}>
      <div className={`mb-3 grid h-9 w-9 place-items-center rounded-[8px] border ${iconClasses}`}>
        <StepIcon type={step.icon} />
      </div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em]">{step.step}</p>
      <p className="mb-2 text-[16px] font-extrabold text-slate-950 dark:text-slate-100">{step.title}</p>
      <p className="text-[11px] leading-6 text-slate-500 dark:text-slate-400">{step.description}</p>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden shrink-0 items-center px-5 lg:flex">
      <div className="flex items-center">
        <div className="h-[2px] w-14 rounded-[2px] bg-gradient-to-r from-blue-700 to-violet-600" />
        <div className="h-0 w-0 border-y-[7px] border-y-transparent border-l-[11px] border-l-violet-600" />
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  summary,
  accent,
}: {
  title: string;
  summary: string;
  accent: "purple" | "orange";
}) {
  const dot = accent === "purple" ? "bg-violet-600" : "bg-orange-600";
  const line = accent === "purple" ? "from-violet-200" : "from-orange-200";

  return (
    <div className="mb-4 flex items-center gap-1">
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
        <span className={`h-2 w-2 rounded-[2px] ${dot}`} />
        <span className="text-[14px] font-extrabold text-slate-950 dark:text-slate-100">{title}</span>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{summary}</span>
      </div>
      <div className={`h-px flex-1 bg-gradient-to-r ${line} to-transparent`} />
    </div>
  );
}

function AvailabilityPill({ value }: { value: TransformCard["availability"] }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
        value === "In Library"
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900/50"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-900/50"
      }`}
    >
      {value}
    </span>
  );
}

function Pipe({ detail }: { detail: string }) {
  return (
    <div className="hidden items-center lg:flex">
      <div className="mx-4 flex w-[92px] flex-col items-center">
        <div className="mb-2 h-6 w-px bg-slate-200 dark:bg-slate-700" />
        <div className="w-full rounded-[16px] border-[1.5px] border-violet-300 bg-white px-4 py-4 text-center shadow-[0_8px_20px_rgba(124,58,237,0.06)] dark:border-violet-800/60 dark:bg-slate-900">
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-[10px] border border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
            <Hand className="h-4 w-4" />
          </div>
          <p className="mb-0.5 text-[8px] font-extrabold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200">
            RoboHandMotion
          </p>
          <p className="mb-1 text-[12px] font-extrabold text-slate-950 dark:text-slate-100">Engine</p>
          <p className="text-[8px] text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
        <div className="my-2 h-6 w-px bg-slate-200 dark:bg-slate-700" />
        <svg width="10" height="14" viewBox="0 0 10 14" fill="none" className="text-violet-600">
          <path d="M1 1l8 6-8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function TransformCardView({ card }: { card: TransformCard }) {
  return (
    <article className="rounded-[14px] border border-slate-200 bg-white px-6 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-[14px] flex items-start justify-between gap-4">
        <div>
          <p className="mb-0.5 text-[14px] font-bold text-slate-950 dark:text-slate-100">{card.title}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{card.description}</p>
        </div>
        <AvailabilityPill value={card.availability} />
      </div>

      <div className="items-center lg:flex">
        <div className="w-full shrink-0 lg:w-[200px]">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-blue-700 dark:text-blue-200">EXO Source</p>
          <div className="relative overflow-hidden rounded-[12px] bg-slate-100 dark:bg-slate-800">
            <SurfaceImage path={card.sourceImage} alt={`${card.title} EXO`} className="h-[176px] w-full object-cover" />
            <span className="absolute left-2 top-2 rounded-[4px] bg-blue-700 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">
              EXO
            </span>
          </div>
        </div>

        <Pipe detail={card.engineDetail} />

        <div className="mt-4 flex-1 lg:mt-0">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">
            Labeled Motion Output
          </p>
          <div className="grid grid-cols-2 gap-2">
            {card.outputs.map((output) => (
              <div key={`${card.title}-${output.label}`} className="relative overflow-hidden rounded-[8px] bg-slate-100 dark:bg-slate-800">
                <SurfaceImage
                  path={output.image}
                  alt={`${card.title} ${output.label}`}
                  className="h-[84px] w-full object-cover sm:h-[96px]"
                />
                <span className="absolute left-1.5 top-1.5 rounded-[4px] bg-white/90 px-1.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-700 backdrop-blur dark:bg-slate-900/85 dark:text-slate-200">
                  {output.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-[14px] flex flex-wrap items-center gap-[6px] border-t border-slate-200 pt-3 dark:border-slate-700">
        {card.tags.map((tag) => (
          <Badge key={`${card.title}-${tag.label}`} tone={tag.tone}>
            {tag.label}
          </Badge>
        ))}
        <span className="ml-auto text-[12px] font-bold text-violet-700 dark:text-violet-200">{card.hours}</span>
      </div>
    </article>
  );
}

function HouseholdCardView({ card }: { card: GalleryCard }) {
  return (
    <article className="overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-900">
      <SurfaceImage path={card.image} alt={card.title} className="h-[150px] w-full object-cover" />
      <div className="p-4">
        <p className="text-[13px] font-bold text-slate-950 dark:text-slate-100">{card.title}</p>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{card.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {card.tags.map((tag) => (
            <Badge key={`${card.title}-${tag.label}`} tone={tag.tone}>
              {tag.label}
            </Badge>
          ))}
          <span className="ml-auto text-[10px] font-bold text-violet-700 dark:text-violet-200">{card.hours}</span>
        </div>
      </div>
    </article>
  );
}

export default function RoboHandMotion() {
  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <Navigation />

      <main className="pt-[88px]">
        <div className="mx-auto flex max-w-[1440px]">
          <aside className="hidden min-h-[calc(100vh-88px)] w-[220px] shrink-0 border-r border-slate-200 bg-slate-50/90 xl:flex xl:flex-col dark:border-slate-800 dark:bg-slate-950/80">
            <div className="border-b border-slate-200 px-5 py-6 dark:border-slate-800">
              <p className="text-[18px] font-extrabold tracking-[0.04em] text-primary">DataraAI</p>
              <p className="mt-1 text-[16px] font-bold text-slate-950 dark:text-slate-100">Hand Motion</p>
            </div>
            <div className="flex-1 px-3 py-4">
              <p className="mb-3 px-2 text-[16px] font-extrabold text-slate-950 dark:text-slate-100">Verticals</p>
              <a
                href="#dk"
                className="mb-1 flex items-center gap-3 rounded-[9px] border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-900/50 dark:bg-violet-950/30"
              >
                <span className="h-3 w-3 rounded-[3px] bg-violet-600" />
                <span className="text-[16px] font-extrabold text-slate-950 dark:text-slate-100">Dexterous Kitchen</span>
              </a>
              <a
                href="#ht"
                className="mb-1 flex items-center gap-3 rounded-[9px] px-4 py-3 text-slate-600 transition-colors hover:bg-orange-50/60 hover:text-orange-700 dark:text-slate-300 dark:hover:bg-orange-950/20 dark:hover:text-orange-200"
              >
                <span className="h-3 w-3 rounded-[3px] bg-orange-600" />
                <span className="text-[16px] font-extrabold">Household Tasks</span>
              </a>
            </div>
            <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <Link
                to={buildAuthPath("register", "/robohandmotion")}
                className="inline-flex h-10 w-full items-center justify-center rounded-[8px] bg-violet-600 px-4 text-[12px] font-bold text-white transition-opacity hover:opacity-90"
              >
                Get Access
              </Link>
            </div>
          </aside>

          <div className="flex-1 overflow-hidden bg-white px-4 py-9 sm:px-6 md:px-10 xl:px-11 dark:bg-slate-950">
            <div className="mx-auto max-w-[1180px]">
              <section className="mb-6">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-[9px] border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
                    <Hand className="h-4 w-4" />
                  </div>
                  <h1 className="text-[30px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">
                    RoboHandMotion
                  </h1>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
                    Patented
                  </span>
                </div>
                <p className="mb-[14px] max-w-[640px] text-[15px] leading-8 text-slate-500 dark:text-slate-400">
                  Patented pipeline capturing <span className="font-semibold text-violet-700 dark:text-violet-300">hand pose</span>,{" "}
                  <span className="font-semibold text-blue-700 dark:text-blue-300">tool interactions</span>, and{" "}
                  <span className="font-semibold text-orange-700 dark:text-orange-300">object states</span> — labeled and ready for dexterous robot model training.
                </p>
                <div className="flex flex-wrap gap-[10px]">
                  <span className="rounded-[6px] border border-violet-200 bg-violet-50 px-[13px] py-[5px] text-[12px] font-semibold text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
                    <strong>Hand Pose</strong> — Per-frame keypoint skeleton, joint angles & finger trajectories
                  </span>
                  <span className="rounded-[6px] border border-blue-200 bg-blue-50 px-[13px] py-[5px] text-[12px] font-semibold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                    <strong>Object State</strong> — Grasped object identity, orientation & contact classification
                  </span>
                </div>
              </section>

              <section className="mb-10">
                <StatStrip />
              </section>

              <section className="mb-10 rounded-[14px] border border-slate-200 bg-slate-50/80 px-8 py-7 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="mb-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">How It Works</p>
                <div className="lg:flex lg:items-center">
                  <StepCardView step={PROCESS_STEPS[0]} />
                  <FlowArrow />
                  <StepCardView step={PROCESS_STEPS[1]} />
                  <FlowArrow />
                  <StepCardView step={PROCESS_STEPS[2]} />
                </div>
              </section>

              <section className="flex flex-col gap-10">
                <div id="dk" className="scroll-mt-28">
                  <SectionHeader title="Dexterous Kitchen" summary="3 datasets · 1,430 hrs" accent="purple" />
                  <div className="flex flex-col gap-4">
                    {DEXTEROUS_DATASETS.map((card) => (
                      <TransformCardView key={card.title} card={card} />
                    ))}
                  </div>
                </div>

                <div id="ht" className="scroll-mt-28">
                  <SectionHeader title="Household Tasks" summary="5 datasets · 1,420 hrs" accent="orange" />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {HOUSEHOLD_DATASETS.map((card) => (
                      <HouseholdCardView key={card.title} card={card} />
                    ))}
                  </div>
                </div>

                <div className="mt-1 flex flex-col justify-between gap-6 rounded-[14px] border-[1.5px] border-dashed border-violet-300 bg-gradient-to-br from-violet-50 to-orange-50 px-8 py-7 lg:flex-row lg:items-center dark:border-violet-900/50 dark:from-violet-950/20 dark:to-orange-950/20">
                  <div className="flex items-center gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                    <div>
                      <p className="mb-1 text-[15px] font-bold text-slate-950 dark:text-slate-100">
                        Run RoboHandMotion on Your Footage
                      </p>
                      <p className="max-w-[480px] text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                        Already have footage of hand tasks? We&apos;ll generate labeled pose sequences, grasp annotations, and motion trajectories — across any task, environment, or robot form factor.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 lg:items-center">
                    <div className="flex gap-[5px]">
                      <Badge tone="purple">Dexterous</Badge>
                      <Badge tone="orange">Household</Badge>
                      <Badge tone="teal">Industrial</Badge>
                    </div>
                    <Link
                      to={buildAuthPath("register", "/robohandmotion")}
                      className="inline-flex w-full items-center justify-center rounded-[8px] bg-violet-600 px-6 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                    >
                      Submit Your Footage
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
