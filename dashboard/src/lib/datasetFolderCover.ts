const CONTAINER_PREFIX = /^roboteyeview\//i;

const LOWER_CAMEL_ALIASES: Record<string, string[]> = {
  carautomation: ["carAutomation"],
  serverrack: ["serverRack"],
  washingmachine: ["washingMachine"],
  datahall: ["dataHall"],
};

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeSegment(segment: string): string {
  return segment.trim().replace(/^\/+/, "").replace(/\/+$/, "");
}

function lowerCamelFromDelimited(token: string): string {
  const parts = token
    .split(/[^a-zA-Z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "";
  const [first, ...rest] = parts;
  return first.toLowerCase() + rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join("");
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
 * Blob paths inside the roboteyeview container (no container prefix).
 *
 * Preferred per-folder cover: `<fullPath>/<lowerCamelName>.png`
 * Also supports exact/lower/compact/kebab/snake variants plus generic
 * `thumbnail.png`, `folder.png`, `cover.png`.
 *
 * Keeps main's useful fallback to a category-level cover:
 * `<category>/<category>.png`
 */
export function datasetCoverBlobCandidates(fullPath: string): string[] {
  let normalized = normalizeSegment(fullPath);
  if (CONTAINER_PREFIX.test(normalized)) {
    normalized = normalized.replace(CONTAINER_PREFIX, "");
  }

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
  return `/api/proxy/${blobPath.split("/").map((s) => encodeURIComponent(s)).join("/")}`;
}
