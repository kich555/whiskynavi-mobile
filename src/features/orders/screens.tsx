import { useInfiniteFeed } from "@/lib/infinite-feed";
import { statusLabel } from "@/lib/status-label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import {
  getApiV2Orders,
  getApiOrdersOrderid,
  getApiV2SmartOrdersOrderId,
  getApiOrdersGuest,
  patchApiOrdersOrderidCancel,
  patchApiOrdersGuestOrdernumberCancel,
  patchApiV2OrdersOrderidReceipt,
  postApiV2OrdersEntitlementsLookup,
  postApiV2OrdersEntitlementsUse,
  postApiOrdersGeneralItemsDeliveryCartTossConfirm,
  postApiOrdersGeneralItemsDeliveryTossConfirm,
  postApiV2TicketProductOrdersTossConfirm,
  postApiV2SmartOrdersTossConfirm,
  type UserOrderResponse,
  type UserGeneralItemDeliveryOrderResponse,
} from "@/apis/generated/api";
import {
  Package,
  CreditCard,
  Truck,
  MessageCircle,
  CircleCheck,
  CircleX,
} from "lucide-react-native";
import {
  AccountSection,
  HistoryCard,
  InfoPair,
  StatusPill,
  accountUI,
  type StatusTone,
} from "@/components/native/account";
import {
  colors,
  Action,
  Field,
  Heading,
  Label,
  Loading,
  Message,
  NavLink,
  InfiniteList,
  RequireAuth,
  Screen,
  confirmAction,
  date,
  money,
  useTask,
} from "@/components/native/ui";
import { useSession } from "@/lib/providers";
import { providerFlow, type PaymentChannel } from "@/lib/provider-flow";
import { storage } from "@/lib/storage";
import {
  isOrderCancellationAllowed,
  isReceiptCompletionAllowed,
  ORDER_STATUS_MAP,
} from "@/features/account/constants";

