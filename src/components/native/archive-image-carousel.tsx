import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Photo, colors } from "./ui";

export function ArchiveImageCarousel({
  images,
  label,
  onImagePress,
}: {
  images: (string | undefined)[];
  label: string;
  onImagePress: (uri: string) => void;
}) {
  const unique = [
    ...new Set(images.filter((uri): uri is string => Boolean(uri))),
  ];
  return (
    <ImagePager
      key={JSON.stringify(unique)}
      images={unique}
      label={label}
      onImagePress={onImagePress}
    />
  );
}

function ImagePager({
  images,
  label,
  onImagePress,
}: {
  images: string[];
  label: string;
  onImagePress: (uri: string) => void;
}) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const current = useRef(0);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const count = images.length;
  const looping = count > 1;
  // One matching image at each edge lets the native pager cross either boundary.
  const slides = looping ? [images[count - 1], ...images, images[0]] : images;

  useEffect(() => () => clearTimeout(timer.current), []);
  useLayoutEffect(() => {
    clearTimeout(timer.current);
    if (width)
      scroll.current?.scrollTo({
        x: (current.current + (looping ? 1 : 0)) * width,
        animated: false,
      });
  }, [width, looping]);

  const settle = (offset: number) => {
    if (!width || !looping) return;
    const page = Math.round(offset / width);
    if (Math.abs(offset - page * width) > 1) return;
    const next = (((page - 1) % count) + count) % count;
    current.current = next;
    setIndex(next);
    if (page === 0 || page === count + 1) {
      // Rebase onto the identical original without animating across the other images.
      scroll.current?.scrollTo({ x: (next + 1) * width, animated: false });
    }
  };
  const settleNative = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    settle(event.nativeEvent.contentOffset.x);

  return (
    <View
      testID="archive-image-carousel"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {count === 0 ? (
        <Photo label={label} />
      ) : width > 0 ? (
        <ScrollView
          ref={scroll}
          testID="archive-image-scroll"
          horizontal
          pagingEnabled
          directionalLockEnabled
          decelerationRate="fast"
          disableIntervalMomentum
          snapToInterval={width}
          bounces={false}
          overScrollMode="never"
          scrollEnabled={looping}
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: looping ? width : 0, y: 0 }}
          onScrollEndDrag={
            Platform.OS === "web"
              ? undefined
              : (event) => {
                  // A drag released exactly on a page may have no momentum phase.
                  if (event.nativeEvent.velocity?.x === 0) settleNative(event);
                }
          }
          onMomentumScrollEnd={Platform.OS === "web" ? undefined : settleNative}
          scrollEventThrottle={16}
          onScroll={
            Platform.OS === "web"
              ? (event) => {
                  clearTimeout(timer.current);
                  const offset = event.nativeEvent.contentOffset.x;
                  timer.current = setTimeout(() => settle(offset), 150);
                }
              : undefined
          }
        >
          {slides.map((uri, page) => {
            const original = looping ? page - 1 : page;
            const active = original === index;
            return (
              <View
                key={`${page}:${uri}`}
                aria-hidden={!active}
                accessibilityElementsHidden={!active}
                importantForAccessibility={
                  active ? "auto" : "no-hide-descendants"
                }
                style={{
                  width,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.line,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${label} 이미지 확대`}
                  onPress={() => onImagePress(uri)}
                >
                  <Photo
                    uri={uri}
                    label={label}
                    backgroundColor="transparent"
                  />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      ) : null}
      {looping ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {images.map((uri, i) => (
            <Pressable
              key={uri}
              accessibilityRole="button"
              accessibilityLabel={`${i + 1}번째 이미지 보기`}
              accessibilityState={{ selected: i === index }}
              aria-pressed={i === index}
              onPress={() => {
                clearTimeout(timer.current);
                current.current = i;
                setIndex(i);
                scroll.current?.scrollTo({
                  x: (i + 1) * width,
                  animated: false,
                });
              }}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: i === index ? 7 : 5,
                  height: i === index ? 7 : 5,
                  borderRadius: 4,
                  backgroundColor: i === index ? colors.text : colors.muted,
                  opacity: i === index ? 1 : 0.5,
                }}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
