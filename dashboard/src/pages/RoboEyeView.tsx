import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import Navigation from "@/components/Navigation";
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
      "Two distinct production captures are transformed into robot-eye outputs that show both consistency and range across the same automotive workflow.",
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
      "The page now shows two separate rack-side inputs, each converted into its own set of focused egocentric outputs for a broader, more convincing demo story.",
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
      "Two warehouse scenes branch into clean robot-eye outputs that make the transformation feel broader and more deployment-ready without overcomplicating the page.",
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
      className={`group block w-full overflow-hidden rounded-sm border transition-all duration-300 focus:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_2px_rgba(31,209,107,0.4)] ${containerClassName} ${
        canPreview ? "cursor-zoom-in" : "cursor-default"
      } ${
        emphasize
          ? "border-primary/30 bg-card/30 shadow-2xl shadow-black/15 hover:border-primary"
          : "border-border bg-card/20 hover:border-primary/60"
      }`}
    >
      <div className={`${aspectClassName} overflow-hidden bg-black/45`}>
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
      <div className="grid gap-4 sm:grid-cols-2 lg:h-[15rem] xl:h-[16rem]">
        {outputs.map((output) => (
          <ShowcaseImageCard
            key={output.path}
            image={output}
            aspectClassName="aspect-[4/3] lg:h-full"
            onClick={() => onSelect(output)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 md:grid-rows-2 lg:h-[18rem] xl:h-[20rem]">
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

function ShowcaseArrow() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="inline-flex flex-col items-center gap-3 rounded-full border border-primary/25 bg-background/85 px-4 py-4">
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
    <div className="grid gap-4 xl:grid-cols-[minmax(250px,0.7fr)_68px_minmax(0,1.3fr)] xl:items-stretch xl:gap-6">
      <ShowcaseImageCard
        image={example.input}
        emphasize
        containerClassName="h-full"
        aspectClassName="aspect-[4/3] sm:aspect-[16/11] xl:h-full"
        onClick={() => onSelect(example.input)}
      />

      <div className="hidden xl:block">
        <ShowcaseArrow />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 xl:hidden">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <ArrowRight className="h-4 w-4 text-primary" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        </div>

        <ShowcaseOutputGallery
          outputs={example.outputs}
          onSelect={onSelect}
        />
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
            {src ? (
              <img
                src={src}
                alt={selected.alt}
                className="max-h-[84vh] w-full object-contain"
              />
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
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.06]" aria-hidden />
      <Navigation />

      <main className="relative z-10 pt-16">
        <section className="border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 md:py-20">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-mono-tech uppercase tracking-[0.24em] text-primary">
                  RoboEyeView
                </span>
              </div>

              <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-6xl">
                Exocentric in. <span className="text-primary">Robot-eye outputs</span> out.
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
                Each vertical now pairs multiple exocentric scenes with their corresponding
                robot-eye outputs, giving the page a broader, more persuasive demo narrative
                without turning the layout into a maze of extra panels.
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
            <section key={vertical.id} id={vertical.id} className="scroll-mt-24 px-4 sm:px-6">
              <div className="mx-auto max-w-7xl overflow-hidden rounded-sm border border-border bg-card/15 shadow-2xl shadow-black/10">
                <div className="border-b border-border bg-background/65 px-6 py-5 md:px-8 md:py-6">
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
                </div>

                <div className="space-y-5 p-5 sm:p-6 md:p-8">
                  {vertical.examples.map((example) => (
                    <ShowcaseExampleRow
                      key={`${vertical.id}-${example.id}`}
                      example={example}
                      onSelect={setSelectedImage}
                    />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>

      {selectedImage && (
        <ImageLightbox selected={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </div>
  );
}
