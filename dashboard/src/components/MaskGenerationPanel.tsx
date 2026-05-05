import { useEffect, useMemo, useState } from "react";
import { Box, ChevronDown, ChevronRight, Images, Loader2, Search, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

type SectionKey = "maskGeneration" | "occlusionRemoval" | "handMotion";

interface MaskInstanceOption {
  instance_name: string;
  instance_id: string;
  label: string;
}

interface MaskPromptOption {
  prompt_slug: string;
  prompt_label: string;
  instance_count: number;
  instances: MaskInstanceOption[];
}

interface MaskOptionsResponse {
  prompts?: MaskPromptOption[];
}

interface MaskGenerationPanelProps {
  routePath: string;
  imageCount: number;
  refreshKey?: number;
  showHandMotionGeneration?: boolean;
  onGenerationSuccess?: () => void;
  onOcclusionSuccess?: () => void;
  onOpenViewerPath: (viewerPath: string) => void;
}

function isChecked(value: boolean | "indeterminate") {
  return value === true;
}

export function MaskGenerationPanel({
  routePath,
  imageCount,
  refreshKey = 0,
  showHandMotionGeneration = false,
  onGenerationSuccess,
  onOcclusionSuccess,
  onOpenViewerPath,
}: MaskGenerationPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    maskGeneration: true,
    occlusionRemoval: true,
    handMotion: true,
  });

  const [prompt, setPrompt] = useState("");
  const [isSubmittingMask, setIsSubmittingMask] = useState(false);

  const [maskOptions, setMaskOptions] = useState<MaskPromptOption[]>([]);
  const [isLoadingMaskOptions, setIsLoadingMaskOptions] = useState(false);
  const [maskOptionsError, setMaskOptionsError] = useState("");

  const [primaryPromptSearch, setPrimaryPromptSearch] = useState("");
  const [selectedPrimaryPrompt, setSelectedPrimaryPrompt] = useState("");
  const [primaryInstanceSearch, setPrimaryInstanceSearch] = useState("");
  const [combinePrimaryInstances, setCombinePrimaryInstances] = useState(false);
  const [selectedPrimaryInstance, setSelectedPrimaryInstance] = useState("");

  const [subtractEnabled, setSubtractEnabled] = useState(false);
  const [subtractPromptSearch, setSubtractPromptSearch] = useState("");
  const [selectedSubtractPrompt, setSelectedSubtractPrompt] = useState("");
  const [subtractInstanceSearch, setSubtractInstanceSearch] = useState("");
  const [combineSubtractInstances, setCombineSubtractInstances] = useState(true);
  const [selectedSubtractInstance, setSelectedSubtractInstance] = useState("");

  const [isSubmittingOcclusion, setIsSubmittingOcclusion] = useState(false);

  const canSubmitMask = prompt.trim().length > 0 && !isSubmittingMask;

  const primaryPromptOptions = useMemo(() => {
    const needle = primaryPromptSearch.trim().toLowerCase();
    if (!needle) return maskOptions;
    return maskOptions.filter((option) => {
      const label = option.prompt_label.toLowerCase();
      const slug = option.prompt_slug.toLowerCase();
      return label.includes(needle) || slug.includes(needle);
    });
  }, [maskOptions, primaryPromptSearch]);

  const subtractPromptOptions = useMemo(() => {
    const needle = subtractPromptSearch.trim().toLowerCase();
    if (!needle) return maskOptions;
    return maskOptions.filter((option) => {
      const label = option.prompt_label.toLowerCase();
      const slug = option.prompt_slug.toLowerCase();
      return label.includes(needle) || slug.includes(needle);
    });
  }, [maskOptions, subtractPromptSearch]);

  const primaryPrompt = useMemo(
    () => maskOptions.find((option) => option.prompt_slug === selectedPrimaryPrompt) ?? null,
    [maskOptions, selectedPrimaryPrompt],
  );
  const subtractPrompt = useMemo(
    () => maskOptions.find((option) => option.prompt_slug === selectedSubtractPrompt) ?? null,
    [maskOptions, selectedSubtractPrompt],
  );

  const primaryInstances = useMemo(() => {
    const instances = primaryPrompt?.instances ?? [];
    const needle = primaryInstanceSearch.trim().toLowerCase();
    if (!needle) return instances;
    return instances.filter((instance) => {
      const label = instance.label.toLowerCase();
      const instanceName = instance.instance_name.toLowerCase();
      const instanceId = instance.instance_id.toLowerCase();
      return (
        label.includes(needle) || instanceName.includes(needle) || instanceId.includes(needle)
      );
    });
  }, [primaryInstanceSearch, primaryPrompt]);

  const subtractInstances = useMemo(() => {
    const instances = subtractPrompt?.instances ?? [];
    const needle = subtractInstanceSearch.trim().toLowerCase();
    if (!needle) return instances;
    return instances.filter((instance) => {
      const label = instance.label.toLowerCase();
      const instanceName = instance.instance_name.toLowerCase();
      const instanceId = instance.instance_id.toLowerCase();
      return (
        label.includes(needle) || instanceName.includes(needle) || instanceId.includes(needle)
      );
    });
  }, [subtractInstanceSearch, subtractPrompt]);

  const canSubmitOcclusion = useMemo(() => {
    if (isSubmittingOcclusion || isLoadingMaskOptions || maskOptions.length === 0) return false;
    if (!selectedPrimaryPrompt) return false;
    if (!combinePrimaryInstances && !selectedPrimaryInstance) return false;
    if (!subtractEnabled) return true;
    if (!selectedSubtractPrompt) return false;
    if (!combineSubtractInstances && !selectedSubtractInstance) return false;
    return true;
  }, [
    combinePrimaryInstances,
    combineSubtractInstances,
    isLoadingMaskOptions,
    isSubmittingOcclusion,
    maskOptions.length,
    selectedPrimaryInstance,
    selectedPrimaryPrompt,
    selectedSubtractInstance,
    selectedSubtractPrompt,
    subtractEnabled,
  ]);

  const toggleSection = (section: SectionKey) =>
    setExpandedSections((previous) => ({ ...previous, [section]: !previous[section] }));

  useEffect(() => {
    let cancelled = false;

    async function loadMaskOptions() {
      setIsLoadingMaskOptions(true);
      setMaskOptionsError("");

      try {
        const response = await fetch(
          `/api/occlusion-mask-options?route_path=${encodeURIComponent(routePath)}`,
          {
            credentials: "include",
          },
        );

        const payload = (await response.json().catch(() => ({}))) as MaskOptionsResponse & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load mask folders");
        }

        const prompts = Array.isArray(payload.prompts) ? payload.prompts : [];
        if (cancelled) return;

        setMaskOptions(prompts);
        setSelectedPrimaryPrompt((previous) => {
          if (prompts.some((option) => option.prompt_slug === previous)) return previous;
          return prompts[0]?.prompt_slug ?? "";
        });
        setSelectedSubtractPrompt((previous) => {
          if (prompts.some((option) => option.prompt_slug === previous)) return previous;
          if (prompts.length > 1) return prompts[1].prompt_slug;
          return prompts[0]?.prompt_slug ?? "";
        });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to load mask folders";
        setMaskOptions([]);
        setMaskOptionsError(message);
      } finally {
        if (!cancelled) {
          setIsLoadingMaskOptions(false);
        }
      }
    }

    void loadMaskOptions();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, routePath]);

  useEffect(() => {
    if (!primaryPrompt?.instances.length) {
      setSelectedPrimaryInstance("");
      return;
    }

    setSelectedPrimaryInstance((previous) => {
      if (primaryPrompt.instances.some((instance) => instance.instance_name === previous)) {
        return previous;
      }
      return primaryPrompt.instances[0]?.instance_name ?? "";
    });
  }, [primaryPrompt]);

  useEffect(() => {
    if (!subtractPrompt?.instances.length) {
      setSelectedSubtractInstance("");
      return;
    }

    setSelectedSubtractInstance((previous) => {
      if (subtractPrompt.instances.some((instance) => instance.instance_name === previous)) {
        return previous;
      }
      return subtractPrompt.instances[0]?.instance_name ?? "";
    });
  }, [subtractPrompt]);

  async function handleMaskSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitMask) return;

    setIsSubmittingMask(true);
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

      setPrompt("");
      onGenerationSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mask generation failed";
      toast.error("Mask generation did not complete", {
        description: message,
      });
    } finally {
      setIsSubmittingMask(false);
    }
  }

  async function handleOcclusionSubmit() {
    if (!canSubmitOcclusion) return;

    setIsSubmittingOcclusion(true);
    try {
      const response = await fetch("/api/remove_occlusion", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_path: routePath,
          include: {
            prompt_slug: selectedPrimaryPrompt,
            mode: combinePrimaryInstances ? "combined" : "instance",
            instance_name: combinePrimaryInstances ? undefined : selectedPrimaryInstance,
          },
          subtract: subtractEnabled
            ? {
                prompt_slug: selectedSubtractPrompt,
                mode: combineSubtractInstances ? "combined" : "instance",
                instance_name: combineSubtractInstances ? undefined : selectedSubtractInstance,
              }
            : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Occlusion removal failed");
      }

      toast.success(
        typeof data.message === "string" && data.message.trim()
          ? data.message
          : "Occlusion removal finished successfully.",
        {
          description: "A new video was saved under occl_del for this selection.",
          action:
            typeof data.output_viewer_path === "string" && data.output_viewer_path.trim()
              ? {
                  label: "Open result",
                  onClick: () => onOpenViewerPath(data.output_viewer_path),
                }
              : undefined,
        },
      );

      onOcclusionSuccess?.();
      if (typeof data.output_viewer_path === "string" && data.output_viewer_path.trim()) {
        onOpenViewerPath(data.output_viewer_path);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Occlusion removal failed";
      toast.error("Occlusion removal did not complete", {
        description: message,
      });
    } finally {
      setIsSubmittingOcclusion(false);
    }
  }

  function handleHandMotionPlaceholder() {
    toast.info("Hand motion generation UI is ready", {
      description: "Backend execution will be connected separately.",
    });
  }

  return (
    <div className="z-20 flex w-full shrink-0 flex-col border-t border-border bg-sidebar-background font-sans-tech text-xs text-muted-foreground xl:h-full xl:w-80 xl:border-l xl:border-t-0 2xl:w-96">
      <div className="flex items-center justify-between border-b border-border bg-background/50 p-3">
        <span className="font-sans-tech font-bold text-foreground">Scene Tools</span>
        <WandSparkles className="h-3.5 w-3.5 text-primary" />
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto">
        <div className="border-b border-border">
          <button
            type="button"
            onClick={() => toggleSection("maskGeneration")}
            className="group flex w-full items-center px-4 py-3 transition-colors hover:bg-background/80"
          >
            {expandedSections.maskGeneration ? (
              <ChevronDown className="mr-2 h-3 w-3 text-primary" />
            ) : (
              <ChevronRight className="mr-2 h-3 w-3" />
            )}
            <span className="font-sans-tech font-bold tracking-wider text-foreground transition-colors group-hover:text-primary">
              Mask Segmentation
            </span>
          </button>
          {expandedSections.maskGeneration && (
            <form onSubmit={handleMaskSubmit} className="space-y-3 bg-background/30 px-4 pb-4">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Describe what should be segmented across this frame folder, like a person, hands,
                or gloves. A new prompt folder will appear under masks when the run finishes.
              </p>
              <label className="block">
                <span className="mb-1 block font-sans-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                  What should be masked?
                </span>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Example: nearby people or safety gloves"
                  className="w-full rounded-sm border border-border bg-input px-3 py-2 font-sans-tech text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </label>
              <div className="rounded-sm border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
                Short, specific subjects usually give the cleanest instance folders.
              </div>
              <Button
                type="submit"
                disabled={!canSubmitMask}
                className="h-10 w-full font-sans-tech text-xs text-primary-foreground"
              >
                {isSubmittingMask && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isSubmittingMask ? "Creating masks..." : "Create masks for this folder"}
              </Button>
            </form>
          )}
        </div>

        <div className="border-b border-border">
          <button
            type="button"
            onClick={() => toggleSection("occlusionRemoval")}
            className="group flex w-full items-center px-4 py-3 transition-colors hover:bg-background/80"
          >
            {expandedSections.occlusionRemoval ? (
              <ChevronDown className="mr-2 h-3 w-3 text-primary" />
            ) : (
              <ChevronRight className="mr-2 h-3 w-3" />
            )}
            <span className="font-sans-tech font-bold tracking-wider text-foreground transition-colors group-hover:text-primary">
              Occlusion Removal
            </span>
          </button>
          {expandedSections.occlusionRemoval && (
            <div className="space-y-4 bg-background/30 px-4 pb-4">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Pick a mask folder, choose one instance or combine them all, and we will remove
                that object into a new occl_del result video.
              </p>

              <div className="space-y-2">
                <span className="block font-sans-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                  Primary mask folder
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={primaryPromptSearch}
                    onChange={(event) => setPrimaryPromptSearch(event.target.value)}
                    placeholder="Search masks folder"
                    className="w-full rounded-sm border border-border bg-input py-2 pl-9 pr-3 font-sans-tech text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <select
                  value={selectedPrimaryPrompt}
                  onChange={(event) => setSelectedPrimaryPrompt(event.target.value)}
                  disabled={isLoadingMaskOptions || primaryPromptOptions.length === 0}
                  className="h-10 w-full rounded-sm border border-border bg-input px-3 font-sans-tech text-xs text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
                >
                  {primaryPromptOptions.length === 0 ? (
                    <option value="">No mask folders yet</option>
                  ) : (
                    primaryPromptOptions.map((option) => (
                      <option key={option.prompt_slug} value={option.prompt_slug}>
                        {option.prompt_label} ({option.instance_count})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="rounded-sm border border-border bg-background/50 p-3">
                <label className="flex items-center gap-2 text-[11px] text-foreground">
                  <input
                    type="checkbox"
                    checked={combinePrimaryInstances}
                    onChange={(event) => setCombinePrimaryInstances(isChecked(event.target.checked))}
                    className="h-4 w-4 rounded-sm border-border bg-input accent-primary"
                  />
                  Combine all instances in this folder
                </label>
                {!combinePrimaryInstances && (
                  <div className="mt-3 space-y-2">
                    <span className="block font-sans-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                      Instance
                    </span>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={primaryInstanceSearch}
                        onChange={(event) => setPrimaryInstanceSearch(event.target.value)}
                        placeholder="Search instance"
                        className="w-full rounded-sm border border-border bg-input py-2 pl-9 pr-3 font-sans-tech text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <select
                      value={selectedPrimaryInstance}
                      onChange={(event) => setSelectedPrimaryInstance(event.target.value)}
                      disabled={!primaryPrompt || primaryInstances.length === 0}
                      className="h-10 w-full rounded-sm border border-border bg-input px-3 font-sans-tech text-xs text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
                    >
                      {primaryInstances.length === 0 ? (
                        <option value="">No instances found</option>
                      ) : (
                        primaryInstances.map((instance) => (
                          <option key={instance.instance_name} value={instance.instance_name}>
                            {instance.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>

              <div className="rounded-sm border border-border bg-background/50 p-3">
                <label className="flex items-center gap-2 text-[11px] text-foreground">
                  <input
                    type="checkbox"
                    checked={subtractEnabled}
                    onChange={(event) => setSubtractEnabled(isChecked(event.target.checked))}
                    className="h-4 w-4 rounded-sm border-border bg-input accent-primary"
                  />
                  Subtract an overlapping mask to keep part of the scene
                </label>

                {subtractEnabled && (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <span className="block font-sans-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                        Keep overlap from
                      </span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={subtractPromptSearch}
                          onChange={(event) => setSubtractPromptSearch(event.target.value)}
                          placeholder="Search subtract folder"
                          className="w-full rounded-sm border border-border bg-input py-2 pl-9 pr-3 font-sans-tech text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <select
                        value={selectedSubtractPrompt}
                        onChange={(event) => setSelectedSubtractPrompt(event.target.value)}
                        disabled={subtractPromptOptions.length === 0}
                        className="h-10 w-full rounded-sm border border-border bg-input px-3 font-sans-tech text-xs text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
                      >
                        {subtractPromptOptions.length === 0 ? (
                          <option value="">No mask folders yet</option>
                        ) : (
                          subtractPromptOptions.map((option) => (
                            <option key={option.prompt_slug} value={option.prompt_slug}>
                              {option.prompt_label} ({option.instance_count})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-[11px] text-foreground">
                      <input
                        type="checkbox"
                        checked={combineSubtractInstances}
                        onChange={(event) =>
                          setCombineSubtractInstances(isChecked(event.target.checked))
                        }
                        className="h-4 w-4 rounded-sm border-border bg-input accent-primary"
                      />
                      Combine all subtract instances
                    </label>

                    {!combineSubtractInstances && (
                      <div className="space-y-2">
                        <span className="block font-sans-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                          Subtract instance
                        </span>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                          <input
                            value={subtractInstanceSearch}
                            onChange={(event) => setSubtractInstanceSearch(event.target.value)}
                            placeholder="Search subtract instance"
                            className="w-full rounded-sm border border-border bg-input py-2 pl-9 pr-3 font-sans-tech text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                          />
                        </div>
                        <select
                          value={selectedSubtractInstance}
                          onChange={(event) => setSelectedSubtractInstance(event.target.value)}
                          disabled={!subtractPrompt || subtractInstances.length === 0}
                          className="h-10 w-full rounded-sm border border-border bg-input px-3 font-sans-tech text-xs text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
                        >
                          {subtractInstances.length === 0 ? (
                            <option value="">No instances found</option>
                          ) : (
                            subtractInstances.map((instance) => (
                              <option key={instance.instance_name} value={instance.instance_name}>
                                {instance.label}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isLoadingMaskOptions && (
                <div className="rounded-sm border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
                  Loading mask folders for this dataset...
                </div>
              )}

              {!isLoadingMaskOptions && maskOptionsError && (
                <div className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                  {maskOptionsError}
                </div>
              )}

              {!isLoadingMaskOptions && !maskOptionsError && maskOptions.length === 0 && (
                <div className="rounded-sm border border-border bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
                  Generate at least one mask folder before running occlusion removal.
                </div>
              )}

              <Button
                type="button"
                disabled={!canSubmitOcclusion}
                onClick={handleOcclusionSubmit}
                className="h-10 w-full font-sans-tech text-xs text-primary-foreground"
              >
                {isSubmittingOcclusion && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isSubmittingOcclusion ? "Running model..." : "Remove occlusion"}
              </Button>
            </div>
          )}
        </div>

        {showHandMotionGeneration && (
          <div className="border-b border-border">
            <button
              type="button"
              onClick={() => toggleSection("handMotion")}
              className="group flex w-full items-center px-4 py-3 transition-colors hover:bg-background/80"
            >
              {expandedSections.handMotion ? (
                <ChevronDown className="mr-2 h-3 w-3 text-primary" />
              ) : (
                <ChevronRight className="mr-2 h-3 w-3" />
              )}
              <span className="font-sans-tech font-bold tracking-wider text-foreground transition-colors group-hover:text-primary">
                Hand Motion Generation
              </span>
            </button>
            {expandedSections.handMotion && (
              <div className="space-y-3 bg-background/30 px-4 pb-4">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Create 3D hand meshes from this egocentric frame sequence.
                </p>
                <div className="rounded-sm border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
                  Available for ego folders where every source image is marked egocentric.
                </div>
                <Button
                  type="button"
                  onClick={handleHandMotionPlaceholder}
                  className="h-10 w-full font-sans-tech text-xs text-primary-foreground"
                >
                  <Box className="h-3.5 w-3.5" />
                  Create hand mesh
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

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
