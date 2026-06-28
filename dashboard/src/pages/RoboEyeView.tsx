import { useAuth } from "@/auth/useAuth";
import { useEffect, useRef, useState } from "react";
import { Eye, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import FooterSection from "@/components/FooterSection";
import FeatureShowcaseCarousel, { type FeatureShowcaseItem } from "@/components/FeatureShowcaseCarousel";
import Navigation from "@/components/Navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { canImportData, ROBODATAHUB_IMPORT_DATA_PATH } from "@/lib/dataImportAccess";
import pduInstallationVideo from "@/assets/Products/RoboAnnotator/v2v/input/pduInstallation.mp4";
import pduInstallationPoster from "@/assets/Products/RoboAnnotator/v2v/input/pduInstallation-poster.jpg";
import sourceFrontGrilleVideo from "@/assets/Products/RoboAnnotator/v2v/input/source-front-grille.mp4";
import sourceFrontGrillePoster from "@/assets/Products/RoboAnnotator/v2v/input/source-front-grille-poster.jpg";
import frontGrilleLeftVideo from "@/assets/Products/RoboAnnotator/v2v/newangles/front-grille-left.mp4";
import frontGrilleLeftPoster from "@/assets/Products/RoboAnnotator/v2v/newangles/front-grille-left-poster.jpg";
import frontGrilleUpVideo from "@/assets/Products/RoboAnnotator/v2v/newangles/front-grille-up.mp4";
import frontGrilleUpPoster from "@/assets/Products/RoboAnnotator/v2v/newangles/front-grille-up-poster.jpg";
import noPersonVideo from "@/assets/Products/RoboAnnotator/v2v/occl_removal/no_person.mp4";
import noPersonPoster from "@/assets/Products/RoboAnnotator/v2v/occl_removal/no_person-poster.jpg";
import exoServerRack from "@/assets/Products/RoboAnnotator/i2i/exo2ego/2exo_serverrack.png";
import egoServerRackFront from "@/assets/Products/RoboAnnotator/i2i/exo2ego/2ego_serverrack.png";
import egoServerRackOverhead from "@/assets/Products/RoboAnnotator/i2i/exo2ego/2ego_serverrack1.png";
import egoServerRackSide from "@/assets/Products/RoboAnnotator/i2i/exo2ego/2ego_serverrack2.png";
import cornerCaseInput from "@/assets/Products/RoboAnnotator/i2i/cornercase/input.png";
import cornerCaseFire from "@/assets/Products/RoboAnnotator/i2i/cornercase/fireoutput.png";
import cornerCaseOil from "@/assets/Products/RoboAnnotator/i2i/cornercase/oilleak.png";
import maskInput000 from "@/assets/Products/RoboAnnotator/i2i/maskseg/000.png";
import maskInput103 from "@/assets/Products/RoboAnnotator/i2i/maskseg/103.png";
import maskInput206 from "@/assets/Products/RoboAnnotator/i2i/maskseg/206.png";
import maskInput310 from "@/assets/Products/RoboAnnotator/i2i/maskseg/310.png";
import maskOutput000 from "@/assets/Products/RoboAnnotator/i2i/maskseg/000mask.png";
import maskOutput103 from "@/assets/Products/RoboAnnotator/i2i/maskseg/103mask.png";
import maskOutput206 from "@/assets/Products/RoboAnnotator/i2i/maskseg/206mask.png";
import maskOutput309 from "@/assets/Products/RoboAnnotator/i2i/maskseg/309mask.png";

type VideoAsset = {
  videoSrc: string;
  posterSrc: string;
  caption: string;
};

type ImageAsset = {
  src: string;
  caption: string;
};

type ExpandedImage = {
  src: string;
  alt: string;
};

type ExoToEgoExample = {
  title: string;
  description: string;
  engineDetail: string;
  input: ImageAsset;
  outputs: ImageAsset[];
};

const DATA_CENTER_EXO_TO_EGO_EXAMPLE: ExoToEgoExample = {
  title: "Data Center EXO to EGO",
  description:
    "Converts fixed server-rack capture into robot-ready inspection perspectives.",
  engineDetail: "Robot Perspective Generation",
  input: {
    src: exoServerRack,
    caption: "Server rack EXO source",
  },
  outputs: [
    { src: egoServerRackFront, caption: "Front inspection view" },
    { src: egoServerRackOverhead, caption: "Overhead inspection view" },
    { src: egoServerRackSide, caption: "Side inspection view" },
  ],
};

const CORNER_CASE_INPUT: ImageAsset = {
  src: cornerCaseInput,
  caption: "Original driving scene",
};

const CORNER_CASE_OUTPUTS: ImageAsset[] = [
  {
    src: cornerCaseFire,
    caption: 'Prompt: "Add fire in front of car"',
  },
  {
    src: cornerCaseOil,
    caption: 'Prompt: "Add oil leak under vehicle"',
  },
];

const MASK_SEGMENTATION_INPUTS: ImageAsset[] = [
  { src: maskInput000, caption: "Frame 000" },
  { src: maskInput103, caption: "Frame 103" },
  { src: maskInput206, caption: "Frame 206" },
  { src: maskInput310, caption: "Frame 310" },
];

const MASK_SEGMENTATION_OUTPUTS: ImageAsset[] = [
  { src: maskOutput000, caption: "Mask 000" },
  { src: maskOutput103, caption: "Mask 103" },
  { src: maskOutput206, caption: "Mask 206" },
  { src: maskOutput309, caption: "Mask 309" },
];

const VIDEO_OUTPUTS = {
  pduInstallationInput: {
    videoSrc: pduInstallationVideo,
    posterSrc: pduInstallationPoster,
    caption: "PDU installation source clip",
  },
  frontGrilleInput: {
    videoSrc: sourceFrontGrilleVideo,
    posterSrc: sourceFrontGrillePoster,
    caption: "Front grille source clip",
  },
  occlusionRemoval: {
    videoSrc: noPersonVideo,
    posterSrc: noPersonPoster,
    caption: "PDU installation with installer removed",
  },
  newAngleLeft: {
    videoSrc: frontGrilleLeftVideo,
    posterSrc: frontGrilleLeftPoster,
    caption: "Generated left view",
  },
  newAngleUp: {
    videoSrc: frontGrilleUpVideo,
    posterSrc: frontGrilleUpPoster,
    caption: "Generated upper view",
  },
} satisfies Record<string, VideoAsset>;

function InlineEngineCard({ detail }: { detail: string }) {
  return (
    <div className="flex justify-center xl:hidden">
      <div className="rounded-[14px] border border-teal-200 bg-card px-5 py-4 text-center shadow-[0_10px_25px_rgba(13,148,136,0.08)] dark:border-slate-700">
        <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-[10px] border border-teal-200 bg-teal-100 text-teal-700 dark:border-white/20 dark:bg-white/10 dark:text-teal-200">
          <Sparkles className="h-4 w-4" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-teal-700 dark:text-teal-200">RoboAnnotator</p>
        <p className="mt-1 text-[13px] font-extrabold text-slate-950 dark:text-slate-100">{detail}</p>
      </div>
    </div>
  );
}

function I2IPipe({ detail }: { detail: string }) {
  return (
    <>
      <InlineEngineCard detail={detail} />
      <div className="hidden h-full items-center justify-center xl:flex">
        <div className="mx-1 flex w-[118px] flex-col items-center">
          <div className="mb-2 h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="w-full rounded-[16px] border-[1.5px] border-teal-300 bg-card px-3 py-4 text-center shadow-[0_12px_28px_rgba(13,148,136,0.08)] dark:border-teal-800/60">
            <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-[10px] border border-teal-300 bg-teal-100 text-teal-700 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-teal-700 dark:text-teal-200">RoboAnnotator</p>
            <p className="mt-1 text-[11px] font-extrabold text-slate-950 dark:text-slate-100">{detail}</p>
          </div>
          <div className="my-2 h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none" className="text-teal-600 dark:text-teal-300">
            <path d="M1 1l8 6-8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </>
  );
}

function ImagePreviewTile({
  asset,
  onOpen,
}: {
  asset: ImageAsset;
  onOpen: (image: ExpandedImage) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen({ src: asset.src, alt: asset.caption })}
      className="block w-full cursor-zoom-in overflow-hidden rounded-[10px] transition-transform duration-200 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-teal-500/60"
    >
      <img
        src={asset.src}
        alt={asset.caption}
        className="block h-auto w-full rounded-[10px]"
        loading="lazy"
        decoding="async"
      />
    </button>
  );
}

