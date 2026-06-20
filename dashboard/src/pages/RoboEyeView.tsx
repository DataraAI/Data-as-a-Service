import { useEffect, useRef, useState } from "react";
import { ChevronDown, Eye, Sparkles, X } from "lucide-react";
import FooterSection from "@/components/FooterSection";
import Navigation from "@/components/Navigation";
import sourceFrontGrilleVideo from "@/assets/Products/RoboAnnotator/v2v/input/source-front-grille.mp4";
import sourceFrontGrillePoster from "@/assets/Products/RoboAnnotator/v2v/input/source-front-grille-poster.jpg";
import frontGrilleLeftVideo from "@/assets/Products/RoboAnnotator/v2v/newangles/front-grille-left.mp4";
import frontGrilleLeftPoster from "@/assets/Products/RoboAnnotator/v2v/newangles/front-grille-left-poster.jpg";
import frontGrilleUpVideo from "@/assets/Products/RoboAnnotator/v2v/newangles/front-grille-up.mp4";
import frontGrilleUpPoster from "@/assets/Products/RoboAnnotator/v2v/newangles/front-grille-up-poster.jpg";
import occlusionRemovedVideo from "@/assets/Products/RoboAnnotator/v2v/occl_removal/occlusion-removed.mp4";
import occlusionRemovedPoster from "@/assets/Products/RoboAnnotator/v2v/occl_removal/occlusion-removed-poster.jpg";
import exoCarAutomation from "@/assets/Products/RoboAnnotator/i2i/exo2ego/2exo_carautomation.png";
import egoCarAutomationFront from "@/assets/Products/RoboAnnotator/i2i/exo2ego/2ego_carautomation.png";
import egoCarAutomationSide from "@/assets/Products/RoboAnnotator/i2i/exo2ego/2ego_carautomation1.png";
import egoCarAutomationLow from "@/assets/Products/RoboAnnotator/i2i/exo2ego/2ego_carautomation2.png";
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

const EXO_TO_EGO_EXAMPLES: ExoToEgoExample[] = [
  {
    title: "Automotive Assembly",
    description:
      "Third-person automotive assembly footage transformed into multiple robot-perspective viewpoints for downstream manipulation training.",
    engineDetail: "View Synthesis",
    input: {
      src: exoCarAutomation,
      caption: "Automotive EXO source",
    },
    outputs: [
      { src: egoCarAutomationFront, caption: "Front robot view" },
      { src: egoCarAutomationSide, caption: "Side robot view" },
      { src: egoCarAutomationLow, caption: "Low-angle robot view" },
    ],
  },
  {
    title: "Data Center Servicing",
    description:
      "Server rack service capture converted from a fixed external viewpoint into robot-ready inspection perspectives.",
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
  },
];

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
  input: {
    videoSrc: sourceFrontGrilleVideo,
    posterSrc: sourceFrontGrillePoster,
    caption: "Original source clip",
  },
  occlusionRemoval: {
    videoSrc: occlusionRemovedVideo,
    posterSrc: occlusionRemovedPoster,
    caption: "Occlusion removed output",
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

function SectionHeader({
  title,
  summary,
  accent,
}: {
  title: string;
  summary: string;
  accent: "blue" | "teal" | "purple";
}) {
  const dot = accent === "blue" ? "bg-blue-700" : accent === "teal" ? "bg-teal-600" : "bg-violet-600";
  const line = accent === "blue" ? "from-blue-200" : accent === "teal" ? "from-teal-200" : "from-violet-200";

  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 transition-all duration-200 group-hover:scale-[1.02] group-hover:border-slate-300 group-hover:bg-slate-50 group-hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:group-hover:border-slate-600 dark:group-hover:bg-slate-900/90 dark:group-hover:shadow-[0_10px_28px_rgba(15,23,42,0.22)]">
        <span className={`h-2 w-2 rounded-[2px] ${dot}`} />
        <span className="text-[14px] font-extrabold text-slate-950 dark:text-slate-100">{title}</span>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{summary}</span>
      </div>
      <div className={`h-px flex-1 bg-gradient-to-r ${line} to-transparent transition-all duration-200 group-hover:opacity-100 group-hover:from-slate-300 dark:group-hover:from-slate-500`} />
    </div>
  );
}

