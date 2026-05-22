import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import FooterSection from "@/components/FooterSection";
import { buildAuthPath } from "@/lib/authLinks";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";

interface ShowcaseImage {
  path: string;
  alt: string;
}

interface ShowcaseExample {
  id: string;
  input: ShowcaseImage;
  outputs: ShowcaseImage[];
}

interface ShowcaseVertical {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  examples: ShowcaseExample[];
}

const SHOWCASE_VERTICALS: ShowcaseVertical[] = [
  {
    id: "carAutomation",
    eyebrow: "Car Automation",
    title: "Vehicle assembly and service viewpoints",
    summary:
      "Two automotive production captures are transformed into robot-eye outputs that show both consistency and range across the same workflow.",
    examples: [
      {
        id: "primary",
        input: {
          path: "carAutomation/exo_carautomation.png",
          alt: "Car automation exocentric input one",
        },
        outputs: [
          {
            path: "carAutomation/ego_carautomation.png",
            alt: "Car automation generated ego view one",
          },
          {
            path: "carAutomation/ego_carautomation1.png",
            alt: "Car automation generated ego view two",
          },
        ],
      },
      {
        id: "secondary",
        input: {
          path: "carAutomation/2exo_carautomation.png",
          alt: "Car automation exocentric input two",
        },
        outputs: [
          {
            path: "carAutomation/2ego_carautomation.png",
            alt: "Car automation second-scene ego view one",
          },
          {
            path: "carAutomation/2ego_carautomation1.png",
            alt: "Car automation second-scene ego view two",
          },
          {
            path: "carAutomation/2ego_carautomation2.png",
            alt: "Car automation second-scene ego view three",
          },
        ],
      },
    ],
  },
  {
    id: "serverrack",
    eyebrow: "Serverrack",
    title: "Data-center scene to robot-eye perspective",
    summary:
      "Two rack-side scenes are converted into focused robot-eye outputs so teams can see the transformation across more than one real operating setup.",
    examples: [
      {
        id: "primary",
        input: {
          path: "serverrack/exo_serverrack.png",
          alt: "Serverrack exocentric input one",
        },
        outputs: [
          {
            path: "serverrack/ego_serverrack.png",
            alt: "Serverrack generated ego view one",
          },
          {
            path: "serverrack/ego_serverrack1.png",
            alt: "Serverrack generated ego view two",
          },
        ],
      },
      {
        id: "secondary",
        input: {
          path: "serverrack/2exo_serverrack.png",
          alt: "Serverrack exocentric input two",
        },
        outputs: [
          {
            path: "serverrack/2ego_serverrack.png",
            alt: "Serverrack second-scene ego view one",
          },
          {
            path: "serverrack/2ego_serverrack1.png",
            alt: "Serverrack second-scene ego view two",
          },
          {
            path: "serverrack/2ego_serverrack2.png",
            alt: "Serverrack second-scene ego view three",
          },
        ],
      },
    ],
  },
  {
    id: "warehouse",
    eyebrow: "Warehouse",
    title: "Warehouse floor capture to useful robot-eye outputs",
    summary:
      "Two warehouse scenes branch into clean robot-eye outputs that feel broad enough for real deployment storytelling without making the page harder to browse.",
    examples: [
      {
        id: "primary",
        input: {
          path: "warehouse/exo_warehouse.png",
          alt: "Warehouse exocentric input one",
        },
        outputs: [
          {
            path: "warehouse/ego_warehouse1.png",
            alt: "Warehouse generated ego view one",
          },
          {
            path: "warehouse/ego_warehouse2.png",
            alt: "Warehouse generated ego view two",
          },
        ],
      },
      {
        id: "secondary",
        input: {
          path: "warehouse/2exo_warehouse.png",
          alt: "Warehouse exocentric input two",
        },
        outputs: [
          {
            path: "warehouse/2ego_warehouse.png",
            alt: "Warehouse second-scene ego view one",
          },
          {
            path: "warehouse/2ego_warehouse1.png",
            alt: "Warehouse second-scene ego view two",
          },
          {
            path: "warehouse/2ego_warehouse2.png",
            alt: "Warehouse second-scene ego view three",
          },
        ],
      },
    ],
  },
];

const STATS = [
  { value: "6", label: "Sample transforms" },
  { value: "5.5k+", label: "Synthetic robot-eye hours" },
  { value: "3", label: "Active verticals" },
  { value: "Patented", label: "EXO to EGO pipeline" },
];

