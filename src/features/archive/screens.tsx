import { Search } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { BottleCard, PageHero, ChevronDown } from "@/components/native/brand";
import {
  Linking,
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
  Action,
  Field,
  Gallery,
  Heading,
  Label,
  Loading,
  Message,
  NavLink,
  PagedList,
  Screen,
  Sheet,
  Toggle,
  go,
  money,
  styles,
} from "@/components/native/ui";
import { RichContent } from "@/components/native/rich-content";

export function HomeScreen() {
  const query = useQuery({
    queryKey: ["home"],
    queryFn: async () => {
      const [banners, bottles, youtube] = await Promise.all([
        getApiBanners({ page: 0, size: 10 }),
        getApiBottles({ page: 0, size: 8, sort: ["bottledDate,desc"] }),
        getApiKvStore("youtube_embed_url").catch(() => ({
          data: { value: "" },
        })),
      ]);
      return {
        banners: banners.data.content ?? [],
        bottles: bottles.data.content ?? [],
        youtube: youtube.data.value ?? "",
      };
    },
  });
  const [slide, setSlide] = useState(0);
  const { height } = useWindowDimensions();
  const banners = query.data?.banners ?? [];
  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(
      () => setSlide((n) => (n + 1) % banners.length),
      5000,
    );
    return () => clearInterval(id);
  }, [banners.length]);
  const banner = banners[slide % Math.max(banners.length, 1)];
  return (
    <Screen
      refresh={() => void query.refetch()}
      refreshing={query.isFetching}
      contentStyle={{ padding: 0, gap: 0 }}
    >
      <View
        style={{
          height: Math.max(520, height - 128),
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <Image
          source={
            banner?.backgroundUrl
              ? { uri: banner.backgroundUrl }
              : require("../../../assets/brand/bg-sample.png")
          }
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: "#00000080" }]}
        />
        {query.isPending ? (
          <Loading />
        ) : (
          <View style={{ alignItems: "center", gap: 12 }}>
            <Text
              style={{
                fontFamily: "NaviSansMedium",
                fontSize: 20,
                lineHeight: 28,
                textAlign: "center",
                color: "white",
              }}
            >
              {banner?.title ?? "배너가 준비 중입니다"}
            </Text>
            {banner?.description ? (
              <Text
                style={{
                  ...styles.text,
                  textAlign: "center",
                  color: "#ffffffe6",
                }}
              >
                {banner.description}
              </Text>
            ) : null}
            {banner ? (
              <Action
                title="자세히 보기"
                onPress={() => {
                  if (
                    banner.link?.startsWith("/") &&
                    !banner.link.startsWith("//")
                  )
                    go(banner.link);
                  else if (/^https:\/\//.test(banner.link ?? ""))
                    void Linking.openURL(banner.link!);
                }}
              />
            ) : null}
          </View>
        )}
        <View style={{ position: "absolute", right: 8, top: "45%", gap: 0 }}>
          {banners.map((item, i) => (
            <Pressable
              key={item.id ?? i}
              accessibilityLabel={`배너 ${i + 1}`}
              onPress={() => setSlide(i)}
              style={{
                width: 28,
                height: 32,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 2,
                  height: slide === i ? 16 : 3,
                  backgroundColor: slide === i ? "white" : "#ffffff60",
                }}
              />
            </Pressable>
          ))}
        </View>
        <View style={{ position: "absolute", bottom: 16 }}>
          <ChevronDown size={24} color="#ffffff80" />
        </View>
      </View>
      <View style={{ padding: 16, paddingVertical: 24, gap: 16 }}>
        <Message error={query.error} />
        <Heading>NEW ARRIVALS</Heading>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {query.data?.bottles.map((bottle) => (
            <View key={bottle.id} style={{ width: "48.3%" }}>
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
              borderColor: colors.line,
              backgroundColor: colors.surface,
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
      {query.data?.youtube &&
      /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(
        query.data.youtube,
      ) ? (
        <View style={{ padding: 16, gap: 16 }}>
          <Heading>YOUTUBE</Heading>
          <Action
            secondary
            title="위스키내비 영상 보기"
            onPress={() => void Linking.openURL(query.data!.youtube)}
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
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const query = useQuery({
    queryKey: ["bottles", filters, page],
    queryFn: () => getApiV2Bottles({ ...filters, page, size: 20 }),
  });
  const parameters = useQuery({
    queryKey: ["bottle-parameters"],
    queryFn: () => getApiV2BottlesParameters(),
  });
  const update = (next: Partial<GetApiV2BottlesParams>) => {
    setFilters({ ...filters, ...next });
    setPage(0);
  };
  return (
    <PagedList
      columns={2}
      title="아카이브"
      intro={
        <PageHero
          title="아카이브"
          subtitle="위스키내비에서 발매한 모든 제품을 둘러보세요."
        />
      }
      page={page}
      onPage={setPage}
      hasNext={page + 1 < (query.data?.data.page?.totalPages ?? 0)}
      items={query.data?.data.content ?? []}
      loading={query.isFetching}
      error={query.error}
      refresh={() => void query.refetch()}
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
                width: 44,
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
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{
                  selected: filters.series?.includes(value),
                }}
                onPress={() =>
                  update({
                    series: filters.series?.includes(value)
                      ? filters.series.filter((v) => v !== value)
                      : [...(filters.series ?? []), value],
                  })
                }
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.line,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: filters.series?.includes(value)
                    ? "white"
                    : colors.surface,
                }}
              >
                <Text
                  style={{
                    fontFamily: "NaviSansMedium",
                    fontSize: 12,
                    color: filters.series?.includes(value)
                      ? colors.background
                      : "white",
                  }}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Sheet
            visible={expanded}
            title="아카이브 필터"
            onDismiss={() => setExpanded(false)}
          >
            <View style={{ gap: 14 }}>
              <Message error={parameters.error} />
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
              <Action
                secondary
                title="필터 초기화"
                onPress={() => {
                  setFilters({});
                  setDraft("");
                  setPage(0);
                }}
              />
            </View>
          </Sheet>
          <Sheet
            visible={sortOpen}
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
                accessibilityRole="button"
                onPress={item.press}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderWidth: 1,
                  borderColor: colors.line,
                  borderRadius: 8,
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
      {query.isLoading ? <Loading /> : null}
      {bottle ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            padding: 16,
            gap: 24,
          }}
        >
          <Gallery
            images={[bottle.imgUrl, ...(bottle.imageUrls ?? [])]}
            label={bottle.name ?? "위스키"}
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
      <NavLink href="/archive">목록으로 돌아가기</NavLink>
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
  const ref = useRef<ScrollView>(null);
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
            key={item.name}
            onPress={() =>
              ref.current?.scrollTo({
                y: positions.current[item.name] ?? 0,
                animated: true,
              })
            }
            style={{
              width: "47%",
              aspectRatio: 1,
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
              style={{ width: "68%", height: "65%" }}
            />
          </Pressable>
        ))}
      </View>
      <Message error={query.error} />
      {query.isPending ? <Loading /> : null}
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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  return (
    <View style={styles.section}>
      <Action
        secondary
        title={`${title}${selected.length ? ` (${selected.length})` : ""}`}
        onPress={() => setOpen(!open)}
      />
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
              <Toggle
                key={value}
                label={value}
                value={selected.includes(value)}
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
