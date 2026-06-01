import { toast } from "@/components/ui/sonner";
import { Box, Loader2 } from "lucide-react";
import { useState } from "react";

interface HandMeshGenerationPanelProps {
  assetId: string;
  videoName: string;
  onGenerated?: (outputViewerPath: string) => void;
}

export function HandMeshGenerationPanel({
  assetId,
  videoName,
  onGenerated,
}: HandMeshGenerationPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOutputPath, setLastOutputPath] = useState<string | null>(null);

  const generateHandMesh = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate_hand_mesh", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assetId }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Hand mesh generation failed");
      }

      const outputViewerPath =
        typeof result.output_viewer_path === "string" ? result.output_viewer_path : "";
      const videoCount = Array.isArray(result.output_videos) ? result.output_videos.length : 0;
      const artifactCount = Array.isArray(result.output_artifacts) ? result.output_artifacts.length : 0;

      if (outputViewerPath) {
        setLastOutputPath(outputViewerPath);
      }

      const outputSummary = [
        videoCount > 0 ? `${videoCount} video${videoCount === 1 ? "" : "s"}` : "",
        artifactCount > 0 ? `${artifactCount} file${artifactCount === 1 ? "" : "s"}` : "",
      ]
        .filter(Boolean)
        .join(" and ");

      toast.success(result.message || "Hand mesh outputs are ready.", {
        description: outputSummary
          ? `${outputSummary} saved under hand_mesh for this sequence.`
          : "Open the hand_mesh folder to view the results.",
        action: outputViewerPath
          ? {
            label: "Open results",
            onClick: () => onGenerated?.(outputViewerPath),
          }
          : undefined,
      });

      onGenerated?.(outputViewerPath);
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
        onClick={generateHandMesh}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-2 text-xs font-bold uppercase text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {loading ? "Generating hand mesh..." : "Generate hand mesh"}
      </button>

      {error && (
        <div className="mt-3 rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {lastOutputPath && !loading && (
        <button
          type="button"
          onClick={() => onGenerated?.(lastOutputPath)}
          className="mt-3 w-full rounded-sm border border-primary/25 bg-primary/5 px-3 py-2 text-[11px] font-sans-tech font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          Open hand mesh results folder
        </button>
      )}
    </div>
  );
}
