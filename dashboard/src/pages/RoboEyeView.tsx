import { ArrowRight, Eye, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import FooterSection from "@/components/FooterSection";
import { buildAuthPath } from "@/lib/authLinks";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";

type ProcessStep = {
  step: string;
  title: string;
  description: string;
  className: string;
};

type DatasetCard = {
  title: string;
  description: string;
  availability: "In Library" | "On-demand";
  sourceImage: string;
  sourceLabel: string;
  engineLabel: string;
  outputs: { image: string; label: string }[];
  tags: string[];
  hours: string;
};

type ShowcaseSection = {
  id: string;
  title: string;
  summary: string;
  accent: "dataCenter" | "humanoid" | "automotive";
  countLabel: string;
  cards: DatasetCard[];
};

const STATS = [
  { value: "6", label: "Datasets" },
  { value: "5,570+", label: "EGO Hours" },
  { value: "3", label: "Verticals" },
  { value: "Patented", label: "EXO → EGO Pipeline" },
];

const PROCESS_STEPS: ProcessStep[] = [
  {
    step: "Step 01 · Capture",
    title: "Exocentric Footage",
    description:
      "External, third-person footage from any fixed camera - overhead, wall-mounted, or stationary.",
    className: "border-blue-200 bg-blue-50/80 text-blue-700",
  },
  {
    step: "Step 02",
    title: "RoboEyeView Engine",
    description: "Scene reconstruction and view synthesis.",
    className: "border-teal-200 bg-teal-50/80 text-teal-700",
  },
  {
    step: "Step 03 · Training Data",
    title: "Egocentric Datasets",
    description:
      "Robot's-eye perspective - labeled, multi-angle, ready for model training.",
    className: "border-amber-200 bg-amber-50/80 text-amber-700",
  },
];

const SHOWCASE_SECTIONS: ShowcaseSection[] = [
  {
    id: "dc",
    title: "Data Center",
    summary: "2 datasets · 2,040 hrs",
    accent: "dataCenter",
    countLabel: "2 datasets · 2,040 hrs",
    cards: [
      {
        title: "Server Rack Hardware Swap",
        description:
          "Two-technician swap - external surveillance capture → 3 synthesized EGO views",
        availability: "In Library",
        sourceImage: "serverrack/exo_serverrack.png",
        sourceLabel: "EXO",
        engineLabel: "View Synthesis",
        outputs: [
          { image: "serverrack/ego_serverrack.png", label: "Front" },
          { image: "serverrack/ego_serverrack1.png", label: "Overhead" },
          { image: "serverrack/2ego_serverrack.png", label: "Side" },
          { image: "serverrack/2ego_serverrack.png", label: "Low Angle" },
        ],
        tags: ["Scene Reconstruction", "Depth Estimation", "Multi-angle Synthesis"],
        hours: "1,200 hrs EGO output",
      },
      {
        title: "Server Rack Inspection",
        description:
          "Single technician inspection - EXO Data → 3 synthesized robot viewpoints",
        availability: "In Library",
        sourceImage: "serverrack/2exo_serverrack.png",
        sourceLabel: "EXO",
        engineLabel: "View Synthesis",
        outputs: [
          { image: "serverrack/2ego_serverrack1.png", label: "Front" },
          { image: "serverrack/2ego_serverrack2.png", label: "Overhead" },
          { image: "serverrack/serverrack5.png", label: "Side" },
          { image: "serverrack/serverrack5.png", label: "Low Angle" },
        ],
        tags: ["Scene Reconstruction", "Depth Estimation", "Multi-angle Synthesis"],
        hours: "840 hrs EGO output",
      },
    ],
  },
  {
    id: "hu",
    title: "Humanoid",
    summary: "3 datasets · 1,430 hrs",
    accent: "humanoid",
    countLabel: "3 datasets · 1,430 hrs",
    cards: [
      {
        title: "Kitchen Drawer Manipulation",
        description:
          "Full-body EXO of trash bag handling → synthesized robot hand-level EGO view",
        availability: "On-demand",
        sourceImage: "humanoid/humanoid.png",
        sourceLabel: "EXO",
        engineLabel: "Hand Tracking",
        outputs: [
          { image: "humanoid/humanoid1.png", label: "Robot Hand-level" },
          { image: "humanoid/humanoid1.png", label: "Side" },
          { image: "humanoid/humanoid1.png", label: "Overhead" },
          { image: "humanoid/humanoid1.png", label: "Low Angle" },
        ],
        tags: ["Hand Pose Tracking", "Wrist-level Synthesis", "Grasp Points"],
        hours: "380 hrs EGO output",
      },
      {
        title: "Surface Cleaning — Stovetop",
        description:
          "Full-body cleaning task EXO → 2 robot-perspective EGO views at different proximities",
        availability: "In Library",
        sourceImage: "humanoid/humanoid2.png",
        sourceLabel: "EXO",
        engineLabel: "Motion Synthesis",
        outputs: [
          { image: "humanoid/humanoid3.png", label: "Mid-range" },
          { image: "humanoid/humanoid4.png", label: "Close-up" },
          { image: "humanoid/humanoid4.png", label: "Overhead" },
          { image: "humanoid/humanoid4.png", label: "Low Angle" },
        ],
        tags: ["Hand Pose Tracking", "Surface Segmentation", "Multi-distance Views"],
        hours: "450 hrs EGO output",
      },
      {
        title: "Dishwashing — Sink Manipulation",
        description:
          "Wide kitchen scene EXO → synthesized close-up EGO at hand manipulation level",
        availability: "On-demand",
        sourceImage: "humanoid/humanoid5.png",
        sourceLabel: "EXO",
        engineLabel: "Grasp Synthesis",
        outputs: [
          { image: "humanoid/humanoid6.png", label: "Hand-level Grasp" },
          { image: "humanoid/humanoid6.png", label: "Side" },
          { image: "humanoid/humanoid6.png", label: "Overhead" },
          { image: "humanoid/humanoid6.png", label: "Low Angle" },
        ],
        tags: ["Grasp Keypoints", "Wet Object Handling", "Edge Conditions"],
        hours: "600 hrs EGO output",
      },
    ],
  },
  {
    id: "au",
    title: "Automotive",
    summary: "1 dataset · 2,100 hrs",
    accent: "automotive",
    countLabel: "1 dataset · 2,100 hrs",
    cards: [
      {
        title: "BMW Grille Assembly — Production Line",
        description:
          "Side-view EXO of assembly worker → 4 synthesized robot viewpoints including rotation and low-angle",
        availability: "In Library",
        sourceImage: "carAutomation/exo_carautomation.png",
        sourceLabel: "EXO",
        engineLabel: "4 Viewpoints",
        outputs: [
          { image: "carAutomation/ego_carautomation.png", label: "Front" },
          { image: "carAutomation/ego_carautomation1.png", label: "Rotate Left" },
          { image: "carAutomation/carAutomation.png", label: "Low Angle" },
          { image: "carAutomation/carAutomation1.png", label: "Studio" },
        ],
        tags: ["Scene Reconstruction", "Rotation Synthesis", "Low-angle Views", "4 Viewpoints"],
        hours: "2,100 hrs EGO output",
      },
    ],
  },
];

function accentClasses(accent: ShowcaseSection["accent"]) {
  switch (accent) {
    case "dataCenter":
      return {
        pill: "border-blue-200 bg-blue-50 text-blue-700",
        line: "from-blue-200",
        dot: "bg-blue-600",
      };
    case "humanoid":
      return {
        pill: "border-teal-200 bg-teal-50 text-teal-700",
        line: "from-teal-200",
        dot: "bg-teal-600",
      };
    default:
      return {
        pill: "border-violet-200 bg-violet-50 text-violet-700",
        line: "from-violet-200",
        dot: "bg-violet-600",
      };
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
        className={`flex items-center justify-center bg-slate-100 text-sm text-slate-400 ${className ?? ""}`}
      >
        Image unavailable
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
}

function TransformCardView({
  card,
  accent,
}: {
  card: DatasetCard;
  accent: ShowcaseSection["accent"];
}) {
  const accentMap = accentClasses(accent);
  const stripeClass =
    accent === "dataCenter" ? "bg-blue-700/80" : accent === "humanoid" ? "bg-primary/80" : "bg-violet-700/80";

  return (
    <article className="relative overflow-hidden rounded-[14px] border border-slate-200 bg-white px-6 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-200 hover:border-primary/20 hover:shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
      <div className={`absolute inset-y-0 left-0 w-[3px] ${stripeClass}`} />
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4 pl-1">
        <div className="max-w-2xl">
          <h3 className="text-[14px] font-bold text-slate-950">{card.title}</h3>
          <p className="mt-1 text-[11px] leading-6 text-slate-500">{card.description}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
            card.availability === "In Library"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {card.availability}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[200px_92px_minmax(0,1fr)] xl:items-center">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
            EXO Source
          </p>
          <div className="overflow-hidden rounded-[12px] border border-blue-200 bg-white shadow-[0_8px_20px_rgba(29,78,216,0.08)]">
            <SurfaceImage
              path={card.sourceImage}
              alt={`${card.title} EXO`}
              className="h-[160px] w-full object-cover"
            />
          </div>
        </div>

        <div className="hidden xl:flex xl:flex-col xl:items-center xl:justify-center xl:gap-2">
          <div className="h-6 w-px bg-teal-200" />
          <div className="rounded-[16px] border border-teal-200 bg-teal-50 px-3 py-4 text-center shadow-[0_2px_10px_rgba(13,148,136,0.06)]">
            <div className="text-[8px] font-black uppercase tracking-[0.18em] text-teal-700">
              RoboEyeView
            </div>
            <div className="mt-1 text-[12px] font-extrabold text-slate-950">Engine</div>
            <div className="mt-1 text-[8px] text-slate-500">{card.engineLabel}</div>
          </div>
          <div className="h-6 w-px bg-teal-200" />
          <ArrowRight className="h-3.5 w-3.5 text-primary" />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
            Generated EGO Views
          </p>
          <div className="grid grid-cols-2 gap-3">
            {card.outputs.map((output) => (
              <div
                key={`${card.title}-${output.label}`}
                className="overflow-hidden rounded-[10px] border border-teal-200 bg-white"
              >
                <SurfaceImage
                  path={output.image}
                  alt={`${card.title} ${output.label}`}
                  className="h-[120px] w-full object-cover"
                />
                <div className="border-t border-teal-100 bg-teal-50/60 px-3 py-2 text-[8px] font-black uppercase tracking-[0.14em] text-teal-700">
                  {output.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
        {card.tags.map((tag) => (
          <span
            key={`${card.title}-${tag}`}
            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${accentMap.pill}`}
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto text-[12px] font-bold text-teal-700">{card.hours}</span>
      </div>
    </article>
  );
}

export default function RoboEyeView() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-[88px]">
        <div className="mx-auto flex max-w-[1440px]">
          <aside className="hidden min-h-[calc(100vh-88px)] w-[220px] shrink-0 border-r border-slate-200 bg-slate-50/90 xl:flex xl:flex-col">
            <div className="border-b border-slate-200 px-5 py-6">
              <div className="text-[18px] font-extrabold tracking-[0.04em] text-primary">DataraAI</div>
              <div className="mt-1 text-[16px] font-bold text-slate-950">Visual Intelligence</div>
            </div>
            <div className="flex-1 px-3 py-4">
              <div className="mb-3 px-2 text-[16px] font-extrabold text-slate-950">Verticals</div>
              {SHOWCASE_SECTIONS.map((section, index) => {
                const accent = accentClasses(section.accent);
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`mb-1 flex items-center gap-3 rounded-[9px] border px-3 py-3 text-left transition-colors ${
                      index === 0
                        ? "border-primary/20 bg-primary/8"
                        : "border-transparent hover:bg-primary/6"
                    }`}
                  >
                    <span className={`h-3 w-3 shrink-0 rounded-[3px] ${accent.dot}`} />
                    <span className={`text-[16px] font-extrabold ${index === 0 ? "text-slate-950" : "text-slate-600"}`}>
                      {section.title}
                    </span>
                  </a>
                );
              })}
            </div>
            <div className="border-t border-slate-200 px-5 py-4">
              <Link
                to={buildAuthPath("register", "/roboeyeview")}
                className="inline-flex h-10 w-full items-center justify-center rounded-[8px] bg-primary px-4 text-[12px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Get Access
              </Link>
            </div>
          </aside>

          <div className="flex-1 px-4 py-8 sm:px-6 lg:px-11">
            <div className="mb-5">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-[9px] border border-primary/20 bg-primary/10">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <h1 className="text-[30px] font-black tracking-[-0.03em] text-slate-950">RoboEyeView</h1>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                  Patented
                </span>
              </div>
              <p className="max-w-3xl text-[15px] leading-8 text-slate-500">
                Patented pipeline that converts <span className="font-semibold text-blue-700">EXO</span>{" "}
                footage into <span className="font-semibold text-teal-700">EGO</span> datasets —
                labeled and ready for robot model training.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="rounded-[6px] border border-blue-200 bg-blue-50 px-4 py-2 text-[12px] font-semibold text-blue-700">
                  <strong>EXO</strong> — Exocentric: external fixed-camera view of the workspace
                </span>
                <span className="rounded-[6px] border border-teal-200 bg-teal-50 px-4 py-2 text-[12px] font-semibold text-teal-700">
                  <strong>EGO</strong> — Egocentric: synthesized robot&apos;s-eye perspective for training
                </span>
              </div>
            </div>

            <div className="mb-8 grid gap-3 md:grid-cols-4">
              {STATS.map((stat, index) => (
                <div
                  key={stat.label}
                  className={`rounded-[10px] border bg-white px-5 py-4 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)] ${
                    index === 3 ? "border-primary/20 bg-primary/5" : "border-slate-200"
                  }`}
                >
                  <div className={`text-[26px] font-black tracking-[-0.04em] ${index === 3 ? "text-primary" : "text-slate-950"}`}>
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <section className="mb-8 rounded-[14px] border border-slate-200 bg-slate-50/80 px-6 py-7">
              <div className="mb-6 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                How It Works
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)_56px_minmax(0,1fr)] xl:items-center">
                {PROCESS_STEPS.map((step, index) => (
                  <div key={step.step} className="contents">
                    <div className={`rounded-[12px] border p-5 ${step.className}`}>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em]">
                        {step.step}
                      </div>
                      <h2 className="mt-3 text-[16px] font-extrabold text-slate-950">{step.title}</h2>
                      <p className="mt-2 text-[11px] leading-6 text-slate-600">{step.description}</p>
                    </div>
                    {index < PROCESS_STEPS.length - 1 ? (
                      <div className="hidden items-center justify-center xl:flex">
                        <div className="flex items-center">
                          <div className="h-[2px] w-10 rounded-full bg-gradient-to-r from-blue-500 to-primary" />
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <div className="space-y-8">
              {SHOWCASE_SECTIONS.map((section) => {
                const accent = accentClasses(section.accent);
                return (
                  <section key={section.id} id={section.id} className="scroll-mt-28">
                    <div className="mb-4 flex items-center gap-3">
                      <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-extrabold ${accent.pill}`}>
                        <span className={`h-2 w-2 rounded-[2px] ${accent.dot}`} />
                        {section.title}
                        <span className="text-[11px] font-semibold text-slate-500">{section.summary}</span>
                      </div>
                      <div className={`h-px flex-1 bg-gradient-to-r ${accent.line} to-transparent`} />
                    </div>

                    <div className="space-y-4">
                      {section.cards.map((card) => (
                        <TransformCardView key={`${section.id}-${card.title}`} card={card} accent={section.accent} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <section className="mt-8 rounded-[14px] border border-primary/20 border-dashed bg-[linear-gradient(135deg,rgba(13,148,136,0.05),rgba(29,78,216,0.03))] px-8 py-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] border border-primary/20 bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="max-w-2xl">
                    <h2 className="text-[15px] font-bold text-slate-950">
                      Run RoboEyeView on Your EXO Footage
                    </h2>
                    <p className="mt-2 text-[12px] leading-6 text-slate-500">
                      Already have EXO footage? We&apos;ll synthesize robot-ready EGO datasets —
                      egocentric robot-perspective viewpoints — across any task, environment, or
                      robot form factor.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-[4px] border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700">
                      Data Center
                    </span>
                    <span className="rounded-[4px] border border-teal-200 bg-teal-50 px-3 py-1 text-[10px] font-bold text-teal-700">
                      Humanoid
                    </span>
                    <span className="rounded-[4px] border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold text-violet-700">
                      Automotive
                    </span>
                  </div>
                  <Link
                    to={buildAuthPath("register", "/roboeyeview")}
                    className="inline-flex h-11 items-center justify-center rounded-[8px] bg-primary px-6 text-[13px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Submit Your Footage
                    <ArrowRight className="ml-2 h-4 w-4" />
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
