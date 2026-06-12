import {
  blobProxyUrl,
  folderPreviewMediaUrl,
  getLocalFolderPreviewSnapshots,
} from "@/lib/datasetFolderCover";
import {
  CATEGORY_LANDING_CONTENT,
  type CatalogCard,
  type CategoryLandingContent,
} from "@/lib/roboDataHubCatalog";
import {
  cloneEntryWithTitle,
  type CategoryConfig,
  type CategoryDatasetPreview,
  type CategoryKey,
  type CategoryPreviewAsset,
  type FolderItem,
  type ResolvedCatalogCardEntry,
  type StoragePreviewKey,
} from "./dataViewerTypes";

export const CATEGORIES: CategoryConfig[] = [
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
    label: "Dexterity",
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

export function normalizePathSearchValue(value: string) {
  return value
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/\s*>\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPathSearchTerms(query: string): string[] {
  return normalizePathSearchValue(query)
    .split(/[\/\s]+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

export function getSuggestionScore(fullPath: string, query: string): number | null {
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

export function getBestMatchingSegmentIndex(fullPath: string, query: string): number | null {
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

export function normalizeFolderResults(payload: unknown): FolderItem[] {
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

export function uniqueFolderItems(items: FolderItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.full_path)) return false;
    seen.add(item.full_path);
    return true;
  });
}

const EXCLUDED_DATASET_PANEL_NAMES = new Set(["test", "short-test", "washing-test"]);

export function isExcludedDatasetPath(fullPath: string) {
  const segments = fullPath.split("/").filter(Boolean);
  const datasetName = segments[segments.length - 1]?.trim().toLowerCase() ?? "";
  return EXCLUDED_DATASET_PANEL_NAMES.has(datasetName);
}

export function normalizeCategoryValue(value?: string | null) {
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

export function getCategoryByRouteKey(value?: string | null) {
  const normalizedValue = normalizeCategoryValue(value);
  return (
    CATEGORIES.find((category) => {
      if (normalizeCategoryValue(category.routeKey) === normalizedValue) return true;
      if (normalizeCategoryValue(category.publicSlug) === normalizedValue) return true;
      return category.aliases.some((alias) => normalizeCategoryValue(alias) === normalizedValue);
    }) ?? null
  );
}

export function pathBelongsToCategory(fullPath: string, routeKey: CategoryKey) {
  const segments = fullPath.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  const categorySegment =
    segments[0] === "my" ? segments[1] : segments[0] === "admin" ? segments[2] : segments[0];
  return (
    getCategoryByRouteKey(categorySegment)?.routeKey === routeKey ||
    normalizeCategoryValue(categorySegment) === normalizeCategoryValue(routeKey)
  );
}

export function buildViewerPath(fullPath: string, imageName?: string, basePath = "/viewer") {
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

export function canonicalizeDatasetPathForRoute(fullPath: string, routeKey: CategoryKey) {
  const normalizedPath = String(fullPath ?? "").replace(/\\/g, "/");
  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.length === 0) return normalizedPath;

  const sourceCategory = getCategoryByRouteKey(segments[0]);
  if (!sourceCategory || sourceCategory.routeKey !== routeKey) {
    return segments.join("/");
  }

  segments[0] = routeKey;
  return segments.join("/");
}

export function getPreviewDatasetRootFromVideoBlobPath(blobPath?: string | null) {
  const normalized = String(blobPath ?? "").trim().replace(/\\/g, "/");
  if (!normalized) return null;
  const match = normalized.match(/^(.*)\/preview\/hover\.(mp4|webm|mov|m4v)$/i);
  return match?.[1] ?? null;
}

export function withViewerBase(viewerPath: string, basePath: string) {
  return viewerPath.startsWith("/viewer")
    ? `${basePath}${viewerPath.slice("/viewer".length)}`
    : viewerPath;
}

export function buildCategoryLandingPath(category: CategoryConfig, basePath: string) {
  const segment = basePath.startsWith("/robodatahub") ? category.publicSlug : category.routeKey;
  return `${basePath}/${segment}`;
}

export function groupVlmPromptTags(tags: string[]) {
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

export function parseFrameIdValue(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function isDatasetRoutePath(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "my") return parts.length === 4;
  if (parts[0] === "admin") return parts.length === 5;
  return parts.length === 3;
}

export function getCategoryAccent(routeKey: CategoryKey) {
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

export function getCategoryBadge(card: CatalogCard) {
  const isEgo = card.tags.some((tag) => tag.toLowerCase().includes("ego-centric"));
  return {
    label: isEgo ? "EGO" : "EXO",
    className: isEgo
      ? "border-teal-200 bg-teal-50 text-teal-700"
      : "border-blue-200 bg-blue-50 text-blue-700",
  };
}

export function getCatalogViewBadge(card: CatalogCard) {
  const isEgo = card.tags.some((tag) => tag.toLowerCase().includes("ego-centric"));
  if (isEgo) {
    return {
      label: "EGO",
      className: "border border-primary/30 bg-primary/10 text-primary",
    };
  }
  return {
    label: "EXO",
    className: "border border-blue-300 bg-blue-50 text-blue-700",
  };
}

export function getCatalogAvailabilityClasses(availability: CatalogCard["availability"]) {
  return availability === "In Library"
    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border border-amber-200 bg-amber-50 text-amber-700";
}

export function matchesLivePreviewHint(card: CatalogCard, item: CategoryDatasetPreview) {
  if (!card.livePathHints || card.livePathHints.length === 0) return false;
  const normalizedPath = normalizePathSearchValue(item.full_path);
  return card.livePathHints.some((hint) => normalizedPath.includes(normalizePathSearchValue(hint)));
}

export function buildFallbackLiveCard(item: CategoryDatasetPreview): CatalogCard {
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

export function buildLocalPreviewAsset(blobPath: string, label: string, index: number): CategoryPreviewAsset {
  const fileName = blobPath.split("/").filter(Boolean).pop() ?? label;
  return {
    asset_id: `local:${blobPath}:${index}`,
    blob_path: blobPath,
    name: fileName,
    label,
    proxy_url: blobProxyUrl(blobPath),
  };
}

export function buildLocalPlaceholderPreview(
  snapshot: ReturnType<typeof getLocalFolderPreviewSnapshots>[number],
  basePath: string,
  datasetFullPath = snapshot.fullPath,
): CategoryDatasetPreview | null {
  const usableImages = snapshot.imageBlobPaths.slice(0, 4);
  if (usableImages.length === 0) return null;

  return {
    title: snapshot.dataset,
    brand: snapshot.brand,
    full_path: datasetFullPath,
    viewer_path: buildViewerPath(datasetFullPath, undefined, basePath),
    visibility: "public",
    owner_slug: "roboteyeview",
    main_image: buildLocalPreviewAsset(usableImages[0], `${snapshot.dataset} cover`, 0),
    thumbnails: usableImages
      .slice(1, 4)
      .map((blobPath, index) =>
        buildLocalPreviewAsset(blobPath, `${snapshot.dataset} preview ${index + 1}`, index + 1),
      ),
    preview_video: snapshot.previewVideoBlobPath
      ? buildLocalPreviewAsset(snapshot.previewVideoBlobPath, `${snapshot.dataset} hover`, 0)
      : null,
  };
}

export function resolveCatalogSectionsForCategory(
  routeKey: CategoryKey,
  landingContent: CategoryLandingContent,
  activeCategoryPreviews: CategoryDatasetPreview[],
  localCategoryPreviewPlaceholders: CategoryDatasetPreview[],
) {
  const usedLivePaths = new Set<string>();
  const usedPlaceholderPaths = new Set<string>();
  const matchedBySection = new Map<string, ResolvedCatalogCardEntry[]>();

  landingContent.sections.forEach((section) => {
    const sectionEntries: ResolvedCatalogCardEntry[] = [];

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
        activeCategoryPreviews.find((item) => {
          const normalizedPath = normalizePathSearchValue(item.full_path);
          return !usedLivePaths.has(normalizedPath) && matchesLivePreviewHint(card, item);
        }) ??
        null;

      if (matchedItem) {
        usedLivePaths.add(normalizePathSearchValue(matchedItem.full_path));
      }

      sectionEntries.push({ card, liveItem: matchedItem, placeholderItem });
    });

    matchedBySection.set(section.id, sectionEntries);
  });

  const EXCLUDED_PANEL_NAMES = ["test", "short-test", "washing-test", "washingmachineloading"];
  const isExcludedPanel = (item: { full_path: string; title?: string | null }) => {
    const name = (item.title?.trim() || item.full_path.split("/").filter(Boolean).pop() || "").toLowerCase();
    return EXCLUDED_PANEL_NAMES.includes(name);
  };

  const unmatchedLiveItems = activeCategoryPreviews.filter(
    (item) => !usedLivePaths.has(normalizePathSearchValue(item.full_path)) && !isExcludedPanel(item),
  );
  const unmatchedPlaceholderItems = localCategoryPreviewPlaceholders.filter(
    (item) => !usedPlaceholderPaths.has(normalizePathSearchValue(item.full_path)) && !isExcludedPanel(item),
  );
  const groupedExtras = new Map<string, Map<string, ResolvedCatalogCardEntry>>();

  const upsertGroupedExtra = (
    sectionId: string | null,
    item: CategoryDatasetPreview,
    kind: "live" | "placeholder",
  ) => {
    if (!sectionId) return;
    const normalizedPath = normalizePathSearchValue(item.full_path);
    if (!groupedExtras.has(sectionId)) {
      groupedExtras.set(sectionId, new Map());
    }

    const sectionEntries = groupedExtras.get(sectionId);
    if (!sectionEntries) return;

    const existingEntry = sectionEntries.get(normalizedPath);
    const baseCard = buildFallbackLiveCard(existingEntry?.liveItem ?? existingEntry?.placeholderItem ?? item);

    sectionEntries.set(normalizedPath, {
      card: baseCard,
      liveItem: kind === "live" ? item : existingEntry?.liveItem ?? null,
      placeholderItem: kind === "placeholder" ? item : existingEntry?.placeholderItem ?? null,
    });
  };

  unmatchedPlaceholderItems.forEach((item) => {
    upsertGroupedExtra(getLivePreviewSectionId(routeKey, item), item, "placeholder");
  });

  unmatchedLiveItems.forEach((item) => {
    upsertGroupedExtra(getLivePreviewSectionId(routeKey, item), item, "live");
  });

  const seenEntryKeys = new Set<string>();
  const titleCounts = new Map<string, number>();

  return landingContent.sections.map((section) => {
    const resolvedCards = matchedBySection.get(section.id) ?? [];
    const liveBackedCards = resolvedCards.filter(
      (entry) => entry.card.livePathHints?.length || entry.liveItem || entry.placeholderItem,
    );
    const marketingCards = resolvedCards.filter((entry) => !entry.card.livePathHints?.length);
    const extraLiveCards = Array.from(groupedExtras.get(section.id)?.values() ?? []).sort((a, b) =>
      (a.liveItem?.title ?? a.placeholderItem?.title ?? a.card.title).localeCompare(
        b.liveItem?.title ?? b.placeholderItem?.title ?? b.card.title,
      ),
    );

    const uniqueCards = [...liveBackedCards, ...extraLiveCards, ...marketingCards]
      .filter((entry) => {
        const entryKey =
          entry.liveItem?.full_path ?? entry.placeholderItem?.full_path ?? entry.card.pathLabel;
        const normalizedKey = normalizePathSearchValue(entryKey);
        if (seenEntryKeys.has(normalizedKey)) {
          return false;
        }
        seenEntryKeys.add(normalizedKey);
        return true;
      })
      .map((entry) => {
        const normalizedTitle = entry.card.title.trim().toLowerCase();
        const seenCount = titleCounts.get(normalizedTitle) ?? 0;
        titleCounts.set(normalizedTitle, seenCount + 1);

        if (seenCount === 0) {
          return entry;
        }

        return cloneEntryWithTitle(entry, `${entry.card.title} ${seenCount + 1}`);
      });

    return {
      ...section,
      cards: uniqueCards,
    };
  });
}

export function getLivePreviewSectionId(routeKey: CategoryKey, item: CategoryDatasetPreview) {
  const normalizedPath = normalizePathSearchValue(item.full_path);

  switch (routeKey) {
    case "serverrack":
      if (normalizedPath.includes("ethernetcable") || normalizedPath.includes("adpluggingcable")) {
        return "cable";
      }
      if (
        normalizedPath.includes("switchtray") ||
        normalizedPath.includes("datarackinstall") ||
        normalizedPath.includes("pduinstallation") ||
        normalizedPath.includes("networkcardinstall") ||
        normalizedPath.includes("x3690x5hotswap")
      ) {
        return "hardware";
      }
      return "server";
    case "warehouse":
      if (normalizedPath.includes("loadingpellets") || normalizedPath.includes("steelpallets")) {
        return "material";
      }
      return "pick";
    case "dexterity":
      if (normalizedPath.includes("dishwasherunloading") || normalizedPath.includes("peelingpeas")) {
        return "kitchen";
      }
      if (
        normalizedPath.includes("washingmachine") ||
        normalizedPath.includes("towel") ||
        normalizedPath.includes("crockery")
      ) {
        return "household";
      }
      return "cleaning";
    case "carAutomation":
      if (
        normalizedPath.includes("passengerseat") ||
        normalizedPath.includes("dooralignment") ||
        normalizedPath.includes("wheelbolts")
      ) {
        return "inspection";
      }
      if (
        normalizedPath.includes("frontgrille") ||
        normalizedPath.includes("frontseat") ||
        normalizedPath.includes("rearbumber") ||
        normalizedPath.includes("rearbumper") ||
        normalizedPath.includes("windshieldreplacement") ||
        normalizedPath.includes("doorpanelassembly")
      ) {
        return "assembly";
      }
      return "cars";
    default:
      return null;
  }
}

export function resolvePreviewMediaUrl(asset: CategoryPreviewAsset | null | undefined): string | null {
  if (!asset) return null;
  const localUrl = folderPreviewMediaUrl(asset.blob_path);
  if (localUrl) return localUrl;
  return asset.proxy_url || null;
}

export function normalizeCatalogMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCatalogFilterTargetSectionId(
  landing: CategoryLandingContent,
  filterId: string,
): string | null {
  if (filterId === "all") return null;

  const exactSection = landing.sections.find((section) => section.id === filterId);
  if (exactSection) return exactSection.id;

  const filter = landing.filters.find((item) => item.id === filterId);
  if (!filter) return landing.sections[0]?.id ?? null;

  const filterTerms = Array.from(
    new Set(
      normalizeCatalogMatchText(`${filter.id} ${filter.label}`)
        .split(" ")
        .filter((term) => term && term !== "all" && term !== "task" && term !== "tasks" && term !== "ops"),
    ),
  );

  let bestSectionId: string | null = null;
  let bestScore = 0;

  landing.sections.forEach((section) => {
    const haystack = normalizeCatalogMatchText(
      [
        section.id,
        section.title,
        ...section.cards.flatMap((card) => [card.title, card.description, card.pathLabel, ...card.tags]),
      ].join(" "),
    );

    const score = filterTerms.reduce((total, term) => {
      if (!term || !haystack.includes(term)) return total;
      const isHeadingMatch =
        section.id === term || normalizeCatalogMatchText(section.title).includes(term);
      return total + (isHeadingMatch ? 3 : 1);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestSectionId = section.id;
    }
  });

  return bestSectionId ?? landing.sections[0]?.id ?? null;
}

export { CATEGORY_LANDING_CONTENT };
