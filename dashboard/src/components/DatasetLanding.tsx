import { toast } from "@/components/ui/sonner";
import type { DatasetAsset, DatasetManifest, DatasetMiscSection } from "@/lib/dataViewerTypes";
import { folderPreviewMediaUrl } from "@/lib/datasetFolderCover";
import { trainingDataDownloadCoordinator } from "@/lib/sequentialDownloadCoordinator";
import { ChevronDown, ChevronRight, Download, FileJson, FileText, Film, FolderOpen, Trash2 } from "lucide-react";
import type { SyntheticEvent } from "react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

interface DatasetLandingProps {
  manifest: DatasetManifest;
  canUseGenerationTools?: boolean;
  canDeleteDataset?: boolean;
  onDeleteDataset?: () => void;
  canDeleteAssets?: boolean;
  onDeleteAsset?: (asset: DatasetAsset) => void;
  onDeleteMiscSection?: (section: DatasetMiscSection) => void;
  onNavigate: (path: string) => void;
  onOpenAsset: (asset: DatasetAsset) => void;
}

function assetUrl(asset: DatasetAsset) {
  return asset.proxy_url || asset.url;
}

function fileTypeLabel(asset: DatasetAsset) {
  const type = String(asset.type || "").toLowerCase();
  if (type === "video") return "Video";
  if (type === "mcap") return "MCAP";
  if (type === "npz") return "NPZ";
  if (type === "json") return "JSON";
  if (type === "3d") return "OBJ";
  if (type === "markdown") return "Markdown";
  return "File";
}

interface DatasetShowcaseVideo {
  title: string;
  eyebrow: string;
  description: string;
  blobPath: string;
}