function ImageMosaic({
  items,
  columns,
  onOpen,
}: {
  items: ImageAsset[];
  columns: 1 | 2;
  onOpen: (image: ExpandedImage) => void;
}) {
  const gridClass = columns === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className={`grid gap-1 ${gridClass}`}>
      {items.map((item, index) => {
        const spanClass = columns === 2 && items.length === 3 && index === 2 ? "sm:col-span-2" : "";
        return (
          <div key={`${item.caption}-${index}`} className={spanClass}>
            <ImagePreviewTile asset={item} onOpen={onOpen} />
          </div>
        );
      })}
    </div>
  );
}

function I2IRow({
  title,
  description,
  engineDetail,
  inputTitle,
  outputTitle,
  inputItems,
  outputItems,
  inputColumns,
  outputColumns,
  inputNote,
  outputNote,
  onImageOpen,
}: {
  title: string;
  description: string;
  engineDetail: string;
  inputTitle: string;
  outputTitle: string;
  inputItems: ImageAsset[];
  outputItems: ImageAsset[];
  inputColumns: 1 | 2;
  outputColumns: 1 | 2;
  inputNote?: string;
  outputNote?: string;
  onImageOpen: (image: ExpandedImage) => void;
}) {
  return (
    <div className="rounded-[16px] border border-slate-200/80 bg-card p-4 dark:border-slate-700 sm:p-5">
      <p className="text-[17px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">{title}</p>
      <p className="mt-1.5 max-w-[760px] text-[12px] leading-6 text-slate-500 dark:text-slate-400">{description}</p>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.98fr)_118px_minmax(0,1.12fr)] xl:items-center">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-200">{inputTitle}</p>
          <ImageMosaic items={inputItems} columns={inputColumns} onOpen={onImageOpen} />
          {inputNote ? <p className="mt-3 text-[12px] font-semibold leading-6 text-slate-500 dark:text-slate-400">{inputNote}</p> : null}
        </div>

        <I2IPipe detail={engineDetail} />

        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-200">{outputTitle}</p>
          <ImageMosaic items={outputItems} columns={outputColumns} onOpen={onImageOpen} />
          {outputNote ? <p className="mt-3 text-[12px] font-semibold leading-6 text-slate-500 dark:text-slate-400">{outputNote}</p> : null}
        </div>
      </div>
    </div>
  );
}

