import { ChevronDown, Database } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface DatasetItem {
    name: string;
    uploaded_at: number;
}

interface DatasetSelectorProps {
    datasets: DatasetItem[];
    selected: string;
    onChange: (dataset: string) => void;
}

export function DatasetSelector({ datasets, selected, onChange }: DatasetSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (dsName: string) => {
        onChange(dsName);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center space-x-2 rounded-md px-3 py-2 transition-colors ${isOpen ? 'bg-accent' : 'hover:bg-accent'}`}
            >
                <Database className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">{selected || "Select Dataset"}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 max-h-96 w-72 overflow-y-auto rounded-md border border-border bg-card py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex justify-between border-b border-border bg-background/50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Dataset</span>
                        <span>Uploaded</span>
                    </div>
                    {datasets.map(ds => (
                        <button
                            key={ds.name}
                            onClick={() => handleSelect(ds.name)}
                            className={`w-full border-b border-border/70 px-4 py-3 text-left transition-colors hover:bg-accent last:border-0 ${ds.name === selected ? 'bg-primary/10' : ''}`}
                        >
                            <div className="flex justify-between items-center">
                                <span className={`text-sm font-medium ${ds.name === selected ? 'text-primary' : 'text-foreground'}`}>
                                    {ds.name}
                                </span>
                                <span className="flex items-center text-[10px] text-muted-foreground">
                                    {ds.uploaded_at ? new Date(ds.uploaded_at * 1000).toLocaleDateString() : '-'}
                                </span>
                            </div>
                        </button>
                    ))}
                    {datasets.length === 0 && (
                        <div className="px-4 py-2 text-sm italic text-muted-foreground">No datasets found</div>
                    )}
                </div>
            )}
        </div>
    );
}
