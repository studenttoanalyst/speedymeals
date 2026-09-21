'use client';

import React, { useState, useMemo } from 'react';
import { MagnifyingGlass, Funnel, CaretLeft, CaretRight, CaretUpDown } from '@phosphor-icons/react';

export interface Column<T> {
  key: string;
  title: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  filterOptions?: {
    label: string;
    value: string;
    filterFn: (item: T) => boolean;
  }[];
  isLoading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  onRowClick?: (item: T) => void;
  actions?: React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  searchPlaceholder = 'Search records...',
  searchFilter,
  filterOptions,
  isLoading = false,
  emptyMessage = 'No records found.',
  pageSize = 10,
  onRowClick,
  actions,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter & search
  const filteredData = useMemo(() => {
    let result = [...data];

    if (selectedFilter !== 'all' && filterOptions) {
      const activeOption = filterOptions.find((o) => o.value === selectedFilter);
      if (activeOption) {
        result = result.filter(activeOption.filterFn);
      }
    }

    if (searchQuery.trim() && searchFilter) {
      result = result.filter((item) => searchFilter(item, searchQuery.trim()));
    }

    if (sortColumn) {
      result.sort((a: any, b: any) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, selectedFilter, filterOptions, searchQuery, searchFilter, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortColumn === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="flex flex-col bg-paper border border-line" style={{ borderRadius: '0px' }}>
      {/* Table Toolbar */}
      <div className="p-4 border-b border-line flex flex-wrap items-center justify-between gap-3 bg-paper-off/50">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          {searchFilter && (
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-paper border border-line text-ink placeholder:text-ink-soft focus:outline-none focus:border-ink font-sans transition-colors"
                style={{ borderRadius: '0px' }}
              />
            </div>
          )}

          {filterOptions && filterOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <Funnel size={14} className="text-ink-soft" />
              <select
                value={selectedFilter}
                onChange={(e) => {
                  setSelectedFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="py-1.5 px-2.5 text-xs bg-paper border border-line text-ink focus:outline-none focus:border-ink font-mono font-medium transition-colors"
                style={{ borderRadius: '0px' }}
              >
                <option value="all">All statuses</option>
                {filterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line bg-paper-off/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key, col.sortable)}
                  className={`py-3 px-4 font-mono text-[11px] font-semibold tracking-wider uppercase text-ink-soft ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${col.sortable ? 'cursor-pointer select-none hover:text-ink' : ''}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.title}
                    {col.sortable && <CaretUpDown size={12} className="opacity-60" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm">
            {isLoading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className="py-3.5 px-4">
                      <div className="h-4 bg-line/60 w-3/4" style={{ borderRadius: '0px' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-sm font-sans text-ink-soft"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-paper-off/60' : 'hover:bg-paper-off/30'
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3 px-4 text-ink font-sans ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && filteredData.length > 0 && (
        <div className="p-3 border-t border-line flex items-center justify-between bg-paper-off/30 text-xs font-mono text-ink-soft">
          <div>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-line bg-paper text-ink disabled:opacity-30 disabled:cursor-not-allowed hover:bg-paper-off transition-colors"
              style={{ borderRadius: '0px' }}
              title="Previous Page"
            >
              <CaretLeft size={14} />
            </button>
            <span className="px-3 py-1 font-semibold text-ink">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-line bg-paper text-ink disabled:opacity-30 disabled:cursor-not-allowed hover:bg-paper-off transition-colors"
              style={{ borderRadius: '0px' }}
              title="Next Page"
            >
              <CaretRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
