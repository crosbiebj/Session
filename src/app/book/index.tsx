import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookPage } from '@/components/BookPage';
import { CatchCard } from '@/components/CatchCard';
import { LakeFilterPicker } from '@/components/LakeFilterPicker';
import { useCatches } from '@/hooks/useCatches';
import type { FishSubType, Lake } from '@/types/database';

const SUB_TYPES: FishSubType[] = [
  'common',
  'mirror',
  'linear',
  'fully_scaled',
  'leather',
  'grass',
  'koi',
  'ghost',
];

type ViewMode = 'book' | 'list';

// V1: full-screen horizontal paging for the "book" feel, plus a list mode
// with search/filters for actually finding a specific catch — CLAUDE.md's
// page-curl is a later dedicated pass, but "never spend 20 minutes
// scrolling page by page to find a catch" needed solving today regardless
// of which view mode you're browsing in.
export default function Book() {
  const [viewMode, setViewMode] = useState<ViewMode>('book');
  const [searchInput, setSearchInput] = useState('');
  const [searchText, setSearchText] = useState('');
  const [lake, setLake] = useState<Lake | null>(null);
  const [subType, setSubType] = useState<FishSubType | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  // Debounce the search box — no reason to fire a query on every
  // keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearchText(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useCatches({
      searchText: searchText || undefined,
      lakeId: lake?.id,
      subType: subType ?? undefined,
    });
  const catches = data?.pages.flat() ?? [];
  const filtersActive = !!searchText || !!lake || !!subType;

  const listRef = useRef<FlatList>(null);
  const bookRef = useRef<FlatList>(null);

  // Without this, changing filters mid-scroll leaves the FlatList at its
  // old offset against the new (usually shorter) data — either blank
  // space past the end of a narrowed result set, or the wrong catch
  // showing under a page counter that's already reset to "Page 1."
  useEffect(() => {
    setPageIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    bookRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [searchText, lake, subType]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = e.nativeEvent.layoutMeasurement.width;
    if (width > 0) {
      setPageIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchText('');
    setLake(null);
    setSubType(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-ink/10 active:opacity-70"
        >
          <Ionicons name="chevron-back" size={20} color="#2B2620" />
        </Pressable>
        <Text className="font-serif text-lg text-moss">Your Book</Text>
        <Pressable
          onPress={() => setViewMode((m) => (m === 'book' ? 'list' : 'book'))}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full bg-ink/10 active:opacity-70"
          accessibilityLabel={viewMode === 'book' ? 'Switch to list view' : 'Switch to book view'}
        >
          <Ionicons name={viewMode === 'book' ? 'list' : 'book'} size={18} color="#2B2620" />
        </Pressable>
      </View>

      {/* Search + filters */}
      <View className="px-5 pb-2">
        <View className="flex-row items-center gap-2 rounded-lg border border-tobacco/30 bg-white/60 px-3 py-2">
          <Ionicons name="search" size={16} color="#8B5A2B" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search story or peg…"
            placeholderTextColor="#8B5A2B80"
            className="flex-1 font-sans text-sm text-ink"
          />
          <Pressable onPress={() => setShowFilters((s) => !s)} hitSlop={8}>
            <Ionicons
              name="options"
              size={18}
              color={lake || subType ? '#3D4A34' : '#8B5A2B'}
            />
          </Pressable>
        </View>

        {showFilters ? (
          <View className="mt-2 gap-2">
            <View className="flex-row flex-wrap items-center gap-2">
              <LakeFilterPicker selectedLake={lake} onSelect={setLake} />
              {SUB_TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setSubType((s) => (s === t ? null : t))}
                  className={`rounded-full border px-3 py-1.5 ${
                    subType === t ? 'border-moss bg-moss/10' : 'border-tobacco/30'
                  }`}
                >
                  <Text
                    className={`font-sans text-xs capitalize ${
                      subType === t ? 'text-moss' : 'text-ink/60'
                    }`}
                  >
                    {t.replace('_', ' ')}
                  </Text>
                </Pressable>
              ))}
            </View>
            {filtersActive ? (
              <Pressable onPress={clearFilters} className="self-start">
                <Text className="font-sans text-xs text-tobacco">Clear filters</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3D4A34" />
        </View>
      ) : catches.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Text className="text-center font-serif text-xl text-moss">
            {filtersActive ? 'No catches match' : 'Nothing logged yet'}
          </Text>
          <Text className="mt-2 text-center font-sans text-sm text-ink/60">
            {filtersActive
              ? 'Try a different search or clear your filters.'
              : 'Tap the + on Home to log your first catch.'}
          </Text>
        </View>
      ) : viewMode === 'list' ? (
        <FlatList
          ref={listRef}
          data={catches}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <CatchCard item={item} index={index} />}
          contentContainerStyle={{ padding: 20 }}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color="#3D4A34" />
            ) : null
          }
        />
      ) : (
        <>
          <FlatList
            ref={bookRef}
            data={catches}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <BookPage item={item} />}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={32}
            onEndReachedThreshold={0.5}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
          />
          <View className="items-center pb-2">
            <Text className="font-sans text-xs text-ink/50">
              {isFetchingNextPage ? 'Loading…' : `Page ${pageIndex + 1} of ${catches.length}`}
            </Text>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
