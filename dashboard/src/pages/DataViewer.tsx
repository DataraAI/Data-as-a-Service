import { useEffect, useMemo, useState, type ReactNode } from 'react';
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

type CategoryKey = 'carAutomation' | 'serverrack' | 'dexterity' | 'warehouse';
type StorageKey = 'carAutomation' | 'serverrack' | 'humanoid' | 'warehouse';

interface CategoryConfig {
    routeKey: CategoryKey;
    storageKey: StorageKey;
    label: string;
    description: string;
    helperText: string;
    searchTitle: string;
    searchDescription: string;
}

interface ShowcaseImageConfig {
    previewBlobPath: string;
    targetFolderPath: string;
    targetImageName: string;
    alt: string;
}

interface PathAlias {
    displayPrefix: string;
    backendPrefix: string;
}

const CATEGORIES: CategoryConfig[] = [
    {
        routeKey: 'carAutomation',
        storageKey: 'carAutomation',
        label: 'Car Automation',
        description: 'Assembly, inspection, and vehicle-production data for robotics workflows across automotive environments.',
        helperText: 'Browse this category to explore automotive data collections, or search directly below to jump to a specific folder path.',
        searchTitle: 'Search within Car Automation',
        searchDescription: 'Find folders, scenes, or specific path matches inside the Car Automation category.',
    },
    {
        routeKey: 'serverrack',
        storageKey: 'serverrack',
        label: 'Serverrack',
        description: 'Data-center interaction, port-level operation, and maintenance-focused datasets for rack and cabling tasks.',
        helperText: 'Start here for server-rack workflows, then browse further or search to move directly into a relevant dataset branch.',
        searchTitle: 'Search within Serverrack',
        searchDescription: 'Search inside the Serverrack category for folders related to rack operations, cabling, and maintenance.',
    },
    {
        routeKey: 'dexterity',
        storageKey: 'humanoid',
        label: 'Dexterity',
        description: 'Fine-motor manipulation and embodied task data for dexterous robotic systems operating across practical, object-centric scenarios.',
        helperText: 'Use this category for dexterity-focused tasks and embodied interaction data, including peeling, washing, and practical manipulation workflows.',
        searchTitle: 'Search within Dexterity',
        searchDescription: 'Search only across dexterity-related folders to narrow down the most relevant dataset path quickly.',
    },
    {
        routeKey: 'warehouse',
        storageKey: 'warehouse',
        label: 'Warehouse',
        description: 'Logistics, handling, and storage-operation data for robotic movement, picking, and material flow.',
        helperText: 'Explore warehouse-oriented robotics data collections, or search within this category to find a path faster.',
        searchTitle: 'Search within Warehouse',
        searchDescription: 'Search only within warehouse data paths to keep results focused and easier to navigate.',
    },
];

const DISPLAY_PATH_ALIASES: PathAlias[] = [
    { displayPrefix: 'dexterity/peeling', backendPrefix: 'peeling' },
    { displayPrefix: 'dexterity/washingMachine', backendPrefix: 'washingMachine' },
    { displayPrefix: 'dexterity/washingMachine', backendPrefix: 'washingmachine' },
    { displayPrefix: 'dexterity', backendPrefix: 'humanoid' },
];

const LEGACY_SEARCH_PAGE_SEGMENT = 'searchAll';

