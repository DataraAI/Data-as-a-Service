import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import Navigation from "@/components/Navigation";
import { blobProxyUrl } from "@/lib/datasetFolderCover";

interface ShowcaseImage {
  path: string;
  alt: string;
}

interface ShowcaseVertical {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  folder: string;
  assetStem: string;
  inputAlt: string;
  outputAltPrefix: string;
  defaultOutputCount: number;
}

const OUTPUT_CANDIDATE_LIMIT = 6;

const SHOWCASE_VERTICALS: ShowcaseVertical[] = [
  {
    id: "carAutomation",
    eyebrow: "Car Automation",
    title: "Vehicle assembly and service viewpoints",
    summary:
      "A single exocentric production image is transformed into clean robot-eye outputs that are easier to use in demos, workflows, and downstream robotics applications.",
    folder: "carAutomation",
    assetStem: "carautomation",
    inputAlt: "Car automation exocentric input",
    outputAltPrefix: "Car automation generated ego view",
    defaultOutputCount: 2,
  },
  {
    id: "serverrack",
    eyebrow: "Serverrack",
    title: "Data-center scene to robot-eye perspective",
    summary:
      "RoboEyeView turns external rack and maintenance captures into focused egocentric outputs that make the operational viewpoint immediately clear.",
    folder: "serverrack",
    assetStem: "serverrack",
    inputAlt: "Serverrack exocentric input",
    outputAltPrefix: "Serverrack generated ego view",
    defaultOutputCount: 2,
  },
  {
    id: "warehouse",
    eyebrow: "Warehouse",
    title: "Warehouse floor capture to useful robot-eye outputs",
    summary:
      "The same exocentric warehouse input can be converted into multiple clean, practical ego outputs for presentation, analysis, and robotic workflow storytelling.",
    folder: "warehouse",
    assetStem: "warehouse",
    inputAlt: "Warehouse exocentric input",
    outputAltPrefix: "Warehouse generated ego view",
    defaultOutputCount: 3,
  },
];

type ThreeImageVariant = "feature-left" | "feature-right" | "banner-top";

function buildInputImage(vertical: ShowcaseVertical): ShowcaseImage {
  return {
    path: `${vertical.folder}/exo_${vertical.assetStem}.png`,
    alt: vertical.inputAlt,
  };
}

function buildOutputImage(vertical: ShowcaseVertical, index: number): ShowcaseImage {
  const suffix = index === 0 ? "" : String(index);
  return {
    path: `${vertical.folder}/ego_${vertical.assetStem}${suffix}.png`,
    alt: `${vertical.outputAltPrefix} ${String(index + 1).padStart(2, "0")}`,
  };
}

function buildOutputCandidates(vertical: ShowcaseVertical): ShowcaseImage[] {
  return Array.from({ length: OUTPUT_CANDIDATE_LIMIT }, (_, index) =>
    buildOutputImage(vertical, index),
  );
}

function buildDefaultOutputs(vertical: ShowcaseVertical): ShowcaseImage[] {
  return buildOutputCandidates(vertical).slice(0, vertical.defaultOutputCount);
}

function layoutSeed(value: string): number {
  return value.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
}

function getThreeImageVariant(verticalId: string): ThreeImageVariant {
  const variants: ThreeImageVariant[] = ["feature-left", "feature-right", "banner-top"];
  return variants[layoutSeed(verticalId) % variants.length];
}

function probeImage(path: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = blobProxyUrl(path);
  });
}

async function resolveAvailableOutputs(vertical: ShowcaseVertical): Promise<ShowcaseImage[]> {
  // Probe the expected naming convention so newly added ego images appear automatically.
  const results = await Promise.all(
    buildOutputCandidates(vertical).map(async (image) => ((await probeImage(image.path)) ? image : null)),
  );

  return results.filter((image): image is ShowcaseImage => image !== null);
}

