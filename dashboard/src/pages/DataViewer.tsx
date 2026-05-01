import { useEffect, useMemo, useState, type ReactNode } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Database,
  Download,
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

function buildVersionedAssetUrl(image: ImageItem | null): string {
  if (!image) return "";
  const baseUrl = image.proxy_url || image.url || "";
  if (!baseUrl) return "";

  const version =
    image.metadata?.uploaded_at ??
    image.metadata?.date ??
    image.metadata?.frame_id ??
    image.asset_id;
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}v=${encodeURIComponent(String(version))}`;
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
  helperText: string;
  searchTitle: string;
  searchDescription: string;
}

interface ShowcaseImageConfig {
  previewBlobPath: string;
  targetFolderPath: string;
  targetImageName?: string;
  alt: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    routeKey: "carAutomation",
    previewKey: "carAutomation",
    label: "Car Automation",
    description:
      "Assembly, inspection, and vehicle-production data for robotics workflows across automotive environments.",
    helperText:
      "Browse this category to explore automotive data collections, or search directly below to jump to a specific folder path.",
    searchTitle: "Search within Car Automation",
    searchDescription:
      "Find folders, scenes, or specific path matches inside the Car Automation category.",
  },
  {
    routeKey: "serverrack",
    previewKey: "serverrack",
    label: "Serverrack",
    description:
      "Data-center interaction, port-level operation, and maintenance-focused datasets for rack and cabling tasks.",
    helperText:
      "Start here for server-rack workflows, then browse further or search to move directly into a relevant dataset branch.",
    searchTitle: "Search within Serverrack",
    searchDescription:
      "Search inside the Serverrack category for folders related to rack operations, cabling, and maintenance.",
  },
  {
    routeKey: "dexterity",
    previewKey: "humanoid",
    label: "Dexterity",
    description:
      "Fine-motor manipulation and embodied task data for dexterous robotic systems operating across practical, object-centric scenarios.",
    helperText:
      "Use this category for dexterity-focused tasks and embodied interaction data, including peeling, washing, and practical manipulation workflows.",
    searchTitle: "Search within Dexterity",
    searchDescription:
      "Search only across dexterity-related folders to narrow down the most relevant dataset path quickly.",
  },
  {
    routeKey: "warehouse",
    previewKey: "warehouse",
    label: "Warehouse",
    description:
      "Logistics, handling, and storage-operation data for robotic movement, picking, and material flow.",
    helperText:
      "Explore warehouse-oriented robotics data collections, or search within this category to find a path faster.",
    searchTitle: "Search within Warehouse",
    searchDescription:
      "Search only within warehouse data paths to keep results focused and easier to navigate.",
  },
];

const CATEGORY_SHOWCASES: Record<CategoryKey, ShowcaseImageConfig[]> = {
  carAutomation: [
    {
      previewBlobPath: "carAutomation/carAutomation4.png",
      targetFolderPath: "carAutomation/BMW/frontGrille",
      targetImageName: "frontGrille_016_Rotate_right_90_degrees.png",
      alt: "BMW front grille rotation example",
    },
    {
      previewBlobPath: "carAutomation/carAutomation5.png",
      targetFolderPath: "carAutomation/BMW/frontGrille",
      targetImageName: "frontGrille_000_Rotate_right_45_degrees.png",
      alt: "BMW front grille angled example",
    },
    {
      previewBlobPath: "carAutomation/carAutomation6.png",
      targetFolderPath: "carAutomation/Porsche/frontSeat",
      targetImageName: "frontSeat_037_Rotate_left_45_degrees.png",
      alt: "Porsche front seat example",
    },
    {
      previewBlobPath: "carAutomation/carAutomation7.png",
      targetFolderPath: "carAutomation/bmw/rearBumper",
      targetImageName: "rearBumper_000_Rotate_left_90_degrees.png",
      alt: "BMW rear bumper example",
    },
  ],
  serverrack: [
    {
      previewBlobPath: "serverrack/serverrack4.png",
      targetFolderPath: "serverrack/Dell/dataRackInstall",
      targetImageName: "dataRackInstall_0000.png",
      alt: "Serverrack installation example",
    },
    {
      previewBlobPath: "serverrack/serverrack5.png",
      targetFolderPath: "serverrack/Gigabyte/datacenterRack2",
      targetImageName: "datacenterRack2_84.png",
      alt: "Datacenter rack example",
    },
    {
      previewBlobPath: "serverrack/serverrack6.png",
      targetFolderPath: "serverrack/AnalogDevices/ethernetCable",
      targetImageName: "ethernetCable_000.png",
      alt: "Ethernet cable example",
    },
    {
      previewBlobPath: "serverrack/serverrack7.png",
      targetFolderPath: "serverrack/NVIDIA/switchTray",
      targetImageName: "switchTray_000.png",
      alt: "Switch tray example",
    },
  ],
  dexterity: [
    {
      previewBlobPath: "humanoid/humanoid4.png",
      targetFolderPath: "dexterity/Awign/dishWasher",
      alt: "Dexterity dish washer example one",
    },
    {
      previewBlobPath: "humanoid/humanoid5.png",
      targetFolderPath: "dexterity/Awign/dishWasherUnloading",
      alt: "Dexterity dish washer unloading example",
    },
    {
      previewBlobPath: "humanoid/humanoid6.png",
      targetFolderPath: "dexterity/Awign/peelingPeas",
      alt: "Dexterity peeling example",
    },
    {
      previewBlobPath: "humanoid/humanoid7.png",
      targetFolderPath: "dexterity/Awign/washingMachine",
      alt: "Dexterity washing machine example",
    },
  ],
  warehouse: [
    {
      previewBlobPath: "warehouse/warehouse4.png",
      targetFolderPath: "warehouse/Symbotic/AVnavigation",
      targetImageName: "AVnavigation_000.png",
      alt: "Warehouse navigation example one",
    },
    {
      previewBlobPath: "warehouse/warehouse5.png",
      targetFolderPath: "warehouse/Symbotic/AVnavigation",
      targetImageName: "AVnavigation_044.png",
      alt: "Warehouse navigation example two",
    },
    {
      previewBlobPath: "warehouse/warehouse6.png",
      targetFolderPath: "warehouse/Symbotic/AVnavigation",
      targetImageName: "AVnavigation_071.png",
      alt: "Warehouse navigation example three",
    },
    {
      previewBlobPath: "warehouse/warehouse7.png",
      targetFolderPath: "warehouse/Symbotic/AVnavigation",
      targetImageName: "AVnavigation_095.png",
      alt: "Warehouse navigation example four",
    },
  ],
};

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

function getCategoryByRouteKey(value?: string | null) {
  return CATEGORIES.find((category) => category.routeKey === value) ?? null;
}

function pathBelongsToCategory(fullPath: string, routeKey: CategoryKey) {
  const segments = fullPath.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  if (segments[0] === routeKey) return true;
  if (segments[0] === "my") return segments[1] === routeKey;
  if (segments[0] === "admin") return segments[2] === routeKey;
  return false;
}

function buildCategoryHeroImagePaths(category: CategoryConfig) {
  return [0, 1, 2, 3].map(
    (index) =>
      `${category.previewKey}/${category.previewKey}${index === 0 ? "" : index}.png`,
  );
}

function buildViewerPath(fullPath: string, imageName?: string) {
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
  return `/viewer/${encodedPath}${query ? `?${query}` : ""}`;
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
        className="group relative flex aspect-[5/4] w-full items-center justify-center overflow-hidden rounded-sm border border-border bg-background/70 transition-all duration-300 hover:border-primary hover:shadow-[0_0_0_2px_rgba(31,209,107,0.38)]"
      >
        <Database className="h-9 w-9 text-primary/60" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 to-transparent px-3 py-2 text-left">
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
      className="group relative w-full overflow-hidden rounded-sm border border-border bg-background/70 shadow-xl shadow-black/20 transition-all duration-300 hover:border-primary hover:shadow-[0_0_0_2px_rgba(31,209,107,0.42)] focus:border-primary focus:outline-none focus:shadow-[0_0_0_2px_rgba(31,209,107,0.42)]"
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
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-3 py-3">
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
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-sm border border-border bg-background/60">
        <Database className="h-8 w-8 text-primary/60" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-sm border border-border bg-background/60 shadow-lg shadow-black/20">
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
    <div className="rounded-sm border border-border bg-card/20 p-6 shadow-xl shadow-black/10 md:p-8">
      <div className="max-w-3xl">
        <h3 className="mb-2 font-sans-tech text-2xl font-bold text-foreground">{title}</h3>
        <p className="font-sans-tech text-sm leading-relaxed text-muted-foreground">
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
              className="h-12 w-full rounded-sm border border-primary/40 bg-background/90 pl-11 pr-10 font-sans-tech text-sm text-foreground shadow-lg shadow-primary/10 placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
            )}
          </div>
          <button
            type="submit"
            disabled={submitDisabled}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-sm border border-primary/30 bg-primary px-5 font-sans-tech text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-glow disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open path
          </button>
        </form>

        {value.trim() !== "" && (
          <div className="mt-2 overflow-hidden rounded-sm border border-primary/20 bg-card/95 text-left shadow-xl shadow-black/20 backdrop-blur-sm">
            {suggestions.length > 0 ? (
              <div className="divide-y divide-border">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.full_path}
                    type="button"
                    onClick={() => onSuggestionClick(suggestion.full_path)}
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-primary/10"
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

function RoboDataHubTopMenu({
  activeItem,
}: {
  activeItem: CategoryKey | "home";
}) {
  const menuItems = [
    {
      key: "home" as const,
      label: "RoboDataHub Home",
      description: "Overview of all data verticals",
      href: "/viewer",
    },
    ...CATEGORIES.map((category) => ({
      key: category.routeKey,
      label: category.label,
      description: category.description,
      href: `/viewer/${category.routeKey}`,
    })),
  ];

  return (
    <section className="overflow-hidden rounded-[28px] border border-border bg-card/70 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-sm md:p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-xl px-2 pt-2">
          <div className="font-mono-tech text-[11px] uppercase tracking-[0.24em] text-primary">
            RoboDataHub Menu
          </div>
          <h2 className="mt-3 font-sans-tech text-3xl font-bold tracking-tight text-foreground">
            Explore by vertical
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            A top-level navigation rail for moving across RoboDataHub without relying on a sticky
            left sidebar. It keeps the industrial feel while making the landing pages lighter and
            more flexible.
          </p>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {menuItems.map((item, index) => {
              const isActive = activeItem === item.key;
              const badge = item.key === "home" ? "Hub" : String(index).padStart(2, "0");

              return (
                <Link
                  key={item.key}
                  to={item.href}
                  className={`group w-[244px] rounded-[24px] border p-5 transition-all duration-200 ${
                    isActive
                      ? "border-primary/35 bg-primary/10 shadow-[0_14px_40px_rgba(0,0,0,0.24)]"
                      : "border-border/80 bg-background/60 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-background/80 hover:shadow-[0_14px_40px_rgba(0,0,0,0.2)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border px-3 font-mono-tech text-[11px] font-bold uppercase tracking-[0.18em] ${
                        isActive
                          ? "border-primary/50 bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground"
                      }`}
                    >
                      {badge}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 font-mono-tech text-[10px] uppercase tracking-[0.16em] ${
                        isActive
                          ? "border-primary-glow/25 bg-primary-glow/10 text-primary-glow"
                          : "border-border bg-background/70 text-muted-foreground"
                      }`}
                    >
                      {isActive ? "Open" : "Browse"}
                    </span>
                  </div>

                  <span className="mt-5 block font-sans-tech text-base font-semibold text-foreground">
                    {item.label}
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function LoggedOutHub() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-6 md:py-16">
      <div className="mb-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1 font-sans-tech text-xs uppercase tracking-[0.24em] text-primary">
          RoboDataHub
        </div>
        <h1 className="font-sans-tech text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Data verticals
        </h1>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {CATEGORIES.map((category) => (
          <div
            key={category.routeKey}
            className="rounded-sm border border-border bg-card/20 p-6 shadow-xl shadow-black/10"
          >
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-sm border border-primary/20 bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="font-sans-tech text-xl font-bold text-foreground">{category.label}</div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
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

  const [folders, setFolders] = useState<FolderItem[]>([]);
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
  const [primaryOcclusionPlaybackUrl, setPrimaryOcclusionPlaybackUrl] = useState("");
  const [occlusionVideoLoading, setOcclusionVideoLoading] = useState(false);

  const pathSegments = useMemo(
    () => location.pathname.split("/").filter((part) => part && part !== "viewer"),
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

  const isRootLanding = pathSegments.length === 0;
  const isCategoryLanding = Boolean(activeCategory) && pathSegments.length === 1;

  useEffect(() => {
    if (!isAuthenticated || !isApproved || isRootLanding) {
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

        if (nextFolders.length > 0 || isCategoryLanding) {
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
    if (!isAuthenticated || !isApproved) {
      setAllFolderPaths([]);
      setPathSearchLoaded(false);
      return;
    }

    const shouldLoadPaths = isRootLanding || isCategoryLanding || pathSearchTouched;
    if (!shouldLoadPaths || pathSearchLoaded || pathSearchLoading) return;

    let cancelled = false;

    async function loadAllPaths() {
      setPathSearchLoading(true);
      try {
        const response = await axios.get<unknown[]>("/api/dataset-paths");
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
    pathSearchTouched,
    pathSearchLoaded,
    pathSearchLoading,
  ]);

  useEffect(() => {
    setAllFolderPaths([]);
    setPathSearchLoaded(false);
  }, [reloadTick]);

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
  const maskSourceImageCount = useMemo(
    () => images.filter((image) => image.type === "image").length,
    [images],
  );
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
  const isOcclusionResultPath = useMemo(
    () => pathSegments.slice(datasetRootDepth).some((segment) => segment.toLowerCase() === "occl_del"),
    [datasetRootDepth, pathSegments],
  );
  const primaryOcclusionVideo = useMemo(
    () => filteredImages.find((image) => image.type === "video") ?? null,
    [filteredImages],
  );
  const primaryOcclusionVideoUrl = useMemo(
    () => buildVersionedAssetUrl(primaryOcclusionVideo),
    [primaryOcclusionVideo],
  );
  const resolvedPrimaryOcclusionVideoUrl =
    primaryOcclusionPlaybackUrl || primaryOcclusionVideoUrl;
  const gridImages = useMemo(() => {
    if (!primaryOcclusionVideo) return filteredImages;
    return filteredImages.filter((image) => image !== primaryOcclusionVideo);
  }, [filteredImages, primaryOcclusionVideo]);
  const showLeafAssetGrid = !isOcclusionResultPath || !primaryOcclusionVideo || gridImages.length > 0;

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;

    setPrimaryOcclusionPlaybackUrl("");
    if (!primaryOcclusionVideoUrl) {
      setOcclusionVideoLoading(false);
      return undefined;
    }

    setOcclusionVideoLoading(true);

    axios
      .get(primaryOcclusionVideoUrl, { responseType: "blob" })
      .then((response) => {
        if (cancelled) return;
        const videoBlob =
          response.data instanceof Blob
            ? response.data
            : new Blob([response.data], { type: "video/mp4" });
        objectUrl = URL.createObjectURL(videoBlob);
        setPrimaryOcclusionPlaybackUrl(objectUrl);
      })
      .catch((error) => {
        console.error("Failed to preload occlusion video blob", error);
        if (!cancelled) {
          setPrimaryOcclusionPlaybackUrl(primaryOcclusionVideoUrl);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOcclusionVideoLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [primaryOcclusionVideoUrl]);

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

  const itemCount = isLeaf ? filteredImages.length : filteredFolders.length;

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
    navigate(buildViewerPath(fullPath));
  }

  function handlePathSearchSubmit() {
    if (pathSuggestions.length === 0) return;
    handlePathSuggestionClick(pathSuggestions[0].full_path);
  }

  function handleShowcaseImageClick(item: ShowcaseImageConfig) {
    navigate(buildViewerPath(item.targetFolderPath, item.targetImageName));
  }

  function scrollToSubdirectories() {
    const section = document.getElementById("category-subdirectories");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
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
            ? "text-primary underline decoration-primary underline-offset-4"
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
              className="group relative cursor-pointer overflow-hidden rounded-sm border border-border bg-card/15 p-6 transition-all duration-300 hover:border-primary hover:bg-card/25 hover:shadow-2xl hover:shadow-black/10"
              onClick={() => navigate(folder.viewer_path || buildViewerPath(folder.full_path))}
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
                      <div className="absolute right-0 z-20 mt-1 w-40 rounded-sm border border-border bg-card py-1 shadow-lg">
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

              <div className="absolute left-0 top-0 h-3 w-3 border-l border-t border-border transition-colors group-hover:border-primary" />
              <div className="absolute right-0 top-0 h-3 w-3 border-r border-t border-border transition-colors group-hover:border-primary" />
              <div className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-border transition-colors group-hover:border-primary" />
              <div className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-border transition-colors group-hover:border-primary" />

              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="h-44 w-full overflow-hidden rounded-sm border border-border bg-background/50 transition-all group-hover:border-primary/30 group-hover:shadow-[0_0_18px_rgba(31,209,107,0.12)]">
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
                  <span className="block break-words font-sans-tech text-lg font-bold uppercase tracking-wider text-foreground transition-colors group-hover:text-primary">
                    {folder.name}
                  </span>
                  {folder.visibility && (
                    <span
                      className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] uppercase tracking-wide ${
                        folder.visibility === "public"
                          ? "bg-primary/15 text-primary"
                          : "bg-amber-500/15 text-amber-300"
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
          <div className="col-span-full flex flex-col items-center justify-center rounded-sm border border-dashed border-border bg-card/10 py-20 text-muted-foreground">
            <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground/50" />
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
      <RoboDataHubTopMenu activeItem="home" />

      <div className="mt-8 min-w-0">
        <div className="mb-8 max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1 font-sans-tech text-xs uppercase tracking-[0.24em] text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            RoboDataHub
          </div>
          <h1 className="mb-4 font-sans-tech text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            RoboDataHub
          </h1>
          <p className="max-w-3xl font-sans-tech text-sm leading-relaxed text-muted-foreground md:text-base">
            Search across the full data library for a quick shortcut, or browse featured
            categories below through presentation-ready examples that open directly in the viewer.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/viewer/my")}
              className="inline-flex h-11 items-center gap-2 rounded-sm border border-primary/30 bg-primary px-5 font-sans-tech text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-glow"
            >
              My private data
              <ArrowRight className="h-4 w-4" />
            </button>
            {user?.role === "admin" && (
              <button
                type="button"
                onClick={() => navigate(`/viewer/admin/${user.storageSlug}`)}
                className="inline-flex h-11 items-center gap-2 rounded-sm border border-border bg-background/80 px-5 font-sans-tech text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                Admin access
                <Shield className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <PathSearchPanel
          title="Global search"
          description="Use search to jump straight to a folder path when you already know what you want. It is the fastest way to navigate the full RoboDataHub without clicking through multiple pages."
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

        <div className="mt-10 flex flex-col gap-8">
          {CATEGORIES.map((category) => (
            <section
              key={category.routeKey}
              className="rounded-sm border border-border bg-gradient-to-br from-card/25 via-background/80 to-primary/5 p-6 shadow-2xl shadow-black/10 md:p-8"
            >
              <div className="grid grid-cols-1 items-center gap-8 xl:grid-cols-[0.92fr_1.5fr] xl:gap-10">
                <div>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/10 px-3 py-1 font-sans-tech text-[11px] uppercase tracking-[0.22em] text-primary">
                    Featured category
                  </div>
                  <h2 className="mb-4 font-sans-tech text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    {category.label}
                  </h2>
                  <p className="mb-4 max-w-xl font-sans-tech text-sm leading-relaxed text-foreground/90 md:text-base">
                    {category.description}
                  </p>
                  <p className="max-w-xl font-sans-tech text-sm leading-relaxed text-muted-foreground">
                    {category.helperText}
                  </p>
                  <div className="mt-7">
                    <button
                      type="button"
                      onClick={() => navigate(`/viewer/${category.routeKey}`)}
                      className="inline-flex h-11 items-center gap-2 rounded-sm bg-primary px-5 font-sans-tech text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-glow"
                    >
                      View data
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  {CATEGORY_SHOWCASES[category.routeKey].map((item) => (
                    <ShowcasePreviewImage
                      key={item.previewBlobPath}
                      blobPath={item.previewBlobPath}
                      alt={item.alt}
                      onClick={() => handleShowcaseImageClick(item)}
                    />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCategoryLanding = (category: CategoryConfig) => (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-6 md:py-16">
      <RoboDataHubTopMenu activeItem={category.routeKey} />

      <div className="mt-8 min-w-0">
        <div className="grid grid-cols-1 items-center gap-8 rounded-sm border border-border bg-gradient-to-br from-card/30 via-background/70 to-primary/5 p-6 shadow-2xl shadow-black/10 md:p-8 xl:grid-cols-[1.05fr_1fr] xl:gap-12">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1 font-sans-tech text-xs uppercase tracking-[0.24em] text-primary">
              Category
            </div>
            <h1 className="mb-5 font-sans-tech text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {category.label}
            </h1>
            <p className="mb-4 max-w-2xl font-sans-tech text-base leading-relaxed text-foreground/90 md:text-lg">
              {category.description}
            </p>
            <p className="max-w-2xl font-sans-tech text-sm leading-relaxed text-muted-foreground">
              {category.helperText}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={scrollToSubdirectories}
                className="inline-flex h-11 items-center gap-2 rounded-sm bg-primary px-5 font-sans-tech text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-glow"
              >
                View data
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {buildCategoryHeroImagePaths(category).map((blobPath, index) => (
              <CategoryHeroImage
                key={blobPath}
                blobPath={blobPath}
                alt={`${category.label} preview ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-10">
          <PathSearchPanel
            title={category.searchTitle}
            description={category.searchDescription}
            value={pathSearchText}
            loading={pathSearchLoading}
            suggestions={pathSuggestions}
            placeholder={`Search ${category.routeKey} paths, e.g. ${category.routeKey}/bmw`}
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

        <div className="pt-12" id="category-subdirectories">
          <div className="mx-auto mb-6 flex max-w-6xl items-center gap-2">
            <div className="h-4 w-1 bg-primary" />
            <h2 className="font-sans-tech text-lg font-bold uppercase tracking-widest text-muted-foreground">
              {category.label} Subdirectories
            </h2>
          </div>
          {renderFolderGrid(filteredFolders, "max-w-6xl")}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-background font-sans-tech text-foreground md:h-screen md:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.05]" />
      <Navigation />

      <div className="relative z-10 flex flex-1 flex-col pt-16 md:overflow-hidden">
        <div className="z-20 flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-background/80 px-4 py-2 backdrop-blur-md sm:flex-nowrap sm:py-0">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Link
                to="/viewer"
                className="hidden font-sans-tech font-bold text-primary transition-colors hover:text-primary-glow md:block"
              >
                ROBODATAHUB
              </Link>
              <Breadcrumbs />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4 font-sans-tech text-[11px] font-medium text-muted-foreground sm:ml-0 sm:gap-6 sm:text-xs">
            {isAuthenticated && isApproved ? (
              <span className="flex items-center gap-2 text-primary-glow">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-glow" />
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
            <LoggedOutHub />
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
              <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 border-b border-border bg-card/10 px-4 py-2 sm:flex-nowrap sm:py-0">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center rounded-sm border border-border bg-card px-2 py-1 text-xs">
                    <span className="mr-2 font-sans-tech text-muted-foreground">Items:</span>
                    <span className="font-sans-tech text-foreground">{itemCount}</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <button
                    onClick={() => setReloadTick((value) => value + 1)}
                    className="flex items-center gap-1 font-sans-tech text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {!isLeaf && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center gap-2 rounded-sm border border-primary/50 bg-primary/10 px-3 py-1 font-sans-tech text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    <Terminal className="h-3 w-3" />
                    Import Data
                  </button>
                )}
              </div>

              <div className="custom-scrollbar relative flex-1 overflow-y-auto bg-background/30 p-0">
                {loading && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
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
                          <h2 className="font-sans-tech text-lg font-bold uppercase tracking-widest text-muted-foreground">
                            Subdirectories
                          </h2>
                        </div>
                      )}
                      {renderFolderGrid(filteredFolders, "max-w-5xl")}
                    </div>
                  </div>
                )}

                {isLeaf && isOcclusionResultPath && primaryOcclusionVideo && (
                  <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
                    <div className="overflow-hidden rounded-sm border border-border bg-card/20 shadow-xl shadow-black/10">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/70 px-4 py-3">
                        <div>
                          <p className="font-sans-tech text-xs uppercase tracking-[0.2em] text-primary">
                            Occlusion Removal Output
                          </p>
                          <p className="mt-1 font-sans-tech text-sm text-muted-foreground">
                            {primaryOcclusionVideo.name}
                          </p>
                          </div>
                          <a
                          href={primaryOcclusionVideoUrl}
                          download={primaryOcclusionVideo.name}
                            className="inline-flex h-10 items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-4 font-sans-tech text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download video
                          </a>
                        </div>
                        <div className="bg-black/60 p-2 sm:p-4">
                          {occlusionVideoLoading && !primaryOcclusionPlaybackUrl && (
                            <div className="flex min-h-24 items-center justify-center text-xs text-muted-foreground">
                              Preparing video playback...
                            </div>
                          )}
                          <video
                            key={resolvedPrimaryOcclusionVideoUrl}
                            controls
                            preload="metadata"
                            className="w-full rounded-sm bg-black"
                          >
                            <source src={resolvedPrimaryOcclusionVideoUrl} type="video/mp4" />
                          </video>
                        </div>
                      </div>
                    </div>
                  )}

                {isLeaf && showLeafAssetGrid && (
                  <ImageGrid
                    images={gridImages}
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
                refreshKey={reloadTick}
                onGenerationSuccess={() => setReloadTick((value) => value + 1)}
                onOcclusionSuccess={() => setReloadTick((value) => value + 1)}
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
              const index = gridImages.indexOf(selectedImage);
              if (index < gridImages.length - 1) {
                setSelectedImage(gridImages[index + 1]);
              }
            }}
            onPrev={() => {
              const index = gridImages.indexOf(selectedImage);
              if (index > 0) {
                setSelectedImage(gridImages[index - 1]);
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