function ImageLightbox({
  image,
  onClose,
}: {
  image: ExpandedImage | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!image) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [image, onClose]);

  if (!image) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/88 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Expanded image preview"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/18 focus:outline-none focus:ring-2 focus:ring-white/60"
        aria-label="Close image preview"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="max-h-full max-w-[min(96vw,1400px)]" onClick={(event) => event.stopPropagation()}>
        <img src={image.src} alt={image.alt} className="max-h-[88vh] w-auto max-w-full rounded-[16px] object-contain shadow-[0_18px_50px_rgba(0,0,0,0.35)]" />
      </div>
    </div>
  );
}

function VideoPreviewTile({ asset, aspectClass = "aspect-[16/9]" }: { asset: VideoAsset; aspectClass?: string }) {
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hovered) {
      const playPromise = video.play();
      if (playPromise) {
        void playPromise.catch(() => {
          // Ignore autoplay interruptions until the next hover.
        });
      }
      return;
    }

    video.pause();
    if (video.currentTime !== 0) {
      video.currentTime = 0;
    }
  }, [hovered]);

  return (
    <div
      className={`group relative overflow-hidden rounded-[14px] bg-slate-950 ${aspectClass}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={asset.posterSrc}
        alt={asset.caption}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${hovered ? "opacity-0" : "opacity-100"}`}
      />
      <video
        ref={videoRef}
        src={asset.videoSrc}
        poster={asset.posterSrc}
        muted
        loop
        playsInline
        preload="metadata"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
    </div>
  );
}

