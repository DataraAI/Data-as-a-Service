import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Database,
  Folder,
  Loader2,
  LockKeyhole,
  MoreVertical,
  RefreshCw,
  Search,
  Shield,
  Terminal,
  Trash2,
} from "lucide-react";
import { Sidebar } from "../components/Sidebar";
import { UploadModal } from "../components/UploadModal";
import { ImageGrid } from "../components/ImageGrid";
import { ImageModal } from "../components/ImageModal";
import { MaskGenerationPanel } from "../components/MaskGenerationPanel";
import Navigation from "../components/Navigation";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { DatasetFolderCover } from "../components/DatasetFolderCover";
import AuthRequiredState from "@/components/AuthRequiredState";
import { useAuth } from "@/auth/useAuth";
import { buildAuthPath } from "@/lib/authLinks";
import {
  blobProxyUrl,
  folderPreviewMediaUrl,
  frontPageImageUrl,
  getLocalFolderPreviewSnapshots,
} from "@/lib/datasetFolderCover";
import {
  CATEGORY_LANDING_CONTENT,
  ROOT_SHOWCASE_SECTIONS,
  type CatalogCard,
  type CategoryLandingContent,
} from "@/lib/roboDataHubCatalog";

interface FolderItem {
  name: string;
  full_path: string;
  source_path?: string;
  visibility?: "private" | "public";
  owner_slug?: string;
  viewer_path?: string;
  type?: string;
}

interface VlmRun {
  effective_prompt?: string;
  tags?: string[];
}

interface VlmMetadata {
  last_prompt_label?: string | null;
  runs?: Record<string, VlmRun>;
}

interface ImageMetadata {
  uuid?: string | null;
  date?: string | null;
  uploaded_at?: number | null;
  frame_id?: string | number | null;
  width?: number | null;
  height?: number | null;
  sharpness?: number | null;
  view?: string | null;
  task?: string | null;
  visibility?: string | null;
  vlm?: VlmMetadata;
}

interface ImageItem {
  id: string;
  asset_id: string;
  url: string;
  proxy_url?: string;
  name: string;
  type?: string;
  tags?: string[];
  metadata?: ImageMetadata;
  dataset?: {
    id: string;
    visibility: "private" | "public";
    owner_slug: string;
    viewer_path: string;
  };
}

interface VlmPromptGroup {
  prompt: string;
  tags: string[];
}

type CategoryKey = "carAutomation" | "serverrack" | "dexterity" | "warehouse";
type StoragePreviewKey = "carAutomation" | "serverrack" | "humanoid" | "warehouse";

interface CategoryConfig {
  routeKey: CategoryKey;
  previewKey: StoragePreviewKey;
  publicSlug: string;
  aliases: string[];
  label: string;
  description: string;
}

interface CategoryPreviewAsset {
  asset_id: string;
  blob_path: string;
  name: string;
  label: string;
  proxy_url: string;
}

interface CategoryDatasetPreview {
  title: string;
  brand: string;
  full_path: string;
  viewer_path?: string;
  visibility?: "private" | "public";
  owner_slug?: string;
  main_image: CategoryPreviewAsset | null;
  thumbnails: CategoryPreviewAsset[];
  preview_video?: CategoryPreviewAsset | null;
}

const CATEGORIES: CategoryConfig[] = [
  {
    routeKey: "serverrack",
    previewKey: "serverrack",
    publicSlug: "data-center",
    aliases: ["serverrack", "serverracks", "datacenter", "datacentre", "data-center"],
    label: "Data Center",
    description:
      "Data-center interaction, port-level operation, and maintenance-focused datasets for rack and cabling tasks.",
  },
  {
    routeKey: "dexterity",
    previewKey: "humanoid",
    publicSlug: "dexterity",
    aliases: ["dexterity", "humanoid"],
    label: "Humanoid",
    description:
      "Fine-motor manipulation and embodied task data for dexterous robotic systems operating across practical, object-centric scenarios.",
  },
  {
    routeKey: "warehouse",
    previewKey: "warehouse",
    publicSlug: "warehouse",
    aliases: ["warehouse"],
    label: "Warehouse",
    description:
      "Logistics, handling, and storage-operation data for robotic movement, picking, and material flow.",
  },
  {
    routeKey: "carAutomation",
    previewKey: "carAutomation",
    publicSlug: "automotive",
    aliases: ["carAutomation", "carautomation"],
    label: "Automotive",
    description:
      "Assembly, inspection, and vehicle-production data for robotics workflows across automotive environments.",
  },
];

function normalizePathSearchValue(value: string) {
  return value
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/\s*>\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function getPathSearchTerms(query: string): string[] {
  return normalizePathSearchValue(query)
    .split(/[\/\s]+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function getSuggestionScore(fullPath: string, query: string): number | null {
  const normalizedPath = normalizePathSearchValue(fullPath);
  const normalizedQuery = normalizePathSearchValue(query);
  const queryTerms = getPathSearchTerms(query);

  if (!normalizedQuery || queryTerms.length === 0) return null;
  if (!queryTerms.every((term) => normalizedPath.includes(term))) return null;

  const segments = normalizedPath.split("/").filter(Boolean);
  const finalSegment = segments[segments.length - 1] ?? "";

  if (normalizedQuery.length >= 2 && finalSegment === normalizedQuery) return 0;
  if (normalizedQuery.length >= 2 && finalSegment.startsWith(normalizedQuery)) return 1;
  if (normalizedQuery.length >= 2 && finalSegment.includes(normalizedQuery)) return 2;
  if (normalizedQuery.includes("/") && normalizedPath.includes(normalizedQuery)) return 3;

  let bestStartsWithDistance = Number.POSITIVE_INFINITY;
  let bestIncludesDistance = Number.POSITIVE_INFINITY;

  segments.forEach((segment, index) => {
    const distanceFromEnd = segments.length - 1 - index;
    if (queryTerms.some((term) => segment.startsWith(term))) {
      bestStartsWithDistance = Math.min(bestStartsWithDistance, distanceFromEnd);
    }
    if (queryTerms.some((term) => segment.includes(term))) {
      bestIncludesDistance = Math.min(bestIncludesDistance, distanceFromEnd);
    }
  });

  if (bestStartsWithDistance !== Number.POSITIVE_INFINITY) return 10 + bestStartsWithDistance;
  if (bestIncludesDistance !== Number.POSITIVE_INFINITY) return 20 + bestIncludesDistance;

  return 50 + segments.length;
}

function getBestMatchingSegmentIndex(fullPath: string, query: string): number | null {
  const normalizedQuery = normalizePathSearchValue(query);
  const terms = getPathSearchTerms(query);
  if (!normalizedQuery && terms.length === 0) return null;

  const segments = fullPath.split("/").filter(Boolean);
  let bestIndex: number | null = null;
  let bestRank = Number.POSITIVE_INFINITY;

  segments.forEach((segment, index) => {
    const normalizedSegment = normalizePathSearchValue(segment);
    const distanceFromEnd = segments.length - 1 - index;
    let rank: number | null = null;

    if (normalizedQuery && normalizedSegment === normalizedQuery) {
      rank = distanceFromEnd;
    } else if (normalizedQuery.length >= 2 && normalizedSegment.startsWith(normalizedQuery)) {
      rank = 100 + distanceFromEnd;
    } else if (normalizedQuery.length >= 2 && normalizedSegment.includes(normalizedQuery)) {
      rank = 200 + distanceFromEnd;
    } else if (terms.some((term) => normalizedSegment.startsWith(term))) {
      rank = 300 + distanceFromEnd;
    } else if (terms.some((term) => normalizedSegment.includes(term))) {
      rank = 400 + distanceFromEnd;
    }

    if (rank !== null && rank < bestRank) {
      bestRank = rank;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function normalizeFolderResults(payload: unknown): FolderItem[] {
  if (!Array.isArray(payload)) return [];

  return payload
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Partial<FolderItem>;
      const fullPath = typeof record.full_path === "string" ? record.full_path.trim() : "";
      if (!fullPath) return null;

      return {
        name: record.name || fullPath.split("/").filter(Boolean).pop() || fullPath,
        full_path: fullPath,
        source_path: record.source_path,
        visibility: record.visibility,
        owner_slug: record.owner_slug,
        viewer_path: record.viewer_path,
        type: record.type,
      };
    })
    .filter(Boolean) as FolderItem[];
}

function uniqueFolderItems(items: FolderItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.full_path)) return false;
    seen.add(item.full_path);
    return true;
  });
}

function normalizeCategoryValue(value?: string | null) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

  switch (normalized) {
    case "automotive":
    case "carautomation":
      return "carautomation";
    case "datacenter":
    case "datacentre":
    case "serverrack":
    case "serverracks":
      return "serverrack";
    case "humanoid":
    case "dexterity":
      return "dexterity";
    case "warehouse":
      return "warehouse";
    default:
      return normalized;
  }
}

