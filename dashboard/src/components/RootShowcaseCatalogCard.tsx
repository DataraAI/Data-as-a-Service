import type { CategoryDatasetPreview } from "@/lib/dataViewerTypes";
import {
  getCatalogAvailabilityClasses,
  getCatalogViewBadge,
  getResolvedCatalogAvailability,
  resolvePreviewMediaUrl,
} from "@/lib/dataViewerUtils";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";
import type { CatalogCard } from "@/lib/roboDataHubCatalog";
import { Database } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function RootShowcaseCatalogCard({
  card,
  liveItem,
  placeholderItem,
  onOpen,
}: {
  card: CatalogCard;
  liveItem?: CategoryDatasetPreview | null;
  placeholderItem?: CategoryDatasetPreview | null;
  onOpen: () => void;
}) {
  const [previewVideoActive, setPreviewVideoActive] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackMain = card.images.main;
  const displayItem = placeholderItem ?? liveItem ?? null;
  const fallbackImageSrc = frontPageImageUrl(fallbackMain);
  const previewImageSrc = displayItem?.main_image ? resolvePreviewMediaUrl(displayItem.main_image) : null;
  const imageSrc = imageFailed ? fallbackImageSrc : previewImageSrc ?? fallbackImageSrc;
  const resolvedVideoSrc = displayItem?.preview_video ? resolvePreviewMediaUrl(displayItem.preview_video) : null;
  const videoSrc = videoFailed ? null : resolvedVideoSrc;
  const badge = getCatalogViewBadge(card);
  const resolvedAvailability = getResolvedCatalogAvailability(card, displayItem);
  const availabilityClasses = getCatalogAvailabilityClasses(resolvedAvailability);

  useEffect(() => {
    setImageFailed(false);
  }, [fallbackImageSrc, previewImageSrc]);

  useEffect(() => {
    setVideoFailed(false);
  }, [resolvedVideoSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc || !shouldLoadVideo) return;

    if (previewVideoActive) {
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Keep the poster visible if playback cannot start immediately.
        });
      }
      return;
    }

    video.pause();
    if (video.currentTime !== 0) {
      video.currentTime = 0;
    }
  }, [previewVideoActive, shouldLoadVideo, videoSrc]);

  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) {
        video.pause();
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col overflow-hidden rounded-[12px] border border-slate-200 bg-card text-left shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_8px_24px_rgba(13,148,136,0.10)]"
    >
      <div
        className="relative h-[120px] overflow-hidden"
        onMouseEnter={
          videoSrc
            ? () => {
                setShouldLoadVideo(true);
                setPreviewVideoActive(true);
              }
            : undefined
        }
        onMouseLeave={videoSrc ? () => setPreviewVideoActive(false) : undefined}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={card.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            <Database className="h-8 w-8 text-primary/55" />
          </div>
        )}
        {videoSrc && shouldLoadVideo ? (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={imageSrc ?? undefined}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
              previewVideoActive ? "opacity-100" : "opacity-0"
            }`}
            onError={() => setVideoFailed(true)}
          />
        ) : null}
        <span
          className={`absolute right-2 top-2 inline-flex rounded-[3px] px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.08em] ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-[13px] font-bold text-slate-950">{card.title}</h3>
        <p className="mt-1 text-[11px] leading-[1.5] text-slate-500">{card.description}</p>
        <div className="mt-2.5 flex flex-wrap gap-1">
          {card.tags.map((tag) => {
            const tone = tag.toLowerCase().includes("ego-centric")
              ? "border-primary/20 bg-primary/10 text-primary"
              : tag.toLowerCase().includes("exo-centric")
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : tag.toLowerCase().includes("edge")
                  ? "border-orange-200 bg-orange-50 text-orange-600"
                  : tag.toLowerCase().includes("seg")
                    ? "border-violet-200 bg-violet-50 text-violet-700"
                    : "border-teal-200 bg-teal-50 text-teal-700";

            return (
              <span
                key={`${card.pathLabel}-${tag}`}
                className={`inline-flex rounded-[3px] border px-1.5 py-0.5 text-[9px] font-semibold ${tone}`}
              >
                {tag}
              </span>
            );
          })}
        </div>
        <div className="mt-auto flex items-center justify-between pt-3">
          <p className="text-[13px] font-bold text-primary">{card.hours}</p>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${availabilityClasses}`}
          >
            {resolvedAvailability}
          </span>
        </div>
      </div>
    </button>
  );
}
