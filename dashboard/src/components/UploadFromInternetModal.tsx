import { useEffect, useMemo, useState } from 'react';
import {
  Clock3,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  Search,
  Video,
  X,
} from 'lucide-react';

interface UploadFromInternetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface YouTubeSearchResult {
  id: string;
  title: string;
  description?: string;
  channel_title?: string;
  published_at?: string;
  thumbnail_url?: string;
  url: string;
  duration_label?: string | null;
  duration_seconds?: number | null;
}

export function UploadFromInternetModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadFromInternetModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeSearchResult | null>(null);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [brandName, setBrandName] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [task, setTask] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [startTimestamp, setStartTimestamp] = useState('');
  const [endTimestamp, setEndTimestamp] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/datasets?path=')
      .then((res) => res.json())
      .then((data) => {
        const cats = data
          .filter((d: any) => d.type === 'folder')
          .map((d: any) => d.name);
        if (cats.length > 0) setSelectedCategory((prev) => prev || cats[0]);
      })
      .catch((err) => console.error('Failed to fetch categories', err));
  }, [isOpen]);

  const formReady = useMemo(() => {
    return (
      !!selectedVideo &&
      !!selectedCategory &&
      !!brandName &&
      !!datasetName &&
      !!startTimestamp.trim() &&
      !!endTimestamp.trim()
    );
  }, [selectedVideo, selectedCategory, brandName, datasetName, startTimestamp, endTimestamp]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError('');
    try {
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, max_results: 12 }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'YouTube search failed');
      }

      setSearchResults(Array.isArray(data.results) ? data.results : []);
    } catch (error: any) {
      setSearchResults([]);
      setSearchError(error.message || 'YouTube search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectVideo = (video: YouTubeSearchResult) => {
    setSelectedVideo(video);
    window.open(video.url, '_blank', 'noopener,noreferrer');
  };

  const handleAddTag = () => {
    const nextTag = currentTag.trim();
    if (!nextTag) return;
    if (tags.includes(nextTag)) {
      setCurrentTag('');
      return;
    }
    setTags([...tags, nextTag]);
    setCurrentTag('');
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const resetState = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedVideo(null);
    setSearchError('');
    setBrandName('');
    setDatasetName('');
    setTask('');
    setTags([]);
    setCurrentTag('');
    setStartTimestamp('');
    setEndTimestamp('');
  };

  const handleClose = () => {
    if (!isUploading) {
      resetState();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReady || !selectedVideo) return;

    setIsUploading(true);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const finalOutputName = `${selectedCategory}/${brandName}/${datasetName}`;

    const payload = {
      video_url: selectedVideo.url,
      output_name: finalOutputName,
      start_timestamp: startTimestamp.trim(),
      end_timestamp: endTimestamp.trim(),
      date,
      tags,
      task: task.trim(),
    };

    try {
      const response = await fetch('/api/process_youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'YouTube upload failed');
      }

      alert(data.message || 'YouTube video processed successfully.');
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md p-4">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-7xl h-[88vh] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary/50 via-primary to-primary/50"></div>

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="h-full grid grid-cols-1 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="border-r border-border/70 flex flex-col min-h-0">
            <div className="p-8 pb-5 border-b border-border/70">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-sm border border-primary/20">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-sans-tech text-foreground">
                    Upload From Internet
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 font-sans-tech">
                    Upload from internet for processing
                  </p>
                </div>
              </div>

              <form onSubmit={handleSearch} className="mt-6">
                <label className="text-xs font-bold text-muted-foreground font-sans-tech uppercase tracking-wider block mb-2">
                  Search YouTube
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search YouTube videos"
                      className="w-full bg-input border border-border rounded-sm px-3 py-3 pl-10 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-5 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold font-sans-tech rounded-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase shadow-lg shadow-primary/20"
                  >
                    {isSearching && <Loader2 className="w-4 h-4 animate-spin" />}
                    Search
                  </button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground font-sans-tech">
                  Click a result to select it and open the YouTube page in a new tab.
                </p>
                {searchError && (
                  <div className="mt-3 text-sm text-destructive font-sans-tech">
                    {searchError}
                  </div>
                )}
              </form>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 custom-scrollbar bg-background/30">
              {searchResults.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground px-6">
                  <Video className="w-14 h-14 mb-4 text-muted-foreground/50" />
                  <p className="font-sans-tech text-base">
                    Search for a YouTube video to get started
                  </p>
                  <p className="font-sans-tech text-sm mt-2 max-w-xl">
                    Results will appear here with thumbnails, title, channel, publish date,
                    and duration.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {searchResults.map((video) => {
                    const isSelected = selectedVideo?.id === video.id;
                    return (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => handleSelectVideo(video)}
                        className={`text-left rounded-sm border p-3 bg-card/30 hover:bg-card/50 transition-colors ${
                          isSelected
                            ? 'border-primary shadow-lg shadow-primary/10'
                            : 'border-border'
                        }`}
                      >
                        <div className="aspect-video overflow-hidden rounded-sm border border-border bg-black/40">
                          {video.thumbnail_url ? (
                            <img
                              src={video.thumbnail_url}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Video className="w-10 h-10" />
                            </div>
                          )}
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm font-bold font-sans-tech text-foreground line-clamp-2">
                              {video.title}
                            </h3>
                            <ExternalLink className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          </div>

                          <div className="flex flex-wrap gap-2 text-[11px] font-sans-tech text-muted-foreground">
                            {video.channel_title && (
                              <span className="px-2 py-1 rounded-sm bg-background/60 border border-border">
                                {video.channel_title}
                              </span>
                            )}
                            {video.duration_label && (
                              <span className="px-2 py-1 rounded-sm bg-background/60 border border-border flex items-center gap-1">
                                <Clock3 className="w-3 h-3" />
                                {video.duration_label}
                              </span>
                            )}
                            {video.published_at && (
                              <span className="px-2 py-1 rounded-sm bg-background/60 border border-border">
                                {new Date(video.published_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground font-sans-tech line-clamp-3">
                            {video.description || 'No description available.'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col min-h-0">
            <div className="p-8 border-b border-border/70">
              <h3 className="text-lg font-bold font-sans-tech text-foreground">
                Processing Details
              </h3>
              <p className="text-sm text-muted-foreground mt-2 font-sans-tech">
                Select a video, enter the clip window, then use the same dataset fields as the
                existing import flow.
              </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-8 custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground font-sans-tech uppercase tracking-wider">
                    Selected Video
                  </label>
                  <div className="bg-input border border-border rounded-sm p-3">
                    {selectedVideo ? (
                      <div className="space-y-2">
                        <div className="text-sm font-bold font-sans-tech text-foreground">
                          {selectedVideo.title}
                        </div>
                        <div className="text-xs text-muted-foreground font-sans-tech break-all">
                          {selectedVideo.url}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              window.open(selectedVideo.url, '_blank', 'noopener,noreferrer')
                            }
                            className="text-xs font-sans-tech text-primary hover:text-primary-glow flex items-center gap-1"
                          >
                            Open video <ExternalLink className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedVideo(null)}
                            className="text-xs font-sans-tech text-muted-foreground hover:text-foreground"
                          >
                            Clear selection
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground font-sans-tech">
                        No video selected yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground font-sans-tech uppercase tracking-wider">
                      Start Timestamp
                    </label>
                    <input
                      type="text"
                      value={startTimestamp}
                      onChange={(e) => setStartTimestamp(e.target.value)}
                      placeholder="e.g. 00:00:10"
                      className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground font-sans-tech uppercase tracking-wider">
                      End Timestamp
                    </label>
                    <input
                      type="text"
                      value={endTimestamp}
                      onChange={(e) => setEndTimestamp(e.target.value)}
                      placeholder="e.g. 00:01:30"
                      className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech"
                      required
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground font-sans-tech -mt-2">
                  Accepted formats: seconds, mm:ss, or hh:mm:ss.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground font-sans-tech uppercase tracking-wider">
                      Category
                    </label>
                    <input
                      type="text"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      placeholder="e.g. automotive"
                      pattern="[a-zA-Z0-9]+"
                      className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground font-sans-tech uppercase tracking-wider">
                      Brand / Subdir
                    </label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. bmw"
                      pattern="[a-zA-Z0-9]+"
                      className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground font-sans-tech uppercase tracking-wider">
                    Dataset Name (Output)
                  </label>
                  <input
                    type="text"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="e.g. frontGrille"
                    pattern="[a-zA-Z0-9]+"
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground font-sans-tech uppercase tracking-wider">
                    Task Context
                  </label>
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder="e.g. front grille for the car. Leave blank to auto-generate from the dataset name."
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground font-sans-tech uppercase tracking-wider">
                    Metadata Tags
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      placeholder="Add tag..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="flex-1 bg-input border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-sans-tech"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-input hover:bg-card border border-border hover:border-primary rounded-sm text-primary transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag, index) => (
                        <div
                          key={index}
                          className="bg-primary/10 border border-primary/20 text-primary px-2 py-1 rounded-sm text-xs font-sans-tech flex items-center gap-1 group"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(index)}
                            className="text-primary/50 group-hover:text-primary ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isUploading}
                    className="px-4 py-2 text-xs font-bold font-sans-tech text-muted-foreground hover:text-foreground transition-colors uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !formReady}
                    className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold font-sans-tech rounded-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase shadow-lg shadow-primary/20"
                  >
                    {isUploading && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isUploading ? 'Processing...' : 'Start Process'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
