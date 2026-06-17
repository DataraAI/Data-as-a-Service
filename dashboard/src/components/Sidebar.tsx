import { useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Hash,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface VlmPromptGroup {
  prompt: string;
  tags: string[];
}

interface SidebarProps {
  onFilterChange: (key: string, value: string) => void;
  availableTags: string[];
  visibleTags: Set<string>;
  onToggleTag: (tag: string) => void;
  visiblePrimitives: Set<string>;
  onTogglePrimitive: (primitive: string) => void;
  onUploadClick: () => void;
  frameRange: { min: number | null; max: number | null };
  onFrameRangeChange: (min: number | null, max: number | null) => void;
  matchingTagSuggestions: string[];
  onSelectTagSuggestion: (tag: string) => void;
  vlmPromptGroups: VlmPromptGroup[];
  canUpload?: boolean;
}

type SectionKey = "filter" | "labels" | "primitives" | "frames";

export function Sidebar({
  onFilterChange,
  availableTags,
  visibleTags,
  onToggleTag,
  visiblePrimitives,
  onTogglePrimitive,
  onUploadClick,
  frameRange,
  onFrameRangeChange,
  matchingTagSuggestions,
  onSelectTagSuggestion,
  vlmPromptGroups,
  canUpload = true,
}: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    filter: true,
    labels: true,
    primitives: false,
    frames: true,
  });
  const [expandedPromptGroups, setExpandedPromptGroups] = useState<Record<string, boolean>>({});

  const toggleSection = (section: SectionKey) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  const togglePromptGroup = (prompt: string) =>
    setExpandedPromptGroups((prev) => ({ ...prev, [prompt]: !prev[prompt] }));

  const vlmTagCount = useMemo(
    () => vlmPromptGroups.reduce((sum, g) => sum + g.tags.length, 0),
    [vlmPromptGroups],
  );

  return (
    <div className="z-20 flex w-full shrink-0 flex-col border-b border-border bg-sidebar-background font-sans-tech text-xs text-muted-foreground md:h-full md:w-72 md:border-b-0 md:border-r lg:w-80">
      <div className="flex items-center justify-between border-b border-border bg-background/50 p-3">
        <span className="font-sans-tech font-bold text-foreground">Unsaved View</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </div>

      <div className="custom-scrollbar max-h-[50vh] flex-1 overflow-y-auto md:max-h-none">
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection("filter")}
            className="group flex w-full items-center px-4 py-3 transition-colors hover:bg-background/80"
          >
            {expandedSections.filter ? (
              <ChevronDown className="mr-2 h-3 w-3 text-primary" />
            ) : (
              <ChevronRight className="mr-2 h-3 w-3" />
            )}
            <span className="font-sans-tech font-bold tracking-wider text-foreground transition-colors group-hover:text-primary">
              Search
            </span>
          </button>
          {expandedSections.filter && (
            <div className="space-y-3 bg-background/30 px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="filter_samples"
                  type="text"
                  placeholder="Search by image title or label"
                  className="w-full rounded-sm border border-border bg-input py-1.5 pl-8 pr-2 font-sans-tech text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                  onChange={(e) => onFilterChange("text", e.target.value)}
                />
              </div>

              {matchingTagSuggestions.length > 0 && (
                <div className="overflow-hidden rounded-sm border border-border bg-background/80">
                  <div className="custom-scrollbar max-h-36 overflow-y-auto">
                    {matchingTagSuggestions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => onSelectTagSuggestion(tag)}
                        className="w-full border-b border-border px-3 py-2 text-left font-sans-tech text-xs text-muted-foreground transition-colors last:border-b-0 hover:bg-background/50 hover:text-foreground"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {canUpload && (
                <Button
                  onClick={onUploadClick}
                  size="sm"
                  variant="outline"
                  className="h-8 w-full border-dashed border-border font-sans-tech text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Add Stage
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="border-b border-border">
          <button
            onClick={() => toggleSection("frames")}
            className="group flex w-full items-center px-4 py-3 transition-colors hover:bg-background/80"
          >
            {expandedSections.frames ? (
              <ChevronDown className="mr-2 h-3 w-3 text-primary" />
            ) : (
              <ChevronRight className="mr-2 h-3 w-3" />
            )}
            <span className="font-sans-tech font-bold tracking-wider text-foreground transition-colors group-hover:text-primary">
              Frame Range
            </span>
          </button>
          {expandedSections.frames && (
            <div className="space-y-3 bg-background/30 px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-sans-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                    Min Frame
                    <input
                      id="min_frame"
                      type="number"
                      placeholder="0"
                      value={frameRange.min ?? ""}
                      onChange={(e) =>
                        onFrameRangeChange(
                          e.target.value ? parseInt(e.target.value) : null,
                          frameRange.max,
                        )
                      }
                      className="w-full rounded-sm border border-border bg-input px-2 py-1.5 font-sans-tech text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                    />
                  </label>
                </div>
                <div>
                  <label className="mb-1 block font-sans-tech text-[10px] uppercase tracking-wider text-muted-foreground">
                    Max Frame
                    <input
                      id="max_frame"
                      type="number"
                      placeholder="100"
                      value={frameRange.max ?? ""}
                      onChange={(e) =>
                        onFrameRangeChange(
                          frameRange.min,
                          e.target.value ? parseInt(e.target.value) : null,
                        )
                      }
                      className="w-full rounded-sm border border-border bg-input px-2 py-1.5 font-sans-tech text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-b border-border">
          <div
            className="group flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-background/80"
            onClick={() => toggleSection("labels")}
          >
            <div className="flex items-center">
              {expandedSections.labels ? (
                <ChevronDown className="mr-2 h-3 w-3 text-primary" />
              ) : (
                <ChevronRight className="mr-2 h-3 w-3" />
              )}
              <span className="font-sans-tech font-bold tracking-wider text-foreground transition-colors group-hover:text-primary">
                Labels
              </span>
            </div>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-sans-tech text-[10px] text-primary">
              {availableTags.length + vlmTagCount}
            </span>
          </div>

          {expandedSections.labels && (
            <div className="space-y-1 bg-background/30 px-2 pb-2">
              {availableTags.map((tag, idx) => {
                const isVisible = visibleTags.has(tag);
                const colors = [
                  "bg-emerald-400",
                  "bg-emerald-500",
                  "bg-green-500",
                  "bg-lime-500",
                  "bg-teal-500",
                  "bg-green-400",
                ];
                const colorClass = colors[idx % colors.length];

                return (
                  <div
                    key={tag}
                    className={`flex cursor-pointer items-center justify-between rounded-sm px-3 py-1.5 transition-colors ${
                      isVisible
                        ? "border-l-2 border-primary bg-primary/10"
                        : "border-l-2 border-transparent hover:bg-background/50"
                    }`}
                    onClick={() => onToggleTag(tag)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-3 w-3 items-center justify-center rounded-sm border transition-colors ${
                          isVisible
                            ? `border-transparent ${colorClass}`
                            : "border-border bg-transparent"
                        }`}
                      >
                        {isVisible && <div className="h-1.5 w-1.5 rounded-full bg-white opacity-90" />}
                      </div>
                      <span
                        className={`font-sans-tech transition-colors ${
                          isVisible ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {tag}
                      </span>
                    </div>
                  </div>
                );
              })}

              {vlmPromptGroups.map((group) => {
                const isExpanded = !!expandedPromptGroups[group.prompt];

                return (
                  <div key={group.prompt} className="overflow-hidden rounded-sm border border-border">
                    <button
                      type="button"
                      onClick={() => togglePromptGroup(group.prompt)}
                      className="flex w-full items-center justify-between bg-background/40 px-3 py-2 transition-colors hover:bg-background/60"
                    >
                      <div className="flex items-center gap-2 text-left">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-primary" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-primary" />
                        )}
                        <span className="font-sans-tech text-foreground">{group.prompt}</span>
                      </div>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-sans-tech text-[10px] text-primary">
                        {group.tags.length}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="space-y-0.5 bg-background/20 px-2 py-1">
                        {group.tags.map((scopedTag) => {
                          const isVisible = visibleTags.has(scopedTag);
                          const displayTag = scopedTag.includes(": ")
                            ? scopedTag.split(": ").slice(1).join(": ")
                            : scopedTag;

                          return (
                            <div
                              key={scopedTag}
                              className={`flex cursor-pointer items-center justify-between rounded-sm px-3 py-1.5 transition-colors ${
                                isVisible
                                  ? "border-l-2 border-primary bg-primary/10"
                                  : "border-l-2 border-transparent hover:bg-background/50"
                              }`}
                              onClick={() => onToggleTag(scopedTag)}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex h-3 w-3 items-center justify-center rounded-sm border transition-colors ${
                                    isVisible
                                      ? "border-transparent bg-primary"
                                      : "border-border bg-transparent"
                                  }`}
                                >
                                  {isVisible && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-white opacity-90" />
                                  )}
                                </div>
                                <span
                                  className={`font-sans-tech transition-colors ${
                                    isVisible ? "text-foreground" : "text-muted-foreground"
                                  }`}
                                >
                                  {displayTag}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {availableTags.length === 0 && vlmPromptGroups.length === 0 && (
                <div className="px-4 py-2 font-sans-tech text-[10px] italic text-muted-foreground">
                  No labels found
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-b border-border">
          <button
            onClick={() => toggleSection("primitives")}
            className="group flex w-full items-center px-4 py-3 transition-colors hover:bg-background/80"
          >
            {expandedSections.primitives ? (
              <ChevronDown className="mr-2 h-3 w-3 text-primary" />
            ) : (
              <ChevronRight className="mr-2 h-3 w-3" />
            )}
            <span className="font-sans-tech font-bold tracking-wider text-foreground transition-colors group-hover:text-primary">
              Metadata
            </span>
          </button>
          {expandedSections.primitives && (
            <div className="space-y-0.5 bg-background/30 px-2 pb-2">
              {[
                { icon: Hash, label: "id" },
                { icon: Hash, label: "frame_id" },
                { icon: FileText, label: "filepath" },
                { icon: Hash, label: "width" },
                { icon: Hash, label: "height" },
              ].map((item) => {
                const isVisible = visiblePrimitives.has(item.label);
                return (
                  <div
                    key={item.label}
                    className={`flex cursor-pointer items-center rounded-sm px-3 py-1.5 transition-colors ${
                      isVisible
                        ? "border-r-2 border-primary bg-primary/10 text-primary"
                        : "border-r-2 border-transparent text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    }`}
                    onClick={() => onTogglePrimitive(item.label)}
                  >
                    <div
                      className={`mr-2 flex h-3 w-3 items-center justify-center rounded-sm border ${
                        isVisible ? "border-primary bg-primary/20" : "border-border bg-card"
                      }`}
                    >
                      {isVisible && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <item.icon className={`mr-2 h-3 w-3 ${isVisible ? "text-primary" : "opacity-50"}`} />
                    <span className="font-sans-tech">{item.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between border-t border-border bg-background p-3 font-sans-tech text-[10px] select-none text-muted-foreground">
        <span>v0.1.0</span>
        <span>Datara AI Systems</span>
      </div>
    </div>
  );
}
