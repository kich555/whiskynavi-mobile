import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/lib/storage", () => ({ storage: mock }));
beforeEach(() => {
  vi.resetModules();
  mock.get.mockReset();
  mock.set.mockReset();
  mock.remove.mockReset();
  delete process.env.EXPO_PUBLIC_E2E_MODE;
  delete process.env.EXPO_PUBLIC_API_BASE_URL;
});
describe("secure session lifecycle", () => {
  it("restores valid secure credentials", async () => {
    mock.get.mockResolvedValue(
      JSON.stringify({ accessToken: "access", refreshToken: "refresh" }),
    );
    const { session } = await import("../src/lib/session");
    await session.restore();
    expect(session.get()?.accessToken).toBe("access");
  });
  it("removes malformed stored credentials", async () => {
    mock.get.mockResolvedValue("{broken");
    const { session } = await import("../src/lib/session");
    await session.restore();
    expect(session.get()).toBeNull();
    expect(mock.remove).toHaveBeenCalledWith("wn.session");
  });
  it("does not restore a previous account after logout races the read", async () => {
    let resolve: (value: string) => void = () => {};
    mock.get.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { session } = await import("../src/lib/session");
    const restore = session.restore();
    await session.set(null);
    resolve(JSON.stringify({ accessToken: "old", refreshToken: "old" }));
    await restore;
    expect(session.get()).toBeNull();
  });
  it("serializes writes so a late login save cannot resurrect logout", async () => {
    let resolve: () => void = () => {};
    mock.set.mockReturnValue(
      new Promise<void>((done) => {
        resolve = done;
      }),
    );
    const { session } = await import("../src/lib/session");
    const save = session.set({
      accessToken: "access",
      refreshToken: "refresh",
    });
    await Promise.resolve();
    const logout = session.set(null);
    resolve();
    await Promise.all([save, logout]);
    expect(mock.remove).toHaveBeenCalledWith("wn.session");
    expect(session.get()).toBeNull();
  });
  it("E2E builds start with clean credentials instead of simulator keychain state", async () => {
    process.env.EXPO_PUBLIC_E2E_MODE = "1";
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://127.0.0.1:8787";
    const { session } = await import("../src/lib/session");
    await session.restore();
    expect(mock.remove).toHaveBeenCalledWith("wn.session");
    expect(mock.get).not.toHaveBeenCalled();
  });
});

it("distinguishes token rotation from account changes for cache subscribers", async () => {
  const { session } = await import("../src/lib/session");
  const changed = vi.fn();
  const unsubscribe = session.subscribe(changed);
  await session.set({ accessToken: "first", refreshToken: "refresh" });
  await session.set(
    { accessToken: "rotated", refreshToken: "next" },
    "refresh",
  );
  await session.set(null);
  expect(changed.mock.calls).toEqual([["identity"], ["refresh"], ["identity"]]);
  unsubscribe();
});

it("restores saved login without detaching mounted public requests", async () => {
  const { QueryClient, QueryObserver } = await import("@tanstack/react-query");
  const { synchronizeSessionQueries } =
    await import("../src/lib/session-query-cache");
  const { session } = await import("../src/lib/session");
  let restoreStored: (value: string) => void = () => {};
  mock.get.mockReturnValue(
    new Promise<string>((resolve) => {
      restoreStored = resolve;
    }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  let respond: (value: string) => void = () => {};
  const observer = new QueryObserver(client, {
    queryKey: ["home", "banners"],
    queryFn: () =>
      new Promise<string>((resolve) => {
        respond = resolve;
      }),
  });
  const unsubscribeObserver = observer.subscribe(() => {});
  const changes: string[] = [];
  const unsubscribeSession = session.subscribe((change) => {
    changes.push(change);
    void synchronizeSessionQueries(client, change);
  });
  try {
    const restoring = session.restore();
    restoreStored(
      JSON.stringify({ accessToken: "saved", refreshToken: "saved-refresh" }),
    );
    await restoring;
    respond("banner response");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(changes).toEqual(["restore"]);
    expect(client.getQueryCache().getAll()).toContain(
      observer.getCurrentQuery(),
    );
    expect(observer.getCurrentResult().data).toBe("banner response");
    expect(observer.getCurrentResult().status).toBe("success");
  } finally {
    unsubscribeSession();
    unsubscribeObserver();
    client.clear();
  }
});
