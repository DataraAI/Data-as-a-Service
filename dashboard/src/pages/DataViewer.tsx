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
    const [refreshNonce, setRefreshNonce] = useState(0);

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
    const currentBackendPath = pathSegments.length > 0 ? pathSegments.join('/') : '';
    const isGlobalSearch = currentBackendPath === 'global-search';
    const isLeaf = isGlobalSearch || depth >= 3;

    const matchingTagSuggestions = useMemo(() => {
        const query = filterText.trim().toLowerCase();

        if (!query) return [];

        return availableTags
            .filter(tag => !visibleTags.has(tag))
            .filter(tag => tag.toLowerCase().startsWith(query))
            .sort((a, b) => a.localeCompare(b));
    }, [availableTags, visibleTags, filterText]);

    // Filter Logic (for Images)
    const filteredImages = useMemo(() => {
        let result = images;

        if (filterText) {
            const lower = filterText.toLowerCase();
            result = result.filter((img) => (img.name ?? '').toLowerCase().includes(lower));
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
        return folders.filter((folder) => (folder.name ?? '').toLowerCase().includes(lower));
    }, [folders, filterText]);

    const itemCount = isLeaf ? filteredImages.length : filteredFolders.length;

    // -- Effects --
    useEffect(() => {
        setLoading(true);
        setFilterText('');

        if (isLeaf) {
            const request = isGlobalSearch
                ? axios.get<ImageItem[]>('/api/global-images')
                : axios.get<ImageItem[]>(`/api/dataset/${currentBackendPath}`);

            request
                .then(res => {
                    setImages(res.data);

                    const tags = new Set<string>();
                    res.data.forEach((img) => {
                        if (img.tags) {
                            img.tags.forEach((t: string) => tags.add(t));
                        }
                    });

                    setAvailableTags(Array.from(tags).sort((a, b) => a.localeCompare(b)));
                    setVisibleTags(new Set());
                })
                .catch(err => console.error(`Error fetching ${isGlobalSearch ? 'global images' : 'images'}:`, err))
                .finally(() => setLoading(false));
        } else {
            axios.get<FolderItem[]>('/api/datasets', { params: { path: currentBackendPath } })
                .then(res => {
                    setFolders(res.data);
                })
                .catch(err => console.error('Error fetching folders:', err))
                .finally(() => setLoading(false));

            setImages([]);
            setAvailableTags([]);
            setVisibleTags(new Set());
        }
    }, [location.pathname, isLeaf, isGlobalSearch, currentBackendPath, refreshNonce]);

    useEffect(() => {
        if (selectedImage && !filteredImages.includes(selectedImage)) {
            setSelectedImage(null);
        }
    }, [filteredImages, selectedImage]);

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

    const handleDeleteFolder = async () => {
        if (!deleteModalFolder) return;
        setDeleteInProgress(true);
        try {
            await axios.post('/api/delete_dataset', { path: deleteModalFolder.full_path });
            setDeleteModalFolder(null);
            setFolderDropdownOpen(null);
            const path = currentBackendPath ? `${currentBackendPath}/` : '';
            const res = await axios.get<FolderItem[]>('/api/datasets', { params: { path } });
            setFolders(res.data);
        } catch (err: any) {
            alert(err?.response?.data?.error || err?.message || 'Delete failed');
        } finally {
            setDeleteInProgress(false);
        }
    };

    const handleGlobalSearchClick = () => {
        navigate('/viewer/global-search');
    };

    const handleRefresh = () => {
        setRefreshNonce((value) => value + 1);
    };

    return (
        <div className="flex flex-col h-screen text-foreground bg-background font-sans-tech overflow-hidden relative">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] pointer-events-none"></div>
            <Navigation />
            <div className="flex flex-col flex-1 overflow-hidden pt-16 relative z-10">
                {/* Header Bar */}
                <div className="h-12 bg-background/80 backdrop-blur-md border-b border-border flex items-center px-4 justify-between z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Link to="/viewer" className="font-sans-tech font-bold text-primary hidden md:block hover:text-primary-glow transition-colors">
                                DATARA EXPLORER
                            </Link>
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
                                    onClick={handleRefresh}
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
                                            <p className="text-muted-foreground max-w-md mx-auto font-sans-tech text-sm leading-relaxed">
                                                Select a data module below to begin inspection, or press the button below to search globally.
                                            </p>

                                            <button
                                                onClick={handleGlobalSearchClick}
                                                className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm text-sm font-sans-tech font-bold uppercase tracking-wider transition-all shadow-lg shadow-primary/20"
                                            >
                                                <Search className="w-4 h-4" />
                                                Global Search
                                            </button>
                                        </div>
                                    )}

                                    <div className="p-8">
                                        {pathSegments.length > 0 && (
                                            <div className="flex items-center gap-2 mb-6 max-w-5xl mx-auto">
                                                <div className="w-1 h-4 bg-primary"></div>
                                                <h2 className="text-lg font-sans-tech font-bold text-muted-foreground uppercase tracking-widest">
                                                    Subdirectories
                                                </h2>
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
                            if (idx >= 0 && idx < filteredImages.length - 1) {
                                setSelectedImage(filteredImages[idx + 1]);
                            }
                        }}
                        onPrev={() => {
                            const idx = filteredImages.indexOf(selectedImage);
                            if (idx > 0) {
                                setSelectedImage(filteredImages[idx - 1]);
                            }
                        }}
                    />
                )}

                <UploadModal
                    isOpen={isUploadModalOpen}
                    onClose={() => setIsUploadModalOpen(false)}
                    onSuccess={() => {
                        setIsUploadModalOpen(false);
                        handleRefresh();
                    }}
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