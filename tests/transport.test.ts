import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  tokens: null as null | { accessToken: string; refreshToken: string },
  generation: 0,
  store: new Map<string, string>(),
}));
vi.mock("@/lib/session", () => ({
  session: {
    get: () => state.tokens,
    generation: () => state.generation,
    set: async (tokens: typeof state.tokens) => {
      state.tokens = tokens;
      state.generation++;
    },
  },
}));
vi.mock("@/lib/storage", () => ({
  storage: {
    get: async (key: string) => state.store.get(key),
    set: async (key: string, value: string) => {
      state.store.set(key, value);
    },
  },
}));
import { customFetch } from "../src/apis/mutator";
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
beforeEach(() => {
  state.tokens = null;
  state.generation++;
  state.store.clear();
  vi.unstubAllGlobals();
});
describe("mobile API transport", () => {
  it("does not leak credentials to an unrelated origin", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    state.tokens = { accessToken: "old", refreshToken: "refresh" };
    await expect(customFetch("https://evil.test/api", {})).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("sends cart identity only for cart operations", async () => {
    state.store.set("wn.cart", "cart-secret");
    const fetch = vi.fn(async (_url: string | URL, _options?: RequestInit) =>
      json({}),
    );
    vi.stubGlobal("fetch", fetch);
    await customFetch("/api/bottles", {});
    await customFetch("/api/carts/current", {});
    expect(
      new Headers(fetch.mock.calls[0][1]?.headers).get("X-Cart-Token"),
    ).toBeNull();
    expect(
      new Headers(fetch.mock.calls[1][1]?.headers).get("X-Cart-Token"),
    ).toBe("cart-secret");
  });
  it("deduplicates concurrent refreshes and retries authenticated reads", async () => {
    state.tokens = { accessToken: "old", refreshToken: "refresh" };
    let refreshes = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, options) => {
        if (String(url).endsWith("/api/auth/refresh")) {
          refreshes++;
          await new Promise((done) => setTimeout(done, 10));
          return json({ accessToken: "new", refreshToken: "next" });
        }
        return new Headers(options.headers).get("Authorization") ===
          "Bearer new"
          ? json({ ok: true })
          : json({}, 401);
      }),
    );
    await Promise.all([
      customFetch("/api/users/me", {}),
      customFetch("/api/2.0/orders", {}),
    ]);
    expect(refreshes).toBe(1);
    expect(state.tokens?.accessToken).toBe("new");
  });
  it("does not refresh/replay invalid login", async () => {
    state.tokens = { accessToken: "old", refreshToken: "refresh" };
    const fetch = vi.fn(async () => json({}, 401));
    vi.stubGlobal("fetch", fetch);
    await expect(
      customFetch("/api/auth/login", { method: "POST" }),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("preserves session during a temporary refresh outage", async () => {
    state.tokens = { accessToken: "old", refreshToken: "refresh" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) =>
        String(url).endsWith("/api/auth/refresh")
          ? json({}, 503)
          : json({}, 401),
      ),
    );
    await expect(customFetch("/api/users/me", {})).rejects.toMatchObject({
      status: 503,
    });
    expect(state.tokens?.refreshToken).toBe("refresh");
  });
  it("clears invalid refresh credentials", async () => {
    state.tokens = { accessToken: "old", refreshToken: "invalid" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({}, 401)),
    );
    await expect(customFetch("/api/users/me", {})).rejects.toMatchObject({
      status: 401,
    });
    expect(state.tokens).toBeNull();
  });
  it("does not turn permission failures into logout", async () => {
    state.tokens = { accessToken: "valid", refreshToken: "refresh" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({}, 403)),
    );
    await expect(customFetch("/api/users/me", {})).rejects.toMatchObject({
      status: 403,
    });
    expect(state.tokens?.accessToken).toBe("valid");
  });
});

it("does not resurrect credentials if logout happens during refresh", async () => {
  state.tokens = { accessToken: "old", refreshToken: "refresh" };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      if (String(url).endsWith("/api/auth/refresh")) {
        state.tokens = null;
        state.generation++;
        return json({ accessToken: "late", refreshToken: "late" });
      }
      return json({}, 401);
    }),
  );
  await expect(customFetch("/api/users/me")).rejects.toMatchObject({
    status: 401,
  });
  expect(state.tokens).toBeNull();
});

it("rejects incomplete refresh responses instead of storing invalid credentials", async () => {
  state.tokens = { accessToken: "old", refreshToken: "refresh" };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      String(url).endsWith("/api/auth/refresh")
        ? json({ accessToken: "partial" })
        : json({}, 401),
    ),
  );
  await expect(customFetch("/api/users/me")).rejects.toMatchObject({
    status: 502,
  });
  expect(state.tokens).toEqual({ accessToken: "old", refreshToken: "refresh" });
});

it("stops after a rotated credential is rejected and clears the session", async () => {
  state.tokens = { accessToken: "old", refreshToken: "refresh" };
  const fetch = vi.fn(async (url) =>
    String(url).endsWith("/api/auth/refresh")
      ? json({ accessToken: "new", refreshToken: "next" })
      : json({}, 401),
  );
  vi.stubGlobal("fetch", fetch);
  await expect(customFetch("/api/users/me")).rejects.toMatchObject({
    status: 401,
  });
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(state.tokens).toBeNull();
});

it("preserves cancellation while normalizing an offline connection failure", async () => {
  const abort = new DOMException("cancelled", "AbortError");
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(abort)
    .mockRejectedValueOnce(new TypeError("offline"));
  vi.stubGlobal("fetch", fetch);
  await expect(customFetch("/api/bottles")).rejects.toBe(abort);
  await expect(customFetch("/api/bottles")).rejects.toMatchObject({
    status: 0,
  });
});

it.each([204, 205])(
  "accepts an empty %s response after a mutation",
  async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status })),
    );
    await expect(
      customFetch("/api/boards/community/posts/1", { method: "DELETE" }),
    ).resolves.toMatchObject({ data: undefined, status });
  },
);

it("stores a returned guest cart token and accepts non-JSON success", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(json({ cartToken: "fresh-cart" }))
    .mockResolvedValueOnce(new Response("ok"));
  vi.stubGlobal("fetch", fetch);
  await customFetch("/api/carts/current");
  expect(state.store.get("wn.cart")).toBe("fresh-cart");
  await expect(customFetch("/api/ping")).resolves.toMatchObject({ data: "ok" });
});

it.each([
  [404, {}, "요청한 정보를 찾을 수 없습니다."],
  [422, { message: "입력 내용을 확인해주세요" }, "입력 내용을 확인해주세요"],
  [500, {}, "요청을 처리하지 못했습니다. 다시 시도해 주세요."],
])(
  "preserves user-facing server error semantics for %s",
  async (status, body, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(body, status as number)),
    );
    await expect(customFetch("/api/bottles")).rejects.toMatchObject({
      status,
      message,
    });
  },
);
