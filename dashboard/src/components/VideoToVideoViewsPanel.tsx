import { Loader2, Video } from 'lucide-react';
import { useState } from 'react';

interface VideoToVideoViewsPanelProps {
    assetId?: string;
    videoID: string;
    videoURL: string;
    datasetName?: string;
}

export default function VideoToVideoViewsPanel({ assetId, videoID, videoURL, datasetName = "default_dataset" }: VideoToVideoViewsPanelProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const generateViews = async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch('/api/generate_video_to_video_views', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    asset_id: assetId || videoID,
                    videoID,
                    videoURL,
                    datasetName
                }),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate video views');
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <label className="mb-3 flex items-center gap-2 font-sans-tech text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Video className="h-4 w-4" />
                Video to Video Views
            </label>

            {!success && !loading && (
                <div className="flex flex-col gap-3">
                    <p className="font-sans-tech text-[11px] leading-relaxed text-muted-foreground">
                        Generate alternative video perspectives using our multiview synthesis technology.
                    </p>
                    <button
                        type="button"
                        onClick={generateViews}
                        className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-2 text-xs font-bold uppercase text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
                    >
                        Generate Views
                    </button>
                </div>
            )}

            {error && (
                <div className="rounded-sm border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                    {error}
                </div>
            )}

            {loading && (
                <div className="flex h-24 flex-col items-center justify-center gap-3 rounded-sm border border-border bg-card/30">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-sans-tech text-xs text-muted-foreground">Generating video views...</span>
                </div>
            )}

            {success && (
                <div className="rounded-sm border border-primary/30 bg-primary/10 px-4 py-3 text-xs text-primary">
                    ✓ Video views generated successfully
                </div>
            )}
        </div>
    );
}
