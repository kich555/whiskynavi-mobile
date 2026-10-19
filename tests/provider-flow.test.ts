import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Flow } from "../src/lib/provider-flow";

const payment: Extract<Flow, { kind: "payment" }> = {
  kind: "payment",
  channel: "cart",
  ticket: {
    clientKey: "public-fixture-key",
    pgOrderId: "WN-42",
    orderName: "</script><script>unexpected()</script>",
    amount: 18000,
    successUrl: "https://whiskynavi.com/success",
    failUrl: "https://whiskynavi.com/fail",
  },
  customerName: "테스터",
  customerEmail: "customer@example.test",
  customerPhone: "010-1234-5678",
};
afterEach(() => {
  vi.resetModules();
  vi.doUnmock("../src/lib/runtime-config");
});
async function load(e2e = false) {
  vi.doMock("../src/lib/runtime-config", () => ({ E2E_MODE: e2e }));
  return import("../src/lib/provider-flow");
}

describe("app-owned provider bridge", () => {
  it("clears flows and notifies only subscribed identity consumers", async () => {
    const { providerFlow } = await load();
    const listener = vi.fn();
    const unsubscribe = providerFlow.subscribe(listener);
    expect(providerFlow.get()).toBeNull();
    providerFlow.set(payment);
    expect(providerFlow.get()).toEqual(payment);
    const identity = {
      name: "테스터",
      phone: "01012345678",
      birthDate: "1990-01-01",
    };
    providerFlow.completeNice(identity);
    expect(providerFlow.niceResult()).toEqual(identity);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    providerFlow.completeNice(null);
    providerFlow.set(null);
    expect(providerFlow.niceResult()).toBeNull();
    expect(providerFlow.get()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it.each([false, true])(
    "hands safe payment arguments to the SDK with e2e=%s",
    async (e2e) => {
      const { paymentHtml } = await load(e2e);
      const html = paymentHtml(payment);
      const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
      expect(scripts).toHaveLength(1);
      expect(html).not.toContain("<script>unexpected()");
      const requestPayment = vi.fn().mockResolvedValue(undefined);
      const sdk = Object.assign(
        vi.fn(() => ({ payment: vi.fn(() => ({ requestPayment })) })),
        { ANONYMOUS: "anonymous" },
      );
      runInNewContext(scripts[0][1], { TossPayments: sdk });
      expect(sdk).toHaveBeenCalledWith("public-fixture-key");
      expect(requestPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "CARD",
          orderId: "WN-42",
          orderName: payment.ticket.orderName,
          amount: { currency: "KRW", value: 18000 },
          customerMobilePhone: "01012345678",
          card: {
            appScheme: e2e ? "whiskynavi-e2e://" : "whiskynavimobile://",
          },
        }),
      );
    },
  );
  it("reports SDK rejection without executing external scripts", async () => {
    const { paymentHtml } = await load();
    const script = /<script>([\s\S]*?)<\/script>/.exec(
      paymentHtml(payment),
    )![1];
    const status = { textContent: "" };
    await runInNewContext(script, {
      TossPayments: Object.assign(
        () => ({
          payment: () => ({
            requestPayment: () => Promise.reject(new Error("offline")),
          }),
        }),
        { ANONYMOUS: "anonymous" },
      ),
      document: { querySelector: () => status },
    });
    expect(status.textContent).toContain("결제창을 열지 못했습니다");
  });
});
