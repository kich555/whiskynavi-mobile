import { decorativeIconAccessibility } from "@/lib/icon-accessibility";
import { getApiBoardsAnnouncementsGlobal } from "@/apis/generated/api";
import {
  InfiniteList,
  SurfaceLink,
  Label,
  Heading,
  colors,
} from "@/components/native/ui";
import { useInfiniteFeed } from "@/lib/infinite-feed";
import { Platform, View, Text } from "react-native";
import { Pin, ChevronRight } from "lucide-react-native";

export function NoticesScreen() {
  const query = useInfiniteFeed({
    queryKey: ["global-notices"],
    queryFn: async (page) =>
      (await getApiBoardsAnnouncementsGlobal({ page, size: 20 })).data,
  });
  return (
    <InfiniteList
      compact
      title="공지"
      {...query.feed}
      emptyText="등록된 공지가 없습니다."
      header={<Label muted>서비스 이용에 필요한 안내를 확인하세요.</Label>}
      renderItem={(item) => (
        <SurfaceLink
          href={`/notices/${item.id}`}
          testID={`notice-row-${item.id}`}
          style={{
            paddingVertical: 20,
            gap: 10,
            borderBottomWidth: 1,
            borderColor: colors.line,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {item.pinned ? (
              <Pin
                size={15}
                color={colors.muted}
                {...decorativeIconAccessibility(Platform.OS)}
              />
            ) : null}
            <View style={{ flex: 1 }}>
              <Heading>{item.title}</Heading>
            </View>
            <ChevronRight
              size={18}
              color={colors.muted}
              {...decorativeIconAccessibility(Platform.OS)}
            />
          </View>
          <Text
            style={{
              fontFamily: "NaviSans",
              fontSize: 12,
              color: colors.muted,
            }}
          >
            {(item.publishedAt ?? item.createdAt)
              ?.slice(0, 10)
              .replaceAll("-", ".")}
          </Text>
        </SurfaceLink>
      )}
    />
  );
}
