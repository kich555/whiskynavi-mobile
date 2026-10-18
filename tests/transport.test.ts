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
