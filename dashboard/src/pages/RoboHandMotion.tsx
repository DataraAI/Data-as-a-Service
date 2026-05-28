import {
  Activity,
  ArrowRight,
  Hand,
  Monitor,
  Plus,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import FooterSection from "@/components/FooterSection";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";
import { buildAuthPath } from "@/lib/authLinks";

type Stat = {
  value: string;
  label: string;
  featured?: boolean;
};

type ProcessStep = {
  step: string;
  title: string;
  description: string;
  accentClassName: string;
  icon: typeof Monitor;
};

type OutputFrame = {
  image: string;
  label: string;
};

type TransformDatasetCard = {
  title: string;
  description: string;
  availability: "In Library" | "On-demand";
  sourceImage: string;
  sourceAlt: string;
  engineDetail: string;
  outputs: OutputFrame[];
  tags: { label: string; tone: "purple" | "teal" | "orange" | "blue" }[];
  hours: string;
};

type HouseholdDatasetCard = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  tags: { label: string; tone: "purple" | "teal" | "orange" | "blue" }[];
  hours: string;
};

const STATS: Stat[] = [
  { value: "8", label: "Datasets" },
  { value: "2,850+", label: "Hours Labeled" },
  { value: "2", label: "Verticals" },
  { value: "Patented", label: "Hand Motion Pipeline", featured: true },
];

const PROCESS_STEPS: ProcessStep[] = [
  {
    step: "Step 01 · Capture",
    title: "Raw Video Footage",
    description:
      "Third-person footage of hand tasks: household, kitchen, or manipulation — any fixed or mobile camera.",
    accentClassName: "border-blue-200 bg-blue-50/80 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
    icon: Monitor,
  },
  {
    step: "Step 02",
    title: "RoboHandMotion Engine",
    description: "Pose estimation, keypoint tracking & interaction labeling.",
    accentClassName:
      "border-violet-200 bg-violet-50/80 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200",
    icon: Hand,
  },
  {
    step: "Step 03 · Training Data",
    title: "Labeled Motion Datasets",
    description:
      "Pose sequences, grasp annotations & tool trajectories — ready for dexterous robot model training.",
    accentClassName:
      "border-orange-200 bg-orange-50/80 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-200",
    icon: Activity,
  },
];

