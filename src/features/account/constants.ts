import {
  UserOrderResponseFulfillmentMethod,
  UserOrderResponseOrderStatus,
  UserOrderResponseSaleTiming,
} from "@/apis/generated/api";

export const ORDER_STATUS_MAP: Record<
  string,
  { label: string; colorClass: string }
> = {
  [UserOrderResponseOrderStatus.ORDER_REQUESTED]: {
    label: "주문 접수",
    colorClass: "border-yellow-600/30 bg-yellow-600/20 text-yellow-400",
  },
  [UserOrderResponseOrderStatus.PAYMENT_PENDING]: {
    label: "결제 대기",
    colorClass: "border-orange-600/30 bg-orange-600/20 text-orange-400",
  },
  [UserOrderResponseOrderStatus.ORDER_PREPARING]: {
    label: "준비 중",
    colorClass: "border-blue-600/30 bg-blue-600/20 text-blue-400",
  },
  [UserOrderResponseOrderStatus.PAYMENT_COMPLETED]: {
    label: "결제 완료",
    colorClass: "border-blue-600/30 bg-blue-600/20 text-blue-400",
  },
  [UserOrderResponseOrderStatus.SHIPPING]: {
    label: "배송중",
    colorClass: "border-blue-600/30 bg-blue-600/20 text-blue-400",
  },
  [UserOrderResponseOrderStatus.DELIVERY_COMPLETED]: {
    label: "배송완료",
    colorClass: "border-green-600/30 bg-green-600/20 text-green-400",
  },
  [UserOrderResponseOrderStatus.RECEIPT_PENDING]: {
    label: "수령 대기",
    colorClass: "border-purple-600/30 bg-purple-600/20 text-purple-400",
  },
  [UserOrderResponseOrderStatus.RECEIPT_COMPLETED]: {
    label: "수령완료",
    colorClass: "border-green-600/30 bg-green-600/20 text-green-400",
  },
  [UserOrderResponseOrderStatus.ORDER_CANCELED]: {
    label: "주문 취소",
    colorClass: "border-red-600/30 bg-red-600/20 text-red-400",
  },
  [UserOrderResponseOrderStatus.CANCEL_REQUESTED]: {
    label: "취소 요청",
    colorClass: "border-red-600/30 bg-red-600/20 text-red-400",
  },
  [UserOrderResponseOrderStatus.CANCEL_REJECTED]: {
    label: "취소 거절",
    colorClass: "border-amber-600/30 bg-amber-600/20 text-amber-400",
  },
};

const CANCELABLE_STATUSES = new Set<string>([
  UserOrderResponseOrderStatus.ORDER_REQUESTED,
  UserOrderResponseOrderStatus.PAYMENT_PENDING,
  UserOrderResponseOrderStatus.ORDER_PREPARING,
]);

const RECEIPT_COMPLETABLE_STATUSES = new Set<string>([
  UserOrderResponseOrderStatus.ORDER_PREPARING,
  UserOrderResponseOrderStatus.PAYMENT_COMPLETED,
  UserOrderResponseOrderStatus.RECEIPT_PENDING,
]);

export function isOrderCancellationAllowed(
  orderStatus?: string,
  saleTiming?: string,
  smartOrder = false,
): boolean {
  return (
    saleTiming !== UserOrderResponseSaleTiming.RESERVATION &&
    orderStatus !== undefined &&
    (CANCELABLE_STATUSES.has(orderStatus) ||
      (smartOrder && orderStatus === "RECEIPT_PENDING"))
  );
}

export function isReceiptCompletionAllowed(
  orderStatus?: string,
  fulfillmentMethod?: string,
): boolean {
  return (
    fulfillmentMethod === UserOrderResponseFulfillmentMethod.PICKUP &&
    orderStatus !== undefined &&
    RECEIPT_COMPLETABLE_STATUSES.has(orderStatus)
  );
}

export const MEMBERSHIP_ROLE = {
  NAVI: "ROLE_WHISKYNAVI_MEMBER",
  TALES: "ROLE_WHISKYTALES_MEMBER",
} as const;

export const MEMBERSHIP_INFO = {
  navi: {
    name: "위스키내비",
    subtitle: "WHISKY NAVI",
    badgeLabel: "NAVI",
    benefits: [
      "싱글 캐스크 신제품 우선 구매",
      "연 2회 증류소 탐방 이벤트 참여",
      "멤버 전용 테이스팅 노트 제공",
    ],
    // TODO: 문구 바꾸기
    joinMessage:
      "프리미엄 멤버십에 가입하시면\n특별한 혜택을 누리실 수 있습니다.",
  },
  tales: {
    name: "더 위스키테일즈",
    subtitle: "THE WHISKY TALES",
    badgeLabel: "TALES",
    benefits: [
      "스토리텔링 콘텐츠 무제한 열람",
      "굿즈 구매시 5% 할인",
      "월간 큐레이션 추천",
      "특별 이벤트 초대",
    ],
    joinMessage: "TALES 멤버십에 가입하시면\n특별한 혜택을 누리실 수 있습니다.",
  },
  notice: [
    "위스키내비: 엄선된 싱글 캐스크 위스키를 우선 구매할 수 있는 프리미엄 멤버십",
    "더 위스키테일즈: 구매 및 활동에 따라 레벨이 상승하는 성장형 멤버십 (LV.1~5)",
    "두 멤버십 모두 가입 가능하며, 각각의 혜택을 함께 누릴 수 있습니다.",
  ],
} as const;

export const FAQ_DATA = [
  {
    question: "주문은 어떻게 하나요?",
    answer:
      "예약하기 페이지에서 원하는 보틀의 수량과 픽업처를 선택하여 예약 신청을 하시면, 전체 신청 수량 확인 후 배정이 진행됩니다. 배정이 완료되면 선택하신 픽업처에서 픽업하실 수 있습니다.",
  },
  {
    question: "배송은 얼마나 걸리나요?",
    answer:
      "사전 예약 후 제품이 통관되면 각 픽업처로 배송됩니다. 통관 시기는 제품마다 상이하여 정확한 일정을 사전에 안내드리기 어려우나, 배송이 시작되면 알림을 드립니다. 알림 후 픽업처마다 차이가 있을 수 있으나 일반적으로 2-3일 이내 수령이 가능합니다.",
  },
  {
    question: "멤버십 등급은 어떻게 올리나요?",
    answer:
      "위스키내비 멤버십은 연단위로 유지되며, 가입비와 필수 보틀 구매 조건이 있습니다. 그 대신 우선 배정, 우선 예약, 커뮤니티 보틀 등의 혜택을 제공합니다. 테일즈 멤버십의 경우 가입 후 영구 유지되며, 주문 수량에 따라 등급이 상승합니다. 세부적인 등급 변화 기준은 추후 업데이트 예정입니다.",
  },
  {
    question: "교환은 어떻게 하나요?",
    answer:
      "제품 수령 후 7일 이내에 하자가 발견되면 해당 부분의 사진과 자료를 고객센터로 보내주시기 바랍니다. 확인 후 반송 요청을 드리면, 소비자께서 제품을 반송해주시면 새 보틀로 교환해드립니다.",
  },
];
