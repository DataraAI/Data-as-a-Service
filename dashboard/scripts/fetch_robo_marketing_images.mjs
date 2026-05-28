import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "src", "lib", "roboDataHubCatalog.ts");
const OUTPUT_ROOT = path.join(ROOT, "src", "assets", "images", "marketing");
const ATTRIBUTION_PATH = path.join(OUTPUT_ROOT, "attributions.json");
const OVERRIDE_TS_PATH = path.join(ROOT, "src", "lib", "roboDataHubMarketingImages.ts");

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const COMMONS_LIMIT = 24;
const COMMONS_THUMB_WIDTH = 1600;
const USER_AGENT = "Codex-Datara-Marketing-Images/1.0";

const EXCLUDED_TITLE_TERMS = [
  "svg",
  "diagram",
  "logo",
  "icon",
  "map",
  "flag",
  "dimensions",
  "schematic",
  "clipart",
  "vector",
  "illustration",
  "rendering",
  "drawing",
  "poster",
  "chart",
  "seal",
  "coat of arms",
  "wiktionary",
  "wikipedia",
  "plan",
  "plans",
];

const ROUTE_CONTEXT = {
  dataCtr: {
    slug: "serverrack",
    queries: [
      "server rack",
      "server room",
      "network equipment rack",
      "ethernet cables rack",
      "data center hardware",
    ],
  },
  warehouse: {
    slug: "warehouse",
    queries: [
      "warehouse shelves boxes",
      "warehouse picking",
      "distribution center",
      "warehouse conveyor",
      "warehouse pallet",
    ],
  },
  humanoid: {
    slug: "dexterity",
    queries: [
      "dishwasher kitchen",
      "laundry folding",
      "household cleaning",
      "washing machine",
    ],
  },
  carAuto: {
    slug: "car-automation",
    queries: [
      "car assembly line",
      "automotive factory",
      "car seat installation",
      "vehicle inspection factory",
      "car dashboard assembly",
    ],
  },
};

function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return value
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

function htmlToText(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extensionFromUrl(url) {
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".jpeg")) return ".jpeg";
  if (pathname.endsWith(".jpg")) return ".jpg";
  if (pathname.endsWith(".png")) return ".png";
  if (pathname.endsWith(".webp")) return ".webp";
  return ".jpg";
}

export function bufferHasSupportedImageSignature(buffer) {
  if (!buffer || buffer.length < 12) return false;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true; // jpeg
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  )
    return true; // png

  if (
    buffer.slice(0, 4).toString("ascii") === "RIFF" &&
    buffer.slice(8, 12).toString("ascii") === "WEBP"
  )
    return true; // webp

  const hasFtyp = buffer.slice(4, 8).toString("ascii") === "ftyp";
  if (hasFtyp) {
    const brand = buffer.slice(8, 16).toString("ascii");
    if (brand.includes("avif")) return true;
  }

  return false;
}

