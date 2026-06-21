import type { CategoryDatasetPreview, CategoryPreviewAsset, ResolvedCatalogCardEntry } from "@/lib/dataViewerTypes";
import { formatPublicDatasetPathLabel, getCategoryBadge } from "@/lib/dataViewerUtils";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";
import type { CatalogCard } from "@/lib/roboDataHubCatalog";
import { ArrowRight } from "lucide-react";
import { DatasetPreviewImage } from "./DatasetPreviewImage";

export function CuratedCatalogCard({
  card,
  liveItem,
  placeholderItem,
  buttonLabel,
  columns = 3,
  onOpen,
}: {
  card: CatalogCard;
  liveItem?: CategoryDatasetPreview | null;
  placeholderItem?: CategoryDatasetPreview | null;
  buttonLabel: string;
  columns?: 2 | 3;
  onOpen: () => void;
}) {
  const badge = getCategoryBadge(card);
  const previewItem = placeholderItem ?? liveItem ?? null;
  const displayImages = card.images;
  const badgeClasses =
    previewItem || card.availability === "In Library"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-amber-200 bg-amber-50 text-amber-700";
  const footerLabel = formatPublicDatasetPathLabel(previewItem ? previewItem.full_path : card.pathLabel);
  const previewAssets = previewItem
    ? ([previewItem.main_image, ...previewItem.thumbnails].filter(
        (asset): asset is CategoryPreviewAsset => Boolean(asset),
      ).slice(0, 4))
    : [];
  const fallbackThumbs = [displayImages.main, ...displayImages.thumbs].filter(Boolean).slice(0, 4);
  const mosaicCells = Array.from({ length: 4 }, (_, index) => {
    if (previewAssets.length > 0) {
      return previewAssets[index] ?? previewAssets[previewAssets.length - 1] ?? null;
    }
    return fallbackThumbs[index] ?? fallbackThumbs[fallbackThumbs.length - 1] ?? null;
  });

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-card text-left shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_24px_56px_rgba(15,23,42,0.12)] sm:flex-row"
    >
      <div
        className={`p-4 sm:min-w-0 sm:flex-[0_0_48%] sm:p-5 ${
          columns === 2 ? "xl:flex-[0_0_48%]" : "xl:flex-[0_0_44%]"
        }`}
      >
        <div className="grid aspect-square w-full grid-cols-2 gap-1.5">
          {mosaicCells.map((cell, index) =>
            typeof cell === "string" ? (
              <div
                key={`${card.title}-${cell}-${index}`}
                className="aspect-square overflow-hidden rounded-[10px] bg-slate-100"
              >
                <img
                  src={frontPageImageUrl(cell) ?? undefined}
                  alt={`${card.title} preview ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                />
              </div>
            ) : (
              <DatasetPreviewImage
                key={`${card.title}-${cell?.asset_id ?? "thumb"}-${index}`}
                asset={cell}
                alt={`${card.title} preview ${index + 1}`}
                className="aspect-square rounded-[10px] border-0"
              />
            ),
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col border-t border-slate-200 sm:border-l sm:border-t-0">
        <div className="flex items-start justify-between gap-3 px-4 pt-4 md:px-5">
          <h3 className="text-[14px] font-bold leading-6 text-slate-950 md:text-[15px]">
            {card.title}
          </h3>
          <span
            className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${badgeClasses}`}
          >
            {previewItem ? "In Library" : card.availability}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 px-4 md:px-5">
          <span
            className={`inline-flex rounded-[6px] border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${badge.className}`}
          >
            {badge.label}
          </span>
          {card.tags.map((tag) => (
            <span
              key={`${card.title}-${tag}`}
              className="inline-flex rounded-[6px] border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-3 px-4 md:px-5">
          <div className="truncate font-mono-tech text-[10px] leading-5 text-slate-400 sm:text-[11px]">
            {footerLabel}
          </div>
        </div>

        <div className="mt-auto flex justify-end border-t border-slate-200 px-4 py-4 md:px-5">
          <span className="inline-flex min-w-[144px] items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-primary md:text-[11px]">
            {buttonLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </button>
  );
}