const DATASET_SHOWCASE_VIDEOS: Record<string, DatasetShowcaseVideo[]> = {
  "serverrack/datarackinstall": [
    {
      title: "Original",
      eyebrow: "Source clip",
      description: "Original rack-install footage.",
      blobPath: "serverrack/dataRackInstall/showcase/original.mp4",
    },
    {
      title: "Occlusion Removal",
      eyebrow: "No-person generation",
      description: "Installer removed while preserving rack context.",
      blobPath: "serverrack/dataRackInstall/showcase/occlusion-removal.mp4",
    },
    {
      title: "New Angle",
      eyebrow: "Generated view",
      description: "Alternate viewpoint generated from the source clip.",
      blobPath: "serverrack/dataRackInstall/showcase/new-angle.mp4",
    },
  ],
  "serverrack/pduinstallation": [
    {
      title: "Original",
      eyebrow: "Source clip",
      description: "Original PDU installation footage.",
      blobPath: "serverrack/pduInstallation/showcase/original.mp4",
    },
    {
      title: "Occlusion Removal",
      eyebrow: "No-person generation",
      description: "Installer removed while preserving rack context.",
      blobPath: "serverrack/pduInstallation/showcase/occlusion-removal.mp4",
    },
    {
      title: "New Angle",
      eyebrow: "Generated view",
      description: "Alternate viewpoint generated from the source clip.",
      blobPath: "serverrack/pduInstallation/showcase/new-angle.mp4",
    },
  ],
  "serverrack/ad-plugging-cable": [
    {
      title: "Original",
      eyebrow: "Source clip",
      description: "Original cable-plugging footage.",
      blobPath: "serverrack/AD-Plugging-Cable/showcase/original.mp4",
    },
    {
      title: "New Angle",
      eyebrow: "Generated view",
      description: "Alternate viewpoint generated from the source clip.",
      blobPath: "serverrack/AD-Plugging-Cable/showcase/new-angle.mp4",
    },
    {
      title: "Zoom View",
      eyebrow: "Generated view",
      description: "A generated framing change for closer task context.",
      blobPath: "serverrack/AD-Plugging-Cable/showcase/generated-zoom.mp4",
    },
  ],
  "serverrack/cableinsertion": [
    {
      title: "Original",
      eyebrow: "Source clip",
      description: "Original cable insertion footage.",
      blobPath: "serverrack/cableInsertion/showcase/original.mp4",
    },
    {
      title: "No Hands",
      eyebrow: "No-hands generation",
      description: "Hands removed from the cable insertion clip for cleaner task context.",
      blobPath: "serverrack/cableInsertion/showcase/no-hands.mp4",
    },
    {
      title: "Zoom View",
      eyebrow: "Generated view",
      description: "A generated framing change for closer task context.",
      blobPath: "serverrack/cableInsertion/showcase/generated-zoom.mp4",
    },
  ],
  "dexterity/plasticpacking": [
    {
      title: "Original",
      eyebrow: "Source clip",
      description: "Original dexterity footage.",
      blobPath: "dexterity/plasticPacking/showcase/original.mp4",
    },
    {
      title: "Hand Motion Src Cam",
      eyebrow: "Hand-motion output",
      description: "Source-camera hand-motion visualisation.",
      blobPath: "dexterity/plasticPacking/showcase/hand-motion-src-cam.mp4",
    },
    {
      title: "MoCap Visualisation",
      eyebrow: "Motion output",
      description: "MoCap visualisation for the same plastic packing task.",
      blobPath: "dexterity/plasticPacking/showcase/mcap-visualization.mp4",
    },
  ],
  "dexterity/cheesesandwich": [
    {
      title: "Original",
      eyebrow: "Source clip",
      description: "Original sandwich-making footage.",
      blobPath: "dexterity/cheeseSandwich/showcase/original.mp4",
    },
    {
      title: "Hand Motion Src Cam",
      eyebrow: "Hand-motion output",
      description: "Source-camera hand-motion visualisation.",
      blobPath: "dexterity/cheeseSandwich/showcase/hand-motion-src-cam.mp4",
    },
    {
      title: "MoCap Visualisation",
      eyebrow: "Motion output",
      description: "MoCap visualisation for the same sandwich-making task.",
      blobPath: "dexterity/cheeseSandwich/showcase/mcap-visualization.mp4",
    },
  ],
  "dexterity/towel": [
    {
      title: "Original",
      eyebrow: "Source clip",
      description: "Original towel manipulation footage.",
      blobPath: "dexterity/towel/showcase/original.mp4",
    },
    {
      title: "Hand Motion Src Cam",
      eyebrow: "Hand-motion output",
      description: "Source-camera hand-motion visualisation.",
      blobPath: "dexterity/towel/showcase/hand-motion-src-cam.mp4",
    },
    {
      title: "MoCap Visualisation",
      eyebrow: "Motion output",
      description: "Overlayed hand-motion visualisation for the same task.",
      blobPath: "dexterity/towel/showcase/mcap-visualization.mp4",
    },
  ],
};