export function bufferLooksLikeHtml(buffer) {
  const text = buffer.slice(0, 512).toString("utf8").toLowerCase();
  return (
    text.includes("<!doctype html") ||
    text.includes("<html") ||
    text.includes("wikimedia error") ||
    text.includes("too many requests") ||
    text.includes("you are making too many requests")
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCards(catalogText) {
  const matches = [
    ...catalogText.matchAll(
      /\{\s*title:\s*"([^"]+)",\s*description:\s*"([\s\S]*?)",\s*tags:\s*\[[\s\S]*?\]\s*,\s*availability:\s*"([^"]+)",\s*hours:\s*"([^"]+)",\s*pathLabel:\s*"([^"]+)"/g,
    ),
  ];

  const cards = matches.map((match) => ({
    title: match[1],
    description: match[2].replace(/\s+/g, " ").trim(),
    availability: match[3],
    hours: match[4],
    pathLabel: match[5],
  }));

  const byPath = new Map();
  for (const card of cards) {
    if (!byPath.has(card.pathLabel)) byPath.set(card.pathLabel, card);
  }
  return [...byPath.values()];
}

function getRouteMeta(card) {
  const [root] = card.pathLabel.split("/");
  return ROUTE_CONTEXT[root] ?? null;
}

function getCardPoolKey(card) {
  const meta = getRouteMeta(card);
  if (!meta) return "misc";
  return meta.slug;
}

function buildCardTerms(card) {
  const routeMeta = getRouteMeta(card);
  const contextTerms = routeMeta?.queries.join(" ") ?? "";
  const normalizedTitle = card.title
    .replace(/\bQC\b/g, "quality control")
    .replace(/\bOps\b/g, "operations")
    .replace(/\b3-Series\b/g, "3 Series")
    .replace(/[–—-]/g, " ");
  const leaf = card.pathLabel
    .split("/")
    .at(-1)
    ?.replace(/([a-z])([A-Z])/g, "$1 $2") ?? "";

  return normalizeText(`${contextTerms} ${normalizedTitle} ${card.description} ${leaf}`)
    .split(" ")
    .filter((term) => term.length > 2);
}

async function commonsSearch(query) {
  const attempts = [0, 2000, 6000, 12000];

  for (let attempt = 0; attempt < attempts.length; attempt += 1) {
    if (attempts[attempt] > 0) {
      await sleep(attempts[attempt]);
    }

    const url = new URL(COMMONS_API);
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", query);
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", String(COMMONS_LIMIT));
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|size|extmetadata");
    url.searchParams.set("iiurlwidth", String(COMMONS_THUMB_WIDTH));
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    try {
      const { stdout } = await execFileAsync("curl", [
        "-L",
        "-H",
        `User-Agent: ${USER_AGENT}`,
        "-H",
        "Accept: application/json",
        url.toString(),
      ], {
        maxBuffer: 10 * 1024 * 1024,
      });

      const json = JSON.parse(stdout);
      return Object.values(json?.query?.pages ?? {});
    } catch (error) {
      if (attempt === attempts.length - 1) {
        throw new Error(`Commons search failed after retries for query: ${query}: ${error.message}`);
      }
    }
  }

  return [];
}

function getCommonsLicenseToken(info = {}) {
  const ext = info.extmetadata ?? {};
  const shortName = htmlToText(ext.LicenseShortName?.value ?? "");
  const usageTerms = htmlToText(ext.UsageTerms?.value ?? "");
  const permission = htmlToText(ext.Permission?.value ?? "");
  const combined = normalizeText(`${shortName} ${usageTerms} ${permission}`);

  if (combined.includes("public domain") || combined.includes("pd self")) return "pd";
  if (combined.includes("cc0") || combined.includes("zero")) return "cc0";
  if (combined.includes("cc by sa")) return "by-sa";
  if (combined.includes("cc by")) return "by";
  return null;
}

function mapCommonsPage(page, query) {
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl && !info?.url) return null;

  const title = String(page.title ?? "");
  const titleLower = title.toLowerCase();
  if (EXCLUDED_TITLE_TERMS.some((term) => titleLower.includes(term))) return null;
  if (titleLower.endsWith(".svg") || titleLower.endsWith(".pdf")) return null;

  const description = htmlToText(info.extmetadata?.ImageDescription?.value ?? "");
  const descriptionLower = description.toLowerCase();
  if (EXCLUDED_TITLE_TERMS.some((term) => descriptionLower.includes(term))) return null;

  const licenseToken = getCommonsLicenseToken(info);
  if (!licenseToken) return null;

  const width = Number(info.thumbwidth ?? info.width ?? 0);
  const height = Number(info.thumbheight ?? info.height ?? 0);
  if (width < 700 || height < 450) return null;

  const downloadUrl = info.thumburl ?? info.url;
  const sourceUrl = info.url ?? info.thumburl;
  if (!downloadUrl || !sourceUrl) return null;

  return {
    title,
    query,
    pageTitle: htmlToText(info.extmetadata?.ObjectName?.value ?? title.replace(/^File:/, "")),
    description,
    descriptionUrl: info.descriptionurl ?? "",
    sourceUrl,
    downloadUrl,
    width,
    height,
    artist: htmlToText(info.extmetadata?.Artist?.value ?? ""),
    license: htmlToText(info.extmetadata?.LicenseShortName?.value ?? "Unknown"),
    provider: "wikimedia-commons",
    attributionText: htmlToText(info.extmetadata?.Credit?.value ?? ""),
    licenseToken,
  };
}

function scoreCandidate(card, item) {
  if (!item?.downloadUrl) return -Infinity;

  const haystack = normalizeText(
    `${item.pageTitle} ${item.description} ${item.title} ${item.query}`,
  );
  const terms = buildCardTerms(card);

  let score = 0;
  for (const term of new Set(terms)) {
    if (haystack.includes(term)) score += 2;
  }

  const aspect = item.width / item.height;
  if (aspect >= 0.9 && aspect <= 2.1) score += 4;
  if (aspect >= 1.15 && aspect <= 1.8) score += 2;

  if (item.licenseToken === "pd" || item.licenseToken === "cc0") score += 8;
  else if (item.licenseToken === "by") score += 5;
  else if (item.licenseToken === "by-sa") score += 4;

  score += Math.min(item.width, item.height) / 400;
  return score;
}

export async function buildPoolForRoute(
  routeMeta,
  {
    search = commonsSearch,
    wait = sleep,
    logger = console,
    maxPoolSize = 48,
  } = {},
) {
  const pool = new Map();

  for (const query of routeMeta.queries) {
    try {
      const pages = await search(query);
      for (const page of pages) {
        const mapped = mapCommonsPage(page, query);
        if (!mapped) continue;
        if (pool.has(mapped.sourceUrl)) continue;
        pool.set(mapped.sourceUrl, mapped);
      }
    } catch (error) {
      logger.warn?.(`Skipping Commons query "${query}" after fetch failure: ${error.message}`);
    }
    if (pool.size >= maxPoolSize) {
      break;
    }
    await wait(1500);
  }

  return [...pool.values()];
}

function getRankedCandidates(card, pool) {
  return pool
    .map((item) => ({ item, score: scoreCandidate(card, item) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.item);
}

async function downloadFile(url, targetPath) {
  const attempts = [0, 4000, 10000, 20000];

  for (let attempt = 0; attempt < attempts.length; attempt += 1) {
    if (attempts[attempt] > 0) {
      await sleep(attempts[attempt]);
    }

    const tempPath = `${targetPath}.tmp`;
    try {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await execFileAsync("curl", [
        "-L",
        "--fail-with-body",
        "-H",
        `User-Agent: ${USER_AGENT}`,
        url,
        "-o",
        tempPath,
      ]);

      const payload = await fs.readFile(tempPath);
      if (!bufferHasSupportedImageSignature(payload)) {
        if (bufferLooksLikeHtml(payload)) {
          throw new Error("downloaded payload is HTML/rate-limit content, not an image");
        }
        throw new Error("downloaded payload does not match a supported image signature");
      }

      await fs.rename(tempPath, targetPath);
      await sleep(500);
      return;
    } catch (error) {
      await fs.rm(tempPath, { force: true }).catch(() => {});
      if (attempt === attempts.length - 1) {
        throw new Error(`Download failed after retries for ${url}: ${error.message}`);
      }
    }
  }
}

async function ensureDownloadedAsset({
  item,
  poolKey,
  card,
  downloadedAssets,
  failedSources,
}) {
  if (failedSources.has(item.sourceUrl)) return null;

  const fileSlug = slugify(item.pageTitle || item.title || card.title) || "image";
  const ext = extensionFromUrl(item.downloadUrl);
  const fileName = `${fileSlug}${ext}`;
  const relativePath = `marketing/${poolKey}/${fileName}`.replace(/\\/g, "/");
  const targetPath = path.join(OUTPUT_ROOT, poolKey, fileName);
  const cached = downloadedAssets.get(item.sourceUrl);
  if (cached) return cached;

  try {
    const existingPayload = await fs.readFile(targetPath);
    if (bufferHasSupportedImageSignature(existingPayload)) {
      downloadedAssets.set(item.sourceUrl, relativePath);
      return relativePath;
    }
    await fs.rm(targetPath, { force: true }).catch(() => {});
  } catch {
    // file does not exist or is unreadable; continue with a fresh download
  }

  try {
    await downloadFile(item.downloadUrl, targetPath);
    downloadedAssets.set(item.sourceUrl, relativePath);
    return relativePath;
  } catch (error) {
    failedSources.add(item.sourceUrl);
    console.warn(`Skipping asset for ${card.pathLabel}: ${error.message}`);
    return null;
  }
}

function buildOverrideSource(entries) {
  const lines = [
    'import type { CatalogImageSet } from "./roboDataHubCatalog";',
    "",
    "export const ROBO_DATA_HUB_MARKETING_IMAGE_OVERRIDES: Record<string, CatalogImageSet> = {",
  ];

  for (const entry of entries) {
    lines.push(`  "${entry.pathLabel}": {`);
    lines.push(`    main: "${entry.main}",`);
    lines.push("    thumbs: [");
    for (const thumb of entry.thumbs) {
      lines.push(`      "${thumb}",`);
    }
    lines.push("    ],");
    lines.push("  },");
  }

  lines.push("};");
  lines.push("");
  lines.push("export function getRoboDataHubMarketingImageSet(pathLabel: string): CatalogImageSet | null {");
  lines.push("  return ROBO_DATA_HUB_MARKETING_IMAGE_OVERRIDES[pathLabel] ?? null;");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const catalogText = await fs.readFile(CATALOG_PATH, "utf8");
  const cards = extractCards(catalogText);

  const cardsByPool = new Map();
  for (const card of cards) {
    const poolKey = getCardPoolKey(card);
    if (!cardsByPool.has(poolKey)) cardsByPool.set(poolKey, []);
    cardsByPool.get(poolKey).push(card);
  }

  const routePools = new Map();
  for (const [sourceRoot, routeMeta] of Object.entries(ROUTE_CONTEXT)) {
    console.log(`Building pool for ${sourceRoot} from Wikimedia Commons...`);
    routePools.set(routeMeta.slug, await buildPoolForRoute(routeMeta));
    console.log(`Collected ${routePools.get(routeMeta.slug).length} candidates for ${routeMeta.slug}.`);
  }

  const downloadedAssets = new Map();
  const overrideEntries = [];
  const attribution = [];
  const usedMainSources = new Set();
  const failedSources = new Set();

  for (const [poolKey, groupedCards] of cardsByPool.entries()) {
    const pool = routePools.get(poolKey) ?? [];
    if (pool.length === 0) {
      console.warn(`No media pool found for ${poolKey}. Skipping ${groupedCards.length} card(s).`);
      continue;
    }

    for (const card of groupedCards) {
      const rankedItems = getRankedCandidates(card, pool);
      if (rankedItems.length === 0) {
        console.warn(`No Commons candidates found for ${card.pathLabel}`);
        continue;
      }

      const prioritizedMainCandidates = [
        ...rankedItems.filter((item) => !usedMainSources.has(item.sourceUrl)),
        ...rankedItems.filter((item) => usedMainSources.has(item.sourceUrl)),
      ];

      let mainItem = null;
      let mainLocalPath = null;
      for (const item of prioritizedMainCandidates) {
        const relativePath = await ensureDownloadedAsset({
          item,
          poolKey,
          card,
          downloadedAssets,
          failedSources,
        });
        if (!relativePath) continue;
        mainItem = item;
        mainLocalPath = relativePath;
        break;
      }

      if (!mainItem || !mainLocalPath) {
        console.warn(`No downloadable Commons assets found for ${card.pathLabel}`);
        continue;
      }

      usedMainSources.add(mainItem.sourceUrl);

      const thumbSelections = [];
      for (const item of rankedItems) {
        if (item.sourceUrl === mainItem.sourceUrl) continue;

        const relativePath = await ensureDownloadedAsset({
          item,
          poolKey,
          card,
          downloadedAssets,
          failedSources,
        });
        if (!relativePath) continue;

        thumbSelections.push({ item, localPath: relativePath });
        if (thumbSelections.length === 3) break;
      }

      while (thumbSelections.length < 3) {
        thumbSelections.push({ item: mainItem, localPath: mainLocalPath });
      }

      const selection = [mainItem, ...thumbSelections.map((entry) => entry.item)];
      const localPaths = [mainLocalPath, ...thumbSelections.map((entry) => entry.localPath)];

      overrideEntries.push({
        pathLabel: card.pathLabel,
        main: localPaths[0],
        thumbs: localPaths.slice(1, 4),
      });

      attribution.push({
        pathLabel: card.pathLabel,
        title: card.title,
        description: card.description,
        assets: selection.map((item, index) => ({
          role: index === 0 ? "main" : `thumb-${index}`,
          localPath: localPaths[index],
          pageTitle: item.pageTitle,
          sourceUrl: item.sourceUrl,
          descriptionUrl: item.descriptionUrl,
          artist: item.artist,
          license: item.license,
          provider: item.provider,
          attributionText: item.attributionText,
          query: item.query,
        })),
      });
    }
  }

  overrideEntries.sort((left, right) => left.pathLabel.localeCompare(right.pathLabel));
  attribution.sort((left, right) => left.pathLabel.localeCompare(right.pathLabel));

  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  await fs.writeFile(OVERRIDE_TS_PATH, buildOverrideSource(overrideEntries), "utf8");
  await fs.writeFile(ATTRIBUTION_PATH, JSON.stringify(attribution, null, 2), "utf8");

  console.log(`Saved ${overrideEntries.length} marketing image overrides.`);
  console.log(`Downloaded ${downloadedAssets.size} shared Wikimedia Commons assets.`);
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