function V2VRow({
  title,
  description,
  engineDetail,
  inputAsset,
  outputAssets,
}: {
  title: string;
  description: string;
  engineDetail: string;
  inputAsset: VideoAsset;
  outputAssets: VideoAsset[];
}) {
  return (
    <div className="rounded-[16px] border border-slate-200/80 bg-card p-4 dark:border-slate-700 sm:p-5">
      <p className="text-[17px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">{title}</p>
      <p className="mt-1.5 max-w-[760px] text-[12px] leading-6 text-slate-500 dark:text-slate-400">{description}</p>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.98fr)_118px_minmax(0,1.12fr)] xl:items-center">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-200">Input video</p>
          <VideoPreviewTile asset={inputAsset} />
        </div>

        <I2IPipe detail={engineDetail} />

        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-200">Output video</p>
          <div className="grid grid-cols-1 gap-3">
            {outputAssets.map((asset) => (
              <VideoPreviewTile key={asset.caption} asset={asset} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoboEyeView() {
  usePageTitle("RoboAnnotator");
  const { isAuthenticated, isApproved, user } = useAuth();
  const [expandedImage, setExpandedImage] = useState<ExpandedImage | null>(null);
  const canSubmitFootage = canImportData({ isAuthenticated, isApproved, user });
  const dataCenterExample = DATA_CENTER_EXO_TO_EGO_EXAMPLE;
  const showcaseItems: FeatureShowcaseItem[] = [
    {
      id: "occlusion-removal",
      label: "Occlusion Removal",
      shortLabel: "Occlusion",
      accent: "teal",
      content: (
        <V2VRow
          title="Occlusion Removal"
          description="Removes people from PDU footage while preserving the rack, equipment, and task context."
          engineDetail="Occlusion Removal"
          inputAsset={VIDEO_OUTPUTS.pduInstallationInput}
          outputAssets={[VIDEO_OUTPUTS.occlusionRemoval]}
        />
      ),
    },
    {
      id: "new-angle-video",
      label: "New Angle Generation",
      shortLabel: "New Angles",
      accent: "teal",
      content: (
        <V2VRow
          title="New Angle Video Generation"
          description="Generates alternative perspectives from a single clip for robot-view training."
          engineDetail="New Angle Generation"
          inputAsset={VIDEO_OUTPUTS.frontGrilleInput}
          outputAssets={[VIDEO_OUTPUTS.newAngleLeft, VIDEO_OUTPUTS.newAngleUp]}
        />
      ),
    },
    {
      id: "exo-to-ego",
      label: "EXO → EGO",
      shortLabel: "EXO → EGO",
      accent: "blue",
      content: (
        <I2IRow
          title={dataCenterExample.title}
          description={dataCenterExample.description}
          engineDetail={dataCenterExample.engineDetail}
          inputTitle="EXO Source"
          outputTitle="Generated EGO Views"
          inputItems={[dataCenterExample.input]}
          outputItems={dataCenterExample.outputs}
          inputColumns={1}
          outputColumns={2}
          onImageOpen={setExpandedImage}
        />
      ),
    },
    {
      id: "corner-case-generation",
      label: "Corner Case Generation",
      shortLabel: "Corner Cases",
      accent: "orange",
      content: (
        <I2IRow
          title="Synthetic Edge Cases"
          description="One source frame becomes generated safety scenarios with prompt-specific edits."
          engineDetail="Prompted Scene Editing"
          inputTitle="Source Frame"
          outputTitle="Generated Variants"
          inputItems={[CORNER_CASE_INPUT]}
          outputItems={CORNER_CASE_OUTPUTS}
          inputColumns={1}
          outputColumns={2}
          onImageOpen={setExpandedImage}
        />
      ),
    },
    {
      id: "mask-segmentation",
      label: "Mask Segmentation",
      shortLabel: "Segmentation",
      accent: "violet",
      content: (
        <I2IRow
          title="Frame-to-Mask Conversion"
          description="Representative source frames paired with generated masks for segmentation consistency."
          engineDetail="Segmentation Pipeline"
          inputTitle="Input Frames"
          outputTitle="Generated Masks"
          inputItems={MASK_SEGMENTATION_INPUTS}
          outputItems={MASK_SEGMENTATION_OUTPUTS}
          inputColumns={2}
          outputColumns={2}
          onImageOpen={setExpandedImage}
        />
      ),
    },
  ];
  const visibleShowcaseItems = [
    "occlusion-removal",
    "new-angle-video",
    "exo-to-ego",
    "corner-case-generation",
    "mask-segmentation",
  ]
    .map((itemId) => showcaseItems.find((item) => item.id === itemId))
    .filter((item): item is FeatureShowcaseItem => Boolean(item));

  return (
    <div className="min-h-screen bg-background text-slate-950 dark:text-slate-100">
      <Navigation />

      <main className="pt-[88px]">
        <div className="mx-auto max-w-[1320px] bg-background px-4 py-9 sm:px-6 md:px-10 xl:px-12">
          <div className="mx-auto max-w-[1280px]">
            <section className="mb-6">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-[9px] border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200">
                  <Eye className="h-4 w-4" />
                </div>
                <h1 className="marketing-display-title text-[30px] font-black tracking-[-0.005em] text-slate-950 dark:text-slate-100">
                  RoboAnnotator
                </h1>
                <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200">
                  Patented
                </span>
              </div>
              <p className="max-w-[900px] text-[15px] leading-8 text-slate-500 dark:text-slate-400">
                Generate training-ready robotics data through video-to-video and image-to-image transformation,
                including new-angle perspectives, occlusion removal, EXO-to-EGO conversion, corner cases, and mask segmentation.
              </p>
            </section>

            <section className="flex flex-col gap-10">
              <FeatureShowcaseCarousel
                ariaLabel="RoboAnnotator showcase"
                initialItemId="occlusion-removal"
                items={visibleShowcaseItems}
              />

              {canSubmitFootage && (
                <div className="mt-1 flex flex-col justify-between gap-6 rounded-[14px] border-[1.5px] border-dashed border-teal-300 bg-gradient-to-br from-teal-50 to-blue-50 px-8 py-7 lg:flex-row lg:items-center dark:border-teal-900/50 dark:from-teal-950/20 dark:to-blue-950/20">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="mb-1 text-[15px] font-bold text-slate-950 dark:text-slate-100">
                        Run RoboAnnotator on Your Footage
                      </p>
                      <p className="max-w-[520px] text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                        Upload source videos or frames into RoboDataHub, then open the dataset to run view synthesis, occlusion removal, segmentation, or corner-case tools when you&apos;re ready.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 lg:items-center">
                    <div className="flex gap-[5px]">
                      <span className="rounded-[4px] border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200">
                        View Synthesis
                      </span>
                      <span className="rounded-[4px] border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                        Segmentation
                      </span>
                    </div>
                    <Link
                      to={ROBODATAHUB_IMPORT_DATA_PATH}
                      className="inline-flex w-full items-center justify-center rounded-[8px] bg-teal-600 px-6 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                    >
                      Submit Your Footage
                    </Link>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <ImageLightbox image={expandedImage} onClose={() => setExpandedImage(null)} />

      <FooterSection />
    </div>
  );
}
