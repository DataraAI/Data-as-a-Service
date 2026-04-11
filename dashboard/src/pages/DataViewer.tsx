import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { UploadModal } from '../components/UploadModal';
import {
    Loader2,
    RefreshCw,
    Folder,
    Database,
    Terminal,
    AlertCircle,
    MoreVertical,
    Trash2,
    Search,
    ArrowRight,
    ChevronDown,
} from 'lucide-react';
import { ImageGrid } from '../components/ImageGrid';
import { ImageModal } from '../components/ImageModal';
import Navigation from '../components/Navigation';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { DatasetFolderCover } from '../components/DatasetFolderCover';
import { blobProxyUrl } from '@/lib/datasetFolderCover';

interface FolderItem {
    name: string;
    full_path: string;
    source_path?: string;
}
interface VlmRun { effective_prompt?: string; tags?: string[]; }
interface VlmMetadata { last_prompt_label?: string | null; runs?: Record<string, VlmRun>; }
interface ImageMetadata { frame_id?: string | number | null; vlm?: VlmMetadata; [key: string]: unknown; }
interface ImageItem { id?: string; name: string; tags?: string[]; frame_id?: string | number | null; metadata?: ImageMetadata; [key: string]: unknown; }
interface VlmPromptGroup { prompt: string; tags: string[]; }

type VerticalKey = 'carAutomation' | 'humanoid' | 'serverrack' | 'warehouse';

interface VerticalConfig {
    key: VerticalKey;
    label: string;
    description: string;
    helperText: string;
    searchTitle: string;
    searchDescription: string;
}

const VERTICALS: VerticalConfig[] = [
    {
        key: 'carAutomation',
        label: 'Car Automation',
        description: 'Assembly, inspection, and vehicle-production data for robotics workflows across automotive environments.',
        helperText: 'Browse this vertical to explore automotive data collections, or search directly below to jump to a specific folder path.',
        searchTitle: 'Search within Car Automation',
        searchDescription: 'Find folders, scenes, or specific path matches inside the Car Automation vertical.',
    },
    {
        key: 'humanoid',
        label: 'Humanoid',
        description: 'Manipulation and embodied task data for human-like robots operating across practical, object-centric scenarios.',
        helperText: 'Use this vertical for humanoid-focused tasks and embodied interaction data, including task-oriented subdirectories.',
        searchTitle: 'Search within Humanoid',
        searchDescription: 'Search only across humanoid-related folders to narrow down the most relevant dataset path quickly.',
    },
    {
        key: 'serverrack',
        label: 'Serverrack',
        description: 'Data-center interaction, port-level operation, and maintenance-focused datasets for rack and cabling tasks.',
        helperText: 'Start here for server-rack workflows, then browse further or search to move directly into a relevant dataset branch.',
        searchTitle: 'Search within Serverrack',
        searchDescription: 'Search inside the Serverrack vertical for folders related to rack operations, cabling, and maintenance.',
    },
    {
        key: 'warehouse',
        label: 'Warehouse',
        description: 'Logistics, handling, and storage-operation data for robotic movement, picking, and material flow.',
        helperText: 'Explore warehouse-oriented robotics data collections, or search within this vertical to find a path faster.',
        searchTitle: 'Search within Warehouse',
        searchDescription: 'Search only within warehouse data paths to keep results focused and easier to navigate.',
    },
];

const SEARCH_ALL_VALUE = 'searchAll';

const HUMANOID_ROOT_ALIASES: Array<{ rawRoot: string; displayRoot: string }> = [
    { rawRoot: 'peeling', displayRoot: 'humanoid/peeling' },
    { rawRoot: 'washingMachine', displayRoot: 'humanoid/washingMachine' },
    { rawRoot: 'washingmachine', displayRoot: 'humanoid/washingMachine' },
];

function normalizePathSearchValue(value: string) {
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

    if (!normalizedQuery || queryTerms.length === 0) return null;
    if (!queryTerms.every(term => normalizedPath.includes(term))) return null;

    const segments = normalizedPath.split('/').filter(Boolean);
    const finalSegment = segments[segments.length - 1] ?? '';

    if (normalizedQuery.length >= 2 && finalSegment === normalizedQuery) return 0;
    if (normalizedQuery.length >= 2 && finalSegment.startsWith(normalizedQuery)) return 1;
    if (normalizedQuery.length >= 2 && finalSegment.includes(normalizedQuery)) return 2;
    if (normalizedQuery.includes('/') && normalizedPath.includes(normalizedQuery)) return 3;

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

    if (bestStartsWithDistance !== Infinity) return 10 + bestStartsWithDistance;
    if (bestIncludesDistance !== Infinity) return 20 + bestIncludesDistance;

    return 50 + segments.length;
}