function ShowcaseImageCard({
  image,
  onClick,
  aspectClassName,
  emphasize = false,
}: {
  image: ShowcaseImage;
  onClick: () => void;
  aspectClassName: string;
  emphasize?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Expand ${image.alt}`}
      className={`group block w-full cursor-zoom-in overflow-hidden rounded-sm border transition-all duration-300 focus:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_2px_rgba(249,115,22,0.75)] ${
        emphasize
          ? "border-primary/30 bg-card/30 shadow-2xl shadow-black/15 hover:border-primary"
          : "border-border bg-card/20 hover:border-primary/60"
      }`}
    >
      <div className={`${aspectClassName} overflow-hidden bg-black/45`}>
        {failed ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm font-sans-tech text-muted-foreground">
            Image unavailable
          </div>
        ) : (
          <img
            src={blobProxyUrl(image.path)}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}
      </div>
    </button>
  );
}

function ShowcaseOutputGallery({
  verticalId,
  outputs,
  onSelect,
}: {
  verticalId: string;
  outputs: ShowcaseImage[];
  onSelect: (image: ShowcaseImage) => void;
}) {
  if (outputs.length === 1) {
    return (
      <div className="grid gap-4">
        <ShowcaseImageCard
          image={outputs[0]}
          aspectClassName="aspect-[4/3] md:aspect-[16/8.5]"
          onClick={() => onSelect(outputs[0])}
        />
      </div>
    );
  }

  if (outputs.length === 2) {
    return (
      <div className="grid gap-4 md:h-[28rem] md:grid-cols-2">
        {outputs.map((output) => (
          <div key={output.path}>
            <ShowcaseImageCard
              image={output}
              aspectClassName="aspect-[4/3] md:h-full"
              onClick={() => onSelect(output)}
            />
          </div>
        ))}
      </div>
    );
  }

  if (outputs.length === 3) {
    const variant = getThreeImageVariant(verticalId);

    if (variant === "feature-left") {
      return (
        <div className="grid gap-4 md:h-[32rem] md:grid-cols-12 md:grid-rows-2">
          <div className="md:col-span-7 md:row-span-2">
            <ShowcaseImageCard
              image={outputs[0]}
              aspectClassName="aspect-[4/3] md:h-full"
              onClick={() => onSelect(outputs[0])}
            />
          </div>
          <div className="md:col-span-5">
            <ShowcaseImageCard
              image={outputs[1]}
              aspectClassName="aspect-[4/3] md:h-full"
              onClick={() => onSelect(outputs[1])}
            />
          </div>
          <div className="md:col-span-5">
            <ShowcaseImageCard
              image={outputs[2]}
              aspectClassName="aspect-[4/3] md:h-full"
              onClick={() => onSelect(outputs[2])}
            />
          </div>
        </div>
      );
    }

    if (variant === "feature-right") {
      return (
        <div className="grid gap-4 md:h-[32rem] md:grid-cols-12 md:grid-rows-2">
          <div className="md:col-span-5">
            <ShowcaseImageCard
              image={outputs[0]}
              aspectClassName="aspect-[4/3] md:h-full"
              onClick={() => onSelect(outputs[0])}
            />
          </div>
          <div className="md:col-span-5 md:row-start-2">
            <ShowcaseImageCard
              image={outputs[1]}
              aspectClassName="aspect-[4/3] md:h-full"
              onClick={() => onSelect(outputs[1])}
            />
          </div>
          <div className="md:col-span-7 md:col-start-6 md:row-span-2 md:row-start-1">
            <ShowcaseImageCard
              image={outputs[2]}
              aspectClassName="aspect-[4/3] md:h-full"
              onClick={() => onSelect(outputs[2])}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:h-[32rem] md:grid-cols-2 md:grid-rows-2">
        <div className="md:col-span-2">
          <ShowcaseImageCard
            image={outputs[0]}
            aspectClassName="aspect-[4/3] md:h-full"
            onClick={() => onSelect(outputs[0])}
          />
        </div>
        <div>
          <ShowcaseImageCard
            image={outputs[1]}
            aspectClassName="aspect-[4/3] md:h-full"
            onClick={() => onSelect(outputs[1])}
          />
        </div>
        <div>
          <ShowcaseImageCard
            image={outputs[2]}
            aspectClassName="aspect-[4/3] md:h-full"
            onClick={() => onSelect(outputs[2])}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {outputs.map((output) => (
        <div key={output.path}>
          <ShowcaseImageCard
            image={output}
            aspectClassName="aspect-[4/3]"
            onClick={() => onSelect(output)}
          />
        </div>
      ))}
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
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/70 text-foreground transition-colors hover:border-primary hover:text-primary md:right-6 md:top-6"
        aria-label="Close image preview"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mx-auto flex h-full max-w-7xl items-center justify-center">
        <div
          className="w-full overflow-hidden rounded-sm border border-border bg-black/50 shadow-2xl shadow-black/35"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="max-h-[84vh] w-full">
            <img
              src={blobProxyUrl(selected.path)}
              alt={selected.alt}
              className="max-h-[84vh] w-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoboEyeView() {
  const [selectedImage, setSelectedImage] = useState<ShowcaseImage | null>(null);
  const [availableOutputs, setAvailableOutputs] = useState<Record<string, ShowcaseImage[]>>(() =>
    Object.fromEntries(
      SHOWCASE_VERTICALS.map((vertical) => [vertical.id, buildDefaultOutputs(vertical)]),
    ),
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const resolved = await Promise.all(
        SHOWCASE_VERTICALS.map(async (vertical) => {
          const outputs = await resolveAvailableOutputs(vertical);
          return [
            vertical.id,
            outputs.length > 0 ? outputs : buildDefaultOutputs(vertical),
          ] as const;
        }),
      );

      if (!cancelled) {
        setAvailableOutputs(Object.fromEntries(resolved));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedVerticals = useMemo(
    () =>
      SHOWCASE_VERTICALS.map((vertical) => ({
        ...vertical,
        input: buildInputImage(vertical),
        outputs: availableOutputs[vertical.id] ?? buildDefaultOutputs(vertical),
      })),
    [availableOutputs],
  );

  return (
    <div className="relative min-h-screen bg-background font-sans-tech text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.06]" aria-hidden />
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
                RoboEyeView transforms external scene captures into clean egocentric images that
                are easier to explain, easier to demonstrate, and better aligned with real robotics
                workflows.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              {resolvedVerticals.map((vertical) => (
                <a
                  key={vertical.id}
                  href={`#${vertical.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card/30 px-4 py-2 text-sm font-mono-tech uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {vertical.eyebrow}
                </a>
              ))}
            </div>
          </div>
        </section>

        <div className="space-y-8 pb-16 md:space-y-10">
          {resolvedVerticals.map((vertical) => (
            <section key={vertical.id} id={vertical.id} className="scroll-mt-24 px-6">
              <div className="mx-auto max-w-7xl overflow-hidden rounded-sm border border-border bg-card/15 shadow-2xl shadow-black/10">
                <div className="border-b border-border bg-background/65 px-6 py-5 md:px-8 md:py-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-4xl">
                      <div className="text-[11px] font-mono-tech uppercase tracking-[0.24em] text-primary">
                        {vertical.eyebrow}
                      </div>
                      <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-4xl">
                        {vertical.title}
                      </h2>
                      <p className="mt-3 max-w-3xl font-sans-tech text-sm leading-relaxed text-muted-foreground md:text-base">
                        {vertical.summary}
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-3 rounded-full border border-primary/25 bg-primary/10 px-4 py-2">
                      <span className="text-[11px] font-mono-tech uppercase tracking-[0.24em] text-primary">
                        Exocentric
                      </span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <span className="text-[11px] font-mono-tech uppercase tracking-[0.24em] text-primary">
                        Egocentric
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[minmax(0,0.82fr)_56px_minmax(0,1.38fr)] lg:gap-8">
                  <div>
                    <ShowcaseImageCard
                      image={vertical.input}
                      emphasize
                      aspectClassName="aspect-[4/5] md:aspect-[4/4.6] lg:aspect-[4/5.2]"
                      onClick={() => setSelectedImage(vertical.input)}
                    />
                  </div>

                  <div className="hidden flex-col items-center justify-center gap-4 lg:flex">
                    <div className="h-16 w-px bg-gradient-to-b from-transparent via-primary/60 to-transparent" />
                    <div className="inline-flex flex-col items-center gap-3 rounded-full border border-primary/25 bg-background/85 px-4 py-4">
                      <span className="text-[10px] font-mono-tech uppercase tracking-[0.24em] text-primary">
                        RoboEyeView
                      </span>
                      <ArrowRight className="h-5 w-5 text-primary" />
                    </div>
                    <div className="h-16 w-px bg-gradient-to-b from-transparent via-primary/60 to-transparent" />
                  </div>

                  <div>
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 lg:hidden">
                      <span className="text-[10px] font-mono-tech uppercase tracking-[0.24em] text-primary">
                        RoboEyeView outputs
                      </span>
                    </div>

                    <ShowcaseOutputGallery
                      verticalId={vertical.id}
                      outputs={vertical.outputs}
                      onSelect={setSelectedImage}
                    />
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