const DEXTEROUS_DATASETS: TransformDatasetCard[] = [
  {
    title: "Kitchen Drawer Manipulation",
    description:
      "Full-body EXO of trash bag handling → synthesized robot hand-level EGO view",
    availability: "On-demand",
    sourceImage: "humanoid/humanoid.png",
    sourceAlt: "Kitchen drawer manipulation EXO source",
    engineDetail: "Hand Tracking",
    outputs: [
      { image: "humanoid/humanoid1.png", label: "Robot Hand-level" },
      { image: "humanoid/humanoid1.png", label: "Side" },
      { image: "humanoid/humanoid1.png", label: "Overhead" },
      { image: "humanoid/humanoid1.png", label: "Low Angle" },
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
    description:
      "Full-body cleaning EXO → hand skeleton & contact zone annotations at varied proximities",
    availability: "In Library",
    sourceImage: "humanoid/humanoid2.png",
    sourceAlt: "Surface cleaning stovetop EXO source",
    engineDetail: "Motion Synthesis",
    outputs: [
      { image: "humanoid/humanoid3.png", label: "Hand Path" },
      { image: "humanoid/humanoid4.png", label: "Contact Points" },
      { image: "humanoid/humanoid3.png", label: "Pose Sequence" },
      { image: "humanoid/humanoid4.png", label: "Close-up" },
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
    description:
      "Wide kitchen scene EXO → grasp classification & wet object handling annotations",
    availability: "On-demand",
    sourceImage: "humanoid/humanoid5.png",
    sourceAlt: "Dishwashing sink manipulation EXO source",
    engineDetail: "Grasp Synthesis",
    outputs: [
      { image: "humanoid/humanoid6.png", label: "Grasp Type" },
      { image: "humanoid/humanoid6.png", label: "Object State" },
      { image: "humanoid/humanoid6.png", label: "Joint Angles" },
      { image: "humanoid/humanoid6.png", label: "Motion Arc" },
    ],
    tags: [
      { label: "Grasp Keypoints", tone: "purple" },
      { label: "Wet Object Handling", tone: "teal" },
      { label: "Edge Conditions", tone: "orange" },
    ],
    hours: "600 hrs labeled",
  },
];

const HOUSEHOLD_DATASETS: HouseholdDatasetCard[] = [
  {
    title: "Surface & Floor Cleaning",
    description: "Sweeping, scrubbing motions — 3 tool types",
    image: "humanoid/humanoid1.png",
    imageAlt: "Surface and floor cleaning",
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
    imageAlt: "Dishwasher loading",
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
    imageAlt: "Hand dish washing",
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
    imageAlt: "Trash collection and sorting",
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
    imageAlt: "Laundry washer operation",
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
    imageAlt: "Laundry fold and transfer",
    tags: [
      { label: "Deformable Obj.", tone: "purple" },
      { label: "Bimanual", tone: "orange" },
    ],
    hours: "250 hrs",
  },
];

function toneClasses(tone: "purple" | "teal" | "orange" | "blue") {
  switch (tone) {
    case "teal":
      return "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200";
    case "orange":
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-200";
    case "blue":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200";
    default:
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200";
  }
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
  const src = frontPageImageUrl(path);

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

function TransformDatasetView({ card }: { card: TransformDatasetCard }) {
  return (
    <article className="relative overflow-hidden rounded-[14px] border border-slate-200 bg-white px-6 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-200 hover:border-violet-300 hover:shadow-[0_6px_28px_rgba(124,58,237,0.10)] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-700/60">
      <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-violet-600 to-violet-600/15" />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-4 pl-1">
        <div>
          <p className="text-[14px] font-bold text-slate-950 dark:text-slate-100">{card.title}</p>
          <p className="mt-1 text-[11px] leading-6 text-slate-500 dark:text-slate-400">
            {card.description}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-bold ${
            card.availability === "In Library"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          }`}
        >
          {card.availability}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[200px_118px_minmax(0,1fr)] xl:items-center">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-blue-700 dark:text-blue-300">
            EXO Source
          </p>
          <div className="relative overflow-hidden rounded-[10px] border-[1.5px] border-blue-300 shadow-[0_2px_8px_rgba(29,78,216,0.08)] dark:border-blue-700/60">
            <SurfaceImage
              path={card.sourceImage}
              alt={card.sourceAlt}
              className="h-[160px] w-full object-cover"
            />
            <span className="absolute left-2 top-2 rounded-[4px] bg-blue-700 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">
              EXO
            </span>
          </div>
        </div>

        <div className="hidden xl:flex xl:flex-col xl:items-center xl:justify-center xl:gap-2">
          <div className="h-6 w-px bg-violet-200 dark:bg-violet-800" />
          <div className="rounded-[16px] border-[1.5px] border-violet-300 bg-violet-50 px-4 py-4 text-center dark:border-violet-700/60 dark:bg-violet-950/40">
            <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-[10px] border border-violet-300 bg-violet-100 dark:border-violet-700/60 dark:bg-violet-900/60">
              <Hand className="h-4 w-4 text-violet-700 dark:text-violet-200" />
            </div>
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200">
              RoboHandMotion
            </p>
            <p className="mt-1 text-[12px] font-extrabold text-slate-950 dark:text-slate-100">
              Engine
            </p>
            <p className="mt-1 text-[8px] text-slate-500 dark:text-slate-400">{card.engineDetail}</p>
          </div>
          <div className="h-6 w-px bg-violet-200 dark:bg-violet-800" />
          <ArrowRight className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-orange-700 dark:text-orange-300">
            Labeled Motion Output
          </p>
          <div className="grid grid-cols-2 gap-2">
            {card.outputs.map((output) => (
              <div
                key={`${card.title}-${output.label}`}
                className="relative overflow-hidden rounded-[8px] border-[1.5px] border-violet-300 shadow-[0_2px_8px_rgba(124,58,237,0.08)] dark:border-violet-700/60"
              >
                <SurfaceImage
                  path={output.image}
                  alt={`${card.title} ${output.label}`}
                  className="h-[160px] w-full object-cover"
                />
                <span className="absolute left-1.5 top-1.5 rounded-[3px] bg-violet-700 px-1.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-white">
                  {output.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
        {card.tags.map((tag) => (
          <span
            key={`${card.title}-${tag.label}`}
            className={`rounded-[3px] border px-2 py-1 text-[9px] font-semibold ${toneClasses(tag.tone)}`}
          >
            {tag.label}
          </span>
        ))}
        <span className="ml-auto text-[12px] font-bold text-violet-700 dark:text-violet-200">
          {card.hours}
        </span>
      </div>
    </article>
  );
}

function HouseholdDatasetView({ card }: { card: HouseholdDatasetCard }) {
  return (
    <article className="overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-200 hover:border-violet-300 hover:shadow-[0_6px_20px_rgba(124,58,237,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-700/60">
      <SurfaceImage path={card.image} alt={card.imageAlt} className="h-[150px] w-full object-cover" />
      <div className="p-4">
        <p className="text-[13px] font-bold text-slate-950 dark:text-slate-100">{card.title}</p>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{card.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {card.tags.map((tag) => (
            <span
              key={`${card.title}-${tag.label}`}
              className={`rounded-[3px] border px-2 py-1 text-[9px] font-semibold ${toneClasses(tag.tone)}`}
            >
              {tag.label}
            </span>
          ))}
          <span className="ml-auto text-[10px] font-bold text-violet-700 dark:text-violet-200">
            {card.hours}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function RoboHandMotion() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-[88px]">
        <div className="mx-auto flex max-w-[1440px]">
          <aside className="hidden min-h-[calc(100vh-88px)] w-[220px] shrink-0 border-r border-slate-200 bg-slate-50/90 xl:flex xl:flex-col dark:border-slate-800 dark:bg-slate-950/80">
            <div className="border-b border-slate-200 px-5 py-6 dark:border-slate-800">
              <p className="text-[18px] font-extrabold tracking-[0.04em] text-primary">DataraAI</p>
              <p className="mt-1 text-[16px] font-bold text-slate-950 dark:text-slate-100">Hand Motion</p>
            </div>
            <div className="flex-1 px-3 py-4">
              <p className="mb-3 px-2 text-[16px] font-extrabold text-slate-950 dark:text-slate-100">
                Verticals
              </p>
              <a
                href="#dk"
                className="mb-1 flex items-center gap-3 rounded-[9px] border border-violet-200 bg-violet-50 px-4 py-3 text-left dark:border-violet-700/60 dark:bg-violet-950/40"
              >
                <span className="h-3 w-3 rounded-[3px] bg-violet-600" />
                <span className="text-[16px] font-extrabold text-slate-950 dark:text-slate-100">
                  Dexterous
                </span>
              </a>
              <a
                href="#ht"
                className="mb-1 flex items-center gap-3 rounded-[9px] px-4 py-3 text-left text-slate-600 transition-colors hover:bg-violet-50/60 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-violet-950/30 dark:hover:text-violet-200"
              >
                <span className="h-3 w-3 rounded-[3px] bg-orange-600" />
                <span className="text-[16px] font-extrabold">Household</span>
              </a>
            </div>
            <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <Link
                to={buildAuthPath("register", "/robohandmotion")}
                className="inline-flex h-10 w-full items-center justify-center rounded-[8px] bg-violet-700 px-4 text-[12px] font-bold text-white transition-opacity hover:opacity-90"
              >
                Get Access
              </Link>
            </div>
          </aside>

          <div className="flex-1 px-4 py-9 sm:px-6 lg:px-11">
            <section className="mb-6">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-[9px] border border-violet-200 bg-violet-50 dark:border-violet-700/60 dark:bg-violet-950/40">
                  <Hand className="h-4 w-4 text-violet-700 dark:text-violet-200" />
                </div>
                <h1 className="text-[30px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">
                  RoboHandMotion
                </h1>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700 dark:border-violet-700/60 dark:bg-violet-950/40 dark:text-violet-200">
                  Patented
                </span>
              </div>
              <p className="max-w-[640px] text-[15px] leading-8 text-slate-500 dark:text-slate-400">
                Patented pipeline capturing{" "}
                <span className="font-semibold text-violet-700 dark:text-violet-200">hand pose</span>,{" "}
                <span className="font-semibold text-blue-700 dark:text-blue-200">tool interactions</span>,{" "}
                and{" "}
                <span className="font-semibold text-orange-700 dark:text-orange-200">object states</span>{" "}
                — labeled and ready for dexterous robot model training.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="rounded-[6px] border border-violet-200 bg-violet-50 px-4 py-2 text-[12px] font-semibold text-violet-700 dark:border-violet-700/60 dark:bg-violet-950/40 dark:text-violet-200">
                  <strong>Hand Pose</strong> — Per-frame keypoint skeleton, joint angles & finger trajectories
                </span>
                <span className="rounded-[6px] border border-blue-200 bg-blue-50 px-4 py-2 text-[12px] font-semibold text-blue-700 dark:border-blue-700/60 dark:bg-blue-950/40 dark:text-blue-200">
                  <strong>Object State</strong> — Grasped object identity, orientation & contact classification
                </span>
              </div>
            </section>

            <section className="mb-7 grid gap-3 md:grid-cols-4">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-[10px] border px-5 py-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
                    stat.featured
                      ? "border-violet-200 bg-violet-50/70 dark:border-violet-700/60 dark:bg-violet-950/30"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  <div
                    className={`font-black tracking-[-0.04em] ${
                      stat.featured
                        ? "text-[18px] text-violet-700 dark:text-violet-200"
                        : "text-[26px] text-violet-700 dark:text-violet-200"
                    }`}
                  >
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </section>

            <section className="mb-10 rounded-[14px] border border-slate-200 bg-slate-50/80 px-6 py-7 dark:border-slate-700 dark:bg-slate-900/70">
              <p className="mb-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                How It Works
              </p>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)_56px_minmax(0,1fr)] xl:items-center">
                {PROCESS_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="contents">
                      <article className={`rounded-[12px] border p-5 ${step.accentClassName}`}>
                        <div className="mb-3 grid h-9 w-9 place-items-center rounded-[8px] border border-current/20 bg-white/40 dark:bg-slate-950/30">
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em]">{step.step}</p>
                        <h2 className="mt-3 text-[16px] font-extrabold text-slate-950 dark:text-slate-100">
                          {step.title}
                        </h2>
                        <p className="mt-2 text-[11px] leading-6 text-slate-600 dark:text-slate-300">
                          {step.description}
                        </p>
                      </article>
                      {index < PROCESS_STEPS.length - 1 ? (
                        <div className="hidden items-center justify-center xl:flex">
                          <div className="flex items-center">
                            <div
                              className={`h-[2px] w-14 rounded-full ${
                                index === 0
                                  ? "bg-gradient-to-r from-blue-700 to-violet-600"
                                  : "bg-gradient-to-r from-violet-600 to-orange-600"
                              }`}
                            />
                            <ArrowRight
                              className={`h-4 w-4 ${index === 0 ? "text-violet-600" : "text-orange-600"}`}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="space-y-10">
              <section id="dk" className="scroll-mt-28">
                <div className="mb-5 flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-[8px] border border-violet-200 bg-violet-50 px-4 py-2 dark:border-violet-700/60 dark:bg-violet-950/40">
                    <span className="h-2 w-2 rounded-[2px] bg-violet-600" />
                    <span className="text-[14px] font-extrabold text-slate-950 dark:text-slate-100">
                      Dexterous Kitchen
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      3 datasets · 1,430 hrs
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-violet-200 to-transparent dark:from-violet-800" />
                </div>
                <div className="space-y-4">
                  {DEXTEROUS_DATASETS.map((card) => (
                    <TransformDatasetView key={card.title} card={card} />
                  ))}
                </div>
              </section>

              <section
                id="ht"
                className="scroll-mt-28 rounded-[14px] border border-slate-200 bg-slate-50/70 px-0 py-0 dark:border-slate-700 dark:bg-slate-900/60"
              >
                <div className="px-6 pt-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-[8px] border border-orange-200 bg-white px-4 py-2 dark:border-orange-700/60 dark:bg-slate-950/60">
                      <span className="h-2 w-2 rounded-[2px] bg-orange-600" />
                      <span className="text-[14px] font-extrabold text-slate-950 dark:text-slate-100">
                        Household Tasks
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        5 datasets · 1,420 hrs
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-orange-200 to-transparent dark:from-orange-800" />
                  </div>
                </div>
                <div className="grid gap-4 px-6 pb-6 lg:grid-cols-3">
                  {HOUSEHOLD_DATASETS.map((card) => (
                    <HouseholdDatasetView key={card.title} card={card} />
                  ))}
                </div>
              </section>

              <section className="rounded-[14px] border-[1.5px] border-dashed border-violet-200 bg-[linear-gradient(135deg,rgba(124,58,237,0.05)_0%,rgba(234,88,12,0.03)_100%)] px-8 py-7 dark:border-violet-700/60 dark:bg-[linear-gradient(135deg,rgba(124,58,237,0.16)_0%,rgba(234,88,12,0.08)_100%)]">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] border border-violet-200 bg-violet-50 dark:border-violet-700/60 dark:bg-violet-950/40">
                      <Plus className="h-4 w-4 text-violet-700 dark:text-violet-200" />
                    </div>
                    <div className="max-w-[480px]">
                      <p className="text-[15px] font-bold text-slate-950 dark:text-slate-100">
                        Run RoboHandMotion on Your Footage
                      </p>
                      <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">
                        Already have footage of hand tasks? We&apos;ll generate labeled pose sequences, grasp
                        annotations, and motion trajectories — across any task, environment, or robot form factor.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-[4px] border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700 dark:border-violet-700/60 dark:bg-violet-950/40 dark:text-violet-200">
                        Dexterous
                      </span>
                      <span className="rounded-[4px] border border-orange-200 bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700 dark:border-orange-700/60 dark:bg-orange-950/40 dark:text-orange-200">
                        Household
                      </span>
                      <span className="rounded-[4px] border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700 dark:border-teal-700/60 dark:bg-teal-950/40 dark:text-teal-200">
                        Industrial
                      </span>
                    </div>
                    <Link
                      to={buildAuthPath("register", "/robohandmotion")}
                      className="inline-flex h-11 items-center justify-center rounded-[8px] bg-violet-700 px-6 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
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
