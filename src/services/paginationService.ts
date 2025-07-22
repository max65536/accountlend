export interface PaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startIndex: number;
    endIndex: number;
  };
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export class PaginationService {
  private readonly DEFAULT_PAGE_SIZE = 10;
  private readonly MAX_PAGE_SIZE = 100;

  /**
   * Paginate an array of items
   */
  paginate<T>(
    items: T[],
    page: number = 1,
    pageSize: number = this.DEFAULT_PAGE_SIZE
  ): PaginatedResult<T> {
    // Validate inputs
    const validatedPage = Math.max(1, page);
    const validatedPageSize = Math.min(Math.max(1, pageSize), this.MAX_PAGE_SIZE);
    
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / validatedPageSize);
    const currentPage = Math.min(validatedPage, totalPages || 1);
    
    const startIndex = (currentPage - 1) * validatedPageSize;
    const endIndex = Math.min(startIndex + validatedPageSize, totalItems);
    
    const data = items.slice(startIndex, endIndex);
    
    return {
      data,
      pagination: {
        currentPage,
        pageSize: validatedPageSize,
        totalItems,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
        startIndex,
        endIndex: endIndex - 1
      }
    };
  }

  /**
   * Create pagination info without slicing data
   */
  createPaginationInfo(
    totalItems: number,
    page: number = 1,
    pageSize: number = this.DEFAULT_PAGE_SIZE
  ): PaginatedResult<never>['pagination'] {
    const validatedPage = Math.max(1, page);
    const validatedPageSize = Math.min(Math.max(1, pageSize), this.MAX_PAGE_SIZE);
    
    const totalPages = Math.ceil(totalItems / validatedPageSize);
    const currentPage = Math.min(validatedPage, totalPages || 1);
    
    const startIndex = (currentPage - 1) * validatedPageSize;
    const endIndex = Math.min(startIndex + validatedPageSize, totalItems);
    
    return {
      currentPage,
      pageSize: validatedPageSize,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      startIndex,
      endIndex: endIndex - 1
    };
  }

  /**
   * Get page numbers for pagination UI
   */
  getPageNumbers(
    currentPage: number,
    totalPages: number,
    maxVisible: number = 5
  ): (number | '...')[] {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [];
    const halfVisible = Math.floor(maxVisible / 2);

    // Always show first page
    pages.push(1);

    let startPage = Math.max(2, currentPage - halfVisible);
    let endPage = Math.min(totalPages - 1, currentPage + halfVisible);

    // Adjust range if we're near the beginning or end
    if (currentPage <= halfVisible + 1) {
      endPage = Math.min(totalPages - 1, maxVisible - 1);
    } else if (currentPage >= totalPages - halfVisible) {
      startPage = Math.max(2, totalPages - maxVisible + 2);
    }

    // Add ellipsis after first page if needed
    if (startPage > 2) {
      pages.push('...');
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      pages.push('...');
    }

    // Always show last page (if more than 1 page)
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }

  /**
   * Sort items by a property
   */
  sortItems<T>(
    items: T[],
    sortBy: keyof T,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): T[] {
    return [...items].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (aValue === bValue) return 0;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Filter items by multiple criteria
   */
  filterItems<T>(
    items: T[],
    filters: Record<string, any>
  ): T[] {
    return items.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          return true; // Skip empty filters
        }

        const itemValue = (item as any)[key];

        if (typeof value === 'string') {
          return String(itemValue).toLowerCase().includes(value.toLowerCase());
        }

        if (Array.isArray(value)) {
          return value.includes(itemValue);
        }

        if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
          const numValue = Number(itemValue);
          return numValue >= value.min && numValue <= value.max;
        }

        return itemValue === value;
      });
    });
  }

  /**
   * Search items by text across multiple fields
   */
  searchItems<T>(
    items: T[],
    searchText: string,
    searchFields: (keyof T)[]
  ): T[] {
    if (!searchText.trim()) {
      return items;
    }

    const searchLower = searchText.toLowerCase();

    return items.filter(item => {
      return searchFields.some(field => {
        const fieldValue = item[field];
        if (fieldValue === null || fieldValue === undefined) {
          return false;
        }
        return String(fieldValue).toLowerCase().includes(searchLower);
      });
    });
  }

  /**
   * Process items with sorting, filtering, searching, and pagination
   */
  processItems<T>(
    items: T[],
    state: PaginationState & {
      searchText?: string;
      searchFields?: (keyof T)[];
    }
  ): PaginatedResult<T> {
    let processedItems = [...items];

    // Apply search
    if (state.searchText && state.searchFields) {
      processedItems = this.searchItems(processedItems, state.searchText, state.searchFields);
    }

    // Apply filters
    if (state.filters) {
      processedItems = this.filterItems(processedItems, state.filters);
    }

    // Apply sorting
    if (state.sortBy) {
      processedItems = this.sortItems(processedItems, state.sortBy as keyof T, state.sortOrder);
    }

    // Apply pagination
    return this.paginate(processedItems, state.currentPage, state.pageSize);
  }

  /**
   * Calculate pagination stats for display
   */
  getPaginationStats(pagination: PaginatedResult<any>['pagination']): {
    showing: string;
    total: string;
    pages: string;
  } {
    const { currentPage, pageSize, totalItems, totalPages, startIndex, endIndex } = pagination;

    const showing = totalItems === 0 
      ? 'No items'
      : `Showing ${startIndex + 1}-${endIndex + 1} of ${totalItems}`;

    const total = `${totalItems} total item${totalItems !== 1 ? 's' : ''}`;
    const pages = `Page ${currentPage} of ${totalPages}`;

    return { showing, total, pages };
  }

  /**
   * Get optimal page size based on container height and item height
   */
  getOptimalPageSize(
    containerHeight: number,
    itemHeight: number,
    minPageSize: number = 5,
    maxPageSize: number = 50
  ): number {
    const calculatedSize = Math.floor(containerHeight / itemHeight);
    return Math.min(Math.max(calculatedSize, minPageSize), maxPageSize);
  }

  /**
   * Create URL search params for pagination state
   */
  createSearchParams(state: PaginationState): URLSearchParams {
    const params = new URLSearchParams();

    if (state.currentPage > 1) {
      params.set('page', state.currentPage.toString());
    }

    if (state.pageSize !== this.DEFAULT_PAGE_SIZE) {
      params.set('pageSize', state.pageSize.toString());
    }

    if (state.sortBy) {
      params.set('sortBy', state.sortBy.toString());
    }

    if (state.sortOrder && state.sortOrder !== 'asc') {
      params.set('sortOrder', state.sortOrder);
    }

    if (state.filters) {
      Object.entries(state.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(`filter_${key}`, String(value));
        }
      });
    }

    return params;
  }

  /**
   * Parse URL search params to pagination state
   */
  parseSearchParams(searchParams: URLSearchParams): Partial<PaginationState> {
    const state: Partial<PaginationState> = {};

    const page = searchParams.get('page');
    if (page) {
      state.currentPage = Math.max(1, parseInt(page, 10) || 1);
    }

    const pageSize = searchParams.get('pageSize');
    if (pageSize) {
      state.pageSize = Math.min(Math.max(1, parseInt(pageSize, 10) || this.DEFAULT_PAGE_SIZE), this.MAX_PAGE_SIZE);
    }

    const sortBy = searchParams.get('sortBy');
    if (sortBy) {
      state.sortBy = sortBy;
    }

    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder === 'desc') {
      state.sortOrder = 'desc';
    }

    // Parse filters
    const filters: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('filter_')) {
        const filterKey = key.replace('filter_', '');
        filters[filterKey] = value;
      }
    });

    if (Object.keys(filters).length > 0) {
      state.filters = filters;
    }

    return state;
  }
}

// Export singleton instance
export const paginationService = new PaginationService();

// Helper hook for React components (to be used with useState)
export const createPaginationState = (
  initialPage: number = 1,
  initialPageSize: number = 10
): PaginationState => ({
  currentPage: initialPage,
  pageSize: initialPageSize,
  sortBy: undefined,
  sortOrder: 'asc',
  filters: {}
});
