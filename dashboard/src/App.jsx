import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Sidebar } from './components/Sidebar';
import { ImageGrid } from './components/ImageGrid';
import { DatasetSelector } from './components/DatasetSelector';
import { ImageModal } from './components/ImageModal';
import { LayoutGrid } from 'lucide-react';

function App() {
  const [datasets, setDatasets] = useState([]);
  const [currentDataset, setCurrentDataset] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filterText, setFilterText] = useState('');

  // Tag State
  const [availableTags, setAvailableTags] = useState([]);
  const [visibleTags, setVisibleTags] = useState(new Set());

  // Initial Fetch
  useEffect(() => {
    axios.get('/api/datasets')
      .then(res => {
        setDatasets(res.data);
        if (res.data.length > 0) {
          setCurrentDataset(res.data[0]);
        }
      })
      .catch(err => console.error("Failed to fetch datasets", err));
  }, []);

  // Fetch Images when Dataset Changes
  useEffect(() => {
    if (!currentDataset) return;

    setLoading(true);
    axios.get(`/api/dataset/${currentDataset}`)
      .then(res => {
        setImages(res.data);
        setLoading(false);

        // Extract all unique tags
        const allTags = new Set();
        res.data.forEach(img => {
          if (Array.isArray(img.tags)) {
            img.tags.forEach(tag => allTags.add(tag));
          }
        });
        const tagList = Array.from(allTags).sort();
        setAvailableTags(tagList);
        // Default: tags hidden, user selects them manually
        setVisibleTags(new Set());
      })
      .catch(err => {
        console.error("Failed to fetch images", err);
        setLoading(false);
      });
  }, [currentDataset]);

  const toggleTag = (tag) => {
    setVisibleTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  // Filtering Logic
  const filteredImages = useMemo(() => {
    if (!filterText) return images;
    const lower = filterText.toLowerCase();
    return images.filter(img =>
      img.name.toLowerCase().includes(lower) ||
      JSON.stringify(img.tags).toLowerCase().includes(lower)
    );
  }, [images, filterText]);


  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white font-sans overflow-hidden">

      {/* Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-orange-500 font-bold text-lg tracking-tight">
            <LayoutGrid className="w-6 h-6 mr-2" />
            Datara Vision
          </div>
          <div className="h-6 w-px bg-slate-700 mx-4" />
          <DatasetSelector
            datasets={datasets}
            currentDataset={currentDataset}
            onSelect={setCurrentDataset}
          />
        </div>

        <div className="flex items-center space-x-4 text-sm text-slate-500">
          <span>{filteredImages.length} samples</span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <Sidebar
          availableTags={availableTags}
          visibleTags={visibleTags}
          onToggleTag={toggleTag}
          filters={{}}
          onFilterChange={(key, val) => setFilterText(val)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative bg-black/20">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-orange-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <ImageGrid
              images={filteredImages}
              visibleTags={visibleTags}
              onImageClick={setSelectedImage}
            />
          )}
        </div>

      </div>

      {/* Modal */}
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

    </div>
  );
}

export default App;
