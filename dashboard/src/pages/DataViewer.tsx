import { useAuth } from "@/auth/useAuth";
import AuthRequiredState from "@/components/AuthRequiredState";
import { buildAuthPath } from "@/lib/authLinks";
import { getLocalFolderPreviewSnapshots } from "@/lib/datasetFolderCover";
import type {
  CategoryConfig,
  CategoryDatasetPreview,
  CategoryKey,
  DatasetAsset,
  DatasetManifest,
  FolderItem,
  ImageItem,
  VlmPromptGroup,
} from "@/lib/dataViewerTypes";
import {
  buildCategoryLandingPath,
  buildLocalPlaceholderPreview,
  buildViewerPath,
  canonicalizeDatasetPathForRoute,
  CATEGORIES,
  CATEGORY_LANDING_CONTENT,
  getBestMatchingSegmentIndex,
  getCatalogFilterTargetSectionId,
  getCategoryByRouteKey,
  getPathSearchTerms,
  getSuggestionScore,
  groupVlmPromptTags,
  isExcludedDatasetPath,
  normalizeCategoryValue,
  normalizeFolderResults,
  normalizePathSearchValue,
  parseFrameIdValue,
  pathBelongsToCategory,
  resolveCatalogSectionsForCategory,
  uniqueFolderItems,
  withViewerBase,
} from "@/lib/dataViewerUtils";
import { ROOT_SHOWCASE_SECTIONS } from "@/lib/roboDataHubCatalog";
import axios from "axios";
import {
  AlertCircle,
  Folder,
  Loader2,
  MoreVertical,
  RefreshCw,
  Terminal,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { CategoryLanding } from "../components/CategoryLanding";
import { DatasetLanding } from "../components/DatasetLanding";
import { DatasetFolderCover } from "../components/DatasetFolderCover";
import FooterSection from "../components/FooterSection";
import { ImageGrid } from "../components/ImageGrid";
import { ImageModal } from "../components/ImageModal";
import { MaskGenerationPanel } from "../components/MaskGenerationPanel";
import Navigation from "../components/Navigation";
import { RootLanding } from "../components/RootLanding";
import { Sidebar } from "../components/Sidebar";
import { UploadModal } from "../components/UploadModal";

const pathSearchCache = new Map<string, FolderItem[]>();
const pathSearchRequestCache = new Map<string, Promise<FolderItem[]>>();

function loadSearchPaths(cacheKey: string, category?: CategoryKey | null) {
  const cachedPaths = pathSearchCache.get(cacheKey);
  if (cachedPaths) {
    return Promise.resolve(cachedPaths);
  }

  const pendingRequest = pathSearchRequestCache.get(cacheKey);
  if (pendingRequest) {
    return pendingRequest;
  }

  const params = category
    ? new URLSearchParams({ category, public_only: "true" })
    : null;
  const requestUrl = params ? `/api/dataset-paths?${params.toString()}` : "/api/dataset-paths";
  const requestInit = {
    credentials: "same-origin",
    priority: "low",
  } as RequestInit & { priority: "low" };

  const request = fetch(requestUrl, requestInit)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load dataset paths (${response.status})`);
      }
      return response.json() as Promise<unknown[]>;
    })
    .then((payload) =>
      uniqueFolderItems(
        normalizeFolderResults(payload).sort((a, b) => a.full_path.localeCompare(b.full_path)),
      ),
    )
    .then((paths) => {
      pathSearchCache.set(cacheKey, paths);
      return paths;
    })
    .finally(() => {
      pathSearchRequestCache.delete(cacheKey);
    });

  pathSearchRequestCache.set(cacheKey, request);
  return request;
}

function isDatasetRoutePath(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "my") return parts.length === 4;
  if (parts[0] === "admin") return parts.length === 5;
  return parts.length === 2;
}

export default function DataViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading: authLoading, isAuthenticated, isApproved, user } = useAuth();
  const viewerBasePath = useMemo(
    () => (location.pathname.startsWith("/robodatahub") ? "/robodatahub" : "/viewer"),
    [location.pathname],
  );
  const authRedirectPath = useMemo(
    () => buildAuthPath("login", `${location.pathname}${location.search}`),
    [location.pathname, location.search],
  );
  const canUseLockedViewerLayout = isAuthenticated && isApproved;
  const canUseCatalogSearch = isAuthenticated && isApproved;
  const canManageDatasets =
    isAuthenticated && isApproved && (user?.role === "admin" || user?.role === "analyst");
  const canDeleteDatasets = isAuthenticated && isApproved && user?.role === "admin";

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [categoryPreviews, setCategoryPreviews] = useState<CategoryDatasetPreview[]>([]);
  const [loadedCategoryPreviewKey, setLoadedCategoryPreviewKey] = useState<CategoryKey | null>(null);
  const [categoryPreviewsLoading, setCategoryPreviewsLoading] = useState(false);
  const [rootCategoryPreviews, setRootCategoryPreviews] = useState<
    Partial<Record<CategoryKey, CategoryDatasetPreview[]>>
  >({});
  const [visibleRootSectionKeys, setVisibleRootSectionKeys] = useState<
    Partial<Record<CategoryKey, boolean>>
  >({});
  const [images, setImages] = useState<ImageItem[]>([]);
  const [datasetManifest, setDatasetManifest] = useState<DatasetManifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [folderDropdownOpen, setFolderDropdownOpen] = useState<string | null>(null);
  const [deleteModalFolder, setDeleteModalFolder] = useState<FolderItem | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteAssetTarget, setDeleteAssetTarget] = useState<
    { label: string; blobPath?: string; sectionKey?: string } | null
  >(null);
  const [deleteAssetInProgress, setDeleteAssetInProgress] = useState(false);
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
  const [pathSearchPrimed, setPathSearchPrimed] = useState(false);
  const [pathSearchTouched, setPathSearchTouched] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [activeLandingFilterId, setActiveLandingFilterId] = useState("all");
  const rootSectionRefs = useRef<Partial<Record<CategoryKey, HTMLElement | null>>>({});
  const rootPreviewLoadingKeysRef = useRef<Set<CategoryKey>>(new Set());
  const sectionAnchorRefs = useRef<Record<string, HTMLElement | null>>({});
  const landingTopRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const previousPathSearchReloadTickRef = useRef(reloadTick);

  useEffect(() => {
    if (!folderDropdownOpen) return;
    const handler = () => setFolderDropdownOpen(null);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [folderDropdownOpen]);

  const pathSegments = useMemo(
    () =>
      location.pathname
        .split("/")
        .filter((part) => part && part !== "viewer" && part !== "robodatahub"),
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
  const activeLandingContent = useMemo(
    () => (activeCategory ? CATEGORY_LANDING_CONTENT[activeCategory.routeKey] : null),
    [activeCategory],
  );
  const localCategoryPreviewPlaceholdersByRoute = useMemo(() => {
    const snapshots = getLocalFolderPreviewSnapshots();
    return CATEGORIES.reduce(
      (acc, category) => {
        acc[category.routeKey] = snapshots
          .filter(
            (snapshot) =>
              normalizeCategoryValue(snapshot.category) ===
              normalizeCategoryValue(category.previewKey),
          )
          .map((snapshot) =>
            buildLocalPlaceholderPreview(
              snapshot,
              viewerBasePath,
              canonicalizeDatasetPathForRoute(snapshot.fullPath, category.routeKey),
            ),
          )
          .filter((item): item is CategoryDatasetPreview => Boolean(item))
          .filter((item) => !isExcludedDatasetPath(item.full_path));
        return acc;
      },
      {} as Record<CategoryKey, CategoryDatasetPreview[]>,
    );
  }, [viewerBasePath]);
  const localCategoryPreviewPlaceholders = activeCategory
    ? localCategoryPreviewPlaceholdersByRoute[activeCategory.routeKey] ?? []
    : [];
  const activeCategoryPreviews = useMemo(() => {
    if (!activeCategory || loadedCategoryPreviewKey !== activeCategory.routeKey) return [];
    return categoryPreviews;
  }, [activeCategory, categoryPreviews, loadedCategoryPreviewKey]);
  const resolvedCategorySections = useMemo(() => {
    if (!activeCategory || !activeLandingContent) return [];
    return resolveCatalogSectionsForCategory(
      activeCategory.routeKey,
      activeLandingContent,
      activeCategoryPreviews,
      localCategoryPreviewPlaceholders,
    );
  }, [activeCategory, activeLandingContent, activeCategoryPreviews, localCategoryPreviewPlaceholders]);
  const rootResolvedShowcaseSections = useMemo(() => {
    return ROOT_SHOWCASE_SECTIONS.map((section) => {
      const landingContent = CATEGORY_LANDING_CONTENT[section.routeKey];
      const categoryPreviewsForRoute = rootCategoryPreviews[section.routeKey] ?? [];
      const placeholdersForRoute = localCategoryPreviewPlaceholdersByRoute[section.routeKey] ?? [];
      const resolvedSections = resolveCatalogSectionsForCategory(
        section.routeKey,
        landingContent,
        categoryPreviewsForRoute,
        placeholdersForRoute,
      );
      const flattenedEntries = resolvedSections.flatMap((resolvedSection) => resolvedSection.cards);
      const realBackedEntries = flattenedEntries.filter(
        (entry) => entry.liveItem || entry.placeholderItem,
      );
      const marketingEntries = flattenedEntries.filter(
        (entry) => !entry.liveItem && !entry.placeholderItem,
      );
      const cards =
        realBackedEntries.length >= 4
          ? realBackedEntries.slice(0, 4)
          : [...realBackedEntries, ...marketingEntries.slice(0, 4 - realBackedEntries.length)];

      return { ...section, cards };
    });
  }, [localCategoryPreviewPlaceholdersByRoute, rootCategoryPreviews]);

  const pathSearchScopeKey = activeCategory?.routeKey ?? "global";
  const pathSearchCacheKey = `${user?.id ?? "guest"}:${pathSearchScopeKey}`;

  const isRootLanding = pathSegments.length === 0;
  const isCategoryLanding = Boolean(activeCategory) && pathSegments.length === 1;
  const isCatalogLanding = isRootLanding || isCategoryLanding;
  const datasetRootDepth = useMemo(() => {
    if (pathSegments[0] === "my") return 4;
    if (pathSegments[0] === "admin") return 5;
    return 2;
  }, [pathSegments]);
  const isDatasetRoot = useMemo(
    () =>
      isAuthenticated &&
      isApproved &&
      !isCatalogLanding &&
      pathSegments.length === datasetRootDepth,
    [datasetRootDepth, isApproved, isAuthenticated, isCatalogLanding, pathSegments.length],
  );
  const showCatalogFooter = isRootLanding;
  const visibleRootRouteKeys = useMemo(
    () =>
      (Object.entries(visibleRootSectionKeys) as [CategoryKey, boolean][])
        .filter(([, isVisible]) => isVisible)
        .map(([routeKey]) => routeKey),
    [visibleRootSectionKeys],
  );
  const initialRootCatalogContentReady = useMemo(() => {
    if (!isRootLanding || visibleRootRouteKeys.length === 0) return false;
    return visibleRootRouteKeys.every((routeKey) => rootCategoryPreviews[routeKey] !== undefined);
  }, [isRootLanding, rootCategoryPreviews, visibleRootRouteKeys]);
  const initialCategoryCatalogContentReady =
    isCategoryLanding &&
    Boolean(activeCategory) &&
    !categoryPreviewsLoading &&
    loadedCategoryPreviewKey === activeCategory.routeKey;

  useEffect(() => {
    setActiveLandingFilterId(activeLandingContent?.filters[0]?.id ?? "all");
    sectionAnchorRefs.current = {};
  }, [activeLandingContent]);

  const handleLandingFilterSelect = (filterId: string) => {
    setActiveLandingFilterId(filterId);

    if (!activeLandingContent || typeof window === "undefined") return;

    const targetSectionId = getCatalogFilterTargetSectionId(activeLandingContent, filterId);
    const targetElement = targetSectionId
      ? sectionAnchorRefs.current[targetSectionId]
      : landingTopRef.current;

    if (!targetElement) return;
    const scrollContainer = contentScrollRef.current;

    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      const nextTop = scrollContainer.scrollTop + (targetRect.top - containerRect.top) - 24;
      scrollContainer.scrollTo({ top: Math.max(nextTop, 0), behavior: "smooth" });
      return;
    }

    const top = targetElement.getBoundingClientRect().top + window.scrollY - 112;
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  };

  useEffect(() => {
    if (!isAuthenticated || !isApproved || isRootLanding || isCategoryLanding) {
      setFolders([]);
      setImages([]);
      setDatasetManifest(null);
      setAvailableTags([]);
      setVlmPromptGroups([]);
      return;
    }

    let cancelled = false;

    async function loadCurrentPath() {
      setLoading(true);
      setFolderDropdownOpen(null);

      try {
        setDatasetManifest(null);
        if (isDatasetRoot) {
          const encodedPath = currentDisplayPath
            .split("/")
            .filter(Boolean)
            .map((segment) => encodeURIComponent(segment))
            .join("/");
          const manifestResponse = await axios.get<DatasetManifest>(
            `/api/dataset-manifest/${encodedPath}`,
          );
          if (cancelled) return;
          setDatasetManifest(manifestResponse.data);
          setFolders([]);
          setImages([]);
          setAvailableTags([]);
          setVlmPromptGroups([]);
          return;
        }

        const folderResponse = await axios.get<unknown[]>("/api/datasets", {
          params: { path: currentDisplayPath },
        });
        const nextFolders = uniqueFolderItems(
          normalizeFolderResults(folderResponse.data)
            .filter((item) => !isExcludedDatasetPath(item.full_path))
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
          setDatasetManifest(null);
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
  }, [
    currentDisplayPath,
    isAuthenticated,
    isApproved,
    isRootLanding,
    isCategoryLanding,
    isDatasetRoot,
    reloadTick,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !isApproved || !isCategoryLanding || !activeCategory) {
      setCategoryPreviews([]);
      setLoadedCategoryPreviewKey(null);
      setCategoryPreviewsLoading(false);
      return;
    }

    let cancelled = false;
    const category = activeCategory;

    async function loadCategoryPreviews() {
      setLoadedCategoryPreviewKey(null);
      setCategoryPreviewsLoading(true);
      try {
        const response = await axios.get<CategoryDatasetPreview[]>(
          "/api/dataset-category-previews",
          { params: { category: category.routeKey, public_only: "true" } },
        );
        if (cancelled) return;
        setCategoryPreviews(
          Array.isArray(response.data)
            ? response.data.filter((item) => !isExcludedDatasetPath(item.full_path))
            : [],
        );
        setLoadedCategoryPreviewKey(category.routeKey);
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
  }, [activeCategory, isAuthenticated, isApproved, isCategoryLanding, reloadTick]);

  useEffect(() => {
    if (!isRootLanding || !isAuthenticated || !isApproved) {
      setRootCategoryPreviews({});
      setVisibleRootSectionKeys({});
      rootPreviewLoadingKeysRef.current.clear();
      return;
    }

    setRootCategoryPreviews({});
    setVisibleRootSectionKeys({});
    rootPreviewLoadingKeysRef.current.clear();
  }, [isAuthenticated, isApproved, isRootLanding, reloadTick]);

  useEffect(() => {
    if (!isRootLanding || !isAuthenticated || !isApproved) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleRootSectionKeys((previous) => {
          let changed = false;
          const next = { ...previous };

          entries.forEach((entry) => {
            const routeKey = (entry.target as HTMLElement).dataset
              .rootCategoryKey as CategoryKey | undefined;
            if (!routeKey || !entry.isIntersecting || next[routeKey]) return;
            next[routeKey] = true;
            changed = true;
          });

          return changed ? next : previous;
        });
      },
      { rootMargin: "220px 0px", threshold: 0.2 },
    );

    const targets = Object.values(rootSectionRefs.current).filter(
      (target): target is HTMLElement => Boolean(target),
    );

    targets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
    };
  }, [isAuthenticated, isApproved, isRootLanding, rootResolvedShowcaseSections]);

  useEffect(() => {
    if (!isRootLanding || !isAuthenticated || !isApproved) {
      return;
    }

    let cancelled = false;

    (Object.entries(visibleRootSectionKeys) as [CategoryKey, boolean][])
      .filter(([, isVisible]) => isVisible)
      .map(([routeKey]) => routeKey)
      .filter(
        (routeKey) =>
          rootCategoryPreviews[routeKey] === undefined &&
          !rootPreviewLoadingKeysRef.current.has(routeKey),
      )
      .forEach((routeKey) => {
        rootPreviewLoadingKeysRef.current.add(routeKey);

        void axios
          .get<CategoryDatasetPreview[]>("/api/dataset-category-previews", {
            params: { category: routeKey, public_only: "true" },
          })
          .then((response) => {
            if (cancelled) return;
            setRootCategoryPreviews((previous) => ({
              ...previous,
              [routeKey]: Array.isArray(response.data)
                ? response.data.filter((item) => !isExcludedDatasetPath(item.full_path))
                : [],
            }));
          })
          .catch((error) => {
            if (!cancelled) {
              console.error(`Failed to load root dataset previews for ${routeKey}`, error);
              setRootCategoryPreviews((previous) => ({
                ...previous,
                [routeKey]: [],
              }));
            }
          })
          .finally(() => {
            rootPreviewLoadingKeysRef.current.delete(routeKey);
          });
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isApproved, isRootLanding, rootCategoryPreviews, visibleRootSectionKeys]);

  useEffect(() => {
    if (!canUseCatalogSearch || !isCatalogLanding || pathSearchLoaded || pathSearchPrimed) return;

    const readyForWarmup = initialRootCatalogContentReady || initialCategoryCatalogContentReady;
    if (!readyForWarmup) return;

    let cancelled = false;
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const primeSearch = () => {
      if (!cancelled) {
        setPathSearchPrimed(true);
      }
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(primeSearch, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(primeSearch, 700);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    activeCategory,
    canUseCatalogSearch,
    categoryPreviewsLoading,
    initialCategoryCatalogContentReady,
    initialRootCatalogContentReady,
    isCatalogLanding,
    loadedCategoryPreviewKey,
    pathSearchLoaded,
    pathSearchPrimed,
  ]);

  useEffect(() => {
    const shouldLoadPaths =
      canUseCatalogSearch &&
      (pathSearchPrimed || pathSearchTouched || pathSearchText.trim().length > 0);
    if (!shouldLoadPaths || pathSearchLoaded) return;

    let cancelled = false;

    async function loadAllPaths() {
      setPathSearchLoading(true);
      try {
        const nextPaths = await loadSearchPaths(pathSearchCacheKey, activeCategory?.routeKey);
        if (cancelled) return;

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
    activeCategory,
    canUseCatalogSearch,
    pathSearchCacheKey,
    pathSearchLoaded,
    pathSearchPrimed,
    pathSearchText,
    pathSearchTouched,
  ]);

  useEffect(() => {
    const isManualReload = previousPathSearchReloadTickRef.current !== reloadTick;
    previousPathSearchReloadTickRef.current = reloadTick;
    if (isManualReload) {
      pathSearchCache.delete(pathSearchCacheKey);
      pathSearchRequestCache.delete(pathSearchCacheKey);
    }

    const cachedPaths = pathSearchCache.get(pathSearchCacheKey);
    setAllFolderPaths(cachedPaths ?? []);
    setPathSearchLoading(false);
    setPathSearchLoaded(Boolean(cachedPaths));
    setPathSearchPrimed(Boolean(cachedPaths));
    setPathSearchTouched(false);
  }, [pathSearchCacheKey, reloadTick]);

  useEffect(() => {
    if (!imageQueryParam || images.length === 0) return;

    const decoded = decodeURIComponent(imageQueryParam);
    const match = images.find((image) => image.name === decoded || image.id.endsWith(decoded));
    if (match) {
      setSelectedImage(match);
    }
  }, [imageQueryParam, images]);

  const isLeaf = useMemo(
    () =>
      isAuthenticated &&
      isApproved &&
      !isRootLanding &&
      !isCategoryLanding &&
      !datasetManifest &&
      folders.length === 0,
    [datasetManifest, folders.length, isAuthenticated, isApproved, isRootLanding, isCategoryLanding],
  );
  const isMaskPath = useMemo(
    () =>
      pathSegments.slice(datasetRootDepth).some((segment) => segment.toLowerCase() === "masks"),
    [datasetRootDepth, pathSegments],
  );
  const sourceImages = useMemo(
    () => images.filter((image) => image.type === "image"),
    [images],
  );
  const maskSourceImageCount = sourceImages.length;
  const isOrigPath = useMemo(
    () =>
      pathSegments.slice(datasetRootDepth).some((segment) => segment.toLowerCase() === "orig"),
    [datasetRootDepth, pathSegments],
  );
  const showEgocentricGeneration = useMemo(() => {
    if (!isLeaf || !isOrigPath || sourceImages.length === 0) return false;
    return sourceImages.every((image) => {
      const view = String(image.metadata?.view ?? "").trim().toLowerCase();
      return view === "exo";
    });
  }, [isLeaf, isOrigPath, sourceImages]);
  const showMaskPanel = canManageDatasets && isLeaf && !isMaskPath && maskSourceImageCount > 0;

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

  const manifestItemCount = useMemo(() => {
    if (!datasetManifest) return 0;
    return (
      (datasetManifest.readme ? 1 : 0) +
      (datasetManifest.primary_video ? 1 : 0) +
      datasetManifest.downloads.length +
      Object.values(datasetManifest.misc).filter((section) => section.exists).length
    );
  }, [datasetManifest]);

  const itemCount = datasetManifest
    ? manifestItemCount
    : isCategoryLanding
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

  function promptGuestSignIn(nextPath = viewerBasePath) {
    navigate(buildAuthPath("login", nextPath));
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
    const canonicalTarget = category
      ? canonicalizeDatasetPathForRoute(pathLabel, category.routeKey)
      : pathLabel;
    const normalizedTarget = normalizePathSearchValue(canonicalTarget);
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

  async function handleDeleteAssetTarget() {
    if (!deleteAssetTarget || !datasetManifest) return;

    const path = datasetManifest.dataset.viewer_path.replace(/^\/viewer\//, "");
    setDeleteAssetInProgress(true);
    try {
      if (deleteAssetTarget.blobPath) {
        await axios.post("/api/delete_dataset_asset", {
          path,
          blob_path: deleteAssetTarget.blobPath,
        });
      } else if (deleteAssetTarget.sectionKey) {
        await axios.post("/api/delete_dataset_misc", {
          path,
          section: deleteAssetTarget.sectionKey,
        });
      }
      setDeleteAssetTarget(null);
      setReloadTick((value) => value + 1);
    } catch (error) {
      console.error("Failed to delete asset", error);
      alert("Failed to delete asset.");
    } finally {
      setDeleteAssetInProgress(false);
    }
  }

  function handleOpenDatasetAsset(asset: DatasetAsset) {
    setSelectedImage(asset);
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
              {index < segments.length - 1 && (
                <span className="px-1 text-muted-foreground">/</span>
              )}
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
          const canDeleteFolder = canDeleteDatasets && isDatasetRoutePath(folder.full_path);

          return (
            <div
              key={folder.full_path}
              className="group relative cursor-pointer overflow-hidden rounded-[28px] border border-slate-200 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_28px_70px_rgba(15,23,42,0.12)]"
              onClick={() =>
                navigate(
                  folder.viewer_path
                    ? withViewerBase(folder.viewer_path, viewerBasePath)
                    : buildViewerPath(folder.full_path, undefined, viewerBasePath),
                )
              }
            >
              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="h-44 w-full overflow-hidden rounded-[20px] border border-slate-200 bg-muted/60 transition-all group-hover:border-primary/25 group-hover:shadow-[0_0_18px_rgba(13,148,136,0.08)]">
                  <DatasetFolderCover
                    key={folder.full_path}
                    fullPath={folder.source_path ?? folder.full_path}
                    FallbackIcon={Folder}
                    className="flex h-full w-full items-center justify-center"
                    imgClassName="h-full w-full object-cover"
                    iconClassName="h-16 w-16 text-muted-foreground transition-colors group-hover:text-primary"
                  />
                </div>
                <div className="relative w-full text-center">
                  <span className={`block break-words font-sans-tech text-lg font-bold uppercase tracking-[0.12em] text-slate-950 transition-colors group-hover:text-primary ${canDeleteFolder ? "pl-8 pr-8" : ""}`}>
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
                  {canDeleteFolder && (
                    <div className="absolute right-0 top-0">
                      <button
                        type="button"
                        onMouseDown={(event) => event.stopPropagation()}
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
                        <div
                          className="absolute right-0 top-full z-20 mt-1 w-40 rounded-2xl border border-slate-200 bg-card py-1 shadow-[0_20px_40px_rgba(15,23,42,0.12)]"
                          onMouseDown={(event) => event.stopPropagation()}
                        >
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
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {items.length === 0 && !loading && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-muted/60 py-20 text-slate-500">
            <AlertCircle className="mb-4 h-12 w-12 text-slate-400" />
            <p className="font-sans-tech text-lg">No data found</p>
            {canManageDatasets && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-6 font-sans-tech text-sm font-medium text-primary underline decoration-dotted underline-offset-4 hover:text-primary-glow"
              >
                Upload Data
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const sharedLandingProps = {
    viewerBasePath,
    isAuthenticated,
    isApproved,
    canManageDatasets,
    pathSearchText,
    pathSearchLoading,
    pathSuggestions,
    onNavigate: navigate,
    onUploadOpen: () => setIsUploadModalOpen(true),
    onPathSearchFocus: () => setPathSearchTouched(true),
    onPathSearchChange: (value: string) => {
      setPathSearchTouched(true);
      setPathSearchText(value);
    },
    onPathSuggestionClick: handlePathSuggestionClick,
    renderHighlightedPath,
    onGuestSignIn: promptGuestSignIn,
    onCategoryPreviewClick: handleCategoryPreviewClick,
  };

  return (
    <div
      className={`relative flex min-h-screen flex-col bg-background font-sans-tech text-foreground ${
        canUseLockedViewerLayout && !showCatalogFooter ? "md:h-screen md:overflow-hidden" : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.04]" />
      <Navigation />

      <div
        className={`relative z-10 flex flex-1 flex-col pt-[88px] ${
          canUseLockedViewerLayout && !showCatalogFooter ? "md:overflow-hidden" : ""
        }`}
      >
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
        </div>

        {authLoading ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Loading account access...
          </div>
        ) : !isAuthenticated ? (
          isRootLanding ? (
            <RootLanding
              {...sharedLandingProps}
              rootResolvedShowcaseSections={rootResolvedShowcaseSections}
              rootSectionRefs={rootSectionRefs}
            />
          ) : (
            <Navigate to={authRedirectPath} replace />
          )
        ) : !isApproved ? (
          isRootLanding ? (
            <RootLanding
              {...sharedLandingProps}
              rootResolvedShowcaseSections={rootResolvedShowcaseSections}
              rootSectionRefs={rootSectionRefs}
            />
          ) : isCategoryLanding && activeCategory && activeLandingContent ? (
            <CategoryLanding
              {...sharedLandingProps}
              category={activeCategory}
              landing={activeLandingContent}
              localCategoryPreviewPlaceholdersByRoute={localCategoryPreviewPlaceholdersByRoute}
              activeLandingFilterId={activeLandingFilterId}
              resolvedCategorySections={resolvedCategorySections}
              user={user}
              landingTopRef={landingTopRef}
              sectionAnchorRefs={sectionAnchorRefs}
              onLandingFilterSelect={handleLandingFilterSelect}
              onCuratedCardOpen={handleCuratedCardOpen}
            />
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
                canUpload={canManageDatasets}
              />
            )}

            <div className="flex min-w-0 flex-1 flex-col bg-background/50">
              {!isCatalogLanding && (
                <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-card px-4 py-2 sm:flex-nowrap sm:py-0">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center rounded-sm border border-slate-200 bg-background px-2 py-1 text-xs shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
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

                  {!isLeaf && canManageDatasets && !datasetManifest && (
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

              <div
                ref={contentScrollRef}
                className="custom-scrollbar relative flex-1 overflow-y-auto bg-background/40 p-0"
              >
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

                {isRootLanding && (
                  <RootLanding
                    {...sharedLandingProps}
                    rootResolvedShowcaseSections={rootResolvedShowcaseSections}
                    rootSectionRefs={rootSectionRefs}
                  />
                )}
                {isCategoryLanding && activeCategory && activeLandingContent && (
                  <CategoryLanding
                    {...sharedLandingProps}
                    category={activeCategory}
                    landing={activeLandingContent}
                    localCategoryPreviewPlaceholdersByRoute={localCategoryPreviewPlaceholdersByRoute}
                    activeLandingFilterId={activeLandingFilterId}
                    resolvedCategorySections={resolvedCategorySections}
                    user={user}
                    landingTopRef={landingTopRef}
                    sectionAnchorRefs={sectionAnchorRefs}
                    onLandingFilterSelect={handleLandingFilterSelect}
                    onCuratedCardOpen={handleCuratedCardOpen}
                  />
                )}

                {datasetManifest && (
                  <DatasetLanding
                    manifest={datasetManifest}
                    canUseGenerationTools={canManageDatasets}
                    canDeleteDataset={
                      canDeleteDatasets &&
                      isDatasetRoutePath(datasetManifest.dataset.viewer_path.replace(/^\/viewer\//, ""))
                    }
                    onDeleteDataset={() =>
                      setDeleteModalFolder({
                        name: datasetManifest.dataset.task_label || datasetManifest.dataset.task_slug,
                        full_path: datasetManifest.dataset.viewer_path.replace(/^\/viewer\//, ""),
                      })
                    }
                    canDeleteAssets={canDeleteDatasets}
                    onDeleteAsset={(asset) =>
                      setDeleteAssetTarget({ label: asset.name, blobPath: asset.blob_path })
                    }
                    onDeleteMiscSection={(section) =>
                      setDeleteAssetTarget({ label: section.label, sectionKey: section.key })
                    }
                    onNavigate={(path) => navigate(withViewerBase(path, viewerBasePath))}
                    onOpenAsset={handleOpenDatasetAsset}
                  />
                )}

                {!datasetManifest && !isRootLanding && !isCategoryLanding && !isLeaf && (
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
                onGenerationSuccess={() => setReloadTick((value) => value + 1)}
                onOpenViewerPath={(viewerPath) => navigate(withViewerBase(viewerPath, viewerBasePath))}
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
            canUseGenerationTools={canManageDatasets}
            routePath={datasetManifest?.dataset.viewer_path.replace(/^\/viewer\//, "") ?? currentDisplayPath}
            showHandMeshGeneration={
              (datasetManifest?.dataset.vertical ?? pathSegments[0])?.toLowerCase() === "dexterity"
            }
            onVideoToolSuccess={() => setReloadTick((value) => value + 1)}
            onOpenViewerPath={(viewerPath) => navigate(withViewerBase(viewerPath, viewerBasePath))}
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

        {deleteAssetTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div
              className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="mb-2 font-sans-tech text-lg font-bold text-foreground">
                Delete {deleteAssetTarget.blobPath ? "file" : "folder"}?
              </h3>
              <p className="mb-1 font-sans-tech text-sm text-muted-foreground">
                You are about to delete{" "}
                <span className="font-medium text-foreground">{deleteAssetTarget.label}</span>
                {deleteAssetTarget.blobPath
                  ? " from Azure Blob Storage and its annotations."
                  : " and all of its contents from Azure Blob Storage and their annotations."}
              </p>
              <p className="mb-6 font-sans-tech text-xs text-destructive/90">
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteAssetTarget(null)}
                  className="rounded-sm border border-border px-4 py-2 font-sans-tech text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAssetTarget}
                  disabled={deleteAssetInProgress}
                  className="flex items-center gap-2 rounded-sm bg-destructive px-4 py-2 font-sans-tech text-sm font-medium text-primary-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                >
                  {deleteAssetInProgress && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCatalogFooter && <FooterSection />}
    </div>
  );
}
