import { ArchiveImageCarousel } from "@/components/native/archive-image-carousel";
import { ImageLightbox } from "@/components/native/image-lightbox";
import { HomeVideo } from "@/components/native/home-video";
import { HomeBanner } from "@/components/native/home-banner";
import type { ComponentRef } from "react";
import { useInfiniteFeed } from "@/lib/infinite-feed";
import { Search } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Image } from "expo-image";
import {
  BottleCard,
  PageHero,
  ChevronDown,
  bottleFrame,
} from "@/components/native/brand";
import {
  TextInput,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import {
  getApiBanners,
  getApiBottles,
  getApiKvStore,
  getApiBottlesBrandSeries,
  getApiBottlesId,
  getApiV2Bottles,
  getApiV2BottlesParameters,
  type GetApiV2BottlesParams,
} from "@/apis/generated/api";
import {
  colors,
  ChoiceRow,
  FilterChip,
  Action,
  Field,
  Heading,
  Label,
  Loading,
  Message,
  NavLink,
  InfiniteList,
  Screen,
  Sheet,
  go,
  money,
  styles,
} from "@/components/native/ui";
import { RichContent } from "@/components/native/rich-content";

export function HomeScreen() {
  const bannersQuery = useQuery({
    queryKey: ["home", "banners"],
    queryFn: () => getApiBanners({ page: 0, size: 10 }),
  });
  const bottlesQuery = useQuery({
    queryKey: ["home", "bottles"],
    queryFn: () =>
      getApiBottles({ page: 0, size: 8, sort: ["bottledDate,desc"] }),
  });
  const youtubeQuery = useQuery({
    queryKey: ["home", "youtube"],
    queryFn: () => getApiKvStore("youtube_embed_url"),
  });
  const { fontScale } = useWindowDimensions();
  return (
    <Screen
      refresh={() => {
        void bannersQuery.refetch();
        void bottlesQuery.refetch();
        void youtubeQuery.refetch();
      }}
      refreshing={
        bannersQuery.isFetching ||
        bottlesQuery.isFetching ||
        youtubeQuery.isFetching
      }
      contentStyle={{ padding: 0, gap: 0 }}
    >
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <NavLink href="/stories">위스키 스토리 · 칼럼과 증류소 이야기</NavLink>
      </View>
      <HomeBanner
        banners={bannersQuery.data?.data.content ?? []}
        loading={bannersQuery.isPending}
        error={bannersQuery.isError}
        retry={() => void bannersQuery.refetch()}
      />
      <View style={{ padding: 16, paddingVertical: 24, gap: 16 }}>
        <Heading>NEW ARRIVALS</Heading>
        {bottlesQuery.isPending ? (
          <Loading variant="cards" columns={fontScale > 1.3 ? 1 : 2} />
        ) : null}
        {bottlesQuery.isError ? (
          <View style={{ gap: 12 }}>
            <Message error="새 제품을 불러오지 못했어요." />
            <Action
              secondary
              title="새 제품 다시 불러오기"
              onPress={() => void bottlesQuery.refetch()}
            />
          </View>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {bottlesQuery.data?.data.content?.map((bottle) => (
            <View
              key={bottle.id}
              style={{ width: fontScale > 1.3 ? "100%" : "48.3%" }}
            >
              <BottleCard bottle={bottle} />
            </View>
          ))}
        </View>
        <Action title="전체 제품 보기" onPress={() => go("/archive")} />
      </View>
      <View
        style={{
          padding: 16,
          paddingVertical: 24,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {[
          ["OUR BRANDS", "/brand"],
          ["ARCHIVE", "/archive"],
          ["RESERVATION", "/reservation"],
          ["COMMUNITY", "/board/community"],
        ].map(([title, path]) => (
          <Pressable
            key={path}
            accessibilityRole="link"
            onPress={() => go(path)}
            style={{
              width: "48.3%",
              aspectRatio: 1,
              borderWidth: 1,
              borderColor: "#ffffff26",
              borderRadius: 16,
              backgroundColor: "#ffffff08",
              padding: 16,
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
            }}
          >
            <Text style={{ ...styles.heading, fontSize: 14 }}>{title}</Text>
            <Label muted>바로가기</Label>
          </Pressable>
        ))}
      </View>
      {youtubeQuery.isLoading ? (
        <View style={{ padding: 16 }}>
          <Loading variant="inline" label="영상 정보 불러오는 중" />
        </View>
      ) : null}
      {youtubeQuery.data?.data.value ? (
        <HomeVideo url={youtubeQuery.data.data.value} />
      ) : null}
      {youtubeQuery.isError ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Label>영상을 불러오지 못했어요.</Label>
          <Action
            secondary
            title="영상 다시 불러오기"
            onPress={() => void youtubeQuery.refetch()}
          />
        </View>
      ) : null}
      <View
        style={{
          padding: 24,
          gap: 8,
          borderTopWidth: 1,
          borderColor: colors.line,
        }}
      >
        <Image
          source={require("../../../assets/brand/logo.png")}
          contentFit="contain"
          style={{ width: 150, height: 36 }}
        />
        <Label muted>대한민국 최초의 독립병입 브랜드</Label>
        <View style={styles.row}>
          <NavLink href="/about">회사소개</NavLink>
          <NavLink href="/board/community">커뮤니티</NavLink>
          <NavLink href="/terms">이용약관</NavLink>
        </View>
      </View>
    </Screen>
  );
}
export function ArchiveScreen() {
  const params = useLocalSearchParams<{
    keyword?: string;
    brand?: string;
    series?: string;
  }>();
  return (
    <ArchiveContent
      key={JSON.stringify([params.keyword, params.brand, params.series])}
      params={params}
    />
  );
}
function ArchiveContent({
  params,
}: {
  params: { keyword?: string; brand?: string; series?: string };
}) {
  const [draft, setDraft] = useState(params.keyword ?? "");
  const [filters, setFilters] = useState<GetApiV2BottlesParams>({
    keyword: params.keyword,
    brand: params.brand ? [params.brand] : undefined,
    series: params.series ? [params.series] : undefined,
  });
  const [expanded, setExpanded] = useState(false);
  const filterRef = useRef<ComponentRef<typeof View>>(null);
  const sortRef = useRef<ComponentRef<typeof View>>(null);
  const { fontScale } = useWindowDimensions();
  const resetFilters = () => {
    setFilters({});
    setDraft("");
  };
  const [sortOpen, setSortOpen] = useState(false);
  const query = useInfiniteFeed({
    queryKey: ["bottles", filters],
    queryFn: async (page) =>
      (await getApiV2Bottles({ ...filters, page, size: 20 })).data,
  });
  const parameters = useQuery({
    queryKey: ["bottle-parameters"],
    queryFn: () => getApiV2BottlesParameters(),
  });
  const update = (next: Partial<GetApiV2BottlesParams>) => {
    setFilters({ ...filters, ...next });
  };
  return (
    <InfiniteList
      skeleton={<Loading variant="cards" columns={fontScale > 1.3 ? 1 : 2} />}
      columns={fontScale > 1.3 ? 1 : 2}
      title="아카이브"
      intro={
        <PageHero
          title="아카이브"
          subtitle="위스키내비에서 발매한 모든 제품을 둘러보세요."
        />
      }
      {...query.feed}
      header={
        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              height: 48,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.surface,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="검색"
              onPress={() => update({ keyword: draft.trim() })}
              style={{
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Search size={16} color={colors.muted} />
            </Pressable>
            <TextInput
              accessibilityLabel="위스키 검색"
              placeholder="보틀명, 증류소로 검색하세요"
              placeholderTextColor={colors.muted}
              style={{
                flex: 1,
                height: 48,
                color: colors.text,
                fontFamily: "NaviSans",
                fontSize: 14,
                paddingRight: 12,
              }}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => update({ keyword: draft.trim() })}
              returnKeyType="search"
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {(parameters.data?.data.series ?? []).map((value) => (
              <FilterChip
                key={value}
                label={value}
                selected={filters.series?.includes(value) ?? false}
                onPress={() =>
                  update({
                    series: filters.series?.includes(value)
                      ? filters.series.filter((v) => v !== value)
                      : [...(filters.series ?? []), value],
                  })
                }
              />
            ))}
          </ScrollView>
          <Sheet
            visible={expanded}
            returnFocusRef={filterRef}
            footer={
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Action
                    secondary
                    title="필터 초기화"
                    onPress={resetFilters}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Action
                    title="결과 보기"
                    onPress={() => setExpanded(false)}
                  />
                </View>
              </View>
            }
            title="아카이브 필터"
            onDismiss={() => setExpanded(false)}
          >
            <View style={{ gap: 14 }}>
              <Message error={parameters.error} />
              {parameters.isLoading ? (
                <Loading variant="rows" count={3} label="필터 불러오는 중" />
              ) : null}
              {(
                [
                  "company",
                  "brand",
                  "series",
                  "maltType",
                  "distillery",
                  "caskType",
                ] as const
              ).map((key) => (
                <FilterOptions
                  key={key}
                  title={
                    {
                      company: "회사",
                      brand: "브랜드",
                      series: "시리즈",
                      maltType: "몰트 타입",
                      distillery: "증류소",
                      caskType: "캐스크",
                    }[key]
                  }
                  values={
                    parameters.data?.data[
                      {
                        company: "companies",
                        brand: "brands",
                        series: "series",
                        maltType: "maltTypes",
                        distillery: "distilleries",
                        caskType: "caskTypes",
                      }[key] as keyof typeof parameters.data.data
                    ] ?? []
                  }
                  selected={filters[key] ?? []}
                  onChange={(value) =>
                    update({ [key]: value.length ? value : undefined })
                  }
                />
              ))}
              {(["abvFrom", "abvTo", "vintageFrom", "vintageTo"] as const).map(
                (key) => (
                  <Field
                    key={key}
                    label={
                      {
                        abvFrom: "최소 도수",
                        abvTo: "최대 도수",
                        vintageFrom: "최소 빈티지",
                        vintageTo: "최대 빈티지",
                      }[key]
                    }
                    keyboardType="numeric"
                    value={filters[key]?.toString() ?? ""}
                    onChangeText={(value) =>
                      update({ [key]: value ? Number(value) : undefined })
                    }
                  />
                ),
              )}
            </View>
          </Sheet>
          <Sheet
            visible={sortOpen}
            returnFocusRef={sortRef}
            title="정렬 기준"
            onDismiss={() => setSortOpen(false)}
          >
            {(
              [
                ["등록순", "REGISTERED"],
                ["병입순", "BOTTLED_DATE"],
                ["증류일순", "DISTILLATION_DATE"],
                ["숙성년수순", "MATURATION_AGE"],
                ["이름순", "NAME"],
              ] as const
            ).map(([label, value]) => (
              <Action
                key={value}
                title={label}
                secondary
                onPress={() => {
                  update({ sort: value });
                  setSortOpen(false);
                }}
              />
            ))}
          </Sheet>
          <View
            style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}
          >
            {[
              { title: "필터", press: () => setExpanded(true) },
              {
                title: {
                  REGISTERED: "등록순",
                  NAME: "이름순",
                  ABV: "도수순",
                  BOTTLED_DATE: "병입순",
                  DISTILLATION_DATE: "증류일순",
                  MATURATION_AGE: "숙성년수순",
                }[filters.sort ?? "BOTTLED_DATE"],
                press: () => setSortOpen(true),
              },
              {
                title: filters.direction === "ASC" ? "오름차순" : "내림차순",
                press: () =>
                  update({
                    direction: filters.direction === "ASC" ? "DESC" : "ASC",
                  }),
              },
            ].map((item) => (
              <Pressable
                key={item.title}
                ref={
                  item.title === "필터"
                    ? filterRef
                    : item.title === "오름차순" || item.title === "내림차순"
                      ? undefined
                      : sortRef
                }
                accessibilityState={{
                  expanded:
                    item.title === "필터"
                      ? expanded
                      : item.title === "오름차순" || item.title === "내림차순"
                        ? undefined
                        : sortOpen,
                }}
                accessibilityRole="button"
                onPress={item.press}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderWidth: 1,
                  borderColor: colors.line,
                  borderRadius: 16,
                  backgroundColor: "#ffffff08",
                  borderTopColor: "#ffffff33",
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ ...styles.text, fontSize: 12 }}>
                  {item.title}
                </Text>
                <ChevronDown size={14} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>
      }
      renderItem={(bottle) => <BottleCard bottle={bottle} />}
    />
  );
}
export function BottleScreen() {
  const [expandedImage, setExpandedImage] = useState<string>();
  const { bottleId } = useLocalSearchParams<{ bottleId: string }>();
  const id = Number(bottleId);
  const valid =
    /^\d+$/.test(bottleId ?? "") && Number.isSafeInteger(id) && id > 0;
  const query = useQuery({
    queryKey: ["bottle", id],
    queryFn: () => getApiBottlesId(id),
    enabled: valid,
  });
  const bottle = query.data?.data;
  return (
    <Screen>
      <Message
        error={!valid ? "보틀 번호가 올바르지 않습니다." : query.error}
      />
      {query.isLoading ? <Loading variant="detail" /> : null}
      {bottle ? (
        <View
          style={{
            ...bottleFrame,
            backgroundColor: colors.surface,
            padding: 16,
            gap: 24,
          }}
        >
          <ArchiveImageCarousel
            images={[bottle.imgUrl, ...(bottle.imageUrls ?? [])]}
            label={bottle.name ?? "위스키"}
            onImagePress={setExpandedImage}
          />
          <Text style={{ ...styles.heading, fontSize: 20 }}>{bottle.name}</Text>
          <View style={{ gap: 12 }}>
            {[
              ["브랜드", bottle.brand],
              ["증류소", bottle.distillery],
              ["몰트 타입", bottle.maltType],
              ["도수", bottle.abv == null ? undefined : `${bottle.abv}%`],
              ["캐스크", bottle.caskType],
              ["캐스크 No.", bottle.caskNumber],
              [
                "용량",
                bottle.capacity == null ? undefined : `${bottle.capacity}ml`,
              ],
              ["증류일", bottle.distillationDate],
              ["병입일", bottle.bottledDate],
              ...(bottle.supplyPrice == null
                ? []
                : [["공급가", money(bottle.supplyPrice)]]),
              ...(bottle.consumerPrice == null
                ? []
                : [["권장소매가", money(bottle.consumerPrice)]]),
            ].map(([label, value]) => (
              <View
                key={label}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingBottom: 8,
                  borderBottomWidth: 1,
                  borderColor: colors.line,
                }}
              >
                <Text style={[styles.muted, { lineHeight: 14 }]}>{label}</Text>
                <Text
                  style={[
                    styles.text,
                    { flex: 1, textAlign: "right", lineHeight: 14 },
                  ]}
                >
                  {value || "-"}
                </Text>
              </View>
            ))}
          </View>
          <Heading>테이스팅 노트</Heading>
          <View
            style={{ borderWidth: 1, borderColor: colors.line, padding: 16 }}
          >
            <RichContent html={bottle.description} />
          </View>
        </View>
      ) : null}
      {expandedImage ? (
        <ImageLightbox
          key={expandedImage}
          uri={expandedImage}
          label={bottle?.name ?? "위스키"}
          onClose={() => setExpandedImage(undefined)}
        />
      ) : null}
    </Screen>
  );
}
const brandAssets = [
  {
    name: "위스키내비",
    match: "위스키내비",
    icon: require("../../../assets/brand/brands/icon-whisky-navi.png"),
    background: require("../../../assets/brand/brands/bg-whiskynavi.png"),
    subtitle: "대한민국 독립병입 시장의 선두주자",
    description:
      "당사의 대표 브랜드로, 가장 세분화된 제품 라인업을 자랑합니다.",
  },
  {
    name: "더 위스키테일즈",
    match: "위스키테일즈",
    icon: require("../../../assets/brand/brands/icon-the-whisky-tails.png"),
    background: require("../../../assets/brand/brands/bg-the-whisky-tails.png"),
    subtitle: "스토리와 테마가 있는 서브컬처 라벨 위스키",
    description:
      "라벨의 자유도를 극대화하고, 서브컬처 문화의 감성과 취향이 반영된 독창적인 스토리와 테마를 담아냅니다.",
  },
  {
    name: "트레일앤테일",
    match: "트레일",
    icon: require("../../../assets/brand/brands/icon-trail-and-tail.png"),
    background: require("../../../assets/brand/brands/bg-trail-and-tail.png"),
    subtitle: "자신만의 취향과 세계는 간직되어야 하기에",
    description:
      "단순한 '위스키'를 넘어, 취향의 흔적을 따라가는 여정(Trail)과 그 안에 담긴 이야기(Tale)를 함께 담아냅니다.",
  },
  {
    name: "투게더 인 스피릿",
    match: "투게더",
    icon: require("../../../assets/brand/brands/icon-together-in-spirit.png"),
    background: require("../../../assets/brand/brands/bg-together-in-spirit.png"),
    subtitle: "위스키로 함께하는 사회적 가치 창출",
    description:
      "주기적으로 사회적인 이슈를 선별하여 위스키 애호가들과 함께 기부 캠페인을 진행하고, 이를 기념하는 한정 보틀을 제작하여 의미 있는 가치를 공유합니다.",
  },
];
export function BrandScreen() {
  const query = useQuery({
    queryKey: ["brands"],
    queryFn: () => getApiBottlesBrandSeries(),
  });
  const { width: windowWidth } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState<number>();
  // Screen has 16px side padding; the grid has 8px padding and a 16px gap.
  const cardSize = Math.max(1, ((gridWidth ?? windowWidth - 32) - 32) / 2);
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const positions = useRef<Record<string, number>>({});
  return (
    <Screen
      scrollRef={ref}
      contentStyle={{ paddingTop: 0 }}
      refresh={() => void query.refetch()}
      refreshing={query.isFetching}
    >
      <PageHero title="브랜드" subtitle="각 브랜드별 시리즈를 만나보세요" />
      <View
        onLayout={({ nativeEvent }) => {
          if (nativeEvent.layout.width > 0)
            setGridWidth(nativeEvent.layout.width);
        }}
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 16,
          padding: 8,
          marginVertical: 32,
        }}
      >
        {brandAssets.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.name}
            testID={`brand-shortcut-${item.match}`}
            key={item.name}
            onPress={() =>
              ref.current?.scrollTo({
                y: positions.current[item.name] ?? 0,
                animated: true,
              })
            }
            style={{
              width: cardSize,
              height: cardSize,
              flexShrink: 0,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source={item.icon}
              contentFit="contain"
              contentPosition="center"
              style={{
                width: cardSize * 0.68,
                height: cardSize * 0.65,
                flexShrink: 0,
              }}
            />
          </Pressable>
        ))}
      </View>
      <Message error={query.error} />
      {query.isPending ? <Loading variant="rows" /> : null}
      {brandAssets.map((item) => (
        <View
          key={item.name}
          onLayout={(e) => {
            positions.current[item.name] = e.nativeEvent.layout.y;
          }}
        >
          <BrandSection
            visual={item}
            data={query.data?.data.find((b) =>
              b.brand?.replace(/\s/g, "").includes(item.match),
            )}
          />
        </View>
      ))}
    </Screen>
  );
}
function BrandSection({
  visual,
  data,
}: {
  visual: (typeof brandAssets)[number];
  data?: import("@/apis/generated/api").BottleBrandSeriesResponse;
}) {
  const [selected, setSelected] = useState<string>();
  const [picker, setPicker] = useState(false);
  const series =
    data?.series?.find((s) => s.name === selected) ?? data?.series?.[0];
  const products = useQuery({
    queryKey: ["brand-products", data?.brand, series?.name],
    queryFn: () =>
      getApiBottles({
        brand: [data!.brand!],
        series: [series!.name!],
        size: 12,
      }),
    enabled: Boolean(data?.brand && series?.name),
  });
  return (
    <View
      style={{
        marginHorizontal: -16,
        paddingVertical: 64,
        gap: 24,
        overflow: "hidden",
      }}
    >
      <Image
        source={series?.imgUrl ? { uri: series.imgUrl } : visual.background}
        contentFit="cover"
        style={[StyleSheet.absoluteFill, { opacity: 0.2 }]}
      />
      <View style={{ paddingHorizontal: 24, gap: 16, alignItems: "center" }}>
        <Text
          style={{
            ...styles.title,
            fontSize: 30,
            fontFamily: "NaviSans",
            fontWeight: "400",
          }}
        >
          {visual.name}
        </Text>
        <Label muted>{visual.subtitle}</Label>
        <Text style={[styles.text, { textAlign: "center" }]}>
          {visual.description}
        </Text>
        {series ? (
          <Action
            secondary
            title={`${series.name} ▾`}
            onPress={() => setPicker(true)}
          />
        ) : null}
      </View>
      <Sheet
        visible={picker}
        title="시리즈 선택"
        onDismiss={() => setPicker(false)}
      >
        {data?.series?.map((item) => (
          <Action
            key={item.name}
            secondary
            title={item.name ?? "시리즈"}
            onPress={() => {
              setSelected(item.name ?? undefined);
              setPicker(false);
            }}
          />
        ))}
      </Sheet>
      {products.isLoading ? (
        <View style={{ paddingHorizontal: 24 }}>
          <Loading
            variant="cards"
            columns={2}
            count={2}
            label="브랜드 상품 불러오는 중"
          />
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 48, gap: 16 }}
      >
        {products.data?.data.content?.map((bottle) => (
          <View
            key={bottle.id}
            style={{ width: 240, backgroundColor: colors.surface }}
          >
            <BottleCard bottle={bottle} />
          </View>
        ))}
      </ScrollView>
      {data?.brand ? (
        <View style={{ alignItems: "center" }}>
          <NavLink
            href={`/archive?brand=${encodeURIComponent(data.brand)}&series=${encodeURIComponent(series?.name ?? "")}`}
          >
            {series?.name} 제품 보러가기
          </NavLink>
        </View>
      ) : null}
    </View>
  );
}

function FilterOptions({
  title,
  values,
  selected,
  onChange,
}: {
  title: string;
  values: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(title === "브랜드");
  const [search, setSearch] = useState("");
  return (
    <View
      style={{
        gap: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderColor: colors.line,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}${selected.length ? ` (${selected.length})` : ""}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={({ pressed }) => ({
          minHeight: 48,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={[styles.heading, { fontSize: 16 }]}>{title}</Text>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Text style={styles.muted}>
            {selected.length ? `${selected.length}개 선택` : "전체"}
          </Text>
          <ChevronDown
            color={colors.muted}
            size={18}
            style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
          />
        </View>
      </Pressable>
      {open ? (
        <>
          <Field
            label={`${title} 검색`}
            value={search}
            onChangeText={setSearch}
          />
          {values
            .filter((value) =>
              value.toLowerCase().includes(search.toLowerCase()),
            )
            .slice(0, 100)
            .map((value) => (
              <ChoiceRow
                key={value}
                label={value}
                checked={selected.includes(value)}
                onChange={(checked) =>
                  onChange(
                    checked
                      ? [...selected, value]
                      : selected.filter((item) => item !== value),
                  )
                }
              />
            ))}
        </>
      ) : null}
    </View>
  );
}
