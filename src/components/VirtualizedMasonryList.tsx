import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import type { ReactElement, ReactNode, RefObject } from "react";
import type { StyleProp, ViewStyle, RefreshControlProps } from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const BUFFER = SCREEN_HEIGHT * 3;

interface ItemLayout {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props<T> {
  data: T[];
  numColumns: number;
  estimateHeight: (item: T, index: number) => number;
  renderItem: (info: { item: T; index: number; columnWidth: number }) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  onEndReached: () => void;
  onEndReachedThreshold?: number;
  refreshControl?: ReactElement<RefreshControlProps>;
  ListFooterComponent?: ReactElement | null;
  ListEmptyComponent?: ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollRef?: RefObject<ScrollView | null>;
  columnGap?: number;
  rowGap?: number;
}

export function VirtualizedMasonryList<T>({
  data,
  numColumns,
  estimateHeight,
  renderItem,
  keyExtractor,
  onEndReached,
  onEndReachedThreshold = 0.5,
  refreshControl,
  ListFooterComponent,
  ListEmptyComponent,
  contentContainerStyle,
  scrollRef,
  columnGap = 0,
  rowGap = 0,
}: Props<T>) {
  const [scrollY, setScrollY] = useState(0);
  const scrollYRef = useRef(0); // always-current scroll position, no re-render on update
  const [containerWidth, setContainerWidth] = useState(
    Dimensions.get("window").width
  );
  const [viewportHeight, setViewportHeight] = useState(SCREEN_HEIGHT);
  const [measureVersion, setMeasureVersion] = useState(0);
  const endReachedRef = useRef(false);
  const measuredHeightsRef = useRef<Map<string, number>>(new Map());

  const columnWidth =
    (containerWidth - columnGap * (numColumns - 1)) / numColumns;

  // Build key list so layout can use measured heights when available
  const keys = useMemo(
    () => data.map((item, index) => keyExtractor(item, index)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

  // Compute absolute positions: shortest-column masonry using measured or estimated heights
  const { layouts, totalHeight } = useMemo(() => {
    const colHeights = new Array(numColumns).fill(0) as number[];
    const layouts: ItemLayout[] = [];

    data.forEach((item, index) => {
      const key = keys[index];
      const height =
        measuredHeightsRef.current.get(key) ?? estimateHeight(item, index);
      let col = 0;
      for (let c = 1; c < numColumns; c++) {
        if (colHeights[c] < colHeights[col]) col = c;
      }
      const top = colHeights[col] + (colHeights[col] > 0 ? rowGap : 0);
      const left = col * (columnWidth + columnGap);
      layouts.push({ top, left, width: columnWidth, height });
      colHeights[col] = top + height;
    });

    const totalHeight = Math.max(...colHeights, 0);
    return { layouts, totalHeight };
    // measureVersion is intentionally included to recompute when heights are measured
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, numColumns, columnWidth, columnGap, rowGap, estimateHeight, keys, measureVersion]);

  const measureDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleItemLayout = useCallback(
    (key: string, height: number) => {
      const prev = measuredHeightsRef.current.get(key);
      if (prev !== undefined && Math.abs(prev - height) <= 4) return;
      measuredHeightsRef.current.set(key, height);
      // Debounce layout recomputation — collapses multiple onLayout calls into
      // one re-render, eliminating the stale-position overlap window that causes
      // cards to block taps on cards above them.
      if (measureDebounceRef.current) clearTimeout(measureDebounceRef.current);
      measureDebounceRef.current = setTimeout(() => {
        setMeasureVersion((v) => v + 1);
        measureDebounceRef.current = null;
      }, 50);
    },
    []
  );

  const totalHeightRef = useRef(0);
  totalHeightRef.current = totalHeight;
  const viewportHeightRef = useRef(SCREEN_HEIGHT);

  const checkEndReached = useCallback(() => {
    const threshold = onEndReachedThreshold * viewportHeightRef.current;
    const atEnd = scrollYRef.current + viewportHeightRef.current >= totalHeightRef.current - threshold;
    if (!endReachedRef.current && atEnd) {
      endReachedRef.current = true;
      onEndReached();
    } else if (!atEnd) {
      endReachedRef.current = false;
    }
  }, [onEndReachedThreshold, onEndReached]);

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number }; layoutMeasurement: { height: number } } }) => {
      const y = e.nativeEvent.contentOffset.y;
      const viewportH = e.nativeEvent.layoutMeasurement.height;
      viewportHeightRef.current = viewportH;
      setViewportHeight(viewportH);
      // Update ref immediately (no re-render) so end-reached check is always accurate
      scrollYRef.current = y;
      // Don't call setScrollY here — visible items update only when scroll stops
    },
    []
  );

  const handleScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = e.nativeEvent.contentOffset.y;
      scrollYRef.current = y;
      setScrollY(y); // triggers visible items recompute after scroll stops
    },
    []
  );

  // Reset end-reached gate whenever new data arrives so next page can load
  useEffect(() => {
    endReachedRef.current = false;
  }, [data.length]);

  // Re-check end reached whenever totalHeight or scrollY changes
  useEffect(() => {
    checkEndReached();
  }, [checkEndReached, totalHeight, scrollY]);

  // Render items within viewport + 3x buffer. scrollY only updates on scroll end
  // so the buffer must be large enough to keep cards mounted during active scroll.
  const visibleItems = useMemo(() => {
    const top = scrollY - BUFFER;
    const bottom = scrollY + viewportHeight + BUFFER;
    return layouts
      .map((layout, index) => ({ layout, index }))
      .filter(({ layout }) => layout.top + layout.height > top && layout.top < bottom);
  }, [layouts, scrollY, viewportHeight]);

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[
        contentContainerStyle,
        { height: totalHeight + (ListFooterComponent ? 60 : 0) },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      scrollEventThrottle={100}
      onScroll={handleScroll}
      onMomentumScrollEnd={handleScrollEnd}
      onScrollEndDrag={handleScrollEnd}
      refreshControl={refreshControl}
      onLayout={(e) => {
        setContainerWidth(e.nativeEvent.layout.width);
        viewportHeightRef.current = e.nativeEvent.layout.height;
        setViewportHeight(e.nativeEvent.layout.height);
      }}
    >
      {data.length === 0 && ListEmptyComponent}

      {visibleItems.map(({ layout, index }) => {
        const item = data[index];
        const key = keys[index];
        return (
          <View
            key={key}
            style={[
              styles.item,
              {
                top: layout.top,
                left: layout.left,
                width: layout.width,
                zIndex: index,
              },
            ]}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              // Ignore near-zero measurements (e.g. ad before it loads)
              if (h > 10) handleItemLayout(key, h);
            }}
          >
            {renderItem({ item, index, columnWidth })}
          </View>
        );
      })}

      {ListFooterComponent && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          {ListFooterComponent}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item: {
    position: "absolute",
  },
});
