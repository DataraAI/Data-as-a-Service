const CONTAINER_PREFIX = /^roboteyeview(?:-public)?\//i;

const LOWER_CAMEL_ALIASES: Record<string, string[]> = {
  carautomation: ["carAutomation"],
  serverrack: ["serverRack"],
  washingmachine: ["washingMachine"],
  datahall: ["dataHall"],
};

const FRONT_PAGE_IMAGE_MODULES = import.meta.glob(
  "../assets/images/**/*.{png,jpg,jpeg,webp,avif,svg}",
  {
    eager: true,
    import: "default",
  },
) as Record<string, string>;

const FOLDER_PREVIEW_MEDIA_MODULES = import.meta.glob(
  "../assets/folder-previews/**/*.{png,jpg,jpeg,webp,avif,svg,mp4,webm,mov,m4v}",
  {
    eager: true,
    import: "default",
  },
) as Record<string, string>;

export interface LocalFolderPreviewSnapshot {
  category: string;
  fullPath: string;
  brand: string;
  dataset: string;
  imageBlobPaths: string[];
  previewVideoBlobPath: string | null;
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeSegment(segment: string): string {
  return segment.trim().replace(/^\/+/, "").replace(/\/+$/, "");
}

function normalizeImagePath(imagePath: string): string {
  let normalized = normalizeSegment(imagePath);
  if (CONTAINER_PREFIX.test(normalized)) {
    normalized = normalized.replace(CONTAINER_PREFIX, "");
  }
  return normalized.split("/").filter(Boolean).join("/");
}

function resolveLocalAssetUrl(
  modules: Record<string, string>,
  assetRoot: string,
  assetPath: string,
): string | null {
  const normalized = normalizeImagePath(assetPath);
  const directCandidates = uniqueNonEmpty([
    `../assets/${assetRoot}/${normalized}`,
    `../assets/${assetRoot}/${normalized.toLowerCase()}`,
  ]);

  for (const candidate of directCandidates) {
    const resolved = modules[candidate];
    if (resolved) return resolved;
  }

  return null;
}

function lowerCamelFromDelimited(token: string): string {
  const parts = token
    .split(/[^a-zA-Z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "";
  const [first, ...rest] = parts;
  return (
    first.toLowerCase() +
    rest
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join("")
  );
}

function coverBaseNameCandidates(segment: string): string[] {
  const exact = normalizeSegment(segment);
  const lower = exact.toLowerCase();
  const compact = lower.replace(/[^a-z0-9]+/g, "");
  const kebab = lower.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const snake = lower.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const lowerCamel = lowerCamelFromDelimited(exact);
  const aliases = LOWER_CAMEL_ALIASES[compact] ?? [];

  return uniqueNonEmpty([exact, lower, compact, kebab, snake, lowerCamel, ...aliases]);
}

/**
 * Front-page assets live in `src/assets/images/<same azure-style path>`.
 * Example: `carAutomation/carAutomation.png` -> `src/assets/images/carAutomation/carAutomation.png`
 */
export function frontPageImageUrl(imagePath: string): string | null {
  return resolveLocalAssetUrl(FRONT_PAGE_IMAGE_MODULES, "images", imagePath);
}

export function frontPageImageExists(imagePath: string): boolean {
  return frontPageImageUrl(imagePath) !== null;
}

/**
 * Candidate image paths for folder thumbnails, still expressed in the same
 * azure-style path format so they can be resolved against local assets.
 */
export function datasetCoverBlobCandidates(fullPath: string): string[] {
  const normalized = normalizeImagePath(fullPath);
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) return [];

  const folderPath = parts.join("/");
  const category = parts[0];
  const last = parts[parts.length - 1];

  const candidates: string[] = [];

  for (const stem of coverBaseNameCandidates(last)) {
    candidates.push(`${folderPath}/${stem}.png`);
  }

  for (const genericStem of ["thumbnail", "folder", "cover"]) {
    candidates.push(`${folderPath}/${genericStem}.png`);
  }

  for (const stem of coverBaseNameCandidates(category)) {
    candidates.push(`${category}/${stem}.png`);
  }

  return uniqueNonEmpty(candidates);
}

export function blobProxyUrl(blobPath: string): string {
  return `/api/proxy/${blobPath.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
}

export function folderPreviewMediaUrl(blobPath: string): string | null {
  return resolveLocalAssetUrl(FOLDER_PREVIEW_MEDIA_MODULES, "folder-previews", blobPath);
}

const PREVIEW_DATASET_DIRECTORIES = new Set([
  "orig",
  "egos",
  "corner_images_controlnet",
  "occl_del",
  "preview",
  "masks",
]);

function mediaSortRank(blobPath: string) {
  const normalized = normalizeImagePath(blobPath);
  const segments = normalized.split("/").filter(Boolean);
  const directory = segments.find((segment) => PREVIEW_DATASET_DIRECTORIES.has(segment)) ?? "";

  switch (directory) {
    case "orig":
      return 0;
    case "egos":
      return 1;
    case "corner_images_controlnet":
      return 2;
    case "occl_del":
      return 3;
    default:
      return 4;
  }
}

function getPreviewDirectory(blobPath: string) {
  const normalized = normalizeImagePath(blobPath);
  const segments = normalized.split("/").filter(Boolean);
  return segments.find((segment) => PREVIEW_DATASET_DIRECTORIES.has(segment)) ?? "";
}

function naturalCompare(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function selectPreviewImageBlobPaths(imageBlobPaths: string[]) {
  const groupedByDirectory = imageBlobPaths.reduce<Record<string, string[]>>((acc, blobPath) => {
    const directory = getPreviewDirectory(blobPath);
    if (!directory) return acc;
    if (!acc[directory]) {
      acc[directory] = [];
    }
    acc[directory].push(blobPath);
    return acc;
  }, {});

  const preferredDirectories = ["orig", "egos", "corner_images_controlnet", "occl_del"];
  const selectedDirectory =
    preferredDirectories.find((directory) => (groupedByDirectory[directory]?.length ?? 0) > 0) ?? null;

  const selectedImages = selectedDirectory
    ? groupedByDirectory[selectedDirectory]
    : imageBlobPaths;

  const sortedImages = [...selectedImages].sort((left, right) => {
    const rankDiff = mediaSortRank(left) - mediaSortRank(right);
    return rankDiff !== 0 ? rankDiff : naturalCompare(left, right);
  });

  if (sortedImages.length === 0) return [];

  const result =
    sortedImages.length >= 4
      ? Array.from({ length: 4 }, (_, index) => {
          const imageIndex = Math.round((index * (sortedImages.length - 1)) / 3);
          return sortedImages[imageIndex];
        })
      : [...sortedImages];

  let nextIndex = 0;
  while (result.length < 4) {
    result.push(sortedImages[nextIndex % sortedImages.length]);
    nextIndex += 1;
  }

  return result;
}

const LOCAL_FOLDER_PREVIEW_SNAPSHOTS: LocalFolderPreviewSnapshot[] = (() => {
  const grouped = new Map<
    string,
    {
      category: string;
      brand: string;
      dataset: string;
      images: string[];
      previewVideoBlobPath: string | null;
    }
  >();

  Object.keys(FOLDER_PREVIEW_MEDIA_MODULES).forEach((modulePath) => {
    const relative = modulePath.replace("../assets/folder-previews/", "");
    const blobPath = normalizeImagePath(relative);
    const segments = blobPath.split("/").filter(Boolean);
    const directoryIndex = segments.findIndex((segment) => PREVIEW_DATASET_DIRECTORIES.has(segment));

    if (directoryIndex < 0) return;

    const isNewMiscLayout = segments[2]?.toLowerCase() === "misc" && directoryIndex >= 3;
    const isNewRootLayout = directoryIndex >= 2;
    const isLegacyLayout = directoryIndex >= 3;
    if (!isNewMiscLayout && !isNewRootLayout && !isLegacyLayout) return;

    const datasetRootSegments = isNewMiscLayout
      ? segments.slice(0, 2)
      : segments.slice(0, directoryIndex);
    const datasetRoot = datasetRootSegments.join("/");
    const directory = segments[directoryIndex];
    const extension = segments[segments.length - 1]?.split(".").pop()?.toLowerCase() ?? "";

    if (!grouped.has(datasetRoot)) {
      grouped.set(datasetRoot, {
        category: datasetRootSegments[0] ?? "",
        brand: datasetRootSegments.length > 2 ? datasetRootSegments[1] ?? "" : "",
        dataset: datasetRootSegments[datasetRootSegments.length - 1] ?? "",
        images: [],
        previewVideoBlobPath: null,
      });
    }

    const entry = grouped.get(datasetRoot);
    if (!entry) return;

    if (directory === "preview" && extension === "mp4" && segments[segments.length - 1]?.toLowerCase() === "hover.mp4") {
      entry.previewVideoBlobPath = blobPath;
      return;
    }

    if (directory === "masks") return;

    if (["png", "jpg", "jpeg", "webp", "avif", "svg"].includes(extension)) {
      entry.images.push(blobPath);
    }
  });

  return Array.from(grouped.entries())
    .map(([fullPath, entry]) => ({
      category: entry.category,
      fullPath,
      brand: entry.brand,
      dataset: entry.dataset,
      imageBlobPaths: selectPreviewImageBlobPaths(entry.images),
      previewVideoBlobPath: entry.previewVideoBlobPath,
    }))
    .sort((left, right) => naturalCompare(left.fullPath, right.fullPath));
})();

export function getLocalFolderPreviewSnapshots(): LocalFolderPreviewSnapshot[] {
  return LOCAL_FOLDER_PREVIEW_SNAPSHOTS;
}
