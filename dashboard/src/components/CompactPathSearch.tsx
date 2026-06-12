import type { FolderItem } from "@/lib/dataViewerTypes";
import { Loader2, Search } from "lucide-react";
import type { ReactNode } from "react";

export function CompactPathSearch({
  value,
  loading,
  suggestions,
  placeholder,
  submitDisabled,
  className,
  onFocus,
  onChange,
  onSubmit,
  onSuggestionClick,
  renderHighlightedPath,
}: {
  value: string;
  loading: boolean;
  suggestions: FolderItem[];
  placeholder: string;
  submitDisabled: boolean;
  className?: string;
  onFocus: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestionClick: (fullPath: string) => void;
  renderHighlightedPath: (fullPath: string) => ReactNode;
}) {
  return (
    <div className={`relative w-full ${className ?? "max-w-xl"}`}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={value}
            onFocus={onFocus}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-10 font-sans-tech text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.06)] placeholder:text-slate-400 focus:border-primary/30 focus:outline-none"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
          )}
        </div>
        <button
          type="submit"
          disabled={submitDisabled}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-5 font-sans-tech text-sm font-bold text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Search
        </button>
      </form>

      {value.trim() !== "" && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 overflow-hidden rounded-[20px] border border-slate-200 bg-white/95 text-left shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-sm dark:bg-card/95 dark:shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
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
