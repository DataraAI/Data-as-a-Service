import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Sidebar } from '../components/Sidebar';
import { UploadModal } from '../components/UploadModal';
import { Loader2, RefreshCw } from 'lucide-react';
import { ImageGrid } from '../components/ImageGrid';
import { DatasetSelector } from '../components/DatasetSelector';
import { ImageModal } from '../components/ImageModal';
import Navigation from '../components/Navigation';

interface AppProps { }

export default function DataViewer() {
    const [datasets, setDatasets] = useState<string[]>([]);
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
                setDatasets(res.data);
                // If current selected dataset is not in the new list (or empty), select first
                if (res.data.length > 0 && (!selectedDataset || !res.data.includes(selectedDataset))) {
                    setSelectedDataset(res.data[0]);
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
        if (filterText) {
            const lower = filterText.toLowerCase();
            result = result.filter((img: any) =>
                img.name.toLowerCase().includes(lower)
            );
        }
        return result;
    }, [images, filterText]);

    return (
        <div className="flex flex-col h-screen text-slate-100 bg-slate-950 font-sans">
            <Navigation />
            <div className="flex flex-1 overflow-hidden pt-16">
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
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 backdrop-blur-sm z-10">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                                Dataset Explorer
                            </h1>
                            <div className="h-6 w-px bg-slate-700 mx-2" />
                            <DatasetSelector
                                datasets={datasets}
                                selected={selectedDataset}
                                onChange={setSelectedDataset}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-400">
                                {filteredImages.length} images
                            </span>
                            <button
                                onClick={() => setLoading(true)} // Fake refresh trigger
                                className="p-2 text-slate-400 hover:text-white transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </header>

                    {/* Grid */}
                    <div className="flex-1 overflow-hidden relative">
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
    )
}
