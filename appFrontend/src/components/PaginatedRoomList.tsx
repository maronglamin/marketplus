import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PAGE_SIZE = 8;

interface PaginatedRoomListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  accent?: string;
}

export function PaginatedRoomList<T>({
  items,
  renderItem,
  keyExtractor,
  emptyMessage = 'No items.',
  accent = '#7C3AED',
}: PaginatedRoomListProps<T>) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  React.useEffect(() => {
    setPage(0);
  }, [items.length]);

  if (items.length === 0) {
    return <Text style={styles.empty}>{emptyMessage}</Text>;
  }

  return (
    <View>
      {pageItems.map((item) => (
        <React.Fragment key={keyExtractor(item)}>{renderItem(item)}</React.Fragment>
      ))}
      {items.length > PAGE_SIZE && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
            onPress={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <Ionicons name="chevron-back" size={18} color={page === 0 ? '#D1D5DB' : accent} />
          </TouchableOpacity>
          <Text style={styles.pageInfo}>
            {page + 1} / {totalPages} · {items.length} rooms
          </Text>
          <TouchableOpacity
            style={[styles.pageBtn, page >= totalPages - 1 && styles.pageBtnDisabled]}
            onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <Ionicons name="chevron-forward" size={18} color={page >= totalPages - 1 ? '#D1D5DB' : accent} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 14, color: '#6B7280', marginVertical: 12 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8, paddingVertical: 8 },
  pageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  pageBtnDisabled: { backgroundColor: '#F9FAFB' },
  pageInfo: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
});
