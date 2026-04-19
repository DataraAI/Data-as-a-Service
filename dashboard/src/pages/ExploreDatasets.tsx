import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Database, Loader2, Search, FolderOpen } from "lucide-react";
import { DatasetFolderCover } from "@/components/DatasetFolderCover";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const SENSOR_MODALITIES = ["video", "audio", "radio", "lidar", "IMU", "thermal"] as const;
const ANNOTATION_TYPES = [
  "object detection",
  "segmentation",
  "3d bounding boxes",
  "3d mesh",
] as const;

const MODALITY_KEYWORDS: Record<string, string[]> = {
  video: ["video", "rgb", "camera", "mp4", "frame", "image"],
  audio: ["audio", "wav", "sound", "mic"],
  radio: ["radio", "rf", "wireless"],
  lidar: ["lidar", "pointcloud", "point_cloud", "pcd"],
  IMU: ["imu", "inertial", "gyro", "accel"],
  thermal: ["thermal", "ir", "infrared", "heat"],
};

const ANNOTATION_KEYWORDS: Record<string, string[]> = {
  "object detection": ["detection", "detect", "bbox", "bounding", "object"],
  segmentation: ["segment", "seg", "mask", "semantic"],
  "3d bounding boxes": ["3d_bbox", "3dbbox", "cuboid", "oriented"],
  "3d mesh": ["mesh", "stl", "obj", "glb", "gltf", "cad"],
};

function pathMatchesKeywords(pathLower: string, keys: string[]): boolean {
  return keys.some((k) => pathLower.includes(k));
}

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function viewerHref(fullPath: string): string {
  const trimmed = fullPath.replace(/^\/+/, "");
  const segments = trimmed.split("/").filter(Boolean).map(encodeURIComponent);
  return `/viewer/${segments.join("/")}`;
}

function displayTitle(fullPath: string): string {
  const parts = fullPath.split("/").filter(Boolean);
  return parts[parts.length - 1] || fullPath;
}

function isDatasetRootPath(p: string): boolean {
  return p.split("/").filter(Boolean).length === 3;
}

function pathSegments(p: string): [string, string, string] {
  const parts = p.split("/").filter(Boolean);
  return [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""];
}

