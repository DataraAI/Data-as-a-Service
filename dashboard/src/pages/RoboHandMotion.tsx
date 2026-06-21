import { useEffect, useRef, useState } from "react";
import { ChevronDown, Hand, X } from "lucide-react";
import { Link } from "react-router-dom";
import FooterSection from "@/components/FooterSection";
import Navigation from "@/components/Navigation";
import { buildAuthPath } from "@/lib/authLinks";
import handInputVideo from "@/assets/Products/RoboHandMotion/handinput.mp4";
import handTrackingOutputVideo from "@/assets/Products/RoboHandMotion/handtrackingoutput.mp4";
import mcapInputVideo from "@/assets/Products/RoboHandMotion/mcapinput.mp4";
import mcapInputPoster from "@/assets/Products/RoboHandMotion/mcapinput-poster.jpg";
import mcapOutputVideo from "@/assets/Products/RoboHandMotion/mcapoutput.mp4";
import mcapOutputPoster from "@/assets/Products/RoboHandMotion/mcapoutput-poster.jpg";
import frame390 from "@/assets/Products/RoboHandMotion/390.png";
import leftHandMeshOne from "@/assets/Products/RoboHandMotion/left1.png";
import leftHandMeshTwo from "@/assets/Products/RoboHandMotion/left2.png";
import rightHandMeshOne from "@/assets/Products/RoboHandMotion/right1.png";
import rightHandMeshTwo from "@/assets/Products/RoboHandMotion/right2.png";

type VideoAsset = {
  videoSrc: string;
  posterSrc: string;
  alt: string;
};

type ImageAsset = {
  src: string;
  alt: string;
};

type ExpandedImage = {
  src: string;
  alt: string;
};

const VIDEO_SHOWCASE = {
  input: {
    videoSrc: handInputVideo,
    posterSrc: frame390,
    alt: "Source towel manipulation video",
  },
  output: {
    videoSrc: handTrackingOutputVideo,
    posterSrc: frame390,
    alt: "Hand tracking output video",
  },
} satisfies Record<string, VideoAsset>;

const MCAP_SHOWCASE = {
  input: {
    videoSrc: mcapInputVideo,
    posterSrc: mcapInputPoster,
    alt: "Egocentric hand-motion input video",
  },
  output: {
    videoSrc: mcapOutputVideo,
    posterSrc: mcapOutputPoster,
    alt: "21-keypoint hand MoCap output video",
  },
} satisfies Record<string, VideoAsset>;

const LEFT_HAND_MESHES: ImageAsset[] = [
  { src: leftHandMeshOne, alt: "Left hand 3D mesh example one" },
  { src: leftHandMeshTwo, alt: "Left hand 3D mesh example two" },
];

const RIGHT_HAND_MESHES: ImageAsset[] = [
  { src: rightHandMeshOne, alt: "Right hand 3D mesh example one" },
  { src: rightHandMeshTwo, alt: "Right hand 3D mesh example two" },
];

