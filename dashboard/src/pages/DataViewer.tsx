import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { UploadModal } from '../components/UploadModal';
import { Loader2, RefreshCw, Folder } from 'lucide-react';
import { ImageGrid } from '../components/ImageGrid';
import { ImageModal } from '../components/ImageModal';
import Navigation from '../components/Navigation';
import { Breadcrumbs } from '../components/Breadcrumbs';

export default function DataViewer() {
    const location = useLocation();
    const navigate = useNavigate();

    // -- State --
    // Folders view (Levels 0, 1, 2)
    const [folders, setFolders] = useState<any[]>([]);

    // Images view (Level 3 - Leaf)
    const [images, setImages] = useState([]);

    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [filterText, setFilterText] = useState('');

    // Tag State
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [visibleTags, setVisibleTags] = useState(new Set<string>());

    // Primitive State
    const [visiblePrimitives, setVisiblePrimitives] = useState<Set<string>>(new Set());

    // -- Derived State --
    // Parse path: /viewer/automotive/bmw -> ['automotive', 'bmw']
    const pathSegments = useMemo(() => {
        return location.pathname.split('/').filter(p => p && p !== 'viewer');
    }, [location.pathname]);

    // Determine current level
    // 0: Root (Categories)
    // 1: Category (Brands)
    // 2: Brand (Components/Datasets) -> Showing list of datasets
    // 3: Dataset (Images) -> Showing Image Grid
    const depth = pathSegments.length;
    const isLeaf = depth >= 3;

    // Construct the backend path query
    // e.g. ['automotive', 'bmw'] -> "automotive/bmw/"
    const currentBackendPath = pathSegments.length > 0 ? pathSegments.join('/') : '';

    // -- Effects --

    useEffect(() => {
        setLoading(true);
        setFilterText(''); // Reset filter on nav

        if (isLeaf) {
            // Fetch IMAGES (Dataset View)
            // Use currentBackendPath as the dataset name
            axios.get(`/api/dataset/${currentBackendPath}`)
                .then(res => {
                    setImages(res.data);

                    // Extract all tags
                    const tags = new Set<string>();
                    res.data.forEach((img: any) => {
                        if (img.tags) img.tags.forEach((t: string) => tags.add(t));
                    });
                    setAvailableTags(Array.from(tags).sort());
                    setVisibleTags(new Set());
                })
                .catch(err => console.error("Error fetching images:", err))
                .finally(() => setLoading(false));

        } else {
            // Fetch FOLDERS (Directory View)
            axios.get(`/api/datasets`, { params: { path: currentBackendPath } })
                .then(res => {
                    setFolders(res.data);
                })
                .catch(err => console.error("Error fetching folders:", err))
                .finally(() => setLoading(false));

            // Clear images state
            setImages([]);
        }
    }, [location.pathname, isLeaf, currentBackendPath]);


    // -- Handlers --

    const toggleTag = (tag: string) => {
        const newVisible = new Set(visibleTags);
        if (newVisible.has(tag)) newVisible.delete(tag);
        else newVisible.add(tag);
        setVisibleTags(newVisible);
    };

    const togglePrimitive = (prim: string) => {
        const newVisible = new Set(visiblePrimitives);
        if (newVisible.has(prim)) newVisible.delete(prim);
        else newVisible.add(prim);
        setVisiblePrimitives(newVisible);
    };

    const handleFolderClick = (folderName: string) => {
        // Navigate deeper
        // current: /viewer/automotive
        // click: bmw
        // next: /viewer/automotive/bmw
        const nextPath = location.pathname.endsWith('/')
            ? `${location.pathname}${folderName}`
            : `${location.pathname}/${folderName}`;
        navigate(nextPath);
    };

    // Filter Logic (for Images)
    // For folders, we can also basic filter
    const filteredContent = useMemo(() => {
        if (isLeaf) {
            // Filter Images
            let result = images;
            if (filterText) {
                const lower = filterText.toLowerCase();
                result = result.filter((img: any) => img.name.toLowerCase().includes(lower));
            }
            if (visibleTags.size > 0) {
                result = result.filter((img: any) =>
                    img.tags && img.tags.some((t: string) => visibleTags.has(t))
                );
            }
            return result;
        } else {
            // Filter Folders
            if (filterText) {
                const lower = filterText.toLowerCase();
                return folders.filter(f => f.name.toLowerCase().includes(lower));
            }
            return folders;
        }
    }, [isLeaf, images, folders, filterText, visibleTags]);


    return (
        <div className="flex flex-col h-screen text-slate-100 bg-slate-950 font-sans overflow-hidden">
            <Navigation />
            <div className="flex flex-col flex-1 overflow-hidden pt-16">

                {/* Header Bar */}
                <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Link to="/viewer" className="font-bold text-orange-500 hidden md:block hover:text-orange-400 transition-colors">Datara Explorer</Link>
                            <Breadcrumbs />
                        </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs font-medium text-slate-400">
                        {/* Right side controls can go here */}
                    </div>
                </div>


                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar - Only show when viewing images (Leaf) */}
                    {isLeaf && (
                        <Sidebar
                            availableTags={availableTags}
                            visibleTags={visibleTags}
                            onToggleTag={toggleTag}
                            visiblePrimitives={visiblePrimitives}
                            onTogglePrimitive={togglePrimitive}
                            filters={{}}
                            onFilterChange={(_key, val) => setFilterText(val)}
                            onUploadClick={() => setIsUploadModalOpen(true)}
                        />
                    )}

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col min-w-0 bg-slate-950">

                        {/* Toolbar - Only show when viewing images or if we want search on folders too */}
                        <div className="h-10 border-b border-slate-800 bg-slate-900/30 flex items-center px-4 justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center bg-slate-800 rounded px-2 py-1 text-xs">
                                    <span className="text-slate-400 mr-2">Items</span>
                                    <span className="bg-slate-700 text-slate-200 px-1.5 rounded">{filteredContent.length}</span>
                                </div>
                                <div className="h-4 w-px bg-slate-800"></div>
                                <button
                                    onClick={() => window.location.reload()} // Simple refresh
                                    className="text-slate-400 hover:text-white transition-colors flex items-center text-xs gap-1"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                    <span>Refresh</span>
                                </button>
                            </div>

                            {/* Add Upload Button here for root view/folder view since sidebar is gone? 
                                User asked for sidebar to be gone. 
                                I should probably expose the upload button somewhere else if sidebar is gone.
                                Or just rely on sidebar being there only for images?
                                But they might want to upload from root.
                                Let's add an Upload button to the toolbar if !isLeaf.
                            */}
                            {!isLeaf && (
                                <button
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                                >
                                    Import Data
                                </button>
                            )}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto relative p-0 custom-scrollbar bg-slate-950">
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-20">
                                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                </div>
                            )}

                            {!isLeaf ? (
                                <div className="flex flex-col min-h-full">
                                    {/* Welcome / Root Header */}
                                    {pathSegments.length === 0 && (
                                        <div className="px-8 py-12 flex flex-col items-center justify-center text-center border-b border-slate-900 bg-gradient-to-b from-slate-900/20 to-transparent">
                                            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Datara Explorer</h1>
                                            <p className="text-slate-400 max-w-md mx-auto">
                                                Navigate through your hierarchical datasets. Select a category below to begin or import new data.
                                            </p>
                                        </div>
                                    )}

                                    {/* Folder Grid */}
                                    <div className="p-8">
                                        {pathSegments.length > 0 && <h2 className="text-lg font-medium text-slate-300 mb-6 px-1 max-w-5xl mx-auto">Subdirectories</h2>}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                                            {filteredContent.map((folder: any) => (
                                                <div
                                                    key={folder.name}
                                                    onClick={() => handleFolderClick(folder.name)}
                                                    className="group cursor-pointer flex flex-col items-center gap-6 p-10 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-900/80 transition-all hover:shadow-2xl hover:shadow-orange-500/10"
                                                >
                                                    <div className="p-5 bg-slate-800/50 rounded-full group-hover:bg-orange-500/10 transition-colors">
                                                        <Folder className="w-16 h-16 text-slate-500 group-hover:text-orange-500 fill-current transition-colors" />
                                                    </div>
                                                    <span className="text-xl font-medium text-slate-300 group-hover:text-white text-center break-words w-full">
                                                        {folder.name}
                                                    </span>
                                                </div>
                                            ))}

                                            {filteredContent.length === 0 && !loading && (
                                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                                                    <Folder className="w-16 h-16 mb-4 opacity-20" />
                                                    <p className="text-lg">No folders found in this directory</p>
                                                    <button
                                                        onClick={() => setIsUploadModalOpen(true)}
                                                        className="mt-6 text-orange-500 hover:text-orange-400 font-medium text-lg"
                                                    >
                                                        Upload Data Here
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Image Grid */
                                <ImageGrid
                                    images={filteredContent}
                                    onImageClick={setSelectedImage}
                                    visibleTags={visibleTags}
                                    visiblePrimitives={visiblePrimitives}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Modals */}
                {selectedImage && (
                    <ImageModal
                        image={selectedImage}
                        onClose={() => setSelectedImage(null)}
                        onNext={() => {
                            const idx = filteredContent.indexOf(selectedImage);
                            if (idx < filteredContent.length - 1) setSelectedImage(filteredContent[idx + 1]);
                        }}
                        onPrev={() => {
                            const idx = filteredContent.indexOf(selectedImage);
                            if (idx > 0) setSelectedImage(filteredContent[idx - 1]);
                        }}
                    />
                )}

                <UploadModal
                    isOpen={isUploadModalOpen}
                    onClose={() => setIsUploadModalOpen(false)}
                    onSuccess={() => {/* refresh */ }}
                />
            </div>
        </div>
    )
}
