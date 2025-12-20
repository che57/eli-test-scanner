import React, { useCallback, useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, Platform, Image, ActivityIndicator } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import NetworkStatusBanner from '@/components/network-status-banner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useGetSubmissionsQuery, type SubmissionItem } from '@/store/api/testStripsApi';
import { BASE_BACKEND_URL, BASE_BACKEND_URL_ANDROID } from '@/config/env';

const PAGE_SIZE = 10;

export default function UploadHistoryScreen() {
  const isFocused = useIsFocused();
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<SubmissionItem[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { data: items = [], isLoading, error, isFetching } = useGetSubmissionsQuery(
    { page, limit: PAGE_SIZE },
    {
      skip: !isFocused || !hasMore,
      refetchOnMountOrArgChange: true,
    }
  );

  // Merge new items with existing ones
  React.useEffect(() => {
    if (items.length > 0) {
      setAllItems((prev) => {
        // On page 1, replace all items (for refresh)
        if (page === 1) return items;
        // For subsequent pages, append new items, avoiding duplicates
        const existingIds = new Set(prev.map((i) => i.id));
        const newItems = items.filter((i) => !existingIds.has(i.id));
        return [...prev, ...newItems];
      });
      // If we got fewer items than PAGE_SIZE, we've reached the end
      if (items.length < PAGE_SIZE) {
        setHasMore(false);
      }
    }
  }, [items, page]);

  const onRefresh = useCallback(() => {
    setPage(1);
    setAllItems([]);
    setHasMore(true);
  }, []);

  const onEndReached = useCallback(() => {
    if (!isLoading && !isFetching && hasMore && items.length === PAGE_SIZE) {
      setPage((prev) => prev + 1);
    }
  }, [isLoading, isFetching, hasMore, items.length]);

  const renderItem = ({ item }: { item: SubmissionItem }) => {
    const base = Platform.OS === 'android' ? BASE_BACKEND_URL_ANDROID : BASE_BACKEND_URL;
    const uri = item.thumbnailUrl
      ? item.thumbnailUrl.startsWith('http')
        ? item.thumbnailUrl
        : `${base.replace(/\/$/, '')}${item.thumbnailUrl.startsWith('/') ? '' : '/'}${item.thumbnailUrl}`
      : null;
    const isValid = !!item.qrCode && !item.isExpired;

    return (
      <View style={[
        styles.item,
        isValid ? styles.itemDetected : styles.itemMissing,
      ]}>
        {uri ? (
          <Image source={{ uri }} style={styles.thumbnail} />
        ) : null}
        <View>
          <ThemedText type="defaultSemiBold">{new Date(item.createdAt).toLocaleString()}</ThemedText>
          <ThemedText style={styles.qrText}>
            {item.qrCode ? `QR: ${item.qrCode}` : 'QR code not detected'}
            {item.qrCode && item.isExpired && ` ⚠️ Expired (${item.expirationYear})`}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <ThemedView style={styles.titleContainer}>
      <ThemedView>
        <ThemedText type="title">Upload History</ThemedText>
      </ThemedView>

      <ThemedView style={styles.container}>
        {error && (
          <NetworkStatusBanner error={(typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') ? error.message : String(error)} onDismiss={() => { }} />
        )}
        {allItems.length === 0 && !isLoading ? (
          <ThemedText style={{ marginTop: 12 }}>No uploads yet.</ThemedText>
        ) : (
          <FlatList
            data={allItems}
            keyExtractor={(i) => i.id}
            refreshing={page === 1 && isLoading}
            onRefresh={onRefresh}
            renderItem={renderItem}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetching && page > 1 ? (
                <View style={styles.footer}>
                  <ActivityIndicator size="small" />
                  <ThemedText style={styles.footerText}>Loading more...</ThemedText>
                </View>
              ) : null
            }
          />
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    gap: 8,
    paddingTop: 12,
    paddingBottom: 60,
    paddingHorizontal: 12,
  },
  container: {
    gap: 12,
    marginBottom: 12,
  },
  item: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    flexDirection: 'row',
    marginBottom: 8,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  itemDetected: {
    backgroundColor: '#e8f5e9',
    borderColor: '#2e7d32',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  itemMissing: {
    backgroundColor: '#ffebee',
    borderColor: '#c62828',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  qrText: {
    marginTop: 8,
    fontSize: 13,
  },
  expiredText: {
    marginTop: 4,
    fontSize: 12,
    color: '#d84315',
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
});