function orderTone(status?: string): StatusTone {
  if (status && /CANCEL|REFUND|FAIL/.test(status)) return "danger";
  if (status && /COMPLETED/.test(status)) return "positive";
  if (status && /PENDING|REQUESTED/.test(status)) return "warning";
  return "neutral";
}
export function OrdersList({ ticketOnly = false }: { ticketOnly?: boolean }) {
  const { signedIn } = useSession();
  const query = useInfiniteFeed({
    queryKey: ["orders", ticketOnly],
    queryFn: async (page) =>
      (
        await getApiV2Orders({
          page,
          size: 20,
          ticketOnly: ticketOnly ? true : undefined,
        })
      ).data,
    enabled: signedIn,
  });
  return (
    <RequireAuth>
      <InfiniteList
        title={ticketOnly ? "내 이용권 주문" : "주문 내역"}
        {...query.feed}
        compact
        header={
          <Label muted>
            {ticketOnly
              ? "구매한 이용권과 사용 정보를 확인하세요."
              : "주문 상태와 배송·수령 정보를 확인하세요."}
          </Label>
        }
        renderItem={(order) => (
          <HistoryCard
            href={
              order.smartOrder
                ? `/smart-orders/${order.id}`
                : `${ticketOnly ? "/my-page/ticket-orders" : "/my-page/order"}/${order.id}`
            }
            title={
              order.itemName ??
              order.itemsSummary ??
              order.saleTitle ??
              order.orderNumber ??
              "주문 내역"
            }
            eyebrow={date(order.createdAt)}
            badge={
              <StatusPill
                label={
                  ORDER_STATUS_MAP[order.orderStatus ?? ""]?.label ??
                  order.orderStatus ??
                  "상태 확인"
                }
                tone={orderTone(order.orderStatus)}
              />
            }
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "baseline",
              }}
            >
              <Text style={accountUI.price}>{money(order.totalPrice)}</Text>
              <Text style={accountUI.caption}>
                {order.totalQuantity ?? order.requestedQuantity ?? "—"}개
              </Text>
            </View>
            <View style={accountUI.divider} />
            <Text style={accountUI.caption}>주문번호 {order.orderNumber}</Text>
          </HistoryCard>
        )}
      />
    </RequireAuth>
  );
}
function Entitlements({
  order,
  guestToken,
}: {
  order: UserOrderResponse;
  guestToken?: string;
}) {
  const task = useTask();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["entitlements", order.id, Boolean(guestToken)],
    queryFn: () =>
      postApiV2OrdersEntitlementsLookup({
        orderId: order.id!,
        guestOrderToken: guestToken,
      }),
    enabled:
      Boolean(order.id) &&
      Boolean(
        order.fulfillmentMethod === "TICKET" ||
        order.ticketProductId ||
        order.items?.some((item) => Boolean(item.ticketProductId)),
      ),
  });
  const labels: Record<string, string> = {
    AVAILABLE: "이용 가능",
    USED: "사용 완료",
    CANCELED: "취소",
    EXPIRED: "만료",
    SUSPENDED: "이용 정지",
    NOT_YET_VALID: "이용 시작 전",
  };
  return (
    <View style={{ gap: 14 }}>
      <Message error={query.error ?? task.error} />
      {query.isLoading ? (
        <Loading variant="rows" count={2} label="이용권 불러오는 중" />
      ) : null}
      {query.data?.data.length ? <Heading>이용권</Heading> : null}
      {query.data?.data.map((item) => (
        <View key={item.id} style={accountUI.panel}>
          <Label>
            {item.itemName} · {labels[item.status ?? ""] ?? item.status}
          </Label>
          <Label muted>
            {date(item.validFrom)} ~ {date(item.validUntil)}
          </Label>
          {item.usedAt ? <Label muted>사용일 {date(item.usedAt)}</Label> : null}
          {item.status === "AVAILABLE" &&
          order.orderStatus !== "CANCEL_REQUESTED" ? (
            <Action
              title="이용권 사용 완료"
              disabled={task.pending}
              onPress={() =>
                confirmAction(
                  "이용권 사용 완료",
                  "실제 서비스를 이용했나요? 사용 완료 후에는 되돌릴 수 없으며 전체 주문 취소가 제한됩니다.",
                  () =>
                    void task.run(async () => {
                      await postApiV2OrdersEntitlementsUse({
                        orderId: order.id!,
                        entitlementId: item.id!,
                        guestOrderToken: guestToken,
                      });
                      await client.invalidateQueries({
                        queryKey: ["entitlements", order.id],
                      });
                    }),
                )
              }
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}
export function OrderSummary({
  order,
  guestToken,
  refresh,
}: {
  order: UserOrderResponse;
  guestToken?: string;
  refresh: () => void;
}) {
  const [reason, setReason] = useState("");
  const task = useTask();
  return (
    <View style={{ gap: 20 }}>
      <AccountSection
        title="주문 정보"
        icon={<Package size={18} color={colors.muted} />}
      >
        <StatusPill
          label={
            ORDER_STATUS_MAP[order.orderStatus ?? ""]?.label ??
            order.orderStatus ??
            "상태 확인"
          }
          tone={orderTone(order.orderStatus)}
        />
        <Heading>
          {order.itemName ?? order.itemsSummary ?? order.saleTitle}
        </Heading>
        <Text style={accountUI.caption}>
          주문번호 {order.orderNumber} · {date(order.createdAt)}
        </Text>
        <View style={accountUI.divider} />
        {order.items?.map((item) => (
          <View key={item.orderItemId} style={{ gap: 6 }}>
            <Text style={accountUI.body}>{item.itemName}</Text>
            <InfoPair
              label={`${item.quantity}개 · 단가 ${money(item.unitPrice)}`}
              value={money(item.lineTotalPrice)}
            />
          </View>
        ))}
        <InfoPair
          label="총 수량"
          value={`${order.totalQuantity ?? order.requestedQuantity ?? "—"}개`}
        />
        <InfoPair label="상품 금액" value={money(order.itemsTotalPrice)} />
        <InfoPair label="배송비" value={money(order.shippingFee)} />
        <View style={accountUI.divider} />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Text style={accountUI.body}>총 주문 금액</Text>
          <Text style={accountUI.price}>{money(order.totalPrice)}</Text>
        </View>
      </AccountSection>
      {order.payment ? (
        <AccountSection
          title="결제 정보"
          icon={<CreditCard size={18} color={colors.muted} />}
        >
          <InfoPair
            label="결제 수단"
            value={statusLabel(order.payment.paymentMethod)}
          />
          <InfoPair
            label="결제 상태"
            value={statusLabel(order.payment.paymentStatus)}
          />
          <InfoPair label="결제 금액" value={money(order.payment.paidAmount)} />
          <InfoPair
            label="누적 환불액"
            value={money(order.payment.refundedAmount)}
          />
          {order.payment.bankAccountNumber ? (
            <View
              style={{
                gap: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: colors.line,
              }}
            >
              <Text style={accountUI.sectionTitle}>입금 안내</Text>
              <InfoPair
                label={order.payment.bankName ?? "입금 계좌"}
                value={order.payment.bankAccountNumber}
              />
              <InfoPair
                label="예금주"
                value={order.payment.bankAccountHolderName}
              />
              <InfoPair
                label="입금 기한"
                value={date(order.payment.depositDeadlineAt)}
              />
              {order.payment.bankTransferGuideMessage ? (
                <Label muted>{order.payment.bankTransferGuideMessage}</Label>
              ) : null}
              {order.payment.depositOverdue ? (
                <Label>
                  입금 기한이 지났습니다. 주문 상태를 확인해 주세요.
                </Label>
              ) : null}
            </View>
          ) : null}
        </AccountSection>
      ) : null}
      {order.delivery ? (
        <AccountSection
          title="배송·수령 정보"
          icon={<Truck size={18} color={colors.muted} />}
        >
          <InfoPair label="받는 분" value={order.delivery.receiverName} />
          <InfoPair label="연락처" value={order.delivery.receiverPhone} />
          <InfoPair label="주소" value={order.delivery.address} />
          {order.delivery.trackingNumber ? (
            <InfoPair
              label={order.delivery.carrierName ?? "운송장"}
              value={order.delivery.trackingNumber}
            />
          ) : null}
          {order.delivery.shippedAt ? (
            <InfoPair label="발송일" value={date(order.delivery.shippedAt)} />
          ) : null}
          {order.delivery.deliveredAt ? (
            <InfoPair
              label="배송 완료"
              value={date(order.delivery.deliveredAt)}
            />
          ) : null}
        </AccountSection>
      ) : null}
      {order.afterSaleManaged ? (
        <Label>
          반품·환불 상담이 진행 중인 주문입니다. 문의를 통해 처리 상황을 확인해
          주세요.
        </Label>
      ) : null}
      <Entitlements order={order} guestToken={guestToken} />
      <AccountSection
        title="주문 관리"
        icon={<MessageCircle size={18} color={colors.muted} />}
      >
        {!order.afterSaleManaged &&
        isOrderCancellationAllowed(
          order.orderStatus,
          order.saleTiming,
          order.smartOrder,
        ) ? (
          <>
            <Field
              label="취소 요청 사유"
              multiline
              value={reason}
              onChangeText={setReason}
              maxLength={500}
            />
            <Action
              secondary
              size="compact"
              leading={<CircleX size={18} color={colors.text} />}
              title="주문 취소 요청"
              disabled={task.pending || !reason.trim()}
              onPress={() =>
                confirmAction(
                  "주문 취소 요청",
                  "결제 완료 건은 관리자 승인 후 취소됩니다. 취소를 요청하시겠습니까?",
                  () =>
                    void task.run(async () => {
                      if (guestToken)
                        await patchApiOrdersGuestOrdernumberCancel(
                          order.orderNumber!,
                          { guestOrderToken: guestToken, reason },
                        );
                      else
                        await patchApiOrdersOrderidCancel(order.id!, {
                          reason,
                        });
                      refresh();
                    }),
                )
              }
            />
          </>
        ) : null}
        {!guestToken &&
        isReceiptCompletionAllowed(
          order.orderStatus,
          order.fulfillmentMethod,
        ) ? (
          <Action
            size="compact"
            leading={<CircleCheck size={18} color={colors.background} />}
            title="수령 완료"
            disabled={task.pending}
            onPress={() =>
              confirmAction(
                "수령 완료 확인",
                "실제로 상품을 수령했나요? 처리 후에는 이전 상태로 되돌릴 수 없습니다.",
                () =>
                  void task.run(async () => {
                    await patchApiV2OrdersOrderidReceipt(order.id!);
                    refresh();
                  }),
              )
            }
          />
        ) : null}
        <Message error={task.error} />
        <NavLink href="/my-page/inquiries/new">주문 관련 문의</NavLink>
      </AccountSection>
    </View>
  );
}
export function OrderDetailScreen({ smart = false }: { smart?: boolean }) {
  return (
    <RequireAuth>
      <OrderDetail smart={smart} />
    </RequireAuth>
  );
}
function OrderDetail({ smart }: { smart: boolean }) {
  const { id: idParam, orderId } = useLocalSearchParams<{
    id?: string;
    orderId?: string;
  }>();
  const id = Number(idParam ?? orderId);
  const valid = Number.isSafeInteger(id) && id > 0;
  const query = useQuery({
    queryKey: ["order", smart, id],
    queryFn: async () =>
      smart
        ? (await getApiV2SmartOrdersOrderId(id)).data
        : { order: (await getApiOrdersOrderid(id)).data },
    enabled: valid,
  });
  const data = query.data;
  return (
    <Screen
      title="주문 상세"
      refresh={() => void query.refetch()}
      refreshing={query.isFetching}
    >
      <Message
        error={!valid ? "주문 번호가 올바르지 않습니다." : query.error}
      />
      {query.isLoading ? <Loading variant="article" /> : null}
      {data && "pickupLocation" in data && data.pickupLocation ? (
        <>
          <Heading>픽업 매장</Heading>
          <Label>
            {data.pickupLocation.businessName} ·{" "}
            {data.pickupLocation.pickupAddress}
          </Label>
          <Label>{data.pickupLocation.contact}</Label>
        </>
      ) : null}
      {data?.order ? (
        <OrderSummary order={data.order} refresh={() => void query.refetch()} />
      ) : null}
      <NavLink href="/my-page?tab=orders">내 주문 목록</NavLink>
    </Screen>
  );
}
export function GuestOrderScreen() {
  const params = useLocalSearchParams<{
    orderNumber?: string;
    guestOrderToken?: string;
  }>();
  const [number, setNumber] = useState(params.orderNumber ?? "");
  const [token, setToken] = useState(params.guestOrderToken ?? "");
  const [lookup, setLookup] = useState(
    params.orderNumber && params.guestOrderToken
      ? {
          orderNumber: params.orderNumber,
          guestOrderToken: params.guestOrderToken,
        }
      : null,
  );
  const query = useQuery({
    queryKey: ["guest-order", lookup?.orderNumber, lookup?.guestOrderToken],
    queryFn: () => getApiOrdersGuest(lookup!),
    enabled: Boolean(lookup),
  });
  return (
    <Screen title="비회원 주문 조회">
      <Field label="주문번호" value={number} onChangeText={setNumber} />
      <Field
        label="비회원 주문 조회 코드"
        value={token}
        onChangeText={setToken}
        secureTextEntry
      />
      <Action
        title="주문 조회"
        disabled={!number || !token || query.isFetching}
        onPress={() =>
          setLookup({
            orderNumber: number.trim(),
            guestOrderToken: token.trim(),
          })
        }
      />
      <Message error={query.error} />
      {query.isLoading ? <Loading variant="article" /> : null}
      {query.data && lookup ? (
        <OrderSummary
          order={query.data.data}
          guestToken={lookup.guestOrderToken}
          refresh={() => void query.refetch()}
        />
      ) : null}
    </Screen>
  );
}
const flights = new Map<
  string,
  Promise<UserGeneralItemDeliveryOrderResponse>
>();
export function PaymentResultScreen({
  success,
  channel,
}: {
  success: boolean;
  channel: PaymentChannel;
}) {
  const params = useLocalSearchParams<{
    orderId?: string;
    amount?: string;
    paymentKey?: string;
    message?: string;
    code?: string;
  }>();
  const [result, setResult] = useState<UserGeneralItemDeliveryOrderResponse>();
  const task = useTask();
  const client = useQueryClient();
  const confirm = () =>
    void task.run(async () => {
      const flow = providerFlow.get();
      if (
        !flow ||
        flow.kind !== "payment" ||
        flow.ticket.pgOrderId !== params.orderId ||
        flow.ticket.amount !== Number(params.amount) ||
        !params.paymentKey ||
        (flow.channel !== channel &&
          !(flow.channel === "direct" && channel === "cart"))
      )
        throw new Error(
          "진행 중인 결제 요청과 결과가 일치하지 않습니다. 주문 내역을 확인해 주세요.",
        );
      const body = {
        pgOrderId: params.orderId!,
        paymentKey: params.paymentKey,
        amount: Number(params.amount),
      };
      let flight = flights.get(body.pgOrderId);
      if (!flight) {
        const options = {
          headers: { "Idempotency-Key": `confirm-${body.pgOrderId}` },
        };
        flight = (
          channel === "smart"
            ? postApiV2SmartOrdersTossConfirm(body, options)
            : channel === "ticket"
              ? postApiV2TicketProductOrdersTossConfirm(body, options)
              : flow.channel === "direct"
                ? postApiOrdersGeneralItemsDeliveryTossConfirm(body, options)
                : postApiOrdersGeneralItemsDeliveryCartTossConfirm(
                    body,
                    options,
                  )
        ).then((response) => response.data);
        flights.set(body.pgOrderId, flight);
        void flight.catch(() => flights.delete(body.pgOrderId));
      }
      const data = await flight;
      setResult(data);
      if (flow.channel === "cart") await storage.remove("wn.cart");
      providerFlow.set(null);
      await client.invalidateQueries();
    });
  return (
    <Screen
      title={
        result
          ? "주문이 완료되었습니다"
          : success
            ? "결제 결과 확인"
            : "결제가 완료되지 않았습니다"
      }
    >
      {result ? (
        <>
          <Label>주문번호 {result.order?.orderNumber}</Label>
          <Label>결제 금액 {money(result.paidAmount)}</Label>
          {result.guestOrderToken ? (
            <>
              <Heading>비회원 주문 조회 코드</Heading>
              <Label>{result.guestOrderToken}</Label>
              <Label muted>
                이 코드는 다시 표시되지 않을 수 있습니다. 안전한 곳에 보관해
                주세요.
              </Label>
              <Action
                title="비회원 주문 확인"
                onPress={() =>
                  router.replace({
                    pathname: "/orders/guest",
                    params: {
                      orderNumber: result.order?.orderNumber,
                      guestOrderToken: result.guestOrderToken,
                    },
                  })
                }
              />
            </>
          ) : (
            <NavLink href="/my-page?tab=orders">내 주문 확인</NavLink>
          )}
        </>
      ) : success ? (
        <>
          <Label>
            카드 인증이 완료되었습니다. 서버에서 최종 승인 결과를 확인해 주세요.
          </Label>
          <Label>
            주문번호 {params.orderId} · {money(Number(params.amount))}
          </Label>
          <Action
            title={task.pending ? "승인 확인 중…" : "결제 승인 확인"}
            disabled={task.pending}
            onPress={confirm}
          />
          <Message error={task.error} />
          <NavLink href="/my-page?tab=orders">주문 내역 확인</NavLink>
        </>
      ) : (
        <>
          <Label>
            {params.message ?? "결제가 취소되었거나 인증에 실패했습니다."}
          </Label>
          {params.code ? <Label muted>{params.code}</Label> : null}
          <NavLink
            href={
              channel === "smart"
                ? "/smart-order"
                : channel === "ticket"
                  ? "/ticket-products"
                  : "/general-items/cart"
            }
          >
            상품으로 돌아가기
          </NavLink>
        </>
      )}
      <NavLink href="/">홈으로</NavLink>
    </Screen>
  );
}
