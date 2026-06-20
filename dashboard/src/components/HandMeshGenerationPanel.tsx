import { toast } from "@/components/ui/sonner";
import { Box, Loader2 } from "lucide-react";
import { useState } from "react";
import { QueuedJobStatus } from "./QueuedJobStatus";
import { submitGenerationRequest, useQueuedJob } from "@/lib/lambdaJobs";

interface HandMeshGenerationPanelProps {
  assetId: string;
  videoUrl: string;
  routePath: string;
  videoName: string;
  onGenerated?: (outputViewerPath: string) => void;
}

export function HandMeshGenerationPanel({
  assetId,
  videoUrl,
  routePath,
  videoName,
  onGenerated,
}: HandMeshGenerationPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOutputPath, setLastOutputPath] = useState<string | null>(null);
  const queuedJob = useQueuedJob(`datara-job:hand-motion:${assetId}`, (completedJob) => {
    const outputViewerPath = completedJob.result?.viewer_path ?? "";
    if (completedJob.status === "succeeded" && outputViewerPath) {
      setLastOutputPath(outputViewerPath);
      onGenerated?.(outputViewerPath);
    }
  });

  const generateHandMesh = async () => {
    if (!videoUrl.trim()) {
      setError("No video URL is available for this asset.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await submitGenerationRequest("/api/generate_hand_mesh", {
          video_url: videoUrl,
          route_path: routePath,
          asset_id: assetId,
      });
      queuedJob.trackJob(result);
      toast.success(`Ticket #${result.ticket_number} is queued.`, {
        description: "You can follow its position and estimated wait below.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Hand mesh generation failed";
      setError(message);
      toast.error("Hand mesh generation did not complete", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 border-t border-border pt-6">
      <label className="mb-3 flex items-center gap-2 font-sans-tech text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Box className="h-4 w-4" />
        Hand Mesh Generation
      </label>

      <p className="mb-3 font-sans-tech text-[11px] leading-relaxed text-muted-foreground">
        Run the hand mesh generation pipeline on{" "}
        <span className="font-medium text-foreground">{videoName}</span> to produce hand mesh
        visualization videos.
      </p>

      <button
        type="button"
        onClick={() => void generateHandMesh()}
        disabled={loading || queuedJob.isActive || !videoUrl.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-2 text-xs font-bold uppercase text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {queuedJob.isActive ? "Request in progress" : loading ? "Submitting..." : "Generate hand mesh"}
      </button>

      {error !== null && (
        <div className="mt-3 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          {error}
        </div>
      )}

      <QueuedJobStatus
        jobs={queuedJob.jobs}
        onOpenViewerPath={(viewerPath) => onGenerated?.(viewerPath)}
        onClear={queuedJob.clearJob}
      />

      {lastOutputPath && !loading && (
        <button
          type="button"
          onClick={() => onGenerated?.(lastOutputPath)}
          className="mt-3 w-full rounded-sm border border-primary/25 bg-primary/5 px-3 py-2 text-[11px] font-sans-tech font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          Open dataset results
        </button>
      )}
    </div>
  );
}
