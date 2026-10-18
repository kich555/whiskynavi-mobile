import { PageHero } from "@/components/native/brand";
import { statusLabel } from "@/lib/status-label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import {
  getApiBottlesReservationsNotices,
  getApiBottlesReservationsNoticesRecentEnded,
  getApiBottlesReservationsNoticesNoticeid,
  getApiBottlesReservationsApplicationsMe,
  getApiBottlesReservationsApplicationsApplicationidNotice,
  getApiBusinessesBusinessidBottlesReservationsApplications,
  getApiUsersBusinessesMe,
  getApiUsersBusinessesPickupLocations,
  postApiBottlesReservationsNoticesNoticeidApplications,
  putApiBottlesReservationsApplicationsApplicationid,
  deleteApiBottlesReservationsApplicationsApplicationid,
  postApiBusinessesBusinessidBottlesReservationsNoticesNoticeidApplications,
  putApiBusinessesBusinessidBottlesReservationsApplicationsApplicationid,
  deleteApiBusinessesBusinessidBottlesReservationsApplicationsApplicationid,
} from "@/apis/generated/api";
import {
  Action,
  Gallery,
  Heading,
  Label,
  Loading,
  Message,
  NavLink,
  PagedList,
  Photo,
  Quantity,
  RequireAuth,
  Screen,
  confirmAction,
  date,
  money,
  styles,
  useTask,
} from "@/components/native/ui";
import { RichContent } from "@/components/native/rich-content";
import { useSession } from "@/lib/providers";
import { formatReservationRole, getNoticeStatus } from "./policy";

export function ReservationsScreen() {
  const { signedIn } = useSession();
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ["reservation-notices", page],
    enabled: signedIn,
    queryFn: () => getApiBottlesReservationsNotices({ page, size: 20 }),
  });
  const recent = useQuery({
    queryKey: ["reservation-ended"],
    enabled: signedIn,
    queryFn: () => getApiBottlesReservationsNoticesRecentEnded(),
  });
  if (!signedIn)
    return (
      <Screen contentStyle={{ paddingTop: 0 }}>
        <PageHero
          title="예약하기"
          subtitle="위스키내비의 신규 출시 제품을 예약하세요."
        />
        <View
          style={{
            padding: 32,
            paddingVertical: 64,
            gap: 16,
            borderWidth: 1,
            borderColor: "#ffffff1a",
            alignItems: "center",
          }}
        >
          <Heading>로그인이 필요한 서비스입니다</Heading>
          <Label muted>예약 서비스를 이용하시려면 로그인해 주세요.</Label>
          <NavLink href="/sign-in?callbackUrl=%2Freservation">
            로그인하고 계속하기
          </NavLink>
        </View>
      </Screen>
    );
  return (
    <PagedList
      intro={
        <PageHero
          title="예약하기"
          subtitle="위스키내비의 신규 출시 제품을 예약하세요."
        />
      }
      title="위스키 예약"
      page={page}
      onPage={setPage}
      hasNext={page + 1 < (query.data?.data.page?.totalPages ?? 0)}
      items={query.data?.data.content ?? []}
      loading={query.isFetching}
      error={query.error}
      refresh={() => void query.refetch()}
      header={
        <View style={{ gap: 12 }}>
          <NavLink href="/my-page?tab=reservations">내 예약 확인</NavLink>
          {recent.data?.data.length ? (
            <>
              <Heading>최근 종료된 예약</Heading>
              {recent.data.data.map((item) => (
                <NavLink key={item.id} href={`/reservation/${item.id}`}>
                  {item.noticeName}
                </NavLink>
              ))}
            </>
          ) : null}
        </View>
      }
      renderItem={(notice) => (
        <>
          <Photo
            uri={notice.bottleImgUrl}
            label={notice.bottleName ?? "예약 위스키"}
          />
          <NavLink href={`/reservation/${notice.id}`}>
            {notice.noticeName ?? notice.bottleName}
          </NavLink>
          <Label muted>
            {date(notice.reservationStartAt)} ~ {date(notice.reservationEndAt)}
          </Label>
          <Label>{money(notice.price)}</Label>
        </>
      )}
    />
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
  const active = notice && getNoticeStatus(notice) === "active";
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
    <Screen
      title={notice?.noticeName ?? "예약 상세"}
      refresh={() => void query.refetch()}
      refreshing={query.isFetching}
    >
      <Message
        error={
          !valid
            ? "예약 번호가 올바르지 않습니다."
            : (query.error ?? task.error)
        }
      />
      {query.isLoading ? <Loading /> : null}
      {notice ? (
        <>
          <Gallery
            images={[notice.bottleImgUrl, ...(notice.imageUrls ?? [])]}
            label={notice.bottleName ?? "예약 위스키"}
          />
          <Heading>{notice.bottleName}</Heading>
          <Label>{money(notice.price)}</Label>
          {notice.supplyPrice != null ? (
            <Label>공급가 {money(notice.supplyPrice)}</Label>
          ) : null}
          <Label muted>
            {date(notice.reservationStartAt)} ~ {date(notice.reservationEndAt)}
          </Label>
          <RichContent html={notice.description} />
          {notice.gradeConditions?.map((condition, i) => (
            <Label key={i} muted>
              {formatReservationRole(condition.requiredRole)} ·{" "}
              {date(condition.applicableFrom)}
            </Label>
          ))}
          {related ? (
            <Label>예약 신청 이력으로 조회한 읽기 전용 공고입니다.</Label>
          ) : (
            <>
              <Message
                error={businesses.error ?? locations.error ?? mine.error}
              />
              <Heading>신청 유형</Heading>
              {!businesses.data?.data.length ? <Label>개인 예약</Label> : null}
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
                  {locations.data?.map((location) => (
                    <Action
                      key={location.id}
                      secondary={pickup !== location.id}
                      title={`${location.businessName} · ${location.pickupAddress}`}
                      onPress={() => setPickup(location.id)}
                    />
                  ))}
                </>
              ) : (
                <Label muted>
                  픽업 업장은 관리자 배정 또는 신청 사업장 기준으로 적용됩니다.
                </Label>
              )}
              <Quantity value={quantity} onChange={setQuantity} max={max} />
              {existing ? (
                <View style={styles.section}>
                  <Label>
                    신청 수량 {existing.quantity}병 ·{" "}
                    {statusLabel(existing.status)}
                  </Label>
                  <Label muted>
                    {existing.pickupBusinessName} · {existing.pickupAddress}
                  </Label>
                  <Action
                    title="예약 정보 수정"
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
                      })
                    }
                  />
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
        </>
      ) : null}
      <NavLink href="/reservation">예약 목록</NavLink>
    </Screen>
  );
}