const CATEGORY_SHOWCASES: Record<CategoryKey, ShowcaseImageConfig[]> = {
    carAutomation: [
        {
            previewBlobPath: 'carAutomation/carAutomation4.png',
            targetFolderPath: 'carAutomation/BMW/frontGrille',
            targetImageName: 'frontGrille_016_Rotate_right_90_degrees.png',
            alt: 'BMW front grille rotation example',
        },
        {
            previewBlobPath: 'carAutomation/carAutomation5.png',
            targetFolderPath: 'carAutomation/BMW/frontGrille',
            targetImageName: 'frontGrille_000_Rotate_right_45_degrees.png',
            alt: 'BMW front grille angled example',
        },
        {
            previewBlobPath: 'carAutomation/carAutomation6.png',
            targetFolderPath: 'carAutomation/Porsche/frontSeat',
            targetImageName: 'frontSeat_037_Rotate_left_45_degrees.png',
            alt: 'Porsche front seat example',
        },
        {
            previewBlobPath: 'carAutomation/carAutomation7.png',
            targetFolderPath: 'carAutomation/bmw/rearBumper',
            targetImageName: 'rearBumper_000_Rotate_left_90_degrees.png',
            alt: 'BMW rear bumper example',
        },
    ],
    serverrack: [
        {
            previewBlobPath: 'serverrack/serverrack4.png',
            targetFolderPath: 'serverrack/Dell/dataRackInstall',
            targetImageName: 'dataRackInstall_0000.png',
            alt: 'Serverrack installation example',
        },
        {
            previewBlobPath: 'serverrack/serverrack5.png',
            targetFolderPath: 'serverrack/Gigabyte/datacenterRack2',
            targetImageName: 'datacenterRack2_84.png',
            alt: 'Datacenter rack example',
        },
        {
            previewBlobPath: 'serverrack/serverrack6.png',
            targetFolderPath: 'serverrack/AnalogDevices/ethernetCable',
            targetImageName: 'ethernetCable_000.png',
            alt: 'Ethernet cable example',
        },
        {
            previewBlobPath: 'serverrack/serverrack7.png',
            targetFolderPath: 'serverrack/NVIDIA/switchTray',
            targetImageName: 'switchTray_000.png',
            alt: 'Switch tray example',
        },
    ],
    dexterity: [
        {
            previewBlobPath: 'humanoid/humanoid4.png',
            targetFolderPath: 'humanoid/peeling/none',
            targetImageName: 'peas_0123.png',
            alt: 'Dexterity peeling example one',
        },
        {
            previewBlobPath: 'humanoid/humanoid5.png',
            targetFolderPath: 'humanoid/peeling/none',
            targetImageName: 'peas_0344.png',
            alt: 'Dexterity peeling example two',
        },
        {
            previewBlobPath: 'humanoid/humanoid6.png',
            targetFolderPath: 'humanoid/Awign/washingMachine',
            targetImageName: 'washingMachine_0077.png',
            alt: 'Dexterity washing machine example one',
        },
        {
            previewBlobPath: 'humanoid/humanoid7.png',
            targetFolderPath: 'humanoid/Awign/washingMachine',
            targetImageName: 'washingMachine_0110.png',
            alt: 'Dexterity washing machine example two',
        },
    ],
    warehouse: [
        {
            previewBlobPath: 'warehouse/warehouse4.png',
            targetFolderPath: 'warehouse/Symbotic/AVnavigation',
            targetImageName: 'AVnavigation_000.png',
            alt: 'Warehouse navigation example one',
        },
        {
            previewBlobPath: 'warehouse/warehouse5.png',
            targetFolderPath: 'warehouse/Symbotic/AVnavigation',
            targetImageName: 'AVnavigation_044.png',
            alt: 'Warehouse navigation example two',
        },
        {
            previewBlobPath: 'warehouse/warehouse6.png',
            targetFolderPath: 'warehouse/Symbotic/AVnavigation',
            targetImageName: 'AVnavigation_071.png',
            alt: 'Warehouse navigation example three',
        },
        {
            previewBlobPath: 'warehouse/warehouse7.png',
            targetFolderPath: 'warehouse/Symbotic/AVnavigation',
            targetImageName: 'AVnavigation_095.png',
            alt: 'Warehouse navigation example four',
        },
    ],
};

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
    const aliases = [...DISPLAY_PATH_ALIASES].sort((a, b) => b.backendPrefix.length - a.backendPrefix.length);
    for (const alias of aliases) {
        const mapped = replacePathPrefix(rawPath, alias.backendPrefix, alias.displayPrefix);
        if (mapped) return mapped;
    }
    return rawPath;
}

function resolveDisplayPathToBackendPath(displayPath: string) {
    const aliases = [...DISPLAY_PATH_ALIASES].sort((a, b) => b.displayPrefix.length - a.displayPrefix.length);
    for (const alias of aliases) {
        const mapped = replacePathPrefix(displayPath, alias.displayPrefix, alias.backendPrefix);
        if (mapped) return mapped;
    }
    return displayPath;
}

