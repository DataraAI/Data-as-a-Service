import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { frontPageImageUrl } from "@/lib/datasetFolderCover";

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
}

const CATEGORIES: CategoryConfig[] = [
  {
    routeKey: "carAutomation",
    previewKey: "carAutomation",
    label: "Automotive",
    description:
      "Assembly, inspection, and vehicle-production data for robotics workflows across automotive environments.",
  },
  {
    routeKey: "serverrack",
    previewKey: "serverrack",
    label: "Data Center",
    description:
      "Data-center interaction, port-level operation, and maintenance-focused datasets for rack and cabling tasks.",
  },
  {
    routeKey: "dexterity",
    previewKey: "humanoid",
    label: "Dexterity",
    description:
      "Fine-motor manipulation and embodied task data for dexterous robotic systems operating across practical, object-centric scenarios.",
  },
  {
    routeKey: "warehouse",
    previewKey: "warehouse",
    label: "Warehouse",
    description:
      "Logistics, handling, and storage-operation data for robotic movement, picking, and material flow.",
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
  return (
    CATEGORIES.find((category) => normalizeCategoryValue(category.routeKey) === normalizedValue) ??
    null
  );
}

function pathBelongsToCategory(fullPath: string, routeKey: CategoryKey) {
  const segments = fullPath.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  const categorySegment =
    segments[0] === "my" ? segments[1] : segments[0] === "admin" ? segments[2] : segments[0];
  return normalizeCategoryValue(categorySegment) === normalizeCategoryValue(routeKey);
}

function buildCategoryHeroImagePaths(category: CategoryConfig) {
  if (category.routeKey === "serverrack") {
    return [
      "serverrack/serverrack (1).png",
      "serverrack/serverrack1.png",
      "serverrack/serverrack2.png",
      "serverrack/serverrack3.png",
    ];
  }

  return [0, 1, 2, 3].map(
    (index) =>
      `${category.previewKey}/${category.previewKey}${index === 0 ? "" : index}.png`,
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

function ShowcasePreviewImage({
  blobPath,
  alt,
  onClick,
}: {
  blobPath: string;
  alt: string;
  onClick: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const src = frontPageImageUrl(blobPath);

  if (!src || failed) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group relative flex aspect-[5/4] w-full items-center justify-center overflow-hidden rounded-[20px] border border-slate-200 bg-slate-100 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_0_2px_rgba(13,148,136,0.12)]"
      >
        <Database className="h-9 w-9 text-primary/60" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent px-4 py-3 text-left">
          <span className="font-sans-tech text-[11px] uppercase tracking-[0.18em] text-primary">
            Open in viewer
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_0_2px_rgba(13,148,136,0.12)] focus:border-primary focus:outline-none focus:shadow-[0_0_0_2px_rgba(13,148,136,0.12)]"
    >
      <div className="aspect-[5/4] overflow-hidden">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          onError={() => setFailed(true)}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-background/75 via-background/10 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-4 py-3">
        <span className="font-sans-tech text-[11px] uppercase tracking-[0.18em] text-primary">
          Open in viewer
        </span>
        <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  );
}

function CategoryHeroImage({ blobPath, alt }: { blobPath: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const src = frontPageImageUrl(blobPath);

  if (!src || failed) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[20px] border border-slate-200 bg-slate-100">
        <Database className="h-8 w-8 text-primary/60" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
          onError={() => setFailed(true)}
        />
      </div>
    </div>
  );
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

function getCategoryStory(category: CategoryConfig) {
  switch (category.routeKey) {
    case "serverrack":
      return {
        eyebrow: "Data Center · Robotics AI",
        summary:
          "High-fidelity server-room captures built for port-level manipulation, rack maintenance, and robotics automation workflows.",
        statLabel: "Operational focus",
        statValue: "Rack + cabling",
      };
    case "warehouse":
      return {
        eyebrow: "Warehouse · Material Flow",
        summary:
          "Warehouse movement, handling, and storage-operation data shaped for logistics robotics and live facility workflows.",
        statLabel: "Operational focus",
        statValue: "Picking + transport",
      };
    case "dexterity":
      return {
        eyebrow: "Dexterity · Embodied Control",
        summary:
          "Fine-motor manipulation data for embodied systems working across close-range object interaction and practical task execution.",
        statLabel: "Operational focus",
        statValue: "Fine manipulation",
      };
    default:
      return {
        eyebrow: "Automotive · Physical AI",
        summary:
          "Assembly, inspection, and service-oriented captures for vehicle-production robotics and automation training pipelines.",
        statLabel: "Operational focus",
        statValue: "Assembly + inspection",
      };
  }
}

function CompactPathSearch({
  value,
  loading,
  suggestions,
  placeholder,
  submitDisabled,
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
  onFocus: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestionClick: (fullPath: string) => void;
  renderHighlightedPath: (fullPath: string) => ReactNode;
}) {
  return (
    <div className="relative w-full max-w-xl">
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

  return (
    <div
      className={`relative overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100 ${className ?? ""}`}
    >
      {asset?.proxy_url && !failed ? (
        <img
          src={asset.proxy_url}
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

function CategoryDatasetPreviewCard({
  item,
  onClick,
}: {
  item: CategoryDatasetPreview;
  onClick: () => void;
}) {
  const thumbnailItems = Array.from({ length: 4 }, (_, index) => item.thumbnails[index] ?? item.main_image);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-[0_22px_54px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_28px_70px_rgba(15,23,42,0.12)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            {item.brand || "DataraAI"}
          </div>
          <h3 className="mt-2 text-xl font-extrabold text-slate-950">{item.title}</h3>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
            item.visibility === "public"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-100 text-slate-500"
          }`}
        >
          {item.visibility === "public" ? "Public" : "Private"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.08fr)_220px]">
        <DatasetPreviewImage
          asset={item.main_image}
          alt={`${item.title} primary preview`}
          className="aspect-[1.08/1]"
        />

        <div className="grid grid-cols-2 gap-3">
          {thumbnailItems.map((thumbnail, index) => (
            <DatasetPreviewImage
              key={`${item.full_path}-${thumbnail?.asset_id ?? "empty"}-${index}`}
              asset={thumbnail}
              alt={`${item.title} preview ${index + 1}`}
              className="aspect-square"
            />
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <span className="truncate text-xs text-slate-500">{item.full_path}</span>
        <span className="inline-flex shrink-0 items-center gap-2 text-xs font-bold text-primary">
          Open folder
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </button>
  );
}

function PathSearchPanel({
  title,
  description,
  value,
  loading,
  suggestions,
  placeholder,
  submitDisabled,
  onFocus,
  onChange,
  onSubmit,
  onSuggestionClick,
  renderHighlightedPath,
}: {
  title: string;
  description: string;
  value: string;
  loading: boolean;
  suggestions: FolderItem[];
  placeholder: string;
  submitDisabled: boolean;
  onFocus: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestionClick: (fullPath: string) => void;
  renderHighlightedPath: (fullPath: string) => ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
      <div className="max-w-3xl">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Path Search</div>
        <h3 className="mt-3 mb-2 font-sans-tech text-2xl font-bold text-slate-950">{title}</h3>
        <p className="font-sans-tech text-sm leading-7 text-slate-600">
          {description}
        </p>
      </div>
      <div className="relative mt-6 w-full">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <input
              type="text"
              value={value}
              onFocus={onFocus}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-10 font-sans-tech text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] placeholder:text-slate-400 focus:border-primary focus:outline-none"
          />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
            )}
          </div>
          <button
            type="submit"
            disabled={submitDisabled}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary px-5 font-sans-tech text-sm font-bold text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open path
          </button>
        </form>

        {value.trim() !== "" && (
          <div className="mt-3 overflow-hidden rounded-[20px] border border-slate-200 bg-white/96 text-left shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:bg-card/95 dark:shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
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
    </div>
  );
}

function LoggedOutHub({ viewerBasePath }: { viewerBasePath: string }) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-6 md:py-16">
      <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(29,78,216,0.08),transparent_30%),radial-gradient(circle_at_18%_14%,rgba(13,148,136,0.08),transparent_22%),linear-gradient(180deg,rgba(248,250,252,0.94),rgba(255,255,255,1))] p-6 shadow-[0_28px_70px_rgba(15,23,42,0.1)] md:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-primary">
            RoboDataHub
          </div>
          <h1 className="mt-6 text-[clamp(2.3rem,4.8vw,4rem)] font-black tracking-[-0.05em] text-slate-950">
            Sign in to browse the full data library.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            Keep the public-facing design visible, but preserve the current access model:
            dataset contents stay behind account approval.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              to={buildAuthPath("login", viewerBasePath)}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/20 hover:text-primary"
            >
              Sign In
            </Link>
            <Link
              to={buildAuthPath("register", viewerBasePath)}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground"
            >
              Get Access
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {CATEGORIES.map((category) => (
          <div
            key={category.routeKey}
            className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_46px_rgba(15,23,42,0.08)]"
          >
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="font-sans-tech text-xl font-bold text-slate-950">{category.label}</div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {category.description}
            </p>
          </div>
        ))}
      </div>
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
  const pathSearchScopeKey = activeCategory?.routeKey ?? "global";

  const isRootLanding = pathSegments.length === 0;
  const isCategoryLanding = Boolean(activeCategory) && pathSegments.length === 1;

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
    if (!isAuthenticated || !isApproved || !isCategoryLanding || !activeCategory) {
      setCategoryPreviews([]);
      setCategoryPreviewsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCategoryPreviews() {
      setCategoryPreviewsLoading(true);
      try {
        const response = await axios.get<CategoryDatasetPreview[]>("/api/dataset-category-previews", {
          params: { category: activeCategory.routeKey, public_only: "true" },
        });
        if (cancelled) return;
        setCategoryPreviews(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load category dataset previews", error);
          setCategoryPreviews([]);
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
  }, [activeCategory, isAuthenticated, isApproved, isCategoryLanding, reloadTick]);

  useEffect(() => {
    if (!isAuthenticated || !isApproved) {
      setAllFolderPaths([]);
      setPathSearchLoaded(false);
      return;
    }

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
  }, [
    isAuthenticated,
    isApproved,
    isRootLanding,
    isCategoryLanding,
    activeCategory,
    pathSearchTouched,
    pathSearchLoaded,
  ]);

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
    if (!isAuthenticated || !isApproved || !pathSearchText.trim()) return [];

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
  }, [activeCategory, allFolderPaths, isAuthenticated, isApproved, isRootLanding, pathSearchText]);

  const itemCount = isCategoryLanding
    ? categoryPreviews.length
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
    navigate(buildViewerPath(fullPath, undefined, viewerBasePath));
  }

  function handlePathSearchSubmit() {
    if (pathSuggestions.length === 0) return;
    handlePathSuggestionClick(pathSuggestions[0].full_path);
  }

  function handleCategoryPreviewClick(item: CategoryDatasetPreview) {
    navigate(
      item.viewer_path
        ? withViewerBase(item.viewer_path, viewerBasePath)
        : buildViewerPath(item.full_path, undefined, viewerBasePath),
    );
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
    <div className="mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-6 md:py-16">
      <div className="min-w-0">
        <div className="mb-8 overflow-hidden rounded-[34px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(29,78,216,0.08),transparent_30%),radial-gradient(circle_at_18%_14%,rgba(13,148,136,0.08),transparent_22%),linear-gradient(180deg,rgba(248,250,252,0.94),rgba(255,255,255,1))] p-6 shadow-[0_28px_70px_rgba(15,23,42,0.1)] md:p-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 font-sans-tech text-[11px] uppercase tracking-[0.22em] text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            RoboDataHub
          </div>
          <h1 className="mb-4 max-w-3xl font-sans-tech text-[clamp(2.3rem,4.8vw,4rem)] font-black tracking-[-0.05em] text-slate-950">
            RoboDataHub
          </h1>
          <p className="max-w-3xl font-sans-tech text-base leading-8 text-slate-600">
            Browse DataraAI&apos;s public physical-AI datasets by category, or search a known path
            when you already know the folder you want.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate(`${viewerBasePath}/my`)}
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-primary/20 bg-primary px-5 font-sans-tech text-sm font-bold text-primary-foreground transition-colors hover:opacity-90"
            >
              My private data
              <ArrowRight className="h-4 w-4" />
            </button>
            {user?.role === "admin" && (
              <button
                type="button"
                onClick={() => navigate(`${viewerBasePath}/admin/${user.storageSlug}`)}
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 font-sans-tech text-sm font-semibold text-slate-700 transition-colors hover:border-primary/20 hover:text-primary"
              >
                Admin access
                <Shield className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <PathSearchPanel
          title="Search the full library"
          description="Use search to jump straight to a brand, endpoint folder, or deeper asset path anywhere in RoboDataHub."
          value={pathSearchText}
          loading={pathSearchLoading}
          suggestions={pathSuggestions}
          placeholder="Search any folder or path, e.g. BMW or carAutomation/BMW/frontGrille"
          submitDisabled={pathSuggestions.length === 0}
          onFocus={() => setPathSearchTouched(true)}
          onChange={(value) => {
            setPathSearchTouched(true);
            setPathSearchText(value);
          }}
          onSubmit={handlePathSearchSubmit}
          onSuggestionClick={handlePathSuggestionClick}
          renderHighlightedPath={renderHighlightedPath}
        />

        <div className="mt-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-3 w-3 rounded-[4px] bg-primary shadow-[0_0_12px_rgba(13,148,136,0.35)]" />
            <div className="text-2xl font-extrabold text-slate-950">Categories</div>
          </div>
          <p className="mb-8 max-w-3xl text-sm leading-7 text-slate-600">
            Start with the four active DataraAI categories, then step into the endpoint folders
            inside each one.
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            {CATEGORIES.map((category) => (
              <section
                key={category.routeKey}
                className="grid gap-6 overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] lg:grid-cols-[minmax(0,1fr)_320px]"
              >
                <div className="flex flex-col justify-between">
                  <div>
                    <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${getCategoryAccent(category.routeKey).chip}`}>
                      <span className={`h-2 w-2 rounded-full ${getCategoryAccent(category.routeKey).dot}`} />
                      {getCategoryStory(category).eyebrow}
                    </div>
                    <div className="text-2xl font-extrabold tracking-[-0.03em] text-slate-950">
                      {category.label}
                    </div>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
                      {getCategoryStory(category).summary}
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      Browse endpoint folders
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      {getCategoryStory(category).statLabel}: {getCategoryStory(category).statValue}
                    </span>
                  </div>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => navigate(`${viewerBasePath}/${category.routeKey}`)}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-sans-tech text-sm font-bold text-primary-foreground transition-colors hover:opacity-90"
                    >
                      Enter Category
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {buildCategoryHeroImagePaths(category)
                    .slice(0, 4)
                    .map((blobPath, index) => (
                      <CategoryHeroImage
                        key={`${category.routeKey}-${blobPath}`}
                        blobPath={blobPath}
                        alt={`${category.label} preview ${index + 1}`}
                      />
                    ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCategoryLanding = (category: CategoryConfig) => (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-6 md:py-16">
      <div className="min-w-0">
        <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.1)]">
          <div className="grid gap-8 border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(29,78,216,0.08),transparent_30%),radial-gradient(circle_at_18%_14%,rgba(13,148,136,0.08),transparent_22%),linear-gradient(180deg,rgba(248,250,252,0.94),rgba(255,255,255,1))] p-6 md:grid-cols-[minmax(0,1.1fr)_300px] md:p-8">
            <div className="max-w-3xl">
              <div className={`mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 font-sans-tech text-[11px] uppercase tracking-[0.22em] ${getCategoryAccent(category.routeKey).chip}`}>
                {getCategoryStory(category).eyebrow}
              </div>
              <h1 className="text-[clamp(2.3rem,4.8vw,4rem)] font-black tracking-[-0.05em] text-slate-950">
                RoboDataHub {category.label}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                {getCategoryStory(category).summary}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {categoryPreviews.length} public endpoint folders
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {getCategoryStory(category).statLabel}: {getCategoryStory(category).statValue}
                </span>
              </div>
            </div>

            <CategoryHeroImage
              blobPath={buildCategoryHeroImagePaths(category)[0]}
              alt={`${category.label} hero`}
            />
          </div>

          <div className="p-6 md:p-8">
            <div className="mb-8">
              <PathSearchPanel
                title={`Search inside ${category.label}`}
                description={`Jump to a brand, endpoint folder, or deeper asset path within the ${category.label.toLowerCase()} catalog while keeping the current viewer access rules intact.`}
                value={pathSearchText}
                loading={pathSearchLoading}
                suggestions={pathSuggestions}
                placeholder={`Search ${category.label.toLowerCase()} paths`}
                submitDisabled={pathSuggestions.length === 0}
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

            {categoryPreviewsLoading ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Loading folder previews...
                </div>
              </div>
            ) : categoryPreviews.length > 0 ? (
              <div className="grid gap-5 lg:grid-cols-2">
                {categoryPreviews.map((item) => (
                  <CategoryDatasetPreviewCard
                    key={item.full_path}
                    item={item}
                    onClick={() => handleCategoryPreviewClick(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
                No public endpoint folders are available in this category yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

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
            <LoggedOutHub viewerBasePath={viewerBasePath} />
          ) : (
            <div className="mx-auto flex-1 w-full max-w-[1440px] px-4 py-10 sm:px-6">
              <AuthRequiredState description="Sign in before viewing dataset contents. Public datasets stay available to signed-in users only." />
            </div>
          )
        ) : !isApproved ? (
          <div className="mx-auto flex-1 w-full max-w-[1440px] px-4 py-10 sm:px-6">
            <AuthRequiredState />
          </div>
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
