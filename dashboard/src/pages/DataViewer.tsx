import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { UploadModal } from '../components/UploadModal';
import { Loader2, RefreshCw, Folder, Database, Terminal, AlertCircle, MoreVertical, Trash2, Search } from 'lucide-react';
import { ImageGrid } from '../components/ImageGrid';
import { ImageModal } from '../components/ImageModal';
import Navigation from '../components/Navigation';
import { Breadcrumbs } from '../components/Breadcrumbs';

interface FolderItem {
    name: string;
    full_path: string;
}

interface ImageMetadata {
    frame_id?: string | number | null;
    [key: string]: unknown;
}

interface ImageItem {
    id?: string;
    name: string;
    tags?: string[];
    frame_id?: string | number | null;
    metadata?: ImageMetadata;
    [key: string]: unknown;
}

function normalizePathSearchValue(value: string): string {
    return value
        .toLowerCase()
        .replace(/\\/g, '/')
        .replace(/\s*>\s*/g, '/')
        .replace(/\s+/g, ' ')
        .trim();
}

function getPathSearchTerms(query: string): string[] {
    return normalizePathSearchValue(query)
        .split(/[\/\s]+/)
        .map(term => term.trim())
        .filter(Boolean);
}

function getSuggestionScore(fullPath: string, query: string): number | null {
    const normalizedPath = normalizePathSearchValue(fullPath);
    const normalizedQuery = normalizePathSearchValue(query);
    const queryTerms = getPathSearchTerms(query);

    if (!normalizedQuery || queryTerms.length === 0) {
        return null;
    }

    if (!queryTerms.every(term => normalizedPath.includes(term))) {
        return null;
    }

    const segments = normalizedPath.split('/').filter(Boolean);
    const finalSegment = segments[segments.length - 1] ?? '';

    if (normalizedQuery.length >= 2 && finalSegment === normalizedQuery) {
        return 0;
    }

    if (normalizedQuery.length >= 2 && finalSegment.startsWith(normalizedQuery)) {
        return 1;
    }

    if (normalizedQuery.length >= 2 && finalSegment.includes(normalizedQuery)) {
        return 2;
    }

    if (normalizedQuery.includes('/') && normalizedPath.includes(normalizedQuery)) {
        return 3;
    }

    let bestStartsWithDistance = Infinity;
    let bestIncludesDistance = Infinity;

    segments.forEach((segment, index) => {
        const distanceFromEnd = segments.length - 1 - index;

        if (queryTerms.some(term => segment.startsWith(term))) {
            bestStartsWithDistance = Math.min(bestStartsWithDistance, distanceFromEnd);
        }

        if (queryTerms.some(term => segment.includes(term))) {
            bestIncludesDistance = Math.min(bestIncludesDistance, distanceFromEnd);
        }
    });

    if (bestStartsWithDistance !== Infinity) {
        return 10 + bestStartsWithDistance;
    }

    if (bestIncludesDistance !== Infinity) {
        return 20 + bestIncludesDistance;
    }

    return 50 + segments.length;
}

