import { session } from "@/lib/session";
import { storage } from "@/lib/storage";

import { API_URL } from "@/lib/runtime-config";
export { API_URL };
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
let refreshFlight: Promise<string | null> | null = null;
async function readData(response: Response) {
  if (response.status === 204 || response.status === 205) return undefined;
  return response.headers.get("content-type")?.includes("json")
    ? response.json()
    : response.text();
}
async function refresh(): Promise<string | null> {
  if (refreshFlight) return refreshFlight;
  const current = session.get();
  if (!current) return null;
  const generation = session.generation();
  refreshFlight = (async () => {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (generation !== session.generation()) return null;
    if (response.status === 400 || response.status === 401) {
      await session.set(null);
      return null;
    }
    if (!response.ok)
      throw new ApiError(
        response.status,
        "일시적으로 로그인 정보를 갱신할 수 없습니다. 다시 시도해 주세요.",
      );
    const data = await readData(response);
    if (!data?.accessToken || !data?.refreshToken)
      throw new ApiError(502, "로그인 갱신 응답이 올바르지 않습니다.");
    if (generation !== session.generation()) return null;
    await session.set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return data.accessToken as string;
  })().finally(() => {
    refreshFlight = null;
  });
  return refreshFlight;
}

export async function customFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = new URL(path, API_URL);
  if (url.origin !== new URL(API_URL).origin)
    throw new Error("허용되지 않은 API 주소입니다.");
  const headers = new Headers(options.headers);
  const accessToken = session.get()?.accessToken;
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const isCart = /\/carts(?:\/|$)|\/delivery\/cart\//.test(url.pathname);
  if (isCart) {
    const cartToken = await storage.get("wn.cart");
    if (cartToken) headers.set("X-Cart-Token", cartToken);
  }
  let response: Response;
  try {
    response = await fetch(url.href, { ...options, headers });
    // Public auth endpoints must never refresh or replay signup/login requests.
    if (
      response.status === 401 &&
      accessToken &&
      !url.pathname.startsWith("/api/auth/")
    ) {
      const nextToken = await refresh();
      if (nextToken) {
        headers.set("Authorization", `Bearer ${nextToken}`);
        response = await fetch(url.href, { ...options, headers });
        if (response.status === 401) await session.set(null);
      }
    }
  } catch (error) {
    if (
      error instanceof ApiError ||
      (error instanceof Error && error.name === "AbortError")
    )
      throw error;
    throw new ApiError(
      0,
      "서버에 연결하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.",
    );
  }
  const data = await readData(response);
  if (!response.ok) {
    const message =
      response.status === 401
        ? "로그인이 필요하거나 만료되었습니다."
        : response.status === 403
          ? "이 기능을 이용할 권한이 없습니다."
          : response.status === 404
            ? "요청한 정보를 찾을 수 없습니다."
            : typeof data?.message === "string"
              ? data.message
              : "요청을 처리하지 못했습니다. 다시 시도해 주세요.";
    throw new ApiError(response.status, message);
  }
  if (isCart && typeof data?.cartToken === "string")
    await storage.set("wn.cart", data.cartToken);
  return { data, status: response.status, headers: response.headers } as T;
}
export default customFetch;