function CollapsibleSection({
  title,
  summary,
  accent,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary: string;
  accent: "blue" | "teal" | "purple";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="group flex w-full items-center gap-3 rounded-[18px] p-2 text-left transition-colors"
      >
        <div className="min-w-0 flex-1">
          <SectionHeader title={title} summary={summary} accent={accent} />
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-all duration-200 group-hover:scale-105 group-hover:border-slate-300 group-hover:bg-slate-50 group-hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:group-hover:border-slate-600 dark:group-hover:bg-slate-900/90 dark:group-hover:text-slate-100">
          <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open ? children : null}
    </section>
  );
}

function VerticalFlowArrow() {
  return (
    <div className="flex justify-center py-1">
      <div className="flex flex-col items-center">
        <div className="h-14 w-[2px] rounded-[2px] bg-gradient-to-b from-blue-700 to-teal-600 dark:from-blue-300 dark:to-teal-300" />
        <div className="h-0 w-0 border-x-[7px] border-x-transparent border-t-[11px] border-t-teal-600 dark:border-t-teal-300" />
      </div>
    </div>
  );
}

function EngineBlock({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[18px] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-blue-50 px-6 py-6 text-slate-950 shadow-[0_20px_50px_rgba(13,148,136,0.12)] dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.18),_transparent_48%),linear-gradient(180deg,#0f172a_0%,#111827_100%)] dark:text-white dark:shadow-[0_20px_50px_rgba(15,23,42,0.2)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-[12px] border border-teal-200 bg-teal-100 text-teal-700 dark:border-white/20 dark:bg-white/10 dark:text-teal-200">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-200">RoboAnnotator</p>
          <p className="text-[18px] font-black tracking-[-0.03em]">{title}</p>
        </div>
      </div>
      <p className="max-w-[540px] text-[13px] leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}

function InlineEngineCard({ detail }: { detail: string }) {
  return (
    <div className="flex justify-center xl:hidden">
      <div className="rounded-[14px] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-blue-50 px-5 py-4 text-center shadow-[0_10px_25px_rgba(13,148,136,0.08)] dark:border-slate-700 dark:bg-slate-900">
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
          <div className="w-full rounded-[16px] border-[1.5px] border-teal-300 bg-white px-3 py-4 text-center shadow-[0_12px_28px_rgba(13,148,136,0.08)] dark:border-teal-800/60 dark:bg-slate-900">
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
  eyebrow,
  title,
  description,
  engineDetail,
  inputTitle,
  outputTitle,
  inputItems,
  outputItems,
  inputColumns,
  outputColumns,
  inputAspectClass = "aspect-[5/4]",
  outputAspectClass = "aspect-[5/4]",
  inputNote,
  outputNote,
  onImageOpen,
}: {
  eyebrow: string;
  title: string;
  description: string;
  engineDetail: string;
  inputTitle: string;
  outputTitle: string;
  inputItems: ImageAsset[];
  outputItems: ImageAsset[];
  inputColumns: 1 | 2;
  outputColumns: 1 | 2;
  inputAspectClass?: string;
  outputAspectClass?: string;
  inputNote?: string;
  outputNote?: string;
  onImageOpen: (image: ExpandedImage) => void;
}) {
  return (
    <div className="rounded-[16px] border border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-900/50">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>
      <p className="mt-2 text-[19px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">{title}</p>
      <p className="mt-2 max-w-[760px] text-[13px] leading-7 text-slate-500 dark:text-slate-400">{description}</p>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.98fr)_118px_minmax(0,1.12fr)] xl:items-center">
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

export default function RoboEyeView() {
  const [expandedImage, setExpandedImage] = useState<ExpandedImage | null>(null);

  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <Navigation />

      <main className="pt-[88px]">
        <div className="mx-auto max-w-[1320px] bg-white px-4 py-9 sm:px-6 md:px-10 xl:px-12 dark:bg-slate-950">
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

            <CollapsibleSection
              title="Video-to-Video"
              summary="Input source video feeding multiple transformations"
              accent="teal"
              defaultOpen
            >
              <div className="mx-auto w-full max-w-[680px] rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4">
                  <p className="text-[18px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">Input Video</p>
                  <p className="mt-2 max-w-[560px] text-[13px] leading-7 text-slate-500 dark:text-slate-400">
                    A single front grille source clip feeds the transformations below. Hover to preview the original input before it enters the generation pipeline.
                  </p>
                </div>
                <div className="mx-auto max-w-[390px]">
                  <VideoPreviewTile asset={VIDEO_OUTPUTS.input} />
                </div>
              </div>

              <VerticalFlowArrow />

              <div className="py-1">
                <div className="mx-auto max-w-[880px]">
                  <EngineBlock
                    title="Video Transformation Engine"
                    description="The same source sequence can be routed through different RoboAnnotator generation paths, producing cleaned footage and entirely new viewpoints without changing the underlying task context."
                  />
                </div>
              </div>

              <VerticalFlowArrow />

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.22fr)_minmax(0,0.88fr)]">
                <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-[22px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">New Angle Video Generation</p>
                  <p className="mt-3 max-w-[560px] text-[13px] leading-7 text-slate-500 dark:text-slate-400">
                    Generates multiple alternative perspectives from the same clip so one real capture can feed several robot-view training scenarios.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <VideoPreviewTile asset={VIDEO_OUTPUTS.newAngleLeft} />
                    <VideoPreviewTile asset={VIDEO_OUTPUTS.newAngleUp} />
                  </div>
                </div>

                <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-[22px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">Occlusion Removal</p>
                  <p className="mt-3 max-w-[420px] text-[13px] leading-7 text-slate-500 dark:text-slate-400">
                    Removes foreground blockers while preserving the scene geometry and the underlying task action.
                  </p>
                  <div className="mt-5">
                    <VideoPreviewTile asset={VIDEO_OUTPUTS.occlusionRemoval} />
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Image-to-Image"
              summary="Three generation workflows built from real product outputs"
              accent="blue"
              defaultOpen
            >
              <div className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[24px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">EXO to EGO</p>
                <p className="mt-3 max-w-[840px] text-[13px] leading-7 text-slate-500 dark:text-slate-400">
                  Convert a single third-person scene capture into multiple robot-perspective views for inspection, manipulation, and control training.
                </p>

                <div className="mt-6 flex flex-col gap-5">
                  {EXO_TO_EGO_EXAMPLES.map((example) => (
                    <I2IRow
                      key={example.title}
                      eyebrow="Conversion Example"
                      title={example.title}
                      description={example.description}
                      engineDetail={example.engineDetail}
                      inputTitle="EXO Source"
                      outputTitle="Generated EGO Views"
                      inputItems={[example.input]}
                      outputItems={example.outputs}
                      inputColumns={1}
                      outputColumns={2}
                      inputAspectClass="aspect-[5/4]"
                      outputAspectClass="aspect-[5/4]"
                      onImageOpen={setExpandedImage}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[24px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">Corner Case Generation</p>
                <p className="mt-3 max-w-[840px] text-[13px] leading-7 text-slate-500 dark:text-slate-400">
                  Starting from a single source frame, RoboAnnotator can synthesize multiple edge-case outcomes to expand coverage for rare but critical scenarios.
                </p>

                <div className="mt-6">
                  <I2IRow
                    eyebrow="Prompt-Driven Editing"
                    title="Synthetic Edge Cases"
                    description="One base image becomes multiple generated safety scenarios with prompt-specific scene edits."
                    engineDetail="Prompted Scene Editing"
                    inputTitle="Source Frame"
                    outputTitle="Generated Variants"
                    inputItems={[CORNER_CASE_INPUT]}
                    outputItems={CORNER_CASE_OUTPUTS}
                    inputColumns={1}
                    outputColumns={2}
                    inputAspectClass="aspect-[5/4]"
                    outputAspectClass="aspect-[5/4]"
                    outputNote='Prompts shown: "Add fire in front of car" and "Add oil leak under vehicle."'
                    onImageOpen={setExpandedImage}
                  />
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[24px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">Mask Segmentation</p>
                <p className="mt-3 max-w-[840px] text-[13px] leading-7 text-slate-500 dark:text-slate-400">
                  Multi-frame segmentation outputs preserve the original scene context while isolating the exact regions needed for annotation and training workflows.
                </p>

                <div className="mt-6">
                  <I2IRow
                    eyebrow="Pixel-Level Output"
                    title="Frame-to-Mask Conversion"
                    description="Four representative source frames paired with four generated masks to show consistent segmentation behavior across the scene."
                    engineDetail="Segmentation Pipeline"
                    inputTitle="Input Frames"
                    outputTitle="Generated Masks"
                    inputItems={MASK_SEGMENTATION_INPUTS}
                    outputItems={MASK_SEGMENTATION_OUTPUTS}
                    inputColumns={2}
                    outputColumns={2}
                    inputAspectClass="aspect-square"
                    outputAspectClass="aspect-square"
                    onImageOpen={setExpandedImage}
                  />
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </main>

      <ImageLightbox image={expandedImage} onClose={() => setExpandedImage(null)} />

      <FooterSection />
    </div>
  );
}
