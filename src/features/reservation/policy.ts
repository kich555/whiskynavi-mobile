import type { UserBottleReservationNoticePublicResponse } from "@/apis/generated/api";

export type NoticeStatus = "pending" | "active" | "applied" | "closed";
const RESERVATION_ROLE_LABEL_MAP: Record<string, string> = {
  ROLE_GUEST: "게스트",
  ROLE_USER: "일반 회원",
  ROLE_ADMIN: "관리자",
  ROLE_SUPER_ADMIN: "총괄 관리자",
  ROLE_CONSUMER: "소비자",
  ROLE_WHISKYNAVI_MEMBER: "위스키내비 멤버",
  ROLE_WHISKYTALES_MEMBER: "위스키테일즈 멤버",
  ROLE_BLIND_MEMBER: "블라인드 멤버",
  ROLE_BUSINESS: "업장 회원",
  ROLE_TRAILNTALE_BUSINESS: "트레일앤테일 업장",
  ROLE_COMMUNITY_BUSINESS: "커뮤니티 업장",
  ROLE_PICK_UP_BUSINESS: "픽업 업장",
};

export function formatReservationRole(role?: string): string {
  // API에 새 권한 값이 추가되어도 화면이 비지 않도록 원본 값을 fallback으로 사용한다.
  if (!role) return "-";
  return RESERVATION_ROLE_LABEL_MAP[role] ?? role;
}

const HAS_TIMEZONE_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/;

// 백엔드는 reservationStartAt/EndAt을 타임존 오프셋 없는 문자열로 내려준다(예: "2026-07-06T10:40:00").
// 오프셋이 없으면 Date는 실행 환경의 로컬 타임존으로 해석하므로, 배포 서버(TZ=UTC)와
// 브라우저(KST)가 같은 문자열을 9시간 다르게 해석해 판정이 어긋난다. 이를 막기 위해
// 오프셋이 없는 문자열은 항상 KST(+09:00)로 명시해서 파싱한다.
function parseNoticeDateTime(dateStr: string): number {
  const isoWithOffset = HAS_TIMEZONE_OFFSET.test(dateStr)
    ? dateStr
    : `${dateStr}+09:00`;
  return new Date(isoWithOffset).getTime();
}

export function getNoticeStatus(
  notice: UserBottleReservationNoticePublicResponse,
  now: number = Date.now(),
): NoticeStatus {
  const start = notice.reservationStartAt
    ? parseNoticeDateTime(notice.reservationStartAt)
    : null;
  const end = notice.reservationEndAt
    ? parseNoticeDateTime(notice.reservationEndAt)
    : null;

  if (end !== null && now >= end) return "closed";
  if (start !== null && now < start) return "pending";
  return "active";
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date
    .toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/\. /g, "-")
    .replace(".", "")
    .replace(", ", " ");
}

export function calculateTimeRemaining(
  targetDate: Date,
  now: number = Date.now(),
): string {
  const diff = targetDate.getTime() - now;
  if (diff <= 0) return "00일 00시간 00분 00초";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${String(days).padStart(2, "0")}일 ${String(hours).padStart(2, "0")}시간 ${String(minutes).padStart(2, "0")}분 ${String(seconds).padStart(2, "0")}초`;
}

export function getStatusBadge(status: NoticeStatus) {
  switch (status) {
    case "closed":
      return { label: "예약 종료됨", className: "bg-gray-600" };
    case "pending":
      return { label: "예약 대기 중", className: "bg-orange-600" };
    case "active":
      return { label: "예약 진행 중", className: "bg-blue-600" };
    case "applied":
      return { label: "예약신청완료", className: "bg-green-600" };
  }
}

export function buildInfoItems(
  notice: UserBottleReservationNoticePublicResponse,
  options?: { hideAvailableQuantity?: boolean; hasBusinessRole?: boolean },
) {
  return [
    { label: "브랜드", value: notice.bottleBrand },
    {
      label: "소매가",
      value: notice.price != null ? `${notice.price.toLocaleString()}원` : null,
    },
    ...(options?.hasBusinessRole
      ? [
          {
            label: "공급가",
            value:
              notice.supplyPrice != null
                ? `${notice.supplyPrice.toLocaleString()}원`
                : null,
          },
        ]
      : []),
    {
      label: "가용 수량",
      value:
        options?.hideAvailableQuantity || notice.availableQuantity == null
          ? null
          : `${notice.availableQuantity}병`,
    },
  ].filter(
    (item): item is { label: string; value: string } => item.value != null,
  );
}
