import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Database, Loader2, Search, FolderOpen } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SENSOR_MODALITIES = ["video", "audio", "radio", "lidar", "IMU", "thermal"] as const;
const ANNOTATION_TYPES = [
  "object detection",
  "segmentation",
  "3d bounding boxes",
  "3d mesh",
] as const;

/** Match folder paths when filters are on (path names often encode modality / task). */
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

export default function ExploreDatasets() {
  const [paths, setPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modalities, setModalities] = useState<Set<string>>(new Set());
  const [annotations, setAnnotations] = useState<Set<string>>(new Set());

  const fetchPaths = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await axios.get<string[]>("/api/dataset-paths");
      const raw = res.data;
      const list = Array.isArray(raw)
        ? raw.map((p) => (typeof p === "string" ? p : String((p as { full_path?: string }).full_path ?? p))).filter(Boolean)
        : [];
      setPaths(list);
    } catch (e: unknown) {
      console.error("ExploreDatasets: dataset-paths failed, falling back to root", e);
      try {
        const fallback = await axios.get<{ full_path: string }[]>("/api/datasets", { params: { path: "" } });
        setPaths((fallback.data ?? []).map((d) => d.full_path).filter(Boolean));
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
    const q = query.trim().toLowerCase();
    return paths.filter((p) => {
      const pl = p.toLowerCase();
      if (q && !pl.includes(q)) return false;

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
  }, [paths, query, modalities, annotations]);

  const clearFilters = () => {
    setModalities(new Set());
    setAnnotations(new Set());
    setQuery("");
  };

  return (
    <div className="min-h-screen flex flex-col text-foreground bg-background font-sans-tech relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] pointer-events-none" aria-hidden />
      <Navigation />

      <main className="flex-1 flex flex-col pt-16 relative z-10 min-h-0">
        <header className="border-b border-border bg-card/30 backdrop-blur-sm px-4 py-6 md:px-8">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-mono-tech uppercase tracking-widest text-muted-foreground mb-2">Datara DataHub</p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Explore <span className="text-primary">Datasets</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Browse catalog paths in the roboteyeview storage container. Filter by modality and annotation, then open a path in the data viewer.
            </p>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row min-h-0 max-w-7xl mx-auto w-full">
          <aside className="w-full md:w-[min(100%,280px)] lg:w-1/4 shrink-0 border-b md:border-b-0 md:border-r border-border bg-card/20 overflow-y-auto custom-scrollbar">
            <div className="p-5 space-y-8">
              <div>
                <h2 className="text-xs font-bold font-mono-tech uppercase tracking-widest text-foreground mb-3">
                  Data attributes and filtering
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Narrow paths by keywords in folder names. Leave a group empty to include all.
                </p>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Sensor modality
                </h3>
                <div className="flex flex-wrap gap-2">
                  {SENSOR_MODALITIES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModalities((s) => toggleSet(s, m))}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-mono-tech border transition-colors",
                        modalities.has(m)
                          ? "bg-primary text-primary-foreground border-primary shadow-glow/30"
                          : "bg-background/80 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Annotation type
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ANNOTATION_TYPES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAnnotations((s) => toggleSet(s, a))}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-mono-tech border transition-colors",
                        annotations.has(a)
                          ? "bg-primary text-primary-foreground border-primary shadow-glow/30"
                          : "bg-background/80 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {(modalities.size > 0 || annotations.size > 0 || query.trim()) && (
                <Button variant="outline" size="sm" className="w-full font-mono-tech text-xs" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </aside>

          <section className="flex-1 flex flex-col min-w-0 min-h-0 bg-background/40">
            <div className="sticky top-16 z-20 shrink-0 border-b border-border bg-background/95 backdrop-blur-md px-4 py-4 md:px-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="search"
                    placeholder="Search dataset paths…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10 h-11 font-sans-tech bg-card border-border rounded-sm"
                    aria-label="Search datasets"
                  />
                </div>
                <Button
                  type="button"
                  className="h-11 font-mono-tech text-xs uppercase tracking-wide shrink-0"
                  onClick={() => setQuery((q) => q.trim())}
                >
                  Search
                </Button>
              </div>
              <p className="text-xs text-muted-foreground font-mono-tech mt-2">
                {loading ? "Loading…" : `${filteredPaths.length} path${filteredPaths.length === 1 ? "" : "s"} shown`}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
              {loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <span className="text-sm font-mono-tech">Loading catalog from Azure…</span>
                </div>
              )}

              {!loading && loadError && (
                <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-6 text-center">
                  <p className="text-sm text-destructive font-sans-tech mb-2">{loadError}</p>
                  <Button variant="outline" size="sm" onClick={() => void fetchPaths()}>
                    Retry
                  </Button>
                </div>
              )}

              {!loading && !loadError && filteredPaths.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border rounded-sm bg-card/10">
                  <Database className="w-12 h-12 mb-4 opacity-40" />
                  <p className="font-sans-tech text-sm">No paths match your filters.</p>
                  <button type="button" onClick={clearFilters} className="mt-4 text-primary text-sm font-medium underline-offset-4 hover:underline">
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
                        className="group block rounded-sm border border-border bg-card/30 overflow-hidden hover:border-primary/50 hover:bg-card/50 transition-all duration-300 shadow-elegant/0 hover:shadow-elegant"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-stretch min-h-[100px]">
                          <div className="sm:w-36 shrink-0 bg-primary/10 border-b sm:border-b-0 sm:border-r border-border flex items-center justify-center p-4">
                            <FolderOpen className="w-10 h-10 text-primary opacity-90 group-hover:scale-105 transition-transform" />
                          </div>
                          <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                            <p className="text-lg font-bold font-sans-tech uppercase tracking-wide text-foreground group-hover:text-primary transition-colors truncate">
                              {displayTitle(fullPath)}
                            </p>
                            <p className="text-xs font-mono-tech text-muted-foreground mt-1 break-all">{fullPath}</p>
                          </div>
                        </div>
                        <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground">
                            roboteyeview / Azure Blob
                          </span>
                          <span className="text-xs font-mono-tech text-primary group-hover:text-primary-glow flex items-center gap-1">
                            Open in viewer
                            <span aria-hidden>→</span>
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
