import { ChevronLeft, ChevronRight, Copy, Download, Film, Info, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ThreeDViewer } from "./ThreeDViewer";
import { VideoToolsPanel } from "./VideoToolsPanel";

interface ImageModalProps {
  image: any;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onEgoGenSuccess?: () => void;
  onCornerCaseSuccess?: () => void;
  onVlmSuccess?: () => void;
  canUseGenerationTools?: boolean;
  routePath?: string;
  showHandMeshGeneration?: boolean;
  onVideoToolSuccess?: () => void;
  onOpenViewerPath?: (viewerPath: string) => void;
}

const VLM_PRESET_OPTIONS = [
  { value: "describe_image", label: "Describe the image." },
  { value: "task_completed", label: "Has the task been completed?" },
  { value: "sensor_modalities", label: "What are the sensor modalities detected?" },
];

function isExoSourceImage(image: any): boolean {
  if (!image || image.type === "3d" || image.type === "video") return false;
  const blobId = typeof image.id === "string" ? image.id : "";
  if (blobId.includes("/egos/")) return false;
  if (image.metadata?.view === "exo") return true;
  if (blobId.includes("/orig/")) return true;
  if (Array.isArray(image.tags) && image.tags.includes("exocentric")) return true;
  return false;
}

export function ImageModal({
  image,
  onClose,
  onNext,
  onPrev,
  onEgoGenSuccess,
  onCornerCaseSuccess,
  onVlmSuccess,
  canUseGenerationTools = false,
  routePath = "",
  showHandMeshGeneration = false,
  onVideoToolSuccess,
  onOpenViewerPath,
}: ImageModalProps) {
  const [selectedCameraWork, setSelectedCameraWork] = useState("Rotate right 45 degrees");
  const [isGeneratingEgo, setIsGeneratingEgo] = useState(false);
  const [cornerCasePrompt, setCornerCasePrompt] = useState("");
  const [isAddingCornerCase, setIsAddingCornerCase] = useState(false);
  const [vlmPromptMode, setVlmPromptMode] = useState<"preset" | "custom">("preset");
  const [selectedVlmPreset, setSelectedVlmPreset] = useState("describe_image");
  const [customVlmPrompt, setCustomVlmPrompt] = useState("");
  const [isCreatingVlmTags, setIsCreatingVlmTags] = useState(false);

  const sourceVisibility = image?.dataset?.visibility ?? image?.metadata?.visibility ?? "public";
  const isVideo = image?.type === "video";
  const isStillImage = image?.type === "image";
  const canShowVideoTools = Boolean(canUseGenerationTools && isVideo && image?.is_primary_input);
  const isMcap = image?.type === "mcap" || typeof image?.name === "string" && image.name.toLowerCase().endsWith(".mcap");
  const assetUrl = image?.proxy_url || image?.url;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && onNext) onNext();
      if (event.key === "ArrowLeft" && onPrev) onPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNext, onPrev]);

  const existingVlmRuns = useMemo(() => {
    const rawRuns = image?.metadata?.vlm?.runs;
    if (!rawRuns || typeof rawRuns !== "object") {
      return [] as Array<[string, { effective_prompt?: string; tags?: string[] }]>;
    }
    return Object.entries(rawRuns as Record<string, { effective_prompt?: string; tags?: string[] }>).filter(
      ([, run]) => Array.isArray(run?.tags) && run.tags.length > 0,
    );
  }, [image]);

  if (!image) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const submitDerivedRequest = async (
    endpoint: "/api/generate_ego" | "/api/generate_corner_case",
    payload: Record<string, unknown>,
    setLoading: (value: boolean) => void,
    onSuccess?: () => void,
  ) => {
    setLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }
      alert(data.message || "Request completed successfully.");
      onSuccess?.();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      alert(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const createVlmTags = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload =
      vlmPromptMode === "custom"
        ? { prompt_mode: "custom", custom_prompt: customVlmPrompt.trim(), asset_id: image.asset_id }
        : { prompt_mode: "preset", prompt_preset: selectedVlmPreset, asset_id: image.asset_id };
    if (vlmPromptMode === "custom" && !customVlmPrompt.trim()) return;

    setIsCreatingVlmTags(true);
    try {
      const response = await fetch("/api/create_vlm_tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Create VLM tags failed");
      alert(data.message || "VLM tags created successfully.");
      onVlmSuccess?.();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Create VLM tags failed";
      alert(`Error: ${message}`);
    } finally {
      setIsCreatingVlmTags(false);
    }
  };

  const generateEgoView = async (event: React.FormEvent) => {
    event.preventDefault();
    const prompt = `${selectedCameraWork}, and remove the human(s).`;
    await submitDerivedRequest(
      "/api/generate_ego",
      {
        prompt,
        asset_id: image.asset_id,
        date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
        tags: ["egocentric", selectedCameraWork, "no human"],
      },
      setIsGeneratingEgo,
      onEgoGenSuccess,
    );
  };

  const addCornerCase = async (event: React.FormEvent) => {
    event.preventDefault();
    const prompt = cornerCasePrompt.trim();
    if (!prompt) return;
    await submitDerivedRequest(
      "/api/generate_corner_case",
      {
        prompt,
        asset_id: image.asset_id,
        date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
        tags: ["corner_case", prompt],
      },
      setIsAddingCornerCase,
      onCornerCaseSuccess,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-background/95 backdrop-blur-md">
      <div
        className="group flex w-16 cursor-pointer items-center justify-center transition-colors hover:bg-primary/5"
        onClick={onPrev}
      >
        <ChevronLeft className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-8">
        {image.type === "3d" ? (
          <div className="relative h-full w-full max-w-4xl rounded-lg border border-border bg-card/50">
            <ThreeDViewer key={`${assetUrl}-${image.name}`} url={assetUrl} fileName={image.name} />
          </div>
        ) : isVideo ? (
          <video
            src={assetUrl}
            controls
            playsInline
            preload="metadata"
            className="max-h-full max-w-full rounded-sm border border-border bg-black/50 shadow-2xl"
          />
        ) : isMcap ? (
          <div className="flex h-64 w-full max-w-md flex-col items-center justify-center rounded-xl border border-border bg-card/40 p-8 text-center shadow-2xl">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Film className="h-6 w-6" />
            </div>
            <h3 className="font-sans-tech text-sm font-bold text-foreground">{image.name}</h3>
            <p className="mt-1 font-sans-tech text-xs text-muted-foreground">MCAP Robotics Data Container</p>
          </div>
        ) : (
          <img
            src={assetUrl}
            alt={image.name}
            className="max-h-full max-w-full rounded-sm border border-border bg-black/50 object-contain shadow-2xl"
          />
        )}
      </div>
      <div
        className="group flex w-16 cursor-pointer items-center justify-center transition-colors hover:bg-primary/5"
        onClick={onNext}
      >
        <ChevronRight className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <div className="z-20 flex w-96 flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-card p-4">
          <h2 className="font-sans-tech font-bold text-foreground tracking-tight">Asset Details</h2>
          <button
            onClick={onClose}
            className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block font-sans-tech text-xs font-bold uppercase tracking-widest text-muted-foreground">
                File Path
              </label>
              <div className="flex items-center space-x-2 rounded-sm border border-border bg-input p-2">
                <code className="flex-1 truncate text-xs text-primary">{image.id}</code>
                <button onClick={() => copyToClipboard(image.id)} className="text-muted-foreground hover:text-foreground">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block font-sans-tech text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Asset Id
              </label>
              <div className="flex items-center space-x-2 rounded-sm border border-border bg-input p-2">
                <code className="flex-1 truncate text-xs text-blue-400">{image.asset_id}</code>
                <button
                  onClick={() => copyToClipboard(image.asset_id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
            {isVideo && (
              <a
                href={assetUrl}
                download={image.name}
                className="inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-sans-tech font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
              >
                <Download className="h-3.5 w-3.5" />
                Download video
              </a>
            )}
            {isMcap && (
              <a
                href={assetUrl}
                download={image.name}
                className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-xs font-sans-tech font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                Download Raw MCAP File
              </a>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center">
              <Info className="mr-2 h-3 w-3 text-muted-foreground" />
              <label className="font-sans-tech text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Properties
              </label>
            </div>
            <div className="divide-y divide-border rounded-sm border border-border bg-background/50 text-[11px]">
              <div className="flex justify-between gap-3 p-3">
                <span className="font-medium text-muted-foreground">Date Captured</span>
                <span className="text-right text-foreground">
                  {image.metadata?.date
                    ? `${image.metadata.date.substring(0, 4)}-${image.metadata.date.substring(4, 6)}-${image.metadata.date.substring(6, 8)}`
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between gap-3 p-3">
                <span className="font-medium text-muted-foreground">View</span>
                <span className="text-right text-foreground">{image.metadata?.view || "N/A"}</span>
              </div>
              <div className="flex justify-between gap-3 p-3">
                <span className="font-medium text-muted-foreground">Asset Type</span>
                <span className="text-right text-foreground">
                  {image.type === "3d" ? "3D model" : isVideo ? "Video" : isMcap ? "MCAP File" : "Image"}
                </span>
              </div>
              {isVideo && (
                <div className="flex justify-between gap-3 p-3">
                  <span className="font-medium text-muted-foreground">Playback</span>
                  <span className="inline-flex items-center gap-1 text-right text-foreground">
                    <Film className="h-3.5 w-3.5 text-primary" />
                    Watch in browser or download
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-3 p-3">
                <span className="font-medium text-muted-foreground">Visibility</span>
                <span className="text-right text-foreground">{sourceVisibility}</span>
              </div>
              <div className="flex justify-between gap-3 p-3">
                <span className="font-medium text-muted-foreground">Task</span>
                <span className="max-w-[65%] break-words text-right text-foreground">
                  {image.metadata?.task || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {existingVlmRuns.length > 0 && (
            <div>
              <label className="mb-2 block font-sans-tech text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Existing VLM annotations
              </label>
              <div className="space-y-3">
                {existingVlmRuns.map(([promptLabel, run]) => (
                  <div key={promptLabel} className="space-y-2 rounded-sm border border-border bg-background/40 p-3">
                    <div className="break-words font-sans-tech text-xs font-semibold text-foreground">
                      {promptLabel}
                    </div>
                    {run?.effective_prompt && run.effective_prompt !== promptLabel && (
                      <div className="break-words text-[11px] text-muted-foreground">
                        Effective prompt: {run.effective_prompt}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {(run?.tags ?? []).map((tag) => (
                        <span
                          key={`${promptLabel}-${tag}`}
                          className="rounded-sm border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canUseGenerationTools && isStillImage && (
            <div>
              <label className="mb-2 block font-sans-tech text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Create VLM tags
              </label>
              <form onSubmit={createVlmTags} className="space-y-3">
                <div className="flex rounded-sm border border-border bg-input p-1">
                  <button
                    type="button"
                    onClick={() => setVlmPromptMode("preset")}
                    className={`flex-1 rounded-sm py-2 text-sm font-medium ${vlmPromptMode === "preset" ? "border border-border/50 bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Select prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => setVlmPromptMode("custom")}
                    className={`flex-1 rounded-sm py-2 text-sm font-medium ${vlmPromptMode === "custom" ? "border border-border/50 bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Custom input
                  </button>
                </div>
                {vlmPromptMode === "preset" ? (
                  <select
                    value={selectedVlmPreset}
                    onChange={(event) => setSelectedVlmPreset(event.target.value)}
                    className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm focus:border-primary/50 focus:outline-none"
                  >
                    {VLM_PRESET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customVlmPrompt}
                    onChange={(event) => setCustomVlmPrompt(event.target.value)}
                    placeholder="Enter custom prompt for VLM tagging"
                    className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                  />
                )}
                <button
                  type="submit"
                  disabled={(vlmPromptMode === "custom" && !customVlmPrompt.trim()) || isCreatingVlmTags}
                  className="flex items-center gap-2 rounded-sm bg-primary px-6 py-2 text-xs font-bold uppercase text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isCreatingVlmTags && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isCreatingVlmTags ? "Creating..." : "Create VLM tags"}
                </button>
              </form>
            </div>
          )}

          {canUseGenerationTools && image.metadata?.view === "egos" && (
            <div>
              <label className="mb-2 block font-sans-tech text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Add corner case
              </label>
              <form onSubmit={addCornerCase} className="space-y-3">
                <input
                  type="text"
                  value={cornerCasePrompt}
                  onChange={(event) => setCornerCasePrompt(event.target.value)}
                  placeholder="Describe the object or effect to insert."
                  className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!cornerCasePrompt.trim() || isAddingCornerCase}
                  className="flex items-center gap-2 rounded-sm bg-primary px-6 py-2 text-xs font-bold uppercase text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isAddingCornerCase && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isAddingCornerCase ? "Submitting..." : "Add corner case"}
                </button>
              </form>
            </div>
          )}

          {canUseGenerationTools && isExoSourceImage(image) && (
            <div>
              <label className="mb-3 block font-sans-tech text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Egocentric generation
              </label>
              <form onSubmit={generateEgoView} className="space-y-4">
                <select
                  value={selectedCameraWork}
                  onChange={(event) => setSelectedCameraWork(event.target.value)}
                  className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm focus:border-primary/50 focus:outline-none"
                >
                  <option value="Rotate right 45 degrees">Rotate right 45 degrees</option>
                  <option value="Rotate right 90 degrees">Rotate right 90 degrees</option>
                  <option value="Rotate left 45 degrees">Rotate left 45 degrees</option>
                  <option value="Rotate left 90 degrees">Rotate left 90 degrees</option>
                  <option value="Rotate up 45 degrees">Rotate up 45 degrees</option>
                  <option value="Rotate up 90 degrees">Rotate up 90 degrees</option>
                  <option value="Rotate down 45 degrees">Rotate down 45 degrees</option>
                  <option value="Rotate down 90 degrees">Rotate down 90 degrees</option>
                </select>
                <button
                  type="submit"
                  disabled={isGeneratingEgo}
                  className="flex items-center gap-2 rounded-sm bg-primary px-6 py-2 text-xs font-bold uppercase text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isGeneratingEgo && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isGeneratingEgo ? "Processing..." : "Generate Ego View"}
                </button>
              </form>
            </div>
          )}

          {canShowVideoTools && (
            <VideoToolsPanel
              routePath={routePath || image.dataset?.viewer_path?.replace(/^\/viewer\//, "") || ""}
              videos={[
                {
                  asset_id: image.asset_id,
                  name: image.name,
                  url: image.url,
                  proxy_url: image.proxy_url,
                  metadata: image.metadata,
                },
              ]}
              variant="inline"
              showHandMesh={showHandMeshGeneration}
              onGenerationSuccess={onVideoToolSuccess}
              onOpenViewerPath={onOpenViewerPath}
            />
          )}

          {isVideo && !canShowVideoTools && canUseGenerationTools && (
            <div className="rounded-sm border border-border bg-background/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
              Generation tools are available from the original input video for this dataset.
            </div>
          )}

          {isVideo && !canUseGenerationTools && (
            <div className="rounded-sm border border-border bg-background/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
              This video is available to view and download.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
