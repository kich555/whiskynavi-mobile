import { describe, it, expect, vi } from "vitest";
vi.mock("../src/apis/mutator", () => ({
  customFetch: vi.fn(),
  default: vi.fn(),
}));
import {
  matchesCallback,
  positiveId,
  safeReturnPath,
  validatePaymentReturn,
} from "../src/lib/callback-policy";
import { getNoticeStatus } from "../src/features/reservation/policy";
import {
  isOrderCancellationAllowed,
  isReceiptCompletionAllowed,
} from "../src/features/account/constants";

describe("navigation and callback trust boundaries", () => {
  it.each([
    "//evil.test",
    "https://evil.test",
    "/\\evil.test",
    "/\nnext",
    undefined,
  ])("rejects external return path %s", (value) =>
    expect(safeReturnPath(value)).toBe("/"),
  );
  it("retains local route and query", () =>
    expect(safeReturnPath("/my-page?tab=orders")).toBe("/my-page?tab=orders"));
  it.each(["0", "-1", "1.5", "NaN", "9007199254740992", "1junk"])(
    "rejects invalid route ID %s",
    (id) => expect(positiveId(id)).toBeNull(),
  );
  it("accepts positive integer route IDs", () =>
    expect(positiveId("123")).toBe(123));
  const expected = {
    successUrl: "https://whiskynavi.com/orders/payment/success",
    pgOrderId: "WN-1",
    amount: 18000,
  };
  const valid =
    "https://whiskynavi.com/orders/payment/success?orderId=WN-1&amount=18000&paymentKey=test-key";
  it("accepts matching provider callback", () =>
    expect(validatePaymentReturn(valid, expected)).toEqual({
      pgOrderId: "WN-1",
      amount: 18000,
      paymentKey: "test-key",
    }));
  it.each([
    valid.replace("whiskynavi.com", "evil.test"),
    valid.replace("https:", "http:"),
    valid.replace("18000", "1"),
    valid.replace("WN-1", "WN-2"),
    valid.replace("&paymentKey=test-key", ""),
  ])("rejects mismatched payment callback %s", (url) =>
    expect(() => validatePaymentReturn(url, expected)).toThrow(),
  );
  it("compares full origin and path, not substrings", () =>
    expect(
      matchesCallback(
        "https://whiskynavi.com.evil.test/orders/payment/success",
        expected.successUrl,
      ),
    ).toBe(false));
});
describe("reservation and order policies", () => {
  const notice = {
    reservationStartAt: "2026-10-18T10:00:00",
    reservationEndAt: "2026-10-18T11:00:00",
  };
  it("interprets timezone-less reservations as KST", () =>
    expect(getNoticeStatus(notice, Date.parse("2026-10-18T01:30:00Z"))).toBe(
      "active",
    ));
  it("closes exactly at the end boundary", () =>
    expect(getNoticeStatus(notice, Date.parse("2026-10-18T02:00:00Z"))).toBe(
      "closed",
    ));
  it("blocks early reservation", () =>
    expect(getNoticeStatus(notice, Date.parse("2026-10-18T00:59:59Z"))).toBe(
      "pending",
    ));
  it("never cancels a reservation order through ordinary cancellation", () =>
    expect(isOrderCancellationAllowed("ORDER_PREPARING", "RESERVATION")).toBe(
      false,
    ));
  it("requires pickup fulfillment for receipt confirmation", () =>
    expect(isReceiptCompletionAllowed("ORDER_PREPARING", "DELIVERY")).toBe(
      false,
    ));
  it("allows confirmation for pickup awaiting receipt", () =>
    expect(isReceiptCompletionAllowed("RECEIPT_PENDING", "PICKUP")).toBe(true));
});
