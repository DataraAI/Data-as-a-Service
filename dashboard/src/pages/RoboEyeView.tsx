import { useEffect, useState } from "react";
import { ArrowRight, Maximize2, Sparkles, X } from "lucide-react";
import Navigation from "@/components/Navigation";
import { blobProxyUrl } from "@/lib/datasetFolderCover";

interface ShowcaseImage {
  path: string;
  title: string;
  caption: string;
  alt: string;
}

interface ShowcaseVertical {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  input: ShowcaseImage;
  outputs: ShowcaseImage[];
}

interface SelectedImageState {
  badge: string;
  image: ShowcaseImage;
}

const SHOWCASE_VERTICALS: ShowcaseVertical[] = [
  {
    id: "carAutomation",
    eyebrow: "Car Automation",
    title: "Vehicle assembly and service viewpoints",
    summary:
      "A single exocentric production image is transformed into clean robot-eye outputs that are easier to use in demos, workflows, and downstream robotics applications.",
    input: {
      path: "carAutomation/exo_carautomation.png",
      title: "Exocentric input",
      caption: "Real-world capture from the external scene.",
      alt: "Car automation exocentric input",
    },
    outputs: [
      {
        path: "carAutomation/ego_carautomation.png",
        title: "Generated ego view 01",
        caption: "A clean RoboEyeView result produced from the source image.",
        alt: "Car automation generated ego view 01",
      },
      {
        path: "carAutomation/ego_carautomation1.png",
        title: "Generated ego view 02",
        caption: "An additional robot-eye perspective derived from the same scene.",
        alt: "Car automation generated ego view 02",
      },
    ],
  },
  {
    id: "serverrack",
    eyebrow: "Serverrack",
    title: "Data-center scene to robot-eye perspective",
    summary:
      "RoboEyeView turns external rack and maintenance captures into focused egocentric outputs that make the operational viewpoint immediately clear.",
    input: {
      path: "serverrack/exo_serverrack.png",
      title: "Exocentric input",
      caption: "Captured from the outside scene in the serverrack environment.",
      alt: "Serverrack exocentric input",
    },
    outputs: [
      {
        path: "serverrack/ego_serverrack.png",
        title: "Generated ego view 01",
        caption: "A clean egocentric output generated from the source image.",
        alt: "Serverrack generated ego view 01",
      },
      {
        path: "serverrack/ego_serverrack1.png",
        title: "Generated ego view 02",
        caption: "A second robot-eye output showing another chosen viewpoint.",
        alt: "Serverrack generated ego view 02",
      },
    ],
  },
  {
    id: "warehouse",
    eyebrow: "Warehouse",
    title: "Warehouse floor capture to useful robot-eye outputs",
    summary:
      "The same exocentric warehouse input can be converted into multiple clean, practical ego outputs for presentation, analysis, and robotic workflow storytelling.",
    input: {
      path: "warehouse/exo_warehouse.png",
      title: "Exocentric input",
      caption: "A real-world warehouse scene viewed from the outside.",
      alt: "Warehouse exocentric input",
    },
    outputs: [
      {
        path: "warehouse/ego_warehouse.png",
        title: "Generated ego view 01",
        caption: "A clean robot-eye output produced from the warehouse source image.",
        alt: "Warehouse generated ego view 01",
      },
      {
        path: "warehouse/ego_warehouse1.png",
        title: "Generated ego view 02",
        caption: "A second chosen ego perspective from the same exocentric scene.",
        alt: "Warehouse generated ego view 02",
      },
      {
        path: "warehouse/ego_warehouse2.png",
        title: "Generated ego view 03",
        caption: "A third clean output showing the flexibility of the transformation.",
        alt: "Warehouse generated ego view 03",
      },
    ],
  },
];

