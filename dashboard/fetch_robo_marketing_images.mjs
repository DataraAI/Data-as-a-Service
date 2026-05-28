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

const OPENVERSE_API = "https://api.openverse.org/v1/images/";
const MAX_RESULTS = 24;

const EXCLUDED_TITLE_TERMS = [
  "svg",
  "diagram",
  "logo",
  "icon",
  "map",
  "flag",
  "coat of arms",
  "dimensions",
  "schematic",
  "wiktionary",
  "wikipedia logo",
  "clipart",
  "vector",
  "illustration",
];

const ALLOWED_LICENSES = new Set(["cc0", "pdm", "by", "by-sa"]);

const ROUTE_CONTEXT = {
  dataCtr: "data center server rack infrastructure",
  warehouse: "warehouse logistics operations",
  humanoid: "household task kitchen cleaning laundry",
  carAuto: "automotive manufacturing assembly line factory",
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
  const match = new URL(url).pathname.match(/\.(jpg|jpeg|png|webp)$/i);
  return match ? `.${match[1].toLowerCase()}` : ".jpg";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCards(catalogText) {
  const matches = [...catalogText.matchAll(/\{\s*title:\s*"([^"]+)",\s*description:\s*"([\s\S]*?)",\s*tags:\s*\[[\s\S]*?\]\s*,\s*availability:\s*"([^"]+)",\s*hours:\s*"([^"]+)",\s*pathLabel:\s*"([^"]+)"/g)];

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

function buildSearchQueries(card) {
  const [root] = card.pathLabel.split("/");
  const routeBase = ROUTE_CONTEXT[root] ?? "";
  const normalizedTitle = card.title
    .replace(/\bQC\b/g, "quality control")
    .replace(/\bOps\b/g, "operations")
    .replace(/\b3-Series\b/g, "3 Series")
    .replace(/\bEGO-centric\b/gi, "")
    .replace(/\bEXO-centric\b/gi, "")
    .replace(/[–—-]/g, " ");
  const leaf = card.pathLabel.split("/").at(-1)?.replace(/([a-z])([A-Z])/g, "$1 $2") ?? "";

  const queries = [
    `${routeBase} ${normalizedTitle}`,
    `${routeBase} ${leaf}`,
    normalizedTitle,
  ];

  return [...new Set(queries.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean))];
}

async function openverseSearch(query) {
  const attempts = [0, 1200, 2800, 5000];

  for (let attempt = 0; attempt < attempts.length; attempt += 1) {
    if (attempts[attempt] > 0) {
      await sleep(attempts[attempt]);
    }

    const url = new URL(OPENVERSE_API);
    url.searchParams.set("q", query);
    url.searchParams.set("page_size", String(MAX_RESULTS));

    try {
      const { stdout } = await execFileAsync("curl.exe", [
        "-L",
        "-H",
        "User-Agent: Codex-Datara-Marketing-Images/1.0",
        "-H",
        "Accept: application/json",
        url.toString(),
      ], {
        maxBuffer: 10 * 1024 * 1024,
      });

      const json = JSON.parse(stdout);
      return json?.results ?? [];
    } catch (error) {
      if (attempt === attempts.length - 1) {
        throw new Error(`Openverse search failed after retries for query: ${query}: ${error.message}`);
      }
    }
  }
  return [];
}

function scoreCandidate(card, item, query) {
  if (!item?.url) return -Infinity;

  const title = String(item.title ?? "");
  const titleLower = title.toLowerCase();
  if (EXCLUDED_TITLE_TERMS.some((term) => titleLower.includes(term))) return -Infinity;
  const sourceExtension = extensionFromUrl(item.url ?? "").replace(".", "");
  if (!["jpg", "jpeg", "png", "webp"].includes(sourceExtension)) return -Infinity;
  if (!ALLOWED_LICENSES.has(String(item.license ?? "").toLowerCase())) return -Infinity;
  if (item.mature) return -Infinity;

  const width = Number(item.width ?? 0);
  const height = Number(item.height ?? 0);
  if (width < 700 || height < 450) return -Infinity;

  const license = String(item.license ?? "");
  const description = htmlToText(item.title ?? "");
  const haystack = normalizeText(`${title} ${description}`);
  const terms = normalizeText(`${query} ${card.title} ${card.description}`)
    .split(" ")
    .filter((term) => term.length > 2);

  let score = 0;
  for (const term of new Set(terms)) {
    if (haystack.includes(term)) score += 2;
  }

  const aspect = width / height;
  if (aspect >= 0.8 && aspect <= 2.2) score += 4;
  if (aspect >= 1.1 && aspect <= 1.8) score += 2;

  if (/cc0|pdm/i.test(license)) score += 8;
  else if (/by-sa/i.test(license)) score += 4;
  else if (/by/i.test(license)) score += 5;

  if ((item.source ?? "") === "wikimedia") score += 2;

  score += Math.min(width, height) / 400;
  return score;
}

async function gatherCandidates(card) {
  const found = new Map();
  const queries = buildSearchQueries(card);

  for (const query of queries) {
    const results = await openverseSearch(query);
    for (const item of results) {
      const descriptionUrl = item.foreign_landing_url ?? item.url;
      if (found.has(descriptionUrl)) continue;

      const score = scoreCandidate(card, item, query);
      if (!Number.isFinite(score)) continue;

      found.set(descriptionUrl, {
        title: card.title,
        pathLabel: card.pathLabel,
        query,
        pageTitle: item.title,
        descriptionUrl,
        sourceUrl: item.url,
        downloadUrl: item.thumbnail || item.url,
        width: Number(item.width ?? 0),
        height: Number(item.height ?? 0),
        artist: htmlToText(item.creator ?? ""),
        license: item.license_url ? `${item.license} ${item.license_version ?? ""}`.trim() : item.license ?? "Unknown",
        provider: item.provider ?? item.source ?? "unknown",
        attributionText: item.attribution ?? "",
        score,
      });
    }
    if (found.size >= 8) break;
  }

  return [...found.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);
}

async function downloadFile(url, targetPath) {
  const attempts = [0, 1500, 3500, 6500];

  for (let attempt = 0; attempt < attempts.length; attempt += 1) {
    if (attempts[attempt] > 0) {
      await sleep(attempts[attempt]);
    }

    try {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await execFileAsync("curl.exe", [
        "-L",
        "-H",
        "User-Agent: Codex-Datara-Marketing-Images/1.0",
        url,
        "-o",
        targetPath,
      ]);
      return;
    } catch (error) {
      if (attempt === attempts.length - 1) {
        throw new Error(`Download failed after retries for ${url}: ${error.message}`);
      }
    }
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

  const overrideEntries = [];
  const attribution = [];

  for (const card of cards) {
    const slug = slugify(card.pathLabel);
    const cardDir = path.join(OUTPUT_ROOT, slug);

    console.log(`Searching images for ${card.pathLabel} -> ${card.title}`);
    const candidates = await gatherCandidates(card);
    if (candidates.length === 0) {
      console.warn(`No Openverse candidates found for ${card.pathLabel}`);
      continue;
    }

    const selected = [];
    for (let index = 0; index < Math.min(4, candidates.length); index += 1) {
      const candidate = candidates[index];
      const ext = extensionFromUrl(candidate.downloadUrl);
      const fileName = index === 0 ? `main${ext}` : `thumb-${index}${ext}`;
      const targetPath = path.join(cardDir, fileName);
      await downloadFile(candidate.downloadUrl, targetPath);
      selected.push({
        ...candidate,
        fileName,
        relativePath: `marketing/${slug}/${fileName}`.replace(/\\/g, "/"),
      });
    }

    while (selected.length < 4) {
      const cloneFrom = selected[selected.length - 1] ?? selected[0];
      if (!cloneFrom) break;
      const ext = extensionFromUrl(cloneFrom.downloadUrl);
      const fileName = selected.length === 0 ? `main${ext}` : `thumb-${selected.length}${ext}`;
      const targetPath = path.join(cardDir, fileName);
      await fs.copyFile(path.join(cardDir, cloneFrom.fileName), targetPath);
      selected.push({
        ...cloneFrom,
        fileName,
        relativePath: `marketing/${slug}/${fileName}`.replace(/\\/g, "/"),
        clonedFrom: cloneFrom.fileName,
      });
    }

    overrideEntries.push({
      pathLabel: card.pathLabel,
      main: selected[0].relativePath,
      thumbs: selected.slice(1, 4).map((item) => item.relativePath),
    });

    attribution.push({
      pathLabel: card.pathLabel,
      title: card.title,
      description: card.description,
      queryTrail: [...new Set(selected.map((item) => item.query))],
      assets: selected.map((item) => ({
        localPath: item.relativePath,
        pageTitle: item.pageTitle,
        sourceUrl: item.sourceUrl,
        descriptionUrl: item.descriptionUrl,
        artist: item.artist,
        license: item.license,
        provider: item.provider,
        attributionText: item.attributionText,
        downloadUrl: item.downloadUrl,
        clonedFrom: item.clonedFrom ?? null,
      })),
    });

    await sleep(400);
  }

  overrideEntries.sort((left, right) => left.pathLabel.localeCompare(right.pathLabel));
  attribution.sort((left, right) => left.pathLabel.localeCompare(right.pathLabel));

  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  await fs.writeFile(OVERRIDE_TS_PATH, buildOverrideSource(overrideEntries), "utf8");
  await fs.writeFile(ATTRIBUTION_PATH, JSON.stringify(attribution, null, 2), "utf8");

  console.log(`Saved ${overrideEntries.length} marketing image overrides.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
