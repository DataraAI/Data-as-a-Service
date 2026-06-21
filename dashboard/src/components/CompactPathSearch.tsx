import type { FolderItem } from "@/lib/dataViewerTypes";
import { Loader2, Search } from "lucide-react";
import type { ReactNode } from "react";

export function CompactPathSearch({
  value,
  loading,
  suggestions,
  placeholder,
  className,
  onFocus,
  onChange,
  onSuggestionClick,
  renderHighlightedPath,
}: {
  value: string;
  loading: boolean;
  suggestions: FolderItem[];
  placeholder: string;
  className?: string;
  onFocus: () => void;
  onChange: (value: string) => void;
  onSuggestionClick: (fullPath: string) => void;
  renderHighlightedPath: (fullPath: string) => ReactNode;
}) {
  return (
    <div className={`relative w-full ${className ?? "max-w-xl"}`}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onFocus={onFocus}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-slate-200 bg-background pl-11 pr-10 font-sans-tech text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.06)] placeholder:text-slate-400 focus:border-primary/30 focus:outline-none"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
        )}
      </div>

      {value.trim() !== "" && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 overflow-hidden rounded-[20px] border border-slate-200 bg-card/95 text-left shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-sm dark:shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
          {suggestions.length > 0 ? (
            <div className="divide-y divide-border">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.full_path}
                  type="button"
                  onClick={() => onSuggestionClick(suggestion.full_path)}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-primary/8"
                >
                  {renderHighlightedPath(suggestion.full_path)}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 font-sans-tech text-sm text-muted-foreground">
              {loading ? "Loading paths..." : "No matching paths found"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
