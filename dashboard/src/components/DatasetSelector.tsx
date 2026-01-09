import { useState, useRef, useEffect } from 'react';
import { Database, ChevronDown } from 'lucide-react';

interface DatasetSelectorProps {
    datasets: string[];
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

    const handleSelect = (ds: string) => {
        onChange(ds);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${isOpen ? 'bg-slate-800' : 'hover:bg-slate-800'}`}
            >
                <Database className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-slate-200">{selected || "Select Dataset"}</span>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900 border border-slate-700 rounded-md shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 bg-slate-900/50">
                        Available Datasets
                    </div>
                    {datasets.map(ds => (
                        <button
                            key={ds}
                            onClick={() => handleSelect(ds)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-800 transition-colors ${ds === selected ? 'text-orange-400 bg-slate-800/30' : 'text-slate-300'}`}
                        >
                            {ds}
                        </button>
                    ))}
                    {datasets.length === 0 && (
                        <div className="px-4 py-2 text-sm text-slate-500 italic">No datasets found</div>
                    )}
                </div>
            )}
        </div>
    );
}