const PIPELINE_STEPS = [
  {
    step: "Step 01",
    title: "Capture exocentric footage",
    description:
      "Use fixed or mobile real-world cameras to record the workspace without instrumenting the robot itself.",
    accent: "text-blue-700",
    surface: "border-blue-200 bg-blue-50/70",
  },
  {
    step: "Step 02",
    title: "Run the RoboEyeView transform",
    description:
      "DataraAI converts the external scene into robot-perspective views aligned for model training and evaluation.",
    accent: "text-primary",
    surface: "border-primary/20 bg-primary/10",
  },
  {
    step: "Step 03",
    title: "Train with robot-ready outputs",
    description:
      "Teams receive ego-view assets that are easier to use across imitation learning, policy refinement, and validation workflows.",
    accent: "text-slate-700",
    surface: "border-slate-200 bg-slate-50/90",
  },
];

function ShowcaseImageCard({
  image,
  onClick,
  aspectClassName,
  emphasize = false,
  containerClassName = "",
}: {
  image: ShowcaseImage;
  onClick: () => void;
  aspectClassName: string;
  emphasize?: boolean;
  containerClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = frontPageImageUrl(image.path);
  const canPreview = Boolean(src) && !failed;

  return (
    <button
      type="button"
      onClick={canPreview ? onClick : undefined}
      aria-label={`Expand ${image.alt}`}
      disabled={!canPreview}
      className={`group block w-full overflow-hidden rounded-[22px] border transition-all duration-300 focus:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_2px_rgba(13,148,136,0.2)] ${containerClassName} ${
        canPreview ? "cursor-zoom-in" : "cursor-default"
      } ${
        emphasize
          ? "border-blue-200 bg-white shadow-[0_24px_56px_rgba(15,23,42,0.08)] hover:border-blue-300"
          : "border-slate-200 bg-slate-50/80 shadow-[0_16px_36px_rgba(15,23,42,0.06)] hover:border-primary/35 hover:bg-white"
      }`}
    >
      <div className={`${aspectClassName} overflow-hidden bg-slate-100`}>
        {canPreview ? (
          <img
            src={src ?? undefined}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm font-sans-tech text-muted-foreground">
            Image unavailable
          </div>
        )}
      </div>
    </button>
  );
}

function ShowcaseOutputGallery({
  outputs,
  onSelect,
}: {
  outputs: ShowcaseImage[];
  onSelect: (image: ShowcaseImage) => void;
}) {
  if (outputs.length <= 1) {
    return (
      <div className="grid gap-4">
        <ShowcaseImageCard
          image={outputs[0]}
          aspectClassName="aspect-[4/3] lg:h-full"
          onClick={() => onSelect(outputs[0])}
        />
      </div>
    );
  }

  if (outputs.length === 2) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {outputs.map((output) => (
          <ShowcaseImageCard
            key={output.path}
            image={output}
            aspectClassName="aspect-[4/3]"
            onClick={() => onSelect(output)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <ShowcaseImageCard
          image={outputs[0]}
          aspectClassName="aspect-[16/9]"
          onClick={() => onSelect(outputs[0])}
        />
      </div>
      <div>
        <ShowcaseImageCard
          image={outputs[1]}
          aspectClassName="aspect-[4/3]"
          onClick={() => onSelect(outputs[1])}
        />
      </div>
      <div>
        <ShowcaseImageCard
          image={outputs[2]}
          aspectClassName="aspect-[4/3]"
          onClick={() => onSelect(outputs[2])}
        />
      </div>
    </div>
  );
}

function ShowcaseArrow() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="inline-flex flex-col items-center gap-3 rounded-[24px] border border-primary/20 bg-white px-4 py-5 shadow-[0_14px_30px_rgba(13,148,136,0.12)]">
        <span className="text-[10px] font-mono-tech uppercase tracking-[0.24em] text-primary">
          RoboEyeView
        </span>
        <ArrowRight className="h-5 w-5 text-primary" />
      </div>
    </div>
  );
}

function ShowcaseExampleRow({
  example,
  onSelect,
}: {
  example: ShowcaseExample;
  onSelect: (image: ShowcaseImage) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(250px,0.68fr)_84px_minmax(0,1.32fr)] xl:items-start xl:gap-6">
      <div className="space-y-3">
        <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
          Exocentric input
        </div>
        <ShowcaseImageCard
          image={example.input}
          emphasize
          aspectClassName="aspect-[4/3] sm:aspect-[16/11]"
          onClick={() => onSelect(example.input)}
        />
      </div>

      <div className="hidden xl:block">
        <ShowcaseArrow />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 xl:hidden">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <ArrowRight className="h-4 w-4 text-primary" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        </div>
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          Egocentric outputs
        </div>
        <ShowcaseOutputGallery outputs={example.outputs} onSelect={onSelect} />
      </div>
    </div>
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
      className="fixed inset-0 z-[70] bg-white/92 px-4 py-6 backdrop-blur-md md:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition-colors hover:border-primary hover:text-primary md:right-6 md:top-6"
        aria-label="Close image preview"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mx-auto flex h-full max-w-7xl items-center justify-center">
        <div
          className="w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.16)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="max-h-[84vh] w-full bg-slate-50">
            {src ? (
              <img src={src} alt={selected.alt} className="max-h-[84vh] w-full object-contain" />
            ) : (
              <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm font-sans-tech text-muted-foreground">
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

  const resolvedVerticals = useMemo(() => SHOWCASE_VERTICALS, []);

  return (
    <div className="relative min-h-screen bg-background font-sans-tech text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.04]" aria-hidden />
      <Navigation />

      <main className="relative z-10 overflow-hidden pt-[88px]">
        <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(29,78,216,0.08),transparent_30%),radial-gradient(circle_at_20%_10%,rgba(13,148,136,0.08),transparent_22%),linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))]">
          <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 md:py-20">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-mono-tech uppercase tracking-[0.24em] text-primary">
                    RoboEyeView
                  </span>
                </div>

                <h1 className="mt-6 max-w-4xl text-[clamp(2.8rem,5vw,5rem)] font-black tracking-[-0.06em] text-slate-950">
                  Exocentric in. <span className="text-primary">Robot-eye outputs</span> out.
                </h1>

                <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base md:text-lg">
                  DataraAI transforms external camera footage into robot-perspective training data
                  that teams can actually use across automotive, server-rack, and warehouse
                  robotics pipelines.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
                    EXO: external workspace capture
                  </span>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
                    EGO: synthesized robot-eye perspective
                  </span>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to="/robodatahub"
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:opacity-90"
                  >
                    Explore RoboDataHub
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to={buildAuthPath("register", "/roboeyeview")}
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    Request access
                  </Link>
                </div>
              </div>

              <div className="marketing-surface overflow-hidden rounded-[30px] p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {STATS.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[20px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_28px_rgba(15,23,42,0.06)]"
                    >
                      <div className="text-2xl font-black tracking-[-0.04em] text-slate-950">
                        {stat.value}
                      </div>
                      <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50/80">
          <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 md:py-16">
            <div className="mb-8 max-w-3xl">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                How It Works
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl">
                A simple bridge from scene capture to robot training data.
              </h2>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {PIPELINE_STEPS.map((step) => (
                <article
                  key={step.step}
                  className={`rounded-[26px] border p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)] ${step.surface}`}
                >
                  <div className={`text-[11px] font-bold uppercase tracking-[0.18em] ${step.accent}`}>
                    {step.step}
                  </div>
                  <h3 className="mt-4 text-xl font-extrabold text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-background">
          <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 md:py-16">
            <div className="flex flex-wrap gap-3">
              {resolvedVerticals.map((vertical) => (
                <a
                  key={vertical.id}
                  href={`#${vertical.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-mono-tech uppercase tracking-wide text-slate-500 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {vertical.eyebrow}
                </a>
              ))}
            </div>
          </div>
        </section>

        <div className="space-y-8 pb-16 md:space-y-10">
          {resolvedVerticals.map((vertical) => (
            <section key={vertical.id} id={vertical.id} className="scroll-mt-28 px-4 sm:px-6">
              <div className="mx-auto max-w-7xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.08)]">
                <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,1))] px-6 py-6 md:px-8 md:py-7">
                  <div className="max-w-4xl">
                    <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                      {vertical.eyebrow}
                    </div>
                    <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl">
                      {vertical.title}
                    </h2>
                    <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600 md:text-base">
                      {vertical.summary}
                    </p>
                  </div>
                </div>

                <div className="space-y-6 p-5 sm:p-6 md:p-8">
                  {vertical.examples.map((example) => (
                    <div
                      key={`${vertical.id}-${example.id}`}
                      className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
                    >
                      <ShowcaseExampleRow example={example} onSelect={setSelectedImage} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>

        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-7xl rounded-[30px] border border-primary/15 bg-[linear-gradient(135deg,rgba(13,148,136,0.12),rgba(255,255,255,0.96)_45%,rgba(29,78,216,0.08))] p-8 shadow-[0_22px_58px_rgba(15,23,42,0.08)] md:flex md:items-center md:justify-between md:gap-8">
            <div className="max-w-2xl">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                Deployment Ready
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">
                Want the dataset view behind this transform story too?
              </h2>
              <p className="mt-4 text-sm leading-8 text-slate-600 md:text-base">
                Jump into RoboDataHub to browse the public category landing pages and the protected
                dataset folders that power the rest of the workflow.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 md:mt-0">
              <Link
                to="/robodatahub"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:opacity-90"
              >
                Open RoboDataHub
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={buildAuthPath("login", "/robodatahub")}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-primary/30 hover:text-primary"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />

      {selectedImage && (
        <ImageLightbox selected={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </div>
  );
}
