import { useState, useEffect, useRef } from 'react';
import { Maximize2, Box } from 'lucide-react';

interface ImageGridProps {
    images: any[];
    onImageClick: (image: any) => void;
    visibleTags: Set<string>;
    visiblePrimitives: Set<string>;
}

export function ImageGrid({ images, onImageClick, visibleTags, visiblePrimitives }: ImageGridProps) {
    const [displayedImages, setDisplayedImages] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const itemsPerPage = 50;
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Reset when images prop changes (filter changes)
        setDisplayedImages(images.slice(0, itemsPerPage));
        setPage(1);
    }, [images]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    setPage(prev => prev + 1);
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, []);

    useEffect(() => {
        if (page > 1) {
            setDisplayedImages(prev => [
                ...prev,
                ...images.slice((page - 1) * itemsPerPage, page * itemsPerPage)
            ]);
        }
    }, [page, images]);

    return (
        <div className="p-4 flex-1 h-full overflow-y-auto bg-slate-950">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedImages.map((img) => (
                    <div
                        key={img.id}
                        className="relative group bg-slate-900 rounded-lg overflow-hidden border border-slate-800 hover:border-orange-500 transition-colors cursor-pointer"
                        onClick={() => onImageClick(img)}
                    >
                        {img.type === '3d' ? (
                            <div className="w-full h-48 md:h-64 flex flex-col items-center justify-center bg-slate-800/50 text-slate-500 group-hover:text-orange-400 transition-colors">
                                <Box className="w-12 h-12 mb-2" />
                                <span className="text-xs font-mono uppercase tracking-wider">3D Model</span>
                            </div>
                        ) : (
                            <img
                                src={img.url}
                                alt={img.name}
                                loading="lazy"
                                className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                        )}

                        {/* Primitives Overlay */}
                        <div className="absolute top-0 left-0 p-2 space-y-1 pointer-events-none z-10 max-w-full">
                            {visiblePrimitives instanceof Set && Array.from(visiblePrimitives).map(prim => {
                                let val = '';
                                if (prim === 'id') val = img.metadata?.uuid;
                                else if (prim === 'frame_id') val = img.metadata?.frame_id;
                                else if (prim === 'filepath') val = img.id;
                                else if (prim === 'width') val = img.metadata?.width;
                                else if (prim === 'height') val = img.metadata?.height;

                                if (val === undefined || val === null) return null;

                                return (
                                    <div key={prim} className="flex items-baseline gap-1.5 px-1.5 py-0.5 bg-black/30 backdrop-blur-md rounded text-[10px] text-slate-200 font-mono shadow-sm w-fit max-w-full">
                                        <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider shrink-0">{prim}:</span>
                                        <span className="break-all whitespace-normal leading-tight">{String(val)}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/40 transition-colors flex items-center justify-center pointer-events-none">
                            <Maximize2 className="text-white w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        {/* Tags Overlay */}
                        <div className="absolute bottom-6 left-0 right-0 p-2 flex flex-wrap gap-1">
                            {img.tags && img.tags.map((tag: string) => (
                                visibleTags instanceof Set && visibleTags.has(tag) && (
                                    <span
                                        key={tag}
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/80 text-white font-medium shadow-sm backdrop-blur-sm"
                                    >
                                        {tag}
                                    </span>
                                )
                            ))}
                        </div>

                        {/* Label Badge */}
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                            <p className="text-xs text-white truncate font-mono">{img.name}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Intersection Observer Target for Infinite Scroll */}
            <div ref={observerTarget} className="h-10 w-full mt-4" />

            {displayedImages.length === 0 && (
                <div className="flex items-center justify-center h-full text-slate-500">
                    No images to display
                </div>
            )}
        </div>
    );
}