function replacePathPrefix(path: string, fromPrefix: string, toPrefix: string) {
    if (path === fromPrefix) return toPrefix;
    if (path.startsWith(`${fromPrefix}/`)) return `${toPrefix}/${path.slice(fromPrefix.length + 1)}`;
    return null;
}

function mapRawPathToDisplayPath(rawPath: string) {
    for (const alias of HUMANOID_ROOT_ALIASES) {
        const mapped = replacePathPrefix(rawPath, alias.rawRoot, alias.displayRoot);
        if (mapped) return mapped;
    }
    return rawPath;
}

function resolveDisplayPathToBackendPath(displayPath: string) {
    for (const alias of HUMANOID_ROOT_ALIASES) {
        const mapped = replacePathPrefix(displayPath, alias.displayRoot, alias.rawRoot);
        if (mapped) return mapped;
    }
    return displayPath;
}

function normalizeFolderPathResults(payload: unknown): FolderItem[] {
    if (!Array.isArray(payload)) return [];

    return payload
        .map((item) => {
            if (typeof item === 'string') {
                const fullPath = item.trim().replace(/^\/+|\/+$/g, '');
                if (!fullPath) return null;
                const parts = fullPath.split('/').filter(Boolean);
                return {
                    name: parts[parts.length - 1] ?? fullPath,
                    full_path: fullPath,
                };
            }

            if (item && typeof item === 'object') {
                const maybeItem = item as Partial<FolderItem>;
                const fullPath = typeof maybeItem.full_path === 'string' ? maybeItem.full_path.trim().replace(/^\/+|\/+$/g, '') : '';
                if (!fullPath) return null;
                const parts = fullPath.split('/').filter(Boolean);
                return {
                    name: typeof maybeItem.name === 'string' && maybeItem.name.trim()
                        ? maybeItem.name.trim()
                        : (parts[parts.length - 1] ?? fullPath),
                    full_path: fullPath,
                    source_path: typeof maybeItem.source_path === 'string' ? maybeItem.source_path : undefined,
                };
            }

            return null;
        })
        .filter((item): item is FolderItem => item !== null);
}

function mapFolderItemToDisplayPath(item: FolderItem): FolderItem {
    const displayPath = mapRawPathToDisplayPath(item.full_path);
    const parts = displayPath.split('/').filter(Boolean);
    return {
        ...item,
        name: parts[parts.length - 1] ?? item.name,
        full_path: displayPath,
    };
}

function uniqueFolderItems(items: FolderItem[]) {
    const seen = new Set<string>();
    return items.filter((item) => {
        if (seen.has(item.full_path)) return false;
        seen.add(item.full_path);
        return true;
    });
}

function getVerticalByKey(value?: string | null) {
    return VERTICALS.find((vertical) => vertical.key === value) ?? null;
}

function buildVerticalImagePaths(verticalKey: VerticalKey) {
    return [0, 1, 2, 3].map((index) => `${verticalKey}/${verticalKey}${index === 0 ? '' : index}.png`);
}

function VerticalGalleryImage({ blobPath, alt }: { blobPath: string; alt: string }) {
    const [failed, setFailed] = useState(false);

    if (failed) {
        return (
            <div className="w-full aspect-[4/3] rounded-sm border border-border bg-background/60 flex items-center justify-center">
                <Database className="w-8 h-8 text-primary/60" />
            </div>
        );
    }

    return (
        <div className="w-full aspect-[4/3] rounded-sm border border-border bg-background/60 overflow-hidden shadow-lg shadow-black/20">
            <img
                src={blobProxyUrl(blobPath)}
                alt={alt}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                onError={() => setFailed(true)}
            />
        </div>
    );
}

