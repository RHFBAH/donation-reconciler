'use client';

import React, { useState } from 'react';
import { DonationCategory } from '@/types/finance';
import { CATEGORY_MAP_AR } from '@/lib/reconciliation';
import { Filter, X, Calendar, DollarSign, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FilterOptions {
    dateFrom: string;
    dateTo: string;
    amountMin: number | '';
    amountMax: number | '';
    categories: DonationCategory[];
    searchQuery: string;
}

interface FilterPanelProps {
    filters: FilterOptions;
    onFilterChange: (filters: FilterOptions) => void;
    onClear: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onFilterChange, onClear }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleCategoryToggle = (category: DonationCategory) => {
        const newCategories = filters.categories.includes(category)
            ? filters.categories.filter(c => c !== category)
            : [...filters.categories, category];
        onFilterChange({ ...filters, categories: newCategories });
    };

    const hasActiveFilters =
        filters.dateFrom ||
        filters.dateTo ||
        filters.amountMin !== '' ||
        filters.amountMax !== '' ||
        filters.categories.length > 0;

    return (
        <div className="bg-card border-2 border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                >
                    <Filter size={18} />
                    <span>فلاتر متقدمة</span>
                    {hasActiveFilters && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                            نشط
                        </span>
                    )}
                </button>
                {hasActiveFilters && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={onClear}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                        <X size={14} />
                        مسح الفلاتر
                    </motion.button>
                )}
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                            {/* Date Range */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-1 text-sm font-medium">
                                    <Calendar size={14} />
                                    نطاق التاريخ
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={filters.dateFrom}
                                        onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
                                        className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="من"
                                    />
                                    <input
                                        type="date"
                                        value={filters.dateTo}
                                        onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
                                        className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="إلى"
                                    />
                                </div>
                            </div>

                            {/* Amount Range */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-1 text-sm font-medium">
                                    <DollarSign size={14} />
                                    نطاق المبلغ (د.ب)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={filters.amountMin}
                                        onChange={(e) => onFilterChange({ ...filters, amountMin: e.target.value ? Number(e.target.value) : '' })}
                                        className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="من"
                                        min="0"
                                        step="0.001"
                                    />
                                    <input
                                        type="number"
                                        value={filters.amountMax}
                                        onChange={(e) => onFilterChange({ ...filters, amountMax: e.target.value ? Number(e.target.value) : '' })}
                                        className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="إلى"
                                        min="0"
                                        step="0.001"
                                    />
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-1 text-sm font-medium">
                                    <Tag size={14} />
                                    الفئات
                                </label>
                                <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                                    {(Object.keys(CATEGORY_MAP_AR) as DonationCategory[]).map(category => (
                                        <label
                                            key={category}
                                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={filters.categories.includes(category)}
                                                onChange={() => handleCategoryToggle(category)}
                                                className="rounded border-border text-primary focus:ring-2 focus:ring-primary"
                                            />
                                            <span className="text-sm">{CATEGORY_MAP_AR[category]}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
