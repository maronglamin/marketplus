import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 8;

interface PaginatedRoomListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
}

export function PaginatedRoomList<T>({
  items,
  renderItem,
  keyExtractor,
  emptyMessage = 'No items.',
}: PaginatedRoomListProps<T>) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  useEffect(() => {
    setPage(0);
  }, [items.length]);

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>;
  }

  return (
    <div>
      <div className="space-y-2">{pageItems.map((item) => <React.Fragment key={keyExtractor(item)}>{renderItem(item)}</React.Fragment>)}</div>
      {items.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-4 mt-3 py-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center disabled:opacity-40"
          >
            <ChevronLeft className="w-5 h-5 text-violet-600" />
          </button>
          <span className="text-sm text-gray-500 font-medium">
            {page + 1} / {totalPages} · {items.length} rooms
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center disabled:opacity-40"
          >
            <ChevronRight className="w-5 h-5 text-violet-600" />
          </button>
        </div>
      )}
    </div>
  );
}