export default function ExploreDatasets() {
  const [paths, setPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchCategory, setSearchCategory] = useState("");
  const [searchBrand, setSearchBrand] = useState("");
  const [searchDataset, setSearchDataset] = useState("");
  const [modalities, setModalities] = useState<Set<string>>(new Set());
  const [annotations, setAnnotations] = useState<Set<string>>(new Set());

  const fetchPaths = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await axios.get<string[]>("/api/dataset-paths");
      const raw = res.data;
      const list = Array.isArray(raw)
        ? raw
            .map((p) =>
              typeof p === "string" ? p : String((p as { full_path?: string }).full_path ?? p),
            )
            .filter(Boolean)
            .map((p) => p.replace(/\/+$/, ""))
            .filter(isDatasetRootPath)
        : [];
      setPaths([...new Set(list)].sort((a, b) => a.localeCompare(b)));
    } catch (e: unknown) {
      console.error("ExploreDatasets: dataset-paths failed, falling back to root", e);
      try {
        const fallback = await axios.get<{ full_path: string }[]>("/api/datasets", {
          params: { path: "" },
        });
        setPaths(
          [
            ...new Set(
              (fallback.data ?? [])
                .map((d) => d.full_path.replace(/\/+$/, ""))
                .filter(isDatasetRootPath),
            ),
          ].sort((a, b) => a.localeCompare(b)),
        );
      } catch (e2: unknown) {
        const msg =
          (axios.isAxiosError(e2) && e2.response?.data?.error) ||
          (e2 instanceof Error ? e2.message : "Could not load datasets");
        setLoadError(typeof msg === "string" ? msg : "Could not load datasets");
        setPaths([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPaths();
  }, [fetchPaths]);

  const filteredPaths = useMemo(() => {
    const sc = searchCategory.trim().toLowerCase();
    const sb = searchBrand.trim().toLowerCase();
    const sd = searchDataset.trim().toLowerCase();
    return paths.filter((p) => {
      const pl = p.toLowerCase();
      const [cat, brand, dataset] = pathSegments(p);
      if (sc && !cat.toLowerCase().includes(sc)) return false;
      if (sb && !brand.toLowerCase().includes(sb)) return false;
      if (sd && !dataset.toLowerCase().includes(sd)) return false;

      if (modalities.size > 0) {
        const okMod = [...modalities].some((m) => {
          const keys = MODALITY_KEYWORDS[m];
          return keys && pathMatchesKeywords(pl, keys);
        });
        if (!okMod) return false;
      }

      if (annotations.size > 0) {
        const okAnn = [...annotations].some((a) => {
          const keys = ANNOTATION_KEYWORDS[a];
          return keys && pathMatchesKeywords(pl, keys);
        });
        if (!okAnn) return false;
      }

      return true;
    });
  }, [paths, searchCategory, searchBrand, searchDataset, modalities, annotations]);

  const clearFilters = () => {
    setModalities(new Set());
    setAnnotations(new Set());
    setSearchCategory("");
    setSearchBrand("");
    setSearchDataset("");
  };

  const trimSearchFields = () => {
    setSearchCategory((s) => s.trim());
    setSearchBrand((s) => s.trim());
    setSearchDataset((s) => s.trim());
  };

  const hasSearchInput = searchCategory.trim() || searchBrand.trim() || searchDataset.trim();

  return (
    <div className="relative flex min-h-screen flex-col bg-background font-sans-tech text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.05]" aria-hidden />
      <Navigation />

      <main className="relative z-10 flex min-h-0 flex-1 flex-col pt-16">
        <header className="border-b border-border bg-card/30 px-4 py-6 backdrop-blur-sm sm:px-6">
          <div className="mx-auto max-w-[1440px]">
            <p className="mb-2 font-mono-tech text-xs uppercase tracking-widest text-muted-foreground">
              Datara DataHub
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Explore <span className="text-primary">Datasets</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Browse dataset paths (category / brand / dataset name) in the roboteyeview
              container. Search each segment, filter by modality and annotation, then open a
              path in the data viewer.
            </p>
          </div>
        </header>

        <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col lg:flex-row">
          <aside className="custom-scrollbar w-full shrink-0 overflow-y-auto border-b border-border bg-card/20 lg:w-[320px] lg:border-b-0 lg:border-r">
            <div className="space-y-8 p-5">
              <div className="space-y-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Path search
                </h3>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor="explore-search-category"
                      className="font-mono-tech text-[10px] uppercase tracking-wide text-muted-foreground"
                    >
                      Category
                    </Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="explore-search-category"
                        type="search"
                        placeholder="Search category..."
                        value={searchCategory}
                        onChange={(e) => setSearchCategory(e.target.value)}
                        className="h-9 rounded-sm border-border bg-background/80 pl-8 text-sm font-sans-tech"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="explore-search-brand"
                      className="font-mono-tech text-[10px] uppercase tracking-wide text-muted-foreground"
                    >
                      Brand
                    </Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="explore-search-brand"
                        type="search"
                        placeholder="Search brand..."
                        value={searchBrand}
                        onChange={(e) => setSearchBrand(e.target.value)}
                        className="h-9 rounded-sm border-border bg-background/80 pl-8 text-sm font-sans-tech"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="explore-search-dataset"
                      className="font-mono-tech text-[10px] uppercase tracking-wide text-muted-foreground"
                    >
                      Dataset name
                    </Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="explore-search-dataset"
                        type="search"
                        placeholder="Search dataset..."
                        value={searchDataset}
                        onChange={(e) => setSearchDataset(e.target.value)}
                        className="h-9 rounded-sm border-border bg-background/80 pl-8 text-sm font-sans-tech"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full font-mono-tech text-xs uppercase tracking-wide"
                  onClick={trimSearchFields}
                >
                  Search
                </Button>
              </div>

              <div>
                <h2 className="mb-3 font-mono-tech text-xs font-bold uppercase tracking-widest text-foreground">
                  Data attributes and filtering
                </h2>
                <p className="mb-4 text-xs text-muted-foreground">
                  Narrow paths by keywords in folder names. Leave a group empty to include all.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Sensor modality
                </h3>
                <div className="flex flex-wrap gap-2">
                  {SENSOR_MODALITIES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModalities((s) => toggleSet(s, m))}
                      className={cn(
                        "rounded-full border px-3 py-1.5 font-mono-tech text-xs transition-colors",
                        modalities.has(m)
                          ? "border-primary bg-primary text-primary-foreground shadow-glow/30"
                          : "border-border bg-background/80 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Annotation type
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ANNOTATION_TYPES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAnnotations((s) => toggleSet(s, a))}
                      className={cn(
                        "rounded-full border px-3 py-1.5 font-mono-tech text-xs transition-colors",
                        annotations.has(a)
                          ? "border-primary bg-primary text-primary-foreground shadow-glow/30"
                          : "border-border bg-background/80 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {(modalities.size > 0 || annotations.size > 0 || hasSearchInput) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full font-mono-tech text-xs"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-background/40">
            <div className="sticky top-16 z-20 shrink-0 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md md:px-6">
              <p className="font-mono-tech text-xs text-muted-foreground">
                {loading
                  ? "Loading..."
                  : `${filteredPaths.length} path${filteredPaths.length === 1 ? "" : "s"} shown`}
              </p>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-6">
              {loading && (
                <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <span className="font-mono-tech text-sm">Loading datasets...</span>
                </div>
              )}

              {!loading && loadError && (
                <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-6 text-center">
                  <p className="mb-2 font-sans-tech text-sm text-destructive">{loadError}</p>
                  <Button variant="outline" size="sm" onClick={() => void fetchPaths()}>
                    Retry
                  </Button>
                </div>
              )}

              {!loading && !loadError && filteredPaths.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border bg-card/10 py-20 text-muted-foreground">
                  <Database className="mb-4 h-12 w-12 opacity-40" />
                  <p className="font-sans-tech text-sm">No paths match your filters.</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Reset filters
                  </button>
                </div>
              )}

              {!loading && !loadError && filteredPaths.length > 0 && (
                <ul className="space-y-4">
                  {filteredPaths.map((fullPath) => (
                    <li key={fullPath}>
                      <Link
                        to={viewerHref(fullPath)}
                        className="group block overflow-hidden rounded-sm border border-border bg-card/30 transition-all duration-300 hover:border-primary/50 hover:bg-card/50 hover:shadow-elegant"
                      >
                        <div className="flex min-h-[100px] flex-col sm:flex-row sm:items-stretch">
                          <div className="flex shrink-0 items-center justify-center overflow-hidden border-b border-border bg-primary/10 p-4 sm:w-36 sm:border-b-0 sm:border-r">
                            <DatasetFolderCover
                              key={fullPath}
                              fullPath={fullPath}
                              FallbackIcon={FolderOpen}
                              className="flex h-24 w-full max-w-[8rem] items-center justify-center sm:h-28 sm:max-w-none"
                              imgClassName="h-full w-full rounded-sm object-cover transition-transform duration-300 group-hover:scale-105"
                              iconClassName="h-10 w-10 text-primary opacity-90 transition-transform group-hover:scale-105"
                            />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col justify-center p-4">
                            <p className="truncate font-sans-tech text-lg font-bold uppercase tracking-wide text-foreground transition-colors group-hover:text-primary">
                              {displayTitle(fullPath)}
                            </p>
                            <p className="mt-1 break-all font-mono-tech text-xs text-muted-foreground">
                              {fullPath}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/40 px-4 py-2">
                          <span className="font-mono-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                            roboteyeview
                          </span>
                          <span className="flex items-center gap-1 font-mono-tech text-xs text-primary transition-colors group-hover:text-primary-glow">
                            Open in viewer
                            <span aria-hidden>&rarr;</span>
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
