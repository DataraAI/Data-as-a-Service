import { useEffect, useMemo, useState, type ReactNode } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Database,
  Folder,
  Loader2,
  MoreVertical,
  RefreshCw,
  Search,
  Terminal,
  Trash2,
} from "lucide-react";
import { Sidebar } from "../components/Sidebar";
import { UploadModal } from "../components/UploadModal";
import { ImageGrid } from "../components/ImageGrid";
import { ImageModal } from "../components/ImageModal";
import Navigation from "../components/Navigation";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { DatasetFolderCover } from "../components/DatasetFolderCover";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";

interface FolderItem {
  name: string;
  full_path: string;
  source_path?: string;
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
  vlm?: VlmMetadata;
  [key: string]: unknown;
}

interface ImageItem {
  id: string;
  url: string;
  proxy_url?: string;
  name: string;
  type?: string;
  tags?: string[];
  metadata?: ImageMetadata;
  [key: string]: unknown;
}

interface VlmPromptGroup {
  prompt: string;
  tags: string[];
}

type CategoryKey = "carAutomation" | "serverrack" | "dexterity" | "warehouse";
type StorageKey = "carAutomation" | "serverrack" | "humanoid" | "warehouse";

interface CategoryConfig {
  routeKey: CategoryKey;
  storageKey: StorageKey;
  label: string;
  description: string;
  helperText: string;
  searchTitle: string;
  searchDescription: string;
}

interface ShowcaseImageConfig {
  previewBlobPath: string;
  targetFolderPath: string;
  targetImageName: string;
  alt: string;
}

interface PathAlias {
  displayPrefix: string;
  backendPrefix: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    routeKey: "carAutomation",
    storageKey: "carAutomation",
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
    storageKey: "serverrack",
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
    storageKey: "humanoid",
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
    storageKey: "warehouse",
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

const DISPLAY_PATH_ALIASES: PathAlias[] = [
  { displayPrefix: "dexterity/peeling", backendPrefix: "peeling" },
  { displayPrefix: "dexterity/washingMachine", backendPrefix: "washingMachine" },
  { displayPrefix: "dexterity/washingMachine", backendPrefix: "washingmachine" },
  { displayPrefix: "dexterity", backendPrefix: "humanoid" },
];

const LEGACY_SEARCH_PAGE_SEGMENT = "searchAll";

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
      targetFolderPath: "humanoid/peeling/none",
      targetImageName: "peas_0123.png",
      alt: "Dexterity peeling example one",
    },
    {
      previewBlobPath: "humanoid/humanoid5.png",
      targetFolderPath: "humanoid/peeling/none",
      targetImageName: "peas_0344.png",
      alt: "Dexterity peeling example two",
    },
    {
      previewBlobPath: "humanoid/humanoid6.png",
      targetFolderPath: "humanoid/Awign/washingMachine",
      targetImageName: "washingMachine_0077.png",
      alt: "Dexterity washing machine example one",
    },
    {
      previewBlobPath: "humanoid/humanoid7.png",
      targetFolderPath: "humanoid/Awign/washingMachine",
      targetImageName: "washingMachine_0110.png",
      alt: "Dexterity washing machine example two",
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

  let bestStartsWithDistance = Infinity;
  let bestIncludesDistance = Infinity;

  segments.forEach((segment, index) => {
    const distanceFromEnd = segments.length - 1 - index;
    if (queryTerms.some((term) => segment.startsWith(term))) {
      bestStartsWithDistance = Math.min(bestStartsWithDistance, distanceFromEnd);
    }
    if (queryTerms.some((term) => segment.includes(term))) {
      bestIncludesDistance = Math.min(bestIncludesDistance, distanceFromEnd);
    }
  });

  if (bestStartsWithDistance !== Infinity) return 10 + bestStartsWithDistance;
  if (bestIncludesDistance !== Infinity) return 20 + bestIncludesDistance;

  return 50 + segments.length;
}

function replacePathPrefix(path: string, fromPrefix: string, toPrefix: string) {
  if (path === fromPrefix) return toPrefix;
  if (path.startsWith(`${fromPrefix}/`)) {
    return `${toPrefix}/${path.slice(fromPrefix.length + 1)}`;
  }
  return null;
}

function mapRawPathToDisplayPath(rawPath: string) {
  const aliases = [...DISPLAY_PATH_ALIASES].sort(
    (a, b) => b.backendPrefix.length - a.backendPrefix.length,
  );

  for (const alias of aliases) {
    const mapped = replacePathPrefix(rawPath, alias.backendPrefix, alias.displayPrefix);
    if (mapped) return mapped;
  }

  return rawPath;
}

