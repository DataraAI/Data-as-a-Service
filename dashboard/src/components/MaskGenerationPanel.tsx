import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Image as ImageIcon,
  Images,
  Loader2,
  Search,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

type MaskGenerationMode = "all_images" | "single_image" | "video";
type SectionKey = "overview" | "prompt" | "source";

interface MaskImageOption {
  asset_id: string;
  name: string;
  type?: string;
}

interface MaskGenerationPanelProps {
  routePath: string;
  images: MaskImageOption[];
  onGenerationSuccess?: () => void;
  onOpenViewerPath: (viewerPath: string) => void;
}

const MODE_OPTIONS: Array<{
  value: MaskGenerationMode;
  label: string;
  description: string;
  icon: typeof Images;
}> = [
  {
    value: "all_images",
    label: "All images in this folder",
    description: "Create one fresh mask set across the full folder in a single run.",
    icon: Images,
  },
  {
    value: "single_image",
    label: "Single image",
    description: "Pick one frame when you want a quick mask without processing the whole folder.",
    icon: ImageIcon,
  },
  {
    value: "video",
    label: "Video pass",
    description: "Build a temporary 30 FPS video from this folder, then generate masks across that sequence.",
    icon: Clapperboard,
  },
];

const SUBMIT_LABELS: Record<MaskGenerationMode, string> = {
  all_images: "Create masks for this folder",
  single_image: "Create mask for selected image",
  video: "Run video mask pass",
};

