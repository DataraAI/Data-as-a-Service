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
  LockKeyhole,
  Shield,
} from "lucide-react";
import { Sidebar } from "../components/Sidebar";
import { UploadModal } from "../components/UploadModal";
import { ImageGrid } from "../components/ImageGrid";
import { ImageModal } from "../components/ImageModal";
import Navigation from "../components/Navigation";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { DatasetFolderCover } from "../components/DatasetFolderCover";
import { frontPageImageUrl } from "@/lib/datasetFolderCover";
import AuthRequiredState from "@/components/AuthRequiredState";
import { useAuth } from "@/auth/useAuth";

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
  vlm?: {
    last_prompt_label?: string | null;
    runs?: Record<string, VlmRun>;
  };
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

interface CategoryConfig {
  routeKey: CategoryKey;
  storageKey: StorageKey;
  label: string;
  description: string;
  helperText: string;
}

interface ShowcaseImageConfig {
  previewBlobPath: string;
  targetFolderPath: string;
  targetImageName: string;
  alt: string;
}

type CategoryKey = "carAutomation" | "serverrack" | "dexterity" | "warehouse";
type StorageKey = "carAutomation" | "serverrack" | "humanoid" | "warehouse";

const CATEGORIES: readonly CategoryConfig[] = [
  {
    routeKey: "carAutomation",
    storageKey: "carAutomation",
    label: "Car Automation",
    description: "Assembly, inspection, and vehicle-production data for robotics workflows across automotive environments.",
    helperText:
      "Browse this category to explore automotive data collections through the same polished landing flow from design_ideas, then drill down into the shared datasets that are available to signed-in users.",
  },
  {
    routeKey: "serverrack",
    storageKey: "serverrack",
    label: "Serverrack",
    description: "Data-center interaction, port-level operation, and maintenance-focused datasets for rack and cabling tasks.",
    helperText:
      "Start here for server-rack workflows, then move into the folder grid below to open the catalogued datasets now visible through the auth-aware viewer.",
  },
  {
    routeKey: "dexterity",
    storageKey: "humanoid",
    label: "Dexterity",
    description: "Fine-motor manipulation and embodied task data for dexterous robotic systems operating across practical, object-centric scenarios.",
    helperText:
      "This vertical brings together dexterity-related manipulation datasets, including legacy humanoid, peeling, and washing-machine flows migrated into the shared catalog.",
  },
  {
    routeKey: "warehouse",
    storageKey: "warehouse",
    label: "Warehouse",
    description: "Logistics, handling, and storage-operation data for robotic movement, picking, and material flow.",
    helperText:
      "Use the warehouse section to browse navigation and handling datasets with the same presentation-first layout used on the stronger design_ideas branch.",
  },
 ] as const;

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
      targetFolderPath: "dexterity/peeling/peas",
      targetImageName: "peas_0123.png",
      alt: "Dexterity peeling example one",
    },
    {
      previewBlobPath: "humanoid/humanoid5.png",
      targetFolderPath: "dexterity/peeling/peas",
      targetImageName: "peas_0344.png",
      alt: "Dexterity peeling example two",
    },
    {
      previewBlobPath: "humanoid/humanoid6.png",
      targetFolderPath: "dexterity/Awign/washingMachine",
      targetImageName: "washingMachine_0077.png",
      alt: "Dexterity washing machine example one",
    },
    {
      previewBlobPath: "humanoid/humanoid7.png",
      targetFolderPath: "dexterity/Awign/washingMachine",
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

function buildViewerPath(fullPath: string, imageName?: string) {
  const encodedPath = fullPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const params = new URLSearchParams();
  if (imageName) params.set("image", imageName);
  const query = params.toString();
  return `/viewer/${encodedPath}${query ? `?${query}` : ""}`;
}

function normalizeFolderResults(payload: unknown): FolderItem[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as FolderItem;
      if (!record.full_path) return null;
      return {
        name: record.name || record.full_path.split("/").filter(Boolean).pop() || record.full_path,
        full_path: record.full_path,
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

function buildCategoryHeroImagePaths(category: CategoryConfig) {
  return [0, 1, 2, 3].map(
    (index) => `${category.storageKey}/${category.storageKey}${index === 0 ? "" : index}.png`,
  );
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
  onChange,
  onClear,
}: {
  title: string;
  description: string;
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-sm border border-border bg-card/20 p-6 shadow-xl shadow-black/10 md:p-8">
      <div className="max-w-3xl">
        <h3 className="mb-2 font-sans-tech text-2xl font-bold text-foreground">{title}</h3>
        <p className="font-sans-tech text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="relative mt-6 w-full">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Filter visible folders on this page"
          className="h-12 w-full rounded-sm border border-primary/40 bg-background/90 pl-11 pr-24 font-sans-tech text-sm text-foreground shadow-lg shadow-primary/10 placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {value.trim() && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-sm border border-border px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              Clear
            </button>
          )}
        </div>
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
            A top-level navigation rail for moving across RoboDataHub without relying on the left sidebar on landing pages.
          </p>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {menuItems.map((item, index) => {
              const isActive = activeItem === item.key;
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  className={`group relative flex min-h-[120px] w-[220px] flex-col justify-between rounded-[22px] border p-4 transition-all duration-300 ${
                    isActive
                      ? "border-primary/60 bg-primary/12 shadow-[0_0_0_1px_rgba(31,209,107,0.28)]"
                      : "border-border bg-background/55 hover:border-primary/35 hover:bg-card/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-mono-tech text-[11px] uppercase tracking-[0.2em] text-primary/80">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    {isActive && (
                      <div className="rounded-full border border-primary/50 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-primary">
                        Active
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="font-sans-tech text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                      {item.label}
                    </div>
                    <p className="line-clamp-3 text-sm leading-5 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardHero({ onPrivateClick, showAdmin, onAdminClick }: { onPrivateClick: () => void; showAdmin: boolean; onAdminClick: () => void }) {
  return (
    <div className="rounded-sm border border-border bg-gradient-to-br from-card/30 via-background/80 to-primary/5 p-6 shadow-2xl shadow-black/10 md:p-8">
      <div className="mb-4 inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1 font-sans-tech text-xs uppercase tracking-[0.24em] text-primary">
        Signed-In Workspace
      </div>
      <h1 className="font-sans-tech text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Browse shared and private robotics data
      </h1>
      <p className="mt-4 max-w-3xl font-sans-tech text-sm leading-relaxed text-muted-foreground md:text-base">
        Public datasets stay available to any signed-in account, while uploads and derived assets can remain private to the owner. Use the shared verticals below, or jump straight into your private workspace.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onPrivateClick}
          className="inline-flex h-11 items-center gap-2 rounded-sm border border-primary/30 bg-primary px-5 font-sans-tech text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-glow"
        >
          My private data
          <ArrowRight className="h-4 w-4" />
        </button>
        {showAdmin && (
          <button
            type="button"
            onClick={onAdminClick}
            className="inline-flex h-11 items-center gap-2 rounded-sm border border-border bg-background/80 px-5 font-sans-tech text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            Admin access
            <Shield className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
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
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{category.description}</p>
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
  const [landingSearchText, setLandingSearchText] = useState("");
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
  const [reloadTick, setReloadTick] = useState(0);

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
        ? CATEGORIES.find((category) => category.routeKey === pathSegments[0]) ?? null
        : null,
    [pathSegments],
  );

  const isRootLanding = pathSegments.length === 0;
  const isCategoryLanding = Boolean(activeCategory) && pathSegments.length === 1;

  useEffect(() => {
    if (!isAuthenticated || !isApproved || isRootLanding) {
      setLoading(false);
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
        const allTags = Array.from(new Set(nextImages.flatMap((image) => image.tags ?? []).filter(Boolean)));
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
        if (!cancelled) setLoading(false);
      }
    }

    void loadCurrentPath();
    return () => {
      cancelled = true;
    };
  }, [currentDisplayPath, isAuthenticated, isApproved, isRootLanding, isCategoryLanding, reloadTick]);

  useEffect(() => {
    setLandingSearchText("");
  }, [currentDisplayPath]);

  useEffect(() => {
    if (!imageQueryParam || images.length === 0) return;
    const decoded = decodeURIComponent(imageQueryParam);
    const match = images.find((image) => image.name === decoded || image.id.endsWith(decoded));
    if (match) setSelectedImage(match);
  }, [imageQueryParam, images]);

  const isLeaf = useMemo(
    () => isAuthenticated && isApproved && !isRootLanding && !isCategoryLanding && folders.length === 0,
    [folders.length, isAuthenticated, isApproved, isRootLanding, isCategoryLanding],
  );

  const normalizedLandingSearch = useMemo(() => landingSearchText.trim().toLowerCase(), [landingSearchText]);

  const filteredRootCategories = useMemo(() => {
    if (!normalizedLandingSearch) return CATEGORIES;
    return CATEGORIES.filter((category) =>
      [category.label, category.description, category.helperText]
        .join(" ")
        .toLowerCase()
        .includes(normalizedLandingSearch),
    );
  }, [normalizedLandingSearch]);

  const filteredFolders = useMemo(() => {
    if (!normalizedLandingSearch) return folders;
    return folders.filter((folder) =>
      [folder.name, folder.full_path, folder.owner_slug, folder.visibility]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedLandingSearch),
    );
  }, [folders, normalizedLandingSearch]);

  const allSelectableTags = useMemo(
    () => [...availableTags, ...vlmPromptGroups.flatMap((group) => group.tags)].sort((a, b) => a.localeCompare(b)),
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

  function handleShowcaseImageClick(item: ShowcaseImageConfig) {
    navigate(buildViewerPath(item.targetFolderPath, item.targetImageName));
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
    if (!normalizedLandingSearch) {
      return fullPath;
    }

    const segments = fullPath.split("/").filter(Boolean);
    return (
      <>
        {segments.map((segment, index) => {
          const lower = segment.toLowerCase();
          const matchIndex = lower.indexOf(normalizedLandingSearch);
          const prefix = matchIndex >= 0 ? segment.slice(0, matchIndex) : segment;
          const matched =
            matchIndex >= 0 ? segment.slice(matchIndex, matchIndex + normalizedLandingSearch.length) : "";
          const suffix =
            matchIndex >= 0 ? segment.slice(matchIndex + normalizedLandingSearch.length) : "";

          return (
            <span key={`${segment}-${index}`}>
              {index > 0 && <span className="px-1 text-muted-foreground/60">/</span>}
              {prefix}
              {matched && <span className="rounded-sm bg-primary/15 px-0.5 text-primary">{matched}</span>}
              {suffix}
            </span>
          );
        })}
      </>
    );
  }

  function renderFolderGrid(items: FolderItem[], maxWidthClassName: string) {
    return (
      <div className={`mx-auto grid w-full grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 ${maxWidthClassName}`}>
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
                    {renderHighlightedPath(folder.name)}
                  </span>
                  <p className="mt-2 break-all text-[11px] text-muted-foreground">{renderHighlightedPath(folder.full_path)}</p>
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

      <div className="mt-8 min-w-0 space-y-8">
        <DashboardHero
          onPrivateClick={() => navigate("/viewer/my")}
          showAdmin={user?.role === "admin"}
          onAdminClick={() => navigate(`/viewer/admin/${user?.storageSlug || ""}`)}
        />

        <PathSearchPanel
          title="Browse faster"
          description="Filter the featured RoboDataHub verticals on this page while keeping the richer design_ideas presentation."
          value={landingSearchText}
          loading={loading}
          onChange={setLandingSearchText}
          onClear={() => setLandingSearchText("")}
        />

        <div className="flex flex-col gap-8">
          {filteredRootCategories.map((category) => (
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
                      key={`${category.routeKey}-${item.previewBlobPath}`}
                      blobPath={item.previewBlobPath}
                      alt={item.alt}
                      onClick={() => handleShowcaseImageClick(item)}
                    />
                  ))}
                </div>
              </div>
            </section>
          ))}

          {filteredRootCategories.length === 0 && (
            <div className="rounded-sm border border-dashed border-border bg-card/10 py-20 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="font-sans-tech text-lg">No verticals matched this filter</p>
            </div>
          )}
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
            title={`Filter ${category.label}`}
            description="Filter the visible folder cards in this vertical without leaving the landing page."
            value={landingSearchText}
            loading={loading}
            onChange={setLandingSearchText}
            onClear={() => setLandingSearchText("")}
          />
        </div>
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
            <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-10 sm:px-6">
              <AuthRequiredState description="Sign in before viewing dataset contents. Public datasets stay available to signed-in users only." />
            </div>
          )
        ) : !isApproved ? (
          <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-10 sm:px-6">
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
        )}

        {selectedImage && (
          <ImageModal
            image={selectedImage}
            onClose={() => setSelectedImage(null)}
            onNext={() => {
              const index = filteredImages.indexOf(selectedImage);
              if (index < filteredImages.length - 1) setSelectedImage(filteredImages[index + 1]);
            }}
            onPrev={() => {
              const index = filteredImages.indexOf(selectedImage);
              if (index > 0) setSelectedImage(filteredImages[index - 1]);
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
                Delete dataset?
              </h3>
              <p className="mb-1 font-sans-tech text-sm text-muted-foreground">
                You are about to delete{" "}
                <span className="font-medium text-foreground">{deleteModalFolder.full_path}</span> and
                all of its contents.
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
