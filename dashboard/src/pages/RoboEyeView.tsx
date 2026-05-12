import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import FooterSection from "@/components/FooterSection";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";
import { buildAuthPath } from "@/lib/authLinks";

interface ShowcaseImage {
  path: string;
  alt: string;
  label: string;
}

interface ShowcaseExample {
  id: string;
  title: string;
  summary: string;
  availability: "In Library" | "On-demand";
  source: ShowcaseImage;
  outputs: ShowcaseImage[];
  engineNote: string;
  hours: string;
  tags: string[];
}

interface ShowcaseVertical {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  accentClass: string;
  accentLine: string;
  examples: ShowcaseExample[];
}

const SHOWCASE_VERTICALS: ShowcaseVertical[] = [
  {
    id: "datacenter",
    eyebrow: "Data Center",
    title: "RoboEyeView across rack-side workflows",
    summary:
      "Patented pipeline that converts EXO footage into EGO datasets - labeled and ready for robot model training.",
    accentClass: "bg-blue-400 text-blue-300 border-blue-400/25",
    accentLine: "bg-blue-400/30",
    examples: [
      {
        id: "data-one",
        title: "Server Rack Hardware Swap",
        summary:
          "Two-technician swap - external surveillance capture to synthesized EGO viewpoints for training.",
        availability: "In Library",
        source: {
          path: "serverrack/exo_serverrack.png",
          alt: "Data center exocentric hardware swap input",
          label: "EXO",
        },
        outputs: [
          {
            path: "serverrack/ego_serverrack.png",
            alt: "Front robot-eye hardware swap output",
            label: "Front",
          },
          {
            path: "serverrack/ego_serverrack1.png",
            alt: "Overhead robot-eye hardware swap output",
            label: "Overhead",
          },
          {
            path: "serverrack/2ego_serverrack.png",
            alt: "Side robot-eye hardware swap output",
            label: "Side",
          },
          {
            path: "serverrack/2ego_serverrack1.png",
            alt: "Low-angle hardware swap output",
            label: "Low Angle",
          },
        ],
        engineNote: "Scene reconstruction and multi-angle view synthesis.",
        hours: "1,200 hrs EGO output",
        tags: ["Scene Reconstruction", "Depth Estimation", "Multi-angle Synthesis"],
      },
      {
        id: "data-two",
        title: "Server Rack Inspection",
        summary:
          "Single technician inspection - EXO data to focused robot viewpoints for rack-side operation modeling.",
        availability: "In Library",
        source: {
          path: "serverrack/2exo_serverrack.png",
          alt: "Data center exocentric inspection input",
          label: "EXO",
        },
        outputs: [
          {
            path: "serverrack/2ego_serverrack.png",
            alt: "Mid-range inspection output",
            label: "Front",
          },
          {
            path: "serverrack/2ego_serverrack1.png",
            alt: "Close inspection output",
            label: "Close",
          },
          {
            path: "serverrack/2ego_serverrack2.png",
            alt: "Overhead inspection output",
            label: "Overhead",
          },
          {
            path: "serverrack/ego_serverrack1.png",
            alt: "Wide rack inspection output",
            label: "Wide",
          },
        ],
        engineNote: "Inspection-focused robot-perspective synthesis.",
        hours: "840 hrs EGO output",
        tags: ["Inspection Views", "Rack Navigation", "View Synthesis"],
      },
    ],
  },
  {
    id: "humanoid",
    eyebrow: "Humanoid",
    title: "Embodied hand-level perspectives for dexterous tasks",
    summary:
      "External household and dexterity scenes re-framed into robot-useful perspectives for grasping, surface interaction, and hand-level control.",
    accentClass: "bg-emerald-400 text-emerald-300 border-emerald-400/25",
    accentLine: "bg-emerald-400/30",
    examples: [
      {
        id: "human-one",
        title: "Kitchen Drawer Manipulation",
        summary:
          "Full-body EXO of trash bag handling to synthesized robot hand-level viewpoints for manipulation training.",
        availability: "On-demand",
        source: {
          path: "humanoid/humanoid4.png",
          alt: "Humanoid drawer manipulation exocentric input",
          label: "EXO",
        },
        outputs: [
          {
            path: "humanoid/manipulation.png",
            alt: "Humanoid hand-level output one",
            label: "Hand-level",
          },
          {
            path: "humanoid/humanoid.png",
            alt: "Humanoid side output one",
            label: "Side",
          },
          {
            path: "humanoid/humanoid5.png",
            alt: "Humanoid overhead output one",
            label: "Overhead",
          },
          {
            path: "humanoid/humanoid6.png",
            alt: "Humanoid low-angle output one",
            label: "Low Angle",
          },
        ],
        engineNote: "Hand tracking and manipulation-aware synthesis.",
        hours: "380 hrs EGO output",
        tags: ["Hand Pose Tracking", "Wrist-level Synthesis", "Grasp Points"],
      },
      {
        id: "human-two",
        title: "Surface Cleaning - Stovetop",
        summary:
          "Full-body cleaning task EXO to robot-perspective EGO views at different proximities for task learning.",
        availability: "In Library",
        source: {
          path: "humanoid/humanoid7.png",
          alt: "Humanoid cleaning exocentric input",
          label: "EXO",
        },
        outputs: [
          {
            path: "humanoid/humanoid1.png",
            alt: "Humanoid mid-range cleaning output",
            label: "Mid-range",
          },
          {
            path: "humanoid/humanoid2.png",
            alt: "Humanoid close-up cleaning output",
            label: "Close-up",
          },
          {
            path: "humanoid/humanoid3.png",
            alt: "Humanoid overhead cleaning output",
            label: "Overhead",
          },
          {
            path: "humanoid/humanoid.png",
            alt: "Humanoid side cleaning output",
            label: "Side",
          },
        ],
        engineNote: "Motion synthesis tuned for repeated household actions.",
        hours: "450 hrs EGO output",
        tags: ["Surface Segmentation", "Multi-distance Views", "Task Framing"],
      },
      {
        id: "human-three",
        title: "Dishwashing - Sink Manipulation",
        summary:
          "Wide kitchen scene EXO to synthesized close-up EGO framing at hand manipulation level.",
        availability: "On-demand",
        source: {
          path: "humanoid/humanoid6.png",
          alt: "Humanoid dishwashing exocentric input",
          label: "EXO",
        },
        outputs: [
          {
            path: "humanoid/humanoid.png",
            alt: "Humanoid grasp synthesis output",
            label: "Hand-level Grasp",
          },
          {
            path: "humanoid/manipulation.png",
            alt: "Humanoid side grasp output",
            label: "Side",
          },
          {
            path: "humanoid/humanoid2.png",
            alt: "Humanoid overhead grasp output",
            label: "Overhead",
          },
          {
            path: "humanoid/humanoid3.png",
            alt: "Humanoid close-range sink output",
            label: "Close",
          },
        ],
        engineNote: "Grasp synthesis for wet-object and close-range manipulation.",
        hours: "600 hrs EGO output",
        tags: ["Grasp Keypoints", "Wet Object Handling", "Edge Conditions"],
      },
    ],
  },
  {
    id: "automotive",
    eyebrow: "Automotive",
    title: "Assembly-line capture transformed into robot-eye training views",
    summary:
      "Production-line external footage becomes multi-view robot-perspective data for assembly and inspection tasks.",
    accentClass: "bg-violet-400 text-violet-300 border-violet-400/25",
    accentLine: "bg-violet-400/30",
    examples: [
      {
        id: "auto-one",
        title: "BMW Grille Assembly - Production Line",
        summary:
          "Side-view EXO of assembly worker to synthesized robot viewpoints including rotation and low-angle views.",
        availability: "In Library",
        source: {
          path: "carAutomation/exo_carautomation.png",
          alt: "Automotive exocentric grille assembly input",
          label: "EXO",
        },
        outputs: [
          {
            path: "carAutomation/ego_carautomation.png",
            alt: "Automotive front robot-eye output",
            label: "Front",
          },
          {
            path: "carAutomation/ego_carautomation1.png",
            alt: "Automotive angled robot-eye output",
            label: "Rotate Left",
          },
          {
            path: "carAutomation/2ego_carautomation.png",
            alt: "Automotive low-angle robot-eye output",
            label: "Low Angle",
          },
          {
            path: "carAutomation/2ego_carautomation1.png",
            alt: "Automotive studio robot-eye output",
            label: "Studio",
          },
        ],
        engineNote: "Rotation-aware view synthesis for production-line precision.",
        hours: "2,100 hrs EGO output",
        tags: ["Scene Reconstruction", "Rotation Synthesis", "Low-angle Views", "4 Viewpoints"],
      },
    ],
  },
];