function getCategoryByRouteKey(value?: string | null) {
  const normalizedValue = normalizeCategoryValue(value);
  return CATEGORIES.find((category) => {
    if (normalizeCategoryValue(category.routeKey) === normalizedValue) return true;
    if (normalizeCategoryValue(category.publicSlug) === normalizedValue) return true;
    return category.aliases.some((alias) => normalizeCategoryValue(alias) === normalizedValue);
  }) ?? null;
}

function pathBelongsToCategory(fullPath: string, routeKey: CategoryKey) {
  const segments = fullPath.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  const categorySegment =
    segments[0] === "my" ? segments[1] : segments[0] === "admin" ? segments[2] : segments[0];
  return (
    getCategoryByRouteKey(categorySegment)?.routeKey === routeKey ||
    normalizeCategoryValue(categorySegment) === normalizeCategoryValue(routeKey)
  );
}

function buildViewerPath(fullPath: string, imageName?: string, basePath = "/viewer") {
  const encodedPath = fullPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const params = new URLSearchParams();
  if (imageName) {
    params.set("image", imageName);
  }

  const query = params.toString();
  return `${basePath}/${encodedPath}${query ? `?${query}` : ""}`;
}

function withViewerBase(viewerPath: string, basePath: string) {
  return viewerPath.startsWith("/viewer") ? `${basePath}${viewerPath.slice("/viewer".length)}` : viewerPath;
}

function buildCategoryLandingPath(category: CategoryConfig, basePath: string) {
  const segment = basePath.startsWith("/robodatahub") ? category.publicSlug : category.routeKey;
  return `${basePath}/${segment}`;
}

