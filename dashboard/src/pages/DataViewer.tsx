import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Sidebar } from '../components/Sidebar';
import { UploadModal } from '../components/UploadModal';
import { Loader2, RefreshCw } from 'lucide-react';
import { ImageGrid } from '../components/ImageGrid';
import { DatasetSelector } from '../components/DatasetSelector';
import { ImageModal } from '../components/ImageModal';
import Navigation from '../components/Navigation';

export default function DataViewer() {
    interface DatasetItem {
        name: string;
        uploaded_at: number;
    }

    // State for dataset objects
    const [datasets, setDatasets] = useState<DatasetItem[]>([]);
    const [selectedDataset, setSelectedDataset] = useState<string>('');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [filterText, setFilterText] = useState('');

    // Tag State
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [visibleTags, setVisibleTags] = useState(new Set<string>());

    // Fetch Datasets
    const fetchDatasets = () => {
        axios.get('/api/datasets')
            .then(res => {
                const data: DatasetItem[] = res.data;
                setDatasets(data);

                // If current selected dataset is not valid, select the first one (most recent)
                const currentExists = data.some(d => d.name === selectedDataset);
                if (data.length > 0 && (!selectedDataset || !currentExists)) {
                    setSelectedDataset(data[0].name);
                }
            })
            .catch(err => console.error("Error fetching datasets:", err));
    };

    // Fetch Datasets
    useEffect(() => {
        fetchDatasets();
    }, []);

    // Fetch Images & Extract Tags
    useEffect(() => {
        if (!selectedDataset) return;
        setLoading(true);
        axios.get(`/api/dataset/${selectedDataset}`)
            .then(res => {
                setImages(res.data);

                // Extract all tags
                const tags = new Set<string>();
                res.data.forEach((img: any) => {
                    if (img.tags) img.tags.forEach((t: string) => tags.add(t));
                });
                setAvailableTags(Array.from(tags).sort());
                // Default: no tags visible
                setVisibleTags(new Set());
            })
            .catch(err => console.error("Error fetching images:", err))
            .finally(() => setLoading(false));
    }, [selectedDataset]);

    const toggleTag = (tag: string) => {
        const newVisible = new Set(visibleTags);
        if (newVisible.has(tag)) newVisible.delete(tag);
        else newVisible.add(tag);
        setVisibleTags(newVisible);
    };

    // Filter Logic
    const filteredImages = useMemo(() => {
        let result = images;

        // 1. Filter by Name (Search Box)
        if (filterText) {
            const lower = filterText.toLowerCase();
            result = result.filter((img: any) =>
                img.name.toLowerCase().includes(lower)
            );
        }

        // 2. Filter by Tags (Sidebar Toggles)
        // If visibleTags is not empty, only show images that have at least one of the tags.
        if (visibleTags.size > 0) {
            result = result.filter((img: any) =>
                img.tags && img.tags.some((t: string) => visibleTags.has(t))
            );
        }

        return result;
    }, [images, filterText, visibleTags]);

    return (
        <div className="flex flex-col h-screen text-slate-100 bg-slate-950 font-sans overflow-hidden">
            <Navigation />
            <div className="flex flex-col flex-1 overflow-hidden pt-16">
                {/* Top Navigation Bar (Voxel51 Style) */}
                <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between z-20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-bold text-orange-500">Datara</span>
                            <span className="text-slate-600">/</span>
                            <span className="text-slate-200 font-medium">
                                <DatasetSelector
                                    datasets={datasets}
                                    selected={selectedDataset}
                                    onChange={setSelectedDataset}
                                />
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs font-medium text-slate-400">
                        <span className="text-orange-500 cursor-pointer hover:text-orange-400 border-b-2 border-orange-500 pb-3 mt-3">Samples</span>
                        <span className="hover:text-slate-200 cursor-pointer transition-colors">History</span>
                        <span className="hover:text-slate-200 cursor-pointer transition-colors">Runs</span>
                        <span className="hover:text-slate-200 cursor-pointer transition-colors">Manage</span>
                    </div>

                    <div className="w-20"></div> {/* Spacer */}
                </div>


                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <Sidebar
                        availableTags={availableTags}
                        visibleTags={visibleTags}
                        onToggleTag={toggleTag}
                        filters={{}}
                        onFilterChange={(key, val) => setFilterText(val)}
                        onUploadClick={() => setIsUploadModalOpen(true)}
                    />

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col min-w-0 bg-slate-950">

                        {/* Toolbar / Action Bar */}
                        <div className="h-10 border-b border-slate-800 bg-slate-900/30 flex items-center px-4 justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center bg-slate-800 rounded px-2 py-1 text-xs">
                                    <span className="text-slate-400 mr-2">Samples</span>
                                    <span className="bg-slate-700 text-slate-200 px-1.5 rounded">{filteredImages.length}</span>
                                </div>
                                <div className="h-4 w-px bg-slate-800"></div>
                                <button
                                    onClick={() => setLoading(true)}
                                    className="text-slate-400 hover:text-white transition-colors flex items-center text-xs gap-1"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                    <span>Refresh</span>
                                </button>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 overflow-hidden relative p-0">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-20">
                                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                </div>
                            ) : (
                                <ImageGrid
                                    images={filteredImages}
                                    onImageClick={setSelectedImage}
                                    visibleTags={visibleTags}
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
                    onSuccess={fetchDatasets}
                />
            </div>
        </div>
    )
}
