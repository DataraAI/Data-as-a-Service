import { Boxes, ClipboardList, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import FooterSection from "@/components/FooterSection";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";
import { buildAuthPath } from "@/lib/authLinks";

type StepCard = {
  step: string;
  title: string;
  description: string;
  className: string;
};

type TransformCard = {
  title: string;
  description: string;
  availability: "In Library" | "On-demand";
  demoImage: string;
  outputImage: string;
  outputLabels: string[];
  tags: string[];
  hours: string;
};

type GalleryCard = {
  title: string;
  description: string;
  image: string;
  tags: string[];
  hours: string;
};

const STATS = [
  { value: "10", label: "Datasets" },
  { value: "3,800+", label: "Hours Labeled" },
  { value: "3", label: "Verticals" },
  { value: "95%", label: "Precision · Peer Robotics" },
];

const PROCESS_STEPS: StepCard[] = [
  {
    step: "Step 01 · Capture",
    title: "Task Demonstration",
    description:
      "Human or robot demonstration of pick-place, assembly, or cabling - any workspace or form factor.",
    className: "border-blue-200 bg-blue-50/80 text-blue-700",
  },
  {
    step: "Step 02",
    title: "RoboTaskManipulator Engine",
    description:
      "Step segmentation, grasp classification, and trajectory extraction across task executions.",
    className: "border-orange-200 bg-orange-50/80 text-orange-700",
  },
  {
    step: "Step 03 · Policy Data",
    title: "Task Sequences",
    description:
      "Labeled step sequences with grasp primitives and waypoints - ready for imitation learning.",
    className: "border-teal-200 bg-teal-50/80 text-teal-700",
  },
];

const WAREHOUSE_SHOWCASES: TransformCard[] = [
  {
    title: "Pick & Place - Bin Sorting",
    description:
      "Wide-aisle EXO of pick cycle to step-segmented grasp and place annotations with waypoints.",
    availability: "In Library",
    demoImage: "warehouse/warehouse4.png",
    outputImage: "warehouse/warehouse2.png",
    outputLabels: ["Approach", "Grasp", "Transport", "Place"],
    tags: ["Step Segmentation", "Grasp Primitives", "Waypoints"],
    hours: "620 hrs labeled",
  },
  {
    title: "Pallet Build - Stack & Wrap",
    description:
      "Floor-level EXO of pallet stacking to ordered stack sequence with wrap and secure step labels.",
    availability: "On-demand",
    demoImage: "warehouse/warehouse3.png",
    outputImage: "warehouse/warehouse1.png",
    outputLabels: ["Layer 1", "Stack Pt.", "Wrap Path", "Secure"],
    tags: ["Stack Sequence", "Height Estimation", "Wrap Trajectory"],
    hours: "580 hrs labeled",
  },
];

const AUTOMOTIVE_GALLERY: GalleryCard[] = [
  {
    title: "Front Grille Assembly",
    description: "Clip-insert and fastener sequence - 12 sub-steps",
    image: "carAutomation/carAutomation2.png",
    tags: ["Precision Insert", "Force Feedback"],
    hours: "420 hrs",
  },
  {
    title: "Rear Bumper Installation",
    description: "Two-arm alignment, clip-in, and torque verification",
    image: "carAutomation/carAutomation5.png",
    tags: ["Bimanual", "Alignment"],
    hours: "380 hrs",
  },
  {
    title: "Front Seat Assembly",
    description: "Rail mount, bolt torque, and harness connection sequence",
    image: "carAutomation/carAutomation3.png",
    tags: ["Multi-step", "Torque Seq."],
    hours: "360 hrs",
  },
  {
    title: "Passenger Seat Positioning",
    description: "Rotation and slide-lock with a 45-degree approach variant",
    image: "carAutomation/carAutomation4.png",
    tags: ["Rotation", "Slide-lock"],
    hours: "380 hrs",
  },
];

const DATA_CENTER_GALLERY: GalleryCard[] = [
  {
    title: "Server Rack Cabling",
    description: "Cable route, insert, and label sequence",
    image: "serverrack/serverrack1.png",
    tags: ["Cable Route"],
    hours: "280 hrs",
  },
  {
    title: "Hardware Swap Protocol",
    description: "Drive, card, and module replacement",
    image: "serverrack/serverrack2.png",
    tags: ["Hot-swap"],
    hours: "260 hrs",
  },
  {
    title: "Component Inspection",
    description: "Visual scan and probe verification steps",
    image: "serverrack/serverrack3.png",
    tags: ["Visual QA"],
    hours: "260 hrs",
  },
  {
    title: "Patch-Panel Verification",
    description: "Loop-dress review and final routing confirmation",
    image: "serverrack/serverrack4.png",
    tags: ["Routing QA"],
    hours: "260 hrs",
  },
];

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
      <div className={`flex items-center justify-center bg-slate-100 text-sm text-slate-400 ${className ?? ""}`}>
        Image unavailable
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
}