function groupVlmPromptTags(tags: string[]) {
  const regularTags = new Set<string>();
  const promptTagMap = new Map<string, Set<string>>();

  tags.forEach((tag) => {
    if (!tag.includes(": ")) {
      regularTags.add(tag);
      return;
    }

    const [prompt, ...rest] = tag.split(": ");
    const scopedValue = rest.join(": ").trim();
    if (!prompt.trim() || !scopedValue) {
      regularTags.add(tag);
      return;
    }

    if (!promptTagMap.has(prompt)) {
      promptTagMap.set(prompt, new Set());
    }

    promptTagMap.get(prompt)?.add(tag);
  });

  return {
    regularTags: Array.from(regularTags).sort((a, b) => a.localeCompare(b)),
    promptGroups: Array.from(promptTagMap.entries())
      .map(([prompt, scopedTags]) => ({
        prompt,
        tags: Array.from(scopedTags).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.prompt.localeCompare(b.prompt)),
  };
}

function parseFrameIdValue(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function isDatasetRoutePath(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "my") return parts.length === 4;
  if (parts[0] === "admin") return parts.length === 5;
  return parts.length === 3;
}

function getCategoryAccent(routeKey: CategoryKey) {
  switch (routeKey) {
    case "serverrack":
      return {
        dot: "bg-blue-600 shadow-[0_0_14px_rgba(37,99,235,0.28)]",
        chip: "border-blue-200 bg-blue-50 text-blue-700",
        line: "bg-blue-200",
      };
    case "warehouse":
      return {
        dot: "bg-amber-600 shadow-[0_0_14px_rgba(217,119,6,0.24)]",
        chip: "border-amber-200 bg-amber-50 text-amber-700",
        line: "bg-amber-200",
      };
    case "dexterity":
      return {
        dot: "bg-emerald-600 shadow-[0_0_14px_rgba(5,150,105,0.24)]",
        chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
        line: "bg-emerald-200",
      };
    default:
      return {
        dot: "bg-violet-600 shadow-[0_0_14px_rgba(124,58,237,0.22)]",
        chip: "border-violet-200 bg-violet-50 text-violet-700",
        line: "bg-violet-200",
      };
  }
}

function getCategoryBadge(card: CatalogCard) {
  const isEgo = card.tags.some((tag) => tag.toLowerCase().includes("ego-centric"));
  return {
    label: isEgo ? "EGO" : "EXO",
    className: isEgo
      ? "border-teal-200 bg-teal-50 text-teal-700"
      : "border-blue-200 bg-blue-50 text-blue-700",
  };
}

function matchesLivePreviewHint(card: CatalogCard, item: CategoryDatasetPreview) {
  if (!card.livePathHints || card.livePathHints.length === 0) return false;
  const normalizedPath = normalizePathSearchValue(item.full_path);
  return card.livePathHints.some((hint) => normalizedPath.includes(normalizePathSearchValue(hint)));
}

function buildFallbackLiveCard(item: CategoryDatasetPreview): CatalogCard {
  const label = item.title?.trim() || item.full_path.split("/").filter(Boolean).pop() || item.full_path;
  const tags = ["Live Preview"];
  if (item.brand?.trim()) tags.push(item.brand.trim());
  if (item.preview_video) tags.push("Hover Video");

  return {
    title: label,
    description: `Live dataset preview for ${label}. Open the folder to browse orig, egos, masks, and related assets in the viewer.`,
    tags,
    availability: "In Library",
    hours: "Live dataset",
    pathLabel: item.full_path,
    images: { main: "", thumbs: [] },
  };
}

function buildLocalPreviewAsset(blobPath: string, label: string, index: number): CategoryPreviewAsset {
  const fileName = blobPath.split("/").filter(Boolean).pop() ?? label;
  return {
    asset_id: `local:${blobPath}:${index}`,
    blob_path: blobPath,
    name: fileName,
    label,
    proxy_url: blobProxyUrl(blobPath),
  };
}

function buildLocalPlaceholderPreview(
  snapshot: ReturnType<typeof getLocalFolderPreviewSnapshots>[number],
  basePath: string,
): CategoryDatasetPreview | null {
  const usableImages = snapshot.imageBlobPaths.slice(0, 4);
  if (usableImages.length === 0) return null;

  return {
    title: snapshot.dataset,
    brand: snapshot.brand,
    full_path: snapshot.fullPath,
    viewer_path: buildViewerPath(snapshot.fullPath, undefined, basePath),
    visibility: "public",
    owner_slug: "roboteyeview",
    main_image: buildLocalPreviewAsset(usableImages[0], `${snapshot.dataset} cover`, 0),
    thumbnails: usableImages
      .slice(1, 4)
      .map((blobPath, index) =>
        buildLocalPreviewAsset(blobPath, `${snapshot.dataset} preview ${index + 1}`, index + 1),
      ),
    preview_video: null,
  };
}

function getLivePreviewSectionId(routeKey: CategoryKey, item: CategoryDatasetPreview) {
  const normalizedPath = normalizePathSearchValue(item.full_path);

  switch (routeKey) {
    case "serverrack":
      if (normalizedPath.includes("ethernetcable") || normalizedPath.includes("adpluggingcable")) {
        return "cable";
      }
      if (normalizedPath.includes("switchtray") || normalizedPath.includes("datarackinstall")) {
        return "hardware";
      }
      return "server";
    case "warehouse":
      return "pick";
    case "dexterity":
      if (normalizedPath.includes("dishwasherunloading") || normalizedPath.includes("peelingpeas")) {
        return "kitchen";
      }
      if (normalizedPath.includes("washingmachine")) {
        return "household";
      }
      return "cleaning";
    case "carAutomation":
      if (normalizedPath.includes("passengerseat")) return "inspection";
      if (normalizedPath.includes("frontgrille") || normalizedPath.includes("frontseat") || normalizedPath.includes("rearbumber") || normalizedPath.includes("rearbumper")) {
        return "assembly";
      }
      return "cars";
    default:
      return null;
  }
}

function CuratedCatalogCard({
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
  const [previewVideoActive, setPreviewVideoActive] = useState(false);
  const badge = getCategoryBadge(card);
  const previewItem = liveItem ?? placeholderItem ?? null;
  const badgeClasses =
    previewItem || card.availability === "In Library"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-amber-200 bg-amber-50 text-amber-700";
  const footerLabel = previewItem ? previewItem.full_path : card.pathLabel;
  const footerMetric = previewItem ? "Live dataset" : card.hours;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex h-full flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white text-left shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_24px_56px_rgba(15,23,42,0.12)] ${
        columns === 2 ? "xl:flex-row" : ""
      }`}
    >
      <div className={`p-4 ${columns === 2 ? "xl:w-[54%] xl:p-5" : ""}`}>
        <div className="grid grid-cols-[minmax(0,1fr)_86px] grid-rows-[176px_84px] gap-1.5">
          <div className="row-span-2 overflow-hidden rounded-[12px] bg-slate-100">
            {previewItem ? (
              <DatasetPreviewPrimaryMedia
                imageAsset={previewItem.main_image}
                videoAsset={liveItem?.preview_video}
                alt={card.title}
                isVideoActive={previewVideoActive}
                onVideoEnter={() => liveItem?.preview_video && setPreviewVideoActive(true)}
                onVideoLeave={() => liveItem?.preview_video && setPreviewVideoActive(false)}
              />
            ) : (
              <img
                src={frontPageImageUrl(card.images.main) ?? undefined}
                alt={card.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              />
            )}
          </div>
          <div className="row-span-2 grid grid-rows-3 gap-1.5">
            {previewItem
              ? (previewItem.thumbnails.length > 0
                  ? previewItem.thumbnails.slice(0, 3)
                  : [null, null, null]
                ).map((thumbnail, index) => (
                  <DatasetPreviewImage
                    key={`${card.title}-${thumbnail?.asset_id ?? "thumb"}-${index}`}
                    asset={thumbnail}
                    alt={`${card.title} preview ${index + 1}`}
                    className="rounded-[8px]"
                  />
                ))
              : card.images.thumbs.slice(0, 3).map((thumbPath, index) => (
                  <div
                    key={`${card.title}-${thumbPath}-${index}`}
                    className="overflow-hidden rounded-[8px] bg-slate-100"
                  >
                    <img
                      src={frontPageImageUrl(thumbPath) ?? undefined}
                      alt={`${card.title} preview ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
                    />
                  </div>
                ))}
          </div>
        </div>
      </div>

      <div className={`flex flex-1 flex-col ${columns === 2 ? "xl:w-[46%]" : ""}`}>
        <div className="flex items-start justify-between gap-3 px-4 pt-4 md:px-5">
          <h3 className="text-[14px] font-bold leading-6 text-slate-950 md:text-[15px]">
            {card.title}
          </h3>
          <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${badgeClasses}`}>
            {previewItem ? "In Library" : card.availability}
          </span>
        </div>

        <div className="mt-3 px-4 md:px-5">
          <p className="text-[11px] leading-6 text-slate-500 md:text-[12px]">
            {card.description}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 px-4 md:px-5">
          <span className={`inline-flex rounded-[6px] border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${badge.className}`}>
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

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-4 md:px-5">
          <div>
            <div className="text-[13px] font-extrabold tracking-[-0.02em] text-primary">
              {footerMetric}
            </div>
            <div className="mt-1 font-mono-tech text-[10px] text-slate-400">{footerLabel}</div>
          </div>
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
            {buttonLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </button>
  );
}

function CategorySidebarSection({
  title,
  items,
  activeItemId,
  onSelect,
}: {
  title: string;
  items: { id: string; label: string; dotClassName: string; badge?: string }[];
  activeItemId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-5">
      <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => {
          const isActive = item.id === activeItemId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                isActive
                  ? "border-primary/20 bg-primary/6 text-primary"
                  : "border-transparent text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${item.dotClassName}`} />
              <span className="flex-1 text-[13px] font-semibold">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompactPathSearch({
  value,
  loading,
  suggestions,
  placeholder,
  submitDisabled,
  className,
  onFocus,
  onChange,
  onSubmit,
  onSuggestionClick,
  renderHighlightedPath,
}: {
  value: string;
  loading: boolean;
  suggestions: FolderItem[];
  placeholder: string;
  submitDisabled: boolean;
  className?: string;
  onFocus: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestionClick: (fullPath: string) => void;
  renderHighlightedPath: (fullPath: string) => ReactNode;
}) {
  return (
    <div className={`relative w-full ${className ?? "max-w-xl"}`}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={value}
            onFocus={onFocus}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-10 font-sans-tech text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.06)] placeholder:text-slate-400 focus:border-primary/30 focus:outline-none"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
          )}
        </div>
        <button
          type="submit"
          disabled={submitDisabled}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-5 font-sans-tech text-sm font-bold text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Search
        </button>
      </form>

      {value.trim() !== "" && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 overflow-hidden rounded-[20px] border border-slate-200 bg-white/95 text-left shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-sm dark:bg-card/95 dark:shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
          {suggestions.length > 0 ? (
            <div className="divide-y divide-border">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.full_path}
                  type="button"
                  onClick={() => onSuggestionClick(suggestion.full_path)}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-primary/8"
                >
                  {renderHighlightedPath(suggestion.full_path)}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 font-sans-tech text-sm text-muted-foreground">
              {loading ? "Loading paths..." : "No matching paths found"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DatasetPreviewImage({
  asset,
  alt,
  className,
}: {
  asset: CategoryPreviewAsset | null | undefined;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : resolvePreviewMediaUrl(asset);

  return (
    <div
      className={`relative overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100 ${className ?? ""}`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full min-h-[120px] items-center justify-center bg-slate-100">
          <Database className="h-8 w-8 text-primary/55" />
        </div>
      )}

    </div>
  );
}

function resolvePreviewMediaUrl(asset: CategoryPreviewAsset | null | undefined): string | null {
  if (!asset) return null;
  const localUrl = folderPreviewMediaUrl(asset.blob_path);
  if (localUrl) return localUrl;
  return asset.proxy_url || null;
}

function DatasetPreviewPrimaryMedia({
  imageAsset,
  videoAsset,
  alt,
  isVideoActive,
  onVideoEnter,
  onVideoLeave,
}: {
  imageAsset: CategoryPreviewAsset | null | undefined;
  videoAsset: CategoryPreviewAsset | null | undefined;
  alt: string;
  isVideoActive: boolean;
  onVideoEnter: () => void;
  onVideoLeave: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageSrc = imageFailed ? null : resolvePreviewMediaUrl(imageAsset);
  const videoSrc = videoFailed ? null : resolvePreviewMediaUrl(videoAsset);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    if (isVideoActive) {
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Ignore autoplay timing issues and keep the poster visible underneath.
        });
      }
      return;
    }

    video.pause();
    if (video.currentTime !== 0) {
      video.currentTime = 0;
    }
  }, [isVideoActive, videoSrc]);

  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) {
        video.pause();
      }
    };
  }, []);

  return (
    <div
      className="relative aspect-[1.08/1] overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100"
      onMouseEnter={videoSrc ? onVideoEnter : undefined}
      onMouseLeave={videoSrc ? onVideoLeave : undefined}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="flex h-full min-h-[160px] items-center justify-center bg-slate-100">
          <Database className="h-8 w-8 text-primary/55" />
        </div>
      )}

      {videoSrc ? (
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
            isVideoActive ? "opacity-100" : "opacity-0"
          }`}
          onError={() => setVideoFailed(true)}
        />
      ) : null}
    </div>
  );
}

export default function DataViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading: authLoading, isAuthenticated, isApproved, user } = useAuth();
  const viewerBasePath = useMemo(
    () => (location.pathname.startsWith("/robodatahub") ? "/robodatahub" : "/viewer"),
    [location.pathname],
  );

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [categoryPreviews, setCategoryPreviews] = useState<CategoryDatasetPreview[]>([]);
  const [loadedCategoryPreviewKey, setLoadedCategoryPreviewKey] = useState<CategoryKey | null>(null);
  const [categoryPreviewsLoading, setCategoryPreviewsLoading] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [folderDropdownOpen, setFolderDropdownOpen] = useState<string | null>(null);
  const [deleteModalFolder, setDeleteModalFolder] = useState<FolderItem | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [vlmPromptGroups, setVlmPromptGroups] = useState<VlmPromptGroup[]>([]);
  const [visibleTags, setVisibleTags] = useState<Set<string>>(new Set());
  const [visiblePrimitives, setVisiblePrimitives] = useState<Set<string>>(new Set());
  const [frameRange, setFrameRange] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  });
  const [pathSearchText, setPathSearchText] = useState("");
  const [allFolderPaths, setAllFolderPaths] = useState<FolderItem[]>([]);
  const [pathSearchLoading, setPathSearchLoading] = useState(false);
  const [pathSearchLoaded, setPathSearchLoaded] = useState(false);
  const [pathSearchTouched, setPathSearchTouched] = useState(false);
  const [rootLayoutMode, setRootLayoutMode] = useState<2 | 4>(4);
  const [reloadTick, setReloadTick] = useState(0);

  const pathSegments = useMemo(
    () => location.pathname.split("/").filter((part) => part && part !== "viewer" && part !== "robodatahub"),
    [location.pathname],
  );
  const currentDisplayPath = useMemo(() => pathSegments.join("/"), [pathSegments]);
  const imageQueryParam = useMemo(
    () => new URLSearchParams(location.search).get("image")?.trim() ?? "",
    [location.search],
  );
  const activeCategory = useMemo(
    () =>
      pathSegments[0] && pathSegments[0] !== "my" && pathSegments[0] !== "admin"
        ? getCategoryByRouteKey(pathSegments[0])
        : null,
    [pathSegments],
  );
  const activeLandingContent = useMemo<CategoryLandingContent | null>(
    () => (activeCategory ? CATEGORY_LANDING_CONTENT[activeCategory.routeKey] : null),
    [activeCategory],
  );
  const localCategoryPreviewPlaceholders = useMemo(() => {
    if (!activeCategory) return [];

    return getLocalFolderPreviewSnapshots()
      .filter(
        (snapshot) =>
          normalizeCategoryValue(snapshot.category) ===
          normalizeCategoryValue(activeCategory.previewKey),
      )
      .map((snapshot) => buildLocalPlaceholderPreview(snapshot, viewerBasePath))
      .filter((item): item is CategoryDatasetPreview => Boolean(item));
  }, [activeCategory, viewerBasePath]);
  const activeCategoryPreviews = useMemo(() => {
    if (!activeCategory || loadedCategoryPreviewKey !== activeCategory.routeKey) return [];
    return categoryPreviews;
  }, [activeCategory, categoryPreviews, loadedCategoryPreviewKey]);
  const resolvedCategorySections = useMemo(() => {
    if (!activeCategory || !activeLandingContent) return [];

    const usedLivePaths = new Set<string>();
    const usedPlaceholderPaths = new Set<string>();
    const matchedBySection = new Map<
      string,
      {
        card: CatalogCard;
        liveItem: CategoryDatasetPreview | null;
        placeholderItem: CategoryDatasetPreview | null;
      }[]
    >();

    activeLandingContent.sections.forEach((section) => {
      const sectionEntries: {
        card: CatalogCard;
        liveItem: CategoryDatasetPreview | null;
        placeholderItem: CategoryDatasetPreview | null;
      }[] = [];

      section.cards.forEach((card) => {
        const placeholderItem =
          localCategoryPreviewPlaceholders.find((item) => {
            const normalizedPath = normalizePathSearchValue(item.full_path);
            return !usedPlaceholderPaths.has(normalizedPath) && matchesLivePreviewHint(card, item);
          }) ?? null;

        if (placeholderItem) {
          usedPlaceholderPaths.add(normalizePathSearchValue(placeholderItem.full_path));
        }

        const matchedItem =
          (placeholderItem
            ? activeCategoryPreviews.find((item) => {
                const normalizedPath = normalizePathSearchValue(item.full_path);
                return (
                  !usedLivePaths.has(normalizedPath) &&
                  normalizedPath === normalizePathSearchValue(placeholderItem.full_path)
                );
              })
            : null) ??
          activeCategoryPreviews.find(
            (item) => {
              const normalizedPath = normalizePathSearchValue(item.full_path);
              return !usedLivePaths.has(normalizedPath) && matchesLivePreviewHint(card, item);
            },
          ) ?? null;

        if (matchedItem) {
          usedLivePaths.add(normalizePathSearchValue(matchedItem.full_path));
        }

        sectionEntries.push({ card, liveItem: matchedItem, placeholderItem });
      });

      matchedBySection.set(section.id, sectionEntries);
    });

    const unmatchedLiveItems = activeCategoryPreviews.filter(
      (item) => !usedLivePaths.has(normalizePathSearchValue(item.full_path)),
    );
    const groupedExtras = new Map<string, CategoryDatasetPreview[]>();

    unmatchedLiveItems.forEach((item) => {
      const sectionId = getLivePreviewSectionId(activeCategory.routeKey, item);
      if (!sectionId) return;
      const current = groupedExtras.get(sectionId) ?? [];
      current.push(item);
      groupedExtras.set(sectionId, current);
    });

    return activeLandingContent.sections.map((section) => {
      const resolvedCards = matchedBySection.get(section.id) ?? [];
      const liveBackedCards = resolvedCards.filter(
        (entry) => entry.card.livePathHints?.length || entry.liveItem || entry.placeholderItem,
      );
      const marketingCards = resolvedCards.filter((entry) => !entry.card.livePathHints?.length);
      const extraLiveCards = (groupedExtras.get(section.id) ?? [])
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((item) => ({
          card: buildFallbackLiveCard(item),
          liveItem: item,
          placeholderItem: item,
        }));

      return {
        ...section,
        cards: [...liveBackedCards, ...extraLiveCards, ...marketingCards],
      };
    });
  }, [activeCategory, activeLandingContent, activeCategoryPreviews, localCategoryPreviewPlaceholders]);
  const pathSearchScopeKey = activeCategory?.routeKey ?? "global";

  const isRootLanding = pathSegments.length === 0;
  const isCategoryLanding = Boolean(activeCategory) && pathSegments.length === 1;
  const isCatalogLanding = isRootLanding || isCategoryLanding;

  useEffect(() => {
    if (!isAuthenticated || !isApproved || isRootLanding || isCategoryLanding) {
      setFolders([]);
      setImages([]);
      setAvailableTags([]);
      setVlmPromptGroups([]);
      return;
    }

    let cancelled = false;

    async function loadCurrentPath() {
      setLoading(true);
      setFolderDropdownOpen(null);

      try {
        const folderResponse = await axios.get<unknown[]>("/api/datasets", {
          params: { path: currentDisplayPath },
        });
        const nextFolders = uniqueFolderItems(
          normalizeFolderResults(folderResponse.data).sort((a, b) => a.name.localeCompare(b.name)),
        );

        if (cancelled) return;
        setFolders(nextFolders);

        if (nextFolders.length > 0) {
          setImages([]);
          setAvailableTags([]);
          setVlmPromptGroups([]);
          return;
        }

        const encodedPath = currentDisplayPath
          .split("/")
          .filter(Boolean)
          .map((segment) => encodeURIComponent(segment))
          .join("/");

        const imageResponse = await axios.get<ImageItem[]>(`/api/dataset/${encodedPath}`);
        if (cancelled) return;

        const nextImages = Array.isArray(imageResponse.data) ? imageResponse.data : [];
        setImages(nextImages);

        const allTags = Array.from(
          new Set(nextImages.flatMap((image) => image.tags ?? []).filter(Boolean)),
        );
        const grouped = groupVlmPromptTags(allTags);
        setAvailableTags(grouped.regularTags);
        setVlmPromptGroups(grouped.promptGroups);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load viewer data", error);
          setFolders([]);
          setImages([]);
          setAvailableTags([]);
          setVlmPromptGroups([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCurrentPath();
    return () => {
      cancelled = true;
    };
  }, [currentDisplayPath, isAuthenticated, isApproved, isRootLanding, isCategoryLanding, reloadTick]);

  useEffect(() => {
    if (!isCategoryLanding || !activeCategory) {
      setCategoryPreviews([]);
      setLoadedCategoryPreviewKey(null);
      setCategoryPreviewsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCategoryPreviews() {
      setLoadedCategoryPreviewKey(null);
      setCategoryPreviewsLoading(true);
      try {
        const response = await axios.get<CategoryDatasetPreview[]>("/api/dataset-category-previews", {
          params: { category: activeCategory.routeKey, public_only: "true" },
        });
        if (cancelled) return;
        setCategoryPreviews(Array.isArray(response.data) ? response.data : []);
        setLoadedCategoryPreviewKey(activeCategory.routeKey);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load category dataset previews", error);
          setCategoryPreviews([]);
          setLoadedCategoryPreviewKey(null);
        }
      } finally {
        if (!cancelled) {
          setCategoryPreviewsLoading(false);
        }
      }
    }

    void loadCategoryPreviews();

    return () => {
      cancelled = true;
    };
  }, [activeCategory, isCategoryLanding, reloadTick]);

  useEffect(() => {
    const shouldLoadPaths = isRootLanding || isCategoryLanding || pathSearchTouched;
    if (!shouldLoadPaths || pathSearchLoaded) return;

    let cancelled = false;

    async function loadAllPaths() {
      setPathSearchLoading(true);
      try {
        const params = activeCategory
          ? {
              category: activeCategory.routeKey,
              public_only: "true",
            }
          : undefined;
        const response = await axios.get<unknown[]>("/api/dataset-paths", {
          params,
        });
        if (cancelled) return;

        const nextPaths = uniqueFolderItems(
          normalizeFolderResults(response.data).sort((a, b) => a.full_path.localeCompare(b.full_path)),
        );

        setAllFolderPaths(nextPaths);
        setPathSearchLoaded(true);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load dataset paths", error);
          setAllFolderPaths([]);
        }
      } finally {
        if (!cancelled) {
          setPathSearchLoading(false);
        }
      }
    }

    void loadAllPaths();

    return () => {
      cancelled = true;
    };
  }, [isRootLanding, isCategoryLanding, activeCategory, pathSearchTouched, pathSearchLoaded]);

  useEffect(() => {
    setAllFolderPaths([]);
    setPathSearchLoaded(false);
  }, [reloadTick, pathSearchScopeKey]);

  useEffect(() => {
    if (!imageQueryParam || images.length === 0) return;

    const decoded = decodeURIComponent(imageQueryParam);
    const match = images.find((image) => image.name === decoded || image.id.endsWith(decoded));
    if (match) {
      setSelectedImage(match);
    }
  }, [imageQueryParam, images]);

  const isLeaf = useMemo(
    () => isAuthenticated && isApproved && !isRootLanding && !isCategoryLanding && folders.length === 0,
    [folders.length, isAuthenticated, isApproved, isRootLanding, isCategoryLanding],
  );
  const datasetRootDepth = useMemo(() => {
    if (pathSegments[0] === "my") return 4;
    if (pathSegments[0] === "admin") return 5;
    return 3;
  }, [pathSegments]);
  const isMaskPath = useMemo(
    () => pathSegments.slice(datasetRootDepth).some((segment) => segment.toLowerCase() === "masks"),
    [datasetRootDepth, pathSegments],
  );
  const sourceImages = useMemo(
    () => images.filter((image) => image.type === "image"),
    [images],
  );
  const maskSourceImageCount = sourceImages.length;
  const isEgoPath = useMemo(
    () => pathSegments.slice(datasetRootDepth).some((segment) => segment.toLowerCase() === "egos"),
    [datasetRootDepth, pathSegments],
  );
  const isOrigPath = useMemo(
    () => pathSegments.slice(datasetRootDepth).some((segment) => segment.toLowerCase() === "orig"),
    [datasetRootDepth, pathSegments],
  );
  const showEgocentricGeneration = useMemo(() => {
    if (!isLeaf || !isOrigPath || sourceImages.length === 0) return false;
    return sourceImages.every((image) => {
      const view = String(image.metadata?.view ?? "").trim().toLowerCase();
      return view === "exo";
    });
  }, [isLeaf, isOrigPath, sourceImages]);
  const showHandMotionGeneration = useMemo(() => {
    if (!isLeaf || !isEgoPath || sourceImages.length === 0) return false;
    return sourceImages.every((image) => {
      const view = String(image.metadata?.view ?? "").trim().toLowerCase();
      return view === "ego" || view === "egos";
    });
  }, [isEgoPath, isLeaf, sourceImages]);
  const showMaskPanel = isLeaf && !isMaskPath && maskSourceImageCount > 0;

  const allSelectableTags = useMemo(
    () =>
      [...availableTags, ...vlmPromptGroups.flatMap((group) => group.tags)].sort((a, b) =>
        a.localeCompare(b),
      ),
    [availableTags, vlmPromptGroups],
  );

  const matchingTagSuggestions = useMemo(() => {
    const searchValue = filterText.trim().toLowerCase();
    if (!searchValue) return [];

    return allSelectableTags
      .filter((tag) => !visibleTags.has(tag))
      .filter((tag) => tag.toLowerCase().includes(searchValue))
      .slice(0, 8);
  }, [allSelectableTags, filterText, visibleTags]);

  const filteredImages = useMemo(() => {
    const searchValue = filterText.trim().toLowerCase();

    return images.filter((image) => {
      const imageTags = image.tags ?? [];
      const frameId = parseFrameIdValue(image.metadata?.frame_id);

      const matchesSearch =
        !searchValue ||
        image.name.toLowerCase().includes(searchValue) ||
        imageTags.some((tag) => tag.toLowerCase().includes(searchValue));

      const matchesTags =
        visibleTags.size === 0 || Array.from(visibleTags).every((tag) => imageTags.includes(tag));

      const matchesMinFrame =
        frameRange.min == null || frameId == null || frameId >= frameRange.min;
      const matchesMaxFrame =
        frameRange.max == null || frameId == null || frameId <= frameRange.max;

      return matchesSearch && matchesTags && matchesMinFrame && matchesMaxFrame;
    });
  }, [filterText, frameRange.max, frameRange.min, images, visibleTags]);

  const filteredFolders = useMemo(() => folders, [folders]);

  const pathSuggestions = useMemo(() => {
    if (!pathSearchText.trim()) return [];

    const scopedPrefix = activeCategory ? activeCategory.routeKey : null;

    return allFolderPaths
      .filter((item) => {
        if (!scopedPrefix || isRootLanding) return true;
        return pathBelongsToCategory(item.full_path, scopedPrefix);
      })
      .map((item) => ({
        item,
        score: getSuggestionScore(item.full_path, pathSearchText),
      }))
      .filter((entry): entry is { item: FolderItem; score: number } => entry.score !== null)
      .sort((a, b) => a.score - b.score || a.item.full_path.localeCompare(b.item.full_path))
      .slice(0, 8)
      .map((entry) => entry.item);
  }, [activeCategory, allFolderPaths, isRootLanding, pathSearchText]);

  const itemCount = isCategoryLanding
    ? activeCategoryPreviews.length
    : isLeaf
      ? filteredImages.length
      : filteredFolders.length;

  function toggleTag(tag: string) {
    setVisibleTags((previous) => {
      const next = new Set(previous);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function togglePrimitive(primitive: string) {
    setVisiblePrimitives((previous) => {
      const next = new Set(previous);
      if (next.has(primitive)) next.delete(primitive);
      else next.add(primitive);
      return next;
    });
  }

  function handleSelectTagSuggestion(tag: string) {
    setVisibleTags((previous) => new Set(previous).add(tag));
  }

  function handlePathSuggestionClick(fullPath: string) {
    setPathSearchText("");
    const nextPath = buildViewerPath(fullPath, undefined, viewerBasePath);
    if (!isAuthenticated || !isApproved) {
      navigate(buildAuthPath("login", nextPath));
      return;
    }
    navigate(nextPath);
  }

  function handlePathSearchSubmit() {
    if (pathSuggestions.length === 0) return;
    handlePathSuggestionClick(pathSuggestions[0].full_path);
  }

  function handleCategoryPreviewClick(item: CategoryDatasetPreview) {
    const nextPath = item.viewer_path
      ? withViewerBase(item.viewer_path, viewerBasePath)
      : buildViewerPath(item.full_path, undefined, viewerBasePath);

    if (!isAuthenticated || !isApproved) {
      navigate(buildAuthPath("login", nextPath));
      return;
    }

    navigate(nextPath);
  }

  function handleCuratedCardOpen(pathLabel: string, category?: CategoryConfig | null) {
    const normalizedTarget = normalizePathSearchValue(pathLabel);
    const match = allFolderPaths.find((item) => {
      const normalizedPath = normalizePathSearchValue(item.full_path);
      return normalizedPath === normalizedTarget || normalizedPath.includes(normalizedTarget);
    });

    if (match) {
      handlePathSuggestionClick(match.full_path);
      return;
    }

    if (category) {
      navigate(buildCategoryLandingPath(category, viewerBasePath));
    }
  }

  async function handleDeleteFolder() {
    if (!deleteModalFolder) return;

    setDeleteInProgress(true);
    try {
      await axios.post("/api/delete_dataset", { path: deleteModalFolder.full_path });
      setDeleteModalFolder(null);
      setReloadTick((value) => value + 1);
    } catch (error) {
      console.error("Failed to delete dataset", error);
      alert("Failed to delete dataset path.");
    } finally {
      setDeleteInProgress(false);
    }
  }

  function renderHighlightedPath(fullPath: string): ReactNode {
    const terms = getPathSearchTerms(pathSearchText);
    const segments = fullPath.split("/").filter(Boolean);
    const bestIndex = getBestMatchingSegmentIndex(fullPath, pathSearchText);

    return (
      <div className="font-sans-tech text-sm text-foreground">
        {segments.map((segment, index) => {
          const normalizedSegment = segment.toLowerCase();
          const isMatched = terms.some((term) => normalizedSegment.includes(term));
          const isClosest = bestIndex === index;

          const className = isClosest
            ? "rounded-sm bg-primary/15 px-1 text-primary underline decoration-primary underline-offset-4"
            : isMatched
              ? "text-primary/90"
              : "";

          return (
            <span key={`${segment}-${index}`}>
              <span className={className}>{segment}</span>
              {index < segments.length - 1 && <span className="px-1 text-muted-foreground">/</span>}
            </span>
          );
        })}
      </div>
    );
  }

  function renderFolderGrid(items: FolderItem[], maxWidthClassName: string) {
    return (
      <div
        className={`mx-auto grid w-full grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 ${maxWidthClassName}`}
      >
        {items.map((folder) => {
          const isDataset = isDatasetRoutePath(folder.full_path);

          return (
            <div
              key={folder.full_path}
              className="group relative cursor-pointer overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_28px_70px_rgba(15,23,42,0.12)]"
              onClick={() =>
                navigate(
                  folder.viewer_path
                    ? withViewerBase(folder.viewer_path, viewerBasePath)
                    : buildViewerPath(folder.full_path, undefined, viewerBasePath),
                )
              }
            >
              {isDataset && (
                <div className="absolute right-4 top-4 z-20">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFolderDropdownOpen((previous) =>
                        previous === folder.full_path ? null : folder.full_path,
                      );
                    }}
                    className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                    aria-label="Folder options"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>

                  {folderDropdownOpen === folder.full_path && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setFolderDropdownOpen(null)}
                        aria-hidden
                      />
                      <div className="absolute right-0 z-20 mt-1 w-40 rounded-2xl border border-slate-200 bg-white py-1 shadow-[0_20px_40px_rgba(15,23,42,0.12)]">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteModalFolder(folder);
                            setFolderDropdownOpen(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left font-sans-tech text-sm text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="h-44 w-full overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50 transition-all group-hover:border-primary/25 group-hover:shadow-[0_0_18px_rgba(13,148,136,0.08)]">
                  <DatasetFolderCover
                    key={folder.full_path}
                    fullPath={folder.source_path ?? folder.full_path}
                    FallbackIcon={Folder}
                    className="flex h-full w-full items-center justify-center"
                    imgClassName="h-full w-full object-cover"
                    iconClassName="h-16 w-16 text-muted-foreground transition-colors group-hover:text-primary"
                  />
                </div>
                <div className="w-full text-center">
                  <span className="block break-words font-sans-tech text-lg font-bold uppercase tracking-[0.12em] text-slate-950 transition-colors group-hover:text-primary">
                    {folder.name}
                  </span>
                  {folder.visibility && (
                    <span
                      className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] uppercase tracking-wide ${
                        folder.visibility === "public"
                          ? "bg-primary/10 text-primary"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {folder.visibility}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {items.length === 0 && !loading && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 py-20 text-slate-500">
            <AlertCircle className="mb-4 h-12 w-12 text-slate-400" />
            <p className="font-sans-tech text-lg">No data found</p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-6 font-sans-tech text-sm font-medium text-primary underline decoration-dotted underline-offset-4 hover:text-primary-glow"
            >
              Upload Data
            </button>
          </div>
        )}
      </div>
    );
  }

  const renderRootLanding = () => (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 md:py-14">
      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.1)]">
        <div className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="flex flex-col border-b border-slate-200 bg-slate-50/90 p-5 lg:border-b-0 lg:border-r lg:p-6">
            <div className="border-b border-slate-200 pb-5">
              <div className="text-lg font-extrabold tracking-[0.04em] text-primary">DataraAI</div>
              <div className="mt-1 text-base font-bold text-slate-950">Physical AI Data</div>
            </div>

            <div className="pt-4">
              <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Verticals
              </div>
              <div className="space-y-1.5">
                {ROOT_SHOWCASE_SECTIONS.map((section) => {
                  const category = CATEGORIES.find((item) => item.routeKey === section.routeKey);
                  if (!category) return null;

                  return (
                    <button
                      key={section.routeKey}
                      type="button"
                      onClick={() => navigate(buildCategoryLandingPath(category, viewerBasePath))}
                      className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${getCategoryAccent(category.routeKey).dot}`} />
                      <span className="text-[14px] font-extrabold text-slate-950">{section.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              {isAuthenticated && isApproved ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => navigate(`${viewerBasePath}/my`)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    My private data
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Import data
                  </button>
                </div>
              ) : (
                <Link
                  to={buildAuthPath("register", viewerBasePath)}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Get Access
                </Link>
              )}
            </div>
          </aside>

          <div className="min-w-0 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-slate-950">
                  RoboDataHub
                </h1>
                <p className="mt-1 text-[13px] text-slate-500">
                  100+ datasets · Physical AI training data
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <CompactPathSearch
                  value={pathSearchText}
                  loading={pathSearchLoading}
                  suggestions={pathSuggestions}
                  placeholder="Search datasets..."
                  submitDisabled={pathSuggestions.length === 0}
                  className="max-w-[760px]"
                  onFocus={() => setPathSearchTouched(true)}
                  onChange={(value) => {
                    setPathSearchTouched(true);
                    setPathSearchText(value);
                  }}
                  onSubmit={handlePathSearchSubmit}
                  onSuggestionClick={handlePathSuggestionClick}
                  renderHighlightedPath={renderHighlightedPath}
                />

                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setRootLayoutMode(4)}
                    className={`rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${
                      rootLayoutMode === 4 ? "bg-primary text-primary-foreground" : "text-slate-500"
                    }`}
                  >
                    4
                  </button>
                  <button
                    type="button"
                    onClick={() => setRootLayoutMode(2)}
                    className={`rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${
                      rootLayoutMode === 2 ? "bg-primary text-primary-foreground" : "text-slate-500"
                    }`}
                  >
                    2
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-9">
              {ROOT_SHOWCASE_SECTIONS.map((section) => {
                const category = CATEGORIES.find((item) => item.routeKey === section.routeKey);
                if (!category) return null;

                return (
                  <section key={section.routeKey}>
                    <div className="mb-4 flex items-center gap-3">
                      <span className={`h-3 w-3 shrink-0 rounded-[3px] ${section.dotClassName}`} />
                      <span className="text-[16px] font-extrabold text-slate-950">{section.title}</span>
                      <div className={`h-px flex-1 bg-gradient-to-r ${section.lineClassName} to-transparent`} />
                    </div>

                    <div
                      className={`grid gap-4 ${
                        rootLayoutMode === 2 ? "xl:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"
                      }`}
                    >
                      {section.cards.map((card) => (
                        <CuratedCatalogCard
                          key={`${section.routeKey}-${card.title}`}
                          card={card}
                          columns={rootLayoutMode === 2 ? 2 : 3}
                          buttonLabel="Open vertical"
                          onOpen={() => navigate(buildCategoryLandingPath(category, viewerBasePath))}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}

              <section className="rounded-[20px] border border-primary/15 bg-[linear-gradient(135deg,rgba(13,148,136,0.05),rgba(29,78,216,0.03))] p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-3xl">
                    <h2 className="text-2xl font-black tracking-[-0.03em] text-slate-950">
                      Request a Custom Dataset
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Don&apos;t see what you need? Our team captures any task, environment, or
                      robot workflow on demand.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {CATEGORIES.map((category) => (
                      <span
                        key={`${category.routeKey}-pill`}
                        className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getCategoryAccent(category.routeKey).chip}`}
                      >
                        {category.label}
                      </span>
                    ))}
                    <Link
                      to={buildAuthPath("register", viewerBasePath)}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Submit Request
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCategoryLanding = (category: CategoryConfig) => {
    const landing = activeLandingContent;
    if (!landing) return null;

    const heroStats = landing.stats.slice(0, 4);

    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 md:py-14">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.1)]">
          <section className="relative overflow-hidden border-b border-slate-200">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(13,148,136,0.06),transparent_52%),radial-gradient(ellipse_at_bottom_left,rgba(15,23,42,0.03),transparent_46%)]" />
            <div className="relative grid gap-10 p-6 md:p-8 lg:grid-cols-2 lg:items-center">
              <div>
                <div className={`mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${getCategoryAccent(category.routeKey).chip}`}>
                  <span className={`h-2 w-2 rounded-full ${getCategoryAccent(category.routeKey).dot}`} />
                  {landing.heroEyebrow}
                </div>
                <h1 className="text-[clamp(2.4rem,4.8vw,4.5rem)] font-black tracking-[-0.06em] text-slate-950">
                  {landing.heroTitle}
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-8 text-slate-600 md:text-base">
                  {landing.heroDescription}
                </p>

                <div className="mt-8 grid gap-px overflow-hidden rounded-[14px] border border-slate-300 bg-slate-200 sm:grid-cols-4">
                  {heroStats.map((stat) => (
                    <div key={`${landing.routeKey}-${stat.label}`} className="bg-slate-50 px-4 py-4">
                      <div className="text-[22px] font-extrabold tracking-[-0.03em] text-slate-950">
                        {stat.value}
                      </div>
                      <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[20px] border border-slate-300 shadow-[0_28px_64px_rgba(15,23,42,0.12)]">
                <img
                  src={frontPageImageUrl(landing.heroImagePath) ?? undefined}
                  alt={`${landing.heroTitle} hero`}
                  className="h-[390px] w-full object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.15),transparent_45%,rgba(15,23,42,0.06))]" />
                <div className="absolute bottom-5 left-5 rounded-[12px] border border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-sm">
                  <div className="text-[8px] font-black uppercase tracking-[0.18em] text-primary">
                    {landing.heroBadge}
                  </div>
                  <div className="mt-1 text-[13px] font-bold text-slate-950">{landing.heroTitle}</div>
                </div>
                <div className="absolute right-4 top-4 rounded-[8px] border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-500 backdrop-blur-sm">
                  <strong className="text-primary">{landing.heroPill}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 md:px-8">
            <div className="grid gap-px overflow-hidden rounded-[16px] border border-slate-300 bg-slate-200 md:grid-cols-5">
              {landing.stats.map((stat) => (
                <div key={`${landing.routeKey}-band-${stat.label}`} className="bg-slate-50 px-5 py-4">
                  <div className="text-[26px] font-black tracking-[-0.04em] text-slate-950">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="flex flex-col border-b border-slate-200 bg-slate-50/90 p-5 lg:border-b-0 lg:border-r lg:p-6">
              <CategorySidebarSection
                title="Verticals"
                items={CATEGORIES.map((item) => ({
                  id: item.routeKey,
                  label: item.label,
                  dotClassName: getCategoryAccent(item.routeKey).dot,
                }))}
                activeItemId={category.routeKey}
                onSelect={(routeKey) => {
                  const nextCategory = CATEGORIES.find((item) => item.routeKey === routeKey);
                  if (nextCategory) {
                    navigate(buildCategoryLandingPath(nextCategory, viewerBasePath));
                  }
                }}
              />

              <CategorySidebarSection
                title="Filters"
                items={landing.filters}
                activeItemId={landing.filters[0]?.id}
                onSelect={() => undefined}
              />

              <div className="mt-5 border-t border-slate-200 pt-4">
                {!isAuthenticated || !isApproved ? (
                  <Link
                    to={buildAuthPath("register", viewerBasePath)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Get Access
                  </Link>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => navigate(`${viewerBasePath}/my`)}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      My private data
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(true)}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Import data
                    </button>
                    {user?.role === "admin" ? (
                      <button
                        type="button"
                        onClick={() => navigate(`${viewerBasePath}/admin/${user.storageSlug}`)}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/8 px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/12"
                      >
                        Admin access
                        <Shield className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </aside>

            <div className="min-w-0 p-6 md:p-8">
              <div className="space-y-9">
                <section className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="max-w-2xl">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Search library
                      </div>
                      <h2 className="mt-2 text-[18px] font-extrabold tracking-[-0.03em] text-slate-950">
                        Search real {category.label.toLowerCase()} datasets
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Search by dataset, task, or brand and jump straight into the live folder structure.
                      </p>
                    </div>
                    <CompactPathSearch
                      value={pathSearchText}
                      loading={pathSearchLoading}
                      suggestions={pathSuggestions}
                      placeholder={`Search ${category.label.toLowerCase()} datasets...`}
                      submitDisabled={pathSuggestions.length === 0}
                      className="max-w-none xl:w-[640px]"
                      onFocus={() => setPathSearchTouched(true)}
                      onChange={(value) => {
                        setPathSearchTouched(true);
                        setPathSearchText(value);
                      }}
                      onSubmit={handlePathSearchSubmit}
                      onSuggestionClick={handlePathSuggestionClick}
                      renderHighlightedPath={renderHighlightedPath}
                    />
                  </div>
                </section>

                {resolvedCategorySections.map((section) => (
                  <section key={`${landing.routeKey}-${section.id}`}>
                    <div className="mb-4 flex items-center gap-3 border-l-[3px] border-primary pl-3">
                      <span className="text-[15px] font-extrabold text-slate-950">{section.title}</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                      <span className="text-[11px] font-semibold text-slate-400">{section.countLabel}</span>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-3">
                      {section.cards.map((entry) => (
                        <CuratedCatalogCard
                          key={`${section.id}-${entry.card.title}-${entry.liveItem?.full_path ?? entry.placeholderItem?.full_path ?? "marketing"}`}
                          card={entry.card}
                          liveItem={entry.liveItem}
                          placeholderItem={entry.placeholderItem}
                          buttonLabel="Open folder"
                          onOpen={() =>
                            entry.liveItem || entry.placeholderItem
                              ? handleCategoryPreviewClick(entry.liveItem ?? entry.placeholderItem!)
                              : handleCuratedCardOpen(entry.card.pathLabel, category)
                          }
                        />
                      ))}
                    </div>
                  </section>
                ))}

                <section className="rounded-[20px] border border-primary/15 bg-[linear-gradient(128deg,rgba(13,148,136,0.05),rgba(15,23,42,0.02)_55%,transparent)] p-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-3xl">
                      <h2 className="text-[28px] font-black tracking-[-0.04em] text-slate-950">
                        {landing.ctaTitle}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        {landing.ctaDescription}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={buildAuthPath("register", viewerBasePath)}
                        className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        Request access
                      </Link>
                      <button
                        type="button"
                        onClick={() => navigate(viewerBasePath)}
                        className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-primary/20 hover:text-primary"
                      >
                        Back to RoboDataHub
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background font-sans-tech text-foreground md:h-screen md:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.04]" />
      <Navigation />

      <div className="relative z-10 flex flex-1 flex-col pt-[88px] md:overflow-hidden">
        <div className="z-20 flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-background/90 px-4 py-2 backdrop-blur-md sm:flex-nowrap sm:py-0">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Link
                to={viewerBasePath}
                className="hidden font-sans-tech font-bold text-primary transition-colors hover:text-primary-glow md:block"
              >
                RoboDataHub
              </Link>
              <Breadcrumbs />
            </div>
          </div>
            <div className="ml-auto flex items-center gap-4 font-sans-tech text-[11px] font-medium text-slate-500 sm:ml-0 sm:gap-6 sm:text-xs">
              {isAuthenticated && isApproved ? (
                <span className="flex items-center gap-2 text-primary">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  Live Connection
                </span>
              ) : (
              <span className="flex items-center gap-2">
                <LockKeyhole className="h-3.5 w-3.5" />
                Signed out
              </span>
            )}
          </div>
        </div>

        {authLoading ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Loading account access...
          </div>
        ) : !isAuthenticated ? (
          isRootLanding ? (
            renderRootLanding()
          ) : isCategoryLanding && activeCategory ? (
            renderCategoryLanding(activeCategory)
          ) : (
            <div className="mx-auto flex-1 w-full max-w-[1440px] px-4 py-10 sm:px-6">
              <AuthRequiredState description="Sign in before viewing dataset contents. Public catalog pages stay visible, but deeper folder contents remain behind account approval." />
            </div>
          )
        ) : !isApproved ? (
          isRootLanding ? (
            renderRootLanding()
          ) : isCategoryLanding && activeCategory ? (
            renderCategoryLanding(activeCategory)
          ) : (
            <div className="mx-auto flex-1 w-full max-w-[1440px] px-4 py-10 sm:px-6">
              <AuthRequiredState />
            </div>
          )
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden xl:flex-row">
            {isLeaf && (
              <Sidebar
                availableTags={availableTags}
                visibleTags={visibleTags}
                onToggleTag={toggleTag}
                visiblePrimitives={visiblePrimitives}
                onTogglePrimitive={togglePrimitive}
                onFilterChange={(_key, value) => setFilterText(value)}
                onUploadClick={() => setIsUploadModalOpen(true)}
                frameRange={frameRange}
                onFrameRangeChange={(min, max) => setFrameRange({ min, max })}
                matchingTagSuggestions={matchingTagSuggestions}
                onSelectTagSuggestion={handleSelectTagSuggestion}
                vlmPromptGroups={vlmPromptGroups}
              />
            )}

            <div className="flex min-w-0 flex-1 flex-col bg-background/50">
              {!isCatalogLanding && (
                <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-2 sm:flex-nowrap sm:py-0">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center rounded-sm border border-slate-200 bg-white px-2 py-1 text-xs shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                      <span className="mr-2 font-sans-tech text-slate-500">Items:</span>
                      <span className="font-sans-tech text-slate-900">{itemCount}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200" />
                    <button
                      onClick={() => setReloadTick((value) => value + 1)}
                      className="flex items-center gap-1 font-sans-tech text-xs text-slate-500 transition-colors hover:text-slate-900"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${loading || categoryPreviewsLoading ? "animate-spin" : ""}`}
                      />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {!isLeaf && (
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="flex items-center gap-2 rounded-sm border border-primary/25 bg-primary/10 px-3 py-1 font-sans-tech text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                    >
                      <Terminal className="h-3 w-3" />
                      Import Data
                    </button>
                  )}
                </div>
              )}

              <div className="custom-scrollbar relative flex-1 overflow-y-auto bg-background/40 p-0">
                {loading && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="animate-pulse font-sans-tech text-xs text-primary">
                        Loading Assets...
                      </span>
                    </div>
                  </div>
                )}

                {isRootLanding && renderRootLanding()}
                {isCategoryLanding && activeCategory && renderCategoryLanding(activeCategory)}

                {!isRootLanding && !isCategoryLanding && !isLeaf && (
                  <div className="flex min-h-full flex-col">
                    <div className="p-4 sm:p-6 lg:p-8">
                      {currentDisplayPath && (
                        <div className="mx-auto mb-6 flex max-w-5xl items-center gap-2">
                          <div className="h-4 w-1 bg-primary" />
                          <h2 className="font-sans-tech text-lg font-bold uppercase tracking-widest text-slate-500">
                            Subdirectories
                          </h2>
                        </div>
                      )}
                      {renderFolderGrid(filteredFolders, "max-w-5xl")}
                    </div>
                  </div>
                )}

                {isLeaf && (
                  <ImageGrid
                    images={filteredImages}
                    onImageClick={setSelectedImage}
                    visibleTags={visibleTags}
                    visiblePrimitives={visiblePrimitives}
                  />
                )}
              </div>
            </div>

            {showMaskPanel && (
              <MaskGenerationPanel
                routePath={currentDisplayPath}
                imageCount={maskSourceImageCount}
                showEgocentricGeneration={showEgocentricGeneration}
                showHandMotionGeneration={showHandMotionGeneration}
                onGenerationSuccess={() => setReloadTick((value) => value + 1)}
                onOpenViewerPath={(viewerPath) => navigate(viewerPath)}
              />
            )}
          </div>
        )}

        {selectedImage && (
          <ImageModal
            image={selectedImage}
            onClose={() => setSelectedImage(null)}
            onNext={() => {
              const index = filteredImages.indexOf(selectedImage);
              if (index < filteredImages.length - 1) {
                setSelectedImage(filteredImages[index + 1]);
              }
            }}
            onPrev={() => {
              const index = filteredImages.indexOf(selectedImage);
              if (index > 0) {
                setSelectedImage(filteredImages[index - 1]);
              }
            }}
            onEgoGenSuccess={() => setReloadTick((value) => value + 1)}
            onCornerCaseSuccess={() => setReloadTick((value) => value + 1)}
            onVlmSuccess={() => setReloadTick((value) => value + 1)}
          />
        )}

        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => setReloadTick((value) => value + 1)}
        />

        {deleteModalFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div
              className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="mb-2 font-sans-tech text-lg font-bold text-foreground">
                Delete path and subdirectories?
              </h3>
              <p className="mb-1 font-sans-tech text-sm text-muted-foreground">
                You are about to delete{" "}
                <span className="font-medium text-foreground">{deleteModalFolder.full_path}</span>{" "}
                and all of its contents.
              </p>
              <p className="mb-6 font-sans-tech text-xs text-destructive/90">
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalFolder(null)}
                  className="rounded-sm border border-border px-4 py-2 font-sans-tech text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteFolder}
                  disabled={deleteInProgress}
                  className="flex items-center gap-2 rounded-sm bg-destructive px-4 py-2 font-sans-tech text-sm font-medium text-primary-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                >
                  {deleteInProgress && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
