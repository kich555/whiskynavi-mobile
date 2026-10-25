import {
  memo,
  type ComponentRef,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  Search,
  Share2,
} from "lucide-react-native";
import { colors } from "@/components/native/ui";
import {
  categories,
  filterStories,
  findStory,
  type Story,
  type Block,
} from "./content";
import { StoryMarkup } from "./markup";
import { storage } from "@/lib/storage";
import { editorialImages } from "./images";
import { createURL } from "expo-linking";
const StoryCard = memo(function StoryCard({ story }: { story: Story }) {
  return (
    <Link
      href={{ pathname: "/stories/[slug]", params: { slug: story.slug } }}
      asChild
    >
      <Pressable
        style={({ pressed }) => [css.card, { opacity: pressed ? 0.75 : 1 }]}
        accessibilityRole="link"
      >
        {story.cover ? (
          <Image
            source={editorialImages[story.cover]}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={story.id}
            style={css.cover}
          />
        ) : (
          <View style={[css.cover, css.placeholder]}>
            <BookOpen color={colors.muted} size={32} />
            <Text style={css.meta}>{story.categoryLabel}</Text>
          </View>
        )}
        <View style={css.between}>
          <Text style={css.meta}>{story.categoryLabel}</Text>
          <Text style={css.meta}>
            약 {story.readingMinutes}분
            {story.status === "draft" ? " · 검토 중" : ""}
          </Text>
        </View>
        <Text style={css.cardTitle}>{story.title}</Text>
        <Text style={css.description} numberOfLines={3}>
          {story.description || "다음 이야기를 준비하고 있습니다."}
        </Text>
      </Pressable>
    </Link>
  );
});
export function StoriesScreen() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const data = useMemo(
    () => filterStories(category, deferred),
    [category, deferred],
  );
  const render = useCallback(
    ({ item }: { item: Story }) => <StoryCard story={item} />,
    [],
  );
  return (
    <>
      <FlatList
        data={data}
        keyExtractor={(s) => s.id}
        renderItem={render}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={css.container}
        ListHeaderComponent={
          <View>
            <Text accessibilityRole="header" style={css.title}>
              한 잔 너머의 이야기
            </Text>
            <Text style={css.description}>
              위스키를 만드는 사람과 장소, 그리고 한 잔에 담긴 생각들.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={css.tabs}
            >
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: category === c.id }}
                  onPress={() => setCategory(c.id)}
                  style={[css.tab, category === c.id && css.selected]}
                >
                  <Text style={[css.tabText, category === c.id && css.accent]}>
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={css.search}>
              <Search size={20} color={colors.muted} />
              <TextInput
                accessibilityLabel="제목과 소개로 검색"
                placeholder="어떤 이야기가 궁금한가요?"
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
                maxLength={100}
                style={css.input}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
            <Text accessibilityLiveRegion="polite" style={css.count}>
              {data.length}편의 이야기
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={css.empty}>
            <Text style={css.cardTitle}>찾는 이야기가 아직 없어요.</Text>
            <Text style={css.description}>다른 검색어를 입력해 보세요.</Text>
            <Pressable
              onPress={() => {
                setQuery("");
                setCategory("all");
              }}
              style={css.tool}
            >
              <Text style={css.accent}>전체 이야기 보기</Text>
            </Pressable>
          </View>
        }
      />
    </>
  );
}
function ImageBlock({ block }: { block: Block }) {
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={css.figure}>
      <Modal
        visible={expanded}
        onRequestClose={() => setExpanded(false)}
        animationType="none"
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: 60,
            paddingBottom: 40,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이미지 닫기"
            onPress={() => setExpanded(false)}
            style={{ padding: 20 }}
          >
            <Text style={css.accent}>닫기</Text>
          </Pressable>
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <Image
              source={editorialImages[block.src!]}
              accessibilityLabel={block.alt}
              contentFit="contain"
              style={{ flex: 1, minHeight: 400 }}
            />
          </ScrollView>
        </View>
      </Modal>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${block.alt}, 크게 보기`}
        onPress={() => setExpanded(true)}
      >
        <Image
          source={editorialImages[block.src!]}
          contentFit="contain"
          cachePolicy="memory-disk"
          accessibilityLabel={block.alt}
          style={{
            width: "100%",
            aspectRatio: (block.width ?? 1) / (block.height ?? 1),
          }}
          onError={() => setFailed(true)}
        />
        <View style={css.imageAction}>
          <ArrowUpRight color="white" size={14} />
          <Text style={css.meta}>크게 보기</Text>
        </View>
      </Pressable>
      {failed ? (
        <Text style={css.meta}>
          이미지를 불러오지 못했습니다. 연결 상태를 확인해 주세요.
        </Text>
      ) : null}
      {block.caption ? <Text style={css.caption}>{block.caption}</Text> : null}
    </View>
  );
}
export function StoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const story = findStory(slug);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const positions = useRef<Record<string, number>>({});
  const [toc, setToc] = useState(false);
  const [shareError, setShareError] = useState("");
  const [resume, setResume] = useState(0);
  const readingKey = `editorial-position-${slug}`;
  useEffect(() => {
    let active = true;
    void storage
      .get(readingKey)
      .then((value) => {
        const position = Number(value);
        if (active)
          setResume(Number.isFinite(position) && position > 300 ? position : 0);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [readingKey]);
  const savePosition = (position: number) => {
    void storage
      .set(readingKey, String(Math.max(0, Math.round(position))))
      .catch(() => undefined);
  };
  if (!story)
    return (
      <View style={css.container}>
        <Stack.Screen options={{ headerTitle: "스토리를 찾을 수 없습니다" }} />
        <Text style={css.title}>이야기를 찾을 수 없어요.</Text>
        <Link href="/stories" style={css.accent}>
          목록으로 돌아가기
        </Link>
      </View>
    );
  return (
    <>
      <Stack.Screen options={{ headerTitle: story.categoryLabel }} />
      <ScrollView
        ref={scroll}
        onScrollEndDrag={(event) =>
          savePosition(event.nativeEvent.contentOffset.y)
        }
        onMomentumScrollEnd={(event) =>
          savePosition(event.nativeEvent.contentOffset.y)
        }
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={css.container}
      >
        {resume > 0 && (
          <Pressable
            accessibilityRole="button"
            style={css.tool}
            onPress={() =>
              scroll.current?.scrollTo({ y: resume, animated: false })
            }
          >
            <Text style={css.accent}>읽던 곳부터 이어 읽기</Text>
          </Pressable>
        )}
        <Link href="/stories" style={css.back}>
          전체 이야기
        </Link>
        <Text accessibilityRole="header" style={css.title}>
          {story.title}
        </Text>
        <Text style={css.description}>{story.description}</Text>
        <Text style={css.count}>
          {story.categoryLabel} · 약 {story.readingMinutes}분
          {story.status === "draft" ? " · 검토 중 원고" : ""}
        </Text>
        {story.toc.length > 0 ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: toc }}
              onPress={() => setToc(!toc)}
              style={[css.tool, css.between]}
            >
              <Text style={css.tabText}>
                이 글의 순서 · {story.toc.length}개 주제
              </Text>
              <ChevronDown size={20} color={colors.muted} />
            </Pressable>
            {toc ? (
              <View style={css.toc}>
                {story.toc.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() =>
                      scroll.current?.scrollTo({
                        y: positions.current[item.id] ?? 0,
                        animated: false,
                      })
                    }
                    style={css.tool}
                  >
                    <Text style={css.description}>{item.title}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void Share.share({
              title: story.title,
              message: `${story.title}\n${createURL(`/stories/${story.slug}`)}`,
              url: createURL(`/stories/${story.slug}`),
            }).catch(() =>
              setShareError("공유를 열지 못했습니다. 다시 시도해 주세요."),
            );
          }}
          style={[css.tool, css.share]}
        >
          <Share2 size={18} color={colors.muted} />
          <Text style={css.meta}>이야기 공유</Text>
        </Pressable>
        {shareError ? (
          <Text accessibilityRole="alert" style={css.meta}>
            {shareError}
          </Text>
        ) : null}
        {story.blocks.map((block, i) => (
          <View
            key={i}
            onLayout={(e) => {
              if (block.id)
                positions.current[block.id] = e.nativeEvent.layout.y;
            }}
            style={css.block}
          >
            {block.type === "heading" ? (
              <Text accessibilityRole="header" style={css.heading}>
                {block.text}
              </Text>
            ) : block.type === "image" ? (
              <ImageBlock block={block} />
            ) : block.type === "missing" ? (
              <Text style={css.meta}>{block.text}</Text>
            ) : block.type === "list" ? (
              <StoryMarkup
                html={`<ol>${block.items?.map((t) => `<li>${t}</li>`).join("")}</ol>`}
              />
            ) : (
              <StoryMarkup html={block.html ?? ""} />
            )}
          </View>
        ))}
        <View style={css.end}>
          <Text style={css.cardTitle}>한 잔을 더 깊이 이해하는 시간.</Text>
          <Link href="/stories" style={css.back}>
            다음 이야기 찾아보기
          </Link>
          <Pressable
            accessibilityRole="button"
            onPress={() => scroll.current?.scrollTo({ y: 0, animated: false })}
            style={css.tool}
          >
            <Text style={css.meta}>맨 위로</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}
const css = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 64,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  title: {
    fontFamily: "NaviSansBold",
    fontSize: 30,
    lineHeight: 42,
    color: colors.text,
    marginBottom: 20,
  },
  description: {
    fontFamily: "NaviSans",
    fontSize: 16,
    lineHeight: 27,
    color: "#b9c1c4",
  },
  tabs: { marginTop: 24, marginBottom: 20 },
  tab: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    minHeight: 48,
  },
  selected: { borderBottomColor: "#ccff55" },
  tabText: { fontFamily: "NaviSansMedium", fontSize: 15, color: colors.text },
  accent: { color: "#ccff55" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#526068",
    borderRadius: 4,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: "NaviSans",
    fontSize: 16,
    minHeight: 48,
  },
  count: {
    color: colors.muted,
    fontFamily: "NaviSans",
    fontSize: 14,
    lineHeight: 22,
    marginVertical: 24,
  },
  card: { marginBottom: 36 },
  cover: {
    width: "100%",
    aspectRatio: 1.6,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  placeholder: { alignItems: "center", justifyContent: "center", gap: 12 },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  meta: {
    fontFamily: "NaviSans",
    fontSize: 13,
    lineHeight: 21,
    color: "#adb5b8",
  },
  cardTitle: {
    fontFamily: "NaviSansBold",
    fontSize: 22,
    lineHeight: 32,
    color: colors.text,
    marginVertical: 12,
  },
  empty: { paddingVertical: 48 },
  tool: { minHeight: 48, paddingVertical: 12, justifyContent: "center" },
  back: {
    color: "#ccff55",
    fontFamily: "NaviSansMedium",
    fontSize: 15,
    lineHeight: 24,
    paddingVertical: 12,
    marginBottom: 16,
  },
  toc: { borderBottomWidth: 1, borderColor: colors.line, paddingBottom: 12 },
  share: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  block: { marginBottom: 16 },
  heading: {
    fontFamily: "NaviSansBold",
    fontSize: 24,
    lineHeight: 34,
    color: colors.text,
    marginTop: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
  },
  figure: { marginVertical: 16 },
  caption: {
    fontFamily: "NaviSans",
    fontSize: 14,
    lineHeight: 23,
    color: "#adb5b8",
    textAlign: "center",
    marginTop: 12,
  },
  imageAction: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#161c21",
    padding: 8,
    borderRadius: 4,
  },
  end: {
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingTop: 24,
    marginTop: 32,
  },
});
