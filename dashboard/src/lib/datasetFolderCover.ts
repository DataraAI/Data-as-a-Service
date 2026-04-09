const CONTAINER_PREFIX = /^roboteyeview\//i;

/**
 * Blob paths inside the roboteyeview container (no container prefix).
 * Thumbnails: `<category>/<category>.png` or `<category>/<brand>/<dataset>/<dataset>.png`.
 */
export function datasetCoverBlobCandidates(fullPath: string): string[] {
  let normalized = fullPath.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (CONTAINER_PREFIX.test(normalized)) {
    normalized = normalized.replace(CONTAINER_PREFIX, "");
  }
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) return [];
  const category = parts[0];
  const last = parts[parts.length - 1];
  const candidates: string[] = [];
  if (parts.length >= 3) {
    candidates.push(`${parts.slice(0, 3).join("/")}/${last}.png`);
  }
  candidates.push(`${category}/${category}.png`);
  return candidates;
}

export function blobProxyUrl(blobPath: string): string {
  return `/api/proxy/${blobPath.split("/").map((s) => encodeURIComponent(s)).join("/")}`;
}
