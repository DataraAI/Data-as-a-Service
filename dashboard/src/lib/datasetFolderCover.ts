const CONTAINER_PREFIX = /^roboteyeview\//i;

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