function datasetShowcaseKey(manifest: DatasetManifest) {
  return (manifest.dataset.prefix || manifest.dataset.viewer_path.replace(/^\/viewer\//, ""))
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

function handleShowcaseMouseEnter(event: SyntheticEvent<HTMLVideoElement>) {
  event.currentTarget.play().catch(() => undefined);
}

function handleShowcaseMouseLeave(event: SyntheticEvent<HTMLVideoElement>) {
  event.currentTarget.pause();
  event.currentTarget.currentTime = 0;
}

function DatasetShowcaseVideoCard({ video }: { video: DatasetShowcaseVideo & { src: string } }) {
  return (
    <article className="group overflow-hidden rounded-[22px] border border-slate-200 bg-card shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
      <div className="relative aspect-video overflow-hidden bg-slate-950">
        <video
          src={video.src}
          muted
          loop
          playsInline
          preload="metadata"
          onMouseEnter={handleShowcaseMouseEnter}
          onMouseLeave={handleShowcaseMouseLeave}
          onFocus={handleShowcaseMouseEnter}
          onBlur={handleShowcaseMouseLeave}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/20 bg-slate-950/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white">
          Hover to play
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
          {video.eyebrow}
        </div>
        <h3 className="text-sm font-black text-slate-950">{video.title}</h3>
        <p className="text-xs leading-5 text-slate-500">{video.description}</p>
      </div>
    </article>
  );
}

function renderMarkdown(markdown: string) {
  const blocks = markdown
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    if (block.startsWith("# ")) {
      return (
        <h1 key={index} className="text-2xl font-black tracking-[-0.02em] text-slate-950">
          {block.replace(/^#\s+/, "")}
        </h1>
      );
    }
    if (block.startsWith("## ")) {
      return (
        <h2 key={index} className="text-base font-extrabold uppercase tracking-[0.12em] text-primary">
          {block.replace(/^##\s+/, "")}
        </h2>
      );
    }
    if (block.split("\n").every((line) => line.trim().startsWith("- "))) {
      return (
        <ul key={index} className="space-y-2 pl-4 text-sm leading-6 text-slate-600">
          {block.split("\n").map((line) => (
            <li key={line} className="list-disc">
              {line.trim().replace(/^-\s+/, "")}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={index} className="whitespace-pre-line text-sm leading-7 text-slate-600">
        {block}
      </p>
    );
  });
}

function MiscCard({
  section,
  onNavigate,
  canDelete,
  onDelete,
}: {
  section: DatasetMiscSection;
  onNavigate: (path: string) => void;
  canDelete?: boolean;
  onDelete?: (section: DatasetMiscSection) => void;
}) {
  return (
    <div className="group relative rounded-[18px] border border-slate-200 bg-card p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition-all hover:border-primary/25 hover:shadow-[0_18px_38px_rgba(15,23,42,0.08)]">
      <button
        type="button"
        onClick={() => onNavigate(section.viewer_path)}
        className="block w-full text-left"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FolderOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-extrabold text-slate-950">{section.label}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Misc folder - {section.asset_count} asset{section.asset_count === 1 ? "" : "s"}
            </div>
          </div>
          <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
      </button>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onNavigate(section.viewer_path)}
          className="inline-flex h-9 items-center rounded-xl border border-primary/20 bg-primary/8 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/12"
        >
          Open folder
        </button>
        {canDelete && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(section)}
            aria-label="Delete folder"
            title="Delete folder"
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function DownloadCard({
  asset,
  label,
  onOpenAsset,
  canDelete,
  onDelete,
}: {
  asset: DatasetAsset;
  label?: string;
  onOpenAsset: (asset: DatasetAsset) => void;
  canDelete?: boolean;
  onDelete?: (asset: DatasetAsset) => void;
}) {
  const isPlayable = asset.type === "video" || asset.type === "3d";
  const Icon = asset.type === "json" ? FileJson : asset.type === "video" ? Film : FileText;

  return (
    <div className="relative rounded-[18px] border border-slate-200 bg-card p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-extrabold text-slate-950" title={asset.name}>
            {asset.name}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {label ?? fileTypeLabel(asset)}
          </div>
        </div>
      </div>
      <div className={`mt-4 flex flex-wrap gap-2 ${canDelete && onDelete ? "pr-11" : ""}`}>
        {isPlayable && (
          <button
            type="button"
            onClick={() => onOpenAsset(asset)}
            className="inline-flex h-9 items-center rounded-xl border border-primary/20 bg-primary/8 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/12"
          >
            Open
          </button>
        )}
        <a
          href={assetUrl(asset)}
          download={asset.name}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white transition-opacity hover:opacity-90"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>
      {canDelete && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(asset)}
          aria-label="Delete file"
          title="Delete file"
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function DatasetLanding({
  manifest,
  canDeleteDataset,
  onDeleteDataset,
  canDeleteAssets,
  onDeleteAsset,
  onDeleteMiscSection,
  onNavigate,
  onOpenAsset,
}: DatasetLandingProps) {
  const [readmeOpen, setReadmeOpen] = useState(false);
  const [readmeText, setReadmeText] = useState("");
  const [readmeError, setReadmeError] = useState("");
  const downloadState = useSyncExternalStore(
    trainingDataDownloadCoordinator.subscribe,
    trainingDataDownloadCoordinator.getSnapshot,
    trainingDataDownloadCoordinator.getSnapshot,
  );
  const showcaseVideos = useMemo(
    () =>
      (DATASET_SHOWCASE_VIDEOS[datasetShowcaseKey(manifest)] ?? [])
        .map((video) => {
          const src = folderPreviewMediaUrl(video.blobPath);
          return src ? { ...video, src } : null;
        })
        .filter((video): video is DatasetShowcaseVideo & { src: string } => Boolean(video)),
    [manifest],
  );

  const visibleMiscSections = useMemo(
    () => {
      const sections = Object.values(manifest.misc).filter((section) => section.exists);
      const hasHandmeshesSection = sections.some((section) => section.key === "handmeshes");
      if (manifest.hand_meshes.length > 0 && !hasHandmeshesSection) {
        sections.push({
          key: "handmeshes",
          label: "handmeshes",
          exists: true,
          asset_count: manifest.hand_meshes.length,
          viewer_path: `${manifest.dataset.viewer_path.replace(/\/$/, "")}/hand_meshes`,
        });
      }
      return sections;
    },
    [manifest.dataset.viewer_path, manifest.hand_meshes.length, manifest.misc],
  );

  const downloadableAssets = useMemo(
    () => [
      ...(manifest.primary_video ? [{ asset: manifest.primary_video, label: "Original input video" }] : []),
      ...manifest.downloads.map((asset) => ({ asset, label: undefined })),
    ],
    [manifest.downloads, manifest.primary_video],
  );

  const handleDownloadAll = async () => {
    if (downloadState.status === "running") return;

    const items = downloadableAssets.map(({ asset }) => ({
      url: assetUrl(asset),
      filename: asset.name,
    }));

    if (items.length === 0) {
      toast.info("No training-ready files are available yet.");
      return;
    }

    const summary = await trainingDataDownloadCoordinator.start(items, {
      checkAvailability: async (item) => {
        if (!item.url) return false;
        const response = await fetch(item.url, {
          method: "HEAD",
          credentials: "include",
        });
        return response.ok;
      },
      triggerDownload: (item) => {
        if (!item.url) throw new Error("Unavailable download");

        const link = document.createElement("a");
        link.href = item.url;
        link.download = item.filename;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
      },
      waitBetweenDownloads: () =>
        new Promise((resolve) => window.setTimeout(resolve, 350)),
    });

    if (summary.started === 0) {
      toast.error("No downloads could be started.", {
        description: "The files may be unavailable or blocked by the browser.",
      });
    } else if (summary.skipped > 0) {
      toast.warning("Some downloads could not be started.", {
        description: `${summary.started} started, ${summary.skipped} skipped.`,
      });
    } else {
      toast.success("All training-ready downloads started.", {
        description: `${summary.started} file${summary.started === 1 ? "" : "s"} sent to the browser.`,
      });
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadReadme() {
      setReadmeError("");
      setReadmeText("");
      if (!readmeOpen || !manifest.readme) return;

      try {
        const response = await fetch(assetUrl(manifest.readme), { credentials: "include" });
        if (!response.ok) throw new Error("README could not be loaded.");
        const text = await response.text();
        if (!cancelled) setReadmeText(text);
      } catch (error) {
        if (!cancelled) {
          setReadmeError(error instanceof Error ? error.message : "README could not be loaded.");
        }
      }
    }

    void loadReadme();
    return () => {
      cancelled = true;
    };
  }, [manifest.readme, readmeOpen]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1320px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {showcaseVideos.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="h-3 w-3 rounded-[4px] bg-primary" />
            <div>
              <h2 className="text-lg font-black text-slate-950">Dataset Previews</h2>
              <p className="text-xs font-medium text-slate-500">
                Hover each clip to preview the source and generated outputs.
              </p>
            </div>
            <div className="hidden h-px min-w-8 flex-1 bg-gradient-to-r from-primary/20 to-transparent sm:block" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {showcaseVideos.map((video) => (
              <DatasetShowcaseVideoCard key={video.blobPath} video={video} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="h-3 w-3 rounded-[4px] bg-slate-950" />
              <h2 className="text-lg font-black text-slate-950">Training Ready Files</h2>
              <div className="hidden h-px min-w-8 flex-1 bg-gradient-to-r from-slate-300 to-transparent sm:block" />
              <button
                type="button"
                onClick={() => void handleDownloadAll()}
                disabled={downloadableAssets.length === 0 || downloadState.status === "running"}
                aria-label="Download all training ready data"
                title="Download all training ready data"
                className="ml-auto inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {downloadState.status === "running" ? (
                  <span>
                    {downloadState.current === 0
                      ? "Preparing downloads"
                      : `Downloading ${downloadState.current} of ${downloadState.total}`}
                  </span>
                ) : (
                  <>
                    <span className="sm:hidden">Download all</span>
                    <span className="hidden sm:inline">Download all training ready data</span>
                  </>
                )}
              </button>
            </div>
            {downloadableAssets.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {downloadableAssets.map(({ asset, label }) => (
                  <DownloadCard
                    key={asset.asset_id}
                    asset={asset}
                    label={label}
                    onOpenAsset={onOpenAsset}
                    canDelete={canDeleteAssets}
                    onDelete={onDeleteAsset}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-slate-300 bg-muted/60 p-6 text-sm text-slate-500">
                No training-ready files have been generated yet.
              </div>
            )}
          </section>

        </div>

        <div className="space-y-6">
          <section className="rounded-[22px] border border-slate-200 bg-card p-5 shadow-[0_14px_38px_rgba(15,23,42,0.05)]">
            <button
              type="button"
              onClick={() => setReadmeOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-slate-950">README</h2>
                  <p className="truncate text-xs text-slate-500">
                    {readmeOpen ? "Hide navigation guide" : "Open navigation guide"}
                  </p>
                </div>
              </div>
              {readmeOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              )}
            </button>

            {readmeOpen && (
              <div className="mt-4 space-y-4 rounded-[18px] border border-slate-200 bg-muted/60 p-5">
                {readmeText ? (
                  renderMarkdown(readmeText)
                ) : readmeError ? (
                  <p className="text-sm text-slate-500">{readmeError}</p>
                ) : manifest.readme ? (
                  <p className="text-sm text-slate-500">Loading README...</p>
                ) : (
                  <p className="text-sm text-slate-500">No README has been uploaded yet.</p>
                )}
              </div>
            )}
          </section>

          {canDeleteDataset && onDeleteDataset && (
            <button
              type="button"
              onClick={onDeleteDataset}
              className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-destructive/30 bg-card p-5 text-left shadow-[0_14px_38px_rgba(15,23,42,0.05)] transition-colors hover:bg-destructive/5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-destructive">Delete dataset</h2>
                  <p className="truncate text-xs text-muted-foreground">Remove this dataset and all its contents</p>
                </div>
              </div>
            </button>
          )}

          {visibleMiscSections.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-3">
                <span className="h-3 w-3 rounded-[4px] bg-primary" />
                <h2 className="text-lg font-black text-slate-950">Misc</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
              </div>
              <div className="grid gap-4">
                {visibleMiscSections.map((section) => (
                  <MiscCard
                    key={section.key}
                    section={section}
                    onNavigate={onNavigate}
                    canDelete={canDeleteAssets}
                    onDelete={onDeleteMiscSection}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
