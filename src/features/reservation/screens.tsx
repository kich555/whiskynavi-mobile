import { AccountSection, accountUI } from "@/components/native/account";
import { useInfiniteFeed } from "@/lib/infinite-feed";
import { PageHero } from "@/components/native/brand";
import { statusLabel } from "@/lib/status-label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  router,
  useFocusEffect,
  useIsFocused,
  useLocalSearchParams,
  type Href,
} from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft } from "lucide-react-native";
import {
  getApiBottlesReservationsNotices,
  getApiBottlesReservationsNoticesRecentEnded,
  getApiBottlesReservationsNoticesNoticeid,
  getApiBottlesReservationsApplicationsMe,
  getApiBottlesReservationsApplicationsApplicationidNotice,
  getApiBusinessesBusinessidBottlesReservationsApplications,
  getApiUsersBusinessesMe,
  getApiUsersBusinessesPickupLocations,
  type UserBottleReservationNoticePublicResponse,
  postApiBottlesReservationsNoticesNoticeidApplications,
  putApiBottlesReservationsApplicationsApplicationid,
  deleteApiBottlesReservationsApplicationsApplicationid,
  postApiBusinessesBusinessidBottlesReservationsNoticesNoticeidApplications,
  putApiBusinessesBusinessidBottlesReservationsApplicationsApplicationid,
  deleteApiBusinessesBusinessidBottlesReservationsApplicationsApplicationid,
} from "@/apis/generated/api";
import {
  Action,
  Sheet,
  SurfaceLink,
  colors,
  Gallery,
  Photo,
  Heading,
  Label,
  Loading,
  Message,
  NavLink,
  InfiniteList,
  Quantity,
  RequireAuth,
  Screen,
  confirmAction,
  money,
  styles,
  useTask,
} from "@/components/native/ui";
import { RichContent } from "@/components/native/rich-content";
import { useSession } from "@/lib/providers";
import {
  buildInfoItems,
  calculateTimeRemaining,
  formatReservationRole,
  getNoticeStatus,
  type NoticeStatus,
} from "./policy";