function resolveDisplayPathToBackendPath(displayPath: string) {
  const aliases = [...DISPLAY_PATH_ALIASES].sort(
    (a, b) => b.displayPrefix.length - a.displayPrefix.length,
  );

  for (const alias of aliases) {
    const mapped = replacePathPrefix(displayPath, alias.displayPrefix, alias.backendPrefix);
    if (mapped) return mapped;
  }

  return displayPath;
}

function normalizeFolderPathResults(payload: unknown): FolderItem[] {
  if (!Array.isArray(payload)) return [];

  const normalized = payload
    .map((item) => {
      if (typeof item === "string") {
        const fullPath = item.trim().replace(/^\/+|\/+$/g, "");
        if (!fullPath) return null;
        const parts = fullPath.split("/").filter(Boolean);
        return {
          name: parts[parts.length - 1] ?? fullPath,
          full_path: fullPath,
        };
      }

      if (item && typeof item === "object") {
        const maybeItem = item as Partial<FolderItem>;
        const fullPath =
          typeof maybeItem.full_path === "string"
            ? maybeItem.full_path.trim().replace(/^\/+|\/+$/g, "")
            : "";

        if (!fullPath) return null;

        const parts = fullPath.split("/").filter(Boolean);
        return {
          name:
            typeof maybeItem.name === "string" && maybeItem.name.trim()
              ? maybeItem.name.trim()
              : (parts[parts.length - 1] ?? fullPath),
          full_path: fullPath,
          source_path:
            typeof maybeItem.source_path === "string" ? maybeItem.source_path : undefined,
        };
      }

      return null;
    })
    .filter(Boolean) as FolderItem[];

  return normalized;
}

function mapFolderItemToDisplayPath(item: FolderItem): FolderItem {
  const displayPath = mapRawPathToDisplayPath(item.full_path);
  const parts = displayPath.split("/").filter(Boolean);
  return {
    ...item,
    name: parts[parts.length - 1] ?? item.name,
    full_path: displayPath,
  };
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

function buildCategoryHeroImagePaths(category: CategoryConfig) {
  return [0, 1, 2, 3].map(
    (index) => `${category.storageKey}/${category.storageKey}${index === 0 ? "" : index}.png`,
  );
}

function buildViewerPath(displayPath: string, imageName?: string) {
  const encodedPath = displayPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const params = new URLSearchParams();
  if (imageName) params.set("image", imageName);

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
        className="group relative flex aspect-[5/4] w-full items-center justify-center overflow-hidden rounded-sm border border-border bg-background/70 transition-all duration-300 hover:border-primary hover:shadow-[0_0_0_2px_rgba(249,115,22,0.8)]"
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
      className="group relative w-full overflow-hidden rounded-sm border border-border bg-background/70 shadow-xl shadow-black/20 transition-all duration-300 hover:border-primary hover:shadow-[0_0_0_2px_rgba(249,115,22,0.85)] focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(249,115,22,0.85)]"
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
  onFocus,
  onChange,
  onSuggestionClick,
  renderHighlightedPath,
}: {
  title: string;
  description: string;
  value: string;
  loading: boolean;
  suggestions: FolderItem[];
  placeholder: string;
  onFocus: () => void;
  onChange: (value: string) => void;
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
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <input
            type="text"
            value={value}
            onFocus={onFocus}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="h-12 w-full rounded-sm border border-primary/40 bg-background/90 pl-11 pr-4 font-sans-tech text-sm text-foreground shadow-lg shadow-primary/10 placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
          )}
        </div>

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
                          ? "border-success/25 bg-success/10 text-success"
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

