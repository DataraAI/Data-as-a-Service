import type { ReactNode } from "react";
import { Boxes, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import FooterSection from "@/components/FooterSection";
import Navigation from "@/components/Navigation";
import { buildAuthPath } from "@/lib/authLinks";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";

type StepCard = {
  title: string;
  description: string;
  accent: "blue" | "orange" | "teal";
  icon: "capture" | "engine" | "training";
};

type ShowcaseCard = {
  title: string;
  description: string;
  availability: "In Library" | "On-demand";
  demoImage: string;
  engineDetail: string;
  outputs: { image: string; label: string }[];
  tags: { label: string; tone: "teal" | "orange" | "blue" | "purple" }[];
  hours: string;
};

type GalleryCard = {
  title: string;
  description: string;
  image: string;
  tags: { label: string; tone: "teal" | "orange" | "blue" | "purple" }[];
  hours: string;
};

const STATS = [
  { value: "13", label: "Datasets" },
  { value: "5,230+", label: "Hours Labeled" },
  { value: "4", label: "Verticals" },
  { value: "95%", label: "Precision · Peer Robotics", featured: true },
];

const PROCESS_STEPS: StepCard[] = [
  {
    title: "Task Demonstration",
    description:
      "Human or robot demonstration of pick-place, assembly, or cabling — any workspace or form factor.",
    accent: "blue",
    icon: "capture",
  },
  {
    title: "RoboTaskManipulator Engine",
    description: "Step segmentation, grasp classification & trajectory extraction.",
    accent: "orange",
    icon: "engine",
  },
  {
    title: "Task Sequences",
    description:
      "Labeled step sequences with grasp primitives and waypoints — ready for imitation learning.",
    accent: "teal",
    icon: "training",
  },
];

const WAREHOUSE_SHOWCASES: ShowcaseCard[] = [
  {
    title: "Pick & Place — Bin Sorting",
    description:
      "Wide-aisle EXO of pick cycle → step-segmented grasp & place annotations with waypoints",
    availability: "In Library",
    demoImage: "warehouse/warehouse4.png",
    engineDetail: "Step Segment",
    outputs: [
      { image: "warehouse/warehouse2.png", label: "Approach" },
      { image: "warehouse/warehouse2.png", label: "Grasp" },
      { image: "warehouse/warehouse2.png", label: "Transport" },
      { image: "warehouse/warehouse2.png", label: "Place" },
    ],
    tags: [
      { label: "Step Segmentation", tone: "teal" },
      { label: "Grasp Primitives", tone: "teal" },
      { label: "Waypoints", tone: "orange" },
    ],
    hours: "620 hrs labeled",
  },
  {
    title: "Pallet Build — Stack & Wrap",
    description:
      "Floor-level EXO of pallet stacking → ordered stack sequence with wrap & secure step labels",
    availability: "On-demand",
    demoImage: "warehouse/warehouse3.png",
    engineDetail: "Trajectory Map",
    outputs: [
      { image: "warehouse/warehouse1.png", label: "Layer 1" },
      { image: "warehouse/warehouse1.png", label: "Stack Pt." },
      { image: "warehouse/warehouse1.png", label: "Wrap Path" },
      { image: "warehouse/warehouse1.png", label: "Secure" },
    ],
    tags: [
      { label: "Stack Sequence", tone: "teal" },
      { label: "Height Estimation", tone: "orange" },
      { label: "Wrap Trajectory", tone: "blue" },
    ],
    hours: "580 hrs labeled",
  },
];

const AUTOMOTIVE_GALLERY: GalleryCard[] = [
  {
    title: "Front Grille Assembly",
    description: "Clip-insert & fastener sequence — 12 sub-steps",
    image: "carAutomation/carAutomation2.png",
    tags: [
      { label: "Precision Insert", tone: "purple" },
      { label: "Force Feedback", tone: "orange" },
    ],
    hours: "420 hrs",
  },
  {
    title: "Rear Bumper Installation",
    description: "Two-arm alignment, clip-in & torque verification",
    image: "carAutomation/carAutomation5.png",
    tags: [
      { label: "Bimanual", tone: "purple" },
      { label: "Alignment", tone: "teal" },
    ],
    hours: "380 hrs",
  },
  {
    title: "Front Seat Assembly",
    description: "Rail mount, bolt torque & harness connection sequence",
    image: "carAutomation/carAutomation3.png",
    tags: [
      { label: "Multi-step", tone: "purple" },
      { label: "Torque Seq.", tone: "blue" },
    ],
    hours: "360 hrs",
  },
  {
    title: "Passenger Seat Positioning",
    description: "Rotation & slide-lock with 45° approach variant",
    image: "carAutomation/carAutomation4.png",
    tags: [
      { label: "Rotation", tone: "purple" },
      { label: "Slide-lock", tone: "orange" },
    ],
    hours: "380 hrs",
  },
];

const DATA_CENTER_GALLERY: GalleryCard[] = [
  {
    title: "Server Rack Cabling",
    description: "Cable route, insert & label sequence",
    image: "serverrack/serverrack1.png",
    tags: [{ label: "Cable Route", tone: "blue" }],
    hours: "280 hrs",
  },
  {
    title: "Hardware Swap Protocol",
    description: "Drive, card & module replacement",
    image: "serverrack/serverrack2.png",
    tags: [{ label: "Hot-swap", tone: "blue" }],
    hours: "260 hrs",
  },
  {
    title: "Component Inspection",
    description: "Visual scan & probe verification steps",
    image: "serverrack/serverrack3.png",
    tags: [{ label: "Visual QA", tone: "blue" }],
    hours: "260 hrs",
  },
  {
    title: "Cable Management",
    description: "Bundle, route & secure with label scan",
    image: "serverrack/serverrack4.png",
    tags: [{ label: "Bundling", tone: "blue" }],
    hours: "260 hrs",
  },
];

const DEXTERITY_GALLERY: GalleryCard[] = [
  {
    title: "Kitchen Drawer Manipulation",
    description: "Step-segmented drawer open, grasp & place sequence with hand pose labels",
    image: "humanoid/kitchendrawer.png",
    tags: [
      { label: "Hand Pose", tone: "teal" },
      { label: "Grasp Primitives", tone: "orange" },
    ],
    hours: "380 hrs",
  },
  {
    title: "Surface Cleaning — Stovetop",
    description: "Wipe trajectory & contact zone sequence across stovetop surface",
    image: "humanoid/stovetop.png",
    tags: [
      { label: "Trajectory", tone: "teal" },
      { label: "Contact Points", tone: "blue" },
    ],
    hours: "450 hrs",
  },
  {
    title: "Dishwashing — Sink Manipulation",
    description: "Grasp, scrub & rinse step sequence with wet object handling annotations",
    image: "humanoid/dishwashing.png",
    tags: [
      { label: "Grasp Type", tone: "teal" },
      { label: "Edge Conditions", tone: "orange" },
    ],
    hours: "600 hrs",
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
  tone: "teal" | "orange" | "blue" | "purple";
  children: ReactNode;
}) {
  const classes =
    tone === "teal"
      ? "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200"
      : tone === "orange"
        ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200"
        : tone === "blue"
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200"
          : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200";

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
            "featured" in stat && stat.featured ? "bg-orange-50 dark:bg-orange-950/20" : ""
          }`}
        >
          <p
            className={`font-black tracking-[-0.04em] text-orange-600 dark:text-orange-300 ${
              "featured" in stat && stat.featured ? "text-[22px]" : "text-[28px]"
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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
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
      : step.accent === "orange"
        ? "border-orange-200 bg-orange-50/80 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200"
        : "border-teal-200 bg-teal-50/80 text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200";

  const iconClasses =
    step.accent === "blue"
      ? "border-blue-300 bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50"
      : step.accent === "orange"
        ? "border-orange-300 bg-orange-100 dark:border-orange-800 dark:bg-orange-950/50"
        : "border-teal-300 bg-teal-100 dark:border-teal-800 dark:bg-teal-950/50";

  return (
    <div className={`flex min-h-[176px] flex-1 flex-col rounded-[12px] border px-[22px] py-5 ${classes}`}>
      <div className={`mb-3 grid h-9 w-9 place-items-center rounded-[8px] border ${iconClasses}`}>
        <StepIcon type={step.icon} />
      </div>
      <p className="mb-2 text-[16px] font-extrabold text-slate-950 dark:text-slate-100">{step.title}</p>
      <p className="text-[11px] leading-6 text-slate-500 dark:text-slate-400">{step.description}</p>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden shrink-0 items-center px-5 lg:flex">
      <div className="flex items-center">
        <div className="h-[2px] w-14 rounded-[2px] bg-gradient-to-r from-blue-700 to-orange-600" />
        <div className="h-0 w-0 border-y-[7px] border-y-transparent border-l-[11px] border-l-orange-600" />
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
  accent: "teal" | "purple" | "blue";
}) {
  const dot =
    accent === "teal" ? "bg-teal-600" : accent === "purple" ? "bg-violet-600" : "bg-blue-700";
  const line =
    accent === "teal" ? "from-teal-200" : accent === "purple" ? "from-violet-200" : "from-blue-200";

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

function AvailabilityPill({ value }: { value: ShowcaseCard["availability"] }) {
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
        <div className="w-full rounded-[16px] border-[1.5px] border-orange-300 bg-white px-4 py-4 text-center shadow-[0_8px_20px_rgba(234,88,12,0.06)] dark:border-orange-800/60 dark:bg-slate-900">
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-[10px] border border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-200">
            <Workflow className="h-4 w-4" />
          </div>
          <p className="mb-0.5 text-[8px] font-extrabold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-200">
            RoboTask
          </p>
          <p className="mb-1 text-[12px] font-extrabold text-slate-950 dark:text-slate-100">Engine</p>
          <p className="text-[8px] text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
        <div className="my-2 h-6 w-px bg-slate-200 dark:bg-slate-700" />
        <svg width="10" height="14" viewBox="0 0 10 14" fill="none" className="text-orange-600">
          <path d="M1 1l8 6-8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function ShowcaseCardView({ card }: { card: ShowcaseCard }) {
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
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-blue-700 dark:text-blue-200">Task Demo</p>
          <div className="relative overflow-hidden rounded-[12px] bg-slate-100 dark:bg-slate-800">
            <SurfaceImage path={card.demoImage} alt={`${card.title} demo`} className="h-[176px] w-full object-cover" />
            <span className="absolute left-2 top-2 rounded-[4px] bg-blue-700 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">
              Demo
            </span>
          </div>
        </div>

        <Pipe detail={card.engineDetail} />

        <div className="mt-4 flex-1 lg:mt-0">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-teal-700 dark:text-teal-300">
            Task Sequence Output
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
        <span className="ml-auto text-[12px] font-bold text-orange-700 dark:text-orange-200">{card.hours}</span>
      </div>
    </article>
  );
}

function GalleryCardView({ card, compact = false }: { card: GalleryCard; compact?: boolean }) {
  return (
    <article className="overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-900">
      <SurfaceImage
        path={card.image}
        alt={card.title}
        className={`${compact ? "h-[132px]" : "h-[190px]"} w-full object-cover`}
      />
      <div className="p-4">
        <p className="text-[13px] font-bold text-slate-950 dark:text-slate-100">{card.title}</p>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{card.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {card.tags.map((tag) => (
            <Badge key={`${card.title}-${tag.label}`} tone={tag.tone}>
              {tag.label}
            </Badge>
          ))}
          <span className="ml-auto text-[10px] font-bold text-orange-700 dark:text-orange-200">{card.hours}</span>
        </div>
      </div>
    </article>
  );
}

export default function RoboTaskManipulator() {
  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <Navigation />

      <main className="pt-[88px]">
        <div className="mx-auto flex max-w-[1440px]">
          <aside className="hidden min-h-[calc(100vh-88px)] w-[220px] shrink-0 border-r border-slate-200 bg-slate-50/90 xl:flex xl:flex-col dark:border-slate-800 dark:bg-slate-950/80">
            <div className="border-b border-slate-200 px-5 py-6 dark:border-slate-800">
              <p className="text-[18px] font-extrabold tracking-[0.04em] text-primary">DataraAI</p>
              <p className="mt-1 text-[16px] font-bold text-slate-950 dark:text-slate-100">Task Manipulator</p>
            </div>
            <div className="flex-1 px-3 py-4">
              <p className="mb-3 px-2 text-[16px] font-extrabold text-slate-950 dark:text-slate-100">Verticals</p>
              <a
                href="#dc"
                className="mb-1 flex items-center gap-3 rounded-[9px] border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/30"
              >
                <span className="h-3 w-3 rounded-[3px] bg-blue-700" />
                <span className="text-[16px] font-extrabold text-slate-950 dark:text-slate-100">Data Center</span>
              </a>
              <a
                href="#wh"
                className="mb-1 flex items-center gap-3 rounded-[9px] px-4 py-3 text-slate-600 transition-colors hover:bg-orange-50/60 hover:text-orange-700 dark:text-slate-300 dark:hover:bg-orange-950/20 dark:hover:text-orange-200"
              >
                <span className="h-3 w-3 rounded-[3px] bg-orange-500" />
                <span className="text-[16px] font-extrabold">Warehouse</span>
              </a>
              <a
                href="#hu"
                className="mb-1 flex items-center gap-3 rounded-[9px] px-4 py-3 text-slate-600 transition-colors hover:bg-teal-50/60 hover:text-teal-700 dark:text-slate-300 dark:hover:bg-teal-950/20 dark:hover:text-teal-200"
              >
                <span className="h-3 w-3 rounded-[3px] bg-teal-600" />
                <span className="text-[16px] font-extrabold">Dexterity</span>
              </a>
              <a
                href="#au"
                className="mb-1 flex items-center gap-3 rounded-[9px] px-4 py-3 text-slate-600 transition-colors hover:bg-violet-50/60 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-violet-950/20 dark:hover:text-violet-200"
              >
                <span className="h-3 w-3 rounded-[3px] bg-violet-600" />
                <span className="text-[16px] font-extrabold">Automotive</span>
              </a>
            </div>
            <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <Link
                to={buildAuthPath("register", "/robotaskmanipulator")}
                className="inline-flex h-10 w-full items-center justify-center rounded-[8px] bg-orange-600 px-4 text-[12px] font-bold text-white transition-opacity hover:opacity-90"
              >
                Get Access
              </Link>
            </div>
          </aside>

          <div className="flex-1 overflow-hidden bg-white px-4 py-9 sm:px-6 md:px-10 xl:px-11 dark:bg-slate-950">
            <div className="mx-auto max-w-[1180px]">
              <section className="mb-6">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-[9px] border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
                    <Boxes className="h-4 w-4" />
                  </div>
                  <h1 className="text-[30px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">
                    RoboTaskManipulator
                  </h1>
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
                    Task Intelligence
                  </span>
                </div>
                <p className="mb-[14px] max-w-[640px] text-[15px] leading-8 text-slate-500 dark:text-slate-400">
                  End-to-end <span className="font-semibold text-orange-700 dark:text-orange-300">assembly</span>,{" "}
                  <span className="font-semibold text-teal-700 dark:text-teal-300">pick-place</span>, and{" "}
                  <span className="font-semibold text-blue-700 dark:text-blue-300">cabling</span> workflow datasets — step-segmented and ready for imitation learning and policy training.
                </p>
                <div className="flex flex-wrap gap-[10px]">
                  <span className="rounded-[6px] border border-orange-200 bg-orange-50 px-[13px] py-[5px] text-[12px] font-semibold text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
                    <strong>Step Sequences</strong> — Per-task action graph with ordered manipulation primitives
                  </span>
                  <span className="rounded-[6px] border border-teal-200 bg-teal-50 px-[13px] py-[5px] text-[12px] font-semibold text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200">
                    <strong>95% Precision</strong> — Validated at Peer Robotics production deployment
                  </span>
                </div>
              </section>

              <section className="mb-10">
                <StatStrip />
              </section>

              <section className="mb-10 rounded-[14px] border border-slate-200 bg-slate-50/80 px-8 py-7 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="mb-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">How It Works</p>
                <div className="lg:flex lg:items-stretch">
                  <StepCardView step={PROCESS_STEPS[0]} />
                  <FlowArrow />
                  <StepCardView step={PROCESS_STEPS[1]} />
                  <FlowArrow />
                  <StepCardView step={PROCESS_STEPS[2]} />
                </div>
              </section>

              <section className="flex flex-col gap-10">
                <div id="dc" className="scroll-mt-28">
                  <SectionHeader title="Data Center" summary="4 datasets · 1,060 hrs" accent="blue" />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {DATA_CENTER_GALLERY.map((card) => (
                      <GalleryCardView key={card.title} card={card} compact />
                    ))}
                  </div>
                </div>

                <div id="wh" className="scroll-mt-28">
                  <SectionHeader title="Warehouse" summary="2 datasets · 1,200 hrs" accent="teal" />
                  <div className="flex flex-col gap-4">
                    {WAREHOUSE_SHOWCASES.map((card) => (
                      <ShowcaseCardView key={card.title} card={card} />
                    ))}
                  </div>
                </div>

                <div id="hu" className="scroll-mt-28">
                  <SectionHeader title="Dexterity" summary="3 datasets · 1,430 hrs" accent="teal" />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {DEXTERITY_GALLERY.map((card) => (
                      <GalleryCardView key={card.title} card={card} />
                    ))}
                  </div>
                </div>

                <div id="au" className="scroll-mt-28">
                  <SectionHeader title="Automotive Assembly" summary="4 datasets · 1,540 hrs" accent="purple" />
                  <div className="grid gap-4 md:grid-cols-2">
                    {AUTOMOTIVE_GALLERY.map((card) => (
                      <GalleryCardView key={card.title} card={card} />
                    ))}
                  </div>
                </div>

                <div className="mt-1 flex flex-col justify-between gap-6 rounded-[14px] border-[1.5px] border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-teal-50 px-8 py-7 lg:flex-row lg:items-center dark:border-orange-900/50 dark:from-orange-950/20 dark:to-teal-950/20">
                  <div className="flex items-center gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                    <div>
                      <p className="mb-1 text-[15px] font-bold text-slate-950 dark:text-slate-100">
                        Run RoboTaskManipulator on Your Workflow
                      </p>
                      <p className="max-w-[480px] text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                        Have assembly, pick-place, or cabling footage? We&apos;ll generate step-segmented task sequences with grasp primitives and waypoints — across any task, environment, or robot form factor.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 lg:items-center">
                    <div className="flex gap-[5px]">
                      <Badge tone="teal">Warehouse</Badge>
                      <Badge tone="purple">Automotive</Badge>
                      <Badge tone="blue">Data Center</Badge>
                    </div>
                    <Link
                      to={buildAuthPath("register", "/robotaskmanipulator")}
                      className="inline-flex w-full items-center justify-center rounded-[8px] bg-orange-600 px-6 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                    >
                      Submit Your Workflow
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