export function ReservationsScreen() {
  const { signedIn, ready } = useSession();
  const { fontScale } = useWindowDimensions();
  const isFocused = useIsFocused();
  const [loginOpen, setLoginOpen] = useState(true);
  const query = useInfiniteFeed({
    queryKey: ["reservation-notices"],
    enabled: signedIn,
    queryFn: async (page) =>
      (await getApiBottlesReservationsNotices({ page, size: 20 })).data,
  });
  const recent = useQuery({
    queryKey: ["reservation-ended"],
    enabled: signedIn,
    queryFn: () => getApiBottlesReservationsNoticesRecentEnded(),
  });
  if (!ready)
    return (
      <Screen>
        <Loading variant="cards" label="예약 정보 준비 중" />
      </Screen>
    );
  if (!signedIn)
    return (
      <Screen contentStyle={{ paddingTop: 0 }}>
        <PageHero
          title="예약하기"
          subtitle="위스키내비의 신규 출시 제품을 예약하세요."
        />
        <View style={reservationStyles.guest}>
          <Text
            style={[
              styles.text,
              {
                fontSize: 18,
                lineHeight: 26,
                color: colors.muted,
                textAlign: "center",
              },
            ]}
          >
            로그인이 필요한 서비스입니다
          </Text>
          <Text style={[styles.muted, { textAlign: "center" }]}>
            예약 서비스를 이용하시려면 로그인해 주세요.
          </Text>
          <NavLink href="/sign-in?callbackUrl=%2Freservation">
            로그인하기
          </NavLink>
        </View>
        <Sheet
          visible={isFocused && loginOpen}
          title="로그인이 필요합니다"
          onDismiss={() => setLoginOpen(false)}
        >
          <Label muted>예약 서비스를 이용하시려면 로그인이 필요합니다.</Label>
          <Action
            title="로그인하기"
            onPress={() => {
              setLoginOpen(false);
              router.push("/sign-in?callbackUrl=%2Freservation" as Href);
            }}
          />
          <Action title="취소" secondary onPress={() => setLoginOpen(false)} />
        </Sheet>
      </Screen>
    );
  return (
    <InfiniteList
      skeleton={<Loading variant="cards" columns={fontScale > 1.3 ? 1 : 2} />}
      intro={
        <PageHero
          title="예약하기"
          subtitle="위스키내비의 신규 출시 제품을 예약하세요."
        />
      }
      rowGap={0}
      endText=""
      title="위스키 예약"
      {...query.feed}
      columns={fontScale > 1.3 ? 1 : 2}
      columnGap={20}
      header={
        <View style={{ paddingTop: 28, paddingBottom: 8 }}>
          <Text
            accessibilityRole="header"
            style={[styles.heading, { fontSize: 20 }]}
          >
            현재 진행 중인 예약
          </Text>
        </View>
      }
      footer={
        <View style={{ gap: 16, marginTop: 24 }}>
          <Message error={recent.error} />
          {recent.isLoading ? (
            <Loading
              variant="cards"
              columns={fontScale > 1.3 ? 1 : 2}
              count={2}
              label="종료된 예약 불러오는 중"
            />
          ) : null}
          {recent.error ? (
            <Action
              secondary
              title="종료된 예약 다시 불러오기"
              onPress={() => {
                void recent.refetch();
              }}
            />
          ) : null}
          {recent.data?.data.length ? (
            <>
              <Heading>종료된 예약</Heading>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
                {recent.data.data.map((item) => (
                  <View
                    key={item.id}
                    style={{ width: fontScale > 1.3 ? "100%" : "47%" }}
                  >
                    <ReservationCard notice={item} ended />
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
      }
      renderItem={(notice) => <ReservationCard notice={notice} />}
    />
  );
}
const reservationStyles = StyleSheet.create({
  guest: {
    padding: 16,
    paddingVertical: 64,
    marginTop: 28,
    minHeight: 220,
    gap: 16,
    backgroundColor: "#ffffff0d",
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    paddingBottom: 8,
    gap: 8,
  },
  brand: {
    fontFamily: "NaviSansMedium",
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  name: {
    fontFamily: "NaviSansMedium",
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontFamily: "NaviSansMedium",
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
  },
  detail: {
    padding: 16,
    gap: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#ffffff0d",
  },
  info: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  timer: { padding: 12, borderWidth: 1, gap: 8 },
});
const statusAppearance = {
  pending: { label: "예약 대기 중", color: "#ea580c", tint: "#fb923c" },
  active: { label: "진행 중", color: "#2563eb", tint: "#60a5fa" },
  applied: { label: "예약신청완료", color: "#16a34a", tint: "#86efac" },
  closed: { label: "종료", color: "#4b5563", tint: colors.muted },
};
function StatusBadge({ status }: { status: NoticeStatus }) {
  const appearance = statusAppearance[status];
  return (
    <View
      style={[reservationStyles.badge, { backgroundColor: appearance.color }]}
    >
      <Text style={reservationStyles.badgeText}>{appearance.label}</Text>
    </View>
  );
}
function reservationDate(value?: string) {
  return value?.slice(0, 16).replace("T", " ") ?? "-";
}
function ReservationCard({
  notice,
  ended = false,
}: {
  notice: UserBottleReservationNoticePublicResponse;
  ended?: boolean;
}) {
  const status = ended
    ? "closed"
    : getNoticeStatus({
        ...notice,
        reservationStartAt:
          notice.earliestReservableAt ?? notice.reservationStartAt,
      });
  return (
    <SurfaceLink
      href={`/reservation/${notice.id}`}
      testID={`reservation-card-${notice.id}`}
      style={reservationStyles.card}
    >
      <View style={{ aspectRatio: 1, padding: 12 }}>
        <Photo
          uri={notice.bottleImgUrl}
          label={notice.bottleName ?? "예약 보틀"}
        />
      </View>
      <View style={[styles.row, { gap: 8, justifyContent: "space-between" }]}>
        <Text style={reservationStyles.brand}>{notice.bottleBrand ?? "-"}</Text>
        <StatusBadge status={status} />
      </View>
      <Text style={reservationStyles.name}>{notice.noticeName ?? "-"}</Text>
      <Text style={reservationStyles.brand}>{notice.bottleName ?? "-"}</Text>
      <View style={[styles.row, { gap: 4, justifyContent: "space-between" }]}>
        {notice.price != null ? (
          <Text style={reservationStyles.brand}>{money(notice.price)}</Text>
        ) : null}
        {!ended && notice.availableQuantity != null ? (
          <Text style={reservationStyles.brand}>
            {notice.availableQuantity}병
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          reservationStyles.brand,
          { color: ended ? colors.muted : "#60a5fa" },
        ]}
      >
        {ended ? "종료" : "마감"}: {reservationDate(notice.reservationEndAt)}
      </Text>
    </SurfaceLink>
  );
}
function useReservationClock() {
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      const timer = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(timer);
    }, []),
  );
  return now;
}
function ReservationTimer({
  notice,
  status,
  now,
}: {
  notice: UserBottleReservationNoticePublicResponse;
  status: NoticeStatus;
  now: number;
}) {
  const target =
    status === "pending"
      ? (notice.earliestReservableAt ?? notice.reservationStartAt)
      : notice.reservationEndAt;
  const color = statusAppearance[status];
  const targetDate = target
    ? new Date(
        /(Z|[+-]\d{2}:?\d{2})$/.test(target) ? target : `${target}+09:00`,
      )
    : null;
  return (
    <View
      testID="reservation-timer"
      style={[
        reservationStyles.timer,
        {
          backgroundColor: `${color.color}25`,
          borderColor: `${color.color}65`,
        },
      ]}
    >
      <Text
        style={[styles.text, { color: color.tint, fontFamily: "NaviSansBold" }]}
      >
        {status === "active"
          ? "예약 마감"
          : status === "pending"
            ? "예약 시작"
            : color.label}
      </Text>
      <Text style={[reservationStyles.brand, { color: color.tint }]}>
        {reservationDate(target)}
      </Text>
      {(status === "active" || status === "pending") && targetDate ? (
        <Text style={[styles.heading, { textAlign: "right", fontSize: 18 }]}>
          {calculateTimeRemaining(targetDate, now)}
        </Text>
      ) : null}
    </View>
  );
}
export function ReservationScreen({ related = false }: { related?: boolean }) {
  return (
    <RequireAuth>
      <ReservationContent related={related} />
    </RequireAuth>
  );
}
function ReservationContent({ related }: { related: boolean }) {
  const { noticeId, applicationId } = useLocalSearchParams<{
    noticeId?: string;
    applicationId?: string;
  }>();
  const id = Number(related ? applicationId : noticeId);
  const valid = Number.isSafeInteger(id) && id > 0;
  const [quantity, setQuantity] = useState(1);
  const [pickup, setPickup] = useState<number>();
  const [pickupOpen, setPickupOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedBusiness, setBusinessId] = useState<number>();
  const task = useTask();
  const client = useQueryClient();
  const { signedIn } = useSession();
  const query = useQuery({
    queryKey: ["reservation-notice", related, id],
    queryFn: async () =>
      related
        ? (await getApiBottlesReservationsApplicationsApplicationidNotice(id))
            .data
        : (await getApiBottlesReservationsNoticesNoticeid(id)).data,
    enabled: valid && signedIn,
  });
  const businesses = useQuery({
    queryKey: ["businesses"],
    queryFn: () => getApiUsersBusinessesMe(),
    enabled: signedIn && !related,
  });
  const businessId =
    selectedBusiness ??
    businesses.data?.data.find((item) => item.primaryBusiness)?.businessId ??
    businesses.data?.data[0]?.businessId;
  const locations = useQuery({
    queryKey: ["pickup-locations"],
    queryFn: async () => {
      const first = await getApiUsersBusinessesPickupLocations({
        page: 0,
        size: 100,
      });
      const rest = await Promise.all(
        Array.from(
          { length: Math.max(0, (first.data.page?.totalPages ?? 1) - 1) },
          (_, i) =>
            getApiUsersBusinessesPickupLocations({ page: i + 1, size: 100 }),
        ),
      );
      return [first, ...rest].flatMap((r) => r.data.content ?? []);
    },
    enabled: signedIn && !related,
  });
  const mine = useQuery({
    queryKey: ["my-reservations", businessId],
    queryFn: async () =>
      businessId
        ? ((
            await getApiBusinessesBusinessidBottlesReservationsApplications(
              businessId,
              { noticeId: id, page: 0, size: 100 },
            )
          ).data.content ?? [])
        : ((
            await getApiBottlesReservationsApplicationsMe({
              noticeId: id,
              page: 0,
              size: 100,
            })
          ).data.content ?? []),
    enabled: signedIn && !related,
  });
  const notice = query.data;
  const existing = mine.data?.find(
    (application) =>
      application.noticeId === notice?.id &&
      application.status !== "CANCELLED" &&
      application.status !== "REJECTED",
  );
  const max = notice?.maxOrderQuantity ?? 100;
  const now = useReservationClock();
  const status = notice
    ? getNoticeStatus(
        {
          ...notice,
          reservationStartAt:
            ("earliestReservableAt" in notice
              ? notice.earliestReservableAt
              : undefined) ?? notice.reservationStartAt,
        },
        now,
      )
    : "pending";
  const active = status === "active";
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["my-reservations"] }),
      query.refetch(),
    ]);
  };
  const checkWindow = async () => {
    const response = await getApiBottlesReservationsNoticesNoticeid(
      notice!.id!,
    );
    const data = response.data;
    const now = Date.parse(response.headers.get("date") ?? "") || Date.now();
    if (getNoticeStatus(data, now) !== "active")
      throw new Error("지금은 예약 신청·수정·취소 기간이 아닙니다.");
    if (quantity > (data.maxOrderQuantity ?? 100))
      throw new Error("최대 신청 수량을 초과했습니다.");
  };
  return (
    <Screen refresh={() => void query.refetch()} refreshing={query.isFetching}>
      <Message
        error={
          !valid
            ? "예약 번호가 올바르지 않습니다."
            : (query.error ?? task.error)
        }
      />
      {query.isLoading ? <Loading variant="detail" /> : null}
      {notice ? (
        <SurfaceLink
          href={related ? "/my-page?tab=reservations" : "/reservation"}
          style={[styles.row, { marginTop: 16, gap: 8 }]}
        >
          <ArrowLeft size={18} color={colors.muted} />
          <Text
            style={[
              styles.text,
              { color: colors.muted, fontFamily: "NaviSansBold" },
            ]}
          >
            {related ? "내 예약 목록으로" : "목록으로 돌아가기"}
          </Text>
        </SurfaceLink>
      ) : null}
      {notice ? (
        <View
          testID="reservation-detail"
          style={[reservationStyles.detail, related ? accountUI.panel : null]}
        >
          <View>
            <Gallery
              images={[notice.bottleImgUrl, ...(notice.imageUrls ?? [])]}
              label={notice.bottleName ?? "예약 위스키"}
              empty={
                <LinearGradient
                  colors={["#4b4b4b", "#333333"]}
                  style={{ aspectRatio: 1 }}
                />
              }
              surface={related ? colors.surface : "#303b4b"}
              imagePadding={24}
            />
            <View style={{ position: "absolute", top: 8, right: 8 }}>
              <StatusBadge status={existing ? "applied" : status} />
            </View>
          </View>
          <View style={{ gap: 16 }}>
            <Text
              accessibilityRole="header"
              style={[styles.heading, { fontSize: 20, lineHeight: 28 }]}
            >
              {notice.noticeName ?? "예약 상세"}
            </Text>
            <Label muted>{notice.bottleName}</Label>
            <View style={{ gap: 8 }}>
              {buildInfoItems(notice, {
                hideAvailableQuantity: status === "closed",
                hasBusinessRole: Boolean(businessId),
              }).map((item) => (
                <View key={item.label} style={reservationStyles.info}>
                  <Label muted>{item.label}</Label>
                  <Label>{item.value}</Label>
                </View>
              ))}
              {notice.gradeConditions?.length ? (
                <View
                  style={{
                    gap: 8,
                    paddingBottom: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                  }}
                >
                  <Label muted>예약 조건</Label>
                  {notice.gradeConditions.map((condition, i) => (
                    <Text
                      key={i}
                      style={[reservationStyles.brand, { color: "#d1d5db" }]}
                    >
                      {formatReservationRole(condition.requiredRole)} ·{" "}
                      {reservationDate(condition.applicableFrom)}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
          <ReservationTimer
            notice={notice}
            status={existing ? "applied" : status}
            now={now}
          />
          {related ? (
            <AccountSection title="예약 공고 확인">
              <Label muted>
                신청 이력에 연결된 공고입니다. 신청 수량·상태·픽업 정보는 내
                예약 목록에서 확인할 수 있어요.
              </Label>
              <NavLink href="/my-page?tab=reservations">
                내 예약 목록으로
              </NavLink>
            </AccountSection>
          ) : businesses.isLoading || locations.isLoading || mine.isLoading ? (
            <Loading variant="form" label="예약 신청 정보 불러오는 중" />
          ) : (
            <>
              <Message
                error={businesses.error ?? locations.error ?? mine.error}
              />
              {(!existing || editing) && active ? (
                <>
                  {businesses.data?.data.length ? (
                    <Heading>신청 유형</Heading>
                  ) : null}
                  {businesses.data?.data.map((business) => (
                    <Action
                      key={business.businessId}
                      secondary={businessId !== business.businessId}
                      title={`${business.businessName} 사업장으로 신청`}
                      onPress={() => {
                        setBusinessId(business.businessId);
                        setPickup(undefined);
                      }}
                    />
                  ))}
                  {!businessId ? (
                    <>
                      <Heading>픽업 업장</Heading>
                      <Action
                        secondary
                        title={
                          locations.data?.find(
                            (location) => location.id === pickup,
                          )?.businessName ?? "픽업 업장 선택"
                        }
                        onPress={() => setPickupOpen(true)}
                      />
                      {pickup ? (
                        <Label muted>
                          {
                            locations.data?.find(
                              (location) => location.id === pickup,
                            )?.pickupAddress
                          }
                        </Label>
                      ) : null}
                      <Sheet
                        visible={pickupOpen}
                        title="픽업 업장 선택"
                        onDismiss={() => setPickupOpen(false)}
                      >
                        <Message error={locations.error} />
                        {locations.isPending ? (
                          <Loading variant="rows" />
                        ) : null}
                        {locations.data?.map((location) => (
                          <Action
                            key={location.id}
                            secondary={pickup !== location.id}
                            title={`${location.businessName} · ${location.pickupAddress}`}
                            onPress={() => {
                              setPickup(location.id);
                              setPickupOpen(false);
                            }}
                          />
                        ))}
                        {!locations.isPending && !locations.data?.length ? (
                          <Label muted>선택 가능한 픽업 업장이 없습니다.</Label>
                        ) : null}
                      </Sheet>
                    </>
                  ) : (
                    <Label muted>
                      픽업 업장은 관리자 배정 또는 신청 사업장 기준으로
                      적용됩니다.
                    </Label>
                  )}
                  <Quantity value={quantity} onChange={setQuantity} max={max} />
                </>
              ) : null}
              {existing ? (
                <View style={styles.section}>
                  <Label>
                    신청 수량 {existing.quantity}병 ·{" "}
                    {statusLabel(existing.status)}
                  </Label>
                  <Label muted>
                    {existing.pickupBusinessName} · {existing.pickupAddress}
                  </Label>
                  {editing ? (
                    <>
                      <Action
                        title="변경사항 저장"
                        disabled={
                          task.pending || !active || (!businessId && !pickup)
                        }
                        onPress={() =>
                          void task.run(async () => {
                            await checkWindow();
                            if (businessId)
                              await putApiBusinessesBusinessidBottlesReservationsApplicationsApplicationid(
                                businessId,
                                existing.id!,
                                { quantity },
                              );
                            else
                              await putApiBottlesReservationsApplicationsApplicationid(
                                existing.id!,
                                { quantity, userBusinessId: pickup! },
                              );
                            await refresh();
                            setEditing(false);
                          })
                        }
                      />
                      <Action
                        secondary
                        title="수정 닫기"
                        onPress={() => setEditing(false)}
                      />
                    </>
                  ) : (
                    <Action
                      secondary
                      title="예약 정보 수정"
                      disabled={task.pending || !active}
                      onPress={() => {
                        setQuantity(existing.quantity ?? 1);
                        setPickup(existing.pickupUserBusinessId);
                        setEditing(true);
                      }}
                    />
                  )}
                  <Action
                    secondary
                    title="예약 취소"
                    disabled={task.pending || !active}
                    onPress={() =>
                      confirmAction(
                        "예약 취소",
                        "예약 신청을 취소하시겠습니까?",
                        () =>
                          void task.run(async () => {
                            await checkWindow();
                            if (businessId)
                              await deleteApiBusinessesBusinessidBottlesReservationsApplicationsApplicationid(
                                businessId,
                                existing.id!,
                              );
                            else
                              await deleteApiBottlesReservationsApplicationsApplicationid(
                                existing.id!,
                              );
                            await refresh();
                          }),
                      )
                    }
                  />
                </View>
              ) : (
                <Action
                  title={
                    active ? "예약 신청" : "현재는 예약 신청 기간이 아닙니다"
                  }
                  disabled={task.pending || !active || (!businessId && !pickup)}
                  onPress={() =>
                    void task.run(async () => {
                      await checkWindow();
                      if (businessId)
                        await postApiBusinessesBusinessidBottlesReservationsNoticesNoticeidApplications(
                          businessId,
                          notice.id!,
                          { quantity },
                        );
                      else
                        await postApiBottlesReservationsNoticesNoticeidApplications(
                          notice.id!,
                          { quantity, userBusinessId: pickup! },
                        );
                      await refresh();
                    })
                  }
                />
              )}
            </>
          )}
          {notice.description ? (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.line,
                paddingTop: 16,
              }}
            >
              <Heading>상세 안내</Heading>
              <RichContent html={notice.description} />
            </View>
          ) : null}
        </View>
      ) : null}
      <NavLink href="/reservation">예약 목록</NavLink>
    </Screen>
  );
}
