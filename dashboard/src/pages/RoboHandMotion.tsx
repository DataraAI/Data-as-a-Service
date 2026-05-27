import { Hand, Sparkles } from "lucide-react";
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

type ImageSet = {
  main: string;
  outputs: string[];
};

type TransformCard = {
  title: string;
  description: string;
  availability: "In Library" | "On-demand";
  imageSet: ImageSet;
  tags: string[];
  hours: string;
};

type GalleryCard = {
  title: string;
  description: string;
  image: string;
  tags: string[];
};

const STATS = [
  { value: "8", label: "Datasets" },
  { value: "2,850+", label: "Hours Labeled" },
  { value: "2", label: "Verticals" },
  { value: "Patented", label: "Hand Motion Pipeline" },
];

const PROCESS_STEPS: StepCard[] = [
  {
    step: "Step 01 · Capture",
    title: "Raw Video Footage",
    description:
      "Third-person footage of hand tasks: household, kitchen, or manipulation - any fixed or mobile camera.",
    className: "border-blue-200 bg-blue-50/80 text-blue-700",
  },
  {
    step: "Step 02",
    title: "RoboHandMotion Engine",
    description:
      "Pose estimation, keypoint tracking, and interaction labeling across hands, tools, and grasp states.",
    className: "border-violet-200 bg-violet-50/80 text-violet-700",
  },
  {
    step: "Step 03 · Training Data",
    title: "Labeled Motion Datasets",
    description:
      "Pose sequences, grasp annotations, and tool trajectories - ready for dexterous robot model training.",
    className: "border-orange-200 bg-orange-50/80 text-orange-700",
  },
];

const DEXTEROUS_SHOWCASES: TransformCard[] = [
  {
    title: "Kitchen Drawer Manipulation",
    description:
      "Full-body EXO of trash bag handling to hand-level pose and grasp annotations.",
    availability: "On-demand",
    imageSet: {
      main: "humanoid/humanoid4.png",
      outputs: ["humanoid/humanoid4.png", "humanoid/humanoid3.png", "humanoid/humanoid1.png", "humanoid/humanoid5.png"],
    },
    tags: ["Hand Pose", "Grasp State", "420 hrs labeled"],
    hours: "420 hrs labeled",
  },
  {
    title: "Surface Cleaning - Stovetop",
    description:
      "Full-body cleaning EXO to hand skeleton and contact-zone annotations at varied proximities.",
    availability: "In Library",
    imageSet: {
      main: "humanoid/humanoid1.png",
      outputs: ["humanoid/humanoid1.png", "humanoid/humanoid3.png", "humanoid/humanoid4.png", "humanoid/humanoid5.png"],
    },
    tags: ["Hand Skeleton", "Contact Zone", "610 hrs labeled"],
    hours: "610 hrs labeled",
  },
  {
    title: "Dishwashing - Sink Manipulation",
    description:
      "Wide kitchen scene EXO to grasp classification and wet object handling annotations.",
    availability: "On-demand",
    imageSet: {
      main: "humanoid/humanoid5.png",
      outputs: ["humanoid/humanoid5.png", "humanoid/humanoid3.png", "humanoid/humanoid4.png", "humanoid/humanoid1.png"],
    },
    tags: ["Wet Handling", "Grasp Class", "530 hrs labeled"],
    hours: "530 hrs labeled",
  },
];