export default function DataViewer() {
  const location = useLocation();
  const navigate = useNavigate();

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
  const [visibleTags, setVisibleTags] = useState<Set<string>>(new Set());
  const [vlmPromptGroups, setVlmPromptGroups] = useState<VlmPromptGroup[]>([]);
  const [visiblePrimitives, setVisiblePrimitives] = useState<Set<string>>(new Set());
  const [frameRange, setFrameRange] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  });
  const [pathSearchText, setPathSearchText] = useState("");
  const [allFolderPaths, setAllFolderPaths] = useState<FolderItem[]>([]);
  const [pathSearchLoading, setPathSearchLoading] = useState(false);
  const [pathSearchTouched, setPathSearchTouched] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const pathSegments = useMemo(
    () => location.pathname.split("/").filter((part) => part && part !== "viewer"),
    [location.pathname],
  );

  const currentDisplayPath = useMemo(() => {
    if (pathSegments.length === 1 && pathSegments[0] === LEGACY_SEARCH_PAGE_SEGMENT) {
      return "";
    }
    return pathSegments.join("/");
  }, [pathSegments]);

  const currentBackendPath = useMemo(
    () => resolveDisplayPathToBackendPath(currentDisplayPath),
    [currentDisplayPath],
  );

  const activeCategory = useMemo(() => getCategoryByRouteKey(pathSegments[0]), [pathSegments]);
  const imageQueryParam = useMemo(
    () => new URLSearchParams(location.search).get("image")?.trim() ?? "",
    [location.search],
  );

  const isLegacySearchPage =
    pathSegments.length === 1 && pathSegments[0] === LEGACY_SEARCH_PAGE_SEGMENT;
  const isRootLanding = currentDisplayPath === "" || isLegacySearchPage;
  const isCategoryLanding = !!activeCategory && pathSegments.length === 1 && !isLegacySearchPage;

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentPath() {
      setLoading(true);
      setFolderDropdownOpen(null);

      try {
        if (isRootLanding) {
          if (!cancelled) {
            setFolders([]);
            setImages([]);
            setAvailableTags([]);
            setVlmPromptGroups([]);
          }
          return;
        }

        const folderResponse = await axios.get<unknown[]>("/api/datasets", {
          params: { path: currentBackendPath },
        });

        const nextFolders = uniqueFolderItems(
          normalizeFolderPathResults(folderResponse.data)
            .map(mapFolderItemToDisplayPath)
            .sort((a, b) => a.name.localeCompare(b.name)),
        );

        if (cancelled) return;

        setFolders(nextFolders);

        if (nextFolders.length > 0) {
          setImages([]);
          setAvailableTags([]);
          setVlmPromptGroups([]);
          return;
        }

        const encodedPath = currentBackendPath
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
  }, [currentBackendPath, isRootLanding, reloadTick]);

  useEffect(() => {
    if (!pathSearchTouched || allFolderPaths.length > 0) return;

    let cancelled = false;

    async function loadAllPaths() {
      setPathSearchLoading(true);
      try {
        const response = await axios.get<unknown[]>("/api/dataset-paths");
        if (cancelled) return;

        const nextPaths = uniqueFolderItems(
          normalizeFolderPathResults(response.data)
            .map(mapFolderItemToDisplayPath)
            .sort((a, b) => a.full_path.localeCompare(b.full_path)),
        );

        setAllFolderPaths(nextPaths);
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
  }, [pathSearchTouched, allFolderPaths.length]);

  useEffect(() => {
    if (!imageQueryParam || images.length === 0) return;

    const decoded = decodeURIComponent(imageQueryParam);
    const match = images.find((image) => image.name === decoded || image.id.endsWith(decoded));
    if (match) {
      setSelectedImage(match);
    }
  }, [imageQueryParam, images]);

  const isLeaf = useMemo(
    () => !isRootLanding && !isCategoryLanding && folders.length === 0,
    [folders.length, isCategoryLanding, isRootLanding],
  );

  const allSelectableTags = useMemo(
    () => [...availableTags, ...vlmPromptGroups.flatMap((group) => group.tags)].sort((a, b) =>
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

      const matchesMinFrame = frameRange.min == null || frameId == null || frameId >= frameRange.min;
      const matchesMaxFrame = frameRange.max == null || frameId == null || frameId <= frameRange.max;

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
        return item.full_path === scopedPrefix || item.full_path.startsWith(`${scopedPrefix}/`);
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

  function handleShowcaseImageClick(item: ShowcaseImageConfig) {
    const displayPath = mapRawPathToDisplayPath(item.targetFolderPath);
    navigate(buildViewerPath(displayPath, item.targetImageName));
  }

  function scrollToSubdirectories() {
    const section = document.getElementById("category-subdirectories");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleDeleteFolder() {
    if (!deleteModalFolder) return;

    setDeleteInProgress(true);
    try {
      await axios.post("/api/delete_dataset", {
        path: resolveDisplayPathToBackendPath(deleteModalFolder.full_path),
      });
      setDeleteModalFolder(null);
      setFolders((previous) =>
        previous.filter((folder) => folder.full_path !== deleteModalFolder.full_path),
      );
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

    return (
      <div className="font-sans-tech text-sm text-foreground">
        {segments.map((segment, index) => {
          const isHighlighted = terms.some((term) => segment.toLowerCase().includes(term));
          return (
            <span key={`${segment}-${index}`}>
              <span className={isHighlighted ? "text-primary" : ""}>{segment}</span>
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
        {items.map((folder) => (
          <div
            key={folder.full_path}
            className="group relative cursor-pointer overflow-hidden rounded-sm border border-border bg-card/15 p-6 transition-all duration-300 hover:border-primary hover:bg-card/25 hover:shadow-2xl hover:shadow-black/10"
            onClick={() => navigate(buildViewerPath(folder.full_path))}
          >
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

            <div className="absolute left-0 top-0 h-3 w-3 border-l border-t border-border transition-colors group-hover:border-primary" />
            <div className="absolute right-0 top-0 h-3 w-3 border-r border-t border-border transition-colors group-hover:border-primary" />
            <div className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-border transition-colors group-hover:border-primary" />
            <div className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-border transition-colors group-hover:border-primary" />

            <div className="relative z-10 flex flex-col items-center gap-6">
              <div className="h-44 w-full overflow-hidden rounded-sm border border-border bg-background/50 transition-all group-hover:border-primary/30 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                <DatasetFolderCover
                  key={folder.full_path}
                  fullPath={folder.source_path ?? resolveDisplayPathToBackendPath(folder.full_path)}
                  FallbackIcon={Folder}
                  className="flex h-full w-full items-center justify-center"
                  imgClassName="h-full w-full object-cover"
                  iconClassName="h-16 w-16 text-muted-foreground transition-colors group-hover:text-primary"
                />
              </div>
              <span className="w-full break-words text-center font-sans-tech text-lg font-bold uppercase tracking-wider text-foreground transition-colors group-hover:text-primary">
                {folder.name}
              </span>
            </div>
          </div>
        ))}

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
    <div className="mx-auto w-full max-w-7xl px-6 py-14 md:py-18">
      <RoboDataHubTopMenu activeItem="home" />

      <div className="mt-8 min-w-0">
        <div className="mb-8 max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1 font-sans-tech text-xs uppercase tracking-[0.24em] text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            RoboDataHub
          </div>
          <h1 className="mb-4 font-sans-tech text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            RoboDataHub
          </h1>
          <p className="max-w-3xl font-sans-tech text-sm leading-relaxed text-muted-foreground md:text-base">
            Search across the full data library for a quick shortcut, or browse featured
            categories below through presentation-ready examples that open directly in the
            viewer.
          </p>
        </div>

        <PathSearchPanel
          title="Global search"
          description="Use search to jump straight to a folder path when you already know what you want. It is the fastest way to navigate the full RoboDataHub without clicking through multiple pages."
          value={pathSearchText}
          loading={pathSearchLoading}
          suggestions={pathSuggestions}
          placeholder="Search any folder or path, e.g. BMW or carAutomation/BMW/frontGrille"
          onFocus={() => setPathSearchTouched(true)}
          onChange={(value) => {
            setPathSearchTouched(true);
            setPathSearchText(value);
          }}
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
    <div className="mx-auto w-full max-w-7xl px-6 py-14">
      <RoboDataHubTopMenu activeItem={category.routeKey} />

      <div className="mt-8 min-w-0">
        <div className="grid grid-cols-1 items-center gap-8 rounded-sm border border-border bg-gradient-to-br from-card/30 via-background/70 to-primary/5 p-8 shadow-2xl shadow-black/10 xl:grid-cols-[1.05fr_1fr] xl:gap-12 md:p-10">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1 font-sans-tech text-xs uppercase tracking-[0.24em] text-primary">
              Category
            </div>
            <h1 className="mb-5 font-sans-tech text-4xl font-bold tracking-tight text-foreground md:text-5xl">
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
            onFocus={() => setPathSearchTouched(true)}
            onChange={(value) => {
              setPathSearchTouched(true);
              setPathSearchText(value);
            }}
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
    <div className="relative flex h-screen flex-col overflow-hidden bg-background font-sans-tech text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.05]" />
      <Navigation />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden pt-16">
        <div className="z-20 flex h-12 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
          <div className="flex items-center gap-4">
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
          <div className="flex items-center gap-6 font-sans-tech text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-2 text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              Live Connection
            </span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
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
            <div className="flex h-10 items-center justify-between border-b border-border bg-card/10 px-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center rounded-sm border border-border bg-card px-2 py-1 text-xs">
                  <span className="mr-2 font-sans-tech text-muted-foreground">Items:</span>
                  <span className="font-sans-tech text-foreground">{itemCount}</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <button
                  onClick={() => window.location.reload()}
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
                  <div className="p-8">
                    {pathSegments.length > 0 && (
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
        </div>

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
