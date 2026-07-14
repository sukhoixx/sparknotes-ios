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
  const endReachedRef = useRef(false);

  const columnWidth =
    (containerWidth - columnGap * (numColumns - 1)) / numColumns;

  // Compute absolute positions for all items using shortest-column algorithm
  const { layouts, totalHeight } = useMemo(() => {
    const colHeights = new Array(numColumns).fill(0) as number[];
    const layouts: ItemLayout[] = [];

    data.forEach((item, index) => {
      const height = estimateHeight(item, index);
      // Find shortest column
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
  }, [data, numColumns, columnWidth, columnGap, rowGap, estimateHeight]);

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number }; layoutMeasurement: { height: number } } }) => {
      const y = e.nativeEvent.contentOffset.y;
      const viewportH = e.nativeEvent.layoutMeasurement.height;
      setScrollY(y);

      const threshold = onEndReachedThreshold * viewportH;
      if (
        !endReachedRef.current &&
        y + viewportH >= totalHeight - threshold
      ) {
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
      contentContainerStyle={[contentContainerStyle, { height: totalHeight + (ListFooterComponent ? 60 : 0) }]}
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
        const key = keyExtractor(item, index);
        return (
          <View
            key={key}
            style={[
              styles.item,
              {
                position: "absolute",
                top: layout.top,
                left: layout.left,
                width: layout.width,
              },
            ]}
          >
            {renderItem({ item, index })}
          </View>
        );
      })}

      {ListFooterComponent && (
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center" }}>
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
