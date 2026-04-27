import { useState } from "react";
import { ChevronDown, ChevronRight, Images, Loader2, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

type SectionKey = "overview" | "prompt";

interface MaskGenerationPanelProps {
  routePath: string;
  imageCount: number;
  onGenerationSuccess?: () => void;
  onOpenViewerPath: (viewerPath: string) => void;
}

export function MaskGenerationPanel({
  routePath,
  imageCount,
  onGenerationSuccess,
  onOpenViewerPath,
}: MaskGenerationPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    overview: true,
    prompt: true,
  });
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = prompt.trim().length > 0 && !isSubmitting;

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
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Mask generation failed");
      }

      const message =
        typeof data.message === "string" && data.message.trim()
          ? data.message
          : "Mask folders are ready to explore.";

      toast.success(message, {
        description:
          "Open the new prompt folder to browse the separate instance folders created for this run.",
        action:
          typeof data.mask_viewer_path === "string" && data.mask_viewer_path.trim()
            ? {
                label: "Open mask folders",
                onClick: () => onOpenViewerPath(data.mask_viewer_path),
              }
            : undefined,
      });

      onGenerationSuccess?.();
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
                Describe what the mask should wrap around, like hands, gloves, or nearby people.
                We will use that prompt to generate masks across every image in the folder you are
                viewing now.
              </p>
              <p>
                When the run finishes, a new folder will appear under{" "}
                <span className="font-semibold text-foreground">masks</span>. Open that prompt
                folder to step through the separate instance folders for the run.
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
                A short, specific subject usually gives the cleanest results.
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
            {isSubmitting ? "Creating masks..." : "Create masks for this folder"}
          </Button>
        </div>
      </form>

      <div className="flex justify-between border-t border-border bg-background p-3 font-sans-tech text-[10px] select-none text-muted-foreground">
        <span>{imageCount} source images</span>
        <span className="flex items-center gap-1">
          <Images className="h-3 w-3" />
          Datara AI Systems
        </span>
      </div>
    </div>
  );
}
