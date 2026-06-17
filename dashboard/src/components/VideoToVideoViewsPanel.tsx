import { Loader2, Video } from "lucide-react";
import { useState } from "react";

type Trajectory = "up" | "down" | "left" | "right" | "zoom_in" | "zoom_out";

const TRAJECTORY_OPTIONS: { value: Trajectory; label: string }[] = [
    { value: "up", label: "Up" },
    { value: "down", label: "Down" },
    { value: "left", label: "Left" },
    { value: "right", label: "Right" },
    { value: "zoom_in", label: "Zoom In" },
    { value: "zoom_out", label: "Zoom Out" },
];

interface VideoToVideoViewsPanelProps {
    assetId?: string;
    videoID: string;
    videoURL: string;
    datasetName?: string;
    onGenerated?: () => void;
}

export default function VideoToVideoViewsPanel({
    assetId,
    videoID,
    videoURL,
    datasetName = "default_dataset",
    onGenerated,
}: VideoToVideoViewsPanelProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(
        null,
    );
    const [cached, setCached] = useState(false);
    const [trajectory, setTrajectory] = useState<Trajectory>("left");

    const generateViews = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/generate_video_to_video_views", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    asset_id: assetId || videoID,
                    videoID,
                    videoURL,
                    datasetName,
                    trajectory,
                }),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.error || "Failed to generate video views",
                );
            }

            const proxyUrl = result.data?.proxy_url;
            if (!proxyUrl) {
                throw new Error("Server did not return a video URL");
            }

            setGeneratedVideoUrl(proxyUrl);
            setCached(result.cached ?? false);
            onGenerated?.();
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = () => {
        setGeneratedVideoUrl(null);
        setError(null);
        setCached(false);
    };

    return (
        <div>
            <label className="mb-3 flex items-center gap-2 font-sans-tech text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Video className="h-4 w-4" />
                Video to Video Views
            </label>

            {/* Initial prompt */}
            {!generatedVideoUrl && !loading && (
                <div className="flex flex-col gap-3">
                    <p className="font-sans-tech text-[11px] leading-relaxed text-muted-foreground">
                        Generate alternative video perspectives using our
                        multiview synthesis technology.
                    </p>

                    {/* Trajectory selector */}
                    <div className="flex flex-col gap-1">
                        <label className="font-sans-tech text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Trajectory
                        </label>
                        <select
                            value={trajectory}
                            onChange={(e) =>
                                setTrajectory(e.target.value as Trajectory)
                            }
                            className="rounded-sm border border-border bg-card px-3 py-1.5 font-sans-tech text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            {TRAJECTORY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={generateViews}
                        className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-2 text-xs font-bold uppercase text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
                    >
                        Generate Views
                    </button>
                </div>
            )}

            {/* Error state */}
            {error && !loading && (
                <div className="space-y-2 mt-2">
                    <div className="rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                        <p>{error}</p>
                    </div>
                    {/* This is commented out because the Generate Views button still remains on the screen when the error message is displayed. No need for two buttons asking to regenerate */}
                    {/* <button 
                        type="button"
                        onClick={generateViews}
                        className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-2 text-xs font-bold uppercase text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90"
                    >
                        Try Again
                    </button> */}
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="flex h-24 flex-col items-center justify-center gap-3 rounded-sm border border-border bg-card/30">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-sans-tech text-xs text-muted-foreground">
                        Generating new views — this may take a few minutes…
                    </span>
                </div>
            )}

            {/* Success: generated video player */}
            {generatedVideoUrl && !loading && (
                <div className="space-y-3">
                    {/* <video
                        key={generatedVideoUrl}
                        src={generatedVideoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full rounded-sm border border-border bg-black"
                    />
                    <div className="flex items-center justify-between">
                        <span className="font-sans-tech text-[11px] text-primary">
                            ✓{" "}
                            {cached
                                ? "Loaded from cache"
                                : "Generated successfully"}
                        </span>
                        <div className="flex items-center gap-2">
                            <a
                                href={generatedVideoUrl}
                                download={`generated_${trajectory}.mp4`}
                                className="inline-flex items-center gap-1 rounded-sm border border-primary/30 bg-primary/10 px-2 py-1 font-sans-tech text-[11px] font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
                            >
                                <Download className="h-3 w-3" />
                                Download
                            </a>
                            <button
                                type="button"
                                onClick={handleRegenerate}
                                className="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 font-sans-tech text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <RefreshCw className="h-3 w-3" />
                                Regenerate
                            </button>
                        </div>
                    </div> */}
                    <div className="rounded-sm border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs font-bold text-green-500">
                        ✓ Success!
                    </div>
                </div>
            )}
        </div>
    );
}