const HOUSEHOLD_GALLERY: GalleryCard[] = [
  {
    title: "Surface & Floor Cleaning",
    description: "Sweeping, scrubbing motions - 3 tool types",
    image: "humanoid/humanoid1.png",
    tags: ["Tool Path", "Bimanual"],
  },
  {
    title: "Dishwasher Loading",
    description: "Object placement, rack navigation, door operation",
    image: "humanoid/humanoid2.png",
    tags: ["Bimanual Grasp", "Object Place"],
  },
  {
    title: "Hand Dish Washing",
    description: "Wet-object manipulation with plate and utensil variety",
    image: "humanoid/humanoid3.png",
    tags: ["Wet Contact", "Fine Motion"],
  },
  {
    title: "Laundry - Washer Operation",
    description: "Load, sort, and transfer fabric items",
    image: "humanoid/humanoid5.png",
    tags: ["Deformable Obj.", "Bimanual"],
  },
  {
    title: "Laundry - Fold & Transfer",
    description: "Garment folding, hang, and drawer placement",
    image: "humanoid/humanoid5.png",
    tags: ["Deformable Obj.", "Transfer"],
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

function ShowcaseCard({ card }: { card: TransformCard }) {
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
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">EXO</p>
          <div className="overflow-hidden rounded-[18px] border border-blue-200 bg-white shadow-[0_12px_28px_rgba(29,78,216,0.08)]">
            <SurfaceImage
              path={card.imageSet.main}
              alt={`${card.title} EXO`}
              className="h-[180px] w-full object-cover"
            />
          </div>
        </div>

        <div className="hidden xl:flex flex-col items-center justify-center gap-3 text-violet-700">
          <div className="h-6 w-px bg-violet-200" />
          <div className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em]">
            RoboHandMotion
          </div>
          <div className="h-6 w-px bg-violet-200" />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">Outputs</p>
          <div className="grid grid-cols-2 gap-3">
            {card.imageSet.outputs.map((output, index) => (
              <div key={`${card.title}-${output}-${index}`} className="overflow-hidden rounded-[16px] border border-violet-200 bg-white">
                <SurfaceImage
                  path={output}
                  alt={`${card.title} output ${index + 1}`}
                  className="h-[128px] w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
        {card.tags.map((tag) => (
          <span
            key={`${card.title}-${tag}`}
            className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700"
          >
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

function GalleryCardView({ card }: { card: GalleryCard }) {
  return (
    <article className="marketing-surface overflow-hidden rounded-[22px]">
      <SurfaceImage path={card.image} alt={card.title} className="h-[190px] w-full object-cover" />
      <div className="border-t border-slate-200 p-5">
        <h3 className="text-base font-black tracking-[-0.03em] text-slate-950">{card.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {card.tags.map((tag) => (
            <span
              key={`${card.title}-${tag}`}
              className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700"
            >
              {tag}
            </span>
          ))}
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
          <aside className="hidden min-h-[calc(100vh-88px)] w-[220px] shrink-0 border-r border-slate-200 bg-slate-50/90 xl:flex xl:flex-col">
            <div className="border-b border-slate-200 px-5 py-6">
              <p className="font-sans-tech text-lg font-extrabold tracking-[0.04em] text-primary">DataraAI</p>
              <p className="mt-1 text-base font-bold text-slate-950">Hand Motion</p>
            </div>
            <div className="flex-1 px-3 py-4">
              <p className="px-2 text-base font-extrabold text-slate-950">Verticals</p>
              <div className="mt-3 space-y-2">
                <a href="#dexterous" className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">
                  <span className="h-3 w-3 rounded-[4px] bg-violet-600" />
                  Dexterous
                </a>
                <a href="#household" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-violet-50/60 hover:text-violet-700">
                  <span className="h-3 w-3 rounded-[4px] bg-orange-500" />
                  Household
                </a>
              </div>
            </div>
            <div className="border-t border-slate-200 p-5">
              <Link
                to={buildAuthPath("register", "/robohandmotion")}
                className="inline-flex w-full items-center justify-center rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Get Access
              </Link>
            </div>
          </aside>

          <div className="flex-1">
            <section className="marketing-hero-product border-b border-slate-200 px-4 py-12 sm:px-6 md:px-10 md:py-16">
              <div className="mx-auto max-w-[1180px]">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-[10px] border border-violet-200 bg-violet-50 text-violet-700">
                    <Hand className="h-5 w-5" />
                  </div>
                  <h1 className="text-[clamp(2.4rem,4.8vw,3.75rem)] font-black tracking-[-0.05em] text-slate-950">
                    RoboHandMotion
                  </h1>
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700">
                    Patented
                  </span>
                </div>

                <p className="mt-5 max-w-4xl text-[15px] leading-8 text-slate-600">
                  Patented pipeline capturing hand pose, tool interactions, and object states -
                  labeled and ready for dexterous robot model training.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
                    Hand Pose
                  </span>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                    Object State
                  </span>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-4">
                  {STATS.map((stat) => (
                    <div key={stat.label} className="marketing-surface rounded-[18px] px-5 py-5 text-center">
                      <div className="text-2xl font-black tracking-[-0.04em] text-violet-700">{stat.value}</div>
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

            <section id="dexterous" className="scroll-mt-28 px-4 py-12 sm:px-6 md:px-10">
              <div className="mx-auto max-w-[1180px]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
                    <Sparkles className="h-4 w-4" />
                    Dexterous Kitchen
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-violet-200 to-transparent" />
                </div>
                <div className="space-y-5">
                  {DEXTEROUS_SHOWCASES.map((card) => (
                    <ShowcaseCard key={card.title} card={card} />
                  ))}
                </div>
              </div>
            </section>

            <section id="household" className="scroll-mt-28 border-y border-slate-200 bg-slate-50/70 px-4 py-12 sm:px-6 md:px-10">
              <div className="mx-auto max-w-[1180px]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700">
                    Household Tasks
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-orange-200 to-transparent" />
                </div>
                <div className="grid gap-5 lg:grid-cols-3">
                  {HOUSEHOLD_GALLERY.map((card) => (
                    <GalleryCardView key={card.title} card={card} />
                  ))}
                </div>
              </div>
            </section>

            <section className="marketing-cta-product px-4 py-16 sm:px-6 md:px-10">
              <div className="mx-auto grid max-w-[1180px] gap-8 rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.06)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">
                    Request access
                  </div>
                  <h2 className="mt-4 text-[clamp(1.8rem,2.8vw,2.4rem)] font-black tracking-[-0.05em] text-slate-950">
                    Run RoboHandMotion on your footage.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                    Already have hand-task footage? We&apos;ll generate pose sequences, grasp
                    classes, and manipulation-ready outputs across any task, environment, or robot
                    form factor.
                  </p>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
                  <Link
                    to={buildAuthPath("register", "/robohandmotion")}
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_14px_28px_rgba(13,148,136,0.16)]"
                  >
                    Get Access
                  </Link>
                  <Link
                    to="/robodatahub/dexterity"
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    Explore dexterity data
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