function SectionHeader({
  title,
  summary,
  accent,
}: {
  title: string;
  summary: string;
  accent: "blue" | "purple" | "orange";
}) {
  const dot = accent === "blue" ? "bg-blue-700" : accent === "purple" ? "bg-violet-600" : "bg-orange-600";
  const line = accent === "blue" ? "from-blue-200" : accent === "purple" ? "from-violet-200" : "from-orange-200";

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
  accent: "blue" | "purple" | "orange";
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

function InlineFeaturePipe({ detail }: { detail: string }) {
  return (
    <div className="flex justify-center xl:hidden">
      <div className="rounded-[14px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-orange-50 px-5 py-4 text-center shadow-[0_10px_25px_rgba(124,58,237,0.08)] dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-[10px] border border-violet-200 bg-violet-100 text-violet-700 dark:border-white/20 dark:bg-white/10 dark:text-violet-200">
          <Hand className="h-4 w-4" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200">RoboHandMotion</p>
        <p className="mt-1 text-[13px] font-extrabold text-slate-950 dark:text-slate-100">{detail}</p>
      </div>
    </div>
  );
}

function FeaturePipe({ detail }: { detail: string }) {
  return (
    <>
      <InlineFeaturePipe detail={detail} />
      <div className="hidden h-full items-center justify-center xl:flex">
        <div className="mx-1 flex w-[118px] flex-col items-center">
          <div className="mb-2 h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="w-full rounded-[16px] border-[1.5px] border-violet-300 bg-white px-3 py-4 text-center shadow-[0_12px_28px_rgba(124,58,237,0.08)] dark:border-violet-800/60 dark:bg-slate-900">
            <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-[10px] border border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
              <Hand className="h-4 w-4" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200">RoboHandMotion</p>
            <p className="mt-1 text-[11px] font-extrabold text-slate-950 dark:text-slate-100">Engine</p>
            <p className="mt-1 text-[8px] text-slate-500 dark:text-slate-400">{detail}</p>
          </div>
          <div className="my-2 h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none" className="text-violet-600 dark:text-violet-300">
            <path d="M1 1l8 6-8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </>
  );
}

function VideoPreviewTile({
  asset,
  aspectClass = "aspect-[16/10]",
  fit = "cover",
}: {
  asset: VideoAsset;
  aspectClass?: string;
  fit?: "cover" | "contain";
}) {
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaFitClass = fit === "contain" ? "object-contain" : "object-cover";

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
        alt={asset.alt}
        className={`absolute inset-0 h-full w-full ${mediaFitClass} transition-opacity duration-200 ${hovered ? "opacity-0" : "opacity-100"}`}
      />
      <video
        ref={videoRef}
        src={asset.videoSrc}
        poster={asset.posterSrc}
        muted
        loop
        playsInline
        preload="metadata"
        className={`absolute inset-0 h-full w-full ${mediaFitClass} transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
    </div>
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
      onClick={() => onOpen({ src: asset.src, alt: asset.alt })}
      className="block w-full cursor-zoom-in overflow-hidden rounded-[10px] transition-transform duration-200 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-violet-500/60"
    >
      <img src={asset.src} alt={asset.alt} className="block h-auto w-full rounded-[10px]" loading="lazy" decoding="async" />
    </button>
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

function HandMeshGroup({
  title,
  images,
  onOpen,
}: {
  title: string;
  images: ImageAsset[];
  onOpen: (image: ExpandedImage) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-200">{title}</p>
      <div className="grid gap-2">
        {images.map((image) => (
          <button
            key={image.alt}
            type="button"
            onClick={() => onOpen({ src: image.src, alt: image.alt })}
            className="relative block aspect-[2/3] w-full cursor-zoom-in overflow-hidden rounded-[10px] border border-white !bg-white p-0 transition-transform duration-200 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-violet-500/60 dark:border-white dark:!bg-white"
            style={{ backgroundColor: "#ffffff", borderColor: "#ffffff" }}
          >
            <div
              className="absolute inset-[8px] flex items-center justify-center rounded-[8px] !bg-white dark:!bg-white"
              style={{ backgroundColor: "#ffffff" }}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="block max-h-full max-w-full object-contain"
                loading="lazy"
                decoding="async"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RoboHandMotion() {
  const [expandedImage, setExpandedImage] = useState<ExpandedImage | null>(null);

  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <Navigation />

      <main className="pt-[88px]">
        <div className="mx-auto max-w-[1320px] bg-white px-4 py-9 sm:px-6 md:px-10 xl:px-12 dark:bg-slate-950">
          <div className="mx-auto max-w-[1280px]">
            <section className="mb-6">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-[9px] border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
                  <Hand className="h-4 w-4" />
                </div>
                <h1 className="marketing-display-title text-[30px] font-black tracking-[-0.005em] text-slate-950 dark:text-slate-100">
                  RoboHandMotion
                </h1>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
                  Patented
                </span>
              </div>
              <p className="max-w-[900px] text-[15px] leading-8 text-slate-500 dark:text-slate-400">
                Transform real-world task video into training-ready hand-motion data with tracked overlay video,
                21-keypoint hand MoCap, frame-level reconstruction, and left/right 3D hand mesh outputs.
              </p>
            </section>

            <section className="flex flex-col gap-10">
              <CollapsibleSection
                title="Sequence Tracking"
                summary="Input towel video to tracked hand output"
                accent="purple"
                defaultOpen
              >
                <div className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-[24px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">Sequence-Level Hand Tracking</p>
                  <p className="mt-3 max-w-[860px] text-[13px] leading-7 text-slate-500 dark:text-slate-400">
                    Hover the source towel manipulation clip to compare the raw sequence against RoboHandMotion&apos;s tracked output of the same action.
                  </p>

                  <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.98fr)_118px_minmax(0,0.98fr)] xl:items-center">
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-200">Input Video</p>
                      <VideoPreviewTile asset={VIDEO_SHOWCASE.input} />
                    </div>

                    <FeaturePipe detail="Hand Tracking" />

                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-200">Tracked Output</p>
                      <VideoPreviewTile asset={VIDEO_SHOWCASE.output} />
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="21-Keypoint Hand MoCap"
                summary="Egocentric hand video to 21-keypoint MoCap data"
                accent="orange"
                defaultOpen
              >
                <div className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-[24px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">21-Keypoint Hand Motion Capture</p>
                  <p className="mt-3 max-w-[860px] text-[13px] leading-7 text-slate-500 dark:text-slate-400">
                    Generate motion-capture data from egocentric hand video using the standard 21-keypoint hand representation.
                  </p>

                  <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.98fr)_118px_minmax(0,0.98fr)] xl:items-center">
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-200">Egocentric Input</p>
                      <VideoPreviewTile
                        asset={MCAP_SHOWCASE.input}
                        aspectClass="mx-auto h-[120px] aspect-video sm:h-[188px] md:h-[225px] xl:h-[260px]"
                        fit="contain"
                      />
                    </div>

                    <FeaturePipe detail="21-Keypoint MoCap" />

                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-200">MoCap Visualization</p>
                      <VideoPreviewTile
                        asset={MCAP_SHOWCASE.output}
                        aspectClass="mx-auto h-[120px] aspect-[116/65] sm:h-[188px] md:h-[225px] xl:h-[260px]"
                        fit="contain"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Frame Reconstruction"
                summary="Single frame to left and right hand 3D meshes"
                accent="blue"
                defaultOpen
              >
                <div className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-[24px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-100">Frame-by-Frame 3D Hand Mesh Generation</p>
                  <p className="mt-3 max-w-[860px] text-[13px] leading-7 text-slate-500 dark:text-slate-400">
                    A representative frame from the same towel sequence is reconstructed into per-hand 3D mesh outputs, with two 3D mesh views for the left hand and two for the right.
                  </p>

                  <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_118px_minmax(0,1.1fr)] xl:items-center">
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-200">Source Frame</p>
                      <ImagePreviewTile asset={{ src: frame390, alt: "Representative towel sequence frame" }} onOpen={setExpandedImage} />
                    </div>

                    <FeaturePipe detail="3D Hand Mesh Generation" />

                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-200">Generated 3D Meshes</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        <HandMeshGroup title="Left Hand 3D Meshes" images={LEFT_HAND_MESHES} onOpen={setExpandedImage} />
                        <HandMeshGroup title="Right Hand 3D Meshes" images={RIGHT_HAND_MESHES} onOpen={setExpandedImage} />
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              <div className="mt-1 flex flex-col justify-between gap-6 rounded-[14px] border-[1.5px] border-dashed border-violet-300 bg-gradient-to-br from-violet-50 to-orange-50 px-8 py-7 lg:flex-row lg:items-center dark:border-violet-900/50 dark:from-violet-950/20 dark:to-orange-950/20">
                <div className="flex items-center gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <div>
                    <p className="mb-1 text-[15px] font-bold text-slate-950 dark:text-slate-100">
                      Run RoboHandMotion on Your Footage
                    </p>
                    <p className="max-w-[480px] text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                      Already have task footage? We&apos;ll generate tracked hand motion outputs and frame-level 3D mesh reconstructions for dexterous robot learning workflows.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 lg:items-center">
                  <div className="flex gap-[5px]">
                    <span className="rounded-[4px] border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
                      Hand Tracking
                    </span>
                    <span className="rounded-[4px] border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                      3D Mesh Generation
                    </span>
                  </div>
                  <Link
                    to={buildAuthPath("register", "/robohandmotion")}
                    className="inline-flex w-full items-center justify-center rounded-[8px] bg-violet-600 px-6 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                  >
                    Submit Your Footage
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <ImageLightbox image={expandedImage} onClose={() => setExpandedImage(null)} />

      <FooterSection />
    </div>
  );
}
