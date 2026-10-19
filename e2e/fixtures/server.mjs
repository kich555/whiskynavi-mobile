import http from "node:http";
import { pathToFileURL } from "node:url";

const paginate = (content, params) => {
  const number = Math.max(0, Number(params.get("page") ?? 0));
  const size = Math.max(1, Number(params.get("size") ?? 20));
  return {
    content: content.slice(number * size, (number + 1) * size),
    page: {
      number,
      size,
      totalElements: content.length,
      totalPages: Math.ceil(content.length / size),
    },
  };
};
const bottle = {
  id: 1,
  name: "네이비 싱글캐스크 12",
  brand: "WhiskyNavi",
  distillery: "Fixture Distillery",
  abv: 52.3,
  capacity: 700,
  description: "<p>꿀과 바닐라, 긴 여운의 테스트 위스키입니다.</p>",
  bottledDate: "2026-09-01",
};
const product = {
  id: 1,
  name: "위스키 테이스팅 글라스",
  saleStatus: "OPEN",
  salePrice: 15000,
  totalQuantity: 100,
  availableQuantity: 100,
  maxOrderQuantity: 10,
  description: "<p>향을 즐기기 위한 테이스팅 글라스입니다.</p>",
};
const ticket = {
  ...product,
  id: 2,
  name: "위스키 테이스팅 이용권",
  ticketProduct: true,
  ticketValidFrom: "2026-01-01T00:00:00+09:00",
  ticketValidUntil: "2099-12-31T23:59:59+09:00",
};
const smart = {
  ...product,
  id: 3,
  name: "매장 픽업 위스키",
  salePrice: 120000,
};
const user = {
  id: 7,
  name: "테스트 회원",
  username: "모바일테스터",
  email: "rn@example.test",
  phone: "01000000000",
  roles: ["ROLE_USER", "ROLE_CONSUMER", "ROLE_WHISKYNAVI_MEMBER"],
};
const notice = {
  id: 1,
  noticeName: "싱글캐스크 예약",
  bottleName: bottle.name,
  bottleId: 1,
  price: 120000,
  availableQuantity: 100,
  maxOrderQuantity: 3,
  reservationStartAt: "2020-01-01T00:00:00+09:00",
  reservationEndAt: "2099-12-31T23:59:59+09:00",
  gradeConditions: [
    { requiredRole: "ROLE_USER", applicableFrom: "2020-01-01T00:00:00+09:00" },
  ],
};
const location = {
  id: 10,
  businessName: "테스트 픽업 매장",
  pickupAddress: "서울시 테스트로 1",
  contact: "01000000000",
};
const post = {
  id: 1,
  title: "첫 번째 위스키 이야기",
  content: "<p>위스키를 함께 알아가는 공간입니다.</p>",
  authorId: 7,
  authorNickname: user.username,
  createdAt: "2026-10-01T10:00:00+09:00",
  postType: { code: "GENERAL", name: "자유" },
};
const order = {
  id: 1,
  orderNumber: "E2E-ORDER-1",
  itemName: product.name,
  totalQuantity: 1,
  itemsTotalPrice: 15000,
  shippingFee: 3000,
  totalPrice: 18000,
  orderStatus: "ORDER_PREPARING",
  fulfillmentMethod: "DELIVERY",
  productType: "ITEM",
  createdAt: "2026-10-01T10:00:00+09:00",
  payment: {
    paymentStatus: "PAID",
    paymentMethod: "CARD",
    paidAmount: 18000,
    refundedAmount: 0,
  },
  delivery: {
    receiverName: user.name,
    receiverPhone: user.phone,
    address: "서울시 테스트로 1",
  },
  items: [
    {
      orderItemId: 1,
      generalProductId: 1,
      itemName: product.name,
      quantity: 1,
      unitPrice: 15000,
      lineTotalPrice: 15000,
    },
  ],
};
export function createFixtureServer() {
  let state;
  const reset = () => {
    state = {
      posts: [structuredClone(post)],
      bottles: [structuredClone(bottle)],
      products: {
        general: [structuredClone(product)],
        ticket: [structuredClone(ticket)],
        smart: [structuredClone(smart)],
      },
      notices: [structuredClone(notice)],
      ended: [],
      announcements: [],
      comments: [],
      inquiries: [],
      applications: [],
      cart: [],
      orders: [structuredClone(order)],
      user: structuredClone(user),
      password: "mobile-e2e-123",
      requests: [],
      unhandled: [],
    };
  };
  reset();
  return http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization,Content-Type,X-Cart-Token,Idempotency-Key,X-E2E-Test-Id",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url, "http://127.0.0.1");
    const path = url.pathname;
    const method = req.method;
    const page = (content) => paginate(content, url.searchParams);
    const send = (value, status = 200) => {
      if (value === undefined) {
        res.writeHead(204);
        res.end();
        return;
      }
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(value));
    };
    let body = {};
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      if (raw) body = JSON.parse(raw);
    } catch {
      send({ message: "Fixture JSON required" }, 400);
      return;
    }
    if (path === "/health")
      return send({ ready: true, environment: "isolated-fixture" });
    if (path === "/__test/reset" && method === "POST") {
      reset();
      return send({ reset: true });
    }
    if (path === "/__test/seed-account" && method === "POST") {
      state.orders = [
        structuredClone(order),
        {
          ...structuredClone(order),
          id: 2,
          orderNumber: "E2E-TICKET-2",
          itemName: ticket.name,
          ticketProductId: 2,
          fulfillmentMethod: "TICKET",
          orderStatus: "PAYMENT_COMPLETED",
          delivery: undefined,
          items: [
            {
              orderItemId: 2,
              ticketProductId: 2,
              itemName: ticket.name,
              quantity: 1,
              unitPrice: 15000,
              lineTotalPrice: 15000,
            },
          ],
        },
      ];
      state.applications = [
        {
          id: 1,
          noticeId: 1,
          noticeName: notice.noticeName,
          bottleName: bottle.name,
          quantity: 2,
          status: "CONFIRMED",
          pickupBusinessName: location.businessName,
          pickupAddress: location.pickupAddress,
          createdAt: "2026-10-01T12:00:00+09:00",
        },
        {
          id: 2,
          noticeId: 1,
          noticeName: "가을 테이스팅 예약",
          bottleName: bottle.name,
          quantity: 1,
          status: "CANCELLED",
          pickupBusinessName: location.businessName,
          pickupAddress: location.pickupAddress,
          createdAt: "2026-09-01T12:00:00+09:00",
        },
      ];
      state.inquiries = [
        {
          inquiry: {
            id: 1,
            title: "픽업 일정에 대해 문의드립니다",
            status: "ANSWERED",
            createdAt: "2026-10-01T12:00:00+09:00",
          },
          messages: [
            {
              id: 1,
              content: "<p>픽업 가능한 시간을 알려주세요.</p>",
              authorNickname: user.username,
              createdAt: "2026-10-01T12:00:00+09:00",
            },
            {
              id: 2,
              content: "<p>매장 운영 시간에 방문하실 수 있습니다.</p>",
              authorNickname: "위스키내비",
              createdAt: "2026-10-01T13:00:00+09:00",
            },
          ],
        },
      ];
      return send({ seeded: true });
    }
    if (path === "/__test/seed-feed" && method === "POST") {
      const count = body.design ? 2 : 45;
      state.posts = Array.from({ length: count }, (_, i) => ({
        ...post,
        id: i + 1,
        title: i ? `싱글캐스크 테이스팅 이야기 ${i + 1}` : post.title,
        authorId: 42,
        authorNickname: "캐스크노트",
        commentCount: 3,
        viewCount: 128 + i,
      }));
      state.bottles = Array.from({ length: count }, (_, i) => ({
        ...bottle,
        id: i + 1,
        name: i ? `싱글캐스크 위스키 ${i + 1}` : bottle.name,
      }));
      for (const [channel, base] of [
        ["general", product],
        ["ticket", ticket],
        ["smart", smart],
      ]) {
        state.products[channel] = Array.from({ length: count }, (_, i) => ({
          ...base,
          id: base.id + i,
          name: i ? `${base.name} ${i + 1}` : base.name,
        }));
      }
      state.notices = Array.from({ length: count }, (_, i) => ({
        ...notice,
        id: i + 1,
        bottleBrand: "WhiskyNavi",
        noticeName: i ? "가을 싱글캐스크 출시 예약" : notice.noticeName,
      }));
      state.ended = body.design
        ? [
            {
              ...notice,
              id: 90,
              bottleBrand: "WhiskyNavi",
              noticeName: "지난 싱글캐스크 예약",
              reservationEndAt: "2026-01-01T10:00:00+09:00",
            },
          ]
        : [];
      state.announcements = [
        { ...post, id: 80, title: "커뮤니티 이용 안내", pinned: true },
      ];
      state.comments = Array.from({ length: 3 }, (_, i) => ({
        id: i + 1,
        authorId: 42,
        authorNickname: ["캐스크노트", "몰트여행", "위스키친구"][i],
        createdAt: "2026-10-01T12:00:00+09:00",
        content: [
          "첫 잔은 바닐라 향이 선명하네요. 좋은 후기 감사합니다!",
          "저도 같은 보틀을 열었는데 여운이 오래 남더라고요.",
          "다음 테이스팅도 기대할게요.",
        ][i],
      }));
      return send({ seeded: count });
    }
    if (path === "/__test/state")
      return send({
        posts: state.posts.length,
        cart: state.cart.length,
        inquiries: state.inquiries.length,
        applications: state.applications.length,
        requests: state.requests,
        unhandled: state.unhandled,
      });
    state.requests.push({ method, path, query: url.search });
    if (path === "/api/auth/login")
      return body.email === state.user.email && body.password === state.password
        ? send({
            accessToken: "fixture-access",
            refreshToken: "fixture-refresh",
            userId: 7,
            username: state.user.username,
          })
        : send({ message: "이메일 또는 비밀번호가 올바르지 않습니다." }, 401);
    if (
      path.includes("/email-verification/") ||
      path === "/api/auth/reset-password"
    )
      return send({ message: "fixture verification accepted" });
    if (path === "/api/auth/refresh")
      return body.refreshToken === "fixture-refresh"
        ? send({
            accessToken: "fixture-access",
            refreshToken: "fixture-refresh",
          })
        : send({ message: "만료된 세션" }, 401);
    if (path === "/api/auth/check-email" || path === "/api/auth/check-username")
      return send({ available: true });
    if (path === "/api/user/niceid/session")
      return send(
        { message: "테스트에서는 외부 본인인증을 실행하지 않습니다." },
        503,
      );
    if (/\/toss\/(tickets|confirm)$/.test(path))
      return send(
        { message: "테스트에서는 실제 결제를 실행하지 않습니다." },
        503,
      );
    const protectedPath =
      /^\/api\/(users|inquiries|2\.0\/orders|bottles\/reservations\/applications)/.test(
        path,
      );
    if (
      protectedPath &&
      !path.includes("pickup-locations") &&
      req.headers.authorization !== "Bearer fixture-access"
    )
      return send({ message: "로그인이 필요합니다." }, 401);
    if (path === "/api/users/me") return send(state.user);
    if (path === "/api/users/me/email" && method === "PUT") {
      state.user.email = body.newEmail;
      return send({
        accessToken: "fixture-access",
        refreshToken: "fixture-refresh",
      });
    }
    if (path === "/api/auth/change-password" && method === "PUT") {
      if (body.currentPassword !== state.password)
        return send({ message: "현재 비밀번호가 일치하지 않습니다." }, 400);
      state.password = body.newPassword;
      return send(undefined);
    }
    if (path === "/api/users/me/nickname") {
      state.user.username = body.nickname;
      return send({
        accessToken: "fixture-access",
        refreshToken: "fixture-refresh",
      });
    }
    if (path === "/api/users/me/agreements") {
      Object.assign(state.user, body);
      return send(state.user);
    }
    if (path === "/api/users/businesses/me") return send([]);
    if (path === "/api/users/businesses/applications/me/overview")
      return send({
        hasHistory: false,
        recentApplications: [],
        pendingApplications: [],
      });
    if (path === "/api/users/me/delivery-addresses")
      return send([
        {
          id: 1,
          address: "서울시 테스트로 1",
          receiverName: user.name,
          receiverPhone: user.phone,
        },
      ]);
    if (path === "/api/users/businesses/pickup-locations")
      return send(page([location]));
    if (path === "/api/kv-stores/youtube_embed_url")
      return send({ key: "youtube_embed_url", value: "" });
    if (/^\/api\/2\.0\/smart-orders\/\d+$/.test(path)) {
      const item = state.orders.find(
        (item) => item.id === Number(path.split("/").pop()),
      );
      return item
        ? send({
            order: { ...item, smartOrder: true, fulfillmentMethod: "PICKUP" },
            pickupLocation: location,
          })
        : send({ message: "정보가 없습니다." }, 404);
    }
    if (path === "/api/banners") return send(page([]));
    if (path === "/api/bottles/brand-series")
      return send([
        {
          brand: "위스키내비",
          series: [
            {
              name: "Single Cask",
              description: "한 캐스크의 개성을 담은 시리즈",
            },
          ],
        },
      ]);
    if (path === "/api/bottles" || path === "/api/2.0/bottles")
      return send(
        page(
          state.bottles.filter(
            (item) =>
              !url.searchParams.get("keyword") ||
              item.name.includes(url.searchParams.get("keyword")),
          ),
        ),
      );
    if (path === "/api/2.0/bottles/parameters")
      return send({ brands: ["WhiskyNavi"] });
    if (/^\/api\/bottles\/\d+$/.test(path))
      return path.endsWith("/1")
        ? send(bottle)
        : send({ message: "정보가 없습니다." }, 404);
    if (path === "/api/bottles/reservations/notices")
      return send(page(state.notices));
    if (path === "/api/bottles/reservations/notices/recent-ended")
      return send(state.ended);
    if (/\/bottles\/reservations\/notices\/\d+$/.test(path))
      return send(notice);
    if (
      /\/bottles\/reservations\/notices\/\d+\/applications$/.test(path) &&
      method === "POST"
    ) {
      const value = {
        ...body,
        id: 1,
        noticeId: 1,
        pickupUserBusinessId: body.userBusinessId,
        noticeName: notice.noticeName,
        status: "APPLIED",
        pickupBusinessName: location.businessName,
        pickupAddress: location.pickupAddress,
      };
      state.applications.push(value);
      return send(value);
    }
    if (path === "/api/bottles/reservations/applications/me")
      return send(page(state.applications));
    if (/\/applications\/\d+\/notice$/.test(path))
      return send({ ...notice, readOnly: true });
    if (/\/bottles\/reservations\/applications\/\d+$/.test(path)) {
      if (method === "DELETE") {
        state.applications = [];
        return send(true);
      }
      Object.assign(state.applications[0] ?? {}, body);
      return send(state.applications[0]);
    }
    if (/^\/api\/boards\/[^/]+$/.test(path))
      return send({
        name: "게시판",
        slug: path.split("/").pop(),
        readOnly: false,
        postTypes: [{ code: "GENERAL", name: "자유", usages: ["POST"] }],
      });
    if (/\/announcements$/.test(path)) return send(page(state.announcements));
    if (/\/announcements\/\d+$/.test(path))
      return send(state.announcements[0] ?? { ...post, id: 80 });
    if (/^\/api\/boards\/[^/]+\/posts$/.test(path)) {
      if (method === "POST") {
        const value = { ...post, ...body, id: state.posts.length + 1 };
        state.posts.unshift(value);
        return send(value);
      }
      return send(
        page(
          state.posts.filter(
            (item) =>
              !url.searchParams.get("keyword") ||
              item.title.includes(url.searchParams.get("keyword")),
          ),
        ),
      );
    }
    if (/\/posts\/\d+\/comments\/\d+$/.test(path)) {
      const id = Number(path.split("/").pop());
      const item = state.comments.find((item) => item.id === id);
      if (!item) return send({ message: "정보가 없습니다." }, 404);
      if (method === "DELETE") {
        state.comments = state.comments.filter((item) => item.id !== id);
        return send(undefined);
      }
      if (method === "PUT") Object.assign(item, body);
      return send(item);
    }
    if (/\/posts\/\d+\/comments$/.test(path)) {
      if (method === "POST") {
        const value = {
          id: state.comments.length + 1,
          authorId: 7,
          authorNickname: user.username,
          ...body,
        };
        state.comments.push(value);
        return send(value);
      }
      return send(state.comments);
    }
    if (/\/posts\/\d+\/views$/.test(path))
      return send(
        state.posts.find(
          (item) => item.id === Number(path.split("/").at(-2)),
        ) ?? post,
      );
    if (/\/posts\/\d+$/.test(path)) {
      const id = Number(path.split("/").pop());
      const item = state.posts.find((item) => item.id === id);
      if (!item) return send({ message: "정보가 없습니다." }, 404);
      if (method === "DELETE") {
        state.posts = state.posts.filter((item) => item.id !== id);
        return send(undefined);
      }
      if (method === "PUT") Object.assign(item, body);
      return send(item);
    }
    if (
      /^\/api\/2\.0\/(general-products|ticket-products|smart-order-products)(\/\d+)?$/.test(
        path,
      )
    ) {
      const value = path.includes("ticket-products")
        ? ticket
        : path.includes("smart-order-products")
          ? smart
          : product;
      return send(
        /\/\d+$/.test(path)
          ? value
          : page(
              state.products[
                path.includes("ticket-products")
                  ? "ticket"
                  : path.includes("smart-order-products")
                    ? "smart"
                    : "general"
              ],
            ),
      );
    }
    if (path === "/api/2.0/shipping-policy")
      return send({
        enabled: true,
        baseShippingFee: 3000,
        freeShippingThreshold: 100000,
      });
    const cart = () => ({
      cartId: 1,
      cartToken: "fixture-cart",
      items: state.cart,
    });
    if (path === "/api/carts/current" || path === "/api/carts")
      return send(cart());
    if (path === "/api/2.0/carts/items/batch" || path === "/api/carts/items") {
      for (const item of body.items ?? [body])
        state.cart.push({
          cartItemId: state.cart.length + 1,
          ...item,
          itemName: product.name,
          unitPrice: 15000,
          lineTotalPrice: 15000 * item.quantity,
          valid: true,
          availableQuantity: 100,
          maxOrderQuantity: 10,
        });
      return send(cart());
    }
    if (path === "/api/carts/quote") {
      const total = state.cart.reduce(
        (sum, item) => sum + item.lineTotalPrice,
        0,
      );
      return send({
        ...cart(),
        itemsTotalPrice: total,
        shippingFee: total ? 3000 : 0,
        totalPrice: total ? total + 3000 : 0,
      });
    }
    if (/^\/api\/carts\/items\/\d+$/.test(path)) {
      const id = Number(path.split("/").pop());
      if (method === "DELETE")
        state.cart = state.cart.filter((item) => item.cartItemId !== id);
      else {
        const item = state.cart.find((item) => item.cartItemId === id);
        if (item)
          Object.assign(item, {
            quantity: body.quantity,
            lineTotalPrice: body.quantity * 15000,
          });
      }
      return send(cart());
    }
    if (path === "/api/inquiries") {
      if (method === "POST") {
        const inquiry = {
          id: state.inquiries.length + 1,
          title: body.title,
          status: "OPEN",
        };
        const detail = {
          inquiry,
          messages: [
            { id: 1, content: body.content, authorNickname: user.username },
          ],
        };
        state.inquiries.push(detail);
        return send(detail);
      }
      return send(page(state.inquiries.map((item) => item.inquiry)));
    }
    if (/^\/api\/inquiries\/\d+(\/messages)?$/.test(path)) {
      const id = Number(path.split("/")[3]);
      const item = state.inquiries.find((item) => item.inquiry.id === id);
      if (!item) return send({ message: "정보가 없습니다." }, 404);
      if (method === "DELETE") {
        state.inquiries = state.inquiries.filter(
          (item) => item.inquiry.id !== id,
        );
        return send(undefined);
      }
      if (method === "POST")
        item.messages.push({
          id: item.messages.length + 1,
          content: body.content,
          authorNickname: user.username,
        });
      return send(item);
    }
    if (path === "/api/2.0/orders")
      return send(
        page(
          url.searchParams.get("ticketOnly") === "true"
            ? state.orders.filter((item) => item.fulfillmentMethod === "TICKET")
            : state.orders,
        ),
      );
    if (path === "/api/orders/guest")
      return url.searchParams.get("guestOrderToken") === "fixture-guest"
        ? send(state.orders[0])
        : send({ message: "조회 정보를 확인해 주세요." }, 404);
    if (/^\/api\/orders\/\d+$/.test(path)) {
      const item = state.orders.find(
        (item) => item.id === Number(path.split("/").pop()),
      );
      return item ? send(item) : send({ message: "정보가 없습니다." }, 404);
    }
    if (/\/orders\/\d+\/cancel$/.test(path)) {
      state.orders[0].orderStatus = "CANCEL_REQUESTED";
      return send(state.orders[0]);
    }
    if (path === "/api/2.0/orders/entitlements/lookup") return send([]);
    state.unhandled.push({ method, path });
    return send({ message: `Fixture route missing: ${method} ${path}` }, 404);
  });
}
// Each browser test owns an independent in-memory API; native flows use default.
export function createFixtureGateway() {
  const sessions = new Map();
  return http.createServer((req, res) => {
    const id = req.headers["x-e2e-test-id"] ?? "native";
    if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
      res.writeHead(400).end("Invalid fixture identity");
      return;
    }
    if (req.url === "/__test/dispose" && req.method === "POST") {
      sessions.delete(id);
      res
        .writeHead(200, { "Content-Type": "application/json" })
        .end('{"disposed":true}');
      return;
    }
    if (!sessions.has(id)) sessions.set(id, createFixtureServer());
    sessions.get(id).emit("request", req, res);
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = createFixtureGateway();
  server.listen(Number(process.env.FIXTURE_PORT ?? 8787), "127.0.0.1", () =>
    console.log("Isolated mobile fixture server ready."),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => server.close(() => process.exit(0)));
}