function TaskShowcase({ card }: { card: TransformCard }) {
  return (
    <article className="marketing-surface overflow-hidden rounded-[24px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="max-w-2xl">
          <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">{card.title}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">{card.description}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
            card.availability === "In Library"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-orange-200 bg-orange-50 text-orange-700"
          }`}
        >
          {card.availability}
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[220px_92px_minmax(0,1fr)] xl:items-center">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Task Demo</p>
          <div className="overflow-hidden rounded-[18px] border border-blue-200 bg-white shadow-[0_12px_28px_rgba(29,78,216,0.08)]">
            <SurfaceImage
              path={card.demoImage}
              alt={`${card.title} demo`}
              className="h-[180px] w-full object-cover"
            />
          </div>
        </div>

        <div className="hidden xl:flex flex-col items-center justify-center gap-3 text-orange-700">
          <div className="h-6 w-px bg-orange-200" />
          <div className="rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em]">
            RoboTask
          </div>
          <div className="h-6 w-px bg-orange-200" />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">Task Sequence Output</p>
          <div className="grid grid-cols-2 gap-3">
            {card.outputLabels.map((label) => (
              <div key={`${card.title}-${label}`} className="overflow-hidden rounded-[16px] border border-orange-200 bg-white">
                <SurfaceImage
                  path={card.outputImage}
                  alt={`${card.title} ${label}`}
                  className="h-[128px] w-full object-cover"
                />
                <div className="border-t border-orange-100 bg-orange-50/60 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
        {card.tags.map((tag) => (
          <span
            key={`${card.title}-${tag}`}
            className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700"
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto text-sm font-bold text-orange-700">{card.hours}</span>
      </div>
    </article>
  );
}

function GalleryCardView({ card, compact = false }: { card: GalleryCard; compact?: boolean }) {
  return (
    <article className="marketing-surface overflow-hidden rounded-[22px]">
      <SurfaceImage
        path={card.image}
        alt={card.title}
        className={`${compact ? "h-[150px]" : "h-[190px]"} w-full object-cover`}
      />
      <div className="border-t border-slate-200 p-5">
        <h3 className="text-base font-black tracking-[-0.03em] text-slate-950">{card.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {card.tags.map((tag) => (
            <span
              key={`${card.title}-${tag}`}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600"
            >
              {tag}
            </span>
          ))}
          <span className="ml-auto text-sm font-bold text-orange-700">{card.hours}</span>
        </div>
      </div>
    </article>
  );
}

export default function RoboTaskManipulator() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-[88px]">
        <div className="mx-auto flex max-w-[1440px]">
          <aside className="hidden min-h-[calc(100vh-88px)] w-[220px] shrink-0 border-r border-slate-200 bg-slate-50/90 xl:flex xl:flex-col">
            <div className="border-b border-slate-200 px-5 py-6">
              <p className="font-sans-tech text-lg font-extrabold tracking-[0.04em] text-primary">DataraAI</p>
              <p className="mt-1 text-base font-bold text-slate-950">Task Manipulator</p>
            </div>
            <div className="flex-1 px-3 py-4">
              <p className="px-2 text-base font-extrabold text-slate-950">Verticals</p>
              <div className="mt-3 space-y-2">
                <a href="#warehouse" className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-700">
                  <span className="h-3 w-3 rounded-[4px] bg-teal-600" />
                  Warehouse
                </a>
                <a href="#automotive" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-orange-50/60 hover:text-orange-700">
                  <span className="h-3 w-3 rounded-[4px] bg-violet-600" />
                  Automotive
                </a>
                <a href="#datacenter" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-blue-50/60 hover:text-blue-700">
                  <span className="h-3 w-3 rounded-[4px] bg-blue-600" />
                  Data Center
                </a>
              </div>
            </div>
            <div className="border-t border-slate-200 p-5">
              <Link
                to={buildAuthPath("register", "/robotaskmanipulator")}
                className="inline-flex w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Get Access
              </Link>
            </div>
          </aside>

          <div className="flex-1">
            <section className="marketing-hero-product border-b border-slate-200 px-4 py-12 sm:px-6 md:px-10 md:py-16">
              <div className="mx-auto max-w-[1180px]">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-[10px] border border-orange-200 bg-orange-50 text-orange-700">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <h1 className="text-[clamp(2.4rem,4.8vw,3.75rem)] font-black tracking-[-0.05em] text-slate-950">
                    RoboTaskManipulator
                  </h1>
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700">
                    Task Intelligence
                  </span>
                </div>

                <p className="mt-5 max-w-4xl text-[15px] leading-8 text-slate-600">
                  End-to-end assembly, pick-place, and cabling workflow datasets - step-segmented
                  and ready for imitation learning and policy training.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
                    Step Sequences
                  </span>
                  <span className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
                    95% Precision - Peer Robotics
                  </span>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-4">
                  {STATS.map((stat) => (
                    <div key={stat.label} className="marketing-surface rounded-[18px] px-5 py-5 text-center">
                      <div className="text-2xl font-black tracking-[-0.04em] text-orange-700">{stat.value}</div>
                      <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="border-b border-slate-200 bg-slate-50/80 px-4 py-12 sm:px-6 md:px-10">
              <div className="mx-auto max-w-[1180px]">
                <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  How It Works
                </p>
                <div className="grid gap-5 lg:grid-cols-3">
                  {PROCESS_STEPS.map((step) => (
                    <article key={step.title} className={`rounded-[22px] border p-6 ${step.className}`}>
                      <div className="text-[10px] font-black uppercase tracking-[0.16em]">{step.step}</div>
                      <h2 className="mt-4 text-xl font-black tracking-[-0.03em] text-slate-950">{step.title}</h2>
                      <p className="mt-4 text-sm leading-7 text-slate-700">{step.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section id="warehouse" className="scroll-mt-28 px-4 py-12 sm:px-6 md:px-10">
              <div className="mx-auto max-w-[1180px]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">
                    <ClipboardList className="h-4 w-4" />
                    Warehouse
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-teal-200 to-transparent" />
                </div>
                <div className="space-y-5">
                  {WAREHOUSE_SHOWCASES.map((card) => (
                    <TaskShowcase key={card.title} card={card} />
                  ))}
                </div>
              </div>
            </section>

            <section id="automotive" className="scroll-mt-28 border-y border-slate-200 bg-slate-50/70 px-4 py-12 sm:px-6 md:px-10">
              <div className="mx-auto max-w-[1180px]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
                    <Boxes className="h-4 w-4" />
                    Automotive
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-violet-200 to-transparent" />
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  {AUTOMOTIVE_GALLERY.map((card) => (
                    <GalleryCardView key={card.title} card={card} />
                  ))}
                </div>
              </div>
            </section>

            <section id="datacenter" className="scroll-mt-28 px-4 py-12 sm:px-6 md:px-10">
              <div className="mx-auto max-w-[1180px]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">
                    Data Center
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-blue-200 to-transparent" />
                </div>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {DATA_CENTER_GALLERY.map((card) => (
                    <GalleryCardView key={card.title} card={card} compact />
                  ))}
                </div>
              </div>
            </section>

            <section className="marketing-cta-product px-4 py-16 sm:px-6 md:px-10">
              <div className="mx-auto grid max-w-[1180px] gap-8 rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.06)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-700">
                    Request access
                  </div>
                  <h2 className="mt-4 text-[clamp(1.8rem,2.8vw,2.4rem)] font-black tracking-[-0.05em] text-slate-950">
                    Run RoboTaskManipulator on your workflow.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                    Have assembly, pick-place, or cabling footage? We&apos;ll generate
                    step-segmented task sequences with explicit manipulation stages across your
                    operating environment.
                  </p>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
                  <Link
                    to={buildAuthPath("register", "/robotaskmanipulator")}
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(13,148,136,0.16)]"
                  >
                    Get Access
                  </Link>
                  <Link
                    to="/robodatahub/warehouse"
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    Explore task data
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
