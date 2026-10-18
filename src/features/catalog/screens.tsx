import { useInfiniteFeed } from "@/lib/infinite-feed";
import { PageHero } from "@/components/native/brand";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  ShoppingBag,
  ShoppingCart,
  MapPin,
  Ticket,
} from "lucide-react-native";
import { randomUUID } from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  getApiV2GeneralProducts,
  getApiV2TicketProducts,
  getApiV2SmartOrderProducts,
  getApiV2GeneralProductsId,
  getApiV2TicketProductsId,
  getApiV2SmartOrderProductsId,
  getCurrent,
  getOrCreate,
  postApiV2CartsItemsBatch,
  updateQuantity,
  deleteItem,
  quote,
  getApiV2ShippingPolicy,
  getApiUsersBusinessesPickupLocations,
  getApiUsersMeDeliveryAddresses,
  getApiUsersMe,
  postApiOrdersGeneralItemsDeliveryCartTossTickets,
  postApiV2OrdersGeneralProductsDirectTossTickets,
  postApiV2TicketProductOrdersTossTickets,
  postApiV2SmartOrdersTossTickets,
  type UserOrderTicketResponse,
  type UserGeneralProductResponse,
  type SmartOrderProductResponse,
} from "@/apis/generated/api";
import { ApiError } from "@/apis/mutator";
import { RichContent } from "@/components/native/rich-content";
import {
  colors,
  Action,
  Field,
  FilterChip,
  SurfaceLink,
  Heading,
  Label,
  Loading,
  Message,
  NavLink,
  InfiniteList,
  Photo,
  Quantity,
  RequireAuth,
  Screen,
  Sheet,
  Toggle,
  date,
  money,
  styles,
  useTask,
} from "@/components/native/ui";
import { useSession } from "@/lib/providers";
import { type PaymentChannel, providerFlow } from "@/lib/provider-flow";