function VerticalSearchPanel({
    title,
    description,
    value,
    loading,
    suggestions,
    placeholder,
    onFocus,
    onChange,
    onSuggestionClick,
    renderHighlightedPath,
}: {
    title: string;
    description: string;
    value: string;
    loading: boolean;
    suggestions: FolderItem[];
    placeholder: string;
    onFocus: () => void;
    onChange: (value: string) => void;
    onSuggestionClick: (fullPath: string) => void;
    renderHighlightedPath: (fullPath: string) => JSX.Element;
}) {
    return (
        <div className="mt-10 border border-border bg-card/20 p-6 md:p-8 rounded-sm shadow-xl shadow-black/10">
            <div className="max-w-3xl">
                <h3 className="text-2xl font-sans-tech font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground font-sans-tech leading-relaxed">{description}</p>
            </div>
            <div className="relative mt-6 w-full">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <input
                        type="text"
                        value={value}
                        onFocus={onFocus}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full h-12 rounded-sm border border-primary/40 bg-background/90 text-foreground pl-11 pr-4 font-sans-tech text-sm focus:outline-none focus:border-primary shadow-lg shadow-primary/10 placeholder:text-muted-foreground"
                    />
                    {loading && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
                    )}
                </div>
                {value.trim() !== '' && (
                    <div className="mt-2 border border-primary/20 rounded-sm bg-card/95 backdrop-blur-sm overflow-hidden shadow-xl shadow-black/20 text-left">
                        {suggestions.length > 0 ? (
                            <div className="divide-y divide-border">
                                {suggestions.map((suggestion) => (
                                    <button
                                        key={suggestion.full_path}
                                        type="button"
                                        onClick={() => onSuggestionClick(suggestion.full_path)}
                                        className="w-full px-4 py-3 hover:bg-primary/10 transition-colors text-left"
                                    >
                                        {renderHighlightedPath(suggestion.full_path)}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 py-3 text-sm text-muted-foreground font-sans-tech">
                                {loading ? 'Loading paths...' : 'No matching paths found'}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DataViewer() {
    const location = useLocation();
    const navigate = useNavigate();

    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [images, setImages] = useState<ImageItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [folderDropdownOpen, setFolderDropdownOpen] = useState<string | null>(null);
    const [deleteModalFolder, setDeleteModalFolder] = useState<{ name: string; full_path: string } | null>(null);
    const [deleteInProgress, setDeleteInProgress] = useState(false);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [visibleTags, setVisibleTags] = useState(new Set<string>());
    const [vlmPromptGroups, setVlmPromptGroups] = useState<VlmPromptGroup[]>([]);
    const [visiblePrimitives, setVisiblePrimitives] = useState<Set<string>>(new Set());
    const [frameRange, setFrameRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
    const [pathSearchText, setPathSearchText] = useState('');
    const [allFolderPaths, setAllFolderPaths] = useState<FolderItem[]>([]);
    const [pathSearchLoading, setPathSearchLoading] = useState(false);
    const [pathSearchTouched, setPathSearchTouched] = useState(false);
    const [selectedVerticalRoute, setSelectedVerticalRoute] = useState('');

    const pathSegments = useMemo(() => location.pathname.split('/').filter(p => p && p !== 'viewer'), [location.pathname]);
    const currentDisplayPath = pathSegments.length > 0 ? pathSegments.join('/') : '';
    const currentBackendPath = useMemo(() => resolveDisplayPathToBackendPath(currentDisplayPath), [currentDisplayPath]);
    const activeVertical = useMemo(() => getVerticalByKey(pathSegments[0]), [pathSegments]);
    const isRootLanding = pathSegments.length === 0;
    const isGlobalSearchPage = pathSegments.length === 1 && pathSegments[0] === SEARCH_ALL_VALUE;
    const isVerticalLanding = !!activeVertical && pathSegments.length === 1;
    const isLeaf = !isRootLanding && !isGlobalSearchPage && pathSegments.length >= 3;
    const shouldFetchFolders = !isLeaf && !isRootLanding && !isGlobalSearchPage;
    const supportsPathSearch = isRootLanding || isGlobalSearchPage || isVerticalLanding;

    useEffect(() => {
        setPathSearchText('');
        setPathSearchTouched(false);
        setSelectedVerticalRoute('');
    }, [location.pathname]);

    const matchingTagSuggestions = useMemo(() => {
        const query = filterText.trim().toLowerCase();
        if (!query) return [];
        return availableTags
            .filter(tag => !visibleTags.has(tag))
            .filter(tag => tag.toLowerCase().startsWith(query))
            .sort((a, b) => a.localeCompare(b));
    }, [availableTags, visibleTags, filterText]);

    const searchScopePaths = useMemo(() => {
        if (isVerticalLanding && activeVertical) {
            const prefix = `${activeVertical.key}/`;
            return allFolderPaths.filter((item) => item.full_path === activeVertical.key || item.full_path.startsWith(prefix));
        }
        if (isRootLanding || isGlobalSearchPage) {
            return allFolderPaths;
        }
        return [];
    }, [allFolderPaths, activeVertical, isGlobalSearchPage, isRootLanding, isVerticalLanding]);

    const pathSuggestions = useMemo(() => {
        const query = pathSearchText.trim();
        if (!query) return [];

        return searchScopePaths
            .map((item) => ({ item, score: getSuggestionScore(item.full_path, query) }))
            .filter((entry): entry is { item: FolderItem; score: number } => entry.score !== null)
            .sort((a, b) => {
                if (a.score !== b.score) return a.score - b.score;
                return a.item.full_path.localeCompare(b.item.full_path);
            })
            .slice(0, 7)
            .map(entry => entry.item);
    }, [searchScopePaths, pathSearchText]);

    useEffect(() => {
        setLoading(true);
        setFilterText('');

        if (isLeaf) {
            axios.get<ImageItem[]>(`/api/dataset/${currentBackendPath}`)
                .then(res => {
                    setImages(res.data);
                    const normalTags = new Set<string>();
                    const promptGroups = new Map<string, Set<string>>();
                    res.data.forEach((img) => {
                        (img.tags || []).forEach((tag: string) => {
                            if (!tag.includes(': ')) normalTags.add(tag);
                        });
                        const runs = img.metadata?.vlm?.runs;
                        if (runs && typeof runs === 'object') {
                            Object.entries(runs).forEach(([prompt, run]) => {
                                const runTags = Array.isArray(run?.tags) ? run.tags : [];
                                if (!runTags.length) return;
                                if (!promptGroups.has(prompt)) promptGroups.set(prompt, new Set<string>());
                                runTags.forEach((tag) => promptGroups.get(prompt)!.add(`${prompt}: ${tag}`));
                            });
                        }
                    });
                    setAvailableTags(Array.from(normalTags).sort());
                    setVlmPromptGroups(
                        Array.from(promptGroups.entries())
                            .map(([prompt, tags]) => ({ prompt, tags: Array.from(tags).sort((a, b) => a.localeCompare(b)) }))
                            .sort((a, b) => a.prompt.localeCompare(b.prompt))
                    );
                    setVisibleTags(new Set());
                })
                .catch(err => console.error('Error fetching images:', err))
                .finally(() => setLoading(false));
            return;
        }

        if (!shouldFetchFolders) {
            setFolders([]);
            setImages([]);
            setVlmPromptGroups([]);
            setLoading(false);
            return;
        }

        const loadFolders = async () => {
            try {
                const folderResponse = await axios.get<FolderItem[]>(`/api/datasets`, { params: { path: currentBackendPath } });
                let nextFolders = folderResponse.data;

                if (activeVertical?.key === 'humanoid' && pathSegments.length === 1) {
                    const rootResponse = await axios.get<FolderItem[]>(`/api/datasets`, { params: { path: '' } });
                    const humanoidExtras = rootResponse.data
                        .filter((folder) => HUMANOID_ROOT_ALIASES.some((alias) => alias.rawRoot.toLowerCase() === folder.name.toLowerCase()))
                        .map((folder) => ({
                            name: folder.name,
                            full_path: `humanoid/${folder.name}`,
                            source_path: folder.full_path,
                        }));
                    nextFolders = uniqueFolderItems([...nextFolders, ...humanoidExtras]);
                }

                setFolders(nextFolders);
            } catch (err) {
                console.error('Error fetching folders:', err);
            } finally {
                setImages([]);
                setVlmPromptGroups([]);
                setLoading(false);
            }
        };

        loadFolders();
    }, [location.pathname, isLeaf, shouldFetchFolders, currentBackendPath, activeVertical, pathSegments.length]);

    useEffect(() => {
        if (!supportsPathSearch || !pathSearchTouched || allFolderPaths.length > 0) return;

        setPathSearchLoading(true);
        axios.get('/api/dataset-paths')
            .then((res) => {
                const normalized = normalizeFolderPathResults(res.data).map(mapFolderItemToDisplayPath);
                setAllFolderPaths(uniqueFolderItems(normalized));
            })
            .catch(err => console.error('Error fetching dataset paths:', err))
            .finally(() => setPathSearchLoading(false));
    }, [supportsPathSearch, pathSearchTouched, allFolderPaths.length]);

    const toggleTag = (tag: string) => {
        const newVisible = new Set(visibleTags);
        newVisible.has(tag) ? newVisible.delete(tag) : newVisible.add(tag);
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
        newVisible.has(prim) ? newVisible.delete(prim) : newVisible.add(prim);
        setVisiblePrimitives(newVisible);
    };

    const handleFolderClick = (folder: FolderItem) => {
        const nextPath = location.pathname.endsWith('/') ? `${location.pathname}${folder.name}` : `${location.pathname}/${folder.name}`;
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
            await axios.post('/api/delete_dataset', { path: resolveDisplayPathToBackendPath(deleteModalFolder.full_path) });
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
                            <span className={isMatch ? 'text-primary underline decoration-primary/70 underline-offset-4 font-bold' : 'text-foreground'}>
                                {segment}
                            </span>
                        </span>
                    );
                })}
            </span>
        );
    };

    const filteredImages = useMemo(() => {
        let result = images;
        if (filterText) result = result.filter((img) => img.name.toLowerCase().includes(filterText.toLowerCase()));
        if (visibleTags.size > 0) result = result.filter((img) => img.tags?.some((t) => visibleTags.has(t)) ?? false);
        if (frameRange.min !== null || frameRange.max !== null) {
            result = result.filter((img) => {
                const rawFrameId = img.frame_id ?? img.metadata?.frame_id;
                let frameId: number | null = null;
                if (typeof rawFrameId === 'number') frameId = rawFrameId;
                else if (typeof rawFrameId === 'string') {
                    const parsed = Number.parseInt(rawFrameId, 10);
                    if (!Number.isNaN(parsed)) frameId = parsed;
                }
                if (frameId === null) return false;
                const min = frameRange.min ?? -Infinity;
                const max = frameRange.max ?? Infinity;
                return frameId >= min && frameId <= max;
            });
        }
        return result;
    }, [images, filterText, visibleTags, frameRange]);

    const filteredFolders = useMemo(
        () => (!filterText ? folders : folders.filter((folder) => folder.name.toLowerCase().includes(filterText.toLowerCase()))),
        [folders, filterText]
    );

    const itemCount = useMemo(() => {
        if (isRootLanding) return VERTICALS.length;
        if (isGlobalSearchPage) return allFolderPaths.length;
        return isLeaf ? filteredImages.length : filteredFolders.length;
    }, [allFolderPaths.length, filteredFolders.length, filteredImages.length, isGlobalSearchPage, isLeaf, isRootLanding]);

    const scrollToSubdirectories = () => {
        const section = document.getElementById('vertical-subdirectories');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const renderRootLanding = () => (
        <div className="px-8 py-14 md:py-20 max-w-6xl mx-auto w-full">
            <div className="border border-border bg-gradient-to-br from-primary/10 via-card/40 to-background/80 p-8 md:p-12 rounded-sm shadow-2xl shadow-black/20">
                <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 px-3 py-1 rounded-sm text-xs font-sans-tech uppercase tracking-[0.24em] text-primary mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        RoboDataHub
                    </div>
                    <h1 className="text-4xl md:text-5xl font-sans-tech font-bold text-foreground tracking-tight mb-5">
                        RoboDataHub
                    </h1>
                    <p className="text-muted-foreground font-sans-tech text-sm md:text-base leading-relaxed max-w-2xl">
                        Explore robotics data through curated verticals, then move directly into the subdirectory structure that matters most for your workflow.
                    </p>
                </div>
                <div className="mt-8 flex flex-col md:flex-row gap-4 md:items-center">
                    <div className="relative w-full md:max-w-sm">
                        <select
                            value={selectedVerticalRoute}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSelectedVerticalRoute(value);
                                if (!value) return;
                                navigate(value === SEARCH_ALL_VALUE ? '/viewer/searchAll' : `/viewer/${value}`);
                            }}
                            className="w-full h-12 rounded-sm border border-primary/40 bg-background/90 text-foreground pl-4 pr-11 font-sans-tech text-sm focus:outline-none focus:border-primary appearance-none"
                        >
                            <option value="">Choose a vertical</option>
                            {VERTICALS.map((vertical) => (
                                <option key={vertical.key} value={vertical.key}>{vertical.label}</option>
                            ))}
                            <option value={SEARCH_ALL_VALUE}>Search all data</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/viewer/searchAll')}
                        className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-sm border border-primary/30 bg-primary text-primary-foreground font-sans-tech text-sm font-medium hover:bg-primary-glow transition-colors"
                    >
                        Search all data
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                {VERTICALS.map((vertical) => (
                    <button
                        key={vertical.key}
                        type="button"
                        onClick={() => navigate(`/viewer/${vertical.key}`)}
                        className="group text-left border border-border bg-card/20 hover:bg-card/35 hover:border-primary/40 transition-all duration-300 p-6 rounded-sm shadow-lg shadow-black/10"
                    >
                        <div className="w-full h-52 rounded-sm overflow-hidden border border-border bg-background/60 mb-6">
                            <img
                                src={blobProxyUrl(`${vertical.key}/${vertical.key}.png`)}
                                alt={vertical.label}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                                    if (fallback) fallback.style.display = 'flex';
                                }}
                            />
                            <div className="hidden w-full h-full items-center justify-center">
                                <Database className="w-10 h-10 text-primary/60" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 mb-3">
                            <h2 className="text-2xl font-sans-tech font-bold text-foreground group-hover:text-primary transition-colors">
                                {vertical.label}
                            </h2>
                            <ArrowRight className="w-5 h-5 text-primary transition-transform group-hover:translate-x-1" />
                        </div>
                        <p className="text-sm text-muted-foreground font-sans-tech leading-relaxed">
                            {vertical.description}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderGlobalSearchPage = () => (
        <div className="px-8 py-16 max-w-5xl mx-auto w-full">
            <div className="border border-border bg-gradient-to-b from-primary/8 to-card/20 p-8 md:p-12 rounded-sm shadow-xl shadow-black/10">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 mb-6">
                    <Search className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-4xl font-sans-tech font-bold text-foreground mb-4 tracking-tight">
                    Search all data
                </h1>
                <p className="text-muted-foreground max-w-3xl font-sans-tech text-sm leading-relaxed">
                    Search across every available folder path in RoboDataHub. Use this when you already know part of a folder name or want to navigate directly without choosing a vertical first.
                </p>
                <VerticalSearchPanel
                    title="Global path search"
                    description="Results here are not limited to one vertical. You can search the full dataset structure and jump directly into the exact path you need."
                    value={pathSearchText}
                    loading={pathSearchLoading}
                    suggestions={pathSuggestions}
                    placeholder="Search any folder or path, e.g. BMW or carAutomation/bmw/frontgrille"
                    onFocus={() => setPathSearchTouched(true)}
                    onChange={(value) => {
                        setPathSearchTouched(true);
                        setPathSearchText(value);
                    }}
                    onSuggestionClick={handlePathSuggestionClick}
                    renderHighlightedPath={renderHighlightedPath}
                />
            </div>
        </div>
    );

    const renderVerticalLanding = (vertical: VerticalConfig) => (
        <div className="px-8 py-14 max-w-6xl mx-auto w-full">
            <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1fr] gap-8 xl:gap-12 items-center border border-border bg-gradient-to-br from-card/30 via-background/70 to-primary/5 p-8 md:p-10 rounded-sm shadow-2xl shadow-black/10">
                <div>
                    <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 px-3 py-1 rounded-sm text-xs font-sans-tech uppercase tracking-[0.24em] text-primary mb-5">
                        Vertical
                    </div>
                    <h1 className="text-4xl md:text-5xl font-sans-tech font-bold text-foreground tracking-tight mb-5">
                        {vertical.label}
                    </h1>
                    <p className="text-base md:text-lg text-foreground/90 font-sans-tech leading-relaxed max-w-2xl mb-4">
                        {vertical.description}
                    </p>
                    <p className="text-sm text-muted-foreground font-sans-tech leading-relaxed max-w-2xl">
                        {vertical.helperText}
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={scrollToSubdirectories}
                            className="inline-flex items-center gap-2 px-5 h-11 rounded-sm bg-primary text-primary-foreground font-sans-tech text-sm font-medium hover:bg-primary-glow transition-colors"
                        >
                            Enter vertical
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/viewer/searchAll')}
                            className="inline-flex items-center gap-2 px-5 h-11 rounded-sm border border-primary/30 bg-background/60 text-foreground font-sans-tech text-sm font-medium hover:border-primary/50 hover:bg-card/30 transition-colors"
                        >
                            Search all data
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {buildVerticalImagePaths(vertical.key).map((blobPath, index) => (
                        <VerticalGalleryImage
                            key={blobPath}
                            blobPath={blobPath}
                            alt={`${vertical.label} preview ${index + 1}`}
                        />
                    ))}
                </div>
            </div>

            <VerticalSearchPanel
                title={vertical.searchTitle}
                description={vertical.searchDescription}
                value={pathSearchText}
                loading={pathSearchLoading}
                suggestions={pathSuggestions}
                placeholder={`Search ${vertical.key} paths, e.g. ${vertical.key}/bmw`}
                onFocus={() => setPathSearchTouched(true)}
                onChange={(value) => {
                    setPathSearchTouched(true);
                    setPathSearchText(value);
                }}
                onSuggestionClick={handlePathSuggestionClick}
                renderHighlightedPath={renderHighlightedPath}
            />
        </div>
    );

    return (
        <div className="flex flex-col h-screen text-foreground bg-background font-sans-tech overflow-hidden relative">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] pointer-events-none"></div>
            <Navigation />
            <div className="flex flex-col flex-1 overflow-hidden pt-16 relative z-10">
                <div className="h-12 bg-background/80 backdrop-blur-md border-b border-border flex items-center px-4 justify-between z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Link to="/viewer" className="font-sans-tech font-bold text-primary hidden md:block hover:text-primary-glow transition-colors">
                                ROBODATAHUB
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
                            vlmPromptGroups={vlmPromptGroups}
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

                            {isRootLanding && renderRootLanding()}

                            {isGlobalSearchPage && renderGlobalSearchPage()}

                            {isVerticalLanding && activeVertical && (
                                <div className="flex flex-col min-h-full">
                                    {renderVerticalLanding(activeVertical)}
                                    <div className="px-8 pb-12" id="vertical-subdirectories">
                                        <div className="flex items-center gap-2 mb-6 max-w-6xl mx-auto">
                                            <div className="w-1 h-4 bg-primary"></div>
                                            <h2 className="text-lg font-sans-tech font-bold text-muted-foreground uppercase tracking-widest">
                                                {activeVertical.label} Subdirectories
                                            </h2>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                                            {filteredFolders.map((folder) => (
                                                <div
                                                    key={folder.full_path}
                                                    onClick={() => handleFolderClick(folder)}
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
                                                        <div className="w-full h-44 bg-background/50 rounded-sm border border-border group-hover:border-primary/30 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.1)] transition-all overflow-hidden">
                                                            <DatasetFolderCover
                                                                key={folder.full_path}
                                                                fullPath={folder.source_path ?? folder.full_path}
                                                                FallbackIcon={Folder}
                                                                className="flex items-center justify-center w-full h-full"
                                                                imgClassName="w-full h-full object-cover"
                                                                iconClassName="w-16 h-16 text-muted-foreground group-hover:text-primary transition-colors"
                                                            />
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
                            )}

                            {!isRootLanding && !isGlobalSearchPage && !isVerticalLanding && !isLeaf && (
                                <div className="flex flex-col min-h-full">
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
                                                    onClick={() => handleFolderClick(folder)}
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
                                                        <div className="w-full h-44 bg-background/50 rounded-sm border border-border group-hover:border-primary/30 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.1)] transition-all overflow-hidden">
                                                            <DatasetFolderCover
                                                                key={folder.full_path}
                                                                fullPath={folder.source_path ?? folder.full_path}
                                                                FallbackIcon={Folder}
                                                                className="flex items-center justify-center w-full h-full"
                                                                imgClassName="w-full h-full object-cover"
                                                                iconClassName="w-16 h-16 text-muted-foreground group-hover:text-primary transition-colors"
                                                            />
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
                            )}

                            {isLeaf && (
                                <ImageGrid images={filteredImages} onImageClick={setSelectedImage} visibleTags={visibleTags} visiblePrimitives={visiblePrimitives} />
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
                <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onSuccess={() => { }} />
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