export default function DataViewer() {
    const location = useLocation();
    const navigate = useNavigate();

    // -- State --
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [images, setImages] = useState<ImageItem[]>([]);

    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [folderDropdownOpen, setFolderDropdownOpen] = useState<string | null>(null);
    const [deleteModalFolder, setDeleteModalFolder] = useState<{ name: string; full_path: string } | null>(null);
    const [deleteInProgress, setDeleteInProgress] = useState(false);

    const [pathSearchText, setPathSearchText] = useState('');
    const [allFolderPaths, setAllFolderPaths] = useState<FolderItem[]>([]);
    const [pathSearchLoading, setPathSearchLoading] = useState(false);

    // Tag State
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [visibleTags, setVisibleTags] = useState(new Set<string>());

    // Primitive State
    const [visiblePrimitives, setVisiblePrimitives] = useState<Set<string>>(new Set());

    // Frame Range State
    const [frameRange, setFrameRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });

    // -- Derived State --
    const pathSegments = useMemo(() => {
        return location.pathname.split('/').filter(p => p && p !== 'viewer');
    }, [location.pathname]);

    const depth = pathSegments.length;
    const isLeaf = depth >= 3;
    const currentBackendPath = pathSegments.length > 0 ? pathSegments.join('/') : '';

    const matchingTagSuggestions = useMemo(() => {
        const query = filterText.trim().toLowerCase();

        if (!query) return [];

        return availableTags
            .filter(tag => !visibleTags.has(tag))
            .filter(tag => tag.toLowerCase().startsWith(query))
            .sort((a, b) => a.localeCompare(b));
    }, [availableTags, visibleTags, filterText]);

    const pathSuggestions = useMemo(() => {
        const query = pathSearchText.trim();

        if (!query) return [];

        return allFolderPaths
            .map((item) => ({
                item,
                score: getSuggestionScore(item.full_path, query),
            }))
            .filter((entry): entry is { item: FolderItem; score: number } => entry.score !== null)
            .sort((a, b) => {
                if (a.score !== b.score) return a.score - b.score;
                return a.item.full_path.localeCompare(b.item.full_path);
            })
            .slice(0, 7)
            .map(entry => entry.item);
    }, [allFolderPaths, pathSearchText]);

    // -- Effects --
    useEffect(() => {
        setLoading(true);
        setFilterText(''); // Reset search on nav

        if (isLeaf) {
            axios.get<ImageItem[]>(`/api/dataset/${currentBackendPath}`)
                .then(res => {
                    setImages(res.data);

                    const tags = new Set<string>();
                    res.data.forEach((img) => {
                        if (img.tags) img.tags.forEach((t: string) => tags.add(t));
                    });
                    setAvailableTags(Array.from(tags).sort());
                    setVisibleTags(new Set());
                })
                .catch(err => console.error('Error fetching images:', err))
                .finally(() => setLoading(false));

        } else {
            axios.get<FolderItem[]>('/api/datasets', { params: { path: currentBackendPath } })
                .then(res => {
                    setFolders(res.data);
                })
                .catch(err => console.error('Error fetching folders:', err))
                .finally(() => setLoading(false));

            setImages([]);
        }
    }, [location.pathname, isLeaf, currentBackendPath]);

    useEffect(() => {
        if (pathSegments.length !== 0) {
            setPathSearchText('');
            return;
        }

        setPathSearchLoading(true);
        axios.get<FolderItem[]>('/api/dataset-paths')
            .then(res => {
                setAllFolderPaths(res.data);
            })
            .catch(err => console.error('Error fetching dataset paths:', err))
            .finally(() => setPathSearchLoading(false));
    }, [pathSegments.length]);

    // -- Handlers --
    const toggleTag = (tag: string) => {
        const newVisible = new Set(visibleTags);
        if (newVisible.has(tag)) newVisible.delete(tag);
        else newVisible.add(tag);
        setVisibleTags(newVisible);
    };

    const handleSelectTagSuggestion = (tag: string) => {
        const newVisible = new Set(visibleTags);
        newVisible.add(tag);
        setVisibleTags(newVisible);
        setFilterText('');
    };

    const togglePrimitive = (prim: string) => {
        const newVisible = new Set(visiblePrimitives);
        if (newVisible.has(prim)) newVisible.delete(prim);
        else newVisible.add(prim);
        setVisiblePrimitives(newVisible);
    };

    const handleFolderClick = (folderName: string) => {
        const nextPath = location.pathname.endsWith('/')
            ? `${location.pathname}${folderName}`
            : `${location.pathname}/${folderName}`;
        navigate(nextPath);
    };

    const handlePathSuggestionClick = (fullPath: string) => {
        setPathSearchText('');
        navigate(`/viewer/${fullPath}`);
    };

    const handleDeleteFolder = async () => {
        if (!deleteModalFolder) return;
        setDeleteInProgress(true);
        try {
            await axios.post('/api/delete_dataset', { path: deleteModalFolder.full_path });
            setDeleteModalFolder(null);
            setFolderDropdownOpen(null);
            const path = currentBackendPath ? currentBackendPath + '/' : '';
            const res = await axios.get<FolderItem[]>('/api/datasets', { params: { path } });
            setFolders(res.data);
        } catch (err: any) {
            alert(err?.response?.data?.error || err?.message || 'Delete failed');
        } finally {
            setDeleteInProgress(false);
        }
    };

    const renderHighlightedPath = (fullPath: string) => {
        const segments = fullPath.split('/').filter(Boolean);
        const queryTerms = getPathSearchTerms(pathSearchText).filter(term => term.length >= 2);

        return (
            <span className="text-sm font-sans-tech">
                {segments.map((segment, index) => {
                    const isMatch = queryTerms.some(term => segment.toLowerCase().includes(term));

                    return (
                        <span key={`${fullPath}-${segment}-${index}`}>
                            {index > 0 && <span className="text-muted-foreground/60">/</span>}
                            <span
                                className={
                                    isMatch
                                        ? 'text-primary underline decoration-primary/70 underline-offset-4 font-bold'
                                        : 'text-foreground'
                                }
                            >
                                {segment}
                            </span>
                        </span>
                    );
                })}
            </span>
        );
    };

    // Filter Logic
    const filteredImages = useMemo(() => {
        let result = images;

        if (filterText) {
            const lower = filterText.toLowerCase();
            result = result.filter((img) => img.name.toLowerCase().includes(lower));
        }

        if (visibleTags.size > 0) {
            result = result.filter((img) =>
                img.tags?.some((t) => visibleTags.has(t)) ?? false
            );
        }

        if (frameRange.min !== null || frameRange.max !== null) {
            result = result.filter((img) => {
                const rawFrameId = img.frame_id ?? img.metadata?.frame_id;

                let frameId: number | null = null;
                if (typeof rawFrameId === 'number') {
                    frameId = rawFrameId;
                } else if (typeof rawFrameId === 'string') {
                    const parsed = Number.parseInt(rawFrameId, 10);
                    if (!Number.isNaN(parsed)) {
                        frameId = parsed;
                    }
                }

                if (frameId === null) return false;

                const min = frameRange.min ?? -Infinity;
                const max = frameRange.max ?? Infinity;
                return frameId >= min && frameId <= max;
            });
        }

        return result;
    }, [images, filterText, visibleTags, frameRange]);

    const filteredFolders = useMemo(() => {
        if (!filterText) return folders;

        const lower = filterText.toLowerCase();
        return folders.filter((folder) => folder.name.toLowerCase().includes(lower));
    }, [folders, filterText]);

    const itemCount = isLeaf ? filteredImages.length : filteredFolders.length;

    return (
        <div className="flex flex-col h-screen text-foreground bg-background font-sans-tech overflow-hidden relative">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] pointer-events-none"></div>
            <Navigation />
            <div className="flex flex-col flex-1 overflow-hidden pt-16 relative z-10">

                <div className="h-12 bg-background/80 backdrop-blur-md border-b border-border flex items-center px-4 justify-between z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Link to="/viewer" className="font-sans-tech font-bold text-primary hidden md:block hover:text-primary-glow transition-colors">DATARA EXPLORER</Link>
                            <Breadcrumbs />
                        </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs font-sans-tech font-medium text-muted-foreground">
                        <span className="flex items-center gap-2 text-success">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                            Live Connection
                        </span>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {isLeaf && (
                        <Sidebar
                            filterText={filterText}
                            availableTags={availableTags}
                            visibleTags={visibleTags}
                            onToggleTag={toggleTag}
                            visiblePrimitives={visiblePrimitives}
                            onTogglePrimitive={togglePrimitive}
                            onFilterChange={(_key, val) => setFilterText(val)}
                            onUploadClick={() => setIsUploadModalOpen(true)}
                            frameRange={frameRange}
                            onFrameRangeChange={(min, max) => setFrameRange({ min, max })}
                            matchingTagSuggestions={matchingTagSuggestions}
                            onSelectTagSuggestion={handleSelectTagSuggestion}
                        />
                    )}

                    <div className="flex-1 flex flex-col min-w-0 bg-background/50">
                        <div className="h-10 border-b border-border bg-card/10 flex items-center px-4 justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center bg-card border border-border rounded-sm px-2 py-1 text-xs">
                                    <span className="text-muted-foreground mr-2 font-sans-tech">Items:</span>
                                    <span className="text-foreground font-sans-tech">{itemCount}</span>
                                </div>
                                <div className="h-4 w-px bg-border"></div>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center text-xs gap-1 font-sans-tech"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                    <span>Refresh</span>
                                </button>
                            </div>

                            {!isLeaf && (
                                <button
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/50 px-3 py-1 rounded-sm text-xs font-sans-tech font-medium transition-colors flex items-center gap-2"
                                >
                                    <Terminal className="w-3 h-3" />
                                    Import Data
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto relative p-0 custom-scrollbar bg-background/30">
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20 backdrop-blur-sm">
                                    <div className="flex flex-col items-center gap-4">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                        <span className="text-primary font-sans-tech text-xs animate-pulse">Loading Assets...</span>
                                    </div>
                                </div>
                            )}

                            {!isLeaf ? (
                                <div className="flex flex-col min-h-full">
                                    {pathSegments.length === 0 && (
                                        <div className="px-8 py-16 flex flex-col items-center justify-center text-center border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
                                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
                                                <Database className="w-8 h-8 text-primary" />
                                            </div>
                                            <h1 className="text-4xl font-sans-tech font-bold text-foreground mb-4 tracking-tight">
                                                DATARA <span className="text-primary">EXPLORER</span>
                                            </h1>
                                            <p className="text-muted-foreground max-w-2xl mx-auto font-sans-tech text-sm leading-relaxed">
                                                Select a data module below to begin inspection, or use the search bar below to quickly navigate to a folder path.
                                            </p>

                                            <div className="relative mt-8 w-full max-w-2xl">
                                                <div className="relative">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                                    <input
                                                        type="text"
                                                        value={pathSearchText}
                                                        onChange={(e) => setPathSearchText(e.target.value)}
                                                        placeholder="Search folders or paths, e.g. BMW or carautomation/bmw/frontgrille"
                                                        className="w-full h-12 rounded-sm border border-primary/40 bg-background/90 text-foreground pl-11 pr-4 font-sans-tech text-sm focus:outline-none focus:border-primary shadow-lg shadow-primary/10 placeholder:text-muted-foreground"
                                                    />
                                                    {pathSearchLoading && (
                                                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
                                                    )}
                                                </div>

                                                {pathSearchText.trim() !== '' && (
                                                    <div className="mt-2 border border-primary/20 rounded-sm bg-card/95 backdrop-blur-sm overflow-hidden shadow-xl shadow-black/20 text-left">
                                                        {pathSuggestions.length > 0 ? (
                                                            <div className="divide-y divide-border">
                                                                {pathSuggestions.map((suggestion) => (
                                                                    <button
                                                                        key={suggestion.full_path}
                                                                        type="button"
                                                                        onClick={() => handlePathSuggestionClick(suggestion.full_path)}
                                                                        className="w-full px-4 py-3 hover:bg-primary/10 transition-colors text-left"
                                                                    >
                                                                        {renderHighlightedPath(suggestion.full_path)}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="px-4 py-3 text-sm text-muted-foreground font-sans-tech">
                                                                No matching paths found
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-8">
                                        {pathSegments.length > 0 && (
                                            <div className="flex items-center gap-2 mb-6 max-w-5xl mx-auto">
                                                <div className="w-1 h-4 bg-primary"></div>
                                                <h2 className="text-lg font-sans-tech font-bold text-muted-foreground uppercase tracking-widest">Subdirectories</h2>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                                            {filteredFolders.map((folder) => (
                                                <div
                                                    key={folder.full_path}
                                                    onClick={() => handleFolderClick(folder.name)}
                                                    className="group cursor-pointer relative p-8 bg-card/20 border border-border hover:border-primary/50 hover:bg-card/40 transition-all duration-300 overflow-visible"
                                                >
                                                    <div className="absolute top-3 right-3 z-20" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFolderDropdownOpen(folderDropdownOpen === folder.full_path ? null : folder.full_path)}
                                                            className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
                                                            aria-label="Folder options"
                                                        >
                                                            <MoreVertical className="w-5 h-5" />
                                                        </button>
                                                        {folderDropdownOpen === folder.full_path && (
                                                            <>
                                                                <div className="fixed inset-0 z-10" onClick={() => setFolderDropdownOpen(null)} aria-hidden />
                                                                <div className="absolute right-0 mt-1 py-1 w-40 bg-card border border-border rounded-sm shadow-lg z-20">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setDeleteModalFolder({ name: folder.name, full_path: folder.full_path });
                                                                            setFolderDropdownOpen(null);
                                                                        }}
                                                                        className="w-full px-3 py-2 text-left text-sm font-sans-tech text-destructive hover:bg-destructive/10 flex items-center gap-2"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-border group-hover:border-primary transition-colors"></div>
                                                    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-border group-hover:border-primary transition-colors"></div>
                                                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-border group-hover:border-primary transition-colors"></div>
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-border group-hover:border-primary transition-colors"></div>

                                                    <div className="flex flex-col items-center gap-6 relative z-10">
                                                        <div className="p-4 bg-background/50 rounded-sm border border-border group-hover:border-primary/30 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.1)] transition-all">
                                                            <Folder className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" />
                                                        </div>
                                                        <span className="text-lg font-sans-tech font-bold text-foreground group-hover:text-primary transition-colors text-center break-words w-full uppercase tracking-wider">
                                                            {folder.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}

                                            {filteredFolders.length === 0 && !loading && (
                                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border bg-card/10 rounded-sm">
                                                    <AlertCircle className="w-12 h-12 mb-4 text-muted-foreground/50" />
                                                    <p className="text-lg font-sans-tech">No data found</p>
                                                    <button
                                                        onClick={() => setIsUploadModalOpen(true)}
                                                        className="mt-6 text-primary hover:text-primary-glow font-sans-tech font-medium text-sm underline decoration-dotted underline-offset-4"
                                                    >
                                                        Upload Data
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <ImageGrid
                                    images={filteredImages}
                                    onImageClick={setSelectedImage}
                                    visibleTags={visibleTags}
                                    visiblePrimitives={visiblePrimitives}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {selectedImage && (
                    <ImageModal
                        image={selectedImage}
                        onClose={() => setSelectedImage(null)}
                        onNext={() => {
                            const idx = filteredImages.indexOf(selectedImage);
                            if (idx < filteredImages.length - 1) setSelectedImage(filteredImages[idx + 1]);
                        }}
                        onPrev={() => {
                            const idx = filteredImages.indexOf(selectedImage);
                            if (idx > 0) setSelectedImage(filteredImages[idx - 1]);
                        }}
                    />
                )}

                <UploadModal
                    isOpen={isUploadModalOpen}
                    onClose={() => setIsUploadModalOpen(false)}
                    onSuccess={() => {/* refresh */ }}
                />

                {deleteModalFolder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                        <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-lg font-sans-tech font-bold text-foreground mb-2">Delete path and subdirectories?</h3>
                            <p className="text-sm text-muted-foreground font-sans-tech mb-1">
                                You are about to delete <span className="text-foreground font-medium">{deleteModalFolder.full_path}</span> and all of its contents.
                            </p>
                            <p className="text-xs text-destructive/90 font-sans-tech mb-6">This action cannot be undone.</p>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDeleteModalFolder(null)}
                                    className="px-4 py-2 text-sm font-sans-tech font-medium text-muted-foreground hover:text-foreground border border-border rounded-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteFolder}
                                    disabled={deleteInProgress}
                                    className="px-4 py-2 text-sm font-sans-tech font-medium text-primary-foreground bg-destructive hover:bg-destructive/90 rounded-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {deleteInProgress && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}