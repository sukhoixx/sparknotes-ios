import React, { useCallback, useMemo, useRef, useState } from "react";
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
const BUFFER = SCREEN_HEIGHT * 1.5;

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
  renderItem: (info: { item: T; index: number }) => ReactNode;
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
  const [containerWidth, setContainerWidth] = useState(
    Dimensions.get("window").width
  );
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

  const handleItemLayout = useCallback(
    (key: string, height: number) => {
      const prev = measuredHeightsRef.current.get(key);
      // Only trigger recompute if height changed by more than 4px
      if (prev === undefined || Math.abs(prev - height) > 4) {
        measuredHeightsRef.current.set(key, height);
        setMeasureVersion((v) => v + 1);
      }
    },
    []
  );

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number }; layoutMeasurement: { height: number } } }) => {
      const y = e.nativeEvent.contentOffset.y;
      const viewportH = e.nativeEvent.layoutMeasurement.height;
      setScrollY(y);

      const threshold = onEndReachedThreshold * viewportH;
      if (!endReachedRef.current && y + viewportH >= totalHeight - threshold) {
        endReachedRef.current = true;
        onEndReached();
      } else if (y + viewportH < totalHeight - threshold) {
        endReachedRef.current = false;
      }
    },
    [totalHeight, onEndReachedThreshold, onEndReached]
  );

  // Render only items within the viewport + buffer
  const visibleItems = useMemo(() => {
    const top = scrollY - BUFFER;
    const bottom = scrollY + SCREEN_HEIGHT + BUFFER;
    return layouts
      .map((layout, index) => ({ layout, index }))
      .filter(({ layout }) => layout.top + layout.height > top && layout.top < bottom);
  }, [layouts, scrollY]);

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
      refreshControl={refreshControl}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
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
              },
            ]}
            onLayout={(e) => handleItemLayout(key, e.nativeEvent.layout.height)}
          >
            {renderItem({ item, index })}
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
