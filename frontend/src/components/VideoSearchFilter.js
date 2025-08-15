"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Filter, X, Calendar, SortAsc, SortDesc, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const VideoSearchFilter = ({ 
    history = [], 
    onFilteredResults, 
    className = "" 
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [showFilters, setShowFilters] = useState(false);
    const [dateRange, setDateRange] = useState("all");

    // Filter and search logic
    const filteredAndSortedHistory = useMemo(() => {
        let filtered = [...history];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(({ data }) => {
                if (!data || typeof data !== 'object') return false;
                
                const title = data.title?.toLowerCase() || '';
                const chapters = data.chapters || [];
                const chaptersText = chapters.join(' ').toLowerCase();
                
                return title.includes(query) || chaptersText.includes(query);
            });
        }

        // Apply date range filter
        if (dateRange !== "all") {
            const now = new Date();
            const cutoffDate = new Date();
            
            switch (dateRange) {
                case "today":
                    cutoffDate.setHours(0, 0, 0, 0);
                    break;
                case "week":
                    cutoffDate.setDate(now.getDate() - 7);
                    break;
                case "month":
                    cutoffDate.setMonth(now.getMonth() - 1);
                    break;
                case "year":
                    cutoffDate.setFullYear(now.getFullYear() - 1);
                    break;
            }
            
            // Note: We'll need to add timestamp to the analysis data in the future
            // For now, we'll keep all results
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case "newest":
                    // Assuming video_id can be used as a rough timestamp indicator
                    return b.id.localeCompare(a.id);
                case "oldest":
                    return a.id.localeCompare(b.id);
                case "title":
                    const titleA = a.data?.title?.toLowerCase() || '';
                    const titleB = b.data?.title?.toLowerCase() || '';
                    return titleA.localeCompare(titleB);
                case "chapters":
                    const chaptersA = a.data?.chapters?.length || 0;
                    const chaptersB = b.data?.chapters?.length || 0;
                    return chaptersB - chaptersA;
                default:
                    return 0;
            }
        });

        return filtered;
    }, [history, searchQuery, sortBy, dateRange]);

    // Update parent component with filtered results
    useEffect(() => {
        onFilteredResults(filteredAndSortedHistory);
    }, [filteredAndSortedHistory, onFilteredResults]);

    const clearAllFilters = () => {
        setSearchQuery("");
        setSortBy("newest");
        setDateRange("all");
        setShowFilters(false);
    };

    const hasActiveFilters = searchQuery.trim() || sortBy !== "newest" || dateRange !== "all";

    return (
        <Card className={`w-full shadow-lg border-t-4 border-emerald-500 ${className}`}>
            <CardContent className="p-4 md:p-6">
                <div className="space-y-4">
                    {/* Main Search Bar */}
                    <div className="relative">
                        {/* <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10" /> */}
                        <Input
                            placeholder="Video başlığı veya konu başlığında ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-base md:text-lg h-14 pl-4 pr-16 rounded-lg"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-2 ${showFilters ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Filter className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Results Summary */}
                    <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>
                            {filteredAndSortedHistory.length} analiz bulundu
                            {searchQuery.trim() && ` "${searchQuery}" için`}
                        </span>
                        {hasActiveFilters && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearAllFilters}
                                className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 border-slate-300"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Filtreleri Temizle
                            </Button>
                        )}
                    </div>

                    {/* Advanced Filters */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="border-t border-slate-200 pt-4"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Sort Options */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">
                                            Sıralama
                                        </label>
                                        <Select value={sortBy} onValueChange={setSortBy}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="newest">
                                                    <div className="flex items-center gap-2">
                                                        <SortDesc className="h-4 w-4" />
                                                        En Yeni
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="oldest">
                                                    <div className="flex items-center gap-2">
                                                        <SortAsc className="h-4 w-4" />
                                                        En Eski
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="title">
                                                    <div className="flex items-center gap-2">
                                                        <SortAsc className="h-4 w-4" />
                                                        Başlık (A-Z)
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="chapters">
                                                    <div className="flex items-center gap-2">
                                                        <SortDesc className="h-4 w-4" />
                                                        Bölüm Sayısı
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Date Range Filter */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">
                                            Tarih Aralığı
                                        </label>
                                        <Select value={dateRange} onValueChange={setDateRange}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4" />
                                                        Tüm Zamanlar
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="today">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4" />
                                                        Bugün
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="week">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4" />
                                                        Son 7 Gün
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="month">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4" />
                                                        Son 30 Gün
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="year">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4" />
                                                        Son 1 Yıl
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </CardContent>
        </Card>
    );
};

export default VideoSearchFilter;