import { useEffect, useMemo, useState } from "react";
import { Film, Workflow } from "lucide-react";
import { HandMeshGenerationPanel } from "./HandMeshGenerationPanel";
import TaskIntelligencePanel, { getTaskIntelligenceFromMetadata } from "./TaskIntelligencePanel";

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
}

export function VideoToolsPanel({
  routePath,
  videos,
  onGenerationSuccess,
  onOpenViewerPath,
}: VideoToolsPanelProps) {
  const [selectedAssetId, setSelectedAssetId] = useState("");

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

  return (
    <div className="z-20 flex w-full shrink-0 flex-col border-t border-border bg-sidebar-background font-sans-tech text-xs text-muted-foreground xl:h-full xl:w-80 xl:border-l xl:border-t-0 2xl:w-96">
      <div className="flex items-center justify-between border-b border-border bg-background/50 p-3">
        <span className="font-sans-tech font-bold text-foreground">Scene Tools</span>
        <Workflow className="h-3.5 w-3.5 text-primary" />
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
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
            <TaskIntelligencePanel
              key={`${selectedVideo.asset_id}-task`}
              assetId={selectedVideo.asset_id}
              videoID={selectedVideo.asset_id}
              videoURL={selectedVideo.url ?? selectedVideo.proxy_url ?? ""}
              initialTasks={initialTasks}
              onGenerated={onGenerationSuccess}
            />
            <HandMeshGenerationPanel
              key={`${selectedVideo.asset_id}-hand`}
              assetId={selectedVideo.asset_id}
              videoName={selectedVideo.name}
              onGenerated={(viewerPath) => {
                onGenerationSuccess?.();
                if (viewerPath && onOpenViewerPath) {
                  onOpenViewerPath(viewerPath);
                }
              }}
            />
          </>
        )}
      </div>

      <div className="flex justify-between border-t border-border bg-background p-3 font-sans-tech text-[10px] select-none text-muted-foreground">
        <span className="truncate pr-2" title={routePath}>
          {sortedVideos.length} video{sortedVideos.length === 1 ? "" : "s"}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <Film className="h-3 w-3" />
          Datara AI Systems
        </span>
      </div>
    </div>
  );
}