function normalizeFolderPathResults(payload: unknown): FolderItem[] {
    if (!Array.isArray(payload)) return [];

    const normalized = payload
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
        .filter(Boolean) as FolderItem[];

    return normalized;
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

function getCategoryByRouteKey(value?: string | null) {
    return CATEGORIES.find((category) => category.routeKey === value) ?? null;
}

function buildCategoryHeroImagePaths(category: CategoryConfig) {
    return [0, 1, 2, 3].map((index) => `${category.storageKey}/${category.storageKey}${index === 0 ? '' : index}.png`);
}

function ShowcasePreviewImage({
    blobPath,
    alt,
    onClick,
}: {
    blobPath: string;
    alt: string;
    onClick: () => void;
}) {
    const [failed, setFailed] = useState(false);

    if (failed) {
        return (
            <button
                type="button"
                onClick={onClick}
                className="group relative w-full aspect-[5/4] rounded-sm border border-border bg-background/70 flex items-center justify-center overflow-hidden transition-all duration-300 hover:border-primary hover:shadow-[0_0_0_2px_rgba(249,115,22,0.8)]"
            >
                <Database className="w-9 h-9 text-primary/60" />
                <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-background/95 to-transparent text-left">
                    <span className="text-[11px] font-sans-tech uppercase tracking-[0.18em] text-primary">Open in viewer</span>
                </div>
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative w-full aspect-[5/4] rounded-sm border border-border bg-background/70 overflow-hidden shadow-xl shadow-black/20 transition-all duration-300 hover:border-primary hover:shadow-[0_0_0_2px_rgba(249,115,22,0.85)] focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(249,115,22,0.85)]"
        >
            <img
                src={blobProxyUrl(blobPath)}
                alt={alt}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                onError={() => setFailed(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/75 via-background/10 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-3 py-3">
                <span className="text-[11px] font-sans-tech uppercase tracking-[0.18em] text-primary">Open in viewer</span>
                <ArrowRight className="w-4 h-4 text-primary transition-transform group-hover:translate-x-1" />
            </div>
        </button>
    );
}

function CategoryHeroImage({ blobPath, alt }: { blobPath: string; alt: string }) {
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

function PathSearchPanel({
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
    renderHighlightedPath: (fullPath: string) => ReactNode;
}) {
    return (
        <div className="border border-border bg-card/20 p-6 md:p-8 rounded-sm shadow-xl shadow-black/10">
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
    const [deleteModalFolder, setDeleteModalFolder] = useState<FolderItem | null>(null);
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

    const pathSegments = useMemo(() => location.pathname.split('/').filter(p => p && p !== 'viewer'), [location.pathname]);
    const currentDisplayPath = pathSegments.length > 0 ? pathSegments.join('/') : '';
    const currentBackendPath = useMemo(() => resolveDisplayPathToBackendPath(currentDisplayPath), [currentDisplayPath]);
    const activeCategory = useMemo(() => getCategoryByRouteKey(pathSegments[0]), [pathSegments]);
    const imageQueryParam = useMemo(() => new URLSearchParams(location.search).get('image')?.trim() ?? '', [location.search]);

    const isLegacySearchPage = pathSegments.length === 1 && pathSegments[0] === LEGACY_SEARCH_PAGE_SEGMENT;
    const isRootLanding = pathSegments.length === 0 || isLegacySearchPage;
    const isCategoryLanding = !!activeCategory && pathSegments.length === 1;
    const isLeaf = !isRootLanding && pathSegments.length >= 3;
    const shouldFetchFolders = !isLeaf && !isRootLanding;
    const supportsPathSearch = isRootLanding || isCategoryLanding;

    useEffect(() => {
        if (isLegacySearchPage) {
            navigate('/viewer', { replace: true });
        }
    }, [isLegacySearchPage, navigate]);

    useEffect(() => {
        setPathSearchText('');
        setPathSearchTouched(false);
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
        if (isCategoryLanding && activeCategory) {
            const prefix = `${activeCategory.routeKey}/`;
            return allFolderPaths.filter((item) => item.full_path === activeCategory.routeKey || item.full_path.startsWith(prefix));
        }
        if (isRootLanding) {
            return allFolderPaths;
        }
        return [];
    }, [allFolderPaths, activeCategory, isCategoryLanding, isRootLanding]);

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
                            Object.entries(runs as Record<string, VlmRun>).forEach(([prompt, run]) => {
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

                if (activeCategory?.routeKey === 'dexterity' && pathSegments.length === 1) {
                    const rootResponse = await axios.get<FolderItem[]>(`/api/datasets`, { params: { path: '' } });
                    const dexterityExtras = rootResponse.data
                        .filter((folder) => ['peeling', 'washingmachine', 'washingMachine'].includes(folder.name))
                        .map((folder) => ({
                            name: folder.name,
                            full_path: folder.full_path,
                            source_path: folder.full_path,
                        }));
                    nextFolders = uniqueFolderItems([...nextFolders, ...dexterityExtras]);
                }

                setFolders(uniqueFolderItems(nextFolders.map(mapFolderItemToDisplayPath)));
            } catch (err) {
                console.error('Error fetching folders:', err);
                setFolders([]);
            } finally {
                setImages([]);
                setVlmPromptGroups([]);
                setLoading(false);
            }
        };

        loadFolders();
    }, [location.pathname, isLeaf, shouldFetchFolders, currentBackendPath, activeCategory, pathSegments.length]);

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

    useEffect(() => {
        if (!isLeaf || !imageQueryParam || images.length === 0) return;
        const match = images.find((img) => img.name === imageQueryParam);
        if (match) {
            setSelectedImage(match);
        }
    }, [imageQueryParam, images, isLeaf]);

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
        navigate(`/viewer/${folder.full_path}`);
    };

    const handlePathSuggestionClick = (fullPath: string) => {
        setPathSearchText('');
        navigate(`/viewer/${fullPath}`);
    };

    const handleShowcaseImageClick = (item: ShowcaseImageConfig) => {
        const displayFolderPath = mapRawPathToDisplayPath(item.targetFolderPath);
        const params = new URLSearchParams({ image: item.targetImageName });
        navigate(`/viewer/${displayFolderPath}?${params.toString()}`);
    };

    const handleDeleteFolder = async () => {
        if (!deleteModalFolder) return;
        setDeleteInProgress(true);
        try {
            await axios.post('/api/delete_dataset', {
                path: deleteModalFolder.source_path ?? resolveDisplayPathToBackendPath(deleteModalFolder.full_path),
            });
            setDeleteModalFolder(null);
            setFolderDropdownOpen(null);
            const path = currentBackendPath ? `${currentBackendPath}/` : '';
            const res = await axios.get<FolderItem[]>('/api/datasets', { params: { path } });
            setFolders(uniqueFolderItems(res.data.map(mapFolderItemToDisplayPath)));
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
        if (isRootLanding) return CATEGORIES.length;
        return isLeaf ? filteredImages.length : filteredFolders.length;
    }, [filteredFolders.length, filteredImages.length, isLeaf, isRootLanding]);

    const scrollToSubdirectories = () => {
        const section = document.getElementById('category-subdirectories');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const renderFolderGrid = (items: FolderItem[], maxWidthClass: string) => (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 ${maxWidthClass} mx-auto`}>
            {items.map((folder) => (
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
                                            setDeleteModalFolder(folder);
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
                                fullPath={folder.source_path ?? resolveDisplayPathToBackendPath(folder.full_path)}
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
            {items.length === 0 && !loading && (
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
    );

    const renderRootLanding = () => (
        <div className="px-8 py-14 md:py-18 max-w-7xl mx-auto w-full">
            <div className="border border-border bg-gradient-to-br from-primary/10 via-card/40 to-background/80 p-8 md:p-12 rounded-sm shadow-2xl shadow-black/20">
                <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 px-3 py-1 rounded-sm text-xs font-sans-tech uppercase tracking-[0.24em] text-primary mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        RoboDataHub
                    </div>
                    <h1 className="text-4xl md:text-5xl font-sans-tech font-bold text-foreground tracking-tight mb-5">
                        RoboDataHub
                    </h1>
                    <p className="text-muted-foreground font-sans-tech text-sm md:text-base leading-relaxed max-w-3xl">
                        Search across the full data library for a quick shortcut, or browse featured categories below through presentation-ready examples that open directly in the viewer.
                    </p>
                </div>

                <div className="mt-8">
                    <PathSearchPanel
                        title="Global search"
                        description="Use search to jump straight to a folder path when you already know what you want. It is the fastest way to navigate the full RoboDataHub without clicking through multiple pages."
                        value={pathSearchText}
                        loading={pathSearchLoading}
                        suggestions={pathSuggestions}
                        placeholder="Search any folder or path, e.g. BMW or carAutomation/BMW/frontGrille"
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

            <div className="mt-10 flex flex-col gap-8">
                {CATEGORIES.map((category) => (
                    <section
                        key={category.routeKey}
                        className="border border-border bg-gradient-to-br from-card/25 via-background/80 to-primary/5 rounded-sm p-6 md:p-8 shadow-2xl shadow-black/10"
                    >
                        <div className="grid grid-cols-1 xl:grid-cols-[0.92fr_1.5fr] gap-8 xl:gap-10 items-center">
                            <div>
                                <div className="inline-flex items-center gap-2 border border-primary/20 bg-primary/10 px-3 py-1 rounded-sm text-[11px] font-sans-tech uppercase tracking-[0.22em] text-primary mb-5">
                                    Featured category
                                </div>
                                <h2 className="text-3xl md:text-4xl font-sans-tech font-bold text-foreground tracking-tight mb-4">
                                    {category.label}
                                </h2>
                                <p className="text-sm md:text-base text-foreground/90 font-sans-tech leading-relaxed max-w-xl mb-4">
                                    {category.description}
                                </p>
                                <p className="text-sm text-muted-foreground font-sans-tech leading-relaxed max-w-xl">
                                    {category.helperText}
                                </p>
                                <div className="mt-7">
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/viewer/${category.routeKey}`)}
                                        className="inline-flex items-center gap-2 px-5 h-11 rounded-sm bg-primary text-primary-foreground font-sans-tech text-sm font-medium hover:bg-primary-glow transition-colors"
                                    >
                                        Enter category
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
                                {CATEGORY_SHOWCASES[category.routeKey].map((item) => (
                                    <ShowcasePreviewImage
                                        key={item.previewBlobPath}
                                        blobPath={item.previewBlobPath}
                                        alt={item.alt}
                                        onClick={() => handleShowcaseImageClick(item)}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );

    const renderCategoryLanding = (category: CategoryConfig) => (
        <div className="flex flex-col min-h-full">
            <div className="px-8 py-14 max-w-6xl mx-auto w-full">
                <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1fr] gap-8 xl:gap-12 items-center border border-border bg-gradient-to-br from-card/30 via-background/70 to-primary/5 p-8 md:p-10 rounded-sm shadow-2xl shadow-black/10">
                    <div>
                        <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 px-3 py-1 rounded-sm text-xs font-sans-tech uppercase tracking-[0.24em] text-primary mb-5">
                            Category
                        </div>
                        <h1 className="text-4xl md:text-5xl font-sans-tech font-bold text-foreground tracking-tight mb-5">
                            {category.label}
                        </h1>
                        <p className="text-base md:text-lg text-foreground/90 font-sans-tech leading-relaxed max-w-2xl mb-4">
                            {category.description}
                        </p>
                        <p className="text-sm text-muted-foreground font-sans-tech leading-relaxed max-w-2xl">
                            {category.helperText}
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={scrollToSubdirectories}
                                className="inline-flex items-center gap-2 px-5 h-11 rounded-sm bg-primary text-primary-foreground font-sans-tech text-sm font-medium hover:bg-primary-glow transition-colors"
                            >
                                Enter category
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {buildCategoryHeroImagePaths(category).map((blobPath, index) => (
                            <CategoryHeroImage
                                key={blobPath}
                                blobPath={blobPath}
                                alt={`${category.label} preview ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-10">
                    <PathSearchPanel
                        title={category.searchTitle}
                        description={category.searchDescription}
                        value={pathSearchText}
                        loading={pathSearchLoading}
                        suggestions={pathSuggestions}
                        placeholder={`Search ${category.routeKey} paths, e.g. ${category.routeKey}/bmw`}
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

            <div className="px-8 pb-12" id="category-subdirectories">
                <div className="flex items-center gap-2 mb-6 max-w-6xl mx-auto">
                    <div className="w-1 h-4 bg-primary"></div>
                    <h2 className="text-lg font-sans-tech font-bold text-muted-foreground uppercase tracking-widest">
                        {category.label} Subdirectories
                    </h2>
                </div>
                {renderFolderGrid(filteredFolders, 'max-w-6xl')}
            </div>
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

                            {isCategoryLanding && activeCategory && renderCategoryLanding(activeCategory)}

                            {!isRootLanding && !isCategoryLanding && !isLeaf && (
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
                                        {renderFolderGrid(filteredFolders, 'max-w-5xl')}
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
