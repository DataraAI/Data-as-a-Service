import type { DatasetAsset, DatasetManifest, DatasetMiscSection } from "@/lib/dataViewerTypes";
import { Box, ChevronRight, Download, FileJson, FileText, Film, FolderOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface DatasetLandingProps {
  manifest: DatasetManifest;
  canUseGenerationTools?: boolean;
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
}: {
  section: DatasetMiscSection;
  onNavigate: (path: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(section.viewer_path)}
      className="group rounded-[22px] border border-slate-200 bg-slate-50 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white hover:shadow-[0_22px_45px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FolderOpen className="h-5 w-5" />
        </div>
        <ChevronRight className="mt-2 h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <div className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        Misc
      </div>
      <div className="mt-1 text-lg font-black text-slate-950">{section.label}</div>
      <div className="mt-2 text-sm text-slate-500">
        {section.asset_count} asset{section.asset_count === 1 ? "" : "s"}
      </div>
    </button>
  );
}

function DownloadCard({
  asset,
  onOpenAsset,
}: {
  asset: DatasetAsset;
  onOpenAsset: (asset: DatasetAsset) => void;
}) {
  const isPlayable = asset.type === "video" || asset.type === "3d";
  const Icon = asset.type === "json" ? FileJson : asset.type === "video" ? Film : FileText;

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-extrabold text-slate-950" title={asset.name}>
            {asset.name}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {fileTypeLabel(asset)}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
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
    </div>
  );
}

export function DatasetLanding({
  manifest,
  canUseGenerationTools = false,
  onNavigate,
  onOpenAsset,
}: DatasetLandingProps) {
  const [readmeText, setReadmeText] = useState("");
  const [readmeError, setReadmeError] = useState("");

  const visibleMiscSections = useMemo(
    () => Object.values(manifest.misc).filter((section) => section.exists),
    [manifest.misc],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadReadme() {
      setReadmeError("");
      setReadmeText("");
      if (!manifest.readme) return;

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
  }, [manifest.readme]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1320px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.08)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="p-6 md:p-8">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              {manifest.dataset.vertical}
            </div>
            <h1 className="marketing-display-title mt-2 text-[clamp(2rem,5vw,4rem)] font-black tracking-[-0.035em] text-slate-950">
              {manifest.dataset.task_label}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Dataset files are organized by generated asset type. Use README for navigation,
              Misc for frame-by-frame data, and the root downloads for videos and structured files.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Container
                </div>
                <div className="mt-1 truncate text-sm font-bold text-slate-950">
                  {manifest.dataset.container}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Task slug
                </div>
                <div className="mt-1 truncate text-sm font-bold text-slate-950">
                  {manifest.dataset.task_slug}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Assets
                </div>
                <div className="mt-1 text-sm font-bold text-slate-950">
                  {manifest.downloads.length + visibleMiscSections.length + manifest.hand_meshes.length}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-950 p-5 lg:border-l lg:border-t-0">
            {manifest.primary_video ? (
              <div className="flex h-full flex-col">
                <video
                  src={assetUrl(manifest.primary_video)}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full rounded-[22px] border border-white/10 bg-black object-contain"
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-white">
                      {manifest.primary_video.name}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                      Original input video
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenAsset(manifest.primary_video!)}
                    className="rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-950 transition-opacity hover:opacity-90"
                  >
                    {canUseGenerationTools ? "Open tools" : "Open video"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[260px] items-center justify-center rounded-[22px] border border-dashed border-white/15 text-sm text-white/50">
                No root video uploaded yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">README</h2>
              <p className="text-xs text-slate-500">How to navigate this dataset</p>
            </div>
          </div>
          <div className="space-y-4 rounded-[18px] border border-slate-200 bg-slate-50 p-5">
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
        </div>

        <div className="space-y-6">
          {visibleMiscSections.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-3">
                <span className="h-3 w-3 rounded-[4px] bg-primary" />
                <h2 className="text-lg font-black text-slate-950">Misc</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleMiscSections.map((section) => (
                  <MiscCard key={section.key} section={section} onNavigate={onNavigate} />
                ))}
              </div>
            </section>
          )}

          {manifest.downloads.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-3">
                <span className="h-3 w-3 rounded-[4px] bg-slate-950" />
                <h2 className="text-lg font-black text-slate-950">Downloadable Files</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-300 to-transparent" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {manifest.downloads.map((asset) => (
                  <DownloadCard key={asset.asset_id} asset={asset} onOpenAsset={onOpenAsset} />
                ))}
              </div>
            </section>
          )}

          {manifest.hand_meshes.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-3">
                <span className="h-3 w-3 rounded-[4px] bg-amber-500" />
                <h2 className="text-lg font-black text-slate-950">Hand Meshes</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-amber-200 to-transparent" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {manifest.hand_meshes.map((asset) => (
                  <button
                    key={asset.asset_id}
                    type="button"
                    onClick={() => onOpenAsset(asset)}
                    className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white p-4 text-left shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition-all hover:border-amber-300 hover:shadow-[0_20px_42px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <Box className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold text-slate-950">
                        {asset.name}
                      </div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        View OBJ mesh
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
