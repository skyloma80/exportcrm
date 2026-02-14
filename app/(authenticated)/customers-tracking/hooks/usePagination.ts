// hooks/usePagination.ts
import { useState, useEffect } from 'react';

interface UsePaginationProps<T> {
  items: T[];
  itemsPerPage?: number;
}

export const usePagination = <T,>({ items, itemsPerPage = 10 }: UsePaginationProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const maxPage = Math.ceil(items.length / itemsPerPage);

  useEffect(() => {
    // 当items改变时，重置到第一页
    setCurrentPage(1);
  }, [items]);

  const currentItems = items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(page, maxPage));
    setCurrentPage(newPage);
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  return {
    currentItems,
    currentPage,
    maxPage,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < maxPage,
    hasPrevPage: currentPage > 1
  };
};