const HOW_IT_WORKS_PREVIEW = SHOWCASE_VERTICALS[0].examples[0];

function ShowcaseImageCard({
  image,
  onClick,
  emphasize = false,
}: {
  image: ShowcaseImage;
  onClick: () => void;
  emphasize?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = frontPageImageUrl(image.path);

  return (
    <button
      type="button"
      onClick={src && !failed ? onClick : undefined}
      disabled={!src || failed}
      className={`group relative block overflow-hidden rounded-[18px] border transition-all duration-300 ${
        emphasize
          ? "border-blue-400/35 bg-[#0b1119] shadow-[0_16px_40px_rgba(0,0,0,0.24)]"
          : "border-orange-300/25 bg-[#0d1014] hover:border-primary/25"
      } ${src && !failed ? "cursor-zoom-in" : "cursor-default"}`}
    >
      <div className="aspect-[4/3] overflow-hidden bg-black/30">
        {src && !failed ? (
          <img
            src={src}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Image unavailable
          </div>
        )}
      </div>
      <div className="absolute left-3 top-3 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/90 backdrop-blur-sm">
        <span className={emphasize ? "text-blue-300" : "text-primary"}>{image.label}</span>
      </div>
    </button>
  );
}

function ExampleCard({
  example,
  accentClass,
  onSelect,
}: {
  example: ShowcaseExample;
  accentClass: string;
  onSelect: (image: ShowcaseImage) => void;
}) {
  return (
    <article className="rounded-[24px] border border-white/6 bg-[#0d1014]/88 p-5 shadow-[0_20px_46px_rgba(0,0,0,0.22)] md:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{example.title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{example.summary}</p>
        </div>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
            example.availability === "In Library"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              : "border-amber-400/20 bg-amber-400/10 text-amber-300"
          }`}
      >
          {example.availability}
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[220px_180px_minmax(0,1fr)]">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-300">
            EXO Input
          </div>
          <ShowcaseImageCard
            image={example.source}
            emphasize
            onClick={() => onSelect(example.source)}
          />
        </div>

        <div className="rounded-[20px] border border-primary/30 bg-primary/10 px-4 py-5 text-center shadow-[0_0_28px_rgba(29,233,182,0.08)] xl:flex xl:flex-col xl:justify-center">
          <div className="hidden items-center justify-center gap-3 pb-4 xl:flex">
            <div className="h-px w-10 bg-gradient-to-r from-blue-400/15 via-primary/45 to-primary/20" />
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            RoboEyeView
          </div>
          <div className="mt-1 text-sm font-extrabold text-white">Engine</div>
          <div className="mt-2 text-[11px] leading-5 text-muted-foreground">
            {example.engineNote}
          </div>
          <div className="hidden items-center justify-center gap-3 pt-4 xl:flex">
            <div className="h-px w-10 bg-gradient-to-r from-primary/20 via-primary/45 to-orange-300/20" />
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-300">
            <span>Generated EGO Views</span>
            <span className={`h-px flex-1 ${accentClass}`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {example.outputs.map((output) => (
              <ShowcaseImageCard
                key={`${example.id}-${output.path}`}
                image={output}
                onClick={() => onSelect(output)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/6 pt-4">
        {example.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto text-xs font-bold text-primary">{example.hours}</span>
      </div>
    </article>
  );
}

function ImageLightbox({
  selected,
  onClose,
}: {
  selected: ShowcaseImage;
  onClose: () => void;
}) {
  const src = frontPageImageUrl(selected.path);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] bg-background/92 px-4 py-6 backdrop-blur-md md:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-[#0d1014] text-foreground transition-colors hover:border-primary/20 hover:text-primary md:right-6 md:top-6"
        aria-label="Close image preview"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mx-auto flex h-full max-w-7xl items-center justify-center">
        <div
          className="w-full overflow-hidden rounded-[24px] border border-white/8 bg-black/50 shadow-2xl shadow-black/35"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="max-h-[84vh] w-full">
            {src ? (
              <img src={src} alt={selected.alt} className="max-h-[84vh] w-full object-contain" />
            ) : (
              <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                Image unavailable
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoboEyeView() {
  const [selectedImage, setSelectedImage] = useState<ShowcaseImage | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="relative overflow-hidden pt-[88px]">
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.05]" />

        <div className="relative z-10 mx-auto flex max-w-[1440px] gap-8 px-4 py-10 sm:px-6 md:py-14">
          <aside className="hidden xl:flex xl:w-[220px] xl:shrink-0 xl:flex-col xl:overflow-hidden xl:rounded-[28px] xl:border xl:border-white/6 xl:bg-[#040608]/95 xl:shadow-[0_20px_60px_rgba(0,0,0,0.3)] xl:backdrop-blur-xl">
            <div className="border-b border-white/6 px-5 py-6">
              <div className="text-lg font-extrabold tracking-[0.04em] text-primary">DataraAI</div>
              <div className="mt-1 text-base font-bold text-white">Visual Intelligence</div>
            </div>
            <div className="flex-1 px-3 py-4">
              <div className="px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Categories
              </div>
              <div className="mt-4 space-y-2">
                {SHOWCASE_VERTICALS.map((vertical) => (
                  <a
                    key={vertical.id}
                    href={`#${vertical.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/20 hover:bg-primary/8 hover:text-foreground"
                  >
                    <span className={`h-3 w-3 rounded-[4px] ${vertical.accentClass}`} />
                    <span>{vertical.eyebrow}</span>
                  </a>
                ))}
              </div>
            </div>
            <div className="border-t border-white/6 p-4">
              <Link
                to={buildAuthPath("register", "/roboeyeview")}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
              >
                Get Access
              </Link>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <section className="overflow-hidden rounded-[32px] border border-white/6 bg-[#0d1014]/88 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] md:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                RoboEyeView
              </div>

              <h1 className="mt-6 max-w-4xl text-[clamp(2.4rem,5vw,4rem)] font-black leading-[1.02] tracking-[-0.05em] text-white">
                Patented EXO-to-EGO synthesis for robot training data.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground">
                Start with fixed-camera EXO footage, then generate robot-eye EGO datasets that are
                far more useful for perception, planning, and action-level training.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-lg border border-blue-400/20 bg-blue-400/8 px-4 py-2 text-sm font-semibold text-blue-300">
                  <strong>EXO</strong> - external workspace capture
                </span>
                <span className="rounded-lg border border-primary/20 bg-primary/8 px-4 py-2 text-sm font-semibold text-primary">
                  <strong>EGO</strong> - synthesized robot&apos;s-eye training data
                </span>
              </div>
            </section>

            <section className="mt-6 rounded-[28px] border border-white/6 bg-[#0d1014]/88 p-6 shadow-[0_20px_46px_rgba(0,0,0,0.22)] md:p-8">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                How It Works
              </div>
              <div className="mt-6 flex flex-col gap-5 xl:flex-row xl:items-center">
                <div className="xl:w-[220px]">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300">
                    EXO Input
                  </div>
                  <ShowcaseImageCard
                    image={HOW_IT_WORKS_PREVIEW.source}
                    emphasize
                    onClick={() => setSelectedImage(HOW_IT_WORKS_PREVIEW.source)}
                  />
                </div>

                <div className="rounded-[22px] border-2 border-primary/35 bg-primary/10 p-5 shadow-[0_0_28px_rgba(29,233,182,0.08)] xl:w-[230px]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                        RoboEyeView
                      </div>
                      <div className="text-lg font-extrabold text-white">Engine</div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    Scene reconstruction, motion understanding, and viewpoint synthesis tailored to robot-training requirements.
                  </p>
                  <div className="mt-4 hidden items-center justify-end gap-3 xl:flex">
                    <div className="h-px w-10 bg-gradient-to-r from-primary/20 via-primary/45 to-orange-300/25" />
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-300">
                    <span>EGO Outputs</span>
                    <span className="h-px flex-1 bg-orange-300/30" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {HOW_IT_WORKS_PREVIEW.outputs.map((output) => (
                      <ShowcaseImageCard
                        key={`how-it-works-${output.path}`}
                        image={output}
                        onClick={() => setSelectedImage(output)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-8 space-y-8">
              {SHOWCASE_VERTICALS.map((vertical) => (
                <section key={vertical.id} id={vertical.id} className="scroll-mt-[120px]">
                  <div className="mb-5 flex items-center gap-3">
                    <span className={`h-3 w-3 rounded-[4px] ${vertical.accentClass}`} />
                    <span className="text-lg font-extrabold text-white">{vertical.eyebrow}</span>
                    <span className={`h-px flex-1 ${vertical.accentLine}`} />
                  </div>

                  <div className="rounded-[28px] border border-white/6 bg-[#0d1014]/88 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)] md:p-8">
                    <h2 className="text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">
                      {vertical.title}
                    </h2>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                      {vertical.summary}
                    </p>

                    <div className="mt-6 space-y-5">
                      {vertical.examples.map((example) => (
                        <ExampleCard
                          key={example.id}
                          example={example}
                          accentClass={vertical.accentLine}
                          onSelect={setSelectedImage}
                        />
                      ))}
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <section className="mt-8 rounded-[28px] border border-white/6 bg-[linear-gradient(135deg,rgba(29,233,182,0.04)_0%,rgba(255,255,255,0.02)_100%)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.22)] md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-white">
                    Run RoboEyeView on Your EXO Footage
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                    Already have EXO footage? We&apos;ll turn it into robot-ready EGO datasets for the task, environment, and robot setup you&apos;re training against.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["Data Center", "Humanoid", "Automotive"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  to={buildAuthPath("register", "/roboeyeview")}
                  className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground"
                >
                  Submit Your Footage
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      {selectedImage && (
        <ImageLightbox selected={selectedImage} onClose={() => setSelectedImage(null)} />
      )}

      <FooterSection />
    </div>
  );
}