export type Channel = "general" | "ticket" | "smart";
const paths = {
  general: "/general-items",
  ticket: "/ticket-products",
  smart: "/smart-order",
};
const titles = { general: "일반상품", ticket: "이용권", smart: "스마트오더" };
export function canOrder(
  product: UserGeneralProductResponse | SmartOrderProductResponse,
) {
  return (
    product.saleStatus === "OPEN" &&
    (product.availableQuantity ?? 0) > 0 &&
    (!product.saleStartAt || Date.parse(product.saleStartAt) <= Date.now()) &&
    (!product.saleEndAt || Date.parse(product.saleEndAt) > Date.now())
  );
}
export function ShopScreen() {
  const [channel, setChannel] = useState<Channel>("general");
  return (
    <CatalogScreen
      channel={channel}
      navigation={
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {(["general", "ticket", "smart"] as const).map((key) => (
            <FilterChip
              key={key}
              label={titles[key]}
              selected={channel === key}
              onPress={() => setChannel(key)}
            />
          ))}
        </ScrollView>
      }
    />
  );
}
export function CatalogScreen({
  channel,
  navigation,
}: {
  channel: Channel;
  navigation?: ReactNode;
}) {
  const { width, fontScale } = useWindowDimensions();
  const query = useInfiniteFeed({
    queryKey: ["catalog", channel],
    queryFn: async (page) =>
      (
        await (channel === "ticket"
          ? getApiV2TicketProducts({ page, size: 20, sort: ["createdAt,desc"] })
          : channel === "smart"
            ? getApiV2SmartOrderProducts({ page, size: 20 })
            : getApiV2GeneralProducts({
                page,
                size: 20,
                sort: ["createdAt,desc"],
              }))
      ).data,
  });
  return (
    <InfiniteList
      columns={width >= 375 && fontScale <= 1.3 ? 2 : 1}
      columnGap={20}
      rowGap={0}
      title={titles[channel]}
      intro={
        <PageHero
          title={titles[channel]}
          subtitle={
            channel === "general"
              ? "배송되는 실물 상품을 확인하세요."
              : channel === "ticket"
                ? "판매 중인 이용권을 확인하세요."
                : "온라인으로 주문하고 매장에서 수령하세요."
          }
        />
      }
      {...query.feed}
      header={
        <View style={{ gap: 16, paddingTop: 28, paddingBottom: 24 }}>
          {navigation}
          {channel === "smart" ? (
            <View style={commerceStyles.notice}>
              <Label>
                19세 미만은 주류를 구매할 수 없습니다. 픽업 시 신분증을 지참해
                주세요.
              </Label>
            </View>
          ) : null}
          <Label muted>
            판매중인 {titles[channel]} {query.total}건
          </Label>
          <View style={styles.row}>
            {channel === "general" ? (
              <SurfaceLink
                href="/general-items/cart"
                style={{
                  paddingHorizontal: 16,
                  minHeight: 44,
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.line,
                  borderRadius: 8,
                }}
              >
                <Label>장바구니 보기</Label>
              </SurfaceLink>
            ) : null}
            <NavLink href="/orders/guest">비회원 주문 조회</NavLink>
          </View>
        </View>
      }
      renderItem={(product) => (
        <SurfaceLink
          href={`${paths[channel]}/${product.id}`}
          testID={`product-card-${product.id}`}
          accessibilityLabel={`${product.name} 상세보기`}
          style={commerceStyles.listCard}
        >
          <View
            testID={`product-image-${product.id}`}
            style={commerceStyles.thumbnail}
          >
            <Photo
              uri={product.imageUrl}
              label={product.name ?? "상품"}
              backgroundColor="transparent"
            />
          </View>
          <View style={commerceStyles.cardBody}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <SaleBadge
                available={canOrder(product)}
                label={
                  canOrder(product)
                    ? "판매중"
                    : (product.availableQuantity ?? 0) < 1 ||
                        product.saleStatus === "SOLD_OUT"
                      ? "품절"
                      : product.saleStatus === "CLOSED"
                        ? "판매 종료"
                        : "판매 대기"
                }
              />
              {channel !== "general" ? (
                <Text style={commerceStyles.meta}>
                  {channel === "smart" ? "매장 픽업" : "이용권"}
                </Text>
              ) : null}
            </View>
            <Text style={commerceStyles.cardName}>{product.name}</Text>
            <Text style={commerceStyles.cardPrice}>
              {money(product.salePrice)}
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text style={[commerceStyles.meta, { flex: 1 }]}>
                {product.availableQuantity ?? 0}개 남음
              </Text>
              <View
                style={{ flexDirection: "row", gap: 3, alignItems: "center" }}
              >
                <Text style={commerceStyles.meta}>상세보기</Text>
                <ArrowUpRight
                  size={14}
                  color={colors.muted}
                  aria-hidden
                  accessibilityElementsHidden
                />
              </View>
            </View>
          </View>
        </SurfaceLink>
      )}
    />
  );
}
const commerceStyles = StyleSheet.create({
  listCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  thumbnail: { aspectRatio: 1, padding: 8, backgroundColor: "#ffffff08" },
  cardBody: { padding: 12, gap: 8 },
  cardName: {
    fontFamily: "NaviSansMedium",
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  cardPrice: {
    fontFamily: "NaviSansBold",
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
  },
  meta: {
    fontFamily: "NaviSans",
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 12,
    borderRadius: 16,
    borderCurve: "continuous",
    backgroundColor: "#ffffff0d",
    marginBottom: 8,
  },
  image: { aspectRatio: 1, backgroundColor: "#00000033", padding: 16 },
  productHeading: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  detailLink: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.commerce,
    alignItems: "center",
    justifyContent: "center",
  },
  order: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 16,
    gap: 12,
  },
  notice: {
    borderWidth: 1,
    borderColor: "#f59e0b44",
    backgroundColor: "#f59e0b10",
    padding: 16,
    borderRadius: 12,
  },
});
function SaleBadge({
  available,
  label,
}: {
  available: boolean;
  label?: string;
}) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: available ? colors.available : "#4b5563",
      }}
    >
      <Text
        style={{
          fontFamily: "NaviSansMedium",
          fontSize: 12,
          lineHeight: 16,
          color: colors.text,
        }}
      >
        {label ?? (available ? "판매중" : "품절")}
      </Text>
    </View>
  );
}
export function ProductScreen({ channel }: { channel: Channel }) {
  const params = useLocalSearchParams<{
    saleId?: string;
    productId?: string;
  }>();
  const id = Number(params.saleId ?? params.productId);
  const { width, fontScale } = useWindowDimensions();
  const [quantity, setQuantity] = useState(1);
  const [optionId, setOptionId] = useState<number>();
  const [optionSheet, setOptionSheet] = useState(false);
  const task = useTask();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["product", channel, id],
    queryFn: async () =>
      (
        await (channel === "ticket"
          ? getApiV2TicketProductsId(id)
          : channel === "smart"
            ? getApiV2SmartOrderProductsId(id)
            : getApiV2GeneralProductsId(id))
      ).data,
    enabled: Number.isSafeInteger(id) && id > 0,
  });
  const product = query.data;
  const options = product && "options" in product ? product.options : undefined;
  const selected = options?.values?.find((option) => option.id === optionId);
  const limit = Math.min(
    product?.maxOrderQuantity ?? 99,
    product?.availableQuantity ?? 0,
    selected?.availableQuantity ?? Infinity,
  );
  const permitted =
    product &&
    canOrder(product) &&
    quantity <= limit &&
    (!options?.required || Boolean(optionId));
  return (
    <Screen>
      <SurfaceLink href={paths[channel]} style={[styles.row, { gap: 8 }]}>
        <ArrowLeft size={18} color={colors.muted} />
        <Label muted>목록으로 돌아가기</Label>
      </SurfaceLink>
      <Message error={query.error ?? task.error} />
      {query.isLoading ? <Loading /> : null}
      {product ? (
        <>
          <View
            style={[
              commerceStyles.image,
              {
                padding: (selected?.imageUrl ?? product.imageUrl) ? 12 : 0,
                maxWidth: 440,
                width: "100%",
                alignSelf: "center",
                borderRadius: 20,
                borderCurve: "continuous",
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.line,
              },
            ]}
          >
            <Photo
              uri={selected?.imageUrl ?? product.imageUrl}
              label={product.name ?? "상품"}
              backgroundColor="transparent"
            />
          </View>
          <View style={commerceStyles.card}>
            <View style={commerceStyles.productHeading}>
              <Text
                accessibilityRole="header"
                style={[
                  styles.title,
                  { flex: 1, fontSize: 22, lineHeight: 30 },
                ]}
              >
                {product.name}
              </Text>
              <SaleBadge available={(product.availableQuantity ?? 0) > 0} />
            </View>
            <Text style={[styles.heading, { fontSize: 24, lineHeight: 32 }]}>
              {money(
                (product.salePrice ?? 0) + (selected?.additionalPrice ?? 0),
              )}
            </Text>
            <Label muted>
              {product.availableQuantity ?? 0} / {product.totalQuantity ?? 0}개
              남음
            </Label>
            {product.maxOrderQuantity ? (
              <Label muted>
                인당 구매 한도 {product.maxOrderQuantity}개 · 옵션과 이전 구매를
                합산합니다.
              </Label>
            ) : null}
            {channel === "ticket" && "ticketValidFrom" in product ? (
              <Label muted>
                이용 기간: {date(product.ticketValidFrom)} ~{" "}
                {date(product.ticketValidUntil)}
              </Label>
            ) : null}
            <View style={commerceStyles.order}>
              {options ? (
                <>
                  <Action
                    secondary
                    title={selected?.label ?? selected?.value ?? "옵션 선택"}
                    onPress={() => setOptionSheet(true)}
                  />
                  <Sheet
                    visible={optionSheet}
                    title="상품 옵션"
                    onDismiss={() => setOptionSheet(false)}
                  >
                    <Heading>{options.name ?? "옵션 선택"}</Heading>
                    {!options.required ? (
                      <Action
                        secondary={Boolean(optionId)}
                        title="선택 안 함"
                        onPress={() => setOptionId(undefined)}
                      />
                    ) : null}
                    {options.values?.map((option) => (
                      <Action
                        key={option.id}
                        title={`${option.label ?? option.value} (+${money(option.additionalPrice ?? 0)})`}
                        secondary={option.id !== optionId}
                        disabled={(option.availableQuantity ?? 0) < 1}
                        onPress={() => {
                          setOptionId(option.id);
                          setQuantity(1);
                          setOptionSheet(false);
                        }}
                      />
                    ))}
                  </Sheet>
                </>
              ) : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <Label muted>구매 수량</Label>
                <Quantity value={quantity} onChange={setQuantity} max={limit} />
              </View>
              <View
                testID="purchase-actions"
                style={{
                  flexDirection:
                    width >= 375 && fontScale <= 1.3 ? "row" : "column",
                  gap: 8,
                  alignItems: "stretch",
                }}
              >
                {channel === "general" ? (
                  <View style={{ flex: 1 }}>
                    <Action
                      size="compact"
                      secondary
                      leading={<ShoppingCart size={18} color={colors.text} />}
                      title="장바구니 담기"
                      disabled={!permitted || task.pending}
                      onPress={() =>
                        void task.run(async () => {
                          await getOrCreate();
                          await postApiV2CartsItemsBatch({
                            items: [
                              { generalProductId: id, quantity, optionId },
                            ],
                          });
                          await client.invalidateQueries({
                            queryKey: ["cart"],
                          });
                          router.push("/general-items/cart");
                        })
                      }
                    />
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  <Action
                    size="compact"
                    leading={
                      channel === "smart" ? (
                        <MapPin size={18} color={colors.background} />
                      ) : channel === "ticket" ? (
                        <Ticket size={18} color={colors.background} />
                      ) : (
                        <ShoppingBag size={18} color={colors.background} />
                      )
                    }
                    title={
                      permitted
                        ? channel === "smart"
                          ? "픽업 주문하기"
                          : "바로 주문하기"
                        : "현재 주문할 수 없습니다"
                    }
                    disabled={!permitted || task.pending}
                    onPress={() =>
                      router.push(
                        (channel === "smart"
                          ? `/smart-order/${id}/order?quantity=${quantity}`
                          : `${channel === "ticket" ? "/ticket-products/order" : "/general-items/delivery-order"}?saleId=${id}&quantity=${quantity}${optionId ? `&optionId=${optionId}` : ""}`) as never,
                      )
                    }
                  />
                </View>
              </View>
            </View>
            <View style={commerceStyles.order}>
              <Heading>{product.name}</Heading>
              <RichContent html={product.description} />
            </View>
          </View>
          <NavLink href="/terms">판매·교환·환불 정책 확인</NavLink>
          {channel === "smart" ? (
            <Label>
              19세 미만은 주류를 구매할 수 없습니다. 픽업 시 신분증을 지참해
              주세요.
            </Label>
          ) : null}
        </>
      ) : null}
      <NavLink href={paths[channel]}>목록으로</NavLink>
    </Screen>
  );
}
export function CartScreen() {
  const client = useQueryClient();
  const task = useTask();
  const query = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      try {
        return (await getCurrent()).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404)
          return { items: [] };
        throw error;
      }
    },
  });
  const priced = useQuery({
    queryKey: ["cart", "quote"],
    queryFn: () => quote(),
    enabled: Boolean(query.data?.items?.length),
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["cart"] });
  };
  return (
    <Screen
      title="장바구니"
      refresh={() => void refresh()}
      refreshing={query.isFetching}
    >
      <Message error={query.error ?? task.error ?? priced.error} />
      {query.isLoading ? <Loading /> : null}
      {query.data?.items?.length ? (
        query.data.items.map((item) => (
          <View key={item.cartItemId} style={styles.section}>
            <NavLink href={`/general-items/${item.generalProductId}`}>
              {item.itemName}
            </NavLink>
            <Label>
              {money(item.unitPrice)} · {money(item.lineTotalPrice)}
            </Label>
            {item.valid === false ? (
              <Label>
                {item.invalidReason ?? "상품을 다시 확인해 주세요."}
              </Label>
            ) : null}
            <Quantity
              value={item.quantity ?? 1}
              max={Math.min(
                item.maxOrderQuantity ?? 99,
                item.availableQuantity ?? 99,
              )}
              onChange={(quantity) =>
                void task.run(async () => {
                  await updateQuantity(item.cartItemId!, { quantity });
                  await refresh();
                })
              }
            />
            <Action
              secondary
              title="장바구니에서 삭제"
              disabled={task.pending}
              onPress={() =>
                void task.run(async () => {
                  await deleteItem(item.cartItemId!);
                  await refresh();
                })
              }
            />
          </View>
        ))
      ) : (
        <Label muted>장바구니가 비어 있습니다.</Label>
      )}
      {priced.data && query.data?.items?.length ? (
        <>
          <Label>상품 합계 {money(priced.data.data.itemsTotalPrice)}</Label>
          <Label>배송비 {money(priced.data.data.shippingFee)}</Label>
          <Heading>총 {money(priced.data.data.totalPrice)}</Heading>
          <Action
            title="주문서 작성"
            disabled={
              task.pending ||
              query.data.items.some((item) => item.valid === false)
            }
            onPress={() => router.push("/general-items/cart/order")}
          />
        </>
      ) : null}
      <NavLink href="/general-items">상품 둘러보기</NavLink>
    </Screen>
  );
}
export function CheckoutScreen({ channel }: { channel: PaymentChannel }) {
  return channel === "smart" ? (
    <RequireAuth>
      <CheckoutForm channel={channel} />
    </RequireAuth>
  ) : (
    <CheckoutForm channel={channel} />
  );
}
function CheckoutForm({ channel }: { channel: PaymentChannel }) {
  const params = useLocalSearchParams<{
    saleId?: string;
    productId?: string;
    quantity?: string;
    optionId?: string;
    selections?: string;
  }>();
  const { signedIn } = useSession();
  const id = Number(params.saleId ?? params.productId);
  const [quantity] = useState(Number(params.quantity ?? 1));
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [pickup, setPickup] = useState<number>();
  const [agree, setAgree] = useState(false);
  const task = useTask();
  const identity = useRef({ fingerprint: "", key: randomUUID() });
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => getApiUsersMe(),
    enabled: signedIn,
  });
  const addresses = useQuery({
    queryKey: ["addresses"],
    queryFn: () => getApiUsersMeDeliveryAddresses(),
    enabled: signedIn && (channel === "cart" || channel === "direct"),
  });
  const product = useQuery({
    queryKey: ["product", channel === "direct" ? "general" : channel, id],
    queryFn: async () =>
      (
        await (channel === "ticket"
          ? getApiV2TicketProductsId(id)
          : channel === "smart"
            ? getApiV2SmartOrderProductsId(id)
            : getApiV2GeneralProductsId(id))
      ).data,
    enabled: channel !== "cart" && Number.isSafeInteger(id) && id > 0,
  });
  const cart = useQuery({
    queryKey: ["cart", "quote"],
    queryFn: () => quote(),
    enabled: channel === "cart",
  });
  const shipping = useQuery({
    queryKey: ["shipping"],
    queryFn: () => getApiV2ShippingPolicy(),
    enabled: channel === "direct",
  });
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
    enabled: channel === "smart",
  });
  const customerName = name || me.data?.data.name || "";
  const customerPhone = phone || me.data?.data.phone || "";
  const customerEmail = email || me.data?.data.email || "";
  let selections: { quantity: number; optionId?: number }[] = [
    {
      quantity,
      optionId: params.optionId ? Number(params.optionId) : undefined,
    },
  ];
  let selectionError = "";
  try {
    if (params.selections) {
      if (params.selections.length > 5000) throw new Error();
      const input: unknown = JSON.parse(params.selections);
      if (
        !Array.isArray(input) ||
        !input.length ||
        input.length > 31 ||
        new Set(input.map((item) => item?.optionId)).size !== input.length
      )
        throw new Error();
      selections = input;
    }
    if (
      selections.some(
        (item) =>
          !Number.isSafeInteger(item.quantity) ||
          item.quantity < 1 ||
          (item.optionId !== undefined &&
            (!Number.isSafeInteger(item.optionId) || item.optionId < 1)),
      )
    )
      throw new Error();
  } catch {
    selectionError =
      "주문 수량·옵션이 올바르지 않습니다. 상품에서 다시 선택해 주세요.";
  }
  const physical = channel === "cart" || channel === "direct";
  const totalQuantity = selections.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const selectedProduct = product.data;
  const variants =
    selectedProduct && "options" in selectedProduct
      ? selectedProduct.options
      : undefined;
  const itemsTotal = selectedProduct
    ? selections.reduce(
        (sum, item) =>
          sum +
          ((selectedProduct.salePrice ?? 0) +
            (variants?.values?.find((v) => v.id === item.optionId)
              ?.additionalPrice ?? 0)) *
            item.quantity,
        0,
      )
    : 0;
  const shippingFee =
    channel === "direct" && shipping.data
      ? itemsTotal >= (shipping.data.data.freeShippingThreshold ?? Infinity)
        ? 0
        : (shipping.data.data.baseShippingFee ?? 0)
      : 0;
  const productValid =
    channel === "cart" ||
    Boolean(
      selectedProduct &&
      canOrder(selectedProduct) &&
      totalQuantity <=
        Math.min(
          selectedProduct.maxOrderQuantity ?? Infinity,
          selectedProduct.availableQuantity ?? 0,
        ) &&
      selections.every((item) => {
        const option = variants?.values?.find((v) => v.id === item.optionId);
        return (
          (!variants?.required || Boolean(option)) &&
          (!item.optionId || Boolean(option)) &&
          item.quantity <= (option?.availableQuantity ?? Infinity)
        );
      }),
    );
  const start = () =>
    void task.run(async () => {
      if (selectionError || !productValid)
        throw new Error(
          selectionError || "판매 상태·수량·옵션을 다시 확인해 주세요.",
        );
      const delivery = {
        receiverName: customerName.trim(),
        receiverPhone: customerPhone.trim(),
        guestEmail: customerEmail.trim(),
        deliveryAddress: address.trim(),
        deliveryMemo: memo,
      };
      if (
        !delivery.receiverName ||
        !delivery.receiverPhone ||
        !delivery.guestEmail ||
        (physical && !delivery.deliveryAddress)
      )
        throw new Error("주문자 정보와 배송 주소를 확인해 주세요.");
      const payload = JSON.stringify({
        channel,
        id,
        selections,
        delivery,
        pickup,
      });
      if (identity.current.fingerprint !== payload)
        identity.current = { fingerprint: payload, key: randomUUID() };
      const options = { headers: { "Idempotency-Key": identity.current.key } };
      const result =
        channel === "cart"
          ? await postApiOrdersGeneralItemsDeliveryCartTossTickets(
              delivery,
              options,
            )
          : channel === "direct"
            ? await postApiV2OrdersGeneralProductsDirectTossTickets(
                {
                  delivery,
                  items: selections.map((item) => ({
                    ...item,
                    generalProductId: id,
                  })),
                },
                options,
              )
            : channel === "ticket"
              ? await postApiV2TicketProductOrdersTossTickets(
                  {
                    ticketProductId: id,
                    items: selections,
                    customerName,
                    customerPhone,
                    email: customerEmail,
                    orderNote: memo,
                  },
                  options,
                )
              : await postApiV2SmartOrdersTossTickets(
                  {
                    productId: id,
                    pickupBusinessId: pickup!,
                    requestedQuantity: quantity,
                    orderNote: memo,
                  },
                  options,
                );
      const data = result.data;
      const ticket: UserOrderTicketResponse | undefined =
        channel === "smart"
          ? (data as UserOrderTicketResponse)
          : (data as { ticket?: UserOrderTicketResponse }).ticket;
      if (
        !ticket?.clientKey ||
        !ticket.pgOrderId ||
        !ticket.successUrl ||
        !ticket.failUrl ||
        !ticket.amount
      )
        throw new Error("결제 티켓 정보가 올바르지 않습니다.");
      if (
        new URL(ticket.successUrl).protocol !== "https:" ||
        new URL(ticket.failUrl).protocol !== "https:"
      )
        throw new Error("결제 결과 주소는 HTTPS여야 합니다.");
      providerFlow.set({
        kind: "payment",
        channel,
        ticket,
        customerName,
        customerEmail,
        customerPhone,
      });
      router.push("/provider");
    });
  return (
    <Screen
      title={
        channel === "smart"
          ? "픽업 주문서"
          : channel === "ticket"
            ? "이용권 주문서"
            : "배송 주문서"
      }
    >
      <Message
        error={
          !productValid && product.data
            ? "판매 상태·수량·옵션을 다시 확인해 주세요."
            : (task.error ??
              product.error ??
              cart.error ??
              shipping.error ??
              locations.error ??
              (selectionError || null))
        }
      />
      {product.isLoading || cart.isLoading ? <Loading /> : null}
      {product.data ? (
        <>
          <Heading>{product.data.name}</Heading>
          <Label>
            수량 {totalQuantity}개 · 기본 단가 {money(product.data.salePrice)}
          </Label>
          <Label>
            상품 {money(itemsTotal)} · 배송비 {money(shippingFee)}
          </Label>
          <Heading>총 {money(itemsTotal + shippingFee)}</Heading>
        </>
      ) : null}
      {cart.data ? (
        <>
          <Label>
            상품 {money(cart.data.data.itemsTotalPrice)} · 배송비{" "}
            {money(cart.data.data.shippingFee)}
          </Label>
          <Heading>총 {money(cart.data.data.totalPrice)}</Heading>
        </>
      ) : null}
      <Field label="주문자 이름" value={customerName} onChangeText={setName} />
      <Field
        label="연락처"
        keyboardType="phone-pad"
        value={customerPhone}
        onChangeText={setPhone}
      />
      <Field
        label="이메일"
        keyboardType="email-address"
        value={customerEmail}
        onChangeText={setEmail}
      />
      {physical ? (
        <>
          {addresses.data?.data.map((item) => (
            <Action
              secondary
              key={item.id}
              title={`저장된 배송지: ${item.address}`}
              onPress={() => {
                setAddress(item.address ?? "");
                setName(item.receiverName ?? customerName);
                setPhone(item.receiverPhone ?? customerPhone);
              }}
            />
          ))}
          <Field
            label="배송 주소 (우편번호·상세주소 포함)"
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </>
      ) : null}
      {channel === "smart" ? (
        <>
          <Heading>픽업 매장 선택</Heading>
          {locations.data?.map((item) => (
            <Action
              key={item.id}
              secondary={pickup !== item.id}
              title={`${item.businessName} · ${item.pickupAddress}`}
              onPress={() => setPickup(item.id)}
            />
          ))}
          <Label>
            19세 미만은 주류를 구매할 수 없습니다. 매장 수령 시 신분증을 지참해
            주세요.
          </Label>
        </>
      ) : null}
      <Field label="주문·배송 메모" value={memo} onChangeText={setMemo} />
      <NavLink href="/terms">판매·제공 기간·환불 정책</NavLink>
      <Toggle
        label="주문 정보와 판매·환불 정책을 확인하고 동의합니다."
        value={agree}
        onChange={setAgree}
      />
      <Action
        title={task.pending ? "결제 준비 중…" : "결제 진행"}
        disabled={
          task.pending ||
          !agree ||
          !productValid ||
          Boolean(selectionError) ||
          !customerName ||
          !customerPhone ||
          !customerEmail ||
          (physical && !address) ||
          (channel === "smart" && !pickup) ||
          (channel !== "cart" && !product.data) ||
          (channel === "cart" && !cart.data?.data.items?.length)
        }
        onPress={start}
      />
    </Screen>
  );
}
