import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Film, Workflow } from "lucide-react";
import { HandMeshGenerationPanel } from "./HandMeshGenerationPanel";
import TaskIntelligencePanel, { getTaskIntelligenceFromMetadata } from "./TaskIntelligencePanel";
import VideoToVideoViewsPanel from "./VideoToVideoViewsPanel";

export interface VideoFolderAsset {
  asset_id: string;
  name: string;
  url?: string;
  proxy_url?: string;
  metadata?: Record<string, unknown>;
}

interface VideoToolsPanelProps {
  routePath: string;
  videos: VideoFolderAsset[];
  onGenerationSuccess?: () => void;
  onOpenViewerPath?: (viewerPath: string) => void;
  variant?: "side" | "inline";
  showHandMesh?: boolean;
}

type ToolSectionKey = "task" | "views" | "hand";

function videoDatasetName(video: VideoFolderAsset | null) {
  if (!video?.name) return "dataset";
  return video.name.replace(/\.[^/.]+$/, "") || video.name;
}

export function VideoToolsPanel({
  routePath,
  videos,
  onGenerationSuccess,
  onOpenViewerPath,
  variant = "side",
  showHandMesh = true,
}: VideoToolsPanelProps) {
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<ToolSectionKey, boolean>>({
    task: true,
    views: true,
    hand: false,
  });

  const sortedVideos = useMemo(
    () => [...videos].sort((a, b) => a.name.localeCompare(b.name)),
    [videos],
  );

  useEffect(() => {
    setSelectedAssetId((previous) => {
      if (sortedVideos.some((video) => video.asset_id === previous)) {
        return previous;
      }
      return sortedVideos[0]?.asset_id ?? "";
    });
  }, [sortedVideos]);

  const selectedVideo = useMemo(
    () => sortedVideos.find((video) => video.asset_id === selectedAssetId) ?? null,
    [selectedAssetId, sortedVideos],
  );

  const initialTasks = useMemo(
    () => getTaskIntelligenceFromMetadata(selectedVideo?.metadata),
    [selectedVideo],
  );

  if (sortedVideos.length === 0) {
    return null;
  }

  const toggleSection = (section: ToolSectionKey) =>
    setExpandedSections((previous) => ({ ...previous, [section]: !previous[section] }));

  const sectionClassName =
    "overflow-hidden rounded-sm border border-border bg-background/35";
  const sectionButtonClassName =
    "flex w-full items-center justify-between gap-3 px-3 py-3 text-left font-sans-tech text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground";
  const containerClassName =
    variant === "inline"
      ? "space-y-3 rounded-sm border border-border bg-background/30 p-3"
      : "z-20 flex w-full shrink-0 flex-col border-t border-border bg-sidebar-background font-sans-tech text-xs text-muted-foreground xl:h-full xl:w-80 xl:border-l xl:border-t-0 2xl:w-96";
  const bodyClassName =
    variant === "inline"
      ? "space-y-3"
      : "custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4";

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between border-b border-border bg-background/50 p-3">
        <span className="font-sans-tech font-bold text-foreground">Video Tools</span>
        <Workflow className="h-3.5 w-3.5 text-primary" />
      </div>

      <div className={bodyClassName}>
        {sortedVideos.length > 1 && (
          <div className="mb-4 space-y-2">
            <label className="block font-sans-tech text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Video
            </label>
            <select
              value={selectedAssetId}
              onChange={(event) => setSelectedAssetId(event.target.value)}
              className="h-10 w-full rounded-sm border border-border bg-input px-3 font-sans-tech text-xs text-foreground focus:border-primary focus:outline-none"
            >
              {sortedVideos.map((video) => (
                <option key={video.asset_id} value={video.asset_id}>
                  {video.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedVideo && (
          <>
            <section className={sectionClassName}>
              <button
                type="button"
                onClick={() => toggleSection("task")}
                className={sectionButtonClassName}
              >
                <span>Task Analysis</span>
                {expandedSections.task ? (
                  <ChevronDown className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
              {expandedSections.task && (
                <div className="border-t border-border p-3">
                  <TaskIntelligencePanel
                    key={`${selectedVideo.asset_id}-task`}
                    assetId={selectedVideo.asset_id}
                    videoID={selectedVideo.asset_id}
                    videoURL={selectedVideo.url ?? selectedVideo.proxy_url ?? ""}
                    initialTasks={initialTasks}
                    onGenerated={onGenerationSuccess}
                  />
                </div>
              )}
            </section>

            <section className={sectionClassName}>
              <button
                type="button"
                onClick={() => toggleSection("views")}
                className={sectionButtonClassName}
              >
                <span>Video Perspective Generation</span>
                {expandedSections.views ? (
                  <ChevronDown className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
              {expandedSections.views && (
                <div className="border-t border-border p-3">
                  <VideoToVideoViewsPanel
                    key={`${selectedVideo.asset_id}-views`}
                    assetId={selectedVideo.asset_id}
                    videoID={selectedVideo.asset_id}
                    videoURL={selectedVideo.url ?? selectedVideo.proxy_url ?? ""}
                    datasetName={videoDatasetName(selectedVideo)}
                    onGenerated={onGenerationSuccess}
                  />
                </div>
              )}
            </section>

            {showHandMesh && (
              <section className={sectionClassName}>
                <button
                  type="button"
                  onClick={() => toggleSection("hand")}
                  className={sectionButtonClassName}
                >
                  <span>Hand Motion Generation</span>
                  {expandedSections.hand ? (
                    <ChevronDown className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>
                {expandedSections.hand && (
                  <div className="border-t border-border p-3">
                    <HandMeshGenerationPanel
                      key={`${selectedVideo.asset_id}-hand`}
                      assetId={selectedVideo.asset_id}
                      videoUrl={selectedVideo.url || selectedVideo.proxy_url || ""}
                      routePath={routePath}
                      videoName={selectedVideo.name}
                      onGenerated={(viewerPath) => {
                        onGenerationSuccess?.();
                        if (viewerPath && onOpenViewerPath) {
                          onOpenViewerPath(viewerPath);
                        }
                      }}
                    />
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {variant === "side" && (
        <div className="flex justify-between border-t border-border bg-background p-3 font-sans-tech text-[10px] select-none text-muted-foreground">
          <span className="truncate pr-2" title={routePath}>
            {sortedVideos.length} video{sortedVideos.length === 1 ? "" : "s"}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <Film className="h-3 w-3" />
            Datara AI Systems
          </span>
        </div>
      )}
    </div>
  );
}
