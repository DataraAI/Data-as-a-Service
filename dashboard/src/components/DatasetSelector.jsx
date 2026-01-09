import React from 'react';
import { Database, ChevronDown } from 'lucide-react';

export function DatasetSelector({ datasets, currentDataset, onSelect }) {
    return (
        <div className="relative group">
            <button className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors">
                <Database className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-slate-200">{currentDataset || "Select Dataset"}</span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>

            {/* Dropdown Menu */}
            <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900 border border-slate-700 rounded-md shadow-xl py-1 z-50 hidden group-hover:block">
                <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 bg-slate-900/50">
                    Available Datasets
                </div>
                {datasets.map(ds => (
                    <button
                        key={ds}
                        onClick={() => onSelect(ds)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-800 transition-colors ${ds === currentDataset ? 'text-orange-400 bg-slate-800/30' : 'text-slate-300'}`}
                    >
                        {ds}
                    </button>
                ))}
                {datasets.length === 0 && (
                    <div className="px-4 py-2 text-sm text-slate-500 italic">No datasets found</div>
                )}
            </div>
        </div>
    );
}