function ShowcaseImageCard({
  image,
  badge,
  onClick,
  emphasize = false,
}: {
  image: ShowcaseImage;
  badge: string;
  onClick: () => void;
  emphasize?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-sm border text-left transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(249,115,22,0.75)] ${
        emphasize
          ? "border-primary/35 bg-card/35 shadow-2xl shadow-black/15 hover:border-primary hover:shadow-[0_0_0_2px_rgba(249,115,22,0.75)]"
          : "border-border bg-card/20 hover:border-primary/70 hover:shadow-[0_0_0_2px_rgba(249,115,22,0.55)]"
      }`}
    >
      <div className={`${emphasize ? "aspect-[4/5] md:aspect-[4/4.4]" : "aspect-[16/10]"} bg-background/70`}>
        {failed ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div>
              <div className="text-[11px] font-mono-tech uppercase tracking-[0.24em] text-primary/70">{badge}</div>
              <div className="mt-3 text-sm font-sans-tech text-muted-foreground">Image unavailable</div>
            </div>
          </div>
        ) : (
          <img
            src={blobProxyUrl(image.path)}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-contain bg-black/35 transition-transform duration-500 group-hover:scale-[1.02]"
          />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent opacity-90 transition-opacity group-hover:opacity-100" />

      <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-background/70 px-3 py-1">
          <span className="text-[10px] font-mono-tech uppercase tracking-[0.24em] text-primary">{badge}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold font-sans-tech text-foreground">{image.title}</h3>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground font-sans-tech leading-relaxed">
              {image.caption}
            </p>
          </div>
          <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-background/70 text-primary transition-colors group-hover:border-primary group-hover:bg-primary/10">
            <Maximize2 className="h-4 w-4" />
          </span>
        </div>
      </div>
    </button>
  );
}

function ImageLightbox({
  selected,
  onClose,
}: {
  selected: SelectedImageState;
  onClose: () => void;
}) {
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
    <div className="fixed inset-0 z-[70] bg-background/90 backdrop-blur-md px-4 py-6 md:p-8">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/70 text-foreground transition-colors hover:border-primary hover:text-primary md:right-6 md:top-6"
        aria-label="Close image preview"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mx-auto flex h-full max-w-6xl flex-col justify-center">
        <div className="mb-5 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/50 px-3 py-1">
            <span className="text-[10px] font-mono-tech uppercase tracking-[0.24em] text-primary">{selected.badge}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-sans-tech text-foreground">{selected.image.title}</h2>
          <p className="mt-2 text-sm md:text-base text-muted-foreground font-sans-tech leading-relaxed">
            {selected.image.caption}
          </p>
        </div>

        <div className="overflow-hidden rounded-sm border border-border bg-card/30 shadow-2xl shadow-black/30">
          <div className="max-h-[74vh] w-full bg-black/35">
            <img
              src={blobProxyUrl(selected.image.path)}
              alt={selected.image.alt}
              className="max-h-[74vh] w-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoboEyeView() {
  const [selectedImage, setSelectedImage] = useState<SelectedImageState | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans-tech relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.06] pointer-events-none" aria-hidden />
      <Navigation />

      <main className="relative z-10 pt-16">
        <section className="border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-mono-tech uppercase tracking-[0.24em] text-primary">
                  RoboEyeView
                </span>
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl">
                Exocentric in. <span className="text-primary">Robot-eye outputs</span> out.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
                RoboEyeView transforms external scene captures into clean egocentric images that are easier to explain,
                easier to demonstrate, and better aligned with real robotics workflows.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              {SHOWCASE_VERTICALS.map((vertical) => (
                <a
                  key={vertical.id}
                  href={`#${vertical.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card/30 px-4 py-2 text-sm font-mono-tech uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {vertical.eyebrow}
                </a>
              ))}
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-sm border border-border bg-card/20 p-5">
                <div className="text-[11px] font-mono-tech uppercase tracking-[0.24em] text-primary">Step 01</div>
                <h2 className="mt-3 text-xl font-bold font-sans-tech text-foreground">Capture the exocentric scene</h2>
                <p className="mt-2 text-sm text-muted-foreground font-sans-tech leading-relaxed">
                  Start with a real-world external view from the environment.
                </p>
              </div>
              <div className="rounded-sm border border-border bg-card/20 p-5">
                <div className="text-[11px] font-mono-tech uppercase tracking-[0.24em] text-primary">Step 02</div>
                <h2 className="mt-3 text-xl font-bold font-sans-tech text-foreground">Apply RoboEyeView</h2>
                <p className="mt-2 text-sm text-muted-foreground font-sans-tech leading-relaxed">
                  Use the source image to generate a robot-eye perspective of your choosing.
                </p>
              </div>
              <div className="rounded-sm border border-border bg-card/20 p-5">
                <div className="text-[11px] font-mono-tech uppercase tracking-[0.24em] text-primary">Step 03</div>
                <h2 className="mt-3 text-xl font-bold font-sans-tech text-foreground">Present clean outputs</h2>
                <p className="mt-2 text-sm text-muted-foreground font-sans-tech leading-relaxed">
                  Show practical ego results that are easy to inspect and easy to explain in a demo.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-8 md:py-10">
          <div className="mx-auto max-w-7xl rounded-sm border border-primary/20 bg-gradient-to-r from-primary/10 via-card/20 to-background/40 p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[11px] font-mono-tech uppercase tracking-[0.24em] text-primary">What this page shows</div>
                <p className="mt-2 text-sm md:text-base text-foreground/90 font-sans-tech">
                  One exocentric image on the left. Multiple RoboEyeView ego outputs on the right.
                </p>
              </div>

              <div className="inline-flex items-center gap-3 rounded-full border border-primary/25 bg-background/70 px-4 py-2 text-sm font-mono-tech uppercase tracking-wide text-primary">
                <span>Exo</span>
                <ArrowRight className="h-4 w-4" />
                <span>Ego</span>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-8 pb-16 md:space-y-10">
          {SHOWCASE_VERTICALS.map((vertical) => (
            <section key={vertical.id} id={vertical.id} className="px-6 scroll-mt-24">
              <div className="mx-auto max-w-7xl overflow-hidden rounded-sm border border-border bg-card/15 shadow-2xl shadow-black/10">
                <div className="border-b border-border bg-background/65 px-6 py-5 md:px-8 md:py-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-4xl">
                      <div className="text-[11px] font-mono-tech uppercase tracking-[0.24em] text-primary">{vertical.eyebrow}</div>
                      <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-4xl">
                        {vertical.title}
                      </h2>
                      <p className="mt-3 max-w-3xl text-sm md:text-base text-muted-foreground font-sans-tech leading-relaxed">
                        {vertical.summary}
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-3 rounded-full border border-primary/25 bg-primary/10 px-4 py-2">
                      <span className="text-[11px] font-mono-tech uppercase tracking-[0.24em] text-primary">Exocentric</span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <span className="text-[11px] font-mono-tech uppercase tracking-[0.24em] text-primary">Egocentric</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[minmax(0,0.95fr)_72px_minmax(0,1.15fr)] lg:gap-8">
                  <div>
                    <ShowcaseImageCard
                      image={vertical.input}
                      badge="Exocentric input"
                      emphasize
                      onClick={() => setSelectedImage({ badge: "Exocentric input", image: vertical.input })}
                    />
                  </div>

                  <div className="hidden lg:flex flex-col items-center justify-center gap-4">
                    <div className="h-16 w-px bg-gradient-to-b from-transparent via-primary/60 to-transparent" />
                    <div className="inline-flex flex-col items-center gap-3 rounded-full border border-primary/25 bg-background/85 px-4 py-4">
                      <span className="text-[10px] font-mono-tech uppercase tracking-[0.24em] text-primary">RoboEyeView</span>
                      <ArrowRight className="h-5 w-5 text-primary" />
                    </div>
                    <div className="h-16 w-px bg-gradient-to-b from-transparent via-primary/60 to-transparent" />
                  </div>

                  <div>
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 lg:hidden">
                      <span className="text-[10px] font-mono-tech uppercase tracking-[0.24em] text-primary">RoboEyeView outputs</span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {vertical.outputs.map((output, index) => {
                        const isLastOddItem = vertical.outputs.length % 2 === 1 && index === vertical.outputs.length - 1;

                        return (
                          <div key={output.path} className={isLastOddItem ? "md:col-span-2" : ""}>
                            <ShowcaseImageCard
                              image={output}
                              badge={`Generated ego view ${String(index + 1).padStart(2, "0")}`}
                              onClick={() =>
                                setSelectedImage({
                                  badge: `Generated ego view ${String(index + 1).padStart(2, "0")}`,
                                  image: output,
                                })
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>

      {selectedImage && <ImageLightbox selected={selectedImage} onClose={() => setSelectedImage(null)} />}
    </div>
  );
}