export function MaskGenerationPanel({
  routePath,
  images,
  onGenerationSuccess,
  onOpenViewerPath,
}: MaskGenerationPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    overview: true,
    prompt: true,
    source: true,
  });
  const [mode, setMode] = useState<MaskGenerationMode>("all_images");
  const [prompt, setPrompt] = useState("");
  const [imageSearchText, setImageSearchText] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableImages = useMemo(
    () =>
      images
        .filter((image) => image.type !== "3d")
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [images],
  );

  const selectedImage = useMemo(
    () => availableImages.find((image) => image.asset_id === selectedAssetId) ?? null,
    [availableImages, selectedAssetId],
  );

  const imageSuggestions = useMemo(() => {
    if (mode !== "single_image") return [];

    const normalized = imageSearchText.trim().toLowerCase();
    if (!normalized) return availableImages.slice(0, 8);

    return availableImages
      .filter((image) => image.name.toLowerCase().includes(normalized))
      .slice(0, 8);
  }, [availableImages, imageSearchText, mode]);

  const showImageSuggestions =
    mode === "single_image" &&
    !selectedImage &&
    imageSearchText.trim().length > 0 &&
    imageSuggestions.length > 0;

  const canSubmit =
    prompt.trim().length > 0 &&
    !isSubmitting &&
    (mode !== "single_image" || Boolean(selectedImage));

  const toggleSection = (section: SectionKey) =>
    setExpandedSections((previous) => ({ ...previous, [section]: !previous[section] }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/generate_masks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_path: routePath,
          prompt: prompt.trim(),
          mode,
          asset_id: mode === "single_image" ? selectedAssetId : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Mask generation failed");
      }

      const message =
        typeof data.message === "string" && data.message.trim()
          ? data.message
          : "Masks are ready to explore.";

      toast.success(message, {
        description: "Use the open action when you want to jump straight into the new mask set.",
        action:
          typeof data.combined_viewer_path === "string" && data.combined_viewer_path.trim()
            ? {
                label: "Open masks",
                onClick: () => onOpenViewerPath(data.combined_viewer_path),
              }
            : undefined,
      });

      onGenerationSuccess?.();
      if (mode === "single_image") {
        setImageSearchText(selectedImage?.name ?? "");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mask generation failed";
      toast.error("Mask generation did not complete", {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="z-20 flex w-full shrink-0 flex-col border-t border-border bg-sidebar-background font-sans-tech text-xs text-muted-foreground xl:h-full xl:w-80 xl:border-l xl:border-t-0 2xl:w-96">
      <div className="flex items-center justify-between border-b border-border bg-background/50 p-3">
        <span className="font-sans-tech font-bold text-foreground">Mask Generation</span>
        <WandSparkles className="h-3.5 w-3.5 text-primary" />
      </div>

      <form onSubmit={handleSubmit} className="custom-scrollbar flex-1 overflow-y-auto">
        <div className="border-b border-border">
          <button
            type="button"
            onClick={() => toggleSection("overview")}
            className="group flex w-full items-center px-4 py-3 transition-colors hover:bg-background/80"
          >
            {expandedSections.overview ? (
              <ChevronDown className="mr-2 h-3 w-3 text-primary" />
            ) : (
              <ChevronRight className="mr-2 h-3 w-3" />
            )}
            <span className="font-sans-tech font-bold tracking-wider text-foreground transition-colors group-hover:text-primary">
              Overview
            </span>
          </button>
          {expandedSections.overview && (
            <div className="space-y-3 bg-background/30 px-4 pb-4 text-[11px] leading-relaxed text-muted-foreground">
              <p>
                Tell us what the mask should wrap around, like hands, gloves, or people. We will
                use that prompt to generate a new mask set for the images you are viewing now.
              </p>
              <p>
                When the run finishes, the results will be saved into a fresh folder under{" "}
                <span className="font-semibold text-foreground">masks</span> so you can open them
                straight from the viewer.
              </p>
            </div>
          )}
        </div>

        <div className="border-b border-border">
          <button
            type="button"
            onClick={() => toggleSection("prompt")}
            className="group flex w-full items-center px-4 py-3 transition-colors hover:bg-background/80"
          >
            {expandedSections.prompt ? (
              <ChevronDown className="mr-2 h-3 w-3 text-primary" />
            ) : (
              <ChevronRight className="mr-2 h-3 w-3" />
            )}
            <span className="font-sans-tech font-bold tracking-wider text-foreground transition-colors group-hover:text-primary">
              Prompt
            </span>
          </button>
          {expandedSections.prompt && (
            <div className="space-y-3 bg-background/30 px-4 pb-4">
              <label className="block">
                <span className="mb-1 block font-sans-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                  What should be masked?
                </span>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Example: hands, safety gloves, or nearby people"
                  className="w-full rounded-sm border border-border bg-input px-3 py-2 font-sans-tech text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </label>
              <div className="rounded-sm border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
                A clear subject usually gives the cleanest result. Short phrases often work best.
              </div>
            </div>
          )}
        </div>

        <div className="border-b border-border">
          <button
            type="button"
            onClick={() => toggleSection("source")}
            className="group flex w-full items-center px-4 py-3 transition-colors hover:bg-background/80"
          >
            {expandedSections.source ? (
              <ChevronDown className="mr-2 h-3 w-3 text-primary" />
            ) : (
              <ChevronRight className="mr-2 h-3 w-3" />
            )}
            <span className="font-sans-tech font-bold tracking-wider text-foreground transition-colors group-hover:text-primary">
              Source
            </span>
          </button>
          {expandedSections.source && (
            <div className="space-y-3 bg-background/30 px-4 pb-4">
              <div className="grid gap-2">
                {MODE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isActive = mode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setMode(option.value);
                        if (option.value !== "single_image") {
                          setSelectedAssetId(null);
                          setImageSearchText("");
                        }
                      }}
                      className={cn(
                        "rounded-sm border px-3 py-3 text-left transition-colors",
                        isActive
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background/40 hover:border-primary/40 hover:bg-background/70",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 rounded-sm border p-1.5",
                            isActive
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-sans-tech text-xs font-semibold text-foreground">
                            {option.label}
                          </div>
                          <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {mode === "single_image" && (
                <div className="space-y-2">
                  <label className="block">
                    <span className="mb-1 block font-sans-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                      Choose an image
                    </span>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={imageSearchText}
                        onChange={(event) => {
                          setImageSearchText(event.target.value);
                          setSelectedAssetId(null);
                        }}
                        placeholder="Start typing a frame name"
                        className="w-full rounded-sm border border-border bg-input py-1.5 pl-8 pr-2 font-sans-tech text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </label>

                  {showImageSuggestions && (
                    <div className="overflow-hidden rounded-sm border border-border bg-background/80">
                      <div className="custom-scrollbar max-h-40 overflow-y-auto">
                        {imageSuggestions.map((image) => (
                          <button
                            key={image.asset_id}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setSelectedAssetId(image.asset_id);
                              setImageSearchText(image.name);
                            }}
                            className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left font-sans-tech text-xs text-muted-foreground transition-colors last:border-b-0 hover:bg-background/50 hover:text-foreground"
                          >
                            <span className="truncate">{image.name}</span>
                            <ChevronRight className="h-3 w-3 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedImage && (
                    <div className="rounded-sm border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-primary">
                      Selected image: <span className="font-semibold">{selectedImage.name}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-sm border border-border bg-background/50 px-3 py-2 text-[11px] text-muted-foreground">
                Current folder: <span className="break-all text-foreground">{routePath}</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-b border-border bg-background/40 px-4 py-4">
          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-10 w-full font-sans-tech text-xs text-primary-foreground"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isSubmitting ? "Creating masks..." : SUBMIT_LABELS[mode]}
          </Button>
        </div>
      </form>

      <div className="flex justify-between border-t border-border bg-background p-3 font-sans-tech text-[10px] select-none text-muted-foreground">
        <span>{availableImages.length} source images</span>
        <span>Datara AI Systems</span>
      </div>
    </div>
  );
}
