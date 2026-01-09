import React, { useState } from 'react';
import { Search, Filter, Tags, ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { cn } from '../lib/utils';

export function Sidebar({ metadataFields, filters, onFilterChange, availableTags, visibleTags, onToggleTag }) {
    const [expandedSections, setExpandedSections] = useState({
        metadata: true,
        tags: true
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="w-80 h-full bg-slate-900 border-r border-slate-800 flex flex-col text-slate-300">
            {/* Search Header */}
            <div className="p-4 border-b border-slate-800">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Filter images..."
                        className="w-full bg-slate-800 border-none rounded-md py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-orange-500 placeholder-slate-500"
                        onChange={(e) => onFilterChange('text', e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Tags Section */}
                <div>
                    <button
                        onClick={() => toggleSection('tags')}
                        className="flex items-center w-full text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 hover:text-slate-300"
                    >
                        {expandedSections.tags ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                        Tags & Labels
                    </button>
                    {expandedSections.tags && (
                        <div className="space-y-2 px-2">
                            {availableTags && availableTags.length > 0 ? (
                                availableTags.map(tag => (
                                    <div
                                        key={tag}
                                        className="flex items-center justify-between group cursor-pointer px-2 py-1 rounded hover:bg-slate-800/50"
                                        onClick={() => onToggleTag(tag)}
                                    >
                                        <div className="flex items-center">
                                            <div className={`w-3 h-3 border rounded mr-2 flex items-center justify-center transition-colors ${visibleTags.has(tag) ? 'bg-orange-500 border-orange-500' : 'border-slate-600'}`}>
                                                {visibleTags.has(tag) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                            </div>
                                            <span className="text-sm truncate" title={tag}>{tag}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-slate-500 italic">No specific tags loaded</div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            <div className="p-4 border-t border-slate-800 text-xs text-slate-600">
                <div className="flex justify-between">
                    <span>Total Samples</span>
                    <span>--</span>
                </div>
            </div>
        </div>
    );
}
