import { useEffect, useMemo, useState } from "react";
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
  routeKey: string;
  label: string;
  description: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    routeKey: "carAutomation",
    label: "Car Automation",
    description: "Assembly, inspection, and production data for automotive robotics workflows.",
  },
  {
    routeKey: "serverrack",
    label: "Serverrack",
    description: "Rack operations, maintenance, and data-center handling datasets.",
  },
  {
    routeKey: "dexterity",
    label: "Dexterity",
    description: "Fine-motor manipulation and embodied task datasets across practical scenarios.",
  },
  {
    routeKey: "warehouse",
    label: "Warehouse",
    description: "Logistics, picking, handling, and storage-operation data for robotic movement.",
  },
];

function buildViewerPath(fullPath: string) {
  return `/viewer/${fullPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
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

function DashboardHero({ onPrivateClick, showAdmin, onAdminClick }: { onPrivateClick: () => void; showAdmin: boolean; onAdminClick: () => void }) {
  return (
    <div className="mb-10 grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
      <div className="rounded-sm border border-border bg-gradient-to-br from-card/30 via-background/80 to-primary/5 p-8 shadow-2xl shadow-black/10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1 font-sans-tech text-xs uppercase tracking-[0.24em] text-primary">
          RoboDataHub
        </div>
        <h1 className="font-sans-tech text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Browse shared and private robotics data
        </h1>
        <p className="mt-4 max-w-2xl font-sans-tech text-sm leading-relaxed text-muted-foreground md:text-base">
          Public datasets stay available to any signed-in account, while uploads and derived assets
          can remain private to the owner. Use the verticals below for shared data, or jump into
          your private workspace.
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CATEGORIES.map((category) => (
          <Link
            key={category.routeKey}
            to={`/viewer/${category.routeKey}`}
            className="group rounded-sm border border-border bg-card/20 p-5 transition-all hover:border-primary/40 hover:bg-card/30 hover:shadow-elegant"
          >
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-sm border border-primary/20 bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="font-sans-tech text-lg font-bold text-foreground group-hover:text-primary">
              {category.label}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{category.description}</p>
          </Link>
        ))}
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
    if (!imageQueryParam || images.length === 0) return;
    const decoded = decodeURIComponent(imageQueryParam);
    const match = images.find((image) => image.name === decoded || image.id.endsWith(decoded));
    if (match) setSelectedImage(match);
  }, [imageQueryParam, images]);

  const isLeaf = useMemo(
    () => isAuthenticated && isApproved && !isRootLanding && !isCategoryLanding && folders.length === 0,
    [folders.length, isAuthenticated, isApproved, isRootLanding, isCategoryLanding],
  );

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

  const renderCategoryLanding = (category: CategoryConfig) => (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-6 md:py-16">
      <div className="rounded-sm border border-border bg-gradient-to-br from-card/30 via-background/70 to-primary/5 p-6 shadow-2xl shadow-black/10 md:p-8">
        <div className="mb-5 inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1 font-sans-tech text-xs uppercase tracking-[0.24em] text-primary">
          Category
        </div>
        <h1 className="mb-5 font-sans-tech text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {category.label}
        </h1>
        <p className="max-w-2xl font-sans-tech text-sm leading-relaxed text-muted-foreground md:text-base">
          {category.description}
        </p>
      </div>

      <div className="pt-12">
        <div className="mx-auto mb-6 flex max-w-6xl items-center gap-2">
          <div className="h-4 w-1 bg-primary" />
          <h2 className="font-sans-tech text-lg font-bold uppercase tracking-widest text-muted-foreground">
            {category.label} Subdirectories
          </h2>
        </div>
        {renderFolderGrid(folders, "max-w-6xl")}
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
                    <span className="font-sans-tech text-foreground">
                      {isLeaf ? filteredImages.length : folders.length}
                    </span>
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

                {isRootLanding && (
                  <div className="mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-6 md:py-16">
                    <DashboardHero
                      onPrivateClick={() => navigate("/viewer/my")}
                      showAdmin={user?.role === "admin"}
                      onAdminClick={() => navigate(`/viewer/admin/${user?.storageSlug || ""}`)}
                    />
                  </div>
                )}

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
                      {renderFolderGrid(folders, "max-w-5xl")}
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